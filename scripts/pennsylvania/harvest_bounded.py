#!/usr/bin/env python3
"""Harvest bounded PID A-Z lists, complaint tool, producer/agency probes."""
from __future__ import annotations

import json
import re
import ssl
import string
import time
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "data/pennsylvania/pa-ins-001"
RAW = OUT / "raw"
RAW.mkdir(parents=True, exist_ok=True)
CTX = ssl.create_default_context()
UA = "PA-INS-001/1.0 (research; InsuranceTrustHub)"

ROW_RE = re.compile(
    r"<tr[^>]*>\s*<td[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>",
    re.I | re.S,
)
NAME_RE = re.compile(r"<a[^>]*>(.*?)</a>", re.I | re.S)
NAIC_RE = re.compile(r"\b(\d{5})\b")


def fetch(url: str, data: bytes | None = None) -> tuple[int, str]:
    req = urllib.request.Request(
        url,
        data=data,
        method="POST" if data else "GET",
        headers={
            "User-Agent": UA,
            "Accept": "text/html,*/*",
            "Content-Type": "application/x-www-form-urlencoded" if data else "text/html",
        },
    )
    with urllib.request.urlopen(req, timeout=90, context=CTX) as res:
        return getattr(res, "status", 200), res.read().decode("utf-8", errors="replace")


def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def parse_rows(html: str, letter: str) -> list[dict]:
    rows = []
    for m in ROW_RE.finditer(html):
        c0, c1, c3 = m.group(1), m.group(2), m.group(3)
        naic_m = NAIC_RE.search(strip_html(c0))
        if not naic_m:
            continue
        name_m = NAME_RE.search(c3)
        name = strip_html(name_m.group(1) if name_m else c3)
        if not name or name.lower() in {"naic", "company", "name"}:
            continue
        rows.append(
            {
                "naic": naic_m.group(1),
                "domicile": strip_html(c1)[:8],
                "name": name,
                "letter": letter,
            }
        )
    return rows


def harvest_az(script: str, key: str) -> dict:
    all_rows = []
    for letter in string.ascii_uppercase:
        url = f"https://www.pid.pa.gov/scrpts/{script}?level=1&item=Begin{letter}"
        print(key, letter, flush=True)
        status, html = fetch(url)
        (RAW / f"{key}-{letter}.html").write_text(html, encoding="utf-8")
        rows = parse_rows(html, letter)
        print(" ", status, "rows", len(rows), flush=True)
        all_rows.extend(rows)
        time.sleep(0.08)
    naics = [r["naic"] for r in all_rows]
    return {
        "source": f"PID {script} A-Z",
        "officialUrl": f"https://www.pid.pa.gov/dsf/{script.replace('search','search')}.html",
        "retrievedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "letterRows": len(all_rows),
        "distinctNaic": len(set(naics)),
        "noNaicRows": 0,
        "domicileCounts": dict(Counter(r["domicile"] for r in all_rows)),
        "sample": all_rows[:8],
        "rows": all_rows,
    }


