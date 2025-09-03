import abc
from abc import abstractmethod


class UIElementDescriber(abc.ABC):
    title = ""
    description = ""
    rect = None
    size = None
    children = []
    score = 0

    def __init__(self):
        self.title = ""
        self.description = ""
        self.rect = None
        self.size = None
        self.children = []
        self.score = 0
        self.heuristic_rules = []
        self.heuristic_rules_weights = []

    @abstractmethod
    def build_from_json(self, json):
        self.title = json.get("title", None)
        self.description = json.get("description", None)
        self.rect = json.get("rect", None)
        if (isinstance(self.rect, str)):
            self.rect = eval(self.rect)
        if self.rect and "left" in self.rect:  # Windows
            self.rect['x'] = self.rect['left']
            self.rect['y'] = self.rect['top']
            self.rect['w'] = (self.rect['right'] - self.rect['left'])
            self.rect['h'] = (self.rect['bottom'] - self.rect['top'])
        self.size = self.rect['w'] * self.rect['h'] if self.rect else 0

    @abstractmethod
    def build_children(self, children):
        pass

    @abstractmethod
    def print_element(self, indent=0):
        pass

    def vote_by_heuristic_rules(self, heuristic_rules):
        for (rule, weight) in heuristic_rules:
            self.score += rule() * weight
        return self.score

    def update_heuristic_weights(self, weights):
        self.heuristic_rules_weights = weights

    def find_most_score_node(self):
        if len(self.children) == 0:
            return self  # 如果没有子节点，返回当前节点

        max_node = self  # 初始化最高分数节点为当前节点
        max_score = self.score  # 假设当前节点有一个'score'属性

        for child in self.children:
            # 递归地查找每个子节点的子树中分数最高的节点
            candidate_node = child.find_most_score_node()
            if candidate_node.score > max_score:
                max_score = candidate_node.score
                max_node = candidate_node

        return max_node
