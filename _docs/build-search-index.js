/* =====================================================================
   build-search-index.js — writes js/search-index.js for the site search.

   Run from the site root after adding or changing a page:
     node _docs/build-search-index.js
   then bump search-index.js?v= in SEARCH_INDEX_URL at the top of
   js/site.js, so the app cache picks up the new copy.

   Reads every setup page in /setups/ and every page in PAGES below (the
   /setups/ and /fundamentals/ lists are left out on purpose: their
   headings are every other page's name) and
   keeps the page title, meta description and section headings (h2/h3).
   Setups and fundamentals still show in search without this file
   (js/site.js searches SETUPS and FUNDAMENTALS directly); the index
   adds descriptions and section-level hits.
   ===================================================================== */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PAGES = [
  "edge.html", "mistakes.html", "price-action-rules.html", "trailing-stops.html",
  "let-winners-run.html", "relative-volume.html", "six-momentum-trades.html",
  "four-pillars.html", "get-better-faster.html", "dynamic-risk-sizing.html", "order-flow.html", "linda-raschke.html", "trading-earnings.html", "seven-trading-traps.html", "auction-market-theory.html", "thesis-to-trade.html", "pyramiding.html", "stacked-imbalances.html", "level-radar.html", "seven-cheat-codes.html", "eight-trading-rules.html", "24-hour-stock-trading.html", "tested-results.html",
  "famous-strategies/cross-sectional-momentum.html",
  "famous-strategies/overnight-effect.html",
  "famous-strategies/turn-of-the-month.html",
  "famous-strategies/intraday-momentum.html",
  "famous-strategies/rsi-2.html",
  "famous-strategies/sector-rotation.html",
  "famous-strategies/dual-momentum.html",
  "famous-strategies/ten-month-sma.html",
  "famous-strategies/opening-range-breakout.html",
  "famous-strategies/can-slim.html",
  "famous-strategies/low-volatility.html",
  "famous-strategies/value-and-size.html",
  "famous-strategies/magic-formula.html",
  "famous-strategies/pairs-trading.html",
  "famous-strategies/post-earnings-drift.html",
  "covered-calls.html", "expected-move.html",
  "blog/how-23-hour-stock-trading-works.html", "blog/introducing-backtest-board.html", "contact.html", "about.html", "privacy.html"
];

const SKIP = /^(watch the video|on this page)$/i;   // headings every page has

function text(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&middot;/g, "·").replace(/&rsaquo;/g, "")
    .replace(/&#x([0-9a-f]+);/gi, function (m, h) { return String.fromCharCode(parseInt(h, 16)); })
    .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(+d); })
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ").trim();
}

function page(file) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<footer[\s\S]*?<\/footer>/gi, "");
  const title = text((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").replace(/\s*\|\s*The Trade Method$/, "");
  const desc = text((html.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || "");
  const seen = {};
  const heads = [];
  (body.match(/<h[23][^>]*>[\s\S]*?<\/h[23]>/gi) || []).forEach(function (h) {
    const t = text(h).replace(/^\d+\s+/, "").replace(/[.:]$/, "");
    const k = t.toLowerCase();
    if (t.length < 3 || t.length > 90 || seen[k] || SKIP.test(t)) return;
    seen[k] = 1;
    heads.push(t);
  });
  const href = "/" + file.replace(/index\.html$/, "");
  return { u: href, t: title, d: desc, h: heads };
}

const setups = fs.readdirSync(path.join(ROOT, "setups"))
  .filter(function (f) { return /\.html$/.test(f) && f !== "index.html"; })
  .sort()
  .map(function (f) { return "setups/" + f; });

const index = PAGES.concat(setups)
  .filter(function (f) { return fs.existsSync(path.join(ROOT, f)); })
  .map(page);

const out =
  "/* Site search index, built by _docs/build-search-index.js on " + new Date().toISOString().slice(0, 10) + ".\n" +
  "   Don't edit by hand: run the script again. */\n" +
  "window.TTM_SEARCH_INDEX = " + JSON.stringify(index) + ";\n";

fs.writeFileSync(path.join(ROOT, "js", "search-index.js"), out);
console.log("js/search-index.js: " + index.length + " pages, " + out.length + " bytes");
