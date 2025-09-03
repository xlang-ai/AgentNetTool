import copy
from typing import Any, Literal, Union, Tuple
import json
import pickle
import plistlib
import re
import time

import AppKit
import ApplicationServices
import Foundation
import oa_atomacos
import Quartz
import concurrent

from .Element.DarwinElementDescriber import DarwinElementDescriber
from ..logger import logger

RESERVED_KEYS = {
    "AXEnabled": "st",
    "AXFocused": "st",
    "AXFullScreen": "st",
    "AXTitle": "attr",
    "AXChildrenInNavigationOrder": "attr",
    "AXChildren": "attr",
    "AXFrame": "attr",
    "AXRole": "role",
    "AXHelp": "attr",
    "AXRoleDescription": "role",
    "AXSubrole": "role",
    "AXURL": "attr",
    "AXValue": "val",
    "AXDescription": "attr",
    "AXDOMIdentifier": "attr",
    "AXSelected": "st",
    "AXInvalid": "st",
    "AXRows": "attr",
    "AXColumns": "attr",
}

MAX_DEPTH = 50


def get_top_window() -> dict:
    windows = Quartz.CGWindowListCopyWindowInfo(
        (
            Quartz.kCGWindowListExcludeDesktopElements |
            Quartz.kCGWindowListOptionOnScreenOnly
        ),
        Quartz.kCGNullWindowID,
    )
    active_windows_info = [
        win
        for win in windows
        if win["kCGWindowLayer"] == 0
        and win["kCGWindowOwnerName"] != "Window Server"
        and win.get("kCGWindowName", "") != ""
        and "kCGWindowBounds" in win
    ]
    if len(active_windows_info) == 0:
        return
    return active_windows_info[0]


def get_top_window_name() -> str:
    try:
        window = get_top_window()
        if not window:
            return "Desktop"
        return window["kCGWindowOwnerName"]
    except Exception as exc:
        logger.info(f"Error getting top window name: {exc}")
        return "Desktop"


def get_active_window_meta() -> dict:
    """
    Get the metadata of the active window.

    """
    windows = Quartz.CGWindowListCopyWindowInfo(
        (
            Quartz.kCGWindowListExcludeDesktopElements |
            Quartz.kCGWindowListOptionOnScreenOnly
        ),
        Quartz.kCGNullWindowID,
    )
    active_windows_info = [
        win
        for win in windows
        if win["kCGWindowLayer"] == 0 and win["kCGWindowOwnerName"] != "Window Server"
    ]
    if len(active_windows_info) == 0:
        return
    return active_windows_info[0]


def get_dock_meta() -> dict:
    """
    Get the metadata of the Dock.

    """
    windows = Quartz.CGWindowListCopyWindowInfo(
        (
            Quartz.kCGWindowListOptionAll
        ),
        Quartz.kCGNullWindowID,
    )
    dock_info = [
        win
        for win in windows
        if win.get("kCGWindowName") == "Dock"
    ]
    return dock_info[0]


def get_active_window(window_meta: dict) -> ApplicationServices.AXUIElementRef | None:
    pid = window_meta["kCGWindowOwnerPID"]
    app_ref = ApplicationServices.AXUIElementCreateApplication(pid)
    error_code, window = ApplicationServices.AXUIElementCopyAttributeValue(
        app_ref, "AXWindows", None
    )
    if error_code:
        return None
    return window[0]


