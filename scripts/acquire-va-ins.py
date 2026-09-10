#!/usr/bin/env python3
"""VA-INS-001 — acquire bounded Virginia SCC Bureau of Insurance public tables.

HTML tables:
  Regulatory Actions
  Market Conduct Examination Reports
  Company Financial Examination listing (easy secondary)

Statistical-report company-level financial PDFs (*_gen / WC_fin / bs_gen).
Does not brute-force company search, Sircon, or case PDFs.
"""

from __future__ import annotations

import hashlib
import html as htmlmod
import json
import re
import ssl
import time
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "va-ins-001"
ART.mkdir(parents=True, exist_ok=True)
PDF_DIR = ART / "pdfs"
PDF_DIR.mkdir(exist_ok=True)

UA = "InsuranceTrustHub/VA-INS-001 (research; +https://www.insurancetrusthub.com)"
CTX = ssl.create_default_context()
BASE = "https://www.scc.virginia.gov"
ACTIONS_URL = f"{BASE}/regulated-industries/companies/for-insurance-companies/regulatory-actions/"
MC_URL = f"{BASE}/regulated-industries/companies/for-insurance-companies/market-conduct-examination-reports/"
FIN_URL = f"{BASE}/regulated-industries/companies/for-insurance-companies/company-financial-reporting/"
MEDIA = f"{BASE}/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/for-companies/-company-financial-reporting"

GEN_PDFS = {
    "health": f"{MEDIA}/Health_gen.pdf",
    "life": f"{MEDIA}/Life_gen.pdf",
    "pc": f"{MEDIA}/PC_gen.pdf",
    "burial": f"{MEDIA}/bs_gen.pdf",
    "legal_service": f"{MEDIA}/LS_gen.pdf",
    "lgsip": f"{MEDIA}/LGSIP_gen.pdf",
    "mutual_lt10m": f"{MEDIA}/MA_gen.pdf",
    "mutual_gt10m": f"{MEDIA}/MA_genover.pdf",
    "title": f"{MEDIA}/TI_gen.pdf",
    "wc_group": f"{MEDIA}/WC_fin.pdf",
}

NAIC_RE = re.compile(r"\b(\d{5})\b")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, context=CTX, timeout=60) as response:
        return response.read()


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tables: list[list[list[tuple[str, str]]]] = []
        self._table: list[list[tuple[str, str]]] | None = None
        self._row: list[tuple[str, str]] | None = None
        self._cell: list[str] | None = None
        self._href: str = ""
        self._in_td = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        ad = {k: v or "" for k, v in attrs}
        if tag == "table":
            self._table = []
        elif tag in {"tr"} and self._table is not None:
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._in_td = True
            self._cell = []
            self._href = ""
        elif tag == "a" and self._in_td:
            href = ad.get("href", "")
            if href:
                self._href = href

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._row is not None and self._cell is not None:
            text = htmlmod.unescape(re.sub(r"\s+", " ", "".join(self._cell))).strip()
            self._row.append((text, self._href))
            self._cell = None
            self._in_td = False
            self._href = ""
        elif tag == "tr" and self._table is not None and self._row is not None:
            if any(cell[0] for cell in self._row):
                self._table.append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            if self._table:
                self.tables.append(self._table)
            self._table = None

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)


def abs_url(href: str) -> str:
    if not href:
        return ""
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return BASE + href
    return href


def parse_actions(html: str) -> list[dict]:
    parser = TableParser()
    parser.feed(html)
    table = max(parser.tables, key=len)
    header = [c[0].lower() for c in table[0]]
    rows: list[dict] = []
    current_case = ""
    current_date = ""
    current_type = ""
    current_url = ""
    for raw in table[1:]:
        cells = list(raw) + [("", "")] * 5
        company, naic, typ, order_date, case = (cells[i][0] for i in range(5))
        case_href = cells[4][1]
        if case:
            current_case = case
            current_url = abs_url(case_href)
        if order_date:
            current_date = order_date
        if typ:
            current_type = typ
        naic_n = re.sub(r"\D", "", naic)
        if len(naic_n) != 5 or not company:
            continue
        rows.append(
            {
                "company": company,
                "naic": naic_n,
                "type": current_type or None,
                "order_date": current_date or None,
                "case": current_case or None,
                "url": current_url or None,
            }
        )
    return rows


