"""Freeze the public IDOI action and domestic financial-exam indexes.

Requires requests and beautifulsoup4. Re-run with --check to compare the
source-derived records while ignoring the retrieval clock.
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "lib" / "indiana-intelligence" / "accepted-snapshot.json"
ACTION_URL = "https://www.in.gov/idoi/enforcement/enforcement-actions/"
FINANCIAL_URL = "https://www.in.gov/idoi/companyentity-financial-compliance/domestic-financial-exam-reports/"


def table(url):
    response = requests.get(url, timeout=45)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    return max(soup.select("table"), key=lambda item: len(item.select("tr")))


def cells(row):
    return [cell.get_text(" ", strip=True) for cell in row.select("th,td")]


actions = []
for tr in table(ACTION_URL).select("tr")[1:]:
    values = cells(tr)
    if len(values) != 7 or not re.fullmatch(r"202[2-6]-\d{2}-\d{2}", values[2]):
        continue
    if values[2] > "2026-09-29":
        continue
    link = tr.select_one("a[href]")
    actions.append(dict(respondent=values[0], administrativeAction=values[1],
                        finalOrderDate=values[2], actionAsPrinted=values[3],
                        orderNumber=values[4], licenseNumberAsPrinted=values[5] or None,
                        npnAsPrinted=values[6] or None,
                        sourceDocument=urljoin(ACTION_URL, link["href"]) if link else None))

financial = []
for tr in table(FINANCIAL_URL).select("tr")[1:]:
    values = cells(tr)
    if len(values) != 3 or not re.fullmatch(r"\d{5}", values[0]):
        continue
    for anchor in tr.select("a[href]"):
        year = anchor.get_text(" ", strip=True)
        if not re.fullmatch(r"20\d{2}", year):
            continue
        financial.append(dict(naic=values[0], company=values[1], reportYear=int(year),
                              sourceDocument=urljoin(FINANCIAL_URL, anchor["href"])))

identity = json.loads((ROOT / "data/reports/ins-insurer-006-identity-index.json").read_text(encoding="utf-8"))
known_naics = {row["naic_cocode"] for row in identity["insurers"]}
financial_naics = {row["naic"] for row in financial}
recent_financial = [row for row in financial if 2022 <= row["reportYear"] <= 2026]
market_actions = [row for row in actions if re.search(r"market\s*conduct", row["administrativeAction"], re.I)]
snapshot = dict(schemaVersion="in-ins-001-v1", sourceClock=None,
                enforcement=dict(source=ACTION_URL, window="2022-01-01 through 2026-09-29",
                                 rowCount=len(actions), rows=actions,
                                 exactAdverseAttachments=0, nameOnlyAdverseJoins=0),
                marketConduct=dict(source=ACTION_URL, capability="KNOWN",
                                   indexGrain="enforcement table rows labeled market conduct; not a complete exam census",
                                   labeledActionRows=len(market_actions), orderNumbers=[row["orderNumber"] for row in market_actions],
                                   standaloneExamIndex="NOT_ACQUIRED"),
                financialExams=dict(source=FINANCIAL_URL, indexRows=len(financial),
                                    recent2022to2026=len(recent_financial),
                                    distinctNaic=len(financial_naics),
                                    exactExistingCanonicalNaicOverlap=len(financial_naics & known_naics),
                                    unmatchedNaic=len(financial_naics - known_naics), rows=financial,
                                    exactProfileAttachments=0),
                companyRoster=dict(source="https://www.in.gov/idoi/companyentity-financial-compliance/lists-by-type-or-category/",
                                   verification="KNOWN", statewideRows="NOT_ACQUIRED",
                                   companyCount=None, companyRowsWithNaic=None,
                                   distinctCompanyNaic=None, exactCanonicalCompanyMatches=None),
                agency=dict(verification="KNOWN", roster="NOT_ACQUIRED"),
                producer=dict(verification="KNOWN", roster="NOT_ACQUIRED", personProfilesCreated=0),
                complaints=dict(intake="KNOWN", fraudReporting="KNOWN", providerRows="NOT_ACQUIRED", outcomes="NOT_ACQUIRED"),
                graph=dict(newCanonicalOrganizations=0, graphWrites=0, claimEligibilityChanges=0))

if "--check" in sys.argv:
    existing = json.loads(OUT.read_text(encoding="utf-8"))
    snapshot["retrievedAt"] = existing["retrievedAt"]
    snapshot["generatedAt"] = existing["generatedAt"]
    if snapshot != existing:
        raise SystemExit("Indiana IDOI snapshot differs from current source")
    print(f"Indiana snapshot current: {len(actions)} actions, {len(financial)} financial reports")
else:
    snapshot["retrievedAt"] = "2026-09-29"
    snapshot["generatedAt"] = datetime.now(timezone.utc).isoformat()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Indiana snapshot: {len(actions)} actions, {len(market_actions)} market-conduct-labeled actions, {len(financial)} financial reports, {len(financial_naics)} NAIC codes")
