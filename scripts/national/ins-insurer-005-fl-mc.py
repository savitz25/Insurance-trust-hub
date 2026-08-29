"""Full Florida OIR market-conduct native-text census. No OCR. No ingest."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import re
import subprocess
from collections import Counter
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
OIR = ROOT / "data/oir-raw"
PDF_DIR = OIR / "mc-pdfs"
PDF_DIR.mkdir(parents=True, exist_ok=True)

spec = importlib.util.spec_from_file_location("cls", ROOT / "scripts/national/ins-insurer-005-classify.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

PAGES = [
    (
        "pc",
        "https://floir.gov/property-casualty/property-and-casualty-market-regulation",
        OIR / "pc-market.html",
    ),
    (
        "lh",
        "https://floir.gov/life-health/life-and-health-market-regulation",
        OIR / "lh-market.html",
    ),
]
HREF = re.compile(r'href=["\']([^"\']+\.pdf)["\'][^>]*>(.*?)</a>', re.I | re.S)
TAG = re.compile(r"<[^>]+>")
MONTHS = {
    "January": "01",
    "February": "02",
    "March": "03",
    "April": "04",
    "May": "05",
    "June": "06",
    "July": "07",
    "August": "08",
    "September": "09",
    "October": "10",
    "November": "11",
    "December": "12",
}


def curl(url: str, dest: Path, timeout: str = "90") -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1500:
        return
    tmp = dest.with_suffix(dest.suffix + ".part")
    cmd = [
        "curl.exe",
        "-fsSL",
        "--retry",
        "2",
        "--max-time",
        timeout,
        "-A",
        "InsuranceTrustHub-research/ins-insurer-005",
        "-o",
        str(tmp),
        url,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not tmp.exists() or tmp.stat().st_size < 800:
        if tmp.exists():
            tmp.unlink()
        raise RuntimeError((r.stderr or r.stdout or f"curl {r.returncode}")[:240])
    tmp.replace(dest)


def abs_url(u: str) -> str:
    u = u.replace("&amp;", "&").strip()
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("http://"):
        return "https://" + u[len("http://") :]
    if u.startswith("/"):
        return "https://floir.gov" + u
    return u


def listing_rows() -> list[dict]:
    rows = []
    seen = set()
    for label, url, dest in PAGES:
        curl(url, dest, timeout="60")
        html = dest.read_text(encoding="utf-8", errors="replace")
        for href, title in HREF.findall(html):
            title = re.sub(r"\s+", " ", TAG.sub(" ", title)).strip()
            pdf = abs_url(href)
            key = pdf.split("?")[0].lower()
            if key in seen:
                continue
            seen.add(key)
            rows.append({"page": label, "listing_page": url, "title": title, "url": pdf})
    return rows


def iso_issued(s: str | None) -> str | None:
    if not s:
        return None
    m = re.match(r"([A-Za-z]+) (\d{1,2}), (\d{4})$", s.strip())
    if not m:
        return None
    mon = MONTHS.get(m.group(1))
    if not mon:
        return None
    return f"{m.group(3)}-{mon}-{int(m.group(2)):02d}"


def classify_one(row: dict) -> dict:
    fname = re.sub(r"[^a-zA-Z0-9._-]+", "-", row["url"].rsplit("/", 1)[-1])[:180]
    dest = PDF_DIR / fname
    rec = {
        "regulator": "Florida Office of Insurance Regulation",
        "source_dataset": "florida_oir_market_conduct_exams",
        "jurisdiction": "FL",
        "listing_title": row["title"],
        "listing_page": row["listing_page"],
        "document_url": row["url"],
    }
    try:
        curl(row["url"], dest)
        raw = dest.read_bytes()
        rec["document_hash"] = hashlib.sha256(raw).hexdigest()
        rec["file_size"] = len(raw)
        reader = PdfReader(str(dest))
        page_texts = [(p.extract_text() or "") for p in reader.pages[:40]]
        cover = "\n".join(page_texts[:2])
        marked = cover + "\f" + "\n".join(page_texts[2:])
        rec["page_count"] = len(reader.pages)
        rec["text_ok"] = bool(cover.strip() or marked.strip())
        rec.update(mod.classify_document(row["title"], marked, jurisdiction="FL"))
        issued = (rec.get("florida_cover") or {}).get("issued")
        rec["report_date"] = iso_issued(issued)
        rec["retrieved_at"] = "2026-08-29T21:30:00Z"
    except Exception as e:
        rec["classification"] = "UNREADABLE"
        rec["examined_entities"] = []
        rec["mentioned_only"] = []
        rec["review_reason"] = str(e)[:240]
        rec["text_ok"] = False
        rec["retrieved_at"] = "2026-08-29T21:30:00Z"
    return rec


def main() -> None:
    listings = listing_rows()
    print("listings", len(listings), flush=True)
    docs: list[dict] = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(classify_one, row): i for i, row in enumerate(listings, 1)}
        done = 0
        for fut in as_completed(futs):
            rec = fut.result()
            docs.append(rec)
            done += 1
            if done % 25 == 0 or done == len(listings):
                print(done, "/", len(listings), rec.get("classification"), rec.get("listing_title", "")[:60], flush=True)

    docs.sort(key=lambda d: d.get("listing_title") or "")
    classes = Counter(d.get("classification") for d in docs)
    exact_rel = [e for d in docs for e in d.get("examined_entities") or []]
    exact_docs = [d for d in docs if d.get("classification") in {"EXAMINED_ENTITY_EXACT", "CONSOLIDATED_EXAM_EXPLICIT"}]
    census = {
        "task": "INS-INSURER-005",
        "source": "florida_oir_market_conduct_exams",
        "retrieved_at": "2026-08-29T21:30:00Z",
        "listing_count": len(listings),
        "unique_pdfs": len({d.get("document_url") for d in docs}),
        "class_counts": dict(classes),
        "X_fl": {
            "n": len(docs),
            "text_ok": sum(1 for d in docs if d.get("text_ok")),
            "EXAMINED_ENTITY_EXACT": classes.get("EXAMINED_ENTITY_EXACT", 0),
            "CONSOLIDATED_EXAM_EXPLICIT": classes.get("CONSOLIDATED_EXAM_EXPLICIT", 0),
            "COCODE_MENTION_ONLY": classes.get("COCODE_MENTION_ONLY", 0),
            "NAME_ONLY": classes.get("NAME_ONLY", 0),
            "AMBIGUOUS": classes.get("AMBIGUOUS", 0),
            "UNREADABLE": classes.get("UNREADABLE", 0),
            "HISTORICAL_NAME_REVIEW": classes.get("HISTORICAL_NAME_REVIEW", 0),
            "exact_relationships": len(exact_rel),
            "unique_examined_cocodes": len({e["naic_cocode"] for e in exact_rel}),
            "non_canonical_32399_docs": sum(1 for d in docs if "32399" in (d.get("non_canonical_five_digit") or [])),
        },
        "documents": docs,
        "exact_ingest_candidates": [
            {
                "document_url": d["document_url"],
                "document_hash": d.get("document_hash"),
                "listing_title": d.get("listing_title"),
                "report_date": d.get("report_date"),
                "retrieved_at": d.get("retrieved_at"),
                "classification": d.get("classification"),
                "examined_entities": d.get("examined_entities"),
                "issued": (d.get("florida_cover") or {}).get("issued"),
                "subject": (d.get("cover_subjects") or [None])[0],
            }
            for d in exact_docs
        ],
    }
    path = ROOT / "data/reports/ins-insurer-005-fl-mc-census.json"
    path.write_text(json.dumps(census, indent=2), encoding="utf-8")
    print(json.dumps(census["X_fl"], indent=2))
    print("wrote", path)


if __name__ == "__main__":
    main()
