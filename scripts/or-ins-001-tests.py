#!/usr/bin/env python3
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
snap = json.loads((root / "lib/oregon-intelligence/accepted-snapshot.json").read_text(encoding="utf-8"))
orders = json.loads((root / "data/oregon/or-ins-001/dfr-insurance-orders.json").read_text(encoding="utf-8"))
ui = (root / "components/oregon/or-state-page.tsx").read_text(encoding="utf-8")

assert snap["version"] == "insurance-or-state-intel-v1"
assert snap["dfr_orders"]["document_rows"] == orders["documentRows"] == 738
assert snap["dfr_orders"]["distinct_cases"] == 726
assert snap["complaints"]["row_total"] == 1309
assert snap["expansion_ledger"]["OR_AGENCY_ROWS"] is None
assert snap["expansion_ledger"]["OR_PRODUCER_ROWS"] is None
assert snap["expansion_ledger"]["OR_AUTHORIZED_INSURER_ROWS"] is None
assert snap["expansion_ledger"]["GRAPH_WRITES"] == 0
assert "Mortgage" not in snap["dfr_orders"]["actions"]
assert "Enforcement" not in snap["dfr_orders"]["actions"]
assert "Illinois" not in ui and "IDOI" not in ui
assert "/oregon/portland" not in ui
print("or-ins-001 python tests pass")
