"""OH-INS-001 bounded probes: mailing-list POST, journal, locator, financials, surplus."""
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

URLS = {
    "company_search": "https://gateway.insurance.ohio.gov/UI/ODI.Risk.Public.UI/",
    "auth_org_list": "https://gateway.insurance.ohio.gov/UI/ODI.Risk.Public.UI/Reports/ViewReport?reportName=AuthOrgList",
    "agent_locator": "https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/AgentSearch.mvc/DisplaySearch",
    "mailing_list": "https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/MailingList.mvc",
    "mailing_filter": "https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/MailingList.mvc/ProcessAllCompanyFilter",
    "journal": "https://gateway.insurance.ohio.gov/UI/ODI.AdministrativeAction.Public.UI/",
    "journal_legacy": "https://legacy.insurance.ohio.gov/JournalSearch/JournalSearchYearly.aspx",
    "companies": "https://insurance.ohio.gov/wps/portal/gov/odi/companies",
    "agents": "https://insurance.ohio.gov/wps/portal/gov/odi/agent-and-agencies",
    "consumers": "https://insurance.ohio.gov/wps/portal/gov/odi/consumers",
    "surplus": "https://insurance.ohio.gov/wps/portal/gov/odi/companies/surplus-lines",
    "receivership": "https://insurance.ohio.gov/wps/portal/gov/odi/companies/receiverships",
    "market_conduct": "https://insurance.ohio.gov/wps/portal/gov/odi/companies/market-conduct",
    "financial_exam": "https://insurance.ohio.gov/wps/portal/gov/odi/companies/financial-examinations",
    "complaints": "https://insurance.ohio.gov/wps/portal/gov/odi/consumers/file-a-complaint",
    "reports": "https://insurance.ohio.gov/about-us/reports",
}


