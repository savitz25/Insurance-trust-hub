#!/usr/bin/env python3
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
snap = json.loads((root / "lib/north-carolina-intelligence/accepted-snapshot.json").read_text(encoding="utf-8"))
ui = (root / "components/north-carolina/nc-state-page.tsx").read_text(encoding="utf-8")
page = (root / "app/north-carolina/page.tsx").read_text(encoding="utf-8")
interpret = (root / "lib/insurance-ask/interpret.ts").read_text(encoding="utf-8")
published = (root / "lib/seo/published-state-path.ts").read_text(encoding="utf-8")

assert snap["version"] == "insurance-nc-state-intel-v1"
assert snap["licensing_actions"]["document_rows"] == 2874
assert snap["licensing_actions"]["producer_rows"] == 1717
assert snap["licensing_actions"]["business_entity_rows"] == 255
assert snap["licensing_actions"]["adjuster_rows"] == 72
assert snap["licensing_actions"]["unique_matters"] is None
assert snap["market_conduct"]["document_rows"] == 138
assert snap["financial_exams"]["document_rows"] == 158
assert snap["market_share"]["homeowners_multiple_peril_rows"] == 199
assert snap["market_share"]["federal_flood_rows"] == 25
assert snap["market_share"]["private_flood_rows"] == 125
assert snap["market_share"]["workers_compensation_rows"] == 423
assert snap["company_lookup"]["count"] is None
assert snap["agency_roster"]["count"] is None
assert snap["producer_roster"]["count"] is None
assert snap["complaints"]["count"] is None
assert snap["expansion_ledger"]["GRAPH_WRITES"] == 0
assert snap["claim_eligibility"]["broadened"] is False
assert snap["attachments"]["EXACT_PROFILE_ATTACHMENTS"] == 0
assert snap["agency_roster"]["business_entity_license_has_no_line_of_authority"] is True
assert snap["market_share"]["company_line_is_not_agency_product"] is True
assert "Pennsylvania Insurance Department" not in ui
assert "PID" not in ui
assert "IDOI" not in ui
assert "Oregon DFR" not in ui
assert "/north-carolina/charlotte" not in ui
assert "/north-carolina/raleigh" not in ui
assert "Trust Score" in ui
assert "aggregateRating" not in page
assert "northCarolinaAsked" in interpret or "north carolina" in interpret.lower()
assert "'north-carolina'" in published
assert snap["financial_exams"]["financial_exam_is_not_market_conduct"] is True
assert snap["licensing_actions"]["licensing_action_is_not_complaint"] is True
assert not re.search(r"dfr-oregon|idoi-illinois|sbs-ny|scc-virginia|pid-gfsearch", ui, re.I)
print("nc-ins-001 python tests pass")
