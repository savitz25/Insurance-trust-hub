"""FL-INS-002 — official OIR company-search export.

Uses the public Active Company Search download formats (Excel/XML).
Not a per-company name scrape.
"""
from __future__ import annotations

import hashlib
import http.cookiejar
import json
import ssl
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(r"C:\Users\Michael.Savitsky\insurance-visual-005")
OUT = ROOT / "data" / "oir-raw"
SEARCH_URL = "https://companysearch.floir.gov/"
CTX = ssl.create_default_context()
USER_AGENT = "InsuranceTrustHub/FL-INS-002 (official OIR company-search export)"
XML_FORMAT = "XML File \u00a0\u00a0\u00a0\u00a0"
EXCEL_FORMAT = "Excel File"


class FormParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.inputs: dict[str, str] = {}
        self.selects: dict[str, list[str]] = {}
        self._cur_select: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag == "input":
            name = a.get("name")
            if not name:
                return
            typ = (a.get("type") or "text").lower()
            if typ in ("checkbox", "radio"):
                if "checked" in a:
                    self.inputs[name] = a.get("value") or "on"
            elif typ != "submit":
                self.inputs[name] = a.get("value") or ""
        elif tag == "select":
            self._cur_select = a.get("name")
            if self._cur_select:
                self.selects[self._cur_select] = []
        elif tag == "option" and self._cur_select:
            val = a.get("value")
            if val is not None:
                self.selects[self._cur_select].append(val)

    def handle_endtag(self, tag: str) -> None:
        if tag == "select":
            self._cur_select = None


def opener() -> urllib.request.OpenerDirector:
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(jar),
        urllib.request.HTTPSHandler(context=CTX),
    )


def fetch(op: urllib.request.OpenerDirector, url: str, data: bytes | None = None, timeout: int = 180):
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "*/*",
            "Referer": SEARCH_URL,
            "Origin": "https://companysearch.floir.gov",
        },
        method="POST" if data else "GET",
    )
    with op.open(req, timeout=timeout) as resp:
        body = resp.read()
        headers = {k.lower(): v for k, v in resp.headers.items()}
        headers["_url"] = resp.geturl()
        headers["_status"] = str(getattr(resp, "status", 200))
        return body, headers


def build_post(form: FormParser, company_type: str, fmt: str, name: str = "", contains: bool = False) -> bytes:
    fields = dict(form.inputs)
    for sel, opts in form.selects.items():
        fields.setdefault(sel, opts[0] if opts else "")
    fields["ctl00$main1$txtCompanyName"] = name
    if contains:
        fields["ctl00$main1$Rbtn1"] = "Rbtn1"
        fields.pop("ctl00$main1$Rbtn2", None)
    else:
        fields["ctl00$main1$Rbtn2"] = "Rbtn2"
        fields.pop("ctl00$main1$Rbtn1", None)
    fields["ctl00$main1$ddlApplicationType"] = company_type
    fields["ctl00$main1$ddlAddressType"] = "-All Types-"
    fields["ctl00$main1$ddlAuthorizedTypeTyped"] = "-All Types-"
    fields["ctl00$main1$RadSortResultBy"] = "Name"
    fields["ctl00$main1$RadViewingFormat"] = fmt
    fields["ctl00$main1$txtCompanyCode"] = ""
    fields["ctl00$main1$txtNAICCompanyCode"] = ""
    fields["ctl00$main1$btnContinue"] = "Search"
    return urllib.parse.urlencode(fields).encode("utf-8")


def sniff(body: bytes) -> str:
    head = body[:200].lstrip()
    if head.startswith(b"<?xml") or head.startswith(b"<Companies") or b"<Company" in head[:800]:
        return "xml"
    if head.startswith(b"PK"):
        return "xlsx"
    if b"<html" in head.lower() or b"<!DOCTYPE" in head:
        return "html"
    if b"\t" in head or b"," in head[:80]:
        return "text"
    return "unknown"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    at = datetime.now(UTC).isoformat()
    op = opener()
    print("GET form", flush=True)
    html, h = fetch(op, SEARCH_URL)
    form = FormParser()
    form.feed(html.decode("utf-8", errors="replace"))
    types = form.selects.get("ctl00$main1$ddlApplicationType") or []
    print("types", len(types), "viewstate", "ctl00$main1$btnContinue" not in form.inputs, flush=True)

    attempts = []
    payloads = [
        ("title-xml", "TITLE INSURANCE", XML_FORMAT, "", False),
        ("title-excel", "TITLE INSURANCE", EXCEL_FORMAT, "", False),
        ("title-xml-e", "TITLE INSURANCE", XML_FORMAT, "E", True),
        ("pc-excel", "PROPERTY AND CASUALTY INSURER", EXCEL_FORMAT, "A", True),
        ("all-excel-a", "-All Types-", EXCEL_FORMAT, "A", True),
    ]
    for key, ctype, fmt, name, contains in payloads:
        print("POST", key, flush=True)
        body, ph = fetch(op, SEARCH_URL, build_post(form, ctype, fmt, name, contains), timeout=180)
        kind = sniff(body)
        path = OUT / f"probe-{key}.{kind if kind != 'unknown' else 'bin'}"
        path.write_bytes(body)
        rec = {
            "key": key,
            "type": ctype,
            "fmt": fmt[:20],
            "name": name,
            "bytes": len(body),
            "kind": kind,
            "ctype": ph.get("content-type"),
            "disp": ph.get("content-disposition"),
            "sha256": hashlib.sha256(body).hexdigest(),
            "head": body[:240].decode("utf-8", errors="replace"),
        }
        attempts.append(rec)
        print(" ", kind, len(body), ph.get("content-type"), ph.get("content-disposition"), flush=True)
        # refresh form/viewstate after each postback
        if kind == "html":
            form = FormParser()
            form.feed(body.decode("utf-8", errors="replace"))
        else:
            html2, _ = fetch(op, SEARCH_URL)
            form = FormParser()
            form.feed(html2.decode("utf-8", errors="replace"))

    report = {
        "task": "FL-INS-002",
        "at": at,
        "search_url": SEARCH_URL,
        "form_status": h.get("_status"),
        "company_types": types,
        "attempts": attempts,
    }
    (OUT / "acquire-probe.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("WROTE acquire-probe.json", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