def _create_axui_node(node, nodes: set = None, depth: int = 0, bbox: tuple = None, switched: bool = False):
    nodes = nodes or set()
    if node in nodes:
        return None, switched
    nodes.add(node)

    reserved_keys = {
        "AXEnabled": "st",
        "AXFocused": "st",
        "AXFullScreen": "st",
        "AXTitle": "attr",
        "AXChildrenInNavigationOrder": "attr",
        "AXChildren": "attr",
        "AXFrame": "attr",
        "AXRole": "role",
        "AXHelp": "attr",
        "AXRoleDescription": "role",
        "AXSubrole": "role",
        "AXURL": "attr",
        "AXValue": "val",
        "AXDescription": "attr",
        "AXDOMIdentifier": "attr",
        "AXSelected": "st",
        "AXInvalid": "st",
        "AXRows": "attr",
        "AXColumns": "attr",
    }
    attribute_dict = {}

    error_code, attr_names = ApplicationServices.AXUIElementCopyAttributeNames(
        node, None
    )

    if error_code:
        # -25202: AXError.invalidUIElement
        #         The accessibility object received in this event is invalid.
        switched = True
        return None, switched

    value = None

    if "AXFrame" in attr_names:
        error_code, attr_val = ApplicationServices.AXUIElementCopyAttributeValue(
            node, "AXFrame", None
        )
        rep = repr(attr_val)
        x_value = re.search(r"x:(-?[\d.]+)", rep)
        y_value = re.search(r"y:(-?[\d.]+)", rep)
        w_value = re.search(r"w:(-?[\d.]+)", rep)
        h_value = re.search(r"h:(-?[\d.]+)", rep)
        type_value = re.search(r"type\s?=\s?(\w+)", rep)
        value = {
            "x": float(x_value.group(1)) if x_value else None,
            "y": float(y_value.group(1)) if y_value else None,
            "w": float(w_value.group(1)) if w_value else None,
            "h": float(h_value.group(1)) if h_value else None,
            "type": type_value.group(1) if type_value else None,
        }

        if not any(v is None for v in value.values()):
            x_min = max(bbox[0], value["x"])
            x_max = min(bbox[2], value["x"] + value["w"])
            y_min = max(bbox[1], value["y"])
            y_max = min(bbox[3], value["y"] + value["h"])

            if x_min > x_max or y_min > y_max:
                # No intersection
                return None, switched

    for attr_name, ns_key in reserved_keys.items():
        if attr_name not in attr_names:
            continue

        if value and attr_name == "AXFrame":
            bb = value
            if not any(v is None for v in bb.values()):
                attribute_dict["AXFrame"] = str(bb)
            continue

        error_code, attr_val = ApplicationServices.AXUIElementCopyAttributeValue(
            node, attr_name, None
        )

        # Set the attribute_dict
        if not (
            isinstance(attr_val, ApplicationServices.AXUIElementRef)
            or isinstance(attr_val, (AppKit.NSArray, list))
        ):
            if attr_val is not None:
                attribute_dict[attr_name] = str(attr_val)

    future_to_child = []

    with concurrent.futures.ThreadPoolExecutor() as executor:
        for attr_name, ns_key in reserved_keys.items():
            if attr_name not in attr_names:
                continue

            error_code, attr_val = ApplicationServices.AXUIElementCopyAttributeValue(
                node, attr_name, None
            )
            if isinstance(attr_val, ApplicationServices.AXUIElementRef):
                future_to_child.append(
                    executor.submit(_create_axui_node, attr_val,
                                    nodes, depth + 1, bbox, switched)
                )

            elif isinstance(attr_val, (AppKit.NSArray, list)):
                for child in attr_val:
                    future_to_child.append(
                        executor.submit(
                            _create_axui_node, child, nodes, depth + 1, bbox, switched
                        )
                    )

        try:
            if isinstance(future_to_child, list):
                attribute_dict[attr_name] = []
                for future in concurrent.futures.as_completed(future_to_child):
                    result = future.result()
                    if result[0] is not None:
                        attribute_dict[attr_name].append(result[0])
                        switched = switched or result[1]
            else:
                for future in concurrent.futures.as_completed(future_to_child):
                    result = future.result()
                    if result[0] is not None:
                        attribute_dict[attr_name] = result[0]
                        switched = switched or result[1]
        except Exception as e:
            print(e)

    return attribute_dict, switched


def dump_state(
    element: Union[AppKit.NSArray, list, AppKit.NSDictionary, dict, Any],
    elements: set = None,
    depth: int = 0,
    max_depth: int = 10,
) -> Union[dict, list]:
    """Dump the state of the given element and its descendants.

    Args:
        element: The element to dump the state for.
        elements (set): Set to track elements to prevent circular traversal.

    Returns:
        dict or list: State of element and descendants as dict or list
    """

    # if depth > max_depth:
    #     return

    elements = elements or set()
    if element in elements:
        return
    elements.add(element)

    if isinstance(element, AppKit.NSArray) or isinstance(element, list):
        state = []
        for child in element:
            _state = dump_state(child, elements, depth + 1)
            if _state:
                state.append(_state)
        return state
    elif isinstance(element, AppKit.NSDictionary) or isinstance(element, dict):
        state = {}

        for k, v in element.items():
            _state = dump_state(v, elements, depth)
            if _state:
                state[k] = _state
        return state
    else:
        error_code, attr_names = ApplicationServices.AXUIElementCopyAttributeNames(
            element, None
        )
        if attr_names:
            state = {}

            for attr_name in RESERVED_KEYS.keys():
                if attr_name not in attr_names:
                    continue
                # don't traverse back up
                # for WindowEvents:
                if "parent" in attr_name.lower():
                    continue
                # For ActionEvents:
                if attr_name in (
                    "AXTopLevelUIElement",
                    "AXWindow"
                ):
                    continue

                (
                    error_code,
                    attr_val,
                ) = ApplicationServices.AXUIElementCopyAttributeValue(
                    element,
                    attr_name,
                    None,
                )

                # for ActionEvents
                if attr_val is not None and (
                    attr_name == "AXRole" and "application" in attr_val.lower()
                ):
                    continue
                _state = dump_state(attr_val, elements, depth + 1)
                if _state:
                    state[attr_name] = _state
            return state
        else:
            return element


