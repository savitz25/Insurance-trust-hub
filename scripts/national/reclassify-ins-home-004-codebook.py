"""Reclassify INS-HOME-004 census codebook in place. No network. db_writes=0."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "data/reports/ins-home-004-loa-census.json"
cb_path = ROOT / "data/codebooks/ins-home-004-agency-loa-v1.json"


def classify(source: str, text: str) -> dict:
    u = (text or "").strip().upper()
    rules = {
        ("massachusetts_doi_regulatory", "PROPERTY"): (
            "Property", "EXACT", "MA DOI atomic Property", "Property",
        ),
        ("massachusetts_doi_regulatory", "CASUALTY"): (
            "Casualty", "EXACT", "MA DOI atomic Casualty", "Casualty",
        ),
        ("massachusetts_doi_regulatory", "LIFE"): (
            "Life", "EXACT", "MA DOI atomic Life", "Life",
        ),
        ("massachusetts_doi_regulatory", "ACCIDENT & HEALTH OR SICKNESS"): (
            "Accident & Health / Health", "EXACT",
            "MA DOI atomic Accident & Health or Sickness", "Accident & Health",
        ),
        ("massachusetts_doi_regulatory", "TRAVEL"): (
            "Travel", "EXACT", "MA DOI Travel", "Travel",
        ),
        ("massachusetts_doi_regulatory", "CREDIT"): (
            "Credit", "EXACT", "MA DOI Credit", "Credit",
        ),
        ("massachusetts_doi_regulatory", "PERSONAL LINES"): (
            "Personal Lines", "SOURCE_SPECIFIC",
            "MA Personal Lines is not the same string or proven equivalent of TX Personal Lines Prop and Cas",
            "Personal Lines",
        ),
        ("massachusetts_doi_regulatory", "VARIABLE LIFE & VARIABLE ANNUITY"): (
            "Variable Life / Variable Annuity", "EXACT",
            "MA DOI Variable Life & Variable Annuity; no matching agency label in TX/VT in this extract",
            "Variable Life / Annuity",
        ),
        ("texas_tdi", "PROPERTY AND CASUALTY"): (
            "Property & Casualty (source composite)", "DEFENSIBLE_COMPOSITE",
            "Texas TDI single Property and Casualty qualification; not split into MA Property vs Casualty",
            "Property & Casualty",
        ),
        ("texas_tdi", "PERSONAL LINES PROP AND CAS"): (
            "Personal Lines", "DEFENSIBLE_COMPOSITE",
            "Texas TDI Personal Lines Prop and Cas is not identical to MA Property or MA Casualty",
            "Personal Lines (P&C)",
        ),
        ("texas_tdi", "LIFE, ACCIDENT, HEALTH & HMO"): (
            "Life / Accident / Health / HMO (source composite)", "DEFENSIBLE_COMPOSITE",
            "Texas TDI bundled Life, Accident, Health & HMO; not decomposed into MA Life vs MA Health",
            "Life, Accident, Health & HMO",
        ),
        ("texas_tdi", "CREDIT"): ("Credit", "EXACT", "Texas TDI Credit qualification", "Credit"),
        ("texas_tdi", "TRAVEL"): ("Travel", "EXACT", "Texas TDI Travel qualification", "Travel"),
        ("texas_tdi", "LIFE AGENT/AGENCY"): (
            "Life Agent/Agency", "SOURCE_SPECIFIC",
            "Texas label mixes life authority with agent/agency class; not treated as MA Life",
            "Life Agent/Agency",
        ),
        ("texas_tdi", "MGA - P&C"): (
            "MGA - P&C", "SOURCE_SPECIFIC",
            "Managing General Agent P&C is a Texas role/qualification, not MA Property or Casualty",
            "MGA - P&C",
        ),
        ("texas_tdi", "ADJUSTER - P&C"): (
            "Adjuster", "SOURCE_SPECIFIC",
            "Adjuster authority is claims handling, not a selling LOA comparable to MA Property/Casualty",
            "Adjuster - P&C",
        ),
        ("texas_tdi", "LIMITED LINES"): (
            "Limited Lines", "SOURCE_SPECIFIC",
            "Texas Limited Lines without a product split in this extract",
            "Limited Lines",
        ),
        ("texas_tdi", "ADJUSTER - ALL LINES"): (
            "Adjuster", "SOURCE_SPECIFIC",
            "Adjuster — All Lines is claims authority, not a national selling family",
            "Adjuster - All Lines",
        ),
        ("texas_tdi", "COUNTY MUTUAL"): (
            "County Mutual", "SOURCE_SPECIFIC",
            "Texas County Mutual is a source-specific company/authority class",
            "County Mutual",
        ),
        ("texas_tdi", "ADJUSTER -  WORKER'S COMP."): (
            "Adjuster", "SOURCE_SPECIFIC",
            "Workers' compensation adjuster is source-specific claims authority",
            "Adjuster - Worker's Comp.",
        ),
        ("texas_tdi", "PORTABLE ELECTRONIC DEVICES"): (
            "Limited Lines", "SOURCE_SPECIFIC",
            "Portable Electronic Devices is a limited line; not a national Property family",
            "Portable Electronic Devices",
        ),
        ("texas_tdi", "LIFE INS NOT EXCEEDING $25,000"): (
            "Life (limited)", "SOURCE_SPECIFIC",
            "Capped life amount is not equivalent to MA Life",
            "Life ins. not exceeding $25,000",
        ),
        ("texas_tdi", "PRE-NEED"): (
            "Pre-Need", "SOURCE_SPECIFIC",
            "Texas Pre-Need is a limited/source-specific qualification",
            "Pre-Need",
        ),
        ("texas_tdi", "UNDERWRITER"): (
            "Underwriter", "SOURCE_SPECIFIC",
            "Underwriter is a role/qualification, not a product LOA family",
            "Underwriter",
        ),
        ("vermont_dfr", "CREDIT"): ("Credit", "EXACT", "Vermont DFR Credit limited line", "Credit"),
        ("vermont_dfr", "TRAVEL"): ("Travel", "EXACT", "Vermont DFR Travel limited line", "Travel"),
        ("vermont_dfr", "LIMITED LINE"): (
            "Limited Lines", "SOURCE_SPECIFIC",
            "Vermont Limited Line without a product category in this extract",
            "Limited Line",
        ),
    }
    hit = rules.get((source, u))
    if not hit:
        return {
            "normalized_family": "UNRESOLVED",
            "mapping_confidence": "UNRESOLVED",
            "mapping_basis": "No conservative source-backed mapping",
            "consumer_label": text,
            "included_in_national_story": False,
        }
    fam, conf, basis, lab = hit
    return {
        "normalized_family": fam,
        "mapping_confidence": conf,
        "mapping_basis": basis,
        "consumer_label": lab,
        "included_in_national_story": False,
    }


report = json.loads(path.read_text(encoding="utf-8"))
l2 = l3 = l4 = 0
for row in report["codebook"]:
    mapped = classify(row["source_dataset"], row["raw_label"])
    row.update(mapped)
    if row["mapping_confidence"] in ("EXACT", "DEFENSIBLE_COMPOSITE"):
        l2 += row["raw_rows"]
    elif row["mapping_confidence"] == "SOURCE_SPECIFIC":
        l3 += row["raw_rows"]
    else:
        l4 += row["raw_rows"]
report["L2"] = l2
report["L3"] = l3
report["L4"] = l4
report["residual"] = report["L1"] - l2 - l3 - l4
report["equations"]["l2_l3_l4_eq_l1"] = report["residual"] == 0
report["codebookVersion"] = "ins-home-004-agency-loa-v1"
path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
cb_path.parent.mkdir(parents=True, exist_ok=True)
cb_path.write_text(
    json.dumps(
        {
            "version": "ins-home-004-agency-loa-v1",
            "db_writes": 0,
            "nationalStory": "INTENTIONALLY_UNCHANGED",
            "entries": report["codebook"],
        },
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
print("L1", report["L1"], "L2", l2, "L3", l3, "L4", l4, "residual", report["residual"])
print("unresolved", [r["raw_label"] for r in report["codebook"] if r["mapping_confidence"] == "UNRESOLVED"])
print("wrote", path)
print("wrote", cb_path)
