#!/usr/bin/env python3
"""
Sentence-level verification: every meaningful source sentence (≥6 words)
must appear verbatim as a substring of the generated lesson body.

This sidesteps the n-gram boundary artifact (where the generator inserts
a heading like "Practice 1" between two source paragraphs that were
adjacent — the words are all there, but no 8-gram spans the seam).
"""

import os
import re
import sys
import io
import html as htmllib
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / ".local-incoming" / "2026-weeks-html"
GEN_DIR = ROOT / ".local-built-lessons"


def strip_html(html: str) -> str:
    h = re.sub(r"<!--[\s\S]*?-->", "", html)
    h = re.sub(r"<script[\s\S]*?</script>", "", h, flags=re.I)
    h = re.sub(r"<style[\s\S]*?</style>", "", h, flags=re.I)
    h = re.sub(r"<(?:p|div|tr|td|table|li|ul|ol|h[1-6]|br|section|article|header|footer|nav|aside|hr)\b[^>]*>", "\n", h, flags=re.I)
    h = re.sub(r"</(?:p|div|tr|td|table|li|ul|ol|h[1-6]|section|article|header|footer|nav|aside)>", "\n", h, flags=re.I)
    h = re.sub(r"<[^>]+>", "", h)
    h = htmllib.unescape(h)
    return h


def normalize(t: str) -> str:
    t = t.lower()
    t = t.replace("\u2018", "'").replace("\u2019", "'")
    t = t.replace("\u201c", '"').replace("\u201d", '"')
    t = t.replace("\u2013", "-").replace("\u2014", "-")
    t = re.sub(r"[^\w\s']", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


CC_CHROME = re.compile(
    r"\bview\s+as\s+webpage\b|\bclick\s+here\b|\bunsubscribe\b|"
    r"\bemail\s+from\s+ny\s+center\b|\bnycnvc\.org\b|"
    r"\bconstant\s+contact\b|\bemail\s+marketing\b|\bsafe\s+sender\b|"
    r"\bforward\s+to\s+a\s+friend\b|\bin\s+collaboration\s+with\b|"
    r"\bbrooklyn.*\bny\b|\b347[\s.-]?563\b|\bcopyright\s+\d|"
    r"\ball\s+rights\s+reserved\b|\bnew\s+york\s+center\s+for\s+nonviolent\b",
    re.I,
)

SECTION_HEADERS = re.compile(
    r"^(the\s+concept|in\s+practice|practices?\s+for\s+(this|the)\s+week|"
    r"compassion\s+course\s+information|practice\s+\d+\s*[:.]?|"
    r"practice\s+(one|two|three|four|five)\s*[:.]?)\s*$",
    re.I,
)


def split_sentences(text: str):
    # split on sentence boundaries; preserve hyphenated phrasing
    out = []
    for paragraph in text.split("\n"):
        para = paragraph.strip()
        if not para:
            continue
        # treat each line as one block; further split on . ! ? followed by space
        parts = re.split(r"(?<=[.!?])\s+", para)
        for p in parts:
            p = p.strip()
            if p:
                out.append(p)
    return out


def get_source_sentences(src_html: str):
    text = strip_html(src_html)
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

    # find lesson body region: from "The Concept" / first quoted subtitle
    # to (but not including) "Compassion Course Information" / footer.
    start = None
    end = len(lines)
    for i, ln in enumerate(lines):
        if re.match(r"^the\s+concept\b", ln, re.I):
            start = i
            break
    if start is None:
        # fallback: first quoted line
        for i, ln in enumerate(lines):
            if (ln.startswith('"') and ln.endswith('"') and 4 <= len(ln) <= 80) or \
               (ln.startswith("'") and ln.endswith("'") and 4 <= len(ln) <= 80):
                start = i
                break
        if start is None:
            start = 0

    for i in range(start + 1, len(lines)):
        if re.match(r"^compassion\s+course\s+information\b", lines[i], re.I):
            end = i
            break

    body_lines = lines[start:end]
    # drop chrome lines + section headers
    cleaned = []
    for ln in body_lines:
        if CC_CHROME.search(ln):
            continue
        if SECTION_HEADERS.match(ln):
            continue
        cleaned.append(ln)
    return split_sentences("\n".join(cleaned))


def get_generated_text(gen_html: str) -> str:
    text = strip_html(gen_html)
    return normalize(text)


def main():
    target_weeks = []
    if len(sys.argv) > 1:
        target_weeks = [int(x) for x in sys.argv[1:]]
    else:
        for f in sorted(GEN_DIR.iterdir()):
            m = re.match(r"week-(\d+)\.html$", f.name)
            if m:
                target_weeks.append(int(m.group(1)))

    overall_total = 0
    overall_missing = 0
    flagged = []

    for n in sorted(target_weeks):
        gen_path = GEN_DIR / f"week-{n}.html"
        rx = re.compile(rf"^[Ww]eek[\s\-_]*0*{n}\b")
        src_candidates = [f for f in SRC_DIR.iterdir() if rx.match(f.name) and f.name.lower().endswith(".html")]
        if not gen_path.exists() or not src_candidates:
            continue
        src_candidates.sort(key=lambda p: ("(" in p.name, len(p.name)))
        src_path = src_candidates[0]

        src_sentences = get_source_sentences(src_path.read_text(encoding="utf-8", errors="replace"))
        gen_norm = get_generated_text(gen_path.read_text(encoding="utf-8", errors="replace"))

        missing = []
        total_meaningful = 0
        for s in src_sentences:
            ns = normalize(s)
            words = ns.split()
            if len(words) < 6:
                continue
            total_meaningful += 1
            if ns not in gen_norm:
                missing.append(s)

        overall_total += total_meaningful
        overall_missing += len(missing)
        status = "OK" if not missing else f"MISSING {len(missing)}/{total_meaningful}"
        print(f"W{n:>2}: {total_meaningful:>3} sentences checked, {len(missing):>3} missing  [{status}]")
        if missing:
            flagged.append((n, missing))

    print()
    print(f"Overall: {overall_missing} / {overall_total} sentences missing ({100*overall_missing/max(overall_total,1):.1f}%)")
    print()

    if flagged:
        print("=" * 70)
        print("Missing sentences (first 5 per week):")
        print("=" * 70)
        for n, missing in flagged:
            print(f"\nW{n}:")
            for s in missing[:5]:
                print(f"  · {s[:200]}")
            if len(missing) > 5:
                print(f"  … and {len(missing) - 5} more")


if __name__ == "__main__":
    main()
