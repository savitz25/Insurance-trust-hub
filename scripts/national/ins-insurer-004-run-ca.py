"""Full native-text pass over unique CDI financial exam PDFs. No OCR. No ingest."""
from __future__ import annotations

import hashlib
import json
import urllib.request
from pathlib import Path
from pypdf import PdfReader
import importlib.util

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("cls", ROOT / "scripts/national/ins-insurer-004-classify.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

LIST = json.loads((ROOT / "data/reports/ins-insurer-004-cdi-listing.json").read_text(encoding="utf-8"))
OUT_DIR = ROOT / "data/cdi-raw/pdfs"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def fetch(url: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 2000:
        return
    req = urllib.request.Request(url, headers={"User-Agent": "InsuranceTrustHub-research/ins-insurer-004"})
    with urllib.request.urlopen(req, timeout=90) as r:
        dest.write_bytes(r.read())


def main() -> None:
    by_url: dict[str, list] = {}
    for row in LIST:
        by_url.setdefault(row["url"], []).append(row["listing_name"])

    docs = []
    for i, (url, names) in enumerate(by_url.items(), 1):
        fname = url.rsplit("/", 1)[-1]
        dest = OUT_DIR / fname
        print(f"{i}/{len(by_url)} {fname[:70]}")
        rec = {
            "regulator": "California Department of Insurance",
            "source_dataset": "california_cdi_financial_exams",
            "document_url": url,
            "listing_names": names,
            "listing_name": names[0],
        }
        try:
            fetch(url, dest)
            raw = dest.read_bytes()
            rec["document_hash"] = hashlib.sha256(raw).hexdigest()
            rec["file_size"] = len(raw)
            reader = PdfReader(str(dest))
            text = "\n".join((p.extract_text() or "") for p in reader.pages[:60])
            rec["page_count"] = len(reader.pages)
            rec["text_ok"] = bool(text.strip())
            rec.update(mod.classify_document(names[0], text))
        except Exception as e:
            rec["classification"] = "UNREADABLE"
            rec["examined_entities"] = []
            rec["mentioned_only"] = []
            rec["review_reason"] = str(e)[:200]
            rec["text_ok"] = False
        rec["retrieved_at"] = "2026-08-29T20:40:00Z"
        docs.append(rec)
        print(" ", rec.get("classification"), "exam", len(rec.get("examined_entities") or []))

    classes = {}
    for d in docs:
        classes[d["classification"]] = classes.get(d["classification"], 0) + 1
    exact_rel = [e for d in docs for e in d.get("examined_entities") or []]
    mentioned = [c for d in docs for c in d.get("mentioned_only") or []]
    x = {
        "X1": len(docs),
        "X2": sum(1 for d in docs if d.get("text_ok")),
        "X3": sum(1 for d in docs if d.get("all_cocodes_found")),
        "X4": sum(1 for d in docs if d.get("examined_entities") or d.get("mentioned_only")),
        "X5": classes.get("EXAMINED_ENTITY_EXACT", 0),
        "X6": classes.get("CONSOLIDATED_EXAM_EXPLICIT", 0),
        "X7": classes.get("COCODE_MENTION_ONLY", 0),
        "X8": classes.get("NAME_ONLY", 0),
        "X9": classes.get("AMBIGUOUS", 0),
        "X10": classes.get("UNREADABLE", 0),
        "X11": len({e["naic_cocode"] for e in exact_rel}),
        "X12": len(exact_rel),
        "X13": 0,
        "mention_only_cocode_instances": len(mentioned),
        "class_counts": classes,
        "class_sum": sum(classes.values()),
    }
    out = {
        "task": "INS-INSURER-004",
        "retrieved_at": "2026-08-29T20:40:00Z",
        "denominators": x,
        "documents": docs,
    }
    path = ROOT / "data/reports/ins-insurer-004-exam-cocode-extraction.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(x, indent=2))
    print("wrote", path)


if __name__ == "__main__":
    main()
