#!/usr/bin/env python3
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
snap = json.loads((root / "lib/ohio-intelligence/accepted-snapshot.json").read_text(encoding="utf-8"))
ui = (root / "components/ohio/oh-state-page.tsx").read_text(encoding="utf-8")
page = (root / "app/ohio/page.tsx").read_text(encoding="utf-8")
interpret = (root / "lib/insurance-ask/interpret.ts").read_text(encoding="utf-8")
published = (root / "lib/seo/published-state-path.ts").read_text(encoding="utf-8")

assert snap["version"] == "insurance-oh-state-intel-v1"
assert snap["authorized_companies"]["distinct_naic"] == 1738
assert snap["authorized_companies"]["rows"] == 1738
assert snap["authorized_companies"]["rows_missing_naic"] == 0
assert snap["domestic_insurers"]["distinct_naic"] == 237
assert snap["agency_roster"]["union_distinct_npn"] == 23922
assert snap["agency_roster"]["residence_overlap_npn"] == 0
assert snap["line_of_authority"]["life"]["union_distinct_npn"] == 16306
assert snap["line_of_authority"]["accident_and_health"]["union_distinct_npn"] == 16132
assert snap["journal"]["document_rows"] == 496
assert snap["journal"]["unique_matters"] is None
assert snap["journal"]["agency_action_rows"] is None
assert snap["journal"]["company_action_rows"] is None
assert snap["financial_data"]["rows"] is None
assert snap["complaints"]["intake_is_not_census"] is True
assert snap["expansion_ledger"]["GRAPH_WRITES"] == 0
assert snap["claim_eligibility"]["broadened"] is False
assert snap["attachments"]["EXACT_PROFILE_ATTACHMENTS"] == 0
assert snap["consumer_product_loa"]["homeowners"]["status"] == "UNSUPPORTED"
assert snap["consumer_product_loa"]["auto"]["status"] == "UNSUPPORTED"
assert snap["line_of_authority"]["no_homeowners_loa"] is True
assert snap["journal"]["journal_is_not_complete_adverse_census"] is True
assert "Trust Score" in ui
assert "aggregateRating" not in page
assert "ohioAsked" in interpret or "ohio" in interpret.lower()
assert "'ohio'" in published
assert "/ohio/columbus" not in ui
assert "/ohio/cleveland" not in ui
assert "NCDOI" not in ui
assert "Pennsylvania Insurance Department" not in ui
assert not re.search(r"dfr-oregon|idoi-illinois|sbs-ny|scc-virginia|pid-gfsearch", ui, re.I)
print("oh-ins-001 python tests pass")
