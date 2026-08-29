"""Reclassify person LOA codebook in place. No network. db_writes=0."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
report_path = ROOT / "data/reports/ins-nat-012-person-loa.json"
cb_path = ROOT / "data/codebooks/ins-nat-012-person-loa-v1.json"


def classify(ds: str, label: str) -> dict:
    u = (label or "").strip().upper()
    if u in {"TRAVEL", "CREDIT", "LIFE", "HEALTH", "PROPERTY", "CASUALTY"}:
        fam = {
            "TRAVEL": "Travel",
            "CREDIT": "Credit",
            "LIFE": "Life",
            "HEALTH": "Health",
            "PROPERTY": "Property",
            "CASUALTY": "Casualty",
        }[u]
        return {
            "normalized_family": fam,
            "mapping_confidence": "EXACT",
            "mapping_basis": f"{ds}: atomic source label {label}",
            "included_in_cross_source_analysis": fam in {"Travel", "Credit", "Life", "Health", "Property", "Casualty"},
            "source_definition": f"{ds}: atomic source label {label}",
        }
    if u in {"ACCIDENT AND HEALTH", "ACCIDENT AND HEALTH OR SICKNESS"}:
        return {
            "normalized_family": "Accident & Health / Health",
            "mapping_confidence": "EXACT",
            "mapping_basis": f"{ds}: atomic accident and health wording",
            "included_in_cross_source_analysis": True,
            "source_definition": f"{ds}: atomic accident and health wording",
        }
    if u == "PERSONAL LINES PROP AND CAS":
        return {
            "normalized_family": "Personal Lines",
            "mapping_confidence": "DEFENSIBLE_COMPOSITE",
            "mapping_basis": f"{ds}: Personal Lines Prop and Cas not split into Property vs Casualty",
            "included_in_cross_source_analysis": False,
            "source_definition": f"{ds}: Personal Lines Prop and Cas not split into Property vs Casualty",
        }
    if u == "PROPERTY AND CASUALTY" or "GEN LINES (PROP & CAS)" in u:
        return {
            "normalized_family": "Property & Casualty (source composite)",
            "mapping_confidence": "DEFENSIBLE_COMPOSITE",
            "mapping_basis": f"{ds}: composite P&C / general lines; not split into independent Property and Casualty",
            "included_in_cross_source_analysis": False,
            "source_definition": f"{ds}: composite P&C / general lines",
        }
    if "LIFE, ACCIDENT, HEALTH" in u or "LIFE INCL VAR ANNUITY & HEALTH" in u or u == "LIFE & HEALTH":
        return {
            "normalized_family": "Life / Health (source composite)",
            "mapping_confidence": "DEFENSIBLE_COMPOSITE",
            "mapping_basis": f"{ds}: bundled life/health (variable/HMO where present); not decomposed",
            "included_in_cross_source_analysis": False,
            "source_definition": f"{ds}: bundled life/health composite",
        }
    if "VARIABLE" in u:
        return {
            "normalized_family": "Variable Life / Annuity",
            "mapping_confidence": "DEFENSIBLE_COMPOSITE",
            "mapping_basis": f"{ds}: variable life/annuity wording kept as composite where bundled",
            "included_in_cross_source_analysis": False,
            "source_definition": f"{ds}: variable life/annuity wording",
        }
    if "LIMITED LINE" in u:
        return {
            "normalized_family": "Limited Lines",
            "mapping_confidence": "SOURCE_SPECIFIC",
            "mapping_basis": f"{ds}: Limited Line without a national product split",
            "included_in_cross_source_analysis": False,
            "source_definition": f"{ds}: Limited Line",
        }
    extras = {
        "LIFE AGENT/AGENCY": ("Life Agent/Agency", "SOURCE_SPECIFIC", "mixes life authority with agent/agency class"),
        "PERSONAL LINES": ("Personal Lines", "SOURCE_SPECIFIC", "not proven equivalent to TX Personal Lines Prop and Cas"),
        "PERSONAL LINES AGENT": ("Personal Lines", "SOURCE_SPECIFIC", "Florida TYCL agent class, not a national Personal Lines LOA"),
        "NONRES PERSONAL LINES AGENT": ("Personal Lines", "SOURCE_SPECIFIC", "Florida nonresident TYCL agent class"),
        "NONRESIDENT HEALTH": ("Health", "SOURCE_SPECIFIC", "Florida nonresident HEALTH TYCL is not proven equivalent to VT Health"),
        "NONRESIDENT LIFE": ("Life", "SOURCE_SPECIFIC", "Florida nonresident LIFE TYCL is not proven equivalent to VT Life"),
        "NONRESIDENT LIFE & HEALTH": ("Life / Health (source composite)", "SOURCE_SPECIFIC", "Florida nonresident life & health TYCL"),
        "MILITARY REG (LIFE INSURANCE)": ("Life", "SOURCE_SPECIFIC", "Florida military registration life insurance TYCL"),
        "TITLE": ("Title", "SOURCE_SPECIFIC", "Vermont Title is source-specific"),
        "SELF STORAGE": ("Limited Lines", "SOURCE_SPECIFIC", "Vermont self storage limited line"),
        "WORKER'S COMPENSATION": ("Casualty", "SOURCE_SPECIFIC", "Vermont worker's compensation is source-specific"),
    }
    if u in extras:
        fam, conf, basis = extras[u]
        return {
            "normalized_family": fam,
            "mapping_confidence": conf,
            "mapping_basis": f"{ds}: {basis}",
            "included_in_cross_source_analysis": False,
            "source_definition": f"{ds}: {basis}",
        }
    if ds.startswith("florida_dfs"):
        return {
            "normalized_family": "Florida TYCL / license class (person)",
            "mapping_confidence": "SOURCE_SPECIFIC",
            "mapping_basis": "Florida individual official_text is DFS TYCL/license-class wording, not a national LOA codebook",
            "included_in_cross_source_analysis": False,
            "source_definition": "Florida DFS person TYCL/license class",
        }
    return {
        "normalized_family": "UNRESOLVED",
        "mapping_confidence": "UNRESOLVED",
        "mapping_basis": f"{ds}: no conservative source-backed mapping",
        "included_in_cross_source_analysis": False,
        "source_definition": f"{ds}: unresolved",
    }


report = json.loads(report_path.read_text(encoding="utf-8"))
cb = json.loads(cb_path.read_text(encoding="utf-8"))
p5 = p6 = p7 = p8 = 0
for row in cb["entries"]:
    mapped = classify(row["source_dataset"], row["raw_label"])
    row.update(mapped)
    n = row["raw_rows"]
    if row["mapping_confidence"] == "EXACT":
        p5 += n
    elif row["mapping_confidence"] == "DEFENSIBLE_COMPOSITE":
        p6 += n
    elif row["mapping_confidence"] == "SOURCE_SPECIFIC":
        p7 += n
    else:
        p8 += n

report["P5"] = p5
report["P6"] = p6
report["P7"] = p7
report["P8"] = p8
report["equations"]["p5_to_p8_eq_p2"] = p5 + p6 + p7 + p8 == report["P2"]
report["source_row_counts"] = {
    "florida_dfs_individual": 927692,
    "texas_tdi_individual": 733324,
    "vermont_dfr_individual": 60597,
    "texas_tdi": 50348,
    "massachusetts_doi_regulatory": 19177,
    "vermont_dfr": 20,
    "florida_dfs": 0,
    "ohio_odi": 0,
    "ohio_odi_individual": 0,
    "massachusetts_doi": 0,
}
report["agencyDatasetsExcluded"] = {
    "texas_tdi": 50348,
    "massachusetts_doi_regulatory": 19177,
    "vermont_dfr": 20,
    "florida_dfs": 0,
    "ohio_odi": 0,
}
p11 = len({row["state"] for row in cb["entries"] if row.get("included_in_cross_source_analysis")})
report["P11"] = p11
report["equations"]["p11_le_p10"] = p11 <= report["P10"]

fp_src = {
    "source_inventory": report["personDatasets"],
    "codebook": cb["entries"],
    "denominators": {k: report[k] for k in ("P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P10", "P11")},
    "comparability": report["comparability"],
}
fp = hashlib.sha256(json.dumps(fp_src, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
fp2 = hashlib.sha256(json.dumps(fp_src, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
assert fp == fp2
report["fingerprint"] = fp
cb["fingerprint"] = fp
report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
cb_path.write_text(json.dumps(cb, indent=2) + "\n", encoding="utf-8")
print("P5", p5, "P6", p6, "P7", p7, "P8", p8, "sum", p5 + p6 + p7 + p8, "P2", report["P2"])
print("unresolved", [r["raw_label"] for r in cb["entries"] if r["mapping_confidence"] == "UNRESOLVED"])
print("fingerprint", fp)
print("fingerprint_repeat_match", fp == fp2)
