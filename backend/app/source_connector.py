"""Review-only settlement leads from ClassAction.org's open settlements listing.

The directory is a lead source. Deadlines and official URLs require human review.
"""
from datetime import date, datetime
from html.parser import HTMLParser
import hashlib
import re
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from app.discovery import DiscoveryCandidate, save_candidate

SOURCE_URL = "https://www.classaction.org/settlements"
ALLOWED = {"classaction.org", "www.classaction.org"}


class SettlementListParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_h3 = False
        self.in_link = False
        self.current = None
        self.entries = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "h3":
            if self.current:
                self.entries.append(self.current)
            self.current = {"title": "", "url": "", "body": ""}
            self.in_h3 = True
        elif tag == "a" and self.in_h3 and self.current is not None:
            self.in_link = True
            self.current["url"] = attributes.get("href", "")

    def handle_endtag(self, tag):
        if tag == "h3":
            self.in_h3 = False
            self.in_link = False
        elif tag == "a":
            self.in_link = False

    def handle_data(self, data):
        if self.current is None:
            return
        if self.in_h3:
            self.current["title"] += data
        else:
            self.current["body"] += " " + data

    def close(self):
        super().close()
        if self.current:
            self.entries.append(self.current)


def discover_from_feed() -> dict:
    request = Request(SOURCE_URL, headers={"User-Agent": "SettlementAgentResearch/0.1"})
    with urlopen(request, timeout=20) as response:
        destination = urlparse(response.geturl())
        if destination.scheme != "https" or destination.hostname not in ALLOWED:
            raise ValueError("Unexpected source redirect")
        payload = response.read(3_000_001)
    if len(payload) > 3_000_000:
        raise ValueError("Source page exceeds size limit")
    parser = SettlementListParser()
    parser.feed(payload.decode("utf-8", errors="replace"))
    parser.close()
    added = 0
    eligible = 0
    for entry in parser.entries:
        title = " ".join(entry["title"].split())
        link = entry["url"].strip()
        parsed = urlparse(link)
        if not title.lower().endswith("class action settlement"):
            continue
        if parsed.scheme != "https" or not parsed.hostname or parsed.hostname in ALLOWED:
            continue
        deadline = re.search(r"Deadline\s+(\d{1,2}/\d{1,2}/\d{2,4})", entry["body"], re.I)
        if not deadline:
            continue
        try:
            due = datetime.strptime(deadline.group(1), "%m/%d/%y").date() if len(deadline.group(1).split("/")[-1]) == 2 else datetime.strptime(deadline.group(1), "%m/%d/%Y").date()
        except ValueError:
            continue
        if due < date.today():
            continue
        eligible += 1
        candidate = DiscoveryCandidate(
            id="directory-" + hashlib.sha256(link.encode("utf-8")).hexdigest()[:16],
            title=title[:250],
            source_url=SOURCE_URL + "?candidate=directory-" + hashlib.sha256(link.encode("utf-8")).hexdigest()[:16],
            official_source_url=link,
            proposed_deadline=due,
        )
        if save_candidate(candidate):
            added += 1
    return {"source": SOURCE_URL, "items_seen": len(parser.entries), "dated_leads_found": eligible, "candidates_added": added}
