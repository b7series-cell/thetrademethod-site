# The Trade Method: project reference

Private reference for thetrademethod.com. It lives in `_docs/`, which is never uploaded to the server, so it is not public.

Last updated: 2026-11-16 (Stacked Imbalances page).

Look and feel (colors, type, layout, motion, copy voice) is covered in the separate style guide: `/mnt/project-files/style-guide/thetrademethod-style-guide.md` (Oct 27, 2026). This document does not repeat it.

---

## 1. What the site is

- **thetrademethod.com** is Bryant's stock trading education site: trading setups and trading fundamentals, each taught through animated, step-by-step chart walkthroughs.
- Plain static HTML, one shared stylesheet (`css/apple.css`), small vanilla JS files. No framework and no build step for the pages themselves.
- Dark, Apple product-page look. Setup and fundamentals pages use the "Bold" poster style (huge headlines, big green step numbers on alternating bands, filter cards with a red top edge).
- Public and indexed for search and AI answer engines since 2026-10-10 (earlier it was personal use only).
- Installable as an app (PWA) since 2026-10-29.
- Sister sites linked from the nav: **Trade Review** (journal.thetrademethod.com), **Volendar** (volendar.com), **Backtest Board** (backtestboard.com).

Counts today: **26 setup pages**, **19 fundamentals pages**, **1 blog post**, plus home, /setups/, /fundamentals/, /blog/, contact, 404 and offline pages. **17 Pine indicators** in `/pine/`.

---

## 2. Where things live

| What | Where |
|---|---|
| Source of truth | GitHub repo `b7series-cell/thetrademethod-site`, branch `main` |
| Live server | SiteGround, `~/www/thetrademethod.com/public_html/` |
| Old Drive folder | `G:\My Drive\BK-Desktop\Claude\thetrademethod` (stale since 2026-11-13, not the source anymore) |
| Project shared files | `/mnt/project-files/` (old upload copies under `site-push/`, style guide, hero concepts) |
| Backtest Board lab data | `C:\Claude\Evaluation` on Bryant's PC |
| Build list spreadsheet | `_docs/thetrademethod-build-list.xlsx` (audited Oct 11, 2026; not kept up since) |

### Key files

| File | Job |
|---|---|
| `js/nav.js` | **Setup registry** (`SETUPS` array): title, session, side, thesis, indicators. Feeds the setup nav, homepage cards, /setups/ page, search and each page's indicator block. |
| `js/site.js` | Global nav, local nav, footer, search, `FUNDAMENTALS` and `POSTS` arrays, /setups/ and /fundamentals/ filters. Sister-site URLs (Trade Review, Volendar, `BACKTEST_URL`). `SEARCH_INDEX_URL`. |
| `js/candle-bg.js` + `css/candle-bg.css` | Animated hero background on every content page. `SCENES` table keyed by page slug; header carries `data-candle-bg="<slug>"`. |
| `js/search-index.js` | Built search index (descriptions + h2/h3 headings). Generated, don't hand-edit. |
| `js/anim-kit.js` | Shared helpers for the older walkthrough animations. |
| `js/live-kit.js`, `js/<key>-live.js` | Live chart engine per setup. |
| `js/example-kit.js`, `js/examples/<key>.js` | Made-up example bars that the live charts run on today. |
| `css/hero2.css`, `js/hero2-anim.js` | Homepage hero, concept 2 "Opening bell". Concept 1 (`hero.css`, `hero-anim.js`) left in place, unused. |
| `sw.js`, `manifest.webmanifest`, `offline.html` | PWA. `CACHE_VERSION` in sw.js (now `2026-10-29-1`). |
| `api/bars.php` | Massive (formerly Polygon.io) bars proxy with cache. Private-preview token gate. |
| `api/config.php` | Massive key + preview token. **Server only, not in git.** Template: `api/config.sample.php`. |
| `api/contact.php` | Contact form mailer (`CONTACT_TO` at the top). Logs to `api/cache/contact/messages.jsonl`. |
| `api/em-chain.php` | Expected Move options chain (needs an options plan; returns 402 without one). |
| `api/*-backtest.php`, `js/*-backtest.js` | Backtest panels on PMH, CRT, Cup, Fashionably Late, Volume Profile, Volume S/R, Zero Lag. |
| `llms.txt`, `robots.txt`, `sitemap.xml` | AI and search crawler files. |
| `.htaccess` | www to apex 301, expected-move-v2/v3 301s, 404 page, .pine as text, no folder listing. |
| `_docs/build-sitemap.js` | Rebuilds `sitemap.xml` (`EXTRA_PAGES` lists non-setup pages). |
| `_docs/build-search-index.js` | Rebuilds `js/search-index.js` (`PAGES` list). |
| `_docs/blog-post-template.html` | Starting point for blog posts, with the add-a-post checklist in its header comment. |
| `_docs/sw-kill.js` | Emergency service worker kill switch (upload as `sw.js` if the app ever breaks). |