def harvest_complaint() -> dict:
    # Inspect form fields from saved HTML
    html = (RAW / "complaint-tool.html").read_text(encoding="utf-8", errors="replace")
    forms = re.findall(r"<form[^>]*>.*?</form>", html, re.I | re.S)
    print("complaint forms", len(forms))
    fields = []
    action = None
    for f in forms:
        am = re.search(r'action=["\']([^"\']+)', f, re.I)
        if am:
            action = am.group(1)
        fields.extend(re.findall(r'<(?:input|select|option)[^>]*>', f, re.I))
    (RAW / "complaint-form-extract.txt").write_text("\n".join(fields[:200]), encoding="utf-8")
    selects = re.findall(
        r'''<select[^>]*name=["']([^"']+)["'][^>]*>(.*?)</select>''',
        html,
        re.I | re.S,
    )
    select_map = {}
    for name, body in selects:
        opts = []
        for om in re.finditer(r"<option([^>]*)>(.*?)</option>", body, re.I | re.S):
            val_m = re.search(r'value=["\']([^"\']*)', om.group(1), re.I)
            lab = strip_html(om.group(2))
            opts.append({"value": val_m.group(1) if val_m else lab, "label": lab})
        select_map[name] = opts
        print("SELECT", name, opts)
    inputs = re.findall(r"<input[^>]*>", html, re.I)
    print("INPUTS", [strip_html(i)[:120] for i in inputs[:30]])

    results = []
    years = ["2025", "2024"]
    lines = []
    for name, opts in select_map.items():
        labs = [o["label"].lower() for o in opts]
        if any("2025" in x or "2024" in x for x in labs):
            year_field = name
        if any("auto" in x or "homeowners" in x or "life" in x for x in labs):
            line_field = name
            lines = opts
    # Try POSTs
    action_url = action
    if action_url and action_url.startswith("/"):
        action_url = "https://www.pid.pa.gov" + action_url
    if not action_url:
        action_url = "https://www.pid.pa.gov/scrpts/cmpln_tool"
    payloads = []
    # brute a few likely field names
    for year in years:
        for line in ["Auto", "Homeowners", "Life", "Accident and Health", ""]:
            for fields_try in (
                {"year": year, "line": line},
                {"yr": year, "lob": line},
                {"item": year, "type": line},
                {"cmplnyear": year, "cmplnline": line},
            ):
                payloads.append(fields_try)
    seen = set()
    unique_payloads = []
    for p in payloads:
        key = tuple(sorted(p.items()))
        if key in seen:
            continue
        seen.add(key)
        unique_payloads.append(p)

    # First, dump named inputs
    named = re.findall(r'<input[^>]*name=["\']([^"\']+)', html, re.I)
    sel_names = list(select_map.keys())
    print("NAMED INPUTS", named, "SELECTS", sel_names)

    attempted = []
    if sel_names:
        year_sel = next((n for n in sel_names if any("2025" in o["label"] for o in select_map[n])), sel_names[0])
        line_sel = next(
            (n for n in sel_names if n != year_sel and any("Auto" in o["label"] or "Homeowners" in o["label"] for o in select_map[n])),
            sel_names[-1] if len(sel_names) > 1 else sel_names[0],
        )
        year_vals = [o["value"] for o in select_map[year_sel] if o["value"]]
        line_vals = [o["value"] for o in select_map[line_sel] if o["value"]]
        print("YEAR FIELD", year_sel, year_vals)
        print("LINE FIELD", line_sel, line_vals)
        for y in year_vals:
            for ln in line_vals:
                payload = {year_sel: y, line_sel: ln}
                extra = {n: "" for n in named if n not in payload}
                payload.update(extra)
                data = urllib.parse.urlencode(payload).encode()
                print("POST complaint", y, ln, flush=True)
                try:
                    status, body = fetch(action_url, data=data)
                except Exception as e:
                    print(" ERR", e)
                    continue
                fname = f"complaint-{y}-{re.sub(r'[^A-Za-z0-9]+', '_', ln)[:40]}.html"
                (RAW / fname).write_text(body, encoding="utf-8")
                table_rows = parse_rows(body, y)
                attempted.append(
                    {
                        "year": y,
                        "line": ln,
                        "status": status,
                        "bytes": len(body),
                        "parsedRows": len(table_rows),
                        "file": fname,
                    }
                )
                print(" ", status, "bytes", len(body), "rows", len(table_rows), flush=True)
                time.sleep(0.12)
    return {"action": action_url, "selects": {k: v for k, v in select_map.items()}, "attempts": attempted}


def probe_producer() -> dict:
    pages = {}
    for label, url in (
        ("individual", "https://apps02.ins.pa.gov/producer/ilist1.asp"),
        ("agency", "https://apps02.ins.pa.gov/producer/alist1.asp"),
    ):
        print("GET", url, flush=True)
        try:
            status, html = fetch(url)
        except Exception as e:
            pages[label] = {"error": str(e), "url": url}
            continue
        (RAW / f"producer-{label}.html").write_text(html, encoding="utf-8")
        asof = re.search(r"current as of ([^.<]+)", html, re.I)
        required = bool(re.search(r"required|must enter|please enter|name or city", html, re.I))
        forms = re.findall(r"<form[^>]*>.*?</form>", html, re.I | re.S)
        fields = []
        for f in forms:
            fields.extend(re.findall(r'name=["\']([^"\']+)', f, re.I))
        pages[label] = {
            "url": url,
            "status": status,
            "bytes": len(html),
            "title": strip_html((re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S) or [None, ""])[1]),
            "licenseCurrentAsOf": asof.group(1).strip() if asof else None,
            "requiredHint": required,
            "formFields": fields[:30],
        }
        print(" ", pages[label])
    return pages


def inspect_company_detail() -> dict:
    html = (RAW / "sample-company-aetna.html").read_text(encoding="utf-8", errors="replace")
    asof = re.search(r"current as of ([^.<]+)", html, re.I)
    exam = []
    for m in re.finditer(r".{80}(exam|market conduct|complaint|power|naic).{160}", html, re.I | re.S):
        exam.append(re.sub(r"\s+", " ", m.group(0))[:240])
    hrefs = [h for h in re.findall(r'href=["\']([^"\']+)', html, re.I) if any(k in h.lower() for k in ["exam", "complaint", "pdf", "conduct"])]
    return {
        "asof": asof.group(1).strip() if asof else None,
        "examSnippets": exam[:20],
        "hrefs": hrefs[:40],
        "bytes": len(html),
    }


def main() -> None:
    surplus = harvest_az("slsearch", "surplus")
    surplus_path = OUT / "surplus-lines.json"
    surplus_path.write_text(
        json.dumps({k: v for k, v in surplus.items()}, indent=2) + "\n",
        encoding="utf-8",
    )
    print("SURPLUS", surplus["letterRows"], "distinct", surplus["distinctNaic"])

    complaints = harvest_complaint()
    (OUT / "complaint-probe.json").write_text(json.dumps(complaints, indent=2) + "\n", encoding="utf-8")

    producer = probe_producer()
    (OUT / "producer-agency-probe.json").write_text(json.dumps(producer, indent=2) + "\n", encoding="utf-8")

    detail = inspect_company_detail()
    (OUT / "company-detail-probe.json").write_text(json.dumps(detail, indent=2) + "\n", encoding="utf-8")
    print("DETAIL", json.dumps(detail)[:1500])


if __name__ == "__main__":
    main()
