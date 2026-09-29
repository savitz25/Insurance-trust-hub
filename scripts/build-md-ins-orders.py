"""Bounded annual MIA company order/exam index extraction (2022-2026)."""
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://www.apps.insurance.maryland.gov/CompanyProducerInfo/"
OUT = Path(__file__).resolve().parents[1] / "lib/maryland-intelligence/order-exam-index.json"
TARGET = "ctl00$ContentPlaceHolder1$gv_CompanyDocs"


def fields(page):
    return {x.get("name"): x.get("value", "") for x in page.select("form input[name]") if x.get("type") not in ("submit", "button", "radio", "checkbox")}


def table(page):
    found = page.select_one("#ContentPlaceHolder1_gv_CompanyDocs")
    if not found:
        raise RuntimeError("MIA document table missing")
    return found


def parse_rows(page, search_year, grain, url):
    result = []
    for tr in table(page).select("tr")[1:]:
        cells = tr.find_all("td", recursive=False)
        if len(cells) != 7:
            continue
        values = [c.get_text(" ", strip=True) for c in cells]
        if not re.fullmatch(r"\d{2}/\d{2}/\d{4}", values[3]):
            continue
        signed = datetime.strptime(values[3], "%m/%d/%Y").date().isoformat()
        if int(signed[:4]) != search_year:
            continue
        popup = cells[6].find(onclick=re.compile("popup"))
        ids = re.findall(r"'([0-9]+)'", popup.get("onclick", "")) if popup else []
        result.append({"respondent": values[0], "respondentGrain": grain, "documentName": values[1], "displayedStatus": values[2], "signedDate": signed, "division": values[4], "category": values[5], "sourceEntityId": ids[0] if len(ids) == 2 else None, "sourceDocumentId": ids[1] if len(ids) == 2 else None, "sourcePage": url})
    return result


def main():
    session = requests.Session()
    all_rows = []
    sources = []
    for grain, url in [("company", BASE + "InsOrder.aspx?NAV=HOME"), ("producer firm/agency", BASE + "ProducerFirmOrder.aspx")]:
      for year in range(2022, 2027):
        start = BeautifulSoup(session.get(url, timeout=30).text, "html.parser")
        params = fields(start)
        params.update({"ctl00$ContentPlaceHolder1$text_docsigndate": f"01/01/{year}", "ctl00$ContentPlaceHolder1$text_docsignenddate": "09/29/2026" if year == 2026 else f"12/31/{year}", "ctl00$ContentPlaceHolder1$SearchButton": "Search"})
        first = BeautifulSoup(session.post(url, data=params, timeout=40).text, "html.parser")
        first_rows = parse_rows(first, year, grain, url)
        pager = table(first).select("tr")[-1]
        if not pager.find("a", string=">>"):
            last_page = 1
        else:
            last_params = fields(first)
            last_params.update({"__EVENTTARGET": TARGET, "__EVENTARGUMENT": "Page$Last"})
            last = BeautifulSoup(session.post(url, data=last_params, timeout=40).text, "html.parser")
            current = table(last).select("tr")[-1].find("span")
            last_page = int(current.get_text(strip=True))
        if last_page > 50:
            raise RuntimeError(f"Unexpectedly large {year} page count: {last_page}")
        rows = first_rows
        page = first
        for number in range(2, last_page + 1):
            params = fields(page)
            params.update({"__EVENTTARGET": TARGET, "__EVENTARGUMENT": f"Page${number}"})
            page = BeautifulSoup(session.post(url, data=params, timeout=40).text, "html.parser")
            rows.extend(parse_rows(page, year, grain, url))
        keys = [(r["sourceDocumentId"], r["signedDate"], r["documentName"]) for r in rows]
        if len(set(keys)) != len(keys):
            raise RuntimeError(f"Duplicate index rows for {year}")
        sources.append({"year": year, "grain": grain, "pages": last_page, "rows": len(rows), "url": url, "saturatedAt150": len(rows) == 150})
        all_rows.extend(rows)
        print(grain, year, last_page, len(rows))
    result = {"retrievedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "sources": sources, "rowCount": len(all_rows), "categoryCounts": {cat: sum(r["category"] == cat for r in all_rows) for cat in sorted({r["category"] for r in all_rows})}, "rows": all_rows}
    OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(result["categoryCounts"])


if __name__ == "__main__":
    main()
