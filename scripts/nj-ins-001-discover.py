"""NJ-INS-001 official DOBI insurance source discovery (stdlib only)."""
from __future__ import annotations

import hashlib
import json
import ssl
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "nj-raw" / "dobi-ins" / "html"
GEN = ROOT / "data" / "reports"
UA = "InsuranceTrustHub/NJ-INS-001 (research acquisition; +https://www.insurancetrusthub.com)"
CTX = ssl.create_default_context()


def urls() -> dict[str, str]:
    mapping = {
        "doi_enforcement_hub": "https://www.nj.gov/dobi/division_insurance/enforcement.htm",
        "doi_enforcement_hub2": "https://www.nj.gov/dobi/division_insurance/insfines.htm",
        "doi_index": "https://www.nj.gov/dobi/division_insurance/index.htm",
        "bfd_enforcement": "https://www.nj.gov/dobi/division_insurance/bfd/enforcement.htm",
        "financial_exams": "https://www.nj.gov/dobi/division_insurance/finexam_reports.htm",
        "mc_exams": "https://www.nj.gov/dobi/division_consumers/insurance/mcexams.htm",
        "mc_exams_html": "https://www.nj.gov/dobi/division_consumers/insurance/mcexams/index.html",
        "inscomp": "https://www.nj.gov/dobi/data/inscomp.htm",
        "inscomp_root": "https://www.nj.gov/dobi/inscomp.htm",
        "inscomp_state": "https://www.state.nj.us/dobi/data/inscomp.htm",
        "auto_consumer": "https://www.nj.gov/dobi/division_consumers/insurance/auto.htm",
        "auto_2024": "https://www.nj.gov/dobi/division_consumers/pdf/2024autoconsumerrpt.pdf",
        "auto_2023": "https://www.nj.gov/dobi/division_consumers/pdf/2023autoconsumerrpt.pdf",
        "rehab": "https://www.nj.gov/dobi/finreceivership/index.htm",
        "rehab2": "https://www.nj.gov/dobi/division_insurance/solvency/receivership.htm",
        "captive_rehab": "https://www.nj.gov/dobi/division_insurance/captive/rehab.htm",
        "surplus": "https://www.nj.gov/dobi/division_insurance/surpluslines.htm",
        "licensee_search": "https://www-dobi.nj.gov/DOBI_LicSearch/",
    }
    for year in range(2006, 2027):
        yy = str(year)[2:]
        mapping[f"doi_enf_{year}"] = f"https://www.nj.gov/dobi/division_insurance/insfines{yy}.htm"
        mapping[f"bfd_enf_{year}"] = (
            f"https://www.nj.gov/dobi/division_insurance/bfd/enforcement{year}.html"
        )
        mapping[f"auto_{year}"] = (
            f"https://www.nj.gov/dobi/division_consumers/pdf/{year}autoconsumerrpt.pdf"
        )
    return mapping


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    GEN.mkdir(parents=True, exist_ok=True)
    results = []
    for key, url in urls().items():
        rec: dict = {"key": key, "url": url}
        try:
            req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urlopen(req, context=CTX, timeout=45) as resp:
                body = resp.read()
                rec.update(
                    {
                        "status": resp.status,
                        "final_url": resp.geturl(),
                        "content_type": resp.headers.get("Content-Type"),
                        "bytes": len(body),
                        "sha256": hashlib.sha256(body).hexdigest(),
                    }
                )
                suffix = ".pdf" if url.lower().endswith(".pdf") else ".html"
                path = OUT / f"{key}{suffix}"
                path.write_bytes(body)
                rec["path"] = path.relative_to(ROOT).as_posix()
                print(f"OK {resp.status} {key} {len(body)}")
        except HTTPError as exc:
            rec.update({"status": exc.code, "error": str(exc.reason), "bytes": 0})
            print(f"HTTP {exc.code} {key}")
        except Exception as exc:  # noqa: BLE001
            rec.update({"status": None, "error": str(exc), "bytes": 0})
            print(f"ERR {key} {exc}")
        results.append(rec)
        time.sleep(0.08)
    (GEN / "nj-ins-001-discovery.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    ok = sum(1 for row in results if row.get("status") == 200)
    print(f"DONE {ok}/{len(results)} 200s")


if __name__ == "__main__":
    main()
