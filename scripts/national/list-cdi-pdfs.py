import json, re
from pathlib import Path
from collections import Counter

html = Path("data/cdi-raw/financial-listing.html").read_text(encoding="utf-8", errors="replace")
links = re.findall(
    r'href="(/0250-insurers/0300-insurers/0400-reports-examination/upload/[^"]+\.pdf)"[^>]*>([^<]+)',
    html,
    re.I,
)
base = "https://www.insurance.ca.gov"
rows = [{"url": base + h, "listing_name": t.strip(), "path": h} for h, t in links]
Path("data/reports/ins-insurer-004-cdi-listing.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
c = Counter(r["url"] for r in rows)
print("rows", len(rows), "unique", len(c), "shared", sum(1 for v in c.values() if v > 1))
