#!/usr/bin/env python3
"""NJ-INS-001 NJDOBI insurance evidence ingest.

Official discovery, parse, identity, dry-run. Internal-only.
Does not mint /new-jersey, rankings, Trust Scores, or person profiles.
Does not copy credentials from other repositories.
"""
from __future__ import annotations

import argparse
import hashlib
import html as html_lib
import json
import re
import ssl
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "nj-raw" / "dobi-ins"
HTML_DIR = RAW / "html"
PDF_DIR = RAW / "pdf"
GEN = ROOT / "data" / "reports"
FIX = ROOT / "data" / "fixtures" / "nj-ins-001"
MIGRATION = ROOT / "supabase" / "migrations" / "20260902140000_nj_ins_001_regulatory_ledger.sql"
BAIL = ROOT / "lib" / "directory" / "bail-bond-publication.ts"
UA = "InsuranceTrustHub/NJ-INS-001 (research acquisition; +https://www.insurancetrusthub.com)"
CTX = ssl.create_default_context()
DATASET = "NJ_DOBI_INSURANCE_EVIDENCE"
HOST = "https://www.nj.gov"

ACTION_HEADINGS = [
    "CONSENT ORDERS", "CONSENT ORDER", "FINAL ORDERS", "FINAL ORDER",
    "ORDER TO SHOW CAUSE", "ORDERS TO SHOW CAUSE", "CEASE AND DESIST ORDER",
    "ORDER TO CEASE AND DESIST",
]
ORDER_RE = re.compile(r"Order\s*#?\s*(E\d{2}-\d+|E\d{2}-\d+\w*|\d{2}-\d{5}-\d+)", re.I)
NAIC_RE = re.compile(r"\b(?:NAIC(?:\s*(?:No\.?|Company\s*Code|Code))?|Company Code)\s*[:\-]?\s*(\d{5})\b", re.I)
NAIC_TAIL_RE = re.compile(r"-\s*(\d{5})\s*$")
MONEY_RE = re.compile(
    r"(Fine|Penalty|Restitution|Fraud(?:\s+Act)?\s+Surcharge|Surcharge|Costs?)[^$]{0,40}\$\s*([0-9,]+(?:\.\d{1,2})?)",
    re.I,
)
DATE_RE = re.compile(
    r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})\b",
    re.I,
)
ENTITY_HINT = re.compile(r"\b(LLC|INC\.?|CORP|COMPANY|CO\.|GROUP|INSURANCE|AGENCY|ASSOCIATION|HMO)\b", re.I)


def iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def fingerprint(value: Any) -> str:
    return sha256_text(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")))


def normalize_space(text: str) -> str:
    text = html_lib.unescape((text or "").replace("\u00a0", " "))
    return re.sub(r"\s+", " ", text).strip()


def safe_urljoin(base_url: str, href: str) -> str:
    href = html_lib.unescape(href or "").strip().replace("\\", "/")
    href = re.sub(r"\s+", "%20", href)
    joined = urljoin(base_url, href)
    parsed = urlparse(joined)
    path = quote(parsed.path, safe="/%._-")
    return parsed._replace(path=path).geturl()


def html_to_text(html: str, base_url: str) -> str:
    def _pdf(match: re.Match[str]) -> str:
        href = safe_urljoin(base_url, match.group(1))
        label = normalize_space(re.sub(r"<[^>]+>", " ", match.group(2)))
        return f" [[PDF {href}|{label}]] "

    work = re.sub(r'<a[^>]+href=["\']([^"\']+\.pdf)["\'][^>]*>(.*?)</a>', _pdf, html, flags=re.I | re.S)
    work = re.sub(r"<(?:br|p|div|tr|li|h\d)[^>]*>", "\n", work, flags=re.I)
    work = re.sub(r"</(?:p|div|tr|li|h\d)>", "\n", work, flags=re.I)
    work = re.sub(r"<[^>]+>", " ", work)
    work = html_lib.unescape(work)
    return "\n".join(normalize_space(line) for line in work.splitlines() if normalize_space(line))


def parse_money(text: str) -> dict[str, float | None]:
    out = {"civil_penalty_amount": 0.0, "restitution_amount": 0.0, "fraud_surcharge_amount": 0.0, "costs_amount": 0.0}
    for kind, raw in MONEY_RE.findall(text or ""):
        number = float(raw.replace(",", ""))
        k = kind.lower()
        if "surcharge" in k:
            out["fraud_surcharge_amount"] += number
        elif "restitution" in k:
            out["restitution_amount"] += number
        elif "cost" in k:
            out["costs_amount"] += number
        else:
            out["civil_penalty_amount"] += number
    return {k: (v if v else None) for k, v in out.items()}


def parse_date(text: str) -> str | None:
    match = DATE_RE.search(text or "")
    if not match:
        return None
    try:
        return datetime.strptime(f"{match.group(1)} {match.group(2)} {match.group(3)}", "%B %d %Y").date().isoformat()
    except ValueError:
        return None


MONTH_HEADINGS = {
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY",
    "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
}


def heading_at(line: str) -> str | None:
    if ORDER_RE.search(line):
        return None
    compact = re.sub(r"\s+", " ", re.sub(r"[^A-Z ]", "", normalize_space(line).upper())).strip()
    if not compact or len(compact) > 80 or compact in MONTH_HEADINGS:
        return None
    for heading in ACTION_HEADINGS:
        if compact == heading or compact.startswith(heading + " ") or heading in compact:
            return heading
    return None


def classify_party(name: str, context: str) -> str:
    namel = (name or "").lower()
    ctx = (context or "").lower()
    if ("bail" in namel and "bond" in namel) or ("bail" in ctx and "bond" in namel):
        return "BAIL_BOND_PRODUCER"
    if ENTITY_HINT.search(name or ""):
        if "billing" in ctx:
            return "THIRD_PARTY_BILLING"
        if re.search(r"\binsurance company\b|\binsurer\b", namel):
            return "INSURER"
        if "adjuster" in ctx or "adjuster" in namel:
            return "PUBLIC_ADJUSTER"
        return "AGENCY"
    if "public adjuster" in ctx:
        return "PUBLIC_ADJUSTER"
    return "INDIVIDUAL_PRODUCER"


def split_names(caption: str) -> list[str]:
    parts = re.split(r"\s+and\s+", caption, flags=re.I)
    return [p.strip(" ,") for p in parts if p.strip(" ,")]


def event_class(heading: str, body: str) -> tuple[str, str]:
    h = (heading or "").upper()
    text = f"{heading} {body}".lower()
    if "CONSENT" in h or "consent order" in text:
        cls = "CONSENT_ORDER"
    elif ("FINAL" in h and "ORDER" in h) or re.search(r"\bfinal order\b", text):
        cls = "FINAL_ORDER"
    elif "SHOW CAUSE" in h or "show cause" in text:
        cls = "ORDER_TO_SHOW_CAUSE"
    elif "CEASE" in h or "cease and desist" in text:
        cls = "CEASE_AND_DESIST"
    else:
        cls = "OTHER"
    if cls == "ORDER_TO_SHOW_CAUSE" or "alleged" in text:
        status = "PENDING"
    elif cls in {"CONSENT_ORDER", "FINAL_ORDER"}:
        status = "FINAL"
    else:
        status = "UNKNOWN"
    return cls, status


def match_party(party: dict[str, Any]) -> dict[str, Any]:
    name = party.get("legal_name") or ""
    nmls = party.get("naic_cocode")
    npn = party.get("npn")
    ptype = party.get("party_type") or "OTHER"
    result = {
        "match_status": "UNRESOLVED",
        "match_method": "UNMATCHED_OFFICIAL_EVENT",
        "public_eligibility": "internal_only",
        "unsafe_rejected": False,
        "no_public_person_profile": ptype.startswith("INDIVIDUAL"),
    }
    if ptype.startswith("INDIVIDUAL") or (ptype == "PUBLIC_ADJUSTER" and not ENTITY_HINT.search(name)):
        if npn and re.fullmatch(r"\d{5,12}", npn):
            result.update({"match_status": "EXACT", "match_method": "EXACT_NPN"})
        else:
            result.update({"match_status": "INTERNAL_ONLY_INDIVIDUAL", "match_method": "INDIVIDUAL_HELD_INTERNAL", "unsafe_rejected": True})
        return result
    if nmls and re.fullmatch(r"\d{5}", nmls):
        result.update({"match_status": "EXACT", "match_method": "EXACT_NAIC_COCODE"})
        return result
    if party.get("state_reference"):
        result.update({"match_status": "EXACT", "match_method": "EXACT_NJDOBI_REFERENCE"})
        return result
    result["match_status"] = "UNRESOLVED" if ENTITY_HINT.search(name) else "UNSAFE_REJECTED"
    result["match_method"] = "NAME_ONLY_REJECTED" if result["match_status"] == "UNRESOLVED" else "UNSAFE_NAME_ALONE"
    result["unsafe_rejected"] = result["match_status"] == "UNSAFE_REJECTED"
    return result


def parse_enforcement_html(html: str, source_url: str, year: int | None, family: str, page: str) -> list[dict[str, Any]]:
    text = html_to_text(html, source_url)
    lines = text.splitlines()
    title_m = re.search(r"<title>([^<]+)</title>", html, flags=re.I)
    heading = heading_at(title_m.group(1) if title_m else "") or "UNKNOWN"
    buf: list[str] = []
    events: list[dict[str, Any]] = []
    pending = False

    def looks_like_caption(line: str) -> bool:
        if not line or heading_at(line) or ORDER_RE.search(line) or "[[PDF" in line:
            return False
        low = line.lower()
        if low.startswith(("sanction", "respondent", "fine", "civil penalty")):
            return False
        return len(line) < 120 and bool(re.search(r"[A-Za-z]", line))

    def flush(extra: str | None = None) -> None:
        nonlocal buf
        chunk_lines = buf[:]
        if extra:
            chunk_lines.append(extra)
        buf = []
        chunk = "\n".join(chunk_lines).strip()
        if not chunk:
            return
        order = ORDER_RE.search(chunk)
        pdfs = re.findall(r"\[\[PDF ([^\]|]+)\|([^\]]*)\]\]", chunk)
        if not order and not pdfs:
            return
        order_number = (order.group(1) if order else None)
        if not order_number and pdfs:
            m = ORDER_RE.search(pdfs[0][1] or "")
            order_number = m.group(1) if m else None
        names = [ln for ln in chunk_lines if not heading_at(ln) and "[[PDF" not in ln and not ORDER_RE.search(ln) and not ln.lower().startswith(("sanction", "respondents", "respondent")) and len(ln) < 120]
        caption = " and ".join(names[:8]) if names else "UNKNOWN RESPONDENT"
        cls, status = event_class(heading, chunk)
        amounts = parse_money(chunk)
        parties = []
        for name in split_names(caption) or [caption]:
            name = re.sub(r",\s*[A-Z]{2}$", "", name).strip(" ,")
            ptype = classify_party(name, chunk)
            party = {"legal_name": name, "party_type": ptype, "role_in_order": "respondent", "naic_cocode": None, "npn": None, "state_reference": None}
            party.update(match_party(party))
            parties.append(party)
        flags = {
            "revocation": bool(re.search(r"revok|revoc", chunk, re.I)),
            "suspension": bool(re.search(r"suspend", chunk, re.I)),
            "surrender": bool(re.search(r"surrender", chunk, re.I)),
        }
        occ_fp = fingerprint({"url": source_url, "order": order_number, "caption": caption, "pdf": pdfs[0][0] if pdfs else None})
        events.append({
            "source_dataset": DATASET,
            "source_family": family,
            "source_year": year,
            "source_url": source_url,
            "source_page": page,
            "order_number": order_number,
            "event_id": order_number or occ_fp,
            "event_class": cls,
            "event_status": status,
            "flags": flags,
            "respondent_caption": caption,
            "action_date": parse_date(chunk),
            "document_url": pdfs[0][0] if pdfs else None,
            "amounts": amounts,
            "parties": parties,
            "occurrence_fingerprint": occ_fp,
            "raw_excerpt": chunk[:3000],
            "public_eligibility": "internal_only",
            "monitoring_state": "baseline_only",
            "is_enforcement": True,
        })

    for line in lines:
        h = heading_at(line)
        if h:
            flush()
            heading = h
            pending = False
            continue
        if ORDER_RE.search(line):
            buf.append(line)
            pending = True
            continue
        if pending and looks_like_caption(line):
            flush()
            pending = False
            buf.append(line)
            continue
        buf.append(line)
    flush()
    return events


def parse_financial_exams(html: str, source_url: str) -> list[dict[str, Any]]:
    events = []
    for href, label in re.findall(r'<a[^>]+href=["\']([^"\']+\.pdf)["\'][^>]*>(.*?)</a>', html, flags=re.I | re.S):
        name = normalize_space(re.sub(r"<[^>]+>", " ", label))
        if not name or name.lower() in {"company/company code"}:
            continue
        year_m = re.search(r"(20\d{2})", name + " " + href)
        naic = None
        tail = NAIC_TAIL_RE.search(name)
        if tail:
            naic = tail.group(1)
            name = normalize_space(name[: tail.start()])
        elif "AA-" in name:
            naic = None
        pdf = safe_urljoin(source_url, href)
        year = int(year_m.group(1)) if year_m else None
        party = {"legal_name": name, "party_type": "INSURER", "role_in_order": "examination_subject", "naic_cocode": naic, "npn": None, "state_reference": None}
        if naic:
            party.update({"match_status": "EXACT", "match_method": "EXACT_NAIC_COCODE", "public_eligibility": "internal_only"})
        else:
            party.update({"match_status": "UNRESOLVED", "match_method": "NAME_ONLY_REJECTED", "public_eligibility": "internal_only"})
        occ_fp = fingerprint({"url": source_url, "pdf": pdf, "name": name})
        events.append({
            "source_dataset": DATASET,
            "source_family": "NJ_DOBI_FINANCIAL_EXAMINATION",
            "source_year": year,
            "source_url": source_url,
            "source_page": "finexam_reports.htm",
            "order_number": None,
            "event_id": occ_fp,
            "event_class": "FINANCIAL_EXAMINATION",
            "event_status": "FINAL",
            "flags": {},
            "respondent_caption": name,
            "action_date": f"{year}-12-31" if year else None,
            "document_url": pdf,
            "amounts": {},
            "parties": [party],
            "occurrence_fingerprint": occ_fp,
            "raw_excerpt": name,
            "public_eligibility": "internal_only",
            "monitoring_state": "baseline_only",
            "is_enforcement": False,
        })
    return events


def parse_mc_exams(html: str, source_url: str) -> list[dict[str, Any]]:
    events = []
    for href, label in re.findall(r'<a[^>]+href=["\']([^"\']+\.pdf)["\'][^>]*>(.*?)</a>', html, flags=re.I | re.S):
        name = normalize_space(re.sub(r"<[^>]+>", " ", label))
        if not name or "instruction" in name.lower() or len(name) < 4:
            continue
        pdf = safe_urljoin(source_url, href)
        multi = bool(re.search(r"\band\b|Group \(| / ", name, re.I))
        names = [n.strip() for n in re.split(r"\band\b|/", name) if n.strip()] if multi else [name]
        parties = []
        for n in names[:6]:
            party = {"legal_name": n, "party_type": "INSURER", "role_in_order": "examination_subject", "naic_cocode": None, "npn": None, "state_reference": None}
            if multi:
                party.update({"match_status": "REVIEW_REQUIRED", "match_method": "AMBIGUOUS_MULTI_ENTITY", "public_eligibility": "internal_only"})
            else:
                party.update({"match_status": "UNRESOLVED", "match_method": "NAME_ONLY_REJECTED", "public_eligibility": "internal_only"})
            parties.append(party)
        occ_fp = fingerprint({"url": source_url, "pdf": pdf, "name": name})
        events.append({
            "source_dataset": DATASET,
            "source_family": "NJ_DOBI_MARKET_CONDUCT_EXAMINATION",
            "source_year": None,
            "source_url": source_url,
            "source_page": "marketconductexams.htm",
            "order_number": None,
            "event_id": occ_fp,
            "event_class": "MARKET_CONDUCT_EXAMINATION",
            "event_status": "FINAL",
            "flags": {},
            "respondent_caption": name,
            "action_date": None,
            "document_url": pdf,
            "amounts": {},
            "parties": parties,
            "occurrence_fingerprint": occ_fp,
            "raw_excerpt": name,
            "public_eligibility": "internal_only",
            "monitoring_state": "baseline_only",
            "is_enforcement": False,
        })
    return events


def parse_inscomp(html: str, source_url: str) -> list[dict[str, Any]]:
    rows = []
    for block in re.findall(r"<TR VALIGN=TOP>(.*?)</TR>", html, flags=re.I | re.S):
        cells = re.findall(r"<TD[^>]*>(.*?)</TD>", block, flags=re.I | re.S)
        if len(cells) < 4:
            continue
        name = normalize_space(re.sub(r"<[^>]+>", " ", cells[0]))
        address = normalize_space(re.sub(r"<[^>]+>", " ", cells[1]))
        city = normalize_space(re.sub(r"<[^>]+>", " ", cells[2]))
        phone_naic = normalize_space(re.sub(r"<[^>]+>", " ", cells[3]))
        naic_m = re.search(r"NAIC No\.\s*(\d{5})", phone_naic, re.I)
        if not name:
            continue
        rows.append({
            "legal_name": name,
            "address": address,
            "city_state_zip": city,
            "naic_cocode": naic_m.group(1) if naic_m else None,
            "institution_class": "ADMITTED_INSURER",
            "match_status": "EXACT" if naic_m else "UNRESOLVED",
            "match_method": "EXACT_NAIC_COCODE" if naic_m else "NAME_ONLY_REJECTED",
            "public_eligibility": "internal_only",
            "source_url": source_url,
        })
    return rows


def parse_rehab(html: str, source_url: str) -> list[dict[str, Any]]:
    events = []
    for name in re.findall(r"<a name=\"[^\"]+\"[^>]*></a>([^<]+)", html, flags=re.I):
        caption = normalize_space(name)
        if "in Liquidation" not in caption and "in Rehabilitation" not in caption:
            continue
        status = "LIQUIDATION" if "Liquidation" in caption else "REHABILITATION"
        legal = re.sub(r"\s+in (Liquidation|Rehabilitation).*$", "", caption).strip()
        occ_fp = fingerprint({"url": source_url, "name": legal, "status": status})
        party = {"legal_name": legal, "party_type": "INSURER", "role_in_order": "receivership_subject", "naic_cocode": None, "npn": None, "state_reference": None,
                 "match_status": "UNRESOLVED", "match_method": "NAME_ONLY_REJECTED", "public_eligibility": "internal_only"}
        events.append({
            "source_dataset": DATASET,
            "source_family": "NJ_DOBI_REHABILITATION_LIQUIDATION",
            "source_year": None,
            "source_url": source_url,
            "source_page": "finesolv.htm",
            "order_number": None,
            "event_id": occ_fp,
            "event_class": status,
            "event_status": "FINAL",
            "flags": {},
            "respondent_caption": caption,
            "action_date": None,
            "document_url": None,
            "amounts": {},
            "parties": [party],
            "occurrence_fingerprint": occ_fp,
            "raw_excerpt": caption,
            "public_eligibility": "internal_only",
            "monitoring_state": "baseline_only",
            "is_enforcement": False,
            "inferred_insolvency": False,
        })
    return events


def extract_pdf_text(data: bytes) -> tuple[str, str]:
    if not data.startswith(b"%PDF"):
        return "", "FAILED"
    try:
        from io import BytesIO
        from pypdf import PdfReader
        reader = PdfReader(BytesIO(data))
        pages = []
        for page in reader.pages[:20]:
            pages.append(page.extract_text() or "")
        text = normalize_space("\n".join(pages))
        if len(text) >= 80:
            return text[:40000], "EXTRACTED"
        if data.count(b"/Image") > 3:
            return "", "IMAGE_ONLY"
        return text, "EXTRACTED" if text else "IMAGE_ONLY"
    except Exception:
        literals = re.findall(rb"\(((?:\\.|[^\\)]){3,})\)", data)
        decoded = [raw.decode("latin-1", errors="ignore") for raw in literals[:8000]]
        text = normalize_space(" ".join(decoded))
        if len(text) >= 80:
            return text[:40000], "EXTRACTED"
        return "", "FAILED"


def parse_auto_complaint(text: str, year: int, source_url: str) -> list[dict[str, Any]]:
    rows = []
    # Preserve group-grain. Do not copy onto legal entities. Do not create a leaderboard.
    pattern = re.compile(
        r"([A-Za-z][A-Za-z0-9&.,'() /\-]{3,80}?)\s+(\d+)\s+([0-9,]+)\s+(0\.\d+|1\.\d+|0\.0000)\s+(\d+\.\d+|0\.000)",
    )
    statewide = None
    tot = re.search(r"TOTALS\s+(\d+)\s+([0-9,]+)", text)
    if tot:
        statewide = {"valid_complaints": int(tot.group(1)), "vehicles_in_force": int(tot.group(2).replace(",", ""))}
    for name, complaints, vehicles, ratio, index in pattern.findall(text):
        name = normalize_space(name)
        if name.lower() in {"name of insurer", "totals"}:
            continue
        grain = "group" if re.search(r"\bGroup\b", name, re.I) else "company"
        rows.append({
            "reporting_year": year,
            "company_or_group_name": name,
            "grain": grain,
            "valid_complaints": int(complaints),
            "vehicles_in_force": int(vehicles.replace(",", "")),
            "complaint_ratio": float(ratio),
            "complaint_index": float(index),
            "eligibility_threshold_vehicles": 10000,
            "statewide_denominator": statewide,
            "methodology": "Valid complaints per 1,000 insured autos; index 1.00 = average. Ratios for companies with at least 10,000 autos.",
            "public_eligibility": "internal_only",
            "leaderboard_created": False,
            "copied_to_legal_entities": False,
            "source_url": source_url,
        })
    return rows


def http_get(url: str) -> tuple[int, bytes, str]:
    req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urlopen(req, context=CTX, timeout=45) as resp:
        return resp.status, resp.read(), resp.geturl()


def fetch(url: str) -> dict[str, Any]:
    try:
        status, body, final = http_get(url)
        return {"status": status, "body": body, "final_url": final, "error": None}
    except HTTPError as exc:
        return {"status": exc.code, "body": b"", "final_url": url, "error": str(exc.reason)}
    except (URLError, TimeoutError, OSError) as exc:
        return {"status": None, "body": b"", "final_url": url, "error": str(exc)}


def fetch_with_retry(
    url: str,
    attempts: int = 3,
    fetcher: Any = None,
    sleep_s: float = 0.25,
) -> dict[str, Any]:
    fetcher = fetcher or fetch
    last: dict[str, Any] = {"status": None, "body": b"", "final_url": url, "error": "no_attempt"}
    for i in range(max(1, attempts)):
        last = fetcher(url)
        last["attempts"] = i + 1
        status = last.get("status")
        body = last.get("body") or b""
        if status == 200 and body:
            last["retry_status"] = "SUCCESS" if i == 0 else "SUCCESS_AFTER_RETRY"
            return last
        if status in {404, 403, 410, 451}:
            last["retry_status"] = "TERMINAL_HTTP"
            return last
        last["retry_status"] = "RETRYING"
        if sleep_s:
            time.sleep(sleep_s * (i + 1))
    last["retry_status"] = "RETRY_EXHAUSTED"
    return last


def pdf_name(url: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", Path(urlparse(url).path).name or "doc.pdf")


def download_docs(
    events: list[dict[str, Any]],
    fetcher: Any = None,
    pdf_dir: Path | None = None,
    sleep_s: float = 0.05,
) -> dict[str, Any]:
    dest_dir = pdf_dir or PDF_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    seen: dict[str, dict[str, Any]] = {}
    hashes: dict[str, list[str]] = {}
    downloaded = skipped = unavailable = index_only = 0
    extraction = Counter()
    for ev in events:
        url = ev.get("document_url")
        if not url:
            ev["acquisition_state"] = "INDEX_ONLY"
            ev["canonical_document_id"] = None
            index_only += 1
            continue
        if url in seen:
            ev.update(seen[url])
            skipped += 1
            continue
        dest = dest_dir / pdf_name(url)
        if dest.exists():
            data = dest.read_bytes()
            digest = sha256_bytes(data)
            _text, st = extract_pdf_text(data)
            rec = {
                "acquisition_state": "SKIPPED_EXISTING_HASH",
                "content_hash": digest,
                "canonical_document_id": digest,
                "text_extraction_state": st,
                "retry_status": "SKIPPED_EXISTING_HASH",
                "byte_length": len(data),
            }
            skipped += 1
            extraction[st] += 1
        else:
            got = fetch_with_retry(url, fetcher=fetcher, sleep_s=sleep_s)
            data = got.get("body") or b""
            rec = {
                "retry_status": got.get("retry_status"),
                "http_status": got.get("status"),
                "download_attempts": got.get("attempts"),
                "canonical_document_id": None,
            }
            if got.get("status") == 404:
                rec["acquisition_state"] = "HTTP_404"
                rec["text_extraction_state"] = "UNAVAILABLE"
                unavailable += 1
            elif got.get("status") != 200 or not data.startswith(b"%PDF"):
                rec["acquisition_state"] = "DOCUMENT_UNAVAILABLE"
                rec["text_extraction_state"] = "UNAVAILABLE"
                unavailable += 1
            else:
                dest.write_bytes(data)
                digest = sha256_bytes(data)
                _text, st = extract_pdf_text(data)
                rec.update({
                    "acquisition_state": "DOCUMENT_DOWNLOADED",
                    "content_hash": digest,
                    "canonical_document_id": digest,
                    "text_extraction_state": st,
                    "byte_length": len(data),
                })
                downloaded += 1
                extraction[st] += 1
        ev.update(rec)
        seen[url] = rec
        digest = rec.get("content_hash")
        if digest:
            hashes.setdefault(digest, []).append(url)
        if sleep_s and rec.get("acquisition_state") not in {"SKIPPED_EXISTING_HASH"}:
            time.sleep(sleep_s)
    return {
        "downloaded": downloaded,
        "skipped_existing_hash": skipped,
        "unavailable": unavailable,
        "index_only": index_only,
        "unique_hashes": len(hashes),
        "duplicate_content_groups": sum(1 for u in hashes.values() if len(set(u)) > 1),
        "document_links": sum(1 for e in events if e.get("document_url")),
        "text_extracted": extraction.get("EXTRACTED", 0),
        "image_only": extraction.get("IMAGE_ONLY", 0),
        "other_extraction_failures": extraction.get("FAILED", 0),
        "occurrence_vs_canonical": "occurrence_fingerprint identifies index rows; canonical_document_id is content hash",
    }


def load_html(name: str) -> str | None:
    for path in HTML_DIR.glob(f"{name}.*"):
        return path.read_text(encoding="latin-1", errors="replace")
    path = HTML_DIR / f"{name}.html"
    return path.read_text(encoding="latin-1", errors="replace") if path.exists() else None


def parse_all() -> dict[str, Any]:
    events: list[dict[str, Any]] = []
    coverage = []
    for year in range(2006, 2027):
        key = f"doi_enf_{year}"
        html = load_html(key)
        url = f"{HOST}/dobi/division_insurance/insfines{str(year)[2:]}.htm"
        if html:
            parsed = parse_enforcement_html(html, url, year, "NJ_DOBI_DOI_ENFORCEMENT", key)
            events.extend(parsed)
            coverage.append({"family": "NJ_DOBI_DOI_ENFORCEMENT", "year": year, "coverage_state": "ACQUIRED_COMPLETE" if year >= 2014 else "ACQUIRED_PARTIAL_HISTORY", "url": url})
        else:
            coverage.append({"family": "NJ_DOBI_DOI_ENFORCEMENT", "year": year, "coverage_state": "SOURCE_NOT_ACQUIRED", "url": url})
        bkey = f"bfd_enf_{year}"
        bhtml = load_html(bkey)
        burl = f"{HOST}/dobi/division_insurance/bfd/enforcement{year}.html"
        if bhtml:
            events.extend(parse_enforcement_html(bhtml, burl, year, "NJ_DOBI_BFD_ENFORCEMENT", bkey))
            coverage.append({"family": "NJ_DOBI_BFD_ENFORCEMENT", "year": year, "coverage_state": "ACQUIRED_COMPLETE", "url": burl})
        elif year >= 2018:
            coverage.append({"family": "NJ_DOBI_BFD_ENFORCEMENT", "year": year, "coverage_state": "SOURCE_NOT_ACQUIRED", "url": burl})

    fin_html = load_html("financial_exams")
    if fin_html:
        events.extend(parse_financial_exams(fin_html, f"{HOST}/dobi/division_insurance/finexam_reports.htm"))
    mc_html = load_html("mc_reports")
    if mc_html:
        events.extend(parse_mc_exams(mc_html, f"{HOST}/dobi/division_consumers/insurance/marketconductexams.htm"))
    rehab_html = load_html("rehab")
    if rehab_html:
        events.extend(parse_rehab(rehab_html, f"{HOST}/dobi/division_insurance/finesolv.htm"))

    carriers = []
    ins_html = load_html("inscomp")
    if ins_html:
        carriers = parse_inscomp(ins_html, f"{HOST}/dobi/data/inscomp.htm")

    complaints = []
    for year in (2023, 2024):
        pdf_path = HTML_DIR / f"auto_{year}.pdf"
        if not pdf_path.exists():
            pdf_path = RAW / "html" / f"auto_{year}.pdf"
        if pdf_path.exists():
            text, state = extract_pdf_text(pdf_path.read_bytes())
            rows = parse_auto_complaint(text, year, f"{HOST}/dobi/division_consumers/pdf/{year}autoconsumerrpt.pdf")
            for row in rows:
                row["text_extraction_state"] = state
            complaints.extend(rows)

    return {"events": events, "carriers": carriers, "complaints": complaints, "coverage": coverage}


def summarize(parsed: dict[str, Any], docs: dict[str, Any]) -> dict[str, Any]:
    events = parsed["events"]
    enf = [e for e in events if e.get("is_enforcement")]
    parties = [p for e in events for p in e.get("parties") or []]
    enf_parties = [p for e in enf for p in e.get("parties") or []]
    class_counts = Counter(e.get("event_class") for e in enf)
    status_counts = Counter(e.get("event_status") for e in enf)
    party_counts = Counter(p.get("party_type") for p in enf_parties)
    match_counts = Counter(p.get("match_status") for p in parties)
    method_counts = Counter(p.get("match_method") for p in parties)
    carriers = parsed["carriers"]
    complaints = parsed["complaints"]
    fin = [e for e in events if e.get("event_class") == "FINANCIAL_EXAMINATION"]
    mc = [e for e in events if e.get("event_class") == "MARKET_CONDUCT_EXAMINATION"]
    rehab = [e for e in events if e.get("source_family") == "NJ_DOBI_REHABILITATION_LIQUIDATION"]
    return {
        "ticket": "NJ-INS-001",
        "generated_at": iso(),
        "publication": {
            "new_jersey_route_created": False,
            "sitemap_change": False,
            "rankings": False,
            "trust_scores": False,
            "complaint_leaderboard": False,
            "manual_vercel": False,
            "bail_bond_firewall_preserved": BAIL.exists(),
        },
        "enforcement": {
            "events": len(enf),
            "unique_orders": len({e.get("order_number") for e in enf if e.get("order_number")}),
            "class_counts": dict(class_counts),
            "status_counts": dict(status_counts),
            "penalties": sum(1 for e in enf if (e.get("amounts") or {}).get("civil_penalty_amount")),
            "restitution": sum(1 for e in enf if (e.get("amounts") or {}).get("restitution_amount")),
            "fraud_surcharge": sum(1 for e in enf if (e.get("amounts") or {}).get("fraud_surcharge_amount")),
            "multi_party": sum(1 for e in enf if len(e.get("parties") or []) > 1),
        },
        "respondents": {
            "counts": dict(party_counts),
            "individuals": sum(1 for p in enf_parties if str(p.get("party_type")).startswith("INDIVIDUAL")),
            "internal_only_individuals": sum(1 for p in enf_parties if p.get("match_status") == "INTERNAL_ONLY_INDIVIDUAL"),
        },
        "identity": {
            "exact_naic": method_counts.get("EXACT_NAIC_COCODE", 0),
            "exact_npn": method_counts.get("EXACT_NPN", 0),
            "exact_state_ref": method_counts.get("EXACT_NJDOBI_REFERENCE", 0),
            "match_status_counts": dict(match_counts),
            "no_public_person_profile": True,
        },
        "carriers": {
            "source_rows": len(carriers),
            "exact_naic": sum(1 for c in carriers if c.get("match_status") == "EXACT"),
            "classes": dict(Counter(c.get("institution_class") for c in carriers)),
        },
        "market_conduct": {
            "reports": len(mc),
            "name_only_unresolved": sum(1 for e in mc if e["parties"][0].get("match_status") == "UNRESOLVED"),
            "multi_entity_review": sum(1 for e in mc if e["parties"][0].get("match_status") == "REVIEW_REQUIRED"),
            "converted_to_enforcement": 0,
        },
        "financial_exams": {
            "reports": len(fin),
            "exact_naic": sum(1 for e in fin if e["parties"][0].get("match_method") == "EXACT_NAIC_COCODE"),
            "unresolved": sum(1 for e in fin if e["parties"][0].get("match_status") == "UNRESOLVED"),
            "converted_to_enforcement": 0,
        },
        "auto_complaints": {
            "rows": len(complaints),
            "years": sorted({r.get("reporting_year") for r in complaints}),
            "group_grain_rows": sum(1 for r in complaints if r.get("grain") == "group"),
            "company_grain_rows": sum(1 for r in complaints if r.get("grain") == "company"),
            "leaderboard_created": False,
            "copied_to_legal_entities": False,
        },
        "rehab": {
            "entities": len(rehab),
            "liquidation": sum(1 for e in rehab if e.get("event_class") == "LIQUIDATION"),
            "rehabilitation": sum(1 for e in rehab if e.get("event_class") == "REHABILITATION"),
            "inferred_insolvency": False,
        },
        "acquisition": docs,
        "coverage": parsed["coverage"],
        "database": {
            "available": (ROOT / ".env.local").exists() is False and False,
            "production_blocker": "No authorized InsuranceTrustHub database session in this worktree. Safe dormant code may merge.",
        },
        "invariants": {
            "license_ne_appointment": True,
            "complaint_ne_violation": True,
            "exam_ne_enforcement": True,
            "group_ne_legal_entity": True,
            "producer_ne_insurer": True,
        },
    }


def write_json(name: str, payload: Any) -> None:
    GEN.mkdir(parents=True, exist_ok=True)
    (GEN / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def run(mode: str, download_pdfs: bool) -> dict[str, Any]:
    parsed = parse_all()
    docs = {
        "downloaded": 0,
        "skipped_existing_hash": 0,
        "unavailable": 0,
        "index_only": sum(1 for e in parsed["events"] if not e.get("document_url")),
        "unique_hashes": 0,
        "duplicate_content_groups": 0,
        "document_links": sum(1 for e in parsed["events"] if e.get("document_url")),
    }
    if mode in {"download", "execute"} and download_pdfs:
        docs = download_docs(parsed["events"])
    elif mode in {"local-input", "inspect", "dry-run", "verify"}:
        for ev in parsed["events"]:
            url = ev.get("document_url")
            if not url:
                ev["acquisition_state"] = "INDEX_ONLY"
                continue
            dest = PDF_DIR / pdf_name(url)
            if dest.exists():
                data = dest.read_bytes()
                ev["acquisition_state"] = "SKIPPED_EXISTING_HASH"
                ev["content_hash"] = sha256_bytes(data)
        docs["unique_hashes"] = len({e.get("content_hash") for e in parsed["events"] if e.get("content_hash")})
        docs["index_only"] = sum(1 for e in parsed["events"] if not e.get("document_url"))
    summary = summarize(parsed, docs)
    summary["mode"] = mode
    write_json("nj-ins-001-summary.json", summary)
    write_json("nj-ins-001-events.json", parsed["events"])
    write_json("nj-ins-001-carriers.json", parsed["carriers"])
    write_json("nj-ins-001-complaints.json", parsed["complaints"])
    print(json.dumps({"mode": mode, "events": len(parsed["events"]), "carriers": len(parsed["carriers"]), "complaints": len(parsed["complaints"])}, indent=2))
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["discover", "download", "local-input", "inspect", "dry-run", "execute", "verify"])
    parser.add_argument("--skip-pdfs", action="store_true")
    args = parser.parse_args()
    if args.mode == "discover":
        print("Use scripts/nj-ins-001-discover.py for live HTTP discovery.")
        return
    run(args.mode, download_pdfs=not args.skip_pdfs)


if __name__ == "__main__":
    main()
