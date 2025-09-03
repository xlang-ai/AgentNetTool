from loguru import logger as _logger
import sys
import os

logger = _logger

# Set up log file path based on whether the script is frozen (compiled with PyInstaller)
if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
    logger_path = os.path.join(sys._MEIPASS, "runtime.log")
else:
    logger_path = "runtime.log"

# Clear any existing handlers to avoid duplicate logs
logger.remove()

# Ensure stdout uses utf-8 encoding
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

# Add a handler for stdout (console output)
logger.add(sys.stdout, level="INFO", colorize=True)

# Add a handler for file logging
logger.add(logger_path, level="INFO", colorize=False, mode="w")

# Print the absolute path of the logger file
abs_logger_path = os.path.abspath(logger_path)
