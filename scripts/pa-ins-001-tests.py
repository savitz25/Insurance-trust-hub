#!/usr/bin/env python3
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
snap = json.loads((root / "lib/pennsylvania-intelligence/accepted-snapshot.json").read_text(encoding="utf-8"))
companies = json.loads((root / "data/pennsylvania/pa-ins-001/licensed-companies.json").read_text(encoding="utf-8"))
ui = (root / "components/pennsylvania/pa-state-page.tsx").read_text(encoding="utf-8")
page = (root / "app/pennsylvania/page.tsx").read_text(encoding="utf-8")
interpret = (root / "lib/insurance-ask/interpret.ts").read_text(encoding="utf-8")

assert snap["version"] == "insurance-pa-state-intel-v1"
assert snap["company_lookup"]["distinct_naic"] == companies["distinctNaic"] == 1722
assert snap["company_lookup"]["count"] == 1724
assert snap["surplus_lines"]["distinct_naic"] == 233
assert snap["enforcement"]["enforcement_actions"] == 3232
assert snap["enforcement"]["market_conduct_actions"] == 450
assert snap["complaints"]["row_total"] == 595
assert snap["financial_exams"]["document_rows"] == 494
assert snap["liquidation"]["document_rows"] == 95
assert snap["agency_roster"]["count"] is None
assert snap["producer_roster"]["count"] is None
assert snap["expansion_ledger"]["GRAPH_WRITES"] == 0
assert snap["claim_eligibility"]["broadened"] is False
assert snap["enforcement_attachment"]["EXACT_PROFILE_ATTACHMENTS"] == 0
assert "Oregon" not in ui and "DFR" not in ui
assert "Illinois" not in ui and "IDOI" not in ui
assert "New York" not in ui and "DFS" not in ui
assert "Virginia" not in ui
assert "Colorado" not in ui
assert "Washington" not in ui or "washington" not in ui.lower()
assert "/pennsylvania/philadelphia" not in ui
assert "/pennsylvania/pittsburgh" not in ui
assert "Trust Score" in ui
assert "aggregateRating" not in page
assert "pennsylvania" in interpret
assert snap["company_lookup"]["property_and_allied_lines_is_not_homeowners"] is True
assert snap["complaints"]["index_is_not_trust_score"] is True
assert snap["market_conduct"]["exam_is_not_discipline"] is True
assert snap["financial_exams"]["financial_exam_is_not_market_conduct"] is True
assert snap["liquidation"]["liquidation_is_not_current_census"] is True
# Residue: copied other-state accessibility IDs
assert not re.search(r"dfr-oregon|idoi-illinois|sbs-ny|scc-virginia", ui, re.I)
print("pa-ins-001 python tests pass")
