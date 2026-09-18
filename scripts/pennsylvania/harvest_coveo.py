#!/usr/bin/env python3
"""Harvest PID Coveo catalogs (enforcement + liquidation)."""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

ORG = "commonwealthofpennsylvaniaproductiono8jd9ckm"
TOKEN = "xx4e57cda9-3464-437d-9375-b947ca6b72c8"
ENDPOINT = f"https://{ORG}.org.coveo.com/rest/search/v2"
OUTDIR = Path(__file__).resolve().parents[2] / "data/pennsylvania/pa-ins-001"

HUBS = {
    "enforcement": {
        "hub": "Insurance-Regulatory Actions",
        "fields": [
            "title",
            "uri",
            "clickableuri",
            "copapwptitle",
            "copapwpactiontype",
            "copapwpstate",
            "copapwpyear",
            "copapwpatoz",
            "copapwpissuedate",
            "copapwpdocketnumber",
            "copapwpnaic",
            "copapwplicensenumber",
            "copapwpprovidername",
        ],
    },
    "liquidation": {
        "hub": "Insurance-Liquidated and Rehabilitated Companies",
        "fields": [
            "title",
            "uri",
            "clickableuri",
            "copapwptitle",
            "copapwpstatus",
            "copapwptopic",
            "copapwpnaic",
            "copapwpissuedate",
        ],
    },
}


def post(payload: dict) -> dict:
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "PA-INS-001/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode("utf-8"))


def harvest(key: str, spec: dict) -> dict:
    payload = {
        "q": "",
        "searchHub": spec["hub"],
        "numberOfResults": 100,
        "firstResult": 0,
        "fieldsToInclude": spec["fields"],
    }
    first = post(payload)
    total = int(first.get("totalCount") or 0)
    results = list(first.get("results") or [])
    while len(results) < total:
        payload["firstResult"] = len(results)
        page = post(payload)
        batch = page.get("results") or []
        if not batch:
            break
        results.extend(batch)
        print(key, len(results), "/", total, flush=True)
        time.sleep(0.12)
    slim = []
    for r in results:
        raw = r.get("raw") or {}
        slim.append(
            {
                "title": r.get("title") or raw.get("copapwptitle"),
                "uri": r.get("clickUri") or r.get("uri"),
                "actionType": raw.get("copapwpactiontype"),
                "status": raw.get("copapwpstatus"),
                "topic": raw.get("copapwptopic"),
                "year": raw.get("copapwpyear"),
                "naic": raw.get("copapwpnaic"),
                "license": raw.get("copapwplicensenumber"),
                "docket": raw.get("copapwpdocketnumber"),
                "provider": raw.get("copapwpprovidername"),
            }
        )
    return {
        "hub": spec["hub"],
        "retrievedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "totalCountReported": total,
        "rowsHarvested": len(slim),
        "actionTypes": dict(Counter(str(r.get("actionType")) for r in slim)),
        "statuses": dict(Counter(str(r.get("status")) for r in slim)),
        "topics": dict(Counter(str(r.get("topic")) for r in slim)),
        "naicPopulated": sum(1 for r in slim if r.get("naic")),
        "docketPopulated": sum(1 for r in slim if r.get("docket")),
        "rows": slim,
    }


def main() -> None:
    for key, spec in HUBS.items():
        print("HUB", spec["hub"], flush=True)
        data = harvest(key, spec)
        path = OUTDIR / f"{key}-catalog.json"
        path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({k: v for k, v in data.items() if k != "rows"}, indent=2))


if __name__ == "__main__":
    main()
