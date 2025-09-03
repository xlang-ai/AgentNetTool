import os
import cv2
import numpy as np
from collections import OrderedDict
from typing import List, Dict, Optional
import time

from copy import deepcopy

if __name__ == "__main__":
    import sys
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.abspath(os.path.join(current_dir, "../../"))
    sys.path.append(parent_dir)
    from api.core.action_reduction.reduction_helper import (
        MODIFIED_KEYS, MOUSE_LONG_PRESS_INTERVAL,
        wrap_func_key,
    )
    from api.core.logger import logger
else:
    from .reduction_helper import (
        MODIFIED_KEYS, MOUSE_LONG_PRESS_INTERVAL,
        wrap_func_key,
    )
    from ..logger import logger


class ActionBuilder:
    @staticmethod
    def build(event):
        action_type = event["action"]
        if action_type == "move":
            return Move(event)
        elif action_type == "click":
            return Click(event)
        elif action_type == "press":
            key_name = event["name"]
            if key_name not in MODIFIED_KEYS:
                return Type(event)
            else:
                return Press(event)
        elif action_type == "type":
            return Type(event)
        elif action_type == "scroll":
            return Scroll(event)
        else:
            raise ValueError(f"Event type {action_type} is not supported.")


class Action:
    def __init__(self, event) -> None:
        self.pre_move = None
        if "pre_move" in event:
            self.pre_move = Move(event["pre_move"])
        # TODO: each action should have action id and event start, end id
        self.event_start_idx = event["event_idx"]
        self.children: Optional[List[Action]] = None
        self.complete: bool = event["complete"]
        self.action: str = event["action"]
        self.start_time: float = event["start_time"]
        self.end_time: float = event["end_time"]
        self.key: tuple = event["key"]
        self.transformed: bool = False
        self.description: str = None
        self.vis: bool = True
        self.show_all_move: bool = False
        self.exception = False
        self.depth = 0
        self.base_ignore_attrs: list = [
            "vis_dump_attrs",
            "ignore_log_attr_names",
            "complete_dump_excluded_attrs",
            "key",
            "show_all_move",
            "transformed",
            "excluded_attrs",
            "base_ignore_attrs",
            "pre_move",
            "children",
            "action_start_video_buffer_time",
            "action_end_video_buffer_time",
        ]

        self.complete_dump_excluded_attrs: list = self.base_ignore_attrs
        self.vis_dump_attrs: list = [
            "id",
            "action",
            "description",
            "start_time",
            "end_time",
            "time_stamp",
            "depth"
        ]

        self.action_start_video_buffer_time = 0.5
        self.action_end_video_buffer_time = 0.2
        self.target = None
        self.axtree = None
        self.past_frame_target = None
        self.gpt_target = None

    def set_id(self, id: int):
        self.id = id

    def get_start_time(self) -> float:
        if self.pre_move is not None:
            return self.pre_move.get_start_time()
        else:
            return self.start_time

    def get_str(self, connect_str=""):
        s = wrap_func_key(self.key_names[0])
        for i in range(1, len(self.key_names)):
            s += connect_str + wrap_func_key(self.key_names[i])
        return s

    def get_end_time(self) -> float | None:
        if self.end_time is not None:
            return self.end_time
        elif self.children is None:
            return self.start_time
        else:
            return self.children[-1].get_end_time()

    def set_pre_move(self, action):
        if isinstance(action, dict):
            self.pre_move = Move(action)
        else:
            self.pre_move = action

    def add_child(self, child_action):
        if not isinstance(child_action, Action):
            child_action = ActionBuilder.build(child_action)

        if self.children is None:
            self.children = []

        self.children.append(child_action)

    def transform(self):
        self.transformed = True

    def complete_dump(self):
        """
        Dump the action's information into a Dict
        Presever the complete information as the raw data.
        """
        attrs = vars(self)

        ordered_attrs = OrderedDict()
        ordered_attrs["action"] = self.action

        self.complete_dump_excluded_attrs += [
            key
            for key in attrs
            if attrs[key] is None or key in self.complete_dump_excluded_attrs
        ]

        for k, v in attrs.items():
            if k not in self.complete_dump_excluded_attrs and k not in ordered_attrs:
                ordered_attrs[k] = v

        if self.pre_move is not None:
            ordered_attrs["pre_move"] = self.pre_move.complete_dump()
        if self.children is not None:
            ordered_attrs["children"] = [
                child.complete_dump() for child in self.children
            ]

        return ordered_attrs

    def vis_dump(self):
        """
        Dump the action into a Dict
        Simplify attributes for visualization
        """
        if self.vis == False:
            return None

        attrs = vars(self)

        ordered_attrs = OrderedDict()
        for k in self.vis_dump_attrs:
            if k in attrs and k not in ordered_attrs:
                ordered_attrs[k] = attrs[k]

        if self.target is not None:
            ordered_attrs["target"] = self.target
        else:
            ordered_attrs["target"] = {"mark": False}

        if self.gpt_target is not None:
            ordered_attrs["gpt_target"] = self.gpt_target

        ordered_attrs["axtree"] = self.axtree
        if self.past_frame_target is not None:
            ordered_attrs["past_frame_target"] = self.past_frame_target

        if self.children is not None and len(self.children) > 0:
            ordered_attrs["children"] = []
            for child in self.children:
                if child.vis == True:
                    child_attrs = child.vis_dump()
                    ordered_attrs["children"].append(child_attrs)
        if "children" in ordered_attrs and len(ordered_attrs["children"]) == 0:
            del ordered_attrs["children"]

        return ordered_attrs

    def _get_video_start_time(self):
        """
        Get video start time
        """
        if self.pre_move is not None:
            return max(
                self.pre_move.get_start_time(),
                self.start_time - self.action_start_video_buffer_time,
            )
        else:
            return self.start_time

    def _get_video_end_time(self):
        if self.end_time is not None:
            return self.end_time + self.action_end_video_buffer_time
        elif self.children is None:
            return self.start_time + 0.2  # exception case
        else:
            return self.children[-1]._get_video_end_time()

    def _get_video_name(self, recording_path):
        for file_name in os.listdir(recording_path):
            if file_name.endswith(".mp4"):
                return file_name

    def process_start_end_time(self, start_time, end_time):
        if end_time - start_time < 0.5:
            start_time = start_time - 0.3
            end_time = end_time + 0.1
        return start_time, end_time

    def to_video(self, recording_path, video_attrs, window_attrs):
        video_start_time = video_attrs["video_start_time"]
        start_time = self._get_video_start_time() - video_start_time
        end_time = self._get_video_end_time() - video_start_time
        start_time, end_time = self.process_start_end_time(
            start_time, end_time)

        video_clip_name = f"{self.id}_{self.action}"

        if end_time <= start_time:
            logger.warning(
                f"action.py to_video error: Invalid time range for action {self.id}. Skipping."
            )
            return

        video_name = self._get_video_name(recording_path)
        video_path = os.path.join(recording_path, video_name)

        max_attempts = 10
        attempt = 0
        cap = None
        while attempt < max_attempts:
            try:
                cap = cv2.VideoCapture(video_path)
                if cap.isOpened() and cap is not None:
                    break
                attempt += 1
                logger.warning(
                    f"Attempt {attempt} to open video file failed. Retrying in 1 second..."
                )
                time.sleep(1)
            except Exception as e:
                logger.exception(
                    f"Error during attempt {attempt} to open video: {str(e)}")
                attempt += 1
                time.sleep(1)

        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fourcc = cv2.VideoWriter_fourcc(*"avc1")

        os.makedirs(os.path.join(recording_path, "video_clips"), exist_ok=True)
        output_path = os.path.join(
            recording_path, "video_clips", f"{video_clip_name}.mp4"
        )
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        video_attrs.update(
            {
                "fps": fps,
                "width": width,
                "height": height,
                "total_frames": total_frames,
            }
        )

        self.process_video_segment(
            start_time,
            end_time,
            cap,
            out,
            video_attrs=video_attrs,
            window_attrs=window_attrs,
        )

    def process_video_segment(
        self, start_time, end_time, cap, out, video_attrs: dict, window_attrs: dict
    ):
        """
        video_attrs["fps"], video_attrs["width"], video_attrs["height"], video_attrs["total_frames"]
        window_attrs["height"], window_attrs["width"]
        """
        fps, total_frames = video_attrs["fps"], video_attrs["total_frames"]
        start_frame = max(0, int(start_time * fps))
        end_frame = min(total_frames, int(end_time * fps))
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        for _ in range(start_frame, end_frame):
            ret, frame = cap.read()
            if not ret:
                break

            out.write(frame)

        cap.release()
        out.release()


