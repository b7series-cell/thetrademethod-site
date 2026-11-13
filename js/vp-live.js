/* =====================================================================
   vp-live.js — live Volume Profile System chart.

   Pulls intraday bars from /api/bars.php (which holds the API key
   server-side), then runs the same logic as pine/volume-profile-system.pine
   in the browser:
     · builds the PREVIOUS regular session's profile (row size 60, 70% VA)
     · extends PC / VAH / VAL across the current session
     · reads the prior close to say which setup is in play
     · marks PC bounces, VA reversals and VA breakouts with 2R targets

   Rendering: TradingView Lightweight Charts (Apache-2.0).
   Mount: <section data-vp-live data-symbol="QQQ" data-mult="2">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = {
    rows: 60, vaPct: 0.70,
    touchTk: 2, confWin: 3, wickMin: 0.5, runLen: 2, s1NeedOut: true,
    s2NeedIn: true, outMode: "Close",
    brkPct: 0.25, nearPct: 0.15, deepPct: 0.25,
    rr: 2.0, bufTk: 2, minRiskTk: 4, maxTrades: 3, tick: 0.01
  };
  var RTH_OPEN = 570, RTH_CLOSE = 960;   // 09:30, 16:00 ET in minutes
  var POLL_MS = 60000;

  var root = document.querySelector("[data-vp-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;

  var KIT = LiveKit.controls(root, { key: "vp", symbol: (root.getAttribute("data-symbol") || "QQQ").toUpperCase(), tf: parseInt(root.getAttribute("data-mult") || "2", 10),
    onChange: function (sym, tf) { SYMBOL = sym; MULT = tf; render.fitted = false; load(); } });
  var SYMBOL = KIT.symbol, MULT = KIT.tf;
  var els = {
    chart:  root.querySelector(".live-chart"),
    side:   root.querySelector(".live-side"),
    status: root.querySelector(".live-status"),
    gate:   root.querySelector(".live-gate")
  };

  /* ---------- preview token (private until the data license allows public display) ---------- */
  function previewToken() {
    var t = new URLSearchParams(location.search).get("preview");
    try {
      if (t) localStorage.setItem("vp_preview", t);
      else t = localStorage.getItem("vp_preview");
    } catch (e) { /* storage blocked: the URL param still works */ }
    return t || "";
  }

  /* ---------- time helpers: everything is read in New York time ---------- */
  var fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
  function etParts(ms) {
    var p = {};
    fmt.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    var h = (+p.hour) % 24;
    return { date: p.year + "-" + p.month + "-" + p.day, min: h * 60 + (+p.minute),
             wall: Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute) / 1000 };
  }
  function money(x) { return x == null || isNaN(x) ? "—" : x.toFixed(2); }

  /* ---------- profile: identical to buildProfile() in the Pine script ---------- */
  function buildProfile(bars) {
    var n = bars.length, top = -Infinity, bot = Infinity;
    bars.forEach(function (b) { if (b.h > top) top = b.h; if (b.l < bot) bot = b.l; });
    if (!n || !(top > bot)) return null;
    var rows = OPT.rows, rowH = (top - bot) / rows, rv = new Array(rows).fill(0);
    var noVol = bars.every(function (b) { return !b.v; });
    bars.forEach(function (b) {
      var v = noVol ? 1 : b.v;
      var r0 = Math.min(rows - 1, Math.max(0, Math.floor((b.l - bot) / rowH)));
      var r1 = Math.min(rows - 1, Math.max(0, Math.floor((b.h - bot) / rowH)));
      var share = v / (r1 - r0 + 1);
      for (var r = r0; r <= r1; r++) rv[r] += share;
    });
    var total = rv.reduce(function (a, b) { return a + b; }, 0);
    var poc = rv.indexOf(Math.max.apply(null, rv)), acc = rv[poc], up = poc, dn = poc;
    while (acc < total * OPT.vaPct && (up < rows - 1 || dn > 0)) {
      var vUp = up < rows - 1 ? rv[up + 1] : -1, vDn = dn > 0 ? rv[dn - 1] : -1;
      if (vUp >= vDn) { up++; acc += vUp; } else { dn--; acc += vDn; }
    }
    return { pc: bot + rowH * (poc + 0.5), vah: bot + rowH * (up + 1), val: bot + rowH * dn, rv: rv, bot: bot, rowH: rowH };
  }

  /* ---------- setup engine: a bar-by-bar port of the Pine state machines ---------- */
  function runEngine(prevBars, cur, lv, complete) {
    var tk = OPT.tick, tol = OPT.touchTk * tk, buf = OPT.bufTk * tk, vaW = lv.vah - lv.val;
    var lastPrev = prevBars[prevBars.length - 1].c;
    var prior = lastPrev > lv.vah ? 1 : lastPrev < lv.val ? -1 : 0;
    var all = prevBars.concat(cur), off = prevBars.length;
    var st = { pcSide: lastPrev > lv.pc ? 1 : lastPrev < lv.pc ? -1 : 0, s1Dir: 0, s1Bar: 0, s1Ext: 0,
               s2Out: 0, s2Ext: 0, bState: 0, bPeak: 0, bPb: 0, sState: 0, sTrough: 0, sPb: 0 };
    var trades = [], active = null, markers = [];

    function exit(t, px, i, why) {
      var risk = Math.abs(t.entry - t.sl);
      t.r = risk > 0 ? (px - t.entry) * t.dir / risk : 0;
      t.exitPx = px; t.exitTime = cur[i].time; t.why = why;
      markers.push({ time: cur[i].time, position: t.dir === 1 ? "aboveBar" : "belowBar", shape: "circle",
                     color: why === "TP" ? "#30d158" : why === "SL" ? "#ff453a" : "#8e8e93",
                     text: (why === "FLAT" ? "flat " : "") + (t.r >= 0 ? "+" : "") + t.r.toFixed(1) + "R" });
    }

    for (var i = 0; i < cur.length; i++) {
      var b = cur[i], j = off + i, p = all[j - 1];
      var green = b.c > b.o, red = b.c < b.o, rng = b.h - b.l;
      var engBull = green && p.c < p.o && b.c >= p.o && b.o <= p.c;
      var engBear = red && p.c > p.o && b.c <= p.o && b.o >= p.c;
      var lowWick = Math.min(b.o, b.c) - b.l, upWick = b.h - Math.max(b.o, b.c);
      var runBull = true, runBear = true;
      for (var k = 0; k < OPT.runLen; k++) { var q = all[j - k]; if (!q || !(q.c > q.o)) runBull = false; if (!q || !(q.c < q.o)) runBear = false; }

      /* manage the open trade (same bar: SL assumed first) */
      if (active && i > active.idx) {
        var hitSL = active.dir === 1 ? b.l <= active.sl : b.h >= active.sl;
        var hitTP = active.dir === 1 ? b.h >= active.tp : b.l <= active.tp;
        if (hitSL || hitTP) { exit(active, hitSL ? active.sl : active.tp, i, hitSL ? "SL" : "TP"); active = null; }
      }

      var sig = "", sDir = 0, sStop = null;

      /* setup 1 · PC bounce */
      if (!OPT.s1NeedOut || prior !== 0) {
        var touched = b.l <= lv.pc + tol && b.h >= lv.pc - tol;
        if (st.s1Dir === 0 && touched && st.pcSide !== 0) {
          st.s1Dir = st.pcSide; st.s1Bar = i; st.s1Ext = st.pcSide === 1 ? b.l : b.h;
        } else if (st.s1Dir !== 0) {
          st.s1Ext = st.s1Dir === 1 ? Math.min(st.s1Ext, b.l) : Math.max(st.s1Ext, b.h);
        }
        if (st.s1Dir === 1) {
          var confL = b.c > lv.pc && (engBull || (rng > 0 && b.l <= lv.pc + tol && lowWick >= OPT.wickMin * rng) || runBull);
          if (confL) { if (!sDir) { sig = "pc_bounce"; sDir = 1; sStop = lv.pc - buf; } st.s1Dir = 0; }
          else if (b.c < lv.pc - tol || i - st.s1Bar >= OPT.confWin - 1) st.s1Dir = 0;
        } else if (st.s1Dir === -1) {
          var confS = b.c < lv.pc && (engBear || (rng > 0 && b.h >= lv.pc - tol && upWick >= OPT.wickMin * rng) || runBear);
          if (confS) { if (!sDir) { sig = "pc_bounce"; sDir = -1; sStop = lv.pc + buf; } st.s1Dir = 0; }
          else if (b.c > lv.pc + tol || i - st.s1Bar >= OPT.confWin - 1) st.s1Dir = 0;
        }
      }
      if (b.c > lv.pc + tol) st.pcSide = 1; else if (b.c < lv.pc - tol) st.pcSide = -1;

      /* setup 2 · VA reversal */
      if (!OPT.s2NeedIn || prior === 0) {
        var outUp = OPT.outMode === "Close" ? b.c > lv.vah : b.h > lv.vah;
        var outDn = OPT.outMode === "Close" ? b.c < lv.val : b.l < lv.val;
        if (st.s2Out === 0) {
          if (outDn) { st.s2Out = -1; st.s2Ext = b.l; } else if (outUp) { st.s2Out = 1; st.s2Ext = b.h; }
        } else if (st.s2Out === -1) {
          st.s2Ext = Math.min(st.s2Ext, b.l);
          if (b.c > lv.val && b.c < lv.vah) { if (!sDir) { sig = "va_reversal"; sDir = 1; sStop = st.s2Ext - buf; } st.s2Out = 0; }
          else if (b.c > lv.vah) { st.s2Out = 1; st.s2Ext = b.h; }
        } else {
          st.s2Ext = Math.max(st.s2Ext, b.h);
          if (b.c < lv.vah && b.c > lv.val) { if (!sDir) { sig = "va_reversal"; sDir = -1; sStop = st.s2Ext + buf; } st.s2Out = 0; }
          else if (b.c < lv.val) { st.s2Out = -1; st.s2Ext = b.l; }
        }
      }

      /* setup 3 · VA breakout */
      if (vaW > 0) {
        var brkD = OPT.brkPct * vaW, nearD = OPT.nearPct * vaW, deepD = OPT.deepPct * vaW;
        if (st.bState === 0) {
          if (b.c > lv.vah && b.h >= lv.vah + brkD) { st.bState = 1; st.bPeak = b.h; }
        } else if (st.bState === 1) {
          st.bPeak = Math.max(st.bPeak, b.h);
          if (b.c < lv.vah - deepD) st.bState = 0;
          else if (b.l <= lv.vah + nearD) { st.bState = 2; st.bPb = b.l; }
        } else {
          if (b.c < lv.vah - deepD) st.bState = 0;
          else if (b.c > st.bPeak) { if (!sDir) { sig = "va_breakout"; sDir = 1; sStop = Math.min(st.bPb, b.l) - buf; } st.bState = 0; }
          else st.bPb = Math.min(st.bPb, b.l);
        }
        if (st.sState === 0) {
          if (b.c < lv.val && b.l <= lv.val - brkD) { st.sState = 1; st.sTrough = b.l; }
        } else if (st.sState === 1) {
          st.sTrough = Math.min(st.sTrough, b.l);
          if (b.c > lv.val + deepD) st.sState = 0;
          else if (b.h >= lv.val - nearD) { st.sState = 2; st.sPb = b.h; }
        } else {
          if (b.c > lv.val + deepD) st.sState = 0;
          else if (b.c < st.sTrough) { if (!sDir) { sig = "va_breakout"; sDir = -1; sStop = Math.max(st.sPb, b.h) + buf; } st.sState = 0; }
          else st.sPb = Math.max(st.sPb, b.h);
        }
      }

      /* entry: one trade at a time, capped per session */
      if (sDir && !active && trades.length < OPT.maxTrades) {
        var e = b.c, risk = Math.abs(e - sStop);
        var okSide = (sDir === 1 && sStop < e) || (sDir === -1 && sStop > e);
        if (okSide && risk >= OPT.minRiskTk * tk) {
          active = { setup: sig, dir: sDir, entry: e, sl: sStop, tp: e + sDir * OPT.rr * risk, idx: i, time: b.time, r: null };
          trades.push(active);
          var label = sig === "pc_bounce" ? "PC" : sig === "va_reversal" ? "REV" : "BRK";
          markers.push({ time: b.time, position: sDir === 1 ? "belowBar" : "aboveBar", shape: sDir === 1 ? "arrowUp" : "arrowDown",
                         color: sDir === 1 ? "#30d158" : "#ff453a", text: label });
        }
      }
    }

    /* the regular session is over: flatten at the last close */
    if (complete && active) { exit(active, cur[cur.length - 1].c, cur.length - 1, "FLAT"); active = null; }

    markers.sort(function (a, b) { return a.time - b.time; });
    return { prior: prior, trades: trades, active: active, state: st, markers: markers };
  }

  /* ---------- chart ---------- */
  var chart = null, candles, volume, lineSeries = {}, priceLines = [], overlay, lastProfile = null;

  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6",
                fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: 0 }
    });
    candles = chart.addCandlestickSeries({
      upColor: "#30d158", downColor: "#ff453a", borderVisible: false,
      wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false
    });
    volume = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    [["pc", "#ff453a", 2, 0, "PC"], ["vah", "#2997ff", 1, 2, "VAH"], ["val", "#2997ff", 1, 2, "VAL"]].forEach(function (d) {
      lineSeries[d[0]] = chart.addLineSeries({ color: d[1], lineWidth: d[2], lineStyle: d[3], title: d[4],
        priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    });

    overlay = document.createElement("canvas");
    overlay.className = "live-profile";
    overlay.setAttribute("aria-hidden", "true");
    els.chart.appendChild(overlay);
    chart.timeScale().subscribeVisibleLogicalRangeChange(drawProfile);
    window.addEventListener("resize", function () { requestAnimationFrame(drawProfile); });
  }

  /* previous session's profile, drawn as a histogram along the right edge of the pane */
  function drawProfile() {
    if (!overlay || !lastProfile) return;
    var paneW = els.chart.clientWidth - chart.priceScale("right").width();
    var H = els.chart.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    overlay.style.width = paneW + "px"; overlay.style.height = H + "px";
    overlay.width = paneW * dpr; overlay.height = H * dpr;
    var ctx = overlay.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, paneW, H);
    var P = lastProfile, mx = Math.max.apply(null, P.rv), maxW = Math.min(110, paneW * 0.22);
    for (var r = 0; r < P.rv.length; r++) {
      if (!P.rv[r]) continue;
      var y1 = candles.priceToCoordinate(P.bot + P.rowH * (r + 1)), y0 = candles.priceToCoordinate(P.bot + P.rowH * r);
      if (y1 == null || y0 == null) continue;
      var lo = P.bot + P.rowH * r, w = maxW * P.rv[r] / mx;
      var inPc = P.pc >= lo && P.pc < lo + P.rowH, inVa = lo >= P.val - 1e-9 && lo + P.rowH <= P.vah + 1e-9;
      ctx.fillStyle = inPc ? "rgba(255,69,58,0.55)" : inVa ? "rgba(41,151,255,0.28)" : "rgba(142,142,147,0.18)";
      ctx.fillRect(paneW - w - 2, Math.min(y0, y1), w, Math.max(1, Math.abs(y0 - y1) - 1));
    }
  }

  /* ---------- side panel ---------- */
  function setupName(s) { return s === "pc_bounce" ? "PC bounce" : s === "va_reversal" ? "VA reversal" : "VA breakout"; }
  function renderSide(lv, res, sessionDate, complete) {
    var inPlay = res.prior === 0 ? "VA reversal in play" : "PC bounce in play";
    var priorTxt = res.prior === 1 ? "above" : res.prior === -1 ? "below" : "inside";
    var st = res.state, armed = [];
    if (st.s1Dir) armed.push("PC touched from " + (st.s1Dir === 1 ? "above, waiting for bullish confirmation" : "below, waiting for bearish confirmation"));
    if (st.s2Out) armed.push("Outside the value area " + (st.s2Out === 1 ? "above" : "below") + ", waiting for a close back inside");
    if (st.bState === 1) armed.push("Broke out above VAH, waiting for a pullback");
    if (st.bState === 2) armed.push("Pullback holding above VAH, break of structure above " + money(st.bPeak));
    if (st.sState === 1) armed.push("Broke out below VAL, waiting for a pullback");
    if (st.sState === 2) armed.push("Pullback holding below VAL, break of structure below " + money(st.sTrough));
    var trades = res.trades.map(function (t) {
      var r = t.r == null ? '<span class="open">open</span>' : '<span class="' + (t.r >= 0 ? "pos" : "neg") + '">' + (t.r >= 0 ? "+" : "") + t.r.toFixed(1) + "R</span>";
      return "<li><span>" + (t.dir === 1 ? "Long" : "Short") + " · " + setupName(t.setup) + "</span>" + r + "</li>";
    }).join("");
    var act = res.active
      ? '<div class="live-trade ' + (res.active.dir === 1 ? "long" : "short") + '"><b>' + (res.active.dir === 1 ? "Long" : "Short") + " · " + setupName(res.active.setup) +
        "</b><span>Entry " + money(res.active.entry) + " · Stop " + money(res.active.sl) + " · Target " + money(res.active.tp) + "</span></div>"
      : "";
    els.side.innerHTML =
      '<p class="k">Previous session closed</p>' +
      '<p class="v">' + priorTxt.charAt(0).toUpperCase() + priorTxt.slice(1) + " the value area</p>" +
      '<p class="play">' + inPlay + "</p>" +
      '<dl class="lv"><div><dt>PC</dt><dd class="pc">' + money(lv.pc) + "</dd></div><div><dt>VAH</dt><dd>" + money(lv.vah) + "</dd></div><div><dt>VAL</dt><dd>" + money(lv.val) + "</dd></div></dl>" +
      act +
      '<p class="k">Watching</p>' + (armed.length ? "<ul class=\"armed\">" + armed.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>" : '<p class="quiet">No setup armed right now.</p>') +
      '<p class="k">' + (complete ? "Session " + sessionDate : "Today so far") + "</p>" +
      (trades ? '<ul class="trades">' + trades + "</ul>" : '<p class="quiet">No trades yet.</p>');
  }

  /* ---------- data ---------- */
  function setGate(msg) {
    root.classList.add("gated");
    els.gate.hidden = false;
    els.gate.innerHTML = msg.replace(/<\/b>\s*([\s\S]+)$/, "</b><span>$1</span>");
  }

  function load() {
    var tok = previewToken();
    var url = "/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&mult=" + MULT + "&rth=1" + (tok ? "&preview=" + encodeURIComponent(tok) : "");
    return fetch(url, { cache: "no-store" }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; });
    }).then(function (res) {
      if (!res.ok) {
        var e = res.body && res.body.error;
        if (e === "private") setGate("<b>Live chart in private preview.</b> Open this page once with your preview link to unlock it in this browser.");
        else if (e === "not_configured") setGate("<b>Live chart not configured yet.</b> Add <code>api/config.php</code> on the server (see <code>api/config.sample.php</code>).");
        else if (e === "symbol_not_allowed") setGate("<b>" + SYMBOL + " isn't on the allowed list.</b> Add it to <code>symbols</code> in <code>api/config.php</code>, or use <code>'*'</code> to allow any ticker.");
        else if (e === "bad_symbol") setGate("<b>That doesn't look like a ticker.</b>");
        else setGate("<b>Live data unavailable right now.</b> Try again in a minute.");
        return false;
      }
      render(res.body);
      return true;
    }).catch(function () { setGate("<b>Live data unavailable right now.</b> Try again in a minute."); return false; });
  }

  function render(data) {
    var rth = [];
    data.bars.forEach(function (a) {
      var t = etParts(a[0]);
      if (t.min >= RTH_OPEN && t.min < RTH_CLOSE) rth.push({ date: t.date, min: t.min, time: t.wall, o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] });
    });
    var dates = [];
    rth.forEach(function (b) { if (dates[dates.length - 1] !== b.date) dates.push(b.date); });
    if (dates.length < 2) { setGate("<b>Not enough data yet.</b> The chart needs one completed session to build the profile."); return; }
    var curDate = dates[dates.length - 1], prevDate = dates[dates.length - 2];
    var prev = rth.filter(function (b) { return b.date === prevDate; });
    var cur = rth.filter(function (b) { return b.date === curDate; });
    var lv = buildProfile(prev);
    if (!lv) { setGate("<b>Couldn't build the profile.</b>"); return; }
    var complete = cur[cur.length - 1].min >= RTH_CLOSE - MULT;
    var res = runEngine(prev, cur, lv, complete);

    els.gate.hidden = true;
    root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    var shown = prev.concat(cur);
    candles.setData(shown.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    volume.setData(shown.map(function (b) { return { time: b.time, value: b.v, color: b.c >= b.o ? "rgba(48,209,88,0.35)" : "rgba(255,69,58,0.35)" }; }));
    ["pc", "vah", "val"].forEach(function (k) {
      lineSeries[k].setData(cur.map(function (b) { return { time: b.time, value: lv[k] }; }));
    });
    candles.setMarkers(res.markers);
    priceLines.forEach(function (pl) { candles.removePriceLine(pl); });
    priceLines = [];
    if (res.active) {
      priceLines.push(candles.createPriceLine({ price: res.active.tp, color: "#30d158", lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: "TP" }));
      priceLines.push(candles.createPriceLine({ price: res.active.sl, color: "#ff453a", lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: "SL" }));
    }
    if (!render.fitted) { chart.timeScale().fitContent(); render.fitted = true; }
    lastProfile = lv;
    requestAnimationFrame(drawProfile);
    renderSide(lv, res, curDate, complete);

    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + data.mult + "-minute · Profile from " + prevDate + "" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  window.VPLive = {
    _run: runEngine, _profile: buildProfile      // exposed for testing
  };

  load().then(function () {
    setInterval(function () { if (!document.hidden) load(); }, POLL_MS);
  });
})();
