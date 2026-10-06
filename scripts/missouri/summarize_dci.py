"""Recount the retained Missouri DCI active-company directory by printed license type."""
import collections
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data/missouri/mo-ins-001/active-company-details.json"
TARGET = ROOT / "lib/missouri-intelligence/mo-ins-001.json"

source = json.loads(SOURCE.read_text(encoding="utf-8"))
rows = source["records"]
assert len(rows) == source["distinct_detail_ids"] == 4147
assert all(row["status"] == "Active" for row in rows)
ids = [row["detail_path"] for row in rows]
licenses = [row["license_number"] for row in rows]
assert len(set(ids)) == len(ids)
assert len(set(licenses)) == len(licenses) and all(licenses)
classes = collections.Counter(row["license_type"] for row in rows)
assert sum(classes.values()) == len(rows)
snapshot = {
    "source": source["source"],
    "retrievedAt": source["retrieved_at"],
    "sourceAsOf": None,
    "filter": "Active",
    "listObservations": source["list_observations"],
    "distinctDetailRecords": len(rows),
    "distinctPrintedLicenseNumbers": len(set(licenses)),
    "duplicateListDetailIds": source["duplicate_list_detail_ids"],
    "licenseTypes": [{"type": name, "records": count} for name, count in classes.most_common()],
    "separateSources": {
        "agentsAndAgencies": "https://insurance.mo.gov/companies/find-insurance-agentagency",
        "agentEnforcement": "https://insurance.mo.gov/enforcement-actions",
        "marketRegulationActions": "https://insurance.mo.gov/companies/market-regulation-actions",
    },
    "notAcquired": ["agency and individual producer roster", "adjuster roster", "individual surplus-lines licensees", "appointments", "examination records", "receivership records", "order details and exact license-number joins"],
    "graphWrites": 0,
    "exactAdverseAttachments": 0,
}
TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
print(f"{len(rows)} records, {len(classes)} source types, {len(set(licenses))} printed licenses")
