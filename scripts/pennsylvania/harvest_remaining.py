#!/usr/bin/env python3
"""Fetch remaining PID/PA.gov insurance sources for PA-INS-001."""
from __future__ import annotations

import json
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "data/pennsylvania/pa-ins-001"
RAW = OUT / "raw"
RAW.mkdir(parents=True, exist_ok=True)

CTX = ssl.create_default_context()
UA = "PA-INS-001/1.0 (research; InsuranceTrustHub)"


def fetch(url: str, data: bytes | None = None, method: str | None = None) -> tuple[int, str, str]:
    req = urllib.request.Request(
        url,
        data=data,
        method=method or ("POST" if data else "GET"),
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
            "Content-Type": "application/x-www-form-urlencoded" if data else "text/html",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90, context=CTX) as res:
            body = res.read()
            final = res.geturl()
            status = getattr(res, "status", 200)
            text = body.decode("utf-8", errors="replace")
            return status, final, text
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return e.code, url, body


def save(name: str, text: str) -> Path:
    path = RAW / name
    path.write_text(text, encoding="utf-8")
    return path


def summarize_html(name: str, status: int, final: str, text: str) -> dict:
    titles = re.findall(r"<title[^>]*>(.*?)</title>", text, re.I | re.S)
    title = re.sub(r"\s+", " ", titles[0]).strip() if titles else ""
    current = re.search(r"License information is current as of ([^.<]+)", text, re.I)
    as_of = current.group(1).strip() if current else None
    hrefs = sorted(set(re.findall(r'href=["\']([^"\']+)["\']', text, re.I)))
    interesting = [
        h
        for h in hrefs
        if any(
            k in h.lower()
            for k in [
                "exam",
                "complaint",
                "conduct",
                "surplus",
                "liquidat",
                "enforcement",
                "gfsearch",
                "slsearch",
                "ccfsearch",
                "cmpln",
                "producer",
                "agent",
                "naic",
            ]
        )
    ]
    return {
        "file": name,
        "status": status,
        "finalUrl": final,
        "bytes": len(text),
        "title": title,
        "licenseCurrentAsOf": as_of,
        "interestingHrefs": interesting[:80],
    }


def main() -> None:
    jobs = [
        ("pid-slasearch-form.html", "https://www.pid.pa.gov/dsf/slasearch.html"),
        ("pid-ccfsearch-form.html", "https://www.pid.pa.gov/dsf/ccfsearch.html"),
        ("pid-licensed-form.html", "https://www.pid.pa.gov/dsf/licensed.html"),
        ("complaint-tool.html", "https://www.pid.pa.gov/scrpts/cmpln_tool"),
        ("financial-exam-reports.html", "https://www.pa.gov/agencies/insurance/posted-filings-reports-company-orders/posted-reports/financial-examination-reports.html"),
        ("posted-reports.html", "https://www.pa.gov/agencies/insurance/posted-filings-reports-company-orders/posted-reports"),
        ("company-resources.html", "https://www.pa.gov/agencies/insurance/resources/company-resources.html"),
        ("market-conduct-search.html", "https://www.pa.gov/agencies/insurance/posted-filings-reports-company-orders/posted-reports/market-conduct-examination-reports.html"),
        ("agent-research.html", "https://www.pa.gov/agencies/insurance/consumer-help-center/insurance-company-and-agent-research.html"),
        ("sample-company-aetna.html", "https://www.pid.pa.gov/scrpts/gfsearch?level=2&item=gf0010"),
    ]
    summaries = []
    for name, url in jobs:
        print("GET", url, flush=True)
        status, final, text = fetch(url)
        save(name, text)
        summaries.append(summarize_html(name, status, final, text))
        print(" ", status, final, len(text), summaries[-1]["title"][:80], flush=True)
        time.sleep(0.2)

    print("POST surplus lines empty", flush=True)
    status, final, text = fetch(
        "https://www.pid.pa.gov/scrpts/slsearch",
        data=b"",
        method="POST",
    )
    save("surplus-empty.html", text)
    summaries.append(summarize_html("surplus-empty.html", status, final, text))
    print(" ", status, final, len(text), summaries[-1]["title"][:80], flush=True)

    # Common surplus-lines form fields
    for payload in (
        b"company=",
        b"name=",
        b"sla=",
        urllib.parse.urlencode({"company": "", "submit": "Search"}).encode(),
        urllib.parse.urlencode({"item": "BeginA"}).encode(),
    ):
        print("POST surplus", payload[:80], flush=True)
        status, final, text = fetch("https://www.pid.pa.gov/scrpts/slsearch", data=payload)
        fname = "surplus-" + hashlib_name(payload) + ".html"
        save(fname, text)
        summaries.append(summarize_html(fname, status, final, text))
        print(" ", status, len(text), summaries[-1]["title"][:80], flush=True)
        time.sleep(0.15)

    # Agency / individual probes
    for url, payload, name in (
        (
            "https://www.pid.pa.gov/scrpts/ccfsearch",
            urllib.parse.urlencode({"level": "1", "item": "BeginA"}).encode(),
            "agency-BeginA.html",
        ),
        (
            "https://www.pid.pa.gov/scrpts/ccfsearch",
            b"",
            "agency-empty.html",
        ),
    ):
        print("POST", name, flush=True)
        status, final, text = fetch(url, data=payload)
        save(name, text)
        summaries.append(summarize_html(name, status, final, text))
        print(" ", status, len(text), summaries[-1]["title"][:80], flush=True)

    out = OUT / "remaining-fetch-summary.json"
    out.write_text(json.dumps(summaries, indent=2) + "\n", encoding="utf-8")
    print("WROTE", out)


def hashlib_name(payload: bytes) -> str:
    import hashlib

    return hashlib.sha1(payload).hexdigest()[:10]


if __name__ == "__main__":
    main()
