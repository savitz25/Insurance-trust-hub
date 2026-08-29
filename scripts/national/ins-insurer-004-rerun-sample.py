from pathlib import Path
import json
import hashlib
from pypdf import PdfReader
import importlib.util

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "cls", ROOT / "scripts/national/ins-insurer-004-classify.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

files = list((ROOT / "data/cdi-raw").glob("sample-*.pdf"))
rows = []
for p in files:
    reader = PdfReader(str(p))
    text = "\n".join((pg.extract_text() or "") for pg in reader.pages[:60])
    cls = mod.classify_document(p.stem, text)
    rows.append(
        {
            "file": p.name,
            "pages": len(reader.pages),
            "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
            **cls,
        }
    )
    print(p.name, cls["classification"], "exam", [e.get("naic_cocode") for e in cls["examined_entities"]], "mention", cls["mentioned_only"][:12], "cover", cls["cover_subjects"][:4])

out = ROOT / "data/reports/ins-insurer-004-sample-ca-reclass.json"
out.write_text(json.dumps({"n": len(rows), "rows": rows}, indent=2), encoding="utf-8")
print("wrote", out)
