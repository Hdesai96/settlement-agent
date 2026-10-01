"""Candidate ingestion is separate from the verified public catalog.

Discovery never publishes a settlement automatically. Review source documents,
confirm the deadline and benefits, then explicitly approve a candidate.
"""
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field, HttpUrl
import json

ROOT = Path(__file__).resolve().parents[2]
CANDIDATES_PATH = ROOT / "data" / "discovery_candidates.json"


class DiscoveryCandidate(BaseModel):
    id: str
    title: str
    source_url: HttpUrl
    official_source_url: Optional[HttpUrl] = None
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    proposed_deadline: Optional[date] = None
    review_status: str = "pending"
    reviewer_notes: str = ""


def load_candidates() -> list[DiscoveryCandidate]:
    if not CANDIDATES_PATH.exists():
        return []
    return [DiscoveryCandidate.model_validate(x) for x in json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))]


def save_candidate(candidate: DiscoveryCandidate) -> bool:
    """Return False for an already-seen candidate ID or source URL."""
    candidates = load_candidates()
    if any(c.id == candidate.id or str(c.source_url).rstrip("/") == str(candidate.source_url).rstrip("/") for c in candidates):
        return False
    CANDIDATES_PATH.parent.mkdir(parents=True, exist_ok=True)
    candidates.append(candidate)
    CANDIDATES_PATH.write_text(
        json.dumps([c.model_dump(mode="json") for c in candidates], indent=2) + "\n",
        encoding="utf-8",
    )
    return True
