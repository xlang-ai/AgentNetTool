import os
import re
import sys
import time
import json
import threading
import queue
import platform
import ctypes
import re
from pathlib import Path
import shutil


def set_dll_path():
    # Determine the architecture of the system
    is_64bits = platform.architecture()[0] == "64bit"

    # Check if running in a PyInstaller packaged environment
    if hasattr(sys, "_MEIPASS"):
        # Running in packaged environment
        base_path = Path(sys._MEIPASS) / "libs"
    else:
        # Running in development environment
        base_path = Path(__file__).resolve().parent.parent.parent / "libs"

    # Set DLL path based on architecture
    dll_name = "openh264-1.8.0-win64.dll" if is_64bits else "openh264-1.8.0-win32.dll"
    dll_path = base_path / dll_name

    if not dll_path.exists():
        raise FileNotFoundError(f"Required DLL not found: {dll_path}")

    ctypes.CDLL(str(dll_path))


# Call the function to set the DLL path
if platform.system() == "Windows":
    set_dll_path()


if __name__ == "__main__":
    import sys

    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.abspath(os.path.join(current_dir, "../../../"))
    sys.path.append(parent_dir)
    from api.core.action_reduction.action import *
    from api.core.action_reduction.reduction_helper import *
    from api.core.logger import logger
    from api.core.a11y import parse_element
    from api.core.utils import (
        get_recordings_dir,
        write_encrypted_jsonl,
        read_encrypted_jsonl,
    )
else:
    from .action import *
    from .reduction_helper import *
    from ..logger import logger
    from ..ai_assistant import predict_targets
    from ..a11y import parse_element
    from ..utils import (
        get_recordings_dir,
        write_encrypted_jsonl,
        read_encrypted_jsonl,
        write_encrypt_line,
        write_encrypted_json,
    )


