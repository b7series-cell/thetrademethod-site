/* =====================================================================
   kt-live.js — live Knock Twice chart (Valid BOS Pullback v2).

   Pulls regular-session bars (5-minute by default; 1 / 2 / 5 / 15
   selectable) from /api/bars.php (the API key stays on the server) and
   runs pine/knock-twice.pine in the browser at its default inputs:
     · swings: pivot high / low, 3 bars left and 3 right, kept for 48 bars
     · a setup opens when a close goes 1 tick through the highest unbroken
       swing high (lowest swing low for shorts), 09:35–15:30 only
     · the knock (valid pullback): a bar touches the old level after at
       least 5 bars that didn't, the new extreme is confirmed (3 bars),
       the leg is 0.6–3.0 ATR(14), and that bar or the next closes back
       on the trade side of the level
     · confirmed BOS: a close through the new extreme
     · cancelled by a close more than 4 ticks back through the old level,
       24 bars after the knock with no BOS, 120 bars of age, the level
       being used up by another break, or a break the other way
     · plan: stop 1 tick beyond the knock candle or the tolerance line,
       whichever is further; T2 = new extreme + one leg
   Every decision is taken on a CLOSED bar; the newest bar is drawn but
   ignored until it has closed.

   Mount: <section data-kt-live data-symbol="QQQ">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { left: 3, right: 3, look: 48, clean: 5, maxAge: 120, catchMissed: true, tolTicks: 4, extTicks: 1,
              atrLen: 14, legMin: 0.6, legMax: 3.0, closeBack: true, retestExpiry: 24, sess: [575, 930], tick: 0.01,
              tolMode: "ticks", tolPct: 0.03, extPct: 0.01, tolAtr: 0.10, extAtr: 0.02 };
  var POLL_MS = 60000, MULT = 5, RTH_OPEN = 570, RTH_CLOSE = 960, SHOW = 10;
  var COL = { ref: "#d1d1d6", bull: "#30d158", bear: "#ff453a", stop: "#ff9f0a", t2: "#30d158", knock: "#f4b942", dim: "#8e8e93" };

  /* ---------- the rules, bar by bar: a line-for-line twin of the Pine script ---------- */
  function run(B, nClosed, opt) {
    var O = opt || OPT, n = nClosed == null ? B.length : nClosed, tick = O.tick;
    var tol = O.tolTicks * tick, ext = O.extTicks * tick;
    var highs = [], lows = [], retH = [], retL = [], active = [], setups = [];
    var atr = null, trSum = 0, t, i;
    var stats = { opened: 0, pullbacks: 0, confirmed: 0, failed: 0, toBos: [] };
    function listed(arr, lvl) { for (var k = 0; k < arr.length; k++) if (Math.abs(arr[k].lvl - lvl) <= tick / 2) return true; return false; }
    function pivot(t, hi) {
      var p = t - O.right; if (p - O.left < 0) return null;
      var v = hi ? B[p].h : B[p].l;
      for (var k = p - O.left; k <= t; k++) {
        if (k === p) continue;
        var x = hi ? B[k].h : B[k].l;
        if (k < p ? (hi ? x >= v : x <= v) : (hi ? x > v : x < v)) return null;
      }
      return v;
    }
    function planStop(s) {
      var line = s.dir === 1 ? s.ref - tol : s.ref + tol, te = s.touchX == null ? s.ref : s.touchX;
      return s.dir === 1 ? Math.min(te, line) - tick : Math.max(te, line) + tick;
    }
    function kill(s, t, why) {
      if (s.stage === 2) { stats.failed++; s.failedAt = t; }
      s.end = t; s.why = why; s.done = true;
    }
    for (t = 0; t < n; t++) {
      var b = B[t];
      var tr = t ? Math.max(b.h - b.l, Math.abs(b.h - B[t - 1].c), Math.abs(b.l - B[t - 1].c)) : b.h - b.l;
      if (t < O.atrLen) { trSum += tr; if (t === O.atrLen - 1) atr = trSum / O.atrLen; }
      else atr = (atr * (O.atrLen - 1) + tr) / O.atrLen;
      var A = atr == null ? b.h - b.l : atr;
      if (O.tolMode === "pct") { tol = b.c * O.tolPct / 100; ext = b.c * O.extPct / 100; }
      else if (O.tolMode === "atr") { tol = A * O.tolAtr; ext = A * O.extAtr; }
      var inSess = b.min >= O.sess[0] && b.min < O.sess[1];
      var hp = pivot(t, true), lp = pivot(t, false), bullBos = false, bearBos = false;
      if (hp != null) highs.push({ v: hp, bar: t - O.right });
      if (lp != null) lows.push({ v: lp, bar: t - O.right });
      while (highs.length && t - highs[0].bar > O.look) highs.shift();
      while (lows.length && t - lows[0].bar > O.look) lows.shift();
      while (retH.length && t - retH[0].at > O.look + O.right) retH.shift();
      while (retL.length && t - retL[0].at > O.look + O.right) retL.shift();

      /* advance every live setup, newest first */
      for (i = active.length - 1; i >= 0; i--) {
        var s = active[i], d = s.dir;
        var invalid = t - s.start > O.maxAge, why = invalid ? "age" : null, completed = false;
        var leg = Math.abs(s.target - s.ref);
        var legOk = (O.legMin === 0 || leg >= O.legMin * A) && (O.legMax === 0 || leg <= O.legMax * A);
        var touched = b.l <= s.ref && b.h >= s.ref;
        if (s.stage === 2 && O.retestExpiry > 0 && t - s.knock > O.retestExpiry) { invalid = true; why = "expired"; }
        if (!invalid && (d === 1 ? b.c < s.ref - tol : b.c > s.ref + tol)) { invalid = true; why = "close"; }
        if (!invalid) {
          if (s.stage === 1) {
            if (d === 1 ? b.h > s.target : b.l < s.target) { s.target = d === 1 ? b.h : b.l; s.xBar = t; s.xOk = false; }
            if (t - s.xBar >= O.right) s.xOk = true;
            var qual = touched && s.xOk && s.cleanBars >= O.clean && legOk;
            var pendNow = s.pend != null && t === s.pend + 1;
            if (touched) { s.touches++; s.taps.push(t); }
            if (qual || pendNow) {
              if (!O.closeBack || (d === 1 ? b.c > s.ref : b.c < s.ref)) {
                var fromPend = !qual;
                s.stage = 2; s.knock = fromPend ? s.pend : t; s.validAt = t;
                s.touchX = fromPend ? (d === 1 ? Math.min(b.l, B[t - 1].l) : Math.max(b.h, B[t - 1].h)) : (d === 1 ? b.l : b.h);
                s.pend = null; s.legAtr = leg / A; s.knockTouches = s.touches;
                s.stop = planStop(s); s.t2 = d === 1 ? s.target + leg : s.target - leg; s.eA = b.c;
                stats.pullbacks++;
              } else if (qual) s.pend = t;
              else s.pend = null;
            }
            s.cleanBars = touched ? 0 : s.cleanBars + 1;
          } else {
            if (touched) { s.touches++; s.taps.push(t); }
            if (d === 1 ? b.c > s.target : b.c < s.target) { completed = true; if (d === 1) bullBos = true; else bearBos = true; }
          }
        }
        if (invalid) { kill(s, t, why); active.splice(i, 1); }
        else if (completed) {
          stats.confirmed++; stats.toBos.push(t - s.knock);
          (d === 1 ? retH : retL).push({ lvl: s.target, at: t });
          s.bos = t; s.eB = b.c; s.end = t; s.why = "bos"; s.done = true;
          active.splice(i, 1);
        }
      }
      /* a level just confirmed as a BOS can't stay the old level of another setup */
      for (i = active.length - 1; i >= 0; i--) {
        if (listed(active[i].dir === 1 ? retH : retL, active[i].ref)) { kill(active[i], t, "used"); active.splice(i, 1); }
      }

      /* the dominant unbroken swings */
      var pH = null, pHb = null, pL = null, pLb = null;
      highs.forEach(function (x) { if (!retH.some(function (r) { return r.bar === x.bar; }) && !listed(retH, x.v) && (pH == null || x.v > pH)) { pH = x.v; pHb = x.bar; } });
      lows.forEach(function (x) { if (!retL.some(function (r) { return r.bar === x.bar; }) && !listed(retL, x.v) && (pL == null || x.v < pL)) { pL = x.v; pLb = x.bar; } });
      var prevC = t ? B[t - 1].c : b.c;
      var newBull = inSess && !bullBos && pH != null && t > pHb && b.c > pH + ext && prevC <= pH;
      var newBear = inSess && !bearBos && pL != null && t > pLb && b.c < pL - ext && prevC >= pL;
      var bOff = null, sOff = null, off;
      if (O.catchMissed && O.right > 1 && inSess) {
        if (!newBull && !bullBos && hp != null && pH != null && pHb === t - O.right) {
          for (off = O.right - 1; off >= 1; off--) if (bOff == null && t - off - 1 >= 0 && B[t - off].c > pH + ext && B[t - off - 1].c <= pH) bOff = off;
          if (bOff != null && b.c >= pH - tol) newBull = true;
        }
        if (!newBear && !bearBos && lp != null && pL != null && pLb === t - O.right) {
          for (off = O.right - 1; off >= 1; off--) if (sOff == null && t - off - 1 >= 0 && B[t - off].c < pL - ext && B[t - off - 1].c >= pL) sOff = off;
          if (sOff != null && b.c <= pL + tol) newBear = true;
        }
      }
      active.forEach(function (s) {
        if (s.stage === 2 && s.dir === 1 && pH != null && Math.abs(pH - s.target) <= tick) newBull = false;
        if (s.stage === 2 && s.dir === -1 && pL != null && Math.abs(pL - s.target) <= tick) newBear = false;
      });
      if (newBull || newBear) for (i = active.length - 1; i >= 0; i--) {
        if ((newBull && active[i].dir === -1) || (newBear && active[i].dir === 1)) { kill(active[i], t, "flip"); active.splice(i, 1); }
      }
      [[newBull, 1, pH, pHb, bOff], [newBear, -1, pL, pLb, sOff]].forEach(function (q) {
        if (!q[0]) return;
        var d = q[1], so = q[4] == null ? 0 : q[4], xv = d === 1 ? b.h : b.l, xo = 0, k;
        for (k = 1; k <= so; k++) { var v = d === 1 ? B[t - k].h : B[t - k].l; if (d === 1 ? v > xv : v < xv) { xv = v; xo = k; } }
        var s = { dir: d, stage: 1, start: t - so, refBar: q[3], ref: q[2], target: xv, xBar: t - xo, xOk: false,
                  cleanBars: 0, touches: 0, taps: [], pend: null, knock: null, bos: null, done: false, end: null };
        if (so > 0) { var c = 0; for (k = so - 1; k >= 0; k--) { var bb = B[t - k]; c = bb.l <= q[2] && bb.h >= q[2] ? 0 : c + 1; } s.cleanBars = c; }
        active.push(s); setups.push(s); stats.opened++;
      });
    }
    /* the plan after each knock: stop or T2, whichever trades first (from the bar after the entry) */
    setups.forEach(function (s) {
      if (s.knock == null) return;
      [["A", s.validAt, s.eA], ["B", s.bos, s.eB]].forEach(function (m) {
        if (m[1] == null) return;
        var res = { entry: m[2], at: m[1], out: "open", xt: n - 1, x: B[n - 1].c };
        for (var k = m[1] + 1; k < n; k++) {
          var q = B[k];
          if (s.dir === 1 ? q.l <= s.stop : q.h >= s.stop) { res.out = "stop"; res.xt = k; res.x = s.stop; break; }
          if (s.dir === 1 ? q.h >= s.t2 : q.l <= s.t2) { res.out = "t2"; res.xt = k; res.x = s.t2; break; }
        }
        var risk = Math.abs(res.entry - s.stop);
        res.r = risk > 0 ? (s.dir === 1 ? res.x - res.entry : res.entry - res.x) / risk : 0;
        s["plan" + m[0]] = res;
      });
    });
    var med = null;
    if (stats.toBos.length) { var a = stats.toBos.slice().sort(function (x, y) { return x - y; }), m2 = a.length >> 1; med = a.length % 2 ? a[m2] : (a[m2 - 1] + a[m2]) / 2; }
    stats.median = med;
    return { setups: setups, active: active, stats: stats, atr: atr };
  }

  window.KTLive = { _run: run, OPT: OPT };

  var root = document.querySelector("[data-kt-live]");
  if (!root || typeof LightweightCharts === "undefined") return;
  /* data-example: draw the made-up session in kt-example.js instead of live bars.
     Remove the attribute from the page to go back to live data. */
  var EXAMPLE = root.hasAttribute("data-example") && window.KT_EXAMPLE ? window.KT_EXAMPLE : null;
  if (!EXAMPLE && typeof LiveKit === "undefined") return;
  var MODEL = root.getAttribute("data-model") || "A";
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate")
  };
  var SYMBOL = EXAMPLE ? EXAMPLE.symbol : "QQQ";
  if (!EXAMPLE) {
    var KIT = LiveKit.controls(root, { key: "kt", symbol: (root.getAttribute("data-symbol") || "QQQ").toUpperCase(), tf: MULT,
      onChange: function (sym, tf) { SYMBOL = sym; MULT = tf; render.fitted = false; load(); } });
    SYMBOL = KIT.symbol; MULT = KIT.tf;
  } else {
    var form = root.querySelector(".live-symbol"); if (form) form.remove();
  }

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

  /* ---------- chart ---------- */
  var chart = null, candles, lineS = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 8 },
      crosshair: { mode: 0 }
    });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
  }
  function seg(B, i0, i1, price, col, style, width, label) {
    var t0 = B[Math.max(0, i0)].time, t1 = i1 < B.length ? B[i1].time : B[B.length - 1].time + (i1 - B.length + 1) * MULT * 60;
    if (t1 <= t0) t1 = t0 + MULT * 60;
    var s = chart.addLineSeries({ color: col, lineWidth: width || 1, lineStyle: style || 0, priceLineVisible: false, lastValueVisible: !!label,
      title: label || "", crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
    s.setData([{ time: t0, value: price }, { time: t1, value: price }]);
    lineS.push(s);
  }

  /* ---------- side panel ---------- */
  function planOf(s) { return MODEL === "B" ? s.planB : s.planA; }
  function renderSide(r, B, forming, nClosed) {
    var cur = B[B.length - 1], last = B[nClosed - 1], today = last.date;
    var live = r.active.slice().sort(function (a, b) { return b.stage - a.stage || b.start - a.start; });
    var top = live[0], status, play = "";
    if (!top) { status = "No setup open"; play = "Waiting for a close through the highest unbroken swing high or the lowest swing low."; }
    else if (top.stage === 2) {
      var L = top.dir === 1;
      status = (L ? "Long" : "Short") + " · knocked, waiting for the break";
      play = "The old " + (L ? "high " : "low ") + money(top.ref) + " held on the knock at " + clock(B[top.knock].min) + ". A close " + (L ? "above " : "below ") +
        money(top.target) + " confirms. Plan stop " + money(top.stop) + ", T2 " + money(top.t2) + ". Expires " + Math.max(0, OPT.retestExpiry - (nClosed - 1 - top.knock)) + " bars from now.";
    } else {
      var L2 = top.dir === 1, clean = top.cleanBars;
      status = (L2 ? "Long" : "Short") + " · broke out, waiting for the knock";
      play = "Price closed " + (L2 ? "above" : "below") + " the old " + (L2 ? "high " : "low ") + money(top.ref) + " at " + clock(B[top.start].min) + " and has run to " + money(top.target) + ". " +
        (clean >= OPT.clean ? "It has stayed away from the level long enough. A touch that closes back " + (L2 ? "above" : "below") + " it is the knock."
                            : "It needs " + (OPT.clean - clean) + " more bar" + (OPT.clean - clean === 1 ? "" : "s") + " clear of the level before a touch counts.");
    }
    var st = r.stats;
    var sigs = r.setups.filter(function (s) { return s.knock != null && B[s.knock].date === today; }).slice(-6).reverse();
    function outcome(s) {
      var p = planOf(s);
      if (!p) return s.done && s.why !== "bos" ? '<span class="neg">cancelled</span>' : '<span>waiting</span>';
      if (p.out === "open") return '<span class="pos">open</span>';
      return '<span class="' + (p.r > 0 ? "pos" : "neg") + '">' + (p.out === "t2" ? "T2 " : "stop ") + (p.r > 0 ? "+" : "") + p.r.toFixed(1) + "R</span>";
    }
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · last closed bar · " + clock(last.min) + "</p>" +
      '<p class="v">' + status + "</p>" +
      (play ? '<p class="play">' + play + "</p>" : "") +
      '<dl class="lv"><div><dt>Opened</dt><dd>' + st.opened + "</dd></div>" +
      '<div><dt>Knocks</dt><dd>' + st.pullbacks + "</dd></div>" +
      '<div><dt>Confirmed</dt><dd class="pos">' + st.confirmed + (st.pullbacks ? " (" + Math.round(100 * st.confirmed / st.pullbacks) + "%)" : "") + "</dd></div>" +
      '<div><dt>Failed after knock</dt><dd class="neg">' + st.failed + "</dd></div>" +
      '<div><dt>Median bars to break</dt><dd>' + (st.median == null ? "—" : Math.round(st.median)) + "</dd></div>" +
      '<div><dt>ATR (14)</dt><dd>' + money(r.atr) + "</dd></div></dl>" +
      (forming ? '<p class="k">The ' + clock(cur.min) + " bar is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Knocks today</p>' + (sigs.length ? '<ul class="trades">' + sigs.map(function (s) {
        return "<li><span>" + clock(B[s.knock].min) + " · " + (s.dir === 1 ? "long" : "short") + " off " + money(s.ref) + (s.bos != null ? " · broke " + clock(B[s.bos].min) : "") + "</span>" + outcome(s) + "</li>";
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
        if (e === "private") setGate("<b>Chart in private preview.</b> Open this page once with your preview link to unlock it in this browser.");
        else if (e === "not_configured") setGate("<b>Chart not configured yet.</b> Add <code>api/config.php</code> on the server.");
        else if (e === "symbol_not_allowed") setGate("<b>" + SYMBOL + " isn't on the allowed list.</b> Add it to <code>symbols</code> in <code>api/config.php</code>, or use <code>'*'</code> to allow any ticker.");
        else if (e === "bad_symbol") setGate("<b>That doesn't look like a ticker.</b>");
        else setGate("<b>Chart data unavailable right now.</b> Try again in a minute.");
        return false;
      }
      render(res.body); return true;
    }).catch(function () { setGate("<b>Chart data unavailable right now.</b> Try again in a minute."); return false; });
  }

  function render(data) {
    var B = [];
    data.bars.forEach(function (a) {
      var t = etParts(a[0]);
      if (t.min >= RTH_OPEN && t.min < RTH_CLOSE) B.push({ date: t.date, min: t.min, time: t.wall, ms: a[0], o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] || 0 });
    });
    if (B.length < 40) { setGate("<b>Not enough data yet for " + SYMBOL + ".</b>"); return; }
    var asOf = (data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900);
    var forming = !data.date && B[B.length - 1].ms / 1000 + MULT * 60 > asOf;
    var nClosed = forming ? B.length - 1 : B.length;
    var r = draw(B, nClosed);
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · regular session · old level, new extreme, knocks, confirmed breaks, T2 and plan stop" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  /* run the rules on closed bars and draw them; returns the engine result */
  function draw(B, nClosed) {
    var r = run(B, nClosed);
    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    if (EXAMPLE) chart.applyOptions({ watermark: { visible: true, text: "EXAMPLE", fontSize: els.chart.clientWidth < 560 ? 44 : 84, fontStyle: "600",
      color: "rgba(245,245,247,0.06)", horzAlign: "center", vertAlign: "center" } });
    else LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(B.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));

    lineS.forEach(function (s) { chart.removeSeries(s); }); lineS = [];
    var marks = [];
    /* the setups that reached a knock, the newest few, plus whatever is still open */
    var knocked = r.setups.filter(function (s) { return s.knock != null; }).slice(-SHOW);
    var draw = knocked.concat(r.active.filter(function (s) { return knocked.indexOf(s) < 0; }));
    draw.forEach(function (s) {
      var L = s.dir === 1, col = L ? COL.bull : COL.bear, end = s.done ? s.end : nClosed - 1 + 2;
      var openNow = !s.done;
      seg(B, s.refBar, s.knock != null ? Math.max(s.knock, Math.min(end, s.knock)) : end, s.ref, s.knock != null ? col : COL.ref, s.knock != null ? 2 : 0, 2, openNow ? (s.knock != null ? "Old level" : "Old " + (L ? "high" : "low")) : "");
      seg(B, s.xBar, end, s.target, col, 0, 2, openNow ? "New " + (L ? "high" : "low") : "");
      if (s.knock != null) {
        marks.push({ time: B[s.knock].time, position: L ? "belowBar" : "aboveBar", shape: "circle", color: COL.knock, text: "Knock" });
        var showPlan = s.bos != null || openNow;
        if (showPlan) {
          var from = s.bos != null ? s.bos : s.validAt, to = Math.min(from + 20, nClosed - 1 + 20);
          seg(B, from, to, s.t2, col, 1, 1, openNow || s.bos === nClosed - 1 ? "T2" : "");
          seg(B, from, to, s.stop, COL.stop, 1, 1, openNow || s.bos === nClosed - 1 ? "Stop" : "");
        }
      }
      if (s.bos != null) marks.push({ time: B[s.bos].time, position: L ? "aboveBar" : "belowBar", shape: L ? "arrowUp" : "arrowDown", color: col, text: "BOS ✓" });
      var pl = planOf(s);
      if (pl && pl.out !== "open") marks.push({ time: B[pl.xt].time, position: (pl.out === "t2") === L ? "aboveBar" : "belowBar", shape: "square", color: pl.out === "t2" ? COL.t2 : COL.stop, text: pl.out === "t2" ? "T2 hit" : "Stop" });
      else if (s.done && s.knock != null) marks.push({ time: B[s.end].time, position: L ? "belowBar" : "aboveBar", shape: "square", color: COL.dim, text: "×" });
    });
    marks.sort(function (a, b) { return a.time - b.time; });
    candles.setMarkers(marks);

    var span = EXAMPLE ? B.length + 2 : MULT >= 15 ? 140 : MULT >= 5 ? 170 : 220;
    if (!render.fitted) {
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, B.length - span), to: B.length - 1 + (EXAMPLE ? 4 : 8) });
      render.fitted = true;
    }
    return r;
  }

  /* ---------- the example session: the same rules, step by step in the side panel ---------- */
  function renderExample() {
    var day = EXAMPLE.day.split("-");
    var B = EXAMPLE.rows.map(function (a) {
      return { date: EXAMPLE.day, min: a[0], time: Date.UTC(+day[0], +day[1] - 1, +day[2], 0, a[0]) / 1000, o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] };
    });
    var r = draw(B, B.length);
    var s = r.setups.filter(function (x) { return x.knock != null; })[0];
    if (!s) return;
    var p = planOf(s), L = s.dir === 1, hi = L ? "high" : "low";
    var steps = [
      [B[s.refBar].min, "Old " + hi, money(s.ref) + " · 3 bars each side confirm it"],
      [B[s.start].min, "The break", "Closes at " + money(B[s.start].c) + ", through " + money(s.ref) + ". Not an entry yet."],
      [B[s.xBar].min, "New " + hi, money(s.target) + " · leg " + money(Math.abs(s.target - s.ref)) + " = " + s.legAtr.toFixed(1) + " ATR"],
      [B[s.validAt].min, "The knock · entry", "Low " + money(s.touchX) + " tags " + money(s.ref) + ", closes " + money(s.eA) + " back " + (L ? "above" : "below") + ". Stop " + money(s.stop) + ", risk " + money(Math.abs(s.eA - s.stop)) + "."],
      s.bos != null ? [B[s.bos].min, "Break of the new " + hi, "Closes at " + money(s.eB) + ", through " + money(s.target) + ". Confirmed, " + (s.bos - s.knock) + " bars after the knock."] : null,
      p && p.out === "t2" ? [B[p.xt].min, "T2 hit", money(s.t2) + " · new " + hi + " + one leg · +" + p.r.toFixed(1) + "R from the knock"] : null
    ].filter(Boolean);
    els.side.innerHTML =
      '<p class="k">Example session · 5-minute bars</p>' +
      '<p class="v">One Knock Twice, start to finish</p>' +
      '<p class="play">Made-up bars, not a real ticker. The same code that runs the indicator&#39;s rules on live bars found every level and signal here.</p>' +
      '<ul class="trades">' + steps.map(function (x) { return "<li><span><b>" + clock(x[0]) + " · " + x[1] + "</b><br>" + x[2] + "</span></li>"; }).join("") + "</ul>";
    els.status.textContent = "Example session · made-up 5-minute bars, not market data · old high, new high, the knock, the break of the new high, T2 and the plan stop";
  }

  if (EXAMPLE) renderExample();
  else load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
