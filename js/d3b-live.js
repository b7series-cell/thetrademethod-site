/* =====================================================================
   d3b-live.js — live Day Three Breakout chart.

   Pulls about two years of daily bars from /api/bars.php (the API key
   stays on the server), finds every three-day sequence in the last 24
   months, and replays the most recent day three on 5-minute regular-
   session bars. The page's rules, made objective:
   DAILY (closed bars only)
     · day one   = a catalyst-style move: the close is ≥ 20% above the
                   prior close on ≥ 3× the 20-day average volume (the page
                   can't see the news; its six examples ran +48% to +695%)
     · day two   = the next session is an inside day on lower volume:
                   high ≤ day one's high, low ≥ day one's low, volume <
                   day one's, and it doesn't open in the lower half of day
                   one's range (the page's "gaps well below" skip)
     · day three = the session after day two; it "breaks" if its high
                   trades above the day-two high
   DAY THREE, 5-MINUTE BARS (rth, closed bars only)
     · entry     = the first bar that trades above the day-two high, if it
                   starts before 10:00 ET ("off the open": every example
                   broke in the first 30 minutes). Fill at the day-two high,
                   or at the bar's open if it opened above it. A later
                   break is marked and skipped (the page: wait for a
                   pullback rather than chase)
     · stop      = a few cents under the breakout bar's low: 1% of the
                   entry, at least 0.01 and at most 0.05 (low of day is the
                   page's wider alternative; it's listed, not traded)
     · exits, in thirds, stop always checked first, from the next bar:
         ⅓ into blow-off volume: the first close above the entry on
           volume ≥ 1.5× the average of the session's earlier bars
         ⅓ at the next whole dollar above the entry after a VWAP dip holds
           (a bar's low touches session VWAP and it closes above it); a
           resting limit, filled when the high reaches it
         the rest on the first 5-minute close below the 9 EMA, or at the
           session close if neither has happened
     · 9 EMA of the close, continuous across sessions; VWAP of hlc3,
       reset at each 9:30 open
   Result = the thirds' average, in R of (entry − stop).

   Mount: <section data-d3b-live data-symbol="NVTS">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { gain: 0.20, volX: 3, avgN: 20, early: 600, offPct: 0.01, offMin: 0.01, offMax: 0.05, ema: 9, blowX: 1.5 };

  /* ---------- the rules (pure) ---------- */
  function merge(opt) { var o = {}, k; for (k in OPT) o[k] = OPT[k]; if (opt) for (k in opt) o[k] = opt[k]; return o; }
  function r2(x) { return Math.round(x * 100) / 100; }
  /* daily: B = [{ d, o, h, l, c, v }] oldest first; opt.from = first day-one date to report */
  function scan(B, opt, nClosed) {
    var o = merge(opt), n = nClosed == null ? B.length : nClosed, t, j;
    var VA = B.map(function (b, i) { if (i < o.avgN) return null; var s = 0; for (j = i - o.avgN; j < i; j++) s += B[j].v; return s / o.avgN; });
    var events = [], biggest = null;
    for (t = o.avgN; t < n; t++) {
      if (o.from && B[t].d < o.from) continue;
      var p = B[t - 1], b = B[t];
      if (!(p.c > 0) || !(VA[t] > 0)) continue;
      var gain = b.c / p.c - 1, vx = b.v / VA[t];
      if (!biggest || gain > biggest.gain) biggest = { t: t, gain: gain, vx: vx };
      if (gain < o.gain || vx < o.volX) continue;
      var e = { d1: t, gain: gain, vx: vx, d2: null, d3: null, d2h: null, why: [], state: "" };
      if (t + 1 >= n) { e.state = "watch"; events.push(e); continue; }
      var q = B[t + 1], mid = (b.h + b.l) / 2;
      e.d2 = t + 1; e.d2h = q.h; e.v2x = q.v / b.v;
      if (q.h > b.h) e.why.push("made a higher high than day one");
      if (q.l < b.l) e.why.push("broke day one's low");
      if (q.v >= b.v) e.why.push("volume as heavy as day one");
      if (q.o < mid) e.why.push("opened in the lower half of day one's range");
      if (e.why.length) { e.state = "fail2"; events.push(e); continue; }
      if (t + 2 >= n) { e.state = "armed"; events.push(e); continue; }
      e.d3 = t + 2; e.gap = B[t + 2].o > q.h;
      e.state = B[t + 2].h > q.h ? "broke" : "nobreak";
      events.push(e);
    }
    return { va: VA, events: events, biggest: biggest, opt: o };
  }
  /* day three: I = [{ date, min, o, h, l, c, v }] regular-session 5-minute bars, oldest first (earlier sessions warm the EMA) */
  function dayThree(I, d2h, date, opt, nClosed) {
    var o = merge(opt), n = nClosed == null ? I.length : nClosed, t;
    var k = 2 / (o.ema + 1), ema = [], vw = [], e = null, pv = 0, vv = 0;
    for (t = 0; t < I.length; t++) {
      var b = I[t];
      e = e === null ? b.c : e + (b.c - e) * k; ema[t] = e;
      if (t === 0 || I[t - 1].date !== b.date) { pv = 0; vv = 0; }
      pv += (b.h + b.l + b.c) / 3 * b.v; vv += b.v; vw[t] = vv > 0 ? pv / vv : b.c;
    }
    var s0 = -1; for (t = 0; t < I.length; t++) if (I[t].date === date) { s0 = t; break; }
    var res = { ema: ema, vwap: vw, s0: s0, trade: null, late: null, dip: null, sessionDone: false };
    if (s0 < 0) return res;
    var tr = null, vsum = 0, cnt = 0, lod = Infinity, last = s0;
    function part(f, x, why, ti) { tr.parts.push({ f: f, x: x, why: why, t: ti }); tr.rem = r2(tr.rem * 1e6 - f * 1e6) / 1e6; if (tr.rem < 1e-6) { tr.rem = 0; tr.done = true; } }
    for (t = s0; t < n && I[t].date === date; t++) {
      var b2 = I[t]; last = t;
      lod = Math.min(lod, b2.l);
      if (!tr && !res.late) {
        if (b2.h > d2h) {
          if (b2.min < o.early) {
            var en = Math.max(d2h, b2.o), off = Math.min(o.offMax, Math.max(o.offMin, r2(en * o.offPct)));
            tr = { t: t, e: en, sl: r2(b2.l - off), lod: r2(lod - off), gap: b2.o > d2h, rem: 1, parts: [], done: false, wd: null, dip: null, p1: false, p2: false };
            tr.risk = tr.e - tr.sl;
          } else res.late = { t: t };
        }
      } else if (tr && !tr.done && t > tr.t) {
        if (b2.l <= tr.sl) part(tr.rem, Math.min(b2.o, tr.sl), "stop", t);
        else {
          var avg = cnt ? vsum / cnt : null;
          if (!tr.p1 && avg && b2.c > tr.e && b2.v >= o.blowX * avg) { part(1 / 3, b2.c, "blow", t); tr.p1 = true; }
          if (!tr.p2 && !tr.done) {
            if (tr.wd != null && b2.h >= tr.wd) { part(1 / 3, tr.wd, "whole", t); tr.p2 = true; }
            else if (tr.wd == null && b2.l <= vw[t] && b2.c > vw[t]) { tr.wd = Math.max(Math.floor(b2.c) + 1, Math.floor(tr.e) + 1); tr.dip = t; }
          }
          if (!tr.done && b2.c < ema[t]) part(tr.rem, b2.c, "ema", t);
        }
      }
      vsum += b2.v; cnt++;
    }
    res.sessionDone = last < n && I[last].min >= 955 && (last + 1 >= I.length || I[last + 1].date !== date) && last < n;
    if (tr && !tr.done && res.sessionDone) part(tr.rem, I[last].c, "close", last);
    if (tr) {
      var sum = 0; tr.parts.forEach(function (p) { sum += p.f * (p.x - tr.e); });
      tr.r = tr.risk > 0 ? sum / tr.risk : 0;
      tr.open = !tr.done;
      if (tr.open) tr.rOpen = (sum + tr.rem * (I[Math.max(tr.t, Math.min(n, I.length) - 1)].c - tr.e)) / tr.risk;
    }
    res.trade = tr;
    return res;
  }
  function signals(B, opt, nClosed) { return scan(B, opt, nClosed); }

  /* ---------- page plumbing ---------- */
  var DAYS = 760, MONTHS = 24, POLL_DAY = 5 * 60000, POLL_LIVE = 60000, RTH_OPEN = 570, RTH_CLOSE = 960;
  var COL = { d1: "#30d158", d2: "#f4b942", d3: "#2997ff", miss: "#8e8e93", entry: "#2997ff", sl: "#ff453a", tp: "#30d158", ema: "#f4b942", vwap: "#64d2ff",
              volUp: "rgba(48,209,88,0.40)", volDn: "rgba(255,69,58,0.40)", va: "rgba(245,245,247,0.5)" };
  var root = document.querySelector("[data-d3b-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = { chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"), status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate") };
  var KIT = LiveKit.controls(root, { key: "d3b", symbol: (root.getAttribute("data-symbol") || "NVTS").toUpperCase(), tf: 5, tfs: [],
    onChange: function (sym) { SYMBOL = sym; FOCUS = null; PICK = null; fitted = {}; load(); } });
  var SYMBOL = KIT.symbol, VIEW = "daily", FOCUS = null, PICK = null, fitted = {}, INTRA = {}, LAST = null;

  /* the Daily / Day three switch */
  var form = root.querySelector(".live-symbol"), segEl = document.createElement("div");
  segEl.className = "bt-seg live-tf"; segEl.setAttribute("role", "group"); segEl.setAttribute("aria-label", "View");
  segEl.innerHTML = '<button type="button" data-view="daily" aria-pressed="true">Daily</button><button type="button" data-view="intra" aria-pressed="false">Day 3 · 5m</button>';
  form.appendChild(segEl);
  segEl.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-view]"); if (!b || b.disabled) return;
    setView(b.getAttribute("data-view"));
  });
  function setView(v) {
    VIEW = v;
    Array.prototype.forEach.call(segEl.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-view") === VIEW)); });
    if (LAST) draw();
  }

  function previewToken() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }
  function money(x) { return x == null || isNaN(x) ? "—" : x.toFixed(2); }
  function vol(x) { return x == null ? "—" : x >= 1e9 ? (x / 1e9).toFixed(2) + "B" : x >= 1e6 ? (x / 1e6).toFixed(1) + "M" : x >= 1e3 ? Math.round(x / 1e3) + "K" : String(Math.round(x)); }
  function rr(x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(1) + "R"; }
  function pct(x) { return (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(0) + "%"; }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function day(d, yr) { var p = d.split("-"); return MON[+p[1] - 1] + " " + (+p[2]) + (yr ? ", " + p[0] : ""); }
  function clock(min) { var h = Math.floor(min / 60), m = min % 60; return (h > 12 ? h - 12 : h) + ":" + (m < 10 ? "0" : "") + m + (h >= 12 ? " pm" : " am"); }
  var dfmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  var fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  function etParts(ms) {
    var p = {}; fmt.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    var h = (+p.hour) % 24;
    return { date: p.year + "-" + p.month + "-" + p.day, min: h * 60 + (+p.minute), wall: Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute) / 1000 };
  }
  function isoDay(d) { return d.toISOString().slice(0, 10); }
  var WHY = { blow: "⅓ blow-off volume", whole: "⅓ whole dollar", ema: "9 EMA close", close: "session close", stop: "stop" };

  /* ---------- chart (rebuilt when the view changes: daily and intraday use different time axes) ---------- */
  var chart = null, chartKind = "", S = {}, extras = [];
  function makeChart(kind) {
    if (chart) { chart.remove(); chart = null; }
    chartKind = kind; S = {}; extras = [];
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.24 } },
      timeScale: { borderVisible: false, rightOffset: 6, timeVisible: kind === "intra", secondsVisible: false }, crosshair: { mode: 0 }
    });
    S.vol = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false });
    S.va = chart.addLineSeries({ priceScaleId: "vol", color: COL.va, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 }, visible: false });
    S.c = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    if (kind === "intra") {
      S.vwap = chart.addLineSeries({ color: COL.vwap, lineWidth: 2, lineStyle: 2, title: "VWAP", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      S.ema = chart.addLineSeries({ color: COL.ema, lineWidth: 2, title: "9 EMA", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    }
  }
  function seg(t0, t1, p, color, style, title, width) {
    var s = chart.addLineSeries({ color: color, lineWidth: width || 1.5, lineStyle: style, title: title || "", priceLineVisible: false, lastValueVisible: !!title,
      crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
    s.setData(t0 === t1 ? [{ time: t0, value: p }] : [{ time: t0, value: p }, { time: t1, value: p }]);
    extras.push(s);
  }

  /* ---------- data ---------- */
  function setGate(msg) {
    root.classList.add("gated"); els.gate.hidden = false;
    els.status.textContent = SYMBOL + " · daily · not loaded";
    els.gate.innerHTML = msg.replace(/<\/b>\s*([\s\S]+)$/, "</b><span>$1</span>");
  }
  function gateFor(e) {
    if (e === "private") return "<b>Live chart in private preview.</b> Open this page once with your preview link to unlock it in this browser.";
    if (e === "not_configured") return "<b>Live chart not configured yet.</b> Add <code>api/config.php</code> on the server.";
    if (e === "symbol_not_allowed") return "<b>" + SYMBOL + " isn't on the allowed list.</b> Add it to <code>symbols</code> in <code>api/config.php</code>, or use <code>'*'</code> to allow any ticker.";
    if (e === "bad_symbol") return "<b>That doesn't look like a ticker.</b>";
    return "<b>Live data unavailable right now.</b> Try again in a minute.";
  }
  function get(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); });
  }
  function load() {
    var tok = previewToken(), now = new Date(), from = new Date(now.getTime() - DAYS * 864e5), mine = SYMBOL;
    var url = "/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&span=day&from=" + isoDay(from) + "&to=" + dfmt.format(now) + (tok ? "&preview=" + encodeURIComponent(tok) : "");
    return get(url).then(function (res) {
      if (mine !== SYMBOL) return false;
      if (!res.ok) { setGate(gateFor(res.body && res.body.error)); return false; }
      var D = daily(res.body);
      if (!D) return false;
      LAST = D; FOCUS = D.focus;
      if (PICK) D.r.events.forEach(function (x) { if (x.d3 != null && D.B[x.d3].d === PICK) FOCUS = { ev: x, live: PICK === D.today, date: PICK }; });
      return loadIntra(D).then(function () { if (mine === SYMBOL) draw(); return true; });
    }).catch(function () { setGate("<b>Live data unavailable right now.</b> Try again in a minute."); return false; });
  }
  /* the intraday session for the focused day three (today's live session when day three is today or next) */
  function loadIntra(D) {
    var f = FOCUS;
    if (!f) return Promise.resolve();
    var key = SYMBOL + "|" + (f.live ? "live" : f.date);
    if (INTRA[key] && !f.live) return Promise.resolve();
    var tok = previewToken();
    var url = "/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&mult=5&rth=1" + (f.live ? "" : "&date=" + f.date) + (tok ? "&preview=" + encodeURIComponent(tok) : "");
    return get(url).then(function (res) {
      if (!res.ok) { INTRA[key] = { err: res.body && res.body.error }; return; }
      INTRA[key] = intra(res.body, f);
    }).catch(function () { INTRA[key] = { err: "net" }; });
  }

  function daily(data) {
    var B = [], seen = {};
    data.bars.forEach(function (a) { var d = dfmt.format(new Date(a[0])); if (!seen[d]) { seen[d] = 1; B.push({ d: d, o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] || 0 }); } });
    if (B.length < 40) { setGate("<b>Not enough history for " + SYMBOL + ".</b> The scan needs a couple of months of daily bars."); return null; }
    var asOf = ((data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900)) * 1000, ap = etParts(asOf);
    var forming = B[B.length - 1].d === ap.date && ap.min < RTH_CLOSE;
    var nClosed = forming ? B.length - 1 : B.length;
    var since = new Date(Date.now() - MONTHS * 30.44 * 864e5);
    var r = scan(B, { from: isoDay(since) }, nClosed);
    /* the focus: the newest day three that broke, or the one armed for today / next session */
    var focus = null, ev = r.events, i;
    for (i = ev.length - 1; i >= 0; i--) {
      var e = ev[i];
      if (e.state === "armed") { focus = { ev: e, live: true, date: forming ? B[B.length - 1].d : null, armed: true }; break; }
      if (e.state === "broke") { focus = { ev: e, live: B[e.d3].d === ap.date, date: B[e.d3].d }; break; }
    }
    return { B: B, r: r, forming: forming, nClosed: nClosed, data: data, focus: focus, asOf: asOf, today: ap.date };
  }
  function intra(data, f) {
    var I = [];
    data.bars.forEach(function (a) {
      var t = etParts(a[0]);
      if (t.min >= RTH_OPEN && t.min < RTH_CLOSE) I.push({ date: t.date, min: t.min, time: t.wall, ms: a[0], o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] || 0 });
    });
    if (!I.length) return { err: "empty" };
    var asOf = (data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900);
    var formingBar = !data.date && I[I.length - 1].ms / 1000 + 5 * 60 > asOf;
    var n = formingBar ? I.length - 1 : I.length;
    var date = f.date || I[I.length - 1].date;
    var res = dayThree(I, f.ev.d2h, date, null, n);
    return { I: I, res: res, n: n, forming: formingBar, date: date, data: data };
  }

  /* ---------- render ---------- */
  function draw() {
    var D = LAST, f = FOCUS, X = f ? INTRA[SYMBOL + "|" + (f.live ? "live" : f.date)] : null;
    var intraOk = !!(X && X.I);
    var ib = segEl.querySelector('[data-view="intra"]');
    ib.disabled = !f; ib.title = f ? "" : "No day three to show for " + SYMBOL;
    if (VIEW === "intra" && !intraOk) VIEW = "daily";
    Array.prototype.forEach.call(segEl.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-view") === VIEW)); });
    els.gate.hidden = true; root.classList.remove("gated");
    if (VIEW === "intra") drawIntra(D, f, X); else drawDaily(D, f, X);
    renderSide(D, f, X);
  }
  function drawDaily(D) {
    var B = D.B, r = D.r, n = D.nClosed;
    if (!chart || chartKind !== "daily") makeChart("daily");
    LiveKit.brand(chart, els.chart, SYMBOL, "Daily");
    var role = {};
    r.events.forEach(function (e) { role[e.d1] = "d1"; if (e.d2 != null && e.state !== "fail2") role[e.d2] = "d2"; if (e.d3 != null && e.state === "broke") role[e.d3] = "d3"; });
    S.c.setData(B.map(function (b) { return { time: b.d, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    S.vol.setData(B.map(function (b, i) { return { time: b.d, value: b.v, color: role[i] ? COL[role[i]] : b.c >= b.o ? COL.volUp : COL.volDn }; }));
    S.va.setData(B.map(function (b, i) { return r.va[i] == null ? { time: b.d } : { time: b.d, value: r.va[i] }; }));
    extras.forEach(function (s) { chart.removeSeries(s); }); extras = [];
    var marks = [];
    r.events.forEach(function (e) {
      marks.push({ time: B[e.d1].d, position: "aboveBar", shape: "circle", color: COL.d1, text: "Day 1 " + pct(e.gain) });
      if (e.d2 == null) return;
      if (e.state === "fail2") { marks.push({ time: B[e.d2].d, position: "aboveBar", shape: "circle", color: COL.miss, text: "Day 2 ✕" }); return; }
      marks.push({ time: B[e.d2].d, position: "aboveBar", shape: "circle", color: COL.d2, text: "Day 2 inside" });
      var endD = e.d3 != null ? B[e.d3].d : B[B.length - 1].d;
      seg(B[e.d1].d, endD, e.d2h, COL.d3, 2, e.state === "armed" ? "Day-2 high" : "");
      if (e.d3 != null) marks.push({ time: B[e.d3].d, position: "belowBar", shape: e.state === "broke" ? "arrowUp" : "circle", color: e.state === "broke" ? COL.d3 : COL.miss, text: e.state === "broke" ? "Day 3 break" : "Day 3 no break" });
    });
    if (!r.events.length && r.biggest) marks.push({ time: B[r.biggest.t].d, position: "aboveBar", shape: "circle", color: COL.miss, text: "Biggest day " + pct(r.biggest.gain) });
    marks.sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
    S.c.setMarkers(marks);
    if (!fitted.daily) {
      var lastE = r.events[r.events.length - 1], from = lastE ? Math.max(0, Math.min(lastE.d1 - 60, B.length - 130)) : Math.max(0, B.length - 130);
      chart.timeScale().setVisibleLogicalRange({ from: from, to: B.length - 1 + 6 });
      fitted.daily = true;
    }
    var upd = new Date(D.data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = SYMBOL + " · daily · day one ≥ +" + Math.round(OPT.gain * 100) + "% on ≥ " + OPT.volX + "× the 20-day average volume (dotted) · day two inside day one on lower volume · day three breaks the day-two high · last " + MONTHS +
      " months" + (D.data.delay ? " · " + D.data.delay : "") + " · Updated " + upd + " ET" + (D.data.stale ? " (last good copy)" : "");
  }
  function drawIntra(D, f, X) {
    var I = X.I, res = X.res, tr = res.trade, B = D.B, ev = f.ev;
    if (!chart || chartKind !== "intra") makeChart("intra");
    LiveKit.brand(chart, els.chart, SYMBOL, "5m · " + day(X.date));
    /* sessions from day one (when it's in the fetch) to day three */
    var d1d = B[ev.d1].d, start = 0, i;
    for (i = 0; i < I.length; i++) if (I[i].date >= d1d) { start = i; break; }
    var V = I.slice(start), off = start;
    S.c.setData(V.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    var hl = {}; if (tr) { hl[tr.t] = COL.d3; tr.parts.forEach(function (p) { if (p.why === "blow") hl[p.t] = COL.d2; }); }
    S.vol.setData(V.map(function (b, k) { return { time: b.time, value: b.v, color: hl[k + off] || (b.c >= b.o ? COL.volUp : COL.volDn) }; }));
    S.va.setData([]);
    S.ema.setData(V.map(function (b, k) { return { time: b.time, value: res.ema[k + off] }; }));
    S.vwap.setData(V.map(function (b, k) { var j = k + off; return j > 0 && I[j - 1].date !== b.date ? { time: b.time } : { time: b.time, value: res.vwap[j] }; }));
    extras.forEach(function (s) { chart.removeSeries(s); }); extras = [];
    var marks = [], dates = [];
    V.forEach(function (b) { if (dates[dates.length - 1] !== b.date) dates.push(b.date); });
    var names = {}; names[d1d] = "Day 1"; if (ev.d2 != null) names[B[ev.d2].d] = "Day 2"; if (!(f.armed && !D.forming)) names[X.date] = "Day 3";
    dates.forEach(function (d) {
      var j = 0; for (; j < V.length; j++) if (V[j].date === d) break;
      if (names[d]) marks.push({ time: V[j].time, position: "aboveBar", shape: "square", color: "#6e6e73", text: names[d] });
    });
    var s0 = res.s0 >= 0 ? res.s0 : start, sEnd = I.length - 1;
    for (i = s0; i < I.length; i++) if (I[i].date !== X.date) { sEnd = i - 1; break; }
    var d2Start = ev.d2 != null ? I.findIndex(function (b) { return b.date === B[ev.d2].d; }) : -1;
    seg(I[d2Start >= 0 ? d2Start : s0].time, I[sEnd].time, ev.d2h, COL.d3, 2, "Day-2 high");
    if (tr) {
      marks.push({ time: I[tr.t].time, position: "belowBar", shape: "arrowUp", color: COL.entry, text: "Buy " + money(tr.e) });
      if (tr.dip != null) marks.push({ time: I[tr.dip].time, position: "belowBar", shape: "circle", color: COL.vwap, text: "VWAP dip holds" });
      tr.parts.forEach(function (p) {
        var good = p.x > tr.e;
        marks.push({ time: I[p.t].time, position: p.why === "stop" ? "belowBar" : "aboveBar", shape: p.why === "stop" ? "square" : "circle", color: p.why === "stop" ? COL.sl : p.why === "ema" || p.why === "close" ? COL.ema : COL.tp,
          text: (p.f < 0.99 && p.why !== "blow" && p.why !== "whole" ? "Rest " : "") + WHY[p.why] + " " + money(p.x) });
      });
      var endT = tr.done ? I[tr.parts[tr.parts.length - 1].t].time : I[sEnd].time;
      seg(I[tr.t].time, endT, tr.e, COL.entry, 0, tr.done ? "" : "Entry");
      seg(I[tr.t].time, endT, tr.sl, COL.sl, 2, tr.done ? "" : "Stop");
      if (tr.wd != null) seg(I[tr.dip].time, tr.p2 ? I[tr.parts.filter(function (p) { return p.why === "whole"; })[0].t].time : endT, tr.wd, COL.tp, 2, tr.p2 ? "" : "Whole $");
    }
    if (res.late) marks.push({ time: I[res.late.t].time, position: "belowBar", shape: "circle", color: COL.miss, text: "Late break · skip" });
    marks.sort(function (a, b) { return a.time - b.time; });
    S.c.setMarkers(marks);
    var fk = "intra|" + X.date;
    if (!fitted[fk]) {
      var from = Math.max(0, (d2Start >= 0 ? d2Start : s0) - off + 30);
      chart.timeScale().setVisibleLogicalRange({ from: Math.min(from, s0 - off - 10), to: V.length - 1 + 6 });
      fitted[fk] = true;
    }
    var upd = new Date(X.data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = SYMBOL + " · 5-minute · regular session · " + day(X.date, true) + " · day-two high " + money(ev.d2h) + " (blue) · 9 EMA (gold) · VWAP (cyan) · entry only on a break before 10:00 · stop 1% under the breakout bar, 0.01–0.05" +
      (X.data.date ? " · Replay" : (X.data.delay ? " · " + X.data.delay : "") + " · Updated " + upd + " ET") + (X.data.stale ? " (last good copy)" : "");
  }

  function renderSide(D, f, X) {
    var B = D.B, r = D.r, last = B[D.nClosed - 1], ev = f ? f.ev : null, res = X && X.res ? X.res : null, tr = res ? res.trade : null;
    var newest = r.events[r.events.length - 1], html = '<p class="k">' + SYMBOL + " · daily · last close " + day(last.d, true) + "</p>";
    var status, play;
    if (f && f.armed) {
      status = D.forming ? "Day three is today" : "Armed: day three is next session";
      play = "Day one closed " + pct(ev.gain) + " on " + ev.vx.toFixed(1) + "× volume, then an inside day on " + Math.round(ev.v2x * 100) + "% of its volume. The trade is a break of " + money(ev.d2h) + " before 10:00.";
      if (D.forming && res) play += tr ? " It broke at " + clock(X.I[tr.t].min) + "." : res.late ? " It broke after 10:00: the page says wait for a pullback." : " No break yet.";
    } else if (newest && newest.state === "watch") {
      status = "Day one just printed";
      play = "The last close was " + pct(newest.gain) + " on " + newest.vx.toFixed(1) + "× volume. Next: an inside day on lower volume would arm a break of its high for the session after.";
    } else if (f) {
      status = "Last day three: " + day(f.date, true);
      play = "Day one " + pct(ev.gain) + " on " + ev.vx.toFixed(1) + "× volume, day two inside on " + Math.round(ev.v2x * 100) + "% of day one's volume, and day three traded through the " + money(ev.d2h) + " day-two high" + (ev.gap ? " (it opened above it)" : "") + ".";
    } else {
      status = "No three-day sequence in the last " + MONTHS + " months";
      var fails = r.events.filter(function (e) { return e.state === "fail2"; }), nb = r.events.filter(function (e) { return e.state === "nobreak"; });
      if (!r.events.length) play = "Missing day one: no close ≥ +" + Math.round(OPT.gain * 100) + "% on ≥ " + OPT.volX + "× average volume." + (r.biggest ? " The biggest up day was " + pct(r.biggest.gain) + " on " + day(B[r.biggest.t].d, true) + " (" + r.biggest.vx.toFixed(1) + "× volume)." : "");
      else play = "Day one showed up " + r.events.length + " time" + (r.events.length === 1 ? "" : "s") + ", but " + (fails.length ? fails.length + " failed the day-two test" : "") + (fails.length && nb.length ? " and " : "") + (nb.length ? nb.length + " never broke the day-two high on day three" : "") + ". The list below says why.";
    }
    html += '<p class="v">' + status + '</p><p class="play">' + play + "</p>";
    if (f) {
      if (X && X.err) html += '<p class="k">The 5-minute day-three session couldn\'t be loaded' + (X.err === "bad_date" ? " (more than two years back)" : "") + ".</p>";
      else if (tr) {
        var PART = { blow: "blow-off volume", whole: "whole dollar", ema: "9 EMA close", close: "session close", stop: "stop" };
        var lines = tr.parts.map(function (p) { var k = Math.round(p.f * 3); return (k === 3 ? "All" : k === 1 ? "⅓" : "⅔") + " at " + money(p.x) + " (" + PART[p.why] + ")"; }).join(" · ");
        html += '<div class="live-trade"><b>Bought ' + money(tr.e) + " at " + clock(X.I[tr.t].min) + " · stop " + money(tr.sl) + " · " + (tr.open ? "open " + rr(tr.rOpen) : rr(tr.r)) + "</b><span>" + (lines ? lines + "." : "No exits yet.") +
          " Low-of-day stop would have been " + money(tr.lod) + ".</span></div>";
      } else if (res && res.late) html += '<div class="live-trade short"><b>Broke at ' + clock(X.I[res.late.t].min) + ", after 10:00</b><span>Not taken: the page says wait for a pullback rather than chase.</span></div>";
      html += '<dl class="lv"><div><dt>Day 1</dt><dd class="up">' + pct(ev.gain) + "</dd></div><div><dt>Day 1 vol</dt><dd>" + ev.vx.toFixed(1) + "×</dd></div>" +
        "<div><dt>Day 2 vs 1 vol</dt><dd>" + Math.round(ev.v2x * 100) + "%</dd></div><div><dt>Day-2 high</dt><dd class=\"pdl\">" + money(ev.d2h) + "</dd></div>" +
        "<div><dt>Entry</dt><dd>" + money(tr ? tr.e : null) + '</dd></div><div><dt>Stop</dt><dd class="dn">' + money(tr ? tr.sl : null) + "</dd></div></dl>";
    }
    var LBL = { broke: "broke", nobreak: "no break", fail2: "day two ✕", armed: "armed", watch: "day one" };
    var list = r.events.slice(-10).reverse();
    html += '<p class="k">Day-one moves, last ' + MONTHS + " months</p>" + (list.length ? '<ul class="trades d3b-list">' + list.map(function (e) {
      var right = LBL[e.state], cls = e.state === "broke" ? "pos" : e.state === "armed" ? "open" : "neg";
      if (e.state === "broke") {
        var Y = INTRA[SYMBOL + "|" + B[e.d3].d] || (f && f.ev === e ? X : null);
        if (Y && Y.res) right = Y.res.trade ? (Y.res.trade.open ? "open" : rr(Y.res.trade.r)) : Y.res.late ? "late" : "broke";
        if (Y && Y.res && Y.res.trade && !Y.res.trade.open) cls = Y.res.trade.r > 0 ? "pos" : "neg";
      }
      var note = e.state === "fail2" ? '<small class="d3b-why">' + e.why.join("; ") + "</small>" : "";
      var label = day(B[e.d1].d, true) + " · " + pct(e.gain) + " · " + e.vx.toFixed(1) + "×" + note;
      var inner = "<span>" + label + '</span><span class="' + cls + '">' + right + "</span>";
      return e.state === "broke" ? '<li class="d3b-row"><button type="button" class="d3b-pick" data-d3="' + B[e.d3].d + '">' + inner + "</button></li>" : "<li>" + inner + "</li>";
    }).join("") + "</ul>" : '<p class="quiet">None.</p>');
    if (list.some(function (e) { return e.state === "broke"; })) html += '<p class="k">Tap a break to replay its day three on 5-minute bars.</p>';
    els.side.innerHTML = html;
    Array.prototype.forEach.call(els.side.querySelectorAll(".d3b-pick"), function (btn) {
      btn.addEventListener("click", function () {
        var d3 = btn.getAttribute("data-d3"), e = null;
        r.events.forEach(function (x) { if (x.d3 != null && B[x.d3].d === d3) e = x; });
        if (!e) return;
        FOCUS = { ev: e, live: d3 === D.today, date: d3 }; PICK = d3;
        loadIntra(D).then(function () { VIEW = "intra"; draw(); });
      });
    });
  }

  window.D3BLive = { signals: signals, scan: scan, dayThree: dayThree };
  load().then(function () {
    (function tick() {
      setTimeout(function () { if (!document.hidden) load(); tick(); }, FOCUS && FOCUS.live && VIEW === "intra" ? POLL_LIVE : POLL_DAY);
    })();
  });
})();
