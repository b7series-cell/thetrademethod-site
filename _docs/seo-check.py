#!/usr/bin/env python3
"""
seo-check.py

Checks every page in sitemap.xml before a deploy, so a page can't go live
without its SEO basics. Run from the site root:

    python3 _docs/seo-check.py

Errors (the deploy stops):
  - a sitemap URL with no file behind it
  - missing <title>, meta description, canonical or JSON-LD
  - canonical that doesn't match the page's own URL
  - a page in the sitemap marked noindex
  - JSON-LD that isn't valid JSON
  - an internal link or src to a file that doesn't exist

Warnings (printed, deploy continues):
  - title over 70 characters, description under 70 or over 170
  - no social image (og:image)
  - page missing from llms.txt
  - an indexable page that isn't in sitemap.xml
"""

import html
import json
import os
import re
import sys
from urllib.parse import urlsplit, unquote

ORIGIN = "https://thetrademethod.com"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Pages that are fine outside the sitemap (redirected, offline, error, or noindex by design).
NOT_IN_SITEMAP_OK = {"404.html", "offline.html", "expected-move-v2.html", "expected-move-v3.html"}
SKIP_DIRS = {".git", ".github", "_docs", "Claude outputs", "node_modules", "api"}

errors, warnings = [], []


def url_to_file(url):
    path = urlsplit(url).path
    if path.endswith("/"):
        path += "index.html"
    return os.path.join(ROOT, unquote(path.lstrip("/")))


def file_to_url(rel):
    rel = rel.replace(os.sep, "/")
    if rel.endswith("index.html"):
        rel = rel[: -len("index.html")]
    return ORIGIN + "/" + rel


def meta(src, attr, name):
    for tag in re.findall(r"<meta\b[^>]*>", src, re.I):
        if re.search(r'\b%s\s*=\s*["\']%s["\']' % (attr, re.escape(name)), tag, re.I):
            m = re.search(r'\bcontent\s*=\s*"([^"]*)"', tag, re.I) or re.search(r"\bcontent\s*=\s*'([^']*)'", tag, re.I)
            if m:
                return html.unescape(m.group(1)).strip()
    return None


def check_links(rel, src):
    page_dir = os.path.dirname(os.path.join(ROOT, rel))
    for ref in set(re.findall(r'\b(?:href|src)\s*=\s*"([^"]+)"', src, re.I)):
        if re.match(r"^(?:[a-z][a-z0-9+.-]*:|//|#|\$|\{)", ref, re.I) or "${" in ref:
            continue
        path = unquote(urlsplit(ref).path)
        if not path:
            continue
        target = os.path.join(ROOT, path.lstrip("/")) if path.startswith("/") else os.path.normpath(os.path.join(page_dir, path))
        if path.endswith("/"):
            target = os.path.join(target, "index.html")
        if target.startswith(os.path.join(ROOT, "api")):
            continue  # served by PHP on the server
        if not os.path.exists(target):
            errors.append(f"{rel}: broken link to {ref}")


def main():
    sitemap = re.findall(r"<loc>([^<]+)</loc>", open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read())
    llms = open(os.path.join(ROOT, "llms.txt"), encoding="utf-8").read()
    in_sitemap = set()

    for url in sitemap:
        f = url_to_file(url)
        rel = os.path.relpath(f, ROOT).replace(os.sep, "/")
        in_sitemap.add(rel)
        if not os.path.isfile(f):
            errors.append(f"sitemap lists {url} but {rel} doesn't exist")
            continue
        src = open(f, encoding="utf-8").read()

        m = re.search(r"<title>(.*?)</title>", src, re.I | re.S)
        title = html.unescape(m.group(1)).strip() if m else ""
        if not title:
            errors.append(f"{rel}: no <title>")
        elif len(title) > 70:
            warnings.append(f"{rel}: title is {len(title)} characters (search shows about 60)")

        desc = meta(src, "name", "description")
        if not desc:
            errors.append(f"{rel}: no meta description")
        elif not 70 <= len(desc) <= 170:
            warnings.append(f"{rel}: description is {len(desc)} characters (aim for 120-160)")

        robots = (meta(src, "name", "robots") or "").lower()
        if "noindex" in robots:
            errors.append(f"{rel}: in the sitemap but marked noindex")

        m = re.search(r'<link\b[^>]*rel="canonical"[^>]*>', src, re.I)
        canon = re.search(r'href="([^"]+)"', m.group(0)).group(1) if m else ""
        if not canon:
            errors.append(f"{rel}: no canonical link")
        elif canon.rstrip("/") != url.rstrip("/"):
            errors.append(f"{rel}: canonical is {canon}, sitemap says {url}")

        blocks = re.findall(r'<script\b[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', src, re.I | re.S)
        if not blocks:
            errors.append(f"{rel}: no JSON-LD structured data")
        for b in blocks:
            try:
                json.loads(b)
            except ValueError as e:
                errors.append(f"{rel}: JSON-LD doesn't parse ({e})")

        if not meta(src, "property", "og:image"):
            warnings.append(f"{rel}: no og:image (social preview picture)")

        if url != ORIGIN + "/" and url not in llms:
            warnings.append(f"{rel}: not listed in llms.txt")

        check_links(rel, src)

    for dirpath, dirnames, files in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for name in files:
            if not name.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, "/")
            if rel in in_sitemap or rel in NOT_IN_SITEMAP_OK:
                continue
            src = open(os.path.join(ROOT, rel), encoding="utf-8").read()
            robots = (meta(src, "name", "robots") or "").lower()
            if "noindex" in robots or re.search(r'http-equiv="refresh"', src, re.I):
                continue
            warnings.append(f"{rel}: indexable page not in sitemap.xml (add it to build-sitemap.js, or mark it noindex)")

    for w in warnings:
        print("warning: " + w)
    for e in errors:
        print("ERROR:   " + e)
    print(f"\nChecked {len(sitemap)} sitemap pages: {len(errors)} error(s), {len(warnings)} warning(s).")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
