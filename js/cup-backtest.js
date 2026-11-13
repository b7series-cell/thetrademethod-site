/* =====================================================================
   cup-backtest.js — renders the Cup and Handle backtest saved by
   /api/cup-backtest.php (built nightly on the server; the Massive key
   never reaches the browser). Clicking a trade draws it on daily bars
   from /api/bars.php?span=day. Same private preview token as the live
   charts.

   Mount: <section data-cup-bt>…</section>
   ===================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-cup-bt]");
  if (!root) return;
  var API = "/api/cup-backtest.php";
  var els = {
    gate: root.querySelector(".bt-gate"), body: root.querySelector(".bt-body"),
    seg: root.querySelector(".bt-win"), chart: root.querySelector(".bt-chart"),
    built: root.querySelector(".bt-built"), rebuild: root.querySelector(".bt-rebuild"),
    stats: root.querySelector(".bt-stats"), curve: root.querySelector(".bt-curve"),
    funnel: root.querySelector(".bt-funnel"), exits: root.querySelector(".bt-exits"),
    tick: root.querySelector(".bt-tick"), trades: root.querySelector(".bt-trades"),
    note: root.querySelector(".bt-note"), more: root.querySelector(".bt-more")
  };
  var DATA = null, WIN = 252, SHOW_ALL = false, SHOW_N = 15, IDX = {};
  var KIT = BTKit.setup(root, { key: "cup", tfs: null, onChange: function () { if (DATA) render(); } });
  try { WIN = +localStorage.getItem("cup_bt_win") || 252; } catch (e) {}

  function token() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }
  function get(qs) {
    var tok = token();
    return fetch(API + "?" + qs + (tok ? "&preview=" + encodeURIComponent(tok) : ""), { cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok, status: r.status, body: b }; }); });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function clock(min) { var h = Math.floor(min / 60), m = min % 60; return (h > 12 ? h - 12 : h) + ":" + (m < 10 ? "0" : "") + m; }
  function px(x) { return x == null ? "—" : x >= 100 ? x.toFixed(2) : x.toFixed(2); }
  function rr(x, plus) { return (plus !== false && x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(2) + "R"; }
  function sign(x) { return x > 0 ? "pos" : x < 0 ? "neg" : ""; }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function day(d) { var p = d.split("-"); return MON[+p[1] - 1] + " " + (+p[2]); }
  var WHY = { t2: "Both targets", be: "Target 1, rest at breakeven", target: "Target", stop: "Stop", time: "60-day time stop", open: "Still open" };

  function setGate(html, btn) {
    els.body.hidden = true; els.gate.hidden = false;
    els.gate.innerHTML = html + (btn ? '<button type="button" class="pill pill-buy bt-go">' + btn + "</button>" : "");
    var go = els.gate.querySelector(".bt-go");
    if (go) go.addEventListener("click", function () { build(true); });
  }

  /* ---------- load / build ---------- */
  function load() {
    return get("v=1").then(function (res) {
      var e = res.body && res.body.error;
      if (res.ok && res.body && res.body.sessions) { DATA = res.body; IDX = {}; DATA.sessions.forEach(function (d, i) { IDX[d] = i; }); KIT.setExits(DATA); render(); return; }
      if (e === "private") setGate("<b>Backtest in private preview.</b><span>Open this page once with your preview link to unlock it in this browser.</span>");
      else if (e === "not_configured") setGate("<b>Backtest not configured yet.</b><span>It uses the same <code>api/config.php</code> as the live chart.</span>");
      else if (e === "not_built") setGate("<b>No backtest yet.</b><span>The first run fetches five years of daily bars for 16 tickers. It takes under a minute.</span>", "Run the backtest");
      else setGate("<b>Backtest unavailable right now.</b><span>Try again in a minute.</span>");
    }).catch(function () { setGate("<b>Backtest unavailable right now.</b><span>Try again in a minute.</span>"); });
  }

  var building = false;
  function build(fresh) {
    if (building) return;
    building = true;
    els.rebuild.disabled = true;
    var tries = 0;
    function step(first) {
      get("run=1" + (first ? "&fresh=1" : "")).then(function (res) {
        var b = res.body || {};
        if (b.error === "busy" && tries++ < 40) { progress(null, "Another run is in progress…"); return setTimeout(function () { step(false); }, 5000); }
        if (!res.ok) { building = false; els.rebuild.disabled = false; return load(); }
        progress(b.progress);
        if (b.complete) { building = false; els.rebuild.disabled = false; return load(); }
        step(false);
      }).catch(function () { building = false; els.rebuild.disabled = false; setGate("<b>The run stopped partway.</b><span>Nothing is lost; the next run picks up where it left off.</span>", "Continue"); });
    }
    progress(null, "Fetching daily bars…");
    step(!!fresh);
  }
  function progress(p, msg) {
    var pct = p ? Math.round(p.done / Math.max(1, p.total) * 100) : 0;
    var text = msg || (p ? "Running… " + p.done + " of " + p.total + " tickers" : "Running…");
    if (DATA) { els.built.textContent = text; return; }
    setGate('<b>' + text + '</b><span class="bt-prog"><i style="width:' + pct + '%"></i></span>');
  }

  /* ---------- the numbers for one window ---------- */
  function S_LEN() { return DATA ? DATA.sessions.length : 0; }
  function slice() {
    var S = DATA.sessions, n = Math.min(WIN, S.length), from = S.length - n;
    var inWin = {};
    for (var i = from; i < S.length; i++) inWin[S[i]] = true;
    var all = DATA.trades.filter(function (t) { return inWin[t.d]; }).map(function (t) {
      var o = KIT.view(t);
      if (o.variant && IDX[o.xd] != null && IDX[o.d] != null) o.days = IDX[o.xd] - IDX[o.d];
      return o;
    });
    var trades = all.filter(function (t) { return t.why !== "open"; }), open = all.filter(function (t) { return t.why === "open"; });
    var f = { all: 0, u: 0, b: 0, h: 0, a: 0, m: 0, g: 0, T: 0 };
    DATA.cands.forEach(function (g) { if (!inWin[g[1]]) return; f.all++; f[g[2]] = (f[g[2]] || 0) + 1; });
    var cover = {};
    DATA.symbols.forEach(function (s) {
      var row = (DATA.cover && DATA.cover[s]) || "", have = 0;
      for (var i = from; i < S.length; i++) if (row.charAt(i) === "1") have++;
      cover[s] = have;
    });
    return { n: n, from: S[from], to: S[S.length - 1], trades: trades, open: open, all: all, f: f, cover: cover };
  }

  function stats(trades) {
    var n = trades.length, wins = 0, sum = 0, gp = 0, gl = 0, risk = 0, eq = 0, peak = 0, dd = 0, curve = [0];
    trades.forEach(function (t) {
      if (t.r > 0) { wins++; gp += t.r; } else gl -= t.r;
      sum += t.r; risk += t.rp;
      eq += t.r; peak = Math.max(peak, eq); dd = Math.max(dd, peak - eq); curve.push(eq);
    });
    return { n: n, win: n ? wins / n : null, avg: n ? sum / n : null, total: sum, pf: gl > 0 ? gp / gl : (gp > 0 ? Infinity : null),
             dd: dd, risk: n ? risk / n : null, curve: curve };
  }

  /* ---------- render ---------- */
  function render() {
    els.gate.hidden = true; els.body.hidden = false;
    var built = new Date(DATA.built * 1000).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    if (!building) els.built.textContent = "Built " + built + " ET";
    Array.prototype.forEach.call(els.seg.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-w") === WIN)); });


    var w = slice(), s = stats(w.trades);
    var tile = function (k, v, cls, sub) { return '<div><dt>' + k + '</dt><dd class="' + (cls || "") + '">' + v + "</dd>" + (sub ? "<small>" + sub + "</small>" : "") + "</div>"; };
    els.stats.innerHTML =
      tile("Trades", s.n, "", w.open.length ? w.open.length + " still open" : w.n + " sessions") +
      tile("Win rate", s.win == null ? "—" : Math.round(s.win * 100) + "%") +
      tile("Avg trade", s.avg == null ? "—" : rr(s.avg), sign(s.avg)) +
      tile("Total", s.n ? rr(s.total) : "—", sign(s.total)) +
      tile("Profit factor", s.pf == null ? "—" : s.pf === Infinity ? "∞" : s.pf.toFixed(2)) +
      tile("Max drawdown", s.n ? rr(-s.dd, false) : "—", s.dd > 0 ? "neg" : "") +
      tile("Avg risk", s.risk == null ? "—" : s.risk.toFixed(2) + "%", "", "stop distance");

    drawCurve(w, s);
    renderFunnel(w);
    renderExits(w.trades);
    renderTickers(w);
    renderTrades(w.trades.concat(w.open));

    var notes = [];
    if (WIN > S_LEN()) notes.push("Only " + Math.round(S_LEN() / 252 * 10) / 10 + " years of daily bars came back from the data plan, so this window shows all of them.");
    if (WIN >= 1260) notes.push("The first ten months or so of the five years are warm-up: the 200-day average and the first full cup need that much history, so trades can only start after it.");
    if (s.n && s.n < 20) notes.push("Small sample: " + s.n + " trade" + (s.n === 1 ? "" : "s") + ". Read it as a sketch, not an edge.");
    (DATA.missing || []).forEach(function (m) {
      notes.push(m.sym + (m.stale ? " couldn't refresh on the last run; showing its previous results." : " has no data on the last run (" + esc(m.error) + ")."));
    });
    DATA.symbols.forEach(function (sym) {
      var c = w.cover[sym];
      if (c > 0 && c < w.n * 0.8) notes.push(sym + " has data for " + c + " of these " + w.n + " sessions.");
    });
    els.note.innerHTML = notes.map(function (x) { return "<li>" + x + "</li>"; }).join("");
    els.note.hidden = !notes.length;
  }

  function drawCurve(w, s) {
    var svg = els.curve.querySelector("svg"), cap = els.curve.querySelector("figcaption");
    var W = Math.max(300, Math.round(els.curve.clientWidth || 800)), H = W < 560 ? 200 : 240;
    var L = 48, R = 14, T = 16, B = 28;
    var pts = s.curve, n = pts.length - 1;
    var lo = Math.min.apply(null, pts.concat([0])), hi = Math.max.apply(null, pts.concat([0]));
    if (hi - lo < 2) { hi += 1; lo -= 1; }
    var step = niceStep((hi - lo) / 4);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    var x = function (i) { return L + (n ? (i / n) * (W - L - R) : (W - L - R) / 2); };
    var y = function (v) { return T + (hi - v) / (hi - lo) * (H - T - B); };
    var g = "";
    for (var v = lo; v <= hi + 1e-9; v += step) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="' + (Math.abs(v) < 1e-9 ? "z" : "gl") + '"/>' +
           '<text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(+v.toFixed(2)) + "R</text>";
    }
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p).toFixed(1); }).join(" ");
    var area = line + " L" + x(n).toFixed(1) + " " + y(0).toFixed(1) + " L" + x(0).toFixed(1) + " " + y(0).toFixed(1) + " Z";
    var col = s.total >= 0 ? "up" : "dn";
    var dots = w.trades.map(function (t, i) {
      return '<circle cx="' + x(i + 1).toFixed(1) + '" cy="' + y(pts[i + 1]).toFixed(1) + '" r="' + (n > 60 ? 2 : 3) + '" class="' + (t.r > 0 ? "up" : "dn") + '"><title>' +
        day(t.d) + " · " + t.sym + " · " + rr(t.r) + "</title></circle>";
    }).join("");
    var xl = n ? '<text x="' + L + '" y="' + (H - 8) + '">' + day(w.trades[0].d) + '</text><text x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end">' + day(w.trades[n - 1].d) + "</text>" : "";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.innerHTML = g + (n ? '<path d="' + area + '" class="ar ' + col + '"/><path d="' + line + '" class="ln ' + col + '"/>' + dots : '<text x="' + W / 2 + '" y="' + H / 2 + '" text-anchor="middle">No trades in this window</text>') + xl;
    cap.textContent = n ? "Equity in R, one point per trade, " + day(w.from) + " – " + day(w.to) + "." : "";
  }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  function renderFunnel(w) {
    var f = w.f, left = f.all, rows = [];
    rows.push(["Cup-and-handle shapes that broke out", left, ""]);
    left -= f.u; rows.push(["In an uptrend (above 20/50/200, 50 rising)", left, f.u]);
    left -= f.b; rows.push(["Volume tapered into the base", left, f.b]);
    left -= f.h; rows.push(["Handle volume under its average", left, f.h]);
    left -= f.a; rows.push(["Clean air up to target 1", left, f.a]);
    left -= f.m; rows.push(["SPY above its 50 and 200-day", left, f.m]);
    left -= f.g; rows.push(["Didn't gap past target 1 (the trades)", left, f.g]);
    var max = Math.max(1, f.all);
    els.funnel.innerHTML = rows.map(function (r) {
      return '<li><div class="bt-fl"><span>' + r[0] + '</span><b>' + r[1].toLocaleString() + "</b></div>" +
        '<div class="bt-fb"><i style="width:' + Math.max(r[1] ? 0.6 : 0, r[1] / max * 100) + '%"></i></div>' +
        (r[2] !== "" ? '<small>' + (r[2] ? "−" + r[2].toLocaleString() + " dropped here" : "none dropped") + "</small>" : "") + "</li>";
    }).join("");
  }

  function renderExits(trades) {
    var by = { t2: [], be: [], stop: [], time: [] }, held = 0;
    trades.forEach(function (t) { (by[t.why] = by[t.why] || []).push(t.r); held += t.days; });
    var n = Math.max(1, trades.length);
    var tm = KIT.time();
    WHY.time = (tm ? (tm[0] === "p" ? 60 : tm[0]) : 60) + "-day time stop";
    els.exits.innerHTML = ["t2", "be", "target", "stop", "time"].filter(function (k) { return (by[k] && by[k].length) || k === "stop" || (KIT.target() && KIT.target()[0] !== "p" ? k === "target" : k === "t2" || k === "be"); }).map(function (k) {
      var a = by[k] || [], avg = a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null;
      return '<li><div class="bt-fl"><span>' + WHY[k] + '</span><b>' + a.length + "</b></div>" +
        '<div class="bt-fb ' + k + '"><i style="width:' + (a.length / n * 100) + '%"></i></div>' +
        "<small>" + (avg == null ? "—" : "avg " + rr(avg)) + "</small></li>";
    }).join("") + '<li class="bt-trimmed">Average hold <b>' + (trades.length ? Math.round(held / trades.length) : 0) + "</b> trading days.</li>";
  }

  function renderTickers(w) {
    var rows = DATA.symbols.map(function (sym) {
      var ts = w.trades.filter(function (t) { return t.sym === sym; }), s = stats(ts);
      return { sym: sym, n: s.n, win: s.win, total: s.total, cover: w.cover[sym] };
    }).sort(function (a, b) { return b.total - a.total || b.n - a.n || (a.sym < b.sym ? -1 : 1); });
    els.tick.innerHTML = "<thead><tr><th>Ticker</th><th>Trades</th><th>Win</th><th>Total</th></tr></thead><tbody>" +
      rows.map(function (r) {
        return "<tr><td>" + r.sym + "</td><td>" + (r.cover ? r.n : "—") + "</td><td>" + (r.n ? Math.round(r.win * 100) + "%" : "—") +
          '</td><td class="' + sign(r.total) + '">' + (r.n ? rr(r.total) : "—") + "</td></tr>";
      }).join("") + "</tbody>";
  }

  function renderTrades(trades) {
    var all = trades.slice().reverse(), list = SHOW_ALL ? all : all.slice(0, SHOW_N);
    els.trades.innerHTML = "<thead><tr><th>Entry</th><th>Ticker</th><th>Fill</th><th>Stop</th><th>Targets</th><th>Risk</th><th>Cup</th><th>Handle</th><th>Exit</th><th>R</th></tr></thead><tbody>" +
      (list.length ? list.map(function (t, i) {
        return '<tr tabindex="0" data-i="' + (trades.length - 1 - i) + '" title="Show ' + t.sym + " from " + day(t.ld) + ' on daily bars">' +
          "<td>" + day(t.d) + "</td><td><b>" + t.sym + "</b></td>" +
          "<td>" + px(t.e) + "</td><td>" + px(t.s) + "</td><td>" + tgtCell(t) + "</td><td>" + t.rp.toFixed(1) + "%</td>" +
          "<td>" + t.cup + "d · " + t.dp + "%</td><td>" + t.hd + "d</td>" +
          "<td>" + day(t.xd) + " · " + px(t.x) + ' <small>' + WHY[t.why] + "</small></td>" +
          '<td class="' + sign(t.r) + '">' + rr(t.r) + "</td></tr>";
      }).join("") : '<tr><td colspan="10" class="bt-empty">No trades in this window.</td></tr>') + "</tbody>";
    els.more.hidden = all.length <= SHOW_N;
    els.more.textContent = SHOW_ALL ? "Show the latest " + SHOW_N : "Show all " + all.length + " trades";
    els.trades._list = trades;
  }

  function kTarget(t) { var tg = KIT.target(); return tg && tg[0] !== "p" ? t.e + tg[0] * (t.e - t.s) : null; }
  function tgtCell(t) { var k = kTarget(t); return k == null ? px(t.t1) + " · " + px(t.t2) : px(k) + " <small>" + KIT.target()[1] + "</small>"; }

  function replay(tr) {
    var t = els.trades._list && els.trades._list[+tr.getAttribute("data-i")];
    if (!t) return;
    showTrade(t);
  }


  /* ---------- one trade on daily bars ---------- */
  var tc = null;
  function addDays(d, k) { var p = d.split("-"), t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) + k * 864e5); return t.toISOString().slice(0, 10); }
  function showTrade(t) {
    var box = els.chart;
    box.hidden = false;
    box.innerHTML = '<div class="bt-chart-head"><b>' + t.sym + "</b> · cup " + day(t.ld) + " – " + day(t.rd) + ", " + t.cup + " days, " + t.dp + "% deep · handle " + t.hd + " days · entry " + day(t.d) +
      ' <button type="button" class="pill bt-chart-close">Close</button></div><div class="bt-chart-box"><div class="bt-chart-msg">Loading daily bars…</div></div>' +
      '<p class="bt-chart-note">Daily bars from Massive. Orange: resistance and the cup low. Blue: the buy stop. Red: the stop. Green: the two targets.</p>';
    box.querySelector(".bt-chart-close").onclick = function () { box.hidden = true; if (tc) { tc.remove(); tc = null; } };
    box.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    var tok = token(), from = addDays(t.ld, -45), to = addDays(t.xd, 20);
    fetch("/api/bars.php?symbol=" + encodeURIComponent(t.sym) + "&span=day&from=" + from + "&to=" + to + (tok ? "&preview=" + encodeURIComponent(tok) : ""), { cache: "no-store" })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        var holder = box.querySelector(".bt-chart-box");
        if (!res.ok || !res.body.bars) {
          var e = res.body && res.body.error;
          holder.innerHTML = '<div class="bt-chart-msg">' + (e === "symbol_not_allowed" ? t.sym + " isn't on the allowed list in api/config.php. Use '*' to allow any ticker." : "Couldn't load daily bars right now.") + "</div>";
          return;
        }
        if (typeof LightweightCharts === "undefined") { holder.innerHTML = '<div class="bt-chart-msg">Chart library didn’t load.</div>'; return; }
        holder.innerHTML = "";
        if (tc) { tc.remove(); tc = null; }
        tc = LightweightCharts.createChart(holder, {
          autoSize: true,
          layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
          grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
          rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.22 } },
          timeScale: { borderVisible: false, rightOffset: 4 }, crosshair: { mode: 0 }
        });
        var fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
        var bars = res.body.bars.map(function (a) { return { time: fmt.format(new Date(a[0])), open: a[1], high: a[2], low: a[3], close: a[4], v: a[5] }; });
        var cs = tc.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
        cs.setData(bars);
        var vs = tc.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
        tc.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        vs.setData(bars.map(function (b) { return { time: b.time, value: b.v, color: b.time === t.d ? "rgba(255,214,10,0.8)" : "rgba(142,142,147,0.35)" }; }));
        function seg(t0, t1, p, color, style, title) {
          var s = tc.addLineSeries({ color: color, lineWidth: 1.5, lineStyle: style, title: title, priceLineVisible: false, lastValueVisible: !!title, crosshairMarkerVisible: false });
          s.setData([{ time: t0, value: p }, { time: t1, value: p }]);
        }
        seg(t.ld, t.d, t.res, "#ff9f0a", 0, "Resistance");
        seg(t.ld, t.rd, t.cl, "#ff9f0a", 2, "Cup low");
        seg(t.d, t.xd, t.e, "#2997ff", 0, "Fill");
        seg(t.d, t.xd, t.s, "#ff453a", 2, "Stop");
        if (kTarget(t) != null) seg(t.d, t.xd, kTarget(t), "#30d158", 0, "Target");
        else { seg(t.d, t.xd, t.t1, "#30d158", 0, "T1"); seg(t.d, t.xd, t.t2, "#30d158", 0, "T2"); }
        var mk = [
          { time: t.ld, position: "aboveBar", shape: "circle", color: "#ff9f0a", text: "Left rim" },
          { time: t.bd, position: "belowBar", shape: "circle", color: "#ff9f0a", text: "Cup low" },
          { time: t.rd, position: "aboveBar", shape: "circle", color: "#ff9f0a", text: "Right rim" },
          { time: t.d, position: "belowBar", shape: "arrowUp", color: "#2997ff", text: "Buy " + px(t.e) },
          { time: t.xd, position: "aboveBar", shape: "arrowDown", color: t.r > 0 ? "#30d158" : "#ff6961", text: (t.why === "open" ? "Open " : "Exit ") + rr(t.r) }
        ].filter(function (m, k, a) { return bars.some(function (b) { return b.time === m.time; }); });
        mk.sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
        cs.setMarkers(mk);
        tc.timeScale().fitContent();
      }).catch(function () { box.querySelector(".bt-chart-box").innerHTML = '<div class="bt-chart-msg">Couldn’t load daily bars right now.</div>'; });
  }

  /* ---------- controls ---------- */
  els.seg.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-w]"); if (!b) return;
    WIN = +b.getAttribute("data-w");
    try { localStorage.setItem("cup_bt_win", WIN); } catch (x) {}
    if (DATA) render();
  });
  els.rebuild.addEventListener("click", function () { build(true); });
  els.more.addEventListener("click", function () { SHOW_ALL = !SHOW_ALL; if (DATA) { var w = slice(); renderTrades(w.trades.concat(w.open)); } });
  els.trades.addEventListener("click", function (e) { var tr = e.target.closest("tr[data-i]"); if (tr) replay(tr); });
  els.trades.addEventListener("keydown", function (e) { if (e.key !== "Enter") return; var tr = e.target.closest("tr[data-i]"); if (tr) replay(tr); });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (DATA) drawCurve(slice(), stats(slice().trades)); }, 150); });

  load();
})();
