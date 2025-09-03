import shutil
import sys
import os
from pathlib import Path
from platform import system
from subprocess import CalledProcessError, run

backend_dir = Path(".")
if system() == "Darwin":
    ffmpeg = backend_dir / "ffmpeg"
elif system() == "Windows":
    ffmpeg = backend_dir / "ffmpeg.exe"

# dll on windows
if system() == "Windows":
    libs = backend_dir / "libs"

for dir_to_remove in ["dist", "build"]:
    dir_path = backend_dir / dir_to_remove
    if dir_path.exists():
        shutil.rmtree(dir_path)

if system() == "Darwin":
    pyinstaller_cmd = [
        "pyinstaller", "--onedir",
        f"--add-data={ffmpeg}{';' if system() == 'Windows' else ':'}{ffmpeg}",
        "--hidden-import", "gevent-websocket",
        "--runtime-hook", "runtime-hook.py",
        "--distpath", "./dist",
        "backend.py"
    ]
else:
    pyinstaller_cmd = [
        "pyinstaller", "--onedir",
        f"--add-data={libs}{';' if system() == 'Windows' else ':'}{libs}",
        f"--add-data={ffmpeg}{';' if system() == 'Windows' else ':'}{backend_dir / 'ffmpeg'}",
        "--hidden-import", "gevent-websocket",
        "--runtime-hook", "runtime-hook.py",
        "--distpath", "./dist",
        "--collect-all", "comtypes",
        "backend.py"
    ]

try:
    run(pyinstaller_cmd, check=True, env=os.environ)
except CalledProcessError as e:
    print("An error occurred while running PyInstaller:", e)
    sys.exit(1)
