#!/usr/bin/env python3
"""
Pull the per-week customized lesson HTML files from Firebase Storage
(`weekly-html/week-{n}.html`) down to `.local-built-lessons/week-{n}.html`.

This is the reverse of `upload-customized-lessons.py`. Use it to sync
the current production lesson HTML to your local working copy (e.g.,
when re-cloning the repo on a new machine or recovering from a stale
local checkout).

PROTECTED_WEEKS are still pulled — those originals also live in Storage
and you want them locally if you're going to inspect/diff/edit anything.

Usage: python scripts/pull-lessons.py [--only=N,M,...] [--dry-run]
Requires: `firebase login` to have been run.
"""

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LESSON_DIR = ROOT / ".local-built-lessons"

PROJECT_ID = "compassion-course-websit-937d6"
STORAGE_BUCKET = "compassion-course-websit-937d6.firebasestorage.app"
FIREBASE_CLI_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com"
FIREBASE_CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi"

WEEK_RANGE = range(1, 53)  # weeks 1..52


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


def download_html(token, storage_path):
    """Return (status, bytes) for the object at storage_path. Status 404 if
    the object doesn't exist, else 200 with the file body."""
    url = (
        f"https://storage.googleapis.com/storage/v1/b/{urllib.parse.quote(STORAGE_BUCKET)}/o/"
        f"{urllib.parse.quote(storage_path, safe='')}?alt=media"
    )
    req = urllib.request.Request(
        url, method="GET",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read() if hasattr(e, "read") else b""


def parse_args(argv):
    only = None
    dry = False
    for a in argv:
        if a == "--dry-run":
            dry = True
        elif a.startswith("--only="):
            only = {int(x) for x in a.split("=", 1)[1].split(",") if x.strip()}
    return only, dry


def main():
    only, dry = parse_args(sys.argv[1:])
    weeks = sorted(only) if only else list(WEEK_RANGE)
    print(f"Pulling {len(weeks)} week(s) from gs://{STORAGE_BUCKET}/weekly-html/ "
          f"into {LESSON_DIR}")
    if dry:
        print("  (dry run — no files will be written)")
    print()

    if not dry:
        LESSON_DIR.mkdir(parents=True, exist_ok=True)
    token = None if dry else get_access_token()

    pulled = 0
    missing = 0
    failed = 0
    for n in weeks:
        storage_path = f"weekly-html/week-{n}.html"
        local_path = LESSON_DIR / f"week-{n}.html"
        if dry:
            print(f"  W{n:>2} - would download {storage_path} -> {local_path.name}")
            pulled += 1
            continue
        try:
            status, body = download_html(token, storage_path)
        except Exception as e:
            print(f"  [FAIL] W{n:>2}: {e}")
            failed += 1
            continue
        if status == 404:
            print(f"  W{n:>2} - not in storage (404), skipping")
            missing += 1
            continue
        if status != 200:
            head = body.decode("utf-8", errors="replace")[:200]
            print(f"  [FAIL] W{n:>2} HTTP {status}: {head}")
            failed += 1
            continue
        local_path.write_bytes(body)
        size_kb = len(body) / 1024
        print(f"  [ok] W{n:>2} ({size_kb:5.1f} KB) -> {local_path.name}")
        pulled += 1

    print()
    if dry:
        print(f"Would pull {pulled} file(s).")
    else:
        print(f"Pulled {pulled} file(s).  Missing in storage: {missing}.  Failed: {failed}.")


if __name__ == "__main__":
    main()
