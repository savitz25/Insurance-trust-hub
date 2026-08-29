"""INS-INSURER-005 — examined subject vs mentioned CoCode.

California cover grammar remains INS-INSURER-004.
Florida OIR: cover/title NAIC Company Code + named subject only.
32399 is never an identity bridge.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPINE_ROWS = json.loads((ROOT / "data/reports/ins-insurer-004-spine.json").read_text(encoding="utf-8"))
SPINE = {r["cocode"]: r for r in SPINE_ROWS}

NON_CANONICAL_CODES = {"32399"}

LABEL_NEAR = re.compile(
    r"(?i)(?:NAIC\s*(?:Company\s*)?(?:Co[- ]?Code|Code|#)|Company\s*Code)\s*[:#]?\s*(\d{5})"
)
NAME_THEN_CODE = re.compile(r"(?m)^[\s]*(.{4,80}?)\s(\d{5})[\s]*$")
COVER_OF = re.compile(r"(?is)REPORT\s+OF\s+EXAMINATION\s+OF\s+THE\s+(.+?)\s+AS\s+OF")
FL_NAIC_COMPANY = re.compile(r"(?i)NAIC\s+Company\s+Code\s*[:#]?\s*(\d{5})")
FL_NAIC_GROUP = re.compile(r"(?i)NAIC\s+Group\s+Code\s*[:#]?\s*(\d{2,5}|N/?A)")
FL_HEADING = re.compile(
    r"(?im)^[^\n]{0,120}(?:Targeted\s+)?(?:Market\s+Conduct|Financial)\s+Examination\s+Report[^\n]*$"
)
FL_ISSUED = re.compile(r"(?i)Issued:\s*([A-Za-z]+ \d{1,2}, \d{4})")
CONSENT = re.compile(r"(?i)consent\s+order")

ABBREV = {
    "INS": "INSURANCE",
    "EXCH": "EXCHANGE",
    "CAS": "CASUALTY",
    "PROP": "PROPERTY",
    "CO": "COMPANY",
    "COS": "COMPANIES",
    "GRP": "GROUP",
    "REINS": "REINSURANCE",
    "CORP": "CORPORATION",
    "NATL": "NATIONAL",
    "NAT": "NATIONAL",
}


def norm_name(s: str) -> str:
    s = s.upper().replace("&", " AND ")
    s = re.sub(r"[^A-Z0-9\s]", " ", s)
    parts = [ABBREV.get(t, t) for t in s.split()]
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def name_ok(a: str, b: str) -> bool:
    na, nb = norm_name(a), norm_name(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    shorter, longer = (na, nb) if len(na) <= len(nb) else (nb, na)
    if shorter in longer and len(shorter) / max(len(longer), 1) >= 0.75:
        return True
    stop = {"LLC", "INC", "CORP", "LTD", "THE", "AND", "OF", "COMPANY", "CORPORATION"}
    ta = {t for t in na.split() if len(t) >= 2 and t not in stop}
    tb = {t for t in nb.split() if len(t) >= 2 and t not in stop}
    if len(ta) < 2 or len(tb) < 2:
        return False
    if ta == tb:
        return True
    inter = ta & tb
    return bool(inter) and len(inter) / len(ta | tb) >= 0.7


def cover_subjects_ca(text: str) -> list[str]:
    m = COVER_OF.search(text[:6000])
    if not m:
        return []
    lines = [re.sub(r"\s+", " ", x).strip(" ,") for x in m.group(1).splitlines() if x.strip()]
    if len(lines) >= 2:
        return [x for x in lines if len(x) > 4 and not re.fullmatch(r"(?i)insurance company", x)]
    return [re.sub(r"\s+", " ", m.group(1)).strip()]


def table_pairs(text: str) -> list[tuple[str, str, str]]:
    pairs = []
    in_table = False
    for line in text.splitlines():
        if re.search(r"(?i)(NAIC\s+)?(Group/)?Company\s+CoCode|CoCode\s+Domiciled", line):
            in_table = True
            continue
        if in_table and re.match(r"(?i)^\s*(SCOPE|TABLE OF CONTENTS|MANAGEMENT)\b", line):
            in_table = False
        m = NAME_THEN_CODE.match(line.strip())
        if not m:
            continue
        name, code = m.group(1).strip(), m.group(2)
        if code in NON_CANONICAL_CODES:
            continue
        if not re.search(r"[A-Za-z]{3}", name):
            continue
        if re.fullmatch(r"(?i)(company|group|naic|exchange)", name.strip()):
            continue
        loc = "group/company table" if in_table else "other"
        pairs.append((name, code, loc))
    return pairs


def labeled_codes(text: str) -> list[tuple[str, str]]:
    out = []
    for m in LABEL_NEAR.finditer(text):
        if m.group(1) in NON_CANONICAL_CODES:
            continue
        loc = "cover/title" if m.start() < 2500 else "other"
        out.append((m.group(1), loc))
    return out


def florida_cover_subject(cover_text: str) -> dict:
    """Exact FL rule: named subject + labeled NAIC Company Code on cover/title only."""
    heading = FL_HEADING.search(cover_text)
    codes = [c for c in FL_NAIC_COMPANY.findall(cover_text) if c not in NON_CANONICAL_CODES]
    group_hits = FL_NAIC_GROUP.findall(cover_text)
    issued = FL_ISSUED.search(cover_text)
    subject = ""
    if heading:
        after = cover_text[heading.end() :]
        stop = FL_NAIC_COMPANY.search(after)
        blob = after[: stop.start()] if stop else after[:400]
        lines = [re.sub(r"\s+", " ", ln).strip(" ,") for ln in blob.splitlines() if ln.strip()]
        subject = " ".join(x for x in lines if not re.match(r"(?i)^(table of contents|issued:)", x))
        subject = re.sub(r"\s+", " ", subject).strip()
    return {
        "heading": heading.group(0).strip() if heading else None,
        "subject": subject or None,
        "cover_company_codes": list(dict.fromkeys(codes)),
        "cover_group_codes": [g for g in group_hits if re.fullmatch(r"\d+", g)],
        "issued": issued.group(1) if issued else None,
        "evidence_section": "cover/title",
    }


def five_digit_contexts(text: str, code: str) -> list[str]:
    out = []
    for m in re.finditer(re.escape(code), text):
        ctx = re.sub(r"\s+", " ", text[max(0, m.start() - 40) : m.end() + 40])
        out.append(ctx[:120])
        if len(out) >= 3:
            break
    return out


def classify_florida(listing_name: str, full_text: str, cover_text: str) -> dict:
    if CONSENT.search(listing_name) or CONSENT.search(cover_text[:1500]):
        return {
            "classification": "AMBIGUOUS",
            "examined_entities": [],
            "mentioned_only": [],
            "cover_subjects": [],
            "review_reason": "listing_or_cover_is_consent_order_not_examination",
            "all_cocodes_found": [],
            "non_canonical_five_digit": sorted(
                c for c in set(re.findall(r"\b(\d{5})\b", full_text)) if c in NON_CANONICAL_CODES
            ),
            "florida_cover": florida_cover_subject(cover_text),
        }
    if not (full_text or "").strip():
        return {
            "classification": "UNREADABLE",
            "examined_entities": [],
            "mentioned_only": [],
            "cover_subjects": [],
            "review_reason": "native_text_extraction_failed",
            "all_cocodes_found": [],
            "florida_cover": florida_cover_subject(cover_text),
        }

    cover = florida_cover_subject(cover_text)
    later_codes = [
        c
        for c in dict.fromkeys([x[0] for x in labeled_codes(full_text)] + [c for _, c, _ in table_pairs(full_text)])
        if c not in cover["cover_company_codes"] and c not in NON_CANONICAL_CODES
    ]
    non_canonical = sorted(
        {c for c in re.findall(r"\b(\d{5})\b", full_text) if c in NON_CANONICAL_CODES}
    )
    all_found = list(dict.fromkeys(cover["cover_company_codes"] + later_codes + non_canonical))

    codes = cover["cover_company_codes"]
    if not cover["heading"] or not cover["subject"] or not codes:
        mentioned = [c for c in codes + later_codes if c in SPINE]
        return {
            "classification": "COCODE_MENTION_ONLY" if mentioned else "NAME_ONLY",
            "examined_entities": [],
            "mentioned_only": mentioned,
            "cover_subjects": [cover["subject"]] if cover["subject"] else [],
            "review_reason": "florida_cover_missing_named_subject_or_labeled_naic_company_code",
            "all_cocodes_found": all_found,
            "non_canonical_five_digit": non_canonical,
            "florida_cover": cover,
        }
    if len(codes) > 1:
        return {
            "classification": "AMBIGUOUS",
            "examined_entities": [],
            "mentioned_only": [c for c in codes if c in SPINE],
            "cover_subjects": [cover["subject"]],
            "review_reason": "multiple_cover_naic_company_codes_without_consolidated_scope_map",
            "all_cocodes_found": all_found,
            "non_canonical_five_digit": non_canonical,
            "florida_cover": cover,
        }

    code = codes[0]
    if code in NON_CANONICAL_CODES or code not in SPINE:
        return {
            "classification": "COCODE_MENTION_ONLY" if code not in NON_CANONICAL_CODES else "NAME_ONLY",
            "examined_entities": [],
            "mentioned_only": [code] if code in SPINE else [],
            "cover_subjects": [cover["subject"]],
            "review_reason": "cover_cocode_not_on_legal_insurer_spine"
            if code not in SPINE
            else "non_canonical_five_digit_value",
            "all_cocodes_found": all_found,
            "non_canonical_five_digit": non_canonical,
            "florida_cover": cover,
        }

    canon = SPINE[code]
    historical = not name_ok(cover["subject"], canon["legal_name"])
    examined = [
        {
            "source_name": cover["subject"],
            "naic_cocode": code,
            "canonical_entity_id": canon["entity_id"],
            "canonical_name": canon["legal_name"],
            "evidence_location": "cover/title",
            "attachment_class": "HISTORICAL_NAME_REVIEW" if historical else "EXAMINED_ENTITY_EXACT",
            "issued": cover["issued"],
        }
    ]
    mentioned = [c for c in later_codes if c in SPINE]
    if historical:
        return {
            "classification": "HISTORICAL_NAME_REVIEW",
            "examined_entities": [],
            "mentioned_only": [code] + mentioned,
            "cover_subjects": [cover["subject"]],
            "review_reason": "exact_cocode_valid_but_report_era_name_differs_from_canonical",
            "all_cocodes_found": all_found,
            "non_canonical_five_digit": non_canonical,
            "florida_cover": cover,
            "historical_name": {
                "source_name": cover["subject"],
                "canonical_name": canon["legal_name"],
                "naic_cocode": code,
            },
        }
    return {
        "classification": "EXAMINED_ENTITY_EXACT",
        "examined_entities": examined,
        "mentioned_only": mentioned,
        "cover_subjects": [cover["subject"]],
        "review_reason": None,
        "all_cocodes_found": all_found,
        "non_canonical_five_digit": non_canonical,
        "florida_cover": cover,
    }


def classify_document(listing_name: str, text: str, *, jurisdiction: str | None = None) -> dict:
    if not (text or "").strip():
        return {
            "classification": "UNREADABLE",
            "examined_entities": [],
            "mentioned_only": [],
            "cover_subjects": [],
            "review_reason": "native_text_extraction_failed",
            "all_cocodes_found": [],
        }
    pages = text.split("\f")
    cover_text = pages[0] if "\f" in text else "\n".join(text.splitlines()[:80])
    # First ~2 pages approximated by character budget when page breaks absent.
    if "\f" not in text:
        cover_text = text[:4500]

    looks_fl = (jurisdiction or "").upper() in {"FL", "FLORIDA"} or bool(FL_HEADING.search(cover_text))
    if looks_fl:
        return classify_florida(listing_name, text, cover_text)

    # California / generic INS-INSURER-004 path
    subjects = cover_subjects_ca(text)
    pairs = table_pairs(text)
    labeled = labeled_codes(text)
    all_codes = list(dict.fromkeys([c for _, c, _ in pairs] + [c for c, _ in labeled]))
    validated_mentions = [c for c in all_codes if c in SPINE]
    multi = len(subjects) > 1 or bool(re.search(r"(?i)consolidated", listing_name + " " + text[:1500]))
    if not all_codes:
        return {
            "classification": "NAME_ONLY" if not multi else "AMBIGUOUS",
            "examined_entities": [],
            "mentioned_only": [],
            "cover_subjects": subjects,
            "review_reason": "no_five_digit_cocode_next_to_label_or_company_name_line",
            "all_cocodes_found": [],
        }
    examined = []
    used: set[str] = set()
    names_to_match = subjects if subjects else [listing_name]
    for src_name in names_to_match:
        hits = []
        for name, code, loc in pairs:
            if code in SPINE and name_ok(src_name, name) and name_ok(src_name, SPINE[code]["legal_name"]):
                hits.append((code, loc, name))
            elif code in SPINE and name_ok(src_name, SPINE[code]["legal_name"]):
                hits.append((code, loc, name))
        for code, loc in labeled:
            if code in SPINE and name_ok(src_name, SPINE[code]["legal_name"]):
                hits.append((code, loc, SPINE[code]["legal_name"]))
        uniq = list(dict.fromkeys(h[0] for h in hits))
        if len(uniq) == 1:
            code = uniq[0]
            loc = next(h[1] for h in hits if h[0] == code)
            canon = SPINE[code]
            examined.append(
                {
                    "source_name": src_name,
                    "naic_cocode": code,
                    "canonical_entity_id": canon["entity_id"],
                    "canonical_name": canon["legal_name"],
                    "evidence_location": loc,
                    "attachment_class": "CONSOLIDATED_EXAM_EXPLICIT" if multi else "EXAMINED_ENTITY_EXACT",
                }
            )
            used.add(code)
        elif len(uniq) > 1:
            return {
                "classification": "AMBIGUOUS",
                "examined_entities": [],
                "mentioned_only": validated_mentions,
                "cover_subjects": subjects,
                "review_reason": "cover_subject_maps_to_multiple_spine_cocodes",
                "all_cocodes_found": all_codes,
            }
    mentioned = [c for c in validated_mentions if c not in used]
    if multi and examined:
        return {
            "classification": "CONSOLIDATED_EXAM_EXPLICIT",
            "examined_entities": examined,
            "mentioned_only": mentioned,
            "cover_subjects": subjects,
            "review_reason": None,
            "all_cocodes_found": all_codes,
        }
    if not multi and len(examined) == 1:
        return {
            "classification": "EXAMINED_ENTITY_EXACT",
            "examined_entities": examined,
            "mentioned_only": mentioned,
            "cover_subjects": subjects,
            "review_reason": None,
            "all_cocodes_found": all_codes,
        }
    if validated_mentions and not examined:
        return {
            "classification": "COCODE_MENTION_ONLY",
            "examined_entities": [],
            "mentioned_only": validated_mentions,
            "cover_subjects": subjects,
            "review_reason": "cocodes_found_but_not_proven_as_examination_subjects",
            "all_cocodes_found": all_codes,
        }
    if multi and not examined:
        return {
            "classification": "AMBIGUOUS",
            "examined_entities": [],
            "mentioned_only": validated_mentions,
            "cover_subjects": subjects,
            "review_reason": "multi_company_cover_without_deterministic_cocode_map",
            "all_cocodes_found": all_codes,
        }
    return {
        "classification": "NAME_ONLY",
        "examined_entities": [],
        "mentioned_only": [],
        "cover_subjects": subjects,
        "review_reason": "no_validated_exam_subject_cocode",
        "all_cocodes_found": all_codes,
    }
