#!/usr/bin/env python3
"""
Verify that generated lesson HTML preserves all source lesson text verbatim.

For each generated week, extract:
  - source body text (Concept + In Practice + Practices sections only,
    skipping Constant Contact chrome — header logo, "View as Webpage",
    image alt text, footer boilerplate)
  - generated body text (same sections, stripped of our cc-widget chrome)

Compare 8-word n-grams. Print actual missing phrases so we can eyeball
whether they are real lesson content drops or stripped chrome artifacts.
"""

import os
import re
import sys
import io
import html as htmllib
from pathlib import Path

# windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / ".local-incoming" / "2026-weeks-html"
GEN_DIR = ROOT / ".local-built-lessons"


# ─── HTML → plain text ──────────────────────────────────────────────────────


def strip_html(html: str) -> str:
    """Drop scripts/styles/comments, convert block tags to newlines, decode entities."""
    h = re.sub(r"<!--[\s\S]*?-->", "", html)
    h = re.sub(r"<script[\s\S]*?</script>", "", h, flags=re.I)
    h = re.sub(r"<style[\s\S]*?</style>", "", h, flags=re.I)
    h = re.sub(r"<(?:p|div|tr|td|table|li|ul|ol|h[1-6]|br|section|article|header|footer|nav|aside|hr)\b[^>]*>", "\n", h, flags=re.I)
    h = re.sub(r"</(?:p|div|tr|td|table|li|ul|ol|h[1-6]|section|article|header|footer|nav|aside)>", "\n", h, flags=re.I)
    h = re.sub(r"<[^>]+>", "", h)
    h = htmllib.unescape(h)
    return h


def normalize_text(t: str) -> str:
    """Collapse whitespace, lowercase, strip quotes/punctuation for comparison."""
    t = t.lower()
    # smart quotes → straight
    t = t.replace("\u2018", "'").replace("\u2019", "'")
    t = t.replace("\u201c", '"').replace("\u201d", '"')
    t = t.replace("\u2013", "-").replace("\u2014", "-")
    t = re.sub(r"[^\w\s']", " ", t)  # drop punctuation but keep apostrophes
    t = re.sub(r"\s+", " ", t).strip()
    return t


def words_seq(t: str) -> list:
    return normalize_text(t).split()


# ─── source extraction (Constant Contact emails) ────────────────────────────

# Constant Contact chrome we should NOT count as lesson content:
CC_CHROME_PATTERNS = [
    r"\bview\s+as\s+webpage\b",
    r"\bclick\s+here\b",
    r"\bunsubscribe\b",
    r"\bemail\s+from\s+ny\s+center",
    r"\bnew\s+york\s+center\s+for\s+nonviolent\s+communication\b",
    r"\bcompassion\s+course\s+online\b",
    r"\bnycnvc\.org\b",
    r"\bconstant\s+contact\b",
    r"\bsent\s+by\b",
    r"\bpowered\s+by\b",
    r"\bprivacy\s+policy\b",
    r"\btry\s+email\s+marketing\b",
    r"\bemail\s+marketing\s+by\b",
    r"\bin\s+collaboration\s+with\b",
    r"\bcopyright\b",
    r"\ball\s+rights\s+reserved\b",
    r"\btrouble\s+viewing\b",
    r"\bplease\s+add\b",
    r"\baddress\s+book\b",
    r"\bsafe\s+sender\b",
    r"\bforward\s+to\s+a\s+friend\b",
    r"\bbrooklyn\b.*\bny\b",  # NYCNVC address
    r"\b347[\s.-]?563\b",  # phone number
]
CC_CHROME_RE = re.compile("|".join(CC_CHROME_PATTERNS), re.I)


SECTION_MARKERS = [
    ("concept", re.compile(r"^the\s+concept\b", re.I)),
    ("practice", re.compile(r"^in\s+practice\b", re.I)),
    ("practices", re.compile(r"^practices?\s+for\s+(this|the)\s+week\b", re.I)),
    ("info", re.compile(r"^compassion\s+course\s+information\b", re.I)),
]


def extract_source_lesson_text(src_html: str) -> str:
    """Pull Concept + In Practice + Practices body, skipping CC chrome."""
    text = strip_html(src_html)
    lines = [ln.strip() for ln in text.split("\n")]
    lines = [ln for ln in lines if ln]  # drop blanks

    # find section anchors
    indices = {}
    for i, ln in enumerate(lines):
        for key, rx in SECTION_MARKERS:
            if key in indices:
                continue
            if rx.match(ln):
                indices[key] = i

    # fallback for "concept"
    if "concept" not in indices:
        next_sec = min((indices[k] for k in indices if k != "concept"), default=len(lines))
        for i, ln in enumerate(lines[:next_sec]):
            if (ln.startswith('"') and ln.endswith('"') and 4 <= len(ln) <= 80) or \
               (ln.startswith("'") and ln.endswith("'") and 4 <= len(ln) <= 80):
                indices["concept"] = i
                break
        if "concept" not in indices:
            indices["concept"] = 0

    # gather lines for the three lesson sections
    cuts = sorted(indices.items(), key=lambda x: x[1])
    chunks = []
    for j, (key, start) in enumerate(cuts):
        if key == "info":
            continue  # CC chrome
        end = cuts[j + 1][1] if j + 1 < len(cuts) else len(lines)
        chunks.append("\n".join(lines[start:end]))
    body = "\n".join(chunks)

    # filter out CC chrome lines
    kept = []
    for ln in body.split("\n"):
        if CC_CHROME_RE.search(ln):
            continue
        kept.append(ln)
    return "\n".join(kept)


# ─── generated extraction (our lesson template) ─────────────────────────────


