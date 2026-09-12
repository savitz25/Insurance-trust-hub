#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FP = "3085ccfe7ec30c038fafcfb3e70a11609eeba91a9918c9efe14ceb7f0ef634aa"
snap = json.loads((ROOT / "lib/illinois-intelligence/accepted-snapshot.json").read_text(encoding="utf-8"))
orders = json.loads((ROOT / "data/illinois/il-ins-001/raw/directors-orders.json").read_text(encoding="utf-8"))


def check(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(f"FAIL {msg}")


def dumps(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


body = {k: v for k, v in snap.items() if k not in {"generated_at", "fingerprint"}}
fp = hashlib.sha256(dumps(body).encode("utf-8")).hexdigest()
alt = dict(snap)
alt["generated_at"] = "2099-12-31T23:59:59Z"
alt_body = {k: v for k, v in alt.items() if k not in {"generated_at", "fingerprint"}}
fp_alt = hashlib.sha256(dumps(alt_body).encode("utf-8")).hexdigest()
check(fp == fp_alt, "two generatedAt same hash")
mutated = dict(body)
mutated["directors_orders"] = dict(body["directors_orders"])
mutated["directors_orders"]["observation_rows"] = 2897
fp_mut = hashlib.sha256(dumps(mutated).encode("utf-8")).hexdigest()
check(fp_mut != fp, "semantic mutation changes hash")
check(snap["fingerprint"] == FP == fp, "fingerprint")
check(snap["version"] == "insurance-il-state-intel-v1", "version")
check(snap["company_lookup"]["count"] is None, "company count null")
check(snap["producer_roster"]["count"] is None, "producer null")
check(snap["agency_roster"]["count"] is None, "agency null")
check(snap["complaints"]["count"] is None, "complaints null")
check(snap["directors_orders"]["observation_rows"] == 2896 == orders["observation_rows"], "orders")
check(snap["expansion_ledger"]["NET_NEW_CANONICAL_ORGANIZATIONS"] == 0, "net new")
check(snap["enforcement_attachment"]["EXACT_PROFILE_ATTACHMENTS"] == 0, "attachments")
check(snap["no_illinois_local_pages"] is True, "no local")
print("il-ins-001-tests.py pass", FP[:12])
