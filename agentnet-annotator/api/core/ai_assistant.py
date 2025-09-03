import requests
import os
import json

from flask import jsonify, request

from .constants import FAILED, SUCCEED, SERVER_URL
from .logger import logger
from .utils import extract_frames_from_video, find_mp4, RECORDING_DIR, REVIEW_RECORDING_DIR, read_encrypted_jsonl


def polish_task_name_and_description():
    try:
        data = request.json
        task_name = data.get("task_name")
        task_description = data.get("task_description")
        if not task_name:
            return (
                jsonify({"status": FAILED, "message": "Error: Task_name is empty or None"}),
                400,
            )

        recording_name = data.get("recording_name", None)
        verifying = data.get("verifying", False)
        actions = []
        if recording_name:
            recording_path = os.path.join(RECORDING_DIR, recording_name) if not verifying else\
                os.path.join(REVIEW_RECORDING_DIR, recording_name)
            action_jsonl_path = os.path.join(recording_path, "reduced_events_vis.jsonl")
            raw_actions = read_encrypted_jsonl(action_jsonl_path)
            info_names = ["id", "action", "description", "time_stamp", "target"]
            
            for raw_action in raw_actions:
                action = {}
                for info_name in info_names:
                    if info_name in raw_action:
                        action[info_name] = raw_action[info_name]
                actions.append(action)
            
        response = requests.post(
            f"{SERVER_URL}/polish_task_name_and_description",
            json={
                "task_name": task_name,
                "task_description": task_description,
                "actions": actions
            },
            timeout=40,
        )

        response.raise_for_status()
        result = response.json()

        return jsonify(result), response.status_code

    except Exception as e:
        logger.exception(f"Unexpected error in polish_task_name_and_description: {e}")
        return (
            jsonify(
                {"status": FAILED, "message": f"An unexpected error occurred: {str(e)}"}
            ),
            500,
        )


def predict_targets(recording_path, events):
    video_path = os.path.join(recording_path, find_mp4(recording_path))
    metadata_path = os.path.join(recording_path, "metadata.json")
    with open(metadata_path, "r") as f:
        metadata = json.load(f)
    video_start_timestamp = metadata["video_start_timestamp"]
    screen_width = metadata["screen_width"]
    screen_height = metadata["screen_height"]
    frames = extract_frames_from_video(
        video_path,
        events,
        video_start_timestamp,
        screen_width,
        screen_height,
    )
    payload = {
        "interpretations": [
            {
                "base64_image": frame,
                "action": event["action"],
                "description": event["description"],
            }
            for frame, event in zip(frames, events)
        ]
    }
    response = requests.post(
        f"{SERVER_URL}/interpret_actions",
        json=payload,
    )
    logger.info(f"Response from interpret_actions: {response.json()}")
    return response.json().get("results", [])
