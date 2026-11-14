/* =====================================================================
   site.js — the Apple-style shell, built from the SETUPS registry.

   Loads after js/nav.js on every page and fills whichever mount points
   the page has:

     [data-gnav]     global nav bar (every page)
     [data-lnav]     sticky local nav with the page name (every page)
     [data-gfooter]  footer with every setup grouped by session (every page)
     [data-promo]    "New: …" banner for the newest setup (homepage)
     [data-stat]     live counts — setups, stages, filters, sessions, indicators
     #sw-*           "Choose your session" swatch picker (homepage)
     #day-*          trading-day timeline (homepage)
     #gallery        all-setups card grid (homepage)
     #fund-cards     fundamentals cards (homepage)
     #setup-index    filterable list of every setup (/setups/)
     #fund-index     filterable list of the fundamentals (/fundamentals/)
     .gnav-search    site search panel ("/" or Ctrl/⌘ K; index in js/search-index.js)

   Also registers /sw.js (installable app + offline pages, every page).

   Adding a setup: edit js/nav.js only. Its session string ("09:30 – 10:15")
   places it on the timeline and in a session group automatically. Optional
   overrides on a SETUPS entry: group: "open" | "day" | "swing".

   Adding a blog post: add it to POSTS below (newest first), add a card to
   blog/index.html, and add it to EXTRA_PAGES in _docs/build-sitemap.js
   and PAGES in _docs/build-search-index.js.

   Adding a framework page: add it to FUNDAMENTALS below (and to
   EXTRA_PAGES in _docs/build-sitemap.js). The /setups/ and
   /fundamentals/ pages pick both lists up on their own.
   ===================================================================== */

