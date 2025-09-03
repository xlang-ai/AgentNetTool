"""import rumps
from PIL import Image, ImageDraw, ImageFont
import multiprocessing
import threading
import time
import queue  # Added import for queue.Empty


def create_icon(color, text=None):
    size = 22  # macOS 推荐的菜单栏图标大小
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.ellipse([0, 0, size, size], fill=color)

    if text:
        font_size = 10
        try:
            font = ImageFont.truetype(
                "/System/Library/Fonts/SFNSMono.ttf", font_size)
        except IOError:
            font = ImageFont.load_default()

        text_width = draw.textlength(text, font=font)
        text_position = ((size - text_width) / 2, (size - font_size) / 2)
        draw.text(text_position, text, font=font, fill=(255, 255, 255))

    return image


class AwesomeStatusBarApp(rumps.App):
    def __init__(self, message_queue):
        super().__init__("Agentnet")
        self.icon = None
        self.icon_path = "/tmp/icon.png"
        self.message_queue = message_queue
        self.set_green_icon()

    def set_green_icon(self):
        icon = create_icon((0, 255, 0, 255))
        icon.save(self.icon_path)
        self.update_icon()
        print("Set green icon")

    def set_red_icon_with_text(self):
        icon = create_icon((255, 0, 0, 255), "!")
        icon.save(self.icon_path)
        self.update_icon()
        print("Set red icon")

    def update_icon(self):
        self.icon = None  # Clear the current icon
        self.icon = self.icon_path  # Set the new icon
        print(f"Updated icon to: {self.icon_path}")

    @rumps.timer(0.1)  # Check every second
    def check_messages(self, _):
        try:
            message = self.message_queue.get_nowait()  # Non-blocking get
            print(f"Received message: {message}")
            if message == "set_red":
                self.set_red_icon_with_text()
            elif message == "set_green":
                self.set_green_icon()
        except queue.Empty:
            pass  # No message in queue


def run_status_bar(message_queue):
    app = AwesomeStatusBarApp(message_queue)
    app.run()

    while True:
        # 模拟后端逻辑
        print("Backend is running...")
        # 随机切换图标颜色
        if time.time() % 10 < 5:
            message_queue.put("set_red")

        else:
            message_queue.put("set_green")
        time.sleep(5)"""


# if __name__ == "__main__":
#     # 创建共享的 Queue
#     message_queue = multiprocessing.Queue()

#     # 创建两个进程
#     status_bar_process = multiprocessing.Process(
#         target=run_status_bar, args=(message_queue,))
#     backend_process = multiprocessing.Process(
#         target=run_backend, args=(message_queue,))

#     # 启动进程
#     status_bar_process.start()
#     backend_process.start()

#     # 等待进程结束
#     status_bar_process.join()
#     backend_process.join()
