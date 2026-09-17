#!/usr/bin/env python3
"""Parse DFR examination-reports HTML into financial vs market-conduct indexes."""
from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "oregon" / "or-ins-001"
HTML = (OUT / "raw-exams.html").read_text(encoding="utf-8", errors="replace")


class Collector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.events: list[tuple[str, str, str]] = []
        self._href: str | None = None
        self._buf: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            href = dict(attrs).get("href")
            if href and ".pdf" in href.lower():
                self._href = href
                self._buf = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._buf.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._href is not None:
            text = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            self.events.append(("a", self._href, text))
            self._href = None
            self._buf = []


def classify_href(href: str, text: str) -> str:
    h = href.lower()
    t = text.lower()
    if "response" in t or "response" in h or h.endswith("-rsp.pdf") or "cvrltr" in h or "cover letter" in t:
        return "supporting"
    if "exams-mc" in h or "-mc-" in h or "mc-rhea" in h or "mc-target" in h or "mc-2024" in h:
        return "market_conduct"
    if "exams-financial" in h or re.search(r"\d{2}f(?:-limited)?\.pdf", h):
        return "financial"
    if "/dfr-market-regulation/" in h:
        return "market_conduct"
    return "unknown"


def company_from_anchor(text: str, href: str) -> str:
    t = re.sub(r"\s+", " ", text).strip()
    t = re.sub(r"\(.*?\)", "", t).strip()
    if t and t.lower() not in {"exam report cover letter", "company response", "company response"}:
        if "cover letter" not in t.lower() and "response" not in t.lower():
            return t
    leaf = href.rsplit("/", 1)[-1]
    leaf = re.sub(r"\.pdf.*", "", leaf, flags=re.I)
    leaf = re.sub(r"-(mc|cvrltr|response|rsp).*$", "", leaf, flags=re.I)
    return leaf.replace("-", " ").replace("_", " ").strip()


def date_near(html: str, href: str) -> str | None:
    idx = html.find(href)
    if idx < 0:
        return None
    window = html[idx : idx + 400]
    m = re.search(r"\((\d{1,2}/\d{1,2}/\d{2,4})\)", window)
    if m:
        return m.group(1)
    m = re.search(r"(\d{1,2}/\d{1,2}/\d{2,4})", window)
    return m.group(1) if m else None


def financial_from_html(html: str) -> list[dict]:
    rows: list[dict] = []
    pattern = re.compile(
        r"([A-Za-z][^<>]{4,120}?)\s*(?:<br[^>]*>|\s)*"
        r'<a[^>]+href="([^"]+Exams-financial[^"]+)"[^>]*>\s*([^<]{3,40})</a>',
        re.I | re.S,
    )
    for m in pattern.finditer(html):
        name = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip(" \t\u200b-")
        href = m.group(2)
        date = re.sub(r"\s+", " ", m.group(3)).strip()
        if "response" in name.lower() or "cover letter" in name.lower():
            continue
        if re.match(r"^\d{1,2}/\d{1,2}/", name):
            continue
        rows.append(
            {
                "name": name,
                "anchor": date,
                "href": href if href.startswith("http") else "https://dfr.oregon.gov" + href,
                "date": date,
                "kind": "financial",
            }
        )
    return rows


def main() -> None:
    p = Collector()
    p.feed(HTML)
    fin = financial_from_html(HTML)
    mc: list[dict] = []
    supporting = 0
    for _, href, text in p.events:
        kind = classify_href(href, text)
        if kind == "supporting":
            supporting += 1
            continue
        if kind != "market_conduct":
            continue
        rec = {
            "name": company_from_anchor(text, href),
            "anchor": text,
            "href": href if href.startswith("http") else "https://dfr.oregon.gov" + href,
            "date": date_near(HTML, href),
            "kind": kind,
        }
        mc.append(rec)
    payload = {
        "source": "https://dfr.oregon.gov/business/reg/reports-data/pages/examination-reports-of-insurers.aspx",
        "financial": {
            "report_rows": len(fin),
            "distinct_names": len({r["name"].lower() for r in fin}),
            "rows": fin,
        },
        "market_conduct": {
            "report_rows": len(mc),
            "distinct_names": len({r["name"].lower() for r in mc}),
            "rows": mc,
        },
        "supporting_pdfs_skipped": supporting,
        "exam_is_not_discipline": True,
        "financial_exam_is_not_market_conduct": True,
        "name_only": True,
    }
    (OUT / "exam-index.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("financial", payload["financial"]["report_rows"], "distinct", payload["financial"]["distinct_names"])
    print("mc", payload["market_conduct"]["report_rows"], "distinct", payload["market_conduct"]["distinct_names"])
    print("supporting skipped", supporting)


if __name__ == "__main__":
    main()
