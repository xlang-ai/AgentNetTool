"""Refactored Backend with modular architecture."""

import os
import signal
import sys
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

from core.logger import logger
from services.config_service import ConfigService
from services.recording_service import RecordingService
from services.file_service import FileService
from services.obs_service import ObsService
from services.upload_service import UploadService
from controllers.recording_controller import RecordingController
from controllers.websocket_controller import WebSocketController
from controllers.browser_controller import BrowserController
from controllers.system_controller import SystemController

# For asyncio package, don't remove this line
from engineio.async_drivers import gevent


class AgentNetBackend:
    """Refactored AgentNet Backend with modular architecture."""

    def __init__(self):
        logger.info("Backend: Initializing modular backend")

        # Initialize configuration
        self.config = ConfigService()

        # Initialize Flask app and SocketIO
        self.app = Flask(__name__)
        CORS(self.app)
        self.socketio = SocketIO(
            self.app,
            cors_allowed_origins=self.config.server.cors_origins,
            async_mode="gevent",
        )

        # Initialize services
        self._initialize_services()

        # Initialize controllers
        self._initialize_controllers()

        # Setup routes and WebSocket events
        self._setup_routes()
        self._setup_websocket_events()

        logger.info("Backend: Initialization completed")

    def _initialize_services(self):
        """Initialize all service instances."""
        self.obs_service = ObsService()
        self.recording_service = RecordingService(self.socketio)
        self.upload_service = UploadService(self.socketio)
        self.file_service = FileService()

    def _initialize_controllers(self):
        """Initialize all controller instances."""
        self.recording_controller = RecordingController(
            self.recording_service, self.file_service, self.socketio
        )
        self.websocket_controller = WebSocketController(
            self.recording_service, self.obs_service, self.upload_service
        )
        self.browser_controller = BrowserController(self.file_service)
        self.system_controller = SystemController(self.obs_service)

    def _setup_routes(self):
        routes = [
            # System Endpoints
            ("/api/check_permissions", self.system_controller.check_permissions),
            ("/enable_obs_websocket", self.system_controller.enable_obs_websocket, {"methods": ["GET"]}),
            ("/polish_task_name_and_description", self.system_controller.polish_task_name_and_description_endpoint, {"methods": ["POST"]}),
            ("/api/recording/save_task", self.system_controller.save_task_endpoint, {"methods": ["POST"]}),
            # Recording Endpoints
            ("/api/recordings", self.recording_controller.get_user_recordings_list),
            ("/api/recording/<recording_name>", self.recording_controller.get_single_user_recording),
            ("/api/recording/<recording_name>/<int:verifying>", self.recording_controller.get_single_review_recording),
            # Video Endpoints
            ("/api/video/<recording_name>/<event_index>", self.recording_controller.get_video),
            ("/api/video/<recording_name>/<event_index>/<int:verifying>", self.recording_controller.get_video),
            ("/api/fullvideo/<recording_name>", self.recording_controller.get_full_video_endpoint),
            # Recording Operations
            ("/api/recording/<recording_name>/confirm", self.recording_controller.confirm_recording, {"methods": ["POST"]}),
            ("/api/recording/<recording_name>/hub_data", self.recording_controller.get_hub_data),
            ("/api/recording/<recording_name>/cut", self.recording_controller.annotate_task_endpoint, {"methods": ["POST"]}),
            # Local Operations
            ("/api/recording/<recording_name>/delete_local_recording", self.recording_controller.delete_local_recording_endpoint),
            ("/api/recording/<recording_name>/delete_local_verify_recording", self.recording_controller.delete_local_verify_recording_endpoint),
            ("/get_local_recording_info", self.recording_controller.get_local_recording_info, {"methods": ["POST"]}),
            # Browser Integration
            ("/api/browser/append_element", self.browser_controller.append_browser_element, {"methods": ["POST"]}),
            ("/api/browser/append_html", self.browser_controller.append_browser_html, {"methods": ["POST"]}),
        ]

        for route_info in routes:
            path, handler = route_info[:2]
            kwargs = route_info[2] if len(route_info) > 2 else {}
            self.app.route(path, **kwargs)(handler)

    def _setup_websocket_events(self):
        """Setup WebSocket event handlers."""
        self.websocket_controller.setup_events(self.socketio)

    def run(self, debug=None, host=None, port=None):
        """Run the Flask application."""
        # Use config defaults if not specified
        debug = debug if debug is not None else self.config.server.debug
        host = host if host is not None else self.config.server.host
        port = port if port is not None else self.config.server.port

        self.socketio.run(
            self.app, debug=debug, host=host, port=port, allow_unsafe_werkzeug=True
        )

    def update_file_service_recording_path(self):
        """Update file service with current recording path."""
        if (
            hasattr(self.recording_service, "recorder_thread")
            and self.recording_service.recorder_thread
            and hasattr(self.recording_service.recorder_thread, "recording_path")
        ):
            self.file_service.set_active_recording(
                self.recording_service.recorder_thread.recording_path
            )

    def quit(self):
        """Gracefully shutdown the backend."""
        try:
            logger.info("Backend: Starting graceful shutdown")

            # Stop recording if active
            if hasattr(self.recording_service, "recorder_thread"):
                self.recording_service.stop_recording()

            # Shutdown OBS
            self.obs_service.shutdown()

            # Stop SocketIO
            if hasattr(self, "socketio"):
                self.socketio.stop()

            # Shutdown Flask
            if hasattr(self, "app"):
                func = os.environ.get("werkzeug.server.shutdown")
                if func is not None:
                    func()

            logger.info("Backend: Graceful shutdown completed")

        except Exception as e:
            logger.exception(f"Backend: Error during shutdown: {e}")


def create_signal_handler(backend: AgentNetBackend):
    """Create signal handler for graceful shutdown."""

    def signal_handler(sig, frame):
        logger.info("\nReceived SIGINT (Ctrl+C)")
        logger.info("Do you want to terminate the application? (Y/N)")
        try:
            choice = input().strip().lower()
            if choice == "y":
                logger.info("Shutting down the application...")
                backend.quit()
                os._exit(0)
            else:
                logger.info("Continuing to run the application.")
        except (EOFError, KeyboardInterrupt):
            # Handle case where input is not available or interrupted
            logger.info("Shutting down the application...")
            backend.quit()
            os._exit(0)

    return signal_handler


def main():
    """Main entry point for the application."""
    try:
        backend = AgentNetBackend()

        # Setup signal handler
        signal.signal(signal.SIGINT, create_signal_handler(backend))

        logger.info("Backend started. Press CTRL+C to shut down the app.")
        server_config = backend.config.get_server_config()
        backend.run(
            debug=False,  # Override config for production
            host=server_config.host,
            port=5328,  # Keep original port
        )

    except Exception as e:
        logger.exception(f"Application error: {e}")
    finally:
        if "backend" in locals():
            backend.quit()
        os._exit(0)


if __name__ == "__main__":
    main()
