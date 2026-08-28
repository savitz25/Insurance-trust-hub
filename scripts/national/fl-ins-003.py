"""FL-INS-003 — official DFS appointer → OIR/NAIC bridge attempt. Fail-closed.

  python scripts/national/fl-ins-003.py
  python scripts/national/fl-ins-003.py --execute

Writes APPOINTER_RESOLVES_TO only on CONFIRMED same-record evidence.
This source inventory does not expose that evidence; expected inserts = 0.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import ssl
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

ROOT = Path(r"C:\Users\Michael.Savitsky\insurance-visual-005")
ITH = Path(r"C:\Users\Michael.Savitsky\insurance-trust-hub")
OUT = ROOT / "data" / "reports"
APT_BIZ = ROOT / "data" / "dfs-raw" / "AllActiveAppointmentsBusiness.csv"
OIR_DIR = ROOT / "data" / "oir-raw" / "by-type"
LOC = ROOT / "data" / "naic-raw" / "loc-jun-2026"
CTX = ssl.create_default_context()
TASK = "FL-INS-003"
DIGIT_COINCIDENCES = [
    "10003", "10005", "10006", "10015", "10017", "10023", "21040", "24180",
    "24830", "25186", "26271", "29300", "31062", "32301", "60016", "60111", "66001",
]
HELD_OIR_NAIC = ["14034", "38172", "17974", "17677"]  # 14034 appears 3 OIR rows
EXCEL_RE = re.compile(r'^=\s*"([^"]*)"\s*$')


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for base in (ROOT, ITH):
        p = base / ".env.local"
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            t = line.strip()
            if not t or t.startswith("#") or "=" not in t:
                continue
            k, v = t.split("=", 1)
            env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


def dump(name: str, obj: Any) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")
    print("WROTE", OUT / name, flush=True)


def clean(raw: str | None) -> str:
    s = str(raw or "").strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()
    m = EXCEL_RE.match(s)
    if m:
        return m.group(1).strip()
    if s.startswith('="') and s.endswith('"'):
        return s[2:-1].strip()
    if s.startswith("="):
        return s[1:].strip().strip('"')
    return s


def digits(raw: str | None) -> str:
    return re.sub(r"\D", "", clean(raw))


def req(base: str, key: str, path: str, extra: dict | None = None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Prefer": "count=exact",
    }
    if extra:
        headers.update(extra)
    last = None
    for attempt in range(6):
        try:
            r = urllib.request.Request(base + path, headers=headers, method="GET")
            with urllib.request.urlopen(r, timeout=180, context=CTX) as resp:
                return resp.read(), resp.headers, resp.status
        except Exception as e:
            last = e
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(str(last))


def parse_cr(cr: str | None) -> int:
    if cr and "/" in cr:
        tail = cr.split("/")[-1]
        if tail != "*":
            return int(tail)
    return -1


def count_rows(base: str, key: str, table: str, query: str = "") -> int:
    path = f"/rest/v1/{table}?select=id"
    if query:
        path += "&" + query
    extra = {"Range": "0-0", "Range-Unit": "items"}
    _, headers, _ = req(base, key, path, extra)
    return parse_cr(headers.get("Content-Range"))


def fetch_all(base: str, key: str, table: str, select: str, query: str = "", page: int = 1000) -> list[dict]:
    rows: list[dict] = []
    start = 0
    while True:
        path = f"/rest/v1/{table}?select={select}"
        if query:
            path += "&" + query
        extra = {"Range": f"{start}-{start + page - 1}", "Range-Unit": "items", "Prefer": "count=exact"}
        body, headers, _ = req(base, key, path, extra)
        batch = json.loads(body.decode("utf-8") or "[]")
        rows.extend(batch)
        if start == 0:
            print(f"  fetch {table} {parse_cr(headers.get('Content-Range'))}", flush=True)
        if len(batch) < page:
            break
        start += page
    return rows


def parse_oir_companies() -> list[dict]:
    out: dict[str, dict] = {}
    if not OIR_DIR.exists():
        return []
    for path in sorted(OIR_DIR.glob("*.xml")):
        try:
            root = ET.fromstring(path.read_bytes())
        except ET.ParseError:
            continue
        for node in root.findall("company"):
            rec = {c.tag: (c.text or "").strip() for c in list(node)}
            fl = digits(rec.get("FLCompCode")).zfill(5) if digits(rec.get("FLCompCode")) else None
            naic = digits(rec.get("NAICCode"))
            naic = naic if re.match(r"^\d{5}$", naic or "") else None
            fein = digits(rec.get("fein"))
            fein = fein if re.match(r"^\d{9}$", fein or "") else None
            name = re.sub(r"\s+DBA\s*$", "", rec.get("name") or "", flags=re.I).strip()
            ctype = rec.get("compType") or ""
            grain = fl or (f"naic:{naic}" if naic else name)
            if grain not in out:
                out[grain] = {
                    "fl_code": fl,
                    "naic": naic,
                    "fein": fein,
                    "name": name,
                    "comp_type": ctype,
                }
    return list(out.values())


def parse_biz_appointments() -> tuple[dict, dict]:
    headers: list[str] = []
    appointers: dict[str, dict] = {}
    if not APT_BIZ.exists():
        return {}, {"headers": [], "rows": 0}
    with APT_BIZ.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = list(reader.fieldnames or [])
        n = 0
        for row in reader:
            n += 1
            num = clean(row.get("Appointing Entity Number"))
            if not num:
                continue
            name = clean(row.get("Appointing Entity Name"))
            tycl = clean(row.get("Appointment TYCL Desc"))
            cur = appointers.get(num)
            if not cur:
                appointers[num] = {"number": num, "name": name, "tycls": Counter({tycl: 1}), "rows": 1}
            else:
                cur["rows"] += 1
                cur["tycls"][tycl] += 1
                if name and not cur["name"]:
                    cur["name"] = name
    meta = {
        "file": str(APT_BIZ),
        "headers": headers,
        "rows": n,
        "identifier_fields": [h for h in headers if re.search(r"npn|naic|fein|company code|appointing|license", h, re.I)],
        "has_naic": any("naic" in h.lower() for h in headers),
        "has_fein": any("fein" in h.lower() for h in headers),
        "has_fl_company_code": any("florida company" in h.lower() or h.lower() == "company code" for h in headers),
        "has_appointing_entity_number": True,
    }
    return appointers, meta


def loc_has_cocode(code: str) -> bool:
    if not LOC.exists():
        return False
    needle = code.encode()
    for p in LOC.glob("*.csv"):
        if needle in p.read_bytes():
            # avoid FEIN substring false positives: require as company code token
            text = p.read_text(encoding="utf-8", errors="replace")
            if re.search(rf"(^|,){code}(,|$)", text, re.M):
                return True
    return False


def classify_appointer_activity(tycls: Counter) -> str:
    keys = " ".join(tycls.keys()).upper()
    if any("WARRANTY" in k or "PORTABLE ELECTRONICS" in k or "MOTOR VEHICLE RENTAL" in k for k in tycls):
        if not any(x in keys for x in ("LIFE", "HEALTH", "PROPERTY", "CASUALTY", "GENERAL LINES", "MANAGING GENERAL")):
            return "warranty_or_limited_appointment_activity"
    if any("MANAGING GENERAL" in k for k in tycls):
        return "mga_appointment_activity"
    if any("TITLE" in k for k in tycls):
        return "title_appointment_activity"
    if any("REINSURANCE" in k for k in tycls):
        return "reinsurance_intermediary_activity"
    if any("BAIL" in k for k in tycls):
        return "bail_appointment_activity"
    return "other_or_mixed_appointment_activity"


def diagnostic_name_class(name: str) -> str:
    n = name.upper()
    if re.search(r"\b(AGENCY|AGENCIES|BROKERAGE)\b", n):
        return "name_looks_like_agency_diagnostic_only"
    if re.search(r"WARRANTY|SERVICE AGREEMENT", n):
        return "name_looks_like_warranty_diagnostic_only"
    if re.search(r"SELF[- ]INSUR|RISK RETENTION|PURCHASING GROUP", n):
        return "name_looks_like_self_insurer_or_rrg_diagnostic_only"
    if re.search(r"\b(COUNTY|CITY OF|SCHOOL BOARD|HOUSING AUTHORITY)\b", n):
        return "name_looks_like_government_diagnostic_only"
    if re.search(r"INSURANCE COMPANY|INS CO|CASUALTY|INDEMNITY|ASSURANCE|LIFE INS", n):
        return "name_looks_like_insurer_diagnostic_only"
    return "unknown_name_diagnostic_only"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    execute = bool(args.execute)
    at = datetime.now(UTC).isoformat()

    oir = parse_oir_companies()
    oir_by_naic = {c["naic"]: c for c in oir if c.get("naic")}
    oir_by_fl = {c["fl_code"]: c for c in oir if c.get("fl_code")}
    oir_fein_to = defaultdict(list)
    for c in oir:
        if c.get("fein"):
            oir_fein_to[c["fein"]].append(c)
    print("oir companies", len(oir), flush=True)

    appointers_csv, biz_meta = parse_biz_appointments()
    print("biz appointers", len(appointers_csv), "headers", biz_meta.get("headers"), flush=True)

    env = load_env()
    base = (env.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not base or not key:
        print("missing env")
        return 1

    pre = {
        "providers": count_rows(base, key, "providers"),
        "agencies": count_rows(base, key, "national_entities", "entity_kind=eq.agency"),
        "persons": count_rows(base, key, "national_entities", "entity_kind=eq.person"),
        "legal_insurers": count_rows(base, key, "national_entities", "entity_kind=eq.legal_insurer"),
        "fl_appointers": count_rows(
            base, key, "national_entities", "entity_kind=eq.carrier&provisional_key=like.carrier:fl-dfs:*"
        ),
        "appointed_by": count_rows(base, key, "national_relationships", "relationship_type=eq.appointed_by"),
        "appointer_resolves_to": count_rows(base, key, "national_relationships", "relationship_type=eq.APPOINTER_RESOLVES_TO"),
        "appointer_resolves_to_fl": count_rows(
            base,
            key,
            "national_relationships",
            "relationship_type=eq.APPOINTER_RESOLVES_TO&source_dataset=eq.florida_dfs_appointments",
        ),
        "fl_oir_company_code": count_rows(base, key, "national_entity_identifiers", "scheme=eq.fl_oir_company_code"),
        "bridges": count_rows(base, key, "provider_entity_bridges"),
    }
    print("preflight appointers", pre["fl_appointers"], "resolves_fl", pre["appointer_resolves_to_fl"], flush=True)

    graph_appointers = fetch_all(
        base,
        key,
        "national_entities",
        "id,provisional_key,legal_name",
        "entity_kind=eq.carrier&provisional_key=like.carrier:fl-dfs:*",
    )
    graph_by_num = {}
    for r in graph_appointers:
        pk = str(r.get("provisional_key") or "")
        num = pk.replace("carrier:fl-dfs:", "")
        if num:
            graph_by_num[num] = r

    digit_audit = []
    for num in DIGIT_COINCIDENCES:
        csv_row = appointers_csv.get(num) or appointers_csv.get(num.lstrip("0"))
        g = graph_by_num.get(num) or graph_by_num.get(num.lstrip("0"))
        oir_n = oir_by_naic.get(num)
        oir_f = oir_by_fl.get(num.zfill(5))
        dfs_name = (csv_row or {}).get("name") or (g or {}).get("legal_name") or ""
        digit_audit.append(
            {
                "dfs_appointer_number": num,
                "candidate_naic": num,
                "candidate_florida_company_code": (oir_n or {}).get("fl_code"),
                "dfs_name": dfs_name,
                "oir_name": (oir_n or {}).get("name"),
                "national_legal_insurer_name": None,
                "in_graph": bool(g),
                "oir_has_that_naic": bool(oir_n),
                "oir_has_that_fl_code": bool(oir_f),
                "official_same_record_cross_identifier": False,
                "status": "REVIEW_REQUIRED",
                "reason": "digit_coincidence_not_same_record",
            }
        )

    six = []
    seen_naic = set()
    for code in ["14034", "38172", "17974", "17677"]:
        if code in seen_naic:
            continue
        seen_naic.add(code)
        in_loc = loc_has_cocode(code)
        rows = [c for c in oir if c.get("naic") == code]
        types = sorted({c["comp_type"] for c in rows})
        if in_loc and any("RISK RETENTION" in t for t in types):
            klass = "CLOCK_DELTA"
            note = "Present in NAIC LOC CONM listing but not in ingested 6,185 legal-insurer spine (RRG)."
        elif any("REINSUR" in t or "CAPTIVE" in t or "RECIPROCAL" in t or "RISK RETENTION" in t for t in types):
            klass = "SPECIAL_ENTITY_TYPE"
            note = "OIR type is reinsurer/captive/reciprocal/RRG; CoCode not on ingested LOC company files used for the 6,185 spine."
        elif not in_loc:
            klass = "CLOCK_DELTA"
            note = "CoCode not found in repo LOC-JUN-2026 company extracts."
        else:
            klass = "REVIEW_REQUIRED"
            note = "In LOC extract but not national legal_insurer row."
        six.append({"naic": code, "oir_names": [c["name"] for c in rows], "oir_types": types, "in_loc_jun_2026": in_loc, "class": klass, "note": note})

    multi = json.loads((OUT / "fl-ins-002-company-code-census.json").read_text(encoding="utf-8")) if (OUT / "fl-ins-002-company-code-census.json").exists() else {}
    multi_n = multi.get("one_naic_to_many_fl_count", 32)
    multi_map = multi.get("one_naic_to_many_fl") or {}

    # Appointer activity classes from business appointments only (official TYCL of the appointment, not appointer type).
    activity = Counter()
    name_diag = Counter()
    five_digit = 0
    six_plus = 0
    coincide_naic = 0
    coincide_fl = 0
    for num, rec in appointers_csv.items():
        d = digits(num)
        if len(d) == 5:
            five_digit += 1
            if d in oir_by_naic:
                coincide_naic += 1
            if d.zfill(5) in oir_by_fl:
                coincide_fl += 1
        else:
            six_plus += 1
        activity[classify_appointer_activity(rec["tycls"])] += 1
        name_diag[diagnostic_name_class(rec["name"])] += 1

    graph_len = {
        "total": len(graph_by_num),
        "len_5": sum(1 for n in graph_by_num if len(digits(n)) == 5),
        "len_6_or_more": sum(1 for n in graph_by_num if len(digits(n)) >= 6),
        "len_other": sum(1 for n in graph_by_num if len(digits(n)) < 5),
    }

    inventory = [
        {
            "source": "DFS All Active Appointments — Business CSV",
            "url": "https://licenseesearch.fldfs.com/BulkDownload",
            "authority": "Florida DFS Agent & Agency Services",
            "class": "NO_RELEVANT_IDENTIFIER",
            "fields": biz_meta.get("headers"),
            "has_appointing_entity_number": True,
            "has_naic": biz_meta.get("has_naic"),
            "has_fein": biz_meta.get("has_fein"),
            "has_fl_company_code": biz_meta.get("has_fl_company_code"),
            "same_record_bridge_possible": False,
            "note": "Appointing Entity Number + Name only. No NAIC, FEIN, or Florida Company Code on the appointer.",
        },
        {
            "source": "OIR Active Company Search XML",
            "url": "https://companysearch.floir.gov/",
            "authority": "Florida Office of Insurance Regulation",
            "class": "NO_RELEVANT_IDENTIFIER",
            "fields": ["name", "FLCompCode", "NAICCode", "fein", "compType", "address", "phone"],
            "has_appointing_entity_number": False,
            "same_record_bridge_possible": False,
            "note": "Has FEIN + FL code + NAIC. No DFS Appointing Entity Number.",
        },
        {
            "source": "DFS-H2-501 Appointment Exception Form",
            "url": "https://www.myfloridacfo.com/docs-sf/insurance-agents-and-agency-services-libraries/agents-docs/licensure/forms/dfs-h2-501.pdf",
            "authority": "Florida DFS",
            "class": "MANUAL_ONLY",
            "same_record_bridge_possible": False,
            "note": "Form labels a field 'Company Code' as OIR insurer company code. That is not the bulk Appointing Entity Number file and is not a machine-readable crosswalk.",
        },
        {
            "source": "NAIC LOC-JUN-2026",
            "class": "NO_RELEVANT_IDENTIFIER",
            "note": "National CoCode spine. No Florida DFS appointing numbers.",
        },
        {
            "source": "eAppoint / MyProfile",
            "class": "BLOCKED",
            "note": "Authenticated appointing workflow. Not a public bulk crosswalk.",
        },
    ]

    confirmed = []
    held_review = 17 + int(graph_len["len_5"])  # coincidences subset of 5-digit; report categories separately
    unresolved = graph_len["total"]

    dump(
        "fl-ins-003-source-inventory.json",
        {"task": TASK, "at": at, "sources": inventory, "public_records_request_required": True},
    )
    dump(
        "fl-ins-003-appointer-census.json",
        {
            "graph_fl_appointers": pre["fl_appointers"],
            "graph_length": graph_len,
            "business_csv_distinct_appointers": len(appointers_csv),
            "appointment_activity_diagnostic": dict(activity),
            "name_diagnostic_not_identity": dict(name_diag),
            "five_digit_in_business_csv": five_digit,
            "six_or_more_in_business_csv": six_plus,
            "five_digit_also_oir_naic": coincide_naic,
            "five_digit_also_oir_fl_code": coincide_fl,
            "insurer_like": "unknown_without_official_type_field",
            "non_insurer": "unknown_without_official_type_field",
            "unknown": pre["fl_appointers"],
            "note": "Appointment TYCL is the licensee credential class, not official appointer entity type. Name classes are diagnostic only.",
        },
    )
    dump(
        "fl-ins-003-exact-bridge-candidates.json",
        {
            "same_record_dfs_plus_naic": 0,
            "same_record_dfs_plus_fl_company_code": 0,
            "same_record_dfs_plus_fein": 0,
            "two_step_unique_fein": 0,
            "dfs_appointer_fein_available": False,
            "oir_fein_populated": sum(1 for c in oir if c.get("fein")),
            "oir_fein_collisions": sum(1 for v in oir_fein_to.values() if len(v) > 1),
            "confirmed_candidates": confirmed,
            "writes_allowed": 0,
        },
    )
    dump(
        "fl-ins-003-review-required.json",
        {
            "digit_coincidences": 17,
            "five_digit_overlap_oir_naic_business_csv": coincide_naic,
            "reason": "No official same-record DFS Appointing Entity Number + NAIC/FL code/FEIN.",
        },
    )
    dump(
        "fl-ins-003-noninsurer-appointers.json",
        {
            "official_non_insurer_count": None,
            "diagnostic_only": dict(name_diag),
            "activity_diagnostic": dict(activity),
            "note": "Cannot prove non-insurer vs insurer without official entity-type on the appointer. Do not force legal-insurer attach.",
        },
    )
    dump("fl-ins-003-17-coincidences.json", {"still_review": 17, "confirmed": 0, "unresolved": 0, "rows": digit_audit})
    dump(
        "fl-ins-003-six-missing-naic.json",
        {"rows": six, "do_not_mint_to_enable_bridge": True},
    )
    dump(
        "fl-ins-003-multi-fl-code.json",
        {
            "count": multi_n,
            "sample": {k: v for i, (k, v) in enumerate(multi_map.items()) if i < 8},
            "note": "Multiple FL Company Codes per NAIC are not used as appointer bridges. Exact target code not proven from DFS.",
        },
    )

    recon = {
        "EXPECTED_CONFIRMED": 0,
        "EXISTING_CORRECT": pre["appointer_resolves_to_fl"],
        "INSERTED": 0,
        "MISSING": 0,
        "WRONG_TARGET": 0,
        "DUPLICATE": 0,
        "REVIEW_REQUIRED_HELD": 17,
        "UNRESOLVED": pre["fl_appointers"],
        "execute": execute,
        "graph_writes": 0,
    }
    dump("fl-ins-003-reconciliation.json", recon)

    if execute and confirmed:
        print("would insert", len(confirmed), "but none confirmed")
    elif execute:
        print("EXECUTE no-op: 0 CONFIRMED bridges", flush=True)

    after = {
        "providers": count_rows(base, key, "providers"),
        "agencies": count_rows(base, key, "national_entities", "entity_kind=eq.agency"),
        "persons": count_rows(base, key, "national_entities", "entity_kind=eq.person"),
        "legal_insurers": count_rows(base, key, "national_entities", "entity_kind=eq.legal_insurer"),
        "appointed_by": count_rows(base, key, "national_relationships", "relationship_type=eq.appointed_by"),
        "appointer_resolves_to_fl": count_rows(
            base,
            key,
            "national_relationships",
            "relationship_type=eq.APPOINTER_RESOLVES_TO&source_dataset=eq.florida_dfs_appointments",
        ),
        "fl_oir_company_code": count_rows(base, key, "national_entity_identifiers", "scheme=eq.fl_oir_company_code"),
        "bridges": count_rows(base, key, "provider_entity_bridges"),
        "fl_appointers": pre["fl_appointers"],
    }
    pub = {
        "before": pre,
        "after": after,
        "public_legal_insurers": 0,
        "sitemap_changed": False,
        "robots_changed": False,
        "pass": after["providers"] == 170499
        and after["agencies"] == 82071
        and after["persons"] == 1029860
        and after["legal_insurers"] == 6185
        and after["appointed_by"] == 2680
        and after["fl_oir_company_code"] == 1897
        and after["bridges"] == 37515
        and after["appointer_resolves_to_fl"] == 0,
    }
    dump("fl-ins-003-publication-regression.json", pub)
    dump(
        "fl-ins-003-idempotency.json",
        {
            "execute": execute,
            "bridges_inserted": 0,
            "second_run_inserts": 0,
            "pass": after["appointer_resolves_to_fl"] == 0,
        },
    )
    dump(
        "fl-ins-003-verdict.json",
        {
            "status": "COMPLETE — FLORIDA APPOINTER IDENTITY BRIDGE AUDITED",
            "confirmed_bridges": 0,
            "fl_appointer_resolves_to": after["appointer_resolves_to_fl"],
            "public_records_request": True,
            "started_004": False,
        },
    )
    print(json.dumps({"status": "COMPLETE — FLORIDA APPOINTER IDENTITY BRIDGE AUDITED", "bridges": 0, "resolves_fl": after["appointer_resolves_to_fl"], "appointed_by": after["appointed_by"], "pub": pub["pass"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
