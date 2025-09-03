import pytesseract
from PIL import Image
import re
import json
from difflib import SequenceMatcher


def clean_text(text_list):
    """清理文本列表，去除无用的字符和重复项"""
    filtered_text = []
    for line in text_list:
        if re.search(r'[a-zA-Z]', line) or re.search(r'[0-9]', line):
            line = re.sub(r'[^\w\s]', '', line)
            line = ' '.join(line.split())
            if line:
                filtered_text.append(line)
    filtered_text = list(set(filtered_text))
    filtered_text.sort()
    return filtered_text


def extract_text_from_image(image_path):
    """从图像中提取文本并进行清理"""
    img = Image.open(image_path)
    # 使用'chi_sim+eng'指定中英文识别
    text = pytesseract.image_to_string(img, lang='chi_sim+eng').split('\n')
    return clean_text(text)


def extract_text_from_json(json_data):
    """从JSON数据中提取重要文本字段"""
    def extract_from_dict(d):
        text_list = []
        if isinstance(d, dict):
            for key, value in d.items():
                if key in ['AXTitle', 'AXDescription', 'AXValue']:
                    if isinstance(value, (str, int)):
                        text_list.append(str(value))
                if isinstance(value, dict):
                    text_list.extend(extract_from_dict(value))
                elif isinstance(value, list):
                    for item in value:
                        text_list.extend(extract_from_dict(item))
        elif isinstance(d, list):
            for item in d:
                text_list.extend(extract_from_dict(item))
        return text_list

    json_texts = extract_from_dict(json_data)
    return clean_text(json_texts)


def compute_similarity(text1, text2):
    """计算两个文本字符串之间的相似度"""
    return SequenceMatcher(None, text1, text2).ratio()


print(pytesseract.get_languages(config=''))

# Load JSON data
json_data = {
    "AXColumns": [
        {
            "AXColumns": [],
            "AXEnabled": "True",
            "AXFocused": "False",
            "AXFrame": "{'x': 36.0, 'y': 53.0, 'w': 14.0, 'h': 16.0, 'type': 'kAXValueCGRectType'}",
            "AXRole": "AXButton",
            "AXRoleDescription": "minimize button",
            "AXSubrole": "AXMinimizeButton"
        },
        {
            "AXColumns": [],
            "AXEnabled": "True",
            "AXFocused": "False",
            "AXFrame": "{'x': 16.0, 'y': 53.0, 'w': 14.0, 'h': 16.0, 'type': 'kAXValueCGRectType'}",
            "AXRole": "AXButton",
            "AXRoleDescription": "close button",
            "AXSubrole": "AXCloseButton"
        },
        {
            "AXColumns": [
                {
                    "AXColumns": [
                        {
                            "AXColumns": [],
                            "AXFocused": "False",
                            "AXFrame": "{'x': 56.0, 'y': 53.0, 'w': 14.0, 'h': 16.0, 'type': 'kAXValueCGRectType'}",
                            "AXRole": "AXGroup",
                            "AXRoleDescription": "group"
                        }
                    ],
                    "AXFocused": "False",
                    "AXFrame": "{'x': 56.0, 'y': 53.0, 'w': 14.0, 'h': 16.0, 'type': 'kAXValueCGRectType'}",
                    "AXRole": "AXGroup",
                    "AXRoleDescription": "group"
                }
            ],
            "AXEnabled": "True",
            "AXFocused": "False",
            "AXFrame": "{'x': 56.0, 'y': 53.0, 'w': 14.0, 'h': 16.0, 'type': 'kAXValueCGRectType'}",
            "AXHelp": "this button also has an action to zoom the window",
            "AXRole": "AXButton",
            "AXRoleDescription": "full screen button",
            "AXSubrole": "AXFullScreenButton"
        },
        {
            "AXColumns": [
                {
                    "AXColumns": [
                        {
                            "AXColumns": [
                                {
                                    "AXColumns": [
                                        {
                                            "AXColumns": [],
                                            "AXDOMIdentifier": "",
                                            "AXDescription": "",
                                            "AXEnabled": "True",
                                            "AXFocused": "False",
                                            "AXFrame": "{'x': 2.0, 'y': 39.0, 'w': 1466.0, 'h': 915.0, 'type': 'kAXValueCGRectType'}",
                                            "AXRole": "AXGroup",
                                            "AXRoleDescription": "group",
                                            "AXSelected": "False",
                                            "AXTitle": "",
                                            "AXValue": ""
                                        }
                                    ],
                                    "AXDOMIdentifier": "",
                                    "AXDescription": "",
                                    "AXEnabled": "True",
                                    "AXFocused": "False",
                                    "AXFrame": "{'x': 2.0, 'y': 39.0, 'w': 1466.0, 'h': 915.0, 'type': 'kAXValueCGRectType'}",
                                    "AXRole": "AXGroup",
                                    "AXRoleDescription": "group",
                                    "AXSelected": "False",
                                    "AXTitle": "",
                                    "AXValue": ""
                                }
                            ],
                            "AXDOMIdentifier": "",
                            "AXDescription": "",
                            "AXEnabled": "True",
                            "AXFocused": "False",
                            "AXFrame": "{'x': 2.0, 'y': 39.0, 'w': 1466.0, 'h': 915.0, 'type': 'kAXValueCGRectType'}",
                            "AXRole": "AXGroup",
                            "AXRoleDescription": "group",
                            "AXSelected": "False",
                            "AXTitle": "",
                            "AXValue": ""
                        }
                    ],
                    "AXDOMIdentifier": "",
                    "AXDescription": "",
                    "AXEnabled": "True",
                    "AXFocused": "False",
                    "AXFrame": "{'x': 2.0, 'y': 39.0, 'w': 1466.0, 'h': 915.0, 'type': 'kAXValueCGRectType'}",
                    "AXRole": "AXGroup",
                    "AXRoleDescription": "group",
                    "AXSelected": "False",
                    "AXTitle": "",
                    "AXValue": ""
                }
            ],
            "AXDOMIdentifier": "",
            "AXDescription": "",
            "AXEnabled": "True",
            "AXFocused": "False",
            "AXFrame": "{'x': 2.0, 'y': 39.0, 'w': 1466.0, 'h': 915.0, 'type': 'kAXValueCGRectType'}",
            "AXRole": "AXGroup",
            "AXRoleDescription": "group",
            "AXSelected": "False",
            "AXTitle": "",
            "AXValue": ""
        }
    ],
    "AXFocused": "False",
    "AXFrame": "{'x': 2.0, 'y': 39.0, 'w': 1466.0, 'h': 915.0, 'type': 'kAXValueCGRectType'}",
    "AXFullScreen": "False",
    "AXRole": "AXWindow",
    "AXRoleDescription": "standard window",
    "AXSubrole": "AXStandardWindow",
    "AXTitle": "Docs | Recently edited"
}

# Extract text from image and JSON
# image_text_list = extract_text_from_image('iShot_2024-09-06_00.00.49.png')
# print(image_text_list)
# image_text_str = ' '.join(image_text_list)
json_text_list = extract_text_from_json(json_data)
print(json_text_list)
json_text_str = ' '.join(json_text_list)

# # Compute similarity
# similarity = compute_similarity(image_text_str, json_text_str)

# # Print result
# print(f'Similarity: {similarity:.2f}')

# # Determine confidence
# threshold = 0.5  # You can adjust this threshold based on your needs
# if similarity > threshold:
#     print('The accessibility tree data is likely accurate.')
# else:
#     print('The accessibility tree data might be inaccurate.')
