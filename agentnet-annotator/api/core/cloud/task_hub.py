import requests
from flask import jsonify, request
from ..constants import *
from ..logger import logger


def report_infeasible_hub_task():
    try:
        data = request.json
        task_id = data.get("task_id", None)
        
        if not task_id:
            logger.warning(f"No task_id provided")
            return jsonify({
                "status": FAILED,
                "message": f"No task_id provided"
            }), 400
        
        payload = {
            "task_id": task_id,
        }

        response = requests.post(
            f"{SERVER_URL}/report_infeasible_hub_task",
            json=payload,
            timeout=30
        )

        response.raise_for_status()
        result = response.json()

        return jsonify(result), response.status_code

    except requests.RequestException as e:
        logger.exception(f"Network error in report_infeasible_hub_task: {e}")
        return jsonify({
            "status": FAILED,
            "message": f"Network error: {str(e)}"
        }), 500
    except Exception as e:
        logger.exception(f"Unexpected error in report_infeasible_hub_task: {e}")
        return jsonify({
            "status": FAILED,
            "message": f"An unexpected error occurred: {str(e)}"
        }), 500
        
        
def fetch_from_task_hub():
    try:
        data = request.json
        category = data.get("category", None)
        limit = data.get("limit", 1)
        
        payload = {
            "category": category,
            "limit": limit
        }

        """
        task_data = {
                "task_id": task[0],
                "task_source": task[1],
                "category": task[2],
                "task_name": task[3],
                "task_description": task[4],
                "url": task[5],
                "platform": task[6],
                "info": task[7]
            }
        
        {
            "success": True,
            "message": "Task retrieved from task hub successfully",
            "data": task_list
        }
        
        """
        response = requests.post(
            f"{SERVER_URL}/fetch_from_task_hub",
            json=payload,
            timeout=30
        )

        response.raise_for_status()
        result = response.json()

        return jsonify(result), response.status_code

    except requests.RequestException as e:
        logger.exception(f"Network error in fetch_from_task_hub: {e}")
        return jsonify({
            "status": FAILED,
            "message": f"Network error: {str(e)}"
        }), 500
    except Exception as e:
        logger.exception(f"Unexpected error in fetch_from_task_hub: {e}")
        return jsonify({
            "status": FAILED,
            "message": f"An unexpected error occurred: {str(e)}"
        }), 500
        
        
def get_hub_task_categories():
    try:
        response = requests.get(
            f"{SERVER_URL}/get_hub_task_categories",
            timeout=30
        )
        
        """
        {
            "success": True,
            "message": "Categories retrieved successfully",
            "data": category_list: List[str]
        }
        """
        response.raise_for_status()
        result = response.json()

        return jsonify(result), response.status_code

    except requests.RequestException as e:
        logger.exception(f"Network error in get_hub_task_categories: {e}")
        return jsonify({
            "status": FAILED,
            "message": f"Network error: {str(e)}"
        }), 500
    except Exception as e:
        logger.exception(f"Unexpected error in get_hub_task_categories: {e}")
        return jsonify({
            "status": FAILED,
            "message": f"An unexpected error occurred: {str(e)}"
        }), 500