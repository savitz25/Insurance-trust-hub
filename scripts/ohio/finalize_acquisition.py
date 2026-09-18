"""Finalize acquisition: journal recensus, NPN unions, financial report-name probes."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import ssl
import urllib.error
import urllib.request
from collections import Counter
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/ohio/oh-ins-001"
RAW = OUT / "raw"
JDIR = RAW / "journal"
UA = "InsuranceTrustHub-OH-INS-001/1.0 (research; +https://www.insurancetrusthub.com)"
CTX = ssl.create_default_context()


def npns_from(path: Path) -> set[str]:
    text = path.read_bytes().decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(text)))
    return {(r.get("NATIONALPROVIDERNUMBER") or "").strip() for r in rows if (r.get("NATIONALPROVIDERNUMBER") or "").strip()}


def recensus_journal() -> dict:
    rows = []
    for html_path in sorted(JDIR.glob("*.html")):
        if "type" in html_path.name:
            continue
        html = html_path.read_text(encoding="utf-8")
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.I | re.S):
            tds = [unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", td))).strip() for td in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.I | re.S)]
            if len(tds) < 7:
                continue
            # Action, First, Last, Company, Date, Type, Org ID
            doc = None
            m = re.search(r'data-document-id=["\']([^"\']+)["\']', tr, re.I)
            if m:
                doc = m.group(1)
            rows.append({
                "document_id": doc,
                "first": tds[1],
                "last": tds[2],
                "company": tds[3],
                "execute_date": tds[4],
                "document_type": tds[5],
                "org_id": tds[6],
            })
    types = Counter(r["document_type"] for r in rows)
    person_only = [r for r in rows if (r["first"] or r["last"]) and not r["company"]]
    company_only = [r for r in rows if r["company"] and not (r["first"] or r["last"])]
    both = [r for r in rows if (r["first"] or r["last"]) and r["company"]]
    neither = [r for r in rows if not (r["first"] or r["last"] or r["company"])]
    exact_id = [r for r in rows if r["org_id"]]
    return {
        "OH_ODI_JOURNAL_STATUS": "BOUNDED_METADATA_CATALOG_INCOMPLETE_RETRIEVAL_WARNED",
        "window": "2025-10-01 through 2026-09-18",
        "OH_ODI_ADMIN_ACTION_ROWS": len(rows),
        "OH_ODI_ADMIN_ACTION_DISTINCT_DOCUMENT_IDS": len({r["document_id"] for r in rows if r["document_id"]}),
        "OH_ODI_ADMIN_ACTION_UNIQUE_MATTERS": None,
        "OH_ODI_AGENT_ACTION_ROWS": len(person_only),
        "OH_ODI_AGENCY_ACTION_ROWS": None,
        "OH_ODI_COMPANY_ACTION_ROWS": None,
        "OH_ODI_PERSON_NAME_ONLY_ROWS": len(person_only),
        "OH_ODI_COMPANY_NAME_ONLY_ROWS": len(company_only),
        "OH_ODI_PERSON_AND_COMPANY_NAME_ROWS": len(both),
        "OH_ODI_UNNAMED_ROWS": len(neither),
        "OH_ODI_OTHER_ACTION_ROWS": len(neither),
        "OH_ODI_EXACT_ID_ROWS": len(exact_id),
        "OH_ODI_EXACT_PROFILE_ATTACHMENTS": 0,
        "document_type_counts": dict(types.most_common()),
        "agency_vs_company_unsplit": "Journal Company Name is not a source-native agency vs legal-insurer class. Those grains stay unsplit.",
        "sample": rows[:3],
    }


def main() -> None:
    journal = recensus_journal()
    print("JOURNAL", {k: journal[k] for k in journal if k.startswith("OH_") or k == "document_type_counts"})

    res_all = npns_from(RAW / "mail-Bu-r1-loa1-2-27-3.bin")
    nr_all = npns_from(RAW / "mail-be-major-all-nonresident.csv")
    res_life = npns_from(RAW / "mail-Bu-r1-loa7.bin")
    nr_life = npns_from(RAW / "mail-be-nr-life.csv")
    res_ah = npns_from(RAW / "mail-Bu-r1-loa1.bin")
    nr_ah = npns_from(RAW / "mail-be-nr-ah.csv")
    res_prop = npns_from(RAW / "mail-Bu-r1-loa16.bin")
    res_cas = npns_from(RAW / "mail-Bu-r1-loa27.bin")
    res_pers = npns_from(RAW / "mail-Bu-r1-loa28.bin")
    ind_life = npns_from(RAW / "mail-ind-res-life.csv")

    unions = {
        "major_lines_be_resident_npn": len(res_all),
        "major_lines_be_nonresident_npn": len(nr_all),
        "major_lines_be_union_npn": len(res_all | nr_all),
        "major_lines_be_overlap_npn": len(res_all & nr_all),
        "life_be_resident_npn": len(res_life),
        "life_be_nonresident_npn": len(nr_life),
        "life_be_union_npn": len(res_life | nr_life),
        "ah_be_resident_npn": len(res_ah),
        "ah_be_nonresident_npn": len(nr_ah),
        "ah_be_union_npn": len(res_ah | nr_ah),
        "property_be_resident_npn": len(res_prop),
        "casualty_be_resident_npn": len(res_cas),
        "personal_be_resident_npn": len(res_pers),
        "individual_resident_major_lines_life_npn": len(ind_life),
        "note": "Residence filters are source-native. Union is reported separately from each filter. Do not add agency+agent.",
    }
    print("UNIONS", unions)

    reports = {}
    for name in [
        "AnnualFinancial",
        "AnnualFinancialData",
        "FinancialData",
        "FinData",
        "AnnualStatement",
        "Financial",
        "AuthList",
        "CertifiedReinsurersXLS",
    ]:
        url = f"https://gateway.insurance.ohio.gov/UI/ODI.Risk.Public.UI/Reports/ViewReport?reportName={name}"
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=45, context=CTX) as resp:
                body = resp.read(200)
                reports[name] = {"status": resp.status, "type": resp.headers.get("Content-Type"), "disp": resp.headers.get("Content-Disposition"), "head": body[:40].decode("latin-1", "replace")}
        except urllib.error.HTTPError as e:
            reports[name] = {"status": e.code, "type": e.headers.get("Content-Type") if e.headers else None}
        except Exception as e:
            reports[name] = {"error": str(e)}
        print("REPORT", name, reports[name])

    out = {"journal": journal, "unions": unions, "financial_report_names": reports}
    (OUT / "final-acquisition.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
