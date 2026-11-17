/* ---------------------------------------------------------------------
   build-sitemap.js

   Regenerates sitemap.xml from the SETUPS array in js/nav.js, so the
   sitemap can never drift from the site. Drafts are excluded.

   Run from the site root:   node _docs/build-sitemap.js
   --------------------------------------------------------------------- */

const fs   = require("fs");
const path = require("path");

const ORIGIN = "https://thetrademethod.com";
const ROOT   = path.join(__dirname, "..");

/* Pull the SETUPS array out of nav.js without running the browser code. */
const src   = fs.readFileSync(path.join(ROOT, "js", "nav.js"), "utf8");
const start = src.indexOf("const SETUPS");
const end   = src.indexOf("\n];", start);

if (start === -1 || end === -1) {
  console.error("Could not find the SETUPS array in js/nav.js.");
  process.exit(1);
}

/* eval the array literal itself — a `const` inside eval would be
   block-scoped and invisible out here. */
const SETUPS = eval(src.slice(src.indexOf("[", start), end + 2));

const today = new Date().toISOString().slice(0, 10);

/* Standalone pages outside the setups registry — not a "setup" (no
   entry/stop/level of its own), so it lives outside SETUPS and the
   homepage counts, but it still belongs in the sitemap. */
const EXTRA_PAGES = [
  { loc: "/setups/", priority: "0.9" },
  { loc: "/fundamentals/", priority: "0.9" },
  { loc: "/famous-strategies/", priority: "0.9" },
  { loc: "/famous-strategies/cross-sectional-momentum.html", priority: "0.7" },
  { loc: "/famous-strategies/ten-month-sma.html", priority: "0.7" },
  { loc: "/famous-strategies/opening-range-breakout.html", priority: "0.7" },
  { loc: "/famous-strategies/can-slim.html", priority: "0.7" },
  { loc: "/famous-strategies/low-volatility.html", priority: "0.7" },
  { loc: "/famous-strategies/value-and-size.html", priority: "0.7" },
  { loc: "/famous-strategies/magic-formula.html", priority: "0.7" },
  { loc: "/famous-strategies/pairs-trading.html", priority: "0.7" },
  { loc: "/famous-strategies/post-earnings-drift.html", priority: "0.7" },
  { loc: "/edge.html", priority: "0.6" },
  { loc: "/mistakes.html", priority: "0.6" },
  { loc: "/price-action-rules.html", priority: "0.6" },
  { loc: "/trailing-stops.html", priority: "0.6" },
  { loc: "/let-winners-run.html", priority: "0.7" },
  { loc: "/relative-volume.html", priority: "0.7" },
  { loc: "/six-momentum-trades.html", priority: "0.7" },
  { loc: "/four-pillars.html", priority: "0.7" },
  { loc: "/get-better-faster.html", priority: "0.7" },
  { loc: "/dynamic-risk-sizing.html", priority: "0.7" },
  { loc: "/order-flow.html", priority: "0.7" },
  { loc: "/linda-raschke.html", priority: "0.7" },
  { loc: "/trading-earnings.html", priority: "0.7" },
  { loc: "/seven-trading-traps.html", priority: "0.7" },
  { loc: "/auction-market-theory.html", priority: "0.7" },
  { loc: "/thesis-to-trade.html", priority: "0.7" },
  { loc: "/pyramiding.html", priority: "0.7" },
  { loc: "/stacked-imbalances.html", priority: "0.7" },
  { loc: "/covered-calls.html", priority: "0.7" },
  { loc: "/expected-move.html", priority: "0.7" },
  { loc: "/blog/", priority: "0.8" },
  { loc: "/blog/introducing-backtest-board.html", priority: "0.7" },
  { loc: "/contact.html", priority: "0.4" }
];

const urls = [{ loc: "/", priority: "1.0" }].concat(
  SETUPS
    .filter(s => s.status !== "draft")
    .map(s => ({ loc: s.href, priority: "0.8" }))
).concat(EXTRA_PAGES);

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u =>
    "  <url>\n" +
    "    <loc>" + ORIGIN + u.loc + "</loc>\n" +
    "    <lastmod>" + today + "</lastmod>\n" +
    "    <priority>" + u.priority + "</priority>\n" +
    "  </url>\n"
  ).join("") +
  "</urlset>\n";

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml);
console.log("sitemap.xml written — " + urls.length + " URLs");
