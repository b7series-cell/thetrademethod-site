#!/usr/bin/env python3
"""
add-faq.py

Writes the plain definition and the Questions section from
_docs/faq_data.py into each listed page, plus FAQPage JSON-LD.
Safe to run any number of times (everything sits between markers).

    python3 _docs/add-faq.py
"""
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "_docs"))
from faq_data import FAQ  # noqa: E402

DEF_RE = re.compile(r'\n  <!-- define -->.*?<!-- /define -->', re.S)
FAQ_RE = re.compile(r'\n  <!-- faq -->.*?<!-- /faq -->', re.S)
LD_RE = re.compile(r'\n<!-- faq-ld -->.*?<!-- /faq-ld -->', re.S)
e = lambda s: html.escape(s, quote=False)


def main():
    for href, d in FAQ.items():
        f = os.path.join(ROOT, href.lstrip("/"))
        src = open(f, encoding="utf-8").read()
        orig = src
        src = LD_RE.sub("", DEF_RE.sub("", FAQ_RE.sub("", src)))

        define = ('\n  <!-- define --><section class="define" id="what-is" aria-labelledby="what-is-h">'
                  '<h2 id="what-is-h">%s</h2><p>%s</p></section><!-- /define -->' % (e(d["q"]), e(d["a"])))
        k = src.index("</header>") + len("</header>")
        src = src[:k] + define + src[k:]

        items = "".join('\n    <div class="qa"><h3>%s</h3><p>%s</p></div>' % (e(q), e(a)) for q, a in d["faq"])
        faq = ('\n  <!-- faq --><div class="section-head" id="faq"><h2>Questions</h2></div>'
               '\n  <div class="faq">%s\n  </div><!-- /faq -->' % items)
        k = src.index("\n  <!-- related -->") if "\n  <!-- related -->" in src else src.rindex('\n  <div class="rule">')
        src = src[:k] + faq + src[k:]

        ld = {"@context": "https://schema.org", "@type": "FAQPage",
              "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                             for q, a in [(d["q"], d["a"])] + d["faq"]]}
        block = json.dumps(ld, indent=1, ensure_ascii=False).replace("</", "<\\/")
        anchor = "\n<!-- breadcrumbs -->" if "\n<!-- breadcrumbs -->" in src else "\n</head>"
        src = src.replace(anchor, '\n<!-- faq-ld --><script type="application/ld+json">\n%s\n</script><!-- /faq-ld -->' % block + anchor, 1)

        if src != orig:
            open(f, "w", encoding="utf-8").write(src)
            print("updated", href)


if __name__ == "__main__":
    main()
