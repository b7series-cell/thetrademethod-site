#!/usr/bin/env python3
"""
seo-blocks.py

Keeps the trust and SEO blocks on every page in step with the site, so
nobody has to remember them. Safe to run any number of times. The deploy
runs it after stamp-dates.py; run it yourself after adding a page:

    node _docs/build-sitemap.js && python3 _docs/stamp-dates.py && python3 _docs/seo-blocks.py

What it writes:
  - JSON-LD: author is Bryant (Person, /about.html), no HTML entities
    inside the JSON, plus a BreadcrumbList (Home > section > page)
  - a byline under the back link: "By Bryant · Updated <dateModified>"
  - back links point at the hub pages (/setups/, /fundamentals/)
  - a static footer (disclaimer + About, Privacy, Contact links) inside
    <footer data-gfooter>, for crawlers that don't run JavaScript;
    js/site.js replaces it with the full footer in the browser
  - "Related setups" cards on every setup page (same session group first)
  - the homepage and /setups/ counts (data-stat) from js/nav.js
"""

import datetime as dt
import html
import json
import os
import re
import subprocess
import sys
from urllib.parse import urlsplit, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGIN = "https://thetrademethod.com"
AUTHOR = {"@type": "Person", "name": "Bryant", "url": ORIGIN + "/about.html"}
LD_RE = re.compile(r'(<script type="application/ld\+json">)(.*?)(</script>)', re.S)
CRUMB_RE = re.compile(r'\n?<!-- breadcrumbs -->.*?<!-- /breadcrumbs -->', re.S)
BYLINE_RE = re.compile(r'\n?\s*<!-- byline -->.*?<!-- /byline -->', re.S)
RELATED_RE = re.compile(r'\n  <!-- related -->.*?<!-- /related -->', re.S)


def node_json(expr):
    """Evaluate an array literal from a JS file with node, return it as Python data."""
    return json.loads(subprocess.run(["node", "-e", expr], capture_output=True, text=True, check=True).stdout)


def load_setups():
    return node_json(
        'const fs=require("fs");const s=fs.readFileSync(%r,"utf8");const a=s.indexOf("const SETUPS");'
        'const e=s.indexOf("\\n];",a);console.log(JSON.stringify(eval(s.slice(s.indexOf("[",a),e+2))))'
        % os.path.join(ROOT, "js", "nav.js"))


def load_fundamentals():
    src = open(os.path.join(ROOT, "js", "site.js"), encoding="utf-8").read()
    start = src.index("var FUNDAMENTALS = [")
    block = src[start:src.index("];", start)]
    return re.findall(r'href:\s*"([^"]+)",\s*title:\s*"([^"]+)"', block)


def minutes(t):
    h, m = t.split(":")
    return int(h) * 60 + int(m) - 570


def group_of(s):
    if s.get("group") in ("open", "day", "swing"):
        return s["group"]
    m = re.match(r"\s*(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})", s.get("session", ""))
    if m:
        w0, w1 = minutes(m.group(1)), minutes(m.group(2))
        return "open" if w0 == 0 and w1 <= 150 else "day"
    return "swing" if re.search(r"swing|multi", s.get("session", ""), re.I) else "day"


def unescape_strings(v):
    if isinstance(v, str):
        return html.unescape(v)
    if isinstance(v, list):
        return [unescape_strings(x) for x in v]
    if isinstance(v, dict):
        return {k: unescape_strings(x) for k, x in v.items()}
    return v


def fix_author(v):
    if isinstance(v, list):
        return [fix_author(x) for x in v]
    if isinstance(v, dict):
        out = {k: fix_author(x) for k, x in v.items()}
        if out.get("@type") in ("Article", "BlogPosting", "TechArticle") and "author" in out:
            out["author"] = AUTHOR
        return out
    return v


def page_name(src):
    m = re.search(r"<title>(.*?)</title>", src, re.S)
    t = html.unescape(m.group(1)).replace(" | The Trade Method", "").strip() if m else ""
    for sep in (" — ", ": ", " ("):
        if sep in t:
            t = t.split(sep)[0]
    return t.strip()


def fmt_date(d):
    return dt.date.fromisoformat(d).strftime("%b %-d, %Y")


