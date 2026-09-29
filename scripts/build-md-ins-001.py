"""Freeze bounded public MIA company and producer-enforcement evidence."""
import io
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "lib/maryland-intelligence"
BASE = "https://www.apps.insurance.maryland.gov/CompanyProducerInfo/"
PDF = "https://insurance.maryland.gov/Documents/orders/Producer-Enforcement-Summary-{}.pdf"


def clean(value):
    return " ".join((value or "").split())


def query(path, searchtype):
    payload = {"search": "Y", "searchtype": searchtype, "compname": "", "streetaddress": "", "status": "", "phonenumber": "", "zipcode": "", "naic": ""}
    response = requests.post(BASE + path, json=payload, timeout=60)
    response.raise_for_status()
    return json.loads(response.json()["d"])


def main():
    OUT.mkdir(exist_ok=True)
    retrieved = datetime.now(timezone.utc).isoformat(timespec="seconds")
    raw = query("InsCompanySearch.aspx/GetRecords", "C")
    companies = [{"name": clean(r["insurancecompany"]), "naic": r["naic"] if re.fullmatch(r"\d{5}", r["naic"] or "") else None, "status": clean(r["status"]), "sourceCompanyId": r["companyid"]} for r in raw]
    # The company search is a distinct public class. A separate endpoint serves other licensed entities.
    other = query("RegEntitySearch.aspx/GetRecords", "E")
    other_rows = [{"name": clean(r["insurancecompany"]), "naic": r["naic"] if re.fullmatch(r"\d{5}", r["naic"] or "") else None, "status": clean(r["status"]), "sourceCompanyId": r["companyid"]} for r in other]
    canonical = {r["naic_cocode"] for r in json.loads((ROOT / "data/reports/ins-insurer-006-identity-index.json").read_text(encoding="utf-8"))["insurers"]}
    naic_rows = [r for r in companies if r["naic"]]
    matched = [r for r in naic_rows if r["naic"] in canonical]
    company = {"source": BASE + "InsCompanySearch.aspx?SEARCH_TYPE=C", "weeklySearchClock": "MIA says the public search is updated weekly; exact update instant is not displayed", "retrievedAt": retrieved, "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "grain": "MIA Company search row, distinct from other licensed entities and producer firms", "rowCount": len(companies), "rowsWithNaic": len(naic_rows), "distinctNaic": len({r["naic"] for r in naic_rows}), "statusCounts": dict(Counter(r["status"] for r in companies)), "exactCanonicalNaicRows": len(matched), "distinctCanonicalNaics": len({r["naic"] for r in matched}), "unmatchedNaicRows": len(naic_rows)-len(matched), "otherLicensedEntityCount": len(other_rows), "rows": companies, "otherLicensedEntities": other_rows}
    (OUT / "companies.json").write_text(json.dumps(company, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    actions = []
    sources = []
    for year in range(2022, 2027):
        url = PDF.format(year)
        response = requests.get(url, timeout=45)
        response.raise_for_status()
        pdf = pdfplumber.open(io.BytesIO(response.content))
        count = 0
        for page_number, page in enumerate(pdf.pages, 1):
            for table in page.extract_tables():
                if not table or len(table[0]) != 6:
                    continue
                for cells in table[1:]:
                    if len(cells) != 6 or not re.fullmatch(r"\d{2}/\d{2}/\d{4}", clean(cells[-1])):
                        continue
                    name, number, order_type, order_number, action, date = map(clean, cells)
                    # A PDF row can combine an agency and a person. Do not force one grain.
                    grain = "agency" if re.search(r"\b(?:LLC|L\.L\.C\.|Inc\.|Corporation|Agency)\b", name, re.I) and "\n" not in (cells[0] or "") else "unresolved producer/agency"
                    actions.append({"summaryYear": year, "respondent": name, "respondentGrain": grain, "producerAgencyNumber": number if re.fullmatch(r"\d{5,12}", number) else None, "numberAsPrinted": number, "orderType": order_type, "orderNumber": order_number, "action": action, "actionDate": datetime.strptime(date, "%m/%d/%Y").date().isoformat(), "sourceDocument": url, "sourcePage": page_number})
                    count += 1
        sources.append({"year": year, "url": url, "pages": len(pdf.pages), "rows": count})
    enforcement = {"retrievedAt": retrieved, "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "sources": sources, "rowCount": len(actions), "rows": actions, "exactAttachments": 0, "nameOnlyAdverseJoins": 0}
    (OUT / "producer-enforcement.json").write_text(json.dumps(enforcement, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Company rows {len(companies)}, NAIC rows {len(naic_rows)}, canonical matches {len(matched)}; other licensed entities {len(other_rows)}; producer action rows {len(actions)}")


if __name__ == "__main__":
    main()
