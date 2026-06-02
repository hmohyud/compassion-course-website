#!/usr/bin/env python3
"""
Standardize the "Compassion Course Information" (#info) and "Resources"
(#resources) accordion sections across the protected/old weeks so they
match the version already shared by weeks 5–52.

Background (Marta's audit, May 2026): these two boilerplate sections were
pulled verbatim from Thom's original emails and drifted week to week. The
zip rebuild already gave weeks 5–52 one identical version; the protected
weeks (1, 2, 3, 4, 10, 22) still carry old, varying copies, and Week 2 is
missing #info entirely.

This script copies the canonical #info + #resources from a reference week
(13) into weeks 1, 2, 4, 10, 22 (replace, or insert for Week 2's missing
#info). WEEK 3 IS LEFT UNTOUCHED — it uniquely holds the time-sensitive
"Another Chance to Join the Certificate of Completion Track" block, whose
per-week placement Marta is specifying separately. When her finalized
content arrives, update CANON_WEEK / re-run to apply the true canonical.

Usage: python scripts/standardize-info-resources.py [--dry-run]
"""
import re
import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDIR = os.path.join(ROOT, '.local-built-lessons')
CANON_WEEK = 13
TARGET_WEEKS = [1, 2, 4, 10, 22]   # NOT 3 (keeps its COC block)

INFO_RE = re.compile(r'<section[^>]*id="info"[\s\S]*?</section>')
RES_RE = re.compile(r'<section[^>]*id="resources"[\s\S]*?</section>')


def read(n):
    return open(os.path.join(LDIR, f'week-{n}.html'), encoding='utf-8').read()


def main():
    dry = '--dry-run' in sys.argv
    canon = read(CANON_WEEK)
    canon_info = INFO_RE.search(canon).group(0)
    canon_res = RES_RE.search(canon).group(0)

    for n in TARGET_WEEKS:
        path = os.path.join(LDIR, f'week-{n}.html')
        html = read(n)
        before = html

        # Replace #resources (present in every week).
        if RES_RE.search(html):
            html = RES_RE.sub(lambda _: canon_res, html, count=1)

        # Replace #info if present, else insert it immediately before
        # #resources (Compassion Course Information sits above Resources).
        if INFO_RE.search(html):
            html = INFO_RE.sub(lambda _: canon_info, html, count=1)
        else:
            html = RES_RE.sub(lambda m: canon_info + '\n\n    ' + m.group(0), html, count=1)

        changed = html != before
        action = 'would update' if dry else ('updated' if changed else 'no change')
        print(f'  W{n:>2}: {action}')
        if changed and not dry:
            open(path, 'w', encoding='utf-8').write(html)

    print('\nWeek 3 intentionally left unchanged (time-sensitive COC block).')
    if dry:
        print('(dry run — no files written)')


if __name__ == '__main__':
    main()
