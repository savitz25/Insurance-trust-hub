#!/usr/bin/env python3
"""NV-INS-001: turn the raw NDOI captures into the committed Nevada extracts.

Stdlib only (plus the stdlib zipfile/xml reader for the complaint workbooks). Reads the gitignored
captures in data/nevada/nv-ins-001/raw/ (written by capture_ndoi.py) and writes the committed extracts
next to them. CI never runs this file; `build_snapshot.py --check` rebuilds the accepted snapshot from
the committed extracts.

Privacy (MA-INS-001P / TN-INS-001 precedent):
- Complaint workbooks name respondents in a 30-character field that includes individual people
  ("Last, First Middle"). No respondent name is written anywhere; only aggregate counts are kept.
- No email address, phone number or street address is committed. The market report's census figures
  are regulator statements, kept verbatim with their own clock.
- The one current enforcement order is a company respondent; its caption and cause number are public
  and are kept. The PDF body is not republished.
"""
from __future__ import annotations

import hashlib
import html
import io
import json
import re
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/nevada/nv-ins-001"
RAW = SRC / "raw"
DOI = "https://doi.nv.gov"
VERSION = "insurance-nv-state-intel-v1"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
# "Last, First" / "Last, First Middle" / "Last, First Jr": the source's own individual-name format.
PERSON_FORMAT = re.compile(r"^[A-Za-z'\-]+, [A-Za-z'\-]+(?: [A-Za-z'\-.]+){0,3}$")


def need(cond: bool, message: str) -> None:
    if not cond:
        sys.exit(f"NV-INS-001 extract: {message}")


def raw_meta(name: str) -> dict:
    meta = json.loads((RAW / f"{name}.meta.json").read_text(encoding="utf-8"))
    data = (RAW / name).read_bytes()
    need(hashlib.sha256(data).hexdigest() == meta["sha256"], f"{name} bytes differ from its capture record")
    return {k: meta[k] for k in ("url", "final_url", "status", "retrieved_at", "last_modified", "content_type", "bytes", "sha256", "request_rejected")}


def page_text(name: str) -> str:
    s = (RAW / name).read_text(encoding="utf-8", errors="replace")
    s = re.sub(r"(?s)<script.*?</script>|<style.*?</style>", " ", s)
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", s)).split())


def links(name: str) -> list[tuple[str, str]]:
    s = (RAW / name).read_text(encoding="utf-8", errors="replace")
    s = re.sub(r"(?s)<script.*?</script>", " ", s)
    out = []
    for href, label in re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', s, re.S):
        out.append((html.unescape(href), " ".join(html.unescape(re.sub(r"<[^>]+>", " ", label)).split())))
    return out


def pdf_text(name: str, layout: bool = False) -> str:
    args = ["pdftotext"] + (["-layout"] if layout else []) + [str(RAW / name), "-"]
    return subprocess.run(args, check=True, capture_output=True).stdout.decode("utf-8", errors="replace")


