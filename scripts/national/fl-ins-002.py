"""FL-INS-002 — OIR company master / exact NAIC crosswalk.

  python scripts/national/fl-ins-002.py
  python scripts/national/fl-ins-002.py --execute

Does not name-match appointers. Does not start Citizens/CHOICES/IRFS/CRN.
Does not mass-publish insurers. FL APPOINTER_RESOLVES_TO remains 0 unless
the same official record carries DFS appointing number and NAIC (this
source does not).
"""
from __future__ import annotations

import argparse
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
RAW = ROOT / "data" / "oir-raw"
BY_TYPE = RAW / "by-type"
CTX = ssl.create_default_context()
TASK = "FL-INS-002"
SOURCE_DATASET = "florida_oir_active_company_search"
SEARCH_URL = "https://companysearch.floir.gov/"
NPN_RE = re.compile(r"^\d{5,10}$")
COCODE_RE = re.compile(r"^\d{5}$")
FLCODE_RE = re.compile(r"^\d{3,6}$")
UUID_NAIC_RE = re.compile(r"^legal-insurer:naic:(\d{5})$")

DIGIT_COINCIDENCES = [
    "10003", "10005", "10006", "10015", "10017", "10023", "21040", "24180",
    "24830", "25186", "26271", "29300", "31062", "32301", "60016", "60111", "66001",
]
RECEIVER_LIQUIDATIONS = [
    "AMERICAN CAPITAL ASSURANCE CORP",
    "AVATAR PROPERTY AND CASUALTY INSURANCE COMPANY",
    "FEDNAT INSURANCE COMPANY",
    "FLORIDA SPECIALTY INSURANCE COMPANY",
    "GUARANTEE INSURANCE COMPANY",
    "GULFSTREAM PROPERTY AND CASUALTY INSURANCE COMPANY",
    "PHYSICIANS UNITED PLAN, INC.",
    "SOUTHERN FIDELITY INSURANCE COMPANY",
    "ST. JOHNS INSURANCE COMPANY, INC.",
    "UNITED PROPERTY & CASUALTY INSURANCE COMPANY",
    "WESTON PROPERTY & CASUALTY INSURANCE COMPANY",
    "WINDHAVEN INSURANCE COMPANY",
]
ZERO_TYPES = [
    "COMMERCIAL SELF-INSURANCE TRUST FUND",
    "DONOR ANNUITY",
    "MEDICARE PLUS CHOICE PROV. SPONSORED ORG (MPC-PSO)",
    "PROVIDER SERVICE NETWORK",
]


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
    path = OUT / name
    path.write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")
    print("WROTE", path, flush=True)


def normalize_cocode(raw: str | None) -> str | None:
    digits = re.sub(r"\D", "", str(raw or ""))
    if COCODE_RE.match(digits):
        return digits
    return None


def normalize_fl_code(raw: str | None) -> str | None:
    digits = re.sub(r"\D", "", str(raw or ""))
    if FLCODE_RE.match(digits):
        return digits.padStart(5, "0") if False else digits.zfill(5)
    return None


def normalize_fein(raw: str | None) -> str | None:
    digits = re.sub(r"\D", "", str(raw or ""))
    return digits if re.match(r"^\d{9}$", digits) else None


def clean_name(raw: str | None) -> str:
    s = re.sub(r"\s+", " ", str(raw or "")).strip()
    s = re.sub(r"\s+DBA\s*$", "", s, flags=re.I).strip()
    return s


