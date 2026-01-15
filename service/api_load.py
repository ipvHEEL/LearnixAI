 #service/api_load.py
import requests
import xml.etree.ElementTree as ET
import re

def _text_or_empty(elem):
    return elem.text.strip() if elem is not None and elem.text else ""

def _clean_html(text):
    return re.sub(r'<[^>]+>', '', text)

def load():
    url = "https://habr.com/ru/rss/articles/?fl=tech"
    response = requests.get(url)

    if response.status_code == 200:
        return response.text
    else:
        return None


def Parsing(data):

    root = ET.fromstring(data)
    articles = []

    for item in root.findall('.//item'):
        title_elem = item.find('title')
        link_elem = item.find('link')
        desc_elem = item.find('description')
        pubdate_elem = item.find('pubDate')


        title = _text_or_empty(title_elem)
        link = _text_or_empty(link_elem).strip()
        description = _clean_html(_text_or_empty(desc_elem))
        published_at = _text_or_empty(pubdate_elem)

        articles.append({
            "title": title,
            "description": description[:300] + "..." if len(description) > 300 else description,
            "url": link,
            "publishedAt": published_at
        })

    return {"articles": articles}




