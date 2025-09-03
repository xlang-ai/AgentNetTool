import os
import sys
import json
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, '../'))
sys.path.append(parent_dir)
from core.utils import read_encrypted_jsonl, write_jsonl, read_encrypted_json, RECORDING_DIR, REVIEW_RECORDING_DIR

def decrypt_recording(recording_name, verifying = False):
    if verifying:
        recording_path = os.path.join(REVIEW_RECORDING_DIR, recording_name)
    else:
        recording_path = os.path.join(RECORDING_DIR, recording_name)
    
    for file_name in os.listdir(recording_path):
        if file_name.endswith("jsonl"):
            file_path = os.path.join(recording_path, file_name)
            data = read_encrypted_jsonl(file_path)
            write_jsonl(file_path, data=data)
            print(f"Decrypt: {file_name}")
    
    if "task_name.json" in os.listdir(recording_path):
        data = read_encrypted_json(os.path.join(recording_path, "task_name.json"))
        with open(os.path.join(recording_path, "task_name.json"), "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Process recording name.")
    parser.add_argument(
        "--recording_name", type=str, help="The name of the recording to process",
    )
    parser.add_argument(
        "--verifying", action="store_true", help="Enable verification mode"
    )
    args = parser.parse_args()

    decrypt_recording(recording_name=args.recording_name, verifying=args.verifying)
    