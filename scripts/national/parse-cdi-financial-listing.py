"""Parse CDI Officially Filed Reports of Examination HTML listing."""
import re
import sys
from pathlib import Path

html = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
links = re.findall(
    r'href="(/0250-insurers/0300-insurers/0400-reports-examination/upload/[^"]+\.pdf)"[^>]*>([^<]+)',
    html,
    re.I,
)
print("pdf_links", len(links))
print("unique_pdfs", len({h for h, _ in links}))
titles = [t.strip() for _, t in links]
mlr = sum(1 for t in titles if re.search(r"\bMLR\b", t, re.I))
print("mlr_reports", mlr)
print("non_mlr", len(titles) - mlr)
asof = [m.group(1) for t in titles if (m := re.search(r"as of\s+([\d-]+)", t, re.I))]
print("with_as_of", len(asof))
print("sample", titles[:5])
# duplicate pdfs used by multiple titles
from collections import Counter

c = Counter(h for h, _ in links)
dups = [(k, v) for k, v in c.items() if v > 1]
print("shared_pdf_count", len(dups))
print("shared_pdf_examples", dups[:5])
