import re
from pathlib import Path

p = Path("data/oir-raw/pc-market.html")
h = p.read_text(encoding="utf-8", errors="replace")
print("bytes", len(h))
pdfs = re.findall(r'href="([^"]+\.pdf)"[^>]*>([^<]{0,160})', h, re.I)
print("pdfs", len(pdfs))
for u, t in pdfs[:30]:
    print(t.strip()[:90], "|", u[-80:])
