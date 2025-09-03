"""Error handling and validation utilities."""

import functools
from typing import Callable, Dict, Any, Tuple
from flask import jsonify, Response

from core.logger import logger
from core.constants import SUCCEED, FAILED


class ValidationError(Exception):
    """Custom exception for validation errors."""

    pass


class ApiError(Exception):
    """Custom exception for API errors."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ErrorHandler:
    """Centralized error handling utilities."""

    @staticmethod
    def create_error_response(
        message: str, status_code: int = 500
    ) -> Tuple[Response, int]:
        """Create a standardized error response."""
        return (
            jsonify({"status": FAILED, "message": message, "error": True}),
            status_code,
        )

    @staticmethod
    def create_success_response(
        data: Dict = None, message: str = "Success"
    ) -> Tuple[Response, int]:
        """Create a standardized success response."""
        response_data = {
            "status": SUCCEED,
            "message": message,
        }
        if data:
            response_data.update(data)
        return jsonify(response_data), 200

    @staticmethod
    def handle_service_response(
        service_result: Tuple[str, Any]
    ) -> Tuple[Response, int]:
        """Convert service response tuple to Flask response."""
        status, data = service_result

        if status == SUCCEED:
            if isinstance(data, dict) and "error" in data:
                return ErrorHandler.create_error_response(data["error"], 404)
            elif isinstance(data, str):
                return ErrorHandler.create_success_response(message=data)
            else:
                return ErrorHandler.create_success_response(data)
        else:
            error_message = data if isinstance(data, str) else str(data)
            return ErrorHandler.create_error_response(error_message)


def handle_api_errors(f: Callable) -> Callable:
    """Decorator to handle API errors consistently."""

    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValidationError as e:
            logger.warning(f"Validation error in {f.__name__}: {e}")
            return ErrorHandler.create_error_response(str(e), 400)
        except ApiError as e:
            logger.warning(f"API error in {f.__name__}: {e}")
            return ErrorHandler.create_error_response(e.message, e.status_code)
        except Exception as e:
            logger.exception(f"Unexpected error in {f.__name__}: {e}")
            return ErrorHandler.create_error_response(
                "An unexpected error occurred", 500
            )

    return wrapper


class Validator:
    """Input validation utilities."""

    @staticmethod
    def validate_required_fields(data: Dict, required_fields: list) -> None:
        """Validate that required fields are present in data."""
        missing_fields = [
            field
            for field in required_fields
            if field not in data or data[field] is None
        ]
        if missing_fields:
            raise ValidationError(
                f"Missing required fields: {', '.join(missing_fields)}"
            )

    @staticmethod
    def validate_recording_name(recording_name: str) -> None:
        """Validate recording name format."""
        if not recording_name:
            raise ValidationError("Recording name is required")

        if not isinstance(recording_name, str):
            raise ValidationError("Recording name must be a string")

        # Add more specific validation rules as needed
        if len(recording_name.strip()) == 0:
            raise ValidationError("Recording name cannot be empty")

    @staticmethod
    def validate_event_index(event_index: str) -> int:
        """Validate and convert event index."""
        try:
            index = int(event_index)
            if index < 0:
                raise ValidationError("Event index must be non-negative")
            return index
        except ValueError:
            raise ValidationError("Event index must be a valid integer")

    @staticmethod
    def validate_boolean_flag(flag: Any, field_name: str = "flag") -> bool:
        """Validate and convert boolean flag."""
        if isinstance(flag, bool):
            return flag
        elif isinstance(flag, str):
            if flag.lower() in ("true", "1", "yes", "on"):
                return True
            elif flag.lower() in ("false", "0", "no", "off"):
                return False
        elif isinstance(flag, int):
            return bool(flag)

        raise ValidationError(f"{field_name} must be a boolean value")

    @staticmethod
    def validate_feedback_data(data: Dict) -> None:
        """Validate feedback data structure."""
        if not isinstance(data, dict):
            raise ValidationError("Feedback data must be a dictionary")

        # Feedback field is optional but should be a string if provided
        feedback = data.get("feedback")
        if feedback is not None and not isinstance(feedback, str):
            raise ValidationError("Feedback must be a string")

        # Recording name is optional but should be a string if provided
        recording_name = data.get("recording_name")
        if recording_name is not None:
            Validator.validate_recording_name(recording_name)

    @staticmethod
    def validate_upload_data(data: Dict) -> None:
        """Validate upload data structure"""
        if "recording_name" not in data:
            raise ValidationError("Upload data must contain 'recording_name' field")

    @staticmethod
    def validate_browser_element_data(data: Dict) -> None:
        """Validate browser element data structure."""
        if not isinstance(data, dict):
            raise ValidationError("Element data must be a dictionary")

        if "data" not in data:
            raise ValidationError("Element data must contain 'data' field")

    @staticmethod
    def validate_browser_html_data(data: Dict) -> None:
        """Validate browser HTML data structure."""
        if not isinstance(data, dict):
            raise ValidationError("HTML data must be a dictionary")

        if "data" not in data:
            raise ValidationError("HTML data must contain 'data' field")

        html_data = data["data"]
        if not isinstance(html_data, dict):
            raise ValidationError("HTML data.data must be a dictionary")

        # Optional but should be strings if present
        for field in ["html", "url"]:
            if field in html_data and not isinstance(html_data[field], str):
                raise ValidationError(f"HTML data.{field} must be a string")
