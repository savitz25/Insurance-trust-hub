"""Capture Missouri DCI active company-directory observations, without treating the mixed list as insurers."""
from __future__ import annotations

import concurrent.futures
import gzip
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/missouri/mo-ins-001"
RAW = OUT / "raw-company-pages"
URL = "https://insurance.mo.gov/find-insurance-company"


def fetch(page: int):
    response = requests.get(URL, params={"license_status": "1", "page": page}, timeout=40)
    response.raise_for_status()
    body = response.content
    soup = BeautifulSoup(body, "html.parser")
    match = re.search(r"Displaying\s+\d+\s+-\s+\d+\s+of\s+(\d+)", soup.get_text(" ", strip=True))
    if match is None:
        raise ValueError(f"no count on page {page}")
    rows = []
    for tr in soup.select("table tbody tr"):
        cells = tr.select("td")
        if len(cells) != 4:
            raise ValueError(f"bad column count {len(cells)} on page {page}")
        link = cells[1].select_one("a")
        rows.append({
            "source_page": page,
            "detail_path": link.get("href") if link else None,
            "name": cells[1].get_text(" ", strip=True),
            "city": cells[2].get_text(" ", strip=True),
            "naic": cells[3].get_text(" ", strip=True) or None,
        })
    return page, body, rows, int(match.group(1))


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    first = fetch(0)
    count = first[3]
    pages = (count + 24) // 25
    fetched = [first]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        fetched.extend(pool.map(fetch, range(1, pages)))
    rows = []
    manifest = []
    for page, body, page_rows, reported in sorted(fetched):
        if reported != count:
            raise ValueError(f"directory changed while fetching page {page}")
        name = f"page-{page:03d}.html.gz"
        (RAW / name).write_bytes(gzip.compress(body, mtime=0))
        manifest.append({"page": page, "sha256": hashlib.sha256(body).hexdigest(), "rows": len(page_rows), "raw": name})
        rows.extend(page_rows)
    if len(rows) != count:
        raise ValueError(f"row count {len(rows)} != {count}")
    output = {"source": URL, "filter": "license_status=1 (Active)", "retrieved_at": datetime.now(timezone.utc).isoformat(), "reported_rows": count, "manifest": manifest, "observations": rows}
    (OUT / "active-company-directory.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"rows": count, "detail_links": sum(bool(row["detail_path"]) for row in rows), "naic_printed": sum(bool(row["naic"]) for row in rows)}))


if __name__ == "__main__":
    main()