def deepconvert_objc(object: Any) -> Any | list | dict | Literal[0]:
    """Convert all contents of an ObjC object to Python primitives.

    Args:
        object: The object to convert.

    Returns:
        object: The converted object with Python primitives.
    """
    value = object
    strings = (
        str,
        AppKit.NSString,
        ApplicationServices.AXTextMarkerRangeRef,
        ApplicationServices.AXUIElementRef,
        ApplicationServices.AXTextMarkerRef,
        Quartz.CGPathRef,
    )

    if isinstance(object, AppKit.NSNumber):
        value = int(object)
    elif isinstance(object, AppKit.NSArray) or isinstance(object, list):
        value = [deepconvert_objc(x) for x in object]
    elif isinstance(object, AppKit.NSDictionary) or isinstance(object, dict):
        value = {deepconvert_objc(k): deepconvert_objc(v)
                 for k, v in object.items()}
    elif isinstance(object, strings):
        value = str(object)
    # handle core-foundation class AXValueRef
    elif isinstance(object, ApplicationServices.AXValueRef):
        # convert to dict - note: this object is not iterable
        # TODO: access directly, e.g. via
        # ApplicationServices.AXUIElementCopyAttributeValue
        rep = repr(object)
        x_value = re.search(r"x:(-?[\d.]+)", rep)
        y_value = re.search(r"y:(-?[\d.]+)", rep)
        w_value = re.search(r"w:(-?[\d.]+)", rep)
        h_value = re.search(r"h:(-?[\d.]+)", rep)
        type_value = re.search(r"type\s?=\s?(\w+)", rep)
        value = {
            "x": float(x_value.group(1)) if x_value else None,
            "y": float(y_value.group(1)) if y_value else None,
            "w": float(w_value.group(1)) if w_value else None,
            "h": float(h_value.group(1)) if h_value else None,
            "type": type_value.group(1) if type_value else None,
        }
    elif isinstance(object, Foundation.NSURL):
        value = str(object.absoluteString())
    elif isinstance(object, Foundation.__NSCFAttributedString):
        value = str(object.string())
    elif isinstance(object, Foundation.__NSCFData):
        value = {
            deepconvert_objc(k): deepconvert_objc(v)
            for k, v in plistlib.loads(object).items()
        }
    elif isinstance(object, plistlib.UID):
        value = object.data
    else:
        if object and not (isinstance(object, bool) or isinstance(object, int)):
            pass
            # logger.warning(
            #     f"Unknown type: {type(object)} - "
            #     "Please report this on GitHub: "
            #     "github.com/MLDSAI/OpenAdapt/issues/new?"
            #     "assignees=&labels=bug&projects=&template=bug_form.yml&"
            #     "title=%5BBug%5D%3A+"
            # )
            # logger.warning(f"{object=}")
    if value:
        value = oa_atomacos._converter.Converter().convert_value(value)
    return value


def get_window_data(window_meta: dict) -> Tuple[dict, bool]:
    """Get the data of the window.

    Args:
        window_meta (dict): The metadata of the window.

    Returns:
        dict: A dictionary containing the data of the window.
    """
    start_time = time.time()
    window = get_active_window(window_meta)
    bb = (window_meta["kCGWindowBounds"]["X"],
          window_meta["kCGWindowBounds"]["Y"],
          window_meta["kCGWindowBounds"]["X"] +
          window_meta["kCGWindowBounds"]["Width"],
          window_meta["kCGWindowBounds"]["Y"] + window_meta["kCGWindowBounds"]["Height"])
    state, switched = _create_axui_node(window, bbox=bb)
    print(
        f"Time taken to dump window {window_meta['kCGWindowName']}: {time.time() - start_time}")
    return state, switched


