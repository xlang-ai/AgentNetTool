"""
Fetch Accessibility Trees of All Windows.
Using Code from OSWorld
"""

import concurrent.futures
import lxml.etree
import re

from platform import system
from typing import Any, Dict, Optional
from lxml.etree import _Element

from ..logger import logger

# from api.core.logger import logger


if system() == "Windows":
    from pywinauto import Desktop
    from pywinauto.base_wrapper import BaseWrapper
    import pywinauto.application
    import threading
    from screeninfo import get_monitors

    for monitor in get_monitors():
        screenWidth = monitor.width
        screenHeight = monitor.height


elif system() == "Darwin":
    import AppKit
    import ApplicationServices
    import Quartz

    Accessible = Any
    BaseWrapper = Any

_accessibility_ns_map = {
    "windows": {
        "st": "https://accessibility.windows.example.org/ns/state",
        "attr": "https://accessibility.windows.example.org/ns/attributes",
        "cp": "https://accessibility.windows.example.org/ns/component",
        "doc": "https://accessibility.windows.example.org/ns/document",
        "docattr": "https://accessibility.windows.example.org/ns/document/attributes",
        "txt": "https://accessibility.windows.example.org/ns/text",
        "val": "https://accessibility.windows.example.org/ns/value",
        "act": "https://accessibility.windows.example.org/ns/action",
        "class": "https://accessibility.windows.example.org/ns/class",
    },
    "macos": {
        "st": "https://accessibility.macos.example.org/ns/state",
        "attr": "https://accessibility.macos.example.org/ns/attributes",
        "cp": "https://accessibility.macos.example.org/ns/component",
        "doc": "https://accessibility.macos.example.org/ns/document",
        "txt": "https://accessibility.macos.example.org/ns/text",
        "val": "https://accessibility.macos.example.org/ns/value",
        "act": "https://accessibility.macos.example.org/ns/action",
        "role": "https://accessibility.macos.example.org/ns/role",
    },
}

_accessibility_ns_map_windows = _accessibility_ns_map["windows"]
_accessibility_ns_map_macos = _accessibility_ns_map["macos"]

MAX_DEPTH = 50
MAX_WIDTH = 1024
MAX_CALLS = 5000


# A11y tree getter for Windows
# Abandoned
def _create_pywinauto_node(
    node, nodes, depth: int = 0, flag: Optional[str] = None
) -> _Element:
    global screenWidth, screenHeight
    nodes = nodes or set()
    if node in nodes:
        return
    nodes.add(node)

    attribute_dict: Dict[str, Any] = {"name": node.element_info.name}

    #  Component
    in_screen = True
    try:
        rectangle = node.rectangle()
        # attribute_dict[
        #     "{{{:}}}screencoord".format(_accessibility_ns_map_windows["cp"])
        # ] = "({:d}, {:d})".format(rectangle.left, rectangle.top)
        # attribute_dict["{{{:}}}size".format(_accessibility_ns_map_windows["cp"])] = (
        #     "({:d}, {:d})".format(rectangle.width(), rectangle.height())
        # )
        attribute_dict["screencoord"] = "({:d}, {:d})".format(
            rectangle.left, rectangle.top
        )
        attribute_dict["size"] = "({:d}, {:d})".format(
            rectangle.width(), rectangle.height()
        )
        if (
            rectangle.left > screenWidth
            or (rectangle.left + rectangle.width()) < 0
            or rectangle.top > screenHeight
            or (rectangle.top + rectangle.height()) < 0
            or rectangle.width() == 0
            or rectangle.height() == 0
        ):
            in_screen = False

    except Exception as e:
        logger.error("Error accessing rectangle: ", e)

    #  Text
    text: str = node.window_text()
    if text == attribute_dict["name"]:
        text = ""

    # friendly_class_name
    try:
        attribute_dict["friendly_class_name"] = node.friendly_class_name().lower()
    except:
        pass

    # xml_node = lxml.etree.Element(
    #     "node",
    #     attrib=attribute_dict,
    #     nsmap=_accessibility_ns_map_windows,
    # )

    # if text is not None and len(text) > 0 and text != attribute_dict["name"]:
    #     xml_node.text = text
    # attribute_dict["{{{:}}}text".format(_accessibility_ns_map_windows["txt"])] = text
    attribute_dict["text"] = text

    if depth == MAX_DEPTH:
        logger.warning("Max depth reached")
        # return xml_node
        return attribute_dict

    # use multi thread to accelerate children fetching
    if in_screen:
        children = node.children()
        if children:
            # attribute_dict["children"]=[]
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future_to_child = [
                    executor.submit(_create_pywinauto_node, ch, nodes, depth + 1, flag)
                    for ch in children[:MAX_WIDTH]
                ]
            try:
                # xml_node.extend(
                #     [
                #         future.result()
                #         for future in concurrent.futures.as_completed(future_to_child)
                #     ]
                # )
                attribute_dict["children"] = [
                    future.result()
                    for future in concurrent.futures.as_completed(future_to_child)
                ]

            except Exception as e:
                logger.error(f"Exception occurred: {e}")
    # return xml_node
    return attribute_dict


