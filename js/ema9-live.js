/* =====================================================================
   ema9-live.js — live 9 EMA Continuation chart.

   Pulls regular-session bars (5-minute by default, like the walkthrough;
   1 / 2 / 5 / 15 selectable) from /api/bars.php (the API key stays on
   the server) and runs the page's rules in the browser. Long only, as the
   page teaches it. The rules, in order:

     · 9 EMA of the closes (seeded with the first loaded close, runs across
       sessions). Nothing for the first 30 bars while it warms up.
     · BREAKOUT ON VOLUME (objective version of "breaks out of a range on
       real volume"): a bar CLOSES above the highest high of the 12 bars
       before it, above the 9 EMA, on volume ≥ 1.5× the average of the 20
       bars before it. No entry on that bar: don't chase.
       Further breakout bars before the touch are the same move (no new
       setup, the breakout bar's low stays the line in the sand).
     · PULLBACK TO THE 9 EMA: the first later bar whose LOW reaches the
       9 EMA is the touch. It has to come within 12 bars of the breakout,
       otherwise the setup is marked "no touch" (the ~2-in-10 that runs
       without you) and dropped.
     · FAILED TESTS: after the touch, every close below the 9 EMA is a
       failed test (sellers hitting the lift). Not a reason to quit.
     · THE RECLAIM = ENTRY: the first bar after the touch that closes back
       above the 9 EMA as a green candle (close > open: buyers stepping in).
       Buy that close. (The page's mechanical version: the first candle that
       closes back above the 9 EMA after the first touch.)
     · STOP: one cent under the pullback low (the lowest low from the touch
       bar through the reclaim bar).
     · The setup is void if a bar closes under the breakout bar's low (the
       breakout failed) or the session ends first.
     · HALF OFF on "an acceleration after an acceleration", made objective as
       a fixed target: half the position at +2R (2 × the entry-to-stop risk).
     · THE REST: out on the first CLOSE below the 9 EMA (the full trailing
       stop; it applies to whatever is still open), or at the session's last
       bar. Stop is checked first (intrabar), then the half-off target, then
       the close. Exits start on the bar after entry. One trade at a time.
   Not coded (your call on the day): the catalyst filter.
   Signals are taken on CLOSED bars only; the newest bar is drawn but ignored
   until it has closed.

   Mount: <section data-ema9-live data-symbol="NVDA">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { ema: 9, range: 12, volLen: 20, volX: 1.5, touchWait: 12, half: 2, tick: 0.01, warm: 30, rthClose: 960, mult: 5 };

  /* ---------- the rules (pure: bars in, lines + events out) ----------
     B: [{ o, h, l, c, v, date: "YYYY-MM-DD", min: minutes after midnight ET }]
     opt: overrides of OPT, plus n = number of CLOSED bars to evaluate (default all) */
  function signals(B, opt) {
    var o = {}, k;
    for (k in OPT) o[k] = OPT[k];
    for (k in (opt || {})) o[k] = opt[k];
    var n = o.n == null ? B.length : Math.min(o.n, B.length);
    var kk = 2 / (o.ema + 1), e = 0, E = [], VA = [], RH = [], t, i;
    for (t = 0; t < B.length; t++) {
      e = t ? e + (B[t].c - e) * kk : B[t].c; E[t] = e;
      if (t >= o.volLen) { var s = 0; for (i = t - o.volLen; i < t; i++) s += B[i].v; VA[t] = s / o.volLen; } else VA[t] = null;
      if (t >= o.range) { var m = -Infinity; for (i = t - o.range; i < t; i++) m = Math.max(m, B[i].h); RH[t] = m; } else RH[t] = null;
    }
    function isLast(t) { return t + 1 < B.length ? B[t + 1].date !== B[t].date : B[t].min + o.mult >= o.rthClose; }
    function finish(tr, t, x, why) {
      tr.xt = t; tr.x = x; tr.why = why;
      var r1 = (x - tr.e) / tr.risk;
      tr.r = tr.h ? 0.5 * o.half + 0.5 * r1 : r1;
      return tr;
    }
    var events = [], trades = [], setups = [], phase = [], tr = null, st = null;
    for (t = 0; t < n; t++) {
      var b = B[t], ee = E[t], last = isLast(t);
      /* manage the open trade from the bar after entry: stop, then half off, then the close under the 9 EMA */
      if (tr && t > tr.t) {
        var x = null, why = null;
        if (b.l <= tr.sl) { x = tr.sl; why = "stop"; }
        else {
          if (!tr.h && b.h >= tr.tp) { tr.h = { t: t, x: tr.tp }; events.push({ type: "half", t: t, x: tr.tp }); }
          if (b.c < ee) { x = b.c; why = "trail"; }
          else if (last) { x = b.c; why = "eod"; }
        }
        if (why) { trades.push(finish(tr, t, x, why)); events.push({ type: "exit", t: t, x: x, why: why }); tr = null; phase[t] = ""; continue; }
      }
      if (tr) { phase[t] = "in"; continue; }
      if (t < o.warm) { phase[t] = ""; continue; }
      var bo = RH[t] != null && VA[t] && b.c > RH[t] && b.c > ee && b.v >= o.volX * VA[t];
      if (bo && !st) {
        st = { phase: "bo", bo: t, rh: RH[t], boLow: b.l, vr: b.v / VA[t], touch: null, low: null, fails: 0 };
        setups.push(st);
        events.push({ type: "bo", t: t, rh: st.rh, vr: st.vr });
      } else if (st && st.phase === "bo") {
        if (b.c < st.boLow) { events.push({ type: "void", t: t, why: "failed" }); st.end = "failed"; st.et = t; st = null; }
        else if (b.l <= ee) { st.phase = "touch"; st.touch = t; st.low = b.l; events.push({ type: "touch", t: t }); }
        else if (t - st.bo >= o.touchWait) { events.push({ type: "notouch", t: t }); st.end = "notouch"; st.et = t; st = null; }
      } else if (st && st.phase === "touch") {
        st.low = Math.min(st.low, b.l);
        if (b.c < st.boLow) { events.push({ type: "void", t: t, why: "failed" }); st.end = "failed"; st.et = t; st = null; }
        else if (b.c > ee && b.c > b.o && !last) {
          var sl = +(st.low - o.tick).toFixed(4), risk = b.c - sl;
          tr = { t: t, e: b.c, sl: sl, risk: risk, tp: b.c + o.half * risk, bo: st.bo, touch: st.touch, low: st.low, rh: st.rh, vr: st.vr, fails: st.fails, h: null };
          events.push({ type: "buy", t: t, x: b.c });
          st.end = "buy"; st.et = t; st = null;
        } else if (b.c < ee) { st.fails++; events.push({ type: "fail", t: t }); }
      }
      if (st && last) { events.push({ type: st.phase === "bo" ? "notouch" : "void", t: t, why: "eod" }); st.end = "eod"; st.et = t; st = null; }
      phase[t] = tr ? "in" : st ? st.phase : "";
    }
    var all = trades.slice();
    if (tr) { var lc = B[n - 1].c; tr.now = (lc - tr.e) / tr.risk; }
    return { ema: E, vavg: VA, rangeHigh: RH, events: events, trades: trades, open: tr, setup: st, setups: setups, phase: phase, all: all };
  }

  var POLL_MS = 60000, MULT = 5, RTH_OPEN = 570, RTH_CLOSE = 960;
  var COL = { ema: "#f4b942", bo: "#30d158", buy: "#2997ff", fail: "#ff453a", skip: "#8e8e93", entry: "#2997ff", tp: "#30d158", sl: "#ff453a",
              rh: "#8e8e93", shBo: "rgba(48,209,88,0.07)", shTouch: "rgba(244,185,66,0.10)", shIn: "rgba(41,151,255,0.08)",
              volUp: "rgba(48,209,88,0.45)", volDn: "rgba(255,69,58,0.45)", volHit: "#30d158", vma: "#f5f5f7" };

  var root = document.querySelector("[data-ema9-live]");
  window.EMA9Live = { signals: signals };
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate")
  };
  var KIT = LiveKit.controls(root, { key: "ema9", symbol: (root.getAttribute("data-symbol") || "NVDA").toUpperCase(), tf: MULT,
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
  function rtxt(r) { return (r >= 0 ? "+" : "") + r.toFixed(2) + "R"; }

  /* ---------- chart ---------- */
  var chart = null, candles, emaS, volS, vmaS, shade, lineS = [], RUNS = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "rgba(0,0,0,0)" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.06, bottom: 0.24 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: 0 }
    });
    /* live setups are shaded on a canvas under the chart */
    els.chart.style.background = "#1d1d1f"; els.chart.style.zIndex = "0";
    shade = document.createElement("canvas");
    shade.setAttribute("aria-hidden", "true");
    shade.style.cssText = "position:absolute;left:0;top:0;z-index:-1;pointer-events:none";
    els.chart.appendChild(shade);
    var pending = false;
    function soon() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; drawShade(); }); }
    chart.timeScale().subscribeVisibleLogicalRangeChange(soon);
    window.addEventListener("resize", soon);
    volS = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false });
    vmaS = chart.addLineSeries({ priceScaleId: "vol", color: COL.vma, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 }, visible: false });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    emaS = chart.addLineSeries({ color: COL.ema, lineWidth: 2, title: "9 EMA", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
  }

  function drawShade() {
    if (!shade) return;
    var ts = chart.timeScale(), paneW = els.chart.clientWidth - chart.priceScale("right").width();
    var H = els.chart.clientHeight - ts.height(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    shade.style.width = paneW + "px"; shade.style.height = H + "px";
    shade.width = Math.max(1, paneW * dpr); shade.height = Math.max(1, H * dpr);
    var ctx = shade.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, paneW, H);
    var half = (ts.options().barSpacing || 6) / 2;
    RUNS.forEach(function (r) {
      var a = ts.logicalToCoordinate(r.i0), b = ts.logicalToCoordinate(r.i1);
      if (a == null || b == null) return;
      ctx.fillStyle = r.ph === "bo" ? COL.shBo : r.ph === "touch" ? COL.shTouch : COL.shIn;
      ctx.fillRect(a - half, 0, b - a + 2 * half, H * 0.78);
    });
  }
  function runs(r, n) {
    var out = [], cur = null;
    for (var i = 0; i < n; i++) {
      var a = r.phase[i] || "";
      if (a && cur && cur.ph === a && cur.i1 === i - 1) cur.i1 = i;
      else if (a) { cur = { ph: a, i0: i, i1: i }; out.push(cur); }
      else cur = null;
    }
    return out;
  }

  /* ---------- side panel ---------- */
  function renderSide(r, B, forming, nClosed) {
    var cur = B[B.length - 1], last = B[nClosed - 1], li = nClosed - 1, today = last.date;
    var e = r.ema[li], va = r.vavg[li], vr = va ? last.v / va : null, tr = r.open, st = r.setup;
    var warm = nClosed > OPT.warm;
    var lastEv = r.events.length ? r.events[r.events.length - 1] : null, evNow = lastEv && lastEv.t === li ? lastEv : null;
    var status = !warm ? "Warming up the 9 EMA"
      : evNow && evNow.type === "buy" ? "BUY confirmed · reclaim of the 9 EMA"
      : tr ? (tr.h ? "LONG open · half off, trailing the rest" : "LONG open · full size")
      : st && st.phase === "touch" ? "Touched the 9 EMA · waiting for the reclaim"
      : st ? "Breakout on volume · don't chase, wait for the pullback"
      : evNow && evNow.type === "exit" ? "Trade closed · " + (evNow.why === "stop" ? "stopped" : evNow.why === "eod" ? "flat at the close" : "closed under the 9 EMA")
      : "Waiting for a breakout on volume";
    var play = "";
    if (tr) {
      play = "In from " + money(tr.e) + " at " + clock(B[tr.t].min) + (B[tr.t].date !== today ? " (an earlier session)" : "") + ". Stop " + money(tr.sl) + " under the " + money(tr.low) + " pullback low. " +
        (tr.h ? "Half sold at " + money(tr.tp) + " (+" + OPT.half + "R). The rest goes on the first close under the 9 EMA (" + money(e) + ")."
              : "Half off at " + money(tr.tp) + " (+" + OPT.half + "R), the rest on the first close under the 9 EMA (" + money(e) + ").") +
        " " + rtxt(tr.now) + " on the last close (full size).";
    } else if (warm && st && st.phase === "touch") {
      play = "Pullback low so far " + money(st.low) + (st.fails ? ", " + st.fails + " failed test" + (st.fails > 1 ? "s" : "") : "") + ". A green candle closing back over the 9 EMA (" + money(e) + ") is the BUY, stop " + money(st.low - OPT.tick) + ".";
    } else if (warm && st) {
      play = "Closed over the " + money(st.rh) + " range high at " + clock(B[st.bo].min) + " on " + st.vr.toFixed(1) + "× volume. Watch for a low into the 9 EMA (" + money(e) + ") within " + OPT.touchWait + " bars; " + (OPT.touchWait - (li - st.bo)) + " left.";
    } else if (warm) {
      play = "Needs a close over " + money(r.rangeHigh[li] == null ? null : Math.max(r.rangeHigh[li], last.h)) + " (the " + OPT.range + "-bar high) on volume ≥ " + OPT.volX + "× average" + (va ? " (" + Math.round(OPT.volX * va).toLocaleString() + ")" : "") + ".";
    }
    var todays = r.all.concat(r.open ? [r.open] : []).filter(function (x) { return B[x.t].date === today; }).slice(-6).reverse();
    var dates = []; B.forEach(function (b) { if (dates[dates.length - 1] !== b.date) dates.push(b.date); });
    var nBo = 0, nMiss = 0, nVoid = 0, sumR = 0;
    r.events.forEach(function (x) { if (x.type === "bo") nBo++; else if (x.type === "notouch") nMiss++; else if (x.type === "void") nVoid++; });
    r.trades.forEach(function (x) { sumR += x.r; });
    function outcome(x) {
      if (x.why == null) return '<span class="open">open ' + rtxt(x.now) + "</span>";
      return '<span class="' + (x.r > 0 ? "pos" : "neg") + '">' + rtxt(x.r) + "</span>";
    }
    var above = last.c >= e;
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · last closed bar · " + clock(last.min) + "</p>" +
      '<p class="v">' + status + "</p>" +
      (play ? '<p class="play">' + play + "</p>" : "") +
      '<dl class="lv"><div><dt>9 EMA</dt><dd style="color:' + COL.ema + '">' + money(e) + "</dd></div>" +
      '<div><dt>Close</dt><dd class="' + (above ? "up" : "dn") + '">' + money(last.c) + "</dd></div>" +
      '<div><dt>Volume</dt><dd class="' + (vr != null && vr >= OPT.volX ? "up" : "") + '">' + (vr == null ? "—" : vr.toFixed(2) + "×") + "</dd></div>" +
      '<div><dt>' + OPT.range + "-bar high</dt><dd>" + money(r.rangeHigh[li]) + "</dd></div>" +
      '<div><dt>Setup</dt><dd>' + (tr ? "in trade" : st ? (st.phase === "bo" ? "breakout" : "at the line") : "none") + "</dd></div>" +
      '<div><dt>' + (tr ? "Stop" : "vs 9 EMA") + "</dt><dd" + (tr ? ' class="dn"' : "") + ">" + (tr ? money(tr.sl) : (above ? "above" : "below")) + "</dd></div></dl>" +
      (forming ? '<p class="k">The ' + clock(cur.min) + " bar is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Trades today</p>' + (todays.length ? '<ul class="trades">' + todays.map(function (x) {
        return "<li><span>" + clock(B[x.t].min) + " · BUY " + money(x.e) + " · stop " + money(x.sl) + (x.h ? " · ½ at +" + OPT.half + "R" : "") + "</span>" + outcome(x) + "</li>";
      }).join("") + "</ul>" : '<p class="quiet">None yet today.</p>') +
      '<p class="k">Loaded sessions (' + dates.length + ") · breakouts " + nBo + " · no touch " + nMiss + " · failed/void " + nVoid + " · trades " + r.trades.length + (r.trades.length ? " · net " + rtxt(sumR) : "") + "</p>";
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
    if (B.length < 60) { setGate("<b>Not enough data yet for " + SYMBOL + ".</b>"); return; }
    var asOf = (data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900);
    var forming = B[B.length - 1].ms / 1000 + MULT * 60 > asOf;
    var nClosed = forming ? B.length - 1 : B.length;
    var r = signals(B, { n: nClosed, mult: MULT });

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(B.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    var hit = {}; r.events.forEach(function (x) { if (x.type === "bo") hit[x.t] = 1; });
    volS.setData(B.map(function (b, i) { return { time: b.time, value: b.v, color: hit[i] ? COL.volHit : b.c >= b.o ? COL.volUp : COL.volDn }; }));
    vmaS.setData(B.map(function (b, i) { return r.vavg[i] == null ? { time: b.time } : { time: b.time, value: r.vavg[i] }; }));
    var w0 = Math.min(B.length - 1, 10);
    emaS.setData(B.map(function (b, i) { return i < w0 ? { time: b.time } : { time: b.time, value: r.ema[i] }; }));
    RUNS = runs(r, nClosed);

    /* markers */
    var marks = [];
    r.events.forEach(function (x) {
      var tm = B[x.t].time, m = null;
      if (x.type === "bo") m = { position: "aboveBar", shape: "circle", color: COL.bo, text: "BO " + x.vr.toFixed(1) + "×" };
      else if (x.type === "touch") m = { position: "belowBar", shape: "circle", color: COL.ema, size: 0.8 };
      else if (x.type === "fail") m = { position: "belowBar", shape: "circle", color: COL.fail, size: 0.6 };
      else if (x.type === "buy") m = { position: "belowBar", shape: "arrowUp", color: COL.buy, text: "BUY" };
      else if (x.type === "half") m = { position: "aboveBar", shape: "square", color: COL.tp, text: "½ off" };
      else if (x.type === "exit") m = { position: x.why === "stop" ? "belowBar" : "aboveBar", shape: "square", color: x.why === "stop" ? COL.sl : COL.ema, text: x.why === "stop" ? "Stop" : x.why === "eod" ? "EOD" : "trail out" };
      else if (x.type === "notouch") m = { position: "aboveBar", shape: "circle", color: COL.skip, text: "no touch" };
      else if (x.type === "void") m = { position: "belowBar", shape: "circle", color: COL.skip, text: x.why === "eod" ? "no reclaim" : "BO failed" };
      if (m) { m.time = tm; marks.push(m); }
    });
    marks.sort(function (a, b) { return a.time - b.time; });
    candles.setMarkers(marks);

    /* range high for the recent setups, entry / half-off / stop for the recent trades */
    lineS.forEach(function (s) { chart.removeSeries(s); }); lineS = [];
    function seg(v, col, style, t0, t1, lbl) {
      var s = chart.addLineSeries({ color: col, lineWidth: 1, lineStyle: style, priceLineVisible: false, lastValueVisible: !!lbl,
        crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
      s.setData([{ time: t0, value: v }, { time: Math.max(t1, t0 + MULT * 60), value: v }]);
      lineS.push(s);
    }
    r.setups.slice(-6).forEach(function (s) {
      var i0 = Math.max(0, s.bo - OPT.range), i1 = s.et != null ? s.et : (r.setup === s ? nClosed - 1 : s.bo);
      seg(s.rh, COL.rh, 2, B[i0].time, B[i1].time, false);
    });
    var show = r.trades.slice(-6);
    if (r.open) show.push({ t: r.open.t, xt: nClosed - 1, e: r.open.e, tp: r.open.tp, sl: r.open.sl, live: true });
    show.forEach(function (t) {
      var t0 = B[t.t].time, t1 = B[t.xt].time;
      seg(t.e, COL.entry, 0, t0, t1, t.live); seg(t.tp, COL.tp, 2, t0, t1, t.live); seg(t.sl, COL.sl, 2, t0, t1, t.live);
    });

    if (!render.fitted) {
      var span = MULT >= 15 ? 130 : MULT >= 5 ? 160 : 240;
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, B.length - span), to: B.length - 1 + 6 });
      render.fitted = true;
    }
    requestAnimationFrame(drawShade);
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · regular session · 9 EMA (gold) · breakout = close over the " + OPT.range + "-bar high on volume ≥ " + OPT.volX +
      "× its 20-bar average · touch within " + OPT.touchWait + " bars · gold dot = the touch, red dots = failed tests · buy the first green close back over the 9 EMA · half off at +" + OPT.half + "R, rest out on a close under the 9 EMA" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
