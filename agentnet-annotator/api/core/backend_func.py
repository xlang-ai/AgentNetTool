import os
import json
import uuid
import shutil
import requests
from flask import jsonify, request

from .constants import *
from .logger import logger
from .utils import (
    RECORDING_DIR,
    REVIEW_RECORDING_DIR,
    LOGIN_CODE_DIR,
    cut_video,
    find_mp4,
    get_latest_folder,
    check_recording_visualizable,
    read_encrypted_jsonl,
    write_encrypted_json,
    write_encrypted_jsonl,
    write_jsonl
)

def set_login_code(group: str = "test", path: str = LOGIN_CODE_DIR):
    group_uuid = f"{group}-{uuid.uuid4()}"
    group_uuid_bytes = group_uuid.encode('utf-8')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    
    with open(path, 'wb') as file:
        file.write(group_uuid_bytes)

def read_login_code(path: str = LOGIN_CODE_DIR) -> str:
    if not os.path.exists(path):
        return None
    
    with open(path, 'rb') as file:
        login_code = file.read()
    
    login_code = login_code.decode('utf-8')
    return login_code

        
def check_user_data():
    try:
        if os.path.exists(LOGIN_CODE_DIR):
            logger.info("check_user_data: login_code exists at local")
            login_code = read_login_code()
            user_id = login_code
            response = requests.get(
                f"{SERVER_URL}/get_user_data",
                params={"user_id": user_id},
            )
            logger.info(response.json())
        
        user_id = request.args.get("user_id")
        logger.info(f"Backend: check_user_data: user_id: {str(user_id)}")

        if (not user_id) or (user_id == "undefined"):
            return jsonify({
                        "status": FAILED,
                        "message": "Please Login to Use AgentNet",
                        "data": None,
                    }), 400

        response = requests.get(
            f"{SERVER_URL}/get_user_data",
            params={"user_id": user_id},
        )
        logger.info(str(response))

        if response.status_code == 200:
            data = response.json()
            return jsonify(data), 200
        else:
            error_data = response.json()
            logger.warning(
                f"Server returned error: {response.status_code}, {error_data.get('message', 'Unknown error')}"
            )
            return jsonify(error_data), response.status_code

    except requests.RequestException as e:
        logger.exception(f"Network error in get_user_data: {str(e)}")
        return jsonify({
                    "status": FAILED,
                    "message": "Failed to connect to the server",
                    "data": None,
                }), 503

    except Exception as e:
        logger.exception(f"Unexpected error in get_user_data: {str(e)}")
        return jsonify({
                    "status": FAILED,
                    "message": "An unexpected error occurred",
                    "data": None,
                }), 500


def get_annotation_statistics_overview():
    try:
        # Retrieve the 'upload_time' parameter from the request, defaulting to 'all' if not provided
        upload_time = request.args.get("upload_timestamp", "all")
        user_id = request.args.get("user_id")
        # Validate 'upload_time' to ensure it's one of the allowed values
        if upload_time not in ["all", "1day", "1week", "1month", "3month"]:
            return (
                jsonify(
                    {
                        "status": FAILED,
                        "message": "Invalid upload_time parameter. Must be 'all', '1day', '1week', '1month' or '3month'.",
                    }
                ),
                400,
            )

        params = {"upload_timestamp": upload_time, "user_id": user_id}

        # Make a GET request to the external server's /get_overview endpoint with the validated parameters
        response = requests.get(f"{SERVER_URL}/get_overview", params=params)
        # Raise an exception if the request failed
        response.raise_for_status()

        # Return the JSON response from the external server
        return jsonify(response.json()), response.status_code

    except requests.RequestException as e:
        # Handle any exceptions that occurred during the request
        logger.exception(f"Error fetching overview data from server: {e}")
        return (
            jsonify(
                {
                    "status": FAILED,
                    "message": "Error fetching overview data from server.",
                }
            ),
            500,
        )
    except Exception as e:
        # Catch any other exceptions
        logger.exception(f"Unexpected error: {e}")
        return (
            jsonify({"status": FAILED, "message": "An unexpected error occurred."}),
            500,
        )