class Move(Action):
    def __init__(self, event):
        super().__init__(event)
        self.trace = event["trace"]
        self.time_trace = event["time_trace"]
        self.vis = False

    def transform(self):
        super().transform()
        self.description = "Mouse move from {} to {}".format(
            self.trace[0], self.trace[-1]
        )


class Type(Action):
    def __init__(self, event):
        super().__init__(event)
        if event["action"] == "type":
            self.action = event["action"]
            self.key_names = event["key_names"]
            
        elif event["action"] == "press":
            self.action = "type"
            self.key_names = [event["name"]]
            
        self.time_trace = [event["time_stamp"]]
        self.end_time = self.time_trace[-1] + 0.2
        
        self.action_start_video_buffer_time = 0.5
        self.action_end_video_buffer_time = 0.2

    def append(self, event):
        if isinstance(event, dict):
            self.key_names.append(event["name"])
            self.time_trace.append(event["time_stamp"])
            self.end_time = self.time_trace[-1] + 0.2
        elif isinstance(event, Type):
            self.key_names.extend(event.key_names)
            self.time_trace.extend(event.time_trace)
            self.end_time = self.time_trace[-1] + 0.2

    def extend(self, action):
        self.key_names.extend(action.key_names)
        self.time_trace.extend(action.time_trace)
        self.end_time = self.time_trace[-1] + 0.2

    def transform(self):
        super().transform()
        self.description = "⌨️ Type: "
        for key in self.key_names:
            self.description += wrap_func_key(key)
        logger.error("transform {}".format(self.key_names))

    def process_video_segment(
        self, start_time, end_time, cap, out, video_attrs, window_attrs
    ):
        video_start_time = video_attrs["video_start_time"]
        fps, width, height, total_frames = (
            video_attrs["fps"],
            video_attrs["width"],
            video_attrs["height"],
            video_attrs["total_frames"],
        )
        start_frame = max(0, int(start_time * fps))
        end_frame = min(total_frames, int(end_time * fps))
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        font_scale, font_thickness, font = 2.5, 3, cv2.FONT_HERSHEY_SIMPLEX
        text_color = (0, 0, 255)

        key_index = 0
        current_key = ""
        key_display_time = 0.5

        for frame_number in range(start_frame, end_frame):
            ret, frame = cap.read()
            if not ret:
                break

            current_time = start_time + (frame_number - start_frame) / fps

            # check if show new key
            if (
                key_index < len(self.time_trace)
                and self.time_trace[key_index] <= current_time + video_start_time
            ):
                current_key = self.key_names[key_index]
                key_index += 1
            elif (
                current_time + video_start_time
                > self.time_trace[key_index - 1] + key_display_time
            ):
                current_key = ""  # clean key after show

            if current_key:
                text_size = cv2.getTextSize(
                    current_key, font, font_scale, font_thickness
                )[0]
                text_x = (width - text_size[0]) // 2
                text_y = height - 100

                cv2.putText(
                    frame,
                    current_key,
                    (text_x, text_y),
                    font,
                    font_scale,
                    text_color,
                    font_thickness,
                )

            out.write(frame)

        cap.release()
        out.release()


