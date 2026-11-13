/* =====================================================================
   atr-live.js — live ATR-band hybrid scalp chart.

   The page is written for Nasdaq index futures; the data here is US
   equities, so the chart defaults to QQQ as the closest equity proxy.
   Pulls regular-session bars (5-minute by default, the page's chart; 1 / 2 /
   5 / 15 selectable) from /api/bars.php (the API key stays on the
   server) and runs the page's two playbooks in the browser. Same
   definitions as js/atr-anim.js:

     · ATR(14) of the chart's candles, Wilder smoothing (seeded with the
       simple average of the first 14 true ranges). Regular-session bars
       only, so the overnight gap is part of each session's first true range.
     · LOWER BAND for a candle = the PREVIOUS candle's close − 3.1 × the
       PREVIOUS candle's ATR. It is fixed before the candle opens and
       rounded down to the cent (the buy limit price).
     · NEVER TRADE THE OPENING CANDLE: the session's first candle on the
       chart is skipped for both playbooks (marked "open · skip").
     · LONG = any later candle whose low touches the band (low ≤ band). No
       other filter. Filled at the band, or at the open if the candle opens
       below it. Target = entry + 2 × that same previous-candle ATR, stop =
       entry − 1.5 × it (to the cent), both fixed at entry. Exits are checked
       stop before target; a gap through either level
       fills at the open. On the entry candle only the stop is checked, plus
       the target when the candle CLOSES at or beyond it (price must have
       crossed it after the fill). Held until one is hit, however long.
     · SHORT = a candle (green or red) whose upper wick ≥ 2 × its body and
       whose lower wick is negligible — taken here as ≤ 10% of the candle's
       range (the page doesn't give a number) — on a day whose PRIOR regular
       session closed red (its last close below its first open). Short at the
       next candle's open, cover at that same candle's close: no target, no
       stop. A pattern on the session's last candle has no next candle and is
       skipped.
     · One trade at a time: a band touch or wick while a trade is on is
       marked "in trade" and not taken. The band is used for longs only.
   Signals are taken on CLOSED candles only; the newest candle is drawn but
   ignored until it has closed.

   Mount: <section data-atr-live data-symbol="QQQ">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { atrN: 14, k: 3.1, tgt: 2, stp: 1.5, wick: 2, lowWick: 0.1, rthOpen: 570, rthClose: 960 };

  /* ---------- the rules (pure: bars in, lines + events + trades out) ----------
     B   = [{ date:"YYYY-MM-DD", min: minutes after midnight ET, o, h, l, c }, …] regular session, ascending
     opt = { mult, k, tgt, stp, wick, lowWick, atrN, nClosed } */
  function signals(B, opt) {
    var o = {}; for (var q in OPT) o[q] = OPT[q]; for (q in opt || {}) o[q] = opt[q];
    var n = o.nClosed == null ? B.length : o.nClosed, N = o.atrN, t;
    function cents(x) { return Math.round(x * 100) / 100; }
    /* ATR (Wilder) and the band */
    var atr = [], band = [], a = null, s = 0;
    for (t = 0; t < B.length; t++) {
      var b0 = B[t], tr = t ? Math.max(b0.h - b0.l, Math.abs(b0.h - B[t - 1].c), Math.abs(b0.l - B[t - 1].c)) : b0.h - b0.l;
      if (t < N) { s += tr; if (t === N - 1) a = s / N; } else a = (a * (N - 1) + tr) / N;
      atr[t] = t >= N - 1 ? a : null;
      band[t] = t && atr[t - 1] != null ? Math.floor((B[t - 1].c - o.k * atr[t - 1]) * 100 + 1e-7) / 100 : null;
    }
    /* each session's color (first open vs last close), and the prior session's for each date */
    var ses = [], byDate = {};
    B.forEach(function (b, i) {
      var S = byDate[b.date];
      if (!S) { S = byDate[b.date] = { date: b.date, i0: i, i1: i, open: b.min === o.rthOpen ? b.o : null, close: b.c }; ses.push(S); }
      S.i1 = i; S.close = b.c;
    });
    var prior = {};
    ses.forEach(function (S, j) {
      var P = ses[j - 1];
      prior[S.date] = !P || P.open == null || B[P.i1].min + (o.mult || 5) < o.rthClose ? null : P.close < P.open ? "red" : P.close > P.open ? "green" : "flat";
    });
    var events = [], trades = [], long = null, short = null;
    function opening(i) { return i === 0 || B[i].date !== B[i - 1].date; }
    function lastOfSession(i) { return B[i].min + (o.mult || 5) >= o.rthClose || (i + 1 < B.length && B[i + 1].date !== B[i].date); }
    for (t = 0; t < n; t++) {
      var b = B[t];
      /* a short lives for exactly one candle: in at its open, out at its close */
      if (short && short.t === t) {
        short.x = b.c; short.pts = short.e - b.c; short.why = "time"; trades.push(short); short = null;
        if (band[t] != null && b.l <= band[t]) events.push({ t: t, side: "L", kind: "busy" });
        if (isWick(b)) events.push({ t: t, side: "S", kind: "busy" });
        continue;
      }
      /* long exits: stop before target, gaps fill at the open; on the entry candle only the stop */
      if (long) {
        var x = null, why = null;
        if (t > long.t && b.o <= long.sl) { x = b.o; why = "stop"; }
        else if (b.l <= long.sl) { x = long.sl; why = "stop"; }
        else if (t > long.t && b.o >= long.tp) { x = b.o; why = "target"; }
        else if (t > long.t && b.h >= long.tp) { x = long.tp; why = "target"; }
        if (why) { long.xt = t; long.x = x; long.why = why; long.pts = x - long.e; long.r = (x - long.e) / (long.e - long.sl); trades.push(long); long = null; }
        if (long || why) {                                    // still in, or out on this very candle: no new entries on it
          if (band[t] != null && b.l <= band[t] && !(long && long.t === t)) events.push({ t: t, side: "L", kind: "busy" });
          if (isWick(b)) events.push({ t: t, side: "S", kind: "busy" });
          continue;
        }
      }
      /* LONG: the low touches the band */
      if (band[t] != null && b.l <= band[t]) {
        if (opening(t)) events.push({ t: t, side: "L", kind: "open", band: band[t] });
        else {
          var A = atr[t - 1], e = Math.min(b.o, band[t]);
          long = { t: t, side: "L", e: e, band: band[t], atr: A, tp: cents(e + o.tgt * A), sl: cents(e - o.stp * A) };
          events.push({ t: t, side: "L", kind: "buy", trade: long });
          if (b.l <= long.sl) { long.xt = t; long.x = long.sl; long.why = "stop"; long.pts = long.sl - e; long.r = -1; trades.push(long); long = null; }
          /* a close at or above the target means price went through it after the fill */
          else if (b.c >= long.tp) { long.xt = t; long.x = long.tp; long.why = "target"; long.pts = long.tp - e; long.r = long.pts / (e - long.sl); trades.push(long); long = null; }
          continue;                                           // the wick test below doesn't apply on an entry candle
        }
      }
      /* SHORT: the rejection wick */
      if (isWick(b)) {
        var ctx = prior[b.date], ev = { t: t, side: "S", prior: ctx };
        if (opening(t)) ev.kind = "open";
        else if (ctx !== "red") ev.kind = ctx == null ? "noprior" : "green";
        else if (lastOfSession(t)) ev.kind = "last";
        else {
          ev.kind = "sell";
          short = { t: t + 1, sig: t, side: "S", e: t + 1 < B.length ? B[t + 1].o : null };
          ev.trade = short;
        }
        events.push(ev);
      }
    }
    function isWick(c) {
      var rng = c.h - c.l, body = Math.abs(c.c - c.o), up = c.h - Math.max(c.o, c.c), lo = Math.min(c.o, c.c) - c.l;
      return rng > 0 && up >= o.wick * body && lo <= o.lowWick * rng;
    }
    var all = trades.slice();
    if (long) { var c = {}; for (q in long) c[q] = long[q]; c.xt = n - 1; c.x = B[n - 1].c; c.why = "open"; c.pts = c.x - c.e; c.r = c.pts / (c.e - c.sl); all.push(c); }
    return { atr: atr, band: band, prior: prior, events: events, trades: trades, all: all, long: long, short: short, isWick: isWick };
  }

  var POLL_MS = 60000, MULT = 5;
  var COL = { band: "#2997ff", atr: "#f4b942", buy: "#30d158", sell: "#ff453a", rej: "#8e8e93", entry: "#2997ff", tp: "#30d158", sl: "#ff453a", wick: "#f4b942" };

  var root = document.querySelector("[data-atr-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") { window.ATRLive = { signals: signals }; return; }
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate")
  };
  var KIT = LiveKit.controls(root, { key: "atr", symbol: (root.getAttribute("data-symbol") || "QQQ").toUpperCase(), tf: MULT,
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
  function signed(x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(2); }
  function clock(min) { var h = Math.floor(min / 60), m = min % 60; return (h > 12 ? h - 12 : h) + ":" + (m < 10 ? "0" : "") + m + (h >= 12 ? " pm" : " am"); }

  /* ---------- chart ---------- */
  var chart = null, candles, bandS, atrS, lineS = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.06, bottom: 0.24 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: 0 }
    });
    atrS = chart.addLineSeries({ priceScaleId: "atr", color: COL.atr, lineWidth: 1, title: "ATR 14", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    chart.priceScale("atr").applyOptions({ scaleMargins: { top: 0.82, bottom: 0.02 }, visible: false });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    bandS = chart.addLineSeries({ color: COL.band, lineWidth: 2, lineStyle: 2, lineType: 1, title: "3.1× ATR band", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
  }

  /* ---------- side panel ---------- */
  var SKIP = { open: "opening candle · skip", busy: "in a trade · skip", green: "prior day green · skip", flat: "prior day flat · skip", noprior: "no prior day loaded · skip", last: "last candle of the day · skip" };
  function renderSide(r, B, forming, nClosed) {
    var cur = B[B.length - 1], last = B[nClosed - 1], li = nClosed - 1, today = last.date;
    var A = r.atr[li], nextBand = A != null ? Math.floor((last.c - OPT.k * A) * 100 + 1e-7) / 100 : null;
    var ctx = r.prior[today], L = r.long, S = r.short;
    var lastEv = r.events.length ? r.events[r.events.length - 1] : null;
    var sessionOver = last.min + MULT >= OPT.rthClose;
    var status = L ? (L.t === li ? "BUY filled at the band" : "LONG open")
      : S ? (S.t < B.length ? "SHORT on for one candle" : "Short at the next open")
      : sessionOver ? "Session closed"
      : "Watching the band" + (ctx === "red" ? " and the wicks" : "");
    var play = "";
    if (L) {
      var nowR = (last.c - L.e) / (L.e - L.sl);
      play = "Bought " + money(L.e) + " at " + clock(B[L.t].min) + (B[L.t].date !== today ? " (an earlier session)" : "") + " on a band touch. Previous candle's ATR " + money(L.atr) +
        ": target " + money(L.tp) + " (+2 ATR), stop " + money(L.sl) + " (−1.5 ATR). Both fixed. " + (nowR >= 0 ? "+" : "") + nowR.toFixed(2) + "R on the last close.";
    } else if (S) {
      play = S.t < B.length ? "Shorted " + money(S.e) + " at the " + clock(B[S.t].min) + " open after a rejection wick. It covers at that candle's close, no matter what. No target, no stop."
        : "The " + clock(B[S.sig].min) + " candle is a rejection wick on a red-prior-day session. Short at the next candle's open, cover at its close.";
    } else if (!sessionOver && nextBand != null) {
      play = "The buy limit for the " + (forming ? clock(cur.min) : "next") + " candle sits at " + money(nextBand) + " (" + money(last.c) + " − 3.1 × " + money(A) + "). A touch fills it: target +" + money(OPT.tgt * A) + ", stop −" + money(OPT.stp * A) + ". " +
        (ctx === "red" ? "The prior day closed red, so an upper wick ≥ 2× the body with almost no lower wick is a one-candle short." : "The prior day didn't close red, so shorts are off today.");
    }
    var evs = r.events.filter(function (x) { return B[x.t].date === today; }).slice(-7).reverse();
    var dates = []; B.forEach(function (b) { if (dates[dates.length - 1] !== b.date) dates.push(b.date); });
    var lt = 0, lw = 0, ll = 0, st = 0, sw = 0, spts = 0;
    r.trades.forEach(function (t) { if (t.side === "L") { lt++; if (t.why === "target") lw++; else ll++; } else { st++; spts += t.pts; if (t.pts > 0) sw++; } });
    function outcome(x) {
      if (!x.trade) return "";
      var done = null; r.trades.forEach(function (t) { if (t === x.trade) done = t; });
      if (!done) return '<span class="pos">open</span>';
      if (done.side === "L") return '<span class="' + (done.r > 0 ? "pos" : "neg") + '">' + (done.r > 0 ? "+" : "") + done.r.toFixed(2) + "R</span>";
      return '<span class="' + (done.pts > 0 ? "pos" : "neg") + '">' + signed(done.pts) + "</span>";
    }
    function line(x) {
      var what = x.kind === "buy" ? "BUY " + money(x.trade.e) + " · band touch"
        : x.kind === "sell" ? "Wick · SHORT " + (x.trade.e != null ? money(x.trade.e) + " at the " + clock(B[x.trade.t].min) + " open" : "at the next open")
        : (x.side === "L" ? "Band touch · " : "Wick · ") + SKIP[x.kind];
      return "<li><span>" + clock(B[x.t].min) + " · " + what + "</span>" + outcome(x) + "</li>";
    }
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · last closed candle · " + clock(last.min) + "</p>" +
      '<p class="v">' + status + "</p>" +
      (play ? '<p class="play">' + play + "</p>" : "") +
      '<dl class="lv"><div><dt>ATR(14)</dt><dd style="color:' + COL.atr + '">' + money(A) + "</dd></div>" +
      '<div><dt>Next band</dt><dd style="color:' + COL.band + '">' + money(nextBand) + "</dd></div>" +
      "<div><dt>Close − band</dt><dd>" + (nextBand != null ? money(last.c - nextBand) : "—") + "</dd></div>" +
      '<div><dt>Target</dt><dd class="up">+' + (A != null ? money(OPT.tgt * A) : "—") + "</dd></div>" +
      '<div><dt>Stop</dt><dd class="dn">−' + (A != null ? money(OPT.stp * A) : "—") + "</dd></div>" +
      '<div><dt>Prior day</dt><dd class="' + (ctx === "red" ? "dn" : ctx === "green" ? "up" : "") + '">' + (ctx ? ctx[0].toUpperCase() + ctx.slice(1) : "—") + "</dd></div></dl>" +
      (forming ? '<p class="k">The ' + clock(cur.min) + " candle is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Signals today</p>' + (evs.length ? '<ul class="trades">' + evs.map(line).join("") + "</ul>" : '<p class="quiet">None yet today.</p>') +
      '<p class="k">Loaded sessions (' + dates.length + ") · longs " + lt + " (targets " + lw + ", stops " + ll + ") · shorts " + st + " (" + sw + " winners, " + signed(spts) + " pts)</p>";
  }

  /* ---------- data ---------- */
  function setGate(msg) {
    root.classList.add("gated"); els.gate.hidden = false;
    els.status.textContent = SYMBOL + " · " + LiveKit.tfLabel(MULT) + " · not loaded";
    els.gate.innerHTML = msg.replace(/<\/b>\s*([\s\S]+)$/, "</b><span>$1</span>");
  }
  function load() {
    var tok = previewToken(), mine = SYMBOL + "|" + MULT;
    var url = "/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&mult=" + MULT + "&rth=1" + (tok ? "&preview=" + encodeURIComponent(tok) : "");
    return fetch(url, { cache: "no-store" }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, body: j }; });
    }).then(function (res) {
      if (mine !== SYMBOL + "|" + MULT) return false;
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
      if (t.min >= OPT.rthOpen && t.min < OPT.rthClose) B.push({ date: t.date, min: t.min, time: t.wall, ms: a[0], o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] || 0 });
    });
    if (B.length < 60) { setGate("<b>Not enough data yet for " + SYMBOL + ".</b>"); return; }
    var asOf = (data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900);
    var forming = !data.date && B[B.length - 1].ms / 1000 + MULT * 60 > asOf;
    var nClosed = forming ? B.length - 1 : B.length;
    var r = signals(B, { mult: MULT, nClosed: nClosed });

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(B.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    /* the band for every candle incl. the forming one (it is known before the candle opens) */
    bandS.setData(B.map(function (b, i) { return r.band[i] == null ? { time: b.time } : { time: b.time, value: r.band[i] }; }));
    atrS.setData(B.map(function (b, i) { return r.atr[i] == null ? { time: b.time } : { time: b.time, value: r.atr[i] }; }));

    var marks = [];
    r.events.forEach(function (x) {
      var tm = B[x.t].time;
      if (x.kind === "buy") marks.push({ time: tm, position: "belowBar", shape: "arrowUp", color: COL.buy, text: "BUY band" });
      else if (x.kind === "sell") marks.push({ time: tm, position: "aboveBar", shape: "circle", color: COL.wick });   // the wick; the SHORT arrow sits on the next candle
      else if (x.side === "L") marks.push({ time: tm, position: "belowBar", shape: "circle", color: COL.rej, text: x.kind === "open" ? "open · skip" : "in trade" });
      else if (x.kind === "open" || x.kind === "busy") marks.push({ time: tm, position: "aboveBar", shape: "circle", color: COL.rej, text: x.kind === "open" ? "open · skip" : "in trade" });
      else marks.push({ time: tm, position: "aboveBar", shape: "circle", color: "rgba(142,142,147,0.6)", size: 0.5 });   // wick on a non-red day / last candle: a bare dot
    });
    r.trades.concat(r.short && r.short.t < B.length ? [r.short] : []).forEach(function (t) {
      if (t.side === "S") {
        marks.push({ time: B[t.t].time, position: "aboveBar", shape: "arrowDown", color: COL.sell, text: "SHORT" + (t.pts != null ? " " + signed(t.pts) : "") });
        return;
      }
      if (t.why === "target" || t.why === "stop")
        marks.push({ time: B[t.xt].time, position: t.why === "target" ? "aboveBar" : "belowBar", shape: "square", color: t.why === "target" ? COL.tp : COL.sl, text: t.why === "target" ? "+2 ATR" : "Stop" });
    });
    marks.sort(function (a, b) { return a.time - b.time; });
    candles.setMarkers(marks);

    /* entry / target / stop for the last few longs; entry / cover for the last few shorts */
    lineS.forEach(function (s) { chart.removeSeries(s); }); lineS = [];
    function seg(t0, t1, v, col, style, live) {
      var s = chart.addLineSeries({ color: col, lineWidth: 1, lineStyle: style, priceLineVisible: false, lastValueVisible: !!live,
        crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
      s.setData([{ time: t0, value: v }, { time: t1, value: v }]); lineS.push(s);
    }
    var longs = r.trades.filter(function (t) { return t.side === "L"; }).slice(-6);
    if (r.long) longs.push({ t: r.long.t, xt: nClosed - 1, e: r.long.e, tp: r.long.tp, sl: r.long.sl, live: true });
    longs.forEach(function (t) {
      var t0 = B[t.t].time, t1 = Math.max(B[t.xt].time, t0 + MULT * 60);
      seg(t0, t1, t.e, COL.entry, 0, t.live); seg(t0, t1, t.tp, COL.tp, 2, t.live); seg(t0, t1, t.sl, COL.sl, 2, t.live);
    });
    r.trades.filter(function (t) { return t.side === "S"; }).slice(-6).forEach(function (t) {
      var t0 = B[t.sig].time, t1 = B[t.t].time + MULT * 60;
      seg(t0, t1, t.e, COL.sell, 0, false); seg(t0, t1, t.x, COL.tp, 2, false);
    });

    var span = MULT >= 15 ? 130 : MULT >= 5 ? 160 : MULT >= 2 ? 200 : 260;
    if (!render.fitted) {
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, B.length - span), to: B.length - 1 + 6 });
      render.fitted = true;
    }
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · regular session · QQQ is the default equity proxy for the page's Nasdaq futures · blue = previous close − 3.1 × ATR(14) of the previous candle · gold = ATR(14) · opening candle skipped · longs +2 / −1.5 ATR · shorts: upper wick ≥ 2× body, lower wick ≤ 10% of the range, prior day red, one candle" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  window.ATRLive = { signals: signals };

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