def get_downloaded_verifying_recordings_list():
    """
    Modified: check_recording_visualizable
    """
    downloaded_verifying_recordings = []

    recording_ids = [
        dir
        for dir in os.listdir(REVIEW_RECORDING_DIR)
        if os.path.isdir(os.path.join(REVIEW_RECORDING_DIR, dir))
    ]

    for recording_id in recording_ids:
        if check_recording_visualizable(recording_name=recording_id, reviewing=True):
            downloaded_verifying_recordings.append(recording_id)

    return (
        jsonify(
            {
                "status": SUCCEED,
                "message": "Get_downloaded_verifying_recordings_list succeed",
                "data": downloaded_verifying_recordings,
            }
        ),
        200,
    )


def get_downloaded_user_recordings_list():
    """
    TODO: seperate not downloaded or broken
    """
    downloaded_verifying_recordings = []

    recording_names = [
        dir
        for dir in os.listdir(RECORDING_DIR)
        if os.path.isdir(os.path.join(RECORDING_DIR, dir))
    ]

    for recording_name in recording_names:
        if check_recording_visualizable(recording_name=recording_name, reviewing=False):
            downloaded_verifying_recordings.append(recording_name)

    return (
        jsonify(
            {
                "status": SUCCEED,
                "message": "get_downloaded_user_recordings_list succeed",
                "data": downloaded_verifying_recordings,
            }
        ),
        200,
    )


