"""Build bounded CT-INS-001 snapshots from public CID sources (no protected SBS access)."""

from __future__ import annotations

import hashlib
import html
import json
import re
from collections import Counter
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin

import pdfplumber
import pypdf
import requests


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "lib" / "connecticut-intelligence"
ROSTER_URL = "https://portal.ct.gov/cid/-/media/cid/1_lists/licencom.pdf"
MARKET_URL = "https://portal.ct.gov/cid/department-resources/cid-reports/market-conduct-examination-report"
FINANCIAL_URL = "https://portal.ct.gov/cid/department-resources/cid-reports/financial-examination-report"
IDENTITY_PATH = ROOT / "data" / "reports" / "ins-insurer-006-identity-index.json"
HEADERS = {"User-Agent": "InsuranceTrustHub/CT-INS-001 public-source snapshot"}


def get(url: str) -> bytes:
    response = requests.get(url, timeout=35, headers=HEADERS)
    response.raise_for_status()
    return response.content


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def parse_index(raw: bytes, source: str, kind: str) -> list[dict]:
    markup = raw.decode("utf-8", "replace")
    rows = []
    for tr in re.findall(r"<tr\b[^>]*>(.*?)</tr>", markup, re.I | re.S):
        cells = re.findall(r"<td\b[^>]*>(.*?)</td>", tr, re.I | re.S)
        if len(cells) != 4:
            continue
        values = [clean(html.unescape(re.sub(r"<[^>]+>", " ", cell))) for cell in cells]
        try:
            date = datetime.strptime(values[0], "%m/%d/%Y").date().isoformat()
        except ValueError:
            continue
        if not "2022-01-01" <= date <= "2026-09-28":
            continue
        link = re.search(r'href=["\']([^"\']+)', cells[3], re.I)
        rows.append({
            "reportDate" if kind == "financial" else "examClosedDate": date,
            "respondentAsIndexed" if kind == "market" else "companyAsIndexed": values[1],
            "dispositionAsIndexed" if kind == "market" else "examTypeAsIndexed": values[2],
            "sourceDocument": urljoin(source, html.unescape(link.group(1))) if link else None,
            "sourceIndex": source,
            "exactNaic": None,
            "exactNpn": None,
        })
    return rows


