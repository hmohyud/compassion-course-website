#!/usr/bin/env python3
"""
Upload the per-week customized lesson HTML files in `.local-built-lessons/`
to Firebase Storage (`weekly-html/week-{n}.html`) without re-running the
source-driven build (which would clobber the per-week edits).

This script only:
  1. Reads each .local-built-lessons/week-N.html
  2. Pulls the title from <h1> in the hero
  3. Uploads the HTML to GCS at weekly-html/week-{n}.html
  4. Patches the Firestore `weeklyContent/{n}` doc's `title` field

Skips PROTECTED_WEEKS = {1, 2, 3, 4, 10, 22} entirely (those originals
were deployed by the prior cohort and are not regenerated).

Usage: python scripts/upload-customized-lessons.py [--only=N,M,...] [--dry-run]
Requires: `firebase login` to have been run.
"""

import json
import os
import re
import sys
import urllib.parse
import urllib.request
import html as htmllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LESSON_DIR = ROOT / ".local-built-lessons"

PROJECT_ID = "compassion-course-websit-937d6"
STORAGE_BUCKET = "compassion-course-websit-937d6.firebasestorage.app"
FIREBASE_CLI_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com"
FIREBASE_CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi"

PROTECTED_WEEKS = {1, 2, 3, 4, 10, 22}


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
        url, data=body_bytes, method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "text/html"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def patch_firestore_title(token, week, title):
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/"
        f"weeklyContent/{week}?updateMask.fieldPaths=title"
    )
    body = json.dumps({"fields": {"title": {"stringValue": title}}}).encode()
    req = urllib.request.Request(
        url, data=body, method="PATCH",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def title_from_html(html):
    m = re.search(r"<header[^>]*class=\"hero\"[^>]*>[\s\S]*?<h1[^>]*>([\s\S]*?)</h1>", html)
    if not m:
        m = re.search(r"<h1[^>]*>([\s\S]*?)</h1>", html)
    raw = m.group(1) if m else ""
    raw = re.sub(r"<[^>]+>", "", raw)
    return htmllib.unescape(re.sub(r"\s+", " ", raw)).strip()


def parse_args(argv):
    only = None
    dry = False
    include_protected = False
    for a in argv:
        if a == "--dry-run":
            dry = True
        elif a == "--include-protected":
            include_protected = True
        elif a.startswith("--only="):
            only = {int(x) for x in a.split("=", 1)[1].split(",") if x.strip()}
    return only, dry, include_protected


def main():
    only, dry, include_protected = parse_args(sys.argv[1:])
    files = sorted(
        (f for f in LESSON_DIR.iterdir() if re.match(r"week-\d+\.html$", f.name)),
        key=lambda p: int(re.match(r"week-(\d+)", p.name).group(1)),
    )
    print(f"Found {len(files)} customized lesson files in {LESSON_DIR}")
    if only:
        files = [f for f in files if int(re.match(r"week-(\d+)", f.name).group(1)) in only]
        print(f"  filtered to weeks: {sorted(only)}")
    if include_protected:
        print(f"  --include-protected: PROTECTED_WEEKS {sorted(PROTECTED_WEEKS)} will be uploaded")
    print()

    token = None if dry else get_access_token()
    uploaded = 0
    for f in files:
        n = int(re.match(r"week-(\d+)", f.name).group(1))
        if n in PROTECTED_WEEKS and not include_protected:
            print(f"  skip W{n:>2} - protected week (not regenerated)")
            continue
        body = f.read_bytes()
        title = title_from_html(body.decode("utf-8", errors="replace"))
        storage_path = f"weekly-html/week-{n}.html"
        size_kb = len(body) / 1024
        if dry:
            print(f"  W{n:>2} - would upload {size_kb:.1f} KB to {storage_path}  -- {title}")
            uploaded += 1
            continue
        try:
            upload_html(token, storage_path, body)
            patch_firestore_title(token, n, title)
            print(f"  [ok] W{n:>2} ({size_kb:5.1f} KB) -- {title}")
            uploaded += 1
        except Exception as e:
            err = e.read().decode() if hasattr(e, "read") else str(e)
            print(f"  [FAIL] W{n:>2}: {err[:200]}")
    print(f"\n{'Would upload' if dry else 'Uploaded'} {uploaded} customized lesson(s).")


if __name__ == "__main__":
    main()
