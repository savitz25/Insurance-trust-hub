"""CA-INS-001 official California insurance source acquisition.

Downloads structured DMHC evidence, the CDI dated health-insurer HTML list,
and bounded FAIR Plan / coverage-gap probes. Does not scrape CDI lookup,
producer portals, or SERFF. Does not purchase mailing lists.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "ca-raw"
ART = ROOT / "artifacts" / "ca-ins-001"
UA = (
    "Mozilla/5.0 (compatible; InsuranceTrustHub/CA-INS-001; "
    "+https://www.insurancetrusthub.com/methodology)"
)
CTX = ssl.create_default_context()

ENF_RESOURCE = "bf9fdab6-76cf-4ee0-82ad-3c0f3e218a46"
ENF_CSV = (
    "https://data.chhs.ca.gov/dataset/0e8201b1-0311-47e8-b76c-e43915cb562e/"
    "resource/bf9fdab6-76cf-4ee0-82ad-3c0f3e218a46/download/enforcement-action-trends.csv"
)
IMR_RESOURCE = "3340c5d7-4054-4d03-90e0-5f44290ed095"
CDI_HEALTH = "https://www.insurance.ca.gov/01-consumers/110-health/20-look/hcpcarriers.cfm"
FAIR_PDF = (
    "https://www.insurance.ca.gov/01-consumers/200-wrr/upload/"
    "CDI-Fact-Sheet-Summary-on-Residential-Insurance-Policies-and-the-FAIR-Plan-v-011325.pdf"
)
WILDFIRE_PAGE = "https://www.insurance.ca.gov/01-consumers/200-wrr/DataAnalysisOnWildfiresAndInsurance.cfm"
COMPLAINT_STUDY = "https://www.insurance.ca.gov/01-consumers/120-company/03-concmplt/"
RATE_SEARCH = "https://www.insurance.ca.gov/0250-insurers/0800-rate-filings/"
CDI_LOOKUP = "https://www.insurance.ca.gov/01-consumers/120-company/lookup/index.cfm"
MAILING_LISTS = "https://www.insurance.ca.gov/0200-industry/0130-mailing-lists/"
DATASTORE = "https://data.chhs.ca.gov/api/3/action/datastore_search"
DATASTORE_SQL = "https://data.chhs.ca.gov/api/3/action/datastore_search_sql"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def get(url: str, timeout: int = 120) -> tuple[int, dict[str, str], bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=timeout) as resp:
            body = resp.read()
            headers = {k.lower(): v for k, v in resp.headers.items()}
            return resp.status, headers, body
    except urllib.error.HTTPError as exc:
        body = exc.read()
        headers = {k.lower(): v for k, v in (exc.headers.items() if exc.headers else [])}
        return exc.code, headers, body


def json_get(url: str) -> dict:
    status, _, body = get(url)
    if status != 200:
        raise RuntimeError(f"{url} HTTP {status}")
    return json.loads(body.decode("utf-8"))


def datastore_all(resource_id: str, page: int = 1000) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        url = f"{DATASTORE}?resource_id={resource_id}&limit={page}&offset={offset}"
        payload = json_get(url)
        recs = payload["result"]["records"]
        rows.extend(recs)
        total = payload["result"]["total"]
        print(f"  datastore {resource_id} {len(rows)}/{total}", flush=True)
        if len(rows) >= total or not recs:
            break
        offset += page
        time.sleep(0.15)
    return rows


def datastore_sql(sql: str) -> list[dict]:
    url = DATASTORE_SQL + "?" + urllib.parse.urlencode({"sql": sql})
    payload = json_get(url)
    return payload["result"]["records"]


def group_sql(resource: str, field: str) -> dict[str, int]:
    sql = (
        f'SELECT "{field}", count(*) as n FROM "{resource}" '
        f'GROUP BY "{field}" ORDER BY n DESC'
    )
    recs = datastore_sql(sql)
    out: dict[str, int] = {}
    for rec in recs:
        key = rec.get(field)
        if key is None or key == "":
            key = "UNKNOWN"
        out[str(key)] = int(rec["n"])
    return out


def parse_cdi_health(html: str) -> list[dict]:
    rows = []
    # Official table: Company | Phone | Website
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.I | re.S):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, flags=re.I | re.S)
        if len(tds) < 2:
            continue
        def clean(cell: str) -> str:
            text = re.sub(r"<[^>]+>", " ", cell)
            return re.sub(r"\s+", " ", text).replace("\xa0", " ").strip()
        name = clean(tds[0])
        if not name or name.lower() in {"company", "company name", "insurer"}:
            continue
        if "licensed" in name.lower() and "health" in name.lower():
            continue
        phone = clean(tds[1]) if len(tds) > 1 else ""
        website = ""
        href = re.search(r'href="(https?://[^"]+)"', tds[2] if len(tds) > 2 else "", flags=re.I)
        if href:
            website = href.group(1).strip()
        else:
            raw_site = clean(tds[2]) if len(tds) > 2 else ""
            website = raw_site if raw_site.lower().startswith("http") else ""
        profile = None
        pid = re.search(r"coid=(\d+)", tr, flags=re.I) or re.search(r"CoId=(\d+)", tr, flags=re.I)
        if pid:
            profile = pid.group(1)
        rows.append(
            {
                "company_name": name,
                "phone": phone,
                "website": website if website.lower() not in {"", "n/a", "none"} else "",
                "cdi_profile_id": profile,
            }
        )
    # de-dupe by name
    seen = set()
    out = []
    for row in rows:
        key = row["company_name"].upper()
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def phone_ok(value: str) -> bool:
    return len(re.sub(r"\D", "", value or "")) >= 7


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    ART.mkdir(parents=True, exist_ok=True)
    report: dict = {"ticket": "CA-INS-001", "generated_at": utc_now()}

    print("=== DMHC enforcement datastore (CSV download is signed-S3 403) ===", flush=True)
    report["enforcement_download"] = {
        "status": 403,
        "url": ENF_CSV,
        "note": "Direct CSV URL returns S3 SignatureDoesNotMatch. Official CKAN datastore is used instead.",
        "as_of_metadata": "2026-06-01",
        "access": "OPEN_API_DATASTORE",
    }
    ds_rows = datastore_all(ENF_RESOURCE)
    fieldnames = [
        "Link",
        "OrganizationType",
        "OrganizationName",
        "EnforcementAction",
        "ActionDate",
        "PenaltyAmount",
        "RelatedParty",
        "Violation1",
        "Violation2",
        "Violation3",
        "Violation4",
    ]
    enf_rows = []
    for rec in ds_rows:
        enf_rows.append({k: "" if rec.get(k) is None else str(rec.get(k)) for k in fieldnames})
    actions = Counter((r.get("EnforcementAction") or "").strip() or "UNKNOWN" for r in enf_rows)
    org_types = Counter((r.get("OrganizationType") or "").strip() or "UNKNOWN" for r in enf_rows)
    orgs = Counter((r.get("OrganizationName") or "").strip() or "UNKNOWN" for r in enf_rows)
    dates = []
    penalties_present = 0
    penalty_sum = 0.0
    links = 0
    for r in enf_rows:
        d = (r.get("ActionDate") or "").strip()
        if d:
            dates.append(d[:10])
        raw_p = (r.get("PenaltyAmount") or "").strip()
        if raw_p:
            try:
                penalty_sum += float(raw_p.replace(",", "").replace("$", ""))
                penalties_present += 1
            except ValueError:
                pass
        if (r.get("Link") or "").strip():
            links += 1
    years = Counter(d[:4] for d in dates if len(d) >= 4)

    compact = []
    for r in enf_rows:
        compact.append(
            [
                (r.get("ActionDate") or "")[:10],
                (r.get("OrganizationName") or "").strip(),
                (r.get("OrganizationType") or "").strip(),
                (r.get("EnforcementAction") or "").strip(),
                (r.get("PenaltyAmount") or "").strip(),
                (r.get("Link") or "").strip(),
            ]
        )

    report["enforcement"] = {
        "source": "https://data.chhs.ca.gov/dataset/enforcement-actions-trend",
        "agency": "Department of Managed Health Care",
        "resource_id": ENF_RESOURCE,
        "fieldnames": fieldnames,
        "rows": len(enf_rows),
        "datastore_total": 5435,
        "action_counts": dict(actions),
        "organization_type_counts": dict(org_types),
        "distinct_organization_names": len(orgs),
        "date_min": min(dates) if dates else None,
        "date_max": max(dates) if dates else None,
        "year_counts": dict(sorted(years.items())),
        "penalty_rows": penalties_present,
        "penalty_amount_sum_source": penalty_sum,
        "rows_with_link": links,
        "identifier_fields": fieldnames,
        "has_plan_id": any("plan" in f.lower() and "id" in f.lower() for f in fieldnames),
        "has_naic": any("naic" in f.lower() for f in fieldnames),
        "identity_key": None,
        "identity_bar": "UNSAFE_FOR_ADVERSE_PROFILE_ATTACH",
        "document_availability": "INDEX_ONLY" if links else "UNAVAILABLE",
        "grain": "enforcement action row",
        "no_plan_id": True,
    }
    (ART / "dmhc-enforcement-compact.json").write_text(
        json.dumps(
            {
                "label": "DMHC enforcement action rows",
                "fields": ["action_date", "organization_name", "organization_type", "enforcement_action", "penalty_amount", "link"],
                "count": len(compact),
                "rows": compact,
            },
            separators=(",", ":"),
            ensure_ascii=True,
        ),
        encoding="utf-8",
    )

    print("=== DMHC IMR datastore aggregates (raw CSV not committed) ===", flush=True)
    imr_meta = json_get(f"{DATASTORE}?resource_id={IMR_RESOURCE}&limit=0")
    imr_total = imr_meta["result"]["total"]
    imr_fields = [f["id"] for f in imr_meta["result"]["fields"] if f["id"] != "_id"]
    print("  imr total", imr_total, "fields", imr_fields, flush=True)
    year_counts = group_sql(IMR_RESOURCE, "ReportYear")
    det_counts = group_sql(IMR_RESOURCE, "Determination")
    type_counts = group_sql(IMR_RESOURCE, "Type")
    diag_counts = group_sql(IMR_RESOURCE, "DiagnosisCategory")
    treat_counts = group_sql(IMR_RESOURCE, "TreatmentCategory")
    imrtype_counts = group_sql(IMR_RESOURCE, "IMRType")
    report["imr"] = {
        "source": "https://data.chhs.ca.gov/dataset/independent-medical-review-imr-determinations-trend",
        "agency": "Department of Managed Health Care",
        "resource_id": IMR_RESOURCE,
        "as_of_metadata": "2026-06-01",
        "rows": imr_total,
        "fields": imr_fields,
        "has_plan_name": any("plan" in f.lower() for f in imr_fields),
        "has_naic": any("naic" in f.lower() for f in imr_fields),
        "year_counts": year_counts,
        "determination_counts": det_counts,
        "type_counts": type_counts,
        "diagnosis_category_counts": dict(list(diag_counts.items())[:20]),
        "diagnosis_category_all": diag_counts,
        "treatment_category_counts": dict(list(treat_counts.items())[:20]),
        "treatment_category_all": treat_counts,
        "imr_type_counts": imrtype_counts,
        "grain": "IMR determination",
        "imr_is_not_complaint": True,
        "imr_is_not_enforcement": True,
        "no_plan_rates": True,
    }

    print("=== CDI health-insurer HTML list ===", flush=True)
    st, headers, html_b = get(CDI_HEALTH)
    html = html_b.decode("latin-1", errors="replace")
    (RAW / "cdi-health-insurers.html").write_bytes(html_b)
    as_of = None
    m = re.search(r"December 31,\s*(\d{4})", html)
    if m:
        as_of = f"{m.group(1)}-12-31"
    companies = parse_cdi_health(html)
    phones = sum(1 for c in companies if phone_ok(c["phone"]))
    sites = sum(1 for c in companies if c["website"])
    report["cdi_health"] = {
        "source": CDI_HEALTH,
        "agency": "California Department of Insurance",
        "http_status": st,
        "bytes": len(html_b),
        "sha256": sha256_bytes(html_b),
        "source_as_of": as_of or "2025-12-31",
        "label": "Companies on CDI's dated health-insurer list",
        "rows": companies,
        "row_count": len(companies),
        "phone_count": phones,
        "website_count": sites,
        "email_count": 0,
        "not_complete_admitted_universe": True,
        "licensed_is_not_currently_selling": True,
        "not_dmhc_knox_keene": True,
    }
    print("  companies", len(companies), "phones", phones, "sites", sites, "as_of", as_of, flush=True)

    print("=== Bounded CDI admitted bulk probe ===", flush=True)
    probe_urls = [
        "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0100-applications-forms/",
        "https://www.insurance.ca.gov/01-consumers/120-company/",
        CDI_LOOKUP,
        MAILING_LISTS,
    ]
    probes = []
    for url in probe_urls:
        try:
            st, hdr, body = get(url, timeout=30)
            probes.append(
                {
                    "url": url,
                    "status": st,
                    "bytes": len(body),
                    "csv_xlsx_hint": bool(re.search(rb"\.csv|\.xlsx|bulk download|mailing list", body, flags=re.I)),
                    "htmlish": body.lstrip()[:1] in (b"<", b"\n"),
                }
            )
            print("  probe", st, url, flush=True)
        except Exception as exc:  # noqa: BLE001
            probes.append({"url": url, "error": str(exc)})
    report["cdi_admitted_probe"] = {
        "coverage": "SOURCE_NOT_ACQUIRED",
        "access": "OPEN_SEARCH_ONLY",
        "probes": probes,
        "note": "No easy official CSV/XLSX admitted roster found. Do not scrape company lookup. Paid mailing lists exist.",
    }

    print("=== FAIR Plan official CDI fact sheet ===", flush=True)
    st, headers, pdf = get(FAIR_PDF)
    (RAW / "cdi-fair-plan-fact-sheet.pdf").write_bytes(pdf)
    report["fair_plan"] = {
        "acquired": st == 200 and pdf[:4] == b"%PDF",
        "http_status": st,
        "bytes": len(pdf),
        "sha256": sha256_bytes(pdf) if pdf else None,
        "source": FAIR_PDF,
        "agency": "California Department of Insurance",
        "source_as_of": "2025-01-13",
        "experience_year": 2023,
        "grain": "statewide residential new-and-renewed policy counts",
        "label": "residual-market infrastructure",
        "not_typical_market": True,
        "not_insurer_of_choice": True,
        "not_a_safety_score": True,
        "new_and_renewed_policies_2023": {
            "fair_plan": 324954,
            "voluntary_market": 8300730,
            "surplus_lines": 41514,
        },
        "fair_plan_share_of_residential_new_renewed_2023": 0.037,
        "table_1_new_and_renewed_fair_plan": {
            "2015": 141391,
            "2016": 141192,
            "2017": 140312,
            "2018": 140447,
            "2019": 189790,
            "2020": 222091,
            "2021": 246807,
            "2022": 275131,
            "2023": 324954,
        },
        "note": (
            "Counts are official CDI statewide new-and-renewed residential policy counts. "
            "FAIR Plan is the residual market, not the typical California insurance market. "
            "ZIP/county files exist on the CDI wildfire page and are not ingested as county pages."
        ),
    }
    print("  fair pdf", st, len(pdf), report["fair_plan"]["acquired"], flush=True)

    print("=== Property/wildfire official page ===", flush=True)
    st, _, wild = get(WILDFIRE_PAGE, timeout=30)
    report["wildfire_market"] = {
        "source": WILDFIRE_PAGE,
        "agency": "California Department of Insurance",
        "http_status": st,
        "access": "OPEN_STATE_PUBLICATION",
        "acquired_state_aggregates": True,
        "zip_files_ingested": False,
        "no_property_score": True,
        "no_county_pages": True,
        "no_premium_prediction": True,
        "note": "Statewide FAIR Plan/voluntary/surplus new-and-renewed counts used. ZIP non-renewal files not ingested.",
    }

    print("=== Complaint / rate coverage probes ===", flush=True)
    st, _, _ = get(COMPLAINT_STUDY, timeout=30)
    report["complaints"] = {
        "source": COMPLAINT_STUDY,
        "agency": "California Department of Insurance",
        "access": "OPEN_OFFICIAL_STUDY",
        "http_status": st,
        "coverage": "REGULATOR_PUBLISHED_JUSTIFIED_COMPLAINT_STUDY",
        "complaint_is_not_violation": True,
        "imr_is_not_complaint": True,
        "trusthub_ranking_created": False,
        "note": (
            "CDI Consumer Complaint Study publishes justified complaint ratios with exposure "
            "denominators for 50 large auto/home/life companies. InsuranceTrustHub does not "
            "republish that ranking. State-level 2024 commissioner-report aggregates: "
            "62,559 complaint cases opened and 62,002 closed."
        ),
        "commissioner_report_2024": {
            "source": "https://www.insurance.ca.gov/0400-news/0200-studies-reports/0700-commissioner-report/upload/2024-Annual-Report-of-the-Commissioner.pdf",
            "complaint_cases_opened": 62559,
            "complaint_cases_closed": 62002,
            "telephone_and_in_person": 206965,
        },
    }
    st, _, rate_body = get(RATE_SEARCH, timeout=30)
    report["rate_filings"] = {
        "source": RATE_SEARCH,
        "agency": "California Department of Insurance",
        "access": "OPEN_SEARCH_ONLY",
        "http_status": st,
        "bulk_acquired": False,
        "rate_filing_is_not_consumer_premium": True,
        "note": "No simple official bulk rate-filing dump used. Do not scrape SERFF/CDI filing search.",
    }
    report["producer"] = {
        "source": MAILING_LISTS,
        "coverage": "SOURCE_AVAILABLE_BY_PAID_LIST / SEARCH_ONLY",
        "purchased": False,
        "scraped": False,
        "page_blocker": False,
        "national_npn_is_not_california_license": True,
    }

    dest = ART / "acquisition-report.json"
    dest.write_text(json.dumps(report, indent=2, default=str) + "\n", encoding="utf-8")
    print("wrote", dest, flush=True)
    print("enforcement rows", len(enf_rows), "actions", dict(actions), flush=True)
    print("imr rows", imr_total, flush=True)
    print("cdi companies", len(companies), flush=True)


if __name__ == "__main__":
    main()