# A11y tree getter for macOS
def _create_axui_node(node, nodes: set = None, depth: int = 0, bbox: tuple = None):
    nodes = nodes or set()
    if node in nodes:
        return
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

    if depth == 0:
        bbox = (
            node["kCGWindowBounds"]["X"],
            node["kCGWindowBounds"]["Y"],
            node["kCGWindowBounds"]["X"] + node["kCGWindowBounds"]["Width"],
            node["kCGWindowBounds"]["Y"] + node["kCGWindowBounds"]["Height"],
        )
        app_ref = ApplicationServices.AXUIElementCreateApplication(
            node["kCGWindowOwnerPID"]
        )

        attribute_dict["name"] = node["kCGWindowOwnerName"]
        if attribute_dict["name"] != "Dock":
            error_code, app_wins_ref = (
                ApplicationServices.AXUIElementCopyAttributeValue(
                    app_ref, "AXWindows", None
                )
            )
            if error_code:
                logger.error(
                    "MacOS parsing %s encountered Error code: %d", app_ref, error_code
                )
        else:
            app_wins_ref = [app_ref]
        node = app_wins_ref[0]

    error_code, attr_names = ApplicationServices.AXUIElementCopyAttributeNames(
        node, None
    )

    if error_code:
        # -25202: AXError.invalidUIElement
        #         The accessibility object received in this event is invalid.
        logger.warning(f"encountered InvalidUIElement Error: {error_code}")
        return

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
                return

    role = None
    text = None

    for attr_name, ns_key in reserved_keys.items():
        if attr_name not in attr_names:
            continue

        if value and attr_name == "AXFrame":
            bb = value
            if not any(v is None for v in bb.values()):
                attribute_dict[
                    "{{{:}}}screencoord".format(_accessibility_ns_map_macos["cp"])
                ] = "({:d}, {:d})".format(int(bb["x"]), int(bb["y"]))
                attribute_dict[
                    "{{{:}}}size".format(_accessibility_ns_map_macos["cp"])
                ] = "({:d}, {:d})".format(int(bb["w"]), int(bb["h"]))
            continue

        error_code, attr_val = ApplicationServices.AXUIElementCopyAttributeValue(
            node, attr_name, None
        )

        full_attr_name = f"{{{_accessibility_ns_map_macos[ns_key]}}}{attr_name}"

        if attr_name == "AXValue" and not text:
            text = str(attr_val)
            continue

        if attr_name == "AXRoleDescription":
            role = attr_val
            continue

        # Set the attribute_dict
        if not (
            isinstance(attr_val, ApplicationServices.AXUIElementRef)
            or isinstance(attr_val, (AppKit.NSArray, list))
        ):
            if attr_val is not None:
                attribute_dict[full_attr_name] = str(attr_val)

    node_role_name = role.lower().replace(" ", "_") if role else "unknown_role"

    xml_node = lxml.etree.Element(
        node_role_name, attrib=attribute_dict, nsmap=_accessibility_ns_map_macos
    )

    if text is not None and len(text) > 0:
        xml_node.text = text

    if depth == MAX_DEPTH:
        logger.warning("Max depth reached")
        return xml_node

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
                    executor.submit(_create_axui_node, attr_val, nodes, depth + 1, bbox)
                )

            elif isinstance(attr_val, (AppKit.NSArray, list)):
                for child in attr_val:
                    future_to_child.append(
                        executor.submit(
                            _create_axui_node, child, nodes, depth + 1, bbox
                        )
                    )

        try:
            for future in concurrent.futures.as_completed(future_to_child):
                result = future.result()
                if result is not None:
                    xml_node.append(result)
        except Exception as e:
            logger.error(f"Exception occurred: {e}")

    return xml_node


