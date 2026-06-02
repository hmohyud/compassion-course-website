#!/usr/bin/env python3
"""
Re-attach the legitimate content links that the build-lessons.py script
stripped out when it converted the source emails to plain-text-then-HTML.

Strategy: extract (anchor_text, url) pairs from each source HTML in the
order they appear; for each one, find the FIRST occurrence of that text
in the generated lesson that is NOT already inside an <a> tag, and wrap
it. Order-walk handles texts that repeat (e.g. multiple "CLICK HERE"s).
"""

import os
import re
import sys
import io
import html as htmllib

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SRC_DIR = ".local-incoming/2026-weeks-html"
GEN_DIR = ".local-built-lessons"

JUNK_HOSTS = (
    "constantcontact.com", "twitter.com", "facebook.com", "instagram.com",
    "linkedin.com", "youtube.com", "youtu.be", "vimeo.com", "tinyurl",
    "imgssl", "ctctcdn", "letters/images", "shorturl", "lttr.ai",
    "buy.constantcontact", "ccmember.constantcontact", "myaccount.constantcontact",
)
JUNK_TEXT_RX = re.compile(
    r"^view as webpage$|^unsubscribe$|^update profile$|^email marketing|"
    r"^try email marketing|^by |^constant contact|^safe sender|"
    r"^privacy policy|^trusted email",
    re.I,
)


def extract_links(src_html):
    """Yield (anchor_text, url) for non-junk anchors, in source order."""
    end = src_html.lower().find("compassion course information")
    if end > 0:
        src_html = src_html[:end]
    for m in re.finditer(r"<a\s+[^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)</a>", src_html, re.I):
        url = m.group(1).strip()
        text = re.sub(r"<[^>]+>", "", m.group(2))
        text = htmllib.unescape(re.sub(r"\s+", " ", text)).strip()
        if not text or len(text) < 2:
            continue
        if any(j in url.lower() for j in JUNK_HOSTS):
            continue
        if url.startswith(("mailto:", "#")):
            continue
        if JUNK_TEXT_RX.search(text):
            continue
        if re.search(r"\.(jpg|jpeg|png|gif|svg|webp)$", url, re.I):
            continue
        # Resolve r20.rs6.net redirect-style URLs by extracting the inner
        # u= parameter if present (Constant Contact tracking redirects).
        # Otherwise keep the redirect URL as-is.
        yield (text, url)


def walk_html_text(gen_html, callback):
    """Walk gen_html, calling callback(text_chunk, in_link) for each
    text run and skipping <a>...</a> blocks, <script>, <style>. Returns
    rebuilt HTML."""
    out = []
    i = 0
    n = len(gen_html)
    skip_block = re.compile(r"<(a|script|style)\b[^>]*>[\s\S]*?</\1>", re.I)
    tag = re.compile(r"<[^>]+>")
    while i < n:
        m = skip_block.search(gen_html, i)
        if not m:
            # process remaining
            tail = gen_html[i:]
            out.append(callback(tail))
            break
        head = gen_html[i:m.start()]
        out.append(callback(head))
        out.append(m.group(0))  # keep skipped block as-is
        i = m.end()
    return "".join(out)


def find_text_outside_tags(html_chunk, target):
    """Return (start, end) of first occurrence of `target` (case-insensitive)
    in html_chunk's plaintext, mapped back to char offsets in html_chunk.
    Returns None if not found."""
    target_norm = re.sub(r"\s+", " ", target).strip().lower()
    if not target_norm:
        return None
    # Build mapping: plaintext_index -> html_index
    plain_chars = []
    plain_to_html = []
    in_tag = False
    j = 0
    while j < len(html_chunk):
        c = html_chunk[j]
        if c == "<":
            in_tag = True
            j += 1
            continue
        if c == ">":
            in_tag = False
            j += 1
            continue
        if in_tag:
            j += 1
            continue
        plain_chars.append(c)
        plain_to_html.append(j)
        j += 1
    plain = "".join(plain_chars)
    plain_norm = re.sub(r"\s+", " ", plain).lower()
    # We need the index in plain (not plain_norm) — since norm collapses spaces
    # we walk plain looking for normalized match.
    # Fall back to a simpler: search in plain.lower() directly (won't collapse
    # whitespace) for a pattern that allows arbitrary whitespace.
    pat = re.compile(
        r"\s+".join(re.escape(w) for w in target_norm.split()),
        re.I,
    )
    pm = pat.search(plain)
    if not pm:
        return None
    start_html = plain_to_html[pm.start()]
    end_html = plain_to_html[pm.end() - 1] + 1
    return (start_html, end_html)


def relink_lesson(src_html, gen_html):
    """Return updated gen_html with source links re-attached."""
    links = list(dict.fromkeys(extract_links(src_html)))  # preserve order, dedupe identical pairs
    if not links:
        return gen_html, 0

    # Strategy: for each (text, url), find first occurrence in gen_html
    # outside any existing <a>, <script>, or <style> block. Wrap in place.
    # Track positions consumed so multiple identical anchors land in order.
    relinked = 0
    # We'll rebuild gen_html by walking it, processing region between
    # already-wrapped <a>/<script>/<style> blocks.
    cursor = 0  # absolute position in gen_html that we've consumed up to
    output = []
    skip_re = re.compile(r"<(a|script|style)\b[^>]*>[\s\S]*?</\1>", re.I)

    # Process links sequentially, advancing cursor each time
    for text, url in links:
        # Search starting at cursor
        # Find next "free" region (between skip blocks) and look for text in it
        pos = cursor
        found = None
        while pos < len(gen_html):
            sb = skip_re.search(gen_html, pos)
            free_end = sb.start() if sb else len(gen_html)
            free_chunk = gen_html[pos:free_end]
            local = find_text_outside_tags(free_chunk, text)
            if local:
                found = (pos + local[0], pos + local[1])
                break
            if not sb:
                break
            pos = sb.end()
        if not found:
            continue
        # Wrap found range
        s, e = found
        original = gen_html[s:e]
        wrapped = f'<a href="{url}" target="_blank" rel="noopener">{original}</a>'
        gen_html = gen_html[:s] + wrapped + gen_html[e:]
        cursor = s + len(wrapped)
        relinked += 1
    return gen_html, relinked


def main():
    weeks = []
    for f in sorted(os.listdir(GEN_DIR)):
        m = re.match(r"week-(\d+)\.html$", f)
        if m:
            weeks.append(int(m.group(1)))
    src_files = os.listdir(SRC_DIR)
    total = 0
    for n in sorted(weeks):
        src_match = [f for f in src_files if re.match(rf"^[Ww]eek[\s\-_]*0*{n}\b", f)]
        if not src_match:
            continue
        src_match.sort(key=lambda p: ("(" in p, len(p)))
        src_path = os.path.join(SRC_DIR, src_match[0])
        gen_path = os.path.join(GEN_DIR, f"week-{n}.html")
        src_html = open(src_path, encoding="utf-8", errors="replace").read()
        gen_html = open(gen_path, encoding="utf-8", errors="replace").read()
        new_gen, n_added = relink_lesson(src_html, gen_html)
        if n_added > 0:
            with open(gen_path, "w", encoding="utf-8") as fh:
                fh.write(new_gen)
            print(f"W{n:>2}: relinked {n_added}")
            total += n_added
    print(f"\nTotal: {total} links restored")


if __name__ == "__main__":
    main()
