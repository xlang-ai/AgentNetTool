"""Browser controller for handling browser integration endpoints."""

from flask import request
from typing import Tuple, Dict, Any

from services.file_service import FileService
from services.error_handler import ErrorHandler, handle_api_errors, Validator


class BrowserController:
    """Controller for browser integration endpoints."""

    def __init__(self, file_service: FileService):
        self.file_service = file_service

    @handle_api_errors
    def append_browser_element(self) -> Tuple[Dict[str, Any], int]:
        """Append browser element data to recording."""
        if not request.json:
            return ErrorHandler.create_error_response("No data provided", 400)

        Validator.validate_browser_element_data(request.json)

        element_data = request.json.get("data")
        status, message = self.file_service.append_browser_element(element_data)

        return ErrorHandler.handle_service_response((status, message))

    @handle_api_errors
    def append_browser_html(self) -> Tuple[Dict[str, Any], int]:
        """Append browser HTML data to recording."""
        if not request.json:
            return ErrorHandler.create_error_response("No data provided", 400)

        Validator.validate_browser_html_data(request.json)

        status, message = self.file_service.append_browser_html(request.json)

        return ErrorHandler.handle_service_response((status, message))
