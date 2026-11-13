/* =====================================================================
   crt-backtest.js — renders the Three-Candle CRT backtest saved by
   /api/crt-backtest.php (built nightly on the server; the Massive key
   never reaches the browser). Same private preview token as the live
   charts.

   Mount: <section data-crt-bt>…</section>
   ===================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-crt-bt]");
  if (!root) return;
  var API = "/api/crt-backtest.php";
  var els = {
    gate: root.querySelector(".bt-gate"), body: root.querySelector(".bt-body"),
    seg: root.querySelector(".bt-win"), side: root.querySelector(".bt-side"), wnd: root.querySelector(".bt-wnd"),
    built: root.querySelector(".bt-built"), rebuild: root.querySelector(".bt-rebuild"),
    stats: root.querySelector(".bt-stats"), curve: root.querySelector(".bt-curve"),
    funnel: root.querySelector(".bt-funnel"), exits: root.querySelector(".bt-exits"),
    tick: root.querySelector(".bt-tick"), trades: root.querySelector(".bt-trades"),
    note: root.querySelector(".bt-note"), more: root.querySelector(".bt-more")
  };
  var DATA = null, WIN = 90, SIDE = "B", WND = "AB", SHOW_ALL = false, SHOW_N = 15;   // WND: the CRT candle, AB = all
  var KIT = BTKit.setup(root, { key: "crt", tfs: [1, 2, 5, 15], onChange: function (what) {
    if (what === "tf") { DATA = null; setGate("<b>Loading the " + KIT.tf + "-minute backtest&hellip;</b>"); load(); } else if (DATA) render();
  } });
  try {
    WIN = +localStorage.getItem("crt_bt_win") || 90; SIDE = localStorage.getItem("crt_bt_side") || "B";
    WND = localStorage.getItem("crt_bt_wnd") || "AB";
  } catch (e) {}

  function token() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }
  function get(qs) {
    var tok = token();
    return fetch(API + "?" + qs + "&tf=" + KIT.tf + (tok ? "&preview=" + encodeURIComponent(tok) : ""), { cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok, status: r.status, body: b }; }); });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function clock(min) { var h = Math.floor(min / 60), m = min % 60; return (h > 12 ? h - 12 : h) + ":" + (m < 10 ? "0" : "") + m; }
  function px(x) { return x == null ? "—" : x.toFixed(2); }
  function rr(x, plus) { return (plus !== false && x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(2) + "R"; }
  function sign(x) { return x > 0 ? "pos" : x < 0 ? "neg" : ""; }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function day(d) { var p = d.split("-"); return MON[+p[1] - 1] + " " + (+p[2]); }
  var WHY = { target: "Target", stop: "Stop", time: "Flat at 4:00" };
  var TFN = { 15: "15m", 30: "30m", 60: "1H" };

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
      if (res.ok && res.body && res.body.sessions) { DATA = res.body; KIT.setExits(DATA); render(); return; }
      if (e === "private") setGate("<b>Backtest in private preview.</b><span>Open this page once with your preview link to unlock it in this browser.</span>");
      else if (e === "not_configured") setGate("<b>Backtest not configured yet.</b><span>It uses the same <code>api/config.php</code> as the live chart.</span>");
      else if (e === "not_built") setGate("<b>No " + KIT.tf + "-minute backtest yet.</b><span>The first run fetches about four months of of " + KIT.tf + "-minute bars for 16 tickers. It takes a minute or two. After that the nightly job keeps it current.</span>", "Run the backtest");
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
    progress(null, "Fetching " + KIT.tf + "-minute bars…");
    step(!!fresh);
  }
  function progress(p, msg) {
    var pct = p ? Math.round(p.done / Math.max(1, p.total) * 100) : 0;
    var text = msg || (p ? "Running… " + p.done + " of " + p.total + " tickers" : "Running…");
    if (DATA) { els.built.textContent = text; return; }
    setGate('<b>' + text + '</b><span class="bt-prog"><i style="width:' + pct + '%"></i></span>');
  }

  /* ---------- the numbers for one lookback ---------- */
  function slice() {
    var S = DATA.sessions, n = Math.min(WIN, S.length), from = S.length - n;
    var inWin = {};
    for (var i = from; i < S.length; i++) inWin[S[i]] = true;
    function sideOk(sd) { return SIDE === "B" || sd === SIDE; }
    function tfOk(tf) { return WND === "AB" || String(tf) === WND; }
    var trades = DATA.trades.filter(function (t) { return inWin[t.d] && sideOk(t.side) && tfOk(t.tf); }).map(KIT.view);
    /* setups: [sym, date, minute armed, CRT tf, side, code] */
    var f = { all: 0 };
    DATA.setups.forEach(function (g) {
      if (!inWin[g[1]] || !sideOk(g[4]) || !tfOk(g[3])) return;
      f.all++; f[g[5]] = (f[g[5]] || 0) + 1;
    });
    var cover = {};
    DATA.symbols.forEach(function (s) {
      var row = (DATA.cover && DATA.cover[s]) || "", have = 0;
      for (var i = from; i < S.length; i++) if (row.charAt(i) === "1") have++;
      cover[s] = have;
    });
    return { n: n, from: S[from], to: S[S.length - 1], trades: trades, f: f, cover: cover };
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
  function pressed(seg, attr, val) {
    Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute(attr) === String(val))); });
  }
  function render() {
    els.gate.hidden = true; els.body.hidden = false;
    var built = new Date(DATA.built * 1000).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    if (!building) els.built.textContent = (DATA.tf || 1) + "-min bars · built " + built + " ET";
    pressed(els.seg, "data-w", WIN); pressed(els.side, "data-s", SIDE); pressed(els.wnd, "data-v", WND);

    var w = slice(), s = stats(w.trades);
    var tile = function (k, v, cls, sub) { return '<div><dt>' + k + '</dt><dd class="' + (cls || "") + '">' + v + "</dd>" + (sub ? "<small>" + sub + "</small>" : "") + "</div>"; };
    els.stats.innerHTML =
      tile("Trades", s.n, "", w.n + " sessions") +
      tile("Win rate", s.win == null ? "—" : Math.round(s.win * 100) + "%", "", beText()) +
      tile("Avg trade", s.avg == null ? "—" : rr(s.avg), sign(s.avg)) +
      tile("Total", s.n ? rr(s.total) : "—", sign(s.total)) +
      tile("Profit factor", s.pf == null ? "—" : s.pf === Infinity ? "∞" : s.pf.toFixed(2)) +
      tile("Max drawdown", s.n ? rr(-s.dd, false) : "—", s.dd > 0 ? "neg" : "") +
      tile("Avg risk", s.risk == null ? "—" : s.risk.toFixed(2) + "%", "", "stop distance");

    drawCurve(w, s);
    renderFunnel(w);
    renderExits(w.trades);
    renderTickers(w);
    renderTrades(w.trades);

    var notes = [];
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

  function exitNote() {
    if (KIT.isPage()) return "";
    return " Exit: " + KIT.target()[1] + ", time limit: " + KIT.time()[1].toLowerCase() + ".";
  }
  /* break-even win rate when every trade ends at its target or its stop */
  function beText() {
    var tg = KIT.target(), tm = KIT.time(), k = !tg || tg[0] === "p" ? 1.5 : tg[0];
    if (tm && tm[0] !== "p") return "";
    return "break-even is " + Math.round(100 / (1 + k)) + "%";
  }

  function drawCurve(w, s) {
    var svg = els.curve.querySelector("svg"), cap = els.curve.querySelector("figcaption");
    var W = Math.max(300, Math.round(els.curve.clientWidth || 800)), H = W < 560 ? 200 : 240;
    var L = 52, R = 14, T = 16, B = 28;
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
    var dots = n > 400 ? "" : w.trades.map(function (t, i) {
      return '<circle cx="' + x(i + 1).toFixed(1) + '" cy="' + y(pts[i + 1]).toFixed(1) + '" r="' + (n > 60 ? 2 : 3) + '" class="' + (t.r > 0 ? "up" : "dn") + '"><title>' +
        day(t.d) + " · " + t.sym + " " + (t.side === "L" ? "long" : "short") + " · " + rr(t.r) + "</title></circle>";
    }).join("");
    var xl = n ? '<text x="' + L + '" y="' + (H - 8) + '">' + day(w.trades[0].d) + '</text><text x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end">' + day(w.trades[n - 1].d) + "</text>" : "";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.innerHTML = g + (n ? '<path d="' + area + '" class="ar ' + col + '"/><path d="' + line + '" class="ln ' + col + '"/>' + dots : '<text x="' + W / 2 + '" y="' + H / 2 + '" text-anchor="middle">No trades in this window</text>') + xl;
    cap.textContent = n ? "Equity in R, one point per trade, " + day(w.from) + " – " + day(w.to) + "." + exitNote() : "";
  }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  function renderFunnel(w) {
    var f = w.f, left = f.all, rows = [];
    function g(k) { return f[k] || 0; }
    rows.push(["CRT setups armed (C2 swept C1, with the bias)", left, ""]);
    left -= g("e"); rows.push(["The level broke before the next candle closed", left, g("e")]);
    left -= g("c"); rows.push(["…without trading through the stop first", left, g("c")]);
    left -= g("n") + g("o"); rows.push(["…and broke again after a close back inside", left, g("n") + g("o")]);
    left -= g("a") + g("l") + g("w"); rows.push(["…in the window, the session's first trade", left, g("a") + g("l") + g("w")]);
    left -= g("r"); rows.push(["…with room left to the target (the trades)", left, g("r")]);
    var max = Math.max(1, f.all);
    els.funnel.innerHTML = rows.map(function (r) {
      return '<li><div class="bt-fl"><span>' + r[0] + '</span><b>' + r[1].toLocaleString() + "</b></div>" +
        '<div class="bt-fb"><i style="width:' + Math.max(r[1] ? 0.6 : 0, r[1] / max * 100) + '%"></i></div>' +
        (r[2] !== "" ? '<small>' + (r[2] ? "−" + r[2].toLocaleString() + " dropped here" : "none dropped") + "</small>" : "") + "</li>";
    }).join("");
  }

  function renderExits(trades) {
    var by = {};
    trades.forEach(function (t) { (by[t.why] = by[t.why] || []).push(t.r); });
    var tm = KIT.time();
    WHY.time = !tm || tm[0] === "p" ? "Flat at 4:00" : "Time limit";
    var n = Math.max(1, trades.length);
    var per = [15, 30, 60].map(function (tf) { var st = stats(trades.filter(function (t) { return t.tf === tf; })); return TFN[tf] + ": <b>" + st.n + "</b>" + (st.n ? " (" + Math.round(st.win * 100) + "% won, " + rr(st.total) + ")" : ""); });
    els.exits.innerHTML = Object.keys(WHY).map(function (k) {
      var a = by[k] || [], avg = a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null;
      return '<li><div class="bt-fl"><span>' + WHY[k] + '</span><b>' + a.length + "</b></div>" +
        '<div class="bt-fb ' + k + '"><i style="width:' + (a.length / n * 100) + '%"></i></div>' +
        "<small>" + (avg == null ? "—" : "avg " + rr(avg)) + "</small></li>";
    }).join("") + '<li class="bt-trimmed">By CRT candle · ' + per.join(" · ") + ".</li>";
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
    var all = trades.slice().reverse(), list = SHOW_ALL ? all : all.slice(0, SHOW_N), tg = KIT.target();
    function tgt(t) { if (!tg || tg[0] === "p") return px(t.tp); var R = Math.abs(t.e - t.sl); return px(t.side === "L" ? t.e + tg[0] * R : t.e - tg[0] * R) + " <small>" + tg[1] + "</small>"; }
    els.trades.innerHTML = "<thead><tr><th>Date</th><th>Ticker</th><th>CRT</th><th>Bias</th><th>Entry</th><th>Stop</th><th>Target</th><th>Risk</th><th>Exit</th><th>R</th></tr></thead><tbody>" +
      (list.length ? list.map(function (t, i) {
        return '<tr tabindex="0" data-i="' + (trades.length - 1 - i) + '" title="Replay ' + t.sym + " on " + day(t.d) + ' in the live chart">' +
          "<td>" + day(t.d) + "</td><td><b>" + t.sym + "</b></td>" +
          '<td class="' + (t.side === "L" ? "pos" : "neg") + '">' + TFN[t.tf] + (t.side === "L" ? " long" : " short") + "</td>" +
          "<td>" + (t.bias === 1 ? "bull" : t.bias === -1 ? "bear" : "none") + "</td>" +
          "<td>" + clock(t.m) + " · " + px(t.e) + "</td><td>" + px(t.sl) + "</td><td>" + tgt(t) + "</td><td>" + t.rp.toFixed(2) + "%</td>" +
          "<td>" + clock(t.xm) + " · " + px(t.x) + ' <small>' + WHY[t.why] + "</small></td>" +
          '<td class="' + sign(t.r) + '">' + rr(t.r) + "</td></tr>";
      }).join("") : '<tr><td colspan="10" class="bt-empty">No trades in this window.</td></tr>') + "</tbody>";
    els.more.hidden = all.length <= SHOW_N;
    els.more.textContent = SHOW_ALL ? "Show the latest " + SHOW_N : "Show all " + all.length + " trades";
    els.trades._list = trades;
  }

  function replay(tr) {
    var t = els.trades._list && els.trades._list[+tr.getAttribute("data-i")];
    if (!t || !window.CRTLive) return;
    window.CRTLive.replay(t.sym, t.d, t, KIT.tf);
    var live = document.querySelector("[data-crt-live]");
    if (live) live.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  /* ---------- controls ---------- */
  function seg(el, attr, key, set) {
    el.addEventListener("click", function (e) {
      var b = e.target.closest("button[" + attr + "]"); if (!b) return;
      set(b.getAttribute(attr));
      try { localStorage.setItem(key, b.getAttribute(attr)); } catch (x) {}
      if (DATA) render();
    });
  }
  seg(els.seg, "data-w", "crt_bt_win", function (v) { WIN = +v; });
  seg(els.side, "data-s", "crt_bt_side", function (v) { SIDE = v; });
  seg(els.wnd, "data-v", "crt_bt_wnd", function (v) { WND = v; });
  els.rebuild.addEventListener("click", function () { build(true); });
  els.more.addEventListener("click", function () { SHOW_ALL = !SHOW_ALL; if (DATA) renderTrades(slice().trades); });
  els.trades.addEventListener("click", function (e) { var tr = e.target.closest("tr[data-i]"); if (tr) replay(tr); });
  els.trades.addEventListener("keydown", function (e) { if (e.key !== "Enter") return; var tr = e.target.closest("tr[data-i]"); if (tr) replay(tr); });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (DATA) drawCurve(slice(), stats(slice().trades)); }, 150); });

  load();
})();
