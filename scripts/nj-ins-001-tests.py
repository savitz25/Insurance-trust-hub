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
    test_repo()
    if failed:
        print("FAILED", failed)
        raise SystemExit(1)
    print("PASS nj-ins-001-tests")


if __name__ == "__main__":
    main()
