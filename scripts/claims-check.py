#!/usr/bin/env python3
"""Claims critic for NEW copy only.

Flags invented/forbidden claims that appear in the working-tree diff against
HEAD (or against --base). Existing lifetime / no-drilling / DOT wording that
is already on HEAD is allow-listed and ignored.

Usage:
  python3 scripts/claims-check.py              # git diff HEAD
  python3 scripts/claims-check.py --seed-demo  # self-test with seeded violations
Exit 0 = clean, 1 = violations.
"""
from __future__ import annotations
import argparse, re, subprocess, sys, tempfile, os

# Patterns that must not appear in NEW lines (added "+" lines of the diff).
RULES = [
    ("price", re.compile(r"\$\s?\d[\d,]*(?:\.\d{2})?|\bstarting at\b|\bfrom \$\b", re.I),
     "Invented or new dollar price — only use Ivan-approved rates"),
    ("review_number", re.compile(r"\b\d{1,4}(?:\+|k)?\s*(?:google\s+)?reviews?\b|\b\d(?:\.\d)?\s*(?:out of|\/)\s*5\b|\b\d(?:\.\d)?\s*stars?\b", re.I),
     "Hardcoded review count/rating — use live Trustindex data attributes"),
    ("new_lifetime", re.compile(r"\blifetime\b", re.I),
     "New 'lifetime' wording — lifetime warranty is bedliners only; leave existing claims alone"),
    ("new_dot", re.compile(r"\bDOT[- ]?(?:ready|compliant|compliance)\b", re.I),
     "New DOT-ready/compliance claim"),
    ("new_nodrill", re.compile(r"\bno[- ]drill(?:ing)?\b|\bwithout drill(?:ing)?\b", re.I),
     "New no-drilling claim"),
]

# Paths we never claim-check (binary, vendor, lockfiles, this script).
SKIP = re.compile(r"(^|/)(node_modules|package-lock\.json|\.png$|\.webp$|\.jpg$|\.mp4$|claims-check\.py)")

def diff_added_lines(base: str) -> list[tuple[str, int, str]]:
    out = subprocess.check_output(["git", "diff", "-U0", base, "--", "."], text=True, errors="replace")
    file = None
    lines = []
    for raw in out.splitlines():
        if raw.startswith("+++ b/"):
            file = raw[6:]
            continue
        if raw.startswith("@@"):
            m = re.search(r"\+(\d+)", raw)
            ln = int(m.group(1)) if m else 0
            continue
        if file and SKIP.search(file):
            continue
        if raw.startswith("+") and not raw.startswith("+++"):
            lines.append((file or "?", ln if 'ln' in dir() else 0, raw[1:]))
            ln = (ln + 1) if 'ln' in dir() else 1
    return lines

def check(lines: list[tuple[str, int, str]]) -> list[str]:
    hits = []
    for path, ln, text in lines:
        # Skip pure markup / URLs / class names
        if re.match(r"\s*(</?[\w-]+|class=|href=|src=|id=)", text):
            # still scan the text content of the line
            pass
        for name, rx, msg in RULES:
            if rx.search(text):
                hits.append(f"{path}:{ln}: [{name}] {msg}\n  > {text.strip()[:160]}")
    return hits

def seed_demo() -> int:
    """Write a temp file with bad NEW lines and confirm we flag all 4 kinds."""
    bad = "\n".join([
        "Lifetime warranty on all coatings",
        "DOT-ready fleet packages",
        "No drilling required for this install",
        "Starting at $499 — 4.9 stars from 1200+ reviews",
    ])
    # Simulate added lines
    lines = [("demo.html", i + 1, t) for i, t in enumerate(bad.splitlines())]
    hits = check(lines)
    kinds = {re.search(r"\[(\w+)\]", h).group(1) for h in hits}
    need = {"price", "review_number", "new_lifetime", "new_dot", "new_nodrill"}
    missing = need - kinds
    print("seed demo flagged:", sorted(kinds))
    if missing:
        print("MISSING kinds:", missing); return 1
    print("seed demo OK"); return 0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="HEAD")
    ap.add_argument("--seed-demo", action="store_true")
    args = ap.parse_args()
    if args.seed_demo:
        sys.exit(seed_demo())
    lines = diff_added_lines(args.base)
    hits = check(lines)
    if not hits:
        print("claims-check: clean (%d new lines scanned)" % len(lines)); sys.exit(0)
    print("claims-check: %d violation(s)" % len(hits))
    print("\n".join(hits)); sys.exit(1)

if __name__ == "__main__":
    main()
