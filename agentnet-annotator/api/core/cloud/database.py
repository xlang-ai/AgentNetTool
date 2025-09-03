import requests
from flask import jsonify, request
from typing import List, Tuple, Dict

from ..logger import logger
from ..constants import *


def insert_recording_to_db(data: Dict):
    try:
        response = requests.post(SERVER_URL + "/insert_recording_to_db", json=data)
        if response.status_code == 200:
            logger.info(f"Database: insert_recording_to_db succeed.")
            return True
        else:
            logger.warning(f"Database: insert_recording_to_db failed.")
            logger.warning(str(response))
            return False

    except Exception as e:
        logger.warning(f"Database: insert_recording_to_db failed.\n{str(e)}")
        raise ValueError(f"Database: insert_recording_to_db failed.\n{str(e)}")


def get_recording_info(recording_id: str) -> Dict:
    try:
        logger.info("Sending request to get_recording_info")
        response = requests.get(
            SERVER_URL + "/get_recording_info",
            params={"recording_id": recording_id},
            timeout=30,
        )

        if response.status_code == 200:
            try:
                recording = response.json().get("data", {})
                logger.info(f"get_recording_info succeed: {recording}")
                return recording
            except ValueError:
                logger.error(f"Response is not valid JSON: {response.text}")
                raise ValueError("Received invalid JSON from server.")

        elif 400 <= response.status_code < 500:
            logger.warning(f"Client error {response.status_code}: {response.text}")
            raise Exception(f"Client error: {response.status_code}, {response.text}")
        elif response.status_code >= 500:
            logger.error(f"Server error {response.status_code}: {response.text}")
            raise Exception(f"Server error: {response.status_code}, {response.text}")
        else:
            logger.warning(
                f"Unexpected status code {response.status_code}: {response.text}"
            )
            raise Exception(
                f"Unexpected status code: {response.status_code}, {response.text}"
            )

    except Exception as e:
        logger.exception(f"get_recording_info failed with exception: {e}")
        raise e


def get_recording_list_info(recording_ids: List[str], verifier_id = None) -> List:
    try:
        logger.info("Sending request to get_recording_list_info")
        if len(recording_ids) == 0:
            return []

        response = requests.post(
            SERVER_URL + "/get_recording_list_info",
            json={"recording_ids": recording_ids,
                  "verifier_id": verifier_id},
        )

        if response.status_code == 200:
            try:
                recordings = response.json().get("data", [])
                logger.info(f"get_recording_list_info success")
                return recordings
            except ValueError:
                logger.error(f"Response is not valid JSON: {response.text}")
                raise ValueError("Received invalid JSON from server.")

        elif 400 <= response.status_code < 500:
            logger.warning(f"Client error {response.status_code}: {response.text}")
            raise Exception(f"Client error: {response.status_code}, {response.text}")
        elif response.status_code >= 500:
            logger.error(f"Server error {response.status_code}: {response.text}")
            raise Exception(f"Server error: {response.status_code}, {response.text}")
        else:
            logger.warning(
                f"Unexpected status code {response.status_code}: {response.text}"
            )
            raise Exception(
                f"Unexpected status code: {response.status_code}, {response.text}"
            )

    except Exception as e:
        logger.exception(f"get_recording_list_info failed with exception: {e}")
        raise e


def fetch_new_recordings(limit: int, user_id: str):
    url = f"{SERVER_URL}/fetch_recordings_to_verify"
    payload = {
        "limit": limit,
        "user_id": user_id,
    }
    response = requests.post(
        url, json=payload, headers={"Content-Type": "application/json"}
    )
    response.raise_for_status()

    # [{recording_id, status, task_name, task_description, verify_feedback }]
    recordings = response.json()["data"]

    logger.info(
        f"Successfully retrieved {len(recordings)} new verifying recordings from server"
    )
    return recordings


def get_recordings_by_page():
    """
    Fetch recording list in Dashboard:
        param: page_idx,  (optional)
        param: status, (optional)
        param: uploader_id, (optional)
        param: verifier_id (optional)
        usage:
            1. all None, return first page of recordings
            2. joint search if any params are specified
            3. only one of uploader_id and verifier_id can be not-None
    """
    try:
        page_idx = request.args.get("page_idx", 0)
        status = request.args.get("status")
        uploader_id = request.args.get("uploader_id")
        verifier_id = request.args.get("verifier_id")

        params = {"page_idx": page_idx}
        if status:
            params["status"] = status
        if uploader_id:
            params["uploader_id"] = uploader_id
        if verifier_id:
            params["verifier_id"] = verifier_id

        response = requests.get(f"{SERVER_URL}/get_recordings_by_page", params=params)

        if response.status_code == 200:
            data = response.json()
            return (
                jsonify(
                    {
                        "success": data["success"],
                        "message": data["message"],
                        "data": data["data"],
                        "has_more": data["has_more"],
                    }
                ),
                200,
            )
        else:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": f"Failed to get recordings. Server responded with status code {response.status_code}.",
                        "error": response.text,
                    }
                ),
                response.status_code,
            )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "An error occurred while fetching recordings.",
                    "error": str(e),
                }
            ),
            500,
        )
