#!/usr/bin/env python3
"""Parse DFR 2025 complaint PDFs into a frozen name-only research table."""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "oregon" / "or-ins-001"

FILES = {
    "annuities": "Complaint-AnnuitiesFull-2025.pdf",
    "auto": "Complaint-AutoFull-2025.pdf",
    "health": "Complaint-HealthFull-2025.pdf",
    "homeowners": "Complaint-HomeownersFull-2025.pdf",
    "life": "Complaint-LifeFull-2025.pdf",
    "long_term_care": "Complaint-LTCfull-2025.pdf",
}

ROW = re.compile(
    r"^(?P<name>.+?)\s+(?P<premium>\(?-?[\d,]+\)?)\s+(?P<total>\d+)\s+(?P<confirmed>\d+)\s+(?P<index>[\d.]+)\s*$"
)


def parse_pdf(path: Path) -> list[dict]:
    reader = PdfReader(str(path))
    rows: list[dict] = []
    buf = ""
    for page in reader.pages:
        text = page.extract_text() or ""
        for raw in text.splitlines():
            line = re.sub(r"\s+", " ", raw).strip()
            if not line:
                continue
            if line.startswith(
                (
                    "Annuity Companies",
                    "Auto Companies",
                    "Health",
                    "Homeowner",
                    "Life Companies",
                    "Long-term Care",
                    "Premium",
                    "Total",
                    "Confirmed",
                    "Complaint",
                    "Index",
                    "2025",
                    "2024",
                )
            ):
                continue
            if line in {"Premium", "Total Complaints", "Confirmed Complaints", "Complaint Index"}:
                continue
            candidate = (buf + " " + line).strip() if buf else line
            m = ROW.match(candidate)
            if m:
                prem = m.group("premium").replace(",", "")
                neg = prem.startswith("(") and prem.endswith(")")
                prem_n = -int(prem.strip("()")) if neg else int(prem)
                rows.append(
                    {
                        "name": m.group("name").strip(),
                        "premium": prem_n,
                        "total_complaints": int(m.group("total")),
                        "confirmed_complaints": int(m.group("confirmed")),
                        "complaint_index": float(m.group("index")),
                    }
                )
                buf = ""
            else:
                # wrapped company name
                if re.search(r"\d", line) and ROW.match(line):
                    buf = ""
                elif not re.search(r"\d{2,}", line):
                    buf = candidate
                else:
                    buf = ""
    return rows


def main() -> None:
    lines = {}
    all_names: list[str] = []
    total_rows = 0
    parse_fail_hint = {}
    for line, fn in FILES.items():
        path = OUT / fn
        rows = parse_pdf(path)
        reader = PdfReader(str(path))
        meta = reader.metadata or {}
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        names = [r["name"] for r in rows]
        all_names.extend(names)
        total_rows += len(rows)
        lines[line] = {
            "file": fn,
            "sha256": sha,
            "pages": len(reader.pages),
            "title": str(meta.get("/Title") or ""),
            "subject": str(meta.get("/Subject") or ""),
            "keywords": str(meta.get("/Keywords") or ""),
            "modDate": str(meta.get("/ModDate") or ""),
            "creationDate": str(meta.get("/CreationDate") or ""),
            "author": str(meta.get("/Author") or ""),
            "rows": len(rows),
            "distinct_names": len(set(names)),
            "sum_total_complaints": sum(r["total_complaints"] for r in rows),
            "sum_confirmed_complaints": sum(r["confirmed_complaints"] for r in rows),
            "observations": rows,
        }
        print(line, "rows", len(rows), "names", len(set(names)), "complaints", lines[line]["sum_total_complaints"])

    payload = {
        "source": "https://dfr.oregon.gov/help/complaints-licenses/pages/complaint-information.aspx",
        "year": 2025,
        "retrieved_note": "Official DFR complaint-stats-2025 PDFs. Excel-exported tables. Company name only; no NAIC in the published table.",
        "denominator": "Premium written (source column Premium)",
        "index_label": "Oregon DFR Complaint Index (source-created; not a TrustHub Trust Score or ranking)",
        "complaint_is_not_violation": True,
        "confirmed_is_not_automatically_misconduct_finding_for_TrustHub": True,
        "name_only": True,
        "lines": lines,
        "row_total": total_rows,
        "distinct_names_across_lines": len(set(all_names)),
    }
    (OUT / "complaints-2025.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("TOTAL rows", total_rows, "distinct names", payload["distinct_names_across_lines"])


if __name__ == "__main__":
    main()
