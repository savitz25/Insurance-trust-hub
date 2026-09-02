#!/usr/bin/env python3
"""NJ-INS-002 IHC/SEH, Get Covered NJ, residual markets, CRIB, SERFF.

Internal-only. Does not mint /new-jersey, rankings, Trust Scores, or person/employer profiles.
Does not bypass CRIB/SERFF access controls. Does not copy credentials.
"""
from __future__ import annotations

import argparse
import hashlib
import html as html_lib
import json
import re
import ssl
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse, quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "nj-raw" / "nj-ins-002"
HTML_DIR = RAW / "html"
PDF_DIR = RAW / "pdf"
CRIB_DIR = RAW / "crib"
ENROLL_DIR = RAW / "enroll"
GEN = ROOT / "data" / "reports"
FIX = ROOT / "data" / "fixtures" / "nj-ins-002"
UA = "InsuranceTrustHub/NJ-INS-002 (research acquisition; +https://www.insurancetrusthub.com)"
CTX = ssl.create_default_context()
DATASET = "NJ_DOBI_MARKET_INTELLIGENCE"
HOST = "https://www.nj.gov"
IHCSEH = f"{HOST}/dobi/division_insurance/ihcseh"

CRIB_FIELDS = [
    "employer_name", "employer_street", "employer_city", "employer_state",
    "employer_zip", "employer_county", "policy_expiration_date", "policy_effective_date",
    "policy_governing_code", "estimated_annual_premium", "coverage_id",
    "bureau_company_number", "experience_effective_initial_usr",
    "experience_effective_final_usr", "total_premium", "total_losses",
    "current_modification_factor", "current_ppap", "njccpap", "loss_ratio",
    "producer_name", "producer_street", "producer_city", "producer_state",
    "producer_zip", "carrier_name",
]
CRIB_FIELD_COUNT = 26
ENTITY_HINT = re.compile(
    r"\b(LLC|INC\.?|CORP|COMPANY|CO\.|GROUP|INSURANCE|ASSOCIATION|HMO|CORPORATION)\b",
    re.I,
)
BRAND_HINT = re.compile(
    r"\b(Aetna|Horizon|Oscar|Ambetter|Oxford|AmeriHealth|UnitedHealthcare|United Healthcare|WellCare)\b",
    re.I,
)
QUARTER_RE = re.compile(r"(\d)(?:st|nd|rd|th)\s+Quarter\s*[-–]\s*(\d{4})", re.I)
PCT_RE = re.compile(r"(-?\d+(?:\.\d+)?)\s*%")
MONEY_RE = re.compile(r"\$([0-9,]+(?:\.\d{2})?)")
PLAN_RE = re.compile(
    r"(Gold|Silver|Bronze|Catastrophic|Platinum)\s+"
    r"(.+?)\s+"
    r"(EPO|HMO|POS|PPO)\s+"
    r"\$([0-9,]+\.\d{2})\s+"
    r"(.+)",
    re.I,
)


def iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def fingerprint(value: Any) -> str:
    return sha256_text(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")))


def normalize_space(text: str) -> str:
    text = html_lib.unescape((text or "").replace("\u00a0", " "))
    return re.sub(r"\s+", " ", text).strip()


def safe_urljoin(base_url: str, href: str) -> str:
    href = html_lib.unescape(href or "").strip().replace("\\", "/")
    href = re.sub(r"\s+", "%20", href)
    joined = urljoin(base_url, href)
    parsed = urlparse(joined)
    path = quote(parsed.path, safe="/%._-")
    return parsed._replace(path=path).geturl()


def html_to_text(html: str) -> str:
    work = re.sub(r"<(?:br|p|div|tr|li|h\d|td)[^>]*>", "\n", html, flags=re.I)
    work = re.sub(r"<[^>]+>", " ", work)
    return "\n".join(normalize_space(line) for line in html_lib.unescape(work).splitlines() if normalize_space(line))


def parse_int(raw: str | None) -> int | None:
    if raw is None or str(raw).strip() in {"", "-", "N/A"}:
        return None
    try:
        return int(str(raw).replace(",", "").strip())
    except ValueError:
        return None


def parse_float(raw: str | None) -> float | None:
    if raw is None or str(raw).strip() in {"", "-", "N/A"}:
        return None
    try:
        return float(str(raw).replace(",", "").replace("%", "").strip())
    except ValueError:
        return None


def observation(
    family: str,
    metric_name: str,
    record_id: str,
    *,
    value_numeric: float | None = None,
    value_text: str | None = None,
    unit: str | None = None,
    product_line: str | None = None,
    period_start: str | None = None,
    period_end: str | None = None,
    source_url: str | None = None,
    notes: str | None = None,
    raw: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "source_dataset": DATASET,
        "source_family": family,
        "metric_family": family,
        "metric_name": metric_name,
        "source_record_id": record_id,
        "value_numeric": value_numeric,
        "value_text": value_text,
        "unit": unit,
        "jurisdiction": "NJ",
        "geography_type": "state",
        "geography_value": "NJ",
        "product_line": product_line,
        "period_start": period_start,
        "period_end": period_end,
        "publication_allowed": False,
        "publication_readiness": "INTERNAL_ONLY",
        "monitoring_state": "baseline_only",
        "source_url": source_url,
        "notes": notes,
        "raw": raw or {},
        "ranking": False,
        "trust_score": False,
        "endorsement": False,
    }


def match_market_carrier(name: str, naic: str | None = None, hios: str | None = None) -> dict[str, Any]:
    name = normalize_space(name)
    result = {
        "legal_name": name,
        "naic_cocode": naic if naic and re.fullmatch(r"\d{5}", naic) else None,
        "hios_issuer_id": hios,
        "match_status": "UNRESOLVED",
        "match_method": "UNMATCHED_OFFICIAL_ROW",
        "public_eligibility": "internal_only",
        "marketplace_participation_is_endorsement": False,
    }
    if result["naic_cocode"]:
        result.update({"match_status": "EXACT", "match_method": "EXACT_NAIC_COCODE"})
        return result
    if hios:
        result["match_method"] = "HIOS_NOT_NAIC"
        result["match_status"] = "REVIEW_REQUIRED"
        return result
    brand = bool(BRAND_HINT.search(name))
    entity = bool(ENTITY_HINT.search(name))
    if brand and not entity:
        result.update({"match_status": "REVIEW_REQUIRED", "match_method": "MARKETING_OR_SHORT_NAME"})
        return result
    if entity:
        result.update({"match_status": "UNRESOLVED", "match_method": "NAME_ONLY_REJECTED"})
        return result
    result.update({"match_status": "REVIEW_REQUIRED", "match_method": "MARKETING_OR_SHORT_NAME"})
    return result


def parse_enrollment_index(html: str, base_url: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    parts = QUARTER_RE.split(html)
    # split keeps groups: text, qnum, year, text, qnum, year, ...
    i = 1
    while i + 1 < len(parts):
        qnum, year, chunk = parts[i], parts[i + 1], parts[i + 2] if i + 2 < len(parts) else ""
        next_q = QUARTER_RE.search(chunk)
        if next_q:
            chunk = chunk[: next_q.start()]
        quarter = int(qnum)
        y = int(year)
        period = f"{y}Q{quarter}"
        for href, label in re.findall(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', chunk, flags=re.I | re.S):
            label_n = normalize_space(re.sub(r"<[^>]+>", " ", label))
            low = (href + " " + label_n).lower()
            if "seh" in low:
                program = "SEH"
            elif "ihc" in low or "offmarketplace" in low or "off the marketplace" in low:
                program = "IHC"
            elif "getcoverednj" in low:
                program = "IHC"
            else:
                continue
            if "getcoverednj" in low:
                kind = "marketplace_portal"
            elif "off" in low and "market" in low:
                kind = "off_marketplace"
            elif "market" in low and "summary" in low:
                kind = "marketplace_summary"
            elif "shop" in low:
                kind = "shop"
            elif "direct" in low:
                kind = "direct"
            elif "prejan" in low or "pre-jan" in low or "pre january" in low:
                kind = "pre_jan_2014"
            elif "total" in low:
                kind = "total_plans"
            elif "carrier" in low:
                kind = "plans_by_carrier"
            elif href.lower().endswith(".pdf"):
                kind = "other_pdf"
            else:
                continue
            rows.append({
                "program": program,
                "year": y,
                "quarter": quarter,
                "period": period,
                "document_kind": kind,
                "label": label_n,
                "source_url": safe_urljoin(base_url, href),
                "ihc_seh_separated": True,
            })
        i += 3
    return rows


def parse_rate_change_html(html: str, source_url: str, plan_year: int | None = None) -> list[dict[str, Any]]:
    if plan_year is None:
        ym = re.search(r"(20\d{2})\s+IHC/SEH Average Rate Changes", html, re.I)
        plan_year = int(ym.group(1)) if ym else None
    text = html
    out: list[dict[str, Any]] = []
    sections = [
        ("IHC", r"Individual\s+Market\s+(20\d{2})\s+Rate Change(.*?)(?:Small Employer Market|Previous Years|$)", "NJ_IHC_RATE_CHANGE"),
        ("SEH", r"Small Employer Market\s+(20\d{2})\s+Rate Change(.*?)(?:Previous Years|$)", "NJ_SEH_RATE_CHANGE"),
    ]
    for program, pattern, family in sections:
        m = re.search(pattern, text, flags=re.I | re.S)
        if not m:
            continue
        year = int(m.group(1))
        body = m.group(2)
        for row in re.findall(r"<tr[^>]*>(.*?)</tr>", body, flags=re.I | re.S):
            cells = [normalize_space(re.sub(r"<[^>]+>", " ", c)) for c in re.findall(r"<td[^>]*>(.*?)</td>", row, flags=re.I | re.S)]
            if len(cells) < 2 or cells[0].lower() in {"carrier", ""}:
                continue
            name_raw = cells[0]
            marketplace = name_raw.endswith("*") or "*" in name_raw
            name = name_raw.replace("*", "").replace("+", "").strip()
            pct_m = PCT_RE.search(cells[1])
            if not pct_m:
                continue
            pct = float(pct_m.group(1))
            is_total = "total" in name.lower() or name.lower() in {"average", "avg", "market average"}
            ident = match_market_carrier(name) if not is_total else {
                "legal_name": name, "naic_cocode": None, "match_status": "UNRESOLVED",
                "match_method": "MARKET_TOTAL", "public_eligibility": "internal_only",
            }
            rec_id = fingerprint({"family": family, "year": year, "name": name, "pct": pct})
            out.append({
                "program": program,
                "family": family,
                "plan_year": year,
                "carrier_name": name,
                "average_rate_change_pct": pct,
                "marketplace_asterisk": marketplace and not is_total,
                "marketplace_participation_is_endorsement": False,
                "is_market_total": is_total,
                "rate_change_is_not_premium": True,
                "rate_change_is_not_quality": True,
                "identity": ident,
                "source_url": source_url,
                "source_record_id": rec_id,
                "observation": observation(
                    family, "average_rate_change_pct", rec_id,
                    value_numeric=pct, unit="percent", product_line=program,
                    period_start=f"{year}-01-01", period_end=f"{year}-12-31",
                    source_url=source_url,
                    notes="Official average total rate action. Not a personalized premium, quality score, or ranking.",
                    raw={"carrier": name, "marketplace_asterisk": marketplace, "identity": ident},
                ),
            })
    return out


def parse_off_marketplace_enrollment(text: str, source_url: str, year: int, quarter: int) -> list[dict[str, Any]]:
    rows = []
    period = f"{year}Q{quarter}"
    members = False
    for line in text.splitlines():
        low = line.lower()
        if "members/covered lives" in low or (members is False and re.search(r"hios\s+carrier", low)):
            if "members" in low:
                members = True
            continue
        if not members and "hios" not in low:
            continue
        m = re.match(
            r"\s*(\d{5}(?:/\d{5})?)\s+(.+?)\s+([0-9,]+)\s*$",
            line.strip(),
        )
        if not m:
            if line.strip().lower().startswith("grand total"):
                tot = parse_int(line.strip().split()[-1])
                rec_id = fingerprint({"ihc_off": period, "total": tot})
                rows.append({
                    "program": "IHC",
                    "channel": "off_marketplace",
                    "year": year,
                    "quarter": quarter,
                    "carrier_name": "Grand Total",
                    "enrollment": tot,
                    "missing_enrollment_is_zero": False,
                    "identity": {"match_status": "UNRESOLVED", "match_method": "MARKET_TOTAL"},
                    "source_url": source_url,
                    "source_record_id": rec_id,
                })
            continue
        hios, name, n = m.group(1), normalize_space(m.group(2)), parse_int(m.group(3))
        ident = match_market_carrier(name, hios=hios.split("/")[0])
        ident["hios_issuer_id"] = hios
        rec_id = fingerprint({"ihc_off": period, "hios": hios, "name": name})
        rows.append({
            "program": "IHC",
            "channel": "off_marketplace",
            "year": year,
            "quarter": quarter,
            "carrier_name": name,
            "hios_issuer_id": hios,
            "enrollment": n,
            "grain": "covered_lives",
            "missing_enrollment_is_zero": False,
            "ihc_is_not_seh": True,
            "identity": ident,
            "source_url": source_url,
            "source_record_id": rec_id,
            "observation": observation(
                "NJ_IHC_ENROLLMENT", "off_marketplace_enrollment", rec_id,
                value_numeric=n, unit="covered_lives", product_line="IHC",
                period_start=f"{year}-{(quarter - 1) * 3 + 1:02d}-01",
                source_url=source_url, raw={"hios": hios, "identity": ident},
            ),
        })
    return rows


def parse_ihc_plan_rates(text: str, source_url: str, plan_year: int) -> list[dict[str, Any]]:
    age_caveat = bool(re.search(r"age factor", text, re.I)) or "21-year" in text.lower()
    rows = []
    for metal, carrier, ptype, rate, rest in PLAN_RE.findall(text):
        rest_n = normalize_space(rest)
        off_ex = bool(re.search(r"off[\s-]*exchange", rest_n, re.I))
        marketplace = (bool(re.search(r"\bM\b", rest_n)) and not off_ex) or "Get Covered" in rest_n
        ident = match_market_carrier(carrier)
        rec_id = fingerprint({"ihc_plan": plan_year, "carrier": carrier, "metal": metal, "plan": rest_n, "rate": rate})
        rows.append({
            "program": "IHC",
            "plan_year": plan_year,
            "carrier_name": normalize_space(carrier),
            "metal": metal.title(),
            "plan_type": ptype.upper(),
            "monthly_base_rate": float(rate.replace(",", "")),
            "plan_name": rest_n,
            "marketplace_available": marketplace,
            "off_marketplace_available": off_ex or not marketplace,
            "base_rate_is_not_personalized_premium": True,
            "age_factor_caveat": age_caveat,
            "identity": ident,
            "source_url": source_url,
            "source_record_id": rec_id,
            "observation": observation(
                "NJ_IHC_PLAN_RATE", "monthly_base_rate", rec_id,
                value_numeric=float(rate.replace(",", "")), unit="usd_per_month",
                product_line="IHC", period_start=f"{plan_year}-01-01",
                source_url=source_url,
                notes="Monthly base rate from official schedule. Not a personalized premium.",
                raw={"metal": metal, "plan_type": ptype, "identity": ident, "age_factor_caveat": age_caveat},
            ),
        })
    return rows


def parse_seh_loss_ratio(text: str, source_url: str, year: int) -> list[dict[str, Any]]:
    rows = []
    for line in text.splitlines():
        m = re.match(
            r"\s*(.+?)\s+\$([0-9,]+(?:\.\d+)?)\s+\$([0-9,]+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+\$([0-9,]+(?:\.\d+)?)",
            line.strip(),
        )
        if not m:
            continue
        name = normalize_space(m.group(1))
        claims = float(m.group(2).replace(",", ""))
        premium = float(m.group(3).replace(",", ""))
        ratio = float(m.group(4))
        ident = match_market_carrier(name) if "total" not in name.lower() else {
            "legal_name": name, "match_status": "UNRESOLVED", "match_method": "MARKET_TOTAL",
        }
        rec_id = fingerprint({"seh_lr": year, "name": name, "premium": premium})
        rows.append({
            "program": "SEH",
            "year": year,
            "carrier_name": name,
            "incurred_claims": claims,
            "earned_premium": premium,
            "official_loss_ratio_pct": ratio,
            "loss_ratio_is_not_quality_score": True,
            "loss_ratio_is_not_federal_mlr": True,
            "identity": ident,
            "source_url": source_url,
            "source_record_id": rec_id,
            "observation": observation(
                "NJ_SEH_LOSS_RATIO", "official_loss_ratio_pct", rec_id,
                value_numeric=ratio, unit="percent", product_line="SEH",
                period_start=f"{year}-01-01", period_end=f"{year}-12-31",
                source_url=source_url,
                notes="New Jersey SEH loss ratio. Not a quality score and not the federal MLR.",
                raw={"claims": claims, "premium": premium, "identity": ident},
            ),
        })
    return rows


def parse_residual_programs(html: str, source_url: str) -> list[dict[str, Any]]:
    programs = [
        {
            "program_code": "NJIUA_FAIR",
            "program_name": "New Jersey Insurance Underwriting Association (FAIR Plan)",
            "anchor": "fair",
            "coverage_type": "property_fair_plan_and_crime_indemnity",
            "not_a_voluntary_insurer": True,
            "not_a_quality_tier": True,
        },
        {
            "program_code": "PAIP",
            "program_name": "New Jersey Personal Auto Insurance Plan (PAIP)",
            "anchor": "paip",
            "coverage_type": "residual_personal_auto",
            "oversees": "SAIP",
            "not_a_voluntary_insurer": True,
            "not_bad_driver_score": True,
        },
        {
            "program_code": "SAIP",
            "program_name": "Special Automobile Insurance Plan (SAIP)",
            "anchor": "paip",
            "coverage_type": "special_automobile_insurance_plan",
            "separate_from": "PAIP",
            "not_a_carrier": True,
            "not_a_credit_score": True,
            "source_note": "Official PAIP narrative states PAIP oversees the SAIP. No dedicated SAIP program page was published on propcas.htm.",
        },
        {
            "program_code": "CAIP",
            "program_name": "New Jersey Commercial Automobile Insurance Plan (CAIP)",
            "anchor": "caip",
            "coverage_type": "residual_commercial_auto",
            "separate_from": "PAIP",
            "not_a_voluntary_insurer": True,
            "not_unsafe_business_score": True,
        },
    ]
    text = html_to_text(html)
    out = []
    for prog in programs:
        present = bool(re.search(re.escape(prog["anchor"]), html, re.I)) or prog["program_code"] == "SAIP"
        rec_id = fingerprint({"residual": prog["program_code"], "url": source_url})
        row = {
            **prog,
            "source_url": source_url,
            "source_family": f"NJ_RESIDUAL_{prog['program_code']}",
            "concept": "RESIDUAL_MARKET_PROGRAM",
            "program_is_not_legal_carrier": True,
            "residual_placement_is_not_quality_flag": True,
            "source_unavailable_is_not_zero": True,
            "ranking": False,
            "operating_evidence": present,
            "source_record_id": rec_id,
            "identity": {
                "match_status": "UNRESOLVED",
                "match_method": "PROGRAM_NOT_LEGAL_CARRIER",
                "naic_cocode": None,
            },
            "excerpt": text[:500],
            "public_eligibility": "internal_only",
            "observation": observation(
                f"NJ_RESIDUAL_{prog['program_code']}", "program_operating_evidence", rec_id,
                value_text="operating" if present else "not_found",
                product_line=prog["coverage_type"], source_url=source_url,
                notes="Residual market program is not a voluntary insurer and is not a quality flag.",
                raw=prog,
            ),
        }
        out.append(row)
    return out


def parse_plan_risk(text: str, source_url: str, file_date: str | None = None) -> dict[str, Any]:
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if not lines:
        return {"rows": [], "profile": {"rows": 0, "schema_ok": False}}
    header = [h.strip() for h in lines[0].split("?")]
    schema_ok = len(header) == CRIB_FIELD_COUNT
    drift = None
    if not schema_ok:
        drift = f"expected {CRIB_FIELD_COUNT} fields, header has {len(header)}"
    rows = []
    for line in lines[1:]:
        parts = [p.strip() for p in line.split("?")]
        if len(parts) != CRIB_FIELD_COUNT:
            rows.append({
                "schema_error": True,
                "field_count": len(parts),
                "raw_line": line[:500],
                "public_eligibility": "internal_only",
            })
            continue
        rec = dict(zip(CRIB_FIELDS, parts))
        rec["estimated_annual_premium_missing_is_not_zero"] = rec["estimated_annual_premium"] == ""
        rec["mod_is_not_score"] = True
        rec["loss_ratio_is_not_score"] = True
        rec["plan_risk_is_not_unsafe_employer"] = True
        rec["employer_public_profile"] = False
        rec["producer_auto_attached"] = False
        rec["producer_match"] = {
            "match_status": "REVIEW_REQUIRED",
            "match_method": "NAME_ONLY_PRODUCER_NOT_AUTO_ATTACHED",
            "npn": None,
        }
        rec["carrier_match"] = {
            "legal_name": rec["carrier_name"],
            "bureau_company_number": rec["bureau_company_number"],
            "naic_cocode": None,
            "match_status": "REVIEW_REQUIRED",
            "match_method": "CRIB_COMPANY_NUMBER_WITHOUT_DOCUMENTED_NAIC_CROSSWALK",
        }
        rec["stable_key"] = fingerprint({
            "coverage_id": rec["coverage_id"],
            "bureau": rec["bureau_company_number"],
            "effective": rec["policy_effective_date"],
            "employer": rec["employer_name"],
        })
        rec["monitoring_state"] = "baseline_only"
        rec["public_eligibility"] = "internal_only"
        rec["source_url"] = source_url
        rows.append(rec)
    counties = {r.get("employer_county") for r in rows if r.get("employer_county")}
    carriers = {r.get("carrier_name") for r in rows if r.get("carrier_name")}
    producers = {r.get("producer_name") for r in rows if r.get("producer_name")}
    employers = {r.get("employer_name") for r in rows if r.get("employer_name")}
    return {
        "rows": rows,
        "profile": {
            "file_date": file_date,
            "rows": len(rows),
            "columns": CRIB_FIELD_COUNT,
            "header": header,
            "schema_ok": schema_ok,
            "schema_drift": drift,
            "delimiter": "?",
            "county_coverage": sorted(counties),
            "carrier_count": len(carriers),
            "producer_count": len(producers),
            "employer_count": len(employers),
            "mod_populated_rows": sum(1 for r in rows if r.get("current_modification_factor")),
            "ccpap_rows": sum(1 for r in rows if r.get("njccpap") and r.get("njccpap") not in {"", "000", "0"}),
            "exact_carrier_joins": 0,
            "review_required_producers": len(producers),
            "employer_attachment_status": "internal_only_no_public_profiles",
            "baseline_only": True,
            "recommended_stable_key": "coverage_id+bureau_company_number+policy_effective_date+employer_name",
        },
    }


def classify_crib_access(terms_text: str, dat_http_status: int | None) -> dict[str, Any]:
    guest = "members, subscribers, and guests" in (terms_text or "").lower() or "guests" in (terms_text or "").lower()
    db_forbid = "supplement a database" in (terms_text or "").lower()
    redistrib_forbid = "will not modify, copy, distribute" in (terms_text or "").lower() or "reproduce or copy" in (terms_text or "").lower()
    if dat_http_status == 200 and guest:
        classification = "PUBLIC_WITH_TERMS"
        coverage = "ACQUIRED_CURRENT_SNAPSHOT"
    elif dat_http_status in {401, 403}:
        classification = "LOGIN_REQUIRED" if dat_http_status == 401 else "SOURCE_ACCESS_BLOCKED"
        coverage = "SOURCE_ACCESS_BLOCKED"
    else:
        classification = "SOURCE_UNVERIFIED"
        coverage = "SOURCE_UNVERIFIED"
    return {
        "access_classification": classification,
        "coverage_state": coverage,
        "terms_reviewed": bool(terms_text),
        "login_bypass": False,
        "member_only_assignment_letters_skipped": True,
        "redistribution_forbidden": redistrib_forbid,
        "database_supplementation_restricted": db_forbid,
        "publication_allowed": False,
        "commit_raw_file": False,
        "notes": "PlanRisk DAT is downloadable without login. NJCRIB Terms of Use restrict copying/redistribution and using content to supplement a database. Internal profiling only; do not publish or commit the raw file.",
    }


def classify_serff_access(http_status: int | None, body: bytes | None = None) -> dict[str, Any]:
    if http_status == 200 and body:
        return {
            "access_classification": "OPEN_SEARCH_ONLY",
            "coverage_state": "OPEN_SEARCH_ONLY",
            "filings_acquired": 0,
            "bypass": False,
            "captcha_bypass": False,
            "private_api": False,
            "notes": "Public search page reachable. Bounded search only; no unlimited harvest.",
        }
    return {
        "access_classification": "SOURCE_ACCESS_BLOCKED",
        "coverage_state": "SOURCE_ACCESS_BLOCKED",
        "http_status": http_status,
        "filings_acquired": 0,
        "tracking_numbers": 0,
        "exact_naic": 0,
        "rate_filings": 0,
        "rule_filings": 0,
        "form_filings": 0,
        "bypass": False,
        "captcha_bypass": False,
        "private_api": False,
        "unlimited_harvest": False,
        "notes": "SERFF Filing Access home returned HTTP 403. No CAPTCHA bypass, private API, or access-control bypass attempted. Manual runbook only.",
    }


def get_covered_from_rate_changes(rate_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for row in rate_rows:
        if row.get("program") != "IHC" or row.get("is_market_total"):
            continue
        rec_id = fingerprint({"gcnj": row.get("plan_year"), "name": row["carrier_name"]})
        out.append({
            "plan_year": row.get("plan_year"),
            "carrier_name": row["carrier_name"],
            "participating": bool(row.get("marketplace_asterisk")),
            "ihc_carrier_is_not_automatically_marketplace_carrier": True,
            "marketplace_participation_is_not_endorsement": True,
            "identity": row.get("identity"),
            "source_url": row.get("source_url"),
            "source_family": "NJ_GET_COVERED_PARTICIPATION",
            "source_record_id": rec_id,
            "observation": observation(
                "NJ_GET_COVERED_PARTICIPATION",
                "marketplace_participation",
                rec_id,
                value_text="participating" if row.get("marketplace_asterisk") else "not_asterisked",
                product_line="IHC",
                period_start=f"{row.get('plan_year')}-01-01",
                source_url=row.get("source_url"),
                notes="Get Covered NJ asterisk on official IHC rate-change table. Not an endorsement or quality label. IHC writer is not automatically a marketplace carrier.",
                raw={"asterisk": row.get("marketplace_asterisk"), "identity": row.get("identity")},
            ),
        })
    return out


def fetch(url: str) -> dict[str, Any]:
    req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urlopen(req, context=CTX, timeout=60) as resp:
            return {"status": resp.status, "body": resp.read(), "final_url": resp.geturl(), "error": None}
    except HTTPError as exc:
        return {"status": exc.code, "body": b"", "final_url": url, "error": str(exc.reason)}
    except (URLError, TimeoutError, OSError) as exc:
        return {"status": None, "body": b"", "final_url": url, "error": str(exc)}


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def extract_pdf_text(data: bytes) -> str:
    if not data.startswith(b"%PDF"):
        return ""
    try:
        from io import BytesIO
        from pypdf import PdfReader
        reader = PdfReader(BytesIO(data))
        return "\n".join((page.extract_text() or "") for page in reader.pages[:30])
    except Exception:
        return ""


def parse_all(local_only: bool = True) -> dict[str, Any]:
    coverage: list[dict[str, Any]] = []
    observations: list[dict[str, Any]] = []
    enroll_index: list[dict[str, Any]] = []
    rate_rows: list[dict[str, Any]] = []
    ihc_enroll: list[dict[str, Any]] = []
    ihc_plans: list[dict[str, Any]] = []
    seh_lr: list[dict[str, Any]] = []
    residuals: list[dict[str, Any]] = []
    gcnj: list[dict[str, Any]] = []
    crib: dict[str, Any] = {"rows": [], "profile": {}, "access": {}}
    serff: dict[str, Any] = {}

    enroll_html_path = HTML_DIR / "ihc_enroll.html"
    if enroll_html_path.exists():
        enroll_index = parse_enrollment_index(load_text(enroll_html_path), f"{IHCSEH}/ihcsehenroll.html")
        years = sorted({r["year"] for r in enroll_index})
        coverage.append({
            "family": "NJ_IHC_ENROLLMENT",
            "coverage_state": "ACQUIRED_PARTIAL_HISTORY" if years else "SOURCE_NOT_ACQUIRED",
            "url": f"{IHCSEH}/ihcsehenroll.html",
            "years": years,
        })
        coverage.append({
            "family": "NJ_SEH_ENROLLMENT",
            "coverage_state": "ACQUIRED_PARTIAL_HISTORY" if years else "SOURCE_NOT_ACQUIRED",
            "url": f"{IHCSEH}/ihcsehenroll.html",
            "years": years,
        })

    for path in sorted(HTML_DIR.glob("rate_changes_*.html")):
        html = load_text(path)
        parsed = parse_rate_change_html(html, f"{IHCSEH}/averageratechanges/{path.stem.split('_')[-1]}.html")
        rate_rows.extend(parsed)
    index_rate = HTML_DIR / "rate_changes_index.html"
    if index_rate.exists():
        rate_rows.extend(parse_rate_change_html(load_text(index_rate), f"{IHCSEH}/averageratechanges/index.html"))
    for row in rate_rows:
        observations.append(row["observation"])
    gcnj = get_covered_from_rate_changes(rate_rows)
    for row in gcnj:
        observations.append(row["observation"])

    off_pdf = PDF_DIR / "ihcoffmarketplace.pdf"
    if off_pdf.exists():
        text = extract_pdf_text(off_pdf.read_bytes())
        ym = re.search(r"(20\d{2})\s+Q([1-4])", text)
        year = int(ym.group(1)) if ym else 2026
        q = int(ym.group(2)) if ym else 1
        ihc_enroll = parse_off_marketplace_enrollment(text, off_pdf.as_posix(), year, q)
        for row in ihc_enroll:
            if row.get("observation"):
                observations.append(row["observation"])

    for year, fname in ((2026, "ihcrates2026.pdf"), (2025, "ihcrates2025.pdf")):
        p = PDF_DIR / fname
        if p.exists():
            plans = parse_ihc_plan_rates(extract_pdf_text(p.read_bytes()), p.as_posix(), year)
            ihc_plans.extend(plans)
            for row in plans:
                observations.append(row["observation"])

    lr = PDF_DIR / "lossratio2024.pdf"
    if lr.exists():
        seh_lr = parse_seh_loss_ratio(extract_pdf_text(lr.read_bytes()), lr.as_posix(), 2024)
        for row in seh_lr:
            observations.append(row["observation"])

    propcas = HTML_DIR / "propcas.html"
    if propcas.exists():
        residuals = parse_residual_programs(load_text(propcas), f"{HOST}/dobi/division_insurance/propcas.htm")
        for row in residuals:
            observations.append(row["observation"])
        coverage.append({"family": "NJ_RESIDUAL_MARKETS", "coverage_state": "ACQUIRED_CURRENT_SNAPSHOT", "url": f"{HOST}/dobi/division_insurance/propcas.htm"})

    terms_path = CRIB_DIR / "terms_of_use.pdf"
    terms_text = extract_pdf_text(terms_path.read_bytes()) if terms_path.exists() else ""
    dat_path = CRIB_DIR / "PlanRiskDat.dat"
    dat_status = 200 if dat_path.exists() else None
    crib_access = classify_crib_access(terms_text, dat_status)
    if dat_path.exists() and crib_access["access_classification"] == "PUBLIC_WITH_TERMS":
        raw = dat_path.read_bytes()
        parsed = parse_plan_risk(raw.decode("latin-1", errors="replace"), "https://www.njcrib.com/FileDownload/PlanRiskDAT")
        crib = {
            "access": crib_access,
            "hash": sha256_bytes(raw),
            "bytes": len(raw),
            "file_acquired": True,
            **parsed,
        }
        coverage.append({"family": "NJ_CRIB_PLAN_RISK", "coverage_state": crib_access["coverage_state"], "url": "https://www.njcrib.com/FileDownload/PlanRiskDAT"})
    else:
        crib = {"access": crib_access, "file_acquired": False, "rows": [], "profile": {}}
        coverage.append({"family": "NJ_CRIB_PLAN_RISK", "coverage_state": crib_access["coverage_state"], "url": "https://www.njcrib.com/FileDownload/PlanRiskDAT"})

    serff_disc = ROOT / "data" / "reports" / "nj-ins-002-discovery.json"
    serff_status = 403
    if serff_disc.exists():
        try:
            disc = json.loads(serff_disc.read_text(encoding="utf-8"))
            serff_status = next((r.get("status") for r in disc if r.get("key") == "serff_nj"), 403)
        except json.JSONDecodeError:
            serff_status = 403
    serff = classify_serff_access(serff_status)
    coverage.append({"family": "NJ_SERFF_FILING", "coverage_state": serff["coverage_state"], "url": "https://filingaccess.serff.com/sfa/home/NJ"})

    monitoring = [
        {
            "source_family": fam,
            "event_key": f"{fam}:baseline:{iso()[:10]}",
            "event_kind": "baseline_snapshot",
            "baseline_only": True,
            "alerted": False,
        }
        for fam in [
            "NJ_IHC_ENROLLMENT", "NJ_SEH_ENROLLMENT", "NJ_IHC_RATE_CHANGE", "NJ_SEH_RATE_CHANGE",
            "NJ_GET_COVERED_PARTICIPATION", "NJ_RESIDUAL_NJIUA_FAIR", "NJ_RESIDUAL_PAIP",
            "NJ_RESIDUAL_SAIP", "NJ_RESIDUAL_CAIP", "NJ_CRIB_PLAN_RISK", "NJ_SERFF_FILING",
        ]
    ]

    return {
        "enroll_index": enroll_index,
        "rate_rows": rate_rows,
        "ihc_enrollment": ihc_enroll,
        "ihc_plans": ihc_plans,
        "seh_loss_ratio": seh_lr,
        "residuals": residuals,
        "get_covered": gcnj,
        "crib": crib,
        "serff": serff,
        "observations": observations,
        "coverage": coverage,
        "monitoring": monitoring,
        "local_only": local_only,
    }


def summarize(parsed: dict[str, Any]) -> dict[str, Any]:
    rate_rows = parsed["rate_rows"]
    ihc_rc = [r for r in rate_rows if r.get("program") == "IHC" and not r.get("is_market_total")]
    seh_rc = [r for r in rate_rows if r.get("program") == "SEH" and not r.get("is_market_total")]
    gcnj = parsed["get_covered"]
    enroll = parsed["ihc_enrollment"]
    crib = parsed["crib"]
    ident_ihc = [r.get("identity") or {} for r in ihc_rc]
    return {
        "ticket": "NJ-INS-002",
        "generated_at": iso(),
        "publication": {
            "new_jersey_route_created": False,
            "county_pages": False,
            "sitemap_change": False,
            "indexing_change": False,
            "public_insurer_expansion": False,
            "producer_person_publication": False,
            "crib_employer_publication": False,
            "ranking": False,
            "trust_score": False,
            "manual_vercel": False,
        },
        "ihc": {
            "rate_change_years": sorted({r.get("plan_year") for r in ihc_rc if r.get("plan_year")}),
            "rate_change_observations": len(ihc_rc),
            "carriers": sorted({r["carrier_name"] for r in ihc_rc}),
            "marketplace_asterisk_carriers": sorted({r["carrier_name"] for r in ihc_rc if r.get("marketplace_asterisk")}),
            "off_marketplace_enrollment_rows": len(enroll),
            "plan_counts": len(parsed["ihc_plans"]),
            "exact_naic": sum(1 for i in ident_ihc if i.get("match_status") == "EXACT"),
            "review_required": sum(1 for i in ident_ihc if i.get("match_status") == "REVIEW_REQUIRED"),
            "unresolved": sum(1 for i in ident_ihc if i.get("match_status") == "UNRESOLVED"),
        },
        "seh": {
            "rate_change_years": sorted({r.get("plan_year") for r in seh_rc if r.get("plan_year")}),
            "carriers": sorted({r["carrier_name"] for r in seh_rc}),
            "loss_ratio_years": sorted({r.get("year") for r in parsed["seh_loss_ratio"] if r.get("year")}),
            "loss_ratio_rows": len(parsed["seh_loss_ratio"]),
            "exact_naic": sum(1 for r in seh_rc if (r.get("identity") or {}).get("match_status") == "EXACT"),
        },
        "get_covered": {
            "plan_years": sorted({r.get("plan_year") for r in gcnj if r.get("plan_year")}),
            "participating": sorted({r["carrier_name"] for r in gcnj if r.get("participating")}),
            "not_asterisked_ihc_writers": sorted({r["carrier_name"] for r in gcnj if not r.get("participating")}),
        },
        "residuals": {
            "programs": [r["program_code"] for r in parsed["residuals"]],
            "ranking": False,
        },
        "crib": {
            "access": crib.get("access"),
            "file_acquired": crib.get("file_acquired"),
            "hash": crib.get("hash"),
            "bytes": crib.get("bytes"),
            "profile": {k: v for k, v in (crib.get("profile") or {}).items() if k != "header"},
        },
        "serff": parsed["serff"],
        "monitoring": {
            "baseline_only": True,
            "historical_alerts": 0,
            "families": [m["source_family"] for m in parsed["monitoring"]],
        },
        "coverage": parsed["coverage"],
        "database": {
            "available": False,
            "production_blocker": "No authorized InsuranceTrustHub database session in this worktree. Safe dormant code may merge.",
        },
        "invariants": {
            "ihc_ne_seh": True,
            "base_rate_ne_personalized_premium": True,
            "rate_change_ne_quality": True,
            "marketplace_ne_endorsement": True,
            "residual_ne_voluntary_insurer": True,
            "paip_ne_caip": True,
            "saip_ne_paip": True,
            "njiua_ne_legal_carrier": True,
            "mod_ne_score": True,
            "loss_ratio_ne_score": True,
            "filed_ne_approved": True,
            "no_serff_bypass": True,
            "no_crib_login_bypass": True,
        },
    }


def write_json(name: str, payload: Any) -> None:
    GEN.mkdir(parents=True, exist_ok=True)
    (GEN / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str), encoding="utf-8")


def run(mode: str) -> dict[str, Any]:
    parsed = parse_all(local_only=mode != "download")
    summary = summarize(parsed)
    summary["mode"] = mode
    write_json("nj-ins-002-summary.json", summary)
    write_json("nj-ins-002-coverage.json", parsed["coverage"])
    snap = {
        "ticket": "NJ-INS-002",
        "internal_only": True,
        "generated_at": iso(),
        "families": [c.get("family") for c in parsed["coverage"]],
        "approved_internal_metrics": [
            "IHC/SEH enrollment by official channel",
            "official average rate-change percentages",
            "monthly base rates with age-factor caveat",
            "Get Covered NJ asterisk participation",
            "residual-market program operating evidence",
            "CRIB Plan Risk residual WC observations (internal)",
        ],
        "blocked_metrics": [
            "best plan", "employer rankings", "most aggressive insurer",
            "Trust Score", "complaint leaderboard", "rate-change leaderboard",
            "personalized premium", "residual-market quality flags",
        ],
        "denominators": {
            "IHC_enrollment": "official quarterly covered lives / contracts as published",
            "rate_change": "carrier average total rate action for the plan year",
            "loss_ratio": "NJ SEH statutory loss ratio, not federal MLR",
        },
        "coverage_gaps": [
            "SERFF Filing Access HTTP 403",
            "IHC/SEH rate-change tables have no NAIC CoCodes",
            "CRIB Plan Risk has no documented NAIC crosswalk in the acquired file",
            "SAIP has no dedicated program page",
            "DOI 2008 enforcement still SOURCE_NOT_ACQUIRED from NJ-INS-001",
        ],
        "summary": summary,
    }
    write_json("nj-ins-002-internal-snapshot.json", snap)
    print(json.dumps({
        "mode": mode,
        "ihc_rate_rows": len([r for r in parsed["rate_rows"] if r.get("program") == "IHC"]),
        "seh_rate_rows": len([r for r in parsed["rate_rows"] if r.get("program") == "SEH"]),
        "ihc_plans": len(parsed["ihc_plans"]),
        "crib_rows": (parsed["crib"].get("profile") or {}).get("rows", 0),
        "serff": parsed["serff"].get("access_classification"),
    }, indent=2))
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["inspect", "download", "dry-run", "execute", "verify", "local-input"])
    args = parser.parse_args()
    run(args.mode)


if __name__ == "__main__":
    main()
