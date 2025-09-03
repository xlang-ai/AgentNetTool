from enum import Enum

SERVER_URL = "https://agentnet.xlang.ai"


class RecordingStatus(Enum):
    verifying = "verifying"
    editing = "editing"
    edited = "edited"
    accepted = "accepted"
    rejected = "rejected"
    final_accept = "final_accept"
    final_reject = "final_reject"
    archived = "archived"
    file_missing = "file_missing"
    file_broken = "file_broken"
    # local status
    local = "local"
    processing = "processing"


REVIEW_RECORDING_STATUSES = ["verifying"]

VERIFY_LIST_SIZE = 0

SUCCEED = "succeed"
FAILED = "failed"

RECORDING_STATUS_TO_VIS_STATUS = {
    "verifying": "Pending",
    "accepted": "Accepted",
    "rejected": "Rejected",
    "archived": "Archived",
}

EXCLUDE_LIST = ["recording_status.json", "hub_task_id.txt"]
INCLUDE_LIST = ["video_clips", "reduced_events_vis.jsonl"]
COMPLETE_DATA_LIST = [
    "events.jsonl",
    "event_buffer.jsonl",
    "element.jsonl",
    "html.jsonl",
    "html_element.jsonl",
    "a11y.jsonl",
    "reduced_events_complete.jsonl",
    "reduced_events_vis.jsonl",
    "top_window.jsonl",
]


VK_CODE = {
    8: "Backspace",
    9: "Tab",
    13: "Enter",
    16: "Shift",
    17: "Ctrl",
    18: "Alt",
    19: "Pause",
    20: "Caps Lock",
    27: "Esc",
    32: "Space",
    33: "Page Up",
    34: "Page Down",
    35: "End",
    36: "Home",
    37: "Left",
    38: "Up",
    39: "Right",
    40: "Down",
    44: "Print Screen",
    45: "Insert",
    46: "Delete",
    # Number andealphabat
    48: "0",
    49: "1",
    50: "2",
    51: "3",
    52: "4",
    53: "5",
    54: "6",
    55: "7",
    56: "8",
    57: "9",
    65: "A",
    66: "B",
    67: "C",
    68: "D",
    69: "E",
    70: "F",
    71: "G",
    72: "H",
    73: "I",
    74: "J",
    75: "K",
    76: "L",
    77: "M",
    78: "N",
    79: "O",
    80: "P",
    81: "Q",
    82: "R",
    83: "S",
    84: "T",
    85: "U",
    86: "V",
    87: "W",
    88: "X",
    89: "Y",
    90: "Z",
    # Numpad
    96: "0",
    97: "1",
    98: "2",
    99: "3",
    100: "4",
    101: "5",
    102: "6",
    103: "7",
    104: "8",
    105: "9",
    110: ".",
    12: "$Unknown$",
}
