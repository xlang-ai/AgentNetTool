"""File service for handling file operations and browser integration."""

import os
import time
from typing import Dict, Tuple

from core.logger import logger
from core.utils import (
    read_encrypted_json,
    write_encrypt_line,
    init_encrpted_jsonl,
)
from core.dom_utils import convert_webpage_to_json_elements, prune_html
from core.constants import SUCCEED, FAILED


class FileService:
    """Service for handling file operations."""

    def __init__(self):
        self.active_recording_path = None

    def set_active_recording(self, recording_path: str) -> None:
        """Set the active recording path."""
        self.active_recording_path = recording_path

    def get_hub_data(
        self, recording_name: str, recording_path: str
    ) -> Tuple[str, Dict]:
        """Get hub data for a recording."""
        logger.info("FileService: get_hub_data")

        task_name_path = os.path.join(recording_path, "task_name.json")
        if not os.path.exists(task_name_path):
            return SUCCEED, {
                "hub_task_name": None,
                "hub_task_description": None,
                "success": False,
            }

        try:
            task_data = read_encrypted_json(task_name_path)
            return SUCCEED, {
                "hub_task_name": task_data.get("task_name"),
                "hub_task_description": task_data.get("description"),
                "success": True,
            }
        except Exception as e:
            logger.exception(f"FileService: get_hub_data failed: {e}")
            return FAILED, {
                "error": f"Failed to read hub data: {str(e)}",
                "success": False,
            }

    def append_browser_element(self, element_data: Dict) -> Tuple[str, str]:
        """Append browser element data to recording."""
        if not self.active_recording_path:
            return FAILED, "No active recording"

        try:
            element_path = os.path.join(
                self.active_recording_path, "html_element.jsonl"
            )
            if not os.path.exists(element_path):
                init_encrpted_jsonl(path=element_path)

            element_entry = {
                "time_stamp": time.perf_counter(),
                "element": element_data,
            }

            with open(element_path, "a", encoding="utf-8") as f:
                write_encrypt_line(f, data=element_entry)

            return SUCCEED, "Element appended successfully"

        except Exception as e:
            logger.exception(f"FileService: append_browser_element failed: {e}")
            return FAILED, f"Failed to append element: {str(e)}"

    def append_browser_html(self, html_data: Dict) -> Tuple[str, str]:
        """Append browser HTML data to recording."""
        if not self.active_recording_path:
            return FAILED, "No active recording"

        try:
            html_path = os.path.join(self.active_recording_path, "html.jsonl")
            if not os.path.exists(html_path):
                init_encrpted_jsonl(html_path)

            html_entry = {
                "time_stamp": time.perf_counter(),
                "html": prune_html(html_data.get("data", {}).get("html", "")),
                "dom": convert_webpage_to_json_elements(
                    html_data.get("data", {}).get("dom", {})
                ),
                "url": html_data.get("data", {}).get("url", ""),
                "axtree": html_data.get("pageAxTree", {}),
            }

            with open(html_path, "a", encoding="utf-8") as f:
                write_encrypt_line(f, data=html_entry)

            return SUCCEED, "HTML appended successfully"

        except Exception as e:
            logger.exception(f"FileService: append_browser_html failed: {e}")
            return FAILED, f"Failed to append HTML: {str(e)}"

    def get_recording_info(
        self,
        recording_name: str,
        reviewing: bool = False,
        user_recordings: Dict = None,
        review_recordings: Dict = None,
    ) -> Tuple[str, Dict]:
        """Get local recording information."""
        try:
            if not recording_name:
                return FAILED, {"error": "Recording name is required"}

            recording_info = None
            if reviewing and review_recordings:
                recording_info = review_recordings.get(recording_name)
            elif not reviewing and user_recordings:
                recording_info = user_recordings.get(recording_name)

            if not recording_info:
                return FAILED, {"error": f"Recording {recording_name} not found"}

            return SUCCEED, {"data": recording_info}

        except Exception as e:
            logger.exception(f"FileService: get_recording_info failed: {e}")
            return FAILED, {"error": f"Failed to get recording info: {str(e)}"}


class AccessibilityService:
    """Service for handling accessibility tree operations."""

    def __init__(self):
        self.active_recording_path = None

    def set_active_recording(self, recording_path: str) -> None:
        """Set the active recording path."""
        self.active_recording_path = recording_path

    def save_accessibility_tree(self, axtree_data: Dict) -> Tuple[str, str]:
        """Save accessibility tree data."""
        if not self.active_recording_path:
            return FAILED, "No active recording"

        try:
            axtree_path = os.path.join(self.active_recording_path, "axtree.jsonl")
            if not os.path.exists(axtree_path):
                init_encrpted_jsonl(path=axtree_path)

            axtree_entry = {
                "time_stamp": time.perf_counter(),
                "data": axtree_data,
            }

            with open(axtree_path, "a", encoding="utf-8") as f:
                write_encrypt_line(f, data=axtree_entry)

            return SUCCEED, "Accessibility tree saved successfully"

        except Exception as e:
            logger.exception(
                f"AccessibilityService: save_accessibility_tree failed: {e}"
            )
            return FAILED, f"Failed to save accessibility tree: {str(e)}"


class FeedbackService:
    """Service for handling user feedback."""

    def __init__(self):
        pass

    def report_feedback(
        self, feedback: str, recording_name: str = None, screenshot: str = None
    ) -> Tuple[str, str]:
        """Process and log user feedback."""
        try:
            logger.info(f"FeedbackService: Processing feedback")

            if feedback:
                logger.info(f"User feedback: {feedback}")

            if screenshot:
                logger.info("Screenshot feedback received")

            if recording_name:
                logger.info(f"Feedback for recording: {recording_name}")

            # In a full implementation, this could save to database,
            # send to analytics, etc.

            return SUCCEED, "Feedback processed successfully"

        except Exception as e:
            logger.exception(f"FeedbackService: report_feedback failed: {e}")
            return FAILED, f"Failed to process feedback: {str(e)}"
