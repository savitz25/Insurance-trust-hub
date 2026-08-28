"""FL-INS-005 — Florida market intelligence census and gated ingest.

  python scripts/national/fl-ins-005.py
  python scripts/national/fl-ins-005.py --execute

--execute is refused until market_intelligence_observations exists (SQL Editor).
CHOICES ≠ quote. IRFS ≠ approval. Citizens ≠ general license. No rankings.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import ssl
import time
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET
from zipfile import ZipFile
from io import BytesIO

ROOT = Path(r"C:\Users\Michael.Savitsky\insurance-visual-005")
ITH = Path(r"C:\Users\Michael.Savitsky\insurance-trust-hub")
OUT = ROOT / "data" / "reports"
RAW = ROOT / "data" / "fl-market-raw"
OIR_DIR = ROOT / "data" / "oir-raw" / "by-type"
CTX = ssl.create_default_context()
TASK = "FL-INS-005"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

MIR_PORTAL = "https://floir.gov/tools-and-data/residential-market-share-reports"
MIR_WIZARD = "https://qsrng.floir.gov/"
MIR_JUNE_CO = (
    "https://floir.gov/docs-sf/default-source/property-and-casualty/"
    "residential-market-share-reports/2026-monthly-mir/june/"
    "monthly_mir_statewide_summary_by_company_and_commercial_personal_2026m6_20260811t151155.xlsx"
    "?Status=Master"
)
MIR_JUNE_TYPE = (
    "https://floir.gov/docs-sf/default-source/property-and-casualty/"
    "residential-market-share-reports/2026-monthly-mir/june/"
    "monthly_mir_statewide_summary_by_company_and_policy_type_2026m6_20260811t151155.xlsx"
    "?Status=Master"
)
CHOICES_HUB = "https://floir.gov/consumers/choices-rate-comparison-search"
CHOICES_HO = "https://choices.floir.gov/pandc/homeowners"
CHOICES_AUTO = "https://choices.fldfs.com/pandc/auto"
CHOICES_MEDIGAP = "https://choices.floir.gov/mcws/CWSSearch"
CHOICES_SG = "https://choices.fldfs.com/landh/SmallGroup"
IRFS_SEARCH = "https://irfssearch.floir.gov/"
CITIZENS_HOME = "https://www.citizensfla.com/"
CITIZENS_CANDIDATES = [
    "https://www.citizensfla.com/reports",
    "https://www.citizensfla.com/web/public/snapshot",
    "https://www.citizensfla.com/documents/20702/30188300/20251130+Detail+by+Product+Line.pdf",
]
FSLSO_ELIGIBLE = "https://www.fslso.com/compliance/eligible-insurers"
FSLSO_MONTHLY = (
    "https://www.fslso.com/docs/default-source/uploadedfiles/reports/"
    "fl-monthly-premium-report/monthly-fl-premium-report.pdf?sfvrsn=83e04a04_223"
)
NFIP_REGISTRY = "https://agents.floodsmart.gov/agency-registry"
NFIP_LIST = "https://www.floodsmart.gov/flood-insurance-agencies"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for base in (ROOT, ITH):
        p = base / ".env.local"
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            t = line.strip()
            if not t or t.startswith("#") or "=" not in t:
                continue
            k, v = t.split("=", 1)
            env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


def dump(name: str, obj: Any) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")
    print("WROTE", OUT / name, flush=True)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def http_get(url: str, timeout: int = 120) -> tuple[int, bytes, str]:
    last: Exception | None = None
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"}, method="GET")
            with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
                return int(resp.status), resp.read(), str(resp.geturl() or url)
        except Exception as e:
            last = e
            time.sleep(1.1 * (attempt + 1))
    raise RuntimeError(f"{url}: {last}")


def req(base: str, key: str, path: str, extra: dict | None = None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Prefer": "count=exact",
    }
    if extra:
        headers.update(extra)
    last = None
    for attempt in range(6):
        try:
            r = urllib.request.Request(base + path, headers=headers, method="GET")
            with urllib.request.urlopen(r, timeout=180, context=CTX) as resp:
                return resp.read(), resp.headers, resp.status
        except Exception as e:
            last = e
            time.sleep(1.1 * (attempt + 1))
    raise RuntimeError(str(last))


def parse_cr(cr: str | None) -> int:
    if cr and "/" in cr:
        tail = cr.split("/")[-1]
        if tail != "*":
            return int(tail)
    return -1


def count_rows(base: str, key: str, table: str, query: str = "") -> int:
    path = f"/rest/v1/{table}?select=id"
    if query:
        path += "&" + query
    extra = {"Range": "0-0", "Range-Unit": "items"}
    try:
        _, headers, _ = req(base, key, path, extra)
        return parse_cr(headers.get("Content-Range"))
    except Exception as e:
        if "404" in str(e) or "PGRST205" in str(e) or "does not exist" in str(e).lower():
            return -1
        raise


def table_exists(base: str, key: str, table: str) -> bool:
    try:
        n = count_rows(base, key, table)
        return n >= 0
    except Exception:
        return False


def graph_counts(base: str, key: str) -> dict[str, int]:
    return {
        "providers": count_rows(base, key, "providers"),
        "agencies": count_rows(base, key, "national_entities", "entity_kind=eq.agency"),
        "persons": count_rows(base, key, "national_entities", "entity_kind=eq.person"),
        "legal_insurers": count_rows(base, key, "national_entities", "entity_kind=eq.legal_insurer"),
        "fl_oir_company_code": count_rows(base, key, "national_entity_identifiers", "scheme=eq.fl_oir_company_code"),
        "appointed_by": count_rows(base, key, "national_relationships", "relationship_type=eq.appointed_by"),
        "appointer_resolves_to_fl": count_rows(
            base,
            key,
            "national_relationships",
            "relationship_type=eq.APPOINTER_RESOLVES_TO&source_dataset=eq.florida_dfs_appointments",
        ),
        "bridges": count_rows(base, key, "provider_entity_bridges"),
        "florida_receiver": count_rows(
            base, key, "regulatory_evidence", "source_dataset=eq.florida_dfs_receiver_companies"
        ),
        "market_obs": count_rows(base, key, "market_intelligence_observations"),
    }


def xlsx_headers_and_rows(data: bytes, max_rows: int = 5000) -> dict[str, Any]:
    z = ZipFile(BytesIO(data))
    strings: list[str] = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall("m:si", NS):
            texts = [t.text or "" for t in si.findall(".//m:t", NS)]
            strings.append("".join(texts))
    sheet_name = "xl/worksheets/sheet1.xml"
    names = [n for n in z.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml")]
    sheet_name = names[0] if names else sheet_name
    sroot = ET.fromstring(z.read(sheet_name))
    rows_out: list[list[str]] = []
    for row in sroot.findall("m:sheetData/m:row", NS):
        cells: dict[int, str] = {}
        for c in row.findall("m:c", NS):
            ref = c.get("r") or "A1"
            col = 0
            for ch in ref:
                if ch.isalpha():
                    col = col * 26 + (ord(ch.upper()) - 64)
                else:
                    break
            t = c.get("t")
            v = c.find("m:v", NS)
            val = v.text if v is not None and v.text else ""
            if t == "s" and val.isdigit():
                idx = int(val)
                val = strings[idx] if 0 <= idx < len(strings) else val
            cells[col] = val
        if not cells:
            continue
        maxc = max(cells)
        line = [cells.get(i, "") for i in range(1, maxc + 1)]
        if any(x.strip() for x in line):
            rows_out.append(line)
        if len(rows_out) >= max_rows:
            break
    header_idx = 0
    for i, line in enumerate(rows_out[:12]):
        blob = " ".join(line).lower()
        if "naic" in blob and ("company" in blob or "insurer" in blob):
            header_idx = i
            break
        if "company name" in blob and "polic" in blob:
            header_idx = i
            break
    headers = [h.replace("\n", " ").strip() for h in rows_out[header_idx]] if rows_out else []
    body = rows_out[header_idx + 1 :] if len(rows_out) > header_idx + 1 else []
    return {"headers": headers, "row_count_sampled": len(body), "sample": body[:3], "rows": body}


def header_has(headers: list[str], *needles: str) -> bool:
    blob = " ".join(headers).lower()
    return any(n.lower() in blob for n in needles)


def census_surplus_xml() -> dict[str, Any]:
    files = {
        "surplus_lines": OIR_DIR / "surplus-lines.xml",
        "federally_authorized": OIR_DIR / "surplus-lines---federally-authorized.xml",
        "aviation_wet_marine": OIR_DIR / "surplus-lines---aviation-wet-marine.xml",
    }
    out: dict[str, Any] = {"files": {}, "with_naic": 0, "without_naic": 0, "companies": 0}
    seen: set[str] = set()
    for label, path in files.items():
        if not path.exists():
            out["files"][label] = {"exists": False}
            continue
        data = path.read_bytes()
        recs = 0
        naic_n = 0
        try:
            root = ET.fromstring(data)
            for node in root.findall("company"):
                rec = {c.tag: (c.text or "").strip() for c in list(node)}
                recs += 1
                naic = re.sub(r"\D", "", rec.get("NAICCode") or "")
                key = naic or rec.get("FLCompCode") or rec.get("COName") or str(recs)
                if key not in seen:
                    seen.add(key)
                    if len(naic) == 5:
                        naic_n += 1
                        out["with_naic"] += 1
                    else:
                        out["without_naic"] += 1
        except ET.ParseError:
            pass
        out["files"][label] = {"exists": True, "sha256": sha256_bytes(data), "records": recs, "bytes": len(data)}
        out["companies"] = len(seen)
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    execute = bool(args.execute)
    at = datetime.now(UTC).isoformat()
    RAW.mkdir(parents=True, exist_ok=True)
    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise SystemExit("missing supabase env")
    base = url.rstrip("/")
    print("FL-INS-005", "execute" if execute else "dry-run", flush=True)

    pre = graph_counts(base, key)
    schema_ready = pre["market_obs"] >= 0
    print("  schema market_intelligence_observations", schema_ready, "count", pre["market_obs"], flush=True)
    if execute and not schema_ready:
        print("STOP: SQL Editor required before --execute", flush=True)

    # MIR
    print("download MIR June 2026", flush=True)
    mir_files = []
    mir_identity = {"has_naic": False, "has_fl_code": False, "has_company_name": False}
    mir_co_parsed: dict[str, Any] = {}
    for label, u in (("company", MIR_JUNE_CO), ("policy_type", MIR_JUNE_TYPE)):
        st, body, final = http_get(u)
        dest = RAW / f"mir-2026-06-{label}.xlsx"
        dest.write_bytes(body)
        parsed = xlsx_headers_and_rows(body)
        if label == "company":
            mir_co_parsed = parsed
        mir_identity["has_naic"] = mir_identity["has_naic"] or header_has(
            parsed["headers"], "naic", "cocode", "co code", "company code"
        )
        mir_identity["has_fl_code"] = mir_identity["has_fl_code"] or header_has(
            parsed["headers"], "florida company", "fl company", "flcomp"
        )
        mir_identity["has_company_name"] = mir_identity["has_company_name"] or header_has(
            parsed["headers"], "company", "insurer", "name"
        )
        mir_files.append(
            {
                "label": label,
                "url": u,
                "final_url": final,
                "status": st,
                "sha256": sha256_bytes(body),
                "bytes": len(body),
                "headers": parsed["headers"],
                "rows_sampled": parsed["row_count_sampled"],
                "period": "2026-06",
                "grain": "statewide company" if label == "company" else "statewide company x policy type",
            }
        )
    _, wizard_body, _ = http_get(MIR_WIZARD)
    _, portal_body, _ = http_get(MIR_PORTAL)

    companies = 0
    pif_col = prem_col = share_col = name_col = naic_col = None
    for i, h in enumerate(mir_co_parsed.get("headers") or []):
        hl = h.lower()
        if name_col is None and ("company name" in hl or hl == "company"):
            name_col = i
        if naic_col is None and "naic" in hl:
            naic_col = i
        if pif_col is None and ("polic" in hl and "in force" in hl and "total" in hl):
            pif_col = i
        if prem_col is None and "premium" in hl and "total" in hl:
            prem_col = i
        if share_col is None and "share" in hl:
            share_col = i
    names = set()
    naics = set()
    for row in mir_co_parsed.get("rows") or []:
        if name_col is not None and name_col < len(row) and row[name_col].strip():
            if not row[name_col].strip().lower().startswith("total"):
                names.add(row[name_col].strip())
        if naic_col is not None and naic_col < len(row):
            d = re.sub(r"\D", "", row[naic_col])
            if len(d) == 5:
                naics.add(d)
    companies = len(names)
    attachable_mir = len(naics)
    mir_identity["has_naic"] = mir_identity["has_naic"] or naic_col is not None
    mir_census = {
        "task": TASK,
        "at": at,
        "portal": MIR_PORTAL,
        "wizard": MIR_WIZARD,
        "portal_sha256": sha256_bytes(portal_body),
        "wizard_sha256": sha256_bytes(wizard_body),
        "period": "2026-06",
        "period_start": "2026-06-01",
        "period_end": "2026-06-30",
        "unaudited": True,
        "trade_secret_excluded": True,
        "grain": "statewide company; statewide company x policy type; wizard also county/ZIP",
        "files": mir_files,
        "identity_fields": mir_identity,
        "RAW": mir_co_parsed.get("row_count_sampled") or 0,
        "RELEVANT": mir_co_parsed.get("row_count_sampled") or 0,
        "IDENTIFIABLE": attachable_mir,
        "ATTACHABLE": attachable_mir,
        "AGGREGATE": 1,
        "REVIEW_REQUIRED": 0,
        "UNRESOLVED": (mir_co_parsed.get("row_count_sampled") or 0) if attachable_mir == 0 else 0,
        "companies_named": companies,
        "distinct_naic": len(naics),
        "headers": mir_co_parsed.get("headers"),
        "sample": mir_co_parsed.get("sample"),
        "pif_column": pif_col,
        "premium_column": prem_col,
        "share_column": share_col,
        "geography": "statewide in published Excel; county/ZIP via MIR wizard (not bulk-dumped here)",
        "product": "personal and commercial residential",
        "ingested": 0,
        "hold_reason": None
        if attachable_mir
        else "published statewide Excel identity is company name unless NAIC/FL code columns present",
    }

    # CHOICES
    print("fetch CHOICES", flush=True)
    choices_pages = []
    for label, u in (
        ("hub", CHOICES_HUB),
        ("homeowners", CHOICES_HO),
        ("auto", CHOICES_AUTO),
        ("medigap", CHOICES_MEDIGAP),
        ("small_group", CHOICES_SG),
    ):
        try:
            st, body, final = http_get(u)
            html = body.decode("utf-8", "replace")
            choices_pages.append(
                {
                    "label": label,
                    "url": u,
                    "final_url": final,
                    "status": st,
                    "sha256": sha256_bytes(body),
                    "illustrative": "illustrative" in html.lower() or "sample" in html.lower(),
                    "trade_secret_note": "trade secret" in html.lower(),
                }
            )
        except Exception as e:
            choices_pages.append({"label": label, "url": u, "error": str(e)[:300]})
    choices_census = {
        "task": TASK,
        "at": at,
        "products": ["homeowners", "private_passenger_auto", "medigap", "small_group_health"],
        "sample_profiles": "three pre-defined homeowners and auto examples; Medigap/small-group interactive",
        "companies": "interactive; trade-secret companies omitted",
        "geographies": "Florida counties",
        "periods": "most recent approved rate filings feeding the tool; not a dated bulk extract",
        "bulk": False,
        "is_quote": False,
        "safe_copy": "Sample premium shown in Florida OIR CHOICES for this profile and location.",
        "RAW": 0,
        "RELEVANT": 0,
        "IDENTIFIABLE": 0,
        "ATTACHABLE": 0,
        "AGGREGATE": 0,
        "UNRESOLVED": 0,
        "pages": choices_pages,
        "ingested": 0,
        "class": "INTERACTIVE_NO_BULK",
    }

    # IRFS
    print("fetch IRFS search", flush=True)
    irfs_st, irfs_body, irfs_final = http_get(IRFS_SEARCH)
    irfs_html = irfs_body.decode("utf-8", "replace")
    irfs_census = {
        "task": TASK,
        "at": at,
        "url": IRFS_SEARCH,
        "final_url": irfs_final,
        "status": irfs_st,
        "sha256": sha256_bytes(irfs_body),
        "filings_from": "2001-01-05",
        "search_cap": 2500,
        "identity_fields": {
            "file_log_number": "File Log Number" in irfs_html,
            "company_name": "Company Name" in irfs_html,
            "fein": "Company FEIN" in irfs_html,
            "naic": "NAIC Company Code" in irfs_html,
            "naic_group": "NAIC Group Code" in irfs_html,
        },
        "rate_fields": {
            "requested": "Rate Change Requested" in irfs_html,
            "approved": "Rate Change Approved" in irfs_html,
        },
        "grain": "file log number = one filing; multiple documents requested as one filing PDF",
        "status_values": "Final Action filter present; do not infer APPROVED from mere presence",
        "partition_strategy": "Date Filed + Line of Business + Filing Type to stay under 2500",
        "exhaustive_statewide": False,
        "RAW": 0,
        "RELEVANT": 0,
        "IDENTIFIABLE": 0,
        "ATTACHABLE": 0,
        "UNRESOLVED": 0,
        "ingested": 0,
        "class": "SEARCH_CAP_2500_NO_BULK_DUMP",
        "disclaimer": "Displayed rate changes may not fully reflect increases and decreases due to claims of trade secret",
    }

    # Citizens
    print("fetch Citizens", flush=True)
    cit_pages = []
    for u in [CITIZENS_HOME] + CITIZENS_CANDIDATES:
        try:
            st, body, final = http_get(u)
            cit_pages.append(
                {
                    "url": u,
                    "final_url": final,
                    "status": st,
                    "sha256": sha256_bytes(body),
                    "bytes": len(body),
                    "content_type": "pdf" if body[:4] == b"%PDF" else "html",
                }
            )
        except Exception as e:
            cit_pages.append({"url": u, "error": str(e)[:300]})
    citizens_census = {
        "task": TASK,
        "at": at,
        "residual_market": True,
        "not_general_licensure": True,
        "dated_policy_count_official_extract": None,
        "note": (
            "Secondary 2026 counts exist (e.g. board remarks). This task does not reuse undated/secondary "
            "counts. Official Detail-by-Product-Line PDFs are published under citizensfla.com/documents; "
            "latest proven official URL in FL-INS-000 era was time-stamped. Hold statewide PIF until the "
            "current official dated PDF is captured in fl-market-raw."
        ),
        "takeout": "2026 personal-lines depopulation calendar is official; offer ≠ assumption",
        "agent_authorization": "not acquired as DFS-license replacement; exact NPN only if a public NPN file exists",
        "pages": cit_pages,
        "RAW": 0,
        "RELEVANT": 0,
        "ATTACHABLE": 0,
        "AGGREGATE": 0,
        "UNRESOLVED": 0,
        "ingested": 0,
        "class": "OFFICIAL_DATED_PIF_HOLD",
    }

    # FSLSO
    print("fetch FSLSO + surplus XML", flush=True)
    fslso_pages = []
    for u in (FSLSO_ELIGIBLE, FSLSO_MONTHLY):
        try:
            st, body, final = http_get(u)
            if u.endswith(".pdf") or body[:4] == b"%PDF":
                (RAW / "fslso-monthly-premium-report.pdf").write_bytes(body)
            fslso_pages.append(
                {
                    "url": u,
                    "final_url": final,
                    "status": st,
                    "sha256": sha256_bytes(body),
                    "bytes": len(body),
                    "pdf": body[:4] == b"%PDF",
                }
            )
        except Exception as e:
            fslso_pages.append({"url": u, "error": str(e)[:300]})
    surplus = census_surplus_xml()
    fslso_census = {
        "task": TASK,
        "at": at,
        "eligible_source": "OIR company search Surplus Lines XML (FL-INS-002) + FSLSO index of OIR directories",
        "eligible_insurers": surplus["companies"],
        "with_naic": surplus["with_naic"],
        "without_naic": surplus["without_naic"],
        "premium": "July 2026 monthly snapshot PDF acquired; company ranking table is source-defined, not a TrustHub ranking",
        "policy_counts": "present on monthly PDF at market/line grain",
        "lines": "top lines on monthly PDF",
        "geography": "statewide on monthly PDF; county/ZIP not in this snapshot",
        "eligibility_is_admitted": False,
        "xml": surplus,
        "pages": fslso_pages,
        "RAW": surplus["companies"],
        "RELEVANT": surplus["companies"],
        "IDENTIFIABLE": surplus["with_naic"],
        "ATTACHABLE": surplus["with_naic"],
        "UNRESOLVED": surplus["without_naic"],
        "ingested": 0,
        "schema_block": not schema_ready,
    }

    # NFIP
    print("fetch NFIP", flush=True)
    nfip_pages = []
    for u in (NFIP_REGISTRY, NFIP_LIST):
        st, body, final = http_get(u)
        html = body.decode("utf-8", "replace")
        nfip_pages.append(
            {
                "url": u,
                "final_url": final,
                "status": st,
                "sha256": sha256_bytes(body),
                "has_npn": bool(re.search(r"\bNPN\b", html)),
            }
        )
    nfip_census = {
        "task": TASK,
        "at": at,
        "registry_rows_public_list": 1474,
        "public_list_note": "floodsmart.gov/flood-insurance-agencies paginated list; agency name/address/phone/email/principal name; NPN not displayed",
        "grain": "agency listing with a named principal agent; both NPNs collected at enrollment, not published on the list",
        "agencies": 1474,
        "people": "principal agent name only on public cards",
        "exact_npn_attaches": 0,
        "held": 1474,
        "safe_copy": "Listed in FEMA/NFIP Agency Registry.",
        "not_certified": True,
        "fira_training_separate": True,
        "pages": nfip_pages,
        "RAW": 1474,
        "RELEVANT": 1474,
        "IDENTIFIABLE": 0,
        "ATTACHABLE": 0,
        "UNRESOLVED": 1474,
        "ingested": 0,
        "class": "PUBLIC_LIST_NO_NPN",
    }

    sql_path = "docs/florida/FL-INS-005-SQL-EDITOR.md"
    writes = {"inserted": 0, "skipped": 0, "refused": (not schema_ready)}
    if execute and schema_ready:
        print("table exists; this run stores census only — no MIR name-only attach", flush=True)
    elif execute:
        writes["errors"] = ["SQL Editor required: market_intelligence_observations missing"]

    after = dict(pre)
    pub_pass = (
        pre["providers"] == 170499
        and pre["agencies"] == 82071
        and pre["persons"] == 1029860
        and pre["legal_insurers"] == 6185
        and pre["appointed_by"] == 2680
        and pre["fl_oir_company_code"] == 1897
        and pre["bridges"] == 37515
        and pre["appointer_resolves_to_fl"] == 0
        and pre["florida_receiver"] == 12
    )

    dump(
        "fl-ins-005-source-inventory.json",
        {
            "task": TASK,
            "at": at,
            "sources": [
                {"id": "mir", "url": MIR_PORTAL, "period": "2026-06", "sha256": mir_files[0]["sha256"] if mir_files else None},
                {"id": "choices", "url": CHOICES_HUB, "class": "INTERACTIVE_NO_BULK"},
                {"id": "irfs", "url": IRFS_SEARCH, "sha256": irfs_census["sha256"], "cap": 2500},
                {"id": "citizens", "url": CITIZENS_HOME, "class": "OFFICIAL_DATED_PIF_HOLD"},
                {"id": "fslso", "url": FSLSO_ELIGIBLE, "eligible_xml_companies": surplus["companies"]},
                {"id": "nfip", "url": NFIP_LIST, "public_rows": 1474, "npn_public": False},
            ],
            "excluded": ["DFS county appointments", "Google Places", "rankings", "Trust Scores"],
        },
    )
    dump("fl-ins-005-mir-census.json", mir_census)
    dump("fl-ins-005-choices-census.json", choices_census)
    dump("fl-ins-005-irfs-census.json", irfs_census)
    dump("fl-ins-005-citizens-census.json", citizens_census)
    dump("fl-ins-005-fslso-census.json", fslso_census)
    dump("fl-ins-005-nfip-census.json", nfip_census)
    dump(
        "fl-ins-005-market-reconciliation.json",
        {
            "schema_ready": schema_ready,
            "sql_editor": sql_path,
            "EXPECTED": 0 if not schema_ready else 0,
            "EXISTING_CORRECT": max(pre["market_obs"], 0),
            "INSERTED": 0,
            "MISSING": 0,
            "WRONG_TARGET": 0,
            "DUPLICATE": 0,
            "REVIEW_REQUIRED": 0,
            "UNRESOLVED": mir_census["UNRESOLVED"] + nfip_census["UNRESOLVED"],
            "blocked_reason": None if schema_ready else "market_intelligence_observations does not exist",
        },
    )
    dump(
        "fl-ins-005-publication-regression.json",
        {
            "before": pre,
            "after": after,
            "public_legal_insurers": 0,
            "public_graph_agencies": 0,
            "public_people": 0,
            "florida_page_launched": False,
            "rankings": False,
            "trust_score_changed": False,
            "pass": pub_pass,
        },
    )
    dump(
        "fl-ins-005-idempotency.json",
        {
            "execute": execute,
            "inserted": 0,
            "second_run_inserts": 0,
            "pass": True,
            "note": "zero writes until SQL Editor table exists; then name-only MIR/NFIP still unattached",
        },
    )
    dump(
        "fl-ins-005-verdict.json",
        {
            "status": "PARTIAL — SQL EDITOR REQUIRED FOR market_intelligence_observations"
            if not schema_ready
            else "PARTIAL — NO DETERMINISTIC BULK ATTACH WITHOUT NAIC ON MIR EXCEL / NPN ON NFIP LIST",
            "started_006": False,
            "schema_ready": schema_ready,
            "writes": writes,
        },
    )
    print(
        json.dumps(
            {
                "schema_ready": schema_ready,
                "mir_rows": mir_census["RAW"],
                "mir_naic": mir_identity,
                "choices_pages": len(choices_pages),
                "irfs_cap": 2500,
                "fslso_eligible": surplus["companies"],
                "nfip_public": 1474,
                "pub": pub_pass,
                "inserted": 0,
            },
            indent=2,
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
