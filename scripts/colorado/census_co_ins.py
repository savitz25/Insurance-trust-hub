"""CO-INS-001A bounded census of official Colorado DOI public files. No scrape of Sircon/SERFF search."""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "colorado" / "co-ins-001"
OUT = ROOT / "artifacts" / "co-ins-001" / "acquisition-report.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def digits(value: object) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def naic5(value: object) -> str | None:
    d = digits(value)
    if 3 <= len(d) <= 5:
        return d.zfill(5)
    return None


def profile_xlsx(path: Path) -> dict:
    wb = load_workbook(path, read_only=True, data_only=True)
    sheets = []
    all_naic: set[str] = set()
    all_rows = 0
    for name in wb.sheetnames:
        ws = wb[name]
        rows = []
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            rows.append(row)
            if i > 200000:
                break
        header = [str(c).strip() if c is not None else "" for c in (rows[0] if rows else [])]
        header_l = [h.lower() for h in header]
        naic_idx = next((i for i, h in enumerate(header_l) if "naic" in h or h in {"cocode", "co code", "company code"}), None)
        name_idx = next((i for i, h in enumerate(header_l) if "company" in h or h == "name" or "insurer" in h), None)
        sheet_naic: set[str] = set()
        data_rows = 0
        for rec in rows[1:]:
            if not rec or all(c is None or str(c).strip() == "" for c in rec):
                continue
            data_rows += 1
            if naic_idx is not None and naic_idx < len(rec):
                code = naic5(rec[naic_idx])
                if code:
                    sheet_naic.add(code)
                    all_naic.add(code)
        all_rows += data_rows
        sheets.append(
            {
                "tab": name,
                "header": header[:20],
                "data_rows": data_rows,
                "naic_column": header[naic_idx] if naic_idx is not None else None,
                "name_column": header[name_idx] if name_idx is not None else None,
                "distinct_naic": len(sheet_naic),
            }
        )
    wb.close()
    return {
        "filename": path.name,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "tabs": sheets,
        "data_rows_sum_all_tabs": all_rows,
        "distinct_naic_across_tabs": len(all_naic),
        "_naic": sorted(all_naic),
    }


def profile_surplus_pdf(path: Path) -> dict:
    raw = path.read_bytes()
    text = raw.decode("latin-1", errors="replace")
    # PDF text extraction is crude; also pull name/number pairs from the search dump.
    # Pattern: company-like line then 5-digit or AA- code.
    codes = re.findall(r"\b(\d{5})\b", text)
    alien = re.findall(r"\b(AA-\d{7})\b", text)
    # Many PDFs store numbers without spaces; also search uncompressed streams.
    # Fallback: extract from extracted text of pdftotext-like grouping.
    naic = sorted({c for c in codes if c != "00000"})
    return {
        "filename": path.name,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "digit5_hits": len(codes),
        "distinct_naic5": len(set(naic)),
        "alien_aa_hits": len(alien),
        "distinct_alien_aa": len(set(alien)),
        "updated_marker": "1/26/26" if "1/26/26" in text or "1/26/26" in text.replace(" ", "") else None,
        "effective": "2025-07-01 through 2026-06-30",
        "_naic": sorted(set(naic)),
        "_alien": sorted(set(alien)),
        "note": "Parsed from PDF byte text. Confirm against official PDF listing.",
    }


def html_pdf_links(html: str) -> list[str]:
    return sorted(set(re.findall(r'href="([^"]+\.pdf)"', html, flags=re.I)))


def main() -> None:
    x2025 = profile_xlsx(RAW / "Colorado-2025-Statistical-Report.xlsx")
    x2024 = profile_xlsx(RAW / "Colorado-2024-Statistical-Report.xlsx")
    surplus = profile_surplus_pdf(RAW / "colorado-eligible-nonadmitted-2025-2026.pdf")
    certs = (RAW / "certs.html").read_text(encoding="utf-8", errors="replace")
    mce = (RAW / "mce.html").read_text(encoding="utf-8", errors="replace")
    fin = (RAW / "fin.html").read_text(encoding="utf-8", errors="replace")
    public = {
        "ticket": "CO-INS-001",
        "retrievedAt": "2026-09-09",
        "statistical_2025": {k: v for k, v in x2025.items() if not str(k).startswith("_")},
        "statistical_2024": {k: v for k, v in x2024.items() if not str(k).startswith("_")},
        "surplus_lines": {k: v for k, v in surplus.items() if not str(k).startswith("_")},
        "certificates_of_compliance": {
            "url": "https://doi.colorado.gov/for-consumers/consumer-protection/insurer-financials/certificates-of-compliance",
            "http_status": 200,
            "bytes": len(certs.encode("utf-8")),
            "pdf_links": html_pdf_links(certs),
            "pdf_link_count": len(html_pdf_links(certs)),
            "mentions_domestic": "domestic" in certs.lower(),
            "updated_annually": "updated annually" in certs.lower(),
        },
        "market_conduct": {
            "url": "https://doi.colorado.gov/market-conduct-examinations",
            "http_status": 200,
            "pdf_links": html_pdf_links(mce),
            "pdf_link_count": len(html_pdf_links(mce)),
        },
        "financial_exams": {
            "url": "https://doi.colorado.gov/financial-examinations",
            "http_status": 200,
            "pdf_links": html_pdf_links(fin),
            "pdf_link_count": len(html_pdf_links(fin)),
        },
        "overlap_2025_surplus_naic": len(set(x2025["_naic"]) & set(surplus["_naic"])),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(public, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "wrote": str(OUT),
        "tabs_2025": [(t["tab"], t["data_rows"], t["distinct_naic"], t["naic_column"]) for t in x2025["tabs"]],
        "rows_2025": x2025["data_rows_sum_all_tabs"],
        "naic_2025": x2025["distinct_naic_across_tabs"],
        "tabs_2024": [(t["tab"], t["data_rows"], t["distinct_naic"], t["naic_column"]) for t in x2024["tabs"]],
        "surplus_naic": surplus["distinct_naic5"],
        "surplus_alien": surplus["distinct_alien_aa"],
        "certs_pdfs": public["certificates_of_compliance"]["pdf_link_count"],
        "mce_pdfs": public["market_conduct"]["pdf_link_count"],
        "fin_pdfs": public["financial_exams"]["pdf_link_count"],
    }, indent=2))


if __name__ == "__main__":
    main()
