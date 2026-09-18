#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

RAW = Path(__file__).resolve().parents[2] / "data/pennsylvania/pa-ins-001/raw"
OUT = RAW.parent
LINES = [
    ("HL", "Accident and Health"),
    ("AN", "Annuity"),
    ("PP", "Auto"),
    ("HO", "Homeowners"),
    ("LF", "Life"),
    ("TT", "Title"),
]


def strip(s: str) -> str:
    s = re.sub(r"&nbsp;?", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def parse(html: str) -> list[dict]:
    rows = []
    for m in re.finditer(r"<tr[^>]*>(.*?)</tr>", html, re.I | re.S):
        cells = [strip(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", m.group(1), re.I | re.S)]
        cells = [c for c in cells if c]
        if len(cells) < 4:
            continue
        name = cells[0]
        if name.lower() in {"company name", "year:"} or name.startswith("Year:") or name.startswith("Line of"):
            continue
        if not re.search(r"[A-Za-z]", name):
            continue
        def num(s: str):
            s = s.replace(",", "").replace("%", "").replace("$", "").strip()
            try:
                return float(s)
            except ValueError:
                return None
        complaints = num(cells[1]) if len(cells) > 1 else None
        index = num(cells[2]) if len(cells) > 2 else None
        share = num(cells[3]) if len(cells) > 3 else None
        premium = num(cells[4]) if len(cells) > 4 else None
        rows.append(
            {
                "name": name,
                "complaints": complaints,
                "complaintIndex": index,
                "marketSharePct": share,
                "premium": premium,
            }
        )
    return rows


def main() -> None:
    tables = []
    for year in ("2025", "2024"):
        for code, label in LINES:
            path = RAW / f"complaint-{year}-{code}.html"
            html = path.read_text(encoding="utf-8", errors="replace")
            rows = parse(html)
            complaints_sum = sum(r["complaints"] or 0 for r in rows)
            names = {r["name"] for r in rows}
            tables.append(
                {
                    "year": year,
                    "lineCode": code,
                    "lineLabel": label,
                    "rowCount": len(rows),
                    "distinctNames": len(names),
                    "sumComplaints": complaints_sum,
                    "sample": rows[:3],
                }
            )
            print(year, label, "rows", len(rows), "names", len(names), "sum", complaints_sum)
    names_2025 = set()
    rows_2025 = 0
    sum_2025 = 0
    line_rows = {}
    line_complaints = {}
    for t in tables:
        if t["year"] != "2025":
            continue
        rows_2025 += t["rowCount"]
        sum_2025 += t["sumComplaints"]
        line_rows[t["lineLabel"]] = t["rowCount"]
        line_complaints[t["lineLabel"]] = t["sumComplaints"]
        path = RAW / f"complaint-2025-{t['lineCode']}.html"
        for r in parse(path.read_text(encoding="utf-8", errors="replace")):
            names_2025.add(r["name"])
    out = {
        "source": "https://www.pid.pa.gov/scrpts/cmpln_tool",
        "officialUrl": "https://www.pid.pa.gov/scrpts/cmpln_tool",
        "retrievedAt": "2026-09-17T16:55:00Z",
        "reportingYear": 2025,
        "denominator": "Premium as published in the PID Complaint Comparison Tool (also publishes market share)",
        "index_label": "Pennsylvania Insurance Department Complaint Index (source-created)",
        "index_is_not_trust_score": True,
        "complaint_is_not_violation": True,
        "complaint_is_not_enforcement": True,
        "name_only": True,
        "row_total_2025": rows_2025,
        "distinct_names_2025": len(names_2025),
        "sum_complaints_2025": sum_2025,
        "line_rows_2025": line_rows,
        "line_total_complaints_2025": line_complaints,
        "tables": tables,
    }
    (OUT / "complaints-summary.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print("2025 rows", rows_2025, "names", len(names_2025), "sum", sum_2025)


if __name__ == "__main__":
    main()