# Abandoned
def get_accessibility_tree():
    os_name: str = system()

    if os_name == "Windows":

        def target():
            global result
            try:
                print("Connecting to active window...")
                app = pywinauto.application.Application(backend="uia").connect(
                    active_only=True
                )
                print("Successfully connected!")
                window = app.top_window()
                # Using global to return the result from the thread
                result = window.wrapper_object()
            except Exception as e:
                print(e)
                result = None

        thread = threading.Thread(target=target)
        thread.start()

        # use join() in threading to set the time limit(arg timeout in connect doesn't work)
        thread.join(timeout=60)
        if thread.is_alive():
            print("Operation timed out")
            top_windows = []
        else:
            top_windows = [result]

        for win in top_windows:
            print(f"Window: {win.window_text()} at {win.rectangle()}")
        # xml_node = lxml.etree.Element("desktop", nsmap=_accessibility_ns_map_windows)
        a11y_tree = {}
        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [
                executor.submit(_create_pywinauto_node, wnd, {}, 1)
                for wnd in top_windows
            ]
            for future in concurrent.futures.as_completed(futures):
                # xml_tree = future.result()
                json_tree = future.result()
                # xml_node.append(json_tree)
                a11y_tree = json_tree
        # return lxml.etree.tostring(xml_node, encoding="unicode")
        return a11y_tree

    elif os_name == "Darwin":
        xml_node = lxml.etree.Element("desktop", nsmap=_accessibility_ns_map_macos)

        with concurrent.futures.ThreadPoolExecutor() as executor:
            foreground_windows = [
                win
                for win in Quartz.CGWindowListCopyWindowInfo(
                    (
                        Quartz.kCGWindowListExcludeDesktopElements
                        | Quartz.kCGWindowListOptionOnScreenOnly
                    ),
                    Quartz.kCGNullWindowID,
                )
                if win["kCGWindowLayer"] == 0
                and win["kCGWindowOwnerName"] != "Window Server"
            ]
            dock_info = [
                win
                for win in Quartz.CGWindowListCopyWindowInfo(
                    Quartz.kCGWindowListOptionAll, Quartz.kCGNullWindowID
                )
                if win.get("kCGWindowName", None) == "Dock"
            ]

            futures = [
                executor.submit(_create_axui_node, wnd, None, 0)
                for wnd in foreground_windows[:2] + dock_info
            ]

            for future in concurrent.futures.as_completed(futures):
                xml_tree = future.result()
                if xml_tree is not None:
                    xml_node.append(xml_tree)

        return lxml.etree.tostring(xml_node, encoding="unicode")

    else:
        return "Currently not implemented for platform {:}.".format(system())


def main() -> None:
    """Test function for retrieving and inspecting the state of the active window.

    This function is primarily used for testing and debugging purposes.
    """
    import json
    import time
    from pynput import mouse

    data = []
    click_counter = [0]

    def on_click(x, y, button, pressed):
        if pressed:
            click_counter[0] += 1
            start_time = time.time()
            if click_counter[0] >= 2:
                time.sleep(0.5)
                print("start")
                tree_data = get_accessibility_tree()
                print(f"Processing tree took {time.time() - start_time} seconds.")
                data.append(tree_data)
            if click_counter[0] > 4:
                return False  # Stop listener

    mouse_listener = mouse.Listener(on_click=on_click)
    mouse_listener.start()
    mouse_listener.join()

    current_time = time.localtime()

    current_month = current_time.tm_mon
    current_day = current_time.tm_mday
    current_hour = current_time.tm_hour
    current_minute = current_time.tm_min

    with open(
        f"data_{current_month}{current_day}_{current_hour}{current_minute}.json",
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(data, f, indent=4, ensure_ascii=False)


if __name__ == "__main__":
    main()
