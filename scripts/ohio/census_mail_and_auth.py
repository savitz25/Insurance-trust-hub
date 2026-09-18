"""Census AuthList types and mailing-list CSVs. Fetch remaining residences."""
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


def census_csv(path: Path) -> dict:
    text = path.read_bytes().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    fields = reader.fieldnames or []
    npns = []
    missing = 0
    for row in rows:
        npn = (row.get("NATIONALPROVIDERNUMBER") or "").strip()
        if not npn:
            missing += 1
        else:
            npns.append(npn)
    return {
        "file": path.name,
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "fields": fields,
        "OH_AGENCY_MAILING_ROWS": len(rows),
        "OH_AGENCY_DISTINCT_NPN": len(set(npns)),
        "OH_AGENCY_ROWS_MISSING_NPN": missing,
        "sample": rows[:2],
    }


def post_mail(residence: str, loa_ids: list[str], dest: Path) -> dict:
    pairs = [
        ("searchParameters.SelectedEntityTypeName", "Business Entity"),
        ("searchParameters.SelectedResidenceTypeId", residence),
        ("searchParameters.SelectedLicenseTypeIds", "2"),
    ]
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
    rec: dict = {"residence": residence, "status": status, "bytes": len(body)}
    try:
        obj = json.loads(body.decode("utf-8", "replace"))
        rec["is_valid"] = obj.get("IsModelStateValid")
        rec["redirection"] = obj.get("RedirectionUrl")
    except json.JSONDecodeError:
        rec["preview"] = body[:200].decode("utf-8", "replace")
        return rec
    if rec.get("redirection"):
        url = rec["redirection"] if rec["redirection"].startswith("http") else BASE + rec["redirection"]
        rstatus, rheaders, rbody = fetch(url)
        dest.write_bytes(rbody)
        rec["file_status"] = rstatus
        rec["file_bytes"] = len(rbody)
        rec["file_disp"] = rheaders.get("Content-Disposition")
        rec["saved"] = dest.name
    return rec


def main() -> None:
    # AuthList types
    xls = next(RAW.glob("AuthList*.xls"))
    book = xlrd.open_workbook(xls)
    sh = book.sheet_by_index(0)
    headers = [str(sh.cell_value(0, c)).strip() for c in range(sh.ncols)]
    i_type = headers.index("Type")
    i_naic = headers.index("NAIC #")
    i_dom = headers.index("Domicile")
    types = Counter()
    domestic_types = Counter()
    naics = []
    for r in range(1, sh.nrows):
        typ = str(sh.cell_value(r, i_type)).strip()
        types[typ] += 1
        raw_naic = sh.cell_value(r, i_naic)
        naic = str(int(raw_naic)).zfill(5) if isinstance(raw_naic, float) else str(raw_naic).strip()
        naics.append(naic)
        dom = str(sh.cell_value(r, i_dom)).strip().upper()
        if dom in {"OH", "OHIO"}:
            domestic_types[typ] += 1
    auth = {
        "types": dict(types.most_common()),
        "domestic_types": dict(domestic_types.most_common()),
        "rows": sh.nrows - 1,
        "distinct_naic": len(set(naics)),
        "sourceAsOf_filename": xls.name,
    }
    print("AUTH types", auth["types"])

    # Existing mailing CSVs
    mail = {}
    for p in sorted(RAW.glob("mail-Bu-*.bin")):
        mail[p.name] = census_csv(p)
        print("MAIL", p.name, mail[p.name]["OH_AGENCY_MAILING_ROWS"], mail[p.name]["OH_AGENCY_DISTINCT_NPN"])

    extra = []
    for rid, name in [("2", "nonresident"), ("3", "certified")]:
        dest = RAW / f"mail-be-major-all-{name}.csv"
        rec = post_mail(rid, ALL_LOA, dest)
        extra.append(rec)
        print("FETCH", name, rec)
        if dest.exists() and dest.stat().st_size > 100:
            mail[dest.name] = census_csv(dest)
            print("MAIL", dest.name, mail[dest.name]["OH_AGENCY_MAILING_ROWS"], mail[dest.name]["OH_AGENCY_DISTINCT_NPN"])

    # Also fetch Life/AH for nonresident if ALL succeeded — skip; ALL is the roster union.

    out = {
        "retrievedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "auth": auth,
        "mail": mail,
        "extra_fetches": extra,
    }
    (OUT / "agency-mail-census.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print("wrote agency-mail-census.json")


if __name__ == "__main__":
    main()
