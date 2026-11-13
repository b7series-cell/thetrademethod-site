/* =====================================================================
   zl-live.js — live Zero Lag Trend Pullback chart.

   Pulls regular-session bars (5-minute by default; 1 / 2 / 5 / 15
   selectable) from /api/bars.php (the API key stays on the server) and
   runs pine/zero-lag-pullback.pine in the browser at its default inputs:
     · white = zero-lag EMA 50, green = zero-lag EMA 100
       (zero-lag EMA = EMA + (EMA − EMA of EMA)); volume average = SMA 20
     · nothing for the first 300 bars while the lines warm up
     · uptrend = white over green, downtrend = white under green
     · LONG: a close between the lines arms the pullback (a close below green
       or a trend flip cancels it); BUY = a green candle closes back above
       white on volume ≥ its average. SHORT is the mirror.
     · stop = the green line at the signal bar, target = 2R; stop first,
       from the next bar; one trade at a time
   Signals are taken on CLOSED bars only; the newest bar is drawn but ignored
   until it has closed.

   Mount: <section data-zl-live data-symbol="QQQ">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { fast: 50, slow: 100, vol: 20, rr: 2.0, warm: 300 };
  var POLL_MS = 60000, MULT = 5, RTH_OPEN = 570, RTH_CLOSE = 960;
  var COL = { fast: "#f5f5f7", slow: "#30d158", buy: "#30d158", sell: "#ff453a", busy: "#8e8e93", rej: "#8e8e93",
              armL: "rgba(48,209,88,0.10)", armS: "rgba(255,69,58,0.10)", entry: "#2997ff", tp: "#30d158", sl: "#ff453a",
              volUp: "rgba(48,209,88,0.45)", volDn: "rgba(255,69,58,0.45)", volHit: "#f4b942", vma: "#f5f5f7" };

  var root = document.querySelector("[data-zl-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate")
  };
  var KIT = LiveKit.controls(root, { key: "zl", symbol: (root.getAttribute("data-symbol") || "QQQ").toUpperCase(), tf: MULT,
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

  /* ---------- the lines: zero-lag EMAs and the volume average ---------- */
  function lines(B) {
    var kf = 2 / (OPT.fast + 1), ks = 2 / (OPT.slow + 1), f1 = 0, f2 = 0, s1 = 0, s2 = 0, vs = 0;
    var fast = [], slow = [], vma = [];
    for (var t = 0; t < B.length; t++) {
      var c = B[t].c;
      if (t === 0) { f1 = c; f2 = c; s1 = c; s2 = c; }
      else { f1 += (c - f1) * kf; f2 += (f1 - f2) * kf; s1 += (c - s1) * ks; s2 += (s1 - s2) * ks; }
      fast[t] = 2 * f1 - f2; slow[t] = 2 * s1 - s2;
      vs += B[t].v;
      if (t >= OPT.vol) vs -= B[t - OPT.vol].v;
      vma[t] = t >= OPT.vol - 1 ? vs / OPT.vol : null;
    }
    return { fast: fast, slow: slow, vma: vma };
  }

  /* ---------- the rules, bar by bar: a line-for-line twin of zl_engine() ---------- */
  function run(B, nClosed) {
    var n = nClosed == null ? B.length : nClosed, Ln = lines(B), F = Ln.fast, S = Ln.slow, VMA = Ln.vma;
    var armL = false, armS = false, epL = null, epS = null;
    var pulls = [], signals = [], trades = [], rejects = [], busy = [], armed = [], tr = null, t;
    for (t = 0; t < n; t++) {
      var b = B[t];
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
      if (t < OPT.warm) continue;
      var f = F[t], s = S[t], up = f > s, dn = f < s;
      var volOk = VMA[t] !== null && b.v >= VMA[t];
      var green = b.c > b.o, red = b.c < b.o;
      var longSig = up && armL && b.c > f && green && volOk;
      var shortSig = dn && armS && b.c < f && red && volOk;
      /* a reclaim of the white line that didn't qualify, for the funnel and the chart */
      if (armL && up && b.c > f && !longSig) { if (green) epL.v = true; else epL.c = true; rejects.push({ t: t, side: "L", why: green ? "v" : "c" }); }
      if (armS && dn && b.c < f && !shortSig) { if (red) epS.v = true; else epS.c = true; rejects.push({ t: t, side: "S", why: red ? "v" : "c" }); }
      [[longSig, "L"], [shortSig, "S"]].forEach(function (q) {
        if (!q[0]) return;
        var side = q[1], ep = side === "L" ? epL : epS;
        if (tr === null) {
          var risk = side === "L" ? b.c - s : s - b.c;
          tr = { t: t, side: side, e: b.c, sl: s, tp: side === "L" ? b.c + OPT.rr * risk : b.c - OPT.rr * risk,
                 pt: ep.t, vr: b.v / Math.max(1e-9, VMA[t]) };
          signals.push(tr);
          pulls.push({ t: ep.t, side: side, code: "T" });
        } else {
          pulls.push({ t: ep.t, side: side, code: "i" });
          busy.push({ t: t, side: side });
        }
      });
      /* arming: a close between the lines; through the green line or a trend flip cancels */
      if (longSig) { armL = false; epL = null; }
      else if (!up || b.c < s) { if (armL) pulls.push({ t: epL.t, side: "L", code: epL.v ? "v" : epL.c ? "c" : "x" }); armL = false; epL = null; }
      else if (b.c < f) { if (!armL) epL = { t: t, v: false, c: false }; armL = true; }
      if (shortSig) { armS = false; epS = null; }
      else if (!dn || b.c > s) { if (armS) pulls.push({ t: epS.t, side: "S", code: epS.v ? "v" : epS.c ? "c" : "x" }); armS = false; epS = null; }
      else if (b.c > f) { if (!armS) epS = { t: t, v: false, c: false }; armS = true; }
      armed[t] = armL ? "L" : armS ? "S" : "";
    }
    function close(o, xt, x, why) { var c = {}; for (var key in o) c[key] = o[key]; c.xt = xt; c.x = x; c.why = why; return c; }
    var all = trades.slice();
    if (tr) all.push(close(tr, n - 1, B[n - 1].c, "open"));
    if (armL) pulls.push({ t: epL.t, side: "L", code: "n" });
    if (armS) pulls.push({ t: epS.t, side: "S", code: "n" });
    pulls.sort(function (a, b) { return a.t - b.t; });
    return { fast: F, slow: S, vma: VMA, signals: signals, trades: trades, all: all, pulls: pulls, rejects: rejects, busy: busy, armed: armed,
             open: tr, armL: armL, armS: armS, epL: epL, epS: epS };
  }

  /* ---------- chart ---------- */
  var chart = null, candles, fastS, slowS, volS, vmaS, shade, lineS = [], RUNS = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "rgba(0,0,0,0)" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.06, bottom: 0.24 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: 0 }
    });
    /* armed pullbacks are shaded on a canvas under the chart */
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
    vmaS = chart.addLineSeries({ priceScaleId: "vol", color: COL.vma, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 }, visible: false });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    slowS = chart.addLineSeries({ color: COL.slow, lineWidth: 2, title: "ZL 100", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    fastS = chart.addLineSeries({ color: COL.fast, lineWidth: 2, title: "ZL 50", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
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
      ctx.fillStyle = r.side === "L" ? COL.armL : COL.armS;
      ctx.fillRect(a - half, 0, b - a + 2 * half, H * 0.78);
    });
  }

  /* bars where a pullback is armed (state at each bar's close), as runs for the shading */
  function armedRuns(r, n) {
    var out = [], cur = null;
    for (var i = 0; i < n; i++) {
      var a = r.armed[i] || "";
      if (a && cur && cur.side === a && cur.i1 === i - 1) cur.i1 = i;
      else if (a) { cur = { side: a, i0: i, i1: i }; out.push(cur); }
      else cur = null;
    }
    return out;
  }

  /* ---------- side panel ---------- */
  function renderSide(r, B, forming, nClosed) {
    var cur = B[B.length - 1], last = B[nClosed - 1], li = nClosed - 1;
    var today = last.date, f = r.fast[li], s = r.slow[li], up = f > s;
    var lastSig = r.signals.length ? r.signals[r.signals.length - 1] : null;
    var sigNow = lastSig && lastSig.t === li;
    var tr = r.open, vr = r.vma[li] ? last.v / r.vma[li] : null;
    var warm = nClosed > OPT.warm;
    var status = !warm ? "Warming up the lines"
      : sigNow ? (lastSig.side === "L" ? "BUY confirmed" : "SELL confirmed")
      : tr ? (tr.side === "L" ? "LONG open" : "SHORT open")
      : r.armL ? "Pullback armed · long side" : r.armS ? "Pullback armed · short side"
      : up ? "Uptrend · waiting for a pullback" : "Downtrend · waiting for a pullback";
    var play = "";
    if (tr) {
      var R = tr.side === "L" ? tr.e - tr.sl : tr.sl - tr.e, nowR = (tr.side === "L" ? last.c - tr.e : tr.e - last.c) / R;
      play = "In from " + money(tr.e) + " at " + clock(B[tr.t].min) + (B[tr.t].date !== today ? " (an earlier session)" : "") +
        ". Stop " + money(tr.sl) + " on the green line, target " + money(tr.tp) + ". " + (nowR >= 0 ? "+" : "") + nowR.toFixed(2) + "R on the last close.";
    } else if (warm && r.armL) {
      play = "Price closed between the lines at " + clock(B[r.epL.t].min) + ". A green candle closing back over " + money(f) + " on volume above " + (r.vma[li] ? Math.round(r.vma[li]).toLocaleString() : "the average") + " is the BUY.";
    } else if (warm && r.armS) {
      play = "Price closed between the lines at " + clock(B[r.epS.t].min) + ". A red candle closing back under " + money(f) + " on volume above " + (r.vma[li] ? Math.round(r.vma[li]).toLocaleString() : "the average") + " is the SELL.";
    } else if (warm) {
      play = up ? "White is over green. Wait for a close between the lines (" + money(s) + "–" + money(f) + ")."
                : "White is under green. Wait for a close between the lines (" + money(f) + "–" + money(s) + ").";
    }
    var sigs = r.signals.filter(function (x) { return B[x.t].date === today; }).slice(-6).reverse();
    var dates = []; B.forEach(function (b) { if (dates[dates.length - 1] !== b.date) dates.push(b.date); });
    var wins = 0, losses = 0;
    r.trades.forEach(function (t) { if (t.why === "target") wins++; else if (t.why === "stop") losses++; });
    function outcome(x) {
      var done = null; r.trades.forEach(function (t) { if (t.t === x.t) done = t; });
      if (!done) return '<span class="pos">open</span>';
      var R2 = x.side === "L" ? x.e - x.sl : x.sl - x.e, rr = (x.side === "L" ? done.x - x.e : x.e - done.x) / R2;
      return '<span class="' + (rr > 0 ? "pos" : "neg") + '">' + (rr > 0 ? "+" : "") + rr.toFixed(2) + "R</span>";
    }
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · last closed bar · " + clock(last.min) + "</p>" +
      '<p class="v">' + status + "</p>" +
      (play ? '<p class="play">' + play + "</p>" : "") +
      '<dl class="lv"><div><dt>ZL 50</dt><dd>' + money(f) + '</dd></div><div><dt>ZL 100</dt><dd style="color:' + COL.slow + '">' + money(s) + "</dd></div>" +
      '<div><dt>Trend</dt><dd class="' + (up ? "pos" : "neg") + '">' + (up ? "Up" : "Down") + "</dd></div>" +
      '<div><dt>Close</dt><dd>' + money(last.c) + "</dd></div>" +
      '<div><dt>Volume</dt><dd class="' + (vr != null && vr >= 1 ? "pos" : "") + '">' + (vr == null ? "—" : vr.toFixed(2) + "×") + "</dd></div>" +
      '<div><dt>Zone</dt><dd>' + (last.c > Math.max(f, s) ? "above" : last.c < Math.min(f, s) ? "below" : "between") + "</dd></div></dl>" +
      (forming ? '<p class="k">The ' + clock(cur.min) + " bar is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Signals today</p>' + (sigs.length ? '<ul class="trades">' + sigs.map(function (x) {
        return "<li><span>" + clock(B[x.t].min) + " · " + (x.side === "L" ? "BUY" : "SELL") + " at " + money(x.e) + " · vol " + x.vr.toFixed(1) + "×</span>" + outcome(x) + "</li>";
      }).join("") + "</ul>" : '<p class="quiet">None yet today.</p>') +
      '<p class="k">Loaded sessions (' + dates.length + ") · targets " + wins + " · stops " + losses + "</p>";
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
    var forming = !data.date && B[B.length - 1].ms / 1000 + MULT * 60 > asOf;
    var nClosed = forming ? B.length - 1 : B.length;
    var r = run(B, nClosed);

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(B.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    var hit = {}; r.signals.forEach(function (s) { hit[s.t] = 1; }); r.busy.forEach(function (s) { hit[s.t] = 1; });
    volS.setData(B.map(function (b, i) { return { time: b.time, value: b.v, color: hit[i] ? COL.volHit : b.c >= b.o ? COL.volUp : COL.volDn }; }));
    vmaS.setData(B.map(function (b, i) { return r.vma[i] == null ? { time: b.time } : { time: b.time, value: r.vma[i] }; }));
    /* the lines only once they've warmed up (a dim stretch before that would mislead) */
    var w0 = Math.min(B.length - 1, OPT.warm);
    fastS.setData(B.map(function (b, i) { return i < w0 ? { time: b.time } : { time: b.time, value: r.fast[i] }; }));
    slowS.setData(B.map(function (b, i) { return i < w0 ? { time: b.time } : { time: b.time, value: r.slow[i] }; }));
    RUNS = armedRuns(r, nClosed);

    /* markers: taken signals, signals while in a trade, low-volume reclaims, exits */
    var marks = [];
    r.signals.forEach(function (s) {
      var L = s.side === "L";
      marks.push({ time: B[s.t].time, position: L ? "belowBar" : "aboveBar", shape: L ? "arrowUp" : "arrowDown", color: L ? COL.buy : COL.sell, text: L ? "BUY" : "SELL" });
    });
    r.busy.forEach(function (s) {
      marks.push({ time: B[s.t].time, position: s.side === "L" ? "belowBar" : "aboveBar", shape: "circle", color: COL.busy, text: "in trade" });
    });
    r.rejects.forEach(function (x) {
      if (x.why !== "v") return;
      marks.push({ time: B[x.t].time, position: x.side === "L" ? "belowBar" : "aboveBar", shape: "circle", color: COL.rej, text: "low vol" });
    });
    r.trades.forEach(function (t) {
      if (t.why !== "target" && t.why !== "stop") return;
      var L = t.side === "L", tp = t.why === "target";
      marks.push({ time: B[t.xt].time, position: tp === L ? "aboveBar" : "belowBar", shape: "square", color: tp ? COL.tp : COL.sl, text: tp ? "TP hit" : "Stop" });
    });
    marks.sort(function (a, b) { return a.time - b.time; });
    candles.setMarkers(marks);

    /* entry / target / stop for the last few trades */
    lineS.forEach(function (s) { chart.removeSeries(s); }); lineS = [];
    var show = r.trades.slice(-6);
    if (r.open) show.push({ t: r.open.t, xt: nClosed - 1, e: r.open.e, tp: r.open.tp, sl: r.open.sl, live: true });
    show.forEach(function (t) {
      var t0 = B[t.t].time, t1 = Math.max(B[t.xt].time, t0 + MULT * 60);
      [[t.e, COL.entry, 0], [t.tp, COL.tp, 2], [t.sl, COL.sl, 2]].forEach(function (d) {
        var s = chart.addLineSeries({ color: d[1], lineWidth: 1, lineStyle: d[2], priceLineVisible: false, lastValueVisible: !!t.live,
          crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
        s.setData([{ time: t0, value: d[0] }, { time: t1, value: d[0] }]);
        lineS.push(s);
      });
    });

    var span = MULT >= 15 ? 160 : MULT >= 5 ? 200 : 260;
    if (!render.fitted) {
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, B.length - span), to: B.length - 1 + 6 });
      render.fitted = true;
    }
    requestAnimationFrame(drawShade);
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · regular session · zero-lag 50 (white) and 100 (green) · armed pullbacks shaded · volume with its 20-bar average" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  window.ZLLive = {
    _run: run                             // exposed for testing
  };

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