def annotate_task(recording_name, socketservice):
    """
    Payload:
        cutTaskName: new task name
        cutDescription: new task description
        valMin: start index of reduced_events_vis
        valMax: end index of reduced_events_vis

    Functionality:
        - Save new .jsonl and .json files
        - Save new video clips
        - Save new full video

    TODO:
        - read all files and write all files efficiently
    """

    folder_path = os.path.join(RECORDING_DIR, recording_name)
    if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
        return jsonify({"error": "Recording not found"}), 404

    reduced_events_vis_path = os.path.join(folder_path, "reduced_events_vis.jsonl")
    reduced_events_vis = read_encrypted_jsonl(reduced_events_vis_path)

    data = request.json

    if "cutTaskName" not in data or not data["cutTaskName"]:
        logger.warning("annotate_task must have cutTaskName")
        return jsonify({"error": "annotate_task must have cutTaskName"}), 400

    task_name = data["cutTaskName"]
    description = data.get("cutDescription", "")
    start_idx = int(data["valMin"]) - 1
    end_idx = int(data["valMax"]) - 1

    if end_idx - start_idx + 1 == len(reduced_events_vis):
        write_encrypted_json(
            os.path.join(folder_path, "task_name.json"),
            {"task_name": task_name, "description": description},
        )

        return jsonify({"success": "Save task name and description successfully"}), 200

    raw_events_path = os.path.join(folder_path, "events.jsonl")
    event_buffer_path = os.path.join(folder_path, "event_buffer.jsonl")
    reduced_events_complete_path = os.path.join(
        folder_path, "reduced_events_complete.jsonl"
    )
    element_path = os.path.join(folder_path, "element.jsonl")
    html_path = os.path.join(folder_path, "html.jsonl")
    metadata_path = os.path.join(folder_path, "metadata.json")

    # Fetch start and end timestamp

    reduced_events_vis = reduced_events_vis[start_idx : end_idx + 1]
    for idx in range(len(reduced_events_vis)):
        reduced_events_vis[idx]["id"] = idx
    start_timestamp = reduced_events_vis[0]["start_time"]
    end_timestamp = reduced_events_vis[-1]["end_time"]

    logger.info(f"Backend: cut_task: start_idx: {start_idx}, end_idx: {end_idx}")

    recording_id = str(uuid.uuid4())
    new_folder_path = os.path.join(RECORDING_DIR, recording_id)

    os.makedirs(new_folder_path, exist_ok=True)
    # events.jsonl
    with open(raw_events_path, encoding="utf-8") as f:
        raw_events = [json.loads(line) for line in f]
    new_raw_events = [
        event
        for event in raw_events
        if start_timestamp <= event["time_stamp"] <= end_timestamp
    ]
    write_jsonl(os.path.join(new_folder_path, "events.jsonl"), new_raw_events)

    # reduced_events_vis.jsonl
    write_encrypted_jsonl(
        os.path.join(new_folder_path, "reduced_events_vis.jsonl"), reduced_events_vis
    )

    # event_buffer.jsonl
    event_buffer = read_encrypted_jsonl(event_buffer_path)
    new_event_buffer = [
        event
        for event in event_buffer
        if start_timestamp <= event["time_stamp"] <= end_timestamp
    ]
    write_encrypted_jsonl(
        os.path.join(new_folder_path, "event_buffer.jsonl"), new_event_buffer
    )

    # reduced_events_complete.jsonl
    reduced_events_complete = read_encrypted_jsonl(reduced_events_complete_path)
    new_reduced_events_complete = [
        event
        for event in reduced_events_complete
        if start_timestamp <= event["start_time"] <= end_timestamp
    ]
    write_encrypted_jsonl(
        os.path.join(new_folder_path, "reduced_events_complete.jsonl"),
        new_reduced_events_complete,
    )

    # Optional: html.jsonl
    if os.path.exists(html_path):
        html_data = read_encrypted_jsonl(html_path)
        new_html = [
            event
            for event in html_data
            if start_timestamp <= event["time_stamp"] <= end_timestamp
        ]
        write_encrypted_jsonl(os.path.join(new_folder_path, "html.jsonl"), new_html)

    # Optional: element
    if os.path.exists(element_path):
        element = read_encrypted_jsonl(element_path)
        new_element = [
            event
            for event in element
            if start_timestamp <= event["time_stamp"] <= end_timestamp
        ]
        write_encrypted_jsonl(
            os.path.join(new_folder_path, "element.jsonl"), new_element
        )

    # Optional: axtree.jsonl
    axtree_path = os.path.join(folder_path, "axtree.jsonl")
    if os.path.exists(axtree_path):
        axtree = read_encrypted_jsonl(axtree_path)
        new_tree = [
            tree
            for tree in axtree
            if start_timestamp <= tree["time_stamp"] <= end_timestamp
        ]
        write_encrypted_jsonl(os.path.join(new_folder_path, "axtree.jsonl"), new_tree)

    write_encrypted_json(
        os.path.join(new_folder_path, "task_name.json"),
        {"task_name": task_name, "description": description},
    )

    # metadata.json
    with open(metadata_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    old_start_timestamp = metadata["video_start_timestamp"]
    # TODO: video_end_timestamp, start_timestamp
    metadata["video_start_timestamp"] = start_timestamp  # TODO: need to make sure what fields are exactly needed
    with open(
        os.path.join(new_folder_path, "metadata.json"), "w", encoding="utf-8"
    ) as f:
        json.dump(metadata, f, indent=4)
    # top_window.jsonl
    top_window_path = os.path.join(folder_path, "top_window.jsonl")
    if os.path.exists(top_window_path):
        top_windows = read_encrypted_jsonl(top_window_path)
        new_top_windows = [
            window
            for window in top_windows
            if start_timestamp <= window["time_stamp"] <= end_timestamp
        ]
        write_encrypted_jsonl(
            os.path.join(new_folder_path, "top_window.jsonl"), new_top_windows
        )
    # save video clips
    os.mkdir(os.path.join(new_folder_path, "video_clips"))
    video_clips = os.listdir(os.path.join(folder_path, "video_clips"))
    video_clips.sort(key=lambda x: int(x.split("_")[0]))
    for idx, clip_name in enumerate(video_clips[start_idx : end_idx + 1]):
        clip_action = clip_name.split("_")[1].split(".")[0]
        new_clip_name = f"{idx}_{clip_action}.mp4"
        shutil.copy(
            os.path.join(folder_path, "video_clips", clip_name),
            os.path.join(new_folder_path, "video_clips", new_clip_name),
        )

    # edit full video
    old_video_path = find_mp4(folder_path)
    cut_video(
        old_video_path=os.path.join(folder_path, old_video_path),
        new_video_path=new_folder_path,
        start_time=start_timestamp - old_start_timestamp,
        end_time=end_timestamp - old_start_timestamp,
    )
    socketservice.emit(
        "reduced", 
        {
            "status": "succeed",
            "message": "stop_recording succeed."
        }
    )
    return jsonify({"success": "Cut task successfully"}), 200


def delete_local_verify_recording(recording_name):
    delete_folder_path = os.path.join(REVIEW_RECORDING_DIR, recording_name)
    logger.info(f"Delete {delete_folder_path}")
    if not os.path.exists(delete_folder_path) or not os.path.isdir(delete_folder_path):
        return (
            jsonify(
                {
                    "status": FAILED,
                    "error": "Recording not found",
                    "message": f"Recording {recording_name} not found",
                }
            ),
            404,
        )
    else:
        try:
            shutil.rmtree(delete_folder_path)
            return (
                jsonify(
                    {
                        "status": SUCCEED,
                        "success": f"Successfully delete the verify recording {recording_name}",
                        "message": f"Successfully delete the verify recording {recording_name}",
                    }
                ),
                200,
            )

        except Exception as e:
            return (
                jsonify(
                    {
                        "status": FAILED,
                        "error": str(e),
                        "message": f"delete_verify_recording failed: \n{str(e)}",
                    }
                ),
                500,
            )


# legacy
def read_recording_status(recording_path):
    recording_status_path = os.path.join(recording_path, "recording_status.json")
    if os.path.exists(recording_status_path):
        with open(recording_status_path, "r", encoding="utf-8") as f:
            recording_status = json.load(f)
    else:
        recording_status = None
    return recording_status


def change_recording_status(recording_id: str, new_status: str) -> dict:
    """
    Client-side function to call the change_recording_status API on the server.

    Args:
        recording_id (str): The ID of the recording whose status needs to be updated.
        new_status (str): The new status to set for the recording.

    Returns:
        dict: The server's response in JSON format. Contains the status and message.
    """
    try:
        # Define the URL of the API endpoint
        url = f"{SERVER_URL}/change_recording_status"

        # Construct the payload
        payload = {
            "recording_id": recording_id,
            "new_status": new_status
        }

        # Send the POST request to the server
        response = requests.post(url, json=payload, timeout=10)
        # Raise an exception for bad HTTP response codes (4xx or 5xx)
        response.raise_for_status()

        if response.status_code == 200:
            logger.info(f"Successfully updated status for recording {recording_id} to {new_status}.")
            return response.json()
        else:
            logger.warning(f"Failed to update status for recording {recording_id}. Server responded with status code {response.status_code}.")
            return {
                "status": FAILED,
                "message": f"Server returned status code {response.status_code}."
            }

    except requests.RequestException as e:
        logger.error(f"Error while trying to change recording status: {e}")
        return {
            "status": FAILED,
            "message": "Failed to communicate with the server.",
            "error": str(e),
        }
    except Exception as e:
        logger.error(f"Unexpected error occurred: {e}")
        return {
            "status": FAILED,
            "message": "An unexpected error occurred.",
            "error": str(e),
        }

def unallocate_user_verifying_recordings(verifier_id: str, local_recording_ids: list) -> dict:
    """
    Client-side function to call the unallocate_user_verifying_recordings API on the server.

    Args:
        verifier_id (str): The ID of the verifier whose recordings need to be unallocated.
        local_recording_ids (list): A list of recording IDs that should not be unallocated.

    Returns:
        dict: The server's response in JSON format, indicating success or failure.
    """
    try:
        logger.info("unallocate_user_verifying_recordings")
        url = f"{SERVER_URL}/unallocate_user_verifying_recordings"
        payload = {
            "user_id": verifier_id,
            "local_recording_ids": local_recording_ids
        }

        response = requests.post(url, json=payload, timeout=60)

        if response.status_code == 200:
            logger.info(f"Successfully unallocated recordings for verifier {verifier_id}.")
            return response.json()
        else:
            logger.warning(f"Failed to unallocate recordings. Server responded with status code {response.status_code}.")
            return {
                "status": FAILED,
                "message": f"Server returned status code {response.status_code}."
            }

    except requests.RequestException as e:
        logger.error(f"Error while trying to unallocate recordings for verifier {verifier_id}: {e}")
        return {
            "status": FAILED,
            "message": "Failed to communicate with the server.",
            "error": str(e),
        }
    except Exception as e:
        logger.error(f"Unexpected error occurred: {e}")
        return {
            "status": FAILED,
            "message": "An unexpected error occurred.",
            "error": str(e),
        }
        
def unallocate_recording(recording_id: str, verifier_id: str) -> dict:
    """
    Client-side function to call the unallocate_recording API on the server.

    Args:
        recording_id (str): The ID of the recording to be unallocated.
        verifier_id (str): The ID of the verifier whose allocation needs to be reset.

    Returns:
        dict: The server's response in JSON format, indicating success or failure.
    """
    try:
        # Define the API endpoint URL
        url = f"{SERVER_URL}/unallocate_recording"
        
        # Construct the payload (data) to be sent in the request
        payload = {
            "recording_id": recording_id,
            "user_id": verifier_id
        }

        # Send a POST request to the server
        response = requests.post(url, json=payload, timeout=60)

        # Raise an exception for bad HTTP response codes (4xx or 5xx)
        response.raise_for_status()

        if response.status_code == 200:
            logger.info(f"Successfully unallocated recording {recording_id} for verifier {verifier_id}.")
            return response.json()
        else:
            logger.warning(f"Failed to unallocate recording {recording_id}. Server responded with status code {response.status_code}.")
            return {
                "status": FAILED,
                "message": f"Server returned status code {response.status_code}."
            }

    except requests.RequestException as e:
        logger.error(f"Error while trying to unallocate recording {recording_id}: {e}")
        return {
            "status": FAILED,
            "message": "Failed to communicate with the server.",
            "error": str(e),
        }
    except Exception as e:
        logger.error(f"Unexpected error occurred: {e}")
        return {
            "status": FAILED,
            "message": "An unexpected error occurred.",
            "error": str(e),
        }

def delete_local_recording(recording_name):
    delete_folder_path = os.path.join(RECORDING_DIR, recording_name)
    logger.info(f"Delete {delete_folder_path}")
    if not os.path.exists(delete_folder_path) or not os.path.isdir(delete_folder_path):
        return jsonify({
                    "status": FAILED,
                    "error": "Recording not found",
                    "message": f"Recording {recording_name} not found",
                }), 404
    else:
        try:
            shutil.rmtree(delete_folder_path)
            return jsonify({
                        "status": SUCCEED,
                        "success": f"Successfully delete the recording {recording_name}",
                        "message": f"Successfully delete the recording {recording_name}",
                    }), 200
        except Exception as e:
            return jsonify({
                        "status": FAILED,
                        "error": str(e),
                        "message": f"delete_recording failed: \n{str(e)}",
                    }), 500


def get_full_video(recording_name):  # TODO: check if delete files affect

    folder_path = os.path.join(RECORDING_DIR, recording_name)
    if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
        return jsonify({"error": "Recording not found"}), 404

    # fetch single video
    video_name = find_mp4(folder_path)
    try:
        return (
            jsonify(
                {
                    "success": "successfully pass video path",
                    "path": os.path.join(folder_path, video_name),
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 404


def save_task():
    try:
        data = request.json
        task = data.get("task_name", "")
        description = data.get("description", "")
        if not task:
            logger.info("Error: task name is None.")
            return jsonify({"error": "Task is required"}), 400

        task_folder_path = get_latest_folder(RECORDING_DIR)

        write_encrypted_json(
            os.path.join(task_folder_path, "task_name.json"),
            {"task_name": task, "description": description},
        )
        logger.info("Task name saved.")
        return jsonify({"message": "Task saved successfully"}), 200

    except Exception as e:
        logger.info("Backend: save_task error.")
        logger.info(e)
        return jsonify({"error": str(e)}), 500
