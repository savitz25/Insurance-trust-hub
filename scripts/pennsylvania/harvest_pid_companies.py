#!/usr/bin/env python3
"""Enumerate PID licensed companies A-Z via official gfsearch BeginX endpoints."""
from __future__ import annotations

import json
import re
import time
import urllib.request
from collections import Counter
from pathlib import Path

UA = "Mozilla/5.0 (compatible; PA-INS-001/1.0; +https://www.insurancetrusthub.com)"
BASE = "https://www.pid.pa.gov/scrpts/gfsearch"
RAW = Path(__file__).resolve().parents[2] / "data/pennsylvania/pa-ins-001/raw"
OUT = Path(__file__).resolve().parents[2] / "data/pennsylvania/pa-ins-001/licensed-companies.json"
ROW_RE = re.compile(
    r"<tr>\s*<td>(\d{5})</td>\s*<td>([A-Z]{2})</td>\s*<td><a href=([^>]+)>([^<]+)</a><!-- Begin([A-Z]) --><!-- Powers ([^>]*) --></td>",
    re.I,
)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as res:
        return res.read().decode("utf-8", "replace")


def parse_companies(html: str, letter: str) -> list[dict]:
    rows = []
    for m in ROW_RE.finditer(html):
        naic, domicile, href, name, begin, powers = m.groups()
        rows.append(
            {
                "naic": naic,
                "domicile": domicile,
                "name": re.sub(r"\s+", " ", name).strip(),
                "href": href.strip().strip("\"'"),
                "letter": begin,
                "powers": [p.strip() for p in powers.split(",") if p.strip()],
            }
        )
    if not rows:
        # fallback looser
        for m in re.finditer(
            r"<td>(\d{5})</td>\s*<td>([A-Z]{2})</td>\s*<td><a href=([^>]+)>([^<]+)</a>",
            html,
            re.I,
        ):
            naic, domicile, href, name = m.groups()
            rows.append(
                {
                    "naic": naic,
                    "domicile": domicile,
                    "name": re.sub(r"\s+", " ", name).strip(),
                    "href": href.strip().strip("\"'"),
                    "letter": letter,
                    "powers": [],
                }
            )
    return rows


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    all_rows = []
    for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        path = RAW / f"companies-{letter}.html"
        if path.is_file() and path.stat().st_size > 10000:
            html = path.read_text(encoding="utf-8", errors="replace")
        else:
            print("GET", letter, flush=True)
            html = fetch(f"{BASE}?level=1&item=Begin{letter}")
            path.write_text(html, encoding="utf-8")
            time.sleep(0.15)
        rows = parse_companies(html, letter)
        print(letter, len(rows), flush=True)
        all_rows.extend(rows)
    by_naic = {}
    for r in all_rows:
        by_naic.setdefault(r["naic"], r)
    powers = Counter()
    for r in all_rows:
        for p in r["powers"]:
            powers[p] += 1
    pa_dom = sum(1 for r in by_naic.values() if r["domicile"] == "PA")
    catalog = {
        "source": "PID Licensed Company Search A-Z gfsearch",
        "officialUrl": "https://www.pid.pa.gov/dsf/gfsearch.html",
        "retrievedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sourceAsOf": None,
        "weeklyRefreshNote": "List is normally refreshed weekly; no explicit as-of date on the page.",
        "letterRows": len(all_rows),
        "distinctNaic": len(by_naic),
        "noNaicRows": sum(1 for r in all_rows if not r.get("naic")),
        "paDomicileDistinctNaic": pa_dom,
        "powerCounts": dict(powers),
        "sample": all_rows[:5],
        "rows": list(by_naic.values()),
    }
    OUT.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in catalog.items() if k not in {"rows", "sample", "powerCounts"}}, indent=2))
    print("powers", powers.most_common(12))


if __name__ == "__main__":
    main()
