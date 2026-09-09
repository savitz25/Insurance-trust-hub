"""Extract surplus-lines PDF identities and 2025 statistical-report DOM=CO grains."""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

from openpyxl import load_workbook
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "colorado" / "co-ins-001"
OUT = ROOT / "artifacts" / "co-ins-001" / "surplus-and-dom-census.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def naic5(value: object) -> str | None:
    d = "".join(ch for ch in str(value or "") if ch.isdigit())
    if 3 <= len(d) <= 5:
        return d.zfill(5)
    return None


def extract_surplus() -> dict:
    path = RAW / "colorado-eligible-nonadmitted-2025-2026.pdf"
    reader = PdfReader(str(path))
    pages = []
    for i, page in enumerate(reader.pages):
        pages.append(page.extract_text() or "")
    text = "\n".join(pages)
    (RAW / "surplus-extracted.txt").write_text(text, encoding="utf-8")

    naic = sorted(set(re.findall(r"\b(\d{5})\b", text)))
    # Drop obvious non-NAIC 5-digit noise (years, page numbers, dates).
    yearish = {c for c in naic if c.startswith("202") or c in {"00000", "01262", "01261"}}
    # Keep all 5-digit codes that look like CoCodes; years 2025/2026 are not CoCodes.
    naic_clean = [c for c in naic if c not in {"20250", "20251", "20252", "20253", "20254", "20255", "20256", "20260", "20261", "00000"}]
    naic_clean = [c for c in naic_clean if not c.startswith("202")]
    alien = sorted(set(re.findall(r"\bAA-\d{6,8}\b", text, flags=re.I)))
    # Some PDFs write AA- 1120123 with a space.
    alien += sorted(set(re.findall(r"\bAA-\s*\d{6,8}\b", text, flags=re.I)))
    alien = sorted({re.sub(r"\s+", "", a).upper() for a in alien})

    header_bits = {
        "effective_from": "2025-07-01" if "July 1, 2025" in text or "7/1/2025" in text or "2025-07-01" in text else None,
        "effective_through": "2026-06-30" if "June 30, 2026" in text or "6/30/2026" in text else None,
        "updated": "2026-01-26" if ("1/26/26" in text or "January 26, 2026" in text or "01/26/2026" in text) else None,
        "has_eligible": "eligible" in text.lower(),
        "has_nonadmitted": "nonadmitted" in text.lower() or "non-admitted" in text.lower(),
        "has_alien": "alien" in text.lower(),
    }

    return {
        "filename": path.name,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "pages": len(reader.pages),
        "text_chars": len(text),
        "text_head": text[:2500],
        "distinct_5digit": len(naic),
        "distinct_5digit_cleaned": len(naic_clean),
        "naic_sample": naic_clean[:40],
        "naic_tail": naic_clean[-20:],
        "distinct_alien_aa": len(alien),
        "alien_sample": alien[:40],
        "header_bits": header_bits,
        "yearish_dropped": sorted(yearish),
        "_naic": naic_clean,
        "_alien": alien,
    }


def census_dom() -> dict:
    path = RAW / "Colorado-2025-Statistical-Report.xlsx"
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb["NAIC Companies"]
    rows = list(ws.iter_rows(values_only=True))
    header = [str(c).strip() if c is not None else "" for c in rows[0]]
    naic_i = header.index("NAIC #")
    name_i = header.index("Company Name (Group Number)")
    dom_i = header.index("DOM")
    naics: list[str] = []
    doms: list[str] = []
    data_rows = 0
    co_dom_rows = 0
    co_dom_naic: set[str] = set()
    for rec in rows[1:]:
        if not rec or all(c is None or str(c).strip() == "" for c in rec):
            continue
        data_rows += 1
        code = naic5(rec[naic_i] if naic_i < len(rec) else None)
        if code:
            naics.append(code)
        dom = str(rec[dom_i] if dom_i < len(rec) else "").strip().upper()
        if dom:
            doms.append(dom)
        if dom == "CO":
            co_dom_rows += 1
            if code:
                co_dom_naic.add(code)
    dup = [code for code, n in Counter(naics).items() if n > 1]
    wb.close()
    return {
        "tab": "NAIC Companies",
        "header": header,
        "data_rows": data_rows,
        "distinct_naic": len(set(naics)),
        "duplicate_naic_codes": dup,
        "dom_value_counts": dict(Counter(doms).most_common(20)),
        "colorado_domicile_rows": co_dom_rows,
        "colorado_domicile_distinct_naic": len(co_dom_naic),
        "note": "DOM=CO is domicile on the 2025 statistical-report directory tab, not current Colorado authorization and not the certificates-of-compliance subset.",
    }


def main() -> None:
    surplus = extract_surplus()
    dom = census_dom()
    public = {
        "surplus": {k: v for k, v in surplus.items() if not str(k).startswith("_")},
        "naic_companies_directory": dom,
        "eligible_nonadmitted_total_identities": surplus["distinct_5digit_cleaned"] + surplus["distinct_alien_aa"],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(public, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "pages": surplus["pages"],
        "text_chars": surplus["text_chars"],
        "naic_clean": surplus["distinct_5digit_cleaned"],
        "alien": surplus["distinct_alien_aa"],
        "eligible_total": public["eligible_nonadmitted_total_identities"],
        "header_bits": surplus["header_bits"],
        "naic_sample": surplus["naic_sample"],
        "alien_sample": surplus["alien_sample"],
        "text_head": surplus["text_head"][:800],
        "directory_rows": dom["data_rows"],
        "directory_distinct_naic": dom["distinct_naic"],
        "dup_naic": dom["duplicate_naic_codes"],
        "co_dom_rows": dom["colorado_domicile_rows"],
        "co_dom_naic": dom["colorado_domicile_distinct_naic"],
        "dom_top": dom["dom_value_counts"],
    }, indent=2))


if __name__ == "__main__":
    main()
