"""Publish a manually reviewed settlement from a validated JSON record.

Example: python approve.py --id directory-... --record path/to/settlement.json
Never infer missing eligibility requirements from discovery metadata.
"""
import argparse
import json
import os
import tempfile
from datetime import date
from pathlib import Path

from app.discovery import CANDIDATES_PATH, load_candidates
from app.models import Settlement

CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "settlements.sample.json"


def approve(candidate_id: str, record_path: Path) -> str:
    candidates = load_candidates()
    candidate = next((c for c in candidates if c.id == candidate_id), None)
    if candidate is None:
        raise ValueError("Candidate not found")
    if candidate.review_status != "reviewed" or not candidate.reviewer_notes.strip():
        raise ValueError("First complete a manual review with reviewer notes")
    record = Settlement.model_validate_json(record_path.read_text(encoding="utf-8"))
    if not record.official_claim_url:
        raise ValueError("A confirmed official claim form URL is required")
    if not record.eligibility_rules:
        raise ValueError("At least one verified eligibility rule is required")
    if record.claim_deadline < date.today():
        raise ValueError("Claim deadline has passed")
    if candidate.official_source_url and str(record.official_source_url).split("/")[2].lower().removeprefix("www.") != str(candidate.official_source_url).split("/")[2].lower().removeprefix("www."):
        raise ValueError("Source domain differs from reviewed candidate; investigate manually")
    existing = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    if any(s["id"] == record.id for s in existing):
        raise ValueError("Settlement ID already published")
    existing.append(record.model_dump(mode="json"))
    fd, temporary = tempfile.mkstemp(prefix="settlements-", suffix=".json", dir=CATALOG_PATH.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(existing, handle, indent=2)
            handle.write("\n")
        os.replace(temporary, CATALOG_PATH)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    candidate.review_status = "published"
    CANDIDATES_PATH.write_text(json.dumps([c.model_dump(mode="json") for c in candidates], indent=2) + "\n", encoding="utf-8")
    return record.id


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Explicit local settlement publication")
    parser.add_argument("--id", required=True, help="Discovery candidate ID")
    parser.add_argument("--record", required=True, type=Path, help="Reviewed settlement JSON file")
    args = parser.parse_args()
    try:
        print("Published:", approve(args.id, args.record))
    except Exception as exc:
        parser.error(str(exc))