# ---------------------------------------------------------------- market report census (regulator statements)
def market_report() -> dict:
    flat = " ".join(pdf_text("imr-2025.pdf").split())
    exec_summary = re.search(
        r"Division regulates the ([\d,]+) active licensees operating in Nevada, composed of ([\d,]+) individuals, "
        r"([\d,]+) agencies, and ([\d,]+) captives\. The individual licensee pool consists of ([\d,]+) residents and "
        r"([\d,]+) non-residents\. Agency licensees consist of ([\d,]+) residents and ([\d,]+) non-resident firms\. "
        r"In Nevada there are ([\d,]+) licensed domestic and foreign insurers, ([\d,]+) captive insurers, ([\d,]+) sponsored "
        r"captive cells, ([\d,]+) self-insured employers \(SIE\), and ([\d,]+) active self-insured groups \(SIGs\)\. "
        r"Additionally, there are approximately ([\d,]+) insurers which compose the state's non-admitted market, known as "
        r"surplus-lines insurance\. \(Figures are as of (\w+ \d{4})\)\.", flat)
    need(exec_summary is not None, "market report executive-summary census passage moved")
    n = [int(x.replace(",", "")) for x in exec_summary.groups()[:14]]
    producer = re.search(r"Roughly (\d+)% of all licensees \(([\d,]+) individuals and agencies\) hold a producer license\.", flat)
    need(producer is not None, "producer-license share passage moved")
    complaints = re.search(r"For Fiscal Year 2024, the section responded to approximately ([\d,]+) consumer inquiries and "
                           r"investigated ([\d,]+) consumer complaints", flat)
    need(complaints is not None, "FY2024 consumer services passage moved")
    exams = re.search(r"For the 2022 and 2023 calendar years, the Division participated in (\d+) financial examinations of "
                      r"domestic insurers\. During that time, the Division conducted (\d+) regulatory examinations of "
                      r"\"non-traditional\" insurers\.", flat)
    need(exams is not None, "examination passage moved")
    # The report says the total is "composed of" individuals, agencies and captives, but the stated total equals
    # individuals + agencies exactly; the 147 captives are not in the arithmetic. Recorded, never "fixed".
    need(n[1] + n[2] == n[0] and n[1] + n[2] + n[3] != n[0], "report's stated total arithmetic changed; review")
    need(n[4] + n[5] == n[1] and n[6] + n[7] == n[2], "resident / non-resident partitions")
    return {
        "document": "2025 Insurance Market Report for the 83rd Legislative Session",
        "publisher": "Nevada Division of Insurance",
        "figures_as_of_statement": f"Figures are as of {exec_summary.group(15)}.",
        "figures_as_of": "2024-10",
        "passages_verbatim": [exec_summary.group(0), producer.group(0), complaints.group(0) + ".", exams.group(0)],
        "licensees": {
            "report_stated_active_licensee_total": n[0],
            "report_total_mixes_grains": True,
            "report_total_equals_individuals_plus_agencies": True,
            "report_total_excludes_listed_captives": True,
            "republished_as_combined_total": False,
            "individual_licensees": n[1], "individual_resident": n[4], "individual_non_resident": n[5],
            "agency_licensees": n[2], "agency_resident": n[6], "agency_non_resident": n[7],
            "captive_licensees": n[3],
            "producer_license_share_pct": int(producer.group(1)),
            "producer_license_holders_individuals_and_agencies": int(producer.group(2).replace(",", "")),
        },
        "companies": {
            "licensed_domestic_and_foreign_insurers": n[8],
            "captive_insurers": n[9],
            "sponsored_captive_cells": n[10],
            "self_insured_employers": n[11],
            "self_insured_groups_active": n[12],
            "surplus_lines_insurers_approximate": n[13],
            "surplus_lines_is_non_admitted": True,
            "never_summed": True,
        },
        "consumer_services_fy2024": {
            "inquiries_approximate": int(complaints.group(1).replace(",", "")),
            "complaints_investigated": int(complaints.group(2).replace(",", "")),
            "volume_is_not_a_provider_count": True,
        },
        "examinations_2022_2023": {
            "financial_examinations_of_domestic_insurers": int(exams.group(1)),
            "regulatory_examinations_of_non_traditional_insurers": int(exams.group(2)),
            "examination_is_not_a_score": True,
        },
    }


