import os
import requests
from typing import Tuple, Optional
from ..logger import logger
from ..constants import SERVER_URL
from tenacity import retry, stop_after_attempt, wait_exponential
import hashlib
import time
from requests.exceptions import RequestException
import threading

def get_upload_url(object_name):
    try:
        response = requests.get(
            f"{SERVER_URL}/get_upload_url",
            params={"object_name": object_name},
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        if not data.get("success"):
            logger.warning(f"S3: Error getting upload URL: {data.get('message')}")
            return None
        return data["upload_url"]

    except Exception as e:
        logger.exception(f"S3: Error getting upload URL: {e}")
        return None


def upload_file(source_file_name, destination_blob_name):
    upload_url = get_upload_url(destination_blob_name)
    if not upload_url:
        logger.warning(f"S3: upload_url is not generated.")
        raise Exception(f"S3: upload_url is not generated.")

    with open(source_file_name, "rb") as file:
        response = requests.put(upload_url, data=file)

    response.raise_for_status()

    logger.info(f"Upload Successful: {source_file_name} to {destination_blob_name}")


def get_download_url(object_name):
    try:
        response = requests.get(
            f"{SERVER_URL}/get_download_url",
            params={"object_name": object_name},
            timeout=20,
        )

        data = response.json()
        if not data.get("success"):
            error_code = data.get("error_code")
            if error_code == "404":
                logger.warning(f"S3: Object {object_name} does not exist.")
                return None, "NOT_FOUND"
            else:
                logger.warning(f"S3: Error getting download URL: {data.get('message')}")
                None, "ERROR"
                
        return data["download_url"], "SUCCEED"

    except requests.RequestException as e:
        logger.exception(f"Request failed in get_download_url: {e}")
        return None, "ERROR"
    except Exception as e:
        logger.exception(f"Unexpected error in get_download_url: {e}")
        return None, "ERROR"


# Function to calculate MD5 checksum of a file
def calculate_md5(file_path):
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

# Function with retry logic to handle download
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def download_with_retry(url, headers=None, timeout=30):
    return requests.get(url, headers=headers, stream=True, timeout=timeout)

# Main download function
def download_file(source_blob_name: str, destination_file_path: str, recording_id: str, socketio: Optional[object]):
    try:
        # Fetch the presigned download URL
        download_url, status = get_download_url(source_blob_name)
        if not download_url:
            logger.warning("S3: download_url is not generated.")
            return False, status

        # Check if the file already exists (for resume support)
        file_exists = os.path.exists(destination_file_path)
        downloaded_size = os.path.getsize(destination_file_path) if file_exists else 0
        headers = {"Range": f"bytes={downloaded_size}-"} if file_exists else None

        # Download the file with retry logic
        with download_with_retry(download_url, headers=headers) as response:
            response.raise_for_status()
            total_size = int(response.headers.get("content-length", 0)) + downloaded_size
            logger.info(f"Total file size: {total_size} bytes")

            last_reported_percentage = 0
            last_emit_time = time.time()
            emit_interval = 1  # seconds

            # Append to the file if it exists (for resume support)
            with open(destination_file_path, "ab") as file:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        file.write(chunk)
                        file.flush()
                        downloaded_size += len(chunk)

                        # Calculate and report progress
                        progress_percentage = int((downloaded_size / total_size) * 100)
                        if time.time() - last_emit_time >= emit_interval:
                            last_emit_time = time.time()
                            if progress_percentage >= last_reported_percentage + 1:
                                last_reported_percentage = progress_percentage
                                logger.info(f"Download progress: {downloaded_size} bytes of {total_size} bytes")

                                # Emit progress to the front end
                                if socketio:
                                    socketio.emit(f"download_recording{recording_id}/progress",
                                                  {"status": "downloading", "progress": progress_percentage})

        # Verify the downloaded file size
        if os.path.getsize(destination_file_path) != total_size:
            logger.warning(f"Downloaded file size doesn't match expected size.")
            return False, "SizeMismatch"

        # Optionally verify file with hash (MD5 checksum)
        file_md5 = calculate_md5(destination_file_path)
        logger.info(f"MD5 Checksum: {file_md5}")

        # Ensure progress is set to 100% after the download completes
        if socketio:
            socketio.emit(f"download_recording{recording_id}/progress",
                  {"status": "downloading", "progress": 100})

        logger.info(f"Download Successful: {source_blob_name} to {destination_file_path}")
        return True, "SUCCEED"

    except RequestException as e:
        logger.exception(f"Network error downloading {source_blob_name}: {e}")
        return False, "RequestException"
    except IOError as e:
        logger.exception(f"IO error writing file {destination_file_path}: {e}")
        return False, "IOError"
    except Exception as e:
        logger.exception(f"Unexpected error downloading {source_blob_name}: {e}")
        return False, "ERROR"

