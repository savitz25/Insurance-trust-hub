"""Follow-up: mailing-list with LOA, JS APIs, financial/journal endpoints."""
from __future__ import annotations

import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/ohio/oh-ins-001"
RAW = OUT / "raw"
UA = "InsuranceTrustHub-OH-INS-001/1.0 (research; +https://www.insurancetrusthub.com)"
CTX = ssl.create_default_context()
BASE = "https://gateway.insurance.ohio.gov"

LOAS = [
    ("1", "AccidentAndHealth"),
    ("7", "Life"),
    ("16", "Property"),
    ("27", "Casualty"),
    ("28", "Personal"),
]
ALL_LOA = ["1", "2", "27", "3", "4", "9", "7", "39", "25", "38", "37", "36", "28", "16", "21", "22", "29", "31", "24", "15", "23", "20", "32", "13", "12", "11", "14", "26"]


def fetch(url: str, data: bytes | None = None, timeout: int = 180, extra: dict | None = None) -> tuple[int, dict, bytes]:
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


def post_mail(entity: str, residence: str, license_ids: list[str], loa_ids: list[str]) -> dict:
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
    rec: dict = {
        "entity": entity,
        "residence": residence,
        "license_ids": license_ids,
        "loa_ids": loa_ids,
        "status": status,
        "bytes": len(body),
        "content_type": headers.get("Content-Type") or headers.get("content-type"),
        "error": headers.get("error"),
    }
    text = body.decode("utf-8", "replace")
    try:
        obj = json.loads(text)
        rec["is_valid"] = obj.get("IsModelStateValid")
        rec["is_redirection"] = obj.get("IsRedirection")
        rec["redirection"] = obj.get("RedirectionUrl")
        content = obj.get("Content") or ""
        m = re.search(r"<li>([^<]+)</li>", content)
        rec["validation"] = m.group(1) if m else None
    except json.JSONDecodeError:
        rec["preview"] = text[:300]
    if rec.get("redirection"):
        rstatus, rheaders, rbody = fetch(rec["redirection"] if rec["redirection"].startswith("http") else BASE + rec["redirection"])
        rec["file_status"] = rstatus
        rec["file_bytes"] = len(rbody)
        rec["file_type"] = rheaders.get("Content-Type") or rheaders.get("content-type")
        rec["file_disp"] = rheaders.get("Content-Disposition") or rheaders.get("content-disposition")
        slug = f"{entity[:2]}-r{residence}-loa{'-'.join(loa_ids[:4])}"
        (RAW / f"mail-{slug}.bin").write_bytes(rbody)
        rec["saved"] = f"mail-{slug}.bin"
    return rec


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    out: dict = {"retrievedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}

    js_urls = {
        "company_search_js": f"{BASE}/UI/ODI.Risk.Public.UI/Scripts/Company/CompanySearch.js",
        "dashboard_js": f"{BASE}/UI/ODI.AdministrativeAction.Public.UI/PageJS/Dashboard.js",
        "common_js": f"{BASE}/UI/ODI.AdministrativeAction.Public.UI/PageJS/common.js",
        "certified_xls": f"{BASE}/UI/ODI.Risk.Public.UI/Reports/ViewReport?reportName=CertifiedReinsurersXLS",
        "certified_pdf": f"{BASE}/UI/ODI.Risk.Public.UI/Reports/ViewReport?reportName=CertifiedReinsurersPDF",
    }
    js_meta = {}
    for k, url in js_urls.items():
        status, headers, body = fetch(url)
        (RAW / f"{k}").write_bytes(body)
        js_meta[k] = {
            "url": url,
            "status": status,
            "bytes": len(body),
            "type": headers.get("Content-Type") or headers.get("content-type"),
            "disp": headers.get("Content-Disposition") or headers.get("content-disposition"),
        }
        print(k, status, len(body), js_meta[k]["type"], js_meta[k]["disp"])
    out["downloads"] = js_meta

    company_js = (RAW / "company_search_js").read_bytes().decode("utf-8", "replace")
    dash = (RAW / "dashboard_js").read_bytes().decode("utf-8", "replace")
    out["company_js_reports"] = sorted(set(re.findall(r'reportName=([A-Za-z0-9_]+)', company_js)))
    out["company_js_api"] = sorted(set(re.findall(r'["\'](/UI/[^"\']+)["\']', company_js)))
    out["dashboard_api"] = sorted(set(re.findall(r'["\'](/UI/[^"\']+)["\']', dash)))
    out["dashboard_has_captcha"] = "captcha" in dash.lower()

    # FrStatement search: empty-ish payload to see contract
    for label, url, payload in [
        ("fr_empty", f"{BASE}/UI/ODI.Risk.Public.UI/api/FrStatement/Search", b"{}"),
        ("company_empty", f"{BASE}/UI/ODI.Risk.Public.UI/api/Company/Search", b"{}"),
        ("reinsurer_empty", f"{BASE}/UI/ODI.Risk.Public.UI/api/Reinsurer/Search", b"{}"),
    ]:
        status, headers, body = fetch(
            url,
            data=payload,
            extra={"Content-Type": "application/json", "Accept": "application/json"},
        )
        text = body.decode("utf-8", "replace")
        rec = {"status": status, "bytes": len(body), "preview": text[:800], "type": headers.get("Content-Type")}
        try:
            obj = json.loads(text)
            rec["json_type"] = type(obj).__name__
            if isinstance(obj, dict):
                rec["keys"] = list(obj.keys())[:30]
            elif isinstance(obj, list):
                rec["n"] = len(obj)
                rec["item_keys"] = list(obj[0].keys()) if obj and isinstance(obj[0], dict) else None
        except json.JSONDecodeError:
            pass
        out[label] = rec
        (RAW / f"{label}.json").write_bytes(body[:2_000_000])
        print(label, status, rec.get("n") or rec.get("keys") or rec["bytes"])

    # Journal dashboard search — inspect JS for method first; try a year/month if obvious
    journal_posts = []
    for path in [
        "/UI/ODI.AdministrativeAction.Public.UI/Home/Dashboard",
        "/UI/ODI.AdministrativeAction.Public.UI/Home/Search",
        "/UI/ODI.AdministrativeAction.Public.UI/api/Search",
    ]:
        status, headers, body = fetch(BASE + path)
        journal_posts.append({"path": path, "status": status, "bytes": len(body), "type": headers.get("Content-Type")})
        print("journal", path, status, len(body))
    out["journal_gets"] = journal_posts

    mails = []
    # Bounded: Resident Business Entity Major Lines + each core LOA
    for loa_id, loa_name in LOAS:
        rec = post_mail("Business Entity", "1", ["2"], [loa_id])
        rec["loa_name"] = loa_name
        mails.append(rec)
        print("mail", loa_name, rec.get("is_valid"), rec.get("redirection"), rec.get("file_bytes"), rec.get("validation"))

    # Complete BE Major Lines all LOA Resident — only if single-LOA succeeded
    if any(m.get("is_redirection") for m in mails):
        rec = post_mail("Business Entity", "1", ["2"], ALL_LOA)
        rec["loa_name"] = "ALL"
        mails.append(rec)
        print("mail ALL", rec.get("is_valid"), rec.get("redirection"), rec.get("file_bytes"), rec.get("validation"))

    out["mails"] = mails
    (OUT / "followup-probes.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print("wrote followup-probes.json")


if __name__ == "__main__":
    main()