# ---------------------------------------------------------------- enforcements & orders (current page)
def enforcement() -> dict:
    t = page_text("enforcements-orders.html")
    items = re.findall(r"(ORDER|ORDERS|NOTICE|DECISION)\s*:\s*In the Matter of (.+?), Cause No\.?\s*([\d.]+),\s*"
                       r"(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})", t)
    need(len(items) == 1, f"expected exactly one listed order, found {len(items)}")
    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    kind, respondent, cause, month, day, year = items[0]
    body = " ".join(pdf_text("order-26-0028.pdf").split())
    need("CONSENT AGREEMENT AND ORDER" in body, "order type as printed")
    need(f"Cause No. {cause}" in body, "cause number printed on the order")
    printed_ids = {
        "naic": re.findall(r"NAIC[^0-9]{0,20}(\d{5})", body),
        "npn": re.findall(r"NPN[^0-9]{0,10}(\d{4,10})", body),
        "nv_license": re.findall(r"[Ll]icense (?:No\.|Number)\s*([\w-]+)", body),
    }
    doc = next(h for h, _ in links("enforcements-orders.html") if h.lower().endswith(".pdf") and "Cause" in h)
    return {
        "page": f"{DOI}/News_Notices/Enforcements___Orders/",
        "page_scope": "The NDOI Enforcements & Orders page lists only the current posting; no archive index is published there.",
        "archived_copies_found": 0,
        "listed_orders": 1,
        "orders": [{
            "listing_label": kind,
            "respondent_as_listed": respondent,
            "respondent_grain": "business_entity_not_an_insurer",
            "respondent_note": "The order states the respondent does not hold a Nevada Third-Party Administrator Certificate of Registration.",
            "cause_number": cause,
            "order_type_as_printed": "Consent Agreement and Order",
            "listed_date": date(int(year), months.index(month) + 1, int(day)).isoformat(),
            "identifiers_printed": {k: v for k, v in printed_ids.items()},
            "exact_attachment": None,
            "source_document": f"{DOI}{doc}" if doc.startswith("/") else doc,
            "pdf_parsed_for": "order type, cause number and printed identifiers only",
        }],
        "coverage_2024_to_2026": "PARTIAL",
        "orders_before_current_posting": "NOT_ACQUIRED",
    }


# ---------------------------------------------------------------- MHPAEA company report index (Publications)
def mhpaea() -> dict:
    rows = []
    for href, label in links("publications.html"):
        if "Draft Report" in href and href.lower().endswith(".pdf"):
            m = re.search(r"Draft Report(?: SK)? (\d{1,2})\.(\d{1,2})\.(\d{2})", href)
            rows.append({"company_as_listed": label, "document_label": "Draft Report",
                         "file_name_date": f"20{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}" if m else None,
                         "source_document": f"{DOI}{href}" if href.startswith("/") else href})
    need(len(rows) == 17, f"expected 17 MHPAEA company reports, found {len(rows)}")
    return {
        "page": f"{DOI}/News_Notices/Publications/",
        "section": "Mental Health Parity and Addiction Equity Act (MHPAEA) non-quantitative treatment limitation reports",
        "company_reports": len(rows),
        "rows": sorted(rows, key=lambda r: r["company_as_listed"].lower()),
        "pdfs_parsed": False,
        "draft_report_is_not_a_finding": True,
        "exact_naic_attachments": 0,
        "name_only_attachment": "UNSUPPORTED",
    }