def main():
    setups = [s for s in load_setups() if s.get("status") != "draft"]
    funds = load_fundamentals()
    fund_hrefs = {h for h, _ in funds if not h.startswith("/famous-strategies/") and not h.startswith("/blog/")}
    sitemap = re.findall(r"<loc>([^<]+)</loc>", open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read())
    changed = 0

    static_footer = (
        '<footer class="gfoot" data-gfooter><div class="wrap static-foot">'
        "<p>The Trade Method is a learning notebook, not an advisory service. Everything here is for education only and "
        "is not financial, tax or legal advice, or a recommendation to buy or sell any security. Trading involves "
        "substantial risk of loss. Past results, including backtests, don't guarantee future results.</p>"
        '<p><a href="/about.html">About</a> &middot; <a href="/setups/">Setups</a> &middot; '
        '<a href="/fundamentals/">Fundamentals</a> &middot; <a href="/famous-strategies/">Famous strategies</a> &middot; '
        '<a href="/tested-results.html">Test results</a> &middot; <a href="/contact.html">Contact</a> &middot; '
        '<a href="/privacy.html">Privacy</a></p></div></footer>'
    )

    for url in sitemap:
        path = unquote(urlsplit(url).path).lstrip("/")
        rel = path + "index.html" if path == "" or path.endswith("/") else path
        f = os.path.join(ROOT, rel)
        if not os.path.isfile(f):
            continue
        src = open(f, encoding="utf-8").read()
        orig = src
        href = "/" + path

        # JSON-LD: entities out, author in
        def ld(m):
            try:
                data = json.loads(m.group(2))
            except ValueError:
                return m.group(0)
            new = fix_author(unescape_strings(data))
            if new == data:
                return m.group(0)
            return m.group(1) + "\n" + json.dumps(new, indent=1, ensure_ascii=False).replace("</", "<\\/") + "\n" + m.group(3)
        src = CRUMB_RE.sub("", src)
        src = LD_RE.sub(ld, src)

        # breadcrumbs (not on the homepage)
        if href != "/":
            if href.startswith("/setups/") and href != "/setups/":
                section = ("Setups", "/setups/")
            elif href.startswith("/famous-strategies/") and href != "/famous-strategies/":
                section = ("Famous strategies", "/famous-strategies/")
            elif href.startswith("/blog/") and href != "/blog/":
                section = ("Blog", "/blog/")
            elif href in fund_hrefs:
                section = ("Fundamentals", "/fundamentals/")
            else:
                section = None
            items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": ORIGIN + "/"}]
            if section:
                items.append({"@type": "ListItem", "position": 2, "name": section[0], "item": ORIGIN + section[1]})
            items.append({"@type": "ListItem", "position": len(items) + 1, "name": page_name(src), "item": url})
            block = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items},
                               indent=1, ensure_ascii=False).replace("</", "<\\/")
            crumbs = '\n<!-- breadcrumbs --><script type="application/ld+json">\n%s\n</script><!-- /breadcrumbs -->' % block
            src = src.replace("</head>", crumbs + "\n</head>", 1) if "\n</head>" not in src else src.replace("\n</head>", crumbs + "\n</head>", 1)

        # back links to the hubs
        if href.startswith("/setups/"):
            src = src.replace('<a class="back" href="/#setups">&lsaquo; All setups</a>', '<a class="back" href="/setups/">&lsaquo; All setups</a>')
        elif href in fund_hrefs:
            src = re.sub(r'<a class="back" href="/(?:#setups|#fundamentals)">&lsaquo; [^<]*</a>',
                         '<a class="back" href="/fundamentals/">&lsaquo; Fundamentals</a>', src)

        # byline under the back link
        src = BYLINE_RE.sub("", src)
        m = re.search(r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"', src)
        if '<a class="back"' in src:
            date = (' &middot; Updated <time datetime="%s">%s</time>' % (m.group(1), fmt_date(m.group(1)))) if m else ""
            byline = '\n  <!-- byline --><p class="byline">By <a href="/about.html" rel="author">Bryant</a>%s</p><!-- /byline -->' % date
            src = re.sub(r'(<a class="back"[^>]*>[^<]*</a>)', lambda mm: mm.group(1) + byline, src, count=1)

        # static footer
        src = re.sub(r'<footer class="gfoot" data-gfooter>.*?</footer>', static_footer, src, count=1, flags=re.S)

        # related setups
        src = RELATED_RE.sub("", src)
        me = next((s for s in setups if s["href"] == href), None)
        if me and '\n  <div class="rule">' in src:
            g = group_of(me)
            others = [s for s in setups if s["href"] != href]
            same = [s for s in others if group_of(s) == g]
            i = setups.index(me)
            same.sort(key=lambda s: abs(setups.index(s) - i))
            pick = (same + [s for s in others if s not in same])[:4]
            cards = "".join(
                '\n    <a href="%s"><span class="k">%s</span><h3>%s</h3><p>%s</p></a>'
                % (s["href"], {"open": "Opening drive", "day": "All session", "swing": "Swing"}[group_of(s)],
                   html.escape(s["nav"], quote=False), html.escape(s["thesis"].split(". ")[0].rstrip(".") + ".", quote=False))
                for s in pick)
            block = ('\n  <!-- related --><div class="section-head" id="related"><h2>Related setups</h2>'
                     '<p>Setups that trade the same part of the day.</p></div>\n  <div class="relgrid">%s\n  </div><!-- /related -->' % cards)
            k = src.rindex('\n  <div class="rule">')
            src = src[:k] + block + src[k:]

        if src != orig:
            open(f, "w", encoding="utf-8").write(src)
            changed += 1

    # static counts for crawlers (js/site.js renders the same numbers)
    v = {"setups": len(setups),
         "stages": sum(s.get("stages") or 0 for s in setups),
         "filters": sum(s.get("filters") or 0 for s in setups),
         "sessions": len({s.get("session") for s in setups}),
         "indicators": sum(len([i for i in (s.get("indicators") or []) if i.get("file") or i.get("url")]) for s in setups)}
    for rel in ("index.html", "setups/index.html"):
        f = os.path.join(ROOT, rel)
        src = open(f, encoding="utf-8").read()
        new = re.sub(r'(data-stat="(\w+)">)([^<]*)', lambda m: m.group(1) + (str(v[m.group(2)]) if m.group(2) in v else m.group(3)), src)
        if new != src:
            open(f, "w", encoding="utf-8").write(new)
            changed += 1

    print("seo-blocks: %d file(s) updated; %d setups, %d indicators." % (changed, v["setups"], v["indicators"]))


if __name__ == "__main__":
    main()
