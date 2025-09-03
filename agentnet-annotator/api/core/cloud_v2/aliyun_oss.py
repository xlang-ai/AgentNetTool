# -*- coding: utf-8 -*-

import os
import hashlib
import time
import threading
from typing import Tuple, Optional, List, Dict, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
import oss2
from tenacity import retry, stop_after_attempt, wait_exponential
from requests.exceptions import RequestException
from ..logger import logger


class AliyunOSSClient:
    def __init__(self):
        self.access_key_id = os.getenv("OSS_ACCESS_KEY_ID")
        self.access_key_secret = os.getenv("OSS_ACCESS_KEY_SECRET")
        self.bucket_name = os.getenv("OSS_BUCKET_NAME")
        self.endpoint = os.getenv("OSS_ENDPOINT")

        if not all(
            [
                self.access_key_id,
                self.access_key_secret,
                self.bucket_name,
                self.endpoint,
            ]
        ):
            raise ValueError("Missing required OSS environment variables")

        self.auth = oss2.Auth(self.access_key_id, self.access_key_secret)
        self.bucket = oss2.Bucket(self.auth, self.endpoint, self.bucket_name)

    def upload_file(self, source_file_name: str, destination_blob_name: str) -> bool:
        try:
            file_size = os.path.getsize(source_file_name)

            # Use resumable upload for better reliability
            if file_size > 100 * 1024:  # 100KB threshold for multipart
                oss2.resumable_upload(
                    self.bucket,
                    destination_blob_name,
                    source_file_name,
                    multipart_threshold=100 * 1024,
                )
            else:
                with open(source_file_name, "rb") as fileobj:
                    self.bucket.put_object(destination_blob_name, fileobj)

            logger.info(
                f"OSS Upload Successful: {source_file_name} to {destination_blob_name}"
            )
            return True

        except Exception as e:
            logger.exception(f"OSS: Error uploading file: {e}")
            return False

    def get_download_url(
        self, object_name: str, expires: int = 3600
    ) -> Tuple[Optional[str], str]:
        try:
            # Check if object exists
            if not self.bucket.object_exists(object_name):
                logger.warning(f"OSS: Object {object_name} does not exist.")
                return None, "NOT_FOUND"

            # Generate presigned URL
            download_url = self.bucket.sign_url("GET", object_name, expires)
            return download_url, "SUCCEED"

        except Exception as e:
            logger.exception(f"OSS: Error getting download URL: {e}")
            return None, "ERROR"

    def calculate_md5(self, file_path: str) -> str:
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    @retry(
        stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    def download_with_retry(
        self, object_name: str, destination_file_path: str, start_byte: int = 0
    ):
        if start_byte > 0:
            # Resume download from specific byte position
            headers = {"Range": f"bytes={start_byte}-"}
            return self.bucket.get_object(object_name, headers=headers)
        else:
            return self.bucket.get_object(object_name)

    def download_file(
        self,
        source_blob_name: str,
        destination_file_path: str,
        recording_id: str,
        socketio: Optional[object] = None,
    ) -> Tuple[bool, str]:
        try:
            # Check if object exists first
            if not self.bucket.object_exists(source_blob_name):
                logger.warning(f"OSS: Object {source_blob_name} does not exist.")
                return False, "NOT_FOUND"

            # Get object metadata to check file size
            object_meta = self.bucket.head_object(source_blob_name)
            total_size = object_meta.content_length

            # Check if the file already exists (for resume support)
            file_exists = os.path.exists(destination_file_path)
            downloaded_size = (
                os.path.getsize(destination_file_path) if file_exists else 0
            )

            if downloaded_size >= total_size:
                logger.info(f"File {destination_file_path} already fully downloaded")
                return True, "SUCCEED"

            logger.info(
                f"Total file size: {total_size} bytes, already downloaded: {downloaded_size} bytes"
            )

            last_reported_percentage = 0
            last_emit_time = time.time()
            emit_interval = 1  # seconds

            # Download with resume support
            response = self.download_with_retry(
                source_blob_name, destination_file_path, downloaded_size
            )

            # Open file in append mode if resuming, otherwise write mode
            mode = "ab" if file_exists and downloaded_size > 0 else "wb"
            with open(destination_file_path, mode) as file:
                for chunk in response:
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
                                logger.info(
                                    f"Download progress: {downloaded_size} bytes of {total_size} bytes"
                                )

                                # Emit progress to the front end
                                if socketio:
                                    socketio.emit(
                                        f"download_recording{recording_id}/progress",
                                        {
                                            "status": "downloading",
                                            "progress": progress_percentage,
                                        },
                                    )

            # Verify the downloaded file size
            if os.path.getsize(destination_file_path) != total_size:
                logger.warning(f"Downloaded file size doesn't match expected size.")
                return False, "SizeMismatch"

            # Calculate MD5 checksum for verification
            file_md5 = self.calculate_md5(destination_file_path)
            logger.info(f"MD5 Checksum: {file_md5}")

            # Ensure progress is set to 100% after the download completes
            if socketio:
                socketio.emit(
                    f"download_recording{recording_id}/progress",
                    {"status": "downloading", "progress": 100},
                )

            logger.info(
                f"OSS Download Successful: {source_blob_name} to {destination_file_path}"
            )
            return True, "SUCCEED"

        except oss2.exceptions.NoSuchKey:
            logger.warning(f"OSS: Object {source_blob_name} does not exist.")
            return False, "NOT_FOUND"
        except oss2.exceptions.AccessDenied:
            logger.exception(f"OSS: Access denied for {source_blob_name}")
            return False, "ACCESS_DENIED"
        except IOError as e:
            logger.exception(f"IO error writing file {destination_file_path}: {e}")
            return False, "IOError"
        except Exception as e:
            logger.exception(
                f"OSS: Unexpected error downloading {source_blob_name}: {e}"
            )
            return False, "ERROR"

    def _get_all_files(self, folder_path: str) -> List[Tuple[str, str]]:
        file_list = []
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                local_file_path = os.path.join(root, file)
                # Create relative path from the folder_path
                relative_path = os.path.relpath(local_file_path, folder_path)
                # Convert Windows paths to Unix-style for OSS
                remote_path = relative_path.replace(os.sep, "/")
                file_list.append((local_file_path, remote_path))
        return file_list

    def upload_folder(
        self,
        local_folder_path: str,
        remote_folder_path: str,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
    ) -> Dict[str, any]:
        if not os.path.exists(local_folder_path):
            raise FileNotFoundError(f"Local folder {local_folder_path} does not exist")

        if not os.path.isdir(local_folder_path):
            raise ValueError(f"Path {local_folder_path} is not a directory")

        # Get all files in the folder
        file_list = self._get_all_files(local_folder_path)

        if not file_list:
            logger.warning(f"No files found in folder {local_folder_path}")
            return {"success": True, "uploaded": 0, "failed": 0, "failed_files": []}

        total_files = len(file_list)
        uploaded_count = 0
        failed_count = 0
        failed_files = []

        logger.info(f"Starting upload of {total_files} files from {local_folder_path}")

        for i, (local_file, relative_path) in enumerate(file_list, 1):
            # Combine remote folder path with relative path
            remote_file_path = f"{remote_folder_path.rstrip('/')}/{relative_path}"

            try:
                success = self.upload_file(local_file, remote_file_path)
                if success:
                    uploaded_count += 1
                    logger.info(f"Uploaded ({i}/{total_files}): {relative_path}")
                else:
                    failed_count += 1
                    failed_files.append(relative_path)
                    logger.error(
                        f"Failed to upload ({i}/{total_files}): {relative_path}"
                    )

                # Call progress callback if provided
                if progress_callback:
                    progress_callback(i, total_files, relative_path)

            except Exception as e:
                failed_count += 1
                failed_files.append(relative_path)
                logger.exception(f"Error uploading {relative_path}: {e}")

        result = {
            "success": failed_count == 0,
            "uploaded": uploaded_count,
            "failed": failed_count,
            "total": total_files,
            "failed_files": failed_files,
        }

        logger.info(
            f"Upload completed. Success: {uploaded_count}/{total_files}, Failed: {failed_count}"
        )
        return result

    def upload_folder_concurrent(
        self,
        local_folder_path: str,
        remote_folder_path: str,
        max_workers: int = 5,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
    ) -> Dict[str, any]:
        if not os.path.exists(local_folder_path):
            raise FileNotFoundError(f"Local folder {local_folder_path} does not exist")

        if not os.path.isdir(local_folder_path):
            raise ValueError(f"Path {local_folder_path} is not a directory")

        # Get all files in the folder
        file_list = self._get_all_files(local_folder_path)

        if not file_list:
            logger.warning(f"No files found in folder {local_folder_path}")
            return {"success": True, "uploaded": 0, "failed": 0, "failed_files": []}

        total_files = len(file_list)
        uploaded_count = 0
        failed_count = 0
        failed_files = []
        completed_files = 0

        logger.info(
            f"Starting concurrent upload of {total_files} files with {max_workers} workers"
        )

        def upload_single_file(local_file: str, remote_path: str) -> Tuple[bool, str]:
            try:
                remote_file_path = f"{remote_folder_path.rstrip('/')}/{remote_path}"
                success = self.upload_file(local_file, remote_file_path)
                return success, remote_path
            except Exception as e:
                logger.exception(f"Error uploading {remote_path}: {e}")
                return False, remote_path

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all upload tasks
            future_to_file = {
                executor.submit(
                    upload_single_file, local_file, relative_path
                ): relative_path
                for local_file, relative_path in file_list
            }

            # Process completed uploads
            for future in as_completed(future_to_file):
                relative_path = future_to_file[future]
                completed_files += 1

                try:
                    success, file_path = future.result()
                    if success:
                        uploaded_count += 1
                        logger.info(
                            f"Uploaded ({completed_files}/{total_files}): {file_path}"
                        )
                    else:
                        failed_count += 1
                        failed_files.append(file_path)
                        logger.error(
                            f"Failed to upload ({completed_files}/{total_files}): {file_path}"
                        )

                    # Call progress callback if provided
                    if progress_callback:
                        progress_callback(completed_files, total_files, file_path)

                except Exception as e:
                    failed_count += 1
                    failed_files.append(relative_path)
                    logger.exception(
                        f"Exception in upload future for {relative_path}: {e}"
                    )

        result = {
            "success": failed_count == 0,
            "uploaded": uploaded_count,
            "failed": failed_count,
            "total": total_files,
            "failed_files": failed_files,
        }

        logger.info(
            f"Concurrent upload completed. Success: {uploaded_count}/{total_files}, Failed: {failed_count}"
        )
        return result


# Global client instance
_oss_client = None
_client_lock = threading.Lock()


def get_oss_client() -> AliyunOSSClient:
    global _oss_client
    if _oss_client is None:
        with _client_lock:
            if _oss_client is None:
                _oss_client = AliyunOSSClient()
    return _oss_client


# Convenience functions to maintain compatibility with existing interface
def upload_file(source_file_name: str, destination_blob_name: str) -> bool:
    client = get_oss_client()
    return client.upload_file(source_file_name, destination_blob_name)


def get_download_url(object_name: str) -> Tuple[Optional[str], str]:
    client = get_oss_client()
    return client.get_download_url(object_name)


def download_file(
    source_blob_name: str,
    destination_file_path: str,
    recording_id: str,
    socketio: Optional[object] = None,
) -> Tuple[bool, str]:
    client = get_oss_client()
    return client.download_file(
        source_blob_name, destination_file_path, recording_id, socketio
    )


def calculate_md5(file_path: str) -> str:
    client = get_oss_client()
    return client.calculate_md5(file_path)


def upload_folder(
    local_folder_path: str,
    remote_folder_path: str,
    progress_callback: Optional[Callable[[int, int, str], None]] = None,
) -> Dict[str, any]:
    client = get_oss_client()
    return client.upload_folder(
        local_folder_path, remote_folder_path, progress_callback
    )


def upload_folder_concurrent(
    local_folder_path: str,
    remote_folder_path: str,
    max_workers: int = 5,
    progress_callback: Optional[Callable[[int, int, str], None]] = None,
) -> Dict[str, any]:
    client = get_oss_client()
    return client.upload_folder_concurrent(
        local_folder_path, remote_folder_path, max_workers, progress_callback
    )
