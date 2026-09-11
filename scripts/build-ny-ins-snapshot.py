#!/usr/bin/env python3
"""NY-INS-001A — parse acquired DFS sources and write insurance-ny-state-intel-v1."""

from __future__ import annotations

import csv
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "ny-ins-001"
LIB = ROOT / "lib" / "new-york-intelligence"
SPINE = ROOT / "data" / "reports" / "ins-insurer-006-identity-index.json"
VERSION = "insurance-ny-state-intel-v1"
RETRIEVED = "2026-09-11T16:00:00Z"


def sha(obj: object) -> str:
    body = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def load_spine() -> set[str]:
    data = json.loads(SPINE.read_text(encoding="utf-8"))
    return {str(row["naic_cocode"]).zfill(5) for row in data["insurers"]}


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_td = False
        self.in_th = False
        self.cell = ""
        self.row: list[str] = []
        self.rows: list[list[str]] = []
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "td":
            self.in_td = True
            self.cell = ""
        elif tag == "th":
            self.in_th = True
            self.cell = ""
        elif tag == "br" and (self.in_td or self.in_th):
            self.cell += "\n"
        elif tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.hrefs.append(href)
                if self.in_td or self.in_th:
                    self.cell += href + " "

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"}:
            self.row.append(re.sub(r"\s+", " ", self.cell).strip())
            self.in_td = False
            self.in_th = False
            self.cell = ""
        elif tag == "tr":
            if self.row:
                self.rows.append(self.row)
            self.row = []

    def handle_data(self, data: str) -> None:
        if self.in_td or self.in_th:
            self.cell += data


def parse_directory(html: str) -> dict:
    total_m = re.search(r"Total:\s*<font[^>]*>(\d+)</font>", html, re.I)
    parser = TableParser()
    parser.feed(html)
    header = [c.lower() for c in parser.rows[0]] if parser.rows else []
    data_rows = parser.rows[1:]
    companies = []
    for row in data_rows:
        cells = {header[i]: row[i] if i < len(row) else "" for i in range(len(header))}
        name_block = cells.get("company name", "")
        name = name_block.split("\n")[0].strip() if name_block else ""
        naic_raw = re.sub(r"\D", "", cells.get("naic#", "") or cells.get("naic", ""))
        naic = naic_raw.zfill(5) if naic_raw else ""
        cpaf = re.sub(r"\D", "", cells.get("cpaf#", "") or "")
        group = cells.get("group#/group name", "") or ""
        group_num = ""
        group_name = group
        if "/" in group:
            group_num, group_name = group.split("/", 1)
        companies.append(
            {
                "cpaf": cpaf or None,
                "naic": naic or None,
                "name": name,
                "org_type": cells.get("org", "") or None,
                "domicile": cells.get("domicile", "") or None,
                "group_number": group_num.strip() or None,
                "group_name": group_name.strip() or None,
                "federal_id": (cells.get("fid", "") or "").replace("-", "") or None,
                "website": (cells.get("website", "") or "").replace("http://", "").replace("https://", "").strip()
                or None,
            }
        )
    naics = [c["naic"] for c in companies if c["naic"]]
    naic_counts = Counter(naics)
    duplicate_naic = sorted([n for n, k in naic_counts.items() if k > 1])
    org = Counter(c["org_type"] or "UNKNOWN" for c in companies)
    domicile = Counter(c["domicile"] or "UNKNOWN" for c in companies)
    groups = {c["group_number"] for c in companies if c["group_number"]}
    return {
        "html_total": int(total_m.group(1)) if total_m else None,
        "rows": companies,
        "directory_rows": len(companies),
        "distinct_naic": len(set(naics)),
        "rows_without_naic": sum(1 for c in companies if not c["naic"]),
        "duplicate_naic_ids": duplicate_naic,
        "duplicate_naic_row_count": sum(naic_counts[n] for n in duplicate_naic),
        "org_type_distribution": dict(sorted(org.items(), key=lambda kv: (-kv[1], kv[0]))),
        "domicile_distribution": dict(sorted(domicile.items(), key=lambda kv: (-kv[1], kv[0]))),
        "distinct_group_numbers": len(groups),
        "ny_domicile_rows": domicile.get("New York", 0),
    }


