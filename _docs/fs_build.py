"""
fs_build.py — builds a Famous Strategies page from a spec, and registers it.

Usage (from the site root):
    python3 _docs/fs_build.py post-earnings-drift [more slugs...]

Each spec lives in _docs/fs_specs/<slug>.py and defines SPEC (a dict).
The page head comes from _docs/fs-head-template.html (copied from the
Cross-Sectional Momentum page). Animations live in js/fs-<slug>.js and
use js/fs-kit.js. The Pine indicator is /pine/<slug>.pine and is pasted
into the page as a code block.

register() flips the page live in STRATEGIES (js/site.js), adds it to the
hub (JSON-LD + static card), llms.txt, and both build scripts' lists.
Run node _docs/build-sitemap.js and node _docs/build-search-index.js after.
"""
import html, importlib.util, os, re, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = {"KITV": "1", "CBGV": "34", "SITEV": "45", "CSSV": "24", "DATE": "2026-11-17"}


def esc(s):
    return html.escape(s, quote=True)


def stage(n, st):
    lis = "".join("            <li>%s</li>\n" % x for x in st["li"])
    return ('      <section class="stage">\n        <div class="num">%s</div>\n        <div>\n          <h3>%s</h3>\n          <ul>\n%s          </ul>\n'
            '          <p class="why">%s</p>\n        </div>\n      </section>\n') % (n, st["h3"], lis, st["why"])


def anim(b):
    return ('  <section class="anim" data-fs-anim="%s" aria-label="%s">\n    <div class="anim-head">\n      <div>\n        <p class="anim-n"></p>\n'
            '        <h2 class="anim-title">%s</h2>\n        <p class="anim-text" aria-live="polite"></p>\n      </div>\n      <div class="anim-ctrl">\n'
            '        <button type="button" class="pill pill-buy anim-play" aria-pressed="false">Play</button>\n        <button type="button" class="pill anim-replay">Replay</button>\n'
            '      </div>\n    </div>\n    <div class="anim-scroll"><svg viewBox="0 0 1180 540" role="img" aria-label="%s"></svg></div>\n'
            '    <div class="anim-chips" role="group" aria-label="Jump to a stage"></div>\n  </section>\n') % (b["key"], esc(b["aria"]), b["title"], esc(b["title_plain"] if "title_plain" in b else re.sub("<[^>]+>", "", b["title"])))


# ---- right-column helpers usable from specs ----
def panel(h4, lead, inner=""):
    return '      <div class="panel">\n        <h4>%s</h4>\n        <p class="lead">%s</p>\n%s      </div>\n' % (h4, lead, inner)


def pair(a, b):
    def one(x):
        cls, k, bb, p = x
        return '          <div%s><span class="k">%s</span><b>%s</b><p>%s</p></div>\n' % ((' class="%s"' % cls) if cls else "", k, bb, p)
    return '        <div class="pair">\n' + one(a) + one(b) + "        </div>\n"


def calc(h4, lead, rows):
    out = '      <div class="panel calc">\n        <h4>%s</h4>\n        <p class="lead">%s</p>\n' % (h4, lead)
    for r in rows:
        cls = ' class="row tot"' if len(r) > 2 and r[2] == "tot" else ' class="row"'
        out += '        <div%s><span>%s</span><b>%s</b></div>\n' % (cls, r[0], r[1])
    return out + "      </div>\n"


def qb(htm):
    return '      <blockquote class="qb">%s</blockquote>\n' % htm


