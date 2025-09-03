"""System controller for handling system-level endpoints."""

from typing import Tuple, Dict, Any

from core.ai_assistant import polish_task_name_and_description
from core.backend_func import save_task
from services.obs_service import ObsService
from services.error_handler import ErrorHandler, handle_api_errors


class SystemController:
    """Controller for system-level endpoints."""

    def __init__(self, obs_service: ObsService):
        self.obs_service = obs_service

    @handle_api_errors
    def check_permissions(self) -> Tuple[Dict[str, Any], int]:
        """Check system permissions."""
        # This is a simplified permissions check
        return ErrorHandler.create_success_response(
            message="Permission check completed"
        )

    @handle_api_errors
    def enable_obs_websocket(self) -> Tuple[Dict[str, Any], int]:
        """Enable OBS WebSocket."""
        status, message = self.obs_service.enable_websocket()
        return ErrorHandler.handle_service_response((status, message))

    @handle_api_errors
    def polish_task_name_and_description_endpoint(self) -> Tuple[Dict[str, Any], int]:
        """Polish task name and description using AI."""
        try:
            # Delegate to existing function
            result = polish_task_name_and_description()
            return result
        except Exception as e:
            return ErrorHandler.create_error_response(
                f"Failed to polish task description: {str(e)}"
            )

    @handle_api_errors
    def save_task_endpoint(self) -> Tuple[Dict[str, Any], int]:
        """Save task data."""
        try:
            # Delegate to existing function
            result = save_task()
            return result
        except Exception as e:
            return ErrorHandler.create_error_response(f"Failed to save task: {str(e)}")
