"""Recording service for managing recording operations."""

import os
import time
import threading
import pyautogui
from queue import Queue
from datetime import datetime
from typing import Dict, Optional, Tuple

from core.logger import logger
from core.recorder import Recorder
from core.action_reduction import Reducer
from core.utils import (
    get_task_name_from_folder,
    get_description_from_folder,
    get_video_by_id,
    RECORDING_DIR,
    REVIEW_RECORDING_DIR,
    read_encrypted_jsonl,
    write_encrypted_jsonl,
    read_encrypted_json,
    write_encrypted_json,
    check_recording_visualizable,
    check_recording_broken,
)
from core.backend_func import read_recording_status
from core.constants import SUCCEED, FAILED


class RecordingService:
    """Service for handling recording operations."""

    def __init__(self, socketio):
        self.socketio = socketio
        self.recorder_thread = None
        self.reducer = None
        self.user_recordings = None
        self.opened_single_recording = None

        # Recording configuration
        self.natural_scrolling_checkbox_checked = True
        self.generate_window_a11y = False
        self.generate_element_a11y = True

        # Setup reducer queue processing
        self.reducer_queue = Queue()
        self.reducer_thread = threading.Thread(
            target=self._process_reducer_queue, daemon=True
        )
        self.reducer_thread.start()

    def start_recording(self, task_hub_data: Dict) -> Tuple[str, str]:
        """Start a new recording session."""
        logger.info("RecordingService: start_recording")

        if self.recorder_thread is not None:
            return FAILED, "Recording already in progress"

        try:
            self.recorder_thread = Recorder(
                socketio=self.socketio,
                natural_scrolling=self.natural_scrolling_checkbox_checked,
                generate_window_a11y=self.generate_window_a11y,
                generate_element_a11y=self.generate_element_a11y,
            )
            recording_path = self.recorder_thread.recording_path

            width, height = pyautogui.size()
            self.reducer = Reducer(
                recording_path=recording_path,
                window_attrs={"width": width, "height": height},
                configs={
                    "generate_window_a11y": self.generate_window_a11y,
                    "generate_element_a11y": self.generate_element_a11y,
                },
            )

            # Handle task hub data if provided
            if task_hub_data:
                self._save_task_hub_data(recording_path, task_hub_data)

            self.recorder_thread.start()
            logger.info("RecordingService: Recording started successfully")
            return SUCCEED, "Recording started successfully"

        except Exception as e:
            self._cleanup_failed_recording()
            logger.exception("RecordingService: start_recording failed")
            return FAILED, f"Failed to start recording: {str(e)}"

    def stop_recording(self) -> Tuple[str, str]:
        """Stop the current recording session."""
        logger.info("RecordingService: stop_recording")

        if not hasattr(self, "recorder_thread") or self.recorder_thread is None:
            return FAILED, "No active recording"

        try:
            self.recorder_thread.stop_recording()
            self.reducer_queue.put(self.reducer)
            self.recorder_thread = None
            logger.info("RecordingService: Recording stopped successfully")
            return SUCCEED, "Recording stopped successfully"

        except Exception as e:
            logger.exception("RecordingService: stop_recording failed")
            return FAILED, f"Failed to stop recording: {str(e)}"

    def get_user_recordings(self) -> Dict:
        """Get list of user recordings."""
        logger.info("RecordingService: get_user_recordings")

        if not os.path.exists(RECORDING_DIR):
            os.makedirs(RECORDING_DIR, exist_ok=True)
            return {
                "uploaded_recordings": [],
                "not_uploaded_recordings": [],
            }

        # Handle legacy recording name conversion
        self._convert_legacy_recording_names()

        local_recording_ids = [
            f for f in os.listdir(RECORDING_DIR) if ".ds_store" not in f.lower()
        ]

        if self.user_recordings is not None:
            self._update_existing_recordings(local_recording_ids)
        else:
            self._initialize_recordings(local_recording_ids)

        return {
            "uploaded_recordings": [],
            "not_uploaded_recordings": list(self.user_recordings.values()),
        }

    def get_single_recording(
        self, recording_name: str, reviewing: bool = False
    ) -> Tuple[str, Dict]:
        """Get details of a single recording."""
        logger.info(f"RecordingService: get_single_recording: {recording_name}")

        folder_path = self._get_recording_path(recording_name, reviewing)

        if not os.path.exists(folder_path):
            return FAILED, {"error": "Recording not found"}

        try:
            recording_data = self._build_recording_data(
                recording_name, folder_path, reviewing
            )
            events = self._load_recording_events(folder_path)
            recording_data["events"] = events

            self.opened_single_recording = recording_data
            logger.info("RecordingService: get_single_recording completed")
            return SUCCEED, recording_data

        except Exception as e:
            logger.exception(f"RecordingService: get_single_recording failed: {e}")
            return FAILED, {"error": "Failed to load recording"}

    def confirm_recording(
        self, recording_name: str, events_data: list
    ) -> Tuple[str, str]:
        """Confirm and save recording modifications."""
        logger.info("RecordingService: confirm_recording")

        if self.opened_single_recording is None:
            return FAILED, "No recording opened"

        try:
            folder_path = os.path.join(RECORDING_DIR, recording_name)
            self._remove_unused_videos(folder_path, events_data)
            self._save_modified_events(folder_path, events_data)
            return SUCCEED, "Recording modifications saved successfully"

        except Exception as e:
            logger.exception("RecordingService: confirm_recording failed")
            return FAILED, f"Failed to confirm recording: {str(e)}"

    def get_video_path(
        self, recording_name: str, event_index: str, verifying: bool = False
    ) -> Tuple[str, Dict]:
        """Get video path for a specific event."""
        if self.opened_single_recording is None:
            return FAILED, {"error": "No recording opened"}

        if self.opened_single_recording["recording_name"] != recording_name:
            return FAILED, {"error": "Wrong recording opened"}

        try:
            videos_folder_path = self._get_videos_folder_path(recording_name, verifying)
            event = self.opened_single_recording["events"][int(event_index)]
            video_name = get_video_by_id(video_path=videos_folder_path, id=event["id"])

            return SUCCEED, {
                "success": "Video path retrieved successfully",
                "path": os.path.join(videos_folder_path, video_name),
            }

        except Exception as e:
            logger.warning(f"RecordingService: get_video_path failed: {e}")
            return FAILED, {"error": str(e)}

    def toggle_window_a11y(self, flag: bool) -> None:
        """Toggle window accessibility generation."""
        self.generate_window_a11y = flag
        logger.info(f"RecordingService: generate_window_a11y set to {flag}")

    def _save_task_hub_data(self, recording_path: str, task_hub_data: Dict) -> None:
        """Save task hub data to recording directory."""
        hub_task_id = task_hub_data.get("hub_task_id")
        if hub_task_id:
            with open(os.path.join(recording_path, "hub_task_id.txt"), "w") as f:
                f.write(hub_task_id)

            task_name = task_hub_data.get("hub_task_name")
            description = task_hub_data.get("hub_task_description", "")
            if task_name:
                write_encrypted_json(
                    os.path.join(recording_path, "task_name.json"),
                    data={"task_name": task_name, "description": description},
                )

    def _cleanup_failed_recording(self) -> None:
        """Clean up resources after failed recording."""
        if hasattr(self, "recorder_thread") and self.recorder_thread:
            self.recorder_thread.stop()
        self.recorder_thread = None
        self.reducer = None

    def _process_reducer_queue(self) -> None:
        """Process the reducer queue in background thread."""
        while True:
            reducer = self.reducer_queue.get()
            if reducer is None:
                self.reducer_queue.task_done()
                continue

            try:
                reducer.reduce_pipeline()
                recording_id = os.path.basename(reducer.recording_path)
                if self.user_recordings and recording_id in self.user_recordings:
                    self.user_recordings[recording_id]["status"] = "local"

                self.socketio.emit(
                    "reduced",
                    {"status": "succeed", "message": "Recording processing completed"},
                )
            except Exception as e:
                logger.exception(f"RecordingService: Error in reduce_pipeline: {e}")
                self.socketio.emit(
                    "reduced",
                    {"status": "failed", "message": "Recording processing failed"},
                )
            finally:
                self.reducer_queue.task_done()

    def _convert_legacy_recording_names(self) -> None:
        """Convert legacy recording names to recording IDs."""
        for recording_name in os.listdir(RECORDING_DIR):
            if recording_name.startswith("recording"):
                recording_status = read_recording_status(
                    recording_path=os.path.join(RECORDING_DIR, recording_name)
                )
                if recording_status:
                    old_path = os.path.join(RECORDING_DIR, recording_name)
                    new_path = os.path.join(
                        RECORDING_DIR, recording_status["recording_id"]
                    )
                    os.rename(old_path, new_path)
                else:
                    logger.error(f"Invalid recording {recording_name}, removing")
                    # TODO: Use proper file deletion utility

    def _update_existing_recordings(self, local_recording_ids: list) -> None:
        """Update existing recordings list with local changes."""
        # Remove deleted recordings
        for recording_id in list(self.user_recordings.keys()):
            if recording_id not in local_recording_ids:
                del self.user_recordings[recording_id]

        # Add new recordings
        new_recording_ids = []
        for recording_id in local_recording_ids:
            if recording_id not in self.user_recordings:
                new_recording_ids.append(recording_id)
                recording = self._create_recording_info(recording_id)
                self.user_recordings[recording_id] = recording

        # Update existing recordings
        for recording_id, recording in self.user_recordings.items():
            if recording_id not in new_recording_ids:
                self._update_recording_info(recording, recording_id, False)

    def _initialize_recordings(self, local_recording_ids: list) -> None:
        """Initialize recordings list from scratch."""
        local_recordings = {}
        for recording_name in local_recording_ids:
            local_recordings[recording_name] = self._create_recording_info(
                recording_name
            )

        self.user_recordings = local_recordings

    def _create_recording_info(self, recording_name: str) -> Dict:
        """Create recording info dictionary."""
        recording_path = os.path.join(RECORDING_DIR, recording_name)

        recording = {
            "name": recording_name,
            "task_name": get_task_name_from_folder(recording_name, reviewing=False),
            "task_description": get_description_from_folder(
                recording_name, reviewing=False
            ),
            "status": "local",
            "verify_feedback": None,
            "uploaded": False,
            "visualizable": True,  # Simplified for now
            "broken": False,
        }

        # Add creation time
        creation_time = os.path.getctime(recording_path)
        recording["creation_time"] = datetime.fromtimestamp(creation_time).strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        return recording

    def _update_recording_info(
        self, recording: Dict, recording_name: str, reviewing: bool
    ) -> Dict:
        """Update recording info with latest data."""
        recording["status"] = "local"
        recording["task_name"] = get_task_name_from_folder(recording_name, reviewing)
        recording["task_description"] = get_description_from_folder(
            recording_name, reviewing
        )
        recording["visualizable"] = check_recording_visualizable(
            recording_name, reviewing
        )
        recording["broken"] = check_recording_broken(recording_name, reviewing)
        return recording

    def _get_recording_path(self, recording_name: str, reviewing: bool) -> str:
        """Get the full path to a recording directory."""
        base_dir = REVIEW_RECORDING_DIR if reviewing else RECORDING_DIR
        return os.path.join(base_dir, recording_name)

    def _build_recording_data(
        self, recording_name: str, folder_path: str, reviewing: bool
    ) -> Dict:
        """Build recording data dictionary."""
        recording_data = {
            "recording_id": recording_name,
            "recording_name": recording_name,
        }

        # Get recording info from cache
        recordings_cache = (
            self.user_recordings if not reviewing else {}
        )  # TODO: handle review recordings
        if recordings_cache and recording_name in recordings_cache:
            recording_info = recordings_cache.get(recording_name, {})
            recording_data.update(recording_info)

        # Add task info for non-uploaded recordings
        if not recording_data.get("uploaded", False):
            recording_data.update(
                {
                    "task_name": get_task_name_from_folder(recording_name, reviewing),
                    "description": get_description_from_folder(
                        recording_name, reviewing
                    ),
                    "verify_status": "local",
                    "verify_feedback": None,
                }
            )

        return recording_data

    def _load_recording_events(self, folder_path: str) -> list:
        """Load events from recording directory."""
        events_file_path = os.path.join(folder_path, "reduced_events_vis.jsonl")
        if not os.path.exists(events_file_path):
            raise FileNotFoundError("reduced_events.jsonl file not found")

        return read_encrypted_jsonl(events_file_path)

    def _remove_unused_videos(self, folder_path: str, events_data: list) -> None:
        """Remove video files that are no longer used."""
        ids_left = [event["id"] for event in events_data]
        for action in self.opened_single_recording["events"]:
            if action["id"] not in ids_left:
                video_path = os.path.join(
                    folder_path, "video_clips", f"{action['id']}_{action['action']}.mp4"
                )
                if os.path.exists(video_path):
                    os.remove(video_path)
                    logger.info(
                        f"RecordingService: Removed {action['id']}_{action['action']}.mp4"
                    )

    def _save_modified_events(self, folder_path: str, events_data: list) -> None:
        """Save modified events to files."""
        # Update opened recording
        self.opened_single_recording["events"] = events_data

        # Save visual events
        vis_events_path = os.path.join(folder_path, "reduced_events_vis.jsonl")
        write_encrypted_jsonl(vis_events_path, events_data)

        # Save complete events
        complete_events_path = os.path.join(
            folder_path, "reduced_events_complete.jsonl"
        )
        if os.path.exists(complete_events_path):
            complete_events_data = read_encrypted_jsonl(complete_events_path)
            ids_left = [event["id"] for event in events_data]
            new_complete_data = [
                action for action in complete_events_data if action["id"] in ids_left
            ]
            write_encrypted_jsonl(complete_events_path, new_complete_data)

    def _get_videos_folder_path(self, recording_name: str, verifying: bool) -> str:
        """Get path to videos folder."""
        base_dir = REVIEW_RECORDING_DIR if verifying else RECORDING_DIR
        return os.path.join(base_dir, recording_name, "video_clips")
