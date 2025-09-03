import requests
from ..logger import logger
from ..constants import SERVER_URL, FAILED, SUCCEED
from flask import jsonify, request


def delete_online_recording():
    try:
        data = request.json
        required_fields = ["recording_id"]
        if not all(field in data for field in required_fields):
            return (
                jsonify({"status": FAILED, "message": "Missing required fields"}),
                400,
            )

        recording_id = data.get("recording_id")
        response = requests.post(
            f"{SERVER_URL}/delete_recording_and_update_user_stats",
            json={"recording_id": recording_id},
            timeout=60,
        )

        response.raise_for_status()
        result = response.json()

        return jsonify(result), response.status_code

    except requests.RequestException as e:
        logger.error(f"Network error in delete_online_recording: {e}")
        return jsonify({"status": FAILED, "message": f"Network error: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"Unexpected error in delete_online_recording: {e}")
        return (
            jsonify(
                {"status": FAILED, "message": f"An unexpected error occurred: {str(e)}"}
            ),
            500,
        )


def change_user_type():
    try:
        data = request.json
        admin_user_id = data.get("admin_user_id")
        user_id = data.get("user_id")
        new_user_type = data.get("new_user_type")

        if not all([admin_user_id, user_id, new_user_type]):
            return (
                jsonify({"status": FAILED, "message": "Missing required fields"}),
                400,
            )

        response = requests.post(
            f"{SERVER_URL}/change_user_type",
            json={
                "admin_user_id": admin_user_id,
                "user_id": user_id,
                "new_user_type": new_user_type,
            },
            timeout=60,
        )

        response.raise_for_status()
        result = response.json()

        return jsonify(result), response.status_code

    except requests.RequestException as e:
        logger.error(f"Network error in change_user_type: {e}")
        return jsonify({"status": FAILED, "message": f"Network error: {str(e)}"}), 500
    except ValueError as e:
        logger.error(f"JSON decoding error in change_user_type: {e}")
        return (
            jsonify(
                {
                    "status": FAILED,
                    "message": f"Error parsing server response: {str(e)}",
                }
            ),
            500,
        )
    except Exception as e:
        logger.error(f"Unexpected error in change_user_type: {e}")
        return (
            jsonify(
                {"status": FAILED, "message": f"An unexpected error occurred: {str(e)}"}
            ),
            500,
        )


def get_all_user_id2name():
    try:
        user_source = request.args.get(
            "user_source" #["external", "internal", "company"]
        )

        logger.info(f"get_all_user_id2name: user_source={user_source}")

        response = requests.get(
            f"{SERVER_URL}/get_all_user_id2name", params={"user_source": user_source}
        )

        if response.status_code == 200:
            data = response.json()

            sorted_data = dict(sorted(data["data"].items(), key=lambda item: item[1]))

            return (
                jsonify(
                    {
                        "status": SUCCEED,
                        "message": data["message"],
                        "data": sorted_data,
                    }
                ),
                200,
            )
        else:
            logger.info(response.text)
            return (
                jsonify(
                    {
                        "status": FAILED,
                        "message": f"get_all_user_id2name failed. Server responded with status code {response.status_code}.",
                        "error": response.text,
                    }
                ),
                response.status_code,
            )

    except Exception as e:
        return (
            jsonify(
                {
                    "status": FAILED,
                    "message": "An error occurred while get_all_user_id2name.",
                    "error": str(e),
                }
            ),
            500,
        )
