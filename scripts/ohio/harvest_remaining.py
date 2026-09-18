"""Remaining mailing slices, financial/company APIs, surplus, certified reinsurers."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import xlrd

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/ohio/oh-ins-001"
RAW = OUT / "raw"
UA = "InsuranceTrustHub-OH-INS-001/1.0 (research; +https://www.insurancetrusthub.com)"
CTX = ssl.create_default_context()
BASE = "https://gateway.insurance.ohio.gov"
ALL_LOA = ["1", "2", "27", "3", "4", "9", "7", "39", "25", "38", "37", "36", "28", "16", "21", "22", "29", "31", "24", "15", "23", "20", "32", "13", "12", "11", "14", "26"]


def fetch(url: str, data: bytes | None = None, extra: dict | None = None, timeout: int = 180) -> tuple[int, dict, bytes]:
    h = {"User-Agent": UA, "Accept": "*/*"}
    if extra:
        h.update(extra)
    req = urllib.request.Request(url, data=data, headers=h, method="POST" if data else "GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), e.read() or b""
    except Exception as e:
        return 0, {"error": str(e)}, b""


def census_csv(body: bytes) -> dict:
    text = body.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    npns = [(r.get("NATIONALPROVIDERNUMBER") or "").strip() for r in rows]
    present = [n for n in npns if n]
    return {
        "rows": len(rows),
        "distinct_npn": len(set(present)),
        "missing_npn": sum(1 for n in npns if not n),
        "fields": reader.fieldnames,
        "bytes": len(body),
        "sha256": hashlib.sha256(body).hexdigest(),
        "sample": rows[:1],
    }


def mail(entity: str, residence: str, license_ids: list[str], loa_ids: list[str], dest: Path) -> dict:
    pairs = [
        ("searchParameters.SelectedEntityTypeName", entity),
        ("searchParameters.SelectedResidenceTypeId", residence),
    ]
    for lid in license_ids:
        pairs.append(("searchParameters.SelectedLicenseTypeIds", lid))
    for loa in loa_ids:
        pairs.append(("searchParameters.SelectedLineOfAuthorityIds", loa))
    status, headers, body = fetch(
        f"{BASE}/UI/ODI.Agent.Public.UI/MailingList.mvc/ProcessAllCompanyFilter",
        data=urllib.parse.urlencode(pairs).encode(),
        extra={
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{BASE}/UI/ODI.Agent.Public.UI/MailingList.mvc",
            "Origin": BASE,
        },
    )
    rec: dict = {"entity": entity, "residence": residence, "license": license_ids, "loa": loa_ids, "status": status}
    try:
        obj = json.loads(body.decode("utf-8", "replace"))
        rec["redirection"] = obj.get("RedirectionUrl")
        rec["valid"] = obj.get("IsModelStateValid")
    except json.JSONDecodeError:
        rec["preview"] = body[:200].decode("utf-8", "replace")
        return rec
    if rec.get("redirection"):
        url = rec["redirection"] if rec["redirection"].startswith("http") else BASE + rec["redirection"]
        rstatus, rheaders, rbody = fetch(url)
        dest.write_bytes(rbody)
        rec["file_status"] = rstatus
        rec["file_bytes"] = len(rbody)
        rec["census"] = census_csv(rbody)
        rec["saved"] = dest.name
    return rec


def main() -> None:
    jobs = []
    # Non-resident Life / A&H for SQA-009 source-native LOA universes
    jobs.append(mail("Business Entity", "2", ["2"], ["7"], RAW / "mail-be-nr-life.csv"))
    jobs.append(mail("Business Entity", "2", ["2"], ["1"], RAW / "mail-be-nr-ah.csv"))
    # Individual capability probe: Resident Major Lines Life only (bounded, not all individuals)
    jobs.append(mail("Individual", "1", ["2"], ["7"], RAW / "mail-ind-res-life.csv"))

    probes = {}
    # Company search GET by empty vs NAIC fixture from AuthList sample 10399
    for label, qs in [
        ("company_naic_10399", "NaicId=10399"),
        ("company_name_state", "CompanyName=STATE%20AUTO"),
        ("fr_get_empty", ""),
        ("fr_get_year", "Year=2025"),
        ("fr_get_naic", "NaicId=10399"),
        ("fr_get_year_naic", "Year=2025&NaicId=10399"),
    ]:
        path = "/UI/ODI.Risk.Public.UI/api/Company/Search" if label.startswith("company") else "/UI/ODI.Risk.Public.UI/api/FrStatement/Search"
        status, headers, body = fetch(BASE + path + ("?" + qs if qs else ""), extra={"Accept": "application/json"})
        probes[label] = {
            "status": status,
            "bytes": len(body),
            "type": headers.get("Content-Type"),
            "preview": body[:500].decode("utf-8", "replace"),
        }
        print(label, status, len(body), probes[label]["preview"][:120].replace("\n", " "))

    # Certified reinsurers XLS parse
    xls = RAW / "certified_xls"
    cert = {}
    if xls.exists():
        book = xlrd.open_workbook(xls)
        sh = book.sheet_by_index(0)
        headers = [str(sh.cell_value(0, c)).strip() for c in range(sh.ncols)]
        rows = []
        for r in range(1, sh.nrows):
            vals = [str(sh.cell_value(r, c)).strip() for c in range(sh.ncols)]
            if any(vals):
                rows.append(dict(zip(headers, vals)))
        cert = {"headers": headers, "rows": len(rows), "sample": rows[:2], "filename": "CertifiedReinsurersXLS091820261209.xls"}
        print("certified reinsurers", cert["headers"], cert["rows"])

    # Portal pages that 404'd via wps — try current public paths
    pages = {}
    for key, url in {
        "home": "https://insurance.ohio.gov/",
        "companies": "https://insurance.ohio.gov/companies",
        "agents": "https://insurance.ohio.gov/agents-and-agencies",
        "consumers": "https://insurance.ohio.gov/consumers",
        "surplus": "https://insurance.ohio.gov/companies/surplus-lines",
        "receivership": "https://insurance.ohio.gov/companies/receiverships",
        "liq": "https://insurance.ohio.gov/wps/portal/gov/odi/companies/liquidation",
        "complaints": "https://insurance.ohio.gov/consumers/file-a-complaint",
        "exams": "https://insurance.ohio.gov/companies/financial-regulation",
        "market": "https://insurance.ohio.gov/companies/market-conduct",
        "financial_data": "https://insurance.ohio.gov/companies/financial-data",
        "annual_financial": "https://gateway.insurance.ohio.gov/UI/ODI.Risk.Public.UI/FrStatement",
        "fr_ui": "https://gateway.insurance.ohio.gov/UI/ODI.Risk.Public.UI/Financial",
    }.items():
        status, headers, body = fetch(url, timeout=45)
        title = None
        try:
            import re
            m = re.search(r"<title[^>]*>([^<]+)", body.decode("utf-8", "replace"), re.I)
            title = m.group(1).strip() if m else None
        except Exception:
            pass
        pages[key] = {"url": url, "status": status, "bytes": len(body), "title": title, "type": headers.get("Content-Type")}
        print("page", key, status, title, len(body))

    out = {
        "retrievedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mails": jobs,
        "probes": probes,
        "certified_reinsurers": cert,
        "pages": pages,
    }
    (OUT / "remaining-probes.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    for j in jobs:
        c = (j.get("census") or {})
        print("MAIL", j.get("saved"), c.get("rows"), c.get("distinct_npn"))


if __name__ == "__main__":
    main()
