#!/usr/bin/env python3
"""NV-INS-001: capture the public Nevada Division of Insurance (NDOI) sources used by the Nevada sprint.

Stdlib only. Writes raw bytes plus a `<name>.meta.json` capture record (URL, status, retrieved_at,
Last-Modified, content type, byte count, SHA-256) into the gitignored data/nevada/nv-ins-001/raw/.
CI never runs this file.

The NDOI self-serve reports and licensing search (di.nv.gov) answers every request from this client,
browser or not, with an F5 "Request Rejected" page. That response is captured too, so the producer,
agency and company-roster NOT_ACQUIRED states rest on recorded evidence. No authentication, WAF or
access control is bypassed and nothing is bought.
"""
from __future__ import annotations

import hashlib
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/nevada/nv-ins-001/raw"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
DOI = "https://doi.nv.gov"

CAPTURES: list[tuple[str, str]] = [
    ("enforcements-orders.html", f"{DOI}/News_Notices/Enforcements___Orders/"),
    ("producer-and-company-lists.html", f"{DOI}/News_Notices/Producer_and_Company_Lists/"),
    ("publications.html", f"{DOI}/News_Notices/Publications/"),
    ("insurers.html", f"{DOI}/Insurers/"),
    ("company-admissions.html", f"{DOI}/Insurers/Company-Admissions/"),
    ("surplus-lines-insurers.html", f"{DOI}/Insurers/Property-Casualty/Surplus-Lines-Insurers/"),
    ("captive-insurance.html", f"{DOI}/Captive-Insurance/"),
    ("file-a-complaint.html", f"{DOI}/Consumers/File-A-Complaint/"),
    ("consumer-complaint-report.html", f"{DOI}/Consumers/Consumer_Complaint_Report/"),
    ("licensing.html", f"{DOI}/Licensing/"),
    ("public-records.html", f"{DOI}/News-Notices/Records/"),
    ("order-26-0028.pdf", f"{DOI}/uploadedFiles/doi.nv.gov/Content/News_and_Notices/" + quote("Mitchell Int Cause 26.028_CAO.pdf")),
    ("imr-2025.pdf", f"{DOI}/uploadedFiles/doi.nv.gov/Content/News_and_Notices/" + quote("NDOI IMR 2025 Final.pdf")),
    ("complaints-2024.zip", f"{DOI}/uploadedFiles/doi.nv.gov/Content/Consumers/" + quote("Consumer Complaints_2024.zip")),
    ("complaints-2023.zip", f"{DOI}/uploadedFiles/doi.nv.gov/Content/Consumers/" + quote("Consumer Complaints_2023.zip")),
    ("complaints-2022.zip", f"{DOI}/uploadedFiles/doi.nv.gov/Content/Consumers/" + quote("Consumer Complaints_2022.zip")),
    # Self-serve reports / licensing search: captured to record the access result, not bypassed.
    ("di-reports-and-lookups.html", "https://di.nv.gov/nv/r/doi/reports-and-lookups/home"),
    ("di-licensing-search.html", "https://di.nv.gov/nv/r/doi/licensing/search"),
]


def fetch(url: str) -> tuple[int, bytes, dict]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*", "Accept-Language": "en-US,en;q=0.9"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.status, r.read(), {"final_url": r.geturl(), "last_modified": r.headers.get("Last-Modified"),
                                        "content_type": r.headers.get("Content-Type")}
    except HTTPError as e:
        return e.code, e.read(), {"final_url": url, "last_modified": e.headers.get("Last-Modified"),
                                  "content_type": e.headers.get("Content-Type")}


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    for name, url in CAPTURES:
        if only and name not in only:
            continue
        status, data, h = fetch(url)
        meta = {
            "name": name, "url": url, "final_url": h["final_url"], "status": status,
            "retrieved_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "last_modified": h["last_modified"], "content_type": h["content_type"],
            "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
            "request_rejected": b"Request Rejected" in data[:4000],
        }
        (RAW / name).write_bytes(data)
        (RAW / f"{name}.meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
        print(f"{status} {len(data):>9} rejected={meta['request_rejected']!s:5} {name}")


if __name__ == "__main__":
    main()
