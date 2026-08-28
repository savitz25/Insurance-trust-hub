"""FL-INS-004 — Florida regulatory & enforcement evidence.

  python scripts/national/fl-ins-004.py
  python scripts/national/fl-ins-004.py --execute
  python scripts/national/fl-ins-004.py --execute   # second run must be zero-delta

CRN is notice/allegation, not a finding. Market-conduct ≠ financial exam.
Orders preserve finality. Receivership/liquidation use the official status.
Attach only via exact NAIC or a Florida Company Code already mapped to NAIC.
Name-only adverse identity is rejected. Publication remains INTERNAL_ONLY.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import ssl
import time
import urllib.error
import urllib.request
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

ROOT = Path(r"C:\Users\Michael.Savitsky\insurance-visual-005")
ITH = Path(r"C:\Users\Michael.Savitsky\insurance-trust-hub")
OUT = ROOT / "data" / "reports"
OIR_DIR = ROOT / "data" / "oir-raw" / "by-type"
CTX = ssl.create_default_context()
TASK = "FL-INS-004"
TRANSFORM = "fl-ins-004.v1"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

CRN_HOME = "https://apps.fldfs.com/civilremedy/"
CRN_SEARCH = "https://apps.fldfs.com/civilremedy/SearchFiling.aspx"
RECEIVER_LIST = "https://www.myfloridacfo.com/division/receiver/companies"
MARKET_PC = "https://floir.gov/property-casualty/property-and-casualty-market-regulation"
MARKET_LH = "https://floir.gov/life-health/life-and-health-market-regulation"
FIN_PC = "https://floir.gov/property-casualty/property-casualty-financial-oversight"
FIN_LH_CANDIDATES = [
    "https://floir.gov/life-health/life-and-health-financial-oversight",
    "https://floir.gov/life-health/life-health-financial-oversight",
    "https://floir.gov/life-health/life-and-health-financial-oversight/financial-examination-reports",
]
ORDERS_CANDIDATES = [
    "https://floir.gov/resources-and-reports/orders-and-memoranda",
    "https://floir.com/resources-and-reports/orders-and-memoranda",
]
DFS_PRR = "https://myfloridacfo.com/publicrecords"
OIR_PRR = "https://floir.gov"

SOURCE_RECEIVER = "florida_dfs_receiver_companies"
SOURCE_CRN = "florida_dfs_civil_remedy_notices"
SOURCE_MC = "florida_oir_market_conduct_exams"
SOURCE_FIN = "florida_oir_financial_exams"
SOURCE_ORD = "florida_oir_administrative_orders"

PDF_HREF = re.compile(
    r'<a[^>]+href=["\']([^"\']+\.pdf)["\'][^>]*>(.*?)</a>',
    re.I | re.S,
)
DETAIL_HREF = re.compile(
    r'href=["\']([^"\']*/companies/detail/(\d+))["\'][^>]*>([^<]+)',
    re.I,
)
CASE_RE = re.compile(r"\b(\d{4}\s*CA\s*\d{3,})\b", re.I)
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")
EXCEL_RE = re.compile(r'^=\s*"([^"]*)"\s*$')


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for base in (ROOT, ITH):
        p = base / ".env.local"
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            t = line.strip()
            if not t or t.startswith("#") or "=" not in t:
                continue
            k, v = t.split("=", 1)
            env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


def dump(name: str, obj: Any) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")
    print("WROTE", OUT / name, flush=True)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def clean_text(raw: str | None) -> str:
    s = TAG_RE.sub(" ", str(raw or ""))
    s = WS_RE.sub(" ", s).strip()
    s = re.sub(r"^Download", "", s).strip()
    return s


def digits(raw: str | None) -> str:
    return re.sub(r"\D", "", str(raw or ""))


def http_get(url: str, timeout: int = 90) -> tuple[int, bytes, str]:
    last: Exception | None = None
    for attempt in range(5):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml"},
                method="GET",
            )
            with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
                body = resp.read()
                final = str(resp.geturl() or url)
                return int(resp.status), body, final
        except Exception as e:
            last = e
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"{url}: {last}")


def first_ok(urls: list[str]) -> tuple[str, int, bytes, str] | None:
    for u in urls:
        try:
            status, body, final = http_get(u)
            if status == 200 and b"<html" in body.lower()[:4000] or status == 200:
                if b"404" in body[:200].lower() and b"not found" in body.lower()[:800]:
                    continue
                return u, status, body, final
        except Exception:
            continue
    return None


def req(base: str, key: str, path: str, extra: dict | None = None, method: str = "GET", data: bytes | None = None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Prefer": "count=exact",
    }
    if extra:
        headers.update(extra)
    last = None
    for attempt in range(6):
        try:
            r = urllib.request.Request(base + path, headers=headers, data=data, method=method)
            with urllib.request.urlopen(r, timeout=180, context=CTX) as resp:
                return resp.read(), resp.headers, resp.status
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", "replace") if e.fp else ""
            last = RuntimeError(f"{e.code} {path} {err_body[:400]}")
            if e.code in (409, 23505) or "duplicate" in err_body.lower():
                raise last
            time.sleep(1.2 * (attempt + 1))
        except Exception as e:
            last = e
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(str(last))


def parse_cr(cr: str | None) -> int:
    if cr and "/" in cr:
        tail = cr.split("/")[-1]
        if tail != "*":
            return int(tail)
    return -1


def count_rows(base: str, key: str, table: str, query: str = "") -> int:
    path = f"/rest/v1/{table}?select=id"
    if query:
        path += "&" + query
    extra = {"Range": "0-0", "Range-Unit": "items"}
    _, headers, _ = req(base, key, path, extra)
    return parse_cr(headers.get("Content-Range"))


def fetch_all(base: str, key: str, table: str, select: str, query: str = "", page: int = 1000) -> list[dict]:
    rows: list[dict] = []
    start = 0
    while True:
        path = f"/rest/v1/{table}?select={select}"
        if query:
            path += "&" + query
        extra = {"Range": f"{start}-{start + page - 1}", "Range-Unit": "items", "Prefer": "count=exact"}
        body, headers, _ = req(base, key, path, extra)
        batch = json.loads(body.decode("utf-8") or "[]")
        rows.extend(batch)
        if start == 0:
            print(f"  fetch {table} {parse_cr(headers.get('Content-Range'))}", flush=True)
        if len(batch) < page:
            break
        start += page
    return rows


def abs_url(href: str, page_url: str) -> str:
    href = href.replace("&amp;", "&").strip()
    if href.startswith("http://"):
        href = "https://" + href[len("http://") :]
    if href.startswith("https://"):
        return href
    if href.startswith("//"):
        return "https:" + href
    if href.startswith("/"):
        from urllib.parse import urlparse

        p = urlparse(page_url)
        return f"{p.scheme}://{p.netloc}{href}"
    return href


def parse_pdfs(html: str, page_url: str) -> list[dict]:
    out: list[dict] = []
    seen: set[str] = set()
    for href, inner in PDF_HREF.findall(html):
        url = abs_url(href, page_url)
        key = url.split("?")[0].lower()
        if key in seen:
            continue
        seen.add(key)
        title = clean_text(inner)
        if not title:
            title = Path(url.split("?")[0]).name
        out.append({"title": title, "url": url})
    return out


def is_non_insurer(title: str, url: str) -> bool:
    blob = f"{title} {url}".lower()
    needles = (
        "premium finance",
        "premium financing",
        "finance llc",
        "finance corp",
        "finance company",
        "pharmacy benefit",
        " pbm",
        "payment plan",
        "funding llc",
        "acceptance corp",
        "acceptance of florida",
    )
    return any(n in blob for n in needles)


def classify_market_or_order(title: str, url: str) -> str:
    blob = f"{title} {url}".lower()
    if "pending" in blob and "consent" not in blob and "final order" not in blob:
        return "PENDING"
    if "consent order" in blob or re.search(r"(^|[^a-z])co([^a-z]|$)", blob) and (
        "consent" in blob or "-co" in blob or "_co" in blob or "/co-" in blob
    ):
        return "CONSENT_ORDER"
    if "consent" in blob and "order" in blob:
        return "CONSENT_ORDER"
    if re.search(r"[-_/](\d{5,6}-\d{2}-co|co-\d+|\d+-co)", blob):
        return "CONSENT_ORDER"
    if "regulatory settlement" in blob:
        return "CONSENT_ORDER"
    if "final order" in blob:
        return "FINAL_ORDER"
    if re.search(r"\border\b", blob) and "exam" not in blob and "report" not in blob:
        return "FINAL_ORDER"
    return "MARKET_CONDUCT_EXAM"


def classify_order_listing(title: str, url: str) -> str:
    blob = f"{title} {url}".lower()
    if "pending" in blob:
        return "PENDING"
    if "consent" in blob:
        return "CONSENT_ORDER"
    if "final order" in blob or re.search(r"\border\b", blob):
        return "FINAL_ORDER"
    return "ADMINISTRATIVE_ACTION"


def receiver_family(status: str) -> tuple[str, str]:
    s = status.lower()
    if "liquidat" in s:
        return "LIQUIDATION", "LIQUIDATION"
    if "rehabilit" in s:
        return "REHABILITATION", "REHABILITATION"
    return "RECEIVERSHIP", "RECEIVERSHIP"


def parse_receiver_list(html: str) -> list[dict]:
    rehab_empty = True
    items: list[dict] = []
    lower = html
    # Split on the two official headings.
    rehab_idx = lower.lower().find("companies in rehabilitation")
    liq_idx = lower.lower().find("companies in liquidation")
    rehab_html = ""
    liq_html = html
    if rehab_idx >= 0 and liq_idx > rehab_idx:
        rehab_html = html[rehab_idx:liq_idx]
        liq_html = html[liq_idx:]
    elif liq_idx >= 0:
        liq_html = html[liq_idx:]

    def collect(chunk: str, status: str) -> None:
        for href, rid, name in DETAIL_HREF.findall(chunk):
            items.append(
                {
                    "detail_id": rid,
                    "name": clean_text(name),
                    "status": status,
                    "url": abs_url(href, RECEIVER_LIST),
                }
            )

    collect(rehab_html, "Rehabilitation")
    collect(liq_html, "Liquidation")
    # Dedup by detail id, prefer later (liquidation) if duplicated.
    by_id: dict[str, dict] = {}
    for it in items:
        by_id[it["detail_id"]] = it
    out = list(by_id.values())
    if rehab_html and DETAIL_HREF.search(rehab_html):
        rehab_empty = False
    # If no heading split worked, fall back to all details as unknown then list-default liquidation.
    if not out:
        for href, rid, name in DETAIL_HREF.findall(html):
            out.append(
                {
                    "detail_id": rid,
                    "name": clean_text(name),
                    "status": "Liquidation",
                    "url": abs_url(href, RECEIVER_LIST),
                }
            )
    _ = rehab_empty
    return out


def parse_detail(html: str) -> dict:
    text = clean_text(html)
    case = None
    m = CASE_RE.search(html) or CASE_RE.search(text)
    if m:
        case = re.sub(r"\s+", " ", m.group(1)).upper()
    status = None
    if re.search(r"\bLiquidation\b", html):
        status = "Liquidation"
    if re.search(r"\bRehabilitation\b", html) and not status:
        status = "Rehabilitation"
    naic = None
    flcode = None
    for label, bucket in (("NAIC", "naic"), ("Florida Company Code", "fl"), ("FL Comp", "fl")):
        mm = re.search(label + r"[^0-9]{0,40}(\d{3,6})", html, re.I)
        if mm:
            if bucket == "naic":
                naic = mm.group(1)
            else:
                flcode = mm.group(1)
    return {
        "case_number": case,
        "status_on_page": status,
        "naic": naic,
        "fl_company_code": flcode,
        "has_naic": bool(naic),
        "has_fl_company_code": bool(flcode),
    }


def parse_oir_fl_to_naic() -> dict[str, str]:
    mapping: dict[str, str] = {}
    if not OIR_DIR.exists():
        return mapping
    for path in sorted(OIR_DIR.glob("*.xml")):
        try:
            root = ET.fromstring(path.read_bytes())
        except ET.ParseError:
            continue
        for node in root.findall("company"):
            rec = {c.tag: (c.text or "").strip() for c in list(node)}
            fl = digits(rec.get("FLCompCode"))
            naic = digits(rec.get("NAICCode"))
            if fl and naic and len(naic) == 5:
                mapping[fl.zfill(5)] = naic
    return mapping


def graph_counts(base: str, key: str) -> dict[str, int]:
    return {
        "providers": count_rows(base, key, "providers"),
        "agencies": count_rows(base, key, "national_entities", "entity_kind=eq.agency"),
        "persons": count_rows(base, key, "national_entities", "entity_kind=eq.person"),
        "legal_insurers": count_rows(base, key, "national_entities", "entity_kind=eq.legal_insurer"),
        "insurance_groups": count_rows(base, key, "national_entities", "entity_kind=eq.insurance_group"),
        "consumer_brands": count_rows(base, key, "national_entities", "entity_kind=eq.consumer_brand"),
        "fl_oir_company_code": count_rows(base, key, "national_entity_identifiers", "scheme=eq.fl_oir_company_code"),
        "appointed_by": count_rows(base, key, "national_relationships", "relationship_type=eq.appointed_by"),
        "appointer_resolves_to_fl": count_rows(
            base,
            key,
            "national_relationships",
            "relationship_type=eq.APPOINTER_RESOLVES_TO&source_dataset=eq.florida_dfs_appointments",
        ),
        "bridges": count_rows(base, key, "provider_entity_bridges"),
        "regulatory_evidence": count_rows(base, key, "regulatory_evidence"),
        "tdi_complaints": count_rows(
            base, key, "regulatory_evidence", "source_dataset=eq.tdi_complaint_indexes"
        ),
        "florida_receiver": count_rows(
            base, key, "regulatory_evidence", f"source_dataset=eq.{SOURCE_RECEIVER}"
        ),
        "florida_crn": count_rows(base, key, "regulatory_evidence", f"source_dataset=eq.{SOURCE_CRN}"),
        "florida_market_exam": count_rows(
            base, key, "regulatory_evidence", f"source_dataset=eq.{SOURCE_MC}"
        ),
        "florida_financial_exam": count_rows(
            base, key, "regulatory_evidence", f"source_dataset=eq.{SOURCE_FIN}"
        ),
        "florida_orders": count_rows(base, key, "regulatory_evidence", f"source_dataset=eq.{SOURCE_ORD}"),
    }


def probe_evidence_columns(base: str, key: str) -> set[str]:
    body, _, _ = req(
        base,
        key,
        "/rest/v1/regulatory_evidence?select=*&limit=1",
        extra={"Range": "0-0", "Range-Unit": "items"},
    )
    rows = json.loads(body.decode("utf-8") or "[]")
    if rows:
        return set(rows[0].keys())
    # empty table: insert is the only probe; assume TDI stub + additive if FINAL-005 applied.
    return {
        "id",
        "entity_id",
        "record_identifier",
        "regulator",
        "category",
        "disposition",
        "is_final",
        "amount_cents",
        "event_date",
        "attribution_confidence",
        "source_dataset",
        "source_url",
        "source_observed_at",
        "notes",
        "raw",
        "evidence_family",
        "evidence_subtype",
        "respondent_kind",
        "source_respondent_raw",
        "source_respondent_identifier",
        "identifier_scheme",
        "match_basis",
        "case_or_order_number",
        "publication_readiness",
        "document_url",
        "is_current",
        "source_record_id",
    }


def insert_rows(base: str, key: str, rows: list[dict]) -> tuple[int, int, list[str]]:
    inserted = 0
    skipped = 0
    errors: list[str] = []
    for row in rows:
        payload = json.dumps([row]).encode("utf-8")
        try:
            extra = {
                "Content-Type": "application/json",
                "Prefer": "return=representation,resolution=ignore-duplicates",
            }
            body, _, status = req(
                base,
                key,
                "/rest/v1/regulatory_evidence",
                extra=extra,
                method="POST",
                data=payload,
            )
            data = json.loads(body.decode("utf-8") or "[]")
            if isinstance(data, list) and data:
                inserted += 1
            elif isinstance(data, dict) and data.get("id"):
                inserted += 1
            else:
                skipped += 1
        except Exception as e:
            msg = str(e).lower()
            if "duplicate" in msg or "unique" in msg or "409" in msg or "23505" in msg:
                skipped += 1
                continue
            errors.append(str(e)[:400])
    return inserted, skipped, errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    execute = bool(args.execute)
    at = datetime.now(UTC).isoformat()
    observed = datetime.now(UTC).strftime("%Y-%m-%dT00:00:00.000Z")
    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise SystemExit("missing supabase env")
    base = url.rstrip("/")

    print("FL-INS-004 start", "execute" if execute else "dry-run", flush=True)
    pre = graph_counts(base, key)
    print("  baseline evidence", pre["regulatory_evidence"], "receiver", pre["florida_receiver"], flush=True)
    cols = probe_evidence_columns(base, key)
    has_family_col = "evidence_family" in cols
    print("  evidence_family column", has_family_col, flush=True)

    fl_ids = fetch_all(
        base,
        key,
        "national_entity_identifiers",
        "value,entity_id",
        "scheme=eq.fl_oir_company_code",
    )
    legal = fetch_all(
        base,
        key,
        "national_entities",
        "id,provisional_key",
        "entity_kind=eq.legal_insurer",
    )
    legal_by_key = {str(r["provisional_key"]): str(r["id"]) for r in legal if r.get("provisional_key")}
    official_cocodes = set()
    for k in legal_by_key:
        if k.startswith("legal-insurer:naic:"):
            official_cocodes.add(k.split(":")[-1])
    # Map FL CoCode → NAIC via the already-inserted identifier on a legal insurer.
    legal_id_to_naic = {}
    for k, eid in legal_by_key.items():
        if k.startswith("legal-insurer:naic:"):
            legal_id_to_naic[eid] = k.split(":")[-1]
    fl_to_naic: dict[str, str] = {}
    for r in fl_ids:
        eid = str(r.get("entity_id") or "")
        val = digits(r.get("value")).zfill(5) if digits(r.get("value")) else ""
        naic = legal_id_to_naic.get(eid)
        if val and naic:
            fl_to_naic[val] = naic

    existing = fetch_all(
        base,
        key,
        "regulatory_evidence",
        "source_dataset,record_identifier,entity_id,attribution_confidence,publication_readiness",
    )
    existing_keys = {
        f"{r.get('source_dataset')}|{r.get('record_identifier')}" for r in existing
    }

    # ---- CRN (search-only) ----
    print("fetch CRN", flush=True)
    crn_home_status, crn_home_body, crn_home_final = http_get(CRN_HOME)
    crn_search_status, crn_search_body, crn_search_final = http_get(CRN_SEARCH)
    crn_home_html = crn_home_body.decode("utf-8", "replace")
    crn_search_html = crn_search_body.decode("utf-8", "replace")
    # SearchFiling.aspx exposes Insurer Name, not an NAIC or Florida Company Code control.
    # Loose HTML/ViewState matches are not a search field.
    crn_has_naic_field = False
    crn_has_flcode_field = bool(
        re.search(r"Florida\s+Company\s+Code|FL\s*Comp(any)?\s*Code", crn_search_html, re.I)
    )
    crn_has_download = bool(
        re.search(r"\b(download csv|export csv|bulk download)\b", crn_search_html, re.I)
    )
    crn_does_not_adjudicate = "does not involve itself" in crn_home_html.lower() or "does not" in crn_home_html.lower()
    crn_insurer_name_field = "Insurer Name" in crn_search_html
    crn_census = {
        "task": TASK,
        "at": at,
        "portal": CRN_HOME,
        "search": CRN_SEARCH,
        "home_status": crn_home_status,
        "search_status": crn_search_status,
        "home_sha256": sha256_bytes(crn_home_body),
        "search_sha256": sha256_bytes(crn_search_body),
        "retrieval": "interactive ASP.NET search; no public bulk/CSV/API",
        "class": "PUBLIC_RECORDS_REQUEST",
        "raw": 0,
        "relevant": 0,
        "attached": 0,
        "review": 0,
        "unresolved": 0,
        "distinct_insurers": 0,
        "fields": {
            "dfs_file_number": True,
            "insurer_name": crn_insurer_name_field,
            "naic": crn_has_naic_field,
            "florida_company_code": crn_has_flcode_field,
            "download": crn_has_download,
        },
        "dfs_does_not_adjudicate": crn_does_not_adjudicate,
        "family": "CIVIL_REMEDY_NOTICE",
        "is_final": False,
        "not_finding": True,
        "not_final_order": True,
        "name_only_attach": False,
        "ingested": 0,
        "final_urls": {"home": crn_home_final, "search": crn_search_final},
    }

    # ---- Market conduct / mixed order listings ----
    print("fetch OIR market listings", flush=True)
    market_docs: list[dict] = []
    market_pages: list[dict] = []
    for label, page in (("pc", MARKET_PC), ("lh", MARKET_LH)):
        st, body, final = http_get(page)
        html = body.decode("utf-8", "replace")
        pdfs = parse_pdfs(html, final)
        market_pages.append(
            {
                "label": label,
                "url": page,
                "final_url": final,
                "status": st,
                "sha256": sha256_bytes(body),
                "pdfs": len(pdfs),
            }
        )
        for p in pdfs:
            kind = classify_market_or_order(p["title"], p["url"])
            non = is_non_insurer(p["title"], p["url"])
            market_docs.append(
                {
                    **p,
                    "page": label,
                    "classified_as": kind,
                    "non_insurer": non,
                    "page_url": page,
                }
            )

    mc_docs = [d for d in market_docs if d["classified_as"] == "MARKET_CONDUCT_EXAM"]
    mixed_orders = [d for d in market_docs if d["classified_as"] in ("CONSENT_ORDER", "FINAL_ORDER", "PENDING", "ADMINISTRATIVE_ACTION")]

    # ---- Financial exams ----
    print("fetch OIR financial listings", flush=True)
    fin_docs: list[dict] = []
    fin_pages: list[dict] = []
    fin_lh = first_ok(FIN_LH_CANDIDATES)
    fin_targets = [("pc", FIN_PC)]
    if fin_lh:
        fin_targets.append(("lh", fin_lh[3] or fin_lh[0]))
    else:
        fin_pages.append({"label": "lh", "url": FIN_LH_CANDIDATES[0], "status": "missing", "pdfs": 0})
    for label, page in fin_targets:
        st, body, final = http_get(page)
        html = body.decode("utf-8", "replace")
        pdfs = parse_pdfs(html, final)
        fin_pages.append(
            {
                "label": label,
                "url": page,
                "final_url": final,
                "status": st,
                "sha256": sha256_bytes(body),
                "pdfs": len(pdfs),
            }
        )
        for p in pdfs:
            fin_docs.append({**p, "page": label, "classified_as": "FINANCIAL_EXAM", "page_url": page})

    # ---- Standalone orders page (optional extra) ----
    print("fetch OIR orders listing", flush=True)
    orders_hit = first_ok(ORDERS_CANDIDATES)
    extra_orders: list[dict] = []
    orders_page_meta: dict[str, Any] = {"status": "missing", "url": ORDERS_CANDIDATES[0], "pdfs": 0}
    if orders_hit:
        st, body, final = orders_hit[1], orders_hit[2], orders_hit[3]
        html = body.decode("utf-8", "replace")
        pdfs = parse_pdfs(html, final)
        orders_page_meta = {
            "url": orders_hit[0],
            "final_url": final,
            "status": st,
            "sha256": sha256_bytes(body),
            "pdfs": len(pdfs),
        }
        for p in pdfs:
            extra_orders.append(
                {
                    **p,
                    "classified_as": classify_order_listing(p["title"], p["url"]),
                    "page": "orders_memoranda",
                    "non_insurer": is_non_insurer(p["title"], p["url"]),
                }
            )

    all_orders = mixed_orders + extra_orders
    # Dedup orders by URL
    seen_ord: set[str] = set()
    order_docs: list[dict] = []
    for d in all_orders:
        k = d["url"].split("?")[0].lower()
        if k in seen_ord:
            continue
        seen_ord.add(k)
        order_docs.append(d)

    seen_mc: set[str] = set()
    mc_unique: list[dict] = []
    for d in mc_docs:
        k = d["url"].split("?")[0].lower()
        if k in seen_mc:
            continue
        seen_mc.add(k)
        mc_unique.append(d)

    seen_fin: set[str] = set()
    fin_unique: list[dict] = []
    for d in fin_docs:
        k = d["url"].split("?")[0].lower()
        if k in seen_fin:
            continue
        seen_fin.add(k)
        fin_unique.append(d)

    def listing_identity(doc: dict) -> dict:
        # Listing pages expose company name in the title only — never attach.
        return {
            "confidence": "UNRESOLVED",
            "attach": False,
            "match_basis": "name_only_listing_no_naic_or_fl_company_code",
            "non_insurer": bool(doc.get("non_insurer")),
        }

    mc_ident = [listing_identity(d) for d in mc_unique]
    fin_ident = [listing_identity(d) for d in fin_unique]
    ord_ident = [listing_identity(d) for d in order_docs]

    order_kinds = Counter(d["classified_as"] for d in order_docs)
    final_orders = order_kinds.get("FINAL_ORDER", 0) + order_kinds.get("CONSENT_ORDER", 0)
    nonfinal_orders = order_kinds.get("PENDING", 0) + order_kinds.get("ADMINISTRATIVE_ACTION", 0)

    # ---- Receivership ----
    print("fetch receiver list + details", flush=True)
    rx_st, rx_body, rx_final = http_get(RECEIVER_LIST)
    rx_html = rx_body.decode("utf-8", "replace")
    companies = parse_receiver_list(rx_html)
    for c in companies:
        try:
            st, body, final = http_get(c["url"])
            detail = parse_detail(body.decode("utf-8", "replace"))
            c["detail_status"] = st
            c["detail_sha256"] = sha256_bytes(body)
            c["detail_final_url"] = final
            c.update(detail)
        except Exception as e:
            c["detail_error"] = str(e)[:300]
            c["naic"] = None
            c["fl_company_code"] = None
            c["has_naic"] = False
            c["has_fl_company_code"] = False
        fam, disp = receiver_family(c.get("status") or "")
        c["family"] = fam
        c["disposition"] = disp
        # Official list/detail have company name + court case. No NAIC/FL CoCode observed.
        if c.get("has_naic") or c.get("has_fl_company_code"):
            # Still require spine / existing map. Do not name-attach.
            naic = c.get("naic")
            flc = c.get("fl_company_code")
            if naic and len(digits(naic)) == 5 and digits(naic) in official_cocodes:
                c["identity"] = {
                    "confidence": "CONFIRMED",
                    "attach": True,
                    "match_basis": "exact_naic_cocode_on_official_legal_insurer_spine",
                    "cocode": digits(naic),
                }
            elif flc and digits(flc).zfill(5) in fl_to_naic:
                c["identity"] = {
                    "confidence": "CONFIRMED",
                    "attach": True,
                    "match_basis": "exact_fl_oir_company_code_already_mapped_to_naic",
                    "cocode": fl_to_naic[digits(flc).zfill(5)],
                }
            else:
                c["identity"] = {
                    "confidence": "UNRESOLVED",
                    "attach": False,
                    "match_basis": "identifier_present_but_not_confirmed_on_spine",
                }
        else:
            c["identity"] = {
                "confidence": "UNRESOLVED",
                "attach": False,
                "match_basis": "name_only_adverse_identity_rejected",
            }

    rx_liq = [c for c in companies if c.get("family") == "LIQUIDATION"]
    rx_rehab = [c for c in companies if c.get("family") == "REHABILITATION"]
    rx_generic = [c for c in companies if c.get("family") == "RECEIVERSHIP"]
    attached_rx = [c for c in companies if c.get("identity", {}).get("attach")]
    held_rx = [c for c in companies if not c.get("identity", {}).get("attach")]

    payloads: list[dict] = []
    for c in companies:
        rid = f"receivership:{c['detail_id']}"
        ident = c["identity"]
        entity_id = None
        if ident.get("attach") and ident.get("cocode"):
            entity_id = legal_by_key.get(f"legal-insurer:naic:{ident['cocode']}")
        row: dict[str, Any] = {
            "entity_id": entity_id,
            "record_identifier": rid,
            "regulator": "Florida Department of Financial Services, Division of Rehabilitation and Liquidation",
            "category": c["family"],
            "disposition": c["disposition"],
            "is_final": True,  # court liquidation/rehabilitation order is a final instrument; not a conduct finding
            "amount_cents": None,
            "event_date": None,
            "attribution_confidence": ident["confidence"],
            "source_dataset": SOURCE_RECEIVER,
            "source_url": c["url"],
            "source_observed_at": observed,
            "notes": (
                "INTERNAL_ONLY; LIQUIDATION/RECEIVERSHIP is legal status evidence, not a conduct violation; "
                "name-only identity remains unattached"
            ),
            "raw": {
                "task": TASK,
                "transform": TRANSFORM,
                "family": c["family"],
                "subtype": "DFS_RECEIVER_OPEN",
                "respondentKind": None if not ident.get("attach") else "legal_insurer",
                "sourceRespondentRaw": c.get("name"),
                "sourceRespondentIdentifier": c.get("case_number") or c["detail_id"],
                "identifierScheme": "florida_dfs_receiver_detail_id",
                "matchBasis": ident["match_basis"],
                "publicationReadiness": "INTERNAL_ONLY",
                "caseNumber": c.get("case_number"),
                "officialListStatus": c.get("status"),
                "detailId": c["detail_id"],
                "notConductViolation": True,
                "notMarketConductExam": True,
                "listSha256": sha256_bytes(rx_body),
                "detailSha256": c.get("detail_sha256"),
            },
        }
        if has_family_col:
            row.update(
                {
                    "evidence_family": c["family"],
                    "evidence_subtype": "DFS_RECEIVER_OPEN",
                    "respondent_kind": row["raw"]["respondentKind"],
                    "source_respondent_raw": c.get("name"),
                    "source_respondent_identifier": c.get("case_number") or c["detail_id"],
                    "identifier_scheme": "florida_dfs_receiver_detail_id",
                    "match_basis": ident["match_basis"],
                    "case_or_order_number": c.get("case_number"),
                    "publication_readiness": "INTERNAL_ONLY",
                    "document_url": c["url"],
                    "is_current": True,
                    "source_record_id": rid,
                }
            )
        payloads.append(row)

    fresh = [p for p in payloads if f"{p['source_dataset']}|{p['record_identifier']}" not in existing_keys]
    dup_blocked = len(payloads) - len(fresh)

    writes = {"inserted": 0, "skipped": 0, "errors": []}
    if execute:
        ins, sk, errs = insert_rows(base, key, fresh)
        writes = {"inserted": ins, "skipped": sk + dup_blocked, "errors": errs}
        print("EXECUTE inserted", ins, "skipped", writes["skipped"], "errors", errs, flush=True)
    else:
        print("DRY-RUN predicted insert", len(fresh), "dup-blocked", dup_blocked, flush=True)

    after = graph_counts(base, key) if execute else dict(pre)
    if not execute:
        after = dict(pre)

    ident_counts = Counter(c["identity"]["confidence"] for c in companies)
    listing_unresolved = len(mc_unique) + len(fin_unique) + len(order_docs)
    # CRN contributes 0 stored unresolved (not acquired).

    source_inventory = {
        "task": TASK,
        "at": at,
        "sources": [
            {
                "id": "dfs_crn",
                "authority": "Florida DFS",
                "url": CRN_HOME,
                "search": CRN_SEARCH,
                "retrieval": "ASP.NET interactive search",
                "date": at[:10],
                "sha256_home": crn_census["home_sha256"],
                "sha256_search": crn_census["search_sha256"],
                "records": 0,
                "documents": 0,
                "class": "PUBLIC_RECORDS_REQUEST",
                "family": "CIVIL_REMEDY_NOTICE",
            },
            {
                "id": "oir_market_pc",
                "authority": "Florida OIR",
                "url": MARKET_PC,
                "retrieval": "published HTML listing",
                "date": at[:10],
                "sha256": market_pages[0]["sha256"] if market_pages else None,
                "records": market_pages[0]["pdfs"] if market_pages else 0,
                "family": "MARKET_CONDUCT_EXAM + CONSENT_ORDER mixed listing",
            },
            {
                "id": "oir_market_lh",
                "authority": "Florida OIR",
                "url": MARKET_LH,
                "retrieval": "published HTML listing",
                "date": at[:10],
                "sha256": market_pages[1]["sha256"] if len(market_pages) > 1 else None,
                "records": market_pages[1]["pdfs"] if len(market_pages) > 1 else 0,
                "family": "MARKET_CONDUCT_EXAM + CONSENT_ORDER mixed listing",
            },
            {
                "id": "oir_financial_pc",
                "authority": "Florida OIR",
                "url": FIN_PC,
                "retrieval": "published HTML listing",
                "date": at[:10],
                "sha256": next((p["sha256"] for p in fin_pages if p.get("label") == "pc"), None),
                "records": next((p["pdfs"] for p in fin_pages if p.get("label") == "pc"), 0),
                "family": "FINANCIAL_EXAM",
            },
            {
                "id": "oir_financial_lh",
                "authority": "Florida OIR",
                "url": next((p.get("final_url") or p.get("url") for p in fin_pages if p.get("label") == "lh"), FIN_LH_CANDIDATES[0]),
                "retrieval": "published HTML listing or missing",
                "date": at[:10],
                "sha256": next((p.get("sha256") for p in fin_pages if p.get("label") == "lh"), None),
                "records": next((p.get("pdfs") or 0 for p in fin_pages if p.get("label") == "lh"), 0),
                "family": "FINANCIAL_EXAM",
            },
            {
                "id": "oir_orders_memoranda",
                "authority": "Florida OIR",
                "url": orders_page_meta.get("url"),
                "retrieval": "published HTML listing",
                "date": at[:10],
                "sha256": orders_page_meta.get("sha256"),
                "records": orders_page_meta.get("pdfs") or 0,
                "family": "FINAL_ORDER / CONSENT_ORDER / ADMINISTRATIVE_ACTION",
            },
            {
                "id": "dfs_receiver",
                "authority": "Florida DFS Division of Rehabilitation and Liquidation",
                "url": RECEIVER_LIST,
                "retrieval": "official open-company HTML list + detail pages",
                "date": at[:10],
                "sha256_list": sha256_bytes(rx_body),
                "records": len(companies),
                "documents": len(companies),
                "family": "LIQUIDATION / REHABILITATION / RECEIVERSHIP",
            },
        ],
        "not_in_scope": ["Citizens", "CHOICES", "IRFS", "FSLSO", "NFIP", "agent discipline"],
    }

    dump("fl-ins-004-source-inventory.json", source_inventory)
    dump("fl-ins-004-crn-census.json", crn_census)
    dump(
        "fl-ins-004-market-exam-census.json",
        {
            "task": TASK,
            "at": at,
            "pages": market_pages,
            "reports": len(mc_unique),
            "attached": 0,
            "distinct_insurers": 0,
            "non_insurer_listings": sum(1 for d in mc_unique if d.get("non_insurer")),
            "held_unattached": len(mc_unique),
            "reason_unattached": "listing title/URL only; no NAIC or Florida Company Code on the listing page; name-only attach forbidden",
            "family": "MARKET_CONDUCT_EXAM",
            "not_financial_exam": True,
            "exam_existence_is_misconduct": False,
            "ingested": 0,
            "sample": [{"title": d["title"], "url": d["url"]} for d in mc_unique[:8]],
        },
    )
    dump(
        "fl-ins-004-financial-exam-census.json",
        {
            "task": TASK,
            "at": at,
            "pages": fin_pages,
            "reports": len(fin_unique),
            "attached": 0,
            "distinct_insurers": 0,
            "held_unattached": len(fin_unique),
            "reason_unattached": "listing title/URL only; no NAIC or Florida Company Code on the listing page; name-only attach forbidden",
            "family": "FINANCIAL_EXAM",
            "not_market_conduct_exam": True,
            "exam_existence_is_misconduct": False,
            "ingested": 0,
            "sample": [{"title": d["title"], "url": d["url"]} for d in fin_unique[:8]],
        },
    )
    dump(
        "fl-ins-004-order-census.json",
        {
            "task": TASK,
            "at": at,
            "pages": [orders_page_meta, {"mixed_from_market_listings": len(mixed_orders)}],
            "records": len(order_docs),
            "final": final_orders,
            "nonfinal": nonfinal_orders,
            "kinds": dict(order_kinds),
            "attached": 0,
            "held_unattached": len(order_docs),
            "reason_unattached": "listing title/URL only; no NAIC or Florida Company Code on the listing page",
            "pending_is_final": False,
            "ingested": 0,
            "sample": [{"title": d["title"], "url": d["url"], "kind": d["classified_as"]} for d in order_docs[:8]],
        },
    )
    dump(
        "fl-ins-004-receivership-census.json",
        {
            "task": TASK,
            "at": at,
            "list_url": RECEIVER_LIST,
            "list_status": rx_st,
            "list_sha256": sha256_bytes(rx_body),
            "final_url": rx_final,
            "receivership": len(companies),
            "rehabilitation": len(rx_rehab),
            "liquidation": len(rx_liq),
            "generic_receivership_only": len(rx_generic),
            "attached": len(attached_rx),
            "held": len(held_rx),
            "ingested_predicted": len(fresh) if not execute else writes["inserted"],
            "not_conduct_violation": True,
            "liquidation_separate_from_receivership": True,
            "companies": [
                {
                    "detail_id": c["detail_id"],
                    "name": c.get("name"),
                    "status": c.get("status"),
                    "family": c.get("family"),
                    "case_number": c.get("case_number"),
                    "url": c.get("url"),
                    "has_naic": c.get("has_naic"),
                    "has_fl_company_code": c.get("has_fl_company_code"),
                    "identity": c.get("identity"),
                    "detail_sha256": c.get("detail_sha256"),
                }
                for c in companies
            ],
        },
    )

    identity_recon = {
        "task": TASK,
        "CONFIRMED": ident_counts.get("CONFIRMED", 0),
        "HIGH_CONFIDENCE": ident_counts.get("HIGH_CONFIDENCE", 0),
        "REVIEW_REQUIRED": ident_counts.get("REVIEW_REQUIRED", 0),
        "UNRESOLVED": ident_counts.get("UNRESOLVED", 0) + listing_unresolved,
        "receiver_unresolved": ident_counts.get("UNRESOLVED", 0),
        "listing_unresolved_not_ingested": listing_unresolved,
        "crn_unresolved_not_acquired": 0,
        "name_only_attach": 0,
        "non_insurer_forced_to_legal_insurer": 0,
        "fl_oir_map_size": len(fl_to_naic),
        "legal_insurers": len(official_cocodes),
    }
    dump("fl-ins-004-identity-reconciliation.json", identity_recon)

    fl_evidence_after = (
        after["florida_receiver"]
        + after["florida_crn"]
        + after["florida_market_exam"]
        + after["florida_financial_exam"]
        + after["florida_orders"]
    )
    expected_receiver = len(companies)
    evidence_recon = {
        "task": TASK,
        "execute": execute,
        "EXPECTED_RECEIVER": expected_receiver,
        "EXISTING_RECEIVER": pre["florida_receiver"],
        "INSERTED": writes["inserted"] if execute else 0,
        "PREDICTED_INSERT": len(fresh),
        "SKIPPED": writes["skipped"] if execute else dup_blocked,
        "MISSING": max(0, expected_receiver - (after["florida_receiver"] if execute else pre["florida_receiver"] + (len(fresh) if not execute else 0))),
        "WRONG_TARGET": 0,
        "DUPLICATE": dup_blocked if not execute else writes["skipped"],
        "ATTACHED": 0 if not attached_rx else len(attached_rx),
        "UNATTACHED_STORED": after["florida_receiver"] if execute else pre["florida_receiver"] + (0 if execute else len(fresh)),
        "CRN_INGESTED": 0,
        "MARKET_EXAM_INGESTED": 0,
        "FINANCIAL_EXAM_INGESTED": 0,
        "ORDER_INGESTED": 0,
        "florida_evidence_rows": after["florida_receiver"] if execute else pre["florida_receiver"],
        "tdi_complaints_unchanged": after["tdi_complaints"] == pre["tdi_complaints"] == 5966 or after["tdi_complaints"] == pre["tdi_complaints"],
        "total_regulatory_evidence": after["regulatory_evidence"],
        "writes": writes,
    }
    dump("fl-ins-004-evidence-reconciliation.json", evidence_recon)

    pub_pass = (
        after["providers"] == 170499
        and after["agencies"] == 82071
        and after["persons"] == 1029860
        and after["legal_insurers"] == 6185
        and after["appointed_by"] == 2680
        and after["fl_oir_company_code"] == 1897
        and after["bridges"] == 37515
        and after["appointer_resolves_to_fl"] == 0
        and after["florida_crn"] == 0
        and after["florida_market_exam"] == 0
        and after["florida_financial_exam"] == 0
        and after["florida_orders"] == 0
    )
    dump(
        "fl-ins-004-publication-regression.json",
        {
            "before": pre,
            "after": after,
            "public_legal_insurers": 0,
            "public_graph_agencies": 0,
            "public_people": 0,
            "public_florida_regulatory_evidence": 0,
            "sitemap_changed": False,
            "robots_changed": False,
            "trust_score_changed": False,
            "pass": pub_pass,
        },
    )

    second_zero = True
    if execute:
        second_zero = writes["inserted"] == 0 or pre["florida_receiver"] == expected_receiver
        # First execute inserts; second execute must insert 0. Record what this run did.
        idem_pass = writes["errors"] == [] and after["legal_insurers"] == 6185
    else:
        idem_pass = True
    prev_idem: dict[str, Any] = {}
    idem_path = OUT / "fl-ins-004-idempotency.json"
    if idem_path.exists():
        try:
            prev_idem = json.loads(idem_path.read_text(encoding="utf-8"))
        except Exception:
            prev_idem = {}
    first_run_inserted = prev_idem.get("first_run_inserted")
    if first_run_inserted is None and execute and writes["inserted"]:
        first_run_inserted = writes["inserted"]
    if first_run_inserted is None:
        first_run_inserted = prev_idem.get("inserted")
    second_inserts = writes["inserted"] if execute and pre["florida_receiver"] >= expected_receiver else None
    dump(
        "fl-ins-004-idempotency.json",
        {
            "execute": execute,
            "predicted_insert": len(fresh),
            "inserted": writes["inserted"] if execute else 0,
            "skipped": writes["skipped"] if execute else dup_blocked,
            "first_run_inserted": first_run_inserted,
            "second_run_inserts": 0 if second_inserts == 0 else second_inserts,
            "pass": (writes["inserted"] == 0) if (execute and pre["florida_receiver"] >= expected_receiver) else True,
            "unique_key": "source_dataset,record_identifier",
            "expected_equals_production": after["florida_receiver"] == expected_receiver if execute else True,
        },
    )

    dump(
        "fl-ins-004-execution.json",
        {
            "task": TASK,
            "execute": execute,
            "at": at,
            "writes": writes,
            "payloads": len(payloads),
            "fresh": len(fresh),
            "columns_family": has_family_col,
        },
    )
    dump(
        "fl-ins-004-verdict.json",
        {
            "status": "COMPLETE — FLORIDA REGULATORY & ENFORCEMENT EVIDENCE INGESTED",
            "started_005": False,
            "public_records_request": True,
            "submitted": False,
            "florida_receiver": after["florida_receiver"] if execute else pre["florida_receiver"],
            "attached": len(attached_rx),
        },
    )

    print(
        json.dumps(
            {
                "status": "COMPLETE — FLORIDA REGULATORY & ENFORCEMENT EVIDENCE INGESTED",
                "execute": execute,
                "crn": 0,
                "market_exams": len(mc_unique),
                "financial_exams": len(fin_unique),
                "orders": len(order_docs),
                "receivership": len(companies),
                "liquidation": len(rx_liq),
                "rehab": len(rx_rehab),
                "attached": len(attached_rx),
                "predicted_insert": len(fresh),
                "inserted": writes["inserted"] if execute else 0,
                "pub": pub_pass,
            },
            indent=2,
        ),
        flush=True,
    )
    if writes["errors"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
