#!/usr/bin/env python3
"""Acquire OR-INS-001 official evidence: AdminOrders, exams, complaints, domestic list."""
from __future__ import annotations

import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "oregon" / "or-ins-001"
OUT.mkdir(parents=True, exist_ok=True)
CTX = ssl.create_default_context()
HDR = {
    "User-Agent": "InsuranceTrustHub OR-INS-001 (public records research)",
    "Accept": "application/json;odata=verbose",
}


def get(url: str, accept: str | None = None, timeout: int = 90) -> tuple[int, bytes]:
    headers = dict(HDR)
    if accept:
        headers["Accept"] = accept
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=timeout) as r:
            return r.getcode(), r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def rest(url: str) -> dict:
    code, body = get(url)
    if code != 200:
        raise SystemExit(f"REST {code} {url}\n{body[:400]!r}")
    return json.loads(body.decode("utf-8"))


def paged_items(base: str, extra: str) -> list[dict]:
    rows: list[dict] = []
    if extra.startswith("$"):
        url = f"{base}?$top=5000&{extra}"
    else:
        url = f"{base}?$top=5000&{extra}"
    url = url.replace("$filter=FSObjType eq 0", "$filter=" + urllib.parse.quote("FSObjType eq 0"))
    while url:
        data = rest(url)
        d = data["d"]
        batch = d.get("results") or []
        rows.extend(batch)
        url = d.get("__next")
        print(f"  fetched {len(rows)}")
    return rows