class Reducer:
    def __init__(self, recording_path, window_attrs, configs) -> None:
        self.recording_path = recording_path
        self.reduced_actions = []
        self.event_buffer = []
        self.active_events = set()
        self.active_actions = {}
        self.errors = []
        self.remove_redundant_move = True
        self.built_actions = []
        self.last_reduced_buffer_idx = 0
        self.pre_move = None
        self.window_attrs = window_attrs

        self.terminate_method = "click"
        self.generate_window_a11y = configs["generate_window_a11y"]
        self.generate_element_a11y = configs["generate_element_a11y"]
        self.flatten = False

        self.reduce_status = {}

    def compress(self, events: List[Dict]):
        """
        Compress raw events.

        Parameters:
            events (list): A list of raw event objects to be compressed.
        """
        for event in events:
            self._compress_event(event)

    def _compress_event(self, event):
        """
        Add one raw event to event_buffer.

        Parameters:
            events (list): A list of raw event objects to be compressed.
        """
        action_type = event["action"]
        # add necessary attrs for the event
        init_event(event)

        if event["action"] == "move":
            self._add_move_event_to_buffer(event=event)
            return

        last_event = self._get_last_event_in_buffer()  # None or last event
        is_last_event_same = is_event_key_match(event1=last_event, event2=event)
        if (
            not is_last_event_same
            and last_event is not None
            and last_event["action"] == "scroll"
        ):
            last_event["complete"] = True

        if action_type == "scroll":
            self._add_scroll_event_to_buffer(
                event, last_event=last_event, is_last_event_same=is_last_event_same
            )
        elif action_type == "press":
            self._add_key_press_event_to_buffer(
                event, last_event=last_event, is_last_event_same=is_last_event_same
            )
        elif action_type == "release":
            self._add_key_release_event_to_buffer(
                event, last_event=last_event, is_last_event_same=is_last_event_same
            )
        elif action_type == "click":
            self._add_click_event_to_buffer(event)
        else:
            raise ValueError("Event type {} is not supported.".format(event["action"]))

    def _get_last_event_in_buffer(self):
        if len(self.event_buffer) == 0:
            return None
        else:
            return self.event_buffer[-1]

    def _add_move_event_to_buffer(self, event):
        if self.pre_move is None:
            event["trace"] = [(event["x"], event["y"])]
            event["time_trace"] = [event["time_stamp"]]
            event["end_time"] = event["time_stamp"]
            self.pre_move = event
        else:
            self.pre_move["trace"].append((event["x"], event["y"]))
            self.pre_move["time_trace"].append(event["time_stamp"])
            self.pre_move["end_time"] = event["time_stamp"]

    def _add_scroll_event_to_buffer(self, cur_event, last_event, is_last_event_same):
        """
        Last_event is the same scroll will be appended to last_event
        Last_event is not scroll or other event, new scroll will be added
        """
        if (cur_event["dx"], cur_event["dy"]) == (0, 0):
            return

        if self.pre_move is not None:  # TODO: sometimes, new event won't be added, neither the pre_move
            self.pre_move["complete"] = True
            cur_event["pre_move"] = self.pre_move
            self.pre_move = None

        # new event is scroll, last event is not scroll
        if not is_last_event_same:
            cur_event["trace"] = [
                {
                    "x": cur_event["x"],
                    "y": cur_event["y"],
                    "dx": cur_event["dx"],
                    "dy": cur_event["dy"],
                }
            ]
            cur_event["time_trace"] = [cur_event["time_stamp"]]
            cur_event["end_time"] = cur_event["end_time"]
            self.event_buffer.append(cur_event)
        else:
            last_event["trace"].append(
                {
                    "x": cur_event["x"],
                    "y": cur_event["y"],
                    "dx": cur_event["dx"],
                    "dy": cur_event["dy"],
                }
            )
            last_event["time_trace"].append(cur_event["time_stamp"])
            last_event["end_time"] = cur_event["time_stamp"] + 0.2

    def _add_key_press_event_to_buffer(self, cur_event, last_event, is_last_event_same):
        if cur_event["name"] in MODIFIED_KEYS:
            key = cur_event["key"]
            cur_event["matched"] = None
            if key not in self.active_events:
                # if long press key: don't add pre-move to each press signal
                if self.pre_move is not None:  # TODO: sometimes, new event won't be added, neither the pre_move
                    self.pre_move["complete"] = True
                    cur_event["pre_move"] = self.pre_move
                    self.pre_move = None
                self.active_events.add(key)
                self.event_buffer.append(cur_event)
        else:
            if self.pre_move is not None:  # TODO: sometimes, new event won't be added, neither the pre_move
                self.pre_move["complete"] = True
                cur_event["pre_move"] = self.pre_move
                self.pre_move = None

            cur_event["action"] = "type"
            cur_event["complete"] = True
            cur_event["key_names"] = [cur_event["name"]]
            self.event_buffer.append(cur_event)

    def _add_key_release_event_to_buffer(
        self, cur_event, last_event, is_last_event_same
    ):
        if last_event is None:
            logger.warning(
                "Warning: no event before a release event {}".format(cur_event)
            )
            return

        if self.pre_move is not None:  # TODO: sometimes, new event won't be added, neither the pre_move
            self.pre_move["complete"] = True
            cur_event["pre_move"] = self.pre_move
            self.pre_move = None

        cur_event["end_time"] = cur_event["time_stamp"]
        key = (cur_event["key"][0], not cur_event["key"][1])
        if cur_event["name"] not in MODIFIED_KEYS:
            # TODO: handle not found or overlap
            for i in range(len(self.event_buffer) - 1, -1, -1):
                if self.event_buffer[i]["key"] == key and not self.event_buffer[i].get(
                    "end_time"
                ):
                    self.event_buffer[i]["end_time"] = cur_event["time_stamp"]
                    return
            logger.warning(
                "Warning: _add_key_release_event_to_buffer: no key press event before release {}".format(
                    cur_event
                )
            )
            return

        else:
            cur_event["action"] = "press"
            if key in self.active_events:
                self.active_events.remove(key)

            # TODO: handle not found or overlap
            for i in range(len(self.event_buffer) - 1, -1, -1):
                if (
                    self.event_buffer[i]["key"] == key
                    and self.event_buffer[i]["matched"] is None
                ):
                    self.event_buffer[i]["end_time"] = cur_event["time_stamp"]
                    self.event_buffer[i]["end_idx"] = len(self.event_buffer)
                    self.event_buffer[i]["matched"] = len(self.event_buffer)
                    self.event_buffer.append(cur_event)
                    return
            logger.warning("Start press key not found: {}".format(cur_event))

    def _add_click_event_to_buffer(self, cur_event):
        if self.pre_move is not None:  # TODO: sometimes, new event won't be added, neither the pre_move
            self.pre_move["complete"] = True
            cur_event["pre_move"] = self.pre_move
            self.pre_move = None

        if cur_event["pressed"]:
            cur_event["matched"] = None
            self.event_buffer.append(cur_event)
            return

        if len(self.event_buffer) == 0:
            logger.warning(
                "Click action ignored: no action before mouse release {}.\n".format(
                    cur_event
                )
            )
            return

        cur_event["end_time"] = cur_event["time_stamp"]
        key = (cur_event["key"][0], not cur_event["key"][1])
        for i in range(
            len(self.event_buffer) - 1, -1, -1
        ):  # TODO: handle not found or overlap
            if (
                self.event_buffer[i]["key"] == key
                and not self.event_buffer[i]["matched"]
            ):
                self.event_buffer[i]["end_time"] = cur_event["time_stamp"]
                self.event_buffer[i]["end_idx"] = len(self.event_buffer)
                self.event_buffer[i]["matched"] = len(self.event_buffer)
                self.event_buffer.append(cur_event)
                return

        logger.warning("Start press mouse not found: {}".format(cur_event))

    def reduce_all(self):
        idx = 0
        while idx < len(self.event_buffer):
            logger.warning(
                "{}  {} {}".format(
                    idx,
                    self.event_buffer[idx]["key"],
                    self.event_buffer[idx]["time_stamp"],
                )
            )
            event = self.event_buffer[idx]

            if event["action"] == "scroll":
                if (
                    len(self.reduced_actions) == 0
                    or self.reduced_actions[-1].action != "scroll"
                ):
                    self.reduced_actions.append(Scroll(event))
                else:
                    self.reduced_actions[-1].extend(event)

            elif event["action"] == "type":
                if len(self.reduced_actions) == 0:
                    # last action is not type: add Type
                    self.reduced_actions.append(Type(event))
                elif self.reduced_actions[-1].action == "type":
                    self.reduced_actions[-1].append(event)
                    # logger.warning("{} Apend type {} {}".format(len(self.reduced_actions), idx, event))
                    # logger.error(self.reduced_actions[-1].key_names)
                elif (
                    self.reduced_actions[-1].action == "press"
                    and self.reduced_actions[-1].is_typing()
                ):
                    self.reduced_actions[-1].children[0].append(Type(event))
                    self.reduced_actions[-1].transform()
                else:
                    self.reduced_actions.append(Type(event))
                    # logger.warning("{} Add type {} {}".format(len(self.reduced_actions), idx, event))
                    # logger.error(self.reduced_actions[-1].key_names)

            elif event["action"] == "press":

                # Special key but complete (not long press)
                if event["complete"]:
                    self.reduced_actions.append(Press(event))

                # Long press special keys
                else:
                    # key press action
                    if event["key"][-1]:
                        match_idx = event["matched"]
                        key = event["key"]

                        if match_idx is None:
                            exception_action = Press(event)
                            exception_action.set_exception_end_event()
                            self.reduced_actions.append(exception_action)
                            logger.warning("No matched release event: {}".format(event))
                            idx += 1
                            continue

                        # Exception handling: need to verify
                        for i in range(idx + 1, match_idx + 1):
                            if (
                                "matched" in self.event_buffer[i]
                                and self.event_buffer[i]["matched"] is not None
                            ):

                                if self.event_buffer[i]["matched"] > match_idx:
                                    logger.error("Here ???")
                                    exception_event = self.event_buffer.pop(i)
                                    exception_event["start_time"] = event["start_time"]
                                    exception_event["time_stampe"] = event["start_time"]
                                    self.event_buffer.insert(idx, exception_event)
                                    continue

                        key = event["key"]
                        if key not in self.active_actions:
                            self.active_actions[key] = len(self.reduced_actions)
                            self.reduced_actions.append(Press(event))
                        else:
                            idx += 1
                            continue
                    # key release action
                    else:
                        start_key_idx = self._find_start_key_idx(event["key"])
                        logger.error("{} {}".format(start_key_idx, event["key"]))
                        if start_key_idx is not None:
                            self.reduced_actions[start_key_idx].set_complete_event(
                                event
                            )
                            # TODO may not needed
                            key = (event["key"][0], not event["key"][1])
                            if key in self.active_actions:
                                self.active_actions.pop(key)

                            for i in range(
                                start_key_idx + 1, len(self.reduced_actions), 1
                            ):
                                self.reduced_actions[start_key_idx].add_child(
                                    self.reduced_actions[i]
                                )

                            del self.reduced_actions[
                                start_key_idx + 1 : len(self.reduced_actions)
                            ]

                        else:
                            # No matched start key
                            logger.warning(f"Reduce warning: no start key for {event}")

            elif event["action"] == "click":
                if event["key"][-1]:

                    match_idx = event["matched"]
                    key = event["key"]

                    if match_idx is None:
                        exception_action = Click(event)
                        exception_action.set_exception_end_event()
                        self.reduced_actions.append(exception_action)
                        logger.warning("No matched release event: {}".format(event))
                        idx += 1
                        continue

                    # Exception handling: need to verify
                    if (
                        match_idx == idx + 2
                        and self.event_buffer[idx + 1]["action"] == "press"
                        and self.event_buffer[idx + 1]["key"][-1]
                    ):
                        logger.warning(
                            "idx {} match_idx {} rearange {}".format(
                                idx, match_idx, self.event_buffer[idx + 2]
                            )
                        )
                        exception_event = self.event_buffer.pop(idx + 2)
                        self.event_buffer.insert(idx + 1, exception_event)
                        match_idx -= 1

                    """for i in range(idx + 1, match_idx + 1):
                        if (
                            "matched" in self.event_buffer[i]
                            and self.event_buffer[i]["matched"] is not None
                        ):
                            if self.event_buffer[i]["matched"] > match_idx:
                                logger.error("Here !!! {} {}".format(self.event_buffer[i]["key"], self.event_buffer[i]["time_stamp"]) )
                                exception_event = self.event_buffer.pop(i)
                                exception_event["start_time"] = event["start_time"]
                                exception_event["time_stampe"] = event["start_time"]
                                self.event_buffer.insert(idx, exception_event)
                                continue"""

                    # mouse press action
                    if key in self.active_actions:
                        self.reduced_actions[
                            self.active_actions[key]
                        ].set_exception_end_event()

                    self.active_actions[key] = len(self.reduced_actions)
                    self.reduced_actions.append(Click(event))

                else:
                    # mouse relsease action
                    start_key_idx = self._find_start_key_idx(event["key"])

                    if start_key_idx is None:
                        # No matched start key
                        logger.warning(
                            f"Reducer reduce_all warning: no start key for {event}"
                        )
                        idx += 1
                        continue

                    key = event["key"]
                    del self.active_actions[(key[0], not key[1])]
                    cur_action = Click(event)
                    cur_action.complete = True
                    self.reduced_actions.append(cur_action)

                    self.reduced_actions[start_key_idx].set_complete_event(event)

                    for i in range(
                        start_key_idx + 1, len(self.reduced_actions), 1
                    ):  # TODO: 2 -> 1
                        self.reduced_actions[start_key_idx].add_child(
                            self.reduced_actions[i]
                        )
                    del self.reduced_actions[
                        start_key_idx + 1 : len(self.reduced_actions)
                    ]

                    # multi-click
                    mouse_start_action = self.reduced_actions[start_key_idx]
                    last_click_idx = self._find_last_close_complete_identical_click(
                        mouse_start_action, idx=start_key_idx
                    )
                    if last_click_idx is not None:
                        last_click_action = self.reduced_actions[last_click_idx]
                        if last_click_action.cal_distance(mouse_start_action) < 4:
                            # only support <3 consecutive mouse clicks
                            if last_click_action.click_type < 3:
                                last_click_action.click_type += 1
                                # set all the subsequent actions as children
                                for i in range(
                                    last_click_idx + 1, len(self.reduced_actions), 1
                                ):
                                    self.reduced_actions[i].vis = False
                                    last_click_action.add_child(self.reduced_actions[i])
                                del self.reduced_actions[
                                    last_click_idx + 1 : len(self.reduced_actions)
                                ]
            else:
                logger.warning(f"unsupported event: {event}")

            idx += 1

    def _find_start_key_idx(self, key):
        key = (key[0], not key[1])
        for i in range(len(self.reduced_actions) - 1, -1, -1):
            if self.reduced_actions[i].key != key:
                continue
            else:
                if self.reduced_actions[i].complete:
                    logger.warning(
                        f"Reducer _find_start_key_idx error: {key} key pair match but completed."
                    )
                    continue
                else:
                    return i
        return None

    def _find_last_close_complete_identical_click(self, click_action, idx):
        if idx == 1:
            return None

        for i in range(idx - 1, -1, -1):
            prev_action = self.reduced_actions[i]
            if click_action.start_time - prev_action.start_time < CLICK_INTERVAL:
                if (
                    prev_action.key[0] == click_action.key[0]
                    and prev_action.complete
                ):
                    return i
            else:
                return None
        return None

    def transform(self, save=False):
        # for i in range(len(self.reduced_actions)):
        #    logger.warning("{} {}".format(i, self.reduced_actions[i].action))

        self.complete_idx = 0
        logger.error("transform {}".format(len(self.reduced_actions)))
        while self.complete_idx < len(self.reduced_actions):

            logger.warning(
                "{} {} {}".format(
                    self.complete_idx,
                    len(self.reduced_actions),
                    self.reduced_actions[self.complete_idx].action,
                )
            )
            logger.warning("last_action: {}".format(self.reduced_actions[-1].action))
            temp_action = self.reduced_actions[self.complete_idx]

            if not temp_action.complete:
                # TODO: may have corner case
                if self.complete_idx < len(self.reduced_actions):
                    logger.warning("Reducer: transform: action {} is not complete.")
                    self.reduced_actions.pop(self.complete_idx)
                    continue
                else:
                    return
            # only transform completed actions

            # scroll and type don't have children
            if temp_action.action == "type":
                # if not last action (last action could be extended by new actions)
                if self.complete_idx + 1 < len(self.reduced_actions):
                    if self.reduced_actions[self.complete_idx + 1].action == "type":
                        logger.warning(
                            "here {} {} {}".format(
                                self.complete_idx,
                                self.reduced_actions[self.complete_idx].key,
                                self.reduced_actions[self.complete_idx + 1].key,
                            )
                        )
                        temp_action.extend(self.reduced_actions[self.complete_idx + 1])
                        self.reduced_actions.pop(self.complete_idx + 1)
                        temp_action.transform()
                        continue
                    elif (
                        self.reduced_actions[self.complete_idx + 1].action == "press"
                        and self.reduced_actions[self.complete_idx + 1].is_typing()
                        and self.complete_idx < len(self.reduced_actions) - 1
                    ):
                        logger.warning(
                            "there {} {} {}".format(
                                self.complete_idx,
                                self.reduced_actions[self.complete_idx].key,
                                self.reduced_actions[self.complete_idx + 1].key,
                            )
                        )
                        temp_action.extend(
                            self.reduced_actions[self.complete_idx + 1].children[0]
                        )
                        self.reduced_actions.pop(self.complete_idx + 1)
                        temp_action.transform()
                        continue

                    temp_action.transform()

            else:  # other actions
                temp_action.transform()

            self.complete_idx += 1
        if len(self.reduced_actions) > 0:
            self.reduced_actions[-1].transform()

    def finish(self, save=False):
        logger.error(f"finish {len(self.reduced_actions)}")
        for action in self.reduced_actions:
            if action.action == "drag":
                action.drag_trace = action.children[0].trace
                action.drag_time_trace = action.children[0].time_trace
            else:
                # TODO: only deal with depth = 1 drag
                if action.children and len(action.children) > 0:
                    for child in action.children:
                        if child.action == "drag":
                            child.drag_trace = child.children[0].trace
                            child.drag_time_trace = child.children[0].time_trace

            if action.action == "long_press" and wrap_func_key(action.key_name) in [
                "$ctrl$",
                "$command$",
                "$cmd$",
            ]:
                if len(action.children) > 0:
                    if isinstance(action.children[-1], Type):
                        if len(action.children[-1].key_names) == 1:
                            key_name = action.children[-1].key_names[0]
                            if key_name.lower() in ["c", "v", "x"]:
                                if f"+ {key_name}" not in action.description:
                                    action.description += f" + {key_name}"
                    if (
                        len(action.children) == 1
                        and action.children[0].action == "drag"
                    ):
                        action.description += f" + drag"
                    else:
                        all_click_children = 0
                        for child in action.children:
                            if child.action != "click":
                                break
                            else:
                                all_click_children += 1
                        if all_click_children > 0:
                            action.description += f" + {all_click_children} Clicks"

        if self.complete_idx < len(self.reduced_actions):
            # TODO: Exception case: last action is not complete
            for i in range(self.complete_idx + 1, len(self.reduced_actions)):
                self.reduced_actions[self.complete_idx].add_child(
                    self.reduced_actions[i]
                )
            del self.reduced_actions[self.complete_idx + 1 : len(self.reduced_actions)]

        logger.error(f"finish {len(self.reduced_actions)}")

    def process_actions_multithreaded(self, recording_path, video_attrs, window_attrs):
        def process_action(action, recording_path, video_attrs, window_attrs):
            action.to_video(
                recording_path=recording_path,
                video_attrs=video_attrs,
                window_attrs=window_attrs,
            )

        threads = []
        max_threads = 8
        q = queue.Queue()

        # Enqueue all actions
        for action in self.reduced_actions:
            q.put(action)

        # Function to process actions from the queue
        def worker():
            while not q.empty():
                action = q.get()
                if action is None:
                    break
                process_action(action, recording_path, video_attrs, window_attrs)
                q.task_done()

        # Start initial batch of threads
        for _ in range(min(max_threads, len(self.reduced_actions))):
            thread = threading.Thread(target=worker)
            threads.append(thread)
            thread.start()

        # Wait for all threads to finish
        for thread in threads:
            thread.join()

    def _save_action(self, action):
        action.complete_dump(recording_dir=self.recording_path)
        action.vis_dump(recording_dir=self.recording_path)

    def complete_dump(self, dir):
        os.makedirs(dir, exist_ok=True)
        file_path = os.path.join(dir, "reduced_events_complete.jsonl")

        data = []
        for action in self.reduced_actions:
            attrs = action.complete_dump()
            data.append(attrs)
        # for item in data:
        #     if isinstance(item, WindowsElementDescriber):
        #         print(f"Found WindowsElementDescriber: {item}")
        # logger.info(f"Data: {data}")

        write_encrypted_jsonl(file_path, data=data)

    def vis_dump(self, dir):
        os.makedirs(dir, exist_ok=True)
        file_path = os.path.join(dir, "reduced_events_vis.jsonl")

        data = []
        for action in self.reduced_actions:
            attrs = action.vis_dump()
            data.append(attrs)

        write_encrypted_jsonl(file_path, data=data)

    def match_element(self):
        def _find_nearest(time_stamp, data):
            idx = 0
            while (
                idx < len(data) and data[idx]["time_stamp"] < time_stamp
            ):  # if action time_stamp is greater than the current element, move to the next element
                idx += 1
            if idx == 0:
                return idx
            if idx != len(data):
                prev_idx = idx - 1
                if (
                    time_stamp - data[prev_idx]["time_stamp"]
                    < data[idx]["time_stamp"] - time_stamp
                ):
                    idx = prev_idx
            else:
                idx -= 1
            return idx

        def _find_pred(time_stamp, data):
            idx = 0
            while idx < len(data) and data[idx]["time_stamp"] < time_stamp:
                idx += 1
            if idx == 0:
                return idx
            return idx - 1

        def _find_succ(time_stamp, data):
            idx = 0
            while idx < len(data) and data[idx]["time_stamp"] < time_stamp:
                idx += 1
            if idx == len(data):
                return idx - 1
            return idx

        def is_useful(target):
            if target == None:
                return False
            if target.get("mark", None) != None:
                return target["mark"]
            if isinstance(target, dict) and target != {}:
                role_description_useless_words = [
                    "group",
                    "scroll area",
                    "table row",
                    "tooltip",
                ]
                if target.get("role_description", None) != None:
                    if (
                        target.get("role_description", None)
                        in role_description_useless_words
                    ):
                        return False
                    if (
                        target.get("role_description", None) == "text"
                        or target.get("role_description", None) == "image"
                    ):
                        if len(target) == 1:
                            return False
                return True
            return False

        def clean_text(text_list):
            filtered_text = []
            for line in text_list:
                if re.search(r"[a-zA-Z]", line) or re.search(r"[0-9]", line):
                    line = re.sub(r"[^\w\s]", "", line)
                    line = " ".join(line.split())
                    if line:
                        filtered_text.append(line)
            filtered_text = list(set(filtered_text))
            filtered_text.sort()
            return filtered_text

        def extract_text_from_json(json_data):
            def extract_from_dict(d):
                text_list = []
                if isinstance(d, dict):
                    for key, value in d.items():
                        if key in ["AXTitle", "AXDescription", "AXValue", "Name"]:
                            if isinstance(value, (str, int)):
                                text_list.append(str(value))
                        if isinstance(value, dict):
                            text_list.extend(extract_from_dict(value))
                        elif isinstance(value, list):
                            for item in value:
                                text_list.extend(extract_from_dict(item))
                elif isinstance(d, list):
                    for item in d:
                        text_list.extend(extract_from_dict(item))
                return text_list

            json_texts = extract_from_dict(json_data)
            return clean_text(json_texts)

        html_element_data_path = os.path.join(self.recording_path, "html_element.jsonl")
        has_html = False
        html_element_data = []
        if os.path.exists(html_element_data_path):
            html_element_data = read_encrypted_jsonl(html_element_data_path)
            has_html = len(html_element_data) > 0

        element_data_path = os.path.join(self.recording_path, "element.jsonl")
        element_data = []
        if os.path.exists(element_data_path):
            element_data = read_encrypted_jsonl(element_data_path)
            # sort element_data by time_stamp
            element_data.sort(key=lambda x: x["time_stamp"])

        html_data_path = os.path.join(self.recording_path, "html.jsonl")
        html_data = []
        if os.path.exists(html_data_path):
            html_data = read_encrypted_jsonl(html_data_path)
            with open(html_data_path, "w", encoding="utf-8") as f:
                pass

        saved_htmls = set()

        for action in self.reduced_actions:
            # Save element info
            if action.action in ("click"):
                if len(element_data) == 0:
                    action.target = None
                    continue
                element_idx = _find_nearest(action.start_time, element_data)
                action_use_html = False
                if has_html:
                    logger.info("Has html data")
                    html_idx = _find_nearest(action.start_time, html_element_data)
                    html_timestamp = html_element_data[html_idx]["time_stamp"]
                    action_use_html = abs(html_timestamp - action.start_time) <= 0.3

                if action_use_html:
                    logger.info("Using html data to generate target")
                    action.target = {
                        "title": html_element_data[html_idx]["element"].get(
                            "text", None
                        ),
                        "mark": True,
                    }  # Modified: ['text'] cause error
                else:
                    if hasattr(action, "axtree"):
                        past_frame_target = parse_element(
                            action.axtree,
                            action.coordinate["x"],
                            action.coordinate["y"],
                        )
                        action.past_frame_target = past_frame_target
                    action.target = parse_element(
                        element_data[element_idx]["a11y_tree"],
                        action.coordinate["x"],
                        action.coordinate["y"],
                    )
                    """logger.info(
                        f"ElementIndex:{element_idx}, Target:{str(action.target)}, Target useful:{str(is_useful(action.target))}, Past frame target:{str(action.past_frame_target)}"
                    )"""
                    if action.target is not None:
                        if hasattr(action, "axtree"):
                            if is_useful(action.target):
                                action.target["mark"] = True
                            else:
                                action.target["mark"] = False
                                if action.past_frame_target is not None:
                                    action.past_frame_target["mark"] = True
                        else:
                            action.target["mark"] = True
            if len(html_data) > 0:
                saved_htmls.add(_find_pred(action.start_time, html_data))
                saved_htmls.add(_find_succ(action.start_time, html_data))

        need_gpt_list = []
        for index, action in enumerate(self.reduced_actions):
            if action.action in ("click"):
                if action.axtree:
                    axtree_texts = extract_text_from_json(action.axtree)
                    logger.info(
                        f"Action {action.action} has {len(axtree_texts)} text nodes, target is useful? {is_useful(action.target)}"
                    )
                    if len(axtree_texts) < 10 and (not is_useful(action.target)):
                        # 判断出来拿的tree是空壳，这个tree也不需要了
                        logger.info(f"Target {action.target} is not useful")
                        need_gpt_list.append(
                            {
                                "id": index,
                                "timestamp": action.start_time,
                                "action": action.action,
                                "description": action.description,
                                "coordinate": action.coordinate,
                            }
                        )
                else:
                    logger.info(
                        f"Action {action.action} target is useful? {is_useful(action.target)}"
                    )
                    if not is_useful(action.target):
                        logger.info(f"Target {action.target} is not useful")
                        need_gpt_list.append(
                            {
                                "id": index,
                                "timestamp": action.start_time,
                                "action": action.action,
                                "description": action.description,
                                "coordinate": action.coordinate,
                            }
                        )

        if len(need_gpt_list) > 0:
            try:
                gpt_result = predict_targets(self.recording_path, need_gpt_list)
                need_gpt_idx = [event["id"] for event in need_gpt_list]

                for result, index in zip(gpt_result, need_gpt_idx):
                    self.reduced_actions[index].gpt_target = result
                    if hasattr(self.reduced_actions[index], "target") and isinstance(
                        self.reduced_actions[index].target, dict
                    ):
                        self.reduced_actions[index].target["mark"] = False
                    if hasattr(
                        self.reduced_actions[index], "past_frame_target"
                    ) and isinstance(
                        self.reduced_actions[index].past_frame_target, dict
                    ):
                        self.reduced_actions[index].past_frame_target["mark"] = False
            except Exception as e:
                logger.exception(f"Reducer: match_element: {str(e)}")

        # Save html info
        saved_html_data = [html_data[idx] for idx in saved_htmls]
        write_encrypted_jsonl(
            os.path.join(self.recording_path, "html.jsonl"), data=saved_html_data
        )

    def match_axtree(self):
        def _find_pred(time_stamp, data):
            idx = 0
            while idx < len(data) and data[idx]["time_stamp"] < time_stamp:
                idx += 1
            if idx == 0:
                return idx
            return idx - 1

        axtree_data = read_encrypted_jsonl(
            path=os.path.join(self.recording_path, "a11y.jsonl")
        )

        # sort trees by their time_stamp
        sorted_axtree_data = sorted(axtree_data, key=lambda x: x["time_stamp"])

        for action in self.reduced_actions:
            axtree_idx = _find_pred(action.start_time, sorted_axtree_data)
            if 0 <= axtree_idx < len(sorted_axtree_data):
                action.axtree = sorted_axtree_data[axtree_idx]["axtree"]
            else:
                action.axtree = None

    def flatten_actions(self):
        """
        Change the self.reduced_actions into a list of actions (parent & child action) with depth
        """

        def _flatten_action(action, depth=None):
            actions = []
            if not action.vis:
                return actions

            children = action.children
            action.children = None
            action.depth = depth

            actions.append(action)
            if children and len(children) > 0:
                for child in children:
                    actions.extend(_flatten_action(child, depth=depth + 1))
            return actions

        actions = []
        for action in self.reduced_actions:
            actions.extend(_flatten_action(action, depth=0))

        self.reduced_actions = actions

    def reduce_pipeline(self):
        try:
            start_time = time.perf_counter()
            recording_path = self.recording_path
            events = read_encrypted_jsonl(
                path=os.path.join(recording_path, "events.jsonl")
            )

            video_path = os.path.join(recording_path, "video_clips")
            if os.path.exists(video_path):
                if os.path.isdir(video_path):
                    shutil.rmtree(video_path)
                    os.makedirs(video_path, exist_ok=True)
            if os.path.exists(os.path.join(recording_path, "reduced_events_vis.jsonl")):
                os.remove(os.path.join(recording_path, "reduced_events_vis.jsonl"))
            if os.path.exists(
                os.path.join(recording_path, "reduced_events_complete.jsonl")
            ):
                os.remove(os.path.join(recording_path, "reduced_events_complete.jsonl"))

            self.compress(events)
            self.reduce_all()
            self.transform()
            self.finish()

            event_buffer_path = os.path.join(recording_path, "event_buffer.jsonl")
            if os.path.exists(event_buffer_path):
                os.remove(event_buffer_path)
            write_encrypted_jsonl(event_buffer_path, data=self.event_buffer)

            if self.flatten:
                self.flatten_actions()

            for i, action in enumerate(self.reduced_actions):
                action.set_id(i)

            # TODO: delete former video clips

            if self.generate_window_a11y:
                self.match_axtree()
            from platform import system
            if self.generate_element_a11y and system() != "Linux":
                self.match_element()

            self.complete_dump(recording_path)
            self.vis_dump(recording_path)

            with open(os.path.join(recording_path, "metadata.json"), "r") as f:
                metadata = json.load(f)
            video_start_time = metadata["video_start_timestamp"]
            video_attrs = {"video_start_time": video_start_time}
            time.sleep(1)
            self.process_actions_multithreaded(
                recording_path=recording_path,
                video_attrs=video_attrs,
                window_attrs=self.window_attrs,
            )
            reduction_time = time.perf_counter() - start_time

            logger.info(
                f"Reducer: action num: {len(self.reduced_actions)}, reduce time: {reduction_time}"
            )

        except Exception as e:
            logger.exception(f"reduce_pipeline failed: {str(e)}")


def visualize_recording(
    recording_name, generate_window_a11y=True, generate_element_a11y=True
):
    recording_path = os.path.join(get_recordings_dir(), recording_name)

    with open(os.path.join(recording_path, "metadata.json"), "r") as f:
        metadata = json.load(f)
    width, height = metadata["screen_width"], metadata["screen_height"]

    reducer = Reducer(
        recording_path=recording_path,
        window_attrs={"width": width, "height": height},
        configs={
            "generate_window_a11y": generate_window_a11y,
            "generate_element_a11y": generate_element_a11y,
        },
    )

    reducer.reduce_pipeline()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Process recording name.")
    parser.add_argument(
        "--recording_name",
        type=str,
        help="The name of the recording to process",
    )
    args = parser.parse_args()

    visualize_recording(recording_name=args.recording_name)
