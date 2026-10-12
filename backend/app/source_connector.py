"""Collect potential settlement leads from a public RSS feed.

A discovered article is never automatically published as a verified settlement.
"""
import hashlib
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

from app.discovery import DiscoveryCandidate, save_candidate

FEED_URL = "https://www.classaction.org/blog/rss"
ALLOWED_HOSTS = {"classaction.org", "www.classaction.org"}


def discover_from_feed(feed_url: str = FEED_URL) -> dict:
    parsed = urlparse(feed_url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("Unsupported feed URL")
    request = Request(feed_url, headers={"User-Agent": "SettlementAgentResearch/0.1"})
    with urlopen(request, timeout=15) as response:
        final_url = urlparse(response.geturl())
        if final_url.scheme != "https" or final_url.hostname not in ALLOWED_HOSTS:
            raise ValueError("Unexpected feed redirect")
        payload = response.read(2_000_001)
    if len(payload) > 2_000_000:
        raise ValueError("Feed is too large")
    root = ET.fromstring(payload)
    items = root.findall(".//item")
    added = 0
    for item in items[:100]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        link_parts = urlparse(link)
        if ("settlement" not in title.lower() or link_parts.scheme != "https"
                or link_parts.hostname not in ALLOWED_HOSTS):
            continue
        candidate = DiscoveryCandidate(
            id="rss-" + hashlib.sha256(link.encode("utf-8")).hexdigest()[:16],
            title=title[:250],
            source_url=link,
        )
        if save_candidate(candidate):
            added += 1
    return {"source": feed_url, "items_seen": len(items), "candidates_added": added}
