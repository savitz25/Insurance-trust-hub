"""NJ-INS-002 official source discovery. No CAPTCHA/login bypass."""
from __future__ import annotations

import hashlib
import json
import ssl
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "nj-raw" / "nj-ins-002" / "html"
GEN = ROOT / "data" / "reports"
UA = "InsuranceTrustHub/NJ-INS-002 (research acquisition; +https://www.insurancetrusthub.com)"
CTX = ssl.create_default_context()
URLS = {
    "ihcseh_index": "https://www.nj.gov/dobi/division_insurance/ihcseh/index.html",
    "ihc_enroll": "https://www.nj.gov/dobi/division_insurance/ihcseh/ihcsehenroll.html",
    "ihc_data": "https://www.nj.gov/dobi/division_insurance/ihcseh/data_ihc.htm",
    "ihc_program": "https://www.nj.gov/dobi/division_insurance/ihcseh/program_ihc.htm",
    "ihc_rates_hist": "https://www.nj.gov/dobi/division_insurance/ihcseh/ihchistrate.html",
    "rate_changes_index": "https://www.nj.gov/dobi/division_insurance/ihcseh/averageratechanges/index.html",
    "rate_changes_2025": "https://www.nj.gov/dobi/division_insurance/ihcseh/averageratechanges/2025.html",
    "rate_changes_2026": "https://www.nj.gov/dobi/division_insurance/ihcseh/averageratechanges/2026.html",
    "seh_reports": "https://www.nj.gov/dobi/division_insurance/ihcseh/sehreports.html",
    "seh_program": "https://www.nj.gov/dobi/division_insurance/ihcseh/program_seh.htm",
    "getcovered": "https://nj.gov/getcoverednj/",
    "propcas": "https://www.nj.gov/dobi/division_insurance/propcas.htm",
    "serff_nj": "https://filingaccess.serff.com/sfa/home/NJ",
    "crib_info": "https://www.njcrib.com/InformationServices/InformationServices",
    "crib_planrisk": "https://www.njcrib.com/FileDownload/PlanRiskDownloadProcedure",
    "crib_home": "https://www.njcrib.com/",
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    GEN.mkdir(parents=True, exist_ok=True)
    rows = []
    for key, url in URLS.items():
        rec = {"key": key, "url": url}
        try:
            req = Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*"})
            with urlopen(req, context=CTX, timeout=45) as resp:
                body = resp.read()
                rec.update(
                    {
                        "status": resp.status,
                        "final_url": resp.geturl(),
                        "bytes": len(body),
                        "sha256": hashlib.sha256(body).hexdigest(),
                        "content_type": resp.headers.get("Content-Type"),
                    }
                )
                (OUT / f"{key}.html").write_bytes(body)
                print(f"OK {resp.status} {key} {len(body)}")
        except HTTPError as exc:
            rec.update({"status": exc.code, "error": str(exc.reason), "bytes": 0})
            print(f"HTTP {exc.code} {key}")
        except (URLError, TimeoutError, OSError) as exc:
            rec.update({"status": None, "error": str(exc), "bytes": 0})
            print(f"ERR {key} {exc}")
        rows.append(rec)
        time.sleep(0.12)
    (GEN / "nj-ins-002-discovery.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print("DONE", sum(1 for r in rows if r.get("status") == 200), "/", len(rows))


if __name__ == "__main__":
    main()