def main() -> None:
    retrieved = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    pdf = get(ROSTER_URL)
    with pdfplumber.open(BytesIO(pdf)) as document:
        cover = document.pages[0].extract_text() or ""
        as_of = re.search(r"As of (\w+ \d{1,2}, 2026)", cover)
        if not as_of:
            raise ValueError("CID roster as-of date not found")
        roster_date = datetime.strptime(as_of.group(1), "%B %d, %Y").date().isoformat()
        rows = []
        for page in document.pages:
            for table in page.extract_tables():
                for item in table:
                    if len(item) != 6 or clean(item[0]) == "COMPANY":
                        continue
                    name, domicile, state, company_type, naic, group = map(clean, item)
                    if not name or not company_type:
                        raise ValueError(f"Malformed CID roster row: {item}")
                    if naic and not re.fullmatch(r"\d{5}", naic):
                        raise ValueError(f"Unexpected NAIC code {naic}: {name}")
                    rows.append({"companyAsPrinted": name, "domicileType": domicile,
                                 "domicileState": state or None, "companyTypeAsPrinted": company_type,
                                 "naic": naic or None, "naicGroupNumber": group or None})
    identities = json.loads(IDENTITY_PATH.read_text(encoding="utf-8"))["insurers"]
    known = {row["naic_cocode"] for row in identities}
    exact_rows = sum(row["naic"] in known for row in rows if row["naic"])
    roster = {
        "source": ROSTER_URL, "sourceSha256": hashlib.sha256(pdf).hexdigest(),
        "asOf": roster_date, "retrievedAt": retrieved, "grain": "CID company-list row; licensed companies, approved/accredited reinsurers and surplus-lines insurers remain distinct by company type",
        "rowCount": len(rows), "distinctNaicCount": len({r["naic"] for r in rows if r["naic"]}),
        "rowsWithExactNaic": sum(bool(r["naic"]) for r in rows),
        "companyTypeCounts": dict(sorted(Counter(r["companyTypeAsPrinted"] for r in rows).items())),
        "exactNaicRowsAlreadyInCanonicalIndex": exact_rows,
        "distinctExactCanonicalNaics": len({r["naic"] for r in rows if r["naic"] in known}),
        "unmatchedExactNaicRows": sum(bool(r["naic"]) and r["naic"] not in known for r in rows),
        "rows": rows,
    }
    market_raw = get(MARKET_URL)
    market_rows = parse_index(market_raw, MARKET_URL, "market")
    market = {"source": MARKET_URL, "sourceSha256": hashlib.sha256(market_raw).hexdigest(),
              "retrievedAt": retrieved, "windowStart": "2022-01-01", "windowEnd": "2026-09-28",
              "grain": "CID market-conduct index row; Fined is an indexed disposition, not a producer license action or unique insurer",
              "rowCount": len(market_rows),
              "dispositionCounts": dict(sorted(Counter(r["dispositionAsIndexed"] for r in market_rows).items())),
              "rows": market_rows}
    # A small current-year PDF sample establishes the order grain without turning
    # this blitz into a multi-year document extraction project.
    orders = []
    for row in market_rows:
        if not row["examClosedDate"].startswith("2026") or row["dispositionAsIndexed"] != "Fined":
            continue
        document = get(row["sourceDocument"])
        reader = pypdf.PdfReader(BytesIO(document))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        docket = re.search(r"\bDOCKET\s+(MC\s*\d{2}\s*[-–•]\s*\d+)\b", text, re.I)
        consent = bool(re.search(r"STIPULATION\s+AND\s+CONSENT\s+ORDER", text, re.I))
        if not consent:
            continue
        docket_number = re.sub(r"\s+", " ", docket.group(1)).replace("•", "-").replace(" - ", "-") if docket else None
        naics = set(re.findall(r"\bNAIC\s*(?:COMPANY\s*(?:CODE|NUMBER)|CO(?:DE)?)?\s*[:#-]?\s*(\d{5})\b", text, re.I))
        npns = set(re.findall(r"\bNPN\s*[:#-]?\s*(\d{5,12})\b", text, re.I))
        orders.append({"respondentAsIndexed": row["respondentAsIndexed"],
                       "respondentGrain": "company or regulated entity; exact legal class not inferred from name",
                       "examClosedDate": row["examClosedDate"], "actionAsIndexed": "Fined",
                       "orderForm": "stipulation and consent order (PDF text)",
                       "docketNumber": docket_number,
                       "naicPrinted": sorted(naics), "npnPrinted": sorted(npns),
                       "sourceDocument": row["sourceDocument"],
                       "sourceSha256": hashlib.sha256(document).hexdigest()})
    enforcement = {"sourceIndex": MARKET_URL, "retrievedAt": retrieved,
                   "scope": "2026 Fined market-conduct index rows with PDF-confirmed stipulation and consent order; not all CID licensee actions",
                   "rowCount": len(orders), "rows": orders}
    financial_raw = get(FINANCIAL_URL)
    financial_rows = parse_index(financial_raw, FINANCIAL_URL, "financial")
    financial = {"source": FINANCIAL_URL, "sourceSha256": hashlib.sha256(financial_raw).hexdigest(),
                 "retrievedAt": retrieved, "grain": "CID financial-examination index row; as-of date is not publication date",
                 "rowCount": len(financial_rows), "rows": financial_rows}
    OUT.mkdir(exist_ok=True)
    for name, data in (("company-roster", roster), ("market-conduct", market), ("financial-exams", financial), ("consent-orders-2026", enforcement)):
        (OUT / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"companyRows": len(rows), "asOf": roster_date,
                      "naicRows": roster["rowsWithExactNaic"], "canonicalNaicRows": exact_rows,
                      "marketRows": len(market_rows), "marketDispositions": market["dispositionCounts"],
                      "financialRows": len(financial_rows), "pdfConfirmed2026Orders": len(orders)}, indent=2))


if __name__ == "__main__":
    main()
