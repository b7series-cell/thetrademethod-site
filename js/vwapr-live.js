/* =====================================================================
   vwapr-live.js — live VWAP Reversal chart.

   Pulls regular-session bars (5-minute by default; 1 / 2 / 5 / 15
   selectable) from /api/bars.php (the API key stays on the server) and
   runs the page's three-signal rules in the browser:
     · VWAP = session VWAP of the typical price (high + low + close) ÷ 3,
       reset at each 9:30 open. Bands = VWAP ± 2 standard deviations of
       that typical price, volume-weighted (the page's "2nd band").
     · The old level = the prior regular session's high and low (the
       objective stand-in for "an old high, an old low" on the higher time
       frame). Either level can pair with either band.
     · Signals are looked for from 9:45 ET (the bands need 15 minutes of
       session to mean anything).
     · SIGNALS 1 & 2 — band touch at the level: a bar's high reaches the
       upper band (low reaches the lower band) while that band is within
       0.25% of the prior-day high or low.
     · SIGNAL 3 — failure test: on that bar or within the next 3 bars, a bar
       trades through the same level and CLOSES back on the near side
       (above it, then closes under for a short; below it, then closes over
       for a long).
     · THE TRIGGER — the failure-test bar must itself be a reversal candle:
       shooting star = upper wick ≥ half the bar's range and the close in
       the bottom third of the range; hammer = the mirror.
     · SHORT at the shooting star's close (upper band); LONG at the hammer's
       close (lower band). Stop one cent beyond the pattern's extreme (the
       highest high / lowest low from the touch to the trigger). Target 2:1.
     · Skips, marked in grey: a band touch with no level nearby ("no
       level", first one per side per session), a band touch at the level
       that never gets a failure test within 3 bars ("no failure test"),
       and a failure test that doesn't print a reversal candle ("no
       candle").
     · One trade at a time; stop is checked before target, from the bar
       after entry; an open trade is closed at the session's last close.
   Signals are taken on CLOSED bars only; the newest bar is drawn but ignored
   until it has closed.

   Mount: <section data-vwapr-live data-symbol="AMD">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { sd: 2, tolPct: 0.25, look: 3, start: 585, wick: 0.5, third: 1 / 3, rr: 2, tick: 0.01 };

  /* ---------- the rules: pure, bar by bar ----------
     bars: [{ date: "YYYY-MM-DD", min: minutes after midnight ET, o, h, l, c, v }] (regular session only, oldest first)
     opt:  OPT overrides plus n = how many bars are closed (default all) */
  function signals(bars, opt) {
    var o = {}, k; for (k in OPT) o[k] = OPT[k]; for (k in (opt || {})) o[k] = opt[k];
    var B = bars, N = B.length, n = o.n == null ? N : o.n, t, q;
    /* session VWAP and bands for every bar (the forming one too) */
    var vw = [], up = [], dn = [], pdH = [], pdL = [], pv = 0, vv = 0, p2 = 0;
    var day = {}, order = [];
    for (t = 0; t < N; t++) {
      var b0 = B[t];
      if (!day[b0.date]) { day[b0.date] = { h: -Infinity, l: Infinity }; order.push(b0.date); }
      day[b0.date].h = Math.max(day[b0.date].h, b0.h); day[b0.date].l = Math.min(day[b0.date].l, b0.l);
    }
    var prev = {}; order.forEach(function (d, i) { prev[d] = i > 0 ? day[order[i - 1]] : null; });
    for (t = 0; t < N; t++) {
      var b = B[t];
      if (t === 0 || b.date !== B[t - 1].date) { pv = 0; vv = 0; p2 = 0; }
      var tp = (b.h + b.l + b.c) / 3, v = b.v > 0 ? b.v : 0;
      pv += tp * v; vv += v; p2 += tp * tp * v;
      var w = vv > 0 ? pv / vv : tp, sd = vv > 0 ? Math.sqrt(Math.max(0, p2 / vv - w * w)) : 0;
      vw[t] = w; up[t] = w + o.sd * sd; dn[t] = w - o.sd * sd;
      pdH[t] = prev[b.date] ? prev[b.date].h : null; pdL[t] = prev[b.date] ? prev[b.date].l : null;
    }
    function near(band, t) {               // the prior-day level within tolPct of this band, nearest first
      var best = null, bd = Infinity;
      [pdH[t], pdL[t]].forEach(function (L) {
        if (L == null) return;
        var d = Math.abs(band - L);
        if (d <= L * o.tolPct / 100 && d < bd) { bd = d; best = L; }
      });
      return best;
    }
    var events = [], sigs = [], trades = [], tr = null, touch = { S: null, L: null }, noLvl = { S: false, L: false };
    function close(x, xt, px, why) { var c = {}; for (var key in x) c[key] = x[key]; c.xt = xt; c.x = px; c.why = why; return c; }
    for (t = 0; t < n; t++) {
      var c = B[t], newDay = t === 0 || c.date !== B[t - 1].date;
      if (newDay) {
        if (tr) { trades.push(close(tr, t - 1, B[t - 1].c, "session end")); tr = null; }
        ["S", "L"].forEach(function (s) { if (touch[s]) events.push({ t: touch[s].t0, side: s, kind: "skip", why: "no failure test", lvl: touch[s].lvl }); touch[s] = null; noLvl[s] = false; });
      }
      /* exits first (from the bar after entry), stop before target */
      if (tr && t > tr.t) {
        var px = null, why = null;
        if (tr.side === "L") { if (c.l <= tr.sl) { px = tr.sl; why = "stop"; } else if (c.h >= tr.tp) { px = tr.tp; why = "target"; } }
        else { if (c.h >= tr.sl) { px = tr.sl; why = "stop"; } else if (c.l <= tr.tp) { px = tr.tp; why = "target"; } }
        if (why) { trades.push(close(tr, t, px, why)); tr = null; }
      }
      if (c.min < o.start || pdH[t] == null) continue;
      var rng = c.h - c.l;
      var star = rng > 0 && c.h - Math.max(c.o, c.c) >= o.wick * rng && c.c <= c.l + o.third * rng;
      var hammer = rng > 0 && Math.min(c.o, c.c) - c.l >= o.wick * rng && c.c >= c.h - o.third * rng;
      [["S", c.h >= up[t], up[t]], ["L", c.l <= dn[t], dn[t]]].forEach(function (z) {
        var s = z[0], S = s === "S";
        /* signals 1 & 2: the band touch, and whether a level sits at the band */
        if (z[1]) {
          var lvl = near(z[2], t);
          if (lvl != null) {
            if (touch[s] && touch[s].lvl === lvl) touch[s].t = t;
            else touch[s] = { t: t, t0: t, lvl: lvl };
          } else if (!noLvl[s] && !touch[s]) { noLvl[s] = true; events.push({ t: t, side: s, kind: "skip", why: "no level", band: z[2] }); }
        }
        var tc = touch[s];
        if (!tc) return;
        /* signal 3: the failure test through the touched level, closing back on the near side */
        var fail = S ? c.h > tc.lvl && c.c < tc.lvl : c.l < tc.lvl && c.c > tc.lvl;
        if (fail) {
          var cand = S ? star : hammer;
          if (!cand) events.push({ t: t, side: s, kind: "skip", why: "no candle", lvl: tc.lvl });
          else {
            var ext = S ? -Infinity : Infinity;
            for (q = tc.t0; q <= t; q++) ext = S ? Math.max(ext, B[q].h) : Math.min(ext, B[q].l);
            var sl = S ? ext + o.tick : ext - o.tick, e = c.c, risk = S ? sl - e : e - sl;
            var ev = { t: t, side: s, kind: tr ? "busy" : "signal", lvl: tc.lvl, touchT: tc.t0, band: z[2], e: e, sl: sl,
                       tp: S ? e - o.rr * risk : e + o.rr * risk };
            events.push(ev);
            if (!tr) { tr = ev; sigs.push(ev); }
          }
          touch[s] = null;
        } else if (t - tc.t >= o.look) {
          events.push({ t: tc.t0, side: s, kind: "skip", why: "no failure test", lvl: tc.lvl });
          touch[s] = null;
        }
      });
    }
    events.sort(function (a, b) { return a.t - b.t; });
    return { vwap: vw, up: up, dn: dn, pdH: pdH, pdL: pdL, events: events, signals: sigs, trades: trades, open: tr,
             touch: touch, opt: o };
  }

  window.VWAPRLive = { signals: signals };

  var POLL_MS = 60000, MULT = 5, RTH_OPEN = 570, RTH_CLOSE = 960;
  var COL = { vwap: "#2997ff", band: "#64d2ff", level: "#f4b942", sell: "#ff453a", buy: "#30d158", skip: "#8e8e93", busy: "#8e8e93",
              entry: "#2997ff", tp: "#30d158", sl: "#ff453a", volUp: "rgba(48,209,88,0.45)", volDn: "rgba(255,69,58,0.45)", volHit: "#f4b942" };

  var root = document.querySelector("[data-vwapr-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate")
  };
  var KIT = LiveKit.controls(root, { key: "vwapr", symbol: (root.getAttribute("data-symbol") || "AMD").toUpperCase(), tf: MULT,
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
  function lvlName(r, i, L) { return L === r.pdH[i] ? "prior-day high" : "prior-day low"; }

  /* ---------- chart ---------- */
  var chart = null, candles, volS, vwS, upS, dnS, hiS, loS, lineS = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.06, bottom: 0.22 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: 0 }
    });
    volS = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    var off = function () { return null; };
    hiS = chart.addLineSeries({ color: COL.level, lineWidth: 1, lineStyle: 2, title: "PDH", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false, autoscaleInfoProvider: off });
    loS = chart.addLineSeries({ color: COL.level, lineWidth: 1, lineStyle: 2, title: "PDL", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false, autoscaleInfoProvider: off });
    upS = chart.addLineSeries({ color: COL.band, lineWidth: 2, title: "+2σ", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    dnS = chart.addLineSeries({ color: COL.band, lineWidth: 2, title: "−2σ", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    vwS = chart.addLineSeries({ color: COL.vwap, lineWidth: 2, title: "VWAP", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
  }

  /* one value per bar, with a gap at each session's first bar so lines don't join across the overnight */
  function perSession(B, arr) {
    return B.map(function (b, i) {
      var lastOfDay = i < B.length - 1 && B[i + 1].date !== b.date;
      if (arr[i] == null) return { time: b.time };
      return lastOfDay ? { time: b.time, value: arr[i], color: "rgba(0,0,0,0)" } : { time: b.time, value: arr[i] };
    });
  }

  /* ---------- side panel ---------- */
  function renderSide(r, B, forming, nClosed) {
    var cur = B[B.length - 1], li = nClosed - 1, last = B[li], today = last.date, tr = r.open;
    var lastEv = r.events.length ? r.events[r.events.length - 1] : null;
    var sigNow = lastEv && lastEv.t === li && lastEv.kind === "signal";
    var tS = r.touch.S, tL = r.touch.L, noLevels = r.pdH[li] == null;
    var where = last.c >= r.up[li] ? "at or over the upper band" : last.c <= r.dn[li] ? "at or under the lower band" : last.c > r.vwap[li] ? "between VWAP and the upper band" : "between VWAP and the lower band";
    var status = noLevels ? "No prior session loaded"
      : sigNow ? (lastEv.side === "S" ? "SHORT · shooting star confirmed" : "LONG · hammer confirmed")
      : tr ? (tr.side === "S" ? "SHORT open" : "LONG open")
      : tS ? "Upper band at the level · watching for a failure test"
      : tL ? "Lower band at the level · watching for a failure test"
      : last.min < OPT.start ? "Bands still forming · signals from 9:45"
      : "Flat · price " + where;
    var play = "";
    if (tr) {
      var R = tr.side === "S" ? tr.sl - tr.e : tr.e - tr.sl, nowR = (tr.side === "S" ? tr.e - last.c : last.c - tr.e) / R;
      play = (tr.side === "S" ? "Short " : "Long ") + money(tr.e) + " at " + clock(B[tr.t].min) + " off the " + lvlName(r, tr.t, tr.lvl) + " (" + money(tr.lvl) + "). Stop " + money(tr.sl) +
        " beyond the extreme, target " + money(tr.tp) + " (2:1). " + (nowR >= 0 ? "+" : "") + nowR.toFixed(2) + "R on the last close.";
    } else if (tS) {
      play = "The upper band met the " + lvlName(r, li, tS.lvl) + " at " + money(tS.lvl) + " (" + clock(B[tS.t0].min) + "). Next: a push above it that closes back under as a shooting star. Short that close.";
    } else if (tL) {
      play = "The lower band met the " + lvlName(r, li, tL.lvl) + " at " + money(tL.lvl) + " (" + clock(B[tL.t0].min) + "). Next: a flush below it that closes back over as a hammer. Buy that close.";
    } else if (!noLevels) {
      var dH = Math.abs(r.up[li] - r.pdH[li]) / r.pdH[li] * 100, dL = Math.abs(r.dn[li] - r.pdL[li]) / r.pdL[li] * 100;
      play = "No band is sitting on an old level yet. Upper band is " + dH.toFixed(2) + "% from the prior-day high, lower band " + dL.toFixed(2) + "% from the prior-day low; the setup needs ≤ " + OPT.tolPct + "%.";
    }
    var evs = r.events.filter(function (x) { return B[x.t].date === today && (x.kind === "signal" || x.kind === "busy"); }).slice(-6).reverse();
    var skips = r.events.filter(function (x) { return B[x.t].date === today && x.kind === "skip"; }).length;
    var dates = []; B.forEach(function (b) { if (dates[dates.length - 1] !== b.date) dates.push(b.date); });
    var wins = 0, losses = 0;
    r.trades.forEach(function (t) { if (t.why === "target") wins++; else if (t.why === "stop") losses++; });
    function outcome(x) {
      if (x.kind === "busy") return '<span class="quiet">in a trade</span>';
      var done = null; r.trades.forEach(function (t) { if (t.t === x.t) done = t; });
      if (!done) return '<span class="pos">open</span>';
      var R2 = x.side === "S" ? x.sl - x.e : x.e - x.sl, rr = (x.side === "S" ? x.e - done.x : done.x - x.e) / R2;
      return '<span class="' + (rr > 0 ? "pos" : "neg") + '">' + (done.why === "session end" ? "close " : "") + (rr > 0 ? "+" : "") + rr.toFixed(2) + "R</span>";
    }
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · last closed bar · " + clock(last.min) + "</p>" +
      '<p class="v">' + status + "</p>" +
      (play ? '<p class="play">' + play + "</p>" : "") +
      '<dl class="lv"><div><dt>VWAP</dt><dd style="color:' + COL.vwap + '">' + money(r.vwap[li]) + "</dd></div>" +
      '<div><dt>Upper 2σ</dt><dd style="color:' + COL.band + '">' + money(r.up[li]) + "</dd></div>" +
      '<div><dt>Lower 2σ</dt><dd style="color:' + COL.band + '">' + money(r.dn[li]) + "</dd></div>" +
      '<div><dt>Prior high</dt><dd style="color:' + COL.level + '">' + money(r.pdH[li]) + "</dd></div>" +
      '<div><dt>Prior low</dt><dd style="color:' + COL.level + '">' + money(r.pdL[li]) + "</dd></div>" +
      '<div><dt>Close</dt><dd>' + money(last.c) + "</dd></div></dl>" +
      (forming ? '<p class="k">The ' + clock(cur.min) + " bar is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Signals today</p>' + (evs.length ? '<ul class="trades">' + evs.map(function (x) {
        return "<li><span>" + clock(B[x.t].min) + " · " + (x.side === "S" ? "SHORT" : "LONG") + " at " + money(x.e) + "</span>" + outcome(x) + "</li>";
      }).join("") + "</ul>" : '<p class="quiet">None yet today' + (skips ? " · " + skips + " skipped (grey)" : "") + ".</p>") +
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
    if (B.length < 30) { setGate("<b>Not enough data yet for " + SYMBOL + ".</b>"); return; }
    var asOf = (data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900);
    var forming = !data.date && B[B.length - 1].ms / 1000 + MULT * 60 > asOf;
    var nClosed = forming ? B.length - 1 : B.length;
    var r = signals(B, { n: nClosed });

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(B.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    var hit = {}; r.events.forEach(function (e) { if (e.kind === "signal") hit[e.t] = 1; });
    volS.setData(B.map(function (b, i) { return { time: b.time, value: b.v, color: hit[i] ? COL.volHit : b.c >= b.o ? COL.volUp : COL.volDn }; }));
    vwS.setData(perSession(B, r.vwap));
    upS.setData(perSession(B, r.up));
    dnS.setData(perSession(B, r.dn));
    hiS.setData(perSession(B, r.pdH));
    loS.setData(perSession(B, r.pdL));

    /* markers: signals, setups skipped (grey), signals while in a trade, exits */
    var marks = [], lastDate = B[B.length - 1].date;
    r.events.forEach(function (e) {
      var S = e.side === "S", pos = S ? "aboveBar" : "belowBar";
      if (e.kind === "signal") marks.push({ time: B[e.t].time, position: pos, shape: S ? "arrowDown" : "arrowUp", color: S ? COL.sell : COL.buy, text: S ? "SHORT" : "LONG" });
      else if (e.kind === "busy") marks.push({ time: B[e.t].time, position: pos, shape: "circle", color: COL.busy, text: "in trade" });
      else marks.push({ time: B[e.t].time, position: pos, shape: "circle", color: COL.skip, text: B[e.t].date === lastDate ? e.why : "" });   // skip reasons labelled on the latest session only
      if (e.kind === "signal" && e.touchT !== e.t) marks.push({ time: B[e.touchT].time, position: pos, shape: "circle", color: COL.band, text: "touch" });
    });
    r.trades.forEach(function (t) {
      if (t.why !== "target" && t.why !== "stop") return;
      var S = t.side === "S", tp = t.why === "target";
      marks.push({ time: B[t.xt].time, position: tp === S ? "belowBar" : "aboveBar", shape: "square", color: tp ? COL.tp : COL.sl, text: tp ? "TP hit" : "Stop" });
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

    if (!render.fitted) {
      var span = MULT >= 15 ? 160 : MULT >= 5 ? 200 : 260;
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, B.length - span), to: B.length - 1 + 6 });
      render.fitted = true;
    }
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · regular session · VWAP (blue) with 2σ bands (cyan) · prior-day high and low (gold) · band within " + OPT.tolPct +
      "% of a level, failure test within 3 bars, shooting star / hammer = wick ≥ half the bar, close in the far third · 2:1 · grey = skipped" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();