def build(spec):
    S = spec
    head = open(os.path.join(ROOT, "_docs", "fs-head-template.html")).read()
    rep = dict(V)
    rep.update({"DESC": esc(S["desc"]), "TITLE": esc(S["seo_title"]), "SLUG": S["slug"], "NAME": esc(S["name"])})
    for k, v in rep.items():
        head = head.replace("{{%s}}" % k, v)
    b = []
    b.append('<body>\n\n<div data-gnav></div>\n<div data-lnav data-title="%s"></div>\n<div class="sheet">\n\n  <a class="back" href="/famous-strategies/">&lsaquo; Famous strategies</a>\n\n' % esc(S["name"]))
    b.append('  <header class="top" data-candle-bg="%s">\n    <div>\n      <p class="kicker">%s</p>\n      <h1>%s</h1>\n    </div>\n    <div>\n      <p class="thesis">%s\n      <em>%s</em></p>\n      <div class="counts">\n'
             % (S["slug"], S["kicker"], S["h1"], S["thesis"], S["thesis_em"]))
    for c in S["counts"]:
        b.append('        <div><b>%s</b><small>%s</small></div>\n' % c)
    b.append('      </div>\n    </div>\n  </header>\n\n  <nav class="ribbon seven" aria-label="%s">\n' % esc(S["name"]))
    for i, r in enumerate(S["ribbon"]):
        b.append('    <div><div class="t">step %d</div><div class="n">%s</div></div>\n' % (i + 1, r))
    b.append('  </nav>\n\n  <div class="facts" aria-label="At a glance">\n')
    for k, v in S["facts"]:
        b.append('    <div><span class="k">%s</span><b>%s</b></div>\n' % (k, v))
    b.append("  </div>\n\n")
    n = 0
    for blk in S["blocks"]:
        t = blk["type"]
        if t == "head":
            b.append('  <div class="section-head" id="%s">\n    <h2>%s</h2>\n    <p>%s</p>\n  </div>\n' % (blk["id"], blk["h2"], blk["p"]))
        elif t == "anim":
            b.append(anim(blk))
        elif t == "main":
            n += 1
            b.append('  <div class="main">\n    <div>\n' + stage(n, blk["stage"]) + "    </div>\n    <div>\n" + "".join(blk["right"]) + "    </div>\n  </div>\n\n")
        elif t == "four":
            b.append('  <div class="four">\n')
            for c in blk["cards"]:
                b.append('    <div style="--tc:%s"><span class="k">%s</span><h3>%s</h3><p>%s</p></div>\n' % c)
            b.append("  </div>\n\n")
        elif t == "timeline":
            b.append('  <ol class="tl">\n')
            for c in blk["items"]:
                b.append('    <li style="--tc:%s"><span class="y">%s</span><b>%s</b><p>%s</p></li>\n' % c)
            b.append("  </ol>\n\n")
        elif t == "raw":
            b.append(blk["html"])
    # stepper
    b.append('  <div class="section-head" id="steps">\n    <h2>The strategy, step by step</h2>\n    <p>The whole thing in %s steps. Click through them.</p>\n  </div>\n  <div class="fs-steps" data-fs-steps data-fs-label="%s, step by step">\n'
             % (["zero", "one", "two", "three", "four", "five", "six", "seven"][len(S["steps"])], esc(S["name"])))
    for i, st in enumerate(S["steps"]):
        b.append(stage(i + 1, st))
    b.append("  </div>\n\n")
    # indicator
    I = S["indicator"]
    code = html.escape(open(os.path.join(ROOT, "pine", S["slug"] + ".pine")).read(), quote=False)
    b.append('  <div class="section-head" id="indicator">\n    <h2 class="ind-heading">The indicator</h2>\n    <p class="ind-note">%s</p>\n  </div>\n  <div class="ind-wrap">\n    <ul class="ind-list">\n      <li class="ind-card">\n        <div class="ind-card-top">\n          <h3 class="ind-name">%s</h3>\n          <span class="ind-alerts">alerts</span>\n        </div>\n'
             % (I["note"], I["name"]))
    for p in I["blurbs"]:
        b.append('        <p class="ind-blurb">%s</p>\n' % p)
    b.append('        <div class="ind-links">\n          <a class="ind-link ind-link--quiet" href="/pine/%s.pine" download>Download source (.pine)</a>\n        </div>\n      </li>\n    </ul>\n    <div class="ind-mock">%s</div>\n  </div>\n' % (S["slug"], I["mock"]))
    b.append('  <div class="panel" style="margin-top:22px">\n    <h4>Add it to TradingView</h4>\n    <ol class="howto">\n')
    for h in I["howto"]:
        b.append("      <li>%s</li>\n" % h)
    b.append('    </ol>\n  </div>\n  <div class="code-wrap">\n    <div class="code-top">\n      <span>%s.pine &middot; Pine Script v6</span>\n      <div class="acts"><button type="button" data-copy>Copy code</button><a href="/pine/%s.pine" download>Download</a></div>\n    </div>\n    <pre class="pine" tabindex="0"><code>%s</code></pre>\n  </div>\n\n'
             % (S["slug"], S["slug"], code))
    # related
    b.append('  <div class="section-head" id="related">\n    <h2>Go deeper</h2>\n    <p>Pages on this site that pick up where this one leaves off.</p>\n  </div>\n  <div class="four">\n')
    for c in S["related"]:
        b.append('    <a href="%s" style="--tc:%s"><span class="k">%s</span><h3>%s</h3><p>%s</p><small>Read &rsaquo;</small></a>\n' % c)
    b.append("  </div>\n\n")
    R = S["rule"]
    b.append('  <div class="rule">\n    <div>\n      <h2>%s</h2>\n      <p>%s</p>\n    </div>\n    <div>\n      <ul>\n%s      </ul>\n    </div>\n  </div>\n\n'
             % (R["h2"], R["p"], "".join("        <li>%s</li>\n" % x for x in R["li"])))
    b.append('  <div class="section-head" id="sources">\n    <h2>Sources</h2>\n    <p>The papers and books behind every figure on this page.</p>\n  </div>\n  <ol class="cites">\n')
    for c in S["sources"]:
        b.append("    <li>%s</li>\n" % c)
    b.append('  </ol>\n\n  <p class="src">%s</p>\n</div>\n<footer class="gfoot" data-gfooter></footer>\n\n</body>\n</html>\n' % S["src"])
    out = head + "".join(b)
    open(os.path.join(ROOT, "famous-strategies", S["slug"] + ".html"), "w").write(out)
    return out


