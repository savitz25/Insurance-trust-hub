"""Capture license type and status for distinct Missouri DCI company-directory IDs."""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/missouri/mo-ins-001"
BASE_URL = "https://insurance.mo.gov"
source = json.loads((OUT / "active-company-directory.json").read_text(encoding="utf-8"))
rows_by_path = {row["detail_path"]: row for row in source["observations"]}


def fetch(path: str) -> dict:
    for attempt in range(4):
        try:
            response = requests.get(BASE_URL + path, timeout=35)
            response.raise_for_status()
            body = response.content
            soup = BeautifulSoup(body, "html.parser")
            fields = {}
            for div in soup.select("div.views-field"):
                classes = div.get("class") or []
                field = next((x.removeprefix("views-field-") for x in classes if x.startswith("views-field-") and x != "views-field"), None)
                content = div.select_one(".field-content")
                if field and content:
                    fields[field] = content.get_text(" ", strip=True)
            if not fields.get("license-status") or not fields.get("license-type-description"):
                raise ValueError(f"missing detail fields for {path}")
            return {"detail_path": path, "source_sha256": hashlib.sha256(body).hexdigest(), "name": fields.get("company-name"), "status": fields["license-status"], "license_type": fields["license-type-description"], "license_number": fields.get("license-number") or None, "date_admitted": fields.get("effective-date") or None}
        except (requests.RequestException, ValueError):
            if attempt == 3:
                raise
            time.sleep((attempt + 1) * 1.5)
    raise AssertionError("unreachable")


def main() -> None:
    paths = sorted(rows_by_path)
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        records = list(pool.map(fetch, paths))
    snapshot = {"source": BASE_URL + "/find-insurance-company", "retrieved_at": datetime.now(timezone.utc).isoformat(), "list_observations": source["reported_rows"], "distinct_detail_ids": len(records), "duplicate_list_detail_ids": source["reported_rows"] - len(records), "records": records}
    (OUT / "active-company-details.json").write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"detail_ids": len(records), "statuses": Counter(r["status"] for r in records), "types": Counter(r["license_type"] for r in records).most_common(30)}, default=list))


if __name__ == "__main__":
    main()
