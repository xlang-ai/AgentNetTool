import json
import os
import time
from datetime import datetime
from platform import system
from queue import Queue
from threading import Thread
import uuid

from pynput import keyboard, mouse
from PyQt6.QtCore import QThread, pyqtSignal

from .metadata import MetadataManager
from .obs_client import OBSClient, is_obs_recording, OBSAlreadyRecordingError
from .utils import (
    fix_windows_dpi_scaling,
    get_recordings_dir,
    get_key_name,
    get_key_str,
    init_encrpted_jsonl,
    write_encrypt_line,
)
from .a11y_listener import A11yListener
from .axtree_getter import KeyFrameDetector
from .logger import logger


class Recorder(QThread):
    """
    Makes recordings.
    """

    recording_stopped = pyqtSignal()

    def __init__(
        self,
        socketio,
        natural_scrolling: bool,
        generate_window_a11y: bool = False,
        generate_element_a11y: bool = True,

    ):
        super().__init__()

        if system() == "Windows":
            fix_windows_dpi_scaling()
        self.socketio = socketio
        self.recording_path = self._get_recording_path()
        # self.recording_id = str(uuid.uuid4())
        self._is_recording = False
        self._is_paused = False
        self.gen_window = generate_window_a11y
        self.gen_element = generate_element_a11y
        logger.info(
            f"Gen Window: {generate_window_a11y}, Gen Element: {generate_element_a11y}"
        )

        self.event_queue = Queue()
        self.events_file = open(
            os.path.join(self.recording_path, "events.jsonl"), "a", encoding="utf-8"
        )
        if generate_window_a11y:
            a11y_path = os.path.join(self.recording_path, "a11y.jsonl")
            init_encrpted_jsonl(a11y_path)
            self.a11y_file = open(a11y_path, "a", encoding="utf-8")
        if generate_element_a11y:
            element_path = os.path.join(self.recording_path, "element.jsonl")
            init_encrpted_jsonl(element_path)
            self.element_file = open(element_path, "a", encoding="utf-8")

        html_path = os.path.join(self.recording_path, "html.jsonl")
        init_encrpted_jsonl(html_path)
        self.html_file = open(html_path, "a", encoding="utf-8")
        top_window_path = os.path.join(self.recording_path, "top_window.jsonl")
        init_encrpted_jsonl(top_window_path)
        self.top_window_file = open(top_window_path, "a", encoding="utf-8")

        self.metadata_manager = MetadataManager(
            recording_path=self.recording_path,
            natural_scrolling=natural_scrolling,
        )
        logger.info("Metadata collected.")
        self.obs_client = OBSClient(
            recording_path=self.recording_path, metadata=self.metadata_manager.metadata
        )

        if is_obs_recording(self.obs_client):
            self.obs_client.stop_recording()
            raise OBSAlreadyRecordingError("OBS is running before start.")

        self.mouse_listener = mouse.Listener(
            on_move=self.on_move, on_click=self.on_click, on_scroll=self.on_scroll
        )

        self.keyboard_listener = keyboard.Listener(
            on_press=self.on_press, on_release=self.on_release
        )

        if (generate_window_a11y or generate_element_a11y) and system() != "Linux":
            self.a11y_listener = A11yListener(
                generate_window_a11y, generate_element_a11y
            )

        # TODO: Only save a11y data when required
        if generate_window_a11y:
            self.keyframe_detector = KeyFrameDetector(self.socketio)

        self.event_count = 0

    def on_move(self, x, y):
        if not self._is_paused:
            self.event_queue.put(
                {"time_stamp": time.perf_counter(), "action": "move",
                 "x": x, "y": y},
                block=False,
            )

    def on_click(self, x, y, button, pressed):
        if not self._is_paused:
            timestamp = time.perf_counter()
            self.event_queue.put(
                {
                    "time_stamp": timestamp,
                    "action": "click",
                    "x": x,
                    "y": y,
                    "button": button.name,
                    "pressed": pressed,
                },
                block=False,
            )

    def on_scroll(self, x, y, dx, dy):
        if not self._is_paused:
            self.event_queue.put(
                {
                    "time_stamp": time.perf_counter(),
                    "action": "scroll",
                    "x": x,
                    "y": y,
                    "dx": dx,
                    "dy": dy,
                },
                block=False,
            )

    def on_press(self, key):
        if not self._is_paused:
            self.event_queue.put(
                {
                    "time_stamp": time.perf_counter(),
                    "action": "press",
                    "name": get_key_name(key),
                    "pynput_key": get_key_str(key)
                },
                block=False,
            )

    def on_release(self, key):
        if not self._is_paused:
            self.event_queue.put(
                {
                    "time_stamp": time.perf_counter(),
                    "action": "release",
                    "name": get_key_name(key),
                    "pynput_key": get_key_str(key)
                },
                block=False,
            )

    def run(self):
        logger.info("Recorder: run")
        self._is_recording = True

        self.metadata_manager.collect()
        self.obs_client.start_recording()
        self.metadata_manager.set_video_start_timestamp(time.perf_counter())
        self.mouse_listener.start()
        self.keyboard_listener.start()
        if self.gen_element and system() != "Linux":
            self.a11y_listener.start()
            logger.info("A11y listener start.")
        if self.gen_window:
            self.keyframe_detector.start()
            logger.info("Keyframe detector start.")

        while self._is_recording:
            event = self.event_queue.get()
            event["event_idx"] = self.event_count
            self.event_count += 1

            self.events_file.write(json.dumps(event) + "\n")

            if self.gen_window:
                axtree_queue = self.keyframe_detector.axtree_queue
                if not axtree_queue.empty():
                    logger.info("write_axtree_data")
                    write_encrypt_line(self.a11y_file, axtree_queue.get())

            if self.gen_element and system() != "Linux":
                element_queue = self.a11y_listener.element_queue
                if not element_queue.empty():
                    logger.info("write_element_data")
                    write_encrypt_line(self.element_file, element_queue.get())

            if system() != "Linux":
                top_window_queue = self.a11y_listener.top_window_queue
                if not top_window_queue.empty():
                    write_encrypt_line(self.top_window_file,
                                    top_window_queue.get())

        logger.info("Recorder: run done.")

    def write_axtree_data(self, keyframe_detector, a11y_file):
        while not keyframe_detector.axtree_queue.empty():
            write_encrypt_line(a11y_file, keyframe_detector.axtree_queue.get())

        a11y_file.flush()

    def write_element_data(self, a11y_listener, element_file):
        while not a11y_listener.element_queue.empty():
            write_encrypt_line(element_file, a11y_listener.element_queue.get())
        element_file.flush()

    def write_top_window_data(self, a11y_listener, top_window_file):
        while not a11y_listener.top_window_queue.empty():
            write_encrypt_line(
                top_window_file, a11y_listener.top_window_queue.get())

        top_window_file.flush()

    def stop_recording(self):
        logger.info("Recorder: stop_recording")
        if self._is_recording:
            self._is_recording = False
            self.metadata_manager.end_collect()

            # Wait for the last events to be processed
            time.sleep(0.5)

            self.mouse_listener.stop()
            self.keyboard_listener.stop()
            if self.gen_element and system() != "Linux":
                self.a11y_listener.stop()
            if self.gen_window:
                self.keyframe_detector.stop()

            # Process remaining a11ytree data in a separate thread
            if self.gen_window:
                a11y_writer_thread = Thread(
                    target=self.write_axtree_data,
                    args=(self.keyframe_detector, self.a11y_file),
                )
                a11y_writer_thread.start()
            if self.gen_element and system() != "Linux":
                element_writer_thread = Thread(
                    target=self.write_element_data,
                    args=(self.a11y_listener, self.element_file),
                )
                element_writer_thread.start()

            if system() != "Linux":
                top_window_writer_thread = Thread(
                    target=self.write_top_window_data,
                    args=(self.a11y_listener, self.top_window_file),
                )
                top_window_writer_thread.start()

            # Wait for the writer thread to complete
            if self.gen_window:
                a11y_writer_thread.join()
            if self.gen_element and system() != "Linux":
                element_writer_thread.join()
            if system() != "Linux":
                top_window_writer_thread.join()
            self.obs_client.stop_recording()

            self.metadata_manager.add_obs_record_state_timings(
                self.obs_client.record_state_events
            )

            self.events_file.close()
            self.metadata_manager.save_metadata()
            if self.gen_window:
                self.a11y_file.close()
            if self.gen_element and system() != "Linux":
                self.element_file.close()

            # self.recording_stopped.emit()
        logger.info("Recorder: stop_recording done.")

    def pause_recording(self):
        if not self._is_paused and self._is_recording:
            self._is_paused = True
            self.obs_client.pause_recording()
            self.event_queue.put(
                {"time_stamp": time.perf_counter(), "action": "pause"}, block=False
            )

    def resume_recording(self):
        if self._is_paused and self._is_recording:
            self._is_paused = False
            self.obs_client.resume_recording()
            self.event_queue.put(
                {"time_stamp": time.perf_counter(), "action": "resume"}, block=False
            )

    def _get_recording_path(self) -> str:
        """
        Modified: change folder name to recording_id
        """
        recordings_dir = get_recordings_dir()

        if not os.path.exists(recordings_dir):
            os.mkdir(recordings_dir)

        self.recording_id = str(uuid.uuid4())
        recording_path = os.path.join(recordings_dir, f"{self.recording_id }")
        os.makedirs(recording_path, exist_ok=True)

        return recording_path