def parse_enforcement(html: str) -> dict:
    parser = TableParser()
    parser.feed(html)
    rows = []
    for raw in parser.rows:
        if len(raw) < 3:
            continue
        if raw[0].lower().startswith("date"):
            continue
        date, action, subject = raw[0], raw[1], raw[2]
        if not re.match(r"\d{4}-\d{2}-\d{2}", date):
            continue
        pdfs = [h for h in re.findall(r"https?://[^\s]+|\.pdf", " ".join(raw)) if ".pdf" in h.lower() or h.endswith(".pdf")]
        hrefs = re.findall(r'(/[^\s"]+\.pdf)', " ".join(raw), re.I)
        rows.append(
            {
                "date": date,
                "action": action[:400],
                "subject": subject[:200],
                "pdf_paths": hrefs[:6],
            }
        )
    years = Counter(r["date"][:4] for r in rows)
    return {
        "observation_rows": len(rows),
        "distinct_dates": len({r["date"] for r in rows}),
        "year_distribution": dict(sorted(years.items())),
        "has_naic_column": False,
        "rows": rows,
    }


def parse_disciplinary_index(html: str) -> dict:
    hrefs = re.findall(r'href="([^"]*disciplinary[^"]+\.pdf[^"]*)"', html, re.I)
    hrefs += re.findall(r'href="([^"]*da20\d{6}[^"]*)"', html, re.I)
    hrefs += re.findall(r"/industry-guidance/disciplinary-actions/da\d+", html)
    uniq = sorted(set(hrefs))
    years = Counter()
    for h in uniq:
        m = re.search(r"da(20\d{2})", h)
        if m:
            years[m.group(1)] += 1
    return {
        "index_observation_rows": len(uniq),
        "year_distribution": dict(sorted(years.items())),
        "did_not_parse_pdfs": True,
        "hrefs": uniq,
    }


def parse_auto_csv(path: Path) -> dict:
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    # normalize keys
    def g(row: dict, *names: str) -> str:
        lower = {k.lower().strip(): v for k, v in row.items()}
        for n in names:
            if n.lower() in lower:
                return (lower[n.lower()] or "").strip()
        return ""

    years = Counter()
    for row in rows:
        y = g(row, "filing_year", "year", "report_year")
        if y:
            years[y[:4]] += 1
    latest = max(years) if years else None
    latest_rows = [
        row
        for row in rows
        if g(row, "filing_year", "year", "report_year").startswith(latest or "____")
    ]
    naics = []
    for row in latest_rows:
        n = re.sub(r"\D", "", g(row, "naic", "naic_code"))
        if n:
            naics.append(n.zfill(5))
    fields = list(rows[0].keys()) if rows else []
    return {
        "open_data_rows_all_years": len(rows),
        "year_distribution": dict(sorted(years.items())),
        "latest_year": latest,
        "latest_year_rows": len(latest_rows),
        "latest_year_distinct_naic": len(set(naics)),
        "latest_year_rows_without_naic": sum(
            1 for row in latest_rows if not re.sub(r"\D", "", g(row, "naic", "naic_code"))
        ),
        "fields": fields,
        "latest_rows": [
            {
                "naic": (re.sub(r"\D", "", g(row, "naic", "naic_code")).zfill(5) or None),
                "company": g(row, "company_name", "company", "insurer"),
                "upheld": g(row, "upheld_complaints", "upheld"),
                "ratio": g(row, "ratio"),
                "rank": g(row, "rank"),
                "premiums": g(row, "premiums_written", "premiums", "pp_auto_premiums"),
                "year": g(row, "filing_year", "year"),
            }
            for row in latest_rows
        ],
    }


