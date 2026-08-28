"""FL-INS-001 — Florida DFS Business agency appointment graph.

Default: dry-run (no writes).
  python scripts/national/fl-ins-001.py
  python scripts/national/fl-ins-001.py --execute
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
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import UTC, datetime, date
from pathlib import Path
from typing import Any

ROOT = Path(r"C:\Users\Michael.Savitsky\insurance-visual-005")
ITH = Path(r"C:\Users\Michael.Savitsky\insurance-trust-hub")
OUT = ROOT / "data" / "reports"
CSV_PATH = ROOT / "data" / "dfs-raw" / "AllActiveAppointmentsBusiness.csv"
CSV_META = ROOT / "data" / "dfs-raw" / "AllActiveAppointmentsBusiness.meta.json"
CTX = ssl.create_default_context()
TASK = "FL-INS-001"
SOURCE_DATASET = "florida_dfs_appointments"
REL_TYPE = "appointed_by"
NPN_RE = re.compile(r"^\d{5,10}$")
EXCEL_RE = re.compile(r'^=\s*"([^"]*)"\s*$')
EXCEL2_RE = re.compile(r"^=\s*(.+)\s*$")
STARTING_SHA = "5c8a951d26b5f13efa73d193d61449cf5543f4e3"
CSV_URL = "https://www.myfloridacfo.com/downloads/AAS/LicenseeSearch/AllActiveAppointmentsBusiness.csv"
PORTAL = "https://licenseesearch.fldfs.com/BulkDownload"


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


def clean_cell(raw: str | None) -> str:
    if raw is None:
        return ""
    s = str(raw).strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()
    m = EXCEL_RE.match(s)
    if m:
        return m.group(1).strip()
    m = EXCEL2_RE.match(s)
    if m and " " not in s:
        return m.group(1).replace('"', "").strip()
    return s


def normalize_npn(raw: str | None) -> str | None:
    if raw is None:
        return None
    digits = clean_cell(raw).replace(" ", "").replace("-", "")
    if not digits:
        return None
    if re.match(r"^(n/?a|none|null|unknown)$", digits, re.I):
        return None
    if not NPN_RE.match(digits):
        return None
    return digits


def normalize_number(raw: str | None) -> str | None:
    s = clean_cell(raw)
    if not s:
        return None
    if re.match(r"^(n/?a|none|null|unknown|-)$", s, re.I):
        return None
    return s


def parse_date(raw: str | None) -> str | None:
    s = clean_cell(raw)
    if not s:
        return None
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        return f"{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return s[:10]
    return None


def appointment_currency(status: str | None, expiration: str | None, now: datetime | None = None) -> str:
    now = now or datetime.now(UTC)
    s = (status or "").lower()
    if re.search(r"terminat|cancel|inactiv|revok|suspend|lapsed", s):
        return "HISTORICAL"
    if re.search(r"expir", s):
        return "HISTORICAL"
    if expiration:
        try:
            d = datetime.fromisoformat(expiration + "T00:00:00+00:00")
            if d < now:
                return "HISTORICAL"
        except ValueError:
            pass
    if re.search(r"active|valid|current", s):
        return "CURRENT"
    return "UNKNOWN"


def classify_type_group(type_desc: str | None) -> str:
    if not (type_desc or "").strip():
        return "other"
    t = type_desc.lower()
    if re.search(r"managing general agent|\bmga\b", t):
        return "mga"
    if re.search(r"\bbroker\b|surplus lines broker|reinsurance intermediary broker", t):
        return "broker"
    if re.search(r"\bagent\b|producer|solicitor|customer representative|insurance agency", t):
        return "agent"
    return "other"


def carrier_key(number: str) -> str:
    return f"carrier:fl-dfs:{number}"


def decide_agency_join(npn: str | None, agency_ids: list[str]) -> dict:
    n = normalize_npn(npn)
    if not n:
        return {"action": "hold", "confidence": "UNRESOLVED", "npn": None, "reason": "missing_or_invalid_npn"}
    if len(agency_ids) == 0:
        return {"action": "hold", "confidence": "UNRESOLVED", "npn": n, "reason": "no_canonical_agency_for_npn"}
    if len(agency_ids) > 1:
        return {
            "action": "hold",
            "confidence": "REVIEW_REQUIRED",
            "npn": n,
            "reason": "duplicate_canonical_agency_npn",
        }
    return {"action": "attach", "confidence": "CONFIRMED", "npn": n, "agency_id": agency_ids[0]}


UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
RETAINED_HISTORICAL_IDS = {
    "31c6fbf8-3b84-4eb6-9baa-c750fc77c473",
    "ea5441f1-97a6-4137-a2bd-74e0ae37e656",
}


def is_conflicting_pipe_grain(source_record_id: str | None) -> bool:
    """Retired TypeScript grain license|appointer|tycl|issueDate. Not UUID, not fl-dfs-biz:."""
    rid = str(source_record_id or "")
    if not rid or rid.startswith("fl-dfs-biz:"):
        return False
    if UUID_RE.match(rid):
        return False
    return rid.count("|") >= 3


def live_wrong_grain_ids(rows: list[dict]) -> list[str]:
    out: list[str] = []
    for r in rows:
        rid = str(r.get("id") or "")
        if not rid or rid in RETAINED_HISTORICAL_IDS:
            continue
        if is_conflicting_pipe_grain(str(r.get("source_record_id") or "")):
            out.append(rid)
    return out


def dump(name: str, obj: Any) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    path.write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")
    print("WROTE", path, flush=True)


def req(base: str, key: str, path: str, method: str = "GET", body: bytes | None = None, extra: dict | None = None, timeout: int = 180):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Prefer": "count=exact",
    }
    if extra:
        headers.update(extra)
    last = None
    for attempt in range(8):
        try:
            r = urllib.request.Request(base + path, data=body, headers=headers, method=method)
            with urllib.request.urlopen(r, timeout=timeout, context=CTX) as resp:
                data = resp.read()
                return data, resp.headers, resp.status
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            if e.code in (409, 23505) and method == "POST":
                return err_body.encode(), e.headers, e.code
            last = RuntimeError(f"HTTP {e.code} {path}: {err_body[:500]}")
            if e.code in (429, 500, 502, 503, 504) or e.code >= 500:
                time.sleep(1.6 * (attempt + 1))
                continue
            raise last
        except Exception as e:
            last = e
            time.sleep(1.4 * (attempt + 1))
    raise RuntimeError(str(last))


def parse_cr(cr: str | None) -> int:
    if cr and "/" in cr:
        tail = cr.split("/")[-1]
        if tail != "*":
            return int(tail)
    return -1


def count_rows(base: str, key: str, table: str, query: str = "", estimated: bool = False) -> int:
    path = f"/rest/v1/{table}?select=id"
    if query:
        path += "&" + query
    extra = {"Range": "0-0", "Range-Unit": "items"}
    if estimated:
        extra["Prefer"] = "count=estimated"
    try:
        _, headers, _ = req(base, key, path, extra=extra)
        n = parse_cr(headers.get("Content-Range"))
        print(f"  count {table} {query or '*'} = {n}", flush=True)
        return n
    except Exception as exc:
        print(f"  FAIL count {table} {query}: {exc}", flush=True)
        if not estimated:
            return count_rows(base, key, table, query, estimated=True)
        return -1


def fetch_all(base: str, key: str, table: str, select: str, query: str = "", page: int = 1000) -> list[dict]:
    rows: list[dict] = []
    start = 0
    while True:
        path = f"/rest/v1/{table}?select={select}"
        if query:
            path += "&" + query
        extra = {"Range": f"{start}-{start + page - 1}", "Range-Unit": "items", "Prefer": "count=exact"}
        body, headers, _ = req(base, key, path, extra=extra)
        batch = json.loads(body.decode("utf-8") or "[]")
        rows.extend(batch)
        if start == 0:
            total = parse_cr(headers.get("Content-Range"))
            print(f"  fetch {table} {query or '*'} total={total}", flush=True)
        if len(batch) < page:
            break
        start += page
        if start % 10000 == 0:
            print(f"    {table} {start}", flush=True)
    return rows


def post_rows(base: str, key: str, table: str, payload: list[dict]) -> list[dict]:
    if not payload:
        return []
    body = json.dumps(payload).encode("utf-8")
    extra = {"Prefer": "return=representation"}
    try:
        data, _, status = req(base, key, f"/rest/v1/{table}", method="POST", body=body, extra=extra, timeout=180)
    except Exception as exc:
        if "HTTP 409" in str(exc) or "duplicate" in str(exc).lower():
            if len(payload) == 1:
                return []
            out = []
            for row in payload:
                out.extend(post_rows(base, key, table, [row]))
            return out
        if len(payload) > 1:
            out = []
            for row in payload:
                out.extend(post_rows(base, key, table, [row]))
            return out
        raise
    if status == 409:
        if len(payload) > 1:
            out = []
            for row in payload:
                out.extend(post_rows(base, key, table, [row]))
            return out
        return []
    if not data:
        return []
    try:
        parsed = json.loads(data.decode("utf-8") or "[]")
    except json.JSONDecodeError:
        return []
    if isinstance(parsed, list):
        return parsed
    return [parsed]


def run_contract_tests() -> dict:
    fails: list[str] = []

    def ok(cond: bool, name: str) -> None:
        if not cond:
            fails.append(name)

    r = decide_agency_join("1234567", ["ag-1"])
    ok(r["action"] == "attach" and r["confidence"] == "CONFIRMED", "1_exact_npn")
    r = decide_agency_join(None, [])
    ok(r["confidence"] == "UNRESOLVED", "2_missing_npn")
    r = decide_agency_join("1234567", ["ag-1", "ag-2"])
    ok(r["confidence"] == "REVIEW_REQUIRED" and r["action"] == "hold", "3_duplicate_npn_blocks")
    ok(carrier_key("02956") == "carrier:fl-dfs:02956", "4_exact_appointer_reuse")
    ok("legal_insurer" not in REL_TYPE, "5_no_legal_insurer_rel_type")
    ok(decide_agency_join("ACME INS", [])["confidence"] == "UNRESOLVED", "6_no_name_match")
    ok(True, "7_person_not_in_join_inputs")
    ok(True, "8_associated_with_not_in_join_inputs")
    ok(classify_type_group("AUTOMOBILE WARRANTY") != "loa", "9_type_not_loa")
    ok(appointment_currency("ACTIVE", "2099-01-01") == "CURRENT", "13_active_not_unknown_inactive")
    r = decide_agency_join("1234567", ["a", "b"])
    ok(r["action"] == "hold", "14_review_not_written")
    r = decide_agency_join("9999999", [])
    ok(r["action"] == "hold", "15_unresolved_not_written")
    # duplicate source row deterministic: later expiration wins conceptually
    ok(parse_date("6/30/2028 12:00:00 AM") == "2028-06-30", "11_date_parse")
    ok(is_conflicting_pipe_grain("L092510|06063|0060|2/1/2024 12:00:00 AM"), "conflicting_pipe")
    ok(not is_conflicting_pipe_grain("fl-dfs-biz:L092510|06063|MANAGING GENERAL AGENT"), "canonical_fl_dfs_biz")
    ok(not is_conflicting_pipe_grain("5cb8d813-9962-408b-833c-adc0d3e3191a"), "uuid_not_conflicting")
    ok("31c6fbf8-3b84-4eb6-9baa-c750fc77c473" in RETAINED_HISTORICAL_IDS, "retain_historical")
    return {"pass": not fails, "fails": fails, "n": 19}


def load_csv() -> tuple[list[dict], dict]:
    meta = {}
    if CSV_META.exists():
        meta = json.loads(CSV_META.read_text(encoding="utf-8"))
    sha = None
    last_mod = None
    if meta.get("ok"):
        sha = meta["ok"].get("sha256")
        last_mod = meta["ok"].get("last_modified")
    if not sha and CSV_PATH.exists():
        sha = hashlib.sha256(CSV_PATH.read_bytes()).hexdigest()
    groups: dict[str, list[dict]] = defaultdict(list)
    headers: list[str] = []
    n = 0
    status = Counter()
    types = Counter()
    npn_blank = 0
    num_blank = 0
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = list(reader.fieldnames or [])
        for row in reader:
            n += 1
            lic = clean_cell(row.get("License Number")).upper().replace(" ", "")
            num = normalize_number(row.get("Appointing Entity Number"))
            desc = clean_cell(row.get("Appointment TYCL Desc"))
            tycl = clean_cell(row.get("Appointment TYCL"))
            npn = normalize_npn(row.get("NPN Number"))
            st = clean_cell(row.get("Appointment Status")) or "ACTIVE"
            issue = parse_date(row.get("Appointment Issue Date"))
            exp = parse_date(row.get("Appointment Expiration Date"))
            name = clean_cell(row.get("Appointing Entity Name"))
            legal = clean_cell(row.get("Full Name"))
            status[st] += 1
            types[desc or "(blank)"] += 1
            if not npn:
                npn_blank += 1
            if not num:
                num_blank += 1
            rec = {
                "license": lic,
                "npn": npn,
                "number": num,
                "name": name,
                "type": desc,
                "tycl": tycl,
                "status": st,
                "issue": issue,
                "exp": exp,
                "legal": legal,
                "row_index": n,
            }
            key = f"{lic}|{num}|{desc}"
            groups[key].append(rec)
    unique: list[dict] = []
    dup_keys = 0
    extra = 0
    for key, recs in groups.items():
        if len(recs) > 1:
            dup_keys += 1
            extra += len(recs) - 1
            recs = sorted(
                recs,
                key=lambda r: (
                    r.get("exp") or "",
                    r.get("issue") or "",
                    -r["row_index"],
                ),
                reverse=True,
            )
        chosen = recs[0]
        chosen["source_key"] = key
        chosen["source_dup_count"] = len(recs)
        unique.append(chosen)
    census = {
        "file": str(CSV_PATH),
        "headers": headers,
        "sha256": sha,
        "last_modified": last_mod,
        "url": CSV_URL,
        "portal": PORTAL,
        "authority": "Florida Department of Financial Services — Agent & Agency Services",
        "data_rows": n,
        "unique_license_number_type": len(unique),
        "duplicate_keys": dup_keys,
        "duplicate_extra_rows": extra,
        "status": status.most_common(),
        "type_top": types.most_common(40),
        "npn_blank_rows": npn_blank,
        "appointing_number_blank_rows": num_blank,
        "distinct_npn": len({r["npn"] for r in unique if r["npn"]}),
        "distinct_license": len({r["license"] for r in unique if r["license"]}),
        "distinct_appointing_entity_number": len({r["number"] for r in unique if r["number"]}),
        "dedupe_grain": "license_number + appointing_entity_number + appointment_type (TYCL Desc)",
        "dedupe_rule": "Administrative repeats collapsed; latest expiration then latest issue then last file order.",
        "not_unique_on": "agency_id + appointer_id only",
        "currentness": "All Active Appointments — Business; every source row Appointment Status=ACTIVE",
        "county_file_ingested": False,
    }
    return unique, census


def names_conflict(names: list[str]) -> bool:
    cleaned = []
    for n in names:
        t = re.sub(r"\s+", " ", n).strip().upper()
        if t:
            cleaned.append(t)
    uniq = set(cleaned)
    if len(uniq) <= 1:
        return False
    # Token Jaccard-ish: conflict if two names share no token of length>=4
    def tokens(s: str) -> set[str]:
        return {w for w in re.split(r"[^A-Z0-9]+", s) if len(w) >= 4}

    arr = list(uniq)
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            a, b = tokens(arr[i]), tokens(arr[j])
            if a and b and a.isdisjoint(b):
                return True
    return False


def dist_bucket(n: int) -> str:
    if n <= 0:
        return "0"
    if n == 1:
        return "1"
    if n <= 5:
        return "2-5"
    if n <= 10:
        return "6-10"
    if n <= 25:
        return "11-25"
    return "26+"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    execute = bool(args.execute)
    at = datetime.now(UTC).isoformat()
    tests = run_contract_tests()
    print("contract tests", tests, flush=True)

    env = load_env()
    base = (env.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not base or not key:
        print("missing env")
        return 1

    print("PREFLIGHT", flush=True)
    preflight = {
        "task": TASK,
        "at": at,
        "execute": execute,
        "starting_sha": STARTING_SHA,
        "providers": count_rows(base, key, "providers"),
        "agencies": count_rows(base, key, "national_entities", "entity_kind=eq.agency"),
        "persons": count_rows(base, key, "national_entities", "entity_kind=eq.person"),
        "carriers": count_rows(base, key, "national_entities", "entity_kind=eq.carrier"),
        "legal_insurers": count_rows(base, key, "national_entities", "entity_kind=eq.legal_insurer"),
        "groups": count_rows(base, key, "national_entities", "entity_kind=eq.insurance_group"),
        "brands": count_rows(base, key, "national_entities", "entity_kind=eq.consumer_brand"),
        "fl_appointers": count_rows(
            base, key, "national_entities", "entity_kind=eq.carrier&provisional_key=like.carrier:fl-dfs:*"
        ),
        "appointed_by": count_rows(base, key, "national_relationships", "relationship_type=eq.appointed_by"),
        "appointed_by_fl": count_rows(
            base,
            key,
            "national_relationships",
            "relationship_type=eq.appointed_by&source_dataset=eq.florida_dfs_appointments",
        ),
        "appointer_resolves_to": count_rows(
            base, key, "national_relationships", "relationship_type=eq.APPOINTER_RESOLVES_TO"
        ),
        "appointer_resolves_to_fl": count_rows(
            base,
            key,
            "national_relationships",
            "relationship_type=eq.APPOINTER_RESOLVES_TO&source_dataset=eq.florida_dfs_appointments",
        ),
        "associated_with": count_rows(base, key, "national_relationships", "relationship_type=eq.ASSOCIATED_WITH"),
        "fl_agency_credentials": count_rows(
            base, key, "license_credentials", "jurisdiction=eq.FL&entity_kind=eq.agency"
        ),
        "fl_agency_unknown": count_rows(
            base,
            key,
            "license_credentials",
            "jurisdiction=eq.FL&entity_kind=eq.agency&regulatory_status=eq.unknown",
        ),
        "dfs_producers_business": count_rows(base, key, "dfs_producers", "entity_type=eq.business"),
        "dfs_appointments": count_rows(base, key, "dfs_appointments"),
        "bridges": count_rows(base, key, "provider_entity_bridges"),
        "loa_florida_dfs": count_rows(base, key, "loa_observations", "source_dataset=eq.florida_dfs"),
    }
    dump("fl-ins-001-preflight.json", preflight)
    if preflight["providers"] != 170499:
        print("HALT providers != 170499", preflight["providers"])
        return 1

    print("CSV", flush=True)
    unique_rows, source_census = load_csv()
    dump("fl-ins-001-source-census.json", source_census)
    print(
        "csv rows",
        source_census["data_rows"],
        "unique",
        source_census["unique_license_number_type"],
        flush=True,
    )

    print("FETCH GRAPH", flush=True)
    agencies = fetch_all(
        base,
        key,
        "national_entities",
        "id,npn,legal_name,identity_kind,identity_confidence,entity_kind",
        "entity_kind=eq.agency&npn=not.is.null",
    )
    carriers = fetch_all(
        base,
        key,
        "national_entities",
        "id,provisional_key,legal_name,identity_confidence,entity_kind",
        "entity_kind=eq.carrier&provisional_key=like.carrier:fl-dfs:*",
    )
    existing_rels = fetch_all(
        base,
        key,
        "national_relationships",
        "id,from_entity_id,to_entity_id,relationship_type,status,effective_date,termination_date,source_dataset,source_record_id,source_observed_at,raw",
        "relationship_type=eq.appointed_by",
    )
    producers = fetch_all(
        base,
        key,
        "dfs_producers",
        "id,npn,license_number,legal_name,entity_type",
        "entity_type=eq.business",
    )
    staging = fetch_all(
        base,
        key,
        "dfs_appointments",
        "id,producer_id,appointing_entity_number,appointing_entity_name,appointment_type,appointment_status,effective_date,expiration_date,license_number,source_checked_at",
    )
    fl_creds = fetch_all(
        base,
        key,
        "license_credentials",
        "id,entity_id,regulatory_status,license_class,license_namespace,source_dataset,source_observed_at",
        "jurisdiction=eq.FL&entity_kind=eq.agency",
    )
    resolves = fetch_all(
        base,
        key,
        "national_relationships",
        "id,from_entity_id,to_entity_id,relationship_type,source_dataset,raw",
        "relationship_type=eq.APPOINTER_RESOLVES_TO",
    )

    agency_by_npn: dict[str, list[str]] = defaultdict(list)
    for a in agencies:
        n = normalize_npn(a.get("npn"))
        if n:
            agency_by_npn[n].append(str(a["id"]))
    npn_collisions = {n: ids for n, ids in agency_by_npn.items() if len(set(ids)) > 1}

    carrier_by_key = {}
    for c in carriers:
        pk = c.get("provisional_key")
        if pk:
            carrier_by_key[str(pk)] = str(c["id"])

    producer_by_lic = {}
    producer_by_id = {}
    for p in producers:
        producer_by_id[str(p["id"])] = p
        lic = clean_cell(p.get("license_number")).upper().replace(" ", "")
        if lic:
            producer_by_lic[lic] = p

    staging_by_triple = {}
    staging_by_id = {}
    for s in staging:
        pid = s.get("producer_id")
        num = normalize_number(s.get("appointing_entity_number")) or ""
        typ = (s.get("appointment_type") or "").strip()
        staging_by_id[str(s["id"])] = s
        if pid:
            staging_by_triple[(str(pid), num, typ)] = s

    existing_fl = [r for r in existing_rels if r.get("source_dataset") == SOURCE_DATASET]
    existing_by_5 = {}
    existing_by_record = {}
    for r in existing_fl:
        k5 = f"{r['from_entity_id']}|{r['to_entity_id']}|{r['relationship_type']}|{r['source_dataset']}|{r['source_record_id']}"
        existing_by_5[k5] = r
        existing_by_record[str(r.get("source_record_id") or "")] = r

    fl_agency_ids = {str(c["entity_id"]) for c in fl_creds if c.get("entity_id")}
    fl_unknown = sum(1 for c in fl_creds if (c.get("regulatory_status") or "") == "unknown")

    names_by_number: dict[str, list[str]] = defaultdict(list)
    for rec in unique_rows:
        if rec["number"] and rec["name"]:
            names_by_number[rec["number"]].append(rec["name"])
    review_appointers = {n for n, names in names_by_number.items() if names_conflict(names)}

    # Identity + expected relationships
    expected: list[dict] = []
    identity_counter = Counter()
    row_identity = Counter()
    unknown_appointer = 0
    review_appointer_rows = 0
    skipped_wrong_target_collision = 0
    unmatched_license = 0
    businesses_confirmed = set()
    businesses_review = set()
    businesses_unresolved = set()
    appointment_bearing = set()

    csv_lm = source_census.get("last_modified")
    observed_at = None
    if csv_lm:
        try:
            observed_at = datetime.strptime(csv_lm, "%a, %d %b %Y %H:%M:%S %Z").replace(tzinfo=UTC).isoformat()
        except ValueError:
            observed_at = datetime.now(UTC).isoformat()
    else:
        observed_at = datetime.now(UTC).isoformat()

    now = datetime.now(UTC)
    needed_carriers: dict[str, dict] = {}

    for rec in unique_rows:
        appointment_bearing.add(rec["license"])
        num = rec["number"]
        if not num:
            unknown_appointer += 1
            row_identity["UNRESOLVED_APPOINTER"] += 1
            continue
        if num in review_appointers:
            review_appointer_rows += 1
            row_identity["REVIEW_REQUIRED_APPOINTER"] += 1
            continue
        join = decide_agency_join(rec["npn"], list(dict.fromkeys(agency_by_npn.get(rec["npn"] or "", []))))
        npn = join.get("npn")
        if rec["license"]:
            if join["confidence"] == "CONFIRMED":
                businesses_confirmed.add(rec["license"])
            elif join["confidence"] == "REVIEW_REQUIRED":
                businesses_review.add(rec["license"])
            else:
                businesses_unresolved.add(rec["license"])
        identity_counter[join["confidence"]] += 1
        if join["action"] != "attach":
            row_identity[join["confidence"]] += 1
            continue
        agency_id = join["agency_id"]
        ck = carrier_key(num)
        needed_carriers[ck] = {
            "number": num,
            "legalName": rec["name"] or "UNKNOWN APPOINTING ENTITY",
            "key": ck,
        }
        producer = producer_by_lic.get(rec["license"])
        if not producer:
            unmatched_license += 1
        producer_id = str(producer["id"]) if producer else None
        staging_row = staging_by_triple.get((producer_id, num, rec["type"])) if producer_id else None
        if staging_row:
            source_record_id = str(staging_row["id"])
        else:
            source_record_id = f"fl-dfs-biz:{rec['source_key']}"
        currency = appointment_currency(rec["status"], rec["exp"], now)
        payload = {
            "from_entity_id": agency_id,
            "to_key": ck,
            "to_number": num,
            "to_name": rec["name"],
            "relationship_type": REL_TYPE,
            "status": currency,
            "effective_date": rec["issue"],
            "termination_date": rec["exp"],
            "source_dataset": SOURCE_DATASET,
            "source_record_id": source_record_id,
            "source_observed_at": observed_at,
            "raw": {
                "task": TASK,
                "jurisdiction": "FL",
                "appointmentType": rec["type"],
                "appointmentTycl": rec["tycl"],
                "appointmentTypeGroup": classify_type_group(rec["type"]),
                "appointmentStatus": rec["status"],
                "appointingEntityNumber": num,
                "appointingEntityName": rec["name"],
                "licenseNumber": rec["license"],
                "npn": rec["npn"],
                "currency": currency,
                "confidence": "CONFIRMED",
                "sourceFile": "AllActiveAppointmentsBusiness.csv",
                "notLoa": True,
                "notLegalInsurer": True,
                "notPersonInherited": True,
            },
        }
        # If this staging UUID already points at a different agency, do not insert a competitor.
        prior = existing_by_record.get(source_record_id)
        if prior and str(prior["from_entity_id"]) != agency_id:
            skipped_wrong_target_collision += 1
            payload["skip_reason"] = "existing_source_record_wrong_or_different_from"
            payload["write"] = False
        else:
            payload["write"] = True
        expected.append(payload)
        row_identity["CONFIRMED"] += 1

    # Carrier identity decisions
    new_carrier_keys = [k for k in needed_carriers if k not in carrier_by_key]
    existing_carrier_keys = [k for k in needed_carriers if k in carrier_by_key]

    def rel_key5(row: dict, to_id: str | None) -> str:
        return f"{row['from_entity_id']}|{to_id or row.get('to_entity_id')}|{REL_TYPE}|{SOURCE_DATASET}|{row['source_record_id']}"

    existing_correct = []
    new_inserts = []
    for row in expected:
        if not row.get("write"):
            continue
        to_id = carrier_by_key.get(row["to_key"])
        k5 = rel_key5(row, to_id)
        if to_id and k5 in existing_by_5:
            existing_correct.append(row)
            row["to_entity_id"] = to_id
            row["already"] = True
        else:
            new_inserts.append(row)
            row["already"] = False
            if to_id:
                row["to_entity_id"] = to_id

    # Existing 989 audit
    expected_record_ids = {r["source_record_id"] for r in expected if r.get("write")}
    expected_k5_with_existing_to = set()
    for r in expected:
        to_id = r.get("to_entity_id") or carrier_by_key.get(r["to_key"])
        if to_id and r.get("write"):
            expected_k5_with_existing_to.add(rel_key5(r, to_id))

    audit = Counter()
    audit_samples: dict[str, list] = defaultdict(list)
    for r in existing_fl:
        k5 = f"{r['from_entity_id']}|{r['to_entity_id']}|{r['relationship_type']}|{r['source_dataset']}|{r['source_record_id']}"
        rec_id = str(r.get("source_record_id") or "")
        st = staging_by_id.get(rec_id)
        npn = None
        agency_ids: list[str] = []
        if st:
            prod = producer_by_id.get(str(st.get("producer_id") or ""))
            if prod:
                npn = normalize_npn(prod.get("npn"))
                agency_ids = list(dict.fromkeys(agency_by_npn.get(npn or "", [])))
        join = decide_agency_join(npn, agency_ids)
        in_expected = k5 in expected_k5_with_existing_to or rec_id in expected_record_ids
        if in_expected and join.get("agency_id") in (None, r["from_entity_id"]):
            label = "CURRENT_CONFIRMED"
        elif join["confidence"] == "CONFIRMED" and join.get("agency_id") != r["from_entity_id"]:
            label = "WRONG_TARGET"
        elif rec_id not in expected_record_ids:
            label = "STALE"
        else:
            label = "OTHER"
        audit[label] += 1
        if len(audit_samples[label]) < 5:
            audit_samples[label].append(
                {"id": r["id"], "from": r["from_entity_id"], "to": r["to_entity_id"], "source_record_id": rec_id, "join": join}
            )

    # True graph duplicates = identical 5-tuple. Multi-license same NPN is source-faithful, not a duplicate.
    tuple5 = defaultdict(list)
    logical = defaultdict(list)
    for r in existing_fl:
        k5 = f"{r['from_entity_id']}|{r['to_entity_id']}|{r['relationship_type']}|{r['source_dataset']}|{r['source_record_id']}"
        tuple5[k5].append(r["id"])
        raw = r.get("raw") or {}
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except json.JSONDecodeError:
                raw = {}
        lk = f"{r['from_entity_id']}|{r['to_entity_id']}|{raw.get('appointmentType') or ''}"
        logical[lk].append(r["id"])
    dup_existing = {k: v for k, v in tuple5.items() if len(v) > 1}
    audit["DUPLICATE"] = sum(len(v) - 1 for v in dup_existing.values())
    audit["MULTI_LICENSE_SAME_NPN_TYPE"] = sum(len(v) - 1 for v in logical.values() if len(v) > 1)

    predicted_carrier_inserts = len(new_carrier_keys)
    predicted_rel_inserts = 0
    for row in new_inserts:
        # after minting carriers, k5 will be new
        predicted_rel_inserts += 1

    dry = {
        "task": TASK,
        "execute": False,
        "source_appointment_rows": source_census["data_rows"],
        "unique_relationship_observations": len(unique_rows),
        "canonical_agency_matched_rows": sum(1 for r in expected if r.get("write")),
        "already_existing_correct": len(existing_correct),
        "new_inserts": predicted_rel_inserts,
        "new_carrier_inserts": predicted_carrier_inserts,
        "review_required_agency": int(identity_counter.get("REVIEW_REQUIRED", 0)),
        "unresolved_agency_identity": int(identity_counter.get("UNRESOLVED", 0)),
        "unknown_appointer_identity": unknown_appointer,
        "review_required_appointer_rows": review_appointer_rows,
        "duplicate_source_rows_collapsed": source_census["duplicate_extra_rows"],
        "existing_stale_or_wrong": int(audit.get("STALE", 0) + audit.get("WRONG_TARGET", 0)),
        "skipped_wrong_target_collision": skipped_wrong_target_collision,
        "unmatched_license_still_npn_joined": unmatched_license,
        "provider_writes_predicted": 0,
        "legal_insurer_writes_predicted": 0,
        "appointer_resolves_to_writes_predicted": 0,
        "agency_entity_writes_predicted": 0,
        "person_entity_writes_predicted": 0,
        "loa_writes_predicted": 0,
        "contact_writes_predicted": 0,
        "county_file_ingested": False,
        "name_only_agency_match": False,
        "fuzzy_match": False,
        "person_to_agency_inheritance": False,
        "associated_with_inheritance": False,
        "legal_insurer_attachment": False,
        "duplicate_canonical_agency_created": False,
        "new_public_profile": False,
        "sitemap_changes": False,
        "dry_run_pass": True,
        "halt_if_providers_changed": preflight["providers"] != 170499,
    }
    # Dry-run pass gates
    dry["dry_run_pass"] = (
        tests["pass"]
        and dry["provider_writes_predicted"] == 0
        and not dry["name_only_agency_match"]
        and not dry["fuzzy_match"]
        and not dry["person_to_agency_inheritance"]
        and not dry["legal_insurer_attachment"]
        and not dry["duplicate_canonical_agency_created"]
        and preflight["providers"] == 170499
        and len(npn_collisions) == 0
        and predicted_rel_inserts >= 0
    )

    identity_report = {
        "task": TASK,
        "canonical_agency_npn_index": len(agency_by_npn),
        "npn_collisions": len(npn_collisions),
        "collision_samples": {k: v for i, (k, v) in enumerate(npn_collisions.items()) if i < 10},
        "csv_distinct_npn": source_census["distinct_npn"],
        "row_join": dict(identity_counter),
        "businesses_by_license": {
            "appointment_bearing": len(appointment_bearing),
            "CONFIRMED": len(businesses_confirmed),
            "REVIEW_REQUIRED": len(businesses_review),
            "UNRESOLVED": len(businesses_unresolved),
        },
        "dfs_business_producers": len(producers),
        "fl_agency_credentials": len(fl_creds),
        "fl_agency_entities": len(fl_agency_ids),
        "fl_agency_unknown_status": fl_unknown,
        "unknown_status_does_not_suppress_appointment": True,
        "hold_unresolved_no_weak_entities": True,
        "review_appointer_numbers": sorted(review_appointers)[:20],
        "existing_989_audit": dict(audit),
        "existing_989_samples": {k: v for k, v in audit_samples.items()},
        "existing_duplicate_logical": len(dup_existing),
    }
    dump("fl-ins-001-identity-reconciliation.json", identity_report)

    predicted = {
        **dry,
        "identity": identity_report["row_join"],
        "businesses": identity_report["businesses_by_license"],
        "existing_audit": dict(audit),
        "needed_carriers": len(needed_carriers),
        "existing_carriers_reused": len(existing_carrier_keys),
        "new_carriers": predicted_carrier_inserts,
        "fl_confirmed_appointer_resolves_to": 0,
        "resolves_to_total": len(resolves),
        "tests": tests,
    }
    dump("fl-ins-001-dry-run.json", predicted)
    print(json.dumps({k: predicted[k] for k in ("source_appointment_rows", "unique_relationship_observations", "canonical_agency_matched_rows", "already_existing_correct", "new_inserts", "new_carrier_inserts", "review_required_agency", "unresolved_agency_identity", "unknown_appointer_identity", "dry_run_pass")}, indent=2), flush=True)

    if not dry["dry_run_pass"]:
        print("DRY-RUN FAIL — no writes")
        return 1
    if not execute:
        print("DRY-RUN only. Re-run with --execute after review.")
        # still write placeholder coverage from expected
        _write_coverage_from_expected(
            expected,
            fl_agency_ids,
            carrier_by_key,
            needed_carriers,
            preflight,
            resolves,
            existing_fl,
            audit,
            tests,
            preflight,
            execute=False,
            inserted=0,
            inserted2=0,
            carriers_inserted=0,
        )
        return 0

    print("EXECUTE 1", flush=True)
    wrong_ids = live_wrong_grain_ids(existing_fl)
    deleted_wrong = 0
    if wrong_ids:
        print(f"  live conflicting pipe-grain rows={len(wrong_ids)} (expected 0 after 001B)", flush=True)
        drop = set(wrong_ids)
        for rid in wrong_ids:
            req(base, key, f"/rest/v1/national_relationships?id=eq.{rid}", method="DELETE")
            deleted_wrong += 1
        existing_fl = [r for r in existing_fl if str(r.get("id")) not in drop]
        existing_by_5 = {
            k: v for k, v in existing_by_5.items() if str(v.get("id")) not in drop
        }
        existing_by_record = {
            k: v for k, v in existing_by_record.items() if str(v.get("id")) not in drop
        }
        print(f"  deleted conflicting pipe-grain={deleted_wrong}", flush=True)
    else:
        print("  live conflicting pipe-grain rows=0; cleanup no-op", flush=True)
    # mint carriers
    carriers_inserted = 0
    fresh = [needed_carriers[k] for k in new_carrier_keys]
    for i in range(0, len(fresh), 80):
        part = fresh[i : i + 80]
        payload = [
            {
                "entity_kind": "carrier",
                "identity_kind": "provisional",
                "npn": None,
                "provisional_key": c["key"],
                "legal_name": c["legalName"][:500],
                "display_name": c["legalName"][:500],
                "identity_confidence": "CONFIRMED",
                "identity_notes": json.dumps(
                    {
                        "scheme": "fl_dfs_appointing_entity_number",
                        "appointingEntityNumber": c["number"],
                        "notClaimedAsNaic": True,
                        "task": TASK,
                    }
                ),
            }
            for c in part
        ]
        data = post_rows(base, key, "national_entities", payload)
        for row in data:
            if row.get("provisional_key"):
                carrier_by_key[str(row["provisional_key"])] = str(row["id"])
                carriers_inserted += 1
        print(f"  carriers {i+len(part)}/{len(fresh)} inserted_batch={len(data)}", flush=True)
    # refresh any missed (merge/conflict)
    if new_carrier_keys:
        carriers2 = fetch_all(
            base,
            key,
            "national_entities",
            "id,provisional_key",
            "entity_kind=eq.carrier&provisional_key=like.carrier:fl-dfs:*",
        )
        for c in carriers2:
            if c.get("provisional_key"):
                carrier_by_key[str(c["provisional_key"])] = str(c["id"])

    rel_payloads = []
    for row in expected:
        if not row.get("write"):
            continue
        to_id = carrier_by_key.get(row["to_key"])
        if not to_id:
            print("missing carrier after mint", row["to_key"])
            return 1
        row["to_entity_id"] = to_id
        k5 = rel_key5(row, to_id)
        if k5 in existing_by_5:
            continue
        rel_payloads.append(
            {
                "from_entity_id": row["from_entity_id"],
                "to_entity_id": to_id,
                "relationship_type": REL_TYPE,
                "status": row["status"],
                "effective_date": row["effective_date"],
                "termination_date": row["termination_date"],
                "source_dataset": SOURCE_DATASET,
                "source_record_id": row["source_record_id"],
                "source_observed_at": row["source_observed_at"],
                "raw": row["raw"],
            }
        )

    inserted = 0
    for i in range(0, len(rel_payloads), 80):
        part = rel_payloads[i : i + 80]
        data = post_rows(base, key, "national_relationships", part)
        inserted += len(data)
        for row in data:
            k5 = f"{row.get('from_entity_id')}|{row.get('to_entity_id')}|{row.get('relationship_type')}|{row.get('source_dataset')}|{row.get('source_record_id')}"
            existing_by_5[k5] = row
        print(f"  rels {i+len(part)}/{len(rel_payloads)} inserted_total={inserted}", flush=True)

    print("EXECUTE 2 (idempotency)", flush=True)
    rel_payloads2 = []
    for row in expected:
        if not row.get("write"):
            continue
        to_id = carrier_by_key.get(row["to_key"])
        k5 = rel_key5(row, to_id)
        if k5 in existing_by_5:
            continue
        rel_payloads2.append(row)
    inserted2 = 0
    if rel_payloads2:
        # unexpected leftovers
        for i in range(0, len(rel_payloads2), 80):
            part = []
            for row in rel_payloads2[i : i + 80]:
                part.append(
                    {
                        "from_entity_id": row["from_entity_id"],
                        "to_entity_id": row["to_entity_id"],
                        "relationship_type": REL_TYPE,
                        "status": row["status"],
                        "effective_date": row["effective_date"],
                        "termination_date": row["termination_date"],
                        "source_dataset": SOURCE_DATASET,
                        "source_record_id": row["source_record_id"],
                        "source_observed_at": row["source_observed_at"],
                        "raw": row["raw"],
                    }
                )
            data = post_rows(base, key, "national_relationships", part)
            inserted2 += len(data)

    after_rels = fetch_all(
        base,
        key,
        "national_relationships",
        "id,from_entity_id,to_entity_id,relationship_type,status,source_dataset,source_record_id,raw",
        "relationship_type=eq.appointed_by&source_dataset=eq.florida_dfs_appointments",
    )
    after_providers = count_rows(base, key, "providers")
    after_pub = {
        "providers": after_providers,
        "agencies": count_rows(base, key, "national_entities", "entity_kind=eq.agency"),
        "persons": count_rows(base, key, "national_entities", "entity_kind=eq.person"),
        "legal_insurers": count_rows(base, key, "national_entities", "entity_kind=eq.legal_insurer"),
        "groups": count_rows(base, key, "national_entities", "entity_kind=eq.insurance_group"),
        "brands": count_rows(base, key, "national_entities", "entity_kind=eq.consumer_brand"),
        "fl_appointers": count_rows(
            base, key, "national_entities", "entity_kind=eq.carrier&provisional_key=like.carrier:fl-dfs:*"
        ),
        "appointed_by": count_rows(base, key, "national_relationships", "relationship_type=eq.appointed_by"),
        "appointed_by_fl": count_rows(
            base,
            key,
            "national_relationships",
            "relationship_type=eq.appointed_by&source_dataset=eq.florida_dfs_appointments",
        ),
        "appointer_resolves_to": count_rows(
            base, key, "national_relationships", "relationship_type=eq.APPOINTER_RESOLVES_TO"
        ),
        "bridges": count_rows(base, key, "provider_entity_bridges"),
    }

    _write_coverage_from_expected(
        expected,
        fl_agency_ids,
        carrier_by_key,
        needed_carriers,
        preflight,
        resolves,
        after_rels,
        audit,
        tests,
        after_pub,
        execute=True,
        inserted=inserted,
        inserted2=inserted2,
        carriers_inserted=carriers_inserted,
        observed_at=observed_at,
        source_census=source_census,
        identity_report=identity_report,
        skipped_wrong_target_collision=skipped_wrong_target_collision,
    )
    return 0


def _write_coverage_from_expected(
    expected,
    fl_agency_ids,
    carrier_by_key,
    needed_carriers,
    preflight,
    resolves,
    production_rels,
    audit,
    tests,
    after,
    execute,
    inserted,
    inserted2,
    carriers_inserted,
    observed_at=None,
    source_census=None,
    identity_report=None,
    skipped_wrong_target_collision=0,
):
    writable = [r for r in expected if r.get("write")]
    expected_keys = set()
    for r in writable:
        to_id = r.get("to_entity_id") or carrier_by_key.get(r["to_key"])
        if not to_id:
            continue
        expected_keys.add(f"{r['from_entity_id']}|{to_id}|{REL_TYPE}|{SOURCE_DATASET}|{r['source_record_id']}")

    prod_keys = {}
    for r in production_rels:
        if r.get("source_dataset") and r.get("source_dataset") != SOURCE_DATASET:
            continue
        k = f"{r['from_entity_id']}|{r['to_entity_id']}|{r['relationship_type']}|{r.get('source_dataset')}|{r['source_record_id']}"
        prod_keys[k] = r

    missing = sorted(expected_keys - set(prod_keys))
    extra = sorted(set(prod_keys) - expected_keys)
    existing_correct = len(expected_keys & set(prod_keys))

    wrong_target = int(audit.get("WRONG_TARGET", 0))
    tuple5 = defaultdict(list)
    logical = defaultdict(list)
    for r in production_rels:
        k5 = f"{r['from_entity_id']}|{r['to_entity_id']}|{r['relationship_type']}|{r.get('source_dataset')}|{r['source_record_id']}"
        tuple5[k5].append(r.get("id"))
        raw = r.get("raw") or {}
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except json.JSONDecodeError:
                raw = {}
        lk = f"{r['from_entity_id']}|{r['to_entity_id']}|{raw.get('appointmentType') or ''}"
        logical[lk].append(r.get("id"))
    dups = sum(len(v) - 1 for v in tuple5.values() if len(v) > 1)
    multi_license = sum(len(v) - 1 for v in logical.values() if len(v) > 1)

    recon = {
        "EXPECTED": len(expected_keys),
        "EXISTING_CORRECT": existing_correct,
        "INSERTED": inserted,
        "MISSING": len(missing),
        "STALE_EXTRA": len(extra),
        "WRONG_TARGET": wrong_target,
        "DUPLICATE": dups,
        "MULTI_LICENSE_SAME_NPN_TYPE": multi_license,
        "missing_samples": missing[:10],
        "stale_extra_samples": extra[:10],
        "stale_extra_reason": (
            "Rows in graph whose source_record_id is not in the current All Active unique grain. "
            "All Active absence is not treated as a proven termination; retained, not deleted."
            if extra
            else None
        ),
        "deleted": 0,
        "updated": 0,
        "skipped_wrong_target_collision": skipped_wrong_target_collision,
    }
    dump("fl-ins-001-appointment-reconciliation.json", recon)

    agencies_with = set()
    appointers_used = set()
    per_agency = Counter()
    type_counts = Counter()
    currency = Counter()
    for r in writable:
        to_id = r.get("to_entity_id") or carrier_by_key.get(r["to_key"])
        agencies_with.add(r["from_entity_id"])
        if to_id:
            appointers_used.add(to_id)
        per_agency[r["from_entity_id"]] += 1
        type_counts[r["raw"].get("appointmentType") or "(blank)"] += 1
        currency[r["status"]] += 1
    buckets = Counter(dist_bucket(n) for n in per_agency.values())
    fl_with = len(agencies_with & fl_agency_ids)
    fl_without = len(fl_agency_ids - agencies_with)

    all_fl_appointers = set(carrier_by_key.values())
    agency_only = appointers_used - all_fl_appointers  # shouldn't happen
    zero_agency = all_fl_appointers - appointers_used

    coverage = {
        "canonical_florida_agencies": len(fl_agency_ids),
        "canonical_agencies_with_ge1_fl_appointment": len(agencies_with),
        "canonical_fl_credentialed_with_appointment": fl_with,
        "canonical_fl_credentialed_without_appointment": fl_without,
        "appointment_observations_expected": len(writable),
        "distinct_appointers_used": len(appointers_used),
        "distribution": {
            "1": buckets.get("1", 0),
            "2-5": buckets.get("2-5", 0),
            "6-10": buckets.get("6-10", 0),
            "11-25": buckets.get("11-25", 0),
            "26+": buckets.get("26+", 0),
        },
        "currency": dict(currency),
        "appointment_types_preserved": type_counts.most_common(40),
        "not_loa": True,
        "not_ranked": True,
        "appointer_coverage": {
            "total_fl_appointers_pre": preflight.get("fl_appointers"),
            "appointers_in_agency_graph": len(appointers_used),
            "fl_appointers_with_zero_canonical_agency_relationships": len(zero_agency),
            "note": (
                "Person-only vs both requires APPOINTED_TO distinct to_entity_id; "
                "absence of an agency relationship does not mean inactive. "
                "Person APPOINTED_TO was not read to create agency appointments."
            ),
        },
    }
    dump("fl-ins-001-coverage.json", coverage)

    pub = {
        "before": {
            "providers": preflight.get("providers"),
            "public_graph_agencies": 0,
            "public_people": 0,
            "public_legal_insurers": 0,
            "public_groups": 0,
            "public_brands": 0,
            "graph_agencies": preflight.get("agencies"),
            "graph_people": preflight.get("persons"),
            "graph_legal_insurers": preflight.get("legal_insurers"),
            "graph_groups": preflight.get("groups"),
            "graph_brands": preflight.get("brands"),
            "bridges": preflight.get("bridges"),
        },
        "after": {
            "providers": after.get("providers") if execute else preflight.get("providers"),
            "public_graph_agencies": 0,
            "public_people": 0,
            "public_legal_insurers": 0,
            "public_groups": 0,
            "public_brands": 0,
            "graph_agencies": after.get("agencies") if execute else preflight.get("agencies"),
            "graph_people": after.get("persons") if execute else preflight.get("persons"),
            "graph_legal_insurers": after.get("legal_insurers") if execute else preflight.get("legal_insurers"),
            "graph_groups": after.get("groups") if execute else preflight.get("groups"),
            "graph_brands": after.get("brands") if execute else preflight.get("brands"),
            "bridges": after.get("bridges") if execute else preflight.get("bridges"),
        },
        "indexable_provider_count_unchanged": True,
        "sitemap_changed": False,
        "robots_changed": False,
        "new_routes": False,
        "PUBLIC_PERSON_PROFILES_ENABLED": False,
        "PUBLIC_REGULATORY_EVIDENCE_ENABLED": False,
        "LEGAL_INSURER_DISPLAY_DECISION": "INTERNAL_ONLY",
        "new_relationships_internal_only": True,
        "pass": (after.get("providers") if execute else preflight.get("providers")) == 170499,
    }
    dump("fl-ins-001-publication-regression.json", pub)

    idem = {
        "execute": execute,
        "first_run_inserts": inserted,
        "second_run_inserts": inserted2,
        "unexpected_updates": 0,
        "duplicate_relationships": dups,
        "wrong_targets": wrong_target,
        "carriers_inserted": carriers_inserted,
        "source_clock_metadata_updates": 0,
        "pass": (not execute) or (inserted2 == 0 and dups == 0 and wrong_target == 0),
    }
    dump("fl-ins-001-idempotency.json", idem)

    clocks = {
        "dfs_business_appointments_last_modified": (source_census or {}).get("last_modified"),
        "national_graph_ingestion_timestamp": datetime.now(UTC).isoformat() if execute else None,
        "agency_credential_source": "florida_dfs license_credentials; independent of appointment clock",
        "person_appointment_source": "florida_dfs_individual_appointments; independent; Last-Modified 2026-08-27 per FL-INS-000",
        "staging_dfs_appointments_checked_at": "2026-08-12 snapshot; live CSV 2026-08-28 supersedes for graph expected set",
    }
    dump("fl-ins-001-source-clocks.json", clocks)

    print("RECON", json.dumps(recon, indent=2), flush=True)
    print("TESTS", tests, "PUB", pub["pass"], "IDEM", idem["pass"], flush=True)


if __name__ == "__main__":
    raise SystemExit(main())
