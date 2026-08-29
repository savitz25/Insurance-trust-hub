"""Compact identity index for unpublished-search copy. No ingest."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
spine = json.loads((root / "data/reports/ins-insurer-004-spine.json").read_text(encoding="utf-8"))
rows = [{"naic_cocode": r["cocode"], "legal_name": r["legal_name"]} for r in spine]
out = root / "data/reports/ins-insurer-006-identity-index.json"
out.write_text(json.dumps({"n": len(rows), "insurers": rows}, separators=(",", ":")), encoding="utf-8")
print(len(rows), out.stat().st_size)
