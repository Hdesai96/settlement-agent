"""Local review-only discovery CLI; never changes the public catalog.

Run from backend/: python discover.py add --id ... --title ... --source-url ...
Then: python discover.py list
Then: python discover.py review --id ... --official-source-url ... --deadline YYYY-MM-DD --notes ...
"""
import argparse
import json
from datetime import date
from app.discovery import CANDIDATES_PATH, DiscoveryCandidate, load_candidates, save_candidate


def main():
    parser = argparse.ArgumentParser(description="Review-gated settlement candidate intake")
    sub = parser.add_subparsers(dest="action", required=True)
    add = sub.add_parser("add")
    for name in ("id", "title", "source-url"):
        add.add_argument("--" + name, required=True)
    sub.add_parser("list")
    review = sub.add_parser("review")
    review.add_argument("--id", required=True)
    review.add_argument("--official-source-url", required=True)
    review.add_argument("--deadline", required=True, type=date.fromisoformat)
    review.add_argument("--notes", required=True)
    args = parser.parse_args()

    if args.action == "add":
        candidate = DiscoveryCandidate(id=args.id, title=args.title, source_url=args.source_url)
        print("Candidate queued" if save_candidate(candidate) else "Duplicate candidate skipped")
    elif args.action == "list":
        print(json.dumps([c.model_dump(mode="json") for c in load_candidates()], indent=2))
    else:
        candidates = load_candidates()
        candidate = next((c for c in candidates if c.id == args.id), None)
        if candidate is None:
            parser.error("Candidate not found")
        if not args.notes.strip():
            parser.error("Reviewer notes are required")
        candidate.official_source_url = args.official_source_url
        candidate.proposed_deadline = args.deadline
        candidate.reviewer_notes = args.notes
        candidate.review_status = "reviewed"
        CANDIDATES_PATH.parent.mkdir(parents=True, exist_ok=True)
        CANDIDATES_PATH.write_text(
            json.dumps([c.model_dump(mode="json") for c in candidates], indent=2) + "\n",
            encoding="utf-8",
        )
        print("Marked reviewed. This does not publish the candidate.")


if __name__ == "__main__":
    main()
