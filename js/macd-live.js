/* =====================================================================
   macd-live.js — live MACD Continuation Scalp chart.

   Pulls regular-session bars (1-minute by default; 1 / 2 / 5 selectable)
   from /api/bars.php (the API key stays on the server) and runs the
   page's four-step trigger in the browser, long and short (the page teaches
   it symmetric around zero):

     · MACD 3/9/5: MACD line = EMA 3 − EMA 9 of the closes, signal = EMA 5 of
       the MACD line (every EMA seeded with its first value). No histogram.
       ATR = 14-bar Wilder average of the true range. Nothing for the first
       30 bars while the lines warm up.
     · 1. FLAT BASE (objective version of "MACD wrapped tightly around zero"):
       at least 5 consecutive closed bars with |MACD| ≤ 0.25 × ATR(14).
       Shaded gold. No signal, just marked.
     · 2. EXPANSION: within 10 bars of the base's last flat bar, the MACD line
       reaches ≥ 0.5 × ATR above zero with the signal also above zero (long),
       or ≤ −0.5 × ATR with the signal below zero (short). Still not in.
     · 3. PULLBACK HOLDS ITS SIDE OF ZERO: the MACD line crosses under its
       signal (long; over it for a short). From the expansion on, both lines
       must stay above zero (below for a short) on every bar; the first bar
       where either line reaches the other side kills the move ("lost 0",
       the straddle the page skips).
     · 4. ENTRY: the MACD line crosses back over its signal with both lines
       still above zero (mirror for a short). Buy (sell) that close.
       STOP: one cent past the pullback's extreme price (the lowest low, or
       highest high for a short, from the bar of the pullback cross through
       the entry bar).
     · EXIT: the first bar after entry whose close leaves the MACD line on the
       wrong side of its signal (the cross back), at that close. Stop first
       (intrabar), then the cross; flat at the session's last bar.
     · THAT MOVE IS DONE: only the first continuation cross per expansion is
       traded. Any later cross back on the same move is marked "skip" until a
       fresh flat base forms (a new base also ends the old move).
     · Everything resets at the start of each session. One trade at a time;
       a qualifying cross while already in a trade is marked "in trade".
   Signals are taken on CLOSED bars only; the newest bar is drawn but ignored
   until it has closed.

   Mount: <section data-macd-live data-symbol="QQQ">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { fast: 3, slow: 9, sig: 5, atr: 14, flatK: 0.25, flatMin: 5, baseWait: 10, expK: 0.5, tick: 0.01, warm: 30, rthClose: 960, mult: 1 };

  /* ---------- the rules (pure: bars in, lines + events out) ----------
     B: [{ o, h, l, c, v, date: "YYYY-MM-DD", min: minutes after midnight ET }]
     opt: overrides of OPT, plus n = number of CLOSED bars to evaluate (default all) */
  function signals(B, opt) {
    var o = {}, k;
    for (k in OPT) o[k] = OPT[k];
    for (k in (opt || {})) o[k] = opt[k];
    var n = o.n == null ? B.length : Math.min(o.n, B.length);
    function ema(arr, len) { var kk = 2 / (len + 1), e = arr[0]; return arr.map(function (v) { e = v * kk + e * (1 - kk); return e; }); }
    var CL = B.map(function (b) { return b.c; }), E1 = ema(CL, o.fast), E2 = ema(CL, o.slow);
    var M = E1.map(function (v, i) { return v - E2[i]; }), S = ema(M, o.sig), A = [], atr = null, t;
    for (t = 0; t < B.length; t++) {
      var b0 = B[t], trr = t ? Math.max(b0.h - b0.l, Math.abs(b0.h - B[t - 1].c), Math.abs(b0.l - B[t - 1].c)) : b0.h - b0.l;
      atr = atr == null ? trr : atr + (trr - atr) / o.atr; A[t] = atr;
    }
    function isLast(t) { return t + 1 < B.length ? B[t + 1].date !== B[t].date : B[t].min + o.mult >= o.rthClose; }
    var events = [], trades = [], bases = [], stage = [], flatRun = 0, base = null, ph = null, tr = null;
    for (t = 0; t < n; t++) {
      var b = B[t], last = isLast(t);
      if (t > 0 && B[t].date !== B[t - 1].date) { flatRun = 0; base = null; ph = null; }
      /* manage the open trade from the bar after entry: stop, then the cross back, then the close of the session */
      if (tr && t > tr.t) {
        var L0 = tr.side === "L", x = null, why = null;
        if (L0 ? b.l <= tr.sl : b.h >= tr.sl) { x = tr.sl; why = "stop"; }
        else if (L0 ? M[t] < S[t] : M[t] > S[t]) { x = b.c; why = "cross"; }
        else if (last) { x = b.c; why = "eod"; }
        if (why) {
          tr.xt = t; tr.x = x; tr.why = why; tr.r = (L0 ? x - tr.e : tr.e - x) / tr.risk;
          trades.push(tr); events.push({ type: "exit", t: t, side: tr.side, x: x, why: why }); tr = null;
        }
      }
      if (t < o.warm || t === 0) { stage[t] = tr ? "in" : ""; continue; }
      var band = o.flatK * A[t], flat = Math.abs(M[t]) <= band;
      flatRun = flat ? flatRun + 1 : 0;
      if (flatRun >= o.flatMin) {
        ph = null;                                        // a fresh base ends any old move
        if (base && base.t1 === t - 1) base.t1 = t;
        else { base = { t0: t - flatRun + 1, t1: t }; bases.push(base); }
        stage[t] = tr ? "in" : "base"; continue;
      }
      var up = M[t] > S[t], pup = M[t - 1] > S[t - 1], crossUp = up && !pup, crossDn = !up && pup;
      if (!ph && base) {
        if (t - base.t1 > o.baseWait) base = null;
        else if (M[t] >= o.expK * A[t] && S[t] > 0) { ph = { side: "L", t0: t, base: base, pulled: false, used: false, ext: null, pt: null }; base = null; events.push({ type: "exp", t: t, side: "L" }); }
        else if (M[t] <= -o.expK * A[t] && S[t] < 0) { ph = { side: "S", t0: t, base: base, pulled: false, used: false, ext: null, pt: null }; base = null; events.push({ type: "exp", t: t, side: "S" }); }
      } else if (ph) {
        var L = ph.side === "L";
        var ok = L ? M[t] > 0 && S[t] > 0 : M[t] < 0 && S[t] < 0;
        if (!ok) { if (ph.pulled && !ph.used) events.push({ type: "zero", t: t, side: ph.side }); ph = null; }
        else {
          var against = L ? crossDn : crossUp, back = L ? crossUp : crossDn;
          if (against) { ph.pulled = true; ph.pt = t; ph.ext = L ? b.l : b.h; }
          else if (ph.pulled) ph.ext = L ? Math.min(ph.ext, b.l) : Math.max(ph.ext, b.h);
          if (back && ph.pulled) {
            if (ph.used) events.push({ type: "skip", t: t, side: ph.side });
            else {
              ph.used = true;
              if (tr) events.push({ type: "busy", t: t, side: ph.side });
              else if (last) events.push({ type: "skip", t: t, side: ph.side, why: "eod" });
              else {
                var sl = +(L ? ph.ext - o.tick : ph.ext + o.tick).toFixed(4);
                tr = { t: t, side: ph.side, e: b.c, sl: sl, risk: L ? b.c - sl : sl - b.c, ext: ph.ext, pt: ph.pt, exp: ph.t0, base: ph.base };
                events.push({ type: L ? "buy" : "sell", t: t, side: ph.side, x: b.c });
              }
            }
            ph.pulled = false;
          }
        }
      }
      stage[t] = tr ? "in" : ph ? (ph.used ? "done" : ph.pulled ? "pull" : "exp") : base ? "based" : flat ? "flat" : "";
    }
    if (tr) { var lc = B[n - 1].c; tr.now = (tr.side === "L" ? lc - tr.e : tr.e - lc) / tr.risk; }
    return { macd: M, signal: S, atr: A, events: events, trades: trades, open: tr, bases: bases, stage: stage, phase: ph, base: base, flatRun: flatRun };
  }

  var POLL_MS = 60000, MULT = 1, RTH_OPEN = 570, RTH_CLOSE = 960;
  var COL = { macd: "#2997ff", sig: "#f4b942", zero: "#8e8e93", buy: "#30d158", sell: "#ff453a", skip: "#8e8e93", exp: "#64d2ff",
              entry: "#2997ff", sl: "#ff453a", base: "rgba(244,185,66,0.10)", inL: "rgba(48,209,88,0.07)", inS: "rgba(255,69,58,0.07)" };

  var root = document.querySelector("[data-macd-live]");
  window.MACDLive = { signals: signals };
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate")
  };
  var KIT = LiveKit.controls(root, { key: "macd", symbol: (root.getAttribute("data-symbol") || "QQQ").toUpperCase(), tf: MULT, tfs: [1, 2, 5],
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
  function m3(x) { return x == null || isNaN(x) ? "—" : (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(Math.abs(x) < 1 ? 3 : 2); }
  function clock(min) { var h = Math.floor(min / 60), m = min % 60; return (h > 12 ? h - 12 : h) + ":" + (m < 10 ? "0" : "") + m + (h >= 12 ? " pm" : " am"); }
  function rtxt(r) { return (r >= 0 ? "+" : "") + r.toFixed(2) + "R"; }

  /* ---------- chart: price on top, MACD 3/9/5 in a second chart below with its own axis, time scales synced ---------- */
  var chart = null, sub = null, topEl, botEl, candles, macdS, sigS, shade, label, lineS = [], RUNS = [];
  var SPLIT = 0.66, AXIS_W = 64;
  function opts(timeVisible) {
    return {
      autoSize: true,
      layout: { background: { type: "solid", color: "rgba(0,0,0,0)" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: timeVisible },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, minimumWidth: AXIS_W, scaleMargins: timeVisible ? { top: 0.14, bottom: 0.08 } : { top: 0.06, bottom: 0.04 } },
      timeScale: { visible: timeVisible, borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: 0 }
    };
  }
  function makeChart() {
    els.chart.style.background = "#1d1d1f"; els.chart.style.zIndex = "0";
    shade = document.createElement("canvas");
    shade.setAttribute("aria-hidden", "true");
    shade.style.cssText = "position:absolute;left:0;top:0;z-index:-1;pointer-events:none";
    els.chart.appendChild(shade);
    topEl = document.createElement("div"); topEl.style.cssText = "position:absolute;left:0;right:0;top:0;height:" + (SPLIT * 100) + "%";
    botEl = document.createElement("div"); botEl.style.cssText = "position:absolute;left:0;right:0;bottom:0;top:" + (SPLIT * 100) + "%";
    els.chart.appendChild(topEl); els.chart.appendChild(botEl);
    chart = LightweightCharts.createChart(topEl, opts(false));
    sub = LightweightCharts.createChart(botEl, opts(true));
    label = document.createElement("div");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:absolute;left:12px;top:calc(" + (SPLIT * 100) + "% + 6px);z-index:3;pointer-events:none;font-size:11px;color:#a1a1a6;white-space:nowrap";
    label.innerHTML = 'MACD 3/9/5 · <span style="color:' + COL.macd + '">MACD</span> · <span style="color:' + COL.sig + '">signal</span> · zero dashed';
    els.chart.appendChild(label);
    /* keep the two time scales locked together */
    var syncing = false;
    function link(a, b) {
      a.timeScale().subscribeVisibleLogicalRangeChange(function (rg) {
        if (syncing || !rg) return; syncing = true; b.timeScale().setVisibleLogicalRange(rg); syncing = false; soon();
      });
    }
    link(chart, sub); link(sub, chart);
    var pending = false;
    function soon() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; drawShade(); }); }
    window.addEventListener("resize", soon);
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    var pf = { type: "price", precision: 3, minMove: 0.001 };
    sigS = sub.addLineSeries({ color: COL.sig, lineWidth: 2, priceFormat: pf, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    macdS = sub.addLineSeries({ color: COL.macd, lineWidth: 2, priceFormat: pf, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    macdS.createPriceLine({ price: 0, color: COL.zero, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "" });
  }

  function drawShade() {
    if (!shade || !sub) return;
    var ts = chart.timeScale(), paneW = els.chart.clientWidth - chart.priceScale("right").width();
    var H = els.chart.clientHeight - sub.timeScale().height(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    shade.style.width = paneW + "px"; shade.style.height = H + "px";
    shade.width = Math.max(1, paneW * dpr); shade.height = Math.max(1, H * dpr);
    var ctx = shade.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, paneW, H);
    var half = (ts.options().barSpacing || 6) / 2, sep = Math.round(topEl.clientHeight) + 0.5;
    RUNS.forEach(function (r) {
      var a = ts.logicalToCoordinate(r.i0), b = ts.logicalToCoordinate(r.i1);
      if (a == null || b == null) return;
      ctx.fillStyle = r.k === "base" ? COL.base : r.k === "inL" ? COL.inL : COL.inS;
      ctx.fillRect(a - half, 0, b - a + 2 * half, H);
    });
    /* the divider between price and the MACD pane */
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, sep); ctx.lineTo(els.chart.clientWidth, sep); ctx.stroke();
  }
  function runs(r, n) {
    var out = [];
    r.bases.forEach(function (b) { if (b.t0 < n) out.push({ k: "base", i0: b.t0, i1: Math.min(b.t1, n - 1) }); });
    r.trades.concat(r.open ? [r.open] : []).forEach(function (t) { out.push({ k: t.side === "L" ? "inL" : "inS", i0: t.t, i1: t.xt != null ? t.xt : n - 1 }); });
    return out;
  }

  /* ---------- side panel ---------- */
  function renderSide(r, B, forming, nClosed) {
    var cur = B[B.length - 1], last = B[nClosed - 1], li = nClosed - 1, today = last.date;
    var M = r.macd[li], S = r.signal[li], A = r.atr[li], tr = r.open, ph = r.phase, warm = nClosed > OPT.warm;
    var lastEv = r.events.length ? r.events[r.events.length - 1] : null, evNow = lastEv && lastEv.t === li ? lastEv : null;
    var side = ph ? (ph.side === "L" ? "long" : "short") : "";
    var status = !warm ? "Warming up the MACD"
      : evNow && (evNow.type === "buy" || evNow.type === "sell") ? (evNow.type === "buy" ? "BUY confirmed · cross back above zero" : "SELL confirmed · cross back below zero")
      : tr ? (tr.side === "L" ? "LONG open · MACD over its signal" : "SHORT open · MACD under its signal")
      : evNow && evNow.type === "exit" ? "Out · " + (evNow.why === "stop" ? "stopped" : evNow.why === "eod" ? "flat at the close" : "the lines crossed back")
      : r.stage[li] === "base" ? "Flat base · MACD wrapped around zero"
      : ph && ph.used ? "That move is done · wait for a fresh base"
      : ph && ph.pulled ? "Pullback holding " + (ph.side === "L" ? "above" : "below") + " zero · " + side + " side"
      : ph ? "Expansion " + (ph.side === "L" ? "up" : "down") + " · waiting for the pullback"
      : r.base ? "Base marked · waiting for the expansion"
      : "No base · crosses here are noise";
    var play = "";
    if (tr) {
      play = (tr.side === "L" ? "Long" : "Short") + " from " + money(tr.e) + " at " + clock(B[tr.t].min) + (B[tr.t].date !== today ? " (an earlier session)" : "") +
        ". Stop " + money(tr.sl) + " past the " + money(tr.ext) + " pullback " + (tr.side === "L" ? "low" : "high") + ". Out on the first close with the MACD " + (tr.side === "L" ? "under" : "over") + " its signal. " + rtxt(tr.now) + " on the last close.";
    } else if (warm && ph && ph.used) {
      play = "This move already ran its sequence. Later crosses on it are skipped until the MACD sits within ±" + money(OPT.flatK * A) + " of zero for " + OPT.flatMin + " bars again.";
    } else if (warm && ph && ph.pulled) {
      play = "Pullback " + (ph.side === "L" ? "low" : "high") + " so far " + money(ph.ext) + ". The MACD crossing back " + (ph.side === "L" ? "over" : "under") + " its signal with both lines still " + (ph.side === "L" ? "above" : "below") + " zero is the " + (ph.side === "L" ? "BUY" : "SELL") + ".";
    } else if (warm && ph) {
      play = "Let it develop. A cross of the MACD " + (ph.side === "L" ? "under" : "over") + " its signal, with both lines staying " + (ph.side === "L" ? "above" : "below") + " zero, is the pullback.";
    } else if (warm && r.base) {
      play = "Needs the MACD to reach ±" + money(OPT.expK * A) + " (0.5 × ATR) with the signal on the same side, within " + Math.max(0, OPT.baseWait - (li - r.base.t1)) + " more bars.";
    } else if (warm) {
      play = "A base needs " + OPT.flatMin + " bars in a row with the MACD within ±" + money(OPT.flatK * A) + " of zero (0.25 × ATR). " + (r.flatRun ? r.flatRun + " so far." : "");
    }
    var todays = r.trades.concat(tr ? [tr] : []).filter(function (x) { return B[x.t].date === today; }).slice(-6).reverse();
    var dates = []; B.forEach(function (b) { if (dates[dates.length - 1] !== b.date) dates.push(b.date); });
    var nSkip = 0, nZero = 0, sumR = 0;
    r.events.forEach(function (x) { if (x.type === "skip") nSkip++; else if (x.type === "zero") nZero++; });
    r.trades.forEach(function (x) { sumR += x.r; });
    function outcome(x) {
      if (x.why == null) return '<span class="open">open ' + rtxt(x.now) + "</span>";
      return '<span class="' + (x.r > 0 ? "pos" : "neg") + '">' + rtxt(x.r) + "</span>";
    }
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · last closed bar · " + clock(last.min) + "</p>" +
      '<p class="v">' + status + "</p>" +
      (play ? '<p class="play">' + play + "</p>" : "") +
      '<dl class="lv"><div><dt>MACD</dt><dd style="color:' + COL.macd + '">' + m3(M) + "</dd></div>" +
      '<div><dt>Signal</dt><dd style="color:' + COL.sig + '">' + m3(S) + "</dd></div>" +
      '<div><dt>Lines</dt><dd class="' + (M > S ? "up" : "dn") + '">' + (M > S ? "MACD over" : "MACD under") + "</dd></div>" +
      '<div><dt>Zero</dt><dd>' + (M > 0 && S > 0 ? "both above" : M < 0 && S < 0 ? "both below" : "straddling") + "</dd></div>" +
      '<div><dt>Flat band</dt><dd>±' + money(OPT.flatK * A) + "</dd></div>" +
      '<div><dt>' + (tr ? "Stop" : "Close") + "</dt><dd" + (tr ? ' class="dn"' : "") + ">" + money(tr ? tr.sl : last.c) + "</dd></div></dl>" +
      (forming ? '<p class="k">The ' + clock(cur.min) + " bar is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Trades today</p>' + (todays.length ? '<ul class="trades">' + todays.map(function (x) {
        return "<li><span>" + clock(B[x.t].min) + " · " + (x.side === "L" ? "BUY" : "SELL") + " " + money(x.e) + " · stop " + money(x.sl) + "</span>" + outcome(x) + "</li>";
      }).join("") + "</ul>" : '<p class="quiet">None yet today.</p>') +
      '<p class="k">Loaded sessions (' + dates.length + ") · bases " + r.bases.length + " · trades " + r.trades.length + (r.trades.length ? " · net " + rtxt(sumR) : "") + " · skipped crosses " + nSkip + " · lost zero " + nZero + "</p>";
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
    var w0 = Math.min(B.length - 1, 10);
    macdS.setData(B.map(function (b, i) { return i < w0 ? { time: b.time } : { time: b.time, value: r.macd[i] }; }));
    sigS.setData(B.map(function (b, i) { return i < w0 ? { time: b.time } : { time: b.time, value: r.signal[i] }; }));
    RUNS = runs(r, nClosed);

    /* markers on the candles, and dots on the MACD line at the crosses that matter */
    var marks = [], mm = [];
    r.events.forEach(function (x) {
      var tm = B[x.t].time, L = x.side === "L", m = null, d = null;
      if (x.type === "exp") m = { position: L ? "aboveBar" : "belowBar", shape: "circle", color: COL.exp, text: "exp", size: 0.7 };
      else if (x.type === "buy") { m = { position: "belowBar", shape: "arrowUp", color: COL.buy, text: "BUY" }; d = COL.buy; }
      else if (x.type === "sell") { m = { position: "aboveBar", shape: "arrowDown", color: COL.sell, text: "SELL" }; d = COL.sell; }
      else if (x.type === "exit") { m = { position: L ? "aboveBar" : "belowBar", shape: "square", color: x.why === "stop" ? COL.sl : COL.skip, text: x.why === "stop" ? "Stop" : x.why === "eod" ? "EOD" : "cross out" }; d = x.why === "cross" ? COL.sell : null; }
      else if (x.type === "skip") { m = { position: L ? "belowBar" : "aboveBar", shape: "circle", color: COL.skip, text: "skip" }; d = COL.skip; }
      else if (x.type === "zero") m = { position: L ? "belowBar" : "aboveBar", shape: "circle", color: COL.skip, text: "lost 0" };
      else if (x.type === "busy") m = { position: L ? "belowBar" : "aboveBar", shape: "circle", color: COL.skip, text: "in trade" };
      if (m) { m.time = tm; marks.push(m); }
      if (d) mm.push({ time: tm, position: "inBar", shape: "circle", color: d, size: 0.6 });
    });
    marks.sort(function (a, b) { return a.time - b.time; });
    mm.sort(function (a, b) { return a.time - b.time; });
    candles.setMarkers(marks);
    macdS.setMarkers(mm);

    /* entry / stop for the recent trades */
    lineS.forEach(function (s) { chart.removeSeries(s); }); lineS = [];
    function seg(v, col, style, t0, t1, lbl) {
      var s = chart.addLineSeries({ color: col, lineWidth: 1, lineStyle: style, priceLineVisible: false, lastValueVisible: !!lbl,
        crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
      s.setData([{ time: t0, value: v }, { time: Math.max(t1, t0 + MULT * 60), value: v }]);
      lineS.push(s);
    }
    var show = r.trades.slice(-8);
    if (r.open) show.push({ t: r.open.t, xt: nClosed - 1, e: r.open.e, sl: r.open.sl, live: true });
    show.forEach(function (t) {
      var t0 = B[t.t].time, t1 = B[t.xt].time;
      seg(t.e, COL.entry, 0, t0, t1, t.live); seg(t.sl, COL.sl, 2, t0, t1, t.live);
    });

    if (!render.fitted) {
      var span = MULT >= 5 ? 160 : MULT >= 2 ? 200 : 240;
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, B.length - span), to: B.length - 1 + 6 });
      render.fitted = true;
    }
    requestAnimationFrame(drawShade);
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · regular session · MACD 3/9/5, no histogram · flat base = " + OPT.flatMin + "+ bars with the MACD within ±" + OPT.flatK +
      "× ATR(14) of zero (shaded gold) · expansion = MACD past ±" + OPT.expK + "× ATR within " + OPT.baseWait + " bars · first cross back with both lines on the same side of zero = entry, stop past the pullback extreme, out on the next cross · later crosses on that move skipped · long and short" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
