#!/usr/bin/env python3
"""TN-INS-001: turn the raw TDCI captures into the committed Tennessee extracts.

Stdlib only. Reads the gitignored captures in data/tennessee/tn-ins-001/raw/ and writes the
committed extracts next to them. CI never runs this file; `build_snapshot.py --check` rebuilds the
accepted snapshot from the committed extracts.

Privacy (MA-INS-001P precedent):
- The licensed-company table's street address, ZIP and business phone columns are not committed.
- Company-action captions that name a counterparty (often an employer in a premium dispute, some of
  them individuals) are withheld; only single-company captions are kept.
- Company-action document links use free-text file names and are replaced by a short reference.
- Producer disciplinary names and links are never written; only counts are kept.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/tennessee/tn-ins-001"
RAW = SRC / "raw"
TN = "https://www.tn.gov"
VERSION = "insurance-tn-state-intel-v1"

MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], 1)}
MONTHS.update({"jan": 1, "feb": 2, "febuary": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "sept": 9,
               "oct": 10, "nov": 11, "dec": 12})
MONTH_RE = r"(January|February|Febuary|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)"
DATE_WORDS = re.compile(MONTH_RE + r"\.?\s*,?\s*(\d{1,2})\s*,?\s*(\d{4})", re.I)
DATE_NUM = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})\b")

# A lower-case " and ", "vs.", "v." or "d/b/a" joins two parties unless it sits inside a company name.
INTERNAL_AND = re.compile(
    r"\b(Casualty and Surety|Life and Health|Life and Accident|Life and Casualty|Property and Casualty|"
    r"Accident and Health|Acquisition and Merger|Fire and Marine)\b")
COUNTERPARTY = re.compile(r"\band\b|\bvs?\.(?=\s)|\bd/b/a\b|\bdba\b")
PERSON = re.compile(r"\b[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+")
TERMS = ["Consent Order", "Agreed Order", "Order to Show Cause", "Court Order", "Order", "Acquisition", "Merger",
         "Rehabilitation", "Liquidation", "Settlement", "Petition", "Bond", "Exam", "Suspension", "Receivership"]
LICENSED_COMMITTED = ["COMPANY_NAME", "NAIC_COCODE", "DOMICILE_STATE", "COMPANY_TYPE", "MAO_STATE_ABBR", "STATUS_REASON", "STATUS_DATE"]
LICENSED_WITHHELD = ["MAO_ADDRESS1", "MAO_ADDRESS2", "MAO_CITY", "MAO_ZIP", "BUSINESS_PHONE"]


def need(cond: bool, message: str) -> None:
    if not cond:
        sys.exit(f"TN-INS-001 extract: {message}")


def text(fragment: str) -> str:
    return re.sub(r"\s+([.,;:])", r"\1", " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split()))


def raw_meta(name: str) -> dict:
    meta = json.loads((RAW / f"{name}.meta.json").read_text(encoding="utf-8"))
    data = (RAW / name).read_bytes()
    need(hashlib.sha256(data).hexdigest() == meta["sha256"], f"{name} bytes differ from its capture record")
    need(meta["status"] == 200, f"{name} status {meta['status']}")
    return {k: meta[k] for k in ("url", "final_url", "status", "retrieved_at", "last_modified", "content_type", "bytes", "sha256")}


def page(name: str) -> str:
    h = (RAW / name).read_text(encoding="utf-8")
    start = h.find('id="main"')
    end = h.find("<footer", start)
    return h[start:end if end > 0 else None]


def iso_dates(s: str) -> list[str]:
    out = []
    for m in DATE_WORDS.finditer(s):
        month = MONTHS[m.group(1).lower()]
        day, year = int(m.group(2)), int(m.group(3))
        if 1 <= day <= 31 and 1990 <= year <= 2030:
            out.append(f"{year:04d}-{month:02d}-{day:02d}")
    for m in DATE_NUM.finditer(s):
        month, day, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        year = year + 2000 if year < 100 else year
        if 1 <= month <= 12 and 1 <= day <= 31 and 1990 <= year <= 2030:
            out.append(f"{year:04d}-{month:02d}-{day:02d}")
    return out


def screen(s: str) -> str | None:
    """Return a withheld reason, or None when the text names only one company."""
    if PERSON.search(s):
        return "person_name_pattern"
    # "March 23, 2026 and May 22, 2026" joins two dates, not two parties.
    parties = DATE_NUM.sub("<D>", DATE_WORDS.sub("<D>", s))
    parties = re.sub(r"<D>(\s*,?\s*(and\s+)?<D>)+", "<D>", parties)
    if COUNTERPARTY.search(INTERNAL_AND.sub("", parties)):
        return "names_a_counterparty"
    return None


def doc_ref(href: str) -> str:
    return hashlib.sha256(href.encode("utf-8")).hexdigest()[:16]


class Blocks(HTMLParser):
    """Headings, paragraphs and tables in document order (monthly update, reinsurer lists)."""

    def __init__(self) -> None:
        super().__init__()
        self.out: list = []
        self.table = self.row = self.cell = self.head = None

    def handle_starttag(self, tag, attrs):
        if self.table is None and tag in ("h1", "h2", "h3", "h4", "p"):
            self.head = ""
        if tag == "table":
            self.table = []
        elif tag == "tr" and self.table is not None:
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = ""

    def handle_endtag(self, tag):
        if self.table is None and tag in ("h1", "h2", "h3", "h4", "p") and self.head is not None:
            value = " ".join(self.head.split())
            if value:
                self.out.append(("H", value))
            self.head = None
        elif tag in ("td", "th") and self.cell is not None and self.row is not None:
            self.row.append(" ".join(self.cell.split()))
            self.cell = None
        elif tag == "tr" and self.row is not None and self.table is not None:
            self.table.append(self.row)
            self.row = None
        elif tag == "table" and self.table is not None:
            self.out.append(("T", self.table))
            self.table = None

    def handle_data(self, data):
        if self.cell is not None:
            self.cell += data
        elif self.head is not None:
            self.head += data


def blocks(h: str) -> list:
    p = Blocks()
    p.feed(h)
    return p.out


def licensed_companies() -> tuple[dict, dict]:
    page_meta, table_meta = raw_meta("licensed-companies.html"), raw_meta("licensed-companies.tablejson.json")
    h = page("licensed-companies.html")
    m = re.search(r"As of ([A-Z][a-z]+ \d{1,2}, \d{4})\.", h)
    need(m is not None, "licensed-company list date")
    statement = f"As of {m.group(1)}."
    ajax = re.search(r"ajax&#34;:&#34;([^&]+tablejson\.json)", (RAW / "licensed-companies.html").read_text(encoding="utf-8"))
    need(ajax is not None and TN + ajax.group(1) == table_meta["url"], "table JSON is the page's own data endpoint")
    rows = json.loads((RAW / "licensed-companies.tablejson.json").read_text(encoding="utf-8"))["data"]
    need(all(sorted(r) == sorted(LICENSED_COMMITTED + LICENSED_WITHHELD) for r in rows), "licensed-company columns changed")
    extract = {
        "version": VERSION,
        "source": page_meta["url"],
        "data_endpoint": table_meta["url"],
        "list_statement": statement,
        "source_as_of": iso_dates(statement)[0],
        "columns": LICENSED_COMMITTED,
        "withheld_columns": LICENSED_WITHHELD,
        "withheld_reason": "Street address, city, ZIP and phone are not needed for company identity and are not committed.",
        "row_order": "as served by the TDCI data endpoint",
        "rows": [[r[c] for c in LICENSED_COMMITTED] for r in rows],
    }
    source = {"page": page_meta, "data_endpoint": table_meta, "list_statement": statement,
              "source_as_of": extract["source_as_of"], "rows": len(rows), "columns_published": LICENSED_COMMITTED + LICENSED_WITHHELD}
    return extract, source


MONTHLY_SECTIONS = {
    "Admissions / Recognitions": "admissions_recognitions",
    "Mergers": "mergers",
    "Name Changes": "name_changes",
    "Redomestications": "redomestications",
    "Surrenders and Revocations": "surrenders_revocations",
    "Suspensions": "suspensions",
    "Miscellaneous": "miscellaneous",
}


def monthly_update() -> tuple[dict, dict]:
    meta = raw_meta("monthly-update.html")
    items = blocks(page("monthly-update.html"))
    heads = [v for k, v in items if k == "H"]
    as_of = next((h for h in heads if "As of" in h), None)
    updated = next((h for h in heads if h.startswith("This Page Last Updated")), None)
    need(as_of is not None and updated is not None, "monthly update clocks")
    sections: dict[str, dict] = {}
    current = None
    for kind, value in items:
        if kind == "H" and value in MONTHLY_SECTIONS:
            current = MONTHLY_SECTIONS[value]
        elif kind == "T" and current:
            header, body = value[0], value[1:]
            none_row = [c for c in body if all(x.strip().lower() == "none" for x in c)]
            sections[current] = {
                "heading": next(k for k, v in MONTHLY_SECTIONS.items() if v == current),
                "columns": header,
                "rows": [r for r in body if r not in none_row],
                "published_none_row": bool(none_row),
            }
            current = None
    need(set(sections) == set(MONTHLY_SECTIONS.values()), f"monthly sections {sorted(sections)}")
    list_as_of = re.search(r"As of ([A-Z][a-z]+ \d{1,2}, \d{4})", as_of).group(1)
    extract = {
        "version": VERSION,
        "source": meta["url"],
        "asterisk_statement": as_of,
        "source_as_of": iso_dates(list_as_of)[0],
        "page_last_updated_statement": updated,
        "sections": sections,
    }
    return extract, {"page": meta, "asterisk_statement": as_of, "page_last_updated_statement": updated, "source_as_of": extract["source_as_of"]}


class ActionLines(HTMLParser):
    """Company-action archive: one record per <li>, in document order, with nesting depth."""

    def __init__(self) -> None:
        super().__init__()
        self.letter = None
        self.stack: list[dict] = []
        self.lines: list[dict] = []
        self.link: dict | None = None
        self.started = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a" and a.get("class") == "anchor" and re.fullmatch(r"[A-Z]", a.get("id") or ""):
            self.letter = a["id"]
            self.started = True
            return
        if not self.started:
            return
        if tag == "li":
            frame = {"letter": self.letter, "depth": len(self.stack) + 1, "parent": self.stack[-1]["index"] if self.stack else None,
                     "index": len(self.lines), "raw": "", "links": []}
            self.stack.append(frame)
            self.lines.append(frame)
        elif tag == "a" and self.stack and a.get("href"):
            self.link = {"href": a["href"], "title_attr": a.get("title"), "text": ""}
            self.stack[-1]["links"].append(self.link)
        elif tag == "ul" and self.stack:
            self.stack[-1]["closed_text"] = True

    def handle_endtag(self, tag):
        if tag == "a":
            self.link = None
        elif tag == "li" and self.stack:
            self.stack.pop()

    def handle_data(self, data):
        if self.stack and not self.stack[-1].get("closed_text"):
            self.stack[-1]["raw"] += data
            if self.link is not None:
                self.link["text"] += data


def company_actions() -> tuple[dict, dict]:
    meta = raw_meta("company-actions.html")
    p = ActionLines()
    p.feed(page("company-actions.html"))
    need(len(p.lines) > 150, f"only {len(p.lines)} action lines")
    ids = [f"tn-ca-{i + 1:03d}" for i in range(len(p.lines))]
    lines = []
    for i, line in enumerate(p.lines):
        listed = " ".join(html.unescape(line["raw"]).split())
        reason = screen(listed)
        parent_reason = lines[line["parent"]]["caption_withheld_reason"] if line["parent"] is not None else None
        reason = reason or (f"parent_{parent_reason}" if parent_reason and not parent_reason.startswith("parent_") else parent_reason)
        docs = []
        seen = set()
        for link in line["links"]:
            if link["href"] in seen:
                continue
            seen.add(link["href"])
            label = " ".join(html.unescape(link["text"]).split())
            is_date = bool(iso_dates(label)) and not re.search(r"[A-Za-z]{4,}", DATE_WORDS.sub("", label))
            docs.append({
                "ref": doc_ref(link["href"]),
                "label_kind": "date" if is_date else "title",
                "title_as_listed": None if is_date or reason else (label or None),
                "dates": iso_dates(label),
                "pdf": link["href"].lower().endswith(".pdf"),
            })
        lines.append({
            "id": ids[i],
            "letter": line["letter"],
            "depth": line["depth"],
            "parent": ids[line["parent"]] if line["parent"] is not None else None,
            "caption_as_listed": None if reason else listed,
            "caption_withheld_reason": reason,
            "dates": sorted(set(iso_dates(line["raw"]))),
            "multiple_dates_as_listed": "Multiple Dates" in listed,
            "signed_version_on_request": "Signed version available on request" in listed,
            "terms_as_listed": [t for t in TERMS if re.search(r"\b" + re.escape(t) + r"\b", listed, re.I)],
            "documents": docs,
        })
    extract = {
        "version": VERSION,
        "source": meta["url"],
        "list_date": None,
        "organization": "Alphabetical by company; each line is a caption followed by dated or titled document links. No NAIC code, case number or action-type column is printed.",
        "document_links": "Withheld: TDCI file names are free text and can name counterparties. Each document keeps a reference (first 16 hex of SHA-256 of its path); open the official archive to read it.",
        "caption_screen": "Captions that name a second party (lower-case 'and', 'vs.', 'v.', 'd/b/a') or an individual name pattern are withheld; child lines inherit the parent's screen.",
        "lines": lines,
    }
    return extract, {"page": meta, "list_date": None}


def company_examinations() -> tuple[dict, dict]:
    meta = raw_meta("company-exams.html")
    h = page("company-exams.html")
    body = h[h.find('<h2><a id="'):]
    year = None
    rows: list[dict] = []
    token = re.compile(r"<h2[^>]*>(.*?)</h2>|<h3[^>]*>(.*?)</h3>|<li>\s*Posted\s*([^<]*)|<a [^>]*href=\"([^\"]+\.pdf)\"[^>]*>(.*?)</a>", re.S)
    for m in token.finditer(body):
        if m.group(1) is not None or m.group(2) is not None:
            label = text(m.group(1) if m.group(1) is not None else m.group(2))
            if m.group(1) is not None and re.fullmatch(r"(19|20)\d\d", label):
                year = int(label)
                continue
            rows.append({"exam_as_of_year": year, "company_as_listed": label, "posted_as_listed": [], "links": {}})
        elif m.group(3) is not None and rows:
            rows[-1]["posted_as_listed"].append(m.group(3).strip())
        elif m.group(4) is not None and rows:
            rows[-1]["links"].setdefault(m.group(4), []).append(text(m.group(5)))
    listings = []
    for i, r in enumerate(rows):
        need(r["exam_as_of_year"] is not None, f"exam row without year: {r['company_as_listed']}")
        need(screen(r["company_as_listed"]) in (None, "names_a_counterparty"), f"exam company screen: {r['company_as_listed']}")
        docs = []
        for href, parts in r["links"].items():
            label = "".join(parts)
            probe = label if re.search(r"exam|order", label, re.I) else href.rsplit("/", 1)[-1]
            kind = "Order" if re.search(r"order", probe, re.I) else "Exam" if re.search(r"exam", probe, re.I) else "Other"
            docs.append({"kind": kind, "label_as_listed": label, "url": TN + href if href.startswith("/") else href})
        listings.append({
            "id": f"tn-exam-{i + 1:03d}",
            "exam_as_of_year": r["exam_as_of_year"],
            "company_as_listed": r["company_as_listed"],
            "posted_as_listed": r["posted_as_listed"],
            "posted": [d for p in r["posted_as_listed"] for d in iso_dates(p)],
            "documents": docs,
        })
    extract = {
        "version": VERSION,
        "source": meta["url"],
        "organization": "Grouped by the year the examination is as of, then company; most listings carry a posting date and Exam / Order PDF links.",
        "pdfs_parsed": False,
        "listings": listings,
    }
    return extract, {"page": meta}


def producer_discipline() -> tuple[dict, dict]:
    meta = raw_meta("producer-discipline.html")
    h = page("producer-discipline.html")
    hrefs = re.findall(r'href="(/content/dam/tn/commerce/documents/insurance/agentproduceractions/[^"]+)"', h)
    by_letter: dict[str, int] = {}
    for href in hrefs:
        m = re.search(r"/agentproduceractions/([a-z])/", href)
        key = m.group(1).upper() if m else "other"
        by_letter[key] = by_letter.get(key, 0) + 1
    extract = {
        "version": VERSION,
        "source": meta["url"],
        "organization": "Alphabetical by the individual's last name; each entry is a name linking to an order PDF.",
        "linked_entries": len(hrefs),
        "distinct_documents": len(set(hrefs)),
        "linked_entries_by_letter": dict(sorted(by_letter.items())),
        "names_published_here": False,
        "document_links_published_here": False,
        "npn_or_license_number_printed": False,
        "action_date_printed_as_field": False,
        "note": "Person-grain evidence. Names are on the official archive and are not republished. No NPN is printed, so no entry is attached to a producer, agency or insurer.",
    }
    return extract, {"page": meta}


def consumer_and_licensing() -> tuple[dict, dict]:
    complaint = raw_meta("file-complaint.html")
    verify = raw_meta("verify-license.html")
    types = raw_meta("types.html")
    reins = raw_meta("reinsurers.html")
    h = page("file-complaint.html")
    body = text(h)
    statements = []
    for start in ("Consumers who believe they have been wrongfully denied a claim", "The insurance policy must have been written in Tennessee",
                  "Any complaints involving TennCare, CoverKids, or CoverRx"):
        m = re.search(re.escape(start) + r"[^.]*\.", body)
        need(m is not None, f"complaint statement: {start}")
        statements.append(m.group(0))
    cis = re.search(r'href="(https://www\.naic\.org/cis_refined_results\.htm[^"]*)"[^>]*>\s*Complaint Data', h)
    need(cis is not None, "complaint data link")
    type_names = [text(m) for m in re.findall(r'href="/content/tn/commerce/insurance/[^"]*"[^>]*>(.*?)</a>', page("types.html"))]
    type_names = [t for t in type_names if t]
    rb = blocks(page("reinsurers.html"))
    tables = [v for k, v in rb if k == "T"]
    need(len(tables) >= 2, "reinsurer tables")
    extract = {
        "version": VERSION,
        "complaints": {
            "source": complaint["url"],
            "statements": statements,
            "online_form": "NAIC State Based Systems online complaint form for Tennessee",
            "complaint_data_link_target": html.unescape(cis.group(1)),
            "complaint_data_link_note": "The TDCI page's 'Complaint Data' link opens the NAIC Consumer Insurance Search for a single example company code. TDCI publishes no Tennessee company-level complaint table or download on this page.",
        },
        "license_verification": {
            "source": verify["url"],
            "resolves_to": verify["final_url"],
            "note": "The TDCI 'Verify an Insurance License' page resolves to the NAIC public license lookup (companies and producers). Search-only; no bulk file.",
        },
        "company_types_page": {"source": types["url"], "types_listed": type_names},
        "reinsurers_and_jurisdictions": {
            "source": reins["url"],
            "certified_reinsurer_rows": len(tables[0]) - 1,
            "rj_reinsurer_rows": len(tables[1]) - 1,
            "identifier": "7-digit NAIC alien company codes",
            "financial_strength_rating_column_republished": False,
            "note": "The licensed-company list prints NAIC 99999 for these reinsurers. Linking them to the 7-digit codes here would need a name match, so it is not done.",
        },
    }
    return extract, {"complaints": complaint, "license_verification": verify, "company_types": types, "reinsurers_and_jurisdictions": reins}


def main() -> None:
    lic, s_lic = licensed_companies()
    mon, s_mon = monthly_update()
    act, s_act = company_actions()
    exa, s_exa = company_examinations()
    pro, s_pro = producer_discipline()
    con, s_con = consumer_and_licensing()
    landing = {k: raw_meta(f) for k, f in (("insurance_landing", "insurance.html"), ("company_resources", "company-resources.html"),
                                            ("agent_producer_resources", "agent-producer.html"))}
    sources = {
        "version": VERSION,
        "ticket": "TN-INS-001",
        "regulator": "Tennessee Department of Commerce & Insurance (TDCI), Insurance Division",
        "retrieval_note": "Captured with a plain HTTPS client on the retrieved_at clocks below. Raw captures are gitignored; their SHA-256 values are recorded here.",
        "licensed_companies": s_lic,
        "monthly_update": s_mon,
        "company_actions": s_act,
        "company_examinations": s_exa,
        "producer_discipline": s_pro,
        **s_con,
        **landing,
    }
    outputs = {
        "sources.json": sources,
        "licensed-companies.json": lic,
        "monthly-update.json": mon,
        "company-actions-index.json": act,
        "company-examinations-index.json": exa,
        "producer-discipline-census.json": pro,
        "consumer-and-licensing-pages.json": con,
    }
    for name, obj in outputs.items():
        indent = None if name == "licensed-companies.json" else 1
        (SRC / name).write_text(json.dumps(obj, indent=indent, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
        print(name, (SRC / name).stat().st_size)


if __name__ == "__main__":
    main()