---

## 3. Deploy

- **Push to `main` = publish.** `.github/workflows/deploy.yml` rsyncs over SSH (port 18765) to SiteGround, then flushes the SiteGround cache.
- Work goes on a branch, then a pull request, then merge. The merge deploys.
- **Upload only, nothing deleted.** A retired file has to be removed from `public_html` by hand.
- Never uploaded: `_docs/`, `.github/`, `.gitignore`, `DEPLOY.md`.
- Never touched on the server: `api/config.php`, `api/cache/`, `.well-known/`.
- `[skip ci]` in a commit message skips the deploy.
- Dry run: Actions > Deploy to SiteGround > Run workflow > tick "Only list what would upload". From a Claude session (GraphQL is blocked, so `gh workflow run` fails):
  `gh api -X POST repos/b7series-cell/thetrademethod-site/actions/workflows/deploy.yml/dispatches -f ref=main -f 'inputs[dry_run]=true'`
- Repo secrets: `SG_HOST`, `SG_USER`, `SG_SSH_KEY`, `SG_SSH_PASSPHRASE` (SiteGround key "github-deploy").
- Cloud sessions can curl thetrademethod.com to check a deploy went live.
- WinSCP is no longer used (retired 2026-11-13).

---

## 4. Adding a new page: checklist