def sub1(text, old, new, path):
    if old not in text:
        raise SystemExit("not found in %s: %r" % (path, old[:80]))
    return text.replace(old, new, 1)


def register(S):
    href = "/famous-strategies/%s.html" % S["slug"]
    url = "https://thetrademethod.com" + href
    # site.js: live true
    p = os.path.join(ROOT, "js", "site.js"); t = open(p).read()
    m = re.search(r'\{ href: "%s",[^\n]*?live: false' % re.escape(href), t)
    if m:
        t = t[:m.start()] + m.group(0).replace("live: false", "live: true") + t[m.end():]
        open(p, "w").write(t)
    # hub: JSON-LD + static card
    p = os.path.join(ROOT, "famous-strategies", "index.html"); t = open(p).read()
    if url not in t:
        items = re.findall(r'"position": (\d+)', t)
        pos = len(items) + 1
        t = re.sub(r'"numberOfItems": \d+', '"numberOfItems": %d' % pos, t)
        t = sub1(t, "\n  ]\n }\n}\n</script>", ',\n   { "@type": "ListItem", "position": %d, "name": "%s", "url": "%s" }\n  ]\n }\n}\n</script>' % (pos, S["name"], url), p)
        card = '          <a class="scard" href="%s"><span class="k">%s &middot; %s</span><h3>%s</h3><p>%s</p><span class="more">Read &rsaquo;</span></a>\n' % (href, S["market"], esc(S["who"]), esc(S["name"]), esc(S["card"]))
        t = sub1(t, '        </div>\n        <p class="hub-empty" id="strat-empty"', card + '        </div>\n        <p class="hub-empty" id="strat-empty"', p)
        open(p, "w").write(t)
    # llms.txt
    p = os.path.join(ROOT, "llms.txt"); t = open(p).read()
    if url not in t:
        line = "- [%s](%s): %s\n" % (S["seo_title"], url, S["desc"])
        t = sub1(t, "\n## Blog\n", line + "\n## Blog\n", p)
        t = t.replace(line + "\n## Blog", line.rstrip("\n") + "\n\n## Blog") if False else t
        open(p, "w").write(t)
    # sitemap + search lists
    p = os.path.join(ROOT, "_docs", "build-sitemap.js"); t = open(p).read()
    if href not in t:
        t = sub1(t, '  { loc: "/famous-strategies/cross-sectional-momentum.html", priority: "0.7" },\n', '  { loc: "/famous-strategies/cross-sectional-momentum.html", priority: "0.7" },\n  { loc: "%s", priority: "0.7" },\n' % href, p)
        open(p, "w").write(t)
    p = os.path.join(ROOT, "_docs", "build-search-index.js"); t = open(p).read()
    if href[1:] not in t:
        t = sub1(t, '  "famous-strategies/cross-sectional-momentum.html",', '  "famous-strategies/cross-sectional-momentum.html",\n  "%s",' % href[1:], p)
        open(p, "w").write(t)


if __name__ == "__main__":
    for slug in sys.argv[1:]:
        path = os.path.join(ROOT, "_docs", "fs_specs", slug.replace("-", "_") + ".py")
        spc = importlib.util.spec_from_file_location("spec_" + slug.replace("-", "_"), path)
        mod = importlib.util.module_from_spec(spc)
        sys.path.insert(0, os.path.join(ROOT, "_docs"))
        spc.loader.exec_module(mod)
        build(mod.SPEC)
        register(mod.SPEC)
        print("built", slug)
