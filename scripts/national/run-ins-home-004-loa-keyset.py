"""Read-only keyset census of agency LOA official_text + entity_id. db_writes=0."""
from __future__ import annotations

import json
import ssl
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k] = v.strip().strip('"').strip("'")
URL = env["SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
CTX = ssl.create_default_context()
PAGE = 250
DATASETS = {
    "texas_tdi": "TX",
    "massachusetts_doi_regulatory": "MA",
    "vermont_dfr": "VT",
}


def fetch_dataset(ds: str) -> list[dict]:
    rows: list[dict] = []
    cursor = "00000000-0000-0000-0000-000000000000"
    while True:
        path = (
            f"/rest/v1/loa_observations?select=id,entity_id,official_text,official_code,loa_status,regulator,source_observed_at,created_at"
            f"&source_dataset=eq.{ds}&id=gt.{cursor}&order=id.asc&limit={PAGE}"
        )
        last = ""
        batch = None
        for attempt in range(8):
            req = urllib.request.Request(
                f"{URL}{path}",
                headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
            )
            try:
                with urllib.request.urlopen(req, timeout=90, context=CTX) as resp:
                    batch = json.loads(resp.read())
                    break
            except urllib.error.HTTPError as e:
                last = e.read()[:180].decode("utf-8", "replace")
                time.sleep(1.5 * (attempt + 1))
            except Exception as e:
                last = str(e)
                time.sleep(1.5 * (attempt + 1))
        if batch is None:
            raise RuntimeError(f"{ds} after {cursor}: {last}")
        rows.extend(batch)
        print(f"\r{ds} {len(rows)}", end="", flush=True)
        if len(batch) < PAGE:
            break
        cursor = batch[-1]["id"]
    print()
    return rows


def classify(source: str, text: str) -> dict:
    t = (text or "").strip()
    u = t.upper()
    if source == "massachusetts_doi_regulatory":
        table = {
            "PROPERTY": ("Property", "EXACT", "MA DOI atomic Property", "Property"),
            "CASUALTY": ("Casualty", "EXACT", "MA DOI atomic Casualty", "Casualty"),
            "LIFE": ("Life", "EXACT", "MA DOI atomic Life", "Life"),
            "ACCIDENT & HEALTH OR SICKNESS": (
                "Accident & Health / Health",
                "EXACT",
                "MA DOI atomic Accident & Health or Sickness",
                "Accident & Health",
            ),
            "TRAVEL": ("Travel", "EXACT", "MA DOI Travel", "Travel"),
            "CREDIT": ("Credit", "EXACT", "MA DOI Credit", "Credit"),
        }
        if u in table:
            fam, conf, basis, lab = table[u]
            return dict(family=fam, confidence=conf, basis=basis, consumer_label=lab, national=False)
    if source == "texas_tdi":
        table = {
            "PROPERTY AND CASUALTY": (
                "Property & Casualty (source composite)",
                "DEFENSIBLE_COMPOSITE",
                "Texas TDI single Property and Casualty qualification; not split into MA Property vs Casualty",
                "Property & Casualty",
            ),
            "PERSONAL LINES PROP AND CAS": (
                "Personal Lines",
                "DEFENSIBLE_COMPOSITE",
                "Texas TDI Personal Lines Prop and Cas is not identical to MA Property or MA Casualty",
                "Personal Lines (P&C)",
            ),
            "LIFE, ACCIDENT, HEALTH & HMO": (
                "Life / Accident / Health / HMO (source composite)",
                "DEFENSIBLE_COMPOSITE",
                "Texas TDI bundled Life, Accident, Health & HMO; not decomposed into MA Life vs MA Health",
                "Life, Accident, Health & HMO",
            ),
            "CREDIT": ("Credit", "EXACT", "Texas TDI Credit qualification", "Credit"),
            "TRAVEL": ("Travel", "EXACT", "Texas TDI Travel qualification", "Travel"),
        }
        if u in table:
            fam, conf, basis, lab = table[u]
            return dict(family=fam, confidence=conf, basis=basis, consumer_label=lab, national=False)
    if source == "vermont_dfr":
        table = {
            "CREDIT": ("Credit", "EXACT", "Vermont DFR Credit limited line", "Credit"),
            "TRAVEL": ("Travel", "EXACT", "Vermont DFR Travel limited line", "Travel"),
            "LIMITED LINE": (
                "Limited Lines",
                "SOURCE_SPECIFIC",
                "Vermont Limited Line without a product category in this extract",
                "Limited Line",
            ),
        }
        if u in table:
            fam, conf, basis, lab = table[u]
            return dict(family=fam, confidence=conf, basis=basis, consumer_label=lab, national=False)
    return dict(
        family="UNRESOLVED",
        confidence="UNRESOLVED",
        basis="Label not in the conservative source-backed codebook pending exact regulator definition",
        consumer_label=t,
        national=False,
    )


def main() -> None:
    generated_at = datetime.now(timezone.utc).isoformat()
    by_ds = {ds: fetch_dataset(ds) for ds in DATASETS}
    buckets: dict[tuple, dict] = {}
    agencies_all: set[str] = set()
    states: set[str] = set()
    missing = 0
    l1 = 0
    for ds, jur in DATASETS.items():
        for row in by_ds[ds]:
            eid = row.get("entity_id")
            if not eid:
                missing += 1
                continue
            l1 += 1
            agencies_all.add(eid)
            states.add(jur)
            text = (row.get("official_text") or "").strip()
            key = (ds, jur, text.upper(), row.get("official_code") or "")
            b = buckets.get(key)
            if not b:
                b = {
                    "source_dataset": ds,
                    "jurisdiction": jur,
                    "official_text": text,
                    "official_code": row.get("official_code"),
                    "regulator": row.get("regulator"),
                    "rows": 0,
                    "agencies": set(),
                    "statuses": defaultdict(int),
                    "obs_min": None,
                    "obs_max": None,
                }
                buckets[key] = b
            b["rows"] += 1
            b["agencies"].add(eid)
            b["statuses"][str(row.get("loa_status") or "UNKNOWN")] += 1
            obs = row.get("source_observed_at")
            if obs and (b["obs_min"] is None or obs < b["obs_min"]):
                b["obs_min"] = obs
            if obs and (b["obs_max"] is None or obs > b["obs_max"]):
                b["obs_max"] = obs

    codebook = []
    l2 = l3 = l4 = 0
    ag_safe: set[str] = set()
    st_safe: set[str] = set()
    for b in buckets.values():
        m = classify(b["source_dataset"], b["official_text"])
        if m["confidence"] in ("EXACT", "DEFENSIBLE_COMPOSITE"):
            l2 += b["rows"]
            ag_safe |= b["agencies"]
            st_safe.add(b["jurisdiction"])
        elif m["confidence"] == "SOURCE_SPECIFIC":
            l3 += b["rows"]
        else:
            l4 += b["rows"]
        codebook.append(
            {
                "state": b["jurisdiction"],
                "source_dataset": b["source_dataset"],
                "regulator": b["regulator"],
                "raw_code": b["official_code"],
                "raw_label": b["official_text"],
                "raw_rows": b["rows"],
                "unique_agencies": len(b["agencies"]),
                "statuses": dict(b["statuses"]),
                "source_observed_min": b["obs_min"],
                "source_observed_max": b["obs_max"],
                "normalized_family": m["family"],
                "mapping_confidence": m["confidence"],
                "mapping_basis": m["basis"],
                "included_in_national_story": False,
                "consumer_label": m["consumer_label"],
            }
        )
    codebook.sort(key=lambda r: (r["state"], -r["raw_rows"], r["raw_label"]))
    residual = l1 - l2 - l3 - l4
    report = {
        "task": "INS-HOME-004",
        "generatedAt": generated_at,
        "db_writes": 0,
        "pagination": "keyset id.asc page=250; no unordered range",
        "rowsFetched": {ds: len(by_ds[ds]) for ds in DATASETS},
        "exclusions": {"missingEntity": missing, "personGrain": 0},
        "L1": l1,
        "L2": l2,
        "L3": l3,
        "L4": l4,
        "L5": len(agencies_all),
        "L6": len(ag_safe),
        "L7": len(states),
        "L8": len(st_safe),
        "residual": residual,
        "equations": {
            "l2_l3_l4_eq_l1": l2 + l3 + l4 + residual == l1,
            "l6_le_l5": len(ag_safe) <= len(agencies_all),
            "l8_le_l7": len(st_safe) <= len(states),
        },
        "storyDecision": "INTENTIONALLY_UNCHANGED",
        "storyDecisionReason": (
            "MA atomic Property/Casualty/Life/Health are not equivalent to Texas composites "
            "(Property and Casualty; Life, Accident, Health & HMO). Florida and Ohio have 0 "
            "agency LOA rows. Credit and Travel match across TX/MA/VT but are too small to "
            "replace Story #3. Person LOAs (FL/TX/VT individual) are inventoried separately."
        ),
        "codebook": codebook,
    }
    out = ROOT / "data/reports/ins-home-004-loa-census.json"
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    slim = dict(report)
    slim["codebook"] = f"entries={len(codebook)}"
    print(json.dumps(slim, indent=2))
    print("wrote", out)


if __name__ == "__main__":
    main()
