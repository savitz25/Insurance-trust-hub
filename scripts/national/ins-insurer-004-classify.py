"""Classify native PDF text: examined CoCode vs mentioned CoCode. No OCR. No name-only attach."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPINE_ROWS = json.loads((ROOT / "data/reports/ins-insurer-004-spine.json").read_text(encoding="utf-8"))
SPINE = {r["cocode"]: r for r in SPINE_ROWS}

LABEL_NEAR = re.compile(
    r"(?i)(?:NAIC\s*(?:Company\s*)?(?:Co[- ]?Code|Code|#)|Company\s*Code)\s*[:#]?\s*(\d{5})"
)
NAME_THEN_CODE = re.compile(r"(?m)^[\s]*(.{4,80}?)\s(\d{5})[\s]*$")
COVER_OF = re.compile(r"(?is)REPORT\s+OF\s+EXAMINATION\s+OF\s+THE\s+(.+?)\s+AS\s+OF")


ABBREV = {
    "INS": "INSURANCE",
    "EXCH": "EXCHANGE",
    "CAS": "CASUALTY",
    "PROP": "PROPERTY",
    "CO": "COMPANY",
    "COS": "COMPANIES",
    "GRP": "GROUP",
    "REINS": "REINSURANCE",
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
    if shorter in longer and len(shorter) / max(len(longer), 1) >= 0.85:
        return True
    stop = {"LLC", "INC", "CORP", "LTD", "THE", "AND", "OF", "COMPANY"}
    ta = {t for t in na.split() if len(t) >= 2 and t not in stop}
    tb = {t for t in nb.split() if len(t) >= 2 and t not in stop}
    if len(ta) < 2 or len(tb) < 2:
        return False
    if ta == tb:
        return True
    return False


def cover_subjects(text: str) -> list[str]:
    m = COVER_OF.search(text[:6000])
    if not m:
        return []
    lines = [re.sub(r"\s+", " ", x).strip(" ,") for x in m.group(1).splitlines() if x.strip()]
    if len(lines) >= 2:
        return [x for x in lines if len(x) > 4 and not re.fullmatch(r"(?i)insurance company", x)]
    return [re.sub(r"\s+", " ", m.group(1)).strip()]


def table_pairs(text: str) -> list[tuple[str, str, str]]:
    """Name + 5-digit code lines, typically under a CoCode table header."""
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
        if not re.search(r"[A-Za-z]{3}", name):
            continue
        if re.fullmatch(r"(?i)(company|group|naic|exchange)", name.strip()):
            continue
        loc = "group/company table" if in_table or re.search(r"(?i)cocode", text[max(0, text.find(line) - 200) : text.find(line) + 1]) else "other"
        pairs.append((name, code, loc))
    return pairs


def labeled_codes(text: str) -> list[tuple[str, str]]:
    out = []
    for m in LABEL_NEAR.finditer(text):
        loc = "cover/title" if m.start() < 2500 else "other"
        out.append((m.group(1), loc))
    return out


def classify_document(listing_name: str, text: str) -> dict:
    if not (text or "").strip():
        return {
            "classification": "UNREADABLE",
            "examined_entities": [],
            "mentioned_only": [],
            "cover_subjects": [],
            "review_reason": "native_text_extraction_failed",
            "all_cocodes_found": [],
        }
    subjects = cover_subjects(text)
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
    used = set()
    # Map cover subjects to table/label CoCodes (name is validation, CoCode is identity)
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
            canon = SPINE[code]["legal_name"]
            if name_ok(src_name, canon) is False:
                continue
            examined.append(
                {
                    "source_name": src_name,
                    "naic_cocode": code,
                    "canonical_entity_id": SPINE[code]["entity_id"],
                    "canonical_name": canon,
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
    name_mismatch = []
    for code in validated_mentions:
        # historical/wrong association: labeled code whose canonical name conflicts with sole cover name
        if not multi and subjects and not name_ok(subjects[0], SPINE[code]["legal_name"]) and code in used:
            name_mismatch.append(code)

    if name_mismatch:
        return {
            "classification": "REVIEW_REQUIRED",
            "examined_entities": [],
            "mentioned_only": validated_mentions,
            "cover_subjects": subjects,
            "review_reason": "cocode_canonical_name_conflicts_with_exam_subject",
            "all_cocodes_found": all_codes,
        }

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