class Click(Action):  # single, double, triple, drag
    def __init__(self, event):
        super().__init__(event)
        self.click_type = 1
        self.button = event["button"]
        self.pressed = event["pressed"]
        self.coordinate = {"x": event["x"], "y": event["y"]}
        self.coordinates = [{"x": event["x"], "y": event["y"]}]
        self.time_trace = [
            {"start_time": event["start_time"], "end_time": event["end_time"]}
        ]
        if self.pressed == False:
            self.vis = False
        self.action_start_video_buffer_time = 0.5
        self.action_end_video_buffer_time = 0.1

    def _is_long_press(self):
        if self.children:
            if len(self.children) == 1 and self.children[0].action == "click":
                return False
            else:
                logger.warning("is_long_press")
                logger.warning(f"{self.action}, {self.children[0].action}")
                return self.end_time - self.start_time > MOUSE_LONG_PRESS_INTERVAL
        else:
            return False

    def cal_distance(self, mouse_action):
        if isinstance(mouse_action, Click):
            return (
                (self.coordinate["y"] - mouse_action.coordinate["y"]) ** 2
                + (self.coordinate["x"] - mouse_action.coordinate["x"]) ** 2
            ) ** 0.5
        elif isinstance(mouse_action, dict):
            return (
                (self.coordinate["y"] - mouse_action["y"]) ** 2
                + (self.coordinate["x"] - mouse_action["x"]) ** 2
            ) ** 0.5
        else:
            raise ValueError(
                f"Click cal_distance: {type(mouse_action)} type not supported."
            )

    def _is_drag(self):
        if self.children and len(self.children) == 1:
            child_action = self.children[0]
            if child_action.pre_move is not None:
                if self.cal_distance(child_action) > 6:  # TODO: need time?
                    logger.warning(f"{self.action} is drag")
                    return True
        return False

    def transform(self):
        super().transform()
        if self.pressed == False:  # TODO
            self.description = ""
            return

        if self.children and len(self.children) > 0:
            for child in self.children:
                if child.transformed == False:
                    child.transform()

        if self.click_type == 1:
            self.description = "Single {} Click".format(self.button)
        elif self.click_type == 2:
            self.description = "Double {} Click".format(self.button)
        elif self.click_type == 3:
            self.description = "Triple {} Click".format(self.button)
        else:
            self.description = "{} Click".format(self.button)

        if self._is_drag():
            self.action = "drag"
            child_action = self.children.pop(-1)
            self.children.append(child_action.pre_move)
            self.description = "Drag from ({}, {}) to ({}, {})".format(
                self.coordinate["x"],
                self.coordinate["y"],
                child_action.coordinate["x"],
                child_action.coordinate["y"],
            )
            return

        if self._is_long_press():
            self.action = "mouse_press"
            self.description = "Mouse long press {} button:\n".format(self.button)
            if self.children and len(self.children) > 0:
                for child in self.children:
                    if child.description:
                        self.description += child.description + "\n"

    def is_no_move_between_complete_click(self, click_action):
        if click_action.pre_move is None:
            return True
        elif self.cal_distance(click_action) < 4:
            return True
        else:
            return False

    def set_exception_end_event(self):
        self.complete = True
        duration = 0.5
        self.end_time = self.start_time + duration
        self.time_trace[-1]["end_time"] = self.start_time + duration
        self.exception = True
        exception_action = deepcopy(self)
        exception_action.start_time = self.start_time + duration
        exception_action.end_time = self.start_time + duration
        exception_action.pre_move = None
        exception_action.pressed = False
        exception_action.key = (
            exception_action.key[0], not exception_action.key[1])

        self.add_child(exception_action)

    def set_complete_event(self, event):  # TODO: no release coordinate
        self.end_time = event["time_stamp"]
        self.complete = True
        self.time_trace[-1]["end_time"] = event["time_stamp"]

    # TODO: already done / use this function
    def append(self, event):
        self.click_type += 1
        self.coordinates.append({"x": event["x"], "y": event["y"]})
        self.time_trace.append(
            {"start_time": event["start_time"], "end_time": event["end_time"]}
        )
        self.end_time = event["end_time"]

    def process_video_segment(
        self, start_time, end_time, cap, out, video_attrs, window_attrs
    ):
        if self.action == "drag":
            return self.process_drag_video_segment(
                start_time, end_time, cap, out, video_attrs, window_attrs
            )
        else:
            return self.process_click_video_segment(
                start_time, end_time, cap, out, video_attrs, window_attrs
            )

    def process_click_video_segment(
        self, start_time, end_time, cap, out, video_attrs, window_attrs
    ):
        fps, width, height, total_frames = (
            video_attrs["fps"],
            video_attrs["width"],
            video_attrs["height"],
            video_attrs["total_frames"],
        )
        height_ratio, width_ratio = (
            height / window_attrs["height"],
            width / window_attrs["width"],
        )
        start_frame = max(0, int(start_time * fps))
        end_frame = min(total_frames, int(end_time * fps))
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        x, y = int(self.coordinate["x"] * height_ratio), int(
            self.coordinate["y"] * width_ratio
        )

        for _ in range(start_frame, end_frame):
            ret, frame = cap.read()
            if not ret:
                break

            cv2.circle(frame, (x, y), 15, (0, 0, 255), 2)
            out.write(frame)

        cap.release()
        out.release()

    def process_drag_video_segment(
        self, start_time, end_time, cap, out, video_attrs, window_attrs
    ):
        video_start_time = video_attrs["video_start_time"]
        fps, width, height, total_frames = (
            video_attrs["fps"],
            video_attrs["width"],
            video_attrs["height"],
            video_attrs["total_frames"],
        )
        height_ratio, width_ratio = (
            height / window_attrs["height"],
            width / window_attrs["width"],
        )
        start_frame = max(0, int(start_time * fps))
        end_frame = min(total_frames, int(end_time * fps))
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        trace_color = (0, 0, 255)
        trace_thickness = 2

        arrow_color = (0, 0, 255)
        arrow_size = 20

        drawn_points = []
        if self.children and len(self.children) > 0:
            time_trace = self.children[0].time_trace
            trace = self.children[0].trace
        else:
            time_trace = self.drag_time_trace
            trace = self.drag_trace
            
        for time_point in time_trace:
            if (
                start_time + video_start_time
                <= time_point
                <= end_time + video_start_time
            ):
                x, y = trace[
                    time_trace.index(time_point)
                ]
                x, y = int(x * width_ratio), int(y * height_ratio)
                drawn_points.append((x, y))
        
        mid_index = len(drawn_points) // 2
        if mid_index > 0:
            start_point = drawn_points[mid_index - 1]
            end_point = drawn_points[mid_index:mid_index+3][-1]
            
            # Calculate direction for arrowhead
            direction = np.array(end_point) - np.array(start_point)
            norm = np.linalg.norm(direction)
            
            if norm != 0:
                direction = direction / norm * arrow_size
            else:
                direction = np.array([arrow_size, 0])  # Default direction

            perpendicular = np.array([-direction[1], direction[0]])  # Perpendicular to the direction

            # Arrow tip points
            tip_point = tuple(map(int, np.array(start_point)))
            
            # Calculate wing positions relative to the direction
            left_wing = tuple(map(int, np.array(tip_point) + perpendicular / 2 - direction / 2))
            right_wing = tuple(map(int, np.array(tip_point) - perpendicular / 2 - direction / 2))

        
        for frame_number in range(start_frame, end_frame):
            ret, frame = cap.read()
            if not ret:
                break

            if len(drawn_points) > 1:
                for i in range(1, len(drawn_points)):
                    cv2.line(
                        frame,
                        drawn_points[i - 1],
                        drawn_points[i],
                        trace_color,
                        trace_thickness,
                    )

                # Draw filled arrowhead (triangle)
                cv2.fillPoly(
                    frame,
                    [np.array([tip_point, left_wing, right_wing], dtype=np.int32)],
                    arrow_color
                )

            out.write(frame)

        cap.release()
        out.release()