def extract_generated_lesson_text(gen_html: str) -> str:
    """Pull the data-section body content, dropping cc-widget chrome."""
    text = strip_html(gen_html)
    # Our generated chrome to skip:
    skip = re.compile(
        r"(quick\s+reflection|completion|breath\s+counter|intensity\s+check|"
        r"daily\s+practice\s+grid|narrate|dark\s+mode|table\s+of\s+contents|"
        r"on\s+this\s+page|continue\s+practicing|how\s+intense\s+was|"
        r"how\s+do\s+you\s+feel\s+now|name\s+a\s+person|begin\s+session|"
        r"week\s+\d+\s+of\s+52|the\s+compassion\s+course\s+online|"
        r"breath\s+count|day\s+[1-7]\b|cco-w\d+|aria-|tap\s+space|press\s+space)",
        re.I,
    )
    lines = []
    for ln in text.split("\n"):
        s = ln.strip()
        if not s:
            continue
        if skip.search(s):
            continue
        lines.append(s)
    return "\n".join(lines)


# ─── compare ────────────────────────────────────────────────────────────────


def find_missing_phrases(src_text: str, gen_text: str, n: int = 8):
    """Return list of n-gram phrases present in source but not in generated."""
    src_words = words_seq(src_text)
    gen_norm = normalize_text(gen_text)
    missing = []
    seen = set()
    for i in range(len(src_words) - n + 1):
        phrase = " ".join(src_words[i:i + n])
        if phrase in seen:
            continue
        seen.add(phrase)
        if phrase not in gen_norm:
            missing.append(phrase)
    return missing


def categorize(phrase: str) -> str:
    """Tag a phrase: chrome, image-alt, contact, or content."""
    if CC_CHROME_RE.search(phrase):
        return "chrome"
    if re.search(r"\bclick\s+here\b|\bjoin\s+our\b|\bsign\s+up\b|\bregister\b|\bvisit\s+(our|us)\b", phrase, re.I):
        return "chrome"
    if re.search(r"\bmiki\s+kashtan\b|\bthom\s+bond\b|\bnycnvc\b|\bglobal\s+compassion\s+network\b|\bgcn\b", phrase, re.I):
        return "byline"
    if re.search(r"\bjpg\b|\bpng\b|\bphoto\b|\bimage\b|\balt\b", phrase, re.I):
        return "image-alt"
    if re.search(r"\bbrooklyn\b|\b\d{5}\b|\bemail\b|\bphone\b|\baddress\b", phrase, re.I):
        return "contact"
    return "content"


# ─── per-week filename mapping ──────────────────────────────────────────────


def find_source_for_week(n: int) -> Path | None:
    rx = re.compile(rf"^[Ww]eek[\s\-_]*0*{n}\b")
    candidates = []
    for f in SRC_DIR.iterdir():
        if not f.name.lower().endswith(".html"):
            continue
        if rx.match(f.name):
            candidates.append(f)
    if not candidates:
        return None
    # prefer the file that is NOT a "(N).html" duplicate
    candidates.sort(key=lambda p: ("(" in p.name, len(p.name)))
    return candidates[0]


# ─── main ────────────────────────────────────────────────────────────────────


def main():
    target_weeks = []
    if len(sys.argv) > 1:
        target_weeks = [int(x) for x in sys.argv[1:]]
    else:
        for f in sorted(GEN_DIR.iterdir()):
            m = re.match(r"week-(\d+)\.html$", f.name)
            if m:
                target_weeks.append(int(m.group(1)))

    summary = []
    for n in sorted(target_weeks):
        gen_path = GEN_DIR / f"week-{n}.html"
        src_path = find_source_for_week(n)
        if not gen_path.exists() or not src_path:
            print(f"W{n:>2}: skipped (gen={gen_path.exists()}, src={bool(src_path)})")
            continue

        src_html = src_path.read_text(encoding="utf-8", errors="replace")
        gen_html = gen_path.read_text(encoding="utf-8", errors="replace")

        src_text = extract_source_lesson_text(src_html)
        gen_text = extract_generated_lesson_text(gen_html)

        src_w = len(words_seq(src_text))
        gen_w = len(words_seq(gen_text))

        missing = find_missing_phrases(src_text, gen_text, n=8)
        cats = {"chrome": 0, "byline": 0, "image-alt": 0, "contact": 0, "content": 0}
        content_phrases = []
        for p in missing:
            c = categorize(p)
            cats[c] += 1
            if c == "content":
                content_phrases.append(p)

        summary.append((n, src_w, gen_w, cats, content_phrases))
        flag = "OK" if cats["content"] == 0 else f"REVIEW {cats['content']}"
        print(f"W{n:>2}: src={src_w:>4}w gen={gen_w:>4}w  missing 8-grams: "
              f"chrome={cats['chrome']:>3} byline={cats['byline']:>2} "
              f"image-alt={cats['image-alt']:>2} contact={cats['contact']:>2} "
              f"content={cats['content']:>3}   [{flag}]")

    # Detail dump for any week with non-zero content drops
    print("\n" + "=" * 70)
    print("DETAILS — actual content phrases present in source but missing from generated:")
    print("=" * 70)
    flagged = [(n, ph) for n, _, _, _, ph in summary if ph]
    if not flagged:
        print("  None — every week's lesson body text is fully preserved.")
    else:
        for n, phrases in flagged:
            print(f"\nW{n} — {len(phrases)} content phrases not found:")
            for p in phrases[:30]:
                print(f"  · {p}")
            if len(phrases) > 30:
                print(f"  … and {len(phrases) - 30} more")


if __name__ == "__main__":
    main()
