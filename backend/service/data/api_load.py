# service/data/api_load.py
import requests
import xml.etree.ElementTree as ET
import re
from typing import List, Dict

RSS_SOURCES = [
    "https://habr.com/ru/rss/all/",
    "https://habr.com/ru/rss/articles/?fl=tech",
    "https://habr.com/ru/rss/news/",

    "https://habr.com/ru/rss/hubs/programming/",
    "https://habr.com/ru/rss/hubs/algorithms/",
    "https://habr.com/ru/rss/hubs/code_review/",

    "https://habr.com/ru/rss/hubs/cpp/",
    "https://habr.com/ru/rss/hubs/c/",
    "https://habr.com/ru/rss/hubs/python/",
    "https://habr.com/ru/rss/hubs/java/",
    "https://habr.com/ru/rss/hubs/javascript/",
    "https://habr.com/ru/rss/hubs/csharp/",
    "https://habr.com/ru/rss/hubs/go/",
    "https://habr.com/ru/rss/hubs/rust/",

    "https://habr.com/ru/rss/hubs/data_science/",
    "https://habr.com/ru/rss/hubs/machine_learning/",
    "https://habr.com/ru/rss/hubs/deep_learning/",
    "https://habr.com/ru/rss/hubs/artificial_intelligence/",

    "https://habr.com/ru/rss/hubs/quant/",
    "https://habr.com/ru/rss/hubs/fintech/",

    "https://habr.com/ru/rss/hubs/devops/",
    "https://habr.com/ru/rss/hubs/docker/",
    "https://habr.com/ru/rss/hubs/kubernetes/",
    "https://habr.com/ru/rss/hubs/linux/",
]


def _text_or_empty(elem):
    return elem.text.strip() if elem is not None and elem.text else ""

def _clean_html(text):
    return re.sub(r"<[^>]+>", "", text)

def load_all_rss() -> List[str]:
    xml_list = []

    for url in RSS_SOURCES:
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                xml_list.append(resp.text)
        except Exception:
            pass

    return xml_list

def parse_articles(xml_texts: List[str]) -> List[Dict]:
    if not xml_texts:
        return []

    seen_urls = set()
    articles = []

    for xml_text in xml_texts:
        root = ET.fromstring(xml_text)

        for item in root.findall(".//item"):
            link = _text_or_empty(item.find("link"))
            if not link or link in seen_urls:
                continue

            seen_urls.add(link)

            title = _text_or_empty(item.find("title"))
            desc = _clean_html(_text_or_empty(item.find("description")))
            pub_date = _text_or_empty(item.find("pubDate"))

            articles.append({
                "title": title,
                "description": desc,
                "url": link,
                "publishedAt": pub_date,
                "full_text": f"{title}. {desc}"
            })

    return articles
