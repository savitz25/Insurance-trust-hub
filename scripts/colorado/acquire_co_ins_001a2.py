"""CO-INS-001A2 bounded official-source acquisition. No Sircon/SERFF scrape."""
from __future__ import annotations

import hashlib
import json
import ssl
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "colorado" / "co-ins-001"
ART = ROOT / "artifacts" / "co-ins-001"
RAW.mkdir(parents=True, exist_ok=True)
ART.mkdir(parents=True, exist_ok=True)

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
CTX = ssl.create_default_context()

URLS = {
    "surplus_2026_2027.pdf": (
        "https://doi.colorado.gov/sites/doi/files/documents/"
        "2026%20Colorado%20Eligible%20Nonadmitted%20Insurers%20Writing%20Surplus%20Lines%2007242026.pdf",
        "https://doi.colorado.gov/insurance-industry/producers/agents/surplus-lines-information-for-agents/agencies/producers/brokers",
    ),
    "complaint_fy2024_25.pdf": (
        "https://doi.colorado.gov/sites/doi/files/documents/"
        "2025%20Colorado%20Division%20of%20Insurance%20Annual%20Complaint%20and%20Recoveries%20Report.pdf",
        "https://doi.colorado.gov/for-consumers/consumer-resources/insurance-complaint-reports",
    ),
    "complaint_reports.html": (
        "https://doi.colorado.gov/for-consumers/consumer-resources/insurance-complaint-reports",
        "https://doi.colorado.gov/",
    ),
    "file_complaint.html": (
        "https://doi.colorado.gov/for-consumers/file-a-complaint",
        "https://doi.colorado.gov/",
    ),
}

STD_LINES = [
    ("AUTO", "Auto"),
    ("HOME", "Home"),
    ("ACHL", "Health"),
    ("ANNT", "Annuity"),
    ("LIFE", "Life"),
    ("HMO", "HMO"),
]


def fetch(url: str, referer: str, timeout: int = 90) -> tuple[int, bytes]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "*/*",
            "Referer": referer,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read() if e.fp else b""
    except Exception as e:
        return 0, str(e).encode()


def sha256_bytes(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def std_url(year: str, code: str) -> str:
    return (
        "http://www.dora.state.co.us/pls/real/ins_comp_ratio_report.generate_report"
        "?p_report_id=Complaint%20Ratio%20and%20Complaint%20Index%20Search%20Results"
        f"&p_report_year={year}&p_policy_type={code}&p_min_complaints=5"
        "&p_min_marketshare=0.10&p_report_format=HTML&p_report_type=Standard%20Reports"
        "&p_order_by=company_name"
    )


def main() -> None:
    report: dict = {"ticket": "CO-INS-001A2", "retrieved_at": "2026-09-09", "files": {}}
    for name, (url, referer) in URLS.items():
        status, body = fetch(url, referer)
        if status == 200 and body:
            (RAW / name).write_bytes(body)
        report["files"][name] = {
            "url": url,
            "http_status": status,
            "bytes": len(body),
            "sha256": sha256_bytes(body) if status == 200 and body else None,
            "is_pdf": body[:4] == b"%PDF",
        }
        print(name, status, len(body), body[:4])

    std: list[dict] = []
    for code, label in STD_LINES:
        url = std_url("2025", code)
        status, body = fetch(url, "http://www.dora.state.co.us/pls/real/ins_comp_ratio_report.std_report_page")
        name = f"complaint-std-2025-{code.lower()}.html"
        if status == 200 and body:
            (RAW / name).write_bytes(body)
        std.append(
            {
                "year": "2025",
                "line_code": code,
                "line_label": label,
                "url": url,
                "http_status": status,
                "bytes": len(body),
                "sha256": sha256_bytes(body) if status == 200 and body else None,
                "filename": name if status == 200 else None,
                "head": body[:120].decode("latin-1", "replace"),
            }
        )
        print("std", code, status, len(body))
    report["standard_reports_2025"] = std
    (ART / "a2-acquisition.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("wrote", ART / "a2-acquisition.json")


if __name__ == "__main__":
    main()