def main() -> None:
    list_meta = rest("https://dfr.oregon.gov/_api/web/lists/getbytitle('AdminOrders')")["d"]
    print("AdminOrders ItemCount", list_meta.get("ItemCount"), "etag", list_meta.get("__metadata", {}).get("etag"))
    (OUT / "adminorders-list-meta.json").write_text(
        json.dumps({k: list_meta[k] for k in list_meta if k in ("Title", "ItemCount", "LastItemModifiedDate", "Created", "Id")}, indent=2),
        encoding="utf-8",
    )

    fields = rest(
        "https://dfr.oregon.gov/_api/web/lists/getbytitle('AdminOrders')/fields"
        "?$select=InternalName,Title,TypeAsString,Hidden"
    )["d"]["results"]
    names = [f["InternalName"] for f in fields if not f.get("Hidden") and f.get("InternalName", "").startswith("DFR")]
    print("DFR fields", names)
    (OUT / "adminorders-dfr-fields.json").write_text(json.dumps(names, indent=2), encoding="utf-8")

    select = (
        "Id,Title,FileLeafRef,FileRef,FSObjType,Modified,Created,"
        "DFRName,DFRCaseNumber,DFRAction,DFRType,DFRDate,DFROrderDate,DFRViolator"
    )
    sample = rest(
        "https://dfr.oregon.gov/_api/web/lists/getbytitle('AdminOrders')/items"
        f"?$top=5&$select={select}"
    )["d"]["results"]
    try:
        expanded = rest(
            "https://dfr.oregon.gov/_api/web/lists/getbytitle('AdminOrders')/items"
            "?$top=2&$select=Id,DFRProgramArea/Title,DFRYear/Title"
            "&$expand=DFRProgramArea,DFRYear"
        )["d"]["results"]
        print("expanded", expanded)
    except SystemExit as e:
        print("expand failed", e)
    print("sample keys", list(sample[0].keys()) if sample else None)
    keys = [
        "Id",
        "Title",
        "DFRName",
        "DFRCaseNumber",
        "DFRAction",
        "DFRType",
        "DFRDate",
        "DFROrderDate",
        "DFRProgramArea",
        "DFRViolator",
        "FSObjType",
    ]
    print("sample0", {k: sample[0].get(k) for k in keys} if sample else None)

    files = paged_items(
        "https://dfr.oregon.gov/_api/web/lists/getbytitle('AdminOrders')/items",
        f"$select={select}&$filter=FSObjType eq 0",
    )
    actions = Counter(str(r.get("DFRAction") or "") for r in files)
    types = Counter(str(r.get("DFRType") or "") for r in files)
    areas = Counter(str(r.get("DFRProgramArea") or "") for r in files)
    print("ALL ACTIONS", actions.most_common())
    print("ALL PROGRAM AREAS", areas.most_common())
    print("ALL TYPES", types.most_common(30))
    print("file rows", len(files))

    def insurance_class(r: dict) -> bool:
        blob = " ".join(
            str(r.get(k) or "")
            for k in ("DFRAction", "DFRProgramArea", "DFRType")
        ).lower()
        return any(
            tok in blob
            for tok in (
                "insur",
                "producer",
                "adjuster",
                "third party admin",
                "tpa",
                "health care service",
                "hcsc",
                "surplus line",
                "life settlement",
                "premium finance",
                "pharmacy benefit",
                "pbm",
                "annuit",
            )
        )

    ins_rows = [r for r in files if insurance_class(r)]
    print("CANDIDATE INSURANCE ACTIONS", Counter(str(r.get("DFRAction") or "") for r in ins_rows).most_common())
    print("CANDIDATE PROGRAM AREAS", Counter(str(r.get("DFRProgramArea") or "") for r in ins_rows).most_common())
    # If no keyword match, dump unique actions for human/ticket rule: use source-defined values
    slim = []
    for r in ins_rows:
        slim.append(
            {
                "id": r.get("Id"),
                "title": r.get("Title"),
                "name": r.get("DFRName"),
                "caseNumber": r.get("DFRCaseNumber"),
                "programArea": r.get("DFRProgramArea"),
                "violator": r.get("DFRViolator"),
                "year": r.get("DFRYear"),
                "action": r.get("DFRAction"),
                "type": r.get("DFRType"),
                "orderDate": r.get("DFRDate"),
                "modified": r.get("Modified"),
                "created": r.get("Created"),
                "fileRef": r.get("FileRef"),
                "fileLeaf": r.get("FileLeafRef"),
            }
        )
    cases = {s["caseNumber"] for s in slim if s["caseNumber"]}
    type_c = Counter(s["type"] or "" for s in slim)
    act_c = Counter(s["action"] or "" for s in slim)
    dates = [s["orderDate"] for s in slim if s["orderDate"]]
    payload = {
        "source": "https://dfr.oregon.gov/_api/web/lists/getbytitle('AdminOrders')/items",
        "filter": "FSObjType eq 0 and DFRAction in source-native insurance-related classes",
        "listLastItemModifiedDate": list_meta.get("LastItemModifiedDate"),
        "listItemCount": list_meta.get("ItemCount"),
        "allFileRows": len(files),
        "allActions": actions.most_common(),
        "insuranceActions": act_c.most_common(),
        "insuranceTypes": type_c.most_common(),
        "documentRows": len(slim),
        "distinctCases": len(cases),
        "dateMin": min(dates) if dates else None,
        "dateMax": max(dates) if dates else None,
        "rows": slim,
    }
    (OUT / "dfr-insurance-orders.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("insurance docs", len(slim), "cases", len(cases), "date", payload["dateMin"], payload["dateMax"])

    # Complaint PDFs 2025
    lines = {
        "Annuities": "Complaint-AnnuitiesFull-2025.pdf",
        "Auto": "Complaint-AutoFull-2025.pdf",
        "Health": "Complaint-HealthFull-2025.pdf",
        "Homeowners": "Complaint-HomeownersFull-2025.pdf",
        "Life": "Complaint-LifeFull-2025.pdf",
        "Long-term care": "Complaint-LTCfull-2025.pdf",
    }
    for line, fn in lines.items():
        url = f"https://dfr.oregon.gov/help/Documents/complaint-stats-2025/{fn}"
        code, body = get(url, accept="*/*")
        print("PDF", line, code, len(body), fn)
        if code == 200 and body[:4] == b"%PDF":
            (OUT / fn).write_bytes(body)

    # Parse exam HTML
    exams_html = (OUT / "raw-exams.html").read_text(encoding="utf-8", errors="replace")
    parse_exams(exams_html)


def parse_exams(html: str) -> None:
    # Split financial vs market conduct by heading
    mc_pos = html.lower().find("market conduct")
    fin_html = html[: mc_pos if mc_pos > 0 else len(html)]
    mc_html = html[mc_pos if mc_pos > 0 else 0 :]

    def extract(section: str, kind: str) -> list[dict]:
        rows = []
        # anchors with pdf
        for m in re.finditer(
            r'<a[^>]+href="([^"]+\.pdf[^"]*)"[^>]*>(.*?)</a>',
            section,
            re.I | re.S,
        ):
            href = m.group(1)
            text = re.sub(r"<[^>]+>", "", m.group(2))
            text = re.sub(r"\s+", " ", text).strip()
            if "response" in text.lower() or "cover letter" in text.lower() or "cvrltr" in href.lower() or "response" in href.lower() or "-rsp" in href.lower():
                continue
            rows.append({"kind": kind, "href": href, "anchor": text})
        return rows

    fin = extract(fin_html, "financial")
    mc = extract(mc_html, "market_conduct")
    print("financial pdf anchors", len(fin), "mc pdf anchors", len(mc))
    (OUT / "exam-index-raw.json").write_text(json.dumps({"financial": fin, "market_conduct": mc}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
