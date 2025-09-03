"""Recording controller for handling recording-related HTTP endpoints."""

import os
from flask import request
from typing import Tuple, Dict, Any

from core.utils import RECORDING_DIR
from core.backend_func import annotate_task, delete_local_recording, delete_local_verify_recording, get_full_video
from services.recording_service import RecordingService
from services.file_service import FileService
from services.error_handler import ErrorHandler, handle_api_errors, Validator


class RecordingController:
    """Controller for recording-related endpoints."""

    def __init__(self, recording_service: RecordingService, file_service: FileService, socketio):
        self.recording_service = recording_service
        self.file_service = file_service
        self.socketio = socketio

    @handle_api_errors
    def get_user_recordings_list(self) -> Tuple[Dict[str, Any], int]:
        """Get list of user recordings."""
        recordings_data = self.recording_service.get_user_recordings()
        return ErrorHandler.create_success_response(recordings_data)

    @handle_api_errors
    def get_single_user_recording(self, recording_name: str) -> Tuple[Dict[str, Any], int]:
        """Get details of a single user recording."""
        Validator.validate_recording_name(recording_name)

        status, data = self.recording_service.get_single_recording(recording_name, reviewing=False)
        return ErrorHandler.handle_service_response((status, data))

    @handle_api_errors
    def get_single_review_recording(self, recording_name: str, verifying: int = 1) -> Tuple[Dict[str, Any], int]:
        """Get details of a single review recording."""
        Validator.validate_recording_name(recording_name)

        status, data = self.recording_service.get_single_recording(
            recording_name, reviewing=bool(verifying)
        )
        return ErrorHandler.handle_service_response((status, data))

    @handle_api_errors
    def get_video(self, recording_name: str, event_index: str, verifying: int = 0) -> Tuple[Dict[str, Any], int]:
        """Get video path for a specific event."""
        Validator.validate_recording_name(recording_name)
        validated_index = Validator.validate_event_index(event_index)

        status, data = self.recording_service.get_video_path(
            recording_name, str(validated_index), bool(verifying)
        )
        return ErrorHandler.handle_service_response((status, data))

    @handle_api_errors
    def confirm_recording(self, recording_name: str) -> Tuple[Dict[str, Any], int]:
        """Confirm and save recording modifications."""
        Validator.validate_recording_name(recording_name)

        if not request.json:
            return ErrorHandler.create_error_response("No data provided", 400)

        events_data = request.json
        if not isinstance(events_data, list):
            return ErrorHandler.create_error_response("Events data must be a list", 400)

        status, message = self.recording_service.confirm_recording(recording_name, events_data)
        return ErrorHandler.handle_service_response((status, message))

    @handle_api_errors
    def get_hub_data(self, recording_name: str) -> Tuple[Dict[str, Any], int]:
        """Get hub data for a recording."""
        Validator.validate_recording_name(recording_name)

        recording_path = os.path.join(RECORDING_DIR, recording_name)
        if not os.path.exists(recording_path):
            return ErrorHandler.create_error_response("Recording not found", 404)

        status, data = self.file_service.get_hub_data(recording_name, recording_path)
        return ErrorHandler.handle_service_response((status, data))

    @handle_api_errors
    def annotate_task_endpoint(self, recording_name: str) -> Tuple[Dict[str, Any], int]:
        """Create annotation task for recording."""
        Validator.validate_recording_name(recording_name)

        # Use existing function but wrap in error handling
        try:
            result = annotate_task(recording_name=recording_name, socketservice=self.socketio)
            return result
        except Exception as e:
            return ErrorHandler.create_error_response(f"Failed to annotate task: {str(e)}")

    @handle_api_errors
    def delete_local_recording_endpoint(self, recording_name: str) -> Tuple[Dict[str, Any], int]:
        """Delete local recording."""
        Validator.validate_recording_name(recording_name)

        try:
            result = delete_local_recording(recording_name)
            return result
        except Exception as e:
            return ErrorHandler.create_error_response(f"Failed to delete recording: {str(e)}")

    @handle_api_errors
    def delete_local_verify_recording_endpoint(self, recording_name: str) -> Tuple[Dict[str, Any], int]:
        """Delete local verify recording."""
        Validator.validate_recording_name(recording_name)

        try:
            result = delete_local_verify_recording(recording_name)
            return result
        except Exception as e:
            return ErrorHandler.create_error_response(f"Failed to delete verify recording: {str(e)}")

    @handle_api_errors
    def get_full_video_endpoint(self, recording_name: str) -> Tuple[Dict[str, Any], int]:
        """Get full video for recording."""
        Validator.validate_recording_name(recording_name)

        try:
            result = get_full_video(recording_name)
            return result
        except Exception as e:
            return ErrorHandler.create_error_response(f"Failed to get full video: {str(e)}")

    @handle_api_errors
    def get_local_recording_info(self) -> Tuple[Dict[str, Any], int]:
        """Get local recording information."""
        if not request.json:
            return ErrorHandler.create_error_response("No data provided", 400)

        data = request.json
        Validator.validate_required_fields(data, ["recording_name", "reviewing"])

        recording_name = data["recording_name"]
        reviewing = data["reviewing"]

        Validator.validate_recording_name(recording_name)
        reviewing = Validator.validate_boolean_flag(reviewing, "reviewing")

        # This would need to be connected to the actual recording caches
        # For now, return placeholder
        status, result = self.file_service.get_recording_info(
            recording_name, reviewing, 
            self.recording_service.user_recordings, None
        )
        return ErrorHandler.handle_service_response((status, result))
