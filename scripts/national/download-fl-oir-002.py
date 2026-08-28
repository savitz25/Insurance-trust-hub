"""Download official OIR Active Company Search XML by company type."""
from __future__ import annotations

import hashlib
import http.cookiejar
import json
import ssl
import time
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(r"C:\Users\Michael.Savitsky\insurance-visual-005")
OUT = ROOT / "data" / "oir-raw"
SEARCH_URL = "https://companysearch.floir.gov/"
CTX = ssl.create_default_context()
XML_FORMAT = "XML File \u00a0\u00a0\u00a0\u00a0"
UA = "InsuranceTrustHub/FL-INS-002 (official OIR company-search export)"


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
        elif tag == "option" and self._cur_select and a.get("value") is not None:
            self.selects[self._cur_select].append(a["value"] or "")

    def handle_endtag(self, tag: str) -> None:
        if tag == "select":
            self._cur_select = None


def opener():
    return urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),
        urllib.request.HTTPSHandler(context=CTX),
    )


def fetch(op, data=None, timeout=180):
    req = urllib.request.Request(
        SEARCH_URL,
        data=data,
        headers={"User-Agent": UA, "Accept": "*/*", "Referer": SEARCH_URL},
        method="POST" if data else "GET",
    )
    with op.open(req, timeout=timeout) as resp:
        return resp.read(), {k.lower(): v for k, v in resp.headers.items()}


def parse_form(html: bytes) -> FormParser:
    p = FormParser()
    p.feed(html.decode("utf-8", errors="replace"))
    return p


def post_body(form: FormParser, company_type: str) -> bytes:
    fields = dict(form.inputs)
    for sel, opts in form.selects.items():
        fields.setdefault(sel, opts[0] if opts else "")
    fields["ctl00$main1$txtCompanyName"] = ""
    fields["ctl00$main1$Rbtn2"] = "Rbtn2"
    fields.pop("ctl00$main1$Rbtn1", None)
    fields["ctl00$main1$ddlApplicationType"] = company_type
    fields["ctl00$main1$ddlAddressType"] = "-All Types-"
    fields["ctl00$main1$ddlAuthorizedTypeTyped"] = "-All Types-"
    fields["ctl00$main1$RadSortResultBy"] = "Name"
    fields["ctl00$main1$RadViewingFormat"] = XML_FORMAT
    fields["ctl00$main1$txtCompanyCode"] = ""
    fields["ctl00$main1$txtNAICCompanyCode"] = ""
    fields["ctl00$main1$btnContinue"] = "Search"
    return urllib.parse.urlencode(fields).encode("utf-8")


def is_xml(body: bytes) -> bool:
    h = body.lstrip()[:80]
    return h.startswith(b"<?xml") or h.startswith(b"<companies")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    types_path = OUT / "company-types.json"
    types = json.loads(types_path.read_text(encoding="utf-8")) if types_path.exists() else []
    types = [t for t in types if t and t != "-All Types-"]
    op = opener()
    html, _ = fetch(op)
    form = parse_form(html)
    if not types:
        types = [t for t in form.selects.get("ctl00$main1$ddlApplicationType", []) if t != "-All Types-"]

    manifest = []
    companies_dir = OUT / "by-type"
    companies_dir.mkdir(exist_ok=True)
    for i, t in enumerate(types, 1):
        slug = "".join(c if c.isalnum() else "-" for c in t).strip("-").lower()[:80]
        dest = companies_dir / f"{slug}.xml"
        print(f"[{i}/{len(types)}] {t}", flush=True)
        body, headers = fetch(op, post_body(form, t), timeout=240)
        if not is_xml(body):
            form = parse_form(body)
            time.sleep(0.4)
            html, _ = fetch(op)
            form = parse_form(html)
            body, headers = fetch(op, post_body(form, t), timeout=240)
        if not is_xml(body):
            print("  FAIL not xml", headers.get("content-type"), body[:120], flush=True)
            manifest.append({"type": t, "ok": False, "bytes": len(body)})
            html, _ = fetch(op)
            form = parse_form(html)
            continue
        dest.write_bytes(body)
        n = body.count(b"<company>")
        rec = {
            "type": t,
            "ok": True,
            "file": str(dest),
            "bytes": len(body),
            "sha256": hashlib.sha256(body).hexdigest(),
            "company_elements": n,
            "content_type": headers.get("content-type"),
        }
        manifest.append(rec)
        print("  xml", n, "elements", len(body), "bytes", flush=True)
        html, _ = fetch(op)
        form = parse_form(html)
        time.sleep(0.25)

    (OUT / "download-manifest.json").write_text(
        json.dumps({"at": datetime.now(UTC).isoformat(), "files": manifest}, indent=2),
        encoding="utf-8",
    )
    ok = sum(1 for m in manifest if m.get("ok"))
    print("done", ok, "/", len(manifest), flush=True)
    return 0 if ok == len(manifest) else 1


if __name__ == "__main__":
    raise SystemExit(main())
