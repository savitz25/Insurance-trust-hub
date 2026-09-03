#!/usr/bin/env python3
"""TX-INS-001 — acquire official TDI bulk files and compute Texas insurance snapshot.

Does not scrape search portals. Does not dump the 4.4M person-appointment file.
Giant CSVs stay in data/tdi-raw/ (gitignored).
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import statistics
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "tdi-raw"
ART = ROOT / "artifacts" / "tx-ins-001"
PUB = ROOT / "public"
LIB = ROOT / "lib" / "texas-intelligence"
UA = "InsuranceTrustHub/tx-ins-001-research"
TODAY = datetime.now(timezone.utc).date().isoformat()

DATASETS = {
    "agencies": "3yqc-fcdt",
    "agency_appointments": "avjc-7u2m",
    "surplus": "7isd-ex6t",
    "title": "y9ze-ft94",
    "relationships": "kvqi-vsrr",
    "complaints": "ubdr-4uff",
    "complaint_index": "pa9u-9s9w",
    "rate_filings": "iubg-btfs",
}


def get(url: str, timeout: int = 180) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def get_json(url: str, timeout: int = 120) -> object:
    return json.loads(get(url, timeout).decode("utf-8"))


def soda(ds: str, params: dict, timeout: int = 120) -> object:
    url = f"https://data.texas.gov/resource/{ds}.json?" + urllib.parse.urlencode(params)
    return get_json(url, timeout)


def views_meta(ds: str) -> dict:
    meta = get_json(f"https://data.texas.gov/api/views/{ds}.json")
    assert isinstance(meta, dict)
    cols = [
        {"name": c.get("name"), "field": c.get("fieldName"), "type": c.get("dataTypeName"), "desc": (c.get("description") or "")[:400]}
        for c in meta.get("columns", [])
        if not str(c.get("fieldName", "")).startswith(":@")
    ]
    return {
        "id": meta.get("id"),
        "name": meta.get("name"),
        "attribution": meta.get("attribution"),
        "description": (meta.get("description") or "")[:800],
        "rowsUpdatedAt": meta.get("rowsUpdatedAt"),
        "viewLastModified": meta.get("viewLastModified"),
        "downloadCount": meta.get("downloadCount"),
        "columns": cols,
    }


def download_csv(ds: str, dest: Path) -> dict:
    url = f"https://data.texas.gov/api/views/{ds}/rows.csv?accessType=DOWNLOAD"
    print(f"GET {ds} -> {dest.name}", flush=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    hasher = hashlib.sha256()
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(req, timeout=300) as resp, dest.open("wb") as out:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            hasher.update(chunk)
            out.write(chunk)
    size = dest.stat().st_size
    print(f"  bytes={size} sha256={hasher.hexdigest()[:16]}", flush=True)
    return {"url": url, "bytes": size, "sha256": hasher.hexdigest(), "path": str(dest.relative_to(ROOT))}


def unix_iso(ts: object) -> str | None:
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc).date().isoformat()
    except (TypeError, ValueError, OSError):
        return None


def nonempty(v: str | None) -> bool:
    return bool((v or "").strip())


def dist_summary(counter: Counter[int]) -> dict:
    if not counter:
        return {"n": 0}
    values: list[int] = []
    for k, n in counter.items():
        values.extend([k] * n)
    values.sort()
    return {
        "n": len(values),
        "min": values[0],
        "p50": values[len(values) // 2],
        "p90": values[int(len(values) * 0.9)],
        "p99": values[int(len(values) * 0.99)],
        "max": values[-1],
        "mean": round(statistics.fmean(values), 2),
    }


def profile_agencies(path: Path) -> dict:
    print("profile agencies", flush=True)
    rows = 0
    npns: set[str] = set()
    licenses: set[str] = set()
    types: Counter[str] = Counter()
    states: Counter[str] = Counter()
    org_types: Counter[str] = Counter()
    phone = email = website = address = 0
    city = zipc = 0
    exp_future = exp_past = exp_blank = 0
    name = 0
    by_npn: dict[str, dict] = {}
    header: list[str] = []
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        header = list(reader.fieldnames or [])
        for row in reader:
            rows += 1
            npn = (row.get("NPN") or row.get("npn") or "").strip()
            lic = (row.get("License number") or row.get("agency_license_number") or "").strip()
            org = (row.get("Name") or row.get("org_name") or "").strip()
            lt = (row.get("License type") or row.get("license_type") or "").strip()
            st = (row.get("State") or row.get("state") or "").strip().upper()
            ct = (row.get("City") or row.get("city") or "").strip()
            z = (row.get("Postal code") or row.get("pstl_cd") or "").strip()
            ot = (row.get("Org type") or row.get("agency_type") or "").strip()
            exp = (row.get("Expiration date") or row.get("expiration_date") or "").strip()[:10]
            if npn:
                npns.add(npn)
            if lic:
                licenses.add(lic)
            if lt:
                types[lt] += 1
            states[st or "(blank)"] += 1
            if ot:
                org_types[ot] += 1
            if org:
                name += 1
            if ct:
                city += 1
            if z:
                zipc += 1
            if exp:
                if exp >= TODAY:
                    exp_future += 1
                else:
                    exp_past += 1
            else:
                exp_blank += 1
            if npn:
                rec = by_npn.setdefault(
                    npn,
                    {
                        "npn": npn,
                        "name": org,
                        "city": ct,
                        "state": st,
                        "zip": z[:5] if z else "",
                        "types": set(),
                        "licenses": set(),
                        "exp_max": exp,
                    },
                )
                if org and not rec["name"]:
                    rec["name"] = org
                if ct and not rec["city"]:
                    rec["city"] = ct
                if st and not rec["state"]:
                    rec["state"] = st
                if z and not rec["zip"]:
                    rec["zip"] = z[:5]
                if lt:
                    rec["types"].add(lt)
                if lic:
                    rec["licenses"].add(lic)
                if exp and exp > (rec["exp_max"] or ""):
                    rec["exp_max"] = exp
    tx_rows = states.get("TX", 0)
    tx_npn = sum(1 for r in by_npn.values() if r["state"] == "TX")
    return {
        "rows": rows,
        "header": header,
        "distinct_npn": len(npns),
        "distinct_tdi_license": len(licenses),
        "license_type_counts": dict(types.most_common()),
        "org_type_counts": dict(org_types.most_common(20)),
        "state_counts_top": dict(states.most_common(15)),
        "tx_state_field_rows": tx_rows,
        "tx_state_field_npn": tx_npn,
        "state_field_meaning": "Mailing/listed state on the agency row. License jurisdiction is Texas TDI. state=TX is not the licensed-in-Texas universe.",
        "expiration": {"on_or_after_today": exp_future, "before_today": exp_past, "blank": exp_blank, "today": TODAY},
        "contacts": {
            "BUSINESS_PHONE": {"present": False, "count": phone, "note": "column not in official schema"},
            "BUSINESS_EMAIL": {"present": False, "count": email, "note": "column not in official schema"},
            "WEBSITE": {"present": False, "count": website, "note": "column not in official schema"},
            "PHYSICAL_BUSINESS_ADDRESS": {"present": False, "count": address, "note": "street address not in official schema"},
            "CITY": {"present": True, "count": city},
            "POSTAL_CODE": {"present": True, "count": zipc},
            "NAME": {"present": True, "count": name},
        },
        "by_npn": by_npn,
    }


def profile_appointments(path: Path, agency_npns: set[str]) -> dict:
    print("profile agency appointments", flush=True)
    rows = 0
    npns: set[str] = set()
    naics: set[str] = set()
    both = 0
    unresolved_agency = 0
    unresolved_company = 0
    malformed = 0
    types: Counter[str] = Counter()
    per_agency: Counter[str] = Counter()
    per_company: Counter[str] = Counter()
    company_name: dict[str, str] = {}
    header: list[str] = []
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        header = list(reader.fieldnames or [])
        for row in reader:
            rows += 1
            npn = (row.get("Agency NPN") or row.get("npn") or "").strip()
            naic = (row.get("NAIC ID") or row.get("naic_id") or "").strip()
            co = (row.get("Insurance company name") or row.get("company") or "").strip()
            at = (row.get("Appointment type") or row.get("appointment_type") or "").strip()
            npn_ok = bool(re.fullmatch(r"\d+", npn))
            naic_ok = bool(re.fullmatch(r"\d{3,6}", naic))
            if not npn_ok or not naic_ok:
                malformed += 1
            if npn_ok:
                npns.add(npn)
                per_agency[npn] += 1
            else:
                unresolved_agency += 1
            if naic_ok:
                naics.add(naic)
                per_company[naic] += 1
                if co and naic not in company_name:
                    company_name[naic] = co
            else:
                unresolved_company += 1
            if npn_ok and naic_ok:
                both += 1
            if at:
                types[at] += 1
    in_agency_file = sum(1 for n in npns if n in agency_npns)
    not_in_agency_file = len(npns) - in_agency_file
    return {
        "rows": rows,
        "header": header,
        "distinct_agency_npn": len(npns),
        "distinct_naic": len(naics),
        "both_exact": both,
        "unresolved_agency": unresolved_agency,
        "unresolved_company": unresolved_company,
        "malformed_identifiers": malformed,
        "appointment_npn_also_in_agency_file": in_agency_file,
        "appointment_npn_not_in_agency_file": not_in_agency_file,
        "appointment_type_counts": dict(types.most_common()),
        "per_agency": dist_summary(Counter(per_agency.values())),
        "per_company": dist_summary(Counter(per_company.values())),
        "grain": "one active appointment between an insurance agency/business and an insurance company",
        "status_semantics": "Dataset is active appointments only. No termination column. Active date is when the appointment became active.",
        "per_agency_counts": per_agency,
        "company_name": company_name,
        "per_company_counts": per_company,
    }


def profile_simple(path: Path, name: str) -> dict:
    print("profile", name, flush=True)
    rows = 0
    header: list[str] = []
    col_nonempty: Counter[str] = Counter()
    extra: dict = {}
    entity_types: Counter[str] = Counter()
    status: Counter[str] = Counter()
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        header = list(reader.fieldnames or [])
        for row in reader:
            rows += 1
            for k, v in row.items():
                if nonempty(v):
                    col_nonempty[k] += 1
            et = (row.get("Entity type") or row.get("entity_type") or "").strip()
            if et:
                entity_types[et] += 1
            st = (row.get("License status") or row.get("license_status") or "").strip()
            if st:
                status[st] += 1
    extra["entity_type_counts"] = dict(entity_types.most_common())
    extra["license_status_counts"] = dict(status.most_common())
    extra["nonempty"] = dict(col_nonempty)
    extra["rows"] = rows
    extra["header"] = header
    return extra


def profile_title(path: Path) -> dict:
    print("profile title", flush=True)
    rows = 0
    agencies: set[str] = set()
    underwriters: set[str] = set()
    counties: set[str] = set()
    header: list[str] = []
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        header = list(reader.fieldnames or [])
        for row in reader:
            rows += 1
            lic = (row.get("License number") or row.get("agy_lic_nbr") or "").strip()
            uw = (row.get("Underwriter name") or row.get("underwriter_name") or "").strip()
            cty = (row.get("County") or row.get("county") or "").strip()
            if lic:
                agencies.add(lic)
            if uw:
                underwriters.add(uw)
            if cty:
                counties.add(cty)
    return {
        "rows": rows,
        "header": header,
        "distinct_title_agency_license": len(agencies),
        "distinct_underwriter_name": len(underwriters),
        "distinct_counties": len(counties),
        "grain": "active title underwriter appointment by county for a title agency or title direct operation",
        "no_county_pages": True,
    }


def profile_relationships(path: Path) -> dict:
    print("profile relationships", flush=True)
    rows = 0
    types: Counter[str] = Counter()
    person_agency = 0
    both_npn = 0
    header: list[str] = []
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        header = list(reader.fieldnames or [])
        for row in reader:
            rows += 1
            at = (row.get("Association type") or row.get("association_type") or "").strip()
            if at:
                types[at] += 1
            a = (row.get("Associated licensee NPN") or row.get("associated_licensee_npn") or "").strip()
            b = (row.get("Licensee NPN") or row.get("licensee_npn") or "").strip()
            if re.fullmatch(r"\d+", a) and re.fullmatch(r"\d+", b):
                both_npn += 1
    return {
        "rows": rows,
        "header": header,
        "association_type_counts": dict(types.most_common(30)),
        "both_npn_rows": both_npn,
        "grain": "non-appointment relationship between a licensee (person or business) and another licensee or company",
        "public_directory": False,
        "note": "Existing national layer treats NPN↔NPN as ASSOCIATED_WITH, not employment. Internal only on the Texas state page except aggregates.",
    }


def profile_complaints(path: Path) -> dict:
    print("profile complaints", flush=True)
    rows = 0
    years: Counter[str] = Counter()
    reasons: Counter[str] = Counter()
    lines: Counter[str] = Counter()
    dispositions: Counter[str] = Counter()
    companies: set[str] = set()
    naics: set[str] = set()
    header: list[str] = []
    date_min = date_max = ""
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        header = list(reader.fieldnames or [])
        for row in reader:
            rows += 1
            # discover likely fields
            for key, val in row.items():
                lk = (key or "").lower()
                v = (val or "").strip()
                if not v:
                    continue
                if "year" in lk:
                    years[v[:4]] += 1
                elif "reason" in lk or "type of complaint" in lk:
                    reasons[v] += 1
                elif "coverage" in lk or "line" in lk or "type of insurance" in lk:
                    lines[v] += 1
                elif "disposition" in lk or "resolution" in lk:
                    dispositions[v] += 1
                elif lk in {"naic", "naic id", "naic_id", "company naic"}:
                    naics.add(v)
                elif "company" in lk and "name" in lk:
                    companies.add(v)
                if "date" in lk:
                    d = v[:10]
                    if d:
                        if not date_min or d < date_min:
                            date_min = d
                        if not date_max or d > date_max:
                            date_max = d
            if rows == 1:
                extra_header_sample = dict(row)
    return {
        "rows": rows,
        "header": header,
        "year_counts": dict(sorted(years.items())[-15:]),
        "reason_counts_top": dict(reasons.most_common(15)),
        "line_counts_top": dict(lines.most_common(15)),
        "disposition_counts_top": dict(dispositions.most_common(15)),
        "distinct_company_name": len(companies),
        "distinct_naic": len(naics),
        "date_min": date_min or None,
        "date_max": date_max or None,
        "complaint_is_not_violation": True,
        "raw_count_is_not_quality": True,
        "name_only_attach": "UNSAFE",
        "first_row_keys": header,
    }


def profile_index(path: Path) -> dict:
    print("profile complaint index", flush=True)
    rows = 0
    header: list[str] = []
    years: Counter[str] = Counter()
    lines: Counter[str] = Counter()
    naics: set[str] = set()
    sample = None
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        header = list(reader.fieldnames or [])
        for row in reader:
            rows += 1
            if sample is None:
                sample = {k: (v[:120] if isinstance(v, str) else v) for k, v in row.items()}
            for k, v in row.items():
                lk = (k or "").lower()
                val = (v or "").strip()
                if not val:
                    continue
                if "year" in lk:
                    years[val[:4]] += 1
                elif "line" in lk or "coverage" in lk:
                    lines[val] += 1
                elif "naic" in lk:
                    naics.add(val)
    return {
        "rows": rows,
        "header": header,
        "year_counts": dict(sorted(years.items())),
        "line_counts_top": dict(lines.most_common(20)),
        "distinct_naic": len(naics),
        "sample_row": sample,
        "native_label": "TDI complaint index",
        "not_trusthub_score": True,
    }


def profile_rates(path: Path) -> dict:
    print("profile rate filings", flush=True)
    rows = 0
    header: list[str] = []
    lines: Counter[str] = Counter()
    companies: set[str] = set()
    serff: set[str] = set()
    sample = None
    date_min = date_max = ""
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        header = list(reader.fieldnames or [])
        for row in reader:
            rows += 1
            if sample is None:
                sample = {k: (v[:120] if isinstance(v, str) else v) for k, v in row.items()}
            for k, v in row.items():
                lk = (k or "").lower()
                val = (v or "").strip()
                if not val:
                    continue
                if "type of insurance" in lk:
                    lines[val] += 1
                elif lk in {"company name", "company_name"}:
                    companies.add(val)
                elif "serff" in lk:
                    serff.add(val)
                elif "date" in lk:
                    d = val[:10]
                    if d:
                        if not date_min or d < date_min:
                            date_min = d
                        if not date_max or d > date_max:
                            date_max = d
    return {
        "rows": rows,
        "header": header,
        "line_counts": dict(lines.most_common()),
        "distinct_company_name": len(companies),
        "distinct_serff": len(serff),
        "date_min": date_min or None,
        "date_max": date_max or None,
        "sample_row": sample,
        "rate_filing_is_not_consumer_premium": True,
        "requested_is_not_approved_unless_status_proves": True,
        "name_only_attach": "UNSAFE",
    }


def catalog_search(q: str) -> list[dict]:
    cat = get_json(
        "https://api.us.socrata.com/api/catalog/v1?"
        + urllib.parse.urlencode({"domains": "data.texas.gov", "q": q, "only": "datasets", "limit": "8"})
    )
    hits = []
    if isinstance(cat, dict):
        for row in cat.get("results") or []:
            res = row.get("resource") or {}
            hits.append({"id": res.get("id"), "name": res.get("name"), "updated": res.get("data_updated_at")})
    return hits


def main() -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    ART.mkdir(parents=True, exist_ok=True)
    LIB.mkdir(parents=True, exist_ok=True)
    PUB.mkdir(parents=True, exist_ok=True)
    report: dict = {"retrieved_at": datetime.now(timezone.utc).isoformat(), "today": TODAY}

    print("views meta", flush=True)
    report["meta"] = {}
    for key, ds in DATASETS.items():
        try:
            report["meta"][key] = views_meta(ds)
            print(f"  {key} {ds} cols={len(report['meta'][key]['columns'])} updated={unix_iso(report['meta'][key]['rowsUpdatedAt'])}", flush=True)
        except Exception as exc:  # noqa: BLE001
            report["meta"][key] = {"error": str(exc)}
            print("  ERR", key, exc, flush=True)

    # Person families: counts only, no dump.
    print("person family soda counts (no dump)", flush=True)
    try:
        report["person_licenses"] = {
            "id": "kxv3-diwf",
            "count": int(soda("kxv3-diwf", {"$select": "count(*) as n"})[0]["n"]),
            "types": soda("kxv3-diwf", {"$select": "license_type,count(*) as n", "$group": "license_type", "$order": "n DESC", "$limit": "30"}),
            "public_directory": False,
        }
        print("  person licenses", report["person_licenses"]["count"], flush=True)
    except Exception as exc:  # noqa: BLE001
        report["person_licenses"] = {"id": "kxv3-diwf", "error": str(exc), "public_directory": False}
    try:
        report["person_appointments"] = {
            "id": "bupb-23s9",
            "count": int(soda("bupb-23s9", {"$select": "count(*) as n"})[0]["n"]),
            "public_directory": False,
        }
        print("  person appointments", report["person_appointments"]["count"], flush=True)
    except Exception as exc:  # noqa: BLE001
        report["person_appointments"] = {"id": "bupb-23s9", "error": str(exc), "public_directory": False}

    report["downloads"] = {}
    for key, ds in DATASETS.items():
        dest = RAW / f"{key}.csv"
        if dest.exists() and dest.stat().st_size > 1000:
            print(f"reuse {dest.name} ({dest.stat().st_size} bytes)", flush=True)
            h = hashlib.sha256(dest.read_bytes()).hexdigest()
            report["downloads"][key] = {"reused": True, "bytes": dest.stat().st_size, "sha256": h, "path": str(dest.relative_to(ROOT))}
        else:
            try:
                report["downloads"][key] = download_csv(ds, dest)
            except Exception as exc:  # noqa: BLE001
                report["downloads"][key] = {"error": str(exc)}
                print("  ERR download", key, exc, flush=True)

    ag = profile_agencies(RAW / "agencies.csv")
    by_npn = ag.pop("by_npn")
    report["agencies"] = ag

    ap = profile_appointments(RAW / "agency_appointments.csv", set(by_npn))
    per_agency = ap.pop("per_agency_counts")
    per_company = ap.pop("per_company_counts")
    company_name = ap.pop("company_name")
    report["agency_appointments"] = ap

    report["surplus"] = profile_simple(RAW / "surplus.csv", "surplus")
    report["title"] = profile_title(RAW / "title.csv")
    report["relationships"] = profile_relationships(RAW / "relationships.csv")
    report["complaints"] = profile_complaints(RAW / "complaints.csv")
    report["complaint_index"] = profile_index(RAW / "complaint_index.csv")
    report["rate_filings"] = profile_rates(RAW / "rate_filings.csv")

    print("catalog enforcement / TWIA", flush=True)
    report["catalog"] = {}
    for q in ["enforcement order insurance TDI", "disciplinary insurance", "TWIA", "FAIR plan Texas", "workers compensation insurance company"]:
        try:
            report["catalog"][q] = catalog_search(q)
        except Exception as exc:  # noqa: BLE001
            report["catalog"][q] = {"error": str(exc)}

    report["authorized_companies"] = {
        "status": "SOURCE_NOT_ACQUIRED",
        "tool_url": "https://appscenter.tdi.texas.gov/tdireports/p/externalReports",
        "index_url": "https://www.tdi.texas.gov/webinfo/colists.html",
        "note": "Official authorized-company list is an interactive TDI reports tool, not a SODA dataset. No deterministic bulk export landed this ticket. Appointment NAIC is not the complete authorized-company universe.",
        "count": None,
    }

    # Compact public agency index (NPN grain) with appointment counts.
    print("write public agency index", flush=True)
    agencies_pub = []
    for npn, rec in by_npn.items():
        agencies_pub.append(
            {
                "npn": npn,
                "name": rec["name"],
                "city": rec["city"],
                "state": rec["state"],
                "zip": rec["zip"],
                "types": sorted(rec["types"]),
                "licenses": len(rec["licenses"]),
                "appointments": int(per_agency.get(npn, 0)),
                "exp_max": rec["exp_max"],
            }
        )
    agencies_pub.sort(key=lambda r: (-r["appointments"], r["name"] or "", r["npn"]))
    pub_ag = {
        "label": "TDI insurance agencies by NPN",
        "count": len(agencies_pub),
        "fields": ["npn", "name", "city", "state", "zip", "types", "licenses", "appointments", "exp_max"],
        "rows": agencies_pub,
        "note": "Appointment count is not quality. Street address, phone, and email are not in the official agency file.",
    }
    (PUB / "texas-tdi-agencies.json").write_text(json.dumps(pub_ag, separators=(",", ":")), encoding="utf-8")
    print("  agencies json bytes", (PUB / "texas-tdi-agencies.json").stat().st_size, flush=True)

    companies_pub = []
    for naic, n in per_company.most_common():
        companies_pub.append({"naic": naic, "name": company_name.get(naic, ""), "agency_appointments": int(n)})
    pub_co = {
        "label": "Companies appearing on active TDI agency appointments",
        "count": len(companies_pub),
        "rows": companies_pub,
        "note": "NAIC on an appointment is a Texas source relationship (active agency appointment). It is not by itself a complete TDI authorized-company universe.",
    }
    (PUB / "texas-tdi-appointment-companies.json").write_text(json.dumps(pub_co, separators=(",", ":")), encoding="utf-8")

    # Drop huge maps from report.
    slim = {k: v for k, v in report.items()}
    (ART / "acquisition-report.json").write_text(json.dumps(slim, indent=2, default=str) + "\n", encoding="utf-8")
    print("WROTE", ART / "acquisition-report.json", flush=True)
    print("AGENCIES", ag["rows"], "NPN", ag["distinct_npn"], "APPTS", ap["rows"], "NAIC", ap["distinct_naic"], flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
