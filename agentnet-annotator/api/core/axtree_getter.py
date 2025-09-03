import time
import mss
import numpy as np
from platform import system
import os
import pyautogui
from threading import Thread
from concurrent.futures import ThreadPoolExecutor
from queue import Queue
from pynput import mouse

if __name__ == "__main__":
    import sys

    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.abspath(os.path.join(current_dir, "../../"))

    sys.path.append(parent_dir)
    from api.core.a11y import (
        get_accessibility_tree,
        get_top_window,
        get_top_window_name,
    )
    from api.core.utils import send_notification
    from api.core.logger import logger
else:
    from .a11y import get_accessibility_tree, get_top_window, get_top_window_name
    from .utils import send_notification
    from .logger import logger


BROWSER_NAME_LIST = {
    "macos": ["Microsoft Edge", "Google Chrome", "Arc"],
    "windows": ["msedge", "chrome", "firefox"],
}


class KeyFrameDetector:
    def __init__(self, socketio):
        self.keyframe_detector = Thread(target=self.detect_keyframes)
        self.running = False
        self.axtree_queue = Queue()
        self.executor_stack = []
        self.mouse_listener = mouse.Listener(
            on_click=self.on_click,
            on_scroll=self.on_scroll,
            on_move=self.on_move,
        )
        self.scrolling = False
        self.socketio = socketio

    def on_click(self, x, y, button, pressed):
        if not pressed:
            time.sleep(0.3)
            self.trigger_save_axtree()

    def on_scroll(self, x, y, dx, dy):
        self.scrolling = True

    def on_move(self, x, y):
        if self.scrolling:
            time.sleep(0.3)
            self.trigger_save_axtree()
            self.scrolling = False

    def push_executor(self, executor: ThreadPoolExecutor) -> None:
        self.executor_stack.append(executor)

    def pop_executor(self) -> ThreadPoolExecutor:
        return self.executor_stack.pop()

    def trigger_save_axtree(self):
        # Don't save axtree when using browser
        if system() == "Darwin":
            top_window = get_top_window()
            if top_window["kCGWindowOwnerName"] in BROWSER_NAME_LIST["macos"]:
                logger.info("Browser is detected. Skip saving AXTree.")
                return
        elif system() == "Windows":
            top_window = get_top_window_name()
            if top_window in BROWSER_NAME_LIST["windows"]:
                logger.info("Browser is detected. Skip saving AXTree.")
                return

        logger.info("triggered save axtree")
        # send_notification("Start", "Please don't move")
        self.socketio.emit("axtree", {"status": "start"})

        # Process the keyframe: Save AXTree
        # pop all the executors
        while len(self.executor_stack) > 0:
            logger.info(f"Shutting down {len(self.executor_stack)} executors...")
            executor = self.pop_executor()
            executor.shutdown(wait=False)
        new_executor = ThreadPoolExecutor()
        new_executor.submit(self.save_axtree)

    def save_axtree(self):
        time_stamp = time.perf_counter()
        try:
            logger.info("Getting axtree...")
            current_tree = get_accessibility_tree()
            if current_tree is None:  # TODO: temp for Windows
                return
        except Exception as e:
            logger.error(f"Failed to get AXTree: {e}")
            return
        time_now = time.perf_counter()
        logger.info(f"Time to get AXTree: {time_now - time_stamp}")
        current_tree["time_stamp"] = time_stamp # add time_stamp attr into axtree itself
        self.axtree_queue.put(
            {"time_stamp": time_stamp, "axtree": current_tree}, block=False
        )
        # send_notification("End", "")
        self.socketio.emit("axtree", {"status": "end"})
        logger.info("A Tree Saved!")
        self.pop_executor()

    """def capture_screen_array(self, sct):
        screenshot = sct.grab(sct.monitors[1])
        img = np.array(screenshot)
        return img"""

    def capture_screen_array(self):
        # pyautogui automatically get the primary window
        screenshot = pyautogui.screenshot()
        img = np.array(screenshot)
        return img

    def calculate_pixel_difference_ratio(self, img1, img2):
        # RGBA
        width, height, _ = img1.shape
        # To avoid the Notification window
        img1 = img1[int(0.33 * width) :, : height - 200]
        img2 = img2[int(0.33 * width) :, : height - 200]
        difference = np.any(img1 != img2, axis=-1)
        changed_pixels = np.sum(difference)
        total_pixels = img1.shape[0] * img1.shape[1]
        diff_ratio = changed_pixels / max(1000000, total_pixels)
        return diff_ratio

        """if system() == "Darwin":
            top_window = get_top_window()
            top_window_pixels = (
                top_window["kCGWindowBounds"]["Width"]
                * top_window["kCGWindowBounds"]["Height"]
            )
            diff_ratio = changed_pixels / max(1000000, total_pixels)
            return diff_ratio
        elif system() == "Windows":
            from screeninfo import get_monitors

            main_monitor = get_monitors()[0]
            screen_width = main_monitor.width
            screen_height = main_monitor.height

            screen_pixels = screen_width * screen_height
            diff_ratio = changed_pixels / max(1000000, screen_pixels)
            return diff_ratio"""

    def detect_keyframes(self):
        with mss.mss() as sct:
            previous_img = None

            stable_count = 0
            stable_threshold = 3  # 监控多少帧来判断稳定
            stable_detect_started = False

            while self.running:

                # current_img = self.capture_screen_array(sct)
                current_img = self.capture_screen_array()

                if previous_img is not None:
                    diff_ratio = self.calculate_pixel_difference_ratio(
                        previous_img, current_img
                    )
                    if diff_ratio > 0.4:
                        logger.info(
                            "Possible user action detected due to significant change in diff of diff."
                        )
                        stable_count = 0
                        stable_detect_started = True
                    else:
                        if diff_ratio < 0.01:
                            if stable_detect_started:
                                stable_count += 1
                                if stable_count >= stable_threshold:
                                    self.trigger_save_axtree()
                                    stable_count = 0
                                    stable_detect_started = False
                previous_img = current_img
                time.sleep(0.15)

    def start(self):
        self.running = True
        self.keyframe_detector.start()
        self.mouse_listener.start()
        # Push a new executor to save the first AXTree

    def stop(self):
        self.running = False
        self.mouse_listener.stop()
        self.keyframe_detector.join()
        # Terminate all the executors
        while len(self.executor_stack) > 0:
            executor = self.pop_executor()
            executor.shutdown()


if __name__ == "__main__":
    os.makedirs("temp", exist_ok=True)
    listener = KeyFrameDetector()
    listener.start()
    time.sleep(100)
    listener.stop()
