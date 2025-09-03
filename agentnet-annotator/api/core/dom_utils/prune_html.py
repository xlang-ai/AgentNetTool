import json
import re

from bs4 import BeautifulSoup
from typing import Dict, List, Any


def convert_webpage_to_json_elements(
    dom: str
) -> List[Dict[str, str]]:
    """Converts the current webpage into a JSON list of dicts, where each dict is a visible/relevant HTML element and their attributes."""
    # Get current state as JSON blob
    json_state: Dict[str, str] = json.loads(dom)

    # Drop xpath
    for element in json_state:
        del element["xpath"]
        for key in ["role", "text", "type", "label"]:
            if key in element and element[key] is None:
                del element[key]

    # Add chrome omnibox to state (for navigation)
    chrome_omnibox: Dict[str, Any] = {
        "tag": "chrome_omnibox",
        "role": "Address bar / Search box",
        "text": "",
        "type": "input",
        "label": "Chrome Omnibox - This is an address bar that can be used to search a query on Google or navigate to a URL",
    }
    json_state.append(chrome_omnibox)

    return json_state


def prune_html(html):
    html = re.sub(r"\n", " ", html)
    # remove html comments
    html = re.sub(r"<!--(.*?)-->", "", html, flags=re.MULTILINE)

    soup = BeautifulSoup(html, "lxml")
    for tag in reversed(soup.find_all()):
        # remove body and html tags (not their content)
        if tag.name in ("html", "body"):
            tag.unwrap()
        # remove useless tags
        elif tag.name in ("style", "link", "script", "br"):
            tag.decompose()
        # remove / unwrap structural tags
        elif tag.name in ("div", "span", "i", "p") and len(tag.attrs) == 1 and tag.has_attr("bid"):
            if not tag.contents:
                tag.decompose()
            else:
                tag.unwrap()

    html = soup.prettify()

    return html
