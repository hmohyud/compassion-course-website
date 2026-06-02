#!/usr/bin/env python3
"""
Extract per-week practice content from the built lesson HTML for the
Compassion Course workbook. Outputs .local-workbook/content.json with:

  { "weeks": [ { "n": 1, "title": "...",
                 "practices": [ {"title": "...", "desc": ["para", ...]}, ... ] }, ... ] }

The practices live in <section id="practices"> as sibling
<div class="practice-card"> blocks. We split on those boundaries (rather
than a single greedy regex) so nested divs don't merge cards. cc-widget
input scaffolding is stripped — only the practice instruction <p>s remain.
"""
import re, html, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDIR = os.path.join(ROOT, '.local-built-lessons')
OUT = os.path.join(ROOT, '.local-workbook', 'content.json')


def clean(s):
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)
    return re.sub(r'\s+', ' ', s).strip()


def strip_lead_num(title):
    # Practice h4s start with the practice-number span text, e.g. "1 Notice…"
    return re.sub(r'^\d+\s+', '', title).strip()


def extract_practices(section_html):
    # Remove interactive widget scaffolding so its hint <p>s don't leak in.
    section_html = re.sub(r'<div class="cc-widget[\s\S]*?</div>\s*</div>', '', section_html)
    section_html = re.sub(r'<div class="cc-widget[^"]*"[\s\S]*?</div>', '', section_html)
    # Split into card chunks on the practice-card boundary.
    parts = re.split(r'<div class="practice-card"', section_html)
    practices = []
    for chunk in parts[1:]:
        h4 = re.search(r'<h4[^>]*>([\s\S]*?)</h4>', chunk)
        title = strip_lead_num(clean(h4.group(1))) if h4 else ''
        # Practice instruction paragraphs (cut off at the journal textarea
        # / saved markers, which are gone now but guard anyway).
        body = re.split(r'<textarea|<div class="journal-saved"|<label class="cc-done', chunk)[0]
        paras = [clean(p) for p in re.findall(r'<p[^>]*>([\s\S]*?)</p>', body)]
        paras = [p for p in paras if p and len(p) > 1]
        if title or paras:
            practices.append({'title': title, 'desc': paras})
    return practices


def week_title(h):
    m = re.search(r'<header[^>]*class="hero"[^>]*>[\s\S]*?<h1[^>]*>([\s\S]*?)</h1>', h)
    return clean(m.group(1)) if m else ''


def main():
    weeks = []
    for n in range(1, 53):
        fp = os.path.join(LDIR, f'week-{n}.html')
        if not os.path.exists(fp):
            continue
        h = open(fp, encoding='utf-8').read()
        ms = re.search(r'<section[^>]*id="practices"[\s\S]*?</section>', h)
        practices = extract_practices(ms.group(0)) if ms else []
        weeks.append({'n': n, 'title': week_title(h), 'practices': practices})
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({'weeks': weeks}, open(OUT, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    total = sum(len(w['practices']) for w in weeks)
    print(f'weeks: {len(weeks)}  total practices: {total}')
    for n in (1, 2, 5, 13, 52):
        w = next((x for x in weeks if x['n'] == n), None)
        if w:
            names = ' | '.join(p['title'][:32] for p in w['practices'])
            print(f"  W{n}: {w['title'][:40]}  ::  {names}")
    print(f'saved -> {OUT}')


if __name__ == '__main__':
    main()
