import os
import sys
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, '../'))
sys.path.append(parent_dir)
from core.utils import read_encrypted_jsonl, write_encrypted_jsonl, RECORDING_DIR, REVIEW_RECORDING_DIR

def encrypt_recording(recording_name, verifying = False):
    if verifying:
        recording_path = os.path.join(REVIEW_RECORDING_DIR, recording_name)
    else:
        recording_path = os.path.join(RECORDING_DIR, recording_name)
    
    for file_name in os.listdir(recording_path):
        if file_name.endswith("jsonl"):
            file_path = os.path.join(recording_path, file_name)
            data = read_encrypted_jsonl(file_path)
            write_encrypted_jsonl(file_path, data=data)
            print(f"Encrypt: {file_name}")

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

    encrypt_recording(recording_name=args.recording_name, verifying=args.verifying)
    