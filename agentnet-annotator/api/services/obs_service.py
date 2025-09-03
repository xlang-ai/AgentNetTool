"""OBS service for handling OBS integration."""

import time
from typing import Tuple

from core.logger import logger
from core.obs_client import close_obs, is_obs_running, open_obs
from core.constants import SUCCEED, FAILED
from scripts.obs_config import enable_obs_websocket


class ObsService:
    """Service for handling OBS operations."""

    def __init__(self):
        self.obs_process = None
        self._initialize_obs()

    def _initialize_obs(self) -> None:
        """Initialize OBS if not already running."""
        if not is_obs_running():
            self.obs_process = open_obs()

    def ensure_obs_running(self, max_attempts: int = 10) -> Tuple[str, str]:
        """Ensure OBS is running and ready."""
        attempt = 0
        time.sleep(1)

        while attempt < max_attempts:
            if not is_obs_running():
                time.sleep(0.5)
                attempt += 1
            else:
                return SUCCEED, "OBS is running"

        logger.warning("ObsService: Failed to start OBS")
        return FAILED, "Failed to start OBS"

    def enable_websocket(self) -> Tuple[str, str]:
        """Enable OBS WebSocket."""
        try:
            enable_obs_websocket()
            logger.info("ObsService: OBS WebSocket enabled successfully")
            return SUCCEED, "OBS WebSocket enabled successfully"

        except Exception as e:
            logger.exception(f"ObsService: Failed to enable OBS WebSocket: {e}")
            return FAILED, f"Failed to enable OBS WebSocket: {str(e)}"

    def shutdown(self) -> None:
        """Shutdown OBS process if managed by this service."""
        try:
            if hasattr(self, "obs_process") and self.obs_process:
                close_obs(self.obs_process)
                logger.info("ObsService: OBS process closed")
        except Exception as e:
            logger.exception(f"ObsService: Error closing OBS: {e}")

    def is_running(self) -> bool:
        """Check if OBS is currently running."""
        return is_obs_running()