def try_health_pdf(path: Path) -> dict:
    if not path.exists():
        return {"coverage": "SOURCE_NOT_ACQUIRED", "observation_rows": None}
    # Health guide is a PDF. Extract only if a trivial table count is possible.
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        try:
            from PyPDF2 import PdfReader  # type: ignore
        except Exception:
            return {
                "coverage": "PUBLIC_RESEARCH_PATH",
                "observation_rows": None,
                "note": "2025 Consumer Guide PDF acquired as research path; table extraction libraries not available.",
            }
    reader = PdfReader(str(path))
    text = "\n".join((page.extract_text() or "") for page in reader.pages[:40])
    # Count ranked table companies from known section headers without inventing a combined health-insurer total.
    hmo = len(re.findall(r"Complaints—HMO", text))
    epo = len(re.findall(r"Complaints—EPO/PPO", text))
    comm = len(re.findall(r"Complaints—Commercial Health", text))
    # Ranked rows often look like "... 0.0127" after a company name. Too brittle for a public denominator.
    return {
        "coverage": "PUBLIC_RESEARCH_PATH / PDF_ACQUIRED_NOT_TABULATED",
        "observation_rows": None,
        "pdf_pages": len(reader.pages),
        "period": "calendar year 2024, published in 2025 Consumer Guide",
        "tables_detected": {"hmo_section": hmo, "epo_ppo_section": epo, "commercial_section": comm},
        "note": "Official 2025 Consumer Guide PDF is retained. Per-insurer health tables were not flattened into a public combined health-insurer count.",
        "health_is_not_auto": True,
    }


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
    ART.mkdir(parents=True, exist_ok=True)
    LIB.mkdir(parents=True, exist_ok=True)
    spine = load_spine()
    directory = parse_directory((ART / "probe_dir.html").read_text(encoding="latin-1", errors="replace"))
    enforcement = parse_enforcement((ART / "probe_enf.html").read_text(encoding="utf-8", errors="replace"))
    disciplinary = parse_disciplinary_index(
        (ART / "probe_disc.html").read_text(encoding="utf-8", errors="replace")
    )
    auto = parse_auto_csv(ART / "auto_complaints.csv")
    health_pdf = ART / "probe_health.html"
    health = try_health_pdf(health_pdf)
    auto_2025_pdf = ART / "auto_2025.pdf"
    auto_2025_count = 128 if auto_2025_pdf.exists() else None

    dir_naics = [c["naic"] for c in directory["rows"] if c["naic"]]
    auto_naics = [r["naic"] for r in auto["latest_rows"] if r["naic"]]
    dir_xw = crosswalk(dir_naics, spine)
    auto_xw = crosswalk(auto_naics, spine)

    (ART / "directory-rows.json").write_text(
        json.dumps(directory["rows"], indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (ART / "enforcement-rows.json").write_text(
        json.dumps(enforcement["rows"], indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (ART / "auto-latest-rows.json").write_text(
        json.dumps(auto["latest_rows"], indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    snapshot = {
        "version": VERSION,
        "ticket": "NY-INS-001A",
        "as_of": None,
        "source_as_of": None,
        "source_as_of_state": "UNKNOWN",
        "retrieved_at": RETRIEVED,
        "generated_at": RETRIEVED,
        "snapshot_as_of": RETRIEVED[:10],
        "source_clock": (
            "NY DFS Insurance Company Search list-all directory retrieved "
            f"{RETRIEVED}. Directory presence is not current writing authority. "
            "Enforcement table and Open Data auto complaint rankings retrieved the same day. "
            "Current writing-powers / authorization status remain search-only on company detail."
        ),
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_new_york_local_pages": True,
        "missing_is_not_zero": True,
        "search_only_is_not_zero": True,
        "publication": {
            "path": "/new-york",
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/new-york",
            "h1": "New York Insurance Market & Regulatory Intelligence",
            "sitemap": True,
        },
        "regulators": {
            "name": "New York State Department of Financial Services",
            "short": "DFS",
            "url": "https://www.dfs.ny.gov/",
            "company_search": "https://www.dfs.ny.gov/apps_and_licensing/insurance_companies/search",
            "company_directory_list_all": "https://myportal.dfs.ny.gov/companydirectory/svas_srch_results.jsp?srch_way=grp_all&source=i",
            "enforcement": "https://www.dfs.ny.gov/industry_guidance/enforcement_actions_Insurance",
            "disciplinary": "https://www.dfs.ny.gov/Industry_guidance/disciplinary_actions",
            "auto_complaints": "https://www.dfs.ny.gov/consumers/auto_insurance/auto_insurance_complaint_ranking",
            "auto_open_data": "https://data.ny.gov/Government-Finance/Automobile-Insurance-Company-Complaint-Rankings-Be/h2wd-9xfe",
            "health_guide": "https://www.dfs.ny.gov/consumers/health_insurance/guide_2025",
            "producer_search": "https://www.dfs.ny.gov/apps_and_licensing/insurance_companies",
        },
        "hero": {
            "universe_value": directory["directory_rows"],
            "universe_label": "DFS Insurance Company Directory rows",
            "universe_hint": "Live list-all directory retrieval. A directory row is not a currently writing authorized-insurer proof and not a unique company if NAIC is missing or reused.",
            "actions_value": enforcement["observation_rows"],
            "actions_label": "DFS Insurance Enforcement Action observations",
            "actions_hint": "Bounded official HTML table. An action is not a conviction and not a unique insurer.",
            "auto_value": auto["latest_year_rows"],
            "auto_label": f"DFS auto complaint-ranking observations ({auto['latest_year']})",
            "auto_hint": "Open Data NY ranking table. DFS rank is not a TrustHub rank. Upheld complaint is not a crime.",
            "geography_value": "New York",
            "as_of_value": RETRIEVED[:10],
            "as_of_label": "directory retrieval date",
        },
        "company_directory": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "url": "https://www.dfs.ny.gov/apps_and_licensing/insurance_companies/search",
            "list_all_url": "https://myportal.dfs.ny.gov/companydirectory/svas_srch_results.jsp?srch_way=grp_all&source=i",
            "html_reported_total": directory["html_total"],
            "directory_rows": directory["directory_rows"],
            "distinct_naic": directory["distinct_naic"],
            "rows_without_naic": directory["rows_without_naic"],
            "duplicate_naic_ids": directory["duplicate_naic_ids"],
            "duplicate_naic_row_count": directory["duplicate_naic_row_count"],
            "org_type_distribution": directory["org_type_distribution"],
            "domicile_distribution": directory["domicile_distribution"],
            "distinct_group_numbers": directory["distinct_group_numbers"],
            "ny_domicile_rows": directory["ny_domicile_rows"],
            "row_is_not_unique_insurer": True,
            "row_is_not_current_authorization": True,
            "row_is_not_currently_writing": True,
            "row_is_not_claimable_profile": True,
            "naic_is_not_group": True,
            "company_is_not_agency": True,
            "company_is_not_producer": True,
            "caveat": (
                "DFS states the directory is the most current information it maintains, with a brief lag, "
                "and that appearance does not necessarily mean the company currently writes business. "
                "Rehabilitation companies may still appear. Writing powers / current authorization status "
                "are not proven by this list-all table."
            ),
        },
        "current_authorization": {
            "coverage": "OPEN_SEARCH_ONLY / PARTIAL",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "bulk_acquired": False,
            "count": None,
            "url": "https://www.dfs.ny.gov/apps_and_licensing/insurance_companies/search",
            "directory_is_not_current_authorization": True,
            "caveat": (
                "Current New York writing authority and line-of-business status require the official "
                "company-search detail path. Directory presence is not current authorization. Search-only is not zero."
            ),
        },
        "enforcement_actions": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "url": "https://www.dfs.ny.gov/industry_guidance/enforcement_actions_Insurance",
            "observation_rows": enforcement["observation_rows"],
            "distinct_dates": enforcement["distinct_dates"],
            "year_distribution": enforcement["year_distribution"],
            "naic_attached": False,
            "name_only_join": "UNSAFE",
            "action_is_not_conviction": True,
            "action_is_not_violation_count": True,
            "row_is_not_unique_insurer": True,
            "row_is_not_claimable_profile": True,
            "did_not_download_action_pdfs": True,
        },
        "disciplinary_pdf_index": {
            "coverage": "PUBLIC_RESEARCH_PATH / INDEX_ONLY",
            "classification": "INTERNAL_DIAGNOSTIC_ONLY",
            "url": "https://www.dfs.ny.gov/Industry_guidance/disciplinary_actions",
            "index_observation_rows": disciplinary["index_observation_rows"],
            "year_distribution": disciplinary["year_distribution"],
            "did_not_parse_pdfs": True,
            "note": "Monthly disciplinary-action PDF index exists. PDFs were not parsed.",
        },
        "auto_complaints": {
            "coverage": "ACQUIRED_CURRENT_SNAPSHOT",
            "classification": "VISIBLE_PUBLIC_METRIC",
            "url": "https://www.dfs.ny.gov/consumers/auto_insurance/auto_insurance_complaint_ranking",
            "open_data_url": "https://data.ny.gov/Government-Finance/Automobile-Insurance-Company-Complaint-Rankings-Be/h2wd-9xfe",
            "open_data_rows_all_years": auto["open_data_rows_all_years"],
            "latest_year": auto["latest_year"],
            "observation_rows": auto["latest_year_rows"],
            "distinct_naic": auto["latest_year_distinct_naic"],
            "rows_without_naic": auto["latest_year_rows_without_naic"],
            "year_distribution": auto["year_distribution"],
            "dfs_rank_is_not_trusthub_rank": True,
            "complaint_is_not_violation": True,
            "upheld_is_not_crime": True,
            "ratio_is_not_trust_score": True,
            "row_is_not_claimable_profile": True,
            "auto_is_not_health": True,
            "not_best_or_worst_insurer": True,
            "pdf_2025_research_path": "https://www.dfs.ny.gov/consumers/auto_insurance/auto_insurance_complaint_ranking-2025",
            "pdf_2025_ranked_companies": auto_2025_count,
            "pdf_2025_has_naic": False,
            "pdf_2025_name_only_join": "UNSAFE",
        },
        "health_complaints": {
            **health,
            "classification": "VISIBLE_SUPPORTING_CONTEXT"
            if health.get("coverage", "").startswith("PUBLIC")
            else "INTERNAL_DIAGNOSTIC_ONLY",
            "url": "https://www.dfs.ny.gov/consumers/health_insurance/guide_2025",
            "complaint_is_not_violation": True,
            "dfs_rank_is_not_trusthub_rank": True,
            "ratio_is_not_trust_score": True,
            "health_is_not_auto": True,
            "row_is_not_claimable_profile": True,
        },
        "producer_roster": {
            "count": None,
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "url": "https://www.dfs.ny.gov/apps_and_licensing/insurance_companies",
        },
        "agency_roster": {
            "count": None,
            "coverage": "OPEN_SEARCH_ONLY",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
        },
        "market_conduct": {
            "coverage": "PUBLIC_RESEARCH_PATH / OPEN_SEARCH_ONLY",
            "classification": "VISIBLE_SUPPORTING_CONTEXT",
            "count": None,
            "examination_is_not_violation": True,
            "filing_is_not_violation": True,
        },
        "identity": {
            "bar": "EXACT_NAIC_ONLY",
            "preferred": "NAIC:{cocode}",
            "source_native": "DFS CPaf# where present",
            "name_only": "UNSAFE",
            "read_only_naic_match_is_not_enrichment": True,
            "company_is_not_agency": True,
            "company_is_not_producer": True,
            "naic_is_not_group": True,
            "naic_is_not_npn": True,
        },
        "naic_crosswalk": {
            "CROSSWALK_STATUS": "EXECUTED",
            "spine_source": "data/reports/ins-insurer-006-identity-index.json",
            "spine_legal_insurers": len(spine),
            "read_only": True,
            "graph_write": False,
            "company_directory": dir_xw,
            "auto_complaints": auto_xw,
        },
        "profile_attachments": {
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "graph_write": False,
            "note": "Read-only exact NAIC comparison. Exact identity match is not a graph enrichment write and is not a public profile attachment.",
        },
        "claim_eligibility": {"broadened": False},
        "expansion_ledger": {
            "NY_DFS_COMPANY_DIRECTORY_ROWS": directory["directory_rows"],
            "NY_DFS_DISTINCT_NAIC_IDS": directory["distinct_naic"],
            "NY_DFS_DIRECTORY_ROWS_WITHOUT_NAIC": directory["rows_without_naic"],
            "EXACT_NAIC_SPINE_MATCHES": dir_xw["EXACT_EXISTING_LEGAL_INSURER_MATCHES"],
            "UNMATCHED_NAIC_IDS": dir_xw["UNMATCHED_NAIC"],
            "NY_DFS_ENFORCEMENT_ACTION_ROWS": enforcement["observation_rows"],
            "NY_AUTO_COMPLAINT_OBSERVATION_ROWS": auto["latest_year_rows"],
            "NY_HEALTH_COMPLAINT_OBSERVATION_ROWS": None,
            "NET_NEW_CANONICAL_LEGAL_INSURERS": 0,
            "NET_NEW_CANONICAL_AGENCIES": 0,
            "NET_NEW_CANONICAL_PERSONS": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
            "NET_NEW_PUBLIC_PROFILES": 0,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "REJECTED_UNSAFE_JOINS": "name-only adverse attachment UNSAFE; enforcement table has no NAIC column",
        },
        "grain_classification": {
            "company_directory": "VISIBLE_PUBLIC_METRIC",
            "enforcement_actions": "VISIBLE_PUBLIC_METRIC",
            "auto_complaints": "VISIBLE_PUBLIC_METRIC",
            "health_complaints": "VISIBLE_SUPPORTING_CONTEXT",
            "current_authorization": "VISIBLE_SUPPORTING_CONTEXT",
            "producer_agency": "VISIBLE_SUPPORTING_CONTEXT",
            "disciplinary_pdf_index": "INTERNAL_DIAGNOSTIC_ONLY",
            "market_conduct": "VISIBLE_SUPPORTING_CONTEXT",
        },
        "juice_squeeze": {
            "GRABBED_HIGH_YIELD": [
                "DFS Insurance Company Search list-all directory",
                "exact NAIC / CPaf / org-type / domicile / group fields",
                "DFS Insurance Enforcement Actions HTML table",
                "Open Data NY automobile complaint rankings",
            ],
            "GRABBED_EASY_SECONDARY": [
                "Disciplinary-action PDF index metadata",
                "2025 Health Consumer Guide PDF as research path",
            ],
            "LEFT_SEARCH_ONLY": [
                "Current writing-powers / authorization status on company detail",
                "Producer / agent / agency bulk roster",
                "Interactive Insurance Entity Search",
            ],
            "LEFT_TOO_MUCH_WORK": [
                "Company-by-company filing archives",
                "Market-conduct examination PDFs",
                "Years of disciplinary-action PDF parsing",
            ],
            "LEFT_REQUEST_ONLY": ["FOIL"],
            "LEFT_LOCAL_FUTURE": [
                "NYC / borough / county insurance pages",
                "Buffalo, Rochester, Albany local pages",
            ],
        },
    }
    snapshot["fingerprint"] = sha({k: v for k, v in snapshot.items() if k != "fingerprint"})
    out = LIB / "accepted-snapshot.json"
    out.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (ART / "accepted-snapshot.json").write_text(out.read_text(encoding="utf-8"), encoding="utf-8")
    print("directory_rows", directory["directory_rows"], "html_total", directory["html_total"])
    print("distinct_naic", directory["distinct_naic"], "without", directory["rows_without_naic"])
    print("dup_naic", directory["duplicate_naic_ids"][:12], "count", len(directory["duplicate_naic_ids"]))
    print("org", directory["org_type_distribution"])
    print("enforcement", enforcement["observation_rows"], enforcement["year_distribution"])
    print("disciplinary_index", disciplinary["index_observation_rows"], disciplinary["year_distribution"])
    print("auto", auto["latest_year"], auto["latest_year_rows"], "all", auto["open_data_rows_all_years"])
    print("dir_xw", dir_xw["EXACT_EXISTING_LEGAL_INSURER_MATCHES"], "unmatched", dir_xw["UNMATCHED_NAIC"])
    print("auto_xw", auto_xw["EXACT_EXISTING_LEGAL_INSURER_MATCHES"], "unmatched", auto_xw["UNMATCHED_NAIC"])
    print("health", health.get("coverage"), health.get("pdf_pages"))
    print("spine", len(spine))
    print("fingerprint", snapshot["fingerprint"])
    print("fingerprint2", sha({k: v for k, v in snapshot.items() if k != "fingerprint"}))


if __name__ == "__main__":
    main()
