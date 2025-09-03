import sys
import os
from pathlib import Path
from platform import system


if system() == "Darwin":
    # Prepare ffmpeg
    application_path = sys._MEIPASS
    ffmpeg_path = Path(application_path) / "ffmpeg" / "ffmpeg"
    os.environ["IMAGEIO_FFMPEG_EXE"] = str(ffmpeg_path)

# Recording dir
os.makedirs(str(Path(sys._MEIPASS) / "AgentNetRecordings"), exist_ok=True)
# Review recordings
os.makedirs(str(Path(sys._MEIPASS) / "AgentNetReviewRecordings"), exist_ok=True)
