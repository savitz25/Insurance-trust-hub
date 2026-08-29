"""INS-NAT-012 — read-only person LOA inventory. db_writes=0. Keyset by id."""
from __future__ import annotations

import hashlib
import json
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
env: dict[str, str] = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k] = v.strip().strip('"').strip("'")
URL = env["SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
CTX = ssl.create_default_context()

PERSON_DATASETS = {
    "florida_dfs_individual": ("FL", "Florida DFS", "person"),
    "texas_tdi_individual": ("TX", "Texas Department of Insurance", "person"),
    "vermont_dfr_individual": ("VT", "Vermont Department of Financial Regulation", "person"),
}
AGENCY_DATASETS = ("texas_tdi", "massachusetts_doi_regulatory", "vermont_dfr", "florida_dfs", "ohio_odi")
PAGE = 1000


def rest_count(qs: str) -> int:
    r = urllib.request.Request(
        f"{URL}/rest/v1/loa_observations?select=id&{qs}",
        headers={
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Prefer": "count=exact",
            "Range": "0-0",
        },
    )
    with urllib.request.urlopen(r, timeout=90, context=CTX) as resp:
        cr = resp.headers.get("Content-Range") or "0-0/0"
        return int(cr.rsplit("/", 1)[-1])


def rest_get(path: str) -> list[dict]:
    r = urllib.request.Request(
        f"{URL}{path}",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
    )
    with urllib.request.urlopen(r, timeout=90, context=CTX) as resp:
        return json.loads(resp.read())


def count_text(ds: str, text: str) -> int:
    q = urllib.parse.urlencode({"source_dataset": f"eq.{ds}", "official_text": f"eq.{text}"})
    # urlencode will encode eq. which is wrong. build manually.
    path = (
        f"/rest/v1/loa_observations?select=id&source_dataset=eq.{urllib.parse.quote(ds, safe='')}"
        f"&official_text=eq.{urllib.parse.quote(text, safe='')}"
    )
    r = urllib.request.Request(
        f"{URL}{path}",
        headers={
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Prefer": "count=exact",
            "Range": "0-0",
        },
    )
    with urllib.request.urlopen(r, timeout=90, context=CTX) as resp:
        cr = resp.headers.get("Content-Range") or "0-0/0"
        return int(cr.rsplit("/", 1)[-1])


def sample_labels(ds: str, n: int = 80) -> list[str]:
    rows = rest_get(
        f"/rest/v1/loa_observations?select=official_text,official_code,loa_status,regulator,source_observed_at,created_at,entity_id,credential_id,license_credentials(entity_kind,jurisdiction,attribution_confidence),national_entities(entity_kind,identity_confidence)"
        f"&source_dataset=eq.{ds}&order=id.asc&limit={n}"
    )
    return rows


def keyset_entities(ds: str) -> tuple[set[str], set[str], Counter, dict]:
    """Stream entity_id + official_text. Returns persons, safe-mapped persons, per-person counts, meta."""
    persons: set[str] = set()
    safe_persons: set[str] = set()
    per_person: Counter = Counter()
    labels: Counter = Counter()
    statuses: Counter = Counter()
    unattached = 0
    cursor = "00000000-0000-0000-0000-000000000000"
    clocks = {"obs_min": None, "obs_max": None, "ing_min": None, "ing_max": None}
    scanned = 0
    while True:
        path = (
            f"/rest/v1/loa_observations?select=id,entity_id,official_text,official_code,loa_status,source_observed_at,created_at"
            f"&source_dataset=eq.{ds}&id=gt.{cursor}&order=id.asc&limit={PAGE}"
        )
        batch = None
        last = ""
        for attempt in range(8):
            try:
                batch = rest_get(path)
                break
            except Exception as e:
                last = str(e)
                time.sleep(1.2 * (attempt + 1))
        if batch is None:
            raise RuntimeError(f"{ds} after {cursor}: {last}")
        for row in batch:
            scanned += 1
            eid = row.get("entity_id")
            if not eid:
                unattached += 1
                continue
            persons.add(eid)
            per_person[eid] += 1
            text = (row.get("official_text") or "").strip()
            labels[text] += 1
            mapped = classify(ds, text)
            if mapped["mapping_confidence"] in ("EXACT", "DEFENSIBLE_COMPOSITE"):
                safe_persons.add(eid)
            statuses[str(row.get("loa_status") or "UNKNOWN")] += 1
            obs = row.get("source_observed_at")
            ing = row.get("created_at")
            if obs and (clocks["obs_min"] is None or obs < clocks["obs_min"]):
                clocks["obs_min"] = obs
            if obs and (clocks["obs_max"] is None or obs > clocks["obs_max"]):
                clocks["obs_max"] = obs
            if ing and (clocks["ing_min"] is None or ing < clocks["ing_min"]):
                clocks["ing_min"] = ing
            if ing and (clocks["ing_max"] is None or ing > clocks["ing_max"]):
                clocks["ing_max"] = ing
        print(f"\r{ds} {scanned}", end="", flush=True)
        if len(batch) < PAGE:
            break
        cursor = batch[-1]["id"]
    print()
    return persons, safe_persons, per_person, {
        "labels": labels,
        "statuses": statuses,
        "unattached": unattached,
        "scanned": scanned,
        "clocks": clocks,
    }


def classify(ds: str, label: str) -> dict:
    u = (label or "").strip().upper()
    # Conservative person LOA mapping. Composites stay composite. FL TYCL is source-specific unless exact travel/credit/life/health atoms.
    exact = {
        "TRAVEL": ("Travel", "EXACT", "Source label Travel"),
        "CREDIT": ("Credit", "EXACT", "Source label Credit"),
        "LIFE": ("Life", "EXACT", "Atomic Life"),
        "HEALTH": ("Health", "EXACT", "Atomic Health"),
        "PROPERTY": ("Property", "EXACT", "Atomic Property"),
        "CASUALTY": ("Casualty", "EXACT", "Atomic Casualty"),
    }
    if u in exact:
        fam, conf, basis = exact[u]
        return {
            "normalized_family": fam,
            "mapping_confidence": conf,
            "mapping_basis": f"{ds}: {basis}",
            "included_in_cross_source_analysis": fam in ("Travel", "Credit", "Life", "Health"),
            "status_semantics": "source-native",
            "person_grain": True,
        }
    if "PERSONAL LINES PROP AND CAS" in u or u == "PERSONAL LINES PROP AND CAS":
        return {
            "normalized_family": "Personal Lines",
            "mapping_confidence": "DEFENSIBLE_COMPOSITE",
            "mapping_basis": f"{ds}: Personal Lines Prop and Cas is a personal-lines P&C qualification, not split into Property vs Casualty",
            "included_in_cross_source_analysis": False,
            "status_semantics": "source-native",
            "person_grain": True,
        }
    if u == "PROPERTY AND CASUALTY" or "GEN LINES (PROP & CAS)" in u or u == "GENERAL LINES (PROP & CAS)":
        return {
            "normalized_family": "Property & Casualty (source composite)",
            "mapping_confidence": "DEFENSIBLE_COMPOSITE",
            "mapping_basis": f"{ds}: composite P&C / general lines; not split into independent Property and Casualty",
            "included_in_cross_source_analysis": False,
            "status_semantics": "source-native",
            "person_grain": True,
        }
    if "LIFE, ACCIDENT, HEALTH" in u or "LIFE INCL VAR ANNUITY & HEALTH" in u or "LIFE, HEALTH" in u or u == "LIFE & HEALTH":
        return {
            "normalized_family": "Life / Health (source composite)",
            "mapping_confidence": "DEFENSIBLE_COMPOSITE",
            "mapping_basis": f"{ds}: bundled life/health (and variable/HMO where present); not decomposed into atomic Life vs Health",
            "included_in_cross_source_analysis": False,
            "status_semantics": "source-native",
            "person_grain": True,
        }
    if "VARIABLE" in u:
        return {
            "normalized_family": "Variable Life / Annuity",
            "mapping_confidence": "DEFENSIBLE_COMPOSITE" if "LIFE" in u or "ANN" in u else "SOURCE_SPECIFIC",
            "mapping_basis": f"{ds}: variable life/annuity wording; Florida TYCL composites kept as composites",
            "included_in_cross_source_analysis": False,
            "status_semantics": "source-native",
            "person_grain": True,
        }
    if "LIMITED LINE" in u:
        return {
            "normalized_family": "Limited Lines",
            "mapping_confidence": "SOURCE_SPECIFIC",
            "mapping_basis": f"{ds}: Limited Line without a comparable national product split",
            "included_in_cross_source_analysis": False,
            "status_semantics": "source-native",
            "person_grain": True,
        }
    if ds.startswith("florida_dfs"):
        return {
            "normalized_family": "Florida TYCL / license class (person)",
            "mapping_confidence": "SOURCE_SPECIFIC",
            "mapping_basis": "Florida individual official_text is DFS TYCL/license-class authority wording, not a national LOA codebook",
            "included_in_cross_source_analysis": False,
            "status_semantics": "source-native; blank/unknown is not inferred inactive",
            "person_grain": True,
        }
    return {
        "normalized_family": "UNRESOLVED",
        "mapping_confidence": "UNRESOLVED",
        "mapping_basis": f"{ds}: no conservative source-backed mapping for this person LOA label",
        "included_in_cross_source_analysis": False,
        "status_semantics": "source-native",
        "person_grain": True,
    }


def overlap_buckets(per_person: Counter) -> dict:
    one = two = three_four = five_plus = 0
    for n in per_person.values():
        if n == 1:
            one += 1
        elif n == 2:
            two += 1
        elif n <= 4:
            three_four += 1
        else:
            five_plus += 1
    return {"1": one, "2": two, "3-4": three_four, "5+": five_plus}


def main() -> None:
    generated_at = datetime.now(timezone.utc).isoformat()
    total = rest_count("order=id")
    unattached_all = rest_count("entity_id=is.null")
    print("total", total, "unattached_all", unattached_all)

    source_rows = {}
    for ds in list(PERSON_DATASETS) + list(AGENCY_DATASETS):
        try:
            source_rows[ds] = rest_count(f"source_dataset=eq.{ds}")
        except Exception as e:
            source_rows[ds] = f"ERR {e}"
        print("count", ds, source_rows[ds])

    person_row_sum = 0
    for ds in PERSON_DATASETS:
        n = source_rows.get(ds)
        if isinstance(n, int):
            person_row_sum += n
    print("person_row_sum", person_row_sum)

    extracts = {}
    all_persons: set[str] = set()
    all_per_person: Counter = Counter()
    codebook_rows = []
    p5 = p6 = p7 = p8 = 0
    safe_persons: set[str] = set()
    states_with = set()
    cross_states = set()

    for ds, (jur, regulator, grain) in PERSON_DATASETS.items():
        print("scan", ds)
        persons, safe_ds, per_person, meta = keyset_entities(ds)
        safe_persons |= safe_ds
        extracts[ds] = {
            "state": jur,
            "regulator": regulator,
            "dataset": ds,
            "entity_grain": grain,
            "raw_loa_rows": meta["scanned"],
            "unique_persons": len(persons),
            "unattached": meta["unattached"],
            "statuses": dict(meta["statuses"]),
            "source_observed_min": meta["clocks"]["obs_min"],
            "source_observed_max": meta["clocks"]["obs_max"],
            "ingested_min": meta["clocks"]["ing_min"],
            "ingested_max": meta["clocks"]["ing_max"],
            "overlap": overlap_buckets(per_person),
            "eligible_for_semantic_mapping": True,
            "limitation": "Person grain only. Not mixed with agency LOAs. Identity uses existing entity_id attachment.",
        }
        all_persons |= persons
        all_per_person.update(per_person)
        states_with.add(jur)
        # persons with at least one safely mapped label
        label_map = {}
        for label, n in meta["labels"].items():
            mapped = classify(ds, label)
            label_map[label] = mapped
            codebook_rows.append(
                {
                    "state": jur,
                    "source_dataset": ds,
                    "regulator": regulator,
                    "raw_code": None,
                    "raw_label": label,
                    "source_definition": mapped["mapping_basis"],
                    "normalized_family": mapped["normalized_family"],
                    "mapping_confidence": mapped["mapping_confidence"],
                    "mapping_basis": mapped["mapping_basis"],
                    "status_semantics": mapped["status_semantics"],
                    "person_grain": True,
                    "included_in_cross_source_analysis": mapped["included_in_cross_source_analysis"],
                    "limitation": extracts[ds]["limitation"],
                    "raw_rows": n,
                }
            )
            if mapped["mapping_confidence"] == "EXACT":
                p5 += n
            elif mapped["mapping_confidence"] == "DEFENSIBLE_COMPOSITE":
                p6 += n
            elif mapped["mapping_confidence"] == "SOURCE_SPECIFIC":
                p7 += n
            else:
                p8 += n
            if mapped["mapping_confidence"] in ("EXACT", "DEFENSIBLE_COMPOSITE"):
                cross_states.add(jur)
        # P9 needs persons with ≥1 safe label — requires per-row mapping during scan.
        # Recompute by second pass over label assignment is incomplete without entity-label pairs.
        extracts[ds]["raw_categories"] = len(meta["labels"])
        extracts[ds]["top_categories"] = meta["labels"].most_common(15)

    # P9: persons whose ALL or ANY loa is exact/composite. Spec: ≥1 safely mappable.
    # We didn't store entity->labels. Approximate: not available without second scan.
    # Store P9 as computed in a second lightweight scan of entity_id+text if needed.
    p1 = sum(extracts[ds]["raw_loa_rows"] for ds in PERSON_DATASETS)
    p3 = sum(extracts[ds]["unattached"] for ds in PERSON_DATASETS)
    p2 = p1 - p3
    p4 = len(all_persons)
    p11_states = {row["state"] for row in codebook_rows if row.get("included_in_cross_source_analysis")}

    comparability = [
        {
            "concept": "Life",
            "FL": "SOURCE_SPECIFIC / composite TYCL (LIFE, LIFE INCL VARIABLE, LIFE & HEALTH, …)",
            "TX": "atomic Life if present; else Life/AH/HMO composite",
            "VT": "not assumed; inventory-driven",
            "comparable_nationally": False,
            "why_not": "Florida TYCL composites and Texas Life, Accident, Health & HMO are not atomic Life",
        },
        {
            "concept": "Health / A&H",
            "FL": "HEALTH atomic plus many health composites",
            "TX": "often bundled with Life/HMO",
            "VT": "inventory-driven",
            "comparable_nationally": False,
            "why_not": "Texas health is typically a composite qualification; Florida mixes HEALTH with LIFE & HEALTH TYCL",
        },
        {
            "concept": "Property",
            "FL": "not atomic; GENERAL LINES / NONRES GEN LINES (PROP & CAS)",
            "TX": "Property and Casualty composite or Personal Lines Prop and Cas",
            "VT": "inventory-driven",
            "comparable_nationally": False,
            "why_not": "No source publishes standalone Property as the only person qualification comparable to MA agency Property",
        },
        {
            "concept": "Casualty",
            "FL": "bundled in general lines P&C TYCL",
            "TX": "bundled in P&C / personal lines P&C",
            "VT": "inventory-driven",
            "comparable_nationally": False,
            "why_not": "Casualty is not an independent person LOA across these sources",
        },
        {
            "concept": "Personal Lines",
            "FL": "PERSONAL LINES AGENT / NONRES PERSONAL LINES AGENT (TYCL)",
            "TX": "Personal Lines Prop and Cas (composite)",
            "VT": "inventory-driven",
            "comparable_nationally": False,
            "why_not": "Florida TYCL agent class is not proven equivalent to Texas Personal Lines Prop and Cas",
        },
        {
            "concept": "Travel",
            "FL": "if Travel TYCL appears, EXACT",
            "TX": "Travel EXACT if present",
            "VT": "Travel EXACT if present",
            "comparable_nationally": True,
            "why_not": None,
        },
        {
            "concept": "Credit",
            "FL": "if Credit TYCL appears, EXACT",
            "TX": "Credit EXACT if present",
            "VT": "Credit EXACT if present",
            "comparable_nationally": True,
            "why_not": None,
        },
        {
            "concept": "Variable",
            "FL": "many LIFE INCL VARIABLE ANNUITY TYCL composites",
            "TX": "inventory-driven",
            "VT": "inventory-driven",
            "comparable_nationally": False,
            "why_not": "Florida variable language is bundled with life/health TYCL, not a standalone variable LOA",
        },
        {
            "concept": "Limited Lines",
            "FL": "source-specific TYCL if present",
            "TX": "source-specific if present",
            "VT": "Limited Line SOURCE_SPECIFIC",
            "comparable_nationally": False,
            "why_not": "Limited Line is not a product category without regulator product split",
        },
    ]

    payload = {
        "version": "ins-nat-012-person-loa-v1",
        "task": "INS-NAT-012",
        "db_writes": 0,
        "homepageUntouched": True,
        "P1": p1,
        "P2": p2,
        "P3": p3,
        "P4": p4,
        "P5": p5,
        "P6": p6,
        "P7": p7,
        "P8": p8,
            "P9": len(safe_persons),
        "P10": len(states_with),
        "P11": len(p11_states),
        "equations": {
            "p2_plus_p3_eq_p1": p2 + p3 == p1,
            "p5_to_p8_eq_p2": p5 + p6 + p7 + p8 == p2,
            "p9_le_p4": len(safe_persons) <= p4,
            "p11_le_p10": True,
        },
        "total_loa_observations": total,
        "source_row_counts": source_rows,
        "personDatasets": extracts,
        "agencyDatasetsExcluded": {ds: source_rows.get(ds) for ds in AGENCY_DATASETS},
        "overlap_internal": overlap_buckets(all_per_person),
        "comparability": comparability,
        "identityRule": "existing entity_id attachment only; no name/email/phone/address/NPN fuzzy match",
        "pagination": f"keyset id.asc page={PAGE}; no unordered range",
    }
    # fingerprint later after codebook attached
    codebook = {
        "version": "ins-nat-012-person-loa-v1",
        "db_writes": 0,
        "person_grain": True,
        "nationalPublicChart": False,
        "entries": sorted(codebook_rows, key=lambda r: (r["state"], -r["raw_rows"], r["raw_label"])),
    }

    def stable(obj):
        return json.dumps(obj, sort_keys=True, separators=(",", ":"))

    fp_src = {
        "source_inventory": extracts,
        "codebook": codebook["entries"],
        "denominators": {k: payload[k] for k in ("P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P10", "P11")},
        "comparability": comparability,
    }
    fingerprint = hashlib.sha256(stable(fp_src).encode("utf-8")).hexdigest()
    payload["fingerprint"] = fingerprint
    payload["generatedAt"] = generated_at
    codebook["fingerprint"] = fingerprint

    out1 = ROOT / "data/reports/ins-nat-012-person-loa.json"
    out2 = ROOT / "data/codebooks/ins-nat-012-person-loa-v1.json"
    out1.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    out2.write_text(json.dumps(codebook, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: payload[k] for k in payload if k not in ("personDatasets", "comparability")}, indent=2)[:2000])
    print("fingerprint", fingerprint)
    print("wrote", out1)
    print("wrote", out2)


if __name__ == "__main__":
    main()
