#!/usr/bin/env python3
"""NC-INS-001 bounded public harvest. GRAPH_WRITES = 0. No SBS mailing-list purchase."""
from __future__ import annotations

import json
import re
import ssl
import time
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "north-carolina" / "nc-ins-001"
RAW = OUT / "raw"
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)

UA = {"User-Agent": "TrustHubResearch/NC-INS-001 (independent research; not a ranking)"}
CTX = ssl.create_default_context()
RETRIEVED = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get(url: str, timeout: int = 45) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, context=CTX, timeout=timeout) as resp:
        return resp.read().decode("utf-8", "replace")


def strip_tags(html: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return unescape(re.sub(r"\s+", " ", text)).strip()


def parse_table_rows(html: str) -> list[list[str]]:
    rows = []
    for tr in re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", html, flags=re.I):
        cells = re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", tr, flags=re.I)
        if not cells:
            continue
        rows.append([strip_tags(c) for c in cells])
    return rows


def extract_npn(name_npn: str) -> str | None:
    m = re.search(r"(\d{4,12})\s*$", name_npn.strip())
    if not m:
        return None
    return m.group(1)


def classify_license_type(terms: str) -> str:
    t = terms.lower()
    if "collection agency" in t:
        return "collection_agency"
    if "surety bail" in t or "bail bond" in t or "bail-bond" in t:
        return "bail_bond"
    if "public adjuster" in t:
        return "public_adjuster"
    if "company/independent firm adjuster" in t or "firm adjuster" in t:
        return "company_adjuster"
    if "business entity" in t:
        return "business_entity"
    if "insurance producer" in t:
        return "insurance_producer"
    if "insurance compan" in t:
        return "insurance_company_notice"
    if "ra license" in t:
        return "ra_license"
    return "other"


def harvest_licaction() -> dict:
    base = (
        "https://www.ncdoi.gov/licaction?search=&field_document_entity_terms_target_id=All"
        "&action=All&field_document_entity_terms_target_id_2=All"
        "&field_document_entity_terms_target_id_3=All"
        "&order=field_document_entity_pub_date&sort=desc"
    )
    records = []
    seen = set()
    page = 0
    while page < 400:
        url = f"{base}&page={page}"
        html = get(url)
        (RAW / f"licaction-p{page}.html").write_text(html, encoding="utf-8")
        body_rows = parse_table_rows(html)
        data_rows = [r for r in body_rows if r and r[0] and not r[0].lower().startswith("action date")]
        added = 0
        for r in data_rows:
            if len(r) < 3:
                continue
            action_date, name_npn, terms = r[0], r[1], r[2]
            extra = r[3] if len(r) > 3 else ""
            key = (action_date, name_npn, terms, extra)
            if key in seen:
                continue
            seen.add(key)
            npn = extract_npn(name_npn)
            docket = None
            dm = re.search(r"docket(?:\s*(?:no\.?|number))?\s*[:#]?\s*(\d{3,6})", extra, re.I)
            if dm:
                docket = dm.group(1)
            rec = {
                "action_date": action_date,
                "name_npn": name_npn,
                "terms": terms,
                "additional": extra,
                "npn": npn,
                "docket": docket,
                "license_class": classify_license_type(terms),
            }
            records.append(rec)
            added += 1
        print(f"licaction page {page} rows={added} total={len(records)}", flush=True)
        if "rel=\"next\"" not in html and "Go to next page" not in html:
            break
        if added == 0:
            break
        page += 1
        time.sleep(0.15)
    by_class = Counter(r["license_class"] for r in records)
    dockets = {r["docket"] for r in records if r["docket"]}
    npns = {r["npn"] for r in records if r["npn"]}
    summary = {
        "source": "https://www.ncdoi.gov/licaction",
        "retrieved_at": RETRIEVED,
        "document_rows": len(records),
        "distinct_dockets": len(dockets),
        "unique_matters": len(dockets) if dockets else None,
        "exact_npn_rows": sum(1 for r in records if r["npn"]),
        "rows_without_exact_id": sum(1 for r in records if not r["npn"] and not r["docket"]),
        "by_class": dict(by_class),
        "producer_rows": by_class.get("insurance_producer", 0),
        "business_entity_rows": by_class.get("business_entity", 0),
        "adjuster_rows": by_class.get("public_adjuster", 0) + by_class.get("company_adjuster", 0),
        "other_rows": len(records)
        - by_class.get("insurance_producer", 0)
        - by_class.get("business_entity", 0)
        - by_class.get("public_adjuster", 0)
        - by_class.get("company_adjuster", 0),
        "pages": page + 1,
    }
    (OUT / "licensing-actions.json").write_text(
        json.dumps({"summary": summary, "rows": records}, indent=2), encoding="utf-8"
    )
    (OUT / "licensing-actions-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def harvest_named_table(url: str, name: str, title_col: int = 0) -> dict:
    html = get(url)
    (RAW / f"{name}.html").write_text(html, encoding="utf-8")
    rows = parse_table_rows(html)
    data = []
    for r in rows:
        title = r[title_col] if r else ""
        if not title or title.lower() in {"name", "report name", "report"}:
            continue
        hrefs = re.findall(r'href="([^"]+)"', html)
        data.append({"title": title, "cells": r})
    # Prefer hrefs from the table specifically
    titles = []
    for m in re.finditer(r'<tr[^>]*>[\s\S]*?</tr>', html, re.I):
        block = m.group(0)
        tds = [strip_tags(c) for c in re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", block, re.I)]
        if not tds:
            continue
        title = tds[0]
        if title.lower() in {"name", "report name", "report"}:
            continue
        href = None
        hm = re.search(r'href="([^"]+)"', block)
        if hm:
            href = urllib.parse.urljoin(url, unescape(hm.group(1)))
        titles.append({"title": title, "href": href, "cells": tds})
    unique_titles = {t["title"] for t in titles}
    summary = {
        "source": url,
        "retrieved_at": RETRIEVED,
        "report_rows": len(titles),
        "distinct_titles": len(unique_titles),
        "hrefs": sum(1 for t in titles if t["href"]),
    }
    (OUT / f"{name}.json").write_text(json.dumps({"summary": summary, "rows": titles}, indent=2), encoding="utf-8")
    print(name, summary, flush=True)
    return summary


def harvest_receiverships() -> dict:
    url = "https://www.ncdoi.gov/insurance-industry/receiverships"
    html = get(url)
    (RAW / "receiverships.html").write_text(html, encoding="utf-8")
    text = strip_tags(html)
    headings = re.findall(r"<h3[^>]*>([\s\S]*?)</h3>", html, flags=re.I)
    headings = [strip_tags(h) for h in headings]
    entities = []
    for h in headings:
        if not h or h.lower() in {"additional information", "estates under administration (receiverships)"}:
            continue
        status = "receivership"
        hl = h.lower()
        if "liquidation" in hl:
            status = "liquidation"
        elif "rehabilitation" in hl:
            status = "rehabilitation"
        elif "administrative supervision" in hl or "supervision" in hl:
            status = "administrative_supervision"
        elif "receivership" in hl:
            status = "receivership"
        entities.append({"heading": h, "status": status})
    docs = re.findall(r'href="(/documents/[^"]+|https://www\.ncdoi\.gov/documents/[^"]+)"', html)
    summary = {
        "source": url,
        "retrieved_at": RETRIEVED,
        "entity_headings": entities,
        "entity_count": len(entities),
        "liquidation_headings": sum(1 for e in entities if e["status"] == "liquidation"),
        "rehabilitation_headings": sum(1 for e in entities if e["status"] == "rehabilitation"),
        "admin_supervision_headings": sum(1 for e in entities if e["status"] == "administrative_supervision"),
        "receivership_headings": sum(1 for e in entities if e["status"] == "receivership"),
        "document_hrefs": len(set(docs)),
        "note": "Heading grain is estate/status index, not document count. Mixed SNIC/CBL/BLIC/SNRC heading is one accordion estate group.",
    }
    (OUT / "receiverships.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("receiverships", summary["entity_count"], summary["document_hrefs"], flush=True)
    return summary


def harvest_surplus_lines() -> dict:
    url = "https://www.ncdoi.gov/licensees/company-licensing-and-registration/surplus-lines-insurers"
    html = get(url)
    (RAW / "surplus-lines.html").write_text(html, encoding="utf-8")
    hrefs = re.findall(r'href="([^"]+)"', html)
    pdfs = [urllib.parse.urljoin(url, unescape(h)) for h in hrefs if ".pdf" in h.lower() or "eligible" in h.lower()]
    summary = {
        "source": url,
        "retrieved_at": RETRIEVED,
        "candidate_links": pdfs[:20],
        "status": "LIST_LINK_PRESENT_PARSE_PENDING",
        "rows": None,
        "distinct_naic": None,
        "rows_missing_naic": None,
        "note": "US-domiciled eligible list is a NCDOI document; alien insurers are NAIC IID quarterly listing, a separate universe.",
    }
    # Follow first document-like link
    for h in hrefs:
        full = urllib.parse.urljoin(url, unescape(h))
        if "eligible" in full.lower() or "surplus-lines-insurer" in full.lower() and "/documents/" in full:
            try:
                doc = get(full)
                (RAW / "surplus-lines-list.html").write_text(doc, encoding="utf-8")
                summary["list_url"] = full
                naics = set(re.findall(r"\b(\d{5})\b", strip_tags(doc)))
                # 5-digit numbers in a list page may include years; keep as review
                summary["five_digit_tokens"] = len(naics)
            except Exception as e:
                summary["list_fetch_error"] = str(e)
            break
    (OUT / "surplus-lines.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("surplus", summary, flush=True)
    return summary


def harvest_market_share() -> dict:
    index = "https://www.ncdoi.gov/insurance-industry/financial-analysis/insurance-company-market-share-and-premium-information"
    html = get(index)
    (RAW / "market-share-index.html").write_text(html, encoding="utf-8")
    hrefs = [urllib.parse.urljoin(index, unescape(h)) for h in re.findall(r'href="([^"]+)"', html)]
    docs_2025 = [h for h in hrefs if "2025" in h and "statistical-data" in h]
    wanted = {
        "homeowners": "2025p3s04homeowners",
        "federal_flood": "2025p3s02.3_federal-flood" if False else "federal-flood",
        "private_flood": "private-flood",
        "private_passenger_auto": "private-passenger-automobile",
        "commercial_auto": "commercial-automobile",
        "workers_comp": "workers-compensation",
        "domestics_pc": "property-and-casualty-business-domestics",
    }
    line_files = []
    for h in hrefs:
        if "/documents/financial-analysis/statistical-data/2025" in h:
            line_files.append(h.split("?")[0])
    line_files = sorted(set(line_files))
    (OUT / "market-share-2025-index.json").write_text(
        json.dumps({"source": index, "retrieved_at": RETRIEVED, "files": line_files}, indent=2),
        encoding="utf-8",
    )
    parsed_lines = {}
    for url in line_files:
        slug = url.rstrip("/").split("/")[-1]
        open_url = url.rstrip("/") + "/open"
        try:
            body = get(open_url, timeout=60)
        except Exception as e:
            print("skip", slug, e, flush=True)
            continue
        (RAW / f"{slug}.open.html").write_text(body, encoding="utf-8")
        text = strip_tags(body)
        # NAIC 5-digit preceded by year 2025 and a line token, or standalone 5-digit company codes
        naics = re.findall(r"\b(2025)\s+[^\n]{0,80}?\b(\d{5})\b", body)
        codes = set(re.findall(r"\b(\d{5})\b", text))
        # Filter obvious non-NAIC (years already 2025; page numbers)
        codes = {c for c in codes if c not in {"2025", "2024", "10000"}}
        parsed_lines[slug] = {
            "url": url,
            "open_url": open_url,
            "bytes": len(body),
            "five_digit_tokens": len(codes),
        }
        print("ms", slug, "tokens", len(codes), flush=True)
        time.sleep(0.1)
    (OUT / "market-share-2025-parsed.json").write_text(
        json.dumps({"retrieved_at": RETRIEVED, "lines": parsed_lines}, indent=2), encoding="utf-8"
    )
    return {"files": len(line_files), "parsed": len(parsed_lines)}


def main() -> None:
    print("retrieved", RETRIEVED, flush=True)
    actions = harvest_licaction()
    market = harvest_named_table(
        "https://www.ncdoi.gov/market-regulation-examination-report", "market-exams"
    )
    financial = harvest_named_table(
        "https://www.ncdoi.gov/financial-examination-report", "financial-exams"
    )
    recv = harvest_receiverships()
    surplus = harvest_surplus_lines()
    ms = harvest_market_share()
    rollup = {
        "retrieved_at": RETRIEVED,
        "licensing_actions": actions,
        "market_exams": market,
        "financial_exams": financial,
        "receiverships": recv,
        "surplus_lines": surplus,
        "market_share": ms,
        "company_roster_status": "OPEN_SEARCH_ONLY",
        "agency_roster_status": "OPEN_SEARCH_ONLY",
        "producer_roster_status": "OPEN_SEARCH_ONLY",
        "complaint_coverage": "INTAKE_AVAILABLE / BULK_NOT_PUBLIC",
    }
    (OUT / "harvest-rollup.json").write_text(json.dumps(rollup, indent=2), encoding="utf-8")
    print("DONE", json.dumps({k: (v if not isinstance(v, dict) else {kk: vv for kk, vv in v.items() if kk != "entity_headings"}) for k, v in rollup.items()}, indent=2)[:4000], flush=True)


if __name__ == "__main__":
    main()
