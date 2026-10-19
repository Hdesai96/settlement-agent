"""Inspect one discovered settlement's source for human verification.

Run from backend: python verify.py --id directory-...
This never approves a candidate or publishes a claim.
"""
import argparse
import ipaddress
import json
import re
import socket
from html.parser import HTMLParser
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

from app.discovery import load_candidates


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"} and self.hidden:
            self.hidden -= 1

    def handle_data(self, data):
        if not self.hidden and data.strip():
            self.parts.append(" ".join(data.split()))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("Source redirects; inspect the destination manually")


def inspect(candidate_id):
    candidate = next((c for c in load_candidates() if c.id == candidate_id), None)
    if candidate is None:
        raise ValueError("Candidate not found in local review queue")
    if not candidate.official_source_url:
        raise ValueError("No settlement website recorded")
    url = str(candidate.official_source_url)
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.port not in (None, 443):
        raise ValueError("Expected standard HTTPS settlement website")
    for result in socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM):
        if not ipaddress.ip_address(result[4][0]).is_global:
            raise ValueError("Refusing non-public network destination")
    request = Request(url, headers={"User-Agent": "SettlementAgentResearch/0.1"})
    with build_opener(NoRedirect).open(request, timeout=15) as response:
        if response.headers.get_content_type() != "text/html":
            raise ValueError("Source is not HTML; inspect manually")
        payload = response.read(750001)
    if len(payload) > 750000:
        raise ValueError("Page too large; inspect manually")
    parser = TextExtractor()
    parser.feed(payload.decode("utf-8", errors="replace"))
    text = " ".join(parser.parts)
    pattern = r"(?i)(?:deadline|eligib|qualif|claim form|payment|compensation|proof|documentation)"
    snippets = []
    for match in list(re.finditer(pattern, text))[:25]:
        snippet = text[max(0, match.start() - 130):match.end() + 240]
        if snippet not in snippets:
            snippets.append(snippet)
    return {
        "candidate": candidate.title,
        "official_website_unverified": url,
        "proposed_deadline_unverified": str(candidate.proposed_deadline),
        "evidence_excerpts": snippets,
        "manual_checks_required": [
            "Confirm deadline on official notice or FAQ",
            "Confirm class definition and eligibility",
            "Confirm compensation and documentation requirements",
            "Confirm actual claim-form URL",
        ],
        "approved": False,
        "published": False,
    }


if __name__ == "__main__":
    cli = argparse.ArgumentParser()
    cli.add_argument("--id", required=True)
    args = cli.parse_args()
    try:
        print(json.dumps(inspect(args.id), indent=2))
    except Exception as exc:
        cli.error(str(exc))
