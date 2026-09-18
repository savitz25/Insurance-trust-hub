#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "data/pennsylvania/pa-ins-001"


def facet(val) -> str:
    if isinstance(val, list):
        return ", ".join(str(x) for x in val)
    return str(val) if val is not None else ""


def main() -> None:
    enf = json.loads((OUT / "enforcement-catalog.json").read_text(encoding="utf-8"))
    rows = enf["rows"]
    types = Counter(facet(r.get("actionType")) for r in rows)
    years = Counter(facet(r.get("year")) or "unknown" for r in rows)
    titles = [r.get("title") or "" for r in rows]
    uris = [r.get("uri") or "" for r in rows]
    mc_uris = [r for r in rows if "Market Conduct" in facet(r.get("actionType"))]
    ea_uris = [r for r in rows if facet(r.get("actionType")) == "Enforcement Actions"]
    ccrc = [r for r in rows if "CCRC" in facet(r.get("actionType"))]
    summary = {
        "retrievedAt": enf["retrievedAt"],
        "hub": enf["hub"],
        "documentRows": len(rows),
        "uniqueTitles": len(set(titles)),
        "uniqueUris": len(set(uris)),
        "actionTypes": dict(types),
        "years": dict(sorted(years.items())),
        "enforcementActions": len(ea_uris),
        "marketConductActions": len(mc_uris),
        "ccrcReports": len(ccrc),
        "naicPopulated": enf["naicPopulated"],
        "docketPopulated": enf["docketPopulated"],
        "uniqueMatters": None,
        "nameOnly": True,
        "marketConductIsNotEnforcementAction": True,
        "ccrcIsNotCompanyEnforcement": True,
        "sampleEnforcement": [{"title": r["title"], "uri": r["uri"], "year": r.get("year")} for r in ea_uris[:5]],
        "sampleMarketConduct": [{"title": r["title"], "uri": r["uri"], "year": r.get("year")} for r in mc_uris[:5]],
    }
    (OUT / "enforcement-summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print("ENF", json.dumps({k: v for k, v in summary.items() if k not in {"sampleEnforcement", "sampleMarketConduct", "years"}}, indent=2))

    liq = json.loads((OUT / "liquidation-catalog.json").read_text(encoding="utf-8"))
    lrows = liq["rows"]
    statuses = Counter(facet(r.get("status")) for r in lrows)
    topics = Counter(facet(r.get("topic")) for r in lrows)
    lsum = {
        "retrievedAt": liq["retrievedAt"],
        "hub": liq["hub"],
        "documentRows": len(lrows),
        "uniqueTitles": len({r.get("title") for r in lrows}),
        "statuses": dict(statuses),
        "topics": dict(topics),
        "naicPopulated": liq["naicPopulated"],
        "liquidationIsNotCurrentCensus": True,
        "rehabIsNotLiquidation": True,
        "dischargeIsNotCurrentLicense": True,
        "sample": [{"title": r["title"], "status": r.get("status"), "topic": r.get("topic")} for r in lrows[:8]],
    }
    (OUT / "liquidation-summary.json").write_text(json.dumps(lsum, indent=2) + "\n", encoding="utf-8")
    print("LIQ", json.dumps({k: v for k, v in lsum.items() if k != "sample"}, indent=2))

    fin = json.loads((OUT / "financial-exams.json").read_text(encoding="utf-8"))
    frows = fin["rows"]
    fsum = {
        "retrievedAt": fin["retrievedAt"],
        "hub": fin["hub"],
        "documentRows": len(frows),
        "uniqueTitles": len({r.get("title") for r in frows}),
        "uniqueUris": len({r.get("uri") for r in frows}),
        "naicPopulated": fin["naicPopulated"],
        "years": fin.get("years"),
        "financialExamIsNotMarketConduct": True,
        "examIsNotEnforcement": True,
        "nameOnly": True,
        "sample": [{"title": r["title"], "uri": r["uri"], "year": r.get("year")} for r in frows[:6]],
    }
    (OUT / "financial-exam-summary.json").write_text(json.dumps(fsum, indent=2) + "\n", encoding="utf-8")
    print("FIN", json.dumps({k: v for k, v in fsum.items() if k != "sample"}, indent=2))

    sur = json.loads((OUT / "surplus-lines.json").read_text(encoding="utf-8"))
    print("SURPLUS letterRows", sur["letterRows"], "distinct", sur["distinctNaic"])

    co = json.loads((OUT / "licensed-companies.json").read_text(encoding="utf-8"))
    print("CO", co["letterRows"], co["distinctNaic"], co["paDomicileDistinctNaic"])


if __name__ == "__main__":
    main()
