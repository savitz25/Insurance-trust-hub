#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import ssl
import time
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "data/pennsylvania/pa-ins-001"
RAW = OUT / "raw"
CTX = ssl.create_default_context()
UA = "PA-INS-001/1.0"
ORG = "commonwealthofpennsylvaniaproductiono8jd9ckm"
TOKEN = "xx4e57cda9-3464-437d-9375-b947ca6b72c8"
ENDPOINT = f"https://{ORG}.org.coveo.com/rest/search/v2"


def http(url: str, data: bytes | None = None, headers: dict | None = None) -> tuple[int, str]:
    req = urllib.request.Request(
        url,
        data=data,
        method="POST" if data else "GET",
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/json",
            **(headers or {}),
        },
    )
    with urllib.request.urlopen(req, timeout=90, context=CTX) as res:
        return getattr(res, "status", 200), res.read().decode("utf-8", errors="replace")


def coveo(payload: dict) -> dict:
    status, body = http(
        ENDPOINT,
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    )
    return json.loads(body)


def strip(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()


def parse_complaint_rows(html: str) -> list[dict]:
    rows = []
    # Typical: company | complaints | premium | index
    for m in re.finditer(r"<tr[^>]*>(.*?)</tr>", html, re.I | re.S):
        cells = [strip(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", m.group(1), re.I | re.S)]
        if len(cells) < 2:
            continue
        if not cells[0] or cells[0].lower() in {"company", "insurer", "name", "naic"}:
            continue
        rows.append({"cells": cells[:8]})
    return rows


def harvest_complaints() -> dict:
    lines = [
        ("HL", "Accident and Health"),
        ("AN", "Annuity"),
        ("PP", "Auto"),
        ("HO", "Homeowners"),
        ("LF", "Life"),
        ("TT", "Title"),
    ]
    years = ["2025", "2024"]
    out = {"source": "https://www.pid.pa.gov/scrpts/cmpln_tool", "retrievedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "tables": []}
    for year in years:
        for code, label in lines:
            payload = urllib.parse.urlencode({"form_year": year, "form_lob": code}).encode()
            print("COMPLAINT", year, label, flush=True)
            status, html = http(
                "https://www.pid.pa.gov/scrpts/cmpln_tool",
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            fname = f"complaint-{year}-{code}.html"
            (RAW / fname).write_text(html, encoding="utf-8")
            rows = parse_complaint_rows(html)
            note = None
            for needle in ["complaint index", "premium", "confirmed", "justified", "closed"]:
                i = html.lower().find(needle)
                if i >= 0:
                    note = strip(html[max(0, i - 60) : i + 220])
                    break
            rec = {
                "year": year,
                "lineCode": code,
                "lineLabel": label,
                "status": status,
                "bytes": len(html),
                "rowCount": len(rows),
                "sample": rows[:5],
                "note": note,
                "file": fname,
            }
            out["tables"].append(rec)
            print(" ", status, "rows", len(rows), "sample", rows[:2], flush=True)
            time.sleep(0.12)
    return out


def discover_exam_hubs() -> dict:
    hubs = [
        "Insurance-Financial Examination Reports",
        "Insurance-Posted Reports",
        "Financial Examination Reports",
        "Insurance-Financial Exams",
        "Insurance-Examination Reports",
        "Posted Reports",
        "Insurance-Regulatory Actions",
    ]
    found = []
    for hub in hubs:
        payload = {"q": "financial examination", "searchHub": hub, "numberOfResults": 5, "firstResult": 0}
        print("HUB TRY", hub, flush=True)
        try:
            data = coveo(payload)
        except Exception as e:
            print(" ERR", e)
            continue
        rec = {
            "hub": hub,
            "totalCount": data.get("totalCount"),
            "sample": [
                {
                    "title": r.get("title"),
                    "uri": r.get("clickUri") or r.get("uri"),
                    "rawKeys": sorted((r.get("raw") or {}).keys())[:40],
                }
                for r in (data.get("results") or [])[:3]
            ],
        }
        found.append(rec)
        print(" ", rec["totalCount"], rec["sample"][0]["title"] if rec["sample"] else None, flush=True)
    # also try empty hub with aq
    payload = {
        "q": "financial examination reports",
        "numberOfResults": 5,
        "firstResult": 0,
        "fieldsToInclude": ["title", "uri", "source", "collection", "syssource", "permanentid"],
    }
    data = coveo(payload)
    found.append(
        {
            "hub": None,
            "q": "financial examination reports",
            "totalCount": data.get("totalCount"),
            "sample": [
                {
                    "title": r.get("title"),
                    "uri": r.get("clickUri") or r.get("uri"),
                    "source": (r.get("raw") or {}).get("source"),
                    "rawKeys": sorted((r.get("raw") or {}).keys())[:40],
                }
                for r in (data.get("results") or [])[:5]
            ],
        }
    )
    return {"discovered": found}


def harvest_financial_if_found(hub: str) -> dict:
    payload = {
        "q": "",
        "searchHub": hub,
        "numberOfResults": 100,
        "firstResult": 0,
        "fieldsToInclude": [
            "title",
            "uri",
            "clickableuri",
            "copapwptitle",
            "copapwpatoz",
            "copapwpyear",
            "copapwpnaic",
            "copapwpissuedate",
            "copapwpstatus",
            "copapwptopic",
        ],
    }
    first = coveo(payload)
    total = int(first.get("totalCount") or 0)
    results = list(first.get("results") or [])
    while len(results) < total:
        payload["firstResult"] = len(results)
        page = coveo(payload)
        batch = page.get("results") or []
        if not batch:
            break
        results.extend(batch)
        print("FIN", len(results), "/", total, flush=True)
        time.sleep(0.1)
    slim = []
    for r in results:
        raw = r.get("raw") or {}
        slim.append(
            {
                "title": r.get("title") or raw.get("copapwptitle"),
                "uri": r.get("clickUri") or r.get("uri"),
                "year": raw.get("copapwpyear"),
                "naic": raw.get("copapwpnaic"),
                "status": raw.get("copapwpstatus"),
                "topic": raw.get("copapwptopic"),
            }
        )
    return {
        "hub": hub,
        "retrievedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "totalCountReported": total,
        "rowsHarvested": len(slim),
        "naicPopulated": sum(1 for r in slim if r.get("naic")),
        "years": dict(Counter(str(r.get("year")) for r in slim)),
        "rows": slim,
    }


def main() -> None:
    complaints = harvest_complaints()
    (OUT / "complaints.json").write_text(json.dumps(complaints, indent=2) + "\n", encoding="utf-8")
    discovered = discover_exam_hubs()
    (OUT / "exam-hub-discovery.json").write_text(json.dumps(discovered, indent=2) + "\n", encoding="utf-8")
    chosen = None
    for rec in discovered["discovered"]:
        if rec.get("hub") and rec.get("totalCount") and rec["hub"] != "Insurance-Regulatory Actions":
            if rec["totalCount"] > 0:
                chosen = rec["hub"]
                break
    if chosen:
        fin = harvest_financial_if_found(chosen)
        (OUT / "financial-exams.json").write_text(json.dumps(fin, indent=2) + "\n", encoding="utf-8")
        print("FINANCIAL", fin["rowsHarvested"], "naic", fin["naicPopulated"])
    else:
        print("NO FINANCIAL HUB")


if __name__ == "__main__":
    main()