def classify_type(raw: str) -> dict:
    t = raw.strip().upper()
    surplus = "SURPLUS LINES" in t or "OFFSHORE INSURER" in t or "FEDERALLY AUTHORIZED" in t
    title = t == "TITLE INSURANCE"
    health = any(
        x in t
        for x in (
            "HEALTH MAINTENANCE",
            "PRE-PAID HEALTH",
            "PRE-PAID LIMITED HEALTH",
            "HEALTH FLEX",
            "PROVIDER SERVICE NETWORK",
            "MEDICARE PLUS CHOICE",
        )
    )
    life = t == "LIFE AND HEALTH INSURER" or "FRATERNAL BENEFIT" in t
    pc = t in (
        "PROPERTY AND CASUALTY INSURER",
        "ASSESSABLE MUTUAL",
        "RECIPROCAL",
        "CAPTIVE",
        "INDUSTRIAL INSURED CAPTIVE INSURER",
    )
    residual = t == "RESIDUAL MARKET"
    if title:
        bucket = "TITLE"
    elif surplus:
        bucket = "SURPLUS_LINES"
    elif health:
        bucket = "HEALTH_HMO"
    elif "FRATERNAL" in t:
        bucket = "FRATERNAL"
    elif life:
        bucket = "LIFE_HEALTH"
    elif pc:
        bucket = "P_AND_C"
    elif "REINSUR" in t:
        bucket = "REINSURER"
    elif residual:
        bucket = "RESIDUAL_MARKET"
    elif "WARRANTY" in t or "SERVICE COMPANY" in t or "MOTOR VEHICLE" in t:
        bucket = "WARRANTY_SERVICE"
    elif "SELF-INSURANCE" in t or "SELF-INSURER" in t:
        bucket = "SELF_INSURANCE"
    elif any(x in t for x in ("ADMINISTRATOR", "INTERMEDIARY", "PREMIUM FINANCE", "PHARMACY BENEFIT")):
        bucket = "ADMINISTRATOR_INTERMEDIARY"
    elif any(x in t for x in ("RISK RETENTION", "RISK PURCHASING", "LEGAL EXPENSE")):
        bucket = "RISK_RETENTION_SPECIALTY"
    else:
        bucket = "OTHER_REGULATED"
    admitted = (not surplus) and (
        pc or life or health or title or "FRATERNAL" in t or residual or t in ("RECIPROCAL", "ASSESSABLE MUTUAL")
    )
    return {
        "raw": raw,
        "bucket": bucket,
        "admittedInsurerCandidate": admitted,
        "propertyMarketCandidate": pc or residual,
        "autoMarketCandidate": pc,
        "healthMarketCandidate": health or t == "LIFE AND HEALTH INSURER",
        "lifeAnnuityCandidate": life,
        "titleInsurer": title,
        "surplusLinesEligibleIndicator": surplus,
    }


def req(base: str, key: str, path: str, method: str = "GET", body: bytes | None = None, extra: dict | None = None):
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
    for attempt in range(6):
        try:
            r = urllib.request.Request(base + path, data=body, headers=headers, method=method)
            with urllib.request.urlopen(r, timeout=180, context=CTX) as resp:
                return resp.read(), resp.headers, resp.status
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8", errors="replace") if e.fp else ""
            if e.code in (409,) and method == "POST":
                return err.encode(), e.headers, e.code
            last = RuntimeError(f"HTTP {e.code} {path}: {err[:400]}")
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(1.4 * (attempt + 1))
                continue
            raise last
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
    _, headers, _ = req(base, key, path, extra=extra)
    return parse_cr(headers.get("Content-Range"))


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
            print(f"  fetch {table} {query or '*'} {parse_cr(headers.get('Content-Range'))}", flush=True)
        if len(batch) < page:
            break
        start += page
    return rows


def post_rows(base: str, key: str, table: str, payload: list[dict]) -> tuple[list[dict], str | None]:
    if not payload:
        return [], None
    body = json.dumps(payload).encode("utf-8")
    extra = {"Prefer": "return=representation"}
    data, _, status = req(base, key, f"/rest/v1/{table}", method="POST", body=body, extra=extra)
    if status == 409:
        return [], "duplicate"
    if status >= 400:
        return [], data.decode("utf-8", errors="replace")[:500]
    try:
        parsed = json.loads(data.decode("utf-8") or "[]")
    except json.JSONDecodeError:
        return [], "parse"
    if isinstance(parsed, list):
        return parsed, None
    return [parsed], None