def parse_market_conduct(html: str) -> list[dict]:
    parser = TableParser()
    parser.feed(html)
    table = max(parser.tables, key=len)
    rows: list[dict] = []
    for raw in table[1:]:
        cells = list(raw) + [("", "")] * 4
        company, naic, typ, order_date = (cells[i][0] for i in range(4))
        href = cells[0][1]
        naic_n = re.sub(r"\D", "", naic)
        if len(naic_n) != 5 or not company:
            continue
        if company.lower().startswith("company name"):
            continue
        rows.append(
            {
                "company": company,
                "naic": naic_n,
                "type": typ or None,
                "order_date": order_date or None,
                "url": abs_url(href) or None,
            }
        )
    return rows


def parse_financial_exams(html: str) -> list[dict]:
    parser = TableParser()
    parser.feed(html)
    if not parser.tables:
        return []
    table = max(parser.tables, key=len)
    rows: list[dict] = []
    current_class = None
    for raw in table[1:]:
        cells = list(raw) + [("", "")] * 3
        name, code, date = cells[0][0], cells[1][0], cells[2][0]
        href = cells[1][1] or cells[0][1]
        if not code and name and not date:
            current_class = name
            continue
        if not name:
            continue
        code_n = re.sub(r"[^0-9A-Za-z]", "", code)
        naic = re.sub(r"\D", "", code)
        rows.append(
            {
                "company": name,
                "source_code": code_n or None,
                "naic": naic if len(naic) == 5 else None,
                "exam_date": date or None,
                "company_class": current_class,
                "url": abs_url(href) or None,
            }
        )
    return rows


def pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        import subprocess
        import sys

        subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf", "-q"])
        from pypdf import PdfReader

    reader = PdfReader(str(path))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def parse_gen_pdf(text: str, category: str) -> list[dict]:
    """Extract company-level COCODE observations from financial-data PDFs."""
    rows: list[dict] = []
    seen: set[str] = set()
    # Typical layout: 5-digit COCODE then company name on same or next tokens.
    for match in re.finditer(r"(?m)^(?:COCODE|Cocode|Company\s*No\.)?\s*(\d{5})\s+([A-Za-z0-9][^\n]{2,80})", text):
        naic, name = match.group(1), match.group(2).strip()
        name = re.split(r"\s{2,}|\t|\$", name)[0].strip(" .,-")
        if name.lower() in {"company name", "totals", "number of companies", "cocode"}:
            continue
        if naic in seen:
            continue
        # skip line-of-business numeric codes that aren't companies (e.g. 288 Fire)
        if re.match(r"^(fire|allied|homeowners|totals|number)\b", name, re.I):
            continue
        seen.add(naic)
        rows.append({"naic": naic, "company": name, "category": category})
    return rows


def load_spine() -> set[str]:
    path = ROOT / "data" / "reports" / "ins-insurer-006-identity-index.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    codes: set[str] = set()
    if isinstance(data, dict):
        for key in ("cocodes", "legal_insurer_cocodes", "naic", "codes"):
            if key in data and isinstance(data[key], list):
                codes.update(str(x).zfill(5) for x in data[key])
        entities = data.get("entities") or data.get("legal_insurers") or []
        if isinstance(entities, list):
            for ent in entities:
                if isinstance(ent, dict):
                    for k in ("naic", "cocode", "CoCode", "naic_cocode"):
                        if ent.get(k):
                            codes.add(str(ent[k]).zfill(5)[-5:])
                elif isinstance(ent, str) and ent.isdigit():
                    codes.add(ent.zfill(5)[-5:])
        if "by_cocode" in data and isinstance(data["by_cocode"], dict):
            codes.update(str(k).zfill(5)[-5:] for k in data["by_cocode"])
    elif isinstance(data, list):
        for ent in data:
            if isinstance(ent, str) and re.fullmatch(r"\d{4,5}", ent):
                codes.add(ent.zfill(5))
            elif isinstance(ent, dict):
                for k in ("naic", "cocode", "CoCode"):
                    if ent.get(k):
                        codes.add(str(ent[k]).zfill(5)[-5:])
    return {c for c in codes if re.fullmatch(r"\d{5}", c)}


