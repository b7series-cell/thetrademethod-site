/* =====================================================================
   vsr-live.js — live Volume S/R Rejection chart.

   Pulls regular-session bars (2-minute by default; 1 / 2 / 5 / 15 selectable) from /api/bars.php (the API key
   stays on the server) and runs the logic of pine/volume-sr-rejection.pine
   in the browser, with the script's default inputs:
     · rolling profile: 600 bars, 72 rows, buy/sell split by close location
       (buy = volume × (close − low) / (high − low)), POC
     · 5/5 swing pivots, each judged with the profile that ended on the
       pivot bar; only swings with enough profile evidence become levels,
       pulled toward the volume node, scored 0–100 (not a probability)
     · merge within 0.16 ATR, keep 20, a close 0.10 ATR through removes a level
     · BUY: support touched within 0.15 ATR, close back above, green candle,
       buy share ≥ 60% and up ≥ 15 points on the prior 3 bars (volume-weighted);
       SELL is the mirror. One signal per touch, 3-bar cooldown.
   Signals are computed on CLOSED bars only; the newest bar is shown but
   ignored until its end is older than the data delay.

   Mount: <section data-vsr-live data-symbol="QQQ">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = {
    profLb: 600, profRows: 72, swingLen: 5, srchAtr: 1.20, nodeMin: 0.08, evidMin: 0.22, pullMax: 0.85,
    scoreMin: 30, maxLvl: 20, mergeAtr: 0.16, breakAtr: 0.10,
    touchAtr: 0.15, dominance: 60, shiftBars: 3, shiftPoints: 15, cooldown: 3,
    volLen: 40, absRad: 3, pivVolX: 2.2, absBodyMax: 0.40, absVolX: 1.5, tick: 0.01,
    profW: 58, profOff: 8
  };
  var POLL_MS = 60000, MULT = 2, RTH_OPEN = 570, RTH_CLOSE = 960;
  var COL = { sup: "#1fc774", res: "#ef4b4b", core: "#ffcd40", buy: "#2b9e8f", sell: "#4a58b6", poc: "#ff9120", vBuy: "#12cef8", vSell: "#fe3f00" };

  var root = document.querySelector("[data-vsr-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate"),
    form: root.querySelector(".live-symbol")
  };
  var KIT = LiveKit.controls(root, { key: "vsr", symbol: (root.getAttribute("data-symbol") || "QQQ").toUpperCase(), tf: MULT,
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
  function clip(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function vol(b) { return Math.max(b.v || 0, 0); }
  function buyFrac(b) { return b.h > b.l ? clip((b.c - b.l) / (b.h - b.l)) : 0.5; }

  /* ---------- the profile: identical to profile() in the Pine script ---------- */
  function profile(B, from, to, rows) {      // bars from..to inclusive
    var lo = Infinity, hi = -Infinity, i, j;
    for (i = from; i <= to; i++) { lo = Math.min(lo, B[i].l); hi = Math.max(hi, B[i].h); }
    var span = Math.max(hi - lo, OPT.tick * rows), bot = lo - (span - (hi - lo)) * 0.5, step = span / rows;
    var tot = new Array(rows).fill(0), buy = new Array(rows).fill(0);
    function rowId(p) { return Math.max(0, Math.min(rows - 1, Math.floor((p - bot) / step))); }
    for (i = from; i <= to; i++) {
      var b = B[i], r = b.h - b.l, v = vol(b), bf = r > 0 ? clip((b.c - b.l) / r) : 0.5;
      var r0 = rowId(b.l), r1 = rowId(b.h);
      for (j = r0; j <= r1; j++) {
        var rl = bot + j * step;
        var ov = r > 0 ? Math.max(0, Math.min(b.h, rl + step) - Math.max(b.l, rl)) : step;
        var frac = r > 0 ? ov / r : 1;
        if (frac > 0) { tot[j] += v * frac; buy[j] += v * frac * bf; }
      }
    }
    return { bot: bot, step: step, tot: tot, buy: buy };
  }

  function profileNode(raw, supp, atrP, P) {
    var mx = Math.max(Math.max.apply(null, P.tot), 1e-7), rad = Math.max(atrP * OPT.srchAtr, P.step * 2);
    var best = { p: raw, e: -1, s: 0 }, rows = P.tot.length;
    for (var r = 0; r < rows; r++) {
      var p = P.bot + (r + 0.5) * P.step, d = Math.abs(p - raw);
      if (d > rad) continue;
      var rv = P.tot[r], str = rv / mx;
      var lv = r > 0 ? P.tot[r - 1] : rv, rv2 = r < rows - 1 ? P.tot[r + 1] : rv;
      var nAvg = Math.max((lv + rv2) * 0.5, mx * 0.01);
      var pk = clip((rv / nAvg - 0.85) / 0.65);
      var bSh = rv > 0 ? clip(P.buy[r] / rv) : 0.5, dir = supp ? bSh : 1 - bSh;
      var e = 0.50 * str + 0.20 * pk + 0.20 * dir + 0.10 * (1 - d / rad);
      if (e > best.e) best = { p: p, e: e, s: str };
    }
    return { node: best.p, evid: Math.max(best.e, 0), nStr: best.s };
  }

  /* ---------- the indicator, bar by bar ---------- */
  function run(B, nClosed) {
    var n = B.length, L = OPT.swingLen, i;
    /* ATR(14) as ta.atr: RMA of true range, seeded with the SMA */
    var atr = new Array(n).fill(null), trSum = 0;
    for (i = 0; i < n; i++) {
      var tr = i === 0 ? B[i].h - B[i].l : Math.max(B[i].h - B[i].l, Math.abs(B[i].h - B[i - 1].c), Math.abs(B[i].l - B[i - 1].c));
      if (i < 14) { trSum += tr; if (i === 13) atr[i] = trSum / 14; }
      else atr[i] = (atr[i - 1] * 13 + tr) / 14;
    }
    /* 40-bar average volume */
    var avgVol = new Array(n).fill(null), vs = 0;
    for (i = 0; i < n; i++) { vs += vol(B[i]); if (i >= OPT.volLen) vs -= vol(B[i - OPT.volLen]); if (i >= OPT.volLen - 1) avgVol[i] = vs / OPT.volLen; }

    var levels = [], markers = [], signals = [], lastBuy = null, lastSell = null, sBreaks = 0;
    function nz(x, d) { return x == null || isNaN(x) ? d : x; }

    function isPivot(k, high) {
      if (k - L < 0) return false;
      var v = high ? B[k].h : B[k].l;
      for (var q = k - L; q <= k + L; q++) {
        if (q === k) continue;
        if (high ? B[q].h >= v : B[q].l <= v) return false;
      }
      return true;
    }
    function pivotFeatures(t, supp) {
      var k = t - L, vb = nz(avgVol[k], vol(B[k])), vr = vb > 0 ? vol(B[k]) / vb : 1;
      var vSc = clip((vr - 0.8) / (OPT.pivVolX - 0.8));
      var pr = Math.max(B[k].h - B[k].l, OPT.tick);
      var wick = supp ? Math.min(B[k].o, B[k].c) - B[k].l : B[k].h - Math.max(B[k].o, B[k].c);
      var wSc = clip((wick / pr) / 0.5), absSc = 0;
      for (var m = 0; m <= OPT.absRad * 2; m++) {
        var o = t - (L - OPT.absRad + m), b = B[o];
        var cr = Math.max(b.h - b.l, OPT.tick), v = vol(b), base = nz(avgVol[o], v);
        var vRat = base > 0 ? v / base : 1, bRat = Math.abs(b.c - b.o) / cr;
        var small = clip((OPT.absBodyMax - bRat) / OPT.absBodyMax), av = clip((vRat - 1) / (OPT.absVolX - 1));
        absSc = Math.max(absSc, Math.sqrt(small * av));
      }
      return { vSc: vSc, wSc: wSc, aSc: absSc };
    }
    function storeLvl(lv, atrP) {
      var tol = Math.max(atrP * OPT.mergeAtr, OPT.tick), id = -1, best = 1e20;
      levels.forEach(function (x, q) { if (x.supp === lv.supp) { var d = Math.abs(x.p - lv.p); if (d <= tol && d < best) { best = d; id = q; } } });
      if (id >= 0) { if (lv.sc > levels[id].sc) levels[id] = lv; }
      else levels.push(lv);
    }
    function pivotEval(t, raw, supp) {
      var bars = Math.max(1, Math.min(OPT.profLb, t - L + 1));
      var P = profile(B, t - L - bars + 1, t - L, OPT.profRows);
      var atrP = Math.max(nz(atr[t - L], OPT.tick), OPT.tick);
      var nd = profileNode(raw, supp, atrP, P), f = pivotFeatures(t, supp);
      var ok = nd.nStr >= OPT.nodeMin && nd.evid >= OPT.evidMin;
      var pull = ok ? OPT.pullMax * clip(nd.evid / 0.65) : 0;
      var p = raw + (nd.node - raw) * pull;
      var sc = 100 * (0.50 * nd.evid + 0.20 * f.aSc + 0.15 * f.vSc + 0.15 * f.wSc);
      var viable = supp ? B[t].c >= p : B[t].c <= p;
      if (ok && viable && sc >= OPT.scoreMin)
        storeLvl({ p: p, sc: sc, raw: raw, node: nd.node, evid: nd.evid, nStr: nd.nStr, supp: supp, born: B[t - L].time, confirmed: B[t].time, cIdx: t, fired: false }, atrP);
    }

    for (var t = 0; t < nClosed; t++) {
      var b = B[t], a = atr[t];
      /* 1. breaks: a close 0.10 ATR through removes the level */
      var buf = Math.max(nz(a, 0) * OPT.breakAtr, 0);
      for (i = levels.length - 1; i >= 0; i--) {
        var lv = levels[i];
        if (lv.supp ? b.c < lv.p - buf : b.c > lv.p + buf) { levels.splice(i, 1); sBreaks++; }
      }
      /* 2. rejection signals */
      var v = vol(b), hasVol = v > 0, bf = buyFrac(b), buyPct = hasVol ? bf * 100 : null;
      var pb = 0, pt = 0;
      for (var q = 1; q <= OPT.shiftBars; q++) { if (t - q >= 0) { pb += vol(B[t - q]) * buyFrac(B[t - q]); pt += vol(B[t - q]); } }
      var priorBuyPct = t >= OPT.shiftBars && pt > 0 ? 100 * pb / pt : null;
      var buyPress = hasVol && buyPct >= OPT.dominance && priorBuyPct != null && buyPct - priorBuyPct >= OPT.shiftPoints;
      var sellPress = hasVol && 100 - buyPct >= OPT.dominance && priorBuyPct != null && (100 - buyPct) - (100 - priorBuyPct) >= OPT.shiftPoints;
      var tol = Math.max(nz(a, OPT.tick) * OPT.touchAtr, OPT.tick);
      var buyCd = lastBuy == null || t - lastBuy > OPT.cooldown, sellCd = lastSell == null || t - lastSell > OPT.cooldown;
      var bi = -1, si = -1, bs = -1, ss = -1;
      levels.forEach(function (lv, q2) {
        var touching = b.l <= lv.p + tol && b.h >= lv.p - tol;
        if (!touching) lv.fired = false;
        var eligible = touching && !lv.fired && b.time > lv.confirmed && t > 0;
        var rejS = lv.supp && b.c > lv.p && B[t - 1] && B[t - 1].c >= lv.p - tol && b.c > b.o;
        var rejR = !lv.supp && b.c < lv.p && B[t - 1] && B[t - 1].c <= lv.p + tol && b.c < b.o;
        if (eligible && buyCd && buyPress && rejS && lv.sc > bs) { bi = q2; bs = lv.sc; }
        if (eligible && sellCd && sellPress && rejR && lv.sc > ss) { si = q2; ss = lv.sc; }
      });
      var buySig = bi >= 0 && si < 0, sellSig = si >= 0 && bi < 0;
      if (buySig || sellSig) {
        var sl = levels[buySig ? bi : si];
        if (buySig) lastBuy = t; else lastSell = t;
        signals.push({ t: t, time: b.time, min: b.min, date: b.date, side: buySig ? "BUY" : "SELL", level: sl.p, score: sl.sc, close: b.c, pct: buySig ? buyPct : 100 - buyPct });
        markers.push(buySig
          ? { time: b.time, position: "belowBar", shape: "arrowUp", color: "#30d158", text: "BUY" }
          : { time: b.time, position: "aboveBar", shape: "arrowDown", color: "#ff453a", text: "SELL" });
        levels.forEach(function (lv) { if (lv.supp === buySig && b.l <= lv.p + tol && b.h >= lv.p - tol) lv.fired = true; });
      }
      /* 3. new levels from swings confirmed on this bar */
      var full = t >= OPT.profLb + L - 1 && atr[t - L] != null;
      if (full) {
        if (isPivot(t - L, false)) pivotEval(t, B[t - L].l, true);
        if (isPivot(t - L, true)) pivotEval(t, B[t - L].h, false);
        while (levels.length > OPT.maxLvl) {
          var weak = 0;
          for (i = 1; i < levels.length; i++) if (levels[i].sc < levels[weak].sc) weak = i;
          levels.splice(weak, 1);
        }
      }
    }
    var lastClosed = nClosed - 1;
    return {
      levels: levels, markers: markers, signals: signals, atr: atr[lastClosed],
      warm: Math.min(nClosed, OPT.profLb + L), warmNeed: OPT.profLb + L,
      prior: (function () { var pb2 = 0, pt2 = 0; for (var q3 = 1; q3 <= OPT.shiftBars; q3++) { var bb = B[B.length - 1 - q3]; if (bb) { pb2 += vol(bb) * buyFrac(bb); pt2 += vol(bb); } } return pt2 > 0 ? 100 * pb2 / pt2 : null; })()
    };
  }

  /* ---------- chart ---------- */
  var chart = null, candles, vTot, vBuy, lvlSeries = [], overlay, view = null;
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.06, bottom: 0.24 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: OPT.profOff + OPT.profW + 6 },
      crosshair: { mode: 0 }
    });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    vTot = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false, color: "rgba(254,63,0,0.75)" });
    vBuy = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false, color: "rgba(18,206,248,0.8)" });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    overlay = document.createElement("canvas");
    overlay.className = "live-profile";
    overlay.setAttribute("aria-hidden", "true");
    els.chart.appendChild(overlay);
    var pending = false;
    function soon() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; drawOverlay(); }); }
    chart.timeScale().subscribeVisibleLogicalRangeChange(soon);
    chart.subscribeCrosshairMove(soon);
    window.addEventListener("resize", soon);
  }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }
  function lwidth(s) { return s >= 82 ? 4 : s >= 62 ? 3 : 2; }
  function lalpha(s) { return 1 - (s >= 82 ? 8 : s >= 62 ? 22 : s >= 45 ? 38 : 52) / 100; }
  function rings(s) { return s >= 82 ? 4 : s >= 66 ? 3 : s >= 50 ? 2 : 1; }

  /* profile beside the last bar, rings at each level's confirmation, scores at the right end */
  function drawOverlay() {
    if (!overlay || !view) return;
    var paneW = els.chart.clientWidth - chart.priceScale("right").width();
    var H = els.chart.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    overlay.style.width = paneW + "px"; overlay.style.height = H + "px";
    overlay.width = paneW * dpr; overlay.height = H * dpr;
    var ctx = overlay.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, paneW, H);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, paneW, H * 0.8); ctx.clip();
    var ts = chart.timeScale(), lastI = view.n - 1;
    /* profile */
    var P = view.P, mx = Math.max.apply(null, P.tot);
    var x0 = ts.logicalToCoordinate(lastI + OPT.profOff), x1 = ts.logicalToCoordinate(lastI + OPT.profOff + OPT.profW);
    if (mx > 0 && x0 != null && x1 != null) {
      var unit = (x1 - x0) / OPT.profW, poc = P.tot.indexOf(mx);
      for (var r = 0; r < P.tot.length; r++) {
        var rv = P.tot[r]; if (!(rv > 0)) continue;
        var yA = candles.priceToCoordinate(P.bot + (r + 1) * P.step), yB = candles.priceToCoordinate(P.bot + r * P.step);
        if (yA == null || yB == null) continue;
        var w = Math.max(1, Math.round(OPT.profW * rv / mx)) * unit, bw = w * clip(P.buy[r] / rv), top = Math.min(yA, yB), h = Math.max(1, Math.abs(yB - yA) - 0.5);
        ctx.fillStyle = rgba(COL.buy, 0.75); ctx.fillRect(x0, top, bw, h);
        ctx.fillStyle = rgba(COL.sell, 0.75); ctx.fillRect(x0 + bw, top, w - bw, h);
        var lo = P.bot + r * P.step, side = 0;
        view.levels.forEach(function (lv) { if (!side && lv.p >= lo && lv.p <= lo + P.step) side = lv.supp ? 1 : -1; });
        if (r === poc || side) { ctx.strokeStyle = r === poc ? COL.poc : side > 0 ? COL.sup : COL.res; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, top + 0.5, w - 1, h - 1); }
      }
      var pocP = P.bot + (poc + 0.5) * P.step, yP = candles.priceToCoordinate(pocP), xL = ts.logicalToCoordinate(lastI);
      if (yP != null && xL != null) {
        ctx.strokeStyle = COL.poc; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xL, yP); ctx.lineTo(x1, yP); ctx.stroke();
        ctx.font = "600 11px -apple-system, BlinkMacSystemFont, Inter, sans-serif"; ctx.fillStyle = COL.poc;
        ctx.fillText("POC " + money(pocP), Math.min(x1 + 4, paneW - 70), yP - 4);
      }
    }
    /* level rings, scores */
    ctx.font = "600 10px -apple-system, BlinkMacSystemFont, Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var xEnd = ts.logicalToCoordinate(lastI);
    view.levels.forEach(function (lv) {
      var cx = ts.timeToCoordinate(lv.confirmed), cy = candles.priceToCoordinate(lv.p), base = lv.supp ? COL.sup : COL.res;
      if (cy == null) return;
      if (cx != null) {
        var rc = rings(lv.sc), rad = [0, 4, 6.5, 9, 12];
        for (var k = rc; k >= 1; k--) {
          ctx.beginPath(); ctx.arc(cx, cy, rad[k], 0, Math.PI * 2);
          ctx.fillStyle = k === 1 ? rgba(COL.core, lv.evid >= 0.45 ? 1 : 0.78) : rgba(base, [0, 0, 0.70, 0.48, 0.32][k]);
          ctx.fill();
        }
        ctx.fillStyle = "#1d1d1f"; ctx.fillText(Math.round(lv.sc), cx, cy + 0.5);
      }
      if (xEnd != null) {
        ctx.beginPath(); ctx.arc(xEnd, cy, 3, 0, Math.PI * 2); ctx.fillStyle = base; ctx.fill();
        ctx.textAlign = "left"; ctx.fillStyle = base; ctx.font = "600 11px -apple-system, BlinkMacSystemFont, Inter, sans-serif";
        ctx.fillText(Math.round(lv.sc), xEnd + 7, cy + 0.5);
        ctx.textAlign = "center"; ctx.font = "600 10px -apple-system, BlinkMacSystemFont, Inter, sans-serif";
      }
    });
    ctx.restore();
  }

  /* ---------- side panel ---------- */
  function renderSide(r, B, forming, nClosed) {
    var cur = B[B.length - 1], last = B[nClosed - 1];
    var bf = buyFrac(cur), v = vol(cur), buyPct = v > 0 ? bf * 100 : null;
    var warming = nClosed < r.warmNeed;
    var lastSig = r.signals.length ? r.signals[r.signals.length - 1] : null;
    var sigNow = lastSig && lastSig.t === nClosed - 1;
    var above = r.levels.filter(function (l) { return l.p > last.c; }).sort(function (a, b) { return a.p - b.p; });
    var below = r.levels.filter(function (l) { return l.p <= last.c; }).sort(function (a, b) { return b.p - a.p; });
    var near = null, tol = (r.atr || 0) * OPT.touchAtr;
    r.levels.forEach(function (l) { if (last.l <= l.p + tol && last.h >= l.p - tol && (!near || l.sc > near.sc)) near = l; });
    var status = warming ? "Warming up the profile" : sigNow ? lastSig.side + " confirmed" : near ? "At " + (near.supp ? "support " : "resistance ") + money(near.p) : "Watching levels";
    var play = warming ? "Levels start after " + r.warmNeed + " bars of history; " + nClosed + " so far."
      : sigNow ? "Closed back " + (lastSig.side === "BUY" ? "above support " : "below resistance ") + money(lastSig.level) + " with " + Math.round(lastSig.pct) + "% " + (lastSig.side === "BUY" ? "buying" : "selling") + "."
      : near ? "Touching a level. A signal needs the close back on the right side and the volume balance to flip." : "";
    function lvRow(l) {
      return '<li><span class="' + (l.supp ? "pos" : "neg") + '">' + (l.supp ? "Support" : "Resistance") + " " + money(l.p) + "</span><span>" + Math.round(l.sc) + "</span></li>";
    }
    var lvls = above.slice(0, 3).reverse().concat(below.slice(0, 3));
    var today = cur.date, sigs = r.signals.filter(function (s) { return s.date === today; }).slice(-5).reverse();
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · current candle · " + (forming ? "LIVE" : "CLOSED") + "</p>" +
      '<p class="v">' + status + "</p>" +
      (play ? '<p class="play">' + play + "</p>" : "") +
      '<dl class="lv"><div><dt>Buy</dt><dd style="color:' + COL.vBuy + '">' + (buyPct == null ? "—" : Math.round(buyPct) + "%") + "</dd></div>" +
      '<div><dt>Sell</dt><dd style="color:' + COL.vSell + '">' + (buyPct == null ? "—" : Math.round(100 - buyPct) + "%") + "</dd></div>" +
      "<div><dt>Prior 3 buy</dt><dd>" + (r.prior == null ? "—" : Math.round(r.prior) + "%") + "</dd></div>" +
      '<div><dt>POC</dt><dd style="color:' + COL.poc + '">' + money(view.P.bot + (view.P.tot.indexOf(Math.max.apply(null, view.P.tot)) + 0.5) * view.P.step) + "</dd></div>" +
      "<div><dt>ATR (14)</dt><dd>" + money(r.atr) + "</dd></div><div><dt>Levels</dt><dd>" + r.levels.length + "</dd></div></dl>" +
      (forming ? '<p class="k">The ' + clock(cur.min) + " bar is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Nearest levels · score</p>' + (lvls.length ? '<ul class="trades">' + lvls.map(lvRow).join("") + "</ul>" : '<p class="quiet">' + (warming ? "None yet." : "No active levels.") + "</p>") +
      '<p class="k">Signals today</p>' + (sigs.length ? '<ul class="trades">' + sigs.map(function (s) {
        return '<li><span>' + clock(s.min) + " · " + s.side + " at " + money(s.level) + '</span><span class="' + (s.side === "BUY" ? "pos" : "neg") + '">' + money(s.close) + "</span></li>";
      }).join("") + "</ul>" : '<p class="quiet">None yet today.</p>');
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
      if (t.min >= RTH_OPEN && t.min < RTH_CLOSE) B.push({ date: t.date, min: t.min, time: t.wall, ms: a[0], o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] });
    });
    if (B.length < 30) { setGate("<b>Not enough data yet for " + SYMBOL + ".</b>"); return; }
    var asOf = (data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900);
    var forming = !data.date && B[B.length - 1].ms / 1000 + MULT * 60 > asOf;
    var nClosed = forming ? B.length - 1 : B.length;
    var r = run(B, nClosed);
    var bars = Math.min(OPT.profLb, B.length);
    view = { n: B.length, P: profile(B, B.length - bars, B.length - 1, OPT.profRows), levels: r.levels };

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(B.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    vTot.setData(B.map(function (b) { return { time: b.time, value: vol(b) }; }));
    vBuy.setData(B.map(function (b) { return { time: b.time, value: vol(b) * buyFrac(b) }; }));
    var lastT = B[B.length - 1].time;
    candles.setMarkers(r.markers);
    lvlSeries.forEach(function (s) { chart.removeSeries(s); });
    lvlSeries = [];
    r.levels.forEach(function (lv) {
      var s = chart.addLineSeries({ color: rgba(lv.supp ? COL.sup : COL.res, lalpha(lv.sc)), lineWidth: lwidth(lv.sc), priceLineVisible: false,
        lastValueVisible: false, crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
      s.setData(lv.confirmed < lastT ? [{ time: lv.confirmed, value: lv.p }, { time: lastT, value: lv.p }] : [{ time: lastT, value: lv.p }]);
      lvlSeries.push(s);
    });
    if (!render.fitted) {
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, B.length - 220), to: B.length - 1 + OPT.profOff + OPT.profW + 6 });
      render.fitted = true;
    }
    requestAnimationFrame(drawOverlay);
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · regular session · rolling 600-bar profile" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  window.VSRLive = {
    _run: run                             // exposed for testing
  };

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