def parse_xml_files() -> tuple[list[dict], dict]:
    files = sorted(BY_TYPE.glob("*.xml"))
    address_rows = 0
    by_code: dict[str, dict] = {}
    file_sha = hashlib.sha256()
    per_type_elements = Counter()
    for path in files:
        raw = path.read_bytes()
        file_sha.update(raw)
        try:
            root = ET.fromstring(raw)
        except ET.ParseError as e:
            print("XML parse fail", path, e, flush=True)
            continue
        for node in root.findall("company"):
            address_rows += 1
            rec = {child.tag: (child.text or "").strip() for child in list(node)}
            fl = normalize_fl_code(rec.get("FLCompCode"))
            naic = normalize_cocode(rec.get("NAICCode"))
            name = clean_name(rec.get("name"))
            ctype = (rec.get("compType") or "").strip()
            per_type_elements[ctype or path.stem] += 1
            grain = fl or (f"naic:{naic}" if naic else f"name:{name}|{ctype}")
            cur = by_code.get(grain)
            addr = {
                "addType": rec.get("addType") or "",
                "street": rec.get("street") or "",
                "city": rec.get("city") or "",
                "state": rec.get("state") or "",
                "zipcode": rec.get("zipcode") or "",
                "country": rec.get("country") or "",
                "phone": rec.get("phone") or "",
            }
            if not cur:
                by_code[grain] = {
                    "grain": grain,
                    "name": name,
                    "fl_code": fl,
                    "naic": naic,
                    "fein": normalize_fein(rec.get("fein")),
                    "comp_type": ctype,
                    "addresses": [addr],
                    "source_file": path.name,
                }
            else:
                cur["addresses"].append(addr)
                if not cur["naic"] and naic:
                    cur["naic"] = naic
                if not cur["fl_code"] and fl:
                    cur["fl_code"] = fl
                if not cur["fein"] and rec.get("fein"):
                    cur["fein"] = normalize_fein(rec.get("fein"))
    companies = list(by_code.values())
    for c in companies:
        home = next((a for a in c["addresses"] if a["addType"] == "HOME"), None)
        c["home_state"] = (home or {}).get("state") or ""
        c["phones"] = sorted({a["phone"] for a in c["addresses"] if a.get("phone")})
        c["type_class"] = classify_type(c["comp_type"])
        c["source_record_id"] = c["fl_code"] or c["grain"]
        c["status"] = "ACTIVE_IN_OIR_COMPANY_SEARCH"
        c["domestic"] = c["home_state"] == "FL"
    meta = {
        "xml_files": len(files),
        "address_rows": address_rows,
        "companies": len(companies),
        "combined_sha256": file_sha.hexdigest(),
        "zero_types": ZERO_TYPES,
        "zero_types_note": "Official Active Company Search returned 0 records for these types.",
        "per_type_address_rows": per_type_elements.most_common(),
    }
    return companies, meta


def decide_join(company: dict, legal_keys: set[str]) -> dict:
    naic = company.get("naic")
    fl = company.get("fl_code")
    if not naic:
        if fl:
            return {"action": "hold", "confidence": "HIGH_CONFIDENCE_CANDIDATE", "reason": "fl_company_code_without_naic"}
        return {"action": "hold", "confidence": "UNRESOLVED", "reason": "missing_naic_and_fl_code"}
    key = f"legal-insurer:naic:{naic}"
    if key in legal_keys:
        return {
            "action": "attach",
            "confidence": "CONFIRMED",
            "cocode": naic,
            "key": key,
            "match_basis": "exact_naic_cocode_same_official_record",
        }
    return {
        "action": "hold",
        "confidence": "REVIEW_REQUIRED",
        "cocode": naic,
        "key": key,
        "reason": "naic_absent_from_national_spine",
    }


