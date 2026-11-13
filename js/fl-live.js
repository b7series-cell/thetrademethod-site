/* =====================================================================
   fl-live.js — live Fashionably Late chart.

   Pulls regular-session bars (2-minute by default; 1 / 2 / 5 / 15 selectable) from /api/bars.php (the API key
   stays on the server) and runs pine/ema-vwap-reversal-cross.pine (EMA/VWAP
   Reversal Cross R1.2) in the browser with its default inputs:
     · 9 EMA of the close; session VWAP of hlc3, reset at each 9:30 open
     · pivots 3 bars each side; only a pivot from today can arm a signal
     · BUY  = 9 EMA crosses over VWAP inside window A (9:45–10:45 ET) or
              B (10:46–1:30 ET) with a pivot low armed; the pivot is used up
     · SELL = the mirror with a pivot high
     · distance = entry − pivot; target = entry + 1 × distance,
       stop = entry − distance ÷ 3 (mirrored for shorts)
     · exits: stop first, then target, from the next bar; not time-gated
   Signals are taken on CLOSED bars only (the indicator's history works the
   same way); the newest bar is drawn but ignored until it has closed.

   Mount: <section data-fl-live data-symbol="QQQ">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { ema: 9, pivot: 3, tpMult: 1.0, slDiv: 3.0, winA: [585, 645], winB: [646, 810] };
  var POLL_MS = 60000, MULT = 2, RTH_OPEN = 570, RTH_CLOSE = 960;
  var COL = { ema: "#f5f5f7", vwap: "#2ec4b6", buyA: "#30d158", buyB: "#a3e635", sellA: "#ff453a", sellB: "#ff7a90",
              winA: "rgba(46,196,182,0.10)", winB: "rgba(175,82,222,0.10)", entry: "#2997ff", tp: "#30d158", sl: "#ff453a" };

  var root = document.querySelector("[data-fl-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate"),
    form: root.querySelector(".live-symbol")
  };
  var KIT = LiveKit.controls(root, { key: "fl", symbol: (root.getAttribute("data-symbol") || "QQQ").toUpperCase(), tf: MULT,
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
  function windowOf(m) { return m >= OPT.winA[0] && m < OPT.winA[1] ? "A" : m >= OPT.winB[0] && m < OPT.winB[1] ? "B" : ""; }

  /* ---------- the indicator, bar by bar: a line-for-line twin of fl_engine() ---------- */
  function run(B, nClosed) {
    var n = nClosed == null ? B.length : nClosed, P = OPT.pivot, k2 = 2 / (OPT.ema + 1);
    var ema = [], vw = [], cpv = 0, cv = 0;
    var armL = false, armH = false, revL = null, revH = null, revLi = null, revHi = null;
    var crosses = [], signals = [], trades = [], tr = null, t, q;
    for (t = 0; t < B.length; t++) {               // EMA and VWAP for every bar, the forming one too
      var b0 = B[t], nd0 = t === 0 || b0.date !== B[t - 1].date;
      ema[t] = t === 0 ? b0.c : ema[t - 1] + (b0.c - ema[t - 1]) * k2;
      if (nd0) { cpv = 0; cv = 0; }
      var h3 = (b0.h + b0.l + b0.c) / 3; cpv += h3 * b0.v; cv += b0.v;
      vw[t] = cv > 0 ? cpv / cv : h3;
    }
    for (t = 0; t < n; t++) {
      var b = B[t], newDay = t === 0 || b.date !== B[t - 1].date;
      /* reversal tracking: same-day pivots only */
      if (newDay) { armL = false; armH = false; revL = null; revH = null; revLi = null; revHi = null; }
      var k = t - P;
      if (k - P >= 0 && B[k].date === b.date) {
        var isL = true, isH = true;
        for (q = k - P; q <= k + P; q++) {
          if (q === k) continue;
          if (B[q].l <= B[k].l) isL = false;
          if (B[q].h >= B[k].h) isH = false;
        }
        if (isL) { armL = true; revL = B[k].l; revLi = k; }
        if (isH) { armH = true; revH = B[k].h; revHi = k; }
      }
      /* the cross, the windows */
      var up = t > 0 && ema[t] > vw[t] && ema[t - 1] <= vw[t - 1];
      var dn = t > 0 && ema[t] < vw[t] && ema[t - 1] >= vw[t - 1];
      var win = windowOf(b.min);
      var buy = win !== "" && up && armL, sell = win !== "" && dn && armH;
      /* exits first (from the bar after entry), stop before target */
      if (tr && t > tr.t) {
        var x = null, why = null;
        if (tr.side === "L") {
          if (b.l <= tr.sl) { x = tr.sl; why = "stop"; }
          else if (b.h >= tr.tp) { x = tr.tp; why = "target"; }
        } else {
          if (b.h >= tr.sl) { x = tr.sl; why = "stop"; }
          else if (b.l <= tr.tp) { x = tr.tp; why = "target"; }
        }
        if (why) { trades.push(close(tr, t, x, why)); tr = null; }
      }
      /* crosses, for the funnel */
      if (up || dn) {
        var code = win === "" ? "o" : ((up ? armL : armH) ? "T" : "p");
        if (code === "T") { var d0 = up ? b.c - revL : revH - b.c; if (!(d0 > 0)) code = "d"; }
        crosses.push({ t: t, side: up ? "L" : "S", win: win, code: code });
      }
      [[buy, "L"], [sell, "S"]].forEach(function (f) {
        if (!f[0]) return;
        var side = f[1], piv = side === "L" ? revL : revH;
        var dist = side === "L" ? b.c - piv : piv - b.c;
        if (piv !== null && dist > 0) {
          if (tr) trades.push(close(tr, t, b.c, "replaced"));
          tr = { t: t, side: side, win: win, e: b.c, piv: piv, pt: side === "L" ? revLi : revHi,
                 tp: side === "L" ? b.c + dist * OPT.tpMult : b.c - dist * OPT.tpMult,
                 sl: side === "L" ? b.c - dist / OPT.slDiv : b.c + dist / OPT.slDiv };
          signals.push(tr);
        }
        if (side === "L") armL = false; else armH = false;
      });
    }
    function close(o, xt, x, why) { var c = {}; for (var key in o) c[key] = o[key]; c.xt = xt; c.x = x; c.why = why; return c; }
    return { ema: ema, vw: vw, signals: signals, trades: trades, crosses: crosses, open: tr,
             armL: armL, armH: armH, revL: revL, revH: revH, revLi: revLi, revHi: revHi };
  }

  /* ---------- chart ---------- */
  var chart = null, candles, emaS, shade, vwS = [], lineS = [], RUNS = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "rgba(0,0,0,0)" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: 0 }
    });
    /* window shading sits on a canvas under the chart, like the indicator's bgcolor */
    els.chart.style.background = "#1d1d1f"; els.chart.style.zIndex = "0";
    shade = document.createElement("canvas");
    shade.setAttribute("aria-hidden", "true");
    shade.style.cssText = "position:absolute;left:0;top:0;z-index:-1;pointer-events:none";
    els.chart.appendChild(shade);
    var pending = false;
    function soon() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; drawShade(); }); }
    chart.timeScale().subscribeVisibleLogicalRangeChange(soon);
    window.addEventListener("resize", soon);
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
      ctx.fillStyle = r.w === "A" ? COL.winA : COL.winB;
      ctx.fillRect(a - half, 0, b - a + 2 * half, H);
    });
  }

  /* ---------- side panel ---------- */
  function renderSide(r, B, forming, nClosed) {
    var cur = B[B.length - 1], last = B[nClosed - 1], li = nClosed - 1;
    var today = last.date, win = windowOf(cur.min);
    var lastSig = r.signals.length ? r.signals[r.signals.length - 1] : null;
    var sigNow = lastSig && lastSig.t === li;
    var gap = r.ema[li] - r.vw[li], above = gap > 0;
    var tr = r.open;
    var status = sigNow ? (lastSig.side === "L" ? "BUY " : "SELL ") + lastSig.win + " confirmed"
      : tr ? (tr.side === "L" ? "LONG open" : "SHORT open")
      : cur.min >= OPT.winB[1] || cur.min < OPT.winA[0] ? "Flat · outside the windows" : "Flat · watching for the cross";
    var play = "";
    if (tr) {
      var R = tr.side === "L" ? tr.e - tr.sl : tr.sl - tr.e, nowR = (tr.side === "L" ? last.c - tr.e : tr.e - last.c) / R;
      play = "In from " + money(tr.e) + " at " + clock(B[tr.t].min) + (B[tr.t].date !== today ? " (an earlier session)" : "") +
        ". Target " + money(tr.tp) + ", stop " + money(tr.sl) + ". " + (nowR >= 0 ? "+" : "") + nowR.toFixed(2) + "R on the last close.";
    } else if (win) {
      var need = above ? (r.armH ? "A cross under VWAP would be a SELL off the pivot high at " + money(r.revH) + "." : "Below-VWAP crosses need a pivot high first.")
        : (r.armL ? "A cross over VWAP would be a BUY off the pivot low at " + money(r.revL) + "." : "Above-VWAP crosses need a pivot low first.");
      play = "Window " + win + " is open. The 9 EMA is " + (above ? "above" : "below") + " VWAP. " + need;
    }
    var closedToday = r.trades.filter(function (t) { return B[t.xt].date === today; });
    var sigs = r.signals.filter(function (s) { return B[s.t].date === today; }).slice(-6).reverse();
    var dates = []; B.forEach(function (b) { if (dates[dates.length - 1] !== b.date) dates.push(b.date); });
    var wins = 0, losses = 0;
    r.trades.forEach(function (t) { if (t.why === "target") wins++; else if (t.why === "stop") losses++; });
    function outcome(s) {
      var done = null; r.trades.forEach(function (t) { if (t.t === s.t) done = t; });
      if (!done) return '<span class="pos">open</span>';
      var R2 = s.side === "L" ? s.e - s.sl : s.sl - s.e, rr = (s.side === "L" ? done.x - s.e : s.e - done.x) / R2;
      return '<span class="' + (rr > 0 ? "pos" : "neg") + '">' + (done.why === "replaced" ? "replaced " : "") + (rr > 0 ? "+" : "") + rr.toFixed(2) + "R</span>";
    }
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · last closed bar · " + clock(last.min) + "</p>" +
      '<p class="v">' + status + "</p>" +
      (play ? '<p class="play">' + play + "</p>" : "") +
      '<dl class="lv"><div><dt>9 EMA</dt><dd>' + money(r.ema[li]) + '</dd></div><div><dt>VWAP</dt><dd style="color:' + COL.vwap + '">' + money(r.vw[li]) + "</dd></div>" +
      '<div><dt>Window</dt><dd>' + (win ? win + (win === "A" ? " · 9:45–10:45" : " · 10:46–1:30") : "closed") + "</dd></div>" +
      '<div><dt>EMA vs VWAP</dt><dd class="' + (above ? "pos" : "neg") + '">' + (above ? "+" : "") + money(gap) + "</dd></div>" +
      '<div><dt>Pivot low</dt><dd>' + (r.armL ? money(r.revL) + " · " + clock(B[r.revLi].min) : "not armed") + "</dd></div>" +
      '<div><dt>Pivot high</dt><dd>' + (r.armH ? money(r.revH) + " · " + clock(B[r.revHi].min) : "not armed") + "</dd></div></dl>" +
      (forming ? '<p class="k">The ' + clock(cur.min) + " bar is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Signals today</p>' + (sigs.length ? '<ul class="trades">' + sigs.map(function (s) {
        return "<li><span>" + clock(B[s.t].min) + " · " + (s.side === "L" ? "BUY " : "SELL ") + s.win + " at " + money(s.e) + "</span>" + outcome(s) + "</li>";
      }).join("") + "</ul>" : '<p class="quiet">None yet today.</p>') +
      '<p class="k">Loaded sessions (' + dates.length + ") · targets " + wins + " · stops " + losses + (closedToday.length ? " · " + closedToday.length + " closed today" : "") + "</p>";
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
    var r = run(B, nClosed);

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(B.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    emaS.setData(B.map(function (b, i) { return { time: b.time, value: r.ema[i] }; }));
    RUNS = [];
    B.forEach(function (b, i) {
      var w = windowOf(b.min), r = RUNS[RUNS.length - 1];
      if (!w) return;
      if (r && r.w === w && r.i1 === i - 1 && B[i - 1].date === b.date) r.i1 = i; else RUNS.push({ w: w, i0: i, i1: i });
    });
    /* VWAP: one line per session so it doesn't join across the overnight gap */
    vwS.forEach(function (s) { chart.removeSeries(s); }); vwS = [];
    var day = null, seg = null;
    B.forEach(function (b, i) {
      if (b.date !== day) { day = b.date; seg = []; vwS.push(seg); }
      seg.push({ time: b.time, value: r.vw[i] });
    });
    vwS = vwS.map(function (pts, i) {
      var s = chart.addLineSeries({ color: COL.vwap, lineWidth: 2, title: i === vwS.length - 1 ? "VWAP" : "", priceLineVisible: false,
        lastValueVisible: i === vwS.length - 1, crosshairMarkerVisible: false });
      s.setData(pts); return s;
    });
    /* markers: signals (BUY A / SELL B …), the pivot that armed each, and exits */
    var marks = [];
    r.signals.forEach(function (s) {
      var L = s.side === "L";
      marks.push({ time: B[s.t].time, position: L ? "belowBar" : "aboveBar", shape: L ? "arrowUp" : "arrowDown",
        color: L ? (s.win === "A" ? COL.buyA : COL.buyB) : (s.win === "A" ? COL.sellA : COL.sellB), text: (L ? "BUY " : "SELL ") + s.win });
      marks.push({ time: B[s.pt].time, position: L ? "belowBar" : "aboveBar", shape: "circle", color: L ? COL.buyA : COL.sellA, text: "" });
    });
    r.trades.forEach(function (t) {
      if (t.why !== "target" && t.why !== "stop") return;
      var L = t.side === "L", hit = t.why === "target";
      marks.push({ time: B[t.xt].time, position: hit === L ? "aboveBar" : "belowBar", shape: "square", color: hit ? COL.tp : COL.sl, text: hit ? "TP hit" : "Stop" });
    });
    marks.sort(function (a, b) { return a.time - b.time; });
    candles.setMarkers(marks);
    /* entry / target / stop for the last few trades, as the indicator draws them */
    lineS.forEach(function (s) { chart.removeSeries(s); }); lineS = [];
    var show = r.trades.filter(function (t) { return t.why !== "open"; }).slice(-6);
    if (r.open) show.push({ t: r.open.t, xt: nClosed - 1, e: r.open.e, tp: r.open.tp, sl: r.open.sl, live: true });
    show.forEach(function (t) {
      var t0 = B[t.t].time, t1 = Math.max(B[t.xt].time, t0 + 120);
      [[t.e, COL.entry, 0], [t.tp, COL.tp, 2], [t.sl, COL.sl, 2]].forEach(function (d) {
        var s = chart.addLineSeries({ color: d[1], lineWidth: 1, lineStyle: d[2], priceLineVisible: false, lastValueVisible: !!t.live,
          crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
        s.setData([{ time: t0, value: d[0] }, { time: t1, value: d[0] }]);
        lineS.push(s);
      });
    });

    if (!render.fitted) {
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, B.length - 200), to: B.length - 1 + 6 });
      render.fitted = true;
    }
    requestAnimationFrame(drawShade);
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · regular session · 9 EMA (white) × VWAP (teal) · windows A teal, B purple" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  window.FLLive = {
    _run: run                             // exposed for testing
  };

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
