"""Revalidate the accepted 10 Florida OIR sample PDFs. No ingest."""
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("cls", ROOT / "scripts/national/ins-insurer-005-classify.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

SAMPLES = [
    (
        "American Coastal",
        "American Coastal Insurance Company (07/18/2025)",
        "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2025/american-coastal-insurance-company-(07-18-2025).pdf",
        ROOT / "data/oir-raw/sample-american-coastal--07-18-2025.pdf",
    ),
    (
        "American Mobile",
        "American Mobile Insurance Exchange (07/11/2025)",
        "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2025/american-mobile-insurance-exchange-(07-11-2025).pdf",
        ROOT / "data/oir-raw/sample-american-mobile-insurance-exchange--07-11-2025.pdf",
    ),
    (
        "Centauri",
        "Centauri Specialty Insurance Company (04/22/2025)",
        "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2025/centauri-specialty-insurance-company-(04-22-2025).pdf",
        ROOT / "data/oir-raw/sample-centauri-specialty--04-22-2025.pdf",
    ),
    (
        "Citizens",
        "Citizens Property Insurance Corporation (1-24-2025)",
        "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2025/citizens-property-insurance-corporation_final-exam-report.pdf",
        ROOT / "data/oir-raw/sample-citizens-property--1-24-2025.pdf",
    ),
    (
        "Clear Blue",
        "Clear Blue Insurance Company (05/22/2025)",
        "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2025/clear-blue-insurance-company-(05-22-2025)5d52a6fe-eeed-4601-919f-7dca46215af2.pdf",
        ROOT / "data/oir-raw/sample-clear-blue--05-22-2025.pdf",
    ),
    (
        "Hartford Midwest",
        "Hartford Insurance Company of the Midwest (01-24-2025)",
        "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2025/2-hartford-midwest_final-report.pdf",
        ROOT / "data/oir-raw/sample-hartford-midwest--01-24-2025.pdf",
    ),
    (
        "Monarch National",
        "Monarch National Insurance Company (04/21/2025)",
        "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2025/monarch-national-insurance-company-(04-21-2025).pdf",
        ROOT / "data/oir-raw/sample-monarch-national--04-21-2025.pdf",
    ),
    (
        "Slide",
        "Slide Insurance Company (08/28/2025)",
        "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2025/slide-ins-final-rpt-ian_idalia_08-28-2025.pdf",
        ROOT / "data/oir-raw/sample-slide-insurance--08-28-2025.pdf",
    ),
    (
        "American Integrity",
        "American Integrity Insurance Company of Florida (3/1/2024)",
        "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2024/american-integrity-insurance-company-of-florida-3-1-2024.pdf",
        ROOT / "data/oir-raw/sample-american-integrity-of-florida--3-1-2024.pdf",
    ),
    (
        "American Traditions",
        "American Traditions Insurance Company (4/1/2024)",
        "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2024/american-traditions-insurance-company-4-1-2024.pdf",
        ROOT / "data/oir-raw/sample-american-traditions--4-1-2024.pdf",
    ),
]


def main() -> None:
    rows = []
    for label, listing, url, path in SAMPLES:
        reader = PdfReader(str(path))
        page_texts = [(p.extract_text() or "") for p in reader.pages]
        cover = "\n".join(page_texts[:2])
        full = "\n".join(page_texts)
        # Embed a form-feed so classify_document uses true cover pages.
        marked = cover + "\f" + "\n".join(page_texts[2:])
        cls = mod.classify_document(listing, marked, jurisdiction="FL")
        rec = {
            "label": label,
            "listing": listing,
            "url": url,
            "pages": len(reader.pages),
            "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "text_ok": bool(full.strip()),
            "subject_legal_name": (cls.get("cover_subjects") or [None])[0],
            "explicit_cover_language": (cls.get("florida_cover") or {}).get("heading"),
            "issued": (cls.get("florida_cover") or {}).get("issued"),
            "all_candidate_cocodes": cls.get("all_cocodes_found") or [],
            "subject_cocode": (cls.get("examined_entities") or [{}])[0].get("naic_cocode")
            if cls.get("examined_entities")
            else None,
            "excluded_cocodes": cls.get("mentioned_only") or [],
            "non_canonical_five_digit": cls.get("non_canonical_five_digit") or [],
            "canonical_match": (cls.get("examined_entities") or [None])[0],
            "classification": cls["classification"],
            "evidence_page_section": "cover/title",
            "review_reason": cls.get("review_reason"),
            "florida_cover": cls.get("florida_cover"),
        }
        print(
            label,
            rec["classification"],
            rec["subject_cocode"],
            rec["subject_legal_name"],
            rec["canonical_match"]["canonical_name"] if rec["canonical_match"] else None,
        )
        rows.append(rec)
    out = ROOT / "data/reports/ins-insurer-005-fl-sample.json"
    out.write_text(json.dumps({"n": len(rows), "rows": rows}, indent=2), encoding="utf-8")
    print("wrote", out)


if __name__ == "__main__":
    main()
