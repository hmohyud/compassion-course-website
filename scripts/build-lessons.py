#!/usr/bin/env python3
"""
build-lessons.py — produce tailored interactive lesson HTML from a folder
of Constant-Contact email exports, then upload to Firebase Storage.

For each email in <SRC_DIR>:
  - Parse week number from filename.
  - Skip weeks already in PROTECTED_WEEKS (don't clobber existing originals).
  - Extract the cleaned lesson text and split into sections:
      The Concept / In Practice / Practice(s) for the Week
  - Wrap into the standard lesson-player HTML template (matches
    cc-weekly-emails/week_*.html — same styles.css/script.js, same
    accordion sections, dark mode, narrate buttons).
  - Add tailored interactive widgets per section (key-concept spans,
    insight boxes, dialogue containers when conversations are detected,
    journal areas on each practice).
  - Upload to Firebase Storage at weekly-html/week-{n}.html using the
    Firebase CLI's stored OAuth token (no service-account key needed).
  - Print "✓ W{n} done — {title}" on success.

Usage:
    python scripts/build-lessons.py <SRC_DIR> [--dry-run] [--only N,M,...]
"""

import os
import re
import sys
import json
import html as htmllib
import urllib.request
import urllib.parse
from pathlib import Path

PROJECT_ID = "compassion-course-websit-937d6"
STORAGE_BUCKET = "compassion-course-websit-937d6.firebasestorage.app"
PROTECTED_WEEKS = {1, 2, 3, 4, 10, 22}

FIREBASE_CLI_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com"
FIREBASE_CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi"


# ─── auth ────────────────────────────────────────────────────────────────────


def configstore_path():
    return Path.home() / ".config" / "configstore" / "firebase-tools.json"


