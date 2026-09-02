#!/usr/bin/env python3
"""NJ-INS-001 network-free parser and invariant tests."""
from __future__ import annotations

import sys
from pathlib import Path
from importlib.machinery import SourceFileLoader

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
mod = SourceFileLoader("nj_ins_001", str(ROOT / "scripts" / "nj-ins-001.py")).load_module()
FIX = ROOT / "data" / "fixtures" / "nj-ins-001"
failed = 0


def check(name: str, cond: bool, detail: str = "") -> None:
    global failed
    if cond:
        print("PASS", name, detail)
    else:
        failed += 1
        print("FAIL", name, detail)


def test_enforcement() -> None:
    html = (FIX / "doi-2026-sample.html").read_text(encoding="utf-8")
    events = mod.parse_enforcement_html(
        html,
        "https://www.nj.gov/dobi/division_insurance/insfines26.htm",
        2026,
        "NJ_DOBI_DOI_ENFORCEMENT",
        "doi_enf_2026",
    )
    orders = {e.get("order_number"): e for e in events}
    check("enf_count", len(events) >= 3, str(list(orders)))
    e = orders.get("E26-83")
    if e:
        check("multi_party", len(e["parties"]) >= 2)
        check("penalty_not_copied", e["amounts"]["civil_penalty_amount"] == 7500)
        check("consent_final", e["event_class"] == "CONSENT_ORDER" and e["event_status"] == "FINAL")
        check("individual_internal", any(p.get("match_status") == "INTERNAL_ONLY_INDIVIDUAL" for p in e["parties"]) or any(p.get("party_type") == "PUBLIC_ADJUSTER" and p.get("public_eligibility") == "internal_only" for p in e["parties"]))
    fin = orders.get("E26-80")
    if fin:
        check("fraud_surcharge_separate", fin["amounts"].get("fraud_surcharge_amount") == 1000)
        check("revocation_flag", fin["flags"]["revocation"] is True)
        check("order_not_entity_id", fin["order_number"] != fin["parties"][0].get("legal_name"))
    bail = orders.get("E25-21")
    if bail:
        check("bail_class_preserved", any(p["party_type"] == "BAIL_BOND_PRODUCER" or "Bail" in p["legal_name"] for p in bail["parties"]))
        check("bail_internal", all(p.get("public_eligibility") == "internal_only" for p in bail["parties"]))


def test_exams() -> None:
    fin = mod.parse_financial_exams(
        (FIX / "financial-sample.html").read_text(encoding="utf-8"),
        "https://www.nj.gov/dobi/division_insurance/finexam_reports.htm",
    )
    by = {e["respondent_caption"]: e for e in fin}
    check("fin_naic_exact", by["21st Century Auto Insurance Company of NJ"]["parties"][0]["naic_cocode"] == "10184")
    check("fin_not_enforcement", all(e["is_enforcement"] is False for e in fin))
    check("fin_unresolved_no_naic", by["Association Master Trust"]["parties"][0]["match_status"] == "UNRESOLVED")
    mc = mod.parse_mc_exams(
        (FIX / "mc-sample.html").read_text(encoding="utf-8"),
        "https://www.nj.gov/dobi/division_consumers/insurance/marketconductexams.htm",
    )
    check("mc_name_only", mc[0]["parties"][0]["match_status"] == "UNRESOLVED")
    check("mc_multi_review", any(e["parties"][0]["match_status"] == "REVIEW_REQUIRED" for e in mc))
    check("mc_not_enforcement", all(e["is_enforcement"] is False and e["event_class"] == "MARKET_CONDUCT_EXAMINATION" for e in mc))


def test_complaints_and_identity() -> None:
    text = "Nationwide Group 3 19,353 0.1550 2.967 Citizens United Reciprocal Exchange (CURE) 13 57192 0.2273 4.351 TOTALS 319 6106383"
    rows = mod.parse_auto_complaint(text, 2024, "https://example.invalid/2024.pdf")
    check("complaint_rows", len(rows) >= 1, str(len(rows)))
    if rows:
        g = next((r for r in rows if r["grain"] == "group"), rows[0])
        check("group_grain", g.get("copied_to_legal_entities") is False)
        check("no_leaderboard", g.get("leaderboard_created") is False)
        check("valid_complaints_field", "valid_complaints" in g)
    name_only = mod.match_party({"legal_name": "Acme Insurance Company", "party_type": "INSURER"})
    check("name_only_unresolved", name_only["match_status"] == "UNRESOLVED")
    person = mod.match_party({"legal_name": "Jane Doe", "party_type": "INDIVIDUAL_PRODUCER"})
    check("person_internal", person["match_status"] == "INTERNAL_ONLY_INDIVIDUAL" and person["no_public_person_profile"] is True)
    exact = mod.match_party({"legal_name": "Allstate NJ", "party_type": "INSURER", "naic_cocode": "14940"})
    check("exact_naic", exact["match_method"] == "EXACT_NAIC_COCODE")


