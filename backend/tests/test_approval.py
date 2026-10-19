"""Safety regression tests for settlement publication.

Run from backend/: python -m unittest discover -s tests -v
"""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.discovery import DiscoveryCandidate
from approve import approve


class ApprovalTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.catalog = self.root / "settlements.json"
        self.candidates = self.root / "candidates.json"
        self.record = self.root / "record.json"
        self.catalog.write_text("[]", encoding="utf-8")
        self.candidate = DiscoveryCandidate(
            id="test-candidate",
            title="Example Settlement",
            source_url="https://example.org/directory",
            official_source_url="https://example.org/notice",
            review_status="reviewed",
            reviewer_notes="Reviewed against source",
        )
        self.candidates.write_text(json.dumps([self.candidate.model_dump(mode="json")]), encoding="utf-8")
        self.record_data = {
            "id": "example-2026",
            "name": "Example Settlement",
            "company": "Example",
            "summary": "Synthetic test record",
            "claim_deadline": "2099-12-31",
            "proof_required": False,
            "official_source_url": "https://example.org/notice",
            "official_claim_url": "https://example.org/claim",
            "eligibility_rules": [{"field": "brands_used", "operator": "contains", "value": "Example"}],
        }
        self.patches = [
            patch("approve.CATALOG_PATH", self.catalog),
            patch("approve.CANDIDATES_PATH", self.candidates),
            patch("approve.load_candidates", self.load_candidates),
        ]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

    def load_candidates(self):
        return [DiscoveryCandidate.model_validate(x) for x in json.loads(self.candidates.read_text(encoding="utf-8"))]

    def write_record(self):
        self.record.write_text(json.dumps(self.record_data), encoding="utf-8")

    def test_unreviewed_rejected(self):
        self.candidate.review_status = "pending"
        self.candidates.write_text(json.dumps([self.candidate.model_dump(mode="json")]), encoding="utf-8")
        self.write_record()
        with self.assertRaisesRegex(ValueError, "manual review"):
            approve("test-candidate", self.record)
        self.assertEqual(json.loads(self.catalog.read_text()), [])

    def test_missing_claim_url_rejected(self):
        self.record_data.pop("official_claim_url")
        self.write_record()
        with self.assertRaisesRegex(ValueError, "claim form URL"):
            approve("test-candidate", self.record)
        self.assertEqual(json.loads(self.catalog.read_text()), [])

    def test_missing_rules_rejected(self):
        self.record_data["eligibility_rules"] = []
        self.write_record()
        with self.assertRaisesRegex(ValueError, "eligibility rule"):
            approve("test-candidate", self.record)

    def test_invalid_record_rejected(self):
        self.record.write_text("[]", encoding="utf-8")
        with self.assertRaises(Exception):
            approve("test-candidate", self.record)
        self.assertEqual(json.loads(self.catalog.read_text()), [])

    def test_valid_record_published_once(self):
        self.write_record()
        self.assertEqual(approve("test-candidate", self.record), "example-2026")
        self.assertEqual(len(json.loads(self.catalog.read_text())), 1)
        self.assertEqual(self.load_candidates()[0].review_status, "published")
        with self.assertRaises(ValueError):
            approve("test-candidate", self.record)
        self.assertEqual(len(json.loads(self.catalog.read_text())), 1)


if __name__ == "__main__":
    unittest.main()
