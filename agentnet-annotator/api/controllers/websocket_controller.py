"""WebSocket controller for handling real-time events."""

import time
from flask_socketio import emit

from core.logger import logger
from core.a11y import get_accessibility_tree
from services.recording_service import RecordingService
from services.file_service import AccessibilityService, FeedbackService
from services.obs_service import ObsService
from services.upload_service import UploadService
from services.error_handler import Validator
from core.constants import SUCCEED, FAILED


class WebSocketController:
    """Controller for WebSocket events."""

    def __init__(
        self,
        recording_service: RecordingService,
        obs_service: ObsService,
        upload_service: UploadService
    ):
        self.recording_service = recording_service
        self.obs_service = obs_service
        self.upload_service = upload_service
        self.accessibility_service = AccessibilityService()
        self.feedback_service = FeedbackService()

    def start_record(self, data: dict = None) -> None:
        """Handle start recording WebSocket event."""
        logger.info("WebSocketController: start_record")

        # Ensure OBS is running
        status, message = self.obs_service.ensure_obs_running()
        if status == FAILED:
            emit("start_record", {"status": FAILED, "message": message})
            return

        try:
            # Extract task hub data
            task_hub_data = data.get("task_hub_data", {}) if data else {}

            # Start recording
            status, message = self.recording_service.start_recording(task_hub_data)

            # Set active recording path for other services
            if hasattr(self.recording_service.recorder_thread, "recording_path"):
                self.accessibility_service.set_active_recording(
                    self.recording_service.recorder_thread.recording_path
                )

            emit("start_record", {"status": status, "message": message})

        except Exception as e:
            logger.exception("WebSocketController: start_record failed")
            emit(
                "start_record",
                {"status": FAILED, "message": f"Failed to start recording: {str(e)}"},
            )

    def stop_record(self, data: dict = None) -> None:
        """Handle stop recording WebSocket event."""
        logger.info("WebSocketController: stop_record")

        try:
            status, message = self.recording_service.stop_recording()
            emit("stop_record", {"status": status, "message": message})

        except Exception as e:
            logger.exception("WebSocketController: stop_record failed")
            emit(
                "stop_record",
                {"status": FAILED, "message": f"Failed to stop recording: {str(e)}"},
            )

    def get_axtree(self, data: dict = None) -> None:
        """Handle accessibility tree request."""
        try:
            start_time = time.time()
            axtree_data = get_accessibility_tree()

            status, message = self.accessibility_service.save_accessibility_tree(
                axtree_data
            )

            logger.info(
                f"WebSocketController: get_axtree completed in {time.time() - start_time:.2f}s"
            )
            emit("get_axtree", {"status": "succeed" if status == SUCCEED else "failed"})

        except Exception as e:
            logger.exception("WebSocketController: get_axtree failed")
            emit("get_axtree", {"status": "failed"})

    def toggle_generate_window_a11y(self, data: dict) -> None:
        """Handle toggle window accessibility generation."""
        try:
            if not isinstance(data, dict) or "flag" not in data:
                logger.warning(
                    "WebSocketController: Invalid data for toggle_generate_window_a11y"
                )
                return

            flag = Validator.validate_boolean_flag(data["flag"], "flag")
            self.recording_service.toggle_window_a11y(flag)

        except Exception as e:
            logger.exception("WebSocketController: toggle_generate_window_a11y failed")

    def report_feedback(self, data: dict) -> None:
        """Handle feedback reporting."""
        try:
            Validator.validate_feedback_data(data)

            feedback = data.get("feedback", "")
            recording_name = data.get("recording_name", "")
            screenshot = data.get("screenshot")

            status, message = self.feedback_service.report_feedback(
                feedback, recording_name, screenshot
            )

            emit("report_feedback", {"status": status, "message": message})

        except Exception as e:
            logger.exception("WebSocketController: report_feedback failed")
            emit(
                "report_feedback",
                {"status": FAILED, "message": f"Failed to process feedback: {str(e)}"},
            )

    def upload_recording(self, data: dict) -> None:
        try:
            Validator.validate_upload_data(data)

            self.upload_service.enqueue_upload(data)

        except Exception as e:
            logger.exception("WebSocketController: upload_recording failed")
            emit(
                "upload_recording",
                {"status": FAILED, "message": f"Failed to upload task: {str(e)}"},
            )

    def setup_events(self, socketio) -> None:
        """Setup WebSocket event handlers."""
        socketio.on_event("start_record", self.start_record)
        socketio.on_event("stop_record", self.stop_record)
        socketio.on_event("get_axtree", self.get_axtree)
        socketio.on_event(
            "toggle_generate_window_a11y", self.toggle_generate_window_a11y
        )
        socketio.on_event("report_feedback", self.report_feedback)
        socketio.on_event("upload_recording", self.upload_recording)