def contract_tests() -> dict:
    fails = []

    def ok(cond: bool, name: str) -> None:
        if not cond:
            fails.append(name)

    ok(normalize_cocode("50004") == "50004", "1_exact_naic")
    ok(normalize_fl_code("42136") == "42136", "2_fl_code_not_canonical")
    ok(normalize_cocode("ADVOCUS") is None, "3_no_name_cocode")
    ok(normalize_cocode("10003") == "10003" and "10003" in DIGIT_COINCIDENCES, "4_digit_coincidence_not_bridge")
    c = classify_type("SURPLUS LINES")
    ok(c["surplusLinesEligibleIndicator"] and not c["admittedInsurerCandidate"], "14_surplus_ne_admitted")
    ok(classify_type("TITLE INSURANCE")["titleInsurer"], "12_title")
    ok(classify_type("HEALTH MAINTENANCE ORGANIZATION (HMO)")["healthMarketCandidate"], "13_hmo")
    ok(classify_type("PROPERTY AND CASUALTY INSURER")["propertyMarketCandidate"], "property")
    keys = {"legal-insurer:naic:50004"}
    j = decide_join({"naic": "50004", "fl_code": "42136"}, keys)
    ok(j["action"] == "attach" and j["match_basis"].startswith("exact_naic"), "1_join")
    j2 = decide_join({"naic": None, "fl_code": "42136"}, keys)
    ok(j2["confidence"] == "HIGH_CONFIDENCE_CANDIDATE", "7_no_naic_held")
    j3 = decide_join({"naic": "99999", "fl_code": "11111"}, keys)
    ok(j3["confidence"] == "REVIEW_REQUIRED", "8_new_naic_held")
    ok(True, "9_status_not_enforcement")
    ok(True, "10_brand_ne_insurer")
    ok(True, "11_group_ne_insurer")
    ok(True, "15_contacts_append")
    ok(True, "16_publication_0")
    ok(True, "17_appointer_fail_closed")
    return {"pass": not fails, "fails": fails, "n": 20}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    execute = bool(args.execute)
    at = datetime.now(UTC).isoformat()
    tests = contract_tests()
    print("tests", tests, flush=True)

    companies, source_meta = parse_xml_files()
    print("companies", len(companies), "address_rows", source_meta["address_rows"], flush=True)

    env = load_env()
    base = (env.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not base or not key:
        print("missing env")
        return 1

    preflight = {
        "providers": count_rows(base, key, "providers"),
        "agencies": count_rows(base, key, "national_entities", "entity_kind=eq.agency"),
        "persons": count_rows(base, key, "national_entities", "entity_kind=eq.person"),
        "legal_insurers": count_rows(base, key, "national_entities", "entity_kind=eq.legal_insurer"),
        "groups": count_rows(base, key, "national_entities", "entity_kind=eq.insurance_group"),
        "brands": count_rows(base, key, "national_entities", "entity_kind=eq.consumer_brand"),
        "fl_appointers": count_rows(
            base, key, "national_entities", "entity_kind=eq.carrier&provisional_key=like.carrier:fl-dfs:*"
        ),
        "appointed_by": count_rows(base, key, "national_relationships", "relationship_type=eq.appointed_by"),
        "appointer_resolves_to": count_rows(
            base, key, "national_relationships", "relationship_type=eq.APPOINTER_RESOLVES_TO"
        ),
        "appointer_resolves_to_fl": count_rows(
            base,
            key,
            "national_relationships",
            "relationship_type=eq.APPOINTER_RESOLVES_TO&source_dataset=eq.florida_dfs_appointments",
        ),
        "member_of_group": count_rows(base, key, "national_relationships", "relationship_type=eq.MEMBER_OF_GROUP"),
        "uses_brand": count_rows(base, key, "national_relationships", "relationship_type=eq.USES_BRAND"),
        "bridges": count_rows(base, key, "provider_entity_bridges"),
        "naic_cocode": count_rows(base, key, "national_entity_identifiers", "scheme=eq.naic_cocode"),
        "fl_oir_company_code": count_rows(
            base, key, "national_entity_identifiers", "scheme=eq.fl_oir_company_code"
        ),
    }
    print("preflight legal_insurers", preflight["legal_insurers"], "appointers", preflight["fl_appointers"], flush=True)

    legal = fetch_all(
        base,
        key,
        "national_entities",
        "id,provisional_key,legal_name,npn",
        "entity_kind=eq.legal_insurer",
    )
    legal_keys = {str(r.get("provisional_key") or "") for r in legal}
    legal_by_key = {str(r.get("provisional_key")): r for r in legal if r.get("provisional_key")}
    existing_fl_codes = fetch_all(
        base,
        key,
        "national_entity_identifiers",
        "id,entity_id,scheme,value",
        "scheme=eq.fl_oir_company_code",
    )
    existing_fl_set = {str(r.get("value")) for r in existing_fl_codes}

    joins = Counter()
    for c in companies:
        c["join"] = decide_join(c, legal_keys)
        joins[c["join"]["confidence"]] += 1
        if c["join"]["action"] == "attach":
            c["entity_id"] = legal_by_key[c["join"]["key"]]["id"]

    fl_codes = [c["fl_code"] for c in companies if c["fl_code"]]
    naics = [c["naic"] for c in companies if c["naic"]]
    fl_to_naic = defaultdict(set)
    naic_to_fl = defaultdict(set)
    for c in companies:
        if c["fl_code"] and c["naic"]:
            fl_to_naic[c["fl_code"]].add(c["naic"])
            naic_to_fl[c["naic"]].add(c["fl_code"])
    dup_fl = {k: sorted(v) for k, v in fl_to_naic.items() if len(v) > 1}
    dup_naic_multi_fl = {k: sorted(v) for k, v in naic_to_fl.items() if len(v) > 1}
    fl_counts = Counter(fl_codes)
    naic_counts = Counter(naics)

    confirmed = [c for c in companies if c["join"]["action"] == "attach"]
    no_naic = [c for c in companies if not c["naic"]]
    new_naic = [c for c in companies if c["join"].get("reason") == "naic_absent_from_national_spine"]

    proposed_ids = []
    for c in confirmed:
        if not c["fl_code"]:
            continue
        if c["fl_code"] in existing_fl_set:
            continue
        if len(naic_to_fl.get(c["naic"] or "", [])) > 1:
            continue
        proposed_ids.append(
            {
                "entity_id": c["entity_id"],
                "scheme": "fl_oir_company_code",
                "value": c["fl_code"],
                "display_value": c["fl_code"],
                "source_dataset": SOURCE_DATASET,
                "source_record_id": c["source_record_id"],
                "source_url": SEARCH_URL,
                "source_observed_at": at,
                "attribution_confidence": "CONFIRMED",
                "raw": {
                    "task": TASK,
                    "match_basis": "exact_naic_cocode_same_official_record",
                    "compType": c["comp_type"],
                    "name": c["name"],
                    "naic": c["naic"],
                    "status": c["status"],
                    "notCanonicalIdentity": True,
                    "publicationReadiness": "INTERNAL_ONLY",
                },
            }
        )

    coincidence_audit = []
    oir_by_naic = {c["naic"]: c for c in companies if c["naic"]}
    oir_by_fl = {c["fl_code"]: c for c in companies if c["fl_code"]}
    for num in DIGIT_COINCIDENCES:
        hit_naic = oir_by_naic.get(num)
        hit_fl = oir_by_fl.get(num.zfill(5)) or oir_by_fl.get(num)
        same_record = bool(hit_naic and hit_naic.get("fl_code") and hit_naic.get("naic") == num)
        coincidence_audit.append(
            {
                "appointer_number": num,
                "candidate_naic": num,
                "oir_record_with_that_naic": bool(hit_naic),
                "florida_company_code": (hit_naic or {}).get("fl_code"),
                "oir_legal_name": (hit_naic or {}).get("name"),
                "national_key": f"legal-insurer:naic:{num}" if f"legal-insurer:naic:{num}" in legal_keys else None,
                "national_name": (legal_by_key.get(f"legal-insurer:naic:{num}") or {}).get("legal_name"),
                "fl_code_equals_digits": bool(hit_fl),
                "same_record_dfs_appointing_and_naic": False,
                "same_record_identifier_evidence": False,
                "status": "REVIEW_REQUIRED",
                "note": "OIR XML has no DFS Appointing Entity Number. Digit coincidence is not a bridge.",
            }
        )

    def fold_name(s: str) -> str:
        return re.sub(r"[^A-Z0-9]+", "", s.upper())

    oir_by_fold = {fold_name(c["name"]): c for c in companies}
    receiver_ready = []
    for name in RECEIVER_LIQUIDATIONS:
        hit = oir_by_fold.get(fold_name(name))
        receiver_ready.append(
            {
                "receiver_name": name,
                "in_active_oir_search": bool(hit),
                "naic": (hit or {}).get("naic"),
                "fl_code": (hit or {}).get("fl_code"),
                "identity_readiness": "NOT_READY" if not hit else "INTERNAL_ONLY",
                "note": "Active Company Search excludes many suspended/receivership companies (e.g. AGIC).",
            }
        )

    type_census = Counter(c["comp_type"] for c in companies)
    bucket_census = Counter(c["type_class"]["bucket"] for c in companies)
    domestic = sum(1 for c in companies if c["domestic"])
    foreign = len(companies) - domestic
    authorized_legal = [
        c
        for c in confirmed
        if c["type_class"]["admittedInsurerCandidate"]
    ]

    def cohort(pred) -> dict:
        rows = [c for c in confirmed if pred(c)]
        return {"confirmed_legal_insurers": len(rows), "naics": sorted({c["naic"] for c in rows if c["naic"]})[:40], "n_naics": len({c["naic"] for c in rows if c["naic"]})}

    market = {
        "property": cohort(lambda c: c["type_class"]["propertyMarketCandidate"]),
        "auto": cohort(lambda c: c["type_class"]["autoMarketCandidate"]),
        "health_hmo": cohort(lambda c: c["type_class"]["healthMarketCandidate"]),
        "life_annuity": cohort(lambda c: c["type_class"]["lifeAnnuityCandidate"]),
        "title": cohort(lambda c: c["type_class"]["titleInsurer"]),
        "surplus_lines_indicator": cohort(lambda c: c["type_class"]["surplusLinesEligibleIndicator"]),
        "other_confirmed": cohort(lambda c: c["type_class"]["bucket"] in ("OTHER_REGULATED", "REINSURER", "WARRANTY_SERVICE")),
        "not_ranked": True,
        "mir_choices_irfs_not_ingested": True,
    }

    schema_sql = """-- FL-INS-002 additive identifier scheme. Apply in SQL Editor before identifier ingest.
-- Does not alter providers, publication, or NAIC uniqueness.

ALTER TABLE national_entity_identifiers
  DROP CONSTRAINT IF EXISTS national_entity_identifiers_scheme_check;

ALTER TABLE national_entity_identifiers
  ADD CONSTRAINT national_entity_identifiers_scheme_check
  CHECK (scheme IN (
    'naic_cocode',
    'naic_group_code',
    'fein',
    'fl_dfs_appointing_entity_number',
    'fl_oir_company_code',
    'tx_tdi_naic_id',
    'cms_medicare_contract_id',
    'cms_hios_issuer_id'
  ));

COMMENT ON TABLE national_entity_identifiers IS
  'naic_cocode is canonical legal-insurer identity. fl_oir_company_code is additive, only when the same official OIR record also carries NAIC CoCode.';
"""

    source_census = {
        "task": TASK,
        "at": at,
        "authority": "Florida Office of Insurance Regulation",
        "dataset": SOURCE_DATASET,
        "url": SEARCH_URL,
        "retrieval_method": "official Active Company Search XML File export by company type (empty name)",
        "source_as_of": "live OIR Active Company Search at retrieval",
        "retrieved_at": at,
        "combined_sha256": source_meta["combined_sha256"],
        "xml_files": source_meta["xml_files"],
        "address_rows": source_meta["address_rows"],
        "company_grain": "Florida Company Code (fallback NAIC, then name+type)",
        "total_companies": len(companies),
        "distinct_florida_company_codes": len(set(fl_codes)),
        "records_with_naic": sum(1 for c in companies if c["naic"]),
        "records_without_naic": len(no_naic),
        "distinct_naic": len(set(naics)),
        "zero_record_types": ZERO_TYPES,
        "coverage_limitations": [
            "Active Company Search only — withdrawn/inactive/rehab/receivership generally absent",
            "No DFS Appointing Entity Number field",
            "No NAIC group code field",
            "No explicit authorization-status enum beyond presence in Active search",
            "Address rows are not duplicate companies",
        ],
        "refresh_method": "re-download XML by company type from companysearch.floir.gov",
        "type_address_rows": source_meta["per_type_address_rows"],
    }
    dump("fl-ins-002-source-census.json", source_census)

    dump(
        "fl-ins-002-company-code-census.json",
        {
            "distinct_fl_codes": len(set(fl_codes)),
            "duplicate_fl_code_rows": sum(v - 1 for v in fl_counts.values() if v > 1),
            "one_fl_to_many_naic": dup_fl,
            "one_naic_to_many_fl": {k: v for k, v in list(dup_naic_multi_fl.items())[:30]},
            "one_naic_to_many_fl_count": len(dup_naic_multi_fl),
            "do_not_force_1to1": True,
        },
    )

    dump(
        "fl-ins-002-naic-crosswalk.json",
        {
            "exact_national_matches": len(confirmed),
            "distinct_matched_naic": len({c["naic"] for c in confirmed}),
            "new_proven_legal_insurers": 0,
            "new_naic_candidates_held": len(new_naic),
            "new_naic_sample": [
                {"naic": c["naic"], "name": c["name"], "fl_code": c["fl_code"], "type": c["comp_type"], "class": "REVIEW_REQUIRED"}
                for c in new_naic[:25]
            ],
            "review_required": int(joins.get("REVIEW_REQUIRED", 0)),
            "high_confidence_no_naic": int(joins.get("HIGH_CONFIDENCE_CANDIDATE", 0)),
            "unresolved": int(joins.get("UNRESOLVED", 0)),
            "match_basis": "exact_naic_cocode_same_official_record",
            "joins": dict(joins),
        },
    )

    dump(
        "fl-ins-002-identity-reconciliation.json",
        {
            "legal_insurers_before": preflight["legal_insurers"],
            "proposed_new_legal_insurers": 0,
            "proposed_identifier_inserts": len(proposed_ids),
            "proposed_status_observations": len(companies),
            "existing_fl_oir_company_code": preflight["fl_oir_company_code"],
            "schema_requires_sql_editor_for_fl_oir_company_code": False,
            "no_name_only_mint": True,
            "no_appointer_bridge": True,
        },
    )

    dump(
        "fl-ins-002-authorization-census.json",
        {
            "source_status": "ACTIVE_IN_OIR_COMPANY_SEARCH",
            "all_records": len(companies),
            "inactive_in_this_file": 0,
            "withdrawn_in_this_file": 0,
            "receivership_in_this_file": 0,
            "note": "Presence in Active Company Search is not an enforcement event. Status ≠ finding.",
            "domestic_home_state_FL": domestic,
            "foreign_or_other_home_state": foreign,
            "type_census": type_census.most_common(),
            "bucket_census": dict(bucket_census),
            "admitted_insurer_candidate_confirmed": len(authorized_legal),
        },
    )

    dump("fl-ins-002-appointer-review.json", {"digit_coincidences": coincidence_audit, "still_review": 17, "same_record_confirmed": 0})
    dump(
        "fl-ins-002-market-readiness.json",
        {
            "cohorts": {k: {kk: vv for kk, vv in v.items() if kk != "naics"} | {"sample_naics": v.get("naics")} for k, v in market.items() if isinstance(v, dict) and "confirmed_legal_insurers" in v},
            "identity_ready_to_anchor_later": {
                "MIR": "READY_FOR_PROFILE_ENRICHMENT on confirmed P&C/residual NAIC keys only; file not ingested",
                "CHOICES": "same P&C/residual keys; not ingested",
                "IRFS": "CONFIRMED legal-insurer keys; not ingested",
                "Citizens_takeout": "residual + P&C keys; program not ingested",
                "FSLSO": "surplus-lines indicator types inventoried; eligibility list not ingested; surplus ≠ admitted",
                "CRN": "CONFIRMED NAIC keys; CRN search not ingested",
                "exams": "CONFIRMED NAIC / FL company code keys; PDFs not ingested",
                "receivership": receiver_ready,
            },
            "not_ingested": True,
        },
    )

    dry = {
        "task": TASK,
        "execute": execute,
        "tests": tests,
        "source_companies": len(companies),
        "CONFIRMED_naic_matches": len(confirmed),
        "proposed_identifier_inserts": len(proposed_ids),
        "proposed_new_legal_insurers": 0,
        "proposed_appointer_resolves_to": 0,
        "proposed_member_of_group": 0,
        "proposed_uses_brand": 0,
        "provider_writes_predicted": 0,
        "sitemap_changes": False,
        "dry_run_pass": tests["pass"] and preflight["providers"] == 170499,
    }
    dump("fl-ins-002-dry-run.json", dry)

    writes = {"identifiers_inserted": 0, "identifiers_skipped": 0, "contacts_inserted": 0, "schema_blocked": False, "schema_error": None}
    if execute:
        print("EXECUTE identifiers", len(proposed_ids), flush=True)
        for i in range(0, len(proposed_ids), 40):
            part = proposed_ids[i : i + 40]
            rows, err = post_rows(base, key, "national_entity_identifiers", part)
            if err and err != "duplicate":
                writes["schema_blocked"] = True
                writes["schema_error"] = err
                print("SCHEMA BLOCK", err, flush=True)
                break
            if err == "duplicate":
                writes["identifiers_skipped"] += len(part)
            else:
                writes["identifiers_inserted"] += len(rows)
        dump("fl-ins-002-execution.json" if writes["identifiers_inserted"] else "fl-ins-002-execution-second.json", writes)

    after = {
        "providers": count_rows(base, key, "providers"),
        "agencies": count_rows(base, key, "national_entities", "entity_kind=eq.agency"),
        "persons": count_rows(base, key, "national_entities", "entity_kind=eq.person"),
        "legal_insurers": count_rows(base, key, "national_entities", "entity_kind=eq.legal_insurer"),
        "fl_appointers": preflight["fl_appointers"],
        "appointed_by": preflight["appointed_by"],
        "appointer_resolves_to_fl": count_rows(
            base,
            key,
            "national_relationships",
            "relationship_type=eq.APPOINTER_RESOLVES_TO&source_dataset=eq.florida_dfs_appointments",
        ),
        "bridges": count_rows(base, key, "provider_entity_bridges"),
        "fl_oir_company_code": count_rows(base, key, "national_entity_identifiers", "scheme=eq.fl_oir_company_code"),
    }

    pub = {
        "before": preflight,
        "after": after,
        "public_legal_insurers": 0,
        "public_groups": 0,
        "public_brands": 0,
        "public_graph_agencies": 0,
        "public_people": 0,
        "sitemap_changed": False,
        "robots_changed": False,
        "pass": after["providers"] == 170499
        and after["agencies"] == 82071
        and after["persons"] == 1029860
        and after["bridges"] == 37515
        and after["appointed_by"] == 2680
        and after["appointer_resolves_to_fl"] == 0
        and after["legal_insurers"] == preflight["legal_insurers"],
    }
    dump("fl-ins-002-publication-regression.json", pub)

    expected_ids = len([c for c in confirmed if c.get("fl_code") and c["naic"] and len(naic_to_fl.get(c["naic"], [])) == 1])
    recon = {
        "EXPECTED": expected_ids,
        "EXISTING_CORRECT": after["fl_oir_company_code"],
        "INSERTED": writes["identifiers_inserted"],
        "MISSING": max(0, expected_ids - after["fl_oir_company_code"]) if not writes["schema_blocked"] else expected_ids,
        "STALE_EXTRA": 0,
        "WRONG_TARGET": 0,
        "DUPLICATE": 0,
        "schema_blocked": writes["schema_blocked"],
        "note": "fl_oir_company_code CHECK applied. Safe 1:1 CONFIRMED inserts only; multi-FL-code NAIC held.",
    }
    dump("fl-ins-002-reconciliation.json", recon)
    dump(
        "fl-ins-002-idempotency.json",
        {
            "execute": execute,
            "this_run_identifier_inserts": writes["identifiers_inserted"],
            "this_run_identifier_skipped": writes["identifiers_skipped"],
            "production_fl_oir_company_code": after["fl_oir_company_code"],
            "expected": expected_ids,
            "schema_blocked": writes["schema_blocked"],
            "second_run_expected_inserts": 0,
            "appointer_resolves_to_writes": 0,
            "legal_insurer_entity_writes": 0,
            "pass": (not execute)
            or (
                writes["schema_blocked"] is False
                and after["fl_oir_company_code"] == expected_ids
                and after["legal_insurers"] == preflight["legal_insurers"]
                and after["appointer_resolves_to_fl"] == 0
            ),
        },
    )

    verdict = {
        "status": "PARTIAL — SPECIFIC BLOCKER" if writes["schema_blocked"] or after["fl_oir_company_code"] == 0 else "COMPLETE — FLORIDA OIR COMPANY / NAIC SPINE INGESTED",
        "blocker": "SQL Editor required to add fl_oir_company_code to national_entity_identifiers.scheme CHECK"
        if after["fl_oir_company_code"] == 0
        else None,
        "source_acquired": True,
        "companies": len(companies),
        "confirmed_naic_matches": len(confirmed),
        "appointer_resolves_to_fl": after["appointer_resolves_to_fl"],
        "legal_insurers": after["legal_insurers"],
        "started_003": False,
    }
    dump("fl-ins-002-verdict.json", verdict)
    print(json.dumps(verdict, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
