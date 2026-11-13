/* =====================================================================
   mm-live.js — live Market Memory (day two) chart.

   Pulls regular-session bars (5-minute by default; 1 / 2 / 5 / 15
   selectable) from /api/bars.php (the API key stays on the server) and
   runs the page's day-two model in the browser:
     · THE BOX = yesterday's regular-session high (top: the largest seller)
       and low (bottom: the largest buyer), drawn across today. The battle
       line = the midpoint of yesterday's high and low (the page draws the
       inflection where the two sides fought; the midpoint is the objective
       stand-in, and it is where the animation puts it: 104.50 between 106
       and 103).
     · DON'T CHASE: the first bar each session that runs into yesterday's
       high from inside the box is marked "don't buy" (the first into
       yesterday's low, "don't short"), unless a trade is already on. No
       trade is ever taken on a run into an edge.
     · JOHN WICK at the top edge = a bar whose high pokes above yesterday's
       high, that closes back under it, closes red, and whose upper wick is
       at least as long as its body. Bottom edge = the mirror (low under
       yesterday's low, closes back over it, green, lower wick ≥ body).
       Pokes that close back inside but are the wrong colour ("skip:
       colour") or have a wick shorter than the body ("skip: wick")
       are marked grey (while flat) and not traded. A close beyond the edge is a
       breakout, a different trade, and is ignored.
     · ENTRY = the break of the John Wick candle in the direction of the
       rejection: SHORT when a later bar trades below its low (fill at the
       low, or the open if it gaps under), LONG when a later bar trades
       above its high. The break must come within 3 bars; the setup is
       cancelled if price first trades beyond the candle's far end or
       closes back through the edge.
     · STOP = one cent beyond the far end of the John Wick candle (above its
       high for a short, below its low for a long) — sized off the wick,
       never off the level.
     · TARGET = the other side of the box (yesterday's low for a short,
       yesterday's high for a long).
     · BREAKEVEN: once two closes in a row hold beyond the battle line
       (under it for a short, over it for a long), the stop moves to the
       entry from the next bar.
     · LEAVE: a close back through the rejected edge while in the trade
       exits at that close ("the memory just changed").
     · One trade at a time; stop, then target, then the close-back exit,
       from the bar after entry; an open trade is closed at the session's
       last close. The backside trade (step 7) isn't automated here.
   Signals are taken on CLOSED bars only; the newest bar is drawn but ignored
   until it has closed.

   Mount: <section data-mm-live data-symbol="TSLA">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { arm: 3, hold: 2, tick: 0.01 };

  /* ---------- the rules: pure, bar by bar ----------
     bars: [{ date: "YYYY-MM-DD", min: minutes after midnight ET, o, h, l, c, v }] (regular session only, oldest first)
     opt:  OPT overrides plus n = how many bars are closed (default all) */
  function signals(bars, opt) {
    var o = {}, k; for (k in OPT) o[k] = OPT[k]; for (k in (opt || {})) o[k] = opt[k];
    var B = bars, N = B.length, n = o.n == null ? N : o.n, t;
    /* yesterday's box for every bar */
    var day = {}, order = [];
    for (t = 0; t < N; t++) {
      var b0 = B[t];
      if (!day[b0.date]) { day[b0.date] = { h: -Infinity, l: Infinity }; order.push(b0.date); }
      day[b0.date].h = Math.max(day[b0.date].h, b0.h); day[b0.date].l = Math.min(day[b0.date].l, b0.l);
    }
    var prev = {}; order.forEach(function (d, i) { prev[d] = i > 0 ? day[order[i - 1]] : null; });
    var top = [], mid = [], bot = [];
    for (t = 0; t < N; t++) {
      var p = prev[B[t].date];
      top[t] = p ? p.h : null; bot[t] = p ? p.l : null; mid[t] = p ? (p.h + p.l) / 2 : null;
    }

    var events = [], sigs = [], trades = [], tr = null, pend = null, chased = { S: false, L: false };
    function close(x, xt, px, why) { var c = {}; for (var key in x) c[key] = x[key]; c.xt = xt; c.x = px; c.why = why; return c; }
    for (t = 0; t < n; t++) {
      var b = B[t], newDay = t === 0 || b.date !== B[t - 1].date;
      if (newDay) {
        if (tr) { trades.push(close(tr, t - 1, B[t - 1].c, "session end")); tr = null; }
        if (pend) { events.push({ t: pend.t, side: pend.side, kind: "cancel", why: "no break" }); pend = null; }
        chased = { S: false, L: false };
      }
      var T = top[t], M = mid[t], L = bot[t];
      if (T == null) continue;
      var exited = false;
      /* the open trade: stop, then target, then the close back through the edge; then the breakeven hold */
      if (tr && t > tr.t) {
        var px = null, why = null, S = tr.side === "S";
        if (S ? b.h >= tr.sl : b.l <= tr.sl) { px = tr.sl; why = tr.be ? "breakeven" : "stop"; }
        else if (S ? b.l <= tr.tp : b.h >= tr.tp) { px = tr.tp; why = "target"; }
        else if (S ? b.c > tr.lvl : b.c < tr.lvl) { px = b.c; why = "level reclaimed"; }
        if (why) { trades.push(close(tr, t, px, why)); tr = null; exited = true; }
      }
      if (tr && !tr.be) {
        var beyond = tr.side === "S" ? b.c < M : b.c > M;
        tr.hold = beyond ? tr.hold + 1 : 0;
        if (tr.hold >= o.hold) { tr.be = true; tr.beT = t; tr.sl = tr.e; events.push({ t: t, side: tr.side, kind: "be" }); }
      }
      /* a pending John Wick: wait for the break */
      if (pend && t > pend.t) {
        var P = pend, Sd = P.side === "S", gone = false;
        var brk = Sd ? b.l < P.l : b.h > P.h, far = Sd ? b.h >= P.sl : b.l <= P.sl;
        if (far) { events.push({ t: t, side: P.side, kind: "cancel", why: "ran the wick" }); gone = true; }
        else if (brk && !tr && !exited) {
          var e = Sd ? Math.min(b.o, P.l) : Math.max(b.o, P.h), tp = Sd ? L : T;
          if (Sd ? e <= tp : e >= tp) events.push({ t: t, side: P.side, kind: "cancel", why: "no room" });
          else {
            tr = { t: t, jw: P.t, side: P.side, e: e, sl: P.sl, sl0: P.sl, tp: tp, lvl: P.lvl, mid: M, hold: 0, be: false };
            if (Sd ? b.c < M : b.c > M) tr.hold = 1;
            sigs.push(tr); events.push({ t: t, side: P.side, kind: "entry", e: e, sl: P.sl, tp: tp, jw: P.t });
          }
          gone = true;
        } else if (brk) { events.push({ t: t, side: P.side, kind: "busy" }); gone = true; }
        else if (Sd ? b.c > P.lvl : b.c < P.lvl) { events.push({ t: t, side: P.side, kind: "cancel", why: "closed back through" }); gone = true; }
        else if (t - P.t >= o.arm) { events.push({ t: t, side: P.side, kind: "cancel", why: "no break" }); gone = true; }
        if (gone) pend = null;
      }
      /* the two mistakes: the first run into each edge from inside the box */
      var pc = t > 0 && !newDay ? B[t - 1].c : b.o;
      var intoTop = b.h >= T && pc < T, intoBot = b.l <= L && pc > L;
      /* the John Wick candle at each edge, on the bar's close */
      var body = Math.abs(b.c - b.o), upW = b.h - Math.max(b.o, b.c), loW = Math.min(b.o, b.c) - b.l;
      var pokeT = b.h > T && b.c < T, pokeB = b.l < L && b.c > L;
      var jwT = pokeT && b.c < b.o && upW >= body - 1e-9, jwB = pokeB && b.c > b.o && loW >= body - 1e-9;
      [["S", pokeT, jwT, intoTop, T, b.h + o.tick, upW], ["L", pokeB, jwB, intoBot, L, b.l - o.tick, loW]].forEach(function (z) {
        var s = z[0];
        if (z[2]) {
          if (tr) events.push({ t: t, side: s, kind: "jw-busy", lvl: z[4] });
          else if (!pend) { pend = { t: t, side: s, lvl: z[4], h: b.h, l: b.l, sl: z[5] }; events.push({ t: t, side: s, kind: "jw", lvl: z[4], h: b.h, l: b.l }); }
        } else if (z[3] && !chased[s] && !tr && !exited) {
          events.push({ t: t, side: s, kind: "chase", lvl: z[4] });
        } else if (z[1] && !tr && !pend) {
          events.push({ t: t, side: s, kind: "skip", why: (s === "S" ? b.c >= b.o : b.c <= b.o) ? "colour" : "wick", lvl: z[4] });
        }
        if (z[3]) chased[s] = true;
      });
    }
    return { top: top, mid: mid, bot: bot, events: events, signals: sigs, trades: trades, open: tr, pend: pend, opt: o };
  }

  window.MMLive = { signals: signals };

  var POLL_MS = 60000, MULT = 5, RTH_OPEN = 570, RTH_CLOSE = 960;
  var COL = { top: "#f5f5f7", mid: "#8e8e93", bot: "#64d2ff", jw: "#f4b942", sell: "#ff453a", buy: "#30d158", skip: "#8e8e93", chase: "#ff9f0a",
              entry: "#2997ff", tp: "#30d158", sl: "#ff453a", volUp: "rgba(48,209,88,0.45)", volDn: "rgba(255,69,58,0.45)", volHit: "#f4b942" };

  var root = document.querySelector("[data-mm-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate")
  };
  var KIT = LiveKit.controls(root, { key: "mm", symbol: (root.getAttribute("data-symbol") || "TSLA").toUpperCase(), tf: MULT,
    onChange: function (sym, tf) { SYMBOL = sym; MULT = tf; render.fitted = false; load(); } });
  var SYMBOL = KIT.symbol; MULT = KIT.tf;

  function previewToken() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }
  var fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  function etParts(ms) {
    var p = {};
    fmt.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    var h = (+p.hour) % 24;
    return { date: p.year + "-" + p.month + "-" + p.day, min: h * 60 + (+p.minute), wall: Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute) / 1000 };
  }
  function money(x) { return x == null || isNaN(x) ? "—" : x.toFixed(2); }
  function clock(min) { var h = Math.floor(min / 60), m = min % 60; return (h > 12 ? h - 12 : h) + ":" + (m < 10 ? "0" : "") + m + (h >= 12 ? " pm" : " am"); }

  /* ---------- chart ---------- */
  var chart = null, candles, volS, topS, midS, botS, lineS = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.06, bottom: 0.22 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: 0 }
    });
    volS = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    topS = chart.addLineSeries({ color: COL.top, lineWidth: 2, lineStyle: 2, title: "Yday high", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    midS = chart.addLineSeries({ color: COL.mid, lineWidth: 1, lineStyle: 1, title: "Battle line", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    botS = chart.addLineSeries({ color: COL.bot, lineWidth: 2, lineStyle: 2, title: "Yday low", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
  }

  /* one value per bar, with a gap at each session's first bar so the boxes don't join across the overnight */
  function perSession(B, arr) {
    return B.map(function (b, i) {
      var lastOfDay = i < B.length - 1 && B[i + 1].date !== b.date;
      if (arr[i] == null) return { time: b.time };
      return lastOfDay ? { time: b.time, value: arr[i], color: "rgba(0,0,0,0)" } : { time: b.time, value: arr[i] };
    });
  }

  /* ---------- side panel ---------- */
  function renderSide(r, B, forming, nClosed) {
    var cur = B[B.length - 1], li = nClosed - 1, last = B[li], today = last.date, tr = r.open, pd = r.pend;
    var T = r.top[li], M = r.mid[li], L = r.bot[li];
    var lastEv = r.events.length ? r.events[r.events.length - 1] : null;
    var entryNow = lastEv && lastEv.t === li && lastEv.kind === "entry";
    var pos = T == null ? null : (last.c - L) / (T - L);
    var zone = T == null ? "" : last.c > T ? "above the box" : last.c < L ? "below the box" : pos >= 0.85 ? "at the top edge" : pos <= 0.15 ? "at the bottom edge" : "in the middle — no trade here";
    var status = T == null ? "No prior session loaded"
      : entryNow ? (lastEv.side === "S" ? "SHORT · broke the John Wick low" : "LONG · broke the John Wick high")
      : tr ? (tr.side === "S" ? "SHORT open" : "LONG open") + (tr.be ? " · stop at breakeven" : "")
      : pd ? "John Wick at yesterday's " + (pd.side === "S" ? "high" : "low") + " · waiting for the break"
      : "Flat · price " + zone;
    var play = "";
    if (tr) {
      var R0 = Math.abs(tr.e - tr.sl0), nowR = (tr.side === "S" ? tr.e - last.c : last.c - tr.e) / R0;
      play = (tr.side === "S" ? "Short " : "Long ") + money(tr.e) + " at " + clock(B[tr.t].min) + ". Stop " + money(tr.sl) + (tr.be ? " (breakeven, held past the battle line)" : " beyond the wick") +
        ", target " + money(tr.tp) + " at the other side of the box. " + (nowR >= 0 ? "+" : "") + nowR.toFixed(2) + "R on the last close. A close back " + (tr.side === "S" ? "over " : "under ") + money(tr.lvl) + " means leave.";
    } else if (pd) {
      play = pd.side === "S" ? "Wicked to " + money(pd.h) + " and closed back under " + money(pd.lvl) + ". Short a break of " + money(pd.l) + ", stop " + money(pd.sl) + ", target " + money(L) + "."
                             : "Wicked to " + money(pd.l) + " and closed back over " + money(pd.lvl) + ". Buy a break of " + money(pd.h) + ", stop " + money(pd.sl) + ", target " + money(T) + ".";
    } else if (T != null) {
      play = "Wait at the edges for a wick through and a close back inside. Don't buy a run into " + money(T) + ", don't sell a run into " + money(L) + ".";
    }
    var evs = r.events.filter(function (x) { return B[x.t].date === today && x.kind === "entry"; }).slice(-6).reverse();
    var skips = r.events.filter(function (x) { return B[x.t].date === today && (x.kind === "skip" || x.kind === "cancel"); }).length;
    var dates = []; B.forEach(function (b) { if (dates[dates.length - 1] !== b.date) dates.push(b.date); });
    var wins = 0, losses = 0, flat = 0;
    r.trades.forEach(function (t) { if (t.why === "target") wins++; else if (t.why === "stop") losses++; else if (t.why === "breakeven") flat++; });
    function outcome(x) {
      var done = null; r.trades.forEach(function (t) { if (t.t === x.t) done = t; });
      if (!done) return '<span class="pos">open</span>';
      var R2 = Math.abs(done.e - done.sl0), rr = (x.side === "S" ? done.e - done.x : done.x - done.e) / R2;
      var tag = done.why === "breakeven" ? "BE " : done.why === "level reclaimed" ? "left " : done.why === "session end" ? "close " : "";
      return '<span class="' + (rr > 0.005 ? "pos" : rr < -0.005 ? "neg" : "quiet") + '">' + tag + (rr > 0 ? "+" : "") + rr.toFixed(2) + "R</span>";
    }
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · last closed bar · " + clock(last.min) + "</p>" +
      '<p class="v">' + status + "</p>" +
      (play ? '<p class="play">' + play + "</p>" : "") +
      '<dl class="lv"><div><dt>Yday high</dt><dd>' + money(T) + "</dd></div>" +
      '<div><dt>Battle line</dt><dd style="color:' + COL.mid + '">' + money(M) + "</dd></div>" +
      '<div><dt>Yday low</dt><dd style="color:' + COL.bot + '">' + money(L) + "</dd></div>" +
      '<div><dt>Close</dt><dd>' + money(last.c) + "</dd></div>" +
      '<div><dt>In the box</dt><dd>' + (pos == null ? "—" : Math.round(pos * 100) + "%") + "</dd></div>" +
      '<div><dt>Box size</dt><dd>' + (T == null ? "—" : money(T - L)) + "</dd></div></dl>" +
      (forming ? '<p class="k">The ' + clock(cur.min) + " bar is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Trades today</p>' + (evs.length ? '<ul class="trades">' + evs.map(function (x) {
        return "<li><span>" + clock(B[x.t].min) + " · " + (x.side === "S" ? "SHORT" : "LONG") + " at " + money(x.e) + "</span>" + outcome(x) + "</li>";
      }).join("") + "</ul>" : '<p class="quiet">None yet today' + (skips ? " · " + skips + " skipped (grey)" : "") + ".</p>") +
      '<p class="k">Loaded sessions (' + dates.length + ") · targets " + wins + " · stops " + losses + " · breakeven " + flat + "</p>";
  }

  /* ---------- data ---------- */
  function setGate(msg) {
    root.classList.add("gated"); els.gate.hidden = false;
    els.status.textContent = SYMBOL + " · " + LiveKit.tfLabel(MULT) + " · not loaded";
    els.gate.innerHTML = msg.replace(/<\/b>\s*([\s\S]+)$/, "</b><span>$1</span>");
  }
  function load() {
    var tok = previewToken();
    var url = "/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&mult=" + MULT + "&rth=1" + (tok ? "&preview=" + encodeURIComponent(tok) : "");
    return fetch(url, { cache: "no-store" }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, body: j }; });
    }).then(function (res) {
      if (!res.ok) {
        var e = res.body && res.body.error;
        if (e === "private") setGate("<b>Live chart in private preview.</b> Open this page once with your preview link to unlock it in this browser.");
        else if (e === "not_configured") setGate("<b>Live chart not configured yet.</b> Add <code>api/config.php</code> on the server.");
        else if (e === "symbol_not_allowed") setGate("<b>" + SYMBOL + " isn't on the allowed list.</b> Add it to <code>symbols</code> in <code>api/config.php</code>, or use <code>'*'</code> to allow any ticker.");
        else if (e === "bad_symbol") setGate("<b>That doesn't look like a ticker.</b>");
        else setGate("<b>Live data unavailable right now.</b> Try again in a minute.");
        return false;
      }
      render(res.body); return true;
    }).catch(function () { setGate("<b>Live data unavailable right now.</b> Try again in a minute."); return false; });
  }

  function render(data) {
    var B = [];
    data.bars.forEach(function (a) {
      var t = etParts(a[0]);
      if (t.min >= RTH_OPEN && t.min < RTH_CLOSE) B.push({ date: t.date, min: t.min, time: t.wall, ms: a[0], o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] || 0 });
    });
    if (B.length < 30) { setGate("<b>Not enough data yet for " + SYMBOL + ".</b>"); return; }
    var asOf = (data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900);
    var forming = !data.date && B[B.length - 1].ms / 1000 + MULT * 60 > asOf;
    var nClosed = forming ? B.length - 1 : B.length;
    var r = signals(B, { n: nClosed });

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(B.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    var hit = {}; r.events.forEach(function (e) { if (e.kind === "jw" || e.kind === "jw-busy") hit[e.t] = 1; });
    volS.setData(B.map(function (b, i) { return { time: b.time, value: b.v, color: hit[i] ? COL.volHit : b.c >= b.o ? COL.volUp : COL.volDn }; }));
    topS.setData(perSession(B, r.top));
    midS.setData(perSession(B, r.mid));
    botS.setData(perSession(B, r.bot));

    /* markers: John Wick candles, entries, the chase bars, skips and cancels (grey), breakeven, exits */
    var marks = [], lastDate = B[B.length - 1].date;
    r.events.forEach(function (e) {
      var S = e.side === "S", away = S ? "aboveBar" : "belowBar", tm = B[e.t].time, today = B[e.t].date === lastDate;
      if (e.kind === "jw") marks.push({ time: tm, position: away, shape: "circle", color: COL.jw, text: "JW" });
      else if (e.kind === "jw-busy") marks.push({ time: tm, position: away, shape: "circle", color: COL.skip, text: "JW · in trade" });
      else if (e.kind === "entry") marks.push({ time: tm, position: away, shape: S ? "arrowDown" : "arrowUp", color: S ? COL.sell : COL.buy, text: S ? "SHORT" : "LONG" });
      else if (e.kind === "chase") marks.push({ time: tm, position: away, shape: "square", color: COL.chase, text: S ? "don't buy" : "don't short" });
      else if (e.kind === "skip") marks.push({ time: tm, position: away, shape: "circle", color: COL.skip, text: today ? "skip: " + e.why : "" });   // skip reasons labelled on the latest session only
      else if (e.kind === "cancel" || e.kind === "busy") marks.push({ time: tm, position: away, shape: "circle", color: COL.skip, text: !today ? "" : e.kind === "busy" ? "in trade" : e.why });
      else if (e.kind === "be") marks.push({ time: tm, position: S ? "belowBar" : "aboveBar", shape: "circle", color: COL.entry, text: "stop to BE" });
    });
    r.trades.forEach(function (t) {
      if (t.why === "session end") return;
      var S = t.side === "S", good = t.why === "target";
      marks.push({ time: B[t.xt].time, position: good === S ? "belowBar" : "aboveBar", shape: "square", color: good ? COL.tp : t.why === "stop" ? COL.sl : COL.skip,
        text: good ? "TP hit" : t.why === "stop" ? "Stop" : t.why === "breakeven" ? "BE" : "left" });
    });
    marks.sort(function (a, b) { return a.time - b.time; });
    candles.setMarkers(marks);

    /* entry / target / stop for the last few trades (the stop steps to the entry at breakeven) */
    lineS.forEach(function (s) { chart.removeSeries(s); }); lineS = [];
    var show = r.trades.slice(-6).map(function (t) { return { t: t.t, xt: t.xt, e: t.e, tp: t.tp, sl0: t.sl0, beT: t.be ? t.beT : null }; });
    if (r.open) show.push({ t: r.open.t, xt: nClosed - 1, e: r.open.e, tp: r.open.tp, sl0: r.open.sl0, beT: r.open.be ? r.open.beT : null, live: true });
    show.forEach(function (t) {
      var t0 = B[t.t].time, t1 = Math.max(B[t.xt].time, t0 + MULT * 60);
      [[t.e, COL.entry, 0], [t.tp, COL.tp, 2]].forEach(function (d) {
        var s = chart.addLineSeries({ color: d[1], lineWidth: 1, lineStyle: d[2], priceLineVisible: false, lastValueVisible: !!t.live,
          crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
        s.setData([{ time: t0, value: d[0] }, { time: t1, value: d[0] }]);
        lineS.push(s);
      });
      var pts = [{ time: t0, value: t.sl0 }];
      if (t.beT != null && t.beT + 1 <= t.xt) { pts.push({ time: B[t.beT + 1].time, value: t.e }); if (B[t.beT + 1].time < t1) pts.push({ time: t1, value: t.e }); }
      else pts.push({ time: t1, value: t.sl0 });
      var ss = chart.addLineSeries({ color: COL.sl, lineWidth: 1, lineStyle: 2, lineType: 1, priceLineVisible: false, lastValueVisible: !!t.live,
        crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
      ss.setData(pts); lineS.push(ss);
    });

    if (!render.fitted) {
      var span = MULT >= 15 ? 160 : MULT >= 5 ? 200 : 260;
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, B.length - span), to: B.length - 1 + 6 });
      render.fitted = true;
    }
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · regular session · yesterday's high (white), low (blue) and battle line = their midpoint (grey) · JW = John Wick: wick through the edge, red/green close back inside, wick ≥ body · entry on the break within 3 bars · stop to breakeven after 2 closes past the battle line · grey = skipped" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
