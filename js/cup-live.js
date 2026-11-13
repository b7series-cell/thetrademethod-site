/* =====================================================================
   cup-live.js — live Cup and Handle chart on daily bars.

   Pulls about three years of daily bars for the ticker and for SPY from
   /api/bars.php (the API key stays on the server) and runs these
   rules in the browser:
     cup     left rim tops the 10 days before it and everything up to the
             right rim; right rim within 5%, 30–325 days later; 12–35% deep;
             low in the middle 60%; 15%+ of the days closing in the bottom third
     handle  4–25 days after the right rim, never above it, upper half of the
             cup, a 2–15% pullback
     checks  uptrend (20/50/200-day, 50-day rising), base volume, handle
             volume under its 50-day average, clean air, SPY above its 50/200
     trade   buy stop 0.07% over resistance, stop 1.5 × ATR(14), half at
             resistance + ⅓ of the depth, stop to breakeven, rest at + ⅔,
             60 trading days at most
   "Armed" means today's close completes a valid cup and handle, so the buy
   stop is working for the next session.

   Mount: <section data-cup-live data-symbol="NVDA">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var CO = { rimLead: 10, cupMin: 30, cupMax: 325, rimTol: 0.05, depthMin: 0.12, depthMax: 0.35, bottomLo: 0.20, bottomHi: 0.80,
             bottomShare: 0.15, handleMin: 4, handleMax: 25, handleDepthMin: 0.02, handleDepthMax: 0.15, trigPct: 0.0007, stopAtr: 1.5, maxHold: 60 };
  var DAYS = 1095, POLL_MS = 5 * 60000;
  var COL = { res: "#ff9f0a", trig: "#2997ff", stop: "#ff453a", tgt: "#30d158", s20: "#ffd60a", s50: "#2997ff", s200: "#8e8e93" };

  var root = document.querySelector("[data-cup-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = { chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"), status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate") };
  var KIT = LiveKit.controls(root, { key: "cup", symbol: (root.getAttribute("data-symbol") || "NVDA").toUpperCase(), tf: 1, tfs: [],
    onChange: function (sym) { SYMBOL = sym; render.fitted = false; load(); } });
  var SYMBOL = KIT.symbol;

  function token() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }
  function money(x) { return x == null || isNaN(x) ? "—" : x.toFixed(2); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function day(d) { var p = d.split("-"); return MON[+p[1] - 1] + " " + (+p[2]) + ", " + p[0]; }
  function round2(x) { return Number(Math.round(Number(x + "e2")) + "e-2"); }      // PHP round(x, 2)
  var dfmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  function isoDay(d) { return d.toISOString().slice(0, 10); }

  /* ---------- the rules: ---------- */
  function sma(x, n) {
    var out = x.map(function () { return null; }), s = 0;
    for (var i = 0; i < x.length; i++) { s += x[i]; if (i >= n) s -= x[i - n]; if (i >= n - 1) out[i] = s / n; }
    return out;
  }
  function marketMap(B) {
    var c = B.map(function (b) { return b.c; }), s50 = sma(c, 50), s200 = sma(c, 200), m = {};
    B.forEach(function (b, i) { if (s200[i] !== null) m[b.d] = b.c > s50[i] && b.c > s200[i]; });
    return m;
  }
  function run(B, mkt) {
    var n = B.length, dates = B.map(function (b) { return b.d; });
    var o = B.map(function (b) { return b.o; }), h = B.map(function (b) { return b.h; }), l = B.map(function (b) { return b.l; }),
        c = B.map(function (b) { return b.c; }), v = B.map(function (b) { return b.v; });
    var res0 = { dates: dates, cands: [], trades: [], armed: null, s20: [], s50: [], s200: [] };
    if (n < 260) return res0;
    var s20 = sma(c, 20), s50 = sma(c, 50), s200 = sma(c, 200), av50 = sma(v, 50);
    var atr = new Array(n).fill(null), sum = 0, i, k, q;
    for (i = 0; i < n; i++) {
      var tr = i === 0 ? h[i] - l[i] : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
      if (i < 14) { sum += tr; if (i === 13) atr[i] = sum / 14; } else atr[i] = (atr[i - 1] * 13 + tr) / 14;
    }
    function avg(a, from, to) { var s = 0, kk = 0; for (var j = from; j <= to; j++) { s += a[j]; kk++; } return kk ? s / kk : 0; }

    /* the cup and handle that day s completes, or null */
    function shapeAt(s) {
      var r = -1, rh = -Infinity;
      for (k = s - CO.handleMax; k <= s - CO.handleMin; k++) if (k >= 0 && h[k] > rh) { rh = h[k]; r = k; }
      if (r < 0) return null;
      var after = -Infinity; for (k = r + 1; k <= s; k++) after = Math.max(after, h[k]);
      if (after >= h[r]) return null;
      var lft = -1, im = -Infinity;
      for (k = r - 1; k >= Math.max(CO.rimLead, r - CO.cupMax); k--) {
        if (k + 1 <= r - 1) im = Math.max(im, h[k + 1]);
        if (r - k < CO.cupMin) continue;
        if (h[k] < im) continue;
        if (Math.abs(h[k] / h[r] - 1) > CO.rimTol) continue;
        var lead = -Infinity; for (q = k - CO.rimLead; q < k; q++) lead = Math.max(lead, h[q]);
        if (h[k] < lead) continue;
        lft = k; break;
      }
      if (lft < 0) return null;
      var res = Math.max(h[lft], h[r]), cl = Infinity, b = -1;
      for (k = lft + 1; k < r; k++) if (l[k] < cl) { cl = l[k]; b = k; }
      var depthAbs = res - cl, depth = depthAbs / res;
      if (depth < CO.depthMin || depth > CO.depthMax) return null;
      var span = r - lft;
      if (b < lft + CO.bottomLo * span || b > lft + CO.bottomHi * span) return null;
      var third = cl + depthAbs / 3, inBottom = [];
      for (k = lft + 1; k < r; k++) if (c[k] <= third) inBottom.push(k);
      if (inBottom.length < Math.max(5, CO.bottomShare * span)) return null;
      var hl = Infinity; for (k = r + 1; k <= s; k++) hl = Math.min(hl, l[k]);
      var hDepth = (h[r] - hl) / h[r];
      if (hDepth < CO.handleDepthMin || hDepth > CO.handleDepthMax) return null;
      if (hl < cl + 0.5 * depthAbs) return null;
      var trig = round2(res + Math.max(0.01, res * CO.trigPct));
      return { s: s, lft: lft, r: r, b: b, res: res, cl: cl, depthAbs: depthAbs, depth: depth, span: span, inBottom: inBottom, hl: hl, trig: trig,
               T1: res + depthAbs / 3, T2: res + 2 * depthAbs / 3 };
    }
    /* the page's checks, in order: 'T' passes all */
    function checks(S) {
      var s = S.s, out = {};
      out.up = s200[s] !== null && c[s] > s20[s] && c[s] > s50[s] && c[s] > s200[s] && s50[s] > s50[s - 10];
      var declineEnd = Math.max(S.lft + 1, Math.floor((S.lft + S.b) / 2));
      var baseVol = avg(v, S.lft, declineEnd), botVol = 0;
      S.inBottom.forEach(function (kk) { botVol += v[kk]; }); botVol /= S.inBottom.length;
      out.base = botVol < baseVol;
      out.handle = av50[s] !== null && avg(v, S.r + 1, s) < av50[s];
      var prior = -Infinity; for (k = Math.max(0, S.lft - 252); k < S.lft; k++) prior = Math.max(prior, h[k]);
      out.air = !(prior > S.trig && prior < S.T1);
      out.mkt = mkt[dates[s]] !== undefined ? mkt[dates[s]] : true;
      out.code = !out.up ? "u" : !out.base ? "b" : !out.handle ? "h" : !out.air ? "a" : !out.mkt ? "m" : "T";
      return out;
    }

    var busyUntil = -1, s, t;
    for (s = 200; s < n - 1; s++) {
      if (s < busyUntil) continue;
      var S = shapeAt(s);
      if (!S) continue;
      t = s + 1;
      if (h[t] < S.trig) continue;
      var ck = checks(S), code = ck.code;
      var E = Math.max(o[t], S.trig);
      if (code === "T" && E >= S.T1) code = "g";
      res0.cands.push([dates[t], code]);
      if (code !== "T") continue;
      var SL = E - CO.stopAtr * atr[s], R = E - SL;
      var trim = null, x = null, why = null;
      for (k = t; k < n; k++) {
        var green = c[k] >= o[k];
        var pts = green ? [["o", o[k]], ["l", l[k]], ["h", h[k]]] : [["o", o[k]], ["h", h[k]], ["l", l[k]]];
        if (k === t) {
          if (o[k] >= S.trig) pts = pts.slice(1);
          else pts = green ? [["h", h[k]]] : [["h", h[k]], ["l", l[k]]];
        }
        for (var pi = 0; pi < pts.length; pi++) {
          var kind = pts[pi][0], p = pts[pi][1];
          if (kind === "o") {
            if (trim === null && p <= SL) { x = p; why = "stop"; break; }
            if (trim !== null && p <= E) { x = p; why = "be"; break; }
            if (trim === null && p >= S.T1) trim = p;
            if (trim !== null && p >= S.T2) { x = p; why = "t2"; break; }
          } else if (kind === "l") {
            if (trim === null && p <= SL) { x = SL; why = "stop"; break; }
            if (trim !== null && p <= E) { x = E; why = "be"; break; }
          } else {
            if (trim === null && p >= S.T1) trim = S.T1;
            if (trim !== null && p >= S.T2) { x = S.T2; why = "t2"; break; }
          }
        }
        if (why) break;
        if (k - t >= CO.maxHold) { x = c[k]; why = "time"; break; }
      }
      if (!why) { k = n - 1; x = c[k]; why = "open"; }
      var r = trim !== null ? (0.5 * (trim - E) + 0.5 * (x - E)) / R : (x - E) / R;
      busyUntil = k;
      res0.trades.push({ d: dates[t], ti: t, xi: k, shape: S, e: E, s: SL, t1: S.T1, t2: S.T2, trim: trim, x: x, xd: dates[k], why: why, r: r, ck: ck });
    }
    /* today's close: is a buy stop working for tomorrow? */
    var last = n - 1, lastTrade = res0.trades[res0.trades.length - 1];
    if (!(lastTrade && lastTrade.why === "open")) {
      var A = shapeAt(last);
      if (A && c[last] < A.trig) { A.ck = checks(A); A.stop = A.trig - CO.stopAtr * atr[last]; res0.armed = A; }
    }
    res0.s20 = s20; res0.s50 = s50; res0.s200 = s200; res0.atr = atr[last];
    return res0;
  }

  /* ---------- chart ---------- */
  var chart = null, candles, vol, smaS = {}, extras = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderVisible: false, rightOffset: 8 }, crosshair: { mode: 0 }
    });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    vol = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    [["s20", COL.s20, 1, 0, "20"], ["s50", COL.s50, 2, 0, "50"], ["s200", COL.s200, 2, 2, "200"]].forEach(function (d) {
      smaS[d[0]] = chart.addLineSeries({ color: d[1], lineWidth: d[2], lineStyle: d[3], title: d[4], priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    });
  }
  function seg(t0, t1, p, color, style, title, width) {
    var s = chart.addLineSeries({ color: color, lineWidth: width || 1.5, lineStyle: style, title: title || "", priceLineVisible: false, lastValueVisible: !!title,
      crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
    s.setData(t0 === t1 ? [{ time: t0, value: p }] : [{ time: t0, value: p }, { time: t1, value: p }]);
    extras.push(s);
  }

  /* ---------- side panel ---------- */
  var CHECKS = [["up", "Uptrend: above the 20 / 50 / 200-day, 50-day rising"], ["base", "Volume dried up in the base"], ["handle", "Handle volume under its 50-day average"],
                ["air", "Clean air to target 1"], ["mkt", "SPY above its 50 and 200-day"]];
  function checkList(ck) {
    return '<ul class="cup-checks">' + CHECKS.map(function (c) { return '<li class="' + (ck[c[0]] ? "ok" : "no") + '"><span>' + (ck[c[0]] ? "✓" : "✕") + "</span>" + c[1] + "</li>"; }).join("") + "</ul>";
  }
  function rr(x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(2) + "R"; }
  var WHY = { t2: "both targets", be: "target 1, rest at breakeven", stop: "stopped", time: "60-day time stop", open: "still open" };
  function renderSide(res, B) {
    var A = res.armed, last = res.trades[res.trades.length - 1], open = last && last.why === "open" ? last : null, html = "";
    var lastBar = B[B.length - 1];
    if (open) {
      var R = open.e - open.s, now = (lastBar.c - open.e) / R;
      html += '<p class="k">' + SYMBOL + " · daily · " + day(lastBar.d) + '</p><p class="v">In a trade</p>' +
        '<div class="live-trade"><b>Long from ' + money(open.e) + " · " + day(open.d) + "</b><span>Stop " + money(open.trim != null ? open.e : open.s) +
        " · Target 1 " + money(open.t1) + (open.trim != null ? " (half taken)" : "") + " · Target 2 " + money(open.t2) + " · " + (now >= 0 ? "+" : "") + now.toFixed(2) + "R on the close</span></div>";
    } else if (A) {
      var pass = A.ck.code === "T";
      html += '<p class="k">' + SYMBOL + " · daily · " + day(lastBar.d) + '</p><p class="v">' + (pass ? "Armed: buy stop " + money(A.trig) : "Cup and handle, a check fails") + "</p>" +
        '<p class="play">' + (pass ? "A cup and handle completed on today's close and every check passes. The buy stop works next session; it fills only if price trades through " + money(A.trig) + "."
          : "The shape is there, but not every check passes, so the plan says no buy stop.") + "</p>" +
        '<dl class="lv"><div><dt>Resistance</dt><dd class="pdh">' + money(A.res) + "</dd></div><div><dt>Buy stop</dt><dd>" + money(A.trig) + "</dd></div><div><dt>Stop (1.5 ATR)</dt><dd class=\"dn\">" + money(A.stop) + "</dd></div>" +
        "<div><dt>Target 1</dt><dd class=\"up\">" + money(A.T1) + "</dd></div><div><dt>Target 2</dt><dd class=\"up\">" + money(A.T2) + "</dd></div><div><dt>Cup</dt><dd>" + A.span + "d · " + (A.depth * 100).toFixed(1) + "%</dd></div></dl>" +
        checkList(A.ck);
    } else {
      html += '<p class="k">' + SYMBOL + " · daily · " + day(lastBar.d) + '</p><p class="v">No cup and handle right now</p>' +
        '<p class="play">Nothing completes a valid cup and handle on today\'s close. The chart shows the most recent trade the rules took, if any.</p>';
    }
    var recent = res.trades.slice(-5).reverse();
    html += '<p class="k">Trades the rules took (last 3 years)</p>' + (recent.length ? '<ul class="trades">' + recent.map(function (t) {
      return "<li><span>" + day(t.d) + " · " + WHY[t.why] + "</span>" + (t.why === "open" ? '<span class="open">open</span>' : '<span class="' + (t.r > 0 ? "pos" : "neg") + '">' + rr(t.r) + "</span>") + "</li>";
    }).join("") + "</ul>" : '<p class="quiet">None in the loaded history.</p>');
    els.side.innerHTML = html;
  }

  /* ---------- data ---------- */
  function setGate(msg) {
    root.classList.add("gated"); els.gate.hidden = false;
    els.status.textContent = SYMBOL + " · daily · not loaded";
    els.gate.innerHTML = msg.replace(/<\/b>\s*([\s\S]+)$/, "</b><span>$1</span>");
  }
  var SPY = null;
  function fetchDaily(sym) {
    var tok = token(), to = new Date(), from = new Date(to.getTime() - DAYS * 864e5);
    return fetch("/api/bars.php?symbol=" + encodeURIComponent(sym) + "&span=day&from=" + isoDay(from) + "&to=" + isoDay(to) + (tok ? "&preview=" + encodeURIComponent(tok) : ""), { cache: "no-store" })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); });
  }
  function load() {
    var mine = SYMBOL;
    return Promise.all([fetchDaily(SYMBOL), SPY ? Promise.resolve(SPY) : fetchDaily("SPY")]).then(function (rs) {
      if (mine !== SYMBOL) return false;
      var res = rs[0];
      if (rs[1].ok) SPY = rs[1];
      if (!res.ok) {
        var e = res.body && res.body.error;
        if (e === "private") setGate("<b>Live chart in private preview.</b> Open this page once with your preview link to unlock it in this browser.");
        else if (e === "not_configured") setGate("<b>Live chart not configured yet.</b> Add <code>api/config.php</code> on the server.");
        else if (e === "symbol_not_allowed") setGate("<b>" + SYMBOL + " isn't on the allowed list.</b> Add it to <code>symbols</code> in <code>api/config.php</code>, or use <code>'*'</code> to allow any ticker.");
        else if (e === "bad_symbol") setGate("<b>That doesn't look like a ticker.</b>");
        else setGate("<b>Live data unavailable right now.</b> Try again in a minute.");
        return false;
      }
      render(res.body, SPY && SPY.ok ? SPY.body : null); return true;
    }).catch(function () { setGate("<b>Live data unavailable right now.</b> Try again in a minute."); return false; });
  }
  function toBars(data) {
    var seen = {}, out = [];
    data.bars.forEach(function (a) { var d = dfmt.format(new Date(a[0])); if (!seen[d]) { seen[d] = 1; out.push({ d: d, o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] || 0 }); } });
    return out;
  }

  function render(data, spy) {
    var B = toBars(data);
    if (B.length < 260) { setGate("<b>Not enough history for " + SYMBOL + ".</b> The rules need about a year of daily bars."); return; }
    var mkt = spy ? marketMap(toBars(spy)) : {};
    var res = run(B, mkt);
    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, "Daily");
    var tradeDays = {}; res.trades.forEach(function (t) { tradeDays[t.d] = 1; });
    candles.setData(B.map(function (b) { return { time: b.d, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    vol.setData(B.map(function (b) { return { time: b.d, value: b.v, color: tradeDays[b.d] ? "rgba(255,214,10,0.8)" : "rgba(142,142,147,0.35)" }; }));
    ["s20", "s50", "s200"].forEach(function (k) { smaS[k].setData(B.map(function (b, i) { return res[k][i] == null ? { time: b.d } : { time: b.d, value: res[k][i] }; })); });
    extras.forEach(function (s) { chart.removeSeries(s); }); extras = [];
    var marks = [];
    res.trades.forEach(function (t) {
      marks.push({ time: t.d, position: "belowBar", shape: "arrowUp", color: COL.trig, text: "Buy " + money(t.e) });
      if (t.why !== "open") marks.push({ time: t.xd, position: "aboveBar", shape: "arrowDown", color: t.r > 0 ? "#30d158" : "#ff6961", text: rr(t.r) });
    });
    /* the focus: today's armed cup, else the most recent trade */
    var last = res.trades[res.trades.length - 1], F = res.armed || (last ? last.shape : null), lastD = B[B.length - 1].d;
    if (F) {
      marks.push({ time: B[F.lft].d, position: "aboveBar", shape: "circle", color: COL.res, text: "Left rim" });
      marks.push({ time: B[F.b].d, position: "belowBar", shape: "circle", color: COL.res, text: "Cup low" });
      marks.push({ time: B[F.r].d, position: "aboveBar", shape: "circle", color: COL.res, text: "Right rim" });
      var endD = res.armed ? lastD : last.d;
      seg(B[F.lft].d, endD, F.res, COL.res, 0, "Resistance");
      seg(B[F.lft].d, B[F.r].d, F.cl, COL.res, 2, "");
    }
    if (res.armed) {
      seg(B[res.armed.r].d, lastD, res.armed.trig, COL.trig, 2, "Buy stop");
      if (res.armed.ck.code === "T") {
        seg(lastD, lastD, res.armed.stop, COL.stop, 2, "Stop"); seg(lastD, lastD, res.armed.T1, COL.tgt, 0, "T1"); seg(lastD, lastD, res.armed.T2, COL.tgt, 0, "T2");
      }
    } else if (last) {
      seg(last.d, last.xd, last.e, COL.trig, 0, "Fill");
      seg(last.d, last.xd, last.s, COL.stop, 2, "Stop");
      seg(last.d, last.xd, last.t1, COL.tgt, 0, "T1");
      seg(last.d, last.xd, last.t2, COL.tgt, 0, "T2");
    }
    marks.sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
    candles.setMarkers(marks);
    if (!render.fitted) {
      var from = F ? Math.max(0, F.lft - 40) : Math.max(0, B.length - 260);
      chart.timeScale().setVisibleLogicalRange({ from: from, to: B.length - 1 + 8 });
      render.fitted = true;
    }
    renderSide(res, B);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · daily · 20 / 50 / 200-day SMA · market filter from SPY" + (data.delay ? " · " + data.delay : "") +
      " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  window.CupLive = { _run: run, _market: marketMap };
  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
