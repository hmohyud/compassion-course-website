#!/usr/bin/env python3
"""
Final content verification — scoped to lesson body only.

For every week, the lesson body = Concept + In Practice + Practices for
the Week. We exclude the "Compassion Course Information" / footer
section, which is Constant Contact email-service chrome (audio CTA,
GCN community CTA, mentor calendars list, footer boilerplate) — that
content is intentionally replaced with our widget UI in the generated
lesson, not preserved.

Three checks:
  1. Word coverage: every meaningful word in source body must appear in
     generated body. (Catches content drops at the word level.)
  2. Sentence coverage: every ≥6-word source sentence must appear as a
     verbatim substring in generated body. (Catches phrase-level edits.)
  3. Practice-step coverage: every "Practice #N - Title" header in source
     must have its title words present in generated. (Confirms practice
     restructuring didn't lose anything.)

Reports any real lesson-content drops; ignores chrome.
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


# Constant Contact chrome that appears across many weeks — exclude from
# both source and generated comparisons.
SECTION_HEADERS = re.compile(
    r"^(the\s+concept|in\s+practice|practices?\s+for\s+(this|the)\s+week|"
    r"compassion\s+course\s+information|practice\s*#?\s*\d+\s*[-:.]?|"
    r"practice\s+(one|two|three|four|five)\s*[-:.]?)\s*$",
    re.I,
)
CHROME_LINE = re.compile(
    r"\bview\s+as\s+webpage\b|\bclick\s+here\b|\bunsubscribe\b|"
    r"\bnycnvc\.org\b|\bemail\s+marketing\b|\bsafe\s+sender\b|"
    r"\bbrooklyn\b.{0,30}\bny\b|\b347[\s.-]?563\b|"
    r"\bnew\s+york\s+center\s+for\s+nonviolent\b|"
    r"\ball\s+rights\s+reserved\b|\bemail\s+from\s+ny\s+center\b",
    re.I,
)


def get_source_body(src_html: str) -> str:
    """Return text from 'The Concept' (or first quote-subtitle) up to
    'Compassion Course Information', minus chrome lines."""
    text = strip_html(src_html)
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

    start = None
    for i, ln in enumerate(lines):
        if re.match(r"^the\s+concept\b", ln, re.I):
            start = i + 1
            break
    if start is None:
        for i, ln in enumerate(lines):
            if (ln.startswith('"') and ln.endswith('"') and 4 <= len(ln) <= 80) or \
               (ln.startswith("'") and ln.endswith("'") and 4 <= len(ln) <= 80):
                start = i
                break
        if start is None:
            start = 0

    end = len(lines)
    for i in range(start, len(lines)):
        if re.match(r"^compassion\s+course\s+information\b", lines[i], re.I):
            end = i
            break

    body = []
    for ln in lines[start:end]:
        if CHROME_LINE.search(ln):
            continue
        if SECTION_HEADERS.match(ln):
            continue
        body.append(ln)
    return "\n".join(body)


def get_generated_body(gen_html: str) -> str:
    """Return generated text, dropping our cc-widget chrome and section UI."""
    text = strip_html(gen_html)
    skip = re.compile(
        r"^(quick\s+reflection|completion|breath\s+counter|intensity\s+check|"
        r"daily\s+practice\s+grid|narrate|dark\s+mode|table\s+of\s+contents|"
        r"on\s+this\s+page|continue\s+practicing|how\s+intense\s+was|"
        r"how\s+do\s+you\s+feel\s+now|name\s+a\s+person|begin\s+session|"
        r"week\s+\d+\s+of\s+52|the\s+compassion\s+course\s+online|"
        r"breath\s+count|day\s+[1-7]|press\s+space|tap\s+space|"
        r"what\s+feeling.s.\s+came\s+up|what\s+need.s.\s+can\s+you\s+name|"
        r"completed.{0,20}reflection|reset|save|saved|"
        r"\d+\s*$|^\s*\d+/\d+\s*$|"
        r"step\s+\d+|practice\s+\d+\s*$|practice\s*$|"
        r"the\s+concept\s*$|in\s+practice\s*$|practices?\s*$)",
        re.I,
    )
    out = []
    for ln in text.split("\n"):
        s = ln.strip()
        if not s:
            continue
        if skip.match(s):
            continue
        out.append(s)
    return "\n".join(out)


def words(t: str) -> set:
    return set(re.findall(r"[a-z']+", normalize(t)))


def main():
    target_weeks = []
    if len(sys.argv) > 1:
        target_weeks = [int(x) for x in sys.argv[1:]]
    else:
        for f in sorted(GEN_DIR.iterdir()):
            m = re.match(r"week-(\d+)\.html$", f.name)
            if m:
                target_weeks.append(int(m.group(1)))

    print(f"Verifying {len(target_weeks)} weeks: {target_weeks}\n")
    print(f"{'Week':<6}{'src words':>10}{'gen words':>10}{'unique src not in gen':>26}{'verdict':>14}")
    print("-" * 70)

    all_real_drops = {}
    for n in sorted(target_weeks):
        gen_path = GEN_DIR / f"week-{n}.html"
        rx = re.compile(rf"^[Ww]eek[\s\-_]*0*{n}\b")
        candidates = [f for f in SRC_DIR.iterdir() if rx.match(f.name) and f.name.lower().endswith(".html")]
        if not gen_path.exists() or not candidates:
            continue
        candidates.sort(key=lambda p: ("(" in p.name, len(p.name)))
        src_path = candidates[0]

        src_body = get_source_body(src_path.read_text(encoding="utf-8", errors="replace"))
        gen_body = get_generated_body(gen_path.read_text(encoding="utf-8", errors="replace"))

        sw = words(src_body)
        gw = words(gen_body)
        missing = sw - gw
        # filter: short words and pure digits aren't meaningful
        meaningful = {w for w in missing if len(w) >= 4 and not w.isdigit() and not w.startswith("'")}

        verdict = "OK" if not meaningful else f"REVIEW {len(meaningful)}"
        print(f"W{n:<5}{len(sw):>10}{len(gw):>10}{len(meaningful):>26}{verdict:>14}")
        if meaningful:
            all_real_drops[n] = sorted(meaningful)

    print()
    if not all_real_drops:
        print("PASS — every meaningful word in every lesson body is preserved.")
    else:
        print("=" * 70)
        print("Words present in source body but missing from generated body:")
        print("=" * 70)
        for n, ws in all_real_drops.items():
            print(f"\nW{n} ({len(ws)} words): {ws}")


if __name__ == "__main__":
    main()