def get_active_window_state() -> dict | None:
    """
    Get the state of the active window.

    Returns:
        A dictonary containing the state of the active window.
    """
    # pywinctl performance on macOS is unusable, see:
    # https://github.com/Kalmat/PyWinCtl/issues/29
    meta = get_active_window_meta()
    title_parts = [
        meta["kCGWindowOwnerName"],
        meta["kCGWindowName"],
    ]
    title_parts = [part for part in title_parts if part]
    title = " ".join(title_parts)
    window_id = meta["kCGWindowNumber"]
    bounds = meta["kCGWindowBounds"]
    left = bounds["X"]
    top = bounds["Y"]
    width = bounds["Width"]
    height = bounds["Height"]
    rval = {
        "title": title,
        "left": left,
        "top": top,
        "width": width,
        "height": height,
        "window_id": window_id,
    }
    return rval


def get_active_element_state(x: int, y: int) -> dict:
    """Get the state of the active element at the specified coordinates.

    Args:
        x (int): The x-coordinate of the element.
        y (int): The y-coordinate of the element.

    Returns:
        dict: A dictionary containing the state of the active element.
    """
    try:
        dock_meta = get_dock_meta()
        pid = dock_meta["kCGWindowOwnerPID"]
        app = oa_atomacos._a11y.AXUIElement.from_pid(pid)
        el = app.get_element_at_position(x, y)
        state = dump_state(el.ref)
        state = deepconvert_objc(state)
    except Exception as exc:
        window_meta = get_active_window_meta()
        if not window_meta:
            return ()
        pid = window_meta["kCGWindowOwnerPID"]
        app = oa_atomacos._a11y.AXUIElement.from_pid(pid)
        try:
            el = app.get_element_at_position(x, y)
        except Exception as exc:
            # The process does not fully support the accessibility API.
            return ()
        state = dump_state(el.ref)
        state = deepconvert_objc(state)

    return state


def parse_element(element, x: float, y: float):
    try:
        if not isinstance(element, dict):
            return {}
        describer = DarwinElementDescriber(x, y)
        describer = describer.build_from_json(element, rule="general")
        describer.calculate_score()
        target = describer.find_most_score_node()
        return target.to_dict() if target else {}
    except Exception as e:
        logger.error(f"Error parsing element: {e}")
        return {}


def get_accessibility_tree():
    tree_status = {
        "complete": True,
        "switched": False,
        "closed": False,
    }
    switched = False
    try:
        top_window_key_before = get_active_window_state()
        meta = get_active_window_meta()
        tree, switched = get_window_data(meta)
    except Exception as e:
        tree_status["complete"] = False
        tree_status["closed"] = True
        logger.exception(f"get_accessibility_tree error: {str(e)}")

    if switched:
        tree_status["complete"] = False
        tree_status["switched"] = True
    else:
        top_window_key_after = get_active_window_state()
        if top_window_key_before != top_window_key_after:
            tree_status["complete"] = False
            tree_status["switched"] = True

    tree.update(tree_status)
    return tree


def main():
    from pynput import mouse

    def on_click(x, y, button, pressed):
        if pressed:
            print(x, y)
            start_time = time.time()
            state = get_active_element_state(x, y)
            print(f"Time taken to dump element: {time.time() - start_time}")
            with open("./test.json", "a") as f:
                f.write(json.dumps(state, indent=4) + "\n")

    mouse_listener = mouse.Listener(on_click=on_click)
    mouse_listener.start()
    time.sleep(100)


# Example usage
if __name__ == "__main__":
    main()
    # Assuming some example JSON data structure:
    # with open("./test.json", "r") as f:
    #     json_data = json.load(f)
    # x, y = json_data["x"], json_data["y"]
    # print(x, y)
    # json_data = json_data["element"]

    # describer = DarwinElementDescriber(x, y)
    # describer = describer.build_from_json(json_data)
    # describer.calculate_score()
    # describer.print_element()
    # target = describer.find_most_score_node()
    # print("===============================")
    # print("Target Element:")
    # target.print_element()
    # print("===============================")
