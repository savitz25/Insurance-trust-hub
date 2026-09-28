"""Acquire the public DIFS Final Decisions search index (bounded to 2022 onward).

This reads DIFS's public SXA search JSON; it does not query license locators or
enumerate identifiers. Only explicitly insurance-labeled decisions are published.
"""
import html
import io
import json
import re
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
import pdfplumber

SOURCE = "https://www.michigan.gov/difs/legal/hearings-decisions/final-decisions"
ENDPOINT = "https://www.michigan.gov/difs/sxa/search/results/"
PARAMS = {
    "v": "{C210099A-A383-43E1-980E-5CDD186F8657}",
    "s": "{5C25BA8E-E69B-4065-851C-11A868F15D77}",
    "p": "1000",
    "o": "Created Date,Descending",
    "itemid": "{FD7C9E24-5E39-4378-8634-8FF4FFE50EAB}",
}
OUT = Path(__file__).resolve().parents[1] / "lib" / "michigan-intelligence" / "final-decisions.json"
EXAMS = OUT.with_name("market-exams.json")
AUDIT = OUT.with_name("linkage-audit.json")
EXAM_SOURCE = "https://www.michigan.gov/difs/industry/insurance-mkt-regulation/company-examinations"


def clean(value):
    return " ".join(html.unescape(re.sub(r"<[^>]*>", " ", value)).replace("\ufffd", "'").split())


def classify_respondent(name):
    if re.search(r"\s+v\.?\s+", name, re.I):
        return "unresolved"
    if re.search(r"\b(?:agency|agencies|associates|brokers|brokerage)\b", name, re.I):
        return "agency-form name"
    if re.search(r"\b(?:insurance company|insurer|mutual insurance|assurance company)\b", name, re.I):
        return "insurer-form name"
    if re.search(r"\b(?:LLC|L\.L\.C\.|INC|CORP|CORPORATION|LTD)\b", name, re.I):
        return "organization-form name"
    return "unresolved"


def enrich_pdf(row):
    try:
        response = requests.get(row["sourceDocument"], headers={"User-Agent": "Mozilla/5.0", "Referer": SOURCE}, timeout=25)
        response.raise_for_status()
        if not response.content.startswith(b"%PDF"):
            return {**row, "pdfChecked": False}
        pdf = pdfplumber.open(io.BytesIO(response.content))
        first = pdf.pages[0].extract_text() or ""
        # Caption and opening paragraph only; later pages may mention third parties.
        caption = first[:2200]
        identifier = re.search(r"\bSystem\s+ID\s+(?:No\.?|Number|#)\s*[:#]?\s*(\d{6,9})\b", caption, re.I)
        npn = re.search(r"\b(?:National\s+Producer\s+Number|NPN)\s*(?:No\.?|Number|#)?\s*[:#]?\s*(\d{5,12})\b", caption, re.I)
        license_id = re.search(r"\bLicen[sc]e\s+(?:No\.?|Number|#)\s*[:#]?\s*([A-Z0-9-]{5,18})\b", caption, re.I)
        naic = re.search(r"\bNAIC\s+(?:Co(?:mpany)?\s*)?(?:Code|No\.?|Number|#)\s*[:#]?\s*(\d{5})\b", caption, re.I)
        issued = re.search(r"ISSUED\s+AND\s+ENTERED\s+on\s+([A-Z][a-z]+\s+\d{1,2},\s+20\d{2})", caption, re.I)
        person = bool(re.search(r"Respondent[^.]{0,140}(?:licensed|insurance)\s+(?:individual|person)\s+(?:insurance\s+)?producer", caption, re.I))
        agency = bool(re.search(r"Respondent[^.]{0,140}(?:licensed\s+)?business\s+entity\s+(?:insurance\s+)?producer", caption, re.I))
        grain = "individual producer" if person else "agency/business entity producer" if agency else row["respondentGrain"]
        return {**row, "respondentGrain": grain, "systemId": identifier.group(1) if identifier else None, "npn": npn.group(1) if npn else None, "licenseNumber": license_id.group(1) if license_id else None, "naic": naic.group(1) if naic else None, "decisionIssuedDate": datetime.strptime(issued.group(1), "%B %d, %Y").date().isoformat() if issued else None, "identifierSourcePage": 1 if any((identifier, npn, license_id, naic)) else None, "pdfChecked": True}
    except Exception:
        return {**row, "pdfChecked": False}


