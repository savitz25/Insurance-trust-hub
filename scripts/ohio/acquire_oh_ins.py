"""OH-INS-001 acquire ODI authorized-company Excel and probe mailing/journal."""
from __future__ import annotations

import hashlib
import json
import re
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/ohio/oh-ins-001"
RAW = OUT / "raw"
UA = "InsuranceTrustHub-OH-INS-001/1.0 (research; +https://www.insurancetrusthub.com)"
AUTH = "https://gateway.insurance.ohio.gov/UI/ODI.Risk.Public.UI/Reports/ViewReport?reportName=AuthList"
MAIL = "https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/MailingList.mvc"


def get(url: str) -> tuple[bytes, dict]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read(), dict(resp.headers)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    retrieved = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    body, headers = get(AUTH)
    xls = RAW / "AuthList09182026.xls"
    xls.write_bytes(body)
    import xlrd

    book = xlrd.open_workbook(xls)
    sh = book.sheet_by_index(0)
    header_row = None
    headers_cells: list[str] = []
    for r in range(min(20, sh.nrows)):
        vals = [str(sh.cell_value(r, c)).strip() for c in range(sh.ncols)]
        joined = " ".join(vals).lower()
        if "naic" in joined or "company" in joined and "domicil" in joined:
            header_row = r
            headers_cells = vals
            break
    if header_row is None:
        raise SystemExit(f"no header {[[str(sh.cell_value(r,c)) for c in range(min(8,sh.ncols))] for r in range(min(8,sh.nrows))]}")

    def col(*names: str) -> int | None:
        for i, h in enumerate(headers_cells):
            hl = h.lower()
            if any(n.lower() in hl for n in names):
                return i
        return None

    i_name = col("company name", "name")
    i_naic = col("naic")
    i_dom = col("domicil", "state")
    i_type = col("class", "type", "authority")
    rows = []
    naics: list[str] = []
    missing = 0
    for r in range(header_row + 1, sh.nrows):
        name = str(sh.cell_value(r, i_name or 0)).strip() if i_name is not None else ""
        raw_naic = sh.cell_value(r, i_naic) if i_naic is not None else ""
        if isinstance(raw_naic, float):
            naic = str(int(raw_naic)) if raw_naic == int(raw_naic) else str(raw_naic)
        else:
            naic = "".join(ch for ch in str(raw_naic) if ch.isdigit())
        if not name and not naic:
            continue
        if not naic:
            missing += 1
        else:
            naics.append(naic.zfill(5) if naic.isdigit() and len(naic) <= 5 else naic)
        dom = str(sh.cell_value(r, i_dom)).strip() if i_dom is not None else ""
        typ = str(sh.cell_value(r, i_type)).strip() if i_type is not None else ""
        rows.append({"name": name, "naic": naic or None, "domicile": dom, "type": typ})

    distinct = set(naics)
    dup = sum(1 for n, c in Counter(naics).items() if c > 1)
    domestic = [row for row in rows if (row.get("domicile") or "").upper() in {"OH", "OHIO"}]
    domestic_naic = {row["naic"].zfill(5) if row["naic"] and row["naic"].isdigit() else row["naic"] for row in domestic if row.get("naic")}

    mail_html, _ = get(MAIL)
    (RAW / "mailing-list.html").write_bytes(mail_html)
    mail_text = mail_html.decode("utf-8", "replace")
    loa = re.findall(r"<option[^>]*>([^<]+)</option>", mail_text, re.I)
    summary = {
        "retrievedAt": retrieved,
        "authList": {
            "url": AUTH,
            "filename": headers.get("Content-Disposition") or xls.name,
            "bytes": len(body),
            "sha256": hashlib.sha256(body).hexdigest(),
            "sheet": book.sheet_names()[0],
            "header_row": header_row,
            "headers": headers_cells,
            "OH_AUTHORIZED_COMPANY_ROWS": len(rows),
            "OH_AUTHORIZED_DISTINCT_NAIC_CODES": len(distinct),
            "OH_AUTHORIZED_ROWS_MISSING_NAIC": missing,
            "OH_AUTHORIZED_DUPLICATE_NAIC_ROWS": dup,
            "OH_DOMESTIC_COMPANY_ROWS": len(domestic),
            "OH_DOMESTIC_DISTINCT_NAIC_CODES": len(domestic_naic),
            "sample": rows[:5],
        },
        "mailingList": {
            "url": MAIL,
            "has_all_company": "allCompanySearchWrapper" in mail_text,
            "has_loa": "Line of Authority" in mail_text,
            "options": [re.sub(r"\s+", " ", o).strip() for o in loa],
            "company_name_required_for_single": "Company Name is required" in mail_text,
        },
    }
    (OUT / "authorized-summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    (OUT / "authorized-naics.json").write_text(json.dumps({"naics": sorted(distinct)}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary["authList"] | {"loa_options": len(loa)}, indent=2))


if __name__ == "__main__":
    main()
