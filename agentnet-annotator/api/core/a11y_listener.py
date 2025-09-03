import time

from pynput import mouse
from queue import Queue
from threading import Thread

from .a11y import get_active_element_data, get_top_window_name
from .logger import logger


class A11yListener:
    def __init__(self, generate_window_a11y, generate_element_a11y):

        self._element_queue = Queue()
        self._element_queue.queue.clear()
        self.gen_element = generate_element_a11y
        self.running = False

        self.mouse_listener = mouse.Listener(on_click=self.on_click)
        self._top_window_queue = Queue()
        self.app_list = []

        self.top_window_getter = Thread(target=self._get_top_window)

    def on_click(self, x, y, button, pressed):
        if pressed:
            self.scrolling = False
            timestamp = time.perf_counter()
            if self.gen_element:
                Thread(
                    target=self._enqueue_element_data, args=(timestamp, x, y)
                ).start()

    def _enqueue_element_data(self, timestamp, x, y):
        self._element_queue.put(
            {"time_stamp": timestamp, "a11y_tree": get_active_element_data(x, y)},
            block=False,
        )

    def _get_top_window(self):
        last_window_name = None

        while self.running:
            try:
                top_window_name = get_top_window_name()
                if top_window_name != last_window_name and top_window_name is not None:
                    self._top_window_queue.put(
                        {
                            "time_stamp": time.perf_counter(),
                            "top_window_name": top_window_name,
                        }
                    )
                last_window_name = top_window_name
                time.sleep(0.2)

            except Exception as e:
                logger.exception("a11y_listener _get_top_window error.")

    def start(self):
        self.running = True
        self.mouse_listener.start()
        self.top_window_getter.start()

    def stop(self):
        self.running = False
        self.mouse_listener.stop()
        self.top_window_getter.join()

    @property
    def element_queue(self):
        return self._element_queue

    @property
    def top_window_queue(self):
        return self._top_window_queue
