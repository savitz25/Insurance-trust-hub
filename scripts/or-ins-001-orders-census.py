#!/usr/bin/env python3
"""Census AdminOrders DFRAction values and case-number prefixes; freeze insurance rows."""
from __future__ import annotations

import json
import re
import ssl
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "oregon" / "or-ins-001"
CTX = ssl.create_default_context()
HDR = {
    "User-Agent": "InsuranceTrustHub OR-INS-001 (public records research)",
    "Accept": "application/json;odata=verbose",
}


def rest(url: str) -> dict:
    req = urllib.request.Request(url, headers=HDR)
    with urllib.request.urlopen(req, context=CTX, timeout=90) as r:
        return json.loads(r.read().decode("utf-8"))


def prefix(case: str | None) -> str:
    if not case:
        return "BLANK"
    m = re.match(r"[A-Za-z]+", case)
    if m:
        return m.group(0).upper()
    return "NUMERIC"


def main() -> None:
    select = (
        "Id,Title,FileLeafRef,FileRef,FSObjType,Modified,Created,"
        "DFRName,DFRCaseNumber,DFRAction,DFRType,DFRDate,DFROrderDate,DFRViolator"
    )
    filt = urllib.parse.quote("FSObjType eq 0")
    url = (
        "https://dfr.oregon.gov/_api/web/lists/getbytitle('AdminOrders')/items"
        f"?$top=5000&$select={select}&$filter={filt}"
    )
    rows: list[dict] = []
    while url:
        data = rest(url)
        d = data["d"]
        rows.extend(d.get("results") or [])
        url = d.get("__next")
        print("fetched", len(rows))

    by_action: dict[str, Counter] = defaultdict(Counter)
    samples: dict[str, list] = defaultdict(list)
    for r in rows:
        act = r.get("DFRAction") or ""
        pref = prefix(r.get("DFRCaseNumber"))
        by_action[act][pref] += 1
        if len(samples[act]) < 3:
            samples[act].append(
                {
                    "name": r.get("DFRName"),
                    "case": r.get("DFRCaseNumber"),
                    "type": r.get("DFRType"),
                    "violator": r.get("DFRViolator"),
                    "file": r.get("FileLeafRef"),
                    "date": r.get("DFRDate") or r.get("DFROrderDate"),
                }
            )

    census = {
        "fileRows": len(rows),
        "actions": {
            act: {
                "n": sum(c.values()),
                "prefixes": c.most_common(),
                "samples": samples[act],
            }
            for act, c in sorted(by_action.items(), key=lambda kv: -sum(kv[1].values()))
        },
    }
    (OUT / "dfr-action-census.json").write_text(json.dumps(census, indent=2), encoding="utf-8")
    for act, info in census["actions"].items():
        print(f"{act!r:40} n={info['n']:4} prefixes={info['prefixes'][:8]}")

    # Source-native insurance-related DFRAction values actually present.
    # Chosen after prefix census: INS-dominant classes plus producer/financial/supervision/marketplace.
    # Explicitly excluded: Mortgage, Securities sales, Debt Management.
    insurance_actions = {
        "Producer",
        "Producer-probationary",
        "Producer-suspension",
        "Producer-vacate suspension",
        "Marketplace violations",
        "Financial-suspension",
        "Financial-other",
        "Financial-supervision",
        "Financial-revocation",
        "Order extending supervision",
        "Order Terminating Supervision",
        "Workers' Comp Billing",
        "Workers’ Comp. Billing",
        "Acquisition Merger",
        "Withdrawal",
        "Enforcement",  # keep only if INS-prefix majority; filtered below
        "Filing",
        "Consent Order",
    }

    slim = []
    for r in rows:
        act = r.get("DFRAction") or ""
        if act not in insurance_actions:
            continue
        pref = prefix(r.get("DFRCaseNumber"))
        # Enforcement/Filing/Consent Order are mixed industry buckets: keep INS* only.
        if act in {"Enforcement", "Filing", "Consent Order"} and pref not in {
            "INS",
            "INSURANCE",
        }:
            continue
        slim.append(
            {
                "id": r.get("Id"),
                "name": r.get("DFRName"),
                "caseNumber": r.get("DFRCaseNumber"),
                "action": act,
                "type": r.get("DFRType"),
                "violator": r.get("DFRViolator"),
                "orderDate": r.get("DFRDate") or r.get("DFROrderDate"),
                "modified": r.get("Modified"),
                "fileRef": r.get("FileRef"),
            }
        )

    cases = {s["caseNumber"] for s in slim if s["caseNumber"]}
    dates = [s["orderDate"] for s in slim if s["orderDate"]]
    payload = {
        "source": "https://dfr.oregon.gov/_api/web/lists/getbytitle('AdminOrders')/items",
        "filter": "FSObjType eq 0; insurance-related source-native DFRAction values; Enforcement/Filing/Consent Order restricted to INS case prefix",
        "documentRows": len(slim),
        "distinctCases": len(cases),
        "actions": Counter(s["action"] for s in slim).most_common(),
        "types": Counter(s["type"] or "" for s in slim).most_common(),
        "prefixes": Counter(prefix(s["caseNumber"]) for s in slim).most_common(),
        "dateMin": min(dates) if dates else None,
        "dateMax": max(dates) if dates else None,
        "excludedActions": ["Mortgage", "Securities sales", "Debt Management"],
        "nameOnly": True,
        "rows": slim,
    }
    (OUT / "dfr-insurance-orders.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("INSURANCE docs", payload["documentRows"], "cases", payload["distinctCases"])
    print("actions", payload["actions"])
    print("prefixes", payload["prefixes"])
    print("dates", payload["dateMin"], payload["dateMax"])


if __name__ == "__main__":
    main()
