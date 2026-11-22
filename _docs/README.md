# thetrademethod.com — site folder

Everything for the site lives here. One rule governs uploading:

> **Upload everything EXCEPT `_docs/`.**

`_docs/` holds build tools and specs that should never be publicly
reachable. An underscore prefix doesn't stop Apache from serving a file,
so this only works because you leave the folder behind.

---

## Two files you need to add

This zip deliberately does **not** include these, so it can't overwrite
the versions you already have:

1. **`css/strategy.css`** — your existing design system.
2. **`_docs/_template.html`** — your existing setup-page template.

Copy both in before doing anything else. Then move your
`pmh-break-setup.html` to `setups/pmh-break.html` — the `href` in
`js/nav.js` already points there.

---

## Layout

    thetrademethod/
    ├── _docs/                 ← NEVER UPLOADED
    │   ├── _template.html     ← YOU ADD THIS
    │   ├── DESIGN.md          ← copy yours in
    │   ├── build-sitemap.js
    │   ├── seo-check.py       ← runs before every deploy
    │   ├── stamp-dates.py     ← real last-updated dates from git
    │   └── README.md
    ├── index.html             ← the directory page
    ├── 404.html
    ├── .htaccess
    ├── robots.txt
    ├── sitemap.xml            ← generated, don't hand-edit
    ├── favicon.ico
    ├── css/
    │   ├── strategy.css       ← YOU ADD THIS
    │   └── directory.css
    ├── js/
    │   └── nav.js             ← THE REGISTRY. Edit this to add pages.
    ├── setups/
    │   └── pmh-break.html     ← YOU MOVE THIS IN
    ├── pine/                  ← .pine files offered as downloads
    └── assets/
        ├── og-image.png
        └── apple-touch-icon.png

---

## Two edits to every setup page

In the head, after the strategy.css link:

    <link rel="stylesheet" href="/css/directory.css">
    <script src="/js/nav.js" defer></script>

Then replace the hand-written nav block with the empty mount, and add
the indicator section wherever you want it on the page:

    <nav class="sitenav" data-sitenav aria-label="Setups"></nav>

    <section class="ind" data-indicators></section>

Make these edits to `_docs/_template.html` too and every future page
inherits them. A setup with `indicators: []` renders nothing and hides
the section, so the line is harmless on pages that have none.

---

## Adding a setup

1. Copy `_docs/_template.html` to `setups/your-slug.html`, write it.
2. Add one entry to the `SETUPS` array in `js/nav.js`, including its
   `indicators`.
3. Run `node _docs/build-sitemap.js` then `python3 _docs/stamp-dates.py`
   to refresh `sitemap.xml` (the deploy also does this, with dates taken
   from git, and rebuilds the search index).
4. Run `python3 _docs/seo-check.py`. It must show 0 errors, or the
   deploy stops (the deploy workflow runs the same check first). Keep it
   at 0 warnings too: titles 70 characters or less, descriptions 120-160.
5. Upload the changed files.

Keep `status: "draft"` while writing. The page is live on the server but
stays out of the nav, the directory, the counts, and the sitemap until
you set it to `"live"`.

---

## Indicators

Each setup carries its own `indicators` array in the registry:

    indicators: [
      {
        name:  "PMH Break — Levels",
        blurb: "One line on what it draws.",
        url:   "https://www.tradingview.com/script/XXXXXXXX/",
        file:  "/pine/pmh-break-levels.pine",
        alerts: true
      }
    ]

- `url` — published TradingView script. Empty shows "Link pending"
  instead of a dead link.
- `file` — optional. Drop the .pine in `/pine/` and the card gets a
  second, download link.
- `alerts` — true shows the alerts tag on the card.

---

## Preview locally

Root-relative paths won't resolve from a `file://` URL — the nav will
render empty and you'll think the script is broken. From this folder:

    python3 -m http.server 8000

Then open http://localhost:8000

---

## Uploading

Upload the **contents** of this folder into `public_html`, not the
folder itself. Skip `_docs/`. If `index.html` ends up inside a
subfolder, every root-relative path breaks.

After the first upload: Site Tools → Security → SSL Manager to install
Let's Encrypt, then Security → HTTPS Enforce to force it. If styles look
stale after a later change, clear Speed → Caching.
