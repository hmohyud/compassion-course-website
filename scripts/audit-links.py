#!/usr/bin/env python3
"""
Audit every source HTML for legitimate content links and find which ones
got stripped from the corresponding built lesson.

Filters out Constant-Contact chrome links: tracking, social media, image
URLs, anything to constantcontact.com, twitter, facebook, instagram,
youtube, vimeo, gif/jpg/png, mailto:.

For each surviving (anchor_text, url) pair:
  - Check if anchor_text appears in built lesson
  - Check if it's already wrapped in an <a href>
  - Report what's missing per week.
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
JUNK_TEXT_PATTERNS = (
    r"^view as webpage$", r"^unsubscribe$", r"^update profile$",
    r"^email marketing", r"^try email marketing", r"^by ", r"^constant contact",
    r"^safe sender", r"^privacy policy", r"^trusted email",
    r"^\s*$",
)
JUNK_TEXT_RX = re.compile("|".join(JUNK_TEXT_PATTERNS), re.I)


def extract_links(src_html):
    """Yield (anchor_text, url) for non-junk anchors in source body."""
    # Limit to lesson-body region (before "Compassion Course Information" footer)
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
        if url.startswith("mailto:"):
            continue
        if url.startswith("#"):
            continue
        if JUNK_TEXT_RX.search(text):
            continue
        # Filter image-only anchors
        if re.search(r"\.(jpg|jpeg|png|gif|svg|webp)$", url, re.I):
            continue
        yield (text, url)


def normalize_text(t):
    t = re.sub(r"\s+", " ", t).strip().lower()
    return t


def text_present_unlinked(gen_html, anchor_text):
    """Is anchor_text present in gen_html outside an existing <a> tag?"""
    norm_text = normalize_text(anchor_text)
    if not norm_text:
        return False
    # Strip all existing <a>...</a> blocks then search
    stripped = re.sub(r"<a\b[^>]*>[\s\S]*?</a>", "", gen_html, flags=re.I)
    norm_gen = normalize_text(re.sub(r"<[^>]+>", " ", stripped))
    return norm_text in norm_gen


def text_already_linked(gen_html, anchor_text):
    norm_text = normalize_text(anchor_text)
    for m in re.finditer(r"<a\s+[^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)</a>", gen_html, re.I):
        gtext = normalize_text(re.sub(r"<[^>]+>", "", m.group(2)))
        if norm_text == gtext or norm_text in gtext:
            return True
    return False


def main():
    files = sorted(os.listdir(GEN_DIR))
    weeks = []
    for f in files:
        m = re.match(r"week-(\d+)\.html$", f)
        if m:
            weeks.append(int(m.group(1)))

    src_files = os.listdir(SRC_DIR)
    total_missing = 0
    for n in sorted(weeks):
        # Find source file
        src_match = [f for f in src_files if re.match(rf"^[Ww]eek[\s\-_]*0*{n}\b", f)]
        if not src_match:
            continue
        src_match.sort(key=lambda p: ("(" in p, len(p)))
        src_path = os.path.join(SRC_DIR, src_match[0])
        gen_path = os.path.join(GEN_DIR, f"week-{n}.html")

        src_html = open(src_path, encoding="utf-8", errors="replace").read()
        gen_html = open(gen_path, encoding="utf-8", errors="replace").read()

        # Dedupe by (text, url)
        seen = set()
        missing = []
        for text, url in extract_links(src_html):
            key = (normalize_text(text), url)
            if key in seen:
                continue
            seen.add(key)
            if text_already_linked(gen_html, text):
                continue
            if text_present_unlinked(gen_html, text):
                missing.append((text, url))

        if missing:
            print(f"W{n:>2} ({len(missing)} missing):")
            for text, url in missing:
                disp = text if len(text) <= 60 else text[:57] + "..."
                print(f"   '{disp}' -> {url[:100]}")
            total_missing += len(missing)
            print()

    print(f"\nTOTAL: {total_missing} missing links across {len(weeks)} weeks")


if __name__ == "__main__":
    main()