### Every new page
1. **SEO head block**: title ending `| The Trade Method`, meta description, robots index/follow, canonical `https://thetrademethod.com/...` (no www), og/twitter tags with `/assets/og-image.png`, favicon links, JSON-LD (Article on content pages). Copy it from a recent page.
2. **PWA head lines**: manifest link + theme-color metas (copy from a recent page).
3. Current `site.js?v=` and `apple.css?v=` (see section 5).
4. **llms.txt**: one line under the right heading with the page's meta description.
5. **Sitemap**: setups are picked up from nav.js; other pages go in `EXTRA_PAGES` in `_docs/build-sitemap.js`. Run `node _docs/build-sitemap.js`.
6. **Search index**: add to `PAGES` in `_docs/build-search-index.js` if needed, run `node _docs/build-search-index.js`, bump `SEARCH_INDEX_URL ?v=` in site.js, then bump `site.js?v=` on **every** page.
7. **Hero scene**: add a scene to `SCENES` in `js/candle-bg.js` under the page slug, put `data-candle-bg="<slug>"` on `<header class="top">`, bump `candle-bg.js?v=` on that page.
8. Animation script `js/<short>-anim.js?v=1` that **redraws narrow under ~640px** and gives `.anim` about 44px above / 60px below on screens under 680px (Bryant's standing mobile rule).
9. Check phones (320 to 760px) for no sideways scroll and no cramped animation.

### Setup page extras
- Add an entry to `SETUPS` in `js/nav.js` (with `indicators`), then bump `nav.js?v=` on every page.
- Pine indicator (if any) in `/pine/<slug>.pine`, listed in the setup's `indicators`.
- If it has a live chart: add `js/examples/<key>.js` and keep `data-example` on the chart section.

### Fundamentals page extras
- Add an entry to `FUNDAMENTALS` in `js/site.js` (`kind` is "Type · count"; the word before " · " becomes the filter chip on /fundamentals/).

### Blog post extras
- Start from `_docs/blog-post-template.html` (citable-article format, section 8).
- Add to `POSTS` in site.js, a card + JSON-LD entry in `blog/index.html`, `EXTRA_PAGES` and `PAGES` in both build scripts, a line under "## Blog" in llms.txt.

### Static copies to remember
- `/setups/` and `/fundamentals/` HTML hold a static card copy for crawlers; JS replaces it, so visitors always see the live list. Regenerate only if crawl freshness matters.

---

## 5. Current version numbers

Check before bumping; these are the values on `main` as of 2026-11-16.

| Asset | Current | Next bump |
|---|---|---|
| `site.js` (all pages) | `?v=37` | 38 |
| `nav.js` (all pages) | `?v=23` | 24 |
| `apple.css` (all pages) | `?v=23` | 24 |
| `SEARCH_INDEX_URL` in site.js | `search-index.js?v=16` | 17 |
| `candle-bg.js` (newest page) | `?v=25` (stacked-imbalances.html) | 26 |
| `sw.js` `CACHE_VERSION` | `2026-10-29-1` | only for unversioned file or sw rule changes |

`candle-bg.js` is bumped only on the page that got a new scene, so older pages still load older `?v=` numbers. That's fine. `expected-move-v2.html` and `-v3.html` are 301-redirected and stay on old versions.

---

## 6. Live data and example charts

- Market data comes from **Massive** (formerly Polygon.io), Stocks Starter plan, through `api/bars.php` with a server cache. Recommendation on 2026-10-15 was to stay on Massive rather than Yahoo Finance.
- The data is a **private preview**: bars need `?preview=TOKEN` (stored in localStorage after the first visit). Keep `'public' => false` in config.php until the data license allows public display.
- **Since 2026-10-15 every setup-page chart runs on made-up example bars** that show the setup working once, cleanly. Knock Twice has its own example mode (`kt-example.js`); the others load `js/examples/<key>.js` + `js/example-kit.js`, which intercepts the /api/ calls, hides the symbol picker, and labels the chart EXAMPLE.
- To put a page back on live data: remove `data-example` from its chart section. The live code is untouched.
- Expected Move uses live bars for the private preview and falls back to seeded example bars labelled "Example data" for public visitors.
- `robots.txt` disallows `/api/` so crawlers don't spend API calls.

---

## 7. Setup pages (26)

All live charts below run on example bars. "Pine" = indicator in `/pine/`.

| Page | URL | Source | Animation / chart files | Pine | Notes |
|---|---|---|---|---|---|
| Premarket High Break | /setups/pmh-break.html | [CAAIzHsKsYM](https://www.youtube.com/watch?v=CAAIzHsKsYM) | pmh-anim, pmh-live, pmh-backtest | pmh-prior-levels | Click-through stepper since 2026-10-18 |
| Market Memory (Day Two) | /setups/market-memory.html | [y_ujkIcs6so](https://www.youtube.com/watch?v=y_ujkIcs6so) | mm-anim, mm-live | none | |
| Fashionably Late | /setups/fashionably-late.html | [zm4ehSDIr0k](https://www.youtube.com/watch?v=zm4ehSDIr0k) | fl-anim, fl-live, fl-backtest | ema-vwap-reversal-cross | |
| Energy in the Tank | /setups/energy-in-the-tank.html | [pyS_jw8ygJo](https://www.youtube.com/watch?v=pyS_jw8ygJo) | eit-anim, eit-live | none | Daily chart |
| Opening Range Break | /setups/opening-range-break.html | [KFqSicS7HOo](https://www.youtube.com/watch?v=KFqSicS7HOo) | orb-anim, orb-live | none | |
| Day Three Breakout | /setups/day-three-breakout.html | [wpPHULhcsn4](https://www.youtube.com/watch?v=wpPHULhcsn4) | d3b-anim, d3b-live | none | Daily chart |
| 9 EMA Continuation | /setups/nine-ema-continuation.html | [LDavMu7hxcM](https://www.youtube.com/watch?v=LDavMu7hxcM) | ema9-anim, ema9-live | none | |
| MACD Continuation Scalp | /setups/macd-continuation-scalp.html | [t7XAyKAUvFA](https://www.youtube.com/watch?v=t7XAyKAUvFA) | macd-anim, macd-live | none | |
| VWAP Reversal | /setups/vwap-reversal.html | [NUr1P-Y_2-M](https://www.youtube.com/watch?v=NUr1P-Y_2-M) | vwapr-anim, vwapr-live | none | |
| ATR Hybrid Scalp | /setups/atr-band-hybrid.html | [snaP5117MxI](https://www.youtube.com/watch?v=snaP5117MxI) | atr-anim, atr-live | none | |
| Cup and Handle | /setups/cup-and-handle.html | [mExyCQrddTU](https://www.youtube.com/watch?v=mExyCQrddTU) | cup-anim, cup-live, cup-backtest | cup-and-handle | Daily chart |
| Three-Candle CRT | /setups/three-candle-crt.html | [z1Z72VJGt08](https://www.youtube.com/watch?v=z1Z72VJGt08) | crt-anim, crt-live, crt-backtest | three-candle-crt | |
| Volume Profile System | /setups/volume-profile-system.html | [Xa2fB097ajs](https://www.youtube.com/watch?v=Xa2fB097ajs) | vp-anim, vp-live, vp-backtest | volume-profile-system | First live chart (QQQ 2-min) |
| Volume S/R Rejection | /setups/volume-sr-rejection.html | [_zOUP0NbIZ8](https://www.youtube.com/watch?v=_zOUP0NbIZ8) | vsr-anim, vsr-live, vsr-backtest | volume-sr-rejection | |
| GEX Levels | /setups/gex-levels.html | no video link on page | gex-anim, gex-live | gex-levels | |
| Zero Lag Pullback | /setups/zero-lag-pullback.html | [BxrBkkarQzQ](https://www.youtube.com/watch?v=BxrBkkarQzQ) | zl-anim, zl-live, zl-backtest | zero-lag-pullback | |
| Knock Twice | /setups/knock-twice.html | Bryant's "Valid BOS Pullback v2" indicator | kt-anim, kt-live, kt-example | knock-twice | Entry on the knock (retest), not the BOS. 2026-10-14 |
| Silver Bullet (ICT) | /setups/silver-bullet.html | [GXFP4-zYAFs](https://www.youtube.com/watch?v=GXFP4-zYAFs) + Silver Bullet [GBB] Pine | sb-anim, sb-live | silver-bullet | Keeps the study's losing results. 2026-10-14 |
| Gap Give and Go | /setups/gap-give-and-go.html | SMB Capital [xYUto1XlJwA](https://www.youtube.com/watch?v=xYUto1XlJwA) (DKNG) | gg-anim | none | First click-through stepper. 2026-10-18 |
| Qullamaggie Breakout | /setups/qullamaggie.html | Researched (Kristjan Kullamägi), no video | qm-anim | none | Breakout + EP + parabolic short. 2026-10-20 |
| QQE Mod + EMA 50 | /setups/qqe-mod.html | [KIzoAvjwTGY](https://www.youtube.com/watch?v=KIzoAvjwTGY) + Bryant's QQE MOD Pine | qqe-anim (JS port of the Pine) | qqe-mod-ema50, qqe-mod | 2026-10-21 |
| Technical Catalyst Breakout | /setups/technical-catalyst-breakout.html | SMB [M1o0XqCaDiE](https://www.youtube.com/watch?v=M1o0XqCaDiE) (ETHA 19.12) | tc-anim | technical-catalyst-breakout | 8-step stepper. 2026-10-24 |
| Anchored VWAP | /setups/anchored-vwap.html | SMB [-IemlUcvRDE](https://www.youtube.com/watch?v=-IemlUcvRDE) | av-anim | none | 2026-10-27 |
| The Strat | /setups/the-strat.html | [i4UzNsv-7Dc](https://www.youtube.com/watch?v=i4UzNsv-7Dc) | ts-anim | none | 2026-11-01 |
| Hitchhiker Scalp | /setups/hitchhiker-scalp.html | SMB [jtREhq_9j8k](https://www.youtube.com/watch?v=jtREhq_9j8k) (SOXL) | hh-anim | hitchhiker-scalp | 2026-11-04 |
| Liquidity Refill | /setups/liquidity-refill.html | quant Philip [CUFpKkBnrp8](https://www.youtube.com/watch?v=CUFpKkBnrp8) | lr-anim | liquidity-refill | 2026-11-11 |

Other Pine files: `cumulative-rvol.pine` (Relative Volume), `let-winners-run-exits.pine` (Let Winners Run).

---

## 8. Fundamentals pages (20)

| Page | URL | Source | Animation files | Notes |
|---|---|---|---|---|
| Inch Wide, Mile Deep (Edge) | /edge.html | [Yl8-N3DznAo](https://www.youtube.com/watch?v=Yl8-N3DznAo) | edge-anim, edgestop-anim | |
| Support & Resistance Mistakes | /mistakes.html | [QjMeWsHgN3Y](https://www.youtube.com/watch?v=QjMeWsHgN3Y) | mis-anim, mislook-anim | |
| Three Price Action Rules | /price-action-rules.html | [ogpH__Llx_0](https://www.youtube.com/watch?v=ogpH__Llx_0) | par-anim | |
| Trailing Stop Exits | /trailing-stops.html | [P-8-JDnwyno](https://www.youtube.com/watch?v=P-8-JDnwyno) | ts-anim, tstrap-anim, tscombo-anim | |
| Let Winners Run | /let-winners-run.html | [hZZUEBCb5eE](https://www.youtube.com/watch?v=hZZUEBCb5eE) | lwr-anim, lwrside-anim | Older fixed-width SVG (scrolls sideways on phones) |
| Relative Volume | /relative-volume.html | [CvRwUoDZiog](https://www.youtube.com/watch?v=CvRwUoDZiog) | rvol-anim | Reference for the narrow-phone redraw pattern |
| Six Momentum Trades | /six-momentum-trades.html | [h6KnW-ahzbU](https://www.youtube.com/watch?v=h6KnW-ahzbU) | mt-anim | 2026-10-17 |
| Four Pillars | /four-pillars.html | [YGOLslescrk](https://www.youtube.com/watch?v=YGOLslescrk) | fp-anim | 2026-10-17 |
| Covered Calls | /covered-calls.html | [D5Rjx_7XG2U](https://www.youtube.com/watch?v=D5Rjx_7XG2U) (INTC numbers) | cc-anim | First options page. 2026-10-17 |
| Expected Move | /expected-move.html | [Lhv3wiPv6Ok](https://www.youtube.com/watch?v=Lhv3wiPv6Ok) | em3-anim, em-dash, api/em-chain.php | v3 dashboard, default since 2026-10-18 |
| Get Better Faster | /get-better-faster.html | [XF1usbFkA2w](https://www.youtube.com/watch?v=XF1usbFkA2w) | gbf-anim | 2026-10-21 |
| Dynamic Risk Sizing | /dynamic-risk-sizing.html | SMB [uoI00PCobl4](https://www.youtube.com/watch?v=uoI00PCobl4) | drs-anim | Sam vs Jack, A+/A/B/C. 2026-10-23 |
| Order Flow for Beginners | /order-flow.html | Trader Dale [93QSoSMjOxs](https://www.youtube.com/watch?v=93QSoSMjOxs) + Golden Ticket book | of-anim | 2026-11-04 |
| Linda Raschke's Trading Rules | /linda-raschke.html | Interview [caLSbXnkaj4](https://www.youtube.com/watch?v=caLSbXnkaj4) | raschke-anim | 2026-11-11 |
| How to Trade Earnings | /trading-earnings.html | SMB [FQIH6o18y9g](https://www.youtube.com/watch?v=FQIH6o18y9g) | earn-anim | 2026-11-11 |
| Seven Trading Traps | /seven-trading-traps.html | SMB [KwHx3Rp25nw](https://www.youtube.com/watch?v=KwHx3Rp25nw) | traps-anim | 2026-11-11 |
| Auction Market Theory | /auction-market-theory.html | Fabio Valentini [VHhvg96W6lc](https://www.youtube.com/watch?v=VHhvg96W6lc) | amt-anim | 2026-11-13 |
| Thesis to Trade | /thesis-to-trade.html | Vincent Desiano [JjlxYYMPIMc](https://www.youtube.com/watch?v=JjlxYYMPIMc) | ttt-anim | 2026-11-14, PR #1 |
| Pyramiding Into Winners | /pyramiding.html | SMB [9tVfd-I4VAY](https://www.youtube.com/watch?v=9tVfd-I4VAY) | pyr-anim | 2026-11-14, PR #4 |
| Stacked Imbalances | /stacked-imbalances.html | Orderflows [q3afc_rvvYg](https://www.youtube.com/watch?v=q3afc_rvvYg) + Futures Flow [y7KuTf4hesY](https://www.youtube.com/watch?v=y7KuTf4hesY) | si-anim | 2026-11-16 (PR #6, second video PR #7). Diagonal 4:1 and horizontal 400% |

### Other pages
- **Home** `/` (index.html): Opening bell hero, setups and fundamentals grids with links to the hub pages.
- **/setups/** and **/fundamentals/**: filterable lists (session, side, type), filters kept in the URL.
- **/blog/**: one post, *Do TradingView indicators beat random entries?* (`/blog/introducing-backtest-board.html`, 2026-10-31). Styles in `css/blog.css`.
- **/contact.html**: contact form (honeypot, fill-time and rate limits; spam gets a fake "sent").
- **404.html** (noindex), **offline.html** (PWA).

---

## 9. Bryant's preferences

### Layout
- No empty open areas on desktop next to step lists. He picked the **click-through stepper** (steps beside a chart that changes per step) on Gap Give and Go and PMH Break. Use it for new step-based pages.
- Phones: animations must not feel packed between sections. Redraw narrow under ~640px; roughly 44px above and 60px below `.anim` under 680px. Desktop is fine as is.
- Keep extra space below the homepage hero on phones (`.cine + .band` 88px).
- Nav must not overflow at any width from 320 to 1280px; check after every nav change.

### Content and writing
- Each setup or fundamentals page is built from a source (usually a YouTube video), keeping the source's own numbers and examples where it has them. Made-up numbers are labelled as examples.
- Be honest: keep losing results when a study shows them (Silver Bullet), say when data is illustrative.
- Plain, short, first-person copy.
- Blog posts follow the **citable article** format: H1 = the reader's exact question, a 40 to 80 word direct answer, an "In this article" AI summary box, neutral data-backed body, 1 or 2 authoritative quotes, chunked sections, visible metadata and a "By Bryant" byline.

### How to read his requests
- "Remove X" (live API, testing, Massive) means **remove the wording**, not the feature. Never delete working charts, scripts or API files unless he names them. Ask if unclear.
- New client robots.txt / llms.txt work belongs in his separate "Robots.txt and LLMS.txt" project, not here.

### Working notes for Claude sessions
- YouTube is blocked from the cloud container and the PC shell. Use Claude in Chrome: open the video, click "Show transcript", read the transcript segments. Just-ended live streams have no captions for hours.
- Make changes in the repo on a branch and open a pull request; merging to main publishes.

---

## 10. Revisions (change log)

Newest first. Dates are when the change was built or shipped.

| Date | Change |
|---|---|
| 2026-11-16 | Stacked Imbalances: second video (Futures Flow) folded in: where the stack sits in the candle, passive orders/trapped traders, large-participant trigger (128 lots), S/R flip. Two new walkthroughs (`where`, `trigger`), si-anim ?v=2, site.js ?v=37, search-index ?v=16. |
| 2026-11-16 | **Stacked Imbalances** fundamentals page (Orderflows video): diagonal 4:1 imbalances, stacks of 3+, payroll long 3,974/3,973 to 3,994, four outcomes, 3,921–22 short. site.js ?v=36, search-index ?v=15, candle-bg ?v=25. This reference committed to the repo. |
| 2026-11-15 | This project reference added to `_docs/`. |
| 2026-11-14 | **Pyramiding Into Winners** fundamentals page (PR #4): 1R then 0.5R/0.25R/0.1R adds, AMD + CBRS. site.js ?v=35, search-index ?v=14, candle-bg ?v=24. |
| 2026-11-14 | Thesis to Trade: S tier explanation added (PR #2), then reverted (PR #3). |
| 2026-11-14 | **Thesis to Trade** fundamentals page (PR #1), first page shipped through GitHub. site.js ?v=34. |
| 2026-11-13 | **Moved deploy to GitHub**: repo imported (233 files), Actions deploy to SiteGround replaces WinSCP. Leftover public `_docs/` deleted from the server. |
| 2026-11-13 | **Auction Market Theory** fundamentals page. site.js ?v=33 on all 50 pages. |
| 2026-11-11 | **Seven Trading Traps**, **How to Trade Earnings** and **Linda Raschke's Trading Rules** fundamentals pages. site.js up to ?v=31/32. |
| 2026-11-11 | **Liquidity Refill** setup page + Pine indicator (15 indicators then). nav.js ?v=23. |
| 2026-11-04 | **Order Flow for Beginners** fundamentals page. site.js ?v=28. |
| 2026-11-04 | **Hitchhiker Scalp** setup page + Pine. nav.js ?v=21. |
| 2026-11-01 | **The Strat** setup page. nav.js ?v=19, site.js ?v=25. |
| 2026-10-31 | **Blog** section and first post (citable-article format, polished to ~9.7/10). Blog nav link hides at 760px and below. |
| 2026-10-31 | **Contact form** (/contact.html + api/contact.php), footer link. |
| 2026-10-31 | **Backtest Board** pill in the top nav and footer; phone nav tightened. |
| 2026-10-30 | **Site search** (magnifier, "/" or Ctrl/Cmd K) with built search index. |
| 2026-10-29 | Site became an **installable app (PWA)**: sw.js, manifest, offline page, kill switch. |
| 2026-10-27 | **Anchored VWAP** setup page. nav.js ?v=18. |
| 2026-10-27 | Visual style guide written (`/mnt/project-files/style-guide/`). |
| 2026-10-26 | **Volendar** link beside Trade Review in the nav and footer. |
| 2026-10-24 | **Technical Catalyst Breakout** setup page + Pine. nav.js ?v=17. |
| 2026-10-23 | **Dynamic Risk Sizing** fundamentals page. |
| 2026-10-21 | **QQE Mod + EMA 50** setup page + combined Pine. nav.js ?v=15. |
| 2026-10-21 | **Get Better Faster** fundamentals page. |
| 2026-10-21 | Standalone **/setups/** and **/fundamentals/** pages with filters. |
| 2026-10-20 | **Qullamaggie Breakout** setup page. nav.js ?v=13. |
| 2026-10-18 | **Gap Give and Go** setup page (first click-through stepper). nav.js ?v=12. |
| 2026-10-18 | **PMH Break** steps turned into a click-through stepper. |
| 2026-10-18 | **Expected Move v3** dashboard made the default page; v1/v2 removed, v2/v3 URLs 301 to it. |
| 2026-10-17 | **Six Momentum Trades**, **Four Pillars**, **Covered Calls** (first options page) and **Expected Move** fundamentals pages. |
| 2026-10-15 | All setup-page charts switched to **made-up example bars**. Decided to stay on Massive rather than Yahoo Finance. |
| 2026-10-15 | Client robots.txt / llms.txt work moved to its own project. |
| 2026-10-14 | **Knock Twice** and **Silver Bullet** setup pages. |
| 2026-10-14 | **AI search**: robots.txt names AI crawlers; llms.txt lists every page. |
| 2026-10-13 | Homepage hero switched to concept 2 **"Opening bell"**. |
| 2026-10-13 | Every setup and fundamentals page got its **own animated hero scene** (candle-bg.js SCENES). |
| 2026-10-13 | "Remove live API / testing" request: wording removed, charts kept (they were briefly taken off and restored the same day). |
| 2026-10-11 | Animation + live chart added to Market Memory, Energy in the Tank, ORB, Day Three, 9 EMA, MACD, VWAP Reversal and ATR Hybrid; extra animations on the six original fundamentals pages. Build list spreadsheet audited. |
| 2026-10-10 | **SEO**: head block on every page, sitemap, robots, www to apex redirect. Site now meant to be public. Mobile animation spacing rule set (relative-volume as reference). |
| 2026-10 (early) | Apple product-page redesign; "Bold" style chosen for content pages. Site folder moved to Google Drive. Live charts added with Massive data, starting with Volume Profile System (QQQ 2-min). Trade Review site created at journal.thetrademethod.com. |
| Before 2026-10-08 | Original setup pages (PMH Break, Fashionably Late, Cup and Handle, CRT, Volume Profile, Volume S/R, Zero Lag, GEX, Market Memory, Energy in the Tank, ORB, Day Three, 9 EMA, MACD, VWAP Reversal, ATR Hybrid) and fundamentals pages (Edge, Mistakes, Price Action Rules, Trailing Stops, Let Winners Run, Relative Volume) built in the original claude.ai project. |

When something ships, add a row at the top of this table.

---

## 11. Open items and ideas

- **Traffic growth** (parked 2026-10-17): Search Console / Bing, TradingView Pine scripts, short videos, Reddit, email lead magnet, more pages. Resume in the "Getting more site traffic" thread.
- **Interactive fundamentals ideas** (build list, none started): edge simulator, bar-by-bar replay, expectancy sliders, trail-style switcher, live RVOL, break-or-fake quiz, position-size calculator, end-of-page self-checks.
- Pages from the older fixed-width animation style (e.g. Let Winners Run) may still scroll sideways on phones.
- Setup pages with empty desktop space next to their step lists could get the click-through stepper.
- `expected-move-v2.html` / `-v3.html` are still in the repo (301-redirected on the server).
- `_docs/README.md` and `_docs/DESIGN.md` are from the very first build and are out of date; this file and the style guide replace them.