class Press(Action):  # type, press, long press
    def __init__(self, event):
        super().__init__(event)

        self.key_name = event["name"]
        self.complete = event["complete"]
        self.pressed = self.key[-1]
        self.action_start_video_buffer_time = 0.3
        self.action_end_video_buffer_time = 0.2

    def set_complete_event(self, event: dict):
        self.end_time = event["time_stamp"]
        self.complete = True

    def is_typing(self) -> bool:
        if (
            self.complete
            and self.children is not None
            and len(self.children) == 1
            and isinstance(self.children[0], Type)
            and "shift" in self.key_name
        ):
            return True
        else:
            return False

    def transform(self):
        if self.exception:
            self.description = "⌨️ Press: {}".format(
                wrap_func_key(self.key_name))
            return

        super().transform()
        if self.pressed == False:  # TODO
            return

        if not self.children:
            self.description = "⌨️ Press: {}".format(
                wrap_func_key(self.key_name))
            return

        # TODO: sort by time, include child action
        if len(self.children) > 1:
            for i in range(len(self.children) - 1, 0, -1):
                if (
                    self.children[i - 1].end_time and self.children[i].end_time
                    and self.children[i - 1].start_time < self.children[i].start_time
                    and self.children[i - 1].end_time > self.children[i].end_time
                ):
                    logger.warning("Reducer: re-arrange: {} {} {}".format(
                        i-1, i, self.children[i].key))
                    child = self.children.pop(i)
                    self.children[i - 1].add_child(child)

        if self.children and len(self.children) > 0:
            for child in self.children:
                if child.transformed == False:
                    child.transform()

        if len(self.children) == 1:
            if self.children[0].action == "type":
                self.description = "⌨️ Press: {} + {}".format(
                    wrap_func_key(self.key_name), self.children[0].get_str()
                )
                self.children[0].vis = False

            elif self.children[0].action == "press":  # TODO: modify
                self.description = (
                    f"⌨️ Press: {wrap_func_key(self.key_name)} + "
                    + self.children[0].description.lstrip("⌨️ Press: ")
                )
            else:
                self.action = "long_press"
                self.description = "⌨️ Long Press: {}".format(
                    wrap_func_key(self.key_name)
                )
        else:
            self.action = "long_press"
            self.description = "⌨️ Long Press: {}".format(
                wrap_func_key(self.key_name))

        
        
    def process_video_segment(
        self, start_time, end_time, cap, out, video_attrs, window_attrs
    ):
        fps, width, height, total_frames = (
            video_attrs["fps"],
            video_attrs["width"],
            video_attrs["height"],
            video_attrs["total_frames"],
        )

        start_frame = max(0, int(start_time * fps))
        end_frame = min(total_frames, int(end_time * fps))
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        font_scale = 1
        font_thickness = 2
        font = cv2.FONT_HERSHEY_SIMPLEX
        text_color = (0, 0, 255)  # 红色

        # remove emoji
        display_text = ""
        if self.description:
            display_text = (
                self.description.split(" ", 1)[1]
                if " " in self.description
                else self.description
            )

        for frame_number in range(start_frame, end_frame):
            ret, frame = cap.read()
            if not ret:
                break

            text_size = cv2.getTextSize(display_text, font, font_scale, font_thickness)[
                0
            ]
            text_x = (width - text_size[0]) // 2
            text_y = height - 60

            cv2.putText(
                frame,
                display_text,
                (text_x, text_y),
                font,
                font_scale,
                text_color,
                font_thickness,
            )
            out.write(frame)

        cap.release()
        out.release()

    def set_exception_end_event(self):
        self.complete = True
        duration = 0.01
        self.end_time = self.start_time + duration
        self.exception = True
        exception_action = deepcopy(self)
        exception_action.start_time = self.start_time + duration
        exception_action.end_time = self.start_time + duration
        exception_action.pre_move = None
        exception_action.pressed = False
        exception_action.key = (
            exception_action.key[0], not exception_action.key[1])

        self.add_child(exception_action)


