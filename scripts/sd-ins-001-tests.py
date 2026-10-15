import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = (ROOT / "app/south-dakota/page.tsx").read_text(encoding="utf-8")
EVIDENCE = json.loads((ROOT / "data/evidence/south-dakota-insurance-v1.json").read_text(encoding="utf-8"))


class SouthDakotaInsuranceEvidenceTests(unittest.TestCase):
    def test_metadata_and_sources(self):
        self.assertIn('path: "/south-dakota"', PAGE)
        self.assertIn("buildMetadata", PAGE)
        for url in (
            "https://dlr.sd.gov/insurance/",
            "https://dlr.sd.gov/insurance/license_inquiry_service.aspx",
            "https://dlr.sd.gov/insurance/company_listings/domestics.aspx",
            "https://dlr.sd.gov/insurance/company_listings/farm_mutuals.aspx",
        ):
            self.assertIn(url, PAGE)

    def test_source_scopes_and_clocks_remain_separate(self):
        self.assertEqual(EVIDENCE["observations"][0]["raw_rows"], 22)
        self.assertEqual(EVIDENCE["observations"][0]["distinct_naic_identifiers"], 22)
        self.assertEqual(EVIDENCE["observations"][1]["raw_rows"], 7)
        self.assertEqual(EVIDENCE["observations"][1]["distinct_entities"], "NOT_RECONCILED")
        self.assertIn("current complete insurer census", EVIDENCE["observations"][0]["scope_note"])
        self.assertIn("returned HTTP 404", EVIDENCE["observations"][2]["access_note"])
        self.assertIn("October 2023", PAGE)
        self.assertIn("September 2026", PAGE)
        self.assertIn("March 27, 2024", PAGE)

    def test_no_fake_combined_counts_or_adverse_joins(self):
        for population in ("producer", "agency", "Adjusters", "Surplus-lines", "Appointments"):
            self.assertRegex(PAGE, re.compile(population, re.IGNORECASE))
        self.assertIn("NOT_ACQUIRED", PAGE)
        self.assertIn("none is used as a licensee count", PAGE)
        self.assertIn("name alone", PAGE)
        self.assertNotIn("AggregateRating", PAGE)
        self.assertNotIn("TrustScore", PAGE)
        self.assertIn('"combined_insurer_total": "NOT_PUBLISHED"', json.dumps(EVIDENCE))
        self.assertEqual(EVIDENCE["paid_data_purchases_usd"], 0)


if __name__ == "__main__":
    unittest.main()
