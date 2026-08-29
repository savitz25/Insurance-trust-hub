"""
INS-INSURER-004 — native PDF text extraction of NAIC CoCodes.
CoCode mention ≠ exam subject. No OCR. No name-only attach.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urljoin

from pypdf import PdfReader

LABEL_NEAR = re.compile(
    r"(?i)(?:NAIC\s*(?:Company\s*)?(?:Co[- ]?Code|Code|#)|Company\s*Code|CoCode)\s*[:#]?\s*(\d{5})"
)
BARE_FIVE = re.compile(r"\b(\d{5})\b")
COVER_OF = re.compile(
    r"(?is)REPORT\s+OF\s+EXAMINATION\s+OF\s+THE\s+(.+?)\s+AS\s+OF"
)
GROUP_HINT = re.compile(r"(?i)\b(group code|naic group|holding company|affiliate)\b")


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def extract_pdf_text(path: Path, max_pages: int = 40) -> tuple[str, int, bool]:
    try:
        reader = PdfReader(str(path))
        pages = reader.pages[:max_pages]
        text = "\n".join((p.extract_text() or "") for p in pages)
        return text, len(reader.pages), bool(text.strip())
    except Exception:
        return "", 0, False


def labeled_cocodes(text: str) -> list[dict]:
    out = []
    for m in LABEL_NEAR.finditer(text):
        code = m.group(1)
        start = max(0, m.start() - 80)
        ctx = re.sub(r"\s+", " ", text[start : m.end() + 80])
        loc = "other"
        head = text[:1500].upper()
        if m.start() < 1800:
            loc = "cover/title"
        elif re.search(r"SCOPE OF EXAMINATION", text[: m.start()][-400:], re.I):
            loc = "scope"
        elif re.search(r"Group/Company|NAIC CoCode|Domiciled State", ctx, re.I):
            loc = "group/company table"
        out.append({"cocode": code, "context": ctx[:240], "location": loc})
    return out


def cover_subjects(text: str) -> list[str]:
    m = COVER_OF.search(text[:4000])
    if not m:
        return []
    block = re.sub(r"\s+", " ", m.group(1)).strip()
    # split on likely multi-company covers
    parts = [p.strip(" ,") for p in re.split(r"\s{2,}|\n", m.group(1)) if p.strip()]
    if len(parts) <= 1:
        names = [block]
    else:
        names = [re.sub(r"\s+", " ", p).strip(" ,") for p in parts if len(p.strip()) > 4]
    return [n for n in names if n]


def classify(
    listing_name: str,
    text: str,
    labeled: list[dict],
    spine: dict[str, str],
) -> dict:
    subjects = cover_subjects(text)
    unique_codes = list(dict.fromkeys(c["cocode"] for c in labeled))
    validated = [c for c in unique_codes if c in spine]
    unreadable = not text.strip()
    if unreadable:
        return {
            "classification": "UNREADABLE",
            "examined_entities": [],
            "mentioned_only": unique_codes,
            "review_reason": "native_text_extraction_failed",
        }

    # Consolidated cover: multiple company names before AS OF
    multi = len(subjects) > 1 or bool(re.search(r"(?i)consolidated", listing_name + text[:800]))

    if not labeled:
        return {
            "classification": "NAME_ONLY",
            "examined_entities": [],
            "mentioned_only": [],
            "review_reason": "no_labeled_five_digit_cocode_in_native_text",
            "cover_subjects": subjects,
        }

    if not validated:
        return {
            "classification": "COCODE_MENTION_ONLY",
            "examined_entities": [],
            "mentioned_only": unique_codes,
            "review_reason": "labeled_digits_not_on_legal_insurer_spine_or_not_company_cocode",
            "cover_subjects": subjects,
        }

    if multi:
        # Only attach if cover enumerates companies AND we can map each via Level 3
        # Conservative: hold consolidated unless every cover name maps uniquely via table.
        return {
            "classification": "AMBIGUOUS",
            "examined_entities": [],
            "mentioned_only": validated,
            "review_reason": "consolidated_or_multi_company_cover_without_explicit_per_entity_scope_map",
            "cover_subjects": subjects,
        }

    # Single-company cover: Level 1/2 — require one examined code, not all table codes
    cover_name = subjects[0] if subjects else listing_name
    examined = []
    for code in validated:
        canon = spine[code]
        # name is validation only
        from_ok = _name_ok(cover_name, canon)
        loc = next((x["location"] for x in labeled if x["cocode"] == code), "other")
        if from_ok and loc in {"cover/title", "scope"} or (
            from_ok and len(validated) == 1
        ):
            examined.append(
                {
                    "source_name": cover_name,
                    "naic_cocode": code,
                    "canonical_name": canon,
                    "evidence_location": loc,
                    "name_validation": "match_or_compatible",
                }
            )
    if len(examined) == 1:
        mentioned = [c for c in validated if c != examined[0]["naic_cocode"]]
        return {
            "classification": "EXAMINED_ENTITY_EXACT",
            "examined_entities": examined,
            "mentioned_only": mentioned,
            "review_reason": None,
            "cover_subjects": subjects,
        }
    if len(validated) >= 1 and not examined:
        return {
            "classification": "COCODE_MENTION_ONLY",
            "examined_entities": [],
            "mentioned_only": validated,
            "review_reason": "cocodes_present_but_not_proven_as_exam_subject",
            "cover_subjects": subjects,
        }
    return {
        "classification": "AMBIGUOUS",
        "examined_entities": examined,
        "mentioned_only": [c for c in validated if c not in {e["naic_cocode"] for e in examined}],
        "review_reason": "multiple_or_unmapped_examined_candidates",
        "cover_subjects": subjects,
    }


def _name_ok(a: str, b: str) -> bool:
    def norm(s: str) -> str:
        s = s.upper().replace("&", " AND ")
        s = re.sub(r"[^A-Z0-9\s]", " ", s)
        return re.sub(r"\s+", " ", s).strip()

    na, nb = norm(a), norm(b)
    if not na or not nb:
        return False
    if na == nb or na in nb or nb in na:
        return True
    stop = {
        "LLC",
        "INC",
        "CORP",
        "CO",
        "LTD",
        "THE",
        "INSURANCE",
        "COMPANY",
        "AND",
        "OF",
        "GROUP",
    }
    ta = {t for t in na.split() if len(t) >= 3 and t not in stop}
    tb = {t for t in nb.split() if len(t) >= 3 and t not in stop}
    if not ta or not tb:
        return False
    inter = ta & tb
    if not inter:
        return False
    return len(inter) / len(ta | tb) >= 0.5 or any(len(t) >= 5 for t in inter)


def load_spine(path: Path) -> dict[str, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return {str(r["cocode"]): str(r["legal_name"]) for r in data}