# ---------------------------------------------------------------- consumer complaint data (aggregates only)
def xlsx_rows(zip_name: str) -> list[list[str]]:
    outer = zipfile.ZipFile(RAW / zip_name)
    need(len(outer.namelist()) == 1, f"{zip_name} holds one workbook")
    book = zipfile.ZipFile(io.BytesIO(outer.read(outer.namelist()[0])))
    shared = []
    if "xl/sharedStrings.xml" in book.namelist():
        for si in ET.fromstring(book.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
    sheet = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
    out = []
    for row in sheet.iter(f"{{{NS['m']}}}row"):
        cells = {}
        for c in row.findall("m:c", NS):
            ref = re.match(r"([A-Z]+)", c.get("r")).group(1)
            col = sum((ord(ch) - 64) * 26 ** i for i, ch in enumerate(reversed(ref))) - 1
            v = c.find("m:v", NS)
            if v is None:
                inline = c.find("m:is", NS)
                val = "".join(t.text or "" for t in inline.iter(f"{{{NS['m']}}}t")) if inline is not None else ""
            elif c.get("t") == "s":
                val = shared[int(v.text)]
            else:
                val = v.text or ""
            cells[col] = val
        if cells:
            out.append([cells.get(i, "") for i in range(max(cells) + 1)])
    return out


def serial(v: str) -> str | None:
    v = v.strip()
    if not v:
        return None
    if re.fullmatch(r"\d+(\.\d+)?", v):
        return (date(1899, 12, 30) + timedelta(days=int(float(v)))).isoformat()
    return v[:10]


def ordered(c: Counter) -> dict:
    return dict(sorted(c.items(), key=lambda kv: (-kv[1], kv[0])))


def complaints() -> dict:
    header = ["RESPONDENT NAME", "OPENED DATE", "CLOSED DATE", "COVERAGE TYPE", "COVERAGE LEVEL 1", "COVERAGE LEVEL 2",
              "REASON CATEGORY", "REASON TYPE", "DISPOSITIONS"]
    years = {}
    for year in (2022, 2023, 2024):
        rows = xlsx_rows(f"complaints-{year}.zip")
        need([c.strip() for c in rows[0][:9]] == header, f"{year} header moved")
        data = [r + [""] * (9 - len(r)) for r in rows[1:] if any(x.strip() for x in r[:9])]
        opened = [serial(r[1]) for r in data]
        need(all(o and o.startswith(str(year)) for o in opened), f"{year} rows are opened in {year}")
        respondents = Counter(r[0].strip() for r in data)
        person_rows = sum(n for name, n in respondents.items() if PERSON_FORMAT.match(name))
        truncated = sum(1 for name in respondents if len(name) == 30)
        years[str(year)] = {
            "complaint_reason_rows": len(data),
            "opened_first": min(opened), "opened_last": max(opened),
            "closed_blank_rows": sum(1 for r in data if not r[2].strip()),
            "distinct_respondent_strings": len(respondents),
            "respondent_strings_at_30_char_limit": truncated,
            "rows_with_individual_name_format_respondent": person_rows,
            "coverage_type": ordered(Counter(r[3].strip() or "(blank)" for r in data)),
            "reason_category": ordered(Counter(r[6].strip() or "(blank)" for r in data)),
            "disposition": ordered(Counter(r[8].strip() or "(blank)" for r in data)),
        }
    earlier = sorted({m.group(1) for h, _ in links("consumer-complaint-report.html")
                      for m in [re.search(r"(20\d\d)\.zip$", h)] if m and int(m.group(1)) < 2022})
    return {
        "page": f"{DOI}/Consumers/Consumer_Complaint_Report/",
        "grain": "complaint-reason row (one complaint can print one row per reason; rows are not complaints)",
        "columns_as_published": header,
        "years_acquired": years,
        "earlier_years_published_not_acquired": earlier,
        "respondent_names_committed": False,
        "respondent_names_published_here": False,
        "respondent_field_is_truncated_at_30_characters": True,
        "respondents_include_individual_people": True,
        "identifiers_printed": {"naic": False, "npn": False, "complaint_id": False},
        "exact_attachments": 0,
        "name_only_attachment": "UNSUPPORTED",
        "complaint_is_not_enforcement": True,
        "complaint_count_is_not_quality_score": True,
        "no_company_complaint_ranking": True,
    }


# ---------------------------------------------------------------- capability facts from official pages
def capabilities() -> dict:
    lists = page_text("producer-and-company-lists.html")
    need("download lists by license or qualification types for producers and agencies" in lists, "self-serve list wording")
    need("business emails, addresses, and phone numbers" in lists, "export privacy wording")
    lookup = page_text("di-licensing-search.html")
    need("Surplus-lines insurers will not be visible using this lookup tool" in lookup, "lookup surplus-lines caveat")
    need("Company Lookup" in lookup and "Agency Lookup" in lookup and "Agent Lookup" in lookup, "three lookups")
    complaint = page_text("file-a-complaint.html")
    need("An investigator will be assigned to the case" in complaint, "complaint intake wording")
    captive = page_text("captive-insurance.html")
    need("regulated form of self-insurance" in captive, "captive wording")
    admissions = [label for h, label in links("company-admissions.html") if h.lower().endswith(".pdf") and ("_Application_Checklist" in h or "Certificate_of_Registration" in h or "Risk_Purchasing_Group" in h)]
    return {
        "self_serve_lists": {
            "statement_verbatim": "Producer lists are now readily available to download by visiting the Division's self-serve website. "
                                  "This page allows you to download lists by license or qualification types for producers and agencies. "
                                  "Please note that only the producer's business information such as their business emails, addresses, "
                                  "and phone numbers are available.",
            "url": "https://di.nv.gov/nv/r/doi/reports-and-lookups/home",
            "public_no_login": True,
            "automated_access_result": "REJECTED_BY_BOT_DEFENSE",
            "automated_access_note": "curl and a Chrome session were both answered with an F5 \"Request Rejected\" page; "
                                     "the reports page answered a plain HTTP client with a redirect loop. No bypass was attempted.",
            "manual_download_path": "Download by license/qualification type from the self-serve site into data/nv-raw/ (Phase 14 procedure).",
        },
        "license_lookup": {
            "url": "https://di.nv.gov/nv/r/doi/licensing/search",
            "lookups": ["Company Lookup", "Agency Lookup", "Agent Lookup"],
            "surplus_lines_visible": False,
            "caveat_verbatim": "Note: Surplus-lines insurers will not be visible using this lookup tool.",
            "search_is_not_a_download": True,
        },
        "company_admission_instruments": {
            "source": f"{DOI}/Insurers/Company-Admissions/",
            "application_types_listed": len(admissions),
            "instrument_examples": ["Certificate of Authority", "Certificate of Registration (foreign Risk Retention Group)"],
            "instruments_never_collapsed_to_licensed": True,
        },
        "complaint_intake": {"url": f"{DOI}/Consumers/File-A-Complaint/", "online_portal": "Sircon consumer portal", "status": "KNOWN"},
        "serff": {"url": "https://filingaccess.serff.com/sfa/home/nv", "status": "KNOWN",
                  "statement": "Life, Health, Property and Casualty rates, rules and forms filed with the Division are available through SERFF Filing Access.",
                  "filings_are_not_ratings_or_prices": True},
        "captive": {"url": f"{DOI}/Captive-Insurance/", "captive_is_not_a_traditional_insurer_license": True},
        "public_records": {"url": f"{DOI}/News-Notices/Records/", "status": "REQUEST_ONLY"},
    }


def dump(name: str, obj: dict) -> str:
    text = json.dumps(obj, indent=2, ensure_ascii=False) + "\n"
    (SRC / name).write_text(text, encoding="utf-8")
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def main() -> None:
    captures = {p.name[:-10]: raw_meta(p.name[:-10]) for p in sorted(RAW.glob("*.meta.json"))}
    need(all(m["status"] == 200 for k, m in captures.items() if not k.startswith("di-")), "every doi.nv.gov capture is 200")
    extracts = {
        "market-report-census.json": market_report(),
        "enforcement-orders-index.json": enforcement(),
        "mhpaea-company-reports-index.json": mhpaea(),
        "complaint-data.json": complaints(),
        "capability-pages.json": capabilities(),
    }
    hashes = {name: dump(name, obj) for name, obj in extracts.items()}
    sources = {
        "version": VERSION,
        "ticket": "NV-INS-001",
        "regulator": "Nevada Division of Insurance (NDOI), Department of Business and Industry",
        "captures": {k: {kk: vv for kk, vv in v.items()} for k, v in captures.items()},
        "extract_sha256": hashes,
    }
    dump("sources.json", sources)
    for name, h in hashes.items():
        print(h[:12], name)


if __name__ == "__main__":
    main()
