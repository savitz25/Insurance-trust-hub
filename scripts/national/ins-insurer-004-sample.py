"""Download and classify the required sample PDFs. No ingest."""
from __future__ import annotations

import json
import hashlib
import re
import urllib.request
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
CDI_DIR = ROOT / "data/cdi-raw"
OIR_DIR = ROOT / "data/oir-raw"
SPINE = {r["cocode"]: r["legal_name"] for r in json.loads((ROOT / "data/reports/ins-insurer-004-spine.json").read_text(encoding="utf-8"))}

LABEL_NEAR = re.compile(
    r"(?i)(?:NAIC\s*(?:Company\s*)?(?:Co[- ]?Code|Code|#)|Company\s*Code|CoCode)\s*[:#]?\s*(\d{5})"
)
COVER_OF = re.compile(r"(?is)REPORT\s+OF\s+EXAMINATION\s+OF\s+THE\s+(.+?)\s+AS\s+OF")


def fetch(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1000:
        return
    req = urllib.request.Request(url, headers={"User-Agent": "InsuranceTrustHub-research/ins-insurer-004"})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


def extract(path: Path) -> tuple[str, int, bool, int]:
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    try:
        reader = PdfReader(str(path))
        text = "\n".join((p.extract_text() or "") for p in reader.pages[:50])
        return text, len(reader.pages), bool(text.strip()), len(data)
    except Exception:
        return "", 0, False, len(data)


def labeled(text: str) -> list[dict]:
    out = []
    for m in LABEL_NEAR.finditer(text):
        start = max(0, m.start() - 90)
        ctx = re.sub(r"\s+", " ", text[start : m.end() + 90])
        loc = "cover/title" if m.start() < 2000 else "other"
        if re.search(r"(?i)Group/Company|Domiciled State|NAIC CoCode", ctx):
            loc = "group/company table"
        if re.search(r"(?i)scope of examination", text[max(0, m.start() - 500) : m.start()]):
            loc = "scope"
        out.append({"cocode": m.group(1), "location": loc, "context": ctx[:220]})
    return out


def cover_names(text: str) -> list[str]:
    m = COVER_OF.search(text[:5000])
    if not m:
        return []
    raw = m.group(1)
    lines = [re.sub(r"\s+", " ", x).strip(" ,") for x in raw.splitlines() if x.strip()]
    if len(lines) >= 2:
        return [x for x in lines if len(x) > 4]
    return [re.sub(r"\s+", " ", raw).strip()]


def name_ok(a: str, b: str) -> bool:
    def norm(s: str) -> str:
        s = s.upper().replace("&", " AND ")
        s = re.sub(r"[^A-Z0-9\s]", " ", s)
        return re.sub(r"\s+", " ", s).strip()

    na, nb = norm(a), norm(b)
    if not na or not nb:
        return False
    if na == nb or na in nb or nb in na:
        return True
    stop = {"LLC", "INC", "CORP", "CO", "LTD", "THE", "INSURANCE", "COMPANY", "AND", "OF", "GROUP", "EXCHANGE"}
    ta = {t for t in na.split() if len(t) >= 3 and t not in stop}
    tb = {t for t in nb.split() if len(t) >= 3 and t not in stop}
    if not ta or not tb:
        return False
    inter = ta & tb
    return bool(inter) and (len(inter) / len(ta | tb) >= 0.5 or any(len(t) >= 5 for t in inter))


def classify(listing: str, text: str, found: list[dict]) -> dict:
    subjects = cover_names(text)
    codes = list(dict.fromkeys(x["cocode"] for x in found))
    validated = [c for c in codes if c in SPINE]
    if not text.strip():
        return {"classification": "UNREADABLE", "examined": [], "mentioned": codes, "cover": subjects, "reason": "no_native_text"}
    multi = len(subjects) > 1 or bool(re.search(r"(?i)consolidated", listing + text[:1200]))
    if not found:
        return {"classification": "NAME_ONLY", "examined": [], "mentioned": [], "cover": subjects, "reason": "no_labeled_cocode"}
    if not validated:
        return {"classification": "COCODE_MENTION_ONLY", "examined": [], "mentioned": codes, "cover": subjects, "reason": "not_on_spine"}
    if multi:
        return {
            "classification": "AMBIGUOUS",
            "examined": [],
            "mentioned": validated,
            "cover": subjects,
            "reason": "consolidated_or_multi_subject_without_explicit_per_entity_scope",
        }
    cover = subjects[0] if subjects else listing
    examined = []
    for c in validated:
        loc = next(x["location"] for x in found if x["cocode"] == c)
        ok = name_ok(cover, SPINE[c])
        if ok and (loc in {"cover/title", "scope"} or len(validated) == 1):
            examined.append({"source_name": cover, "naic_cocode": c, "canonical_name": SPINE[c], "location": loc})
    if len(examined) == 1:
        return {
            "classification": "EXAMINED_ENTITY_EXACT",
            "examined": examined,
            "mentioned": [c for c in validated if c != examined[0]["naic_cocode"]],
            "cover": subjects,
            "reason": None,
        }
    if not examined:
        return {
            "classification": "COCODE_MENTION_ONLY",
            "examined": [],
            "mentioned": validated,
            "cover": subjects,
            "reason": "codes_not_proven_as_exam_subject",
        }
    return {"classification": "AMBIGUOUS", "examined": examined, "mentioned": validated, "cover": subjects, "reason": "unresolved_scope"}


CA = [
    ("ca-auto", "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0400-reports-examination/upload/California-Automobile-Insurance-Company-2021-Exam-Report-Final-ADA.pdf", "California Automobile Insurance Company - as of 12-31-21"),
    ("allianz", "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0400-reports-examination/upload/Allianz-Reinsurance-America-Inc-2023-Exam-Report-Final-ADA.pdf", "Allianz Reinsurance America, Inc. - as of 12-31-23"),
    ("csaa", "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0400-reports-examination/upload/CSAA-Insurance-Exchange-2023-Report-of-Examination.pdf", "CSAA Insurance Exchange - as of 12-31-23"),
    ("anchor", "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0400-reports-examination/upload/Anchor-General-Insurance-Company-2022-Exam-Report-Final-ADA.pdf", "Anchor General Insurance Company - as of 12-31-22"),
    ("blueshield", "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0400-reports-examination/upload/Blue-Shield-of-California-Life-Health-Insurance-Company-2024-Exam-Report.pdf", "Blue Shield of California Life & Health Insurance Company - as of 12-31-24"),
    ("amt", "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0400-reports-examination/upload/AMT-Home-Protection-Company-2024-Exam-Report-Final.pdf", "AMT Home Protection Company - as of 12-31-24"),
    ("aspire", "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0400-reports-examination/upload/Aspire-General-Insurance-Company-2023-Exam-Report-Final-ADA.pdf", "Aspire General Insurance Company - as of 12-31-23"),
    ("compwest", "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0400-reports-examination/upload/CompWest-Insurance-Company-2023-Report-of-Examination.pdf", "CompWest Insurance Company - as of 12-31-23"),
    ("21st-casualty-shared", "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0400-reports-examination/upload/21st-Century-Casualty-Company-2021-Exam-Report-Final-ADA.pdf", "21st Century Casualty Company / 21st Century Insurance Company SHARED PDF"),
    ("farmers-consolidated", "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0400-reports-examination/upload/Farmers-Insurance-Group-Consolidated-Exam-Report-Final-as-of-12-2021-ADA.pdf", "Farmers Insurance Group Consolidated (8 listing titles)"),
]

FL = [
    ("fl-coastal", "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2025/american-coastal-insurance-company-(07-18-2025).pdf", "American Coastal Insurance Company (07/18/2025)"),
    ("fl-mobile", "https://floir.gov/docs-sf/property-casualty-libraries/market-regulation/2025/american-mobile-insurance-exchange-(07-11-2025).pdf", "American Mobile Insurance Exchange (07/11/2025)"),
]


def fl_insurance_pdfs() -> list[tuple[str, str, str]]:
    html = (OIR_DIR / "pc-market.html").read_text(encoding="utf-8", errors="replace")
    pdfs = re.findall(r'href="([^"]+\.pdf)"[^>]*>([^<]{5,160})', html, re.I)
    seen = set()
    out = []
    for u, t in pdfs:
        t = t.strip()
        if "Insurance" not in t and "Exchange" not in t:
            continue
        if "Premium Finance" in t or "pfc" in u.lower() or "pfco" in u.lower():
            continue
        url = u if u.startswith("http") else "https://floir.gov" + u
        if url in seen:
            continue
        seen.add(url)
        slug = re.sub(r"[^a-z0-9]+", "-", t.lower())[:40]
        out.append((slug, url, t))
        if len(out) >= 10:
            break
    return out


def main() -> None:
    rows = []
    samples = [("CA", *x) for x in CA] + [("FL", *x) for x in fl_insurance_pdfs()]
    dest_root = {"CA": CDI_DIR, "FL": OIR_DIR}
    for i, (reg, slug, url, listing) in enumerate(samples, 1):
        dest = dest_root[reg] / f"sample-{slug}.pdf"
        print(f"GET {i}/{len(samples)} {listing[:70]}")
        try:
            fetch(url, dest)
        except Exception as e:
            rows.append({"regulator": reg, "listing": listing, "url": url, "error": str(e), "classification": "UNREADABLE"})
            continue
        text, pages, ok, size = extract(dest)
        found = labeled(text)
        cls = classify(listing, text, found)
        digest = hashlib.sha256(dest.read_bytes()).hexdigest()
        rows.append(
            {
                "regulator": reg,
                "listing": listing,
                "url": url,
                "pages": pages,
                "bytes": size,
                "sha256": digest,
                "text_ok": ok,
                "all_labeled_cocodes": found,
                **cls,
            }
        )
        print(" ", cls["classification"], "examined", cls.get("examined"), "mentioned", cls.get("mentioned")[:8], "cover", cls.get("cover")[:4])
    outp = ROOT / "data/reports/ins-insurer-004-sample-validation.json"
    outp.write_text(json.dumps({"n": len(rows), "rows": rows}, indent=2), encoding="utf-8")
    print("wrote", outp, "n", len(rows))


if __name__ == "__main__":
    main()