(function () {
  "use strict";

  var FUNDAMENTALS = [
    { href: "/edge.html",               title: "Inch Wide, Mile Deep",           kind: "Framework · 4 components", blurb: "Reading price action, scoping catalyst → setup → trade, and starting with your stop." },
    { href: "/mistakes.html",           title: "Support & Resistance Mistakes",  kind: "Self-check · 5 mistakes",  blurb: "The five recurring, correctable mistakes that cost more than the level itself." },
    { href: "/price-action-rules.html", title: "Three Price Action Rules",       kind: "Framework · 3 rules",       blurb: "Continuation trades, defining your stop first, and adding to winners correctly." },
    { href: "/trailing-stops.html",     title: "Trailing Stop Exits",            kind: "Framework · 4 styles",      blurb: "Four trailing-stop styles for exiting a trade you already have an edge on." },
    { href: "/let-winners-run.html",    title: "Let Winners Run",                kind: "Framework · 3 exit rules",  blurb: "Expected value, and three exits that never sell a green candle: One Below, the ATR trail and key levels." },
    { href: "/relative-volume.html",    title: "Relative Volume",                kind: "Framework · 1 question",    blurb: "Is the stock doing abnormal volume compared to itself, and is that participation increasing, holding or fading?" },
    { href: "/six-momentum-trades.html", title: "Six Momentum Trades",           kind: "Framework · 6 trades",      blurb: "Breakout, retest, pullback, consolidation, trend and reclaim: the six mechanisms underneath almost every strategy name." },
    { href: "/four-pillars.html",       title: "Four Pillars",                   kind: "Framework · 4 pillars",     blurb: "Levels, context, position sizing and discipline: a simple framework you can repeat the same way for years." },
    { href: "/get-better-faster.html",  title: "Get Better Faster",              kind: "Process · 9 steps",         blurb: "One setup, a real playbook, compressed reps, small risk and film-style review: the learning cycle that builds skill faster." },
    { href: "/dynamic-risk-sizing.html", title: "Dynamic Risk Sizing",           kind: "Framework · 4 tiers",       blurb: "Same trades, different results: why static sizing drains your P&L, and the A+, A, B, C model for pressing the A and coasting the C." },
    { href: "/order-flow.html",         title: "Order Flow for Beginners",       kind: "Framework · 4 reads",       blurb: "What a footprint shows, the four things worth reading on it, and how to use order flow as confirmation at a volume profile level, with the absorption setup." },
    { href: "/linda-raschke.html",      title: "Linda Raschke's Trading Rules", kind: "Lessons · 8 rules",         blurb: "Read price, not the tape; the volume spike test; get the main idea of the day right; exits in ATR; all in, all out; even bet size; and drawdown rules from a Market Wizard." },
    { href: "/trading-earnings.html", title: "How to Trade Earnings", kind: "Process · 4 steps", blurb: "Watch the headline reaction without chasing it, listen to the call for what changes the story, wait for price to confirm at a level, then write Plan A and Plan B." },
    { href: "/seven-trading-traps.html", title: "Seven Trading Traps", kind: "Self-check · 7 traps", blurb: "Why experienced traders lose money, from SMB Capital's desk reset: style drift, missing a regime change, grand slams, poor selectivity, too few short-term trades, sizing poorly and overusing options, plus the five-point reset." },
    { href: "/auction-market-theory.html", title: "Auction Market Theory", kind: "Framework · 3 phases", blurb: "Read the regime first: balance, transition or imbalance. Trade wall to wall in balance, wait for the transition candle, then use the delta peak and value area low for an asymmetrical trade and build with a third of the locked profit." },
    { href: "/thesis-to-trade.html", title: "Thesis to Trade", kind: "System · 5 steps", blurb: "Vincent Desiano's daily system: build zones on the higher time frames, write the game plan for each, read hold, fail or trap at the level, enter on the confirmed break and retest instead of front-running, and manage with intraday structure." },
    { href: "/covered-calls.html",      title: "Covered Calls",                  kind: "Options · 4 outcomes",      blurb: "Own the stock, sell a call against it, keep the premium. The four outcomes, the cap on your upside, and how to place the order." },
    { href: "/expected-move.html",      title: "Expected Move",                  kind: "Options · calculator",      blurb: "A dashboard for the range the options market prices: enter the chain, get the upper and lower move on a chart, and see if it's wide or narrow for the stock." }
  ];

  /* Blog posts, newest first. Feeds site search and the footer. */
  var POSTS = [
    { href: "/blog/introducing-backtest-board.html", title: "Do TradingView indicators beat random entries?", date: "2026-10-31", tag: "Backtesting", blurb: "No. Introducing Backtest Board: 45 TradingView indicators, 28 markets, 10 timeframes and 23,608 backtests; after costs, none clearly beats random entries." }
  ];

  var GROUPS = {
    open:  { name: "The opening drive",         short: "Opening drive", desc: "Built around the open, when range, volume, and premarket levels decide the first move.", swatch: "#2e3642" },
    day:   { name: "All session",               short: "All session",   desc: "Work any time the market is open, built on VWAP, MACD, ATR bands, and yesterday's levels.", swatch: "#c8d8e0" },
    swing: { name: "Swing and multi-timeframe", short: "Swing",         desc: "Set up on higher timeframes and play out over several sessions.", swatch: "#f0e4d3" }
  };

  var SPAN = 390; // 09:30 → 16:00 ET, in minutes

  var all  = (typeof SETUPS !== "undefined") ? SETUPS : [];
  var live = all.filter(function (s) { return s.status !== "draft"; });

  function esc(str) {
    return String(str).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* "09:30 – 10:15", "New York AM · 9:30–12:00 ET" → [0, 165] minutes after the open */
  function windowOf(s) {
    var m = String(s.session).match(/(\d{1,2}):(\d{2})/g);
    if (!m || m.length < 2) return null;
    var t = m.slice(0, 2).map(function (x) { var p = x.split(":"); return (+p[0]) * 60 + (+p[1]) - 570; });
    var a = Math.max(0, Math.min(SPAN, t[0])), b = Math.max(0, Math.min(SPAN, t[1]));
    return b > a ? [a, b] : null;
  }

  function groupOf(s) {
    if (s.group && GROUPS[s.group]) return s.group;
    var w = windowOf(s);
    if (w) return (w[0] === 0 && w[1] <= 150) ? "open" : "day";
    return /swing|multi/i.test(s.session) ? "swing" : "day";
  }

  function sideText(side) {
    return side === "long" ? "Long" : side === "short" ? "Short" : "Long or short";
  }

  function fileIndicators(s) {
    return (s.indicators || []).filter(function (i) { return i.file || i.url; }).length;
  }

  function here() {
    return location.pathname.replace(/\/index\.html$/, "/");
  }

  function currentSetup() {
    var p = here();
    for (var i = 0; i < live.length; i++) {
      var h = live[i].href;
      if (p === h || p === h.replace(/\.html$/, "")) return live[i];
    }
    return null;
  }

  var newest = live[live.length - 1];

  /* ---------- global nav ---------- */
  var REVIEW_URL = "https://journal.thetrademethod.com/";    // the Trade Review site (subdomain)
  var VOLENDAR_URL = "https://volendar.com/";
  var BACKTEST_URL = "https://backtestboard.com/";
  function renderGnav() {
    var el = document.querySelector("[data-gnav]");
    if (!el) return;
    var glyph =
      '<svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true">' +
      '<line x1="3" y1="2" x2="3" y2="16" stroke="#f5f5f7" stroke-width="1.2"/><rect x="1" y="5" width="4" height="7" rx="1" fill="#f5f5f7"/>' +
      '<line x1="8" y1="0" x2="8" y2="14" stroke="#f5f5f7" stroke-width="1.2"/><rect x="6" y="3" width="4" height="7" rx="1" fill="#f5f5f7"/>' +
      '<line x1="13" y1="4" x2="13" y2="18" stroke="#f5f5f7" stroke-width="1.2"/><rect x="11" y="7" width="4" height="8" rx="1" fill="#f5f5f7"/></svg>';
    el.outerHTML =
      '<nav class="gnav" aria-label="Global"><div class="gnav-inner">' +
        '<a class="glyph" href="/" aria-label="The Trade Method home">' + glyph + "</a>" +
        '<a class="hide-xxxs" href="/#setups">Setups</a>' +
        '<a class="hide-xxs" href="/#sessions">Sessions</a>' +
        '<a class="hide-xs hide-md" href="/#day">Trading day</a>' +
        '<a class="hide-tiny" href="/#fundamentals">Fundamentals</a>' +
        '<a class="hide-md" href="/blog/"' + (here().indexOf("/blog/") === 0 ? ' aria-current="page"' : "") + '>Blog</a>' +
        '<a class="hide-sm" href="/#inside">Inside a page</a>' +
        '<a class="hide-sm hide-xs" href="/#tape">Live tape</a>' +
        '<button type="button" class="gnav-search" aria-label="Search the site" aria-haspopup="dialog" aria-expanded="false" title="Search (press /)">' +
          '<svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true"><circle cx="7.5" cy="7.5" r="5.75" fill="none" stroke="currentColor" stroke-width="1.7"/><line x1="11.8" y1="11.8" x2="16.5" y2="16.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>' +
        '<span class="gnav-ctas"><a class="gnav-cta" href="' + REVIEW_URL + '" target="_blank" rel="noopener">Trade Review</a>' +
        '<a class="gnav-cta gnav-cta-alt" href="' + VOLENDAR_URL + '" target="_blank" rel="noopener">Volendar</a>' +
        '<a class="gnav-cta gnav-cta-alt" href="' + BACKTEST_URL + '" target="_blank" rel="noopener" aria-label="Backtest Board">Backtest<span class="cta-long"> Board</span></a></span>' +
      "</div></nav>";
  }

  /* ---------- local nav ---------- */
  function renderLnav() {
    var el = document.querySelector("[data-lnav]");
    if (!el) return;
    var s = currentSetup();
    var title = el.getAttribute("data-title") || (s ? s.nav : document.title.split(" — ")[0]);
    var p = here(), isHome = p === "/";
    var hubLink = function (href, label) { return '<a href="' + href + '"' + (p === href ? ' aria-current="page"' : "") + ">" + label + "</a>"; };
    var isBlog = p.indexOf("/blog/") === 0;
    var right = isHome
      ? '<a href="#inside">Overview</a><a href="#day">Trading day</a><a class="pill pill-buy" href="#setups">Browse</a>'
      : isBlog
      ? (p === "/blog/" ? "" : '<a href="/blog/">All posts</a>') + '<a class="pill pill-buy" href="/">Home</a>'
      : (p === "/setups/" || p === "/fundamentals/")
      ? hubLink("/setups/", "All setups") + hubLink("/fundamentals/", "Fundamentals") + '<a class="pill pill-buy" href="/">Home</a>'
      : (s ? '<span class="tnum">' + esc(s.session) + "</span>" : "") + '<a href="/setups/">All setups</a><a class="pill pill-buy" href="/#setups">Browse</a>';
    el.outerHTML =
      '<div class="lnav"><div class="wrap"><span class="title">' + esc(title) + '</span><div class="right">' + right + "</div></div></div>";
    document.body.classList.add("has-lnav");
  }

  /* ---------- footer ---------- */
  function renderFooter() {
    var el = document.querySelector("[data-gfooter]");
    if (!el) return;
    var cols = ["open", "day", "swing"].map(function (g) {
      var list = live.filter(function (s) { return groupOf(s) === g; });
      return "<div><h4>" + esc(GROUPS[g].short) + "</h4>" +
        list.map(function (s) { return '<a href="' + esc(s.href) + '">' + esc(s.nav) + "</a>"; }).join("") + "</div>";
    }).join("") +
      "<div><h4>Fundamentals</h4>" +
      FUNDAMENTALS.map(function (f) { return '<a href="' + esc(f.href) + '">' + esc(f.title) + "</a>"; }).join("") +
      '<h4 style="margin-top:18px">Blog</h4>' +
      POSTS.slice(0, 3).map(function (b) { return '<a href="' + esc(b.href) + '">' + esc(b.title) + "</a>"; }).join("") +
      '<a href="/blog/">All posts</a>' + "</div>";
    el.innerHTML =
      '<div class="wrap">' +
        '<div class="notes">' +
          "<p>A personal learning notebook: trading ideas from videos, articles, books and other traders, written down and animated.</p>" +
          "<p>Levels and times are US equities, Eastern time, regular session unless a page says otherwise.</p>" +
          "<p>Every page describes a plan, not a recommendation to trade it. Trading involves substantial risk of loss. " +
          "Worked examples are drawn from trading-education material and are not independently verified.</p>" +
        "</div>" +
        '<div class="cols">' + cols + "</div>" +
        '<div class="base"><span>&copy; ' + new Date().getFullYear() + " The Trade Method</span><span><a href=\"" + REVIEW_URL + "\" target=\"_blank\" rel=\"noopener\">Trade Review</a> &middot; <a href=\"" + VOLENDAR_URL + "\" target=\"_blank\" rel=\"noopener\">Volendar</a> &middot; <a href=\"" + BACKTEST_URL + "\" target=\"_blank\" rel=\"noopener\">Backtest Board</a> &middot; <a href=\"/contact.html\">Contact</a> &middot; thetrademethod.com</span></div>" +
      "</div>";
  }

  /* ---------- homepage ---------- */
  function renderPromo() {
    var el = document.querySelector("[data-promo]");
    if (!el || !newest) return;
    var withInd = fileIndicators(newest) > 0 ? ", with its own TradingView indicator" : "";
    el.innerHTML = "New: " + esc(newest.nav) + withInd + '. <a href="' + esc(newest.href) + '">Read the setup &rsaquo;</a>';
  }

  function renderStats() {
    var sessions = {};
    live.forEach(function (s) { sessions[s.session] = 1; });
    var v = {
      setups:     live.length,
      stages:     live.reduce(function (n, s) { return n + (s.stages || 0); }, 0),
      filters:    live.reduce(function (n, s) { return n + (s.filters || 0); }, 0),
      sessions:   Object.keys(sessions).length,
      indicators: live.reduce(function (n, s) { return n + fileIndicators(s); }, 0)
    };
    document.querySelectorAll("[data-stat]").forEach(function (el) {
      var k = el.getAttribute("data-stat");
      if (k in v) el.textContent = v[k];
    });
  }

  function renderSessions() {
    var list = document.getElementById("sw-list");
    if (!list) return;
    var btns = document.getElementById("sw-btns");
    btns.innerHTML = Object.keys(GROUPS).map(function (g) {
      return '<button class="sw-btn" type="button" data-g="' + g + '" aria-pressed="false"><i style="background:' + GROUPS[g].swatch + '"></i>' + esc(GROUPS[g].short) + "</button>";
    }).join("");
    function show(g) {
      document.getElementById("sw-name").textContent = GROUPS[g].name;
      document.getElementById("sw-desc").textContent = GROUPS[g].desc;
      list.innerHTML = live.filter(function (s) { return groupOf(s) === g; }).map(function (s) {
        return '<li><a href="' + esc(s.href) + '"><span class="t">' + esc(s.nav) + '</span><span class="s tnum">' + esc(s.session) + "</span></a></li>";
      }).join("");
      btns.querySelectorAll(".sw-btn").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-g") === g ? "true" : "false"); });
    }
    btns.addEventListener("click", function (e) {
      var b = e.target.closest(".sw-btn");
      if (b) show(b.getAttribute("data-g"));
    });
    show("open");
  }

  function renderDay() {
    var rows = document.getElementById("day-rows");
    if (!rows) return;
    var ticks = [["09:30", 0], ["10:00", 30], ["11:00", 90], ["12:00", 150], ["13:00", 210], ["14:00", 270], ["15:00", 330], ["16:00", 390]];
    document.getElementById("day-ticks").innerHTML = ticks.map(function (t) {
      return '<span class="tick" style="left:' + (t[1] / SPAN * 100) + '%">' + t[0] + "</span>";
    }).join("");
    var timed = live.map(function (s) { return { s: s, w: windowOf(s) }; })
      .filter(function (x) { return x.w; })
      .sort(function (a, b) { return (a.w[1] - b.w[1]) || (a.w[0] - b.w[0]); });
    rows.insertAdjacentHTML("beforeend", timed.map(function (x) {
      return '<div class="row"><a class="name" href="' + esc(x.s.href) + '">' + esc(x.s.nav) + '</a><div class="track"><span class="bar ' + esc(x.s.side) +
        '" style="left:' + (x.w[0] / SPAN * 100) + "%;width:" + ((x.w[1] - x.w[0]) / SPAN * 100) + '%"></span></div></div>';
    }).join(""));
    var untimed = live.filter(function (s) { return !windowOf(s); }).map(function (s) { return s.nav; });
    var foot = document.getElementById("day-untimed");
    if (foot) foot.textContent = untimed.length ? "No fixed window: " + untimed.join(", ") + "." : "";

    var glines = document.getElementById("day-glines");
    glines.innerHTML = ticks.map(function (t) { return '<i style="left:' + (t[1] / SPAN * 100) + '%"></i>'; }).join("");
    var now = document.getElementById("day-now"), mins = null;
    try {
      var parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" }).formatToParts(new Date());
      var get = function (k) { return parts.filter(function (p) { return p.type === k; })[0].value; };
      var m = (+get("hour") % 24) * 60 + (+get("minute")) - 570, wk = get("weekday");
      if (m >= 0 && m <= SPAN && wk !== "Sat" && wk !== "Sun") mins = m;
    } catch (e) { /* the "now" marker is optional */ }
    function place() {
      var t = rows.querySelector(".row .track");
      if (!t) return;
      glines.style.left = t.offsetLeft + "px";
      glines.style.width = t.offsetWidth + "px";
      if (mins !== null) { now.style.display = "block"; now.style.left = (t.offsetLeft + t.offsetWidth * mins / SPAN) + "px"; }
    }
    place();
    window.addEventListener("resize", place);
  }

  function renderGallery() {
    var el = document.getElementById("gallery");
    if (!el) return;
    var order = newest ? [newest].concat(live.slice(0, -1)) : live;
    var n = order.length;
    var wide3 = (3 - n % 3) % 3;          // cards that span two columns so the 3-up grid closes evenly
    el.innerHTML = order.map(function (s, i) {
      var cls = "";
      if ((wide3 >= 1 && i === 0) || (wide3 === 2 && i === n - 1)) cls += " w3";
      if (n % 2 === 1 && i === n - 1) cls += " w2"; // 2-up grid: last card spans to close it
      var ind = fileIndicators(s);
      return '<a class="gcard' + cls + '" href="' + esc(s.href) + '">' +
        '<div class="top"><span>' + (s === newest ? '<span class="new">New</span> · ' : "") + sideText(s.side) + '</span><span class="tnum">' + esc(s.session) + "</span></div>" +
        "<h3>" + esc(s.nav) + "</h3><p>" + esc(s.thesis) + "</p>" +
        '<div class="foot"><span>' + s.stages + " stages · " + s.filters + " filters" + (ind ? " · " + ind + " indicator" + (ind > 1 ? "s" : "") : "") +
        '</span><span class="more">Learn more &rsaquo;</span></div></a>';
    }).join("");
  }

  function renderFundamentals() {
    var el = document.getElementById("fund-cards");
    if (!el) return;
    el.innerHTML = FUNDAMENTALS.map(function (f) {
      return '<a class="fcard" href="' + esc(f.href) + '"><span class="k">' + esc(f.kind) + "</span><h3>" + esc(f.title) + "</h3><p>" + esc(f.blurb) + '</p><span class="more">Read &rsaquo;</span></a>';
    }).join("");
  }

  /* ---------- hub pages: /setups/ and /fundamentals/ ----------
     The cards in the HTML are a plain copy for crawlers; these replace
     them with the live list and add the filters. Filter choices are kept
     in the address (?session=open&side=long&q=vwap) so a view can be linked. */
  function hubParams() {
    try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; }
  }
  function hubSave(state) {
    try {
      var u = new URL(location.href);
      Object.keys(state).forEach(function (k) { if (state[k] && state[k] !== "all") u.searchParams.set(k, state[k]); else u.searchParams.delete(k); });
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch (e) {}
  }
  function chipRow(label, key, opts, current) {
    return '<div class="hub-chips" role="group" aria-label="' + esc(label) + '"><span class="hub-k">' + esc(label) + "</span>" +
      opts.map(function (o) {
        return '<button type="button" class="chip" data-k="' + key + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (o[0] === current ? "true" : "false") + '">' + esc(o[1]) + "</button>";
      }).join("") + "</div>";
  }
  function wireChips(bar, state, draw) {
    bar.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      var k = b.getAttribute("data-k");
      state[k] = b.getAttribute("data-v");
      bar.querySelectorAll('.chip[data-k="' + k + '"]').forEach(function (c) { c.setAttribute("aria-pressed", c === b ? "true" : "false"); });
      draw();
    });
    var q = bar.querySelector(".hub-search input");
    if (q) q.addEventListener("input", function () { state.q = q.value.trim(); draw(); });
    var r = bar.querySelector(".hub-reset");
    if (r) r.addEventListener("click", function () {
      Object.keys(state).forEach(function (k) { state[k] = k === "q" ? "" : "all"; });
      bar.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", c.getAttribute("data-v") === "all" ? "true" : "false"); });
      if (q) q.value = "";
      draw();
    });
  }
  function matches(q, text) {
    if (!q) return true;
    text = text.toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return text.indexOf(w) !== -1; });
  }

  function renderSetupIndex() {
    var grid = document.getElementById("setup-index");
    var bar = document.getElementById("setup-filters");
    if (!grid || !bar) return;
    var P = hubParams();
    var pick = function (k, ok) { var v = P.get(k); return ok.indexOf(v) !== -1 ? v : "all"; };
    var state = { session: pick("session", ["open", "day", "swing"]), side: pick("side", ["long", "short", "both"]), q: P.get("q") || "" };
    bar.innerHTML =
      '<label class="hub-search"><span class="sr">Search setups</span><input type="search" placeholder="Search setups, e.g. VWAP" value="' + esc(state.q) + '" autocomplete="off"></label>' +
      chipRow("Session", "session", [["all", "All"], ["open", GROUPS.open.short], ["day", GROUPS.day.short], ["swing", GROUPS.swing.short]], state.session) +
      chipRow("Side", "side", [["all", "All"]].concat([["long", "Long only"], ["short", "Short only"], ["both", "Long or short"]].filter(function (o) {
        return live.some(function (s) { return s.side === o[0]; });
      })), state.side);
    var count = document.getElementById("setup-count");
    var empty = document.getElementById("setup-empty");
    var order = newest ? [newest].concat(live.slice(0, -1)) : live;
    function draw() {
      var list = order.filter(function (s) {
        return (state.session === "all" || groupOf(s) === state.session) &&
               (state.side === "all" || s.side === state.side) &&
               matches(state.q, [s.nav, s.title, s.thesis, s.session].join(" "));
      });
      grid.innerHTML = list.map(function (s) {
        var ind = fileIndicators(s);
        return '<a class="gcard" href="' + esc(s.href) + '">' +
          '<div class="top"><span>' + (s === newest ? '<span class="new">New</span> · ' : "") + '<span class="grp">' + esc(GROUPS[groupOf(s)].short) + " · </span>" + sideText(s.side) + '</span><span class="tnum">' + esc(s.session) + "</span></div>" +
          "<h3>" + esc(s.nav) + "</h3><p>" + esc(s.thesis) + "</p>" +
          '<div class="foot"><span>' + s.stages + " stages · " + s.filters + " filters" + (ind ? " · " + ind + " indicator" + (ind > 1 ? "s" : "") : "") +
          '</span><span class="more">Learn more &rsaquo;</span></div></a>';
      }).join("");
      if (count) count.textContent = list.length === live.length ? "All " + live.length + " setups" : list.length + " of " + live.length + " setups";
      if (empty) empty.hidden = list.length > 0;
      hubSave(state);
    }
    wireChips(bar.parentNode, state, draw);
    draw();
  }

  function fundKind(f) { return f.kind.split(" · ")[0]; }

  function renderFundIndex() {
    var grid = document.getElementById("fund-index");
    var bar = document.getElementById("fund-filters");
    if (!grid || !bar) return;
    var kinds = [];
    FUNDAMENTALS.forEach(function (f) { var k = fundKind(f); if (kinds.indexOf(k) === -1) kinds.push(k); });
    var P = hubParams();
    var want = P.get("type");
    var state = { type: kinds.filter(function (k) { return k.toLowerCase() === String(want).toLowerCase(); })[0] || "all", q: P.get("q") || "" };
    bar.innerHTML =
      '<label class="hub-search"><span class="sr">Search fundamentals</span><input type="search" placeholder="Search, e.g. stops" value="' + esc(state.q) + '" autocomplete="off"></label>' +
      chipRow("Type", "type", [["all", "All"]].concat(kinds.map(function (k) { return [k, k]; })), state.type);
    var count = document.getElementById("fund-count");
    var empty = document.getElementById("fund-empty");
    function draw() {
      var list = FUNDAMENTALS.filter(function (f) {
        return (state.type === "all" || fundKind(f) === state.type) && matches(state.q, [f.title, f.kind, f.blurb].join(" "));
      });
      grid.innerHTML = list.map(function (f) {
        return '<a class="fcard" href="' + esc(f.href) + '"><span class="k">' + esc(f.kind) + "</span><h3>" + esc(f.title) + "</h3><p>" + esc(f.blurb) + '</p><span class="more">Read &rsaquo;</span></a>';
      }).join("");
      if (count) count.textContent = list.length === FUNDAMENTALS.length ? "All " + FUNDAMENTALS.length + " pages" : list.length + " of " + FUNDAMENTALS.length + " pages";
      if (empty) empty.hidden = list.length > 0;
      hubSave({ type: state.type === "all" ? "" : state.type.toLowerCase(), q: state.q });
    }
    wireChips(bar.parentNode, state, draw);
    draw();
  }

  /* hero: rim-lit candles climbing through the premarket high (y = 236) */
  function renderHeroChart() {
    var g = document.getElementById("hero-candles");
    if (!g) return;
    var d = [[430,410,446,398],[410,418,428,400],[418,392,424,384],[392,378,400,366],[378,384,392,370],[384,356,390,348],[356,340,364,330],[340,346,356,334],[346,318,352,308],[318,300,326,290],[300,306,316,294],[306,280,312,270],[280,262,288,252],[262,268,276,256],[268,246,274,238],[246,250,258,240],[250,220,256,212],[220,206,228,196],[206,212,218,198],[212,186,216,176],[186,170,194,160],[170,176,184,164],[176,150,180,140]];
    g.innerHTML = d.map(function (c, i) {
      var x = 90 + i * 46, up = c[1] < c[0], top = Math.min(c[0], c[1]), ht = Math.max(Math.abs(c[0] - c[1]), 3);
      return '<line x1="' + x + '" y1="' + c[3] + '" x2="' + x + '" y2="' + c[2] + '" stroke="' + (up ? "#86868b" : "#424245") + '" stroke-width="1.5"/>' +
             '<rect x="' + (x - 12) + '" y="' + top + '" width="24" height="' + ht + '" rx="4" fill="url(#' + (up ? "rim" : "rimDim") + ')"/>';
    }).join("");
  }

  /* ---------- disclaimer: shown once per browser, until "I understand" ---------- */
  var DISCLAIMER_KEY = "tm_disclaimer_v1";
  function renderDisclaimer() {
    var seen = null;
    try { seen = localStorage.getItem(DISCLAIMER_KEY); } catch (e) {}
    if (seen) return;
    var prev = document.activeElement;
    var wrap = document.createElement("div");
    wrap.className = "disclaim";
    wrap.innerHTML =
      '<div class="disclaim-box" role="dialog" aria-modal="true" aria-labelledby="disclaim-title" aria-describedby="disclaim-body">' +
        '<p class="disclaim-kicker">Before you continue</p>' +
        '<h2 id="disclaim-title">Not financial advice</h2>' +
        '<div id="disclaim-body">' +
          "<p>The Trade Method is a personal learning notebook: trading ideas from videos, articles, books and other traders, written down and animated. Nothing on it is financial, investment, " +
          "tax or legal advice, or a recommendation to buy or sell any security.</p>" +
          "<p>Setups, live charts and indicators are shown for education only. Past results " +
          "don't guarantee future results.</p>" +
          "<p>Trading involves substantial risk of loss. Make your own decisions, and speak with a licensed financial " +
          "professional before acting on anything here.</p>" +
        "</div>" +
        '<button type="button" class="pill pill-buy disclaim-ok">I understand</button>' +
        '<p class="disclaim-note">This notice won\u2019t show again in this browser.</p>' +
      "</div>";
    document.body.appendChild(wrap);
    document.documentElement.classList.add("disclaim-open");
    var ok = wrap.querySelector(".disclaim-ok");
    ok.focus();
    wrap.addEventListener("keydown", function (e) { if (e.key === "Tab") { e.preventDefault(); ok.focus(); } });   // one control: keep focus on it
    ok.addEventListener("click", function () {
      try { localStorage.setItem(DISCLAIMER_KEY, String(Date.now())); } catch (e) {}
      wrap.remove();
      document.documentElement.classList.remove("disclaim-open");
      if (prev && prev.focus) try { prev.focus(); } catch (e) {}
    });
  }

  /* ---------- site search: the magnifier in the global nav, "/" or Ctrl/⌘ K ----------
     Searches SETUPS and FUNDAMENTALS straight away. js/search-index.js
     (built by _docs/build-search-index.js) loads on first use and adds
     each page's description and section headings, so a hit on a heading
     links straight to that section. Bump SEARCH_INDEX_URL's ?v= after
     rebuilding the index. */
  var SEARCH_INDEX_URL = "/js/search-index.js?v=13";
  var searchDocs = null, searchIndexState = "";

  function searchBase() {
    var docs = live.map(function (s) {
      return {
        u: s.href, t: s.nav, sub: s.title,
        kind: "Setup · " + GROUPS[groupOf(s)].short + " · " + sideText(s.side),
        d: s.thesis,
        k: [s.session, s.side === "both" ? "long short" : s.side].concat((s.indicators || []).map(function (i) { return i.name + " indicator pine tradingview"; })).join(" "),
        h: [], order: 0
      };
    });
    FUNDAMENTALS.forEach(function (f) {
      docs.push({ u: f.href, t: f.title, sub: "", kind: "Fundamentals · " + f.kind, d: f.blurb, k: fundKind(f), h: [], order: 1 });
    });
    POSTS.forEach(function (b) {
      docs.push({ u: b.href, t: b.title, sub: "", kind: "Blog · " + b.tag + " · " + b.date, d: b.blurb, k: "blog post article " + b.tag, h: [], order: 1 });
    });
    docs.push(
      { u: "/blog/", t: "Blog", sub: "", kind: "Page", d: "Backtest results, trading research and notes, newest first.", k: "blog posts articles news research", h: [], order: 2 },
      { u: "/setups/", t: "All setups", sub: "", kind: "Page", d: "Every setup in one list, filtered by session and side.", k: "setups list browse index", h: [], order: 2 },
      { u: "/contact.html", t: "Contact", sub: "", kind: "Page", d: "Send a question, a correction or a setup idea.", k: "contact email message question feedback idea suggestion correction report problem", h: [], order: 2 },
      { u: "/fundamentals/", t: "All fundamentals", sub: "", kind: "Page", d: "Every framework, process and options page in one list.", k: "fundamentals frameworks list browse index", h: [], order: 2 }
    );
    return docs;
  }

  function searchMergeIndex() {
    var idx = window.TTM_SEARCH_INDEX;
    if (!idx || !searchDocs) return;
    var byUrl = {};
    searchDocs.forEach(function (d) { byUrl[d.u] = d; });
    idx.forEach(function (p) {
      var d = byUrl[p.u];
      if (!d) return;                 // drafts and retired pages stay out
      d.d2 = p.d || "";
      d.h = p.h || [];
    });
  }

  function searchLoadIndex(done) {
    if (searchIndexState === "done" || window.TTM_SEARCH_INDEX) { searchIndexState = "done"; searchMergeIndex(); if (done) done(); return; }
    if (searchIndexState) return;
    searchIndexState = "loading";
    var s = document.createElement("script");
    s.src = SEARCH_INDEX_URL;
    s.async = true;
    s.onload = function () { searchIndexState = "done"; searchMergeIndex(); if (done) done(); };
    s.onerror = function () { searchIndexState = ""; s.remove(); };   // offline or blocked: setups and fundamentals still search
    document.head.appendChild(s);
  }

  function searchFold(str) {
    return String(str || "").toLowerCase().replace(/[‘’']/g, "").replace(/[–—\-_/·]/g, " ");
  }

  /* each word of the query has to appear somewhere; title hits beat heading hits beat body text */
  function searchScore(doc, words) {
    var f = doc._f || (doc._f = {
      t: searchFold(doc.t + " " + doc.sub), k: searchFold(doc.kind + " " + doc.k),
      d: searchFold(doc.d + " " + (doc.d2 || "")), h: (doc.h || []).map(searchFold)
    });
    if (doc.h.length !== f.h.length) f.h = doc.h.map(searchFold);
    var total = 0, best = -1, bestHits = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i], start = new RegExp("(^|\\s)" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), sc = 0;
      if (f.t.indexOf(w) !== -1) sc = start.test(f.t) ? 12 : 8;
      else if (f.k.indexOf(w) !== -1) sc = 5;
      var hHit = false;
      for (var j = 0; j < f.h.length; j++) if (f.h[j].indexOf(w) !== -1) { hHit = true; break; }
      if (!sc && hHit) sc = 4;
      if (!sc && f.d.indexOf(w) !== -1) sc = 2;
      if (!sc) return null;
      total += sc;
    }
    /* the heading that holds the most query words, for the snippet and the deep link */
    for (var h = 0; h < f.h.length; h++) {
      var n = 0;
      for (var q = 0; q < words.length; q++) if (f.h[h].indexOf(words[q]) !== -1) n++;
      if (n > bestHits) { bestHits = n; best = h; }
    }
    if (best !== -1 && bestHits === words.length) total += 3;
    if (f.t.indexOf(words.join(" ")) === 0) total += 10;
    var inTitle = words.every(function (w) { return f.t.indexOf(w) !== -1; });
    return { doc: doc, score: total, head: best !== -1 && !inTitle ? doc.h[best] : "" };
  }

  function searchMark(str, words) {
    var out = esc(str);
    words.forEach(function (w) {
      if (w.length < 2) return;
      out = out.replace(new RegExp("(" + esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![^<]*>)", "gi"), "<mark>$1</mark>");
    });
    return out;
  }

  function searchSnippet(doc, words) {
    var text = doc.d2 && doc.d2.length > doc.d.length ? doc.d2 : doc.d;
    var low = text.toLowerCase(), at = -1;
    for (var i = 0; i < words.length && at === -1; i++) at = low.indexOf(words[i]);
    if (at > 70) {
      var cut = text.lastIndexOf(" ", at - 40);
      text = "…" + text.slice(cut > 0 ? cut + 1 : at - 40);
    }
    return text.length > 170 ? text.slice(0, text.lastIndexOf(" ", 168)) + "…" : text;
  }

  function renderSearch() {
    var btn = document.querySelector(".gnav-search");
    if (!btn) return;
    var wrap = null, input, list, status, active = 0, items = [], prevFocus = null;

    function build() {
      wrap = document.createElement("div");
      wrap.className = "srch";
      wrap.hidden = true;
      wrap.innerHTML =
        '<div class="srch-box" role="dialog" aria-modal="true" aria-label="Search the site">' +
          '<div class="srch-bar">' +
            '<svg class="srch-ico" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="7.5" cy="7.5" r="5.75" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="11.8" y1="11.8" x2="16.5" y2="16.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
            '<input type="search" class="srch-input" placeholder="Search setups and fundamentals" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"' +
              ' role="combobox" aria-expanded="true" aria-controls="srch-list" aria-autocomplete="list" aria-label="Search">' +
            '<button type="button" class="srch-close">Cancel</button>' +
          "</div>" +
          '<p class="srch-status" aria-live="polite"></p>' +
          '<ul class="srch-list" id="srch-list" role="listbox" aria-label="Results"></ul>' +
          '<p class="srch-keys" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></p>' +
        "</div>";
      document.body.appendChild(wrap);
      input = wrap.querySelector(".srch-input");
      list = wrap.querySelector(".srch-list");
      status = wrap.querySelector(".srch-status");

      input.addEventListener("input", draw);
      input.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          if (!items.length) return;
          setActive((active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
        } else if (e.key === "Enter") {
          var a = items[active];
          if (a) { e.preventDefault(); go(a); }
        }
      });
      wrap.querySelector(".srch-close").addEventListener("click", close);
      wrap.addEventListener("mousedown", function (e) { if (e.target === wrap) close(); });
      wrap.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { e.preventDefault(); close(); return; }
        if (e.key !== "Tab") return;
        var f = [input].concat([].slice.call(wrap.querySelectorAll(".srch-close, .srch-list a")));
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      });
      list.addEventListener("mousemove", function (e) {
        var a = e.target.closest("a");
        if (a) { var i = items.indexOf(a); if (i !== -1 && i !== active) setActive(i); }
      });
      list.addEventListener("click", function (e) {
        var a = e.target.closest("a");
        if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) go(a, e);
      });
    }

    function setActive(i) {
      if (items[active]) items[active].removeAttribute("aria-selected");
      active = i;
      var a = items[active];
      if (!a) { input.removeAttribute("aria-activedescendant"); return; }
      a.setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", a.id);
      a.scrollIntoView({ block: "nearest" });
    }

    function go(a, e) {
      var url = a.getAttribute("href"), base = url.split("#")[0];
      var samePage = base === location.pathname || base === here();
      if (e) { if (!samePage) return; e.preventDefault(); }
      close(true);
      if (samePage) {
        if (url.indexOf("#:~:text=") === -1) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
        /* same page: a text fragment won't scroll on its own, so find the heading */
        var want = decodeURIComponent(url.split("#:~:text=")[1]).toLowerCase();
        var hs = document.querySelectorAll("h2, h3");
        for (var i = 0; i < hs.length; i++) {
          if (searchFold(hs[i].textContent).replace(/\s+/g, " ").trim().indexOf(searchFold(want).replace(/\s+/g, " ").trim()) !== -1) {
            hs[i].scrollIntoView({ behavior: "smooth", block: "start" });
            return;
          }
        }
        return;
      }
      location.href = url;
    }

    function row(doc, head, words, i) {
      var url = doc.u + (head ? "#:~:text=" + encodeURIComponent(head) : "");
      var sub = head
        ? '<span class="srch-sec">› ' + searchMark(head, words) + "</span>"
        : '<span class="srch-d">' + searchMark(searchSnippet(doc, words), words) + "</span>";
      return '<li role="presentation"><a href="' + esc(url) + '" id="srch-o' + i + '" role="option">' +
        '<span class="srch-k">' + esc(doc.kind) + "</span>" +
        '<span class="srch-t">' + searchMark(doc.t, words) + "</span>" + sub + "</a></li>";
    }

    function draw() {
      if (!searchDocs) { searchDocs = searchBase(); searchMergeIndex(); }
      var raw = input.value.trim();
      var words = searchFold(raw).split(/\s+/).filter(Boolean);
      var html, n = 0;
      if (!words.length) {
        var picks = [newest].concat(live.slice(-4, -1).reverse()).filter(Boolean).map(function (s) { return s.href; });
        var quick = searchDocs.filter(function (d) { return picks.indexOf(d.u) !== -1; })
          .sort(function (a, b) { return picks.indexOf(a.u) - picks.indexOf(b.u); })
          .concat(searchDocs.filter(function (d) { return d.order === 2; }));
        html = quick.map(function (d, i) { return row(d, "", [], i); }).join("");
        status.textContent = "Newest setups and the full lists. Try “VWAP”, “stop” or “options”.";
      } else {
        var hits = searchDocs.map(function (d) { return searchScore(d, words); }).filter(Boolean)
          .sort(function (a, b) { return (b.score - a.score) || (a.doc.order - b.doc.order); });
        n = hits.length;
        hits = hits.slice(0, 20);
        html = hits.map(function (h, i) { return row(h.doc, h.head, words, i); }).join("");
        status.textContent = n ? (n > 20 ? "Top 20 of " + n + " results" : n + (n === 1 ? " result" : " results")) : "";
        if (!n) html = '<li class="srch-none" role="presentation">Nothing matches “' + esc(raw) + '”. Try one word, like “breakout” or “VWAP”, or <a href="/setups/">browse every setup</a>.</li>';
      }
      list.innerHTML = html;
      items = [].slice.call(list.querySelectorAll("a[role=option]"));
      active = 0;
      setActive(0);
    }

    function open() {
      if (!wrap) build();
      if (!wrap.hidden) return;
      prevFocus = document.activeElement;
      wrap.hidden = false;
      document.documentElement.classList.add("srch-open");
      btn.setAttribute("aria-expanded", "true");
      input.value = "";
      draw();
      input.focus();
      searchLoadIndex(function () { if (!wrap.hidden) draw(); });
    }

    function close(leaving) {
      if (!wrap || wrap.hidden) return;
      input.blur();
      wrap.hidden = true;
      document.documentElement.classList.remove("srch-open");
      btn.setAttribute("aria-expanded", "false");
      if (leaving !== true && prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
    }

    btn.addEventListener("click", open);
    btn.addEventListener("pointerenter", function () { searchLoadIndex(); }, { once: true });
    document.addEventListener("keydown", function (e) {
      if (document.documentElement.classList.contains("disclaim-open")) return;
      var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        if (wrap && !wrap.hidden) close(); else open();
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        open();
      }
    });
    /* back/forward cache: don't come back to a page with the panel still up */
    window.addEventListener("pageshow", function (e) { if (e.persisted) close(true); });
  }

  /* Installable app: the service worker (sw.js at the site root) saves
     pages as they're opened so they load offline. https only. */
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost") return;
    function go() { navigator.serviceWorker.register("/sw.js").catch(function () {}); }
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go);
  }

  function boot() {
    renderGnav();
    renderLnav();
    renderFooter();
    renderPromo();
    renderStats();
    renderSessions();
    renderDay();
    renderGallery();
    renderFundamentals();
    renderSetupIndex();
    renderFundIndex();
    renderSearch();
    renderHeroChart();
    renderDisclaimer();
    registerServiceWorker();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