def test_001c_bfd_and_documents() -> None:
    html = (FIX / "bfd-2025-sample.html").read_text(encoding="utf-8")
    events = mod.parse_enforcement_html(
        html,
        "https://www.nj.gov/dobi/division_insurance/bfd/enforcement2025.html",
        2025,
        "NJ_DOBI_BFD_ENFORCEMENT",
        "bfd_enf_2025",
    )
    by = {e.get("order_number"): e for e in events}
    consent = by.get("E25-01")
    check("bfd_reclassified_consent", bool(consent) and consent["event_class"] == "CONSENT_ORDER", str([e.get("event_class") for e in events]))
    if consent:
        check("bfd_consent_final", consent["event_status"] == "FINAL")
        check("bfd_penalty_not_copied_to_parties", consent["amounts"]["civil_penalty_amount"] == 1500 and all("civil_penalty_amount" not in p for p in consent["parties"]))
        check("occurrence_not_canonical_hash", consent["occurrence_fingerprint"] != (consent.get("document_url") or ""))
    leftover_cls, leftover_status, leftover_method = mod.event_class("UNKNOWN", "Routine licensing correspondence dated May 1, 2024.")
    check("remaining_other_class_preserved", leftover_cls == "OTHER" and leftover_method == "UNCLASSIFIED")
    check("remaining_unknown_status_preserved", leftover_status == "UNKNOWN")

    def class_only(heading: str, body: str) -> tuple[str, str, str, list[str]]:
        cls, status, method = mod.event_class(heading, body)
        return cls, status, method, mod.action_classes(heading, body)

    cls, status, method, actions = class_only("REVOCATIONS", "License revoked effective May 1, 2024.")
    check("class_revocation_heading", cls == "REVOCATION" and method == "PAGE_HEADING" and "REVOCATION" in actions)
    cls, status, method, actions = class_only("SUSPENSIONS", "Producer license suspended for 90 days.")
    check("class_suspension_heading", cls == "SUSPENSION" and "SUSPENSION" in actions)
    cls, status, method, actions = class_only("SURRENDERS", "Respondent surrendered the license.")
    check("class_surrender_heading", cls == "SURRENDER" and "SURRENDER" in actions)
    cls, status, method, actions = class_only("DENIALS", "Application denied.")
    check("class_denial_heading", cls == "DENIAL" and "DENIAL" in actions)
    cls, status, method, actions = class_only("SETTLEMENTS", "Matter resolved by settlement.")
    check("class_settlement_heading", cls == "SETTLEMENT" and "SETTLEMENT" in actions)
    cls, status, method, actions = class_only("CORRECTIVE ACTION", "Corrective action required.")
    check("class_corrective_heading", cls == "CORRECTIVE_ACTION" and "CORRECTIVE_ACTION" in actions)
    cls, status, method, actions = class_only("CONSENT ORDERS", "Consent Order #E25-01. Civil Penalty: $1,500.00. Restitution $200. Fraud Act Surcharge $100.")
    check("class_consent_heading_not_replaced_by_sanction", cls == "CONSENT_ORDER" and status == "FINAL")
    check("class_civil_penalty_action", "CIVIL_PENALTY" in actions)
    check("class_restitution_action", "RESTITUTION" in actions)
    check("class_fraud_surcharge_action", "FRAUD_SURCHARGE" in actions)
    cls, status, method, actions = class_only("UNKNOWN", "Notice of investigation dated May 1, 2024. Fine - $500")
    check("notice_is_not_final_order", cls == "OTHER" and status == "UNKNOWN")
    check("amount_does_not_imply_final_status", status != "FINAL")
    cls, status, method, actions = class_only("UNKNOWN", "Respondent committed fraud in an application.")
    check("bfd_not_every_matter_fraud", "FRAUD_SURCHARGE" not in actions and cls == "OTHER")

    tmp = ROOT / "data" / "fixtures" / "nj-ins-001" / "_tmp_pdf"
    if tmp.exists():
        for p in tmp.glob("*"):
            p.unlink()
    tmp.mkdir(parents=True, exist_ok=True)
    existing_url = "https://www.nj.gov/dobi/division_insurance/bfd/orders/exist.pdf"
    existing_path = tmp / mod.pdf_name(existing_url)
    payload = b"%PDF-1.4 existing-hash-skip"
    existing_path.write_bytes(payload)
    digest = mod.sha256_bytes(payload)

    attempts = {"n": 0}

    def fake_fetch(url: str) -> dict:
        attempts["n"] += 1
        if "retry.pdf" in url:
            if attempts["n"] < 3:
                return {"status": None, "body": b"", "final_url": url, "error": "timeout"}
            return {"status": 200, "body": b"%PDF-1.4 retried", "final_url": url, "error": None}
        if "missing.pdf" in url:
            return {"status": 404, "body": b"", "final_url": url, "error": "Not Found"}
        if "gone.pdf" in url:
            return {"status": 200, "body": b"<html>not a pdf</html>", "final_url": url, "error": None}
        return {"status": 200, "body": b"%PDF-1.4 other", "final_url": url, "error": None}

    rows = [
        {"document_url": existing_url, "occurrence_fingerprint": "occ-exist"},
        {"document_url": "https://www.nj.gov/dobi/division_insurance/bfd/orders/retry.pdf", "occurrence_fingerprint": "occ-retry"},
        {"document_url": "https://www.nj.gov/dobi/division_insurance/bfd/orders/missing.pdf", "occurrence_fingerprint": "occ-404"},
        {"document_url": "https://www.nj.gov/dobi/division_insurance/bfd/orders/gone.pdf", "occurrence_fingerprint": "occ-unavail"},
        {"document_url": None, "occurrence_fingerprint": "occ-index"},
        {"document_url": existing_url, "occurrence_fingerprint": "occ-exist-2"},
    ]
    stats = mod.download_docs(rows, fetcher=fake_fetch, pdf_dir=tmp, sleep_s=0)
    check("existing_pdf_hash_skip", rows[0]["acquisition_state"] == "EXISTING_HASH_VERIFIED" and rows[0]["content_hash"] == digest)
    check("download_retry_status", rows[1].get("retry_status") in {"SUCCESS_AFTER_RETRY", "SUCCESS"} and rows[1]["acquisition_state"] == "DOWNLOADED_HASH_VERIFIED")
    check("unavailable_404_preserved", rows[2]["acquisition_state"] == "HTTP_404_SOURCE_UNAVAILABLE" and rows[2]["occurrence_fingerprint"] == "occ-404")
    check("unavailable_nonpdf_preserved", rows[3]["acquisition_state"] == "NON_PDF_RESPONSE")
    check("index_only_preserved", rows[4]["acquisition_state"] == "INDEX_ONLY_NO_DOCUMENT")
    check("mime_and_size_recorded", rows[0].get("mime") == "application/pdf" and rows[0].get("byte_length") == len(payload))
    no_refetch = {"n": 0}

    def forbid_fetch(url: str) -> dict:
        no_refetch["n"] += 1
        raise AssertionError("must not refetch hash-verified file")

    again = [
        {"document_url": existing_url, "occurrence_fingerprint": "occ-exist-3"},
    ]
    mod.download_docs(again, fetcher=forbid_fetch, pdf_dir=tmp, sleep_s=0, refetch=False)
    check("no_refetch_verified_hash", again[0]["acquisition_state"] == "EXISTING_HASH_VERIFIED" and no_refetch["n"] == 0)
    check(
        "occurrence_vs_canonical_document",
        rows[0]["occurrence_fingerprint"] != rows[0]["canonical_document_id"]
        and rows[0]["canonical_document_id"] == digest
        and rows[5]["canonical_document_id"] == digest
        and rows[5]["occurrence_fingerprint"] == "occ-exist-2",
    )
    check("no_amount_duplication", consent is None or all("amounts" not in p for p in consent["parties"]))
    for p in tmp.glob("*"):
        p.unlink()
    tmp.rmdir()


