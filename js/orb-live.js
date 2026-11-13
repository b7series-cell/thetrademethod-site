/* =====================================================================
   orb-live.js — live Opening Range Break chart.

   Pulls regular-session bars (5-minute by default; 1 / 2 / 5 / 15
   selectable) plus about four months of daily bars from /api/bars.php (the
   API key stays on the server) and runs the page's rules in the browser.
   Same definitions as js/orb-anim.js:

     · OPENING RANGE = high and low of the first 15 minutes (09:30–09:45 ET;
       a 15 / 30-minute toggle switches it to 09:30–10:00). Nothing is traded
       until the window has fully closed. A session whose data doesn't start
       at 09:30 has no range and is skipped.
     · BREAK ATTEMPT = the first bar after the window that trades above the
       range high (long) / below the range low (short) after the previous
       bar closed back inside or on the other side of that level. Every
       attempt is numbered per side; a later one is the "second attempt".
     · An attempt that CLOSES back inside the range = "no trade" (a range
       test, not a break). It is marked, and the idea stays alive.
     · VOLUME CONFIRMATION (the page says "real, outlier volume"; the
       objective rule used here): the break bar's volume ≥ 1.5 × the average
       volume of the 20 bars before it. A close outside the range without it
       = "low vol", no trade.
     · ENTRY = the close of the confirmed break bar (the first moment both the
       break and its volume are known). One long and one short per session at
       most, one trade at a time, and no new entry on the session's last bar.
     · STOP = 5 cents beyond the breakout bar's own low (long) / high (short),
       not the other side of the range.
     · TARGET = 1 daily ATR from the low of day (long) / high of day (short),
       using ATR(14) (Wilder) of the completed daily bars before this
       session; the low / high of day is taken through the breakout bar.
       If that target isn't beyond the entry the day has already used its
       ATR: marked "no room", no trade.
     · EXITS, checked from the bar after entry, stop before target:
       the stop takes the whole position (a gap through it fills at the open);
       at the 1 ATR target half comes off; the other half trails the 9 EMA
       (of the chart's closes) and exits on the first close below it (long) /
       above it (short); anything still open is flat at the session's close.
       Result in R on the full position (R = entry − stop).
     · The higher-time-frame story is a judgment call and is NOT filtered.
   Signals are taken on CLOSED bars only; the newest bar is drawn but ignored
   until it has closed.

   Mount: <section data-orb-live data-symbol="QQQ">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { orMin: 15, volX: 1.5, volN: 20, ema: 9, atrN: 14, pad: 0.05, rthOpen: 570, rthClose: 960 };

  /* ---------- the rules (pure: bars in, lines + events + trades out) ----------
     B   = [{ date:"YYYY-MM-DD", min: minutes after midnight ET, o, h, l, c, v }, …] regular session, ascending
     opt = { mult, orMin, volX, volN, ema, pad, atr: { "YYYY-MM-DD": daily ATR for that session }, nClosed } */
  function signals(B, opt) {
    var o = {}; for (var k in OPT) o[k] = OPT[k]; for (k in opt || {}) o[k] = opt[k];
    var n = o.nClosed == null ? B.length : o.nClosed, mult = o.mult || 5, atrMap = o.atr || {};
    var kE = 2 / (o.ema + 1), e = 0, ema = [], vavg = [], vs = 0, t;
    for (t = 0; t < B.length; t++) {
      e = t === 0 ? B[0].c : e + (B[t].c - e) * kE; ema[t] = e;
      vavg[t] = t >= o.volN ? vs / o.volN : null;            // average of the 20 bars BEFORE bar t
      vs += B[t].v; if (t >= o.volN) vs -= B[t - o.volN].v;
    }
    var days = [], day = null, events = [], trades = [], tr = null;
    function lastOfSession(i) { return B[i].min + mult >= o.rthClose || (i + 1 < B.length && B[i + 1].date !== B[i].date); }
    function finish(x, xt, why) {
      var s = tr.side === "L" ? 1 : -1, full = s * (x - tr.e) / tr.risk;
      var r = tr.t1t != null ? 0.5 * s * (tr.t1x - tr.e) / tr.risk + 0.5 * full : full;
      var c = {}; for (var q in tr) c[q] = tr[q]; c.xt = xt; c.x = x; c.why = why; c.r = r;
      trades.push(c); tr = null;
    }
    for (t = 0; t < n; t++) {
      var b = B[t];
      if (!day || day.date !== b.date) {
        day = { date: b.date, i0: t, iOr: -1, i1: t, ok: b.min === o.rthOpen, orEnd: o.rthOpen + o.orMin, orh: -Infinity, orl: Infinity,
                lod: Infinity, hod: -Infinity, atr: atrMap[b.date] != null ? atrMap[b.date] : null, triesL: 0, triesS: 0, tookL: false, tookS: false, done: false };
        days.push(day);
      }
      day.i1 = t;
      /* exits first (from the bar after entry), stop before target */
      if (tr && t > tr.t) {
        var L = tr.side === "L";
        var stopX = L ? (b.o <= tr.sl ? b.o : b.l <= tr.sl ? tr.sl : null) : (b.o >= tr.sl ? b.o : b.h >= tr.sl ? tr.sl : null);
        if (stopX != null) finish(stopX, t, "stop");
        else {
          if (tr.t1t == null) {
            var tX = L ? (b.o >= tr.tp ? b.o : b.h >= tr.tp ? tr.tp : null) : (b.o <= tr.tp ? b.o : b.l <= tr.tp ? tr.tp : null);
            if (tX != null) { tr.t1t = t; tr.t1x = tX; }
          }
          if (tr.t1t != null && (L ? b.c < ema[t] : b.c > ema[t])) finish(b.c, t, "ema");
          else if (lastOfSession(t)) finish(b.c, t, "close");
        }
      }
      day.lod = Math.min(day.lod, b.l); day.hod = Math.max(day.hod, b.h);
      if (!day.ok) continue;
      if (b.min < day.orEnd) {                                // the range is still forming
        day.orh = Math.max(day.orh, b.h); day.orl = Math.min(day.orl, b.l); day.iOr = t;
        continue;
      }
      if (day.iOr < 0) { day.ok = false; continue; }          // no bars inside the window
      var pc = B[t - 1].c, vr = vavg[t] ? b.v / vavg[t] : null, volOk = vr != null && vr >= o.volX;
      [["L", b.h > day.orh && pc <= day.orh], ["S", b.l < day.orl && pc >= day.orl]].forEach(function (q) {
        if (!q[1]) return;
        var side = q[0], Lg = side === "L", lvl = Lg ? day.orh : day.orl;
        var tries = Lg ? ++day.triesL : ++day.triesS;
        var ev = { t: t, side: side, try: tries, vr: vr, lvl: lvl };
        var outside = Lg ? b.c > lvl : b.c < lvl;
        if (!outside) ev.kind = "notrade";
        else if (!volOk) ev.kind = "lowvol";
        else if (Lg ? day.tookL : day.tookS) ev.kind = "again";
        else if (tr) ev.kind = "busy";
        else if (lastOfSession(t)) ev.kind = "late";
        else if (day.atr == null) ev.kind = "noatr";
        else {
          var sl = Lg ? b.l - o.pad : b.h + o.pad, tp = Lg ? day.lod + day.atr : day.hod - day.atr;
          if (Lg ? tp <= b.c : tp >= b.c) { ev.kind = "noroom"; ev.tp = tp; }
          else {
            ev.kind = Lg ? "buy" : "sell";
            tr = { t: t, side: side, e: b.c, sl: sl, tp: tp, risk: Math.abs(b.c - sl), try: tries, vr: vr, t1t: null, t1x: null, atr: day.atr, lvl: lvl };
            ev.trade = tr;
            if (Lg) day.tookL = true; else day.tookS = true;
          }
        }
        events.push(ev);
      });
    }
    if (day) day.done = lastOfSession(day.i1);
    var all = trades.slice();
    if (tr) { var c = {}; for (var q in tr) c[q] = tr[q]; c.xt = n - 1; c.x = B[n - 1].c; c.why = "open"; all.push(c); }
    return { ema: ema, vavg: vavg, days: days, events: events, trades: trades, all: all, open: tr };
  }

  /* daily ATR(14), Wilder, keyed by each session date: the value through the last completed day BEFORE it */
  function atrByDate(D, sessions, N) {
    var atr = [], a = null, s = 0;
    for (var i = 0; i < D.length; i++) {
      var d = D[i], tr = i ? Math.max(d.h - d.l, Math.abs(d.h - D[i - 1].c), Math.abs(d.l - D[i - 1].c)) : d.h - d.l;
      if (i < N) { s += tr; if (i === N - 1) a = s / N; } else a = (a * (N - 1) + tr) / N;
      atr[i] = i >= N - 1 ? a : null;
    }
    var out = {};
    sessions.forEach(function (date) {
      var v = null; for (var j = 0; j < D.length && D[j].d < date; j++) if (atr[j] != null) v = atr[j];
      out[date] = v;
    });
    return out;
  }

  var POLL_MS = 60000, MULT = 5;
  var COL = { orh: "#2997ff", orl: "#8e8e93", box: "rgba(41,151,255,0.09)", ema: "#f4b942", buy: "#30d158", sell: "#ff453a", rej: "#8e8e93",
              entry: "#2997ff", tp: "#30d158", sl: "#ff453a", volUp: "rgba(48,209,88,0.45)", volDn: "rgba(255,69,58,0.45)", volHit: "#f4b942", vth: "#f5f5f7" };

  var root = document.querySelector("[data-orb-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") { window.ORBLive = { signals: signals, atrByDate: atrByDate }; return; }
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate")
  };
  var KIT = LiveKit.controls(root, { key: "orb", symbol: (root.getAttribute("data-symbol") || "QQQ").toUpperCase(), tf: MULT,
    onChange: function (sym, tf) { if (sym !== SYMBOL) DAILY = null; SYMBOL = sym; MULT = tf; render.fitted = false; load(); } });
  var SYMBOL = KIT.symbol; MULT = KIT.tf;

  /* opening-range window toggle: 15 / 30 minutes, remembered */
  try { var sv = +localStorage.getItem("orb_or"); if (sv === 15 || sv === 30) OPT.orMin = sv; } catch (e) {}
  (function () {
    var form = root.querySelector(".live-symbol"); if (!form) return;
    var seg = document.createElement("div");
    seg.className = "bt-seg orb-or"; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Opening range window");
    seg.innerHTML = [15, 30].map(function (m) { return '<button type="button" data-or="' + m + '" aria-pressed="' + (OPT.orMin === m) + '">OR ' + m + "m</button>"; }).join("");
    form.appendChild(seg);
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-or]"); if (!b) return;
      OPT.orMin = +b.getAttribute("data-or");
      try { localStorage.setItem("orb_or", String(OPT.orMin)); } catch (x) {}
      Array.prototype.forEach.call(seg.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(+x.getAttribute("data-or") === OPT.orMin)); });
      if (LAST) render(LAST);
    });
  })();

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
  function isoDay(d) { return d.toISOString().slice(0, 10); }
  function money(x) { return x == null || isNaN(x) || !isFinite(x) ? "—" : x.toFixed(2); }
  function clock(min) { var h = Math.floor(min / 60), m = min % 60; return (h > 12 ? h - 12 : h) + ":" + (m < 10 ? "0" : "") + m + (h >= 12 ? " pm" : " am"); }
  function rtxt(r) { return (r > 0 ? "+" : "") + r.toFixed(2) + "R"; }

  /* ---------- chart ---------- */
  var chart = null, candles, emaS, orhS, orlS, volS, vthS, shade, lineS = [], BOXES = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "rgba(0,0,0,0)" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.06, bottom: 0.24 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: 0 }
    });
    /* the opening-range boxes are painted on a canvas under the chart */
    els.chart.style.background = "#1d1d1f"; els.chart.style.zIndex = "0";
    shade = document.createElement("canvas");
    shade.setAttribute("aria-hidden", "true");
    shade.style.cssText = "position:absolute;left:0;top:0;z-index:-1;pointer-events:none";
    els.chart.appendChild(shade);
    var pending = false;
    function soon() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; drawShade(); }); }
    chart.timeScale().subscribeVisibleLogicalRangeChange(soon);
    chart.subscribeCrosshairMove(soon);
    window.addEventListener("resize", soon);
    volS = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false });
    vthS = chart.addLineSeries({ priceScaleId: "vol", color: COL.vth, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 }, visible: false });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    orlS = chart.addLineSeries({ color: COL.orl, lineWidth: 1, lineStyle: 2, lineVisible: false, title: "OR low", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    orhS = chart.addLineSeries({ color: COL.orh, lineWidth: 1, lineStyle: 2, lineVisible: false, title: "OR high", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    emaS = chart.addLineSeries({ color: COL.ema, lineWidth: 2, title: "9 EMA", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
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
    BOXES.forEach(function (r) {
      var a = ts.logicalToCoordinate(r.i0), b = ts.logicalToCoordinate(r.i1);
      var y0 = candles.priceToCoordinate(r.hi), y1 = candles.priceToCoordinate(r.lo);
      if (a == null || b == null || y0 == null || y1 == null) return;
      ctx.fillStyle = COL.box;
      ctx.fillRect(a - half, y0, b - a + 2 * half, Math.max(1, y1 - y0));
      ctx.strokeStyle = "rgba(41,151,255,0.35)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.strokeRect(a - half + 0.5, y0 + 0.5, b - a + 2 * half - 1, Math.max(1, y1 - y0) - 1);
      /* the range lines, from the end of the window to the session's last bar */
      var c = ts.logicalToCoordinate(r.end);
      if (c == null) return;
      ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      [[y0, COL.orh], [y1, COL.orl]].forEach(function (q) {
        ctx.strokeStyle = q[1]; ctx.beginPath(); ctx.moveTo(b + half, Math.round(q[0]) + 0.5); ctx.lineTo(c + half, Math.round(q[0]) + 0.5); ctx.stroke();
      });
      ctx.setLineDash([]);
    });
  }

  /* ---------- side panel ---------- */
  var LABEL = { notrade: "closed back inside · no trade", lowvol: "low volume · no trade", noroom: "no room to 1 ATR · no trade",
                busy: "already in a trade", late: "last bar of the session", noatr: "no daily ATR", again: "side already traded" };
  function renderSide(r, B, forming, nClosed) {
    var cur = B[B.length - 1], last = B[nClosed - 1], li = nClosed - 1, D = r.days[r.days.length - 1];
    var today = last.date, tr = r.open, emaV = r.ema[li];
    var vr = r.vavg[li] ? last.v / r.vavg[li] : null;
    var orDone = D.ok && D.iOr >= 0 && last.min + MULT >= D.orEnd;
    var lastEv = r.events.length ? r.events[r.events.length - 1] : null;
    var sigNow = lastEv && lastEv.t === li && (lastEv.kind === "buy" || lastEv.kind === "sell");
    var longT1 = D.atr != null ? D.lod + D.atr : null, shortT1 = D.atr != null ? D.hod - D.atr : null;
    var status = !D.ok ? "No opening range for this session"
      : !orDone ? "Opening range forming"
      : sigNow ? (lastEv.side === "L" ? "BUY confirmed" : "SELL confirmed")
      : tr ? (tr.side === "L" ? "LONG open" : "SHORT open") + (tr.t1t != null ? " · half off, trailing" : "")
      : D.done ? "Session closed"
      : D.tookL && D.tookS ? "Both sides traded today"
      : "Range set · waiting for a break";
    var play = "";
    if (tr) {
      var s = tr.side === "L" ? 1 : -1, nowR = s * (last.c - tr.e) / tr.risk;
      play = (tr.side === "L" ? "Bought " : "Shorted ") + money(tr.e) + " at " + clock(B[tr.t].min) + " on " + tr.vr.toFixed(1) + "× volume" + (tr.try > 1 ? " (attempt " + tr.try + ")" : "") +
        ". Stop " + money(tr.sl) + ", 5¢ past the breakout bar. " +
        (tr.t1t != null ? "Half came off at " + money(tr.t1x) + " (1 ATR); the rest exits on a close " + (s > 0 ? "below" : "above") + " the 9 EMA, now " + money(emaV) + ". "
                        : "First target " + money(tr.tp) + " = " + (s > 0 ? "low" : "high") + " of day " + (s > 0 ? "+" : "−") + " 1 ATR (" + money(tr.atr) + "). ") +
        (nowR >= 0 ? "+" : "") + nowR.toFixed(2) + "R on the last close.";
    } else if (D.ok && !orDone) {
      play = "The range so far: " + money(D.orh) + " – " + money(D.orl) + ". No trade until the " + OPT.orMin + "-minute window has closed at " + clock(D.orEnd) + ".";
    } else if (D.ok && !D.done) {
      var need = r.vavg[li] ? Math.round(OPT.volX * r.vavg[li]).toLocaleString() : null;
      play = "A close above " + money(D.orh) + (D.tookL ? " (long side already traded)" : "") + " or below " + money(D.orl) + (D.tookS ? " (short side already traded)" : "") +
        " on volume ≥ 1.5× the 20-bar average" + (need ? " (about " + need + " shares)" : "") + " is the trade. A poke that closes back inside is no trade.";
    }
    var evs = r.events.filter(function (x) { return B[x.t].date === today && x.kind !== "again"; }).slice(-7).reverse();
    var dates = []; B.forEach(function (b) { if (dates[dates.length - 1] !== b.date) dates.push(b.date); });
    var wins = 0, losses = 0, net = 0;
    r.trades.forEach(function (t) { net += t.r; if (t.r > 0) wins++; else losses++; });
    function outcome(x) {
      if (!x.trade) return '<span class="quiet">' + (x.vr != null ? x.vr.toFixed(1) + "×" : "") + "</span>";
      var done = null; r.trades.forEach(function (t) { if (t.t === x.t) done = t; });
      if (!done) return '<span class="pos">open</span>';
      return '<span class="' + (done.r > 0 ? "pos" : "neg") + '">' + rtxt(done.r) + "</span>";
    }
    function line(x) {
      var L = x.side === "L", what;
      if (x.kind === "buy" || x.kind === "sell") what = (L ? "BUY " : "SELL ") + money(x.trade.e) + " · vol " + x.vr.toFixed(1) + "×" + (x.try > 1 ? " · attempt " + x.try : "");
      else what = (L ? "Above " : "Below ") + money(x.lvl) + " · " + LABEL[x.kind];
      return "<li><span>" + clock(B[x.t].min) + " · " + what + "</span>" + outcome(x) + "</li>";
    }
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · last closed bar · " + clock(last.min) + "</p>" +
      '<p class="v">' + status + "</p>" +
      (play ? '<p class="play">' + play + "</p>" : "") +
      '<dl class="lv"><div><dt>OR high</dt><dd style="color:' + COL.orh + '">' + money(D.ok ? D.orh : null) + "</dd></div>" +
      "<div><dt>OR low</dt><dd>" + money(D.ok ? D.orl : null) + "</dd></div>" +
      "<div><dt>Daily ATR</dt><dd>" + money(D.atr) + "</dd></div>" +
      '<div><dt>Long 1 ATR</dt><dd class="up">' + money(longT1) + "</dd></div>" +
      '<div><dt>Short 1 ATR</dt><dd class="dn">' + money(shortT1) + "</dd></div>" +
      '<div><dt>Volume</dt><dd class="' + (vr != null && vr >= OPT.volX ? "up" : "") + '">' + (vr == null ? "—" : vr.toFixed(2) + "×") + "</dd></div></dl>" +
      (forming ? '<p class="k">The ' + clock(cur.min) + " bar is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Breaks today</p>' + (evs.length ? '<ul class="trades">' + evs.map(line).join("") + "</ul>" : '<p class="quiet">None yet today.</p>') +
      '<p class="k">Loaded sessions (' + dates.length + ") · trades " + r.trades.length + " · winners " + wins + " · losers " + losses + " · net " + rtxt(net) + "</p>";
  }

  /* ---------- data ---------- */
  var DAILY = null, LAST = null;
  function setGate(msg) {
    root.classList.add("gated"); els.gate.hidden = false;
    els.status.textContent = SYMBOL + " · " + LiveKit.tfLabel(MULT) + " · not loaded";
    els.gate.innerHTML = msg.replace(/<\/b>\s*([\s\S]+)$/, "</b><span>$1</span>");
  }
  function getJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); });
  }
  function load() {
    var tok = previewToken(), mine = SYMBOL + "|" + MULT, q = tok ? "&preview=" + encodeURIComponent(tok) : "";
    var to = new Date(), from = new Date(to.getTime() - 120 * 864e5);
    var dReq = DAILY && DAILY.sym === SYMBOL ? Promise.resolve(DAILY.res)
      : getJSON("/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&span=day&from=" + isoDay(from) + "&to=" + isoDay(to) + q);
    return Promise.all([getJSON("/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&mult=" + MULT + "&rth=1" + q), dReq]).then(function (rs) {
      if (mine !== SYMBOL + "|" + MULT) return false;
      var res = rs[0], dres = rs[1];
      if (dres.ok) DAILY = { sym: SYMBOL, res: dres };
      var bad = !res.ok ? res : !dres.ok ? dres : null;
      if (bad) {
        var e = bad.body && bad.body.error;
        if (e === "private") setGate("<b>Live chart in private preview.</b> Open this page once with your preview link to unlock it in this browser.");
        else if (e === "not_configured") setGate("<b>Live chart not configured yet.</b> Add <code>api/config.php</code> on the server.");
        else if (e === "symbol_not_allowed") setGate("<b>" + SYMBOL + " isn't on the allowed list.</b> Add it to <code>symbols</code> in <code>api/config.php</code>, or use <code>'*'</code> to allow any ticker.");
        else if (e === "bad_symbol") setGate("<b>That doesn't look like a ticker.</b>");
        else setGate("<b>Live data unavailable right now.</b> Try again in a minute.");
        return false;
      }
      LAST = { data: res.body, daily: dres.body };
      render(LAST); return true;
    }).catch(function () { setGate("<b>Live data unavailable right now.</b> Try again in a minute."); return false; });
  }

  function render(pack) {
    var data = pack.data, B = [];
    data.bars.forEach(function (a) {
      var t = etParts(a[0]);
      if (t.min >= OPT.rthOpen && t.min < OPT.rthClose) B.push({ date: t.date, min: t.min, time: t.wall, ms: a[0], o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] || 0 });
    });
    if (B.length < 60) { setGate("<b>Not enough data yet for " + SYMBOL + ".</b>"); return; }
    var D = [], seen = {};
    (pack.daily.bars || []).forEach(function (a) { var d = etParts(a[0]).date; if (!seen[d]) { seen[d] = 1; D.push({ d: d, o: a[1], h: a[2], l: a[3], c: a[4] }); } });
    var sessions = []; B.forEach(function (b) { if (sessions[sessions.length - 1] !== b.date) sessions.push(b.date); });
    var atr = atrByDate(D, sessions, OPT.atrN);
    var asOf = (data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900);
    var forming = !data.date && B[B.length - 1].ms / 1000 + MULT * 60 > asOf;
    var nClosed = forming ? B.length - 1 : B.length;
    var r = signals(B, { mult: MULT, orMin: OPT.orMin, atr: atr, nClosed: nClosed });

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(B.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    var hit = {}; r.events.forEach(function (x) { if (x.kind === "buy" || x.kind === "sell") hit[x.t] = 1; });
    volS.setData(B.map(function (b, i) { return { time: b.time, value: b.v, color: hit[i] ? COL.volHit : b.c >= b.o ? COL.volUp : COL.volDn }; }));
    vthS.setData(B.map(function (b, i) { return r.vavg[i] == null ? { time: b.time } : { time: b.time, value: OPT.volX * r.vavg[i] }; }));
    emaS.setData(B.map(function (b, i) { return { time: b.time, value: r.ema[i] }; }));
    /* range lines from the end of the window to the session's close; the window itself is the box */
    /* (earlier sessions' lines are painted on the canvas; the series carry only the latest range, for the axis labels) */
    BOXES = [];
    r.days.forEach(function (d) { if (d.ok && d.iOr >= 0) BOXES.push({ i0: d.i0, i1: d.iOr, end: d.i1, hi: d.orh, lo: d.orl }); });
    var LD = r.days[r.days.length - 1], orh = [], orl = [];
    if (LD.ok && LD.iOr >= 0) for (var i = LD.iOr; i <= LD.i1; i++) { orh.push({ time: B[i].time, value: LD.orh }); orl.push({ time: B[i].time, value: LD.orl }); }
    orhS.setData(orh); orlS.setData(orl);

    /* markers: taken breaks, failed / rejected attempts, half-off and exits */
    var marks = [], nRej = {};
    r.events.forEach(function (x) {
      var L = x.side === "L", pos = L ? "aboveBar" : "belowBar", rk = B[x.t].date + x.side;
      if (x.kind !== "buy" && x.kind !== "sell" && x.kind !== "again") {
        nRej[rk] = (nRej[rk] || 0) + 1;
        if (nRej[rk] > 2) { marks.push({ time: B[x.t].time, position: pos, shape: "circle", color: "rgba(142,142,147,0.6)", size: 0.5 }); return; }
      }
      if (x.kind === "buy" || x.kind === "sell")
        marks.push({ time: B[x.t].time, position: L ? "belowBar" : "aboveBar", shape: L ? "arrowUp" : "arrowDown", color: L ? COL.buy : COL.sell, text: (L ? "BUY" : "SELL") + (x.try > 1 ? " · try " + x.try : "") });
      else if (x.kind === "notrade") marks.push({ time: B[x.t].time, position: pos, shape: "circle", color: COL.rej, text: "no trade" });
      else if (x.kind === "lowvol") marks.push({ time: B[x.t].time, position: pos, shape: "circle", color: COL.rej, text: "low vol" });
      else if (x.kind === "noroom") marks.push({ time: B[x.t].time, position: pos, shape: "circle", color: COL.rej, text: "no room" });
      else if (x.kind === "busy") marks.push({ time: B[x.t].time, position: pos, shape: "circle", color: COL.rej, text: "in trade" });
    });
    r.all.forEach(function (t) {
      var L = t.side === "L";
      if (t.t1t != null) marks.push({ time: B[t.t1t].time, position: L ? "aboveBar" : "belowBar", shape: "square", color: COL.tp, text: "½ at 1 ATR" });
      if (t.why === "open") return;
      var good = t.r > 0;
      marks.push({ time: B[t.xt].time, position: L ? "aboveBar" : "belowBar", shape: "square", color: t.why === "stop" ? COL.sl : good ? COL.tp : COL.ema,
        text: t.why === "stop" ? "Stop" : t.why === "ema" ? "9 EMA exit" : "Close" });
    });
    marks.sort(function (a, b) { return a.time - b.time; });
    candles.setMarkers(marks);

    /* entry / 1 ATR target / stop for the last few trades */
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

    var span = MULT >= 15 ? 130 : MULT >= 5 ? 160 : MULT >= 2 ? 200 : 260;
    if (!render.fitted) {
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, B.length - span), to: B.length - 1 + 6 });
      render.fitted = true;
    }
    requestAnimationFrame(drawShade);
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · regular session · opening range = first " + OPT.orMin + " minutes (blue box) · break confirmed by a close outside it on volume ≥ 1.5× the 20-bar average (dashed) · stop 5¢ past the breakout bar · half off 1 daily ATR(14) from the low / high of day · rest trails the 9 EMA (gold)" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  window.ORBLive = { signals: signals, atrByDate: atrByDate };

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
