import math
import statistics

from numpy import mean

from .UIElementDescriber import UIElementDescriber

MAX_AREA = 1920 * 1020 / 2  # 最大面积
MIN_AREA = 1000       # 最小面积
POSITION_HIT_B = math.exp(math.log(MAX_AREA / MIN_AREA) / 1)


class DarwinElementDescriber(UIElementDescriber):
    def __init__(self, x, y):
        self.value = None
        self.role = None
        self.subrole = None
        self.role_description = None
        self.enabled = None
        self.orientation = None
        self.parent = None
        self.enabled = None
        self.index = None
        self.attrs = None
        self.similarity_cache = {}  # 添加一个用于存储比较结果的字典
        self.x = x
        self.y = y
        self.semantic_attrs = []
        self.similar_sibling_score_cache = None

    def to_dict(self):
        return {k: getattr(self, k) for k in self.semantic_attrs} if self.semantic_attrs != [] else {}

    def build_from_json(self, data, rule="bounding"):
        if (isinstance(data, str)):
            data = eval(data)
            if (not isinstance(data, dict)):
                return self
        if data.get("AXFocusableAncestor", data.get("AXHighestEditableAncestor", None)) != None:
            new_node = DarwinElementDescriber(self.x, self.y)
            new_json = data.get("AXFocusableAncestor", data.get(
                "AXHighestEditableAncestor", None))
            data.pop("AXFocusableAncestor", None)
            data.pop("AXHighestEditableAncestor", None)
            new_json["AXFrame"] = new_json.get(
                "AXFrame", data.get("AXFrame", None))
            if new_json.get("AXRows", None) != None:
                new_json["AXRows"].append(data)
            elif new_json.get("AXVisibleChildren", None) != None:
                new_json["AXVisibleChildren"].append(data)
            elif new_json.get("AXChildrenInNavigationOrder", None) != None:
                new_json["AXChildrenInNavigationOrder"].append(data)
            elif new_json.get("AXChildren", None) != None:
                new_json["AXChildren"].append(data)
            else:
                new_json["AXChildren"] = [data]
            new_node.build_from_json(new_json, rule)
            self.parent = new_node
            return self.parent
        super().build_from_json({
            "title": data.get("AXTitle", None),
            "description": data.get("AXDescription", None) or data.get("AXHelp", None),
            "rect": data.get("AXFrame", None)
        })
        self.value = data.get("AXValue", None)
        self.role = data.get("AXRole", None)
        self.subrule = data.get("AXSubrole", None)
        self.role_description = data.get("AXRoleDescription", None)
        self.enabled = data.get("AXEnabled", None)
        self.orientation = data.get("AXOrientation", None)
        self.enabled = data.get("AXEnabled", None)
        self.attrs = [attr for attr in vars(
            self) if getattr(self, attr) != None]
        self.semantic_attrs = [attr for attr in self.attrs if attr in [
            "value", "title", "description", "role", "subrole", "role_description", "orientation"
        ] and isinstance(getattr(self, attr), str) and "ax" not in getattr(self, attr).lower()]
        if "AXChildrenInNavigationOrder" in data:
            self.build_children(children_json=data.get(
                "AXChildrenInNavigationOrder"), rule=rule)
        if "AXVisibleChildren" in data:
            self.build_children(children_json=data.get(
                "AXVisibleChildren"), rule=rule)
        if "AXRows" in data:
            self.build_children(children_json=data.get(
                "AXRows"), rule=rule)
        if "AXChildren" in data:
            self.build_children(children_json=data.get(
                "AXChildren"), rule=rule)
        if "AXColumns" in data:
            self.build_children(children_json=data.get(
                "AXColumns"), rule=rule)
        # if "AXChildrenInNavigationOrder" in data or "AXVisibleChildren" in data or "AXRows" in data or "AXChildren" in data:
        #     self.build_children(children_json=data.get("AXChildren", data.get(
        #         "AXChildrenInNavigationOrder", data.get("AXVisibleChildren", data.get("AXRows", [])))), rule="bounding")
        return self.parent if self.parent != None else self

    def get_nearest_ancestor_rect(self):
        if self.rect != None:
            return self.rect
        elif self.parent != None:
            return self.parent.get_nearest_ancestor_rect()

    def build_children(self, children_json, rule="bounding"):
        all_children = []
        for index, child_json in enumerate(children_json):
            match rule:
                case "bounding":
                    # boundingG规则：判断child的frame是否完全包含在self.rect中
                    if isinstance(child_json, str):
                        continue
                    if child_json.get("AXFrame", None) == None:
                        if child_json.get("AXChildrenInNavigationOrder", None) != None or child_json.get("AXVisibleChildren", None) != None or child_json.get("AXChildren", None) != None:
                            tmp = DarwinElementDescriber(self.x, self.y)
                            tmp.parent = self
                            tmp.index = index
                            tmp.build_from_json(child_json, rule=rule)
                            if tmp.children != []:
                                all_children.append(tmp)
                    else:
                        child_frame = child_json.get("AXFrame", None)
                        if isinstance(child_frame, str):
                            child_frame = eval(child_frame)
                        nearesr_ancestor_rect = self.get_nearest_ancestor_rect()
                        if child_frame.get("x", None) == None:
                            child_frame.update(
                                {"x": nearesr_ancestor_rect["x"] if nearesr_ancestor_rect["x"] != None else 0.0})
                        if child_frame.get("y", None) == None:
                            child_frame.update(
                                {"y": nearesr_ancestor_rect["y"] if nearesr_ancestor_rect["y"] != None else 0.0})
                        if nearesr_ancestor_rect is None or (
                            child_frame.get("x", 0) >= nearesr_ancestor_rect.get("x", 0) and
                            child_frame.get("y", 0) >= nearesr_ancestor_rect.get("y", 0) and
                            child_frame.get("x", 0) + child_frame.get("w", 0) <= nearesr_ancestor_rect.get("x", 0) + nearesr_ancestor_rect.get("w", 0) and
                            child_frame.get("y", 0) + child_frame.get("h", 0) <= nearesr_ancestor_rect.get("y", 0) + nearesr_ancestor_rect.get("h", 0) and
                            child_frame.get(
                                "w", 0) > 0 and child_frame.get("h", 0) > 0
                        ):
                            tmp = DarwinElementDescriber(self.x, self.y)
                            tmp.parent = self
                            tmp.index = index
                            tmp.build_from_json(child_json, rule=rule)
                            all_children.append(tmp)
                case "general":
                    # 通用规则：直接构建子节点
                    tmp = DarwinElementDescriber(self.x, self.y)

                    tmp.parent = self
                    tmp.index = index
                    tmp.build_from_json(child_json, rule=rule)
                    # if tmp.title != "":
                    #     print(tmp.title)
                    if tmp.title == "Color Colorful":
                        print("====================================")
                        print(tmp.title)
                        print(tmp.rect)
                    all_children.append(tmp)
                case _:
                    print("Invalid rule")
                    break

        self.children = all_children

    def print_element(self, indent=0):
        indent_space = ' ' * (indent * 2)
        with open("log.txt", "a") as f:
            if self.get_nearest_ancestor_rect() == None:
                f.write(
                    f"{indent_space}Title: {self.title}, Role: {self.role}, Description: {self.description}, Value: {self.value} Overall: {self.score}\n")
            else:
                f.write(
                    f"{indent_space}Title: {self.title}, Role: {self.role}, Description: {self.description}, Value: {self.value}, x: {self.get_nearest_ancestor_rect()['x']}, y: {self.get_nearest_ancestor_rect()['y']}, w: {self.get_nearest_ancestor_rect()['w']}, h: {self.get_nearest_ancestor_rect()['h']}, Overall: {self.score}\n")
            for child in self.children:
                child.print_element(indent + 1)

    def print_target(self):
        if self.get_nearest_ancestor_rect() == None:
            print(
                f"Title: {self.title}, Role: {self.role}, Description: {self.description} Overall: {self.score}")
        else:
            print(
                f"Title: {self.title}, Role: {self.role}, Description: {self.description}, x: {self.get_nearest_ancestor_rect()['x']}, y: {self.get_nearest_ancestor_rect()['y']}, w: {self.get_nearest_ancestor_rect()['w']}, h: {self.get_nearest_ancestor_rect()['h']}, Overall: {self.score}")

    def calculate_score(self):
        self.vote_by_heuristic_rules(
            [(self.similar_sibling_score, 1), (self.position_hit, 1), (self.has_semantic_info, 2)])
        for child in self.children:
            child.calculate_score()

    def has_semantic_info(self):
        return (self.title != None) + (self.description != None) + (self.role != None) + (self.role_description != None) + (self.subrole != None) + (self.value != None)

    def is_similar_to(self, other):

        def similar_text(a, b, threshold=0.2):
            # 使用更精确的字符串相似度算法，例如Levenshtein距离
            if not a or not b:
                return a == b
            return (len(a) - len(set(a) ^ set(b))) / len(a) >= threshold

        def similar_rect(rect1, rect2, size_tolerance=0.1):
            # 比较两个矩形是否相似，根据尺寸的容忍度
            if not rect1 or not rect2:
                return 0  # 如果其中一个矩形缺失，则相似度为0

            # 计算宽度和高度的相似度
            w_distance = abs(rect1['w'] - rect2['w']) / \
                max(rect1['w'], rect2['w'], 1)
            h_distance = abs(rect1['h'] - rect2['h']) / \
                max(rect1['h'], rect2['h'], 1)

            # 将差距转换为相似度分数
            w_similarity = max(0, 1 - w_distance / size_tolerance)
            h_similarity = max(0, 1 - h_distance / size_tolerance)

            # 返回宽度和高度相似度的平均值
            return (w_similarity + h_similarity) / 2

        def similar_composition(self, other):
            if not self.attrs or not other.attrs:  # TODO: fix this
                return 0
            common_attrs = len(set(self.attrs) & set(other.attrs))
            total_attrs = len(set(self.attrs) | set(other.attrs))
            return common_attrs / total_attrs

        if (id(self), id(other)) in self.similarity_cache:
            return self.similarity_cache[(id(self), id(other))] >= 0.75

        # valid_common_attributes = set([attr for attr in vars(
        #     self) if isinstance(getattr(self, attr), str) and getattr(self, attr) != None]) & set([attr for attr in vars(other) if isinstance(getattr(other, attr), str) and getattr(other, attr) != None])
        # if valid_common_attributes == set():
        #     return False
        # attributes_result = [similar_text(getattr(self, attr), getattr(other, attr))
        #                      for attr in valid_common_attributes]
        # similarity_score = sum(1 for x in attributes_result if x)
        # total_attributes = len(attributes_result)

        # text_similarity_percentage = similarity_score / total_attributes
        composition_similarity_percentage = similar_composition(self, other)
        rect_similarity_percentage = similar_rect(self.rect, other.rect)
        # if self.value == "Play feedback when volume is changed":
        #     print("====================================")
        #     print("Composition similarity: ",
        #           composition_similarity_percentage)
        #     print("Rect similarity: ", rect_similarity_percentage)
        similarity_percentage = mean(
            [composition_similarity_percentage, rect_similarity_percentage])

        # 缓存结果
        self.similarity_cache[(id(self), id(other))] = similarity_percentage
        self.similarity_cache[(id(other), id(self))] = similarity_percentage
        return similarity_percentage >= 0.75

    def similar_sibling_score(self):
        if self.similar_sibling_score_cache:
            return self.similar_sibling_score_cache
        if self.parent is None:
            return False  # 如果没有父节点，则没有兄弟节点

        if self.parent.children == []:
            return False
        siblings = self.parent.children
        length = len(siblings)
        count = 0
        for sibling in siblings:
            if sibling is not self and self.is_similar_to(sibling):
                count += 1
        final_score = min(count / length, 1.0)*10
        if self.children == [] and len(self.parent.children) > 5:
            # 结构太单薄而相似，惩罚20%
            final_score *= 0.75
        if self.parent.similar_sibling_score_cache and self.parent.similar_sibling_score_cache > 2:
            # 父节点的相似度分数较高，子组件也要继承其80%的分数
            final_score += self.parent.similar_sibling_score_cache * 0.75
        self.similar_sibling_score_cache = final_score
        return final_score

    def layout_type(self):
        if len(self.children) < 2:
            return "unknown"

        # 提取子节点的坐标和尺寸
        x_coords = [child.rect['x'] for child in self.children if child.rect]
        y_coords = [child.rect['y'] for child in self.children if child.rect]
        widths = [child.rect['w'] for child in self.children if child.rect]
        heights = [child.rect['h'] for child in self.children if child.rect]

        # 计算 x 和 y 坐标的标准差
        try:
            std_x = statistics.stdev(x_coords)
            std_y = statistics.stdev(y_coords)
        except:
            return "unknown"

        # 设置容差值，例如屏幕坐标的5%
        tolerance = 0.05 * max(widths + heights)

        # 确定坐标相似度较高的方向
        if std_y < std_x:  # y 坐标更一致，可能是横向布局
            # 检查 x 坐标是否大致递增
            if all(x_coords[i] + widths[i] <= x_coords[i + 1] + tolerance for i in range(len(x_coords) - 1)):
                return "horizontal"
        elif std_x < std_y:  # x 坐标更一致，可能是竖向布局
            # 检查 y 坐标是否大致递增
            if all(y_coords[i] + heights[i] <= y_coords[i + 1] + tolerance for i in range(len(y_coords) - 1)):
                return "vertical"

        return "unknown"

    def position_hit(self):
        if not self.rect:
            return 0  # 如果没有矩形信息，返回0分

        rect_x, rect_y, rect_w, rect_h = self.rect['x'], self.rect['y'], self.rect['w'], self.rect['h']
        area = rect_w * rect_h
        score = 0
        # 判断点击位置是否在元素内部
        if rect_x <= self.x <= rect_x + rect_w and rect_y <= self.y <= rect_y + rect_h:
            if area < MIN_AREA:  # 面积小于最小面积，直接得满分
                score = 10
            else:
                # 计算对数分数
                score = 10 * math.log(MAX_AREA / area, POSITION_HIT_B)
        else:
            # 如果命中父节点
            if self.parent and self.parent.position_hit() != 0:
                tmp_layout_type = self.parent.layout_type()
                if tmp_layout_type == "horizontal":
                    # 如果是水平布局，则只要命中x坐标即可
                    if rect_x <= self.x <= rect_x + rect_w:
                        if area < MIN_AREA:
                            score = 10
                        else:
                            score = 10 * \
                                math.log(MAX_AREA / area, POSITION_HIT_B)
                elif tmp_layout_type == "vertical":
                    # 如果是垂直布局，则只要命中y坐标即可
                    if rect_y <= self.y <= rect_y + rect_h:
                        if area < MIN_AREA:
                            score = 10
                        else:
                            score = 10 * \
                                math.log(MAX_AREA / area, POSITION_HIT_B)
            else:
                score = 0

        return min(max(score, 0), 10)  # 确保分数在0到10分之间


if __name__ == "__main__":
    import json
    with open("agentnet-annotator/api/core/a11y/Element/test.json", "r") as f:
        data = json.load(f)
        root = DarwinElementDescriber(159, 496)
        root.build_from_json(data, rule="general")
        root.calculate_score()
        root.print_element()
        node = root.find_most_score_node()
        print("====================================")
        node.print_element()
