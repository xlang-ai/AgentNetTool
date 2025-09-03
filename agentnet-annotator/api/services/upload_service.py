import threading
import os

from queue import Queue

from core.utils import (
    RECORDING_DIR,
    get_hk_time,
    check_recording_completeness,
    read_encrypted_jsonl,
    get_task_name_from_folder,
    get_description_from_folder,
    get_apps,
)
from core.logger import logger
from core.constants import SUCCEED, FAILED


def upload_recording(recording_name):

    from core.cloud_v2 import upload_folder_concurrent

    try:
        timestamp = get_hk_time()
        recording_path = os.path.join(RECORDING_DIR, recording_name)
        upload_recording_name = timestamp + "_" + recording_name

        oss_path = "recordings/" + upload_recording_name
        # logger.warning(post_data)

        try:
            upload_folder_concurrent(
                local_folder_path=recording_path,
                remote_folder_path=oss_path
            )

        except Exception as e:
            logger.exception("upload_recording: upload_file failed.")
            return {
                "status": FAILED,
                "recording_name": recording_name,
                "message": f"Upload_recording failed: \n{str(e)}.",
            }

        logger.info(f"Successfully upload {recording_name}.")

        return {
            "status": SUCCEED,
            "recording_name": recording_name,
            "message": "Upload_recording succeed.",
        }

    except Exception as e:
        logger.exception(f"Upload_recording failed: \n{str(e)}")
        return {
            "status": FAILED,
            "recording_name": recording_name,
            "message": f"Upload_recording failed: \n{str(e)}.",
        }


class UploadService:
    def __init__(self, socketio):
        self.socketio = socketio
        self.upload_queue = Queue()
        self.upload_thread = threading.Thread(
            target=self._process_upload_queue, daemon=True
        )
        self.upload_thread.start()

    def enqueue_upload(self, data):
        recording_name = data.get("recording_name", "")
        self.upload_queue.put(recording_name)

    def _process_upload_queue(self):
        while True:
            recording_name = self.upload_queue.get()
            if recording_name is None:
                self.upload_queue.task_done()
                continue

            try:
                result = upload_recording(recording_name)
                self.socketio.emit("upload_recording", result)
            except Exception as e:
                logger.exception(f"Upload_recording failed: {str(e)}")
                self.socketio.emit(
                    "upload_recording",
                    {
                        "status": FAILED,
                        "recording_name": recording_name,
                        "message": f"Upload_recording failed: {str(e)}.",
                    },
                )