def acquire_exams(session):
    response = session.get(EXAM_SOURCE, timeout=30)
    response.raise_for_status()
    body = response.text
    table = re.search(r"<tbody>(.*?)</tbody>", body, re.S | re.I)
    rows = []
    if table:
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", table.group(1), re.S | re.I):
            cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S | re.I)
            link = re.search(r'href="([^"]+)"', cells[0]) if len(cells) == 5 else None
            if not link:
                continue
            raw_date = clean(cells[2])
            rows.append({"insurerAsIndexed": clean(cells[0]), "naicCodesAsIndexed": clean(cells[1]), "reportDate": datetime.strptime(raw_date, "%m/%d/%Y").date().isoformat(), "examType": clean(cells[3]), "disposition": clean(cells[4]), "sourceDocument": urljoin("https://www.michigan.gov", html.unescape(link.group(1)))})
    EXAMS.write_text(json.dumps({"retrievedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "indexUrl": EXAM_SOURCE, "rows": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return rows


def main():
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0", "Referer": SOURCE})
    response = session.get(ENDPOINT, params=PARAMS, timeout=60)
    response.raise_for_status()
    data = response.json()
    rows = []
    all_years = Counter()
    for item in data["Results"]:
        fragment = item["Html"]
        title_match = re.search(r'<a class="content-title-link" href="([^"]+)"[^>]*>(.*?)</a>', fragment, re.S)
        action_match = re.search(r"<div><p>(.*?)</p></div>", fragment, re.S)
        date_match = re.search(r"Date:\s*(\d{2})\.(\d{2})\.(20\d{2})", fragment)
        if not (title_match and action_match and date_match):
            continue
        title = clean(title_match.group(2))
        action = clean(action_match.group(1))
        date = f"{date_match.group(3)}-{date_match.group(1)}-{date_match.group(2)}"
        if not ("2022-01-01" <= date <= "2026-09-28"):
            continue
        all_years[date[:4]] += 1
        # The mixed DIFS index also holds banking and finance matters. Keep only
        # records whose public title or action explicitly says insurance/producer.
        if not re.search(r"\b(?:insurance|insurer|producer|insurtech|reinsurance)\b", f"{title} {action}", re.I):
            continue
        case = re.search(r"\b(?:2[0-6]-\d{3,6}(?:-[A-Z]+)?|\d{2}-\d{3,6}(?:-[A-Z]+)?)\b", title)
        respondent = title[:case.start()].strip(" :-") if case else title
        respondent = re.sub(r"^DIFS\s+v\.?\s+", "", respondent, flags=re.I)
        rows.append({
            "date": date,
            "caseNumber": case.group() if case else None,
            "respondentAsIndexed": respondent,
            "respondentGrain": classify_respondent(respondent),
            "actionAsIndexed": action,
            "status": "stipulated order in Final Decisions index" if re.search(r"stipulat", action, re.I) else "final decision index entry",
            "licenseNumber": None,
            "systemId": None,
            "npn": None,
            "naic": None,
            "sourceDocument": urljoin("https://www.michigan.gov", html.unescape(title_match.group(1))),
            "sourceIndex": SOURCE,
        })
    with ThreadPoolExecutor(max_workers=8) as pool:
        rows = list(pool.map(enrich_pdf, rows))
    result = {
        "retrievedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "indexUrl": SOURCE,
        "indexEndpoint": ENDPOINT,
        "indexCountAtRetrieval": data["Count"],
        "allIndexedByYear": dict(sorted(all_years.items())),
        "filter": "Public title or action explicitly identifies insurance, insurer, producer, insurtech or reinsurance; mixed-industry and incomplete rows are excluded.",
        "rows": rows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    exams = acquire_exams(session)
    identity_file = OUT.parents[2] / "data" / "reports" / "ins-insurer-006-identity-index.json"
    known_naics = {str(r["naic_cocode"]) for r in json.loads(identity_file.read_text(encoding="utf-8"))["insurers"]}
    matched_exam_rows = [r for r in exams if set(re.findall(r"\b\d{5}\b", r["naicCodesAsIndexed"])) & known_naics]
    matched_codes = sorted({code for r in exams for code in re.findall(r"\b\d{5}\b", r["naicCodesAsIndexed"]) if code in known_naics})
    AUDIT.write_text(json.dumps({"basis": "Exact five-digit NAIC code against existing national legal-insurer identity index; read-only crosswalk, no evidence attachment", "marketExamRowsWithExactNaicIdentity": len(matched_exam_rows), "distinctExistingNaicIdentities": len(matched_codes), "canonicalCompanyEvidenceAttachments": 0, "agencyEvidenceAttachments": 0, "producerEvidenceAttachments": 0, "nameOnlyAttachments": 0, "netNewCanonicalOrganizations": 0, "graphWrites": 0}, indent=2) + "\n", encoding="utf-8")
    print("index", data["Count"], "window", sum(all_years.values()), "explicit insurance", len(rows), "by year", dict(Counter(r["date"][:4] for r in rows)), "by grain", dict(Counter(r["respondentGrain"] for r in rows)), "pdf checked", sum(r["pdfChecked"] for r in rows), "system IDs", sum(bool(r["systemId"]) for r in rows))
    print("market exam index", len(exams), "latest", max((r["reportDate"] for r in exams), default="none"))
    print("exact NAIC identity crosswalk", len(matched_exam_rows), "rows", len(matched_codes), "distinct codes; attachments 0")


if __name__ == "__main__":
    main()
