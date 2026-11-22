#!/usr/bin/env python3
"""
stamp-dates.py

Gives every sitemap page a real "last updated" date, taken from git:
the date of the last commit that changed the page's own content.
Commits that only bump ?v= cache numbers or the date itself don't count,
so a site-wide version bump doesn't make every page look new.

It writes that date into:
  - sitemap.xml  <lastmod>        (what Google and Bing read)
  - the page's JSON-LD "dateModified" (what AI answers and rich results read)

Pages that haven't changed since the repo was created (2026-11-13) keep
the dateModified they already had, since git doesn't know older history.

Run from the site root after node _docs/build-sitemap.js:

    python3 _docs/stamp-dates.py

Needs the full git history (deploy.yml checks out with fetch-depth: 0).
"""

import os
import re
import subprocess
import sys
from urllib.parse import urlsplit, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITEMAP = os.path.join(ROOT, "sitemap.xml")
DATE_RE = re.compile(r'("dateModified"\s*:\s*")(\d{4}-\d{2}-\d{2})(")')
# the byline date (written by seo-blocks.py) is noise too, or each new date would count as a change
NOISE = [re.compile(r"\?v=\d+"), re.compile(r"<time datetime=\"[^\"]*\">[^<]*</time>"), DATE_RE, re.compile(r"\d{4}-\d{2}-\d{2}")]


def git(*args):
    return subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True, check=True).stdout


def normalize(line):
    for rx in NOISE:
        line = rx.sub("", line)
    return line.strip()


def first_commit():
    return git("rev-list", "--max-parents=0", "HEAD").split()[0]


def last_real_change(rel, root_commit):
    """Date (YYYY-MM-DD) of the newest commit that changed this file's content,
    or None if only the initial import touched it."""
    for line in git("log", "--format=%H %cs", "--", rel).splitlines():
        sha, date = line.split()
        if sha == root_commit:
            return None
        diff = git("show", "--format=", "--unified=0", sha, "--", rel)
        removed = sorted(normalize(l[1:]) for l in diff.splitlines() if l.startswith("-") and not l.startswith("---"))
        added = sorted(normalize(l[1:]) for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++"))
        if removed != added:
            return date
    return None


def url_to_rel(url):
    path = unquote(urlsplit(url).path).lstrip("/")
    return path + "index.html" if path == "" or path.endswith("/") else path


def main():
    if git("rev-parse", "--is-shallow-repository").strip() == "true":
        sys.exit("stamp-dates.py needs the full git history (git fetch --unshallow).")
    root_commit = first_commit()
    root_date = git("show", "-s", "--format=%cs", root_commit).strip()

    xml = open(SITEMAP, encoding="utf-8").read()
    changed = 0

    def per_url(m):
        nonlocal changed
        url = m.group(1)
        rel = url_to_rel(url)
        f = os.path.join(ROOT, rel)
        src = open(f, encoding="utf-8").read() if os.path.isfile(f) else ""
        existing = DATE_RE.search(src)
        date = last_real_change(rel, root_commit) or (existing.group(2) if existing else root_date)
        if existing and existing.group(2) > date:
            date = existing.group(2)  # never move a hand-set date backwards
        if src and existing:
            new = DATE_RE.sub(lambda d: d.group(1) + date + d.group(3), src)
            if new != src:
                open(f, "w", encoding="utf-8").write(new)
                changed += 1
        return m.group(0)[: m.start(2) - m.start(0)] + date + m.group(0)[m.end(2) - m.start(0):]

    xml = re.sub(r"<loc>([^<]+)</loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})", per_url, xml)
    open(SITEMAP, "w", encoding="utf-8").write(xml)
    print(f"sitemap.xml lastmod set from git; {changed} page(s) got a new dateModified.")


if __name__ == "__main__":
    main()
