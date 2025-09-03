from typing import Any

import sys

if sys.platform == "darwin":
    from . import _darwin as impl
elif sys.platform == "linux":
    impl = None
elif sys.platform == "win32":
    from . import _windows as impl
else:
    raise Exception(f"Unsupported platform: {sys.platform}")


def get_accessibility_tree():
    return impl.get_accessibility_tree()

def get_active_window_data(
    include_window_data: bool = True,
) -> dict[str, Any] | None:
    """Get data of the active window.

    Args:
        include_window_data (bool): whether to include a11y data.

    Returns:
        dict or None: A dictionary containing information about the active window,
            or None if the state is not available.
    """
    state = get_active_window_state(include_window_data)
    if sys.platform == "darwin":
        if not state:
            return None
        title = state["title"]
        left = state["left"]
        top = state["top"]
        width = state["width"]
        height = state["height"]
        window_id = state["window_id"]
        window_data = {
            "title": title,
            "left": left,
            "top": top,
            "width": width,
            "height": height,
            "window_id": window_id,
            "state": state,
        }
        # print(f"get_active_window_data of {state["title"]} took {time.time() - start_time}")
        return window_data
    elif sys.platform in ("win32", "linux"):
        return state


def get_active_window_state(read_window_data: bool) -> dict | None:
    """Get the state of the active window.

    Returns:
        dict or None: A dictionary containing the state of the active window,
          or None if the state is not available.
    """
    try:
        return impl.get_active_window_state(read_window_data)
    except Exception as exc:
        print(f"Error getting active window state: {exc}")
        return None


def get_active_element_data(x: int, y: int) -> dict:
    return impl.get_active_element_state(x, y)


def parse_element(element: dict, x: float, y: float):
    return impl.parse_element(element, x, y)


def get_top_window():
    return impl.get_top_window()


def get_top_window_name():
    return impl.get_top_window_name()