def test_repo() -> None:
    sql = MIGRATION = (ROOT / "supabase/migrations/20260902140000_nj_ins_001_regulatory_ledger.sql").read_text(encoding="utf-8")
    check("no_nj_silo_orders", "nj_dobi_orders" not in sql and "nj_insurers" not in sql)
    check("rls_forced", "force row level security" in sql)
    check("internal_only", "internal_only" in sql)
    check("no_anon_grant", "grant select" not in sql.lower() or "anon" not in sql.lower())
    check("no_new_jersey_route", not (ROOT / "app" / "new-jersey").exists())
    sitemap = (ROOT / "app" / "sitemap.ts").read_text(encoding="utf-8")
    check("sitemap_unchanged_no_state_page", "/new-jersey'" not in sitemap and '"/new-jersey"' not in sitemap)
    bail = (ROOT / "lib/directory/bail-bond-publication.ts").read_text(encoding="utf-8")
    check("bail_firewall", "excludeFromConsumerDirectory" in bail and "bail_bond_evidence_retained" in bail)
    runner = (ROOT / "scripts/nj-ins-001.py").read_text(encoding="utf-8")
    check("no_fuzzy", "levenshtein" not in runner.lower() and "fuzzy" not in runner.lower())
    check("exam_ne_enforcement", "is_enforcement" in runner)
    check("complaint_ne_violation", "valid_complaints" in runner)
    check("no_vercel_project", not (ROOT / ".vercel/project.json").exists())
    spaced = mod.safe_urljoin(
        "https://www.nj.gov/dobi/division_insurance/bfd/enforcement2021.html",
        "orders/2103/2051125 .pdf",
    )
    check("spaced_pdf_url_quoted", " " not in spaced and "%20" in spaced, spaced)


def main() -> None:
    test_enforcement()
    test_exams()
    test_complaints_and_identity()
    test_001c_bfd_and_documents()
    test_repo()
    if failed:
        print("FAILED", failed)
        raise SystemExit(1)
    print("PASS nj-ins-001-tests")


if __name__ == "__main__":
    main()
