"""Bounded ODI Administrative Actions Journal metadata harvest. Not a complete census."""
from __future__ import annotations

import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/ohio/oh-ins-001"
RAW = OUT / "raw" / "journal"
UA = "InsuranceTrustHub-OH-INS-001/1.0 (research; +https://www.insurancetrusthub.com)"
CTX = ssl.create_default_context()
URL = "https://gateway.insurance.ohio.gov/UI/ODI.AdministrativeAction.Public.UI/Home/SearchJournalEntry"

# UI offers past 12 months as of 2026-09. Bounded harvest of that window plus 2024-2025 remainder.
MONTHS = [
    ("10/01/2025", "10/31/2025"),
    ("11/01/2025", "11/30/2025"),
    ("12/01/2025", "12/31/2025"),
    ("01/01/2026", "01/31/2026"),
    ("02/01/2026", "02/28/2026"),
    ("03/01/2026", "03/31/2026"),
    ("04/01/2026", "04/30/2026"),
    ("05/01/2026", "05/31/2026"),
    ("06/01/2026", "06/30/2026"),
    ("07/01/2026", "07/31/2026"),
    ("08/01/2026", "08/31/2026"),
    ("09/01/2026", "09/18/2026"),
]


def fetch(params: dict) -> tuple[int, str]:
    q = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{URL}?{q}", headers={"User-Agent": UA, "Accept": "*/*", "X-Requested-With": "XMLHttpRequest"})
    try:
        with urllib.request.urlopen(req, timeout=90, context=CTX) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, (e.read() or b"").decode("utf-8", "replace")
    except Exception as e:
        return 0, str(e)


def parse_rows(html: str) -> list[dict]:
    rows = []
    # Table rows: name / date / type; document id on buttons
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.I | re.S):
        tds = [unescape(re.sub(r"<[^>]+>", " ", td)).strip() for td in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.I | re.S)]
        if len(tds) < 3:
            continue
        doc_id = None
        m = re.search(r'data-document-id=["\']([^"\']+)["\']', tr, re.I)
        if m:
            doc_id = m.group(1)
        entry = None
        m2 = re.search(r'data-entry-number=["\']([^"\']+)["\']', tr, re.I)
        if m2:
            entry = m2.group(1)
        rows.append({
            "cells": tds,
            "document_id": doc_id,
            "entry_number": entry,
        })
    return rows


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    all_rows = []
    months = []
    for start, end in MONTHS:
        status, html = fetch({"ExecuteDateFrom": start, "ExecuteDateTo": end})
        (RAW / f"{start.replace('/', '')}-{end.replace('/', '')}.html").write_text(html, encoding="utf-8")
        rows = parse_rows(html)
        months.append({"from": start, "to": end, "status": status, "html_bytes": len(html), "rows": len(rows)})
        all_rows.extend(rows)
        print(start, status, len(html), "rows", len(rows))

    # Document-type slices on the same 12-month window (source-native types)
    type_slices = []
    for dtype in ["Order", "Notice", "Bulletin", "Rule", "Other"]:
        status, html = fetch({
            "SelectedDocumentType": dtype,
            "ExecuteDateFrom": "10/01/2025",
            "ExecuteDateTo": "09/18/2026",
        })
        rows = parse_rows(html)
        type_slices.append({"type": dtype, "status": status, "rows": len(rows), "html_bytes": len(html)})
        print("type", dtype, status, len(rows))

    names = []
    types = Counter()
    doc_ids = []
    for row in all_rows:
        cells = row["cells"]
        # typical: name, date, document type
        if len(cells) >= 3:
            names.append(cells[0])
            types[cells[-1] if cells[-1] in {"Order", "Notice", "Bulletin", "Rule", "Other"} or True else ""] += 1
            # try detect type cell
            for c in cells:
                if c in {"Order", "Notice", "Bulletin", "Rule", "Other", "All"}:
                    types[c] += 1
                    break
        if row.get("document_id"):
            doc_ids.append(row["document_id"])

    summary = {
        "retrievedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": URL,
        "window": "2025-10-01 through 2026-09-18 (UI past-12-months)",
        "completeness_warning_required": True,
        "ce_noncompliance_excluded": True,
        "OH_ODI_JOURNAL_STATUS": "BOUNDED_METADATA_CATALOG_INCOMPLETE_RETRIEVAL_WARNED",
        "OH_ODI_ADMIN_ACTION_ROWS": len(all_rows),
        "OH_ODI_ADMIN_ACTION_DISTINCT_DOCUMENT_IDS": len(set(doc_ids)),
        "OH_ODI_ADMIN_ACTION_UNIQUE_MATTERS": None,
        "name_cells": len(names),
        "distinct_name_cells": len(set(n.lower() for n in names if n)),
        "months": months,
        "type_slices_12mo": type_slices,
        "sample": all_rows[:5],
        "table_headers_hint": re.findall(r"<th[^>]*>(.*?)</th>", (RAW / "10012025-10312025.html").read_text(encoding="utf-8") if (RAW / "10012025-10312025.html").exists() else "", re.I | re.S)[:20],
    }
    (OUT / "journal-summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: summary[k] for k in ["OH_ODI_ADMIN_ACTION_ROWS", "OH_ODI_ADMIN_ACTION_DISTINCT_DOCUMENT_IDS", "distinct_name_cells"]}, indent=2))


if __name__ == "__main__":
    main()
