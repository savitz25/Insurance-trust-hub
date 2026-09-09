"""CO-INS-001 — Colorado insurance state-intelligence snapshot.

Allowed: official Colorado DOI public files (2025 statistical report, surplus-lines
eligibility list, certificates-of-compliance index, verification/research paths).
Forbidden: Sircon/NIPR/SBS scrape, SERFF query-by-query scrape, CORA filing,
county/city routes, minting organizations from names or annual-report rows,
combining agency+producer+insurer denominators, paid symmetry with FL/TX.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / "lib" / "colorado-intelligence"
ART = ROOT / "artifacts" / "co-ins-001"

STAT_URL = "https://doi.colorado.gov/colorado-insurance-industry-statistical-report"
STAT_XLSX = "https://doi.colorado.gov/sites/doi/files/documents/Colorado%202025%20Statistical%20Report%20Final.xlsx"
SURPLUS_PDF = (
    "https://doi.colorado.gov/sites/doi/files/documents/"
    "2025%20Colorado%20Eligible%20Nonadmitted%20Insurers%20Writing%20Surplus%20Lines%2001262026.pdf"
)
CERTS_URL = "https://doi.colorado.gov/for-consumers/consumer-protection/insurer-financials/certificates-of-compliance"
PRODUCER_URL = "https://doi.colorado.gov/insurance-industry/for-producers/agents"
SIRCON_CONSUMER = "https://www.sircon.com/ComplianceExpress/Inquiry/consumerInquiry.do?nonSscrb=Y"
SIRCON_LANDING = "https://www.sircon.com/landingPages/states/colorado/content.jsp"
DISCIPLINARY_URL = (
    "https://doi.colorado.gov/for-consumers/consumer-protection/disciplinary-actions/"
    "agent-producer-and-agency-disciplinary"
)
DATA_STUDIO = "https://datastudio.google.com/s/jBVetgkyGFY"
MCE_URL = "https://doi.colorado.gov/for-consumers/consumer-protection/disciplinary-actions/market-conduct-examinations"
FIN_URL = "https://doi.colorado.gov/for-consumers/consumer-protection/insurer-financials/financial-examinations"
SERFF_PAGE = "https://doi.colorado.gov/for-consumers/consumer-resources/insurance-plan-filings-approved-plans"
SERFF_URL = "https://serff-sfa.naic.org/serff/sfa/home/CO"
CONSUMER_URL = "https://doi.colorado.gov/for-consumers/consumer-protection"
DOI_HOME = "https://doi.colorado.gov/"


def fingerprint(payload: dict) -> str:
    body = {k: v for k, v in payload.items() if k != "fingerprint"}
    canonical = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def build() -> dict:
    snapshot = {
        "version": "insurance-co-state-intel-v1",
        "ticket": "CO-INS-001",
        "as_of": "2026-09-09",
        "retrieved_at": "2026-09-09",
        "snapshot_as_of": "2026-09-09",
        "source_clock": (
            "Colorado DOI 2025 statistical report as of 2025-12-31 (published August 2026); "
            "eligible non-admitted surplus-lines list effective 2025-07-01 through 2026-06-30 "
            "(updated 2026-01-26); certificates-of-compliance index retrieved 2026-09-09. "
            "Retrieval date is not current authorization."
        ),
        "no_trust_score": True,
        "no_paid_ranking": True,
        "no_colorado_county_pages": True,
        "no_denver_route": True,
        "missing_is_not_zero": True,
        "restricted_is_not_zero": True,
        "search_only_is_not_zero": True,
        "request_only_is_not_zero": True,
        "person_directory_public": False,
        "publication": {
            "path": "/colorado",
            "indexable": True,
            "robots": "index,follow",
            "canonical": "https://www.insurancetrusthub.com/colorado",
            "h1": "Colorado Insurance Market & Regulatory Intelligence",
            "sitemap": True,
        },
        "hero": {
            "universe_value": 1839,
            "universe_label": "2025 NAIC Companies directory rows (statistical report)",
            "universe_hint": (
                "Colorado DOI 2025 statistical-report NAIC Companies tab after excluding one "
                "statement-type legend row. As of 2025-12-31. Not a 2026 live authorized-insurer roster."
            ),
            "current_value": "Search only",
            "current_label": "Producer / agency bulk roster",
            "current_hint": "Sircon/Vertafore consumer inquiry is OPEN_SEARCH_ONLY. Missing is not zero.",
            "observations_value": 247,
            "observations_label": "Eligible non-admitted surplus-lines identities",
            "observations_hint": (
                "Official 2025–2026 eligible non-admitted list: 215 NAIC CoCodes + 32 alien AA- identities. "
                "Eligible non-admitted is not admitted. Not a producer list."
            ),
            "geography_value": "Colorado",
            "geography_label": "statewide snapshot",
            "geography_hint": "No Denver, county, or city insurance routes.",
            "as_of_value": "2025-12-31",
            "as_of_label": "statistical-report source date",
            "as_of_hint": "Dated annual market report, not current legal-company status.",
        },
        "regulators": {
            "doi": {
                "name": "Colorado Division of Insurance",
                "short": "DOI",
                "parent": "Colorado Department of Regulatory Agencies (DORA)",
                "url": DOI_HOME,
                "covers": (
                    "Legal insurers, agencies, individual producers, appointments, surplus-lines eligibility, "
                    "rate/form filings, examinations, disciplinary actions, and consumer complaints as described "
                    "on official Colorado DOI pages."
                ),
            },
            "entity_classes": [
                {
                    "class": "Legal insurer",
                    "id": "NAIC CoCode when source-native",
                    "establishes": "Legal-insurer identity; Colorado authority only when a current official record says so",
                    "does_not": "A 2025 statistical-report row is not current authorization. A brand is not the legal insurer. NAIC is not NPN.",
                },
                {
                    "class": "Insurance agency / business entity",
                    "id": "NPN / Colorado agency license when a live lookup record says so",
                    "establishes": "Business-entity credential when the official lookup returns one",
                    "does_not": "Not an insurer. Not an individual producer. No bulk agency roster was acquired.",
                },
                {
                    "class": "Individual producer",
                    "id": "NPN / Colorado producer license when a live lookup record says so",
                    "establishes": "Person license when the official lookup returns one",
                    "does_not": "Not an agency. Not published as a person directory here.",
                },
                {
                    "class": "Appointment",
                    "id": "Exact producer/agency-to-insurer relationship when source-native",
                    "establishes": "Authority to represent a company when the source says so",
                    "does_not": "Not quality. Not acquired as a bulk graph this ticket. License is not appointment.",
                },
                {
                    "class": "Eligible non-admitted / surplus-lines insurer",
                    "id": "NAIC CoCode or alien AA- identity on the official eligibility list",
                    "establishes": "Surplus-lines eligibility for the list's effective window",
                    "does_not": "Not admitted authority. Alien AA- is not a NAIC CoCode. Not a producer.",
                },
                {
                    "class": "Plan",
                    "id": "CMS Marketplace or Medicare contract/plan ID when already in the national overlay",
                    "establishes": "Federal plan identity where already stored",
                    "does_not": "A plan is not an insurer. Marketplace participation is not Colorado DOI authority.",
                },
            ],
        },
        "source_access": {
            "producer_agency_lookup": {
                "classification": "OPEN_SEARCH_ONLY",
                "url": SIRCON_CONSUMER,
                "landing": SIRCON_LANDING,
                "doi_page": PRODUCER_URL,
                "http_status": 200,
                "scraped": False,
                "limitation": "Consumer verify via Sircon. Do not scrape. Search-only is not zero.",
            },
            "statistical_report": {
                "classification": "ACQUIRED",
                "url": STAT_URL,
                "xlsx_url": STAT_XLSX,
                "grain": "dated annual market-report rows, not a live roster",
                "source_as_of": "2025-12-31",
                "published_at": "2026-08",
            },
            "surplus_lines_list": {
                "classification": "ACQUIRED",
                "url": SURPLUS_PDF,
                "effective_from": "2025-07-01",
                "effective_through": "2026-06-30",
                "updated_at": "2026-01-26",
            },
            "certificates_of_compliance": {
                "classification": "ACQUIRED",
                "url": CERTS_URL,
                "grain": "domestic certificate-of-compliance document index, not all authorized insurers",
            },
            "disciplinary_index": {
                "classification": "OPEN_SEARCH_ONLY",
                "url": DISCIPLINARY_URL,
                "index_url": DATA_STUDIO,
                "http_status": 200,
                "scraped": False,
                "identity_bar": "EXACT_NPN_OR_LICENSE_OR_ORDER_ONLY",
                "name_only": "UNSAFE",
            },
            "serff": {
                "classification": "OPEN_SEARCH_ONLY",
                "url": SERFF_URL,
                "doi_page": SERFF_PAGE,
                "scraped": False,
                "rate_filing_is_not_quote": True,
            },
            "complaints": {
                "classification": "PUBLIC_RESEARCH_PATH",
                "url": CONSUMER_URL,
                "company_level_bulk": "SOURCE_NOT_ACQUIRED",
            },
            "cora": {
                "classification": "SOURCE_AVAILABLE_BY_REQUEST",
                "filed_this_ticket": False,
                "limitation": "No CORA request was filed to enlarge this ticket.",
            },
        },
        "producer_roster": {
            "CO_PRODUCER_BULK_ROSTER": "SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY",
            "count": None,
            "acquired": False,
            "scraped": False,
            "verify_url": SIRCON_CONSUMER,
            "caveat": "No free bulk producer roster was acquired. Search-only is not zero. Do not invent a Colorado producer count.",
        },
        "agency_roster": {
            "CO_AGENCY_BULK_ROSTER": "SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY",
            "count": None,
            "acquired": False,
            "scraped": False,
            "verify_url": SIRCON_CONSUMER,
            "caveat": "No unrestricted official agency CSV/API was acquired. Missing is not zero.",
        },
        "authorized_insurers": {
            "current_authorized_company_roster": "SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY",
            "count": None,
            "lookup_url": SIRCON_CONSUMER,
            "caveat": (
                "The 2025 statistical-report NAIC Companies directory is not a current authorized-insurer roster. "
                "Domicile is not Colorado authority. Domestic certificates are a subset. NAIC identity is not Colorado authorization."
            ),
        },
        "statistical_report": {
            "source": "Colorado DOI 2025 Insurance Industry Statistical Report",
            "landing_url": STAT_URL,
            "xlsx_url": STAT_XLSX,
            "http_status": 200,
            "bytes": 1260692,
            "sha256": "3eac2ed56410b85144b5dc328e950a98146a5ddc284e07bc47e2f2d68095e958",
            "source_as_of": "2025-12-31",
            "published_at": "2026-08",
            "retrieved_at": "2026-09-09",
            "not_a_live_roster": True,
            "not_colorado_insurance_companies_label": True,
            "naic_companies_tab": {
                "tab": "NAIC Companies",
                "nonempty_rows_including_legend": 1840,
                "excluded_legend_rows": 1,
                "company_directory_rows": 1839,
                "distinct_naic": 1839,
                "duplicate_naic_codes": [],
                "colorado_domicile_rows": 45,
                "colorado_domicile_distinct_naic": 45,
                "one_to_one": True,
                "note": (
                    "One nonempty row is a statement-type legend, not a company. "
                    "Company directory rows equal distinct NAIC CoCodes. "
                    "DOM=CO is domicile on this dated directory, not current Colorado authority and not the certificates-of-compliance subset."
                ),
            },
            "naic_companies_data_tab": {
                "tab": "NAIC Companies Data",
                "data_rows_including_legend": 1840,
                "distinct_naic": 1839,
                "note": "Financial overlay of the same directory. Do not double-count as a second insurer universe.",
            },
            "companies_by_group_tab": {
                "tab": "Companies by Group",
                "data_rows": 1843,
                "distinct_naic": 1843,
                "note": "Grouping overlay, not a second insurer count.",
            },
            "non_naic_companies_tab": {
                "tab": "Non-NAIC Companies",
                "data_rows": 19,
                "distinct_naic": 0,
                "note": "Non-NAIC filed directory. Different grain from NAIC Companies.",
            },
            "preneed_companies_tab": {
                "tab": "Pre-need Companies",
                "data_rows": 59,
                "note": "Pre-need companies. Source typo on companion tab: 'Pre-need Comanies Data'.",
            },
            "title_line_tab": {
                "tab": "37",
                "line": "Title",
                "data_rows_including_total": 23,
                "distinct_naic": 22,
                "note": "Title-insurance line market observations. Not title agencies and not title producers.",
            },
            "official_pdf_narrative_companies": {
                "value": 1844,
                "label": "Official 2025 PDF narrative: premium written to 1844 companies",
                "publish_as_headline": False,
                "note": (
                    "The PDF narrative says Colorado citizens spent more than $61 billion in premium to 1844 companies. "
                    "That is not reconstructed 1:1 from the Excel NAIC Companies directory (1,839). "
                    "It is not a live authorized roster and is not used as the hero universe."
                ),
            },
            "line_tabs_are_market_observations": True,
            "sum_of_all_tab_rows_is_not_an_insurer_count": True,
        },
        "domestic_certificates": {
            "url": CERTS_URL,
            "http_status": 200,
            "named_company_entries": 49,
            "excluded_heading": "Title Agencies",
            "doi_pdf_links": 46,
            "google_drive_links": 4,
            "updated_annually": True,
            "not_all_authorized_insurers": True,
            "not_statistical_directory": True,
            "not_colorado_domicile_count": True,
            "caveat": (
                "Named domestic certificate-of-compliance entries on the official page after excluding the "
                "'Title Agencies' heading. Four entries use Google Drive rather than a DOI PDF. "
                "This is a domestic-certificate subset, not all authorized insurers, and not the 45 DOM=CO statistical-report rows."
            ),
        },
        "surplus_lines": {
            "source": "2025 Colorado Eligible Nonadmitted Insurers Writing Surplus Lines",
            "url": SURPLUS_PDF,
            "http_status": 200,
            "bytes": 194224,
            "sha256": "a52cb12c6c069cab4fbeeddbf06226342d17d0e7c52e4f47406d640b572ddb46",
            "pages": 4,
            "effective_from": "2025-07-01",
            "effective_through": "2026-06-30",
            "updated_at": "2026-01-26",
            "retrieved_at": "2026-09-09",
            "eligible_identities": 247,
            "naic_cocode_identities": 215,
            "alien_aa_identities": 32,
            "duplicate_ids": [],
            "eligible_is_not_admitted": True,
            "alien_aa_is_not_naic_cocode": True,
            "not_a_producer_list": True,
            "caveat": (
                "Line-parsed official PDF: 247 distinct eligible identities (215 NAIC CoCodes + 32 alien AA- IDs). "
                "Eligible non-admitted is not admitted. Alien AA- is not NAIC CoCode. This list's effective window "
                "is not 2026 current admitted authority."
            ),
        },
        "title": {
            "title_insurer_line_observations": 22,
            "title_agency_roster": "SOURCE_NOT_ACQUIRED",
            "title_producer_roster": "SOURCE_NOT_ACQUIRED",
            "count": None,
            "caveat": (
                "Title insurer ≠ title producer ≠ title agency ≠ P&C. "
                "The 2025 statistical-report Title line has 22 distinct NAIC observations. "
                "No bulk title-agency or title-producer roster was acquired."
            ),
        },
        "disciplinary_actions": {
            "access": "OPEN_SEARCH_ONLY",
            "url": DISCIPLINARY_URL,
            "index_url": DATA_STUDIO,
            "bulk_acquired": False,
            "rows": None,
            "identity_bar": "EXACT_NPN_OR_LICENSE_OR_ORDER_ONLY",
            "name_only": "UNSAFE_FOR_ADVERSE_PROFILE_ATTACH",
            "name_plus_city": "REVIEW_REQUIRED",
            "disciplinary_is_not_conviction": True,
            "caveat": "Google Data Studio / DOI disciplinary index. Not scraped. Name-only attach is unsafe.",
        },
        "insurer_enforcement": {
            "access": "OPEN_SEARCH_ONLY",
            "bulk_acquired": False,
            "rows": None,
            "grain": "insurer enforcement / order when a source-native case identity exists",
            "not_producer_disciplinary": True,
            "not_exam": True,
        },
        "market_conduct_exams": {
            "access": "OPEN_SEARCH_ONLY",
            "url": MCE_URL,
            "http_status": 200,
            "bulk_acquired": False,
            "pdf_hrefs_on_page": 0,
            "rows": None,
            "market_conduct_is_not_enforcement": True,
            "caveat": (
                "The market-conduct page is an index/research path. Zero scrapeable PDF hrefs on the landing page "
                "is not zero examinations. Missing is not zero."
            ),
        },
        "financial_exams": {
            "access": "OPEN_SEARCH_ONLY",
            "url": FIN_URL,
            "http_status": 200,
            "bulk_acquired": False,
            "pdf_hrefs_on_page": 0,
            "rows": None,
            "financial_exam_is_not_insolvency": True,
            "financial_exam_is_not_market_conduct": True,
            "caveat": (
                "The financial-examinations page is an index/research path. Zero scrapeable PDF hrefs on the landing page "
                "is not zero examinations."
            ),
        },
        "rate_filings": {
            "RATE_FILINGS": "OPEN_SEARCH_ONLY",
            "url": SERFF_URL,
            "doi_page": SERFF_PAGE,
            "bulk_acquired": False,
            "rows": None,
            "rate_filing_is_not_consumer_quote": True,
            "rate_filing_is_not_quality": True,
            "rate_filing_is_not_approval_unless_status_says_so": True,
            "do_not_scrape_query_by_query": True,
        },
        "complaints": {
            "access": "PUBLIC_RESEARCH_PATH",
            "url": CONSUMER_URL,
            "company_level_bulk": "SOURCE_NOT_ACQUIRED",
            "annual_aggregate_acquired": False,
            "rows": None,
            "complaint_is_not_violation": True,
            "received_is_not_substantiated": True,
            "no_complaint_is_not_clean_history": True,
            "do_not_rank_by_complaint_to_premium": True,
            "caveat": (
                "File-a-complaint / consumer-protection path. No public company-level complaint bulk was acquired. "
                "Dated annual complaint/recovery narratives stay labeled as such when a source is used; none was ingested here."
            ),
        },
        "federal_overlays": {
            "cms_marketplace_colorado_projection": "SOURCE_NOT_SPLIT / NOT_USED",
            "cms_marketplace_participation_is_not_doi_authority": True,
            "national_naic_identity_is_not_colorado_authorization": True,
            "note": (
                "Existing national CMS/NAIC identities are not Colorado authorization. "
                "No new federal ingest was performed."
            ),
        },
        "identity_rules": {
            "EXACT": [
                "NAIC CoCode when source-native",
                "NPN when source-native",
                "Colorado producer/agency license when source-native",
                "SERFF tracking number when source-native",
                "DOI order/case when source-native",
                "Alien AA- identity when source-native on the surplus-lines list",
            ],
            "UNSAFE": "name-only adverse attach; name-only filing attach; collapsing CoCode with NPN",
            "REVIEW_REQUIRED": "name + city adverse attach",
            "not_minted_from_aggregates": True,
            "not_minted_from_names": True,
            "cocode_is_not_npn": True,
            "person_npn_is_not_agency_npn": True,
            "brand_is_not_legal_insurer": True,
        },
        "profile_attachments": {
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "REVIEW_REQUIRED_JOINS": 0,
            "REJECTED_UNSAFE_JOINS": 0,
            "graph_cocode_join_executed": False,
            "note": (
                "No exact NAIC CoCode join against the production legal-insurer spine was executed this ticket "
                "because the committed insurer census does not include the CoCode list and no live graph query was run. "
                "Annual-report and surplus-lines rows remain observation/eligibility evidence, not new legal insurers."
            ),
        },
        "expansion_ledger": {
            "PRE_INGEST_CANONICAL_AGENCIES": 82071,
            "PRE_INGEST_CANONICAL_PERSONS": 1029860,
            "PRE_INGEST_CANONICAL_LEGAL_INSURERS": 6185,
            "NET_NEW_CANONICAL_AGENCIES": 0,
            "NET_NEW_CANONICAL_PERSONS": 0,
            "NET_NEW_CANONICAL_LEGAL_INSURERS": 0,
            "NET_NEW_PUBLIC_PROFILES": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
            "NEW_COLORADO_STATE_IDENTITIES": 0,
            "NEW_COLORADO_CREDENTIAL_ROWS": 0,
            "NEW_MARKET_OBSERVATION_ROWS": 1839,
            "NEW_SURPLUS_LINES_ROWS": 247,
            "NEW_EXAM_EVIDENCE_ROWS": 0,
            "NEW_ENFORCEMENT_EVIDENCE_ROWS": 0,
            "NEW_RATE_FILING_ROWS": 0,
            "NEW_COMPLAINT_ROWS": 0,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "REVIEW_REQUIRED_JOINS": 0,
            "REJECTED_UNSAFE_JOINS": 0,
            "note": (
                "NEW_MARKET_OBSERVATION_ROWS and NEW_SURPLUS_LINES_ROWS are snapshot-documented observation/"
                "eligibility rows. They are not ingested into the national graph and do not mint canonical organizations."
            ),
        },
        "source_inventory": [
            {
                "family": "2025 statistical report",
                "access": "ACQUIRED",
                "url": STAT_XLSX,
                "sha256": "3eac2ed56410b85144b5dc328e950a98146a5ddc284e07bc47e2f2d68095e958",
            },
            {
                "family": "Eligible non-admitted surplus-lines list",
                "access": "ACQUIRED",
                "url": SURPLUS_PDF,
                "sha256": "a52cb12c6c069cab4fbeeddbf06226342d17d0e7c52e4f47406d640b572ddb46",
            },
            {
                "family": "Certificates of compliance index",
                "access": "ACQUIRED",
                "url": CERTS_URL,
            },
            {
                "family": "Producer/agency verification",
                "access": "OPEN_SEARCH_ONLY",
                "url": SIRCON_CONSUMER,
            },
            {
                "family": "Disciplinary index",
                "access": "OPEN_SEARCH_ONLY",
                "url": DISCIPLINARY_URL,
            },
            {
                "family": "Market-conduct examinations page",
                "access": "OPEN_SEARCH_ONLY",
                "url": MCE_URL,
            },
            {
                "family": "Financial examinations page",
                "access": "OPEN_SEARCH_ONLY",
                "url": FIN_URL,
            },
            {
                "family": "SERFF Filing Access",
                "access": "OPEN_SEARCH_ONLY",
                "url": SERFF_URL,
            },
            {
                "family": "Complaints / consumer protection",
                "access": "PUBLIC_RESEARCH_PATH",
                "url": CONSUMER_URL,
            },
            {
                "family": "CORA bulk records",
                "access": "SOURCE_AVAILABLE_BY_REQUEST",
                "url": DOI_HOME,
            },
        ],
        "gaps": {
            "ACQUIRED": [
                "2025 statistical-report Excel (dated market rows)",
                "2025–2026 eligible non-admitted surplus-lines PDF",
                "Domestic certificates-of-compliance index",
            ],
            "OPEN_SEARCH_ONLY": [
                "Producer license verification (Sircon)",
                "Agency license verification (Sircon)",
                "Current authorized-insurer lookup",
                "Disciplinary actions index",
                "Market-conduct examinations",
                "Financial examinations",
                "SERFF rate/form filings",
                "Insurer enforcement orders",
            ],
            "SOURCE_NOT_ACQUIRED": [
                "Complete current authorized-insurer roster",
                "Complete agency roster",
                "Complete producer roster",
                "Appointment graph",
                "Company-level complaint bulk",
                "Title agency roster",
                "Title producer roster",
                "Structured exam report extract",
            ],
            "SOURCE_AVAILABLE_BY_REQUEST": [
                "Possible CORA bulk licensing/exam extracts — not requested this ticket",
            ],
            "SOURCE_USE_RESTRICTED": [],
            "UNKNOWN": [
                "Live 2026 authorized-company census",
                "Live producer and agency counts",
            ],
            "NOT_APPLICABLE": [
                "Colorado county insurance pages",
                "Denver nested insurance route",
                "Paid SBS/Vertafore/NIPR bulk purchase",
                "Arizona insurance page",
            ],
        },
        "rejected_joins": [
            "Name-only disciplinary/enforcement attach",
            "Statistical-report company name attach to a national profile without NAIC CoCode",
            "Surplus-lines eligibility attach without source-native NAIC or AA- identity",
            "Certificate page label attach without source-native CoCode",
        ],
        "rejected_totals": {
            "agency_plus_producer_plus_legal_insurer_as_colorado_insurance_companies": {
                "status": "REJECTED",
                "publishAsHeadline": False,
            },
            "statistical_report_rows_as_colorado_insurers": {
                "status": "REJECTED",
                "publishAsHeadline": False,
            },
            "domestic_certificates_as_all_authorized_insurers": {
                "status": "REJECTED",
                "publishAsHeadline": False,
            },
            "surplus_lines_plus_admitted_as_one_denominator": {
                "status": "REJECTED",
                "publishAsHeadline": False,
            },
            "complaints_plus_exams_plus_filings_as_regulatory_actions": {
                "status": "REJECTED",
                "publishAsHeadline": False,
            },
            "market_share_or_premium_as_quality": {
                "status": "REJECTED",
                "publishAsHeadline": False,
            },
            "producer_licenses_as_agency_count": {
                "status": "REJECTED",
                "publishAsHeadline": False,
            },
            "appointments_as_additional_agencies_or_insurers": {
                "status": "REJECTED",
                "publishAsHeadline": False,
            },
            "official_pdf_1844_as_hero_universe": {
                "status": "REJECTED",
                "publishAsHeadline": False,
            },
        },
        "semantic_guardrails": [
            "LEGAL INSURER != AGENCY != PERSON != APPOINTING CARRIER != GROUP != BRAND != PLAN",
            "NPN != NAIC COCODE",
            "LICENSE != APPOINTMENT != LOA",
            "DOMICILE != COLORADO AUTHORITY",
            "DOMESTIC CERTIFICATE != ALL AUTHORIZED INSURERS",
            "STATISTICAL ROW != CURRENT AUTHORIZATION",
            "MARKET SHARE != QUALITY",
            "SURPLUS-LINES ELIGIBILITY != ADMITTED",
            "ALIEN AA- != NAIC COCODE",
            "SERFF FILING != QUOTE != APPROVAL UNLESS STATUS SAYS SO",
            "COMPLAINT != VIOLATION",
            "EXAM != ENFORCEMENT",
            "FINANCIAL EXAM != INSOLVENCY",
            "DISCIPLINARY != CONVICTION",
            "NAME-ONLY ADVERSE = UNSAFE",
            "MISSING / SEARCH-ONLY / REQUEST-ONLY != ZERO",
            "NO TRUST SCORE",
            "NO PAID RANKING",
            "NO DENVER ROUTE",
        ],
        "verify": {
            "agent_producer": SIRCON_CONSUMER,
            "agency": SIRCON_CONSUMER,
            "company": SIRCON_CONSUMER,
            "explains": (
                "Colorado DOI points consumers to Sircon for live license inquiry. A lookup hit is not a TrustHub profile "
                "and is not a bulk roster. Existing InsuranceTrustHub insurer/agency research tools remain national graph "
                "tools, not a substitute for Colorado DOI verification."
            ),
        },
        "findings": [
            {
                "id": "statistical-not-roster",
                "title": "The 2025 statistical report is a dated market report, not a live authorized roster",
                "summary": (
                    "The NAIC Companies tab has 1,839 company directory rows and 1,839 distinct NAIC CoCodes after "
                    "excluding a legend row. That grain is as-of 2025-12-31."
                ),
                "doesNotMean": [
                    "1,839 currently authorized Colorado insurance companies",
                    "the official PDF narrative of 1,844 premium-writing companies is the same denominator",
                ],
            },
            {
                "id": "surplus-not-admitted",
                "title": "Eligible non-admitted surplus-lines identities are a separate grain",
                "summary": (
                    "The 2025–2026 official list has 247 eligible identities (215 NAIC + 32 alien AA-), "
                    "effective 2025-07-01 through 2026-06-30, updated 2026-01-26."
                ),
                "doesNotMean": [
                    "247 admitted insurers",
                    "247 producers",
                    "alien AA- identities are NAIC CoCodes",
                ],
            },
            {
                "id": "rosters-search-only",
                "title": "Producer and agency bulk rosters were not acquired",
                "summary": "Verification remains on Sircon/DOI search. Search-only is not zero.",
                "doesNotMean": [
                    "zero Colorado producers",
                    "zero Colorado agencies",
                ],
            },
            {
                "id": "certificates-subset",
                "title": "Domestic certificates of compliance are a subset, not all authorized insurers",
                "summary": (
                    "The official certificates page lists 49 named company entries after excluding a Title Agencies heading. "
                    "That is not the 1,839 statistical-directory rows and not the 45 DOM=CO rows."
                ),
                "doesNotMean": [
                    "49 is the complete authorized-insurer universe",
                    "DOM=CO equals certificates of compliance",
                ],
            },
        ],
        "local_county_decision": {
            "break_statewide_first": False,
            "denver_route": False,
            "reason": (
                "No exceptional local/county insurance bulk roster was discovered. "
                "The existing denver-agents hub is a national curated hub and was not modified."
            ),
        },
    }
    snapshot["fingerprint"] = fingerprint(snapshot)
    return snapshot


def main() -> None:
    snap = build()
    LIB.mkdir(parents=True, exist_ok=True)
    ART.mkdir(parents=True, exist_ok=True)
    out = LIB / "accepted-snapshot.json"
    out.write_text(json.dumps(snap, indent=2) + "\n", encoding="utf-8")
    # Reproducibility: hashing the written body without fingerprint must match.
    loaded = json.loads(out.read_text(encoding="utf-8"))
    recomputed = fingerprint(loaded)
    if recomputed != snap["fingerprint"]:
        raise SystemExit(f"fingerprint not reproducible: {snap['fingerprint']} vs {recomputed}")
    man = {
        "ticket": "CO-INS-001",
        "contract": snap["version"],
        "snapshot_fingerprint": snap["fingerprint"],
        "method": "sha256(json.dumps(snapshot_without_fingerprint, sort_keys=True, separators=(',', ':')))",
        "recursive": True,
        "statistical_xlsx_sha256": snap["statistical_report"]["sha256"],
        "surplus_pdf_sha256": snap["surplus_lines"]["sha256"],
    }
    (ART / "hash-manifest.json").write_text(json.dumps(man, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "fingerprint": snap["fingerprint"],
        "directory_rows": snap["statistical_report"]["naic_companies_tab"]["company_directory_rows"],
        "surplus": snap["surplus_lines"]["eligible_identities"],
        "certs": snap["domestic_certificates"]["named_company_entries"],
        "ledger_orgs": snap["expansion_ledger"]["NET_NEW_CANONICAL_LEGAL_INSURERS"],
    }, indent=2))


if __name__ == "__main__":
    main()
