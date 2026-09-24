#!/usr/bin/env python3
"""MA-INS-001 (state sprint): freeze the Massachusetts DOI public snapshot.

Inputs are the committed official sources under data/massachusetts/ma-ins-001/ (DOI company
workbooks, the rendered DOI administrative-action tables, and the enforcement-terms, hearing-
decision, market-conduct, consumer-services and licensee-lookup page captures).

Standard library only (CI installs no Python packages): the XLSX reader below parses the
workbook XML directly. `--check` rebuilds everything and fails on any drift.

Rules: NAIC is the only company identity key. Company Type and designation lists are
relationships, never extra insurers, and are never summed. Administrative actions print no NAIC
and are never attached by name; a listed allegation is not a finding. No graph writes.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/massachusetts/ma-ins-001"
LIB = ROOT / "lib/massachusetts-intelligence"
SPINE = ROOT / "data/reports/ins-insurer-006-identity-index.json"
CENSUS = ROOT / "data/home/insurance-metric-census-r2-04.json"

OUT_SNAPSHOT = LIB / "accepted-snapshot.json"
OUT_COMPANIES = LIB / "accepted-companies.json"
OUT_ACTIONS = LIB / "accepted-actions.json"
OUT_HEARINGS = SRC / "hearing-decisions-index.json"
OUT_EXAMS = SRC / "market-conduct-index.json"

VERSION = "insurance-ma-state-intel-v1"
SNAPSHOT_AS_OF = "2026-09-24"

# Designation / product lists: code, acquisition key, raw file, DOI designation label.
DESIGNATIONS = [
    ("6G", "auto_liability_6g", "Auto Liability (Designation 6G)"),
    ("6E", "workers_comp_6e", "Workers' Compensation (Designation 6E)"),
    ("6B", "health_6b", "Health - All Kinds (Designation 6B)"),
    ("ESL", "eligible_surplus_lines", "Eligible Surplus Lines"),
    ("DOM_LIFE", "domestic_life", "Domestic Life"),
    ("DOM_PC", "domestic_pc", "Domestic Property and Casualty"),
    ("4", "fidelity_surety_4", "Fidelity and Surety (Designation 4)"),
]

EXPECTED = {
    "LICENSED_OR_APPROVED_ROWS": 2716,
    "LICENSED_OR_APPROVED_DISTINCT_NAIC": 1693,
    "LICENSED_OR_APPROVED_ROWS_MISSING_NAIC": 1000,
    "LICENSED_OR_APPROVED_NAIC_ON_TWO_ROWS": 23,
    "COMPANY_TYPES": 23,
    "6G": 587,
    "6E": 486,
    "6B": 566,
    "ESL": 212,
    "DOM_LIFE": 16,
    "DOM_PC": 49,
    "4": 514,
    "ADMIN_ACTION_ROWS": 319,
    "HEARING_DECISION_LISTINGS": 325,
    "MARKET_CONDUCT_LISTINGS": 107,
}

MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], 1)}
MONTH_ABBR = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12}


def dumps(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha_obj(obj: object) -> str:
    return hashlib.sha256(dumps(obj).encode("utf-8")).hexdigest()


def sha_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def clean(value) -> str:
    return " ".join(str(value).replace(" ", " ").split()) if value is not None else ""


def need(cond: bool, message: str) -> None:
    if not cond:
        raise SystemExit(f"MA-INS-001 build: {message}")


# --- XLSX (stdlib) -------------------------------------------------------------------------
NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PKG = "http://schemas.openxmlformats.org/package/2006/relationships"


def _col(ref: str) -> int:
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_first_sheet(path: Path) -> list[list]:
    with zipfile.ZipFile(path) as z:
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        first = wb.find(f"{{{NS_MAIN}}}sheets/{{{NS_MAIN}}}sheet")
        rid = first.get(f"{{{NS_REL}}}id")
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        target = next(r.get("Target") for r in rels.findall(f"{{{NS_PKG}}}Relationship") if r.get("Id") == rid)
        target = target.lstrip("/")
        if not target.startswith("xl/"):
            target = "xl/" + target
        shared: list[str] = []
        if "xl/sharedStrings.xml" in z.namelist():
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(f"{{{NS_MAIN}}}si"):
                shared.append("".join(t.text or "" for t in si.iter(f"{{{NS_MAIN}}}t")))
        sheet = ET.fromstring(z.read(target))
        rows: list[list] = []
        for row in sheet.find(f"{{{NS_MAIN}}}sheetData").findall(f"{{{NS_MAIN}}}row"):
            cells: dict[int, object] = {}
            for c in row.findall(f"{{{NS_MAIN}}}c"):
                kind, v = c.get("t"), c.find(f"{{{NS_MAIN}}}v")
                if kind == "s":
                    val: object = shared[int(v.text)]
                elif kind == "inlineStr":
                    val = "".join(t.text or "" for t in c.iter(f"{{{NS_MAIN}}}t"))
                elif v is None:
                    val = None
                elif kind in ("str", "e"):
                    val = v.text
                else:
                    val = int(float(v.text)) if re.fullmatch(r"-?\d+(\.0+)?(E\+?\d+)?", v.text or "") else v.text
                cells[_col(c.get("r"))] = val
            rows.append([cells.get(i) for i in range(max(cells) + 1)] if cells else [])
        return rows


def parse_company_workbook(path: Path) -> dict:
    rows = read_first_sheet(path)
    header_at = next(i for i, r in enumerate(rows) if "NAIC #" in [clean(c) for c in r])
    head = [clean(c) for c in rows[header_at]]
    idx = {h: i for i, h in enumerate(head) if h}
    banner = [clean(c) for r in rows[:header_at] for c in r if clean(c)]
    printed = [b for b in banner if re.fullmatch(r"[A-Z][a-z]+ \d{1,2}, \d{4}", b)]
    need(len(printed) == 1, f"{path.name}: expected one printed source date, got {printed}")
    title = banner[banner.index(printed[0]) - 1]
    data = []
    for r in rows[header_at + 1:]:
        if not any(clean(c) for c in r):
            continue
        get = lambda h: r[idx[h]] if idx.get(h) is not None and idx[h] < len(r) else None
        naic_raw = clean(get("NAIC #"))
        need(naic_raw == "" or re.fullmatch(r"\d{1,5}", naic_raw) is not None, f"{path.name}: bad NAIC {naic_raw!r}")
        data.append({
            "company_type": clean(get("Company Type")) or None,
            "naic": naic_raw.zfill(5) if naic_raw else None,
            "name": clean(get("Company")),
            "city": clean(get("City")) or None,
            "address_state": clean(get("State")) or None,
        })
    month, day, year = re.fullmatch(r"([A-Z][a-z]+) (\d{1,2}), (\d{4})", printed[0]).groups()
    return {
        "title": title,
        "printed_date": printed[0],
        "source_as_of": f"{year}-{MONTHS[month.lower()]:02d}-{int(day):02d}",
        "headers": [h for h in head if h],
        "rows": data,
    }


# --- administrative actions ------------------------------------------------------------------
HDR8 = ["Licensee Name", "MA License Number", "SIU Case No. and/or Docket Number", "Primary Allegations(s)",
        "Type of Disposition", "Fine/Restitution", "Licensing Action", "Effective Date"]
HEADER_LABELS = set(HDR8) | {"Type of License", "Case No.", "Case Number", "Primary Allegation(s)", "Disposition"}


def disposition_class(text: str) -> str:
    t = text.strip().lower()
    if t in ("", "n/a"):
        return "NOT_STATED"
    if t.startswith("settlement agreement"):
        return "SETTLEMENT_AGREEMENT"
    if t.startswith("consent agreement"):
        return "CONSENT_AGREEMENT"
    if re.match(r"hearing office(r)? decision", t):
        return "HEARING_OFFICER_DECISION"
    if t.startswith("hearing officer order"):
        return "HEARING_OFFICER_ORDER"
    if t.startswith("order to show cause"):
        return "ORDER_TO_SHOW_CAUSE"
    return "OTHER_AS_LISTED"


def action_flags(text: str) -> dict:
    return {
        "cease_and_desist": bool(re.search(r"cease\s*(&|and|8)\s*desist", text, re.I)),
        "revocation": bool(re.search(r"revo(k|c)", text, re.I)),
        "suspension": bool(re.search(r"suspen", text, re.I)),
        "surrender": bool(re.search(r"surrender", text, re.I)),
    }


def iso_date(raw: str) -> str | None:
    m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})", raw.strip())
    if not m:
        return None
    month, day, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
    year = year + 2000 if year < 100 else year
    return f"{year}-{month:02d}-{day:02d}"


def doc_url(href: str) -> str:
    url = "https://www.mass.gov" + href if href.startswith("/") else href
    parts = urlsplit(url)
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query) if k != "_gl"])
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, ""))


def parse_actions(page: dict) -> list[dict]:
    seen: set[int] = set()
    out: list[dict] = []
    for table in page["tables"]:
        year = int(re.search(r"Year (\d{4})", table["heading"]).group(1))
        if year in seen:
            continue  # the second table under each year heading is a one-row sticky-header clone
        seen.add(year)
        body = table["rows"]
        header_published = all(c["t"] in HEADER_LABELS for c in body[0])
        head = [c["t"] for c in body[0]] if header_published else HDR8
        for n, cells in enumerate(body[1:] if header_published else body, 1):
            need(len(cells) == len(head), f"{year} row {n}: width {len(cells)} != {len(head)}")
            v = {h: c["t"] for h, c in zip(head, cells)}
            links = [doc_url(a) for c in cells for a in c["a"]]
            case_raw = v.get("SIU Case No. and/or Docket Number") or v.get("Case No.") or v.get("Case Number") or ""
            disposition_raw = v.get("Type of Disposition") or v.get("Disposition") or ""
            licensing_raw = v.get("Licensing Action")
            license_cell = v.get("MA License Number")
            license_type = v.get("Type of License")
            license_type_source = "TYPE_OF_LICENSE_COLUMN" if license_type else None
            numbers: list[str] = []
            if license_cell is not None:
                numbers = re.findall(r"\b\d{5,9}\b", license_cell)
                if not numbers and re.search(r"produce|adjuster", license_cell, re.I):
                    license_type, license_type_source = license_cell, "LICENSE_NUMBER_COLUMN_HOLDS_LICENSE_TYPE"
            dockets = sorted(set(re.findall(r"\bE\d{4}-\d{2}\b", f"{case_raw} {disposition_raw}")))
            siu = [s for s in re.findall(r"\b\d{4,5}[A-Z]?\b", case_raw) if not re.fullmatch(r"20\d\d", s)]
            anomalies = []
            for url in links:
                host = urlsplit(url).netloc
                if host != "www.mass.gov":
                    anomalies.append({"url": url, "issue": "HOST_AS_PUBLISHED_NOT_WWW_MASS_GOV"})
                slug = re.search(r"siu-investigation-no-(\d+)", url)
                if slug and siu and slug.group(1) not in siu:
                    anomalies.append({"url": url, "issue": "LINK_SLUG_NAMES_A_DIFFERENT_CASE_NUMBER"})
            effective_raw = v.get("Effective Date", "")
            effective = iso_date(effective_raw)
            need(effective is not None, f"{year} row {n}: effective date {effective_raw!r}")
            out.append({
                "id": f"ma-doi-aa-{year}-{n:03d}",
                "table_year": year,
                "header_row_published": header_published,
                "schema_columns": len(head),
                "licensee_name_published": "Licensee Name" in head,
                "ma_license_numbers": numbers,
                "ma_license_cell": license_cell,
                "license_type_as_listed": license_type,
                "license_type_source": license_type_source,
                "case_or_docket_as_listed": case_raw,
                "siu_case_numbers": siu,
                "docket_numbers": dockets,
                "primary_allegations_as_listed": v.get("Primary Allegations(s)") or v.get("Primary Allegation(s)") or "",
                "disposition_as_listed": disposition_raw,
                "disposition_class": disposition_class(disposition_raw),
                "fine_restitution_as_listed": v.get("Fine/Restitution"),
                "licensing_action_as_listed": licensing_raw,
                "licensing_action_flags": action_flags(licensing_raw if licensing_raw is not None else disposition_raw),
                "effective_date": effective,
                "effective_date_as_listed": effective_raw,
                "document_urls": links,
                "document_link_anomalies": anomalies,
            })
    return out


# --- indexes -------------------------------------------------------------------------------------
def parse_listing_date(text: str) -> str | None:
    m = re.search(r"(?:Issued\s+)?([A-Z][a-z]+)\.?\s+(\d{1,2}),\s+(\d{4})\s*$", text)
    if not m:
        return None
    word = m.group(1).lower()
    month = MONTHS.get(word) or MONTH_ABBR.get(word)
    return f"{int(m.group(3))}-{month:02d}-{int(m.group(2)):02d}" if month else None


def parse_hearing_index(page: dict) -> list[dict]:
    out = []
    for n, item in enumerate(page["items"], 1):
        m = re.fullmatch(r"Open \w+ file, [\d.,]+ [KMG]?B, (.*?)(?: \(English, \w+ [\d.,]+ [KMG]?B\))?", item["text"])
        body = (m.group(1) if m else item["text"]).strip()
        parts = [p.strip() for p in body.split(";")]
        docket = parts[0] if re.fullmatch(r"[A-Z]{1,2}\d{4}-\d{1,3}[A-Z]?", parts[0]) else None
        rest = parts[1:] if docket else parts
        issued = parse_listing_date(rest[-1]) if rest else None
        caption = "; ".join(rest[:-1] if issued and len(rest) > 1 else rest)
        year = re.search(r"Year (\d{4})", item["heading"] or "")
        out.append({
            "n": n,
            "list_year": int(year.group(1)) if year else None,
            "docket": docket,
            "docket_prefix": re.match(r"[A-Z]+", docket).group(0) if docket else None,
            "caption": caption,
            "issued_date": issued,
            "listing_text": body,
            "url": doc_url(item["href"]),
        })
    return out


def parse_exam_index(page: dict) -> list[dict]:
    out = []
    for n, item in enumerate(page["items"], 1):
        text = item["text"]
        date = parse_listing_date(text)
        out.append({
            "n": n,
            "section": item["heading"],
            "listing_text": text,
            "named_entities_as_listed": text.split(" - ")[0].strip(),
            "document_kind": "ADOPTION_ORDER" if re.search(r"adoption order", text, re.I) else "REPORT_OR_LISTING",
            "listing_date": date,
            "url": doc_url(item["href"]),
        })
    return out


def crosswalk(naics: list[str], spine: set[str]) -> dict:
    distinct = sorted({n for n in naics if n})
    matches = [n for n in distinct if n in spine]
    unmatched = [n for n in distinct if n not in spine]
    return {
        "SOURCE_DISTINCT_NAIC": len(distinct),
        "EXACT_EXISTING_LEGAL_INSURER_MATCHES": len(matches),
        "UNMATCHED_NAIC": len(unmatched),
        "unmatched_naic": unmatched,
        "read_only": True,
        "graph_write": False,
        "exact_match_is_not_enrichment": True,
        "exact_match_is_not_profile_attachment": True,
    }


def main() -> None:
    check = "--check" in sys.argv
    acquisition = read_json(SRC / "company-files-acquisition.json")
    spine = {str(r["naic_cocode"]).zfill(5) for r in read_json(SPINE)["insurers"]}
    census = read_json(CENSUS)

    # 1. Company workbooks: verify committed bytes, then parse.
    parsed: dict[str, dict] = {}
    for key, meta in acquisition["files"].items():
        path = SRC / meta["file"]
        need(sha_file(path) == meta["sha256"], f"{meta['file']} bytes differ from the acquisition record")
        parsed[key] = parse_company_workbook(path)
    broad = parsed["licensed_or_approved"]
    need(broad["title"] == "Licensed Or Approved Companies", f"broad title {broad['title']!r}")
    source_dates = {k: v["source_as_of"] for k, v in parsed.items()}
    need(len(set(source_dates.values())) == 1, f"workbook dates differ: {source_dates}")
    source_as_of = broad["source_as_of"]

    rows = broad["rows"]
    with_naic = [r for r in rows if r["naic"]]
    per_naic: dict[str, list[dict]] = defaultdict(list)
    for r in with_naic:
        per_naic[r["naic"]].append(r)
    types = Counter(r["company_type"] for r in rows)
    need(len(rows) == EXPECTED["LICENSED_OR_APPROVED_ROWS"], f"broad rows {len(rows)}")
    need(len(per_naic) == EXPECTED["LICENSED_OR_APPROVED_DISTINCT_NAIC"], f"distinct NAIC {len(per_naic)}")
    need(len(rows) - len(with_naic) == EXPECTED["LICENSED_OR_APPROVED_ROWS_MISSING_NAIC"], "missing NAIC rows")
    need(sum(1 for v in per_naic.values() if len(v) > 1) == EXPECTED["LICENSED_OR_APPROVED_NAIC_ON_TWO_ROWS"], "multi-row NAIC")
    need(max(len(v) for v in per_naic.values()) == 2, "a NAIC appears on more than two rows")
    need(len(types) == EXPECTED["COMPANY_TYPES"], f"company types {len(types)}")
    need(all(len({r["company_type"] for r in v}) == len(v) for v in per_naic.values()), "same NAIC repeated with the same Company Type")

    designation_members: dict[str, set[str]] = {}
    designation_sections: dict[str, dict] = {}
    name_variants = 0
    for code, key, label in DESIGNATIONS:
        d = parsed[key]
        naics = [r["naic"] for r in d["rows"]]
        need(all(naics), f"{key}: row without NAIC")
        need(len(naics) == len(set(naics)) == EXPECTED[code], f"{key}: rows {len(naics)} distinct {len(set(naics))}")
        need(set(naics) <= set(per_naic), f"{key}: NAIC outside the Licensed or Approved list")
        designation_members[code] = set(naics)
        for r in d["rows"]:
            if r["name"] not in {x["name"] for x in per_naic[r["naic"]]}:
                name_variants += 1
        type_mix = Counter(t for n in naics for t in {x["company_type"] for x in per_naic[n]})
        meta = acquisition["files"][key]
        designation_sections[key] = {
            "code": code,
            "designation": label,
            "list_page_label": meta["list_page_label"],
            "workbook_title": d["title"],
            "source_printed_date": d["printed_date"],
            "source_as_of": d["source_as_of"],
            "http_last_modified": meta["http_last_modified"],
            "rows": len(naics),
            "distinct_naic": len(set(naics)),
            "all_naic_on_licensed_or_approved_list": True,
            "licensed_or_approved_company_types": dict(sorted(type_mix.items())),
            "exact_existing_legal_insurer_matches": sum(1 for n in naics if n in spine),
            "download_url": meta["download_url"],
            "sha256": meta["sha256"],
        }
    esl = designation_sections["eligible_surplus_lines"]
    esl["eligible_is_not_admitted"] = True
    esl["workbook_title_differs_from_list_label"] = esl["workbook_title"] != "Eligible Surplus Lines Companies"
    designation_sections["domestic_life"]["domestic_means_massachusetts_domiciled_per_doi_list"] = True
    designation_sections["domestic_pc"]["domestic_means_massachusetts_domiciled_per_doi_list"] = True
    designation_sections["domestic_life"]["address_state_outside_ma_rows"] = sum(1 for r in parsed["domestic_life"]["rows"] if r["address_state"] != "MA")
    designation_sections["domestic_pc"]["address_state_outside_ma_rows"] = sum(1 for r in parsed["domestic_pc"]["rows"] if r["address_state"] != "MA")

    identities = []
    for naic in sorted(per_naic):
        group = per_naic[naic]
        names = sorted({r["name"] for r in group})
        identities.append({
            "naic": naic,
            "name": group[0]["name"],
            **({"other_names": names[1:]} if len(names) > 1 else {}),
            "types": sorted(r["company_type"] for r in group),
            "designations": [code for code, _, _ in DESIGNATIONS if naic in designation_members[code]],
            "city": group[0]["city"],
            "address_state": group[0]["address_state"],
            "in_national_identity_index": naic in spine,
        })
    no_naic_rows = [{"type": r["company_type"], "name": r["name"], "city": r["city"], "address_state": r["address_state"]}
                    for r in rows if not r["naic"]]
    companies = {
        "version": VERSION,
        "source": acquisition["list_page_url"],
        "source_as_of": source_as_of,
        "designation_codes": {code: label for code, _, label in DESIGNATIONS},
        "identities": identities,
        "no_naic_rows": no_naic_rows,
    }

    # 2. Administrative actions and supporting indexes.
    page = read_json(SRC / "admin-actions-page.json")
    actions = parse_actions(page)
    need(len(actions) == EXPECTED["ADMIN_ACTION_ROWS"], f"administrative-action rows {len(actions)}")
    terms = read_json(SRC / "enforcement-terms-page.json")
    need(set(terms["definitions"]) == {"Primary Allegation(s)", "Settlement Agreement", "Consent Agreement", "Administrative Decision", "Cease and Desist", "Fine"}, "terms")
    hearings = parse_hearing_index(read_json(SRC / "hearing-decisions-page.json"))
    exams = parse_exam_index(read_json(SRC / "market-conduct-page.json"))
    need(len(hearings) == EXPECTED["HEARING_DECISION_LISTINGS"], f"hearing listings {len(hearings)}")
    need(len(exams) == EXPECTED["MARKET_CONDUCT_LISTINGS"], f"market-conduct listings {len(exams)}")
    hearing_dockets = {h["docket"] for h in hearings if h["docket"]}
    action_dockets = sorted({d for a in actions for d in a["docket_numbers"]})
    consumer = read_json(SRC / "consumer-and-licensing-pages.json")

    by_year = Counter(a["table_year"] for a in actions)
    classes = Counter(a["disposition_class"] for a in actions)
    flags = {k: sum(1 for a in actions if a["licensing_action_flags"][k]) for k in ("cease_and_desist", "revocation", "suspension", "surrender")}
    license_numbers = sorted({n for a in actions for n in a["ma_license_numbers"]})
    admin = {
        "coverage": "PUBLIC_TABLE_2015_FORWARD",
        "source": page["url"],
        "retrieved_at": page["retrieved_at"],
        "source_as_of": None,
        "source_as_of_note": "The DOI page prints no list date. Effective dates are per-action dates, not a list clock and not license expiration dates.",
        "period_start": min(a["effective_date"] for a in actions),
        "period_end": max(a["effective_date"] for a in actions),
        "window_years": [min(by_year), max(by_year)],
        "pre_2015": "REQUEST_ONLY",
        "pre_2015_statement": terms["pre_2015_statement"],
        "observation_rows": len(actions),
        "rows_by_table_year": {str(y): by_year[y] for y in sorted(by_year)},
        "disposition_classes": dict(sorted(classes.items())),
        "licensing_action_mentions": flags,
        "licensing_action_mentions_are_not_additive": True,
        "rows_with_ma_license_number": sum(1 for a in actions if a["ma_license_numbers"]),
        "distinct_ma_license_numbers": len(license_numbers),
        "rows_without_ma_license_number": sum(1 for a in actions if not a["ma_license_numbers"]),
        "rows_with_licensee_name_column": sum(1 for a in actions if a["licensee_name_published"]),
        "rows_without_licensee_name_column": sum(1 for a in actions if not a["licensee_name_published"]),
        "rows_with_license_type": sum(1 for a in actions if a["license_type_as_listed"]),
        "rows_with_docket_number": sum(1 for a in actions if a["docket_numbers"]),
        "rows_with_document_link": sum(1 for a in actions if a["document_urls"]),
        "rows_with_link_anomaly": sum(1 for a in actions if a["document_link_anomalies"]),
        "effective_year_differs_from_table_year": sum(1 for a in actions if int(a["effective_date"][:4]) != a["table_year"]),
        "source_quirks": [
            "The 2024 table has no Licensee Name column; those rows are kept without a name.",
            "The 2017 column headed MA License Number carries license types, not license numbers.",
            "The 2020 table publishes no header row; the 2021 column order is applied.",
            "2015 and 2016 tables use Type of License and a combined Disposition column (fines are inside the disposition text).",
            "Some document links are kept exactly as published even where the host or case number differs.",
        ],
        "terms": terms["definitions"],
        "terms_source": terms["url"],
        "allegation_is_not_finding": True,
        "settlement_agreement_is_informal_resolution": True,
        "hearing_officer_decision_label_kept_as_listed": True,
        "fine_restitution_not_summed": True,
        "licensee_type_person_or_business_not_published_after_2017": True,
        "licensee_names_not_republished": True,
        "exact_attachments": {
            "EXACT_NAIC_ATTACHMENTS": 0,
            "EXACT_MA_LICENSE_ATTACHMENTS": 0,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "NAME_ONLY_ATTACHMENTS": "UNSUPPORTED",
            "reason": "The table prints no NAIC or NPN. No committed Massachusetts license-number crosswalk exists, and names are never joined. Every row stays a standalone DOI administrative-action event.",
        },
        "standalone_events": len(actions),
    }
    docket_matches = sorted(set(action_dockets) & hearing_dockets)
    hearing_section = {
        "coverage": "INDEX_METADATA_ONLY",
        "source": read_json(SRC / "hearing-decisions-page.json")["url"],
        "retrieved_at": read_json(SRC / "hearing-decisions-page.json")["retrieved_at"],
        "page_statements": read_json(SRC / "hearing-decisions-page.json")["page_statements"],
        "listing_rows": len(hearings),
        "distinct_documents": len({h["url"] for h in hearings}),
        "list_years": [min(h["list_year"] for h in hearings), max(h["list_year"] for h in hearings)],
        "listings_with_docket": sum(1 for h in hearings if h["docket"]),
        "docket_prefixes": dict(sorted(Counter(h["docket_prefix"] or "NONE" for h in hearings).items())),
        "division_v_captions": sum(1 for h in hearings if h["caption"].startswith("Division of Insurance v")),
        "listings_with_issued_date": sum(1 for h in hearings if h["issued_date"]),
        "docket_prefix_meaning": "NOT_DEFINED_BY_SOURCE",
        "pdfs_parsed": False,
        "separate_from_administrative_actions": True,
        "exact_docket_matches_with_administrative_actions": docket_matches,
        "not_official_copies": True,
    }
    exam_sections = Counter(e["section"] for e in exams)
    exam_section = {
        "coverage": "INDEX_METADATA_ONLY",
        "source": read_json(SRC / "market-conduct-page.json")["url"],
        "retrieved_at": read_json(SRC / "market-conduct-page.json")["retrieved_at"],
        "page_statements": read_json(SRC / "market-conduct-page.json")["page_statements"],
        "listing_rows": len(exams),
        "distinct_documents": len({e["url"] for e in exams}),
        "sections": dict(exam_sections),
        "adoption_order_listings": sum(1 for e in exams if e["document_kind"] == "ADOPTION_ORDER"),
        "posted_under_year_examined": True,
        "exact_naic_attachments": 0,
        "name_only": "UNSAFE",
        "pdfs_parsed": False,
        "observations_are_not_scores": True,
    }

    # 3. Snapshot.
    naic_rows_by_type = Counter(r["company_type"] for r in with_naic)
    missing_by_type = Counter(r["company_type"] for r in rows if not r["naic"])
    broad_meta = acquisition["files"]["licensed_or_approved"]
    body = {
        "version": VERSION,
        "ticket": "MA-INS-001",
        "state": "MA",
        "generated_at": None,
        "source_as_of": source_as_of,
        "snapshot_as_of": SNAPSHOT_AS_OF,
        "retrieved_at": acquisition["retrieved_at"],
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_massachusetts_local_routes": True,
        "publication": {
            "path": "/massachusetts",
            "canonical": "https://www.insurancetrusthub.com/massachusetts",
            "robots": "index,follow",
            "h1": "Massachusetts Insurance Market & Regulatory Intelligence",
        },
        "regulator": {
            "agency": "Massachusetts Division of Insurance",
            "short": "DOI",
            "company_lists_url": acquisition["list_page_url"],
            "administrative_actions_url": page["url"],
            "enforcement_terms_url": terms["url"],
            "hearing_decisions_url": hearing_section["source"],
            "market_conduct_url": exam_section["source"],
            "consumer_services_url": consumer["consumer_services"]["url"],
            "complaint_url": consumer["filing_a_complaint"]["url"],
            "find_licensees_url": consumer["find_licensees"]["url"],
            "sbs_lookup_url": consumer["find_licensees"]["sbs_state_services_url"],
            "public_records_url": consumer["find_licensees"]["public_records_request_url"],
        },
        "licensed_or_approved": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "workbook_title": broad["title"],
            "list_page_label": broad_meta["list_page_label"],
            "source_printed_date": broad["printed_date"],
            "source_as_of": source_as_of,
            "http_last_modified": broad_meta["http_last_modified"],
            "retrieved_at": acquisition["retrieved_at"],
            "download_url": broad_meta["download_url"],
            "sha256": broad_meta["sha256"],
            "headers": broad["headers"],
            "rows": len(rows),
            "company_types": dict(sorted(types.items())),
            "rows_with_naic": len(with_naic),
            "rows_with_naic_by_type": dict(sorted(naic_rows_by_type.items())),
            "rows_missing_naic": len(rows) - len(with_naic),
            "rows_missing_naic_by_type": dict(sorted(missing_by_type.items())),
            "distinct_naic": len(per_naic),
            "naic_on_two_rows": sum(1 for v in per_naic.values() if len(v) > 1),
            "naic_on_two_rows_rule": "One NAIC listed under two Company Types is one legal identity with two list relationships.",
            "rows_missing_naic_are_research_rows": True,
            "state_column_is_address_not_domicile": True,
            "list_is_not_quote_or_product_availability": True,
            "surplus_lines_type_is_not_admitted": True,
            "company_is_not_agency": True,
            "company_is_not_producer": True,
            "naic_is_not_npn": True,
        },
        "designations": designation_sections,
        "designations_are_not_additive": True,
        "designation_name_variants_vs_licensed_list": name_variants,
        "naic_crosswalk": {
            "CROSSWALK_STATUS": "EXECUTED",
            "spine_source": "data/reports/ins-insurer-006-identity-index.json",
            "spine_legal_insurers": len(spine),
            "read_only": True,
            "graph_write": False,
            "licensed_or_approved": crosswalk([r["naic"] for r in with_naic], spine),
        },
        "profile_attachments": {
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "graph_write": False,
            "note": "Read-only exact NAIC comparison. An exact identity match is not a graph enrichment write and not a public profile attachment.",
        },
        "administrative_actions": admin,
        "hearing_decisions": hearing_section,
        "market_conduct": exam_section,
        "agency_roster": {
            "count": None,
            "coverage": "NOT_ACQUIRED / PAID_OR_REQUEST",
            "verification": "KNOWN",
            "bulk_paths": {
                "sbs_report_generator": "PAID (fee assessed by the NAIC)",
                "doi_public_record_request": "REQUEST_ONLY (no charge; up to 10 business days)",
            },
            "existing_graph_ma_agency_credentials": census["nationalGraph"]["credentialsByJurisdiction"]["MA"],
            "existing_graph_census_retrieved_at": census["retrievedAt"],
            "existing_graph_source": "MA-INS-000/001/002: operator-supplied DOI producer-license extract (August 2026, as-of date unresolved), matched to existing agencies by exact NPN",
            "existing_graph_is_not_ma_agency_census": True,
        },
        "producer_roster": {
            "count": None,
            "coverage": "NOT_ACQUIRED / PAID_OR_REQUEST",
            "verification": "KNOWN",
            "public_person_profiles": 0,
            "npn_is_not_naic": True,
            "producer_is_not_agency": True,
        },
        "complaints": {
            "count": None,
            "coverage": "REQUEST_ONLY / NOT_ACQUIRED",
            "intake": "KNOWN",
            "program_context": "KNOWN",
            "annual_statement": "The section typically resolves over 2,000 written consumer complaints each year.",
            "annual_statement_is_not_a_denominator": True,
            "provider_level_rows": "NOT_ACQUIRED",
            "provider_level_counts": "REQUEST_ONLY",
            "provider_level_counts_statement": consumer["consumer_services"]["statements"][2],
            "complaint_is_not_enforcement": True,
            "complaint_is_not_a_finding": True,
        },
        "financial_solvency": {"status": "DEFERRED", "note": "Receivership and financial-surveillance data were not ingested in this sprint."},
        "private_passenger_auto_groups": {"status": "DEFERRED", "note": "The separate private-passenger-auto company/group page was not ingested; groups are never name-matched onto legal insurers."},
        "capabilities": {
            "licensed_or_approved_company_list": "KNOWN",
            "exact_naic_identity": "KNOWN",
            "designation_lists": "KNOWN",
            "eligible_surplus_lines_list": "KNOWN",
            "agency_verification_sbs": "KNOWN",
            "producer_verification_sbs": "KNOWN",
            "agency_bulk_roster": "NOT_ACQUIRED",
            "producer_bulk_roster": "NOT_ACQUIRED",
            "administrative_actions_2015_forward": "KNOWN",
            "administrative_actions_pre_2015": "REQUEST_ONLY",
            "hearing_decision_index": "PARTIAL",
            "market_conduct_report_index": "PARTIAL",
            "complaint_intake": "KNOWN",
            "provider_level_complaints": "REQUEST_ONLY",
            "financial_solvency": "NOT_ACQUIRED",
            "private_passenger_auto_groups": "NOT_ACQUIRED",
            "name_only_adverse_join": "UNSUPPORTED",
            "combined_massachusetts_insurance_total": "UNSUPPORTED",
            "local_city_routes": "UNSUPPORTED",
        },
        "rejected_totals": {
            "combined_massachusetts_insurance_businesses": "UNSUPPORTED",
            "designation_rows_summed": "UNSUPPORTED",
            "licensed_or_approved_rows_as_insurers": "UNSUPPORTED",
        },
        "expansion_ledger": {
            "NET_NEW_CANONICAL_LEGAL_INSURERS": 0,
            "NET_NEW_CANONICAL_AGENCIES": 0,
            "NET_NEW_CANONICAL_PERSONS": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
            "GRAPH_WRITES": 0,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "NET_NEW_PUBLIC_PROFILES": 0,
            "CLAIM_ELIGIBILITY_BROADENED": False,
        },
        "derived_files": {},
    }
    derived = {
        "lib/massachusetts-intelligence/accepted-companies.json": companies,
        "lib/massachusetts-intelligence/accepted-actions.json": {"version": VERSION, "source": page["url"], "rows": actions},
        "data/massachusetts/ma-ins-001/hearing-decisions-index.json": {"version": VERSION, "source": hearing_section["source"], "rows": hearings},
        "data/massachusetts/ma-ins-001/market-conduct-index.json": {"version": VERSION, "source": exam_section["source"], "rows": exams},
    }
    body["derived_files"] = {path: sha_obj(obj) for path, obj in derived.items()}

    existing = read_json(OUT_SNAPSHOT) if OUT_SNAPSHOT.exists() else None
    body["generated_at"] = existing["generated_at"] if check else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    body["fingerprint"] = sha_obj({k: v for k, v in body.items() if k not in {"generated_at", "fingerprint"}})

    outputs = {"lib/massachusetts-intelligence/accepted-snapshot.json": body, **derived}
    if check:
        for rel, obj in outputs.items():
            path = ROOT / rel
            need(path.exists(), f"missing {rel}")
            need(read_json(path) == obj, f"{rel} drifted; rebuild with python -X utf8 scripts/massachusetts/build_snapshot.py")
        print("check", body["fingerprint"])
        return
    for rel, obj in outputs.items():
        path = ROOT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        indent = 2 if rel.endswith("accepted-snapshot.json") else None
        text = json.dumps(obj, indent=indent, ensure_ascii=False, separators=None if indent else (",", ":"))
        path.write_text(text + "\n", encoding="utf-8", newline="\n")
    print(body["fingerprint"])


if __name__ == "__main__":
    main()