def get_access_token():
    cfg = json.loads(configstore_path().read_text(encoding="utf-8"))
    t = cfg.get("tokens") or {}
    import time
    if t.get("access_token") and t.get("expires_at", 0) > (time.time() * 1000) + 60_000:
        return t["access_token"]
    body = urllib.parse.urlencode({
        "client_id": FIREBASE_CLI_CLIENT_ID,
        "client_secret": FIREBASE_CLI_CLIENT_SECRET,
        "refresh_token": t["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["access_token"]


def upload_html(token, storage_path, body_bytes):
    url = (
        f"https://storage.googleapis.com/upload/storage/v1/b/{urllib.parse.quote(STORAGE_BUCKET)}/o"
        f"?uploadType=media&name={urllib.parse.quote(storage_path)}"
    )
    req = urllib.request.Request(
        url,
        data=body_bytes,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "text/html",
        },
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def patch_firestore_title(token, week, title):
    """Update only the `title` field on weeklyContent/{week}."""
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/"
        f"weeklyContent/{week}?updateMask.fieldPaths=title"
    )
    body = json.dumps({"fields": {"title": {"stringValue": title}}}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


# ─── source parser ───────────────────────────────────────────────────────────

WEEK_NUM_RE = re.compile(r"[Ww]eek[\s\-_]*(\d{1,2})")


def week_number_from_filename(name):
    m = WEEK_NUM_RE.search(name)
    if not m:
        return None
    n = int(m.group(1))
    return n if 1 <= n <= 52 else None


def extract_title(html):
    """Prefer og:title, fall back to <title>; strip 'Week N:' + site suffix.
    Use double-quote-only attribute matching so titles containing
    apostrophes (Week 16 "Saying 'No' with Compassion", Week 24
    "Hearing 'NO' with Compassion") don't get truncated at the first '."""
    og = re.search(
        r'<meta[^>]*property="og:title"[^>]*content="([^"]+)"', html, re.I,
    ) or re.search(
        r'<meta[^>]*content="([^"]+)"[^>]*property="og:title"', html, re.I,
    )
    raw = og.group(1) if og else ""
    if not raw or re.match(r"email from ", raw, re.I):
        t = re.search(r"<title[^>]*>([\s\S]*?)</title>", html, re.I)
        if t:
            raw = t.group(1)
    raw = htmllib.unescape(re.sub(r"\s+", " ", raw)).strip()
    raw = re.sub(r"^Week\s+\d+:\s*", "", raw, flags=re.I)
    raw = re.sub(r"\s*[-–—]\s*(The\s+)?Compassion\s+Course\s+Online.*$", "", raw, flags=re.I)
    return raw


def cleaned_text(html):
    """Strip script/style/comments, then convert tags to newlines so the
    resulting plaintext preserves paragraph breaks. Decode entities."""
    s = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.I)
    s = re.sub(r"<style[\s\S]*?</style>", "", s, flags=re.I)
    s = re.sub(r"<!--[\s\S]*?-->", "", s)
    s = re.sub(r"<(br|p|div|td|tr|li|h[1-6])[^>]*/?>", "\n", s, flags=re.I)
    s = re.sub(r"</(p|div|td|tr|li|h[1-6])>", "\n", s, flags=re.I)
    # Inline tags (span, em, i, b, strong, a, font) collapse to empty so
    # adjacent text runs concatenate cleanly. Source emails sometimes
    # italicize a word's prefix (e.g. <i>un</i>met) — replacing the inline
    # tag with a space would split it into "un met". Block tags above
    # already became newlines, so any remaining tag here is inline-ish.
    s = re.sub(r"</?(span|em|i|b|strong|a|font|sub|sup|small|big|u|mark)\b[^>]*>", "", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = htmllib.unescape(s)
    # Normalize whitespace inside lines but keep newlines.
    out = []
    for ln in s.split("\n"):
        ln = re.sub(r"[ \t\u00a0]+", " ", ln).strip()
        if ln:
            out.append(ln)
    return "\n".join(out)


# Section markers in the cleaned text. Each lesson follows this order:
SECTION_MARKERS = [
    ("concept", re.compile(r"^The Concept$", re.I)),
    ("practice_story", re.compile(r"^In Practice$", re.I)),
    ("practices", re.compile(r"^Practice\(s\)\s+for\s+the\s+Week$", re.I)),
    ("info", re.compile(r"^Compassion Course Information$", re.I)),
]


def split_sections(text):
    """Return dict: { 'concept': str, 'practice_story': str, 'practices': str }.
    Slices between section anchors; the "Compassion Course Information"
    block is dropped (we render it from a static template).

    A few weeks (e.g. Week 29 "Self-Connection") omit the "The Concept"
    anchor and dive into the body directly. When that's the case we
    treat everything from the lesson subtitle (the quoted line) up to
    the next found section as the concept body.
    """
    lines = text.split("\n")

    indices = {}
    for i, ln in enumerate(lines):
        s = ln.strip()
        for key, rx in SECTION_MARKERS:
            if key in indices:
                continue
            if rx.match(s):
                indices[key] = i

    # Fallback: synthesise a "concept" start when the marker is missing.
    if "concept" not in indices:
        # Find the first quoted subtitle (e.g. `"Self-Connection"`) that
        # sits before any later section. Otherwise default to line 0.
        next_sec = min(
            (indices[k] for k in indices if k != "concept"),
            default=len(lines),
        )
        candidate = -1
        for i, ln in enumerate(lines[:next_sec]):
            s = ln.strip()
            if (s.startswith('"') and s.endswith('"') and 4 <= len(s) <= 80) or (s.startswith("'") and s.endswith("'") and 4 <= len(s) <= 80):
                candidate = i
                break
        # Use synthetic anchor at -1 so concept body starts at line 0
        # (or right after the title), and the renderer detects the
        # subtitle naturally.
        indices["concept"] = candidate if candidate >= 0 else -1

    out = {}
    keys_in_order = [k for k, _ in SECTION_MARKERS]
    for idx, key in enumerate(keys_in_order):
        if key not in indices:
            continue
        start = max(0, indices[key] + 1)
        end = len(lines)
        for j in range(idx + 1, len(keys_in_order)):
            nxt = keys_in_order[j]
            if nxt in indices:
                end = indices[nxt]
                break
        out[key] = "\n".join(lines[start:end]).strip()
    return out


def detect_in_practice_subtitle(section_text):
    """First non-empty line of in-practice is usually the story title in quotes."""
    for ln in section_text.split("\n"):
        ln = ln.strip().strip('"').strip("'")
        if ln:
            return ln
    return ""


def split_paragraphs(section_text):
    """In cleaned_text() each <p>/<div>/<br> already became a newline,
    so each non-empty line in section_text is its own paragraph. We
    also stitch back orphan-stub lines that were just a URL because
    Constant Contact splits "blah blah:\\nhttp://...\\n. Continued blah"
    across three lines."""
    raw = [ln.strip() for ln in section_text.split("\n") if ln.strip()]
    out = []
    i = 0
    while i < len(raw):
        cur = raw[i]
        # Stitch in a following line that's purely a URL or bare punctuation.
        while i + 1 < len(raw):
            nxt = raw[i + 1]
            if re.fullmatch(r"https?://\S+", nxt):
                cur = cur + " " + nxt
                i += 1
            elif len(nxt) <= 2:  # ". " or ":" alone
                cur = cur + nxt
                i += 1
            else:
                break
        out.append(cur)
        i += 1
    return out


# ─── HTML rendering ──────────────────────────────────────────────────────────


# ─── per-week visual theme ──────────────────────────────────────────────────

# Eight low-saturation palettes rotated through the year. Each lesson picks
# its theme from `WEEK_THEMES[(week_num - 1) % len(WEEK_THEMES)]`. We
# deliberately avoid neon — every hue should sit comfortably on the
# warm-cream lesson background and read as ground, not chrome.
WEEK_THEMES = [
    {  # 0 — teal / sage          (foundations)
        "name": "teal",
        "primary": "#2a7a6e",  "primary_dark": "#1f5c52",
        "accent":  "#b08a4a",  "tint":  "rgba(42,122,110,0.08)",
        "hero_a": "#1f5c52",   "hero_b": "#2a7a6e",
    },
    {  # 1 — warm amber           (warmth, story)
        "name": "amber",
        "primary": "#a16a2c",  "primary_dark": "#7a4f1d",
        "accent":  "#5a8a7a",  "tint":  "rgba(161,106,44,0.08)",
        "hero_a": "#7a4f1d",   "hero_b": "#a16a2c",
    },
    {  # 2 — slate blue           (clarity, observation)
        "name": "slate",
        "primary": "#456a85",  "primary_dark": "#324d61",
        "accent":  "#b08a4a",  "tint":  "rgba(69,106,133,0.08)",
        "hero_a": "#324d61",   "hero_b": "#456a85",
    },
    {  # 3 — dusty rose           (vulnerability, tenderness)
        "name": "rose",
        "primary": "#a06168",  "primary_dark": "#7a474d",
        "accent":  "#7a8a5a",  "tint":  "rgba(160,97,104,0.08)",
        "hero_a": "#7a474d",   "hero_b": "#a06168",
    },
    {  # 4 — forest green         (rooting, integration)
        "name": "forest",
        "primary": "#3f6a4a",  "primary_dark": "#2c4d35",
        "accent":  "#b08a4a",  "tint":  "rgba(63,106,74,0.08)",
        "hero_a": "#2c4d35",   "hero_b": "#3f6a4a",
    },
    {  # 5 — terracotta           (energy, action)
        "name": "terracotta",
        "primary": "#9a5638",  "primary_dark": "#724026",
        "accent":  "#5a8a7a",  "tint":  "rgba(154,86,56,0.08)",
        "hero_a": "#724026",   "hero_b": "#9a5638",
    },
    {  # 6 — gold ochre            (appreciation, celebration)
        "name": "gold",
        "primary": "#a8843e",  "primary_dark": "#7a5f2c",
        "accent":  "#456a85",  "tint":  "rgba(168,132,62,0.08)",
        "hero_a": "#7a5f2c",   "hero_b": "#a8843e",
    },
    {  # 7 — plum                  (depth, contemplation)
        "name": "plum",
        "primary": "#6e4870",  "primary_dark": "#4f3252",
        "accent":  "#b08a4a",  "tint":  "rgba(110,72,112,0.08)",
        "hero_a": "#4f3252",   "hero_b": "#6e4870",
    },
]


def theme_for_week(week_num):
    return WEEK_THEMES[(week_num - 1) % len(WEEK_THEMES)]


# ─── NVC vocabulary highlight ───────────────────────────────────────────────

# Words that carry NVC weight. We highlight ONLY the first occurrence per
# paragraph (so the page doesn't pulse) with a subtle dotted accent
# underline. Word boundaries respected so "needed" doesn't match "need".
NVC_VOCAB = [
    "feelings", "feeling", "needs", "need",
    "observation", "observations", "observe",
    "request", "requests", "judgment", "judgments", "judging",
    "compassion", "compassionate",
    "empathy", "empathic", "empathetic",
    "connection", "self-connection",
    "presence", "honesty",
]
_NVC_RX = re.compile(
    r"\b(" + "|".join(re.escape(w) for w in sorted(NVC_VOCAB, key=len, reverse=True)) + r")\b",
    re.I,
)


def highlight_nvc_in_html(html):
    """Wrap the first occurrence of any NVC vocab word per <p> / <li> in
    a span. Uses a flat regex over the inner text of each tag so we don't
    munge attributes or anchor href values."""
    def repl_block(m):
        opening, inner, closing = m.group(1), m.group(2), m.group(3)
        # Skip already-highlighted blocks (e.g. .key-concept span inside a <p>)
        if 'class="nvc-word"' in inner or 'class="key-concept"' in inner:
            return m.group(0)
        used = set()
        def repl_word(wm):
            w = wm.group(0)
            wl = w.lower()
            if wl in used:
                return w
            used.add(wl)
            return f'<span class="nvc-word" data-nvc="{wl}">{w}</span>'
        # Only replace text outside of nested HTML tags. Cheap approach:
        # split on tags, replace in text-only chunks.
        out = []
        for piece in re.split(r"(<[^>]+>)", inner):
            if piece.startswith("<"):
                out.append(piece)
            else:
                out.append(_NVC_RX.sub(repl_word, piece, count=4))  # at most 4 different words per block
        return opening + "".join(out) + closing
    return re.sub(r"(<(?:p|li)[^>]*>)([\s\S]*?)(</(?:p|li)>)", repl_block, html)


def linkify(text):
    """Convert bare URLs to anchor tags."""
    return re.sub(
        r"(https?://[\w\.\-/?#=&%+~:]+)",
        r'<a href="\1" target="_blank" rel="noopener">\1</a>',
        text,
    )


def html_escape_keep_links(s):
    """Escape <, >, & — but the linkify pass below produces real <a> tags
    that we want to preserve. So we apply minimal escaping first then linkify."""
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # un-escape the angles in our linkified anchor since they'll be re-introduced
    return s


def render_paragraph(p):
    p = html_escape_keep_links(p)
    p = linkify(p)
    return f"<p>{p}</p>"


def maybe_pull_quote(html_p):
    """If a `<p>...</p>` is short, single-sentence, and emphatic, upgrade
    to a styled pull-quote aside. Limits prevent every short paragraph
    from becoming one. Same text, different rendering."""
    m = re.match(r"^<p[^>]*>([\s\S]*?)</p>\s*$", html_p)
    if not m:
        return html_p
    inner = m.group(1)
    # Skip already-styled paragraphs (story-lede, key-concept).
    if 'class="story-lede"' in html_p or 'class="key-concept"' in inner:
        return html_p
    # Strip tags for length check
    plain = re.sub(r"<[^>]+>", "", inner).strip()
    words = plain.split()
    if not (5 <= len(words) <= 24):
        return html_p
    # Heuristics: single sentence ending strongly.
    if not re.search(r"[\.\!\?]['\"]?$", plain):
        return html_p
    if plain.count(".") + plain.count("!") + plain.count("?") > 1:
        return html_p
    # Looks emphatic when it has one of these signals
    emphatic_signals = (
        re.search(r"\b(I (knew|realized|saw|felt|noticed|wanted)|That's when|Suddenly|Of course|Because|And then)\b", plain, re.I),
        plain.startswith('"') and plain.endswith('"'),
        re.search(r"\b(everything|always|never|all of us|none of us|the truth|essence)\b", plain, re.I),
    )
    if not any(emphatic_signals):
        return html_p
    return f'<aside class="pull-quote">{inner}</aside>'


def is_dialogue_pair(p):
    """Heuristic: does this paragraph look like 'Speaker: ...' with multiple
    speakers? Used to render the In-Practice section as a dialogue when
    appropriate. Returns list of (speaker, text) or None."""
    # Look for lines starting with a short capitalized speaker name + colon.
    lines = [ln.strip() for ln in re.split(r"(?<=\.)\s+|\n", p) if ln.strip()]
    pairs = []
    for ln in lines:
        m = re.match(r"^([A-Z][A-Za-z]{1,12}):\s+(.+)$", ln)
        if m:
            pairs.append((m.group(1), m.group(2)))
    # Need at least 2 speaker turns and 2 distinct speakers.
    if len(pairs) >= 2 and len({s for s, _ in pairs}) >= 2:
        return pairs
    return None


def render_concept_section(text, week_subtitle=""):
    paragraphs = split_paragraphs(text)
    parts = []
    # The first non-empty paragraph is often the lesson subtitle in quotes
    # — render as <h3>.
    if paragraphs and paragraphs[0].startswith('"') and paragraphs[0].endswith('"') and len(paragraphs[0]) < 90:
        parts.append(f"<h3>{html_escape_keep_links(paragraphs[0])}</h3>")
        paragraphs = paragraphs[1:]
    elif week_subtitle:
        parts.append(f"<h3>{html_escape_keep_links(week_subtitle)}</h3>")
    # First substantive paragraph gets the soft key-concept callout — a
    # pull-quote band so the opening idea reads like the thesis of the
    # week. Pick the first paragraph >= 30 characters so we skip
    # micro-transitions ("Hi everyone.") but accept anything else.
    rendered = []
    callout_used = False
    for p in paragraphs:
        if not callout_used and len(p) >= 30:
            rendered.append(
                f'<p><span class="key-concept" data-concept="week-thesis">'
                f"{linkify(html_escape_keep_links(p))}</span></p>"
            )
            callout_used = True
        else:
            rendered.append(render_paragraph(p))
    return "\n            ".join(parts + rendered)


def render_in_practice_section(text, week_num):
    paragraphs = split_paragraphs(text)
    parts = []
    if paragraphs:
        first = paragraphs[0].strip().strip('"').strip("'")
        if first and len(first) < 80:
            # likely a story title (Constant Contact wraps it in quotes).
            # Render as a decorative <h3> with leading/trailing curly quote
            # marks added via CSS pseudo-elements.
            parts.append(f'<h3 class="story-title">{html_escape_keep_links(first)}</h3>')
            paragraphs = paragraphs[1:]

    # Detect a contiguous sequence of "First, ... Second, ... Third, ..."
    # or numbered step-style paragraphs and render them as step-cards.
    # Otherwise render as plain <p>.
    rendered = []
    i = 0
    while i < len(paragraphs):
        p = paragraphs[i]
        # Step-card sequence: paragraph starts with "Step N.", "1.", or
        # an explicit "First/Second/Third" sentence opener AND there are
        # at least two such consecutive paragraphs.
        m = re.match(r"^(?:Step\s+(\d+)\b|(\d+)\.\s|(First|Second|Third|Fourth|Fifth|Sixth|Seventh)\b[,\.\s])", p, re.I)
        if m:
            run = [p]
            j = i + 1
            while j < len(paragraphs):
                if re.match(r"^(?:Step\s+\d+\b|\d+\.\s|(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Then|Next|Finally)\b[,\.\s])", paragraphs[j], re.I):
                    run.append(paragraphs[j])
                    j += 1
                else:
                    break
            if len(run) >= 2:
                cards = []
                for idx, step in enumerate(run, 1):
                    body = step
                    # Strip "Step N." / "N." numeric prefixes (the badge already
                    # carries that), but PRESERVE word-prefixes like "First,"
                    # / "Second," / "Then," — they are part of Thom's actual
                    # phrasing and must not be rephrased.
                    body = re.sub(r"^(?:Step\s+\d+\b\.?\s*|\d+\.\s+)", "", body, flags=re.I)
                    # Try to grab the first sentence as the step title.
                    parts2 = re.split(r"(?<=[\.!])\s+", body, maxsplit=1)
                    title = parts2[0].rstrip(" .")
                    rest = parts2[1] if len(parts2) > 1 else ""
                    cards.append(
                        f"""<div class="step-card">
              <div class="step-num">{idx}</div>
              <div class="step-body">
                <h4>{html_escape_keep_links(title)}</h4>
                {('<p>' + linkify(html_escape_keep_links(rest)) + '</p>') if rest else ''}
              </div>
            </div>"""
                    )
                rendered.append('<div class="step-cards">' + "\n            ".join(cards) + "</div>")
                i = j
                continue

        rendered.append(render_paragraph(p))
        i += 1

    # Drop-cap on the FIRST narrative paragraph (after the story title).
    # Identify the first <p> in `rendered` and tag it. Pull-quote candidates
    # — short standalone emphatic lines — get a styled aside.
    if rendered:
        for k, html in enumerate(rendered):
            if html.startswith("<p>") and html.endswith("</p>"):
                rendered[k] = '<p class="story-lede">' + html[3:-4] + "</p>"
                break
    rendered = [maybe_pull_quote(h) for h in rendered]

    parts.extend(rendered)

    # Quick reflection widget at the bottom of the In-Practice section,
    # tying the story to the week's NVC frame: notice feelings + needs.
    parts.append(
        f"""<div class="cc-widget cc-reflect">
              <h5>Quick reflection</h5>
              <p class="cc-widget-hint">Take a moment with this story. What feelings and needs do you imagine were in play — for the people in it, and for you as you read?</p>
              <label>Feelings I noticed:
                <input type="text" class="cc-input" data-key="w{week_num}-reflect-feelings" placeholder="e.g. tender, frustrated, curious">
              </label>
              <label>Needs I imagine:
                <input type="text" class="cc-input" data-key="w{week_num}-reflect-needs" placeholder="e.g. connection, ease, to be seen">
              </label>
            </div>"""
    )

    return "\n            ".join(parts)


def pick_widget(title, body_text, n):
    """Choose a tailored interactive widget based on cues in the practice
    title/body. Returns HTML for a widget appropriate to the practice.
    Falls back to a tracking checklist + journal area."""

    title_l = title.lower()
    body_l = body_text.lower()

    # Recognise "keep a journal / make N entries per day" → daily-entry tracker.
    if re.search(r"keep a (small )?journal|entries per day|1 to 5 entries", body_l):
        return f"""
              <div class="cc-widget cc-tracker">
                <h5>Daily entries this week</h5>
                <p class="cc-widget-hint">Tick a day after you've recorded at least one observation. Notes save automatically.</p>
                <div class="cc-day-grid" data-key="practice-{n}-tracker">
                  <label><input type="checkbox" data-day="mon"> Mon</label>
                  <label><input type="checkbox" data-day="tue"> Tue</label>
                  <label><input type="checkbox" data-day="wed"> Wed</label>
                  <label><input type="checkbox" data-day="thu"> Thu</label>
                  <label><input type="checkbox" data-day="fri"> Fri</label>
                  <label><input type="checkbox" data-day="sat"> Sat</label>
                  <label><input type="checkbox" data-day="sun"> Sun</label>
                </div>
              </div>
              <textarea class="journal-area" id="journal-p{n}" placeholder="Today I noticed..."></textarea>
              <div class="journal-saved" id="journal-p{n}-saved"></div>"""

    # Anger / reactivity / triggers → simple before-after intensity slider.
    if any(k in title_l + body_l for k in ["anger", "trigger", "react", "intens"]):
        return f"""
              <div class="cc-widget cc-slider">
                <h5>Intensity check</h5>
                <p class="cc-widget-hint">Notice the moment you felt activated. Pull the slider to mark how charged it felt — then again after pausing for one slow breath.</p>
                <label>Before pause: <input type="range" min="0" max="10" data-key="practice-{n}-before"></label>
                <label>After pause: <input type="range" min="0" max="10" data-key="practice-{n}-after"></label>
              </div>
              <textarea class="journal-area" id="journal-p{n}" placeholder="What I noticed in the gap..."></textarea>
              <div class="journal-saved" id="journal-p{n}-saved"></div>"""

    # Breathing / centering / pause → breathing widget.
    if any(k in title_l + body_l for k in ["breath", "slow down", "centering", "pause"]):
        return f"""
              <div class="cc-widget cc-breath" data-key="practice-{n}-breath">
                <h5>Breathing check-in</h5>
                <p class="cc-widget-hint">Tap when you've completed one round of slow breaths today.</p>
                <button type="button" class="cc-breath-btn">+1 round</button>
                <span class="cc-breath-count">0 rounds</span>
              </div>
              <textarea class="journal-area" id="journal-p{n}" placeholder="What shifted while you breathed..."></textarea>
              <div class="journal-saved" id="journal-p{n}-saved"></div>"""

    # Empathy / connection / requests → person-prompt + journal.
    if any(k in title_l + body_l for k in ["empath", "connection", "request", "listen", "boundar"]):
        return f"""
              <div class="cc-widget cc-prompt">
                <h5>Pick a person</h5>
                <p class="cc-widget-hint">Bring this practice into one specific relationship this week.</p>
                <input type="text" class="cc-input" data-key="practice-{n}-person" placeholder="e.g. my sister, my coworker, the cashier...">
              </div>
              <textarea class="journal-area" id="journal-p{n}" placeholder="What I noticed about feelings & needs in our exchange..."></textarea>
              <div class="journal-saved" id="journal-p{n}-saved"></div>"""

    # Default: simple journal + completion checkbox.
    return f"""
              <label class="cc-done-row"><input type="checkbox" class="cc-done" data-key="practice-{n}-done"> I worked with this practice this week</label>
              <textarea class="journal-area" id="journal-p{n}" placeholder="Notes for this practice..."></textarea>
              <div class="journal-saved" id="journal-p{n}-saved"></div>"""


def infer_practice_tags(title, body):
    """Optional clarifying meta-tags for a practice card. The text of the
    practice itself is preserved verbatim — this only adds short
    descriptive labels above the body so cards differ visually based on
    the kind of practice (e.g. "Solo reflection · ~10 min" vs "With
    a partner · Ongoing"). Returns a list of 0–3 short strings.

    Heuristic-only; if signals conflict or are weak, returns []. Better
    to show no tag than a wrong one — every tag must be defensible
    purely from keywords in the source text."""
    t = (title + " " + body).lower()
    tags = []

    # ── kind ────────────────────────────────────────────────────────────
    if re.search(r"\bjournal(ing)?\b|\bmake.*entries\b|\bwrite (it )?(down|out)\b|\bnotebook\b|\b(track|record).*(daily|each day|every day)\b", t):
        tags.append("Journal")
    elif re.search(r"\bbuddy\b|\bpartner\b|\bwith (a|another) person\b|\bshare with someone\b", t):
        tags.append("With a partner")
    elif re.search(r"\bgroup\b|\bcommunity\b|\bjoin .* (group|forum|circle)\b", t):
        tags.append("Group")
    elif re.search(r"\bsay (this|to)|\btell (them|him|her)|\bexpress (this|yourself)|\bin conversation\b|\bconversation with\b", t):
        tags.append("In conversation")
    elif re.search(r"\bnotice\b|\bobserve\b|\bpay attention\b|\bbecome aware\b|\bwatch (for|how)\b", t):
        tags.append("Observation")
    elif re.search(r"\breflect\b|\bconsider\b|\bcontemplate\b|\bthink (about|back)\b|\brecall a time\b", t):
        tags.append("Solo reflection")

    # ── cadence ─────────────────────────────────────────────────────────
    if re.search(r"\b(every|each) day\b|\bdaily\b|\bonce a day\b|\b(throughout|all) (day|week)\b", t):
        tags.append("Daily this week")
    elif re.search(r"\bone[ -]time\b|\bonce\b|\bthis week\b.*\b(do|try)\b|\bset aside\b", t):
        # too many practices say "this week"; only tag if explicit
        if re.search(r"\bone[ -]time\b|\bonce\b|\bset aside\b", t):
            tags.append("One sitting")
    elif re.search(r"\bwhenever\b|\bany time\b|\bas needed\b|\bwhen you (notice|find|catch)\b", t):
        tags.append("Whenever it comes up")

    # cap at 2 tags to keep it visually quiet
    return tags[:2]


def render_practices_section(text):
    """Look for 'Practice #N - Title' or 'Practice #N' patterns and group
    each practice into a practice-card with a tailored widget + journal.

    Anything that appears BEFORE the first 'Practice #N' marker is treated
    as an intro paragraph (e.g. "Choose One or Two" in W11) and rendered
    above the cards — not as an unnamed Practice 1. Likewise, anything
    that arrives without a Practice marker at all (older weeks where the
    practices are described as one continuous block) renders as a single
    untitled card."""
    paragraphs = split_paragraphs(text)

    # Find where structured "Practice #N" content starts, if at all.
    first_marker = None
    for i, p in enumerate(paragraphs):
        if re.match(r"^Practice\s*#?\s*\d+\s*([-–—:].+)?$", p, re.I):
            first_marker = i
            break

    intro = paragraphs[:first_marker] if first_marker is not None else []
    rest  = paragraphs[first_marker:] if first_marker is not None else paragraphs

    intro_html = ""
    if intro:
        intro_html = "<div class=\"practices-intro\">" + \
            "".join(render_paragraph(p) for p in intro) + "</div>\n          "

    cards = []
    cur_title = None
    cur_body = []
    practice_num = 0

    def flush():
        nonlocal cur_title, cur_body, practice_num
        if cur_title is None and not cur_body:
            return
        practice_num += 1
        title = cur_title or f"Practice {practice_num}"
        body_html = "\n              ".join(render_paragraph(p) for p in cur_body)
        body_text = " ".join(cur_body)
        widget = pick_widget(title, body_text, practice_num)
        # Soft accent rotation gives consecutive cards a different tint
        # without using strong colour. 4 hues, cycle by (practice_num-1).
        accent = (practice_num - 1) % 4
        # Optional clarifying tags — only render row if any survived heuristics.
        tags = infer_practice_tags(title, body_text)
        tags_html = ""
        if tags:
            pills = "".join(f'<span class="practice-tag">{html_escape_keep_links(t)}</span>' for t in tags)
            tags_html = f'<div class="practice-tags">{pills}</div>\n              '
        cards.append(
            f"""<div class="practice-card" data-accent="{accent}">
            <h4><span class="practice-number">{practice_num}</span> {html_escape_keep_links(title)}</h4>
              {tags_html}{body_html}{widget}
            </div>"""
        )
        cur_title = None
        cur_body = []

    for p in rest:
        m = re.match(r"^Practice\s*#?\s*(\d+)\s*[-–—:]\s*(.+)$", p, re.I)
        m2 = re.match(r"^Practice\s*#?\s*(\d+)\s*$", p, re.I)
        if m:
            flush()
            cur_title = m.group(2).strip()
        elif m2:
            flush()
            cur_title = None
        else:
            cur_body.append(p)
    flush()

    if not cards:
        # No structured practices — render all paragraphs (including any
        # we'd labelled as intro) inside one untitled card.
        body_html = "".join(render_paragraph(p) for p in paragraphs)
        cards.append(f'<div class="practice-card">{body_html}</div>')
        return "\n          ".join(cards)

    return intro_html + "\n          ".join(cards)


# Static "Course Information" + "Resources" — copied from existing weeks for consistency.
INFO_SECTION_HTML = """<h3>Monthly Conferences</h3>
          <p>On the second Monday of each month at 12:00 noon (US – EDT), Thom hosts a 90-minute Zoom conference to provide depth and clarity. He reviews previous weeks' messages and answers questions.</p>
          <p>All conferences are recorded and posted on the Global Compassion Network.</p>

          <h3>Weekly Message Schedule</h3>
          <p>Every Wednesday a new message is published via the Member Portal and email. The course runs for an entire year, ending in June 2027.</p>

          <h3>The Compassion Course's Global Compassion Network</h3>
          <p>Join the Global Compassion Network (GCN) so you can:</p>
          <ul>
            <li>Create and customize your own profile</li>
            <li>See the profiles of others in the course from around the globe</li>
            <li>Follow the Course Calendar of Events</li>
            <li>Find empathy support, trainings and events</li>
            <li>Join or start your own Practice Group</li>
            <li>Find Practice Partners and Empathy Buddies</li>
            <li>Join Community Forums and Chat Rooms</li>
          </ul>

          <h3>Questions</h3>
          <p>Specific content questions are answered in the conference calls.</p>
          <p>If you have questions or need assistance with something else, please call (646) 201-9226 or email <a href="mailto:coursecoordinator@nycnvc.org">coursecoordinator@nycnvc.org</a>.</p>"""

RESOURCES_SECTION_HTML = """<div class="resource-grid">
            <a href="http://www.nycnvc.org/needs/" target="_blank" rel="noopener" class="resource-link">
              <span class="resource-icon">🌐</span>
              <span class="resource-text">Online Needs List</span>
            </a>
            <a href="http://www.nycnvc.org/feelings/" target="_blank" rel="noopener" class="resource-link">
              <span class="resource-icon">🌐</span>
              <span class="resource-text">Online Feelings List</span>
            </a>
            <a href="http://www.theexercise.org" target="_blank" rel="noopener" class="resource-link">
              <span class="resource-icon">🧘</span>
              <span class="resource-text">The Exercise — Shifting Toward Compassion</span>
            </a>
            <a href="http://thombond.com" target="_blank" rel="noopener" class="resource-link">
              <span class="resource-icon">📚</span>
              <span class="resource-text">Thom Bond — Resources</span>
            </a>
          </div>"""


PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Week {week}: {title} — Compassion Course Online 2026</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
  <style>
    body[data-week="{week}"] {{
      --wk-primary: {theme_primary};
      --wk-primary-dark: {theme_primary_dark};
      --wk-accent: {theme_accent};
      --wk-tint: {theme_tint};
      --wk-hero-a: {theme_hero_a};
      --wk-hero-b: {theme_hero_b};
    }}
    body[data-week="{week}"] .hero {{
      background: linear-gradient(135deg, var(--wk-hero-a), var(--wk-hero-b));
    }}
    body[data-week="{week}"] .hero-week-label {{
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.28);
    }}
    body[data-week="{week}"] .key-concept {{
      background: var(--wk-tint);
      border-left: 3px solid var(--wk-primary);
      padding: 12px 16px;
      display: block;
      border-radius: 0 8px 8px 0;
      font-size: 1.05rem;
      line-height: 1.6;
    }}
    body[data-week="{week}"] .story-title {{
      position: relative;
      font-style: italic;
      font-family: 'Playfair Display', Georgia, serif;
      color: var(--wk-primary-dark);
      padding: 0 1.6em;
      text-align: center;
      margin: 1rem 0 1.4rem;
    }}
    body[data-week="{week}"] .story-title::before,
    body[data-week="{week}"] .story-title::after {{
      content: '\\201C';
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2.4em;
      color: var(--wk-accent);
      opacity: 0.5;
      position: absolute;
      line-height: 0.8;
      top: 0.1em;
    }}
    body[data-week="{week}"] .story-title::before {{ content: '\\201C'; left: 0; }}
    body[data-week="{week}"] .story-title::after  {{ content: '\\201D'; right: 0; }}
    body[data-week="{week}"] .story-lede::first-letter {{
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 3.6em;
      line-height: 0.9;
      float: left;
      padding: 0.04em 0.08em 0 0;
      color: var(--wk-primary);
      font-weight: 700;
    }}
    body[data-week="{week}"] .pull-quote {{
      margin: 1.6rem 0;
      padding: 0.6rem 1rem 0.6rem 1.4rem;
      border-left: 3px solid var(--wk-accent);
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-size: 1.18rem;
      line-height: 1.55;
      color: var(--wk-primary-dark);
      letter-spacing: 0.005em;
    }}
    body.dark-mode[data-week="{week}"] .pull-quote {{
      color: #f3e9d2;
    }}
    body[data-week="{week}"] .nvc-word {{
      border-bottom: 1px dotted var(--wk-accent);
      padding-bottom: 1px;
    }}
    body[data-week="{week}"] .practices-intro {{
      border-left-color: var(--wk-primary);
      background: var(--wk-tint);
    }}
  </style>
</head>
<body data-week="{week}" data-theme="{theme_name}">

  <div id="progress-bar"></div>

  <nav class="top-nav">
    <div class="nav-inner">
      <a href="index.html" class="nav-back">&larr; All Weeks</a>
      <a href="index.html" class="nav-brand">Compassion Course Online</a>
      <div class="nav-controls">
        <div id="google_translate_element" class="nav-translate notranslate" translate="no"></div>
        <button id="dark-mode-toggle" title="Toggle dark mode">Dark</button>
      </div>
    </div>
  </nav>

  <header class="hero">
    <div class="hero-content">
      <span class="hero-week-label">Week {week}</span>
      <h1>{title}</h1>
      <p class="hero-instructor">
        With <a href="http://thombond.com" target="_blank" rel="noopener">Thom Bond</a> &mdash;
        Founder &amp; Director of Education, <a href="http://nycnvc.org" target="_blank" rel="noopener">NYCNVC</a>
      </p>
    </div>
  </header>

  <main class="main-content">

    <div class="toc">
      <div class="toc-header">
        <h2>In This Week</h2>
        <div class="toc-actions">
          <button class="toc-btn" id="expand-collapse-all">Expand All</button>
          <button class="toc-btn" onclick="window.print()">Print</button>
        </div>
      </div>
      <ul class="toc-list">
        <li><a href="#concept">The Concept</a></li>
        <li><a href="#in-practice">In Practice</a></li>
        <li><a href="#practices">Practices for the Week</a></li>
        <li><a href="#info">Course Information</a></li>
        <li><a href="#resources">Resources</a></li>
      </ul>
    </div>

    <section class="section-card" id="concept">
      <button class="accordion-header" aria-expanded="true">
        <h2><span class="section-icon concept"></span> The Concept</h2>
        <span class="accordion-chevron">▼</span>
      </button>
      <div class="accordion-body">
        <div class="accordion-content">
            {concept_html}
        </div>
      </div>
    </section>

    <section class="section-card" id="in-practice">
      <button class="accordion-header" aria-expanded="true">
        <h2><span class="section-icon practice-story"></span> In Practice</h2>
        <span class="accordion-chevron">▼</span>
      </button>
      <div class="accordion-body">
        <div class="accordion-content">
            {in_practice_html}
        </div>
      </div>
    </section>

    <section class="section-card" id="practices">
      <button class="accordion-header" aria-expanded="true">
        <h2><span class="section-icon exercises"></span> Practice(s) for the Week</h2>
        <span class="accordion-chevron">▼</span>
      </button>
      <div class="accordion-body">
        <div class="accordion-content">
          {practices_html}
        </div>
      </div>
    </section>

    <section class="section-card" id="info">
      <button class="accordion-header" aria-expanded="true">
        <h2><span class="section-icon resources"></span> Compassion Course Information</h2>
        <span class="accordion-chevron">▼</span>
      </button>
      <div class="accordion-body">
        <div class="accordion-content">
          {info_html}
        </div>
      </div>
    </section>

    <section class="section-card" id="resources">
      <button class="accordion-header" aria-expanded="true">
        <h2><span class="section-icon resources"></span> Resources</h2>
        <span class="accordion-chevron">▼</span>
      </button>
      <div class="accordion-body">
        <div class="accordion-content">
          {resources_html}
        </div>
      </div>
    </section>

  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-nav">
        <a href="https://www.compassioncourse.org" target="_blank" rel="noopener">Compassion Course</a>
        <a href="http://nycnvc.org" target="_blank" rel="noopener">NYCNVC</a>
        <a href="https://www.theglobalcompassionnetwork.com" target="_blank" rel="noopener">Global Compassion Network</a>
      </div>
      <p class="footer-meta">
        &copy; Copyright Thom Bond 2026 &mdash; NY Center for Nonviolent Communication<br>
        Gardnertown Road | Newburgh, NY 12550 US<br>
        <a href="mailto:coursecoordinator@nycnvc.org">coursecoordinator@nycnvc.org</a> &middot; (646) 201-9226
      </p>
    </div>
  </footer>

  <button id="back-to-top" title="Back to top">&uarr;</button>

  <script src="auth-config.js"></script>
  <script src="script.js"></script>

  <!-- Tailored practice widgets — checklists, breath counters, sliders.
       Self-contained so we don't risk regressing the existing lesson-
       player styles. State persists in localStorage keyed per lesson. -->
  <style>
    .cc-widget {{
      background: rgba(0, 0, 0, 0.025);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      padding: 14px 16px;
      margin: 14px 0 10px;
    }}
    body.dark-mode .cc-widget {{
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.12);
    }}
    .cc-widget h5 {{
      margin: 0 0 6px;
      font-size: 0.95rem;
      letter-spacing: 0.01em;
    }}
    .cc-widget-hint {{
      font-size: 0.85rem;
      opacity: 0.78;
      margin: 0 0 10px;
    }}
    .cc-day-grid {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px 16px;
    }}
    .cc-day-grid label {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.92rem;
      cursor: pointer;
    }}
    .cc-day-grid input {{ accent-color: var(--clr-primary, #2a7a6e); }}
    .cc-slider label {{
      display: block;
      font-size: 0.9rem;
      margin: 6px 0;
    }}
    .cc-slider input[type="range"] {{
      width: 100%;
      max-width: 360px;
      vertical-align: middle;
      margin-left: 8px;
    }}
    .cc-breath {{
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }}
    .cc-breath-btn {{
      background: var(--clr-primary, #2a7a6e);
      color: #fff;
      border: 0;
      border-radius: 999px;
      padding: 8px 18px;
      cursor: pointer;
      font-weight: 600;
    }}
    .cc-breath-btn:hover {{ filter: brightness(1.05); }}
    .cc-breath-count {{ font-size: 0.9rem; opacity: 0.8; }}
    .cc-input {{
      width: 100%;
      max-width: 420px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      font: inherit;
    }}
    body.dark-mode .cc-input {{
      background: rgba(255,255,255,0.06);
      color: inherit;
      border-color: rgba(255, 255, 255, 0.18);
    }}
    .cc-done-row {{
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0 12px;
      font-size: 0.95rem;
    }}
    .practices-intro {{
      font-size: 0.95rem;
      opacity: 0.85;
      margin: 0 0 18px;
      padding: 10px 14px;
      border-left: 3px solid var(--clr-primary, #2a7a6e);
      background: rgba(0, 0, 0, 0.025);
      border-radius: 0 8px 8px 0;
    }}
    body.dark-mode .practices-intro {{
      background: rgba(255, 255, 255, 0.04);
    }}
    .practices-intro p {{ margin: 0; }}
    .practice-tags {{
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: -4px 0 10px;
    }}
    .practice-tag {{
      display: inline-block;
      font-size: 0.78rem;
      letter-spacing: 0.02em;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.08);
      color: inherit;
      opacity: 0.85;
    }}
    body.dark-mode .practice-tag {{
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.12);
    }}
    /* Soft, low-contrast accent rotation so consecutive practice cards
       feel distinct without making the page loud. 4 hues, all desaturated. */
    .practice-card[data-accent="0"] {{ border-left: 3px solid #2a7a6e; }}  /* teal  */
    .practice-card[data-accent="1"] {{ border-left: 3px solid #b08a4a; }}  /* gold  */
    .practice-card[data-accent="2"] {{ border-left: 3px solid #6a8da3; }}  /* slate */
    .practice-card[data-accent="3"] {{ border-left: 3px solid #b06b5a; }}  /* rose  */
  </style>
  <script>
    (function () {{
      var WEEK = document.body.getAttribute('data-week') || 'x';
      var KEY_PREFIX = 'cco-w' + WEEK + '-';
      function load(k) {{ try {{ return localStorage.getItem(KEY_PREFIX + k); }} catch (e) {{ return null; }} }}
      function save(k, v) {{ try {{ localStorage.setItem(KEY_PREFIX + k, v); }} catch (e) {{}} }}

      // Restore + persist all data-key checkboxes / inputs / ranges.
      function bindKeyed(el, getter, setter, evt) {{
        var k = el.getAttribute('data-key') || (el.parentElement && el.parentElement.getAttribute('data-key'));
        if (!k) return;
        // For day-grid checkboxes, scope by the day.
        if (el.dataset.day) k = k + ':' + el.dataset.day;
        var saved = load(k);
        if (saved !== null) setter(el, saved);
        el.addEventListener(evt, function () {{ save(k, getter(el)); }});
      }}

      document.querySelectorAll('.cc-day-grid input[type="checkbox"]').forEach(function (el) {{
        bindKeyed(
          el,
          function (e) {{ return e.checked ? '1' : '0'; }},
          function (e, v) {{ e.checked = v === '1'; }},
          'change'
        );
      }});

      document.querySelectorAll('.cc-slider input[type="range"]').forEach(function (el) {{
        bindKeyed(
          el,
          function (e) {{ return e.value; }},
          function (e, v) {{ e.value = v; }},
          'input'
        );
      }});

      document.querySelectorAll('.cc-input').forEach(function (el) {{
        bindKeyed(
          el,
          function (e) {{ return e.value; }},
          function (e, v) {{ e.value = v; }},
          'input'
        );
      }});

      document.querySelectorAll('.cc-done').forEach(function (el) {{
        bindKeyed(
          el,
          function (e) {{ return e.checked ? '1' : '0'; }},
          function (e, v) {{ e.checked = v === '1'; }},
          'change'
        );
      }});

      // Breath counter — click increments, persists.
      document.querySelectorAll('.cc-breath').forEach(function (root) {{
        var key = root.getAttribute('data-key');
        var btn = root.querySelector('.cc-breath-btn');
        var lbl = root.querySelector('.cc-breath-count');
        var n = parseInt(load(key) || '0', 10);
        function paint() {{ lbl.textContent = n + (n === 1 ? ' round' : ' rounds'); }}
        paint();
        btn.addEventListener('click', function () {{ n += 1; save(key, String(n)); paint(); }});
      }});
    }})();
  </script>
</body>
</html>
"""


def build_lesson_html(week, title, source_path):
    raw = source_path.read_text(encoding="utf-8", errors="ignore")
    text = cleaned_text(raw)
    sections = split_sections(text)
    concept_html = render_concept_section(sections.get("concept", ""))
    in_practice_html = render_in_practice_section(sections.get("practice_story", ""), week)
    practices_html = render_practices_section(sections.get("practices", ""))

    # Layered styling pass: NVC vocab gets a subtle accent on first occurrence
    # per <p>/<li>. We run on the rendered HTML (post-template fragments)
    # so the regex sees real <p> blocks. Skipped on practices section to
    # avoid pulse on the long enumerated cards.
    concept_html = highlight_nvc_in_html(concept_html)
    in_practice_html = highlight_nvc_in_html(in_practice_html)

    theme = theme_for_week(week)
    return PAGE_TEMPLATE.format(
        week=week,
        title=html_escape_keep_links(title),
        concept_html=concept_html or "<p><em>Lesson content coming soon.</em></p>",
        in_practice_html=in_practice_html or "<p><em>Story coming soon.</em></p>",
        practices_html=practices_html or "<p><em>Practices coming soon.</em></p>",
        info_html=INFO_SECTION_HTML,
        resources_html=RESOURCES_SECTION_HTML,
        theme_name=theme["name"],
        theme_primary=theme["primary"],
        theme_primary_dark=theme["primary_dark"],
        theme_accent=theme["accent"],
        theme_tint=theme["tint"],
        theme_hero_a=theme["hero_a"],
        theme_hero_b=theme["hero_b"],
    )


# ─── main ────────────────────────────────────────────────────────────────────


def parse_args(argv):
    src = None
    dry = False
    only = None
    for a in argv[1:]:
        if a == "--dry-run":
            dry = True
        elif a.startswith("--only="):
            only = {int(x) for x in a.split("=", 1)[1].split(",") if x.strip()}
        elif not a.startswith("--"):
            src = a
    return src, dry, only


def pick_files(src_dir):
    """Return dict {week_num: Path}, preferring non-duplicate filenames."""
    files = list(Path(src_dir).iterdir())
    by_week = {}
    for f in files:
        if not f.is_file() or f.suffix.lower() != ".html":
            continue
        n = week_number_from_filename(f.name)
        if n is None:
            continue
        cur = by_week.get(n)
        if cur is None:
            by_week[n] = f
        else:
            # Prefer the file whose name doesn't end "(N).html"
            cur_dupe = bool(re.search(r"\(\d+\)\.html$", cur.name, re.I))
            new_dupe = bool(re.search(r"\(\d+\)\.html$", f.name, re.I))
            if cur_dupe and not new_dupe:
                by_week[n] = f
    return by_week


def main():
    src, dry, only = parse_args(sys.argv)
    if not src or not Path(src).is_dir():
        print("Usage: python scripts/build-lessons.py <SRC_DIR> [--dry-run] [--only=N,M,...]")
        sys.exit(1)

    by_week = pick_files(src)
    weeks = sorted(by_week.keys())
    if only:
        weeks = [n for n in weeks if n in only]

    out_dir = Path("./.local-built-lessons")
    out_dir.mkdir(exist_ok=True)

    token = None
    if not dry:
        token = get_access_token()

    for n in weeks:
        if n in PROTECTED_WEEKS:
            print(f"  skip W{n:>2} — protected (existing original)")
            continue

        f = by_week[n]
        try:
            raw = f.read_text(encoding="utf-8", errors="ignore")
            title = extract_title(raw)
            body = build_lesson_html(n, title or f"Week {n}", f)
            local_out = out_dir / f"week-{n}.html"
            local_out.write_text(body, encoding="utf-8")

            if dry:
                print(f"  W{n:>2} -- would upload ({len(body):,} bytes) -- '{title}'")
            else:
                upload_html(token, f"weekly-html/week-{n}.html", body.encode("utf-8"))
                # Sync the Firestore title so the library card matches.
                try:
                    patch_firestore_title(token, n, title)
                except Exception as e:
                    print(f"     (warn: title sync failed for W{n}: {e})", flush=True)
                print(f"  [ok] W{n:>2} done -- {title}")
                sys.stdout.flush()
        except Exception as e:
            print(f"  [FAIL] W{n:>2}: {e}", flush=True)


if __name__ == "__main__":
    main()
