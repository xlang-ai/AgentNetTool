import uiautomation as auto
import time
from .Element.WindowsElementDescriber import WindowsElementDescriber
import psutil
import win32gui


MAX_DEPTH = 30
MAX_WIDTH = 1024


import ctypes
import psutil
import win32gui

from ..logger import logger
from screeninfo import get_monitors


for monitor in get_monitors():
    screenWidth = monitor.width
    screenHeight = monitor.height

# GETTING TOP WINDOW NAME {{{ #


def get_top_window_name() -> str:
    hwnd = win32gui.GetForegroundWindow()

    pid = ctypes.c_ulong()
    ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    pid_value = pid.value

    if pid_value == 0:
        return None

    process = psutil.Process(pid_value)
    process_name = process.name()

    return process_name.split(".", 1)[0]


# }}} GETTING TOP WINDOW NAME #

# GETTING TREES {{{ #


def get_top_window_key(control: auto.Control):
    top_window = control.GetTopLevelControl()
    return (
        win32gui.GetForegroundWindow(),
        top_window.ControlType,
        top_window.ClassName,
        top_window.AutomationId,
        top_window.Name,
    )


"""def get_accessibility_tree():
    with auto.UIAutomationInitializerInThread():
        focused_control = auto.GetFocusedControl()
        trial = 0
        while trial < 5:
            trial += 1
            top_window = focused_control.GetTopLevelControl()
            if top_window is not None:
                break
            logger.info("Window: None, retrying...")
            time.sleep(0.2)
        logger.info(f"Top Window: {top_window}")
        window_tree = traverse_control_tree(top_window)
        return window_tree"""


def get_accessibility_tree():
    window_tree = {}
    with auto.UIAutomationInitializerInThread():
        focused_control = auto.GetFocusedControl()
        trial = 0
        while trial < 5:
            trial += 1
            top_window = focused_control.GetTopLevelControl()
            if top_window is not None:
                break
            logger.warning("Window: None, retrying...")
            time.sleep(0.2)
        logger.warning(f"Top Window: {top_window}")

        if not top_window:
            return None

        tree_status = {
            "complete": True,
            "switched": False,
            "closed": False,
        }
        top_window_key_before = get_top_window_key(top_window)
        top_window_key_after = ()
        try:
            window_tree = traverse_control_tree(top_window, depth=0)
            top_window_key_after = get_top_window_key(focused_control)

        except Exception as e:
            tree_status["complete"] = False
            tree_status["closed"] = True
            logger.exception(f"get_accessibility_tree: Window closed! {str(e)}")

        if top_window_key_before != top_window_key_after:
            tree_status["complete"] = False
            tree_status["switched"] = True

        logger.warning(tree_status)
        window_tree.update(tree_status)
        return window_tree


# }}} GETTING TREES #

# GETTING ELEMENT AT POINT {{{ #


def get_active_element_state(x, y):
    with auto.UIAutomationInitializerInThread():
        element = auto.ControlFromPoint(x, y)
        logger.info(f"Element: {element}")
        element_tree = traverse_control_tree(element)
        return element_tree


def parse_element(element, x: float, y: float):
    try:
        describer = WindowsElementDescriber(x, y)
        describer = describer.build_from_json(element)
        describer.calculate_score()
        target = describer.find_most_score_node()
        if target.score < 0:
            return None
        #logger.info(f"Parse element: {(str(target.to_dict()))}")
        return target.to_dict()
    except Exception as e:
        logger.info(e)
        return None


# }}} GETTING ELEMENT AT POINT #

# HELPER FUNCTIONS {{{ #


def traverse_control_tree(control, depth=0):
    tree = {
        "Name": control.Name,
        "ControlType": control.ControlTypeName,
        "BoundingRectangle": dictify_rect(control.BoundingRectangle),
        "Depth": depth,
        "Children": [],
    }
    if depth < MAX_DEPTH:
        for child in control.GetChildren()[:MAX_WIDTH]:
            child_tree = traverse_control_tree(child, depth + 1)
            if child_tree:
                tree["Children"].append(child_tree)
    return tree


def dictify_rect(rect: auto.uiautomation.Rect) -> dict:
    """Convert a rectangle object to a dictionary.

    Args:
        rect: The rectangle object.

    Returns:
        dict: A dictionary representation of the rectangle.
    """
    rect_dict = {
        "left": rect.left,
        "top": rect.top,
        "right": rect.right,
        "bottom": rect.bottom,
    }
    return rect_dict


# }}} HELPER FUNCTIONS #

if __name__ == "__main__":
    import json
    import time
    from pynput import mouse

    data = []
    click_counter = [0]
    current_time = time.localtime()

    # 提取月、日、时、分
    current_month = current_time.tm_mon
    current_day = current_time.tm_mday
    current_hour = current_time.tm_hour
    current_minute = current_time.tm_min
    file_path = (
        f"data_{current_month}{current_day}_{current_hour}{current_minute}.jsonl"
    )

    def on_click(x, y, button, pressed):
        if pressed:
            # Initialize COM in this thread using a context manager
            # The thread created by pynput doesn't automatically initialize the COM library, which is required for using uiautomation.
            # The COM library must be initialized separately in each thread that uses COM objects or interfaces.
            # Since on_click is executed in the listener thread, and we don't have control over the thread creation (as it's managed internally by pynput), we need to initialize COM within on_click itself.
            # with auto.UIAutomationInitializerInThread():
            click_counter[0] += 1
            if click_counter[0] < 10:
                element_start = time.time()
                print(get_top_window_name())
                # element_data = get_active_element_state(x, y)
                # logger.info(
                #     f"Processing element tree took {time.time() - element_start} seconds."
                # )
                # with open(
                #     file_path,
                #     "a",
                #     encoding="utf-8",
                # ) as f:
                #     json.dump(
                #         {f"element{click_counter[0]}": element_data},
                #         f,
                #         indent=4,
                #         ensure_ascii=False,
                #     )
                #     f.write("\n")
                # logger.info(x, y, "Parsed element:", parse_element(element_data, x, y))
                # time.sleep(1)
                # window_start = time.time()
                # window_data = get_accessibility_tree()
                # logger.info(
                #     f"Processing window tree took {time.time() - window_start} seconds."
                # )
                # with open(
                #     file_path,
                #     "a",
                #     encoding="utf-8",
                # ) as f:
                #     json.dump(
                #         {f"window{click_counter[0]}": window_data},
                #         f,
                #         indent=4,
                #         ensure_ascii=False,
                #     )
                #     f.write("\n")

            else:
                return False  # Stop listener

    mouse_listener = mouse.Listener(on_click=on_click)
    mouse_listener.start()
    mouse_listener.join()
