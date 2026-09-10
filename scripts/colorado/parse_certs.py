"""Count named certificate-of-compliance entries, including Drive links."""
from __future__ import annotations

import json
import re
from pathlib import Path

html = Path("data/colorado/co-ins-001/certs.html").read_text(encoding="utf-8", errors="replace")
# Certificate lists live in field-card-body ul/li.
bodies = re.findall(
    r'field--name-field-card-body.*?field--item">(.*?)</div>',
    html,
    flags=re.I | re.S,
)
items = []
for body in bodies:
    for m in re.finditer(r"<li[^>]*>(.*?)</li>", body, flags=re.I | re.S):
        chunk = m.group(1)
        text = re.sub(r"<[^>]+>", " ", chunk)
        text = re.sub(r"\s+", " ", text).strip()
        hrefs = re.findall(r'href="([^"]+)"', chunk)
        if text:
            items.append({"name": text, "hrefs": hrefs})

pdf = [i for i in items if any(".pdf" in h.lower() for h in i["hrefs"])]
drive = [i for i in items if any("drive.google.com" in h.lower() for h in i["hrefs"])]
print(json.dumps({
    "named_entries": len(items),
    "pdf_href_entries": len(pdf),
    "drive_entries": len(drive),
    "names": [i["name"] for i in items],
}, indent=2))