class Scroll(Action):
    def __init__(self, event):
        super().__init__(event)
        self.trace = event["trace"]
        self.time_trace = event["time_trace"]

        self.action_start_video_buffer_time = 0.5
        self.action_end_video_buffer_time = 0.2

    def extend(self, event):
        if event["action"] != self.action:
            raise ValueError(
                "Scroll extend error: action not match {}".format(
                    event["action"])
            )

        self.trace.extend(event["trace"])
        self.time_trace.extend(event["time_trace"])
        self.end_time = event["end_time"]

    def _get_direction_icon(self, dx, dy):
        if dx:
            dx /= abs(dx)
        if dy:
            dy /= abs(dy)
        direction2icon = {
            (0, 1): "⬆️",
            (0, -1): "⬇️",
            (1, 0): "⬅️",
            (-1, 0): "➡️",
            (1, 1): "↖",
            (-1, 1): "↗",
            (1, -1): "↙",
            (-1, -1): "↘",
        }
        return direction2icon[(dx, dy)]

    def _get_direction_text(self, dx, dy):
        if dx:
            dx /= abs(dx)
        if dy:
            dy /= abs(dy)
        direction2text = {
            (0, 1): "Up",
            (0, -1): "Down",
            (1, 0): "Left",
            (-1, 0): "Right",
            (1, 1): "Top Left",
            (-1, 1): "Top Right",
            (1, -1): "Bottom Left",
            (-1, -1): "Bottom Right",
        }
        return direction2text[(dx, dy)]

    def transform(self):
        super().transform()
        self.description = "Scroll "
        direction_count = {}
        for i in range(len(self.trace)):
            dx, dy = self.trace[i]["dx"], self.trace[i]["dy"]
            direction = self._get_direction_icon(dx, dy)
            if direction not in direction_count:
                direction_count[direction] = 1
            else:
                direction_count[direction] += 1

        for direction in direction_count:
            self.description += "{}×{}  ".format(
                direction, direction_count[direction])

    def process_video_segment(
        self, start_time, end_time, cap, out, video_attrs, window_attrs
    ):
        video_start_time = video_attrs["video_start_time"]
        fps, width, height, total_frames = (
            video_attrs["fps"],
            video_attrs["width"],
            video_attrs["height"],
            video_attrs["total_frames"],
        )
        height_ratio, width_ratio = (
            height / window_attrs["height"],
            width / window_attrs["width"],
        )
        start_frame = max(0, int(start_time * fps))
        end_frame = min(total_frames, int(end_time * fps))
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        scroll_index = 0
        last_scroll_time = None
        min_display_time = 0.2

        for frame_number in range(start_frame, end_frame):
            ret, frame = cap.read()
            if not ret:
                break

            current_time = start_time + (frame_number - start_frame) / fps

            # new scroll
            if (
                scroll_index < len(self.time_trace)
                and self.time_trace[scroll_index] <= current_time + video_start_time
            ):
                last_scroll_time = current_time
                trace = self.trace[scroll_index]
                x, y = int(
                    trace["x"] * width_ratio), int(trace["y"] * height_ratio)
                dx, dy = trace["dx"], trace["dy"]
                scroll_index += 1

            # if one scroll is showing
            if last_scroll_time is not None:
                # check if continue showing
                if (
                    current_time - last_scroll_time < min_display_time
                    or scroll_index == len(self.time_trace)
                ):
                    # Draw arrow
                    arrow_length = 60
                    end_x = max(0, min(width - 1, x - int(dx * arrow_length)))
                    end_y = max(0, min(height - 1, y - int(dy * arrow_length)))
                    cv2.arrowedLine(
                        frame, (x, y), (end_x, end_y), (0, 0, 255), 2, tipLength=0.3
                    )

                    # Add direction text
                    direction_text = "Scroll " + self._get_direction_text(
                        np.sign(dx), np.sign(dy)
                    )
                    text_x = x + 20 if x < width / 2 else x - 20
                    cv2.putText(
                        frame,
                        direction_text,
                        (int(text_x), y),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 0, 255),
                        2,
                    )
                else:
                    last_scroll_time = None  # stop current scroll

            out.write(frame)

        cap.release()
        out.release()
