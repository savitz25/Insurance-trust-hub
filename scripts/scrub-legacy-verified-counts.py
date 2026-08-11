"""Light Phase 2 scrub of legacy '12 verified' marketing strings in hub data."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def scrub_registry(text: str) -> str:
    text = re.sub(
        r"Compare 12 verified independent insurance agents in ([^.]+)\.",
        r"Research insurance agencies and coverage options in \1. "
        r"Verified listings appear only when they meet our public research standard.",
        text,
    )
    text = re.sub(
        r"Compare 850\+ verified insurance agents in ([^.]+)\.",
        r"Research insurance agencies and coverage options in \1. "
        r"Verified listings appear only when they meet our public research standard.",
        text,
    )
    text = re.sub(
        r"Find verified health insurance agents in ([^.]+)\.",
        r"Research health insurance options in \1. "
        r"Verified listings appear only when they meet our public research standard.",
        text,
    )
    text = re.sub(
        r"Find trusted health insurance agents in ([^.]+)\.",
        r"Research health insurance options in \1. "
        r"Verified listings appear only when they meet our public research standard.",
        text,
    )
    text = re.sub(
        r"Compare verified health insurance agents in ([^.]+)\.",
        r"Research health insurance options in \1. "
        r"Verified listings appear only when they meet our public research standard.",
        text,
    )
    text = re.sub(
        r"Compare verified insurance agents in ([^.]+)\.",
        r"Research insurance agencies and coverage options in \1. "
        r"Verified listings appear only when they meet our public research standard.",
        text,
    )
    return text


def scrub_curated(text: str) -> str:
    return text.replace(
        "12 verified independent agencies ",
        "Market research coverage for ",
    )


def main() -> None:
    reg = ROOT / "lib/hubs/registry.ts"
    cur = ROOT / "lib/hubs/data/curated-hubs.ts"
    rt = reg.read_text(encoding="utf-8")
    ct = cur.read_text(encoding="utf-8")
    rt2 = scrub_registry(rt)
    ct2 = scrub_curated(ct)
    reg.write_text(rt2, encoding="utf-8")
    cur.write_text(ct2, encoding="utf-8")
    print("registry 12 verified:", rt.count("12 verified"), "->", rt2.count("12 verified"))
    print("curated 12 verified:", ct.count("12 verified"), "->", ct2.count("12 verified"))
    print("registry 850+:", rt.count("850+"), "->", rt2.count("850+"))


if __name__ == "__main__":
    main()
