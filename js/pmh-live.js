/* =====================================================================
   pmh-live.js — live Premarket High Break chart.

   Pulls bars (2-minute by default; 1 / 2 / 5 / 15 selectable) INCLUDING pre-market from /api/bars.php (the API
   key stays on the server) and runs the logic of pine/pmh-prior-levels.pine
   in the browser, with the script's default inputs:
     · pre-market range 04:00–09:30 ET → PMH / PML
     · prior regular-session high / low / close → PDH / PDL / PDC
     · time-of-day relative volume "glow": a bar's volume vs the same
       2-minute slot over the last 5 sessions (≥ 3 needed), glows at 3×
     · LONG setup: a CLOSED bar opening 09:30–09:45 that closes above PDH,
       crosses up through PMH, and glows — on a day that opened above PDH and
       PDC (the gate), with a clean candle (green, upper wick ≤ half the body).
       A bad candle is marked "Skip" and the window stays open. First one only.
     · the newest bar is ignored for signals until it has closed (the data is
       delayed, so "closed" means its end is older than the delay)
     · break markers: PMH / PML breaks (window, must clear the prior day,
       glowing) and PDH / PDL breaks (glowing), first of each per day

   Mount: <section data-pmh-live data-symbol="QQQ">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = {
    pmStart: 240, pmEnd: 570,           // 04:00 – 09:30
    rthStart: 570, rthEnd: 960,          // 09:30 – 16:00
    winStart: 570, winEnd: 585,          // break window 09:30 – 09:45 (bar OPEN inside)
    volThresh: 3.0, volSessions: 5, volMinSamp: 3, volMinRaw: 0,
    reqClear: true, firstOnly: true
  };
  var POLL_MS = 60000, MULT = 2;

  var root = document.querySelector("[data-pmh-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate"),
    form: root.querySelector(".live-symbol")
  };
  var KIT = LiveKit.controls(root, { key: "pmh", symbol: (root.getAttribute("data-symbol") || "QQQ").toUpperCase(), tf: MULT,
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
  function pct(x) { return x == null || isNaN(x) ? "—" : (x >= 0 ? "+" : "") + x.toFixed(2) + "%"; }
  function clock(min) { var h = Math.floor(min / 60), m = min % 60; return (h > 12 ? h - 12 : h) + ":" + (m < 10 ? "0" : "") + m + (h >= 12 ? " pm" : " am"); }

  /* ---------- the indicator, bar by bar ---------- */
  function run(all) {
    var today = all[all.length - 1].date;
    var dates = [];
    all.forEach(function (b) { if (dates[dates.length - 1] !== b.date) dates.push(b.date); });

    /* prior day = most recent earlier date with regular-session bars */
    var pd = null;
    for (var di = dates.length - 2; di >= 0 && !pd; di--) {
      var rth = all.filter(function (b) { return b.date === dates[di] && b.min >= OPT.rthStart && b.min < OPT.rthEnd; });
      if (rth.length) pd = {
        date: dates[di],
        h: Math.max.apply(null, rth.map(function (b) { return b.h; })),
        l: Math.min.apply(null, rth.map(function (b) { return b.l; })),
        c: rth[rth.length - 1].c
      };
    }

    /* time-of-day volume history from earlier sessions (most recent N per slot) */
    var slots = {};
    all.forEach(function (b) {
      if (b.date === today || !(b.v > 0)) return;
      (slots[b.min] = slots[b.min] || []).push(b.v);
    });
    Object.keys(slots).forEach(function (k) { slots[k] = slots[k].slice(-OPT.volSessions); });

    var cur = all.filter(function (b) { return b.date === today; });
    var pmH = null, pmL = null, markers = [], glow = [], forming = null;
    var open930 = null;
    for (var oi = 0; oi < cur.length; oi++) if (cur[oi].min >= OPT.rthStart && !cur[oi].forming) { open930 = cur[oi].o; break; }
    var gate = open930 == null || !pd ? null : open930 > pd.h && open930 > pd.c;
    function cleanCandle(b) { return b.c > b.o && (b.h - b.c) <= 0.5 * (b.c - b.o); }
    var fired = { setup: false, pmh: false, pml: false, pdh: false, pdl: false }, setupBar = null;
    var last = null;

    for (var i = 0; i < cur.length; i++) {
      var b = cur[i], prev = i > 0 ? cur[i - 1] : null;
      var inPM = b.min >= OPT.pmStart && b.min < OPT.pmEnd;
      if (inPM) { pmH = pmH == null ? b.h : Math.max(pmH, b.h); pmL = pmL == null ? b.l : Math.min(pmL, b.l); }
      if (b.forming) { forming = b; b.spike = false; b.samples = 0; b.rvol = null; continue; }     // signals wait for the close

      var hist = slots[b.min] || [], n = hist.length;
      var avg = n ? hist.reduce(function (a, x) { return a + x; }, 0) / n : null;
      var rvol = avg ? b.v / avg : null;
      var spike = n >= OPT.volMinSamp && b.v >= OPT.volMinRaw && rvol != null && rvol >= OPT.volThresh;
      b.rvol = rvol; b.samples = n; b.spike = spike;
      if (spike) glow.push(b.time);

      var pmDone = !inPM && pmH != null;
      var inWin = b.min >= OPT.winStart && b.min < OPT.winEnd;
      var crossUp = function (lvl) { return lvl != null && prev && prev.c <= lvl && b.c > lvl; };
      var crossDn = function (lvl) { return lvl != null && prev && prev.c >= lvl && b.c < lvl; };

      /* composite long setup */
      if (pmDone && inWin && spike && pd && gate && b.c > pd.h && crossUp(pmH) && !(OPT.firstOnly && fired.setup)) {
        if (cleanCandle(b)) {
          fired.setup = true; setupBar = b;
          markers.push({ time: b.time, position: "belowBar", shape: "arrowUp", color: "#ffd60a", text: "LONG" });
        } else {
          markers.push({ time: b.time, position: "aboveBar", shape: "circle", color: "#8e8e93", text: b.c <= b.o ? "Skip: red" : "Skip: wick" });
        }
      }
      /* individual break events */
      var clearsUp = !OPT.reqClear || (pd && pmH != null && pmH > pd.h);
      var clearsDn = !OPT.reqClear || (pd && pmL != null && pmL < pd.l);
      if (pmDone && inWin && spike && clearsUp && crossUp(pmH) && !(OPT.firstOnly && fired.pmh)) {
        fired.pmh = true;
        if (setupBar !== b) markers.push({ time: b.time, position: "belowBar", shape: "arrowUp", color: "#30d158", text: "PMH" });
      }
      if (pmDone && inWin && spike && clearsDn && crossDn(pmL) && !(OPT.firstOnly && fired.pml)) {
        fired.pml = true; markers.push({ time: b.time, position: "aboveBar", shape: "arrowDown", color: "#ff453a", text: "PML" });
      }
      if (pd && spike && crossUp(pd.h) && !(OPT.firstOnly && fired.pdh)) {
        fired.pdh = true; markers.push({ time: b.time, position: "belowBar", shape: "circle", color: "#ff9f0a", text: "PDH" });
      }
      if (pd && spike && crossDn(pd.l) && !(OPT.firstOnly && fired.pdl)) {
        fired.pdl = true; markers.push({ time: b.time, position: "aboveBar", shape: "circle", color: "#64d2ff", text: "PDL" });
      }
      last = b;
    }
    markers.sort(function (a, b) { return a.time - b.time; });
    return { today: today, cur: cur, pd: pd, pmH: pmH, pmL: pmL, markers: markers, last: last || cur[0], setupBar: setupBar,
             forming: forming, gate: gate, open930: open930, clean: last ? cleanCandle(last) : false,
             pmDone: last && !(last.min >= OPT.pmStart && last.min < OPT.pmEnd) && pmH != null };
  }

  /* ---------- chart ---------- */
  var chart, candles, volume, pmShade, extras = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: 0 }
    });
    pmShade = chart.addAreaSeries({ priceScaleId: "pm", lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
      lineColor: "rgba(0,0,0,0)", topColor: "rgba(142,142,147,0.08)", bottomColor: "rgba(142,142,147,0.08)",
      autoscaleInfoProvider: function () { return { priceRange: { minValue: 0, maxValue: 1 } }; } });
    chart.priceScale("pm").applyOptions({ scaleMargins: { top: 0, bottom: 0 }, visible: false });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    volume = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
  }
  function level(color, style, width, from, to, price, title) {
    if (price == null) return;
    if (to <= from) to = from + 300;
    var s = chart.addLineSeries({ color: color, lineStyle: style, lineWidth: width, priceLineVisible: false, lastValueVisible: true, title: title, crosshairMarkerVisible: false });
    s.setData([{ time: from, value: price }, { time: to, value: price }]);
    extras.push(s);
  }

  /* ---------- side panel ---------- */
  function renderSide(r) {
    var b = r.last, pd = r.pd || {};
    var status = r.pmH == null ? "Waiting for pre-market" : !r.pmDone ? "Pre-market forming" : b.c > r.pmH ? "Above PMH" : b.c < r.pmL ? "Below PML" : "Inside the PM range";
    var rng = r.pmH != null ? r.pmH - r.pmL : null;
    var vsPdc = pd.c ? (b.c - pd.c) / pd.c * 100 : null;
    var inWin = b.min >= OPT.winStart && b.min < OPT.winEnd;
    var vol = b.samples < OPT.volMinSamp ? "building " + b.samples + "/" + OPT.volMinSamp : b.rvol == null ? "—" : b.rvol.toFixed(2) + "×";
    function chk(ok, label) { return '<li class="' + (ok ? "ok" : "no") + '">' + label + "</li>"; }
    var setup = r.setupBar
      ? '<div class="live-trade long"><b>Long setup fired on the ' + clock(r.setupBar.min) + " bar</b><span>Close " + money(r.setupBar.c) + " · above PMH " + money(r.pmH) +
        " and PDH " + money(pd.h) + " · " + r.setupBar.rvol.toFixed(1) + "× volume</span></div>"
      : "";
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · last bar " + clock(b.min) + "</p>" +
      '<p class="v">' + status + "</p>" +
      '<p class="play">' + (r.pmH != null && pd.h != null ? (r.pmH > pd.h ? "PMH is above yesterday's high: a break clears both" : "PMH is below yesterday's high: the break must also clear PDH") : "") + "</p>" +
      '<dl class="lv"><div><dt>PM high</dt><dd class="up">' + money(r.pmH) + "</dd></div><div><dt>PM low</dt><dd class=\"dn\">" + money(r.pmL) + "</dd></div><div><dt>PM range</dt><dd>" + money(rng) + "</dd></div>" +
      "<div><dt>PDH</dt><dd class=\"pdh\">" + money(pd.h) + "</dd></div><div><dt>PDC</dt><dd>" + money(pd.c) + "</dd></div><div><dt>PDL</dt><dd class=\"pdl\">" + money(pd.l) + "</dd></div></dl>" +
      '<p class="k">vs prior close ' + pct(vsPdc) + " · relative volume " + vol + "</p>" +
      setup +
      (r.forming ? '<p class="k">The ' + clock(r.forming.min) + " bar is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Long checklist, last closed bar (' + clock(b.min) + ')</p><ul class="pmh-check">' +
        chk(r.gate === true, "Opened above PDH and PDC" + (r.open930 != null ? " (" + money(r.open930) + ")" : "")) +
        chk(pd.h != null && b.c > pd.h, "Close above PDH") +
        chk(r.pmH != null && b.c > r.pmH, "Close above PMH") +
        chk(inWin, "Bar opens 9:30–9:45") +
        chk(b.spike, "Volume glow (3× this time of day)") +
        chk(r.clean, "Clean candle: green, upper wick ≤ half the body") +
      "</ul>";
  }

  /* ---------- data ---------- */
  function setGate(msg) { root.classList.add("gated"); els.gate.hidden = false; els.status.textContent = SYMBOL + " · " + LiveKit.tfLabel(MULT) + " · not loaded"; els.gate.innerHTML = msg.replace(/<\/b>\s*([\s\S]+)$/, "</b><span>$1</span>"); }

  function load() {
    var tok = previewToken();
    var url = "/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&mult=" + MULT + (tok ? "&preview=" + encodeURIComponent(tok) : "");
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
    var asOf = (data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900);   // data clock
    var all = data.bars.map(function (a, i) { var t = etParts(a[0]); return { date: t.date, min: t.min, time: t.wall, o: a[1], h: a[2], l: a[3], c: a[4], v: a[5],
      forming: i === data.bars.length - 1 && !data.date && a[0] / 1000 + MULT * 60 > asOf }; })
      .filter(function (b) { return b.min >= OPT.pmStart && b.min < 1200; });
    if (!all.length) { setGate("<b>No data yet for " + SYMBOL + ".</b>"); return; }
    var r = run(all);

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(r.cur.map(function (b) {
      var d = { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c };
      if (b.spike) { d.color = "#ffd60a"; d.wickColor = "#ffd60a"; }
      return d;
    }));
    volume.setData(r.cur.map(function (b) { return { time: b.time, value: b.v, color: b.spike ? "rgba(255,214,10,0.7)" : b.c >= b.o ? "rgba(48,209,88,0.3)" : "rgba(255,69,58,0.3)" }; }));
    pmShade.setData(r.cur.map(function (b) { return b.min >= OPT.pmStart && b.min < OPT.pmEnd ? { time: b.time, value: 1 } : { time: b.time }; }));
    candles.setMarkers(r.markers);
    extras.forEach(function (s) { chart.removeSeries(s); });
    extras = [];
    var first = r.cur[0].time, lastT = r.cur[r.cur.length - 1].time;
    var pmFirst = (r.cur.filter(function (b) { return b.min >= OPT.pmStart; })[0] || r.cur[0]).time;
    level("#30d158", 0, 2, pmFirst, lastT, r.pmH, "PMH");
    level("#ff453a", 0, 2, pmFirst, lastT, r.pmL, "PML");
    if (r.pd) {
      level("#ff9f0a", 2, 1, first, lastT, r.pd.h, "PDH");
      level("#64d2ff", 2, 1, first, lastT, r.pd.l, "PDL");
      level("#8e8e93", 2, 1, first, lastT, r.pd.c, "PDC");
    }
    if (!render.fitted) {
      /* 2-minute bars are too dense to show a whole day at once: open on the morning (8:00–12:30), scroll for the rest */
      var i0 = 0, i1 = r.cur.length - 1;
      for (var i = 0; i < r.cur.length; i++) { if (r.cur[i].min >= 480) { i0 = i; break; } }
      for (var j = r.cur.length - 1; j >= 0; j--) { if (r.cur[j].min < 750) { i1 = j; break; } }
      if (i1 <= i0) chart.timeScale().fitContent();
      else chart.timeScale().setVisibleLogicalRange({ from: i0 - 1, to: i1 + 6 });
      render.fitted = true;
    }
    renderSide(r);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · Pre-market from 4:00 · Session " + r.today + "" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  window.PMHLive = {
  };

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
