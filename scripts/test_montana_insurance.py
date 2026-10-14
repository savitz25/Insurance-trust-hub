import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = (ROOT / "app/montana/page.tsx").read_text(encoding="utf-8")
SITEMAP = (ROOT / "app/sitemap.ts").read_text(encoding="utf-8")


class MontanaInsurancePublicationTests(unittest.TestCase):
    def test_official_sources_and_clock_are_present(self):
        for text in (
            "https://csimt.gov/insurance/", "https://csimt.gov/insurance/licensing/",
            "https://csimt.gov/insurance/market-conduct/",
            "https://sbs.naic.org/solar-external-lookup/", "October 14, 2026",
        ):
            self.assertIn(text, PAGE)

    def test_source_populations_stay_separate_and_unknown(self):
        for text in (
            "NOT_ACQUIRED", "Insurers and other insurance companies",
            "agencies and other business entities", "Individual producers",
            "adjusters", "consultants", "surplus-lines", "Appointments are insurer–producer relationships",
            "An examination is a supervisory review", "not itself an enforcement action",
            "not a licensee population", "No combined Montana insurance census",
        ):
            self.assertIn(text, PAGE)
        self.assertNotIn("AggregateRating", PAGE)
        self.assertNotIn("Trust Score", PAGE)
        self.assertNotIn("0 insurers", PAGE)
        self.assertNotIn("StateCountyLinks", PAGE)

    def test_state_route_is_indexed_in_sitemap(self):
        self.assertIn("'/montana'", SITEMAP)


if __name__ == "__main__":
    unittest.main()
