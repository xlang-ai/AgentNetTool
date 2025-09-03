import re
import math
import statistics

from numpy import mean

from .UIElementDescriber import UIElementDescriber

MAX_AREA = 1920 * 1020 / 2  # 最大面积
MIN_AREA = 1000  # 最小面积
POSITION_HIT_B = math.exp(math.log(MAX_AREA / MIN_AREA) / 1)


class WindowsElementDescriber(UIElementDescriber):
    def __init__(self, x, y):
        self.control_type = None
        self.depth = None
        self.similarity_cache = {}  # 添加一个用于存储比较结果的字典
        self.x = x
        self.y = y

    def to_dict(self):
        return {
            k: getattr(self, k) for k in self.attrs if k == "title" or k == "control_type"
        }

    def build_from_json(self, data):
        super().build_from_json(
            {
                "title": data.get("Name", None),
                "rect": data.get("BoundingRectangle", None),
            }
        )
        self.control_type = data.get("ControlType", None)
        self.depth = data.get("Depth", None)
        self.attrs = [attr for attr in vars(self) if getattr(self, attr) != None]
        if "Children" in data:
            self.build_children(children_json=data.get("Children"), rule="bounding")
        return self

    def get_nearest_ancestor_rect(self):
        if self.rect != None:
            return self.rect

    def build_children(self, children_json, rule="bounding"):
        all_children = []
        for index, child_json in enumerate(children_json):
            if isinstance(child_json, str):
                continue
            if "children" in child_json:
                tmp = WindowsElementDescriber(self.x, self.y)
                tmp.parent = self
                tmp.index = index
                tmp.build_from_json(child_json)
                if tmp.children:
                    all_children.append(tmp)
            else:
                tmp = WindowsElementDescriber(self.x, self.y)
                tmp.parent = self
                tmp.index = index
                tmp.build_from_json(child_json)
                all_children.append(tmp)

        self.children = all_children

    def print_element(self, indent=0):
        indent_space = " " * (indent * 2)
        rect = self.get_nearest_ancestor_rect()
        print(
            f"{indent_space}Title: {self.title}, x: {rect['left']}, y: {rect['top']}, w: {rect['right'] - rect['left']}, h: {rect['bottom'] - rect['top']}".encode(
                "utf-8", errors="replace"
            ).decode(
                "utf-8"
            )
        )
        for child in self.children:
            child.print_element(indent + 1)

    def calculate_score(self):
        self.vote_by_heuristic_rules(
            [(self.semantic_info_score, 1), (self.position_hit, 1)]
        )
        if self.depth <= 5:
            print(self.title, self.score)
        for child in self.children:
            child.calculate_score()

    def semantic_info_score(self):
        if (
            self.title == None
            or re.compile(r"[\u4e00-\u9fffA-Za-z0-9]").search(self.title) == None
        ):
            return -10
        else:
            return (
                1 if (len(self.title) < 40) else (1 - ((len(self.title) - 40) / 60))
            )  # penalty on long titles

    def position_hit(self):
        if not self.rect:
            return -10

        rect_x, rect_y, rect_w, rect_h = (
            self.rect["left"],
            self.rect["top"],
            (self.rect["right"] - self.rect["left"]),
            (self.rect["bottom"] - self.rect["top"]),
        )
        area = rect_w * rect_h
        score = 0
        if rect_x <= self.x <= rect_x + rect_w and rect_y <= self.y <= rect_y + rect_h:
            if area < MIN_AREA:
                score = 1
            else:
                score = 1 * math.log(MAX_AREA / area, POSITION_HIT_B)
        else:
            score = -10

        return min(max(score, -10), 1)

    def layout_type(self):
        if len(self.children) < 2:
            return "unknown"

        x_coords = [child.rect["left"] for child in self.children if child.rect]
        y_coords = [child.rect["top"] for child in self.children if child.rect]
        widths = [
            (child.rect["right"] - child.rect["left"])
            for child in self.children
            if child.rect
        ]
        heights = [
            (child.rect["bottom"] - child.rect["top"])
            for child in self.children
            if child.rect
        ]

        try:
            std_x = statistics.stdev(x_coords)
            std_y = statistics.stdev(y_coords)
        except:
            return "unknown"

        tolerance = 0.05 * max(widths + heights)

        if std_y < std_x:
            if all(
                x_coords[i] + widths[i] <= x_coords[i + 1] + tolerance
                for i in range(len(x_coords) - 1)
            ):
                return "horizontal"
        elif std_x < std_y:
            if all(
                y_coords[i] + heights[i] <= y_coords[i + 1] + tolerance
                for i in range(len(y_coords) - 1)
            ):
                return "vertical"

        return "unknown"
