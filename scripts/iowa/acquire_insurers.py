"""Retain and summarize Iowa Insurance Division licensed-company export."""
import csv
import hashlib
import io
import json
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "data/iowa/ia-ins-001"
URL = "https://idh-be.iowa.gov/api/v1/datasets/667/rows.csv"
AGENCY_URL = "https://idh-be.iowa.gov/api/v1/datasets/668/rows.csv"

def main():
    response = requests.get(URL, timeout=90)
    response.raise_for_status()
    archive = response.content
    with zipfile.ZipFile(io.BytesIO(archive)) as zf:
        names = zf.namelist()
        assert len(names) == 1 and names[0].endswith(".csv")
        content = zf.read(names[0])
    rows = list(csv.DictReader(io.StringIO(content.decode("utf-8-sig"))))
    ids = [r["iowa_license_number"].strip() for r in rows]
    assert all(ids) and len(ids) == len(set(ids))
    snapshot = {
        "contract": "iowa-licensed-insurers-v1",
        "catalog": "https://data.iowa.gov/catalog/dataset/667",
        "source": URL,
        "regulator": "Iowa Insurance Division",
        "grain": "Iowa licensed insurance company number, not agency, producer, adjuster or appointment",
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "sourceAsOf": None,
        "archiveSha256": hashlib.sha256(archive).hexdigest(),
        "rawRows": len(rows),
        "distinctIowaLicenseNumbers": len(set(ids)),
        "distinctNonblankNaicNumbers": len({r["naic_number"].strip() for r in rows if r["naic_number"].strip()}),
        "rowsWithoutNaicNumber": sum(not r["naic_number"].strip() for r in rows),
        "licenseTypes": [{"type": name, "rows": count} for name, count in Counter(r["business_license_type"].strip() or "Unspecified" for r in rows).most_common()],
        "graphWrites": 0,
    }
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / "licensed-insurance-companies-release.zip").write_bytes(archive)
    (DEST / "insurer-snapshot.json").write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    agency_response = requests.get(AGENCY_URL, timeout=90)
    agency_response.raise_for_status()
    agency_archive = agency_response.content
    with zipfile.ZipFile(io.BytesIO(agency_archive)) as zf:
        agency_names = zf.namelist()
        assert len(agency_names) == 1 and agency_names[0].endswith(".csv")
        agency_rows = list(csv.DictReader(io.StringIO(zf.read(agency_names[0]).decode("utf-8-sig"))))
    assert agency_rows and "entity_name" in agency_rows[0] and "expiry_date" in agency_rows[0]
    # This export has no license number or NIPR identifier; rows cannot be deduplicated as entities.
    agency = {
        "contract": "iowa-insurance-producer-business-entity-observations-v1",
        "catalog": "https://data.iowa.gov/catalog/dataset/668",
        "source": AGENCY_URL,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "sourceAsOf": None,
        "archiveSha256": hashlib.sha256(agency_archive).hexdigest(),
        "rawRows": len(agency_rows),
        "distinctEntities": None,
        "identifierField": None,
        "grain": "Producer business-entity list observation; no stable license identifier in export",
        "graphWrites": 0,
    }
    (DEST / "licensed-producer-business-entities-release.zip").write_bytes(agency_archive)
    (DEST / "agency-snapshot.json").write_text(json.dumps(agency, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: snapshot[k] for k in ("rawRows", "distinctIowaLicenseNumbers", "archiveSha256", "retrievedAt")}, indent=2))

if __name__ == "__main__":
    main()
