#!/usr/bin/env python3
"""Summarize Maine's official active nonresident-producer spreadsheet without exporting PII."""
from collections import Counter
from pathlib import Path
import json
import hashlib
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/maine-ins-001/active-nonresident-producers-2026-08-01.xlsx"
OUTPUT = ROOT / "data/maine-ins-001/summary.json"

workbook = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
sheet = workbook["Export Worksheet"]
rows = 0
license_numbers: set[str] = set()
npns: set[str] = set()
classes: Counter[str] = Counter()
for row in sheet.iter_rows(min_row=2, values_only=True):
    rows += 1
    if row[4] not in (None, ""):
        license_numbers.add(str(row[4]).strip())
    if row[17] not in (None, ""):
        npns.add(str(row[17]).strip())
    classes[str(row[5]).strip() if row[5] else "UNKNOWN"] += 1

summary = {
    "source": "https://www.maine.gov/pfr/insurance/sites/maine.gov.pfr.insurance/files/inline-files/active-nonres-producers.xlsx",
    "source_clock": "Active nonresident producers as of 2026-08-01 (quarterly list)",
    "retrieved_at": "2026-10-12",
    "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "worksheet": sheet.title,
    "license_rows": rows,
    "distinct_license_numbers": len(license_numbers),
    "distinct_npn_identifiers": len(npns),
    "license_rows_by_class": dict(sorted(classes.items())),
    "limitations": [
        "Nonresident producer license slice only; not the complete Maine producer population.",
        "NPN identifiers and license records are separate grains.",
        "No agency, adjuster, surplus-lines, appointment, insurer, or enforcement census is included.",
        "No contact fields or named-person records are emitted by this summary.",
    ],
}
OUTPUT.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
