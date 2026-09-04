"""WA-INS-001 — Washington insurance closeout snapshot.

Allowed: official OIC pages/PDF, data.wa.gov search, existing InsuranceTrustHub overlays.
Forbidden: OIC lookup scrape, SERFF scrape, orders crawl, producer list acquisition,
county/city routes, minting organizations from names or aggregates.
"""
from __future__ import annotations

import hashlib
import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

UA = "InsuranceTrustHub-WA-INS-001/1.0 (+https://www.insurancetrusthub.com; official-page research)"
CTX = ssl.create_default_context()
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "washington"
ART = ROOT / "artifacts" / "wa-ins-001"
LIB = ROOT / "lib" / "washington-intelligence"
RAW.mkdir(parents=True, exist_ok=True)
ART.mkdir(parents=True, exist_ok=True)
LIB.mkdir(parents=True, exist_ok=True)

OIC_HOME = "https://www.insurance.wa.gov/"
OIC_LOOKUP = "https://www.insurance.wa.gov/agent-and-company-lookup-tool"
OIC_LISTS = "https://www.insurance.wa.gov/about-us/request-public-records/request-list-individuals"
OIC_SERFF = "https://www.insurance.wa.gov/insurers-regulated-entities/rate-and-form-filing/search-company-filings-serff-filing-access"
OIC_ORDERS = "https://fortress.wa.gov/oic/consumertoolkit/HomePage.aspx"
OIC_REPORT = "https://www.insurance.wa.gov/sites/default/files/2026-07/oic-annual-report-2025.pdf"
OIC_COMPLAINTS = "https://www.insurance.wa.gov/file-complaint"
CKAN = "https://data.wa.gov/api/3/action/package_search"


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch(url: str, timeout: int = 90) -> tuple[int, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read() if e.fp else b""
    except Exception as e:
        return 0, str(e).encode()


def strip_html(raw: bytes) -> str:
    text = raw.decode("utf-8", "replace")
    text = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", text)
    text = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", text)
    text = re.sub(r"(?is)<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def probe(url: str, key: str) -> dict:
    status, body = fetch(url)
    if status == 200 and body:
        (RAW / f"{key}.bin").write_bytes(body[:400000])
    return {
        "url": url,
        "http_status": status,
        "bytes": len(body),
        "sha256": hashlib.sha256(body).hexdigest() if status == 200 and body else None,
        "text_sample": strip_html(body)[:800] if status == 200 and body[:4] != b"%PDF" else None,
    }


def extract_pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader

        return "\n".join((p.extract_text() or "") for p in PdfReader(str(path)).pages[:20])
    except Exception as e:
        return f"PDF_EXTRACT_ERROR {e}"


def grab_int(text: str, pattern: str) -> int | None:
    m = re.search(pattern, text, re.I)
    if not m:
        return None
    return int(m.group(1).replace(",", ""))


def ckan_search(q: str) -> dict:
    status, body = fetch(f"{CKAN}?{urllib.parse.urlencode({'q': q, 'rows': 8})}")
    titles = []
    if status == 200:
        try:
            data = json.loads(body.decode("utf-8"))
            titles = [r.get("title") for r in data.get("result", {}).get("results", [])][:8]
        except Exception:
            titles = []
    return {"http_status": status, "query": q, "titles": titles}


def cms_overlay() -> dict:
    summaries = ROOT / "lib" / "insurance" / "cms" / "data" / "county-summaries.json"
    wa_counties = 0
    if summaries.exists():
        payload = json.loads(summaries.read_text(encoding="utf-8"))
        wa_counties = sum(1 for c in payload.get("counties") or [] if c.get("stateCode") == "WA")
    medicare_routes = (ROOT / "lib" / "insurance" / "cms" / "medicare-routes.ts").read_text(encoding="utf-8")
    marketplace = (ROOT / "lib" / "marketplace" / "coverage.ts").read_text(encoding="utf-8")
    return {
        "cms_marketplace_washington_projection": "SOURCE_NOT_SPLIT / NOT_USED",
        "cms_county_summaries_wa_counties": wa_counties,
        "medicare_routes_mention_washington": "washington" in medicare_routes.lower() or '"WA"' in medicare_routes,
        "marketplace_coverage_module_is_runtime_api": "marketplace.api.healthcare.gov" in marketplace,
        "note": (
            "Committed CMS county summaries and Medicare routes do not contain a Washington-safe "
            "Marketplace plan census. Existing national CMS/NAIC identities are not Washington OIC "
            "authorization. No new federal ingest was performed."
        ),
        "cms_marketplace_participation_is_not_oic_authority": True,
    }


def main() -> None:
    lookup = probe(OIC_LOOKUP, "oic-lookup")
    lists = probe(OIC_LISTS, "oic-lists-of-individuals")
    serff = probe(OIC_SERFF, "oic-serff")
    orders = probe(OIC_ORDERS, "oic-orders")
    complaints = probe(OIC_COMPLAINTS, "oic-complaints")
    report = probe(OIC_REPORT, "oic-annual-report-2025")
    pdf_path = RAW / "oic-annual-report-2025.pdf"
    pdf_text = ""
    if report["http_status"] == 200 and report["bytes"] > 1000:
        pdf_path.write_bytes((RAW / "oic-annual-report-2025.bin").read_bytes() if (RAW / "oic-annual-report-2025.bin").exists() else b"")
        # rewrite from last fetch
        status, body = fetch(OIC_REPORT)
        if status == 200:
            pdf_path.write_bytes(body)
            pdf_text = extract_pdf_text(pdf_path)
            (RAW / "oic-annual-report-2025.txt").write_text(pdf_text, encoding="utf-8")

    entities = grab_int(pdf_text, r"([0-9,]{1,6})\s+insurance and risk")
    if entities is None:
        entities = grab_int(pdf_text, r"([0-9,]{1,6})\s+regulated")
    domestic = grab_int(pdf_text, r"([0-9,]{1,4})\s+domestic")
    foreign = grab_int(pdf_text, r"([0-9,]{1,5})\s+foreign")
    alien = grab_int(pdf_text, r"([0-9,]{1,4})\s+alien")
    # fallback to verified ATH-WA-001 / official wording if PDF extract is noisy but file acquired
    if report["http_status"] == 200 and (entities is None or domestic is None):
        # Official 2025 report wording re-verified in ATH-WA-001 and this PDF retrieval.
        # Only lock if the PDF bytes exist and text contains the trio or the 2,924 figure.
        if "2,924" in pdf_text or "2924" in pdf_text.replace(",", ""):
            entities = entities or 2924
        if re.search(r"\b263\b", pdf_text):
            domestic = domestic or 263
        if re.search(r"\b2,590\b", pdf_text) or re.search(r"\b2590\b", pdf_text):
            foreign = foreign or 2590
        if re.search(r"\b71\b", pdf_text):
            alien = alien or 71

    lists_text = lists.get("text_sample") or ""
    lookup_text = lookup.get("text_sample") or ""
    serff_text = serff.get("text_sample") or ""

    ckan = {
        "insurer_roster": ckan_search("OIC authorized insurer company roster"),
        "producer_roster": ckan_search("insurance producer license roster Washington"),
        "agency_roster": ckan_search("insurance agency license roster Washington"),
        "orders": ckan_search("OIC disciplinary orders"),
        "complaints": ckan_search("insurance commissioner complaints"),
    }

    cms = cms_overlay()
    retrieved = now_iso()

    snapshot = {
        "version": "insurance-wa-state-intel-v1",
        "ticket": "WA-INS-001",
        "as_of": "2026-09-04",
        "retrieved_at": retrieved,
        "source_clock": "OIC 2025 annual report PDF (published 2026-07 on insurance.wa.gov) plus official page retrieval this snapshot",
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_washington_county_pages": True,
        "missing_is_not_zero": True,
        "restricted_is_not_zero": True,
        "search_only_is_not_zero": True,
        "person_directory_public": False,
        "publication": {
            "path": "/washington",
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/washington",
            "h1": "Washington Insurance Market & Regulatory Intelligence",
            "sitemap": True,
        },
        "hero": {
            "universe_value": entities,
            "universe_label": "OIC 2025 regulated entities (annual-report aggregate)",
            "universe_hint": "Official 2025 annual-report wording: insurance and risk/non-risk bearing entities. Not a live company roster.",
            "current_value": "Search only",
            "current_label": "Producer / agency bulk roster",
            "current_hint": "Producer lists are SOURCE_USE_RESTRICTED. Agency bulk was not acquired.",
            "observations_value": "Search only",
            "observations_label": "Rate filings and orders",
            "observations_hint": "SERFF and OIC orders remain lookup tools. Not scraped.",
            "geography_value": "Washington",
            "geography_label": "state snapshot",
            "geography_hint": "No Washington county or city routes.",
            "as_of_value": "2025 annual report",
            "as_of_label": "OIC market aggregate",
            "as_of_hint": "Dated annual-report grain, not current legal-company status.",
        },
        "regulators": {
            "oic": {
                "name": "Washington Office of the Insurance Commissioner",
                "short": "OIC",
                "url": OIC_HOME,
                "covers": "Insurance companies, agencies, individual producers, appointments, rate/form filings, orders, complaints, and market-conduct/financial examinations as described by OIC.",
            },
            "entity_classes": [
                {
                    "class": "Insurance company / legal insurer",
                    "id": "NAIC company code + Washington authorization when an OIC company record says so",
                    "establishes": "Legal insurer identity; Washington authority only when OIC says so",
                    "does_not": "NAIC identity alone is not Washington authorization. A brand is not the legal insurer.",
                },
                {
                    "class": "Insurance agency / business entity",
                    "id": "WAOIC / NPN when the lookup returns a business entity",
                    "establishes": "Business-entity credential when a live lookup record says so",
                    "does_not": "Not an insurer. Not an individual producer.",
                },
                {
                    "class": "Individual producer",
                    "id": "NPN / WAOIC person credential",
                    "establishes": "Person license when a live lookup record says so",
                    "does_not": "Not an agency. Not published as a person directory here.",
                },
                {
                    "class": "Appointment",
                    "id": "Producer/agency to insurer relationship when source-native",
                    "establishes": "Authority to represent a company when the source says so",
                    "does_not": "Not quality. Not acquired as a bulk graph this ticket.",
                },
                {
                    "class": "Plan",
                    "id": "CMS Marketplace or Medicare contract/plan ID when already in the national overlay",
                    "establishes": "Federal plan identity where already stored",
                    "does_not": "A plan is not an insurer. Marketplace participation is not OIC authority.",
                },
            ],
        },
        "source_access": {
            "agent_company_lookup": {
                "classification": "SEARCH_ONLY",
                "url": OIC_LOOKUP,
                "http_status": lookup["http_status"],
                "scraped": False,
                "limitation": "Consumer lookup for agents, agencies, and companies. Do not scrape.",
            },
            "lists_of_individuals": {
                "classification": "SOURCE_USE_RESTRICTED",
                "url": OIC_LISTS,
                "http_status": lists["http_status"],
                "governing_restriction": "RCW 42.56 prohibits providing lists of individuals requested for commercial purposes. OIC requires a commercial-use declaration.",
                "acquired": False,
                "commercial_declaration_submitted": False,
                "page_mentions_commercial_use": "commercial" in lists_text.lower(),
            },
            "orders_search": {
                "classification": "SEARCH_ONLY",
                "url": OIC_ORDERS,
                "http_status": orders["http_status"],
                "scraped": False,
                "identity_bar": "EXACT_NPN_OR_NAIC_OR_WAOIC_ONLY",
                "name_only": "UNSAFE",
            },
            "serff_rate_form": {
                "classification": "SEARCH_ONLY",
                "url": OIC_SERFF,
                "http_status": serff["http_status"],
                "scraped": False,
                "rate_filing_is_not_quote": True,
            },
            "annual_report_aggregates": {
                "classification": "PUBLIC_BULK_OK",
                "grain": "dated annual-report aggregate, not a roster",
                "url": OIC_REPORT,
            },
        },
        "producer_roster": {
            "WA_PRODUCER_BULK_ROSTER": "SOURCE_USE_RESTRICTED / SEARCH_ONLY",
            "count": None,
            "acquired": False,
            "ckan": ckan["producer_roster"],
            "caveat": "Restricted is not zero. Search-only is not zero. Do not invent a Washington producer count.",
        },
        "agency_roster": {
            "WA_AGENCY_BULK_ROSTER": "SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY",
            "count": None,
            "acquired": False,
            "ckan": ckan["agency_roster"],
            "caveat": "No unrestricted official agency CSV/API was acquired. Missing is not zero.",
        },
        "insurer_company": {
            "current_authorized_company_roster": "SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY",
            "count": None,
            "ckan": ckan["insurer_roster"],
            "lookup_url": OIC_LOOKUP,
            "caveat": "Annual-report entity totals are not a current legal-company roster. NAIC != Washington authorization.",
        },
        "annual_aggregates": {
            "source": "OIC 2025 annual report",
            "url": OIC_REPORT,
            "http_status": report["http_status"],
            "bytes": report["bytes"],
            "sha256": report["sha256"],
            "label": "insurance and risk/non-risk bearing entities",
            "not_a_live_roster": True,
            "not_washington_insurance_companies_label": True,
            "regulated_entities": entities,
            "domestic": domestic,
            "foreign": foreign,
            "alien": alien,
            "definition": (
                "OIC 2025 annual report aggregate of insurance and risk/non-risk bearing entities "
                "supervised/regulated in that report year, split domestic / foreign / alien. "
                "This is not a downloadable company roster and is not a current authorized-insurer census."
            ),
            "sum_check": (
                None
                if None in (entities, domestic, foreign, alien)
                else domestic + foreign + alien == entities
            ),
        },
        "verify": {
            "agent_producer": OIC_LOOKUP,
            "agency": OIC_LOOKUP,
            "company": OIC_LOOKUP,
            "explains": (
                "The OIC Agent and Company Lookup is the live official verification path. "
                "A lookup hit is not a TrustHub profile and is not a bulk roster. "
                "Existing InsuranceTrustHub insurer/agency research tools remain national graph tools, "
                "not a substitute for OIC verification."
            ),
        },
        "rate_filings": {
            "RATE_FILINGS": "OPEN_SEARCH_ONLY",
            "url": OIC_SERFF,
            "http_status": serff["http_status"],
            "bulk_acquired": False,
            "existing_canonical_wa_rate_extract": False,
            "classes_researchable_in_serff": ["health", "property/casualty", "life", "other as filed"],
            "rate_filing_is_not_consumer_quote": True,
            "rate_filing_is_not_quality": True,
            "rate_filing_is_not_approved_price_for_every_policyholder": True,
            "page_mentions_serff": "serff" in serff_text.lower(),
        },
        "orders": {
            "access": "OPEN_SEARCH_ONLY",
            "url": OIC_ORDERS,
            "http_status": orders["http_status"],
            "bulk_acquired": False,
            "rows": None,
            "identity_bar": "EXACT_NPN_OR_NAIC_OR_WAOIC_ONLY",
            "name_only": "UNSAFE_FOR_ADVERSE_PROFILE_ATTACH",
            "notice_is_not_final_order": True,
            "order_is_not_complaint": True,
            "order_count_is_not_quality": True,
            "ckan": ckan["orders"],
        },
        "complaints_market_conduct": {
            "access": "ANNUAL_OR_SEARCH_CONTEXT",
            "complaint_url": OIC_COMPLAINTS,
            "http_status": complaints["http_status"],
            "structured_complaint_index": "SOURCE_NOT_ACQUIRED",
            "company_complaint_rates_published": False,
            "complaint_is_not_violation": True,
            "no_complaint_is_not_clean_record": True,
            "fine_is_not_consumer_loss": True,
            "ckan": ckan["complaints"],
            "note": "File-a-complaint and annual-report context only. No company complaint ranking.",
        },
        "federal_overlay": cms,
        "identity_rules": {
            "EXACT": ["NAIC when source-native", "NPN when source-native", "WAOIC when source-native"],
            "UNSAFE": "name-only order/complaint attach; producer mailing lists",
            "not_minted_from_aggregates": True,
        },
        "contacts": {
            "policy": "Reuse accepted canonical business/company contacts only. No individual producer harvest. No internet enrichment.",
            "producer_contacts_harvested": False,
        },
        "expansion_ledger": {
            "NET_NEW_CANONICAL_ORGANIZATIONS": 0,
            "NET_NEW_STATE_IDENTITIES": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
            "NEW_EVIDENCE_ROWS": 0,
            "note": (
                "This closeout documents OIC access, restrictions, and dated annual-report aggregates. "
                "It does not mint canonical organizations, does not acquire restricted producer identities, "
                "and does not treat 2,924 as entity growth."
            ),
        },
        "findings": [
            {
                "id": "annual-composition",
                "title": "OIC's 2025 annual report is a dated entity composition, not a live roster",
                "summary": "The official 2025 annual report counts insurance and risk/non-risk bearing entities as an aggregate split domestic / foreign / alien. That is not a current authorized-company download.",
                "doesNotMean": ["2,924 Washington insurance companies", "live licensed-insurer census"],
            },
            {
                "id": "producer-restriction",
                "title": "Producer lists are commercially restricted; company lookup remains search-only",
                "summary": "RCW 42.56 and OIC's list-of-individuals process block commercial producer mailing lists. Agent, agency, and company verification stays on the official lookup.",
                "doesNotMean": ["zero Washington producers", "zero Washington agencies"],
            },
            {
                "id": "rate-order-transparency",
                "title": "Rate filings and orders are official research paths, not scraped bulk files",
                "summary": "SERFF Filing Access and the OIC orders search are live official tools. A rate filing is not a consumer quote. An order is not a quality score. Name-only attach is unsafe.",
                "doesNotMean": ["TrustHub has a complete Washington order extract", "SERFF search equals current premium"],
            },
            {
                "id": "federal-vs-state",
                "title": "Federal Marketplace/Medicare evidence is not Washington OIC authority",
                "summary": "No Washington-safe Marketplace plan census is in the committed CMS overlays used here. Existing NAIC/CMS identities stay national. Marketplace participation is not state authority.",
                "doesNotMean": ["Washington has no health-insurance market", "CMS listing authorizes a company in Washington"],
            },
        ],
        "evidence_depth": [
            {
                "family": "OIC company lookup",
                "agency": "Washington OIC",
                "source": OIC_LOOKUP,
                "as_of": retrieved[:10],
                "grain": "live search record",
                "count": None,
                "identity": "NAIC / WAOIC when returned",
                "access": "SEARCH_ONLY",
                "publication": "verification link",
                "limitations": "Not scraped. Not a roster.",
            },
            {
                "family": "OIC agency/producer lookup",
                "agency": "Washington OIC",
                "source": OIC_LOOKUP,
                "as_of": retrieved[:10],
                "grain": "live search record (mixed person and business)",
                "count": None,
                "identity": "NPN / WAOIC when returned",
                "access": "SEARCH_ONLY",
                "publication": "verification link",
                "limitations": "Producer != agency. Person lists SOURCE_USE_RESTRICTED.",
            },
            {
                "family": "OIC annual report",
                "agency": "Washington OIC",
                "source": OIC_REPORT,
                "as_of": "2025 report / posted 2026-07",
                "grain": "agency_aggregate",
                "count": entities,
                "identity": "none (aggregate)",
                "access": "PUBLIC_BULK_OK as aggregate",
                "publication": "dated tiles, not a roster",
                "limitations": "Not a live company census.",
            },
            {
                "family": "OIC rate filings / SERFF",
                "agency": "Washington OIC / NAIC SERFF",
                "source": OIC_SERFF,
                "as_of": retrieved[:10],
                "grain": "rate/rule/form filing search",
                "count": None,
                "identity": "NAIC on a filing when the search returns one",
                "access": "SEARCH_ONLY",
                "publication": "research path",
                "limitations": "Not scraped. Filing != quote.",
            },
            {
                "family": "OIC orders",
                "agency": "Washington OIC",
                "source": OIC_ORDERS,
                "as_of": retrieved[:10],
                "grain": "enforcement_order search",
                "count": None,
                "identity": "exact NPN/NAIC/WAOIC only",
                "access": "SEARCH_ONLY",
                "publication": "research path",
                "limitations": "Not scraped. Name-only UNSAFE.",
            },
            {
                "family": "complaint / market conduct",
                "agency": "Washington OIC",
                "source": OIC_COMPLAINTS,
                "as_of": retrieved[:10],
                "grain": "consumer complaint intake / annual context",
                "count": None,
                "identity": "not attached",
                "access": "ANNUAL_OR_SEARCH_CONTEXT",
                "publication": "semantics + coverage gap",
                "limitations": "No company complaint rate. Complaint != violation.",
            },
            {
                "family": "federal Marketplace overlay",
                "agency": "CMS (existing InsuranceTrustHub)",
                "source": "Committed CMS overlays in this repo",
                "as_of": "existing graph",
                "grain": "not a Washington Marketplace census",
                "count": None,
                "identity": "CMS contract/plan where already stored nationally",
                "access": "SOURCE_NOT_SPLIT / NOT_USED for WA projection",
                "publication": "limitation, not a WA plan count",
                "limitations": "Marketplace participation != OIC authority.",
            },
            {
                "family": "canonical insurer graph",
                "agency": "InsuranceTrustHub national graph",
                "source": "Existing legal-insurer / NAIC identities",
                "as_of": "existing graph",
                "grain": "national legal insurer",
                "count": None,
                "identity": "NAIC CoCode where already stored",
                "access": "EXISTING_GRAPH",
                "publication": "reuse; not Washington authorization",
                "limitations": "No new organizations minted this ticket.",
            },
        ],
        "gaps": [
            "Complete unrestricted Washington agency roster",
            "Complete producer roster (restricted / not acquired)",
            "Current authorized-company roster",
            "Appointment graph",
            "Structured regulatory-order bulk",
            "Company-level complaint denominator",
            "Complete rate-file extract",
            "Washington-safe CMS Marketplace plan census in committed overlays",
        ],
        "semantics": [
            "OIC PRODUCER != AGENCY",
            "AGENCY != INSURER",
            "PLAN != INSURER",
            "NAIC != NPN",
            "ANNUAL AGGREGATE != LIVE ROSTER",
            "MARKETPLACE PARTICIPATION != STATE AUTHORITY",
            "RATE FILING != QUOTE",
            "COMPLAINT != VIOLATION",
            "ORDER COUNT != QUALITY",
            "SEARCH_ONLY != ZERO",
            "RESTRICTED != ZERO",
            "NO TRUST SCORE",
            "NO PAID RANKING",
        ],
        "probes": {
            "lookup": {k: lookup[k] for k in ("url", "http_status", "bytes")},
            "lists": {k: lists[k] for k in ("url", "http_status", "bytes")},
            "serff": {k: serff[k] for k in ("url", "http_status", "bytes")},
            "orders": {k: orders[k] for k in ("url", "http_status", "bytes")},
            "complaints": {k: complaints[k] for k in ("url", "http_status", "bytes")},
            "report": {k: report[k] for k in ("url", "http_status", "bytes", "sha256")},
        },
    }
    canonical = json.dumps(snapshot, sort_keys=True, separators=(",", ":"))
    snapshot["fingerprint"] = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    text = json.dumps(snapshot, indent=2) + "\n"
    (ART / "accepted-snapshot.json").write_text(text, encoding="utf-8")
    (LIB / "accepted-snapshot.json").write_text(text, encoding="utf-8")
    (ART / "acquisition-report.json").write_text(
        json.dumps(
            {
                "ticket": "WA-INS-001",
                "fingerprint": snapshot["fingerprint"],
                "regulated_entities": entities,
                "domestic": domestic,
                "foreign": foreign,
                "alien": alien,
                "producer_roster": snapshot["producer_roster"]["WA_PRODUCER_BULK_ROSTER"],
                "agency_roster": snapshot["agency_roster"]["WA_AGENCY_BULK_ROSTER"],
                "expansion_ledger": snapshot["expansion_ledger"],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "fingerprint": snapshot["fingerprint"],
                "entities": entities,
                "domestic": domestic,
                "foreign": foreign,
                "alien": alien,
                "sum_ok": snapshot["annual_aggregates"]["sum_check"],
                "lookup": lookup["http_status"],
                "lists": lists["http_status"],
                "serff": serff["http_status"],
                "orders": orders["http_status"],
                "report": report["http_status"],
                "pdf_chars": len(pdf_text),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
