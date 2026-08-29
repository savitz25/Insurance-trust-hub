"""INS-HOME-001 read-only Production census. db_writes=0. Exact counts only."""
import json, ssl, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k] = v.strip().strip('"').strip("'")
URL = env["SUPABASE_URL"].rstrip("/")
KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
CTX = ssl.create_default_context()


def count(table: str, qs: str = "") -> int | str:
    path = f"/rest/v1/{table}?select=id"
    if qs:
        path += "&" + qs
    r = urllib.request.Request(
        f"{URL}{path}",
        headers={
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Prefer": "count=exact",
            "Range": "0-0",
        },
    )
    try:
        with urllib.request.urlopen(r, timeout=90, context=CTX) as resp:
            cr = resp.headers.get("Content-Range") or "0-0/-1"
            return int(cr.rsplit("/", 1)[-1])
    except urllib.error.HTTPError as e:
        return f"HTTP{e.code}"


def sample_keys(table: str) -> list[str]:
    r = urllib.request.Request(
        f"{URL}/rest/v1/{table}?select=*&limit=1",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
    )
    try:
        with urllib.request.urlopen(r, timeout=60, context=CTX) as resp:
            rows = json.loads(resp.read())
            return sorted(rows[0].keys()) if rows else []
    except Exception as e:
        return [str(e)[:80]]


out = {
    "task": "INS-HOME-001",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "db_writes": 0,
    "entities": {
        "agency": count("national_entities", "entity_kind=eq.agency"),
        "person": count("national_entities", "entity_kind=eq.person"),
        "carrier": count("national_entities", "entity_kind=eq.carrier"),
        "legal_insurer": count("national_entities", "entity_kind=eq.legal_insurer"),
    },
    "npn": {
        "person_npn_not_null": count("national_entities", "entity_kind=eq.person&npn=not.is.null"),
        "agency_npn_not_null": count("national_entities", "entity_kind=eq.agency&npn=not.is.null"),
    },
    "credentials": {
        "total": count("license_credentials"),
        "agency": count("license_credentials", "entity_kind=eq.agency"),
        "person": count("license_credentials", "entity_kind=eq.person"),
        "unattached": count("license_credentials", "entity_id=is.null"),
        "FL": count("license_credentials", "jurisdiction=eq.FL"),
        "TX": count("license_credentials", "jurisdiction=eq.TX"),
        "VT": count("license_credentials", "jurisdiction=eq.VT"),
        "MA": count("license_credentials", "jurisdiction=eq.MA"),
        "OH": count("license_credentials", "jurisdiction=eq.OH"),
    },
    "loa": {
        "total": count("loa_observations"),
        "agency_tx": count("loa_observations", "source_dataset=eq.texas_tdi"),
        "agency_ma": count("loa_observations", "source_dataset=eq.massachusetts_doi_regulatory"),
        "agency_vt": count("loa_observations", "source_dataset=eq.vermont_dfr"),
        "person_fl": count("loa_observations", "source_dataset=eq.florida_dfs_individual"),
        "person_tx": count("loa_observations", "source_dataset=eq.texas_tdi_individual"),
        "person_vt": count("loa_observations", "source_dataset=eq.vermont_dfr_individual"),
    },
    "cms": {
        "observations": count("cms_marketplace_observations"),
        "keys": sample_keys("cms_marketplace_observations"),
    },
    "relationships": {
        "appointed_by": count("national_relationships", "relationship_type=eq.appointed_by"),
        "APPOINTED_TO": count("national_relationships", "relationship_type=eq.APPOINTED_TO"),
        "ASSOCIATED_WITH": count("national_relationships", "relationship_type=eq.ASSOCIATED_WITH"),
        "WORKS_FOR": count("national_relationships", "relationship_type=eq.WORKS_FOR"),
    },
    "providers_public": count("providers"),
    "keys": {
        "national_entities": sample_keys("national_entities"),
        "license_credentials": sample_keys("license_credentials"),
        "national_relationships": sample_keys("national_relationships"),
        "national_entity_identifiers": sample_keys("national_entity_identifiers"),
    },
    "identifiers": {
        "total": count("national_entity_identifiers"),
    },
    "regulatory": {
        "evidence": count("regulatory_evidence"),
        "keys": sample_keys("regulatory_evidence"),
    },
}

path = ROOT / "data/reports/ins-home-001-census.json"
path.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
print(json.dumps(out, indent=2)[:4000])
print("wrote", path)