def crosswalk(naics: list[str], spine: set[str]) -> dict:
    distinct = sorted({n for n in naics if re.fullmatch(r"\d{5}", n)})
    matched = [n for n in distinct if n in spine]
    unmatched = [n for n in distinct if n not in spine]
    return {
        "SOURCE_DISTINCT_NAIC": len(distinct),
        "EXACT_EXISTING_LEGAL_INSURER_MATCHES": len(matched),
        "UNMATCHED_NAIC": len(unmatched),
        "unmatched_naic": unmatched,
        "read_only": True,
        "graph_write": False,
    }


def main() -> int:
    retrieved = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    print("fetch actions")
    actions_html = fetch(ACTIONS_URL).decode("utf-8", "replace")
    (ART / "regulatory-actions.html").write_text(actions_html, encoding="utf-8")
    actions = parse_actions(actions_html)
    print("  rows", len(actions))

    print("fetch market conduct")
    mc_html = fetch(MC_URL).decode("utf-8", "replace")
    (ART / "market-conduct.html").write_text(mc_html, encoding="utf-8")
    market = parse_market_conduct(mc_html)
    print("  rows", len(market))

    print("fetch financial reporting page")
    fin_html = fetch(FIN_URL).decode("utf-8", "replace")
    (ART / "financial-reporting.html").write_text(fin_html, encoding="utf-8")
    exams = parse_financial_exams(fin_html)
    print("  financial exam listing rows", len(exams))

    gen_rows: list[dict] = []
    gen_meta: dict[str, dict] = {}
    for category, url in GEN_PDFS.items():
        print("pdf", category, url)
        raw = fetch(url)
        path = PDF_DIR / f"{category}.pdf"
        path.write_bytes(raw)
        text = pdf_text(path)
        (ART / f"{category}.txt").write_text(text, encoding="utf-8")
        parsed = parse_gen_pdf(text, category)
        gen_rows.extend(parsed)
        gen_meta[category] = {
            "url": url,
            "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "rows": len(parsed),
        }
        print("  companies", len(parsed))

    spine = load_spine()
    print("spine", len(spine))

    bundle = {
        "ticket": "VA-INS-001",
        "retrieved_at": retrieved,
        "actions": actions,
        "market_conduct": market,
        "financial_exams": exams,
        "stat_report_companies": gen_rows,
        "stat_report_pdfs": gen_meta,
        "spine_size": len(spine),
        "crosswalk": {
            "stat_report": crosswalk([r["naic"] for r in gen_rows], spine),
            "regulatory_actions": crosswalk([r["naic"] for r in actions], spine),
            "market_conduct": crosswalk([r["naic"] for r in market], spine),
            "financial_exams": crosswalk([r["naic"] for r in exams if r.get("naic")], spine),
        },
    }
    (ART / "raw.json").write_text(json.dumps(bundle, indent=2) + "\n", encoding="utf-8")
    print("wrote", ART / "raw.json")
    print("stat companies", len(gen_rows), "distinct", bundle["crosswalk"]["stat_report"])
    print("actions", len(actions), bundle["crosswalk"]["regulatory_actions"])
    print("mc", len(market), bundle["crosswalk"]["market_conduct"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