def fetch(url: str, data: bytes | None = None, timeout: int = 90, headers: dict | None = None) -> tuple[int, dict, bytes]:
    h = {"User-Agent": UA, "Accept": "*/*"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method="POST" if data else "GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), e.read() or b""
    except Exception as e:
        return 0, {"error": str(e)}, b""


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    retrieved = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    probes: dict = {"retrievedAt": retrieved, "pages": {}}

    for key, url in URLS.items():
        if key == "mailing_filter":
            continue
        status, headers, body = fetch(url, timeout=60)
        probes["pages"][key] = {
            "url": url,
            "status": status,
            "content_type": headers.get("Content-Type") or headers.get("content-type"),
            "bytes": len(body),
            "disposition": headers.get("Content-Disposition") or headers.get("content-disposition"),
            "error": headers.get("error"),
            "title": (re.search(r"<title[^>]*>([^<]+)", body.decode("utf-8", "replace"), re.I) or [None, None])[1],
        }
        snippet = RAW / f"probe-{key}.bin"
        snippet.write_bytes(body[:2_000_000])
        print(f"{key:16} {status} {len(body):8} {probes['pages'][key].get('title') or probes['pages'][key].get('content_type')}")

    journal = (RAW / "probe-journal.bin").read_bytes().decode("utf-8", "replace")
    api = sorted(set(re.findall(r'["\'](/[^"\']*(?:Search|Journal|Action)[^"\']*)["\']', journal, re.I)))
    src = sorted(set(re.findall(r'src=["\']([^"\']+)["\']', journal, re.I)))
    href = sorted(set(re.findall(r'href=["\']([^"\']+\.js[^"\']*)["\']', journal, re.I)))
    probes["journal_signals"] = {
        "incompleteness_warning": "may not be comprehensive" in journal.lower(),
        "ce_excluded": "continuing education" in journal.lower() or "ce) noncompliance" in journal.lower(),
        "view_cutoff": "April 24, 2026" in journal,
        "api_like": api[:40],
        "scripts": (src + href)[:40],
        "doc_types": re.findall(r'>(Bulletin|Notice|Order|Other|Rule|All)<', journal),
    }

    locator = (RAW / "probe-agent_locator.bin").read_bytes().decode("utf-8", "replace")
    probes["locator_signals"] = {
        "requires_last_name_or_npn": bool(re.search(r"Last Name|NPN", locator, re.I)),
        "has_search_form": "form" in locator.lower(),
        "fields": re.findall(r'name="([^"]+)"', locator)[:40],
        "title": (re.search(r"<title[^>]*>([^<]+)", locator, re.I) or [None, None])[1],
    }

    company = (RAW / "probe-company_search.bin").read_bytes().decode("utf-8", "replace")
    probes["company_search_signals"] = {
        "auth_list": "AuthList" in company,
        "auth_org": "AuthOrgList" in company,
        "financial": bool(re.search(r"Financial", company, re.I)),
        "report_uris": sorted(set(re.findall(r'(?:Report|Uri|URL)[^"\']{0,40}["\']([^"\']+)["\']', company)))[:40],
        "scripts": re.findall(r'src=["\']([^"\']+)["\']', company)[:30],
    }

    # Mailing-list all-company POST: Business Entity + Major Lines, per residence.
    # Official generator; not name brute-force. Residence is a required single-select.
    residences = [("1", "Resident"), ("2", "Non-Resident"), ("3", "Certified")]
    mail_results = []
    for rid, rname in residences:
        payload = urllib.parse.urlencode(
            [
                ("searchParameters.SelectedEntityTypeName", "Business Entity"),
                ("searchParameters.SelectedResidenceTypeId", rid),
                ("searchParameters.SelectedLicenseTypeIds", "2"),  # Major Lines
            ]
        ).encode()
        status, headers, body = fetch(
            URLS["mailing_filter"],
            data=payload,
            timeout=180,
            headers={
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": URLS["mailing_list"],
                "Origin": "https://gateway.insurance.ohio.gov",
            },
        )
        rec = {
            "residence": rname,
            "residence_id": rid,
            "status": status,
            "content_type": headers.get("Content-Type") or headers.get("content-type"),
            "bytes": len(body),
            "disposition": headers.get("Content-Disposition") or headers.get("content-disposition"),
            "error": headers.get("error"),
        }
        text = body.decode("utf-8", "replace")
        rec["json_keys"] = None
        rec["redirection"] = None
        rec["preview"] = text[:400]
        try:
            obj = json.loads(text)
            rec["json_keys"] = list(obj.keys()) if isinstance(obj, dict) else type(obj).__name__
            rec["redirection"] = obj.get("RedirectionUrl") if isinstance(obj, dict) else None
            rec["is_valid"] = obj.get("IsModelStateValid") if isinstance(obj, dict) else None
            rec["is_redirection"] = obj.get("IsRedirection") if isinstance(obj, dict) else None
        except json.JSONDecodeError:
            pass
        (RAW / f"mailing-be-major-{rname.lower()}.bin").write_bytes(body[:2_000_000])
        mail_results.append(rec)
        print("mail", rname, status, rec.get("redirection") or rec.get("content_type"), rec["bytes"])

        if rec.get("redirection"):
            rstatus, rheaders, rbody = fetch(rec["redirection"], timeout=180)
            dest = RAW / f"mailing-be-major-{rname.lower()}-file.bin"
            dest.write_bytes(rbody)
            rec["file_status"] = rstatus
            rec["file_bytes"] = len(rbody)
            rec["file_type"] = rheaders.get("Content-Type") or rheaders.get("content-type")
            rec["file_disp"] = rheaders.get("Content-Disposition") or rheaders.get("content-disposition")
            print("  file", rstatus, rec["file_bytes"], rec["file_type"], rec["file_disp"])

    probes["mailing_posts"] = mail_results
    (OUT / "source-probes.json").write_text(json.dumps(probes, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT / "source-probes.json")


if __name__ == "__main__":
    main()
