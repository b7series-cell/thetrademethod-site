/* =====================================================================
   of-anim.js — the animated walkthroughs on order-flow.html.

     [data-of-anim="inside"]      a candle opened up into a footprint: bid x ask, HVN, delta
     [data-of-anim="four"]        the four things to read: large orders, clusters, delta, imbalances
     [data-of-anim="level"]       order flow as confirmation at a volume profile POC
     [data-of-anim="absorption"]  the absorption setup: 514 at the bid, 1,025 at the ask, long
     [data-of-anim="confirm"]     four confirmations at a level
     [data-of-steps]              the beginner action plan, as a click-through stepper

   Same player as drs-anim.js / gbf-anim.js: each chart redraws in a
   narrow layout on a phone instead of scrolling sideways, and on a phone
   the callouts sit in a band above the chart so they never cover the
   footprints. On desktop they sit in a column to the right.

   Every footprint and bar is made up, labelled "Illustrative". No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#64d2ff", gold: "#f4b942", orange: "#ff9f0a", grey: "#8e8e93",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e" };
  var NARROW_BELOW = 640;
  var FS = 1;

  /* ---------- shared drawing helpers ---------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function ease(v) { v = clamp01(v); return v * v * (3 - 2 * v); }
  function lerp(a, b, m) { return a + (b - a) * m; }
  function win(T, a, b) { return fade(T, a, 0.4) * (b != null ? 1 - fade(T, b, 0.3) : 1); }
  function txt(x, y, s, col, size, anchor, weight, op) {
    if (op != null && op <= 0) return "";
    return '<text x="' + (+x).toFixed(1) + '" y="' + (+y).toFixed(1) + '" fill="' + col + '" font-size="' + ((size || 13) * FS).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  /* footprint numbers: a fixed size, not scaled up on a phone (the cells are sized for them) */
  function num(x, y, s, col, size, anchor, weight, op) {
    if (op != null && op <= 0) return "";
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + size.toFixed(1) + '" text-anchor="' + (anchor || "start") + '" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  function line(x1, y1, x2, y2, col, w, dash, op) {
    if (op != null && op <= 0) return "";
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function rect(x, y, w, h, col, rx, op) {
    if (w <= 0 || h <= 0 || (op != null && op <= 0)) return "";
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + (rx || 0) + '" fill="' + col + '"' +
      (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function frameRect(x, y, w, h, col, sw, op, rx) {
    if (op <= 0) return "";
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + (rx == null ? 3 : rx) + '" fill="none" stroke="' + col + '" stroke-width="' + (sw || 2) + '" opacity="' + op.toFixed(3) + '"/>';
  }
  function callout(x, y, lines, col, op, right) {
    if (op <= 0) return "";
    var w = 18 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z]+;/g, "x").length; })) * 7.3 * FS, h = 10 + lines.length * 18 * FS;
    var x0 = right ? x - w : x;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt(x0 + 10, y + 21 * FS + k * 18 * FS, ln, k === 0 ? col : C.dim, 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  /* desktop: in the column right of the chart. phone: in the band above the chart */
  function note(g, lines, col, op, wy) { return g.n ? callout(14, 36, lines, col, op) : callout(g.nx, wy == null ? g.y0 : wy, lines, col, op); }
  function pill(x, y, s, col, op, anchor) {
    if (op <= 0) return "";
    var w = s.length * 7.2 * FS + 18, h = 22 * FS, xa = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xa.toFixed(1) + '" y="' + (y - h + 6).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + (h / 2).toFixed(1) + '" fill="' + col + '"/>' +
      txt(xa + w / 2, y - 1, s, "#000", 12, "middle", 700) + "</g>";
  }
  function tag(x, y, s, col, op, anchor) {
    if (op <= 0) return "";
    var w = s.replace(/&[a-z]+;/g, "x").length * 6.9 * FS + 14, h = 19 * FS, xa = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xa.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="6" fill="' + C.bg + '" fill-opacity="0.92" stroke="' + col + '" stroke-opacity="0.5"/>' +
      txt(xa + w / 2, y + 4 * FS, s, col, 12, "middle", 700) + "</g>";
  }
  function candle(x, yf, b, prog, wBody, op) {
    if (prog <= 0) return "";
    var o = b[0], h = b[1], l = b[2], c = b[3];
    var pth = c >= o ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = prog >= 1 ? c : pth[idx] + (pth[idx + 1] - pth[idx]) * f;
    var hi = o, lo = o;
    for (var k = 0; k <= idx; k++) { hi = Math.max(hi, pth[k]); lo = Math.min(lo, pth[k]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var col = cur >= o ? C.up : C.dn, top = yf(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + yf(hi).toFixed(1) + '" y2="' + yf(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.3"/>' +
      '<rect x="' + (x - wBody / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wBody.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }

  /* ---------- the player: captions, chips, play / replay, autoplay on view, responsive layout ---------- */
  function player(root, spec) {
    var svg = root.querySelector("svg");
    var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
    var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay"), chips = root.querySelector(".anim-chips");
    var box = root.querySelector(".anim-scroll") || svg.parentNode;
    var ST = spec.stages, END = spec.end, T = END, playing = false, lastNow = 0, raf = 0, shown = -1, L = null;
    function layout() {
      var narrow = box.clientWidth > 0 && box.clientWidth < NARROW_BELOW;
      if (L && L.narrow === narrow) return false;
      L = spec.size(narrow); L.narrow = narrow;
      svg.setAttribute("viewBox", "0 0 " + L.W + " " + L.H);
      root.classList.toggle("is-narrow", narrow);
      return true;
    }
    function stageAt(t) { var k = 0; ST.forEach(function (s, i) { if (t >= s.at) k = i; }); return k; }
    function caption() {
      var k = stageAt(T);
      if (k === shown) return;
      shown = k;
      cap.n.textContent = (k + 1) + " / " + ST.length;
      cap.t.textContent = ST[k].title;
      cap.b.textContent = ST[k].text;
      chips.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-current", i === k ? "step" : "false"); });
    }
    function draw() { FS = L.narrow ? 1.18 : 1; svg.innerHTML = '<rect width="' + L.W + '" height="' + L.H + '" fill="' + C.bg + '"/>' + spec.frame(T, L); caption(); }
    function tick(now) {
      if (!playing) return;
      T += Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
      if (T >= END) { T = END; setPlaying(false); }
      draw();
      if (playing) raf = requestAnimationFrame(tick);
    }
    function setPlaying(on) {
      playing = on;
      btnPlay.textContent = on ? "Pause" : (T >= END ? "Play" : "Resume");
      btnPlay.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) { lastNow = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    }
    chips.innerHTML = ST.map(function (s, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + ". " + s.title + "</button>"; }).join("");
    btnPlay.addEventListener("click", function () { if (playing) { setPlaying(false); return; } if (T >= END) T = 0; setPlaying(true); });
    btnReplay.addEventListener("click", function () { T = 0; draw(); setPlaying(true); });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var k = +b.getAttribute("data-i");
      if (REDUCED) { T = k + 1 < ST.length ? ST[k + 1].at - 0.01 : END; draw(); return; }
      T = ST[k].at; draw(); setPlaying(true);
    });
    layout(); draw();
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (layout()) draw(); }, 120); });
    if (!REDUCED && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); T = 0; draw(); setPlaying(true); }
      }, { threshold: 0.35 });
      io.observe(svg.parentNode || svg);
    }
  }

  /* ---------- seeded randomness, so every replay draws the same footprints ---------- */
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- prices: a made-up index future in quarter-point ticks ---------- */
  var BASE = 5400, TICK = 0.25;
  function px(t) { return (BASE + t * TICK).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function sgn(v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v)).toLocaleString("en-US"); }

  /* ---------- a footprint: per price tick, [contracts at the bid, contracts at the ask] ---------- */
  function finish(f) {
    var d = 0, mx = 0, hv = f.lo;
    f.imb = {};
    for (var t = f.lo; t <= f.hi; t++) {
      var q = f.cells[t];
      d += q[1] - q[0];
      if (q[0] + q[1] > mx) { mx = q[0] + q[1]; hv = t; }
      if (q[0] >= 3 * q[1] && q[0] >= 20) f.imb[t] = "bid";
      else if (q[1] >= 3 * q[0] && q[1] >= 20) f.imb[t] = "ask";
    }
    f.delta = d; f.hvn = hv; f.max = mx;
    return f;
  }
  /* o/c/lo/hi in ticks; opt.vol = average contracts per cell, opt.bias = share at the ask, opt.set = exact cells */
  function fp(o, c, lo, hi, seed, opt) {
    opt = opt || {};
    var R = rng(seed), cells = {}, vol = opt.vol || 60, bias = opt.bias != null ? opt.bias : (c > o ? 0.58 : c < o ? 0.42 : 0.5);
    var mid = opt.peak != null ? opt.peak : (o + c) / 2, half = Math.max(1, (hi - lo) / 2);
    for (var t = lo; t <= hi; t++) {
      var d = Math.min(1, Math.abs(t - mid) / half);
      var v = vol * (1.2 - 0.75 * d) * (0.7 + 0.6 * R());
      var a = Math.max(0.3, Math.min(0.7, bias + (R() - 0.5) * 0.22));
      cells[t] = [Math.max(1, Math.round(v * (1 - a))), Math.max(1, Math.round(v * a))];
    }
    if (opt.set) Object.keys(opt.set).forEach(function (k) { cells[k] = opt.set[k]; });
    return finish({ o: o, c: c, lo: lo, hi: hi, cells: cells });
  }

  /* draw one footprint centred on X. o: { mode "ba" | "vol", hvn, imb, delta (opacities), deltaY, maxVol, fs, rowOp(t), mark(t) } */
  function drawFP(f, X, w, Y, rh, prog, o) {
    if (prog <= 0) return "";
    o = o || {};
    var s = "", k = ease(prog), fs = o.fs || Math.min(11, rh * 0.66), x0 = X - w / 2, maxV = o.maxVol || f.max;
    var col = f.c >= f.o ? C.up : C.dn, cx = x0 - 5;
    s += line(cx, Y(f.hi) - rh / 2 + 2, cx, Y(f.lo) + rh / 2 - 2, col, 1.3, null, k);
    s += rect(cx - 2.5, Y(Math.max(f.o, f.c)) - rh / 2 + 1, 5, Math.max(2, (Math.abs(f.c - f.o) + 1) * rh - 2), col, 1, k);
    var volOp = o.vol || 0;
    for (var t = f.lo; t <= f.hi; t++) {
      var q = f.cells[t], rk = o.rowProg ? o.rowProg(t) : k;
      if (rk <= 0) continue;
      var y = Y(t) - rh / 2, tot = q[0] + q[1], share = Math.min(1, tot / maxV), m = o.rowOp ? o.rowOp(t) : 1;
      /* bid x ask cell, tinted by who traded more there, fades into a grey volume cell */
      var tint = q[1] >= q[0] ? C.up : C.dn;
      s += rect(x0, y + 0.5, w, rh - 1, tint, 2, (0.08 + 0.36 * share) * m * rk * (1 - volOp));
      if (volOp > 0) { var gv = Math.round(46 + 170 * share * share); s += rect(x0, y + 0.5, w, rh - 1, "rgb(" + gv + "," + gv + "," + (gv + 4) + ")", 2, volOp * m * rk); }
      var b = Math.round(q[0] * rk), a = Math.round(q[1] * rk), ty = y + rh / 2 + fs * 0.36;
      var imbOp = o.imb || 0, ib = f.imb[t] === "bid" ? imbOp : 0, ia = f.imb[t] === "ask" ? imbOp : 0;
      var nop = m * Math.min(1, rk * 1.4) * (1 - volOp);
      if (nop > 0) {
        s += num(x0 + 3, ty, String(b), ib > 0.5 ? C.cyan : C.dim, fs, "start", ib > 0.5 ? 800 : null, nop);
        s += num(x0 + w - 3, ty, String(a), ia > 0.5 ? C.cyan : C.dim, fs, "end", ia > 0.5 ? 800 : null, nop);
      }
      if (volOp > 0) s += num(X, ty, String(Math.round(tot * rk)), share > 0.62 ? "#000" : C.dim, fs, "middle", share > 0.62 ? 800 : null, volOp * m * rk);
      if (o.mark && o.mark(t)) s += frameRect(x0 - 1, y, w + 2, rh, o.mark(t), 2, k);
    }
    if (o.hvn > 0) s += frameRect(x0 - 1.5, Y(f.hvn) - rh / 2 - 0.5, w + 3, rh + 1, C.gold, 2.2, o.hvn * k);
    if (o.delta > 0) s += txt(X, o.deltaY, sgn(f.delta * k), f.delta >= 0 ? C.up : C.dn, 13, "middle", 700, o.delta);
    return s;
  }

  /* ---------- a strip of footprints with a price axis ---------- */
  function strip(cfg) {
    var F = cfg.fps;
    function size(n) { return n ? { W: 440, H: cfg.nH || 800 } : { W: 1180, H: cfg.wH || 540 }; }
    function frame(T, L) {
      var n = L.narrow, s = "", skip = n ? (cfg.nSkip || 0) : 0, N = F.length - skip;
      var x0 = n ? 22 : 46, x1 = n ? 366 : 780, y0 = n ? (cfg.nTop || 240) : 58, y1 = L.H - (n ? 76 : 78);
      var slot = (x1 - x0) / N, w = slot * (n ? 0.8 : 0.7);
      var rows = cfg.hi - cfg.lo + 1, rh = (y1 - y0) / rows;
      function X(i) { return x0 + (i - skip + 0.5) * slot; }
      function Y(t) { return y1 - (t - cfg.lo + 0.5) * rh; }
      var every = cfg.every || 2;
      for (var t = cfg.lo; t <= cfg.hi; t++) {
        if ((t - cfg.lo) % every) continue;
        s += line(x0 - 8, Y(t), x1, Y(t), "rgba(255,255,255,0.04)", 1);
        s += txt(x1 + 6, Y(t) + 4, px(t), C.faint, 10.5);
      }
      s += txt(x0 - 8, n ? y0 - 22 : 32, cfg.title, C.faint, 12);
      var g = { T: T, n: n, L: L, X: X, Y: Y, x0: x0, x1: x1, y0: y0, y1: y1, rh: rh, w: w, slot: slot, deltaY: y1 + 28, nx: 872, fs: n ? Math.min(10.5, rh * 0.6) : Math.min(11, rh * 0.66) };
      s += txt(x1 + 6, g.deltaY, "delta", C.faint, 11, "start", null, cfg.deltaLabel ? cfg.deltaLabel(T) : 0);
      if (cfg.under) s += cfg.under(T, g);
      F.forEach(function (f, i) {
        if (i < skip) return;
        var prog = clamp01((T - cfg.at[i]) / (cfg.dur || 0.8));
        var o = cfg.look(T, i, g); o.deltaY = g.deltaY; if (!o.fs) o.fs = g.fs;
        s += drawFP(f, X(i), w, Y, rh, prog, o);
      });
      if (cfg.overlay) s += cfg.overlay(T, g);
      s += txt(L.W - 14, L.H - 8, "Illustrative · made-up footprints", C.faint, 11, "end");
      return s;
    }
    return { stages: cfg.stages, end: cfg.end, frame: frame, size: size };
  }
  /* a horizontal zone across the strip */
  function band(g, lo, hi, col, op, label, below) {
    if (op <= 0) return "";
    var ya = g.Y(hi) - g.rh / 2, yb = g.Y(lo) + g.rh / 2;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + (g.x0 - 10).toFixed(1) + '" y="' + ya.toFixed(1) + '" width="' + (g.x1 - g.x0 + 10).toFixed(1) + '" height="' + (yb - ya).toFixed(1) + '" fill="' + col + '" fill-opacity="0.13" stroke="' + col + '" stroke-opacity="0.55" stroke-dasharray="5 4"/></g>' +
      (label ? tag(g.x0 - 4, below ? yb + 14 * FS : ya - 12, label, col, op, "start") : "");
  }

  /* =====================================================================
     1. Inside the candle
     ===================================================================== */
  function insideSpec() {
    var F = finish({ o: 2, c: 9, lo: 0, hi: 11, cells: {
      11: [4, 9], 10: [18, 26], 9: [35, 48], 8: [52, 121], 7: [61, 88], 6: [96, 143],
      5: [70, 92], 4: [44, 58], 3: [38, 31], 2: [70, 22], 1: [24, 15], 0: [9, 6] } });
    var A = 0, B = 0;
    for (var t = F.lo; t <= F.hi; t++) { B += F.cells[t][0]; A += F.cells[t][1]; }
    var ST = [
      { at: 0, title: "A candle: four prices", text: "A normal candle tells you where it opened, where it closed, the high and the low. That's about it." },
      { at: 3.4, title: "Open it up", text: "A footprint shows every executed trade inside that candle, at each price: contracts that traded at the bid on the left, at the ask on the right." },
      { at: 7, title: "121 at the ask, 70 at the bid", text: "At this price 121 contracts traded at the ask. Lower down, 70 traded at the bid. Real, executed volume at every price level." },
      { at: 10.4, title: "Where the volume sat", text: "Add the two sides together and you see how the volume was spread inside the candle: heavy through the middle and upper half, thin at the edges. No other indicator shows you that." },
      { at: 13.6, title: "The high volume node", text: "The single busiest price in the footprint gets outlined. It's the most important place in that candle: where the big orders were." },
      { at: 16.6, title: "Delta", text: "Under the footprint: everything at the ask minus everything at the bid. Positive, so buyers were the aggressive side in this candle." }
    ];
    return {
      stages: ST, end: 21,
      size: function (n) { return n ? { W: 440, H: 740 } : { W: 1180, H: 540 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var y0 = n ? 226 : 66, y1 = L.H - (n ? 84 : 90), rows = 12, rh = (y1 - y0) / rows;
        function Y(t) { return y1 - (t + 0.5) * rh; }
        var cX = n ? 40 : 150, cW = n ? 22 : 46, axX = n ? 124 : 330, fX = n ? 226 : 470, fW = n ? 172 : 210, pX = n ? 318 : 590, pMax = n ? 72 : 150;
        var nx = 800;
        s += txt(n ? 14 : 60, n ? y0 - 40 : 34, "One made-up 30-minute candle on an index future", C.faint, 12);
        /* the candle */
        var cOp = 1 - 0.55 * fade(T, 3.4, 0.6);
        s += candle(cX, function (t) { return Y(t); }, [F.o, F.hi + 0.45, F.lo - 0.45, F.c], clamp01(T / 1.6), cW, cOp);
        var lo = fade(T, 1.6, 0.5) * (1 - fade(T, 3.4, 0.4));
        if (!n) {
          s += txt(cX + cW / 2 + 12, Y(F.hi) + 4, "High " + px(F.hi), C.dim, 13, "start", 600, lo);
          s += txt(cX + cW / 2 + 12, Y(F.c) + 4, "Close " + px(F.c), C.up, 13, "start", 600, lo);
          s += txt(cX + cW / 2 + 12, Y(F.o) + 4, "Open " + px(F.o), C.dim, 13, "start", 600, lo);
          s += txt(cX + cW / 2 + 12, Y(F.lo) + 4, "Low " + px(F.lo), C.dim, 13, "start", 600, lo);
        }
        /* price axis between candle and footprint */
        var ax = fade(T, 3.4, 0.5);
        for (var t = 0; t <= 11; t++) s += txt(axX, Y(t) + 4, px(t), C.faint, 10.5, "end", null, ax);
        /* column heads */
        s += txt(fX - fW / 2 + 4, y0 - 10, "BID", C.dn, 12, "start", 700, ax);
        s += txt(fX + fW / 2 - 4, y0 - 10, "ASK", C.up, 12, "end", 700, ax);
        /* the footprint, row by row from the low */
        s += drawFP(F, fX, fW, Y, rh, fade(T, 3.4, 0.3), {
          fs: n ? 13 : 13.5,
          rowProg: function (t) { return clamp01((T - 3.6 - t * 0.16) / 0.5); },
          rowOp: function (t) { var dimIt = win(T, 7, 10.4) * (t === 8 || t === 2 ? 0 : 0.6); return 1 - dimIt; },
          mark: function (t) { var w7 = win(T, 7.2, 10.4); return w7 > 0.5 ? (t === 8 ? C.up : t === 2 ? C.dn : null) : null; },
          hvn: fade(T, 13.6, 0.5), delta: fade(T, 16.6, 0.5), deltaY: y1 + 30
        });
        /* volume at each price, a mini profile beside the footprint */
        var pv = fade(T, 10.4, 0.6);
        if (pv > 0) {
          s += txt(pX, y0 - 10, "total", C.faint, 11, "start", null, pv);
          for (var r = 0; r <= 11; r++) {
            var q = F.cells[r], tot = q[0] + q[1], bw = pMax * tot / F.max * ease(pv);
            s += rect(pX, Y(r) - rh / 2 + 3, bw, rh - 6, r === F.hvn && T >= 13.6 ? C.gold : C.grey, 2, 0.55);
            if (!n || r === F.hvn) s += num(pX + bw + 5, Y(r) + 4, String(tot), C.faint, 11, "start", null, pv);
          }
        }
        /* callouts */
        var g = { n: n, nx: nx, y0: y0 };
        s += note(g, ["Four prices", "Open, high, low, close.", "Nothing about who traded", "or how much, at each price."], C.dim, win(T, 0.8, 3.4), y0);
        s += note(g, ["Bid · left column", "Market sells hit the bid", "(and resting limit buys fill).", "Ask · right column", "Market buys lift the ask."], C.blue, win(T, 3.8, 7), y0);
        s += note(g, ["Real executed volume", "121 contracts at the ask", "at " + px(8) + ".", "70 contracts at the bid", "at " + px(2) + "."], C.up, win(T, 7.2, 10.4), y0);
        s += note(g, ["Volume at each price", "Bid + ask, per row.", "Busy in the middle and", "upper half, thin at the edges."], C.grey, win(T, 10.6, 13.6), y0);
        s += note(g, ["High volume node", (F.cells[F.hvn][0] + F.cells[F.hvn][1]) + " contracts at " + px(F.hvn) + ".", "The busiest price in this", "footprint: big orders sat here."], C.gold, win(T, 13.8, 16.6), y0);
        s += note(g, ["Delta = ask − bid", A + " at the ask − " + B + " at the bid", "= " + sgn(A - B) + ". Buyers were", "the aggressive side."], C.up, fade(T, 16.8, 0.4), y0);
        s += txt(L.W - 14, L.H - 8, "Illustrative · made-up footprint", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* =====================================================================
     2. The four things to read
     ===================================================================== */
  function fourSpec() {
    var F = [
      fp(2, 8, 1, 9, 11, { vol: 58, bias: 0.6, set: { 7: [8, 34] } }),
      fp(8, 13, 6, 14, 12, { vol: 62, bias: 0.6, peak: 12, set: { 11: [88, 119], 12: [104, 141], 13: [96, 128] } }),
      fp(13, 18, 12, 19, 13, { vol: 60, bias: 0.6, peak: 13, set: { 12: [92, 121], 13: [117, 150], 14: [98, 126] } }),
      fp(18, 21, 16, 22, 14, { vol: 64, bias: 0.4, peak: 20 }),
      fp(21, 23, 19, 24, 15, { vol: 60, bias: 0.38, peak: 22 }),
      fp(23, 12, 11, 24, 16, { vol: 56, bias: 0.4, peak: 16, set: { 17: [96, 22], 16: [118, 30], 15: [104, 25], 14: [88, 21] } })
    ];
    var ST = [
      { at: 0, title: "Six footprints print", text: "A made-up uptrend that stalls and then breaks. Thousands of numbers, and most beginners try to read every one. You only need four things." },
      { at: 5, title: "1 · Large orders", text: "Each footprint has one high volume node, its busiest price. Follow them from footprint to footprint and you see where the heavy volume is shifting." },
      { at: 9, title: "2 · Volume clusters", text: "Switch the cells to total volume and the heavy areas stand out as bright blocks. Big players spread their orders across several prices, so clusters span a few levels." },
      { at: 13, title: "3 · Delta", text: "Ask minus bid under each footprint. Rising price usually comes with positive delta. Here price kept rising while delta turned negative: something fishy, and price tends to follow delta." },
      { at: 17.4, title: "4 · Imbalances", text: "Blue numbers: one side traded 3 times the other at that price. One on its own means little. Stacked on top of each other, they show real aggression." },
      { at: 21.4, title: "Put together", text: "Buyers drove it up, the heavy volume shifted, sellers took over under the surface, then hit it hard. You never read every number." }
    ];
    var at = F.map(function (f, i) { return 0.3 + i * 0.7; });
    return strip({
      fps: F, lo: 0, hi: 25, at: at, dur: 0.8, stages: ST, end: 26,
      title: "Six made-up 30-minute footprints · bid × ask",
      deltaLabel: function (T) { return fade(T, 13, 0.4); },
      look: function (T, i) {
        var vol = win(T, 9, 13);
        var imb = fade(T, 17.4, 0.4);
        var hv = win(T, 5, 9) + fade(T, 21.4, 0.4);
        var dl = fade(T, 13, 0.4);
        var dimFor = function () { return 1; };
        if (T >= 13 && T < 17.4) dimFor = function () { return i >= 3 && i <= 4 ? 1 : 0.55; };
        if (T >= 17.4 && T < 21.4) dimFor = function (t) { return (i === 5 && t >= 14 && t <= 17) || (i === 0 && t === 7) ? 1 : 0.4; };
        return { vol: vol, imb: imb, hvn: Math.min(1, hv), delta: dl, rowOp: dimFor, maxVol: 270 };
      },
      overlay: function (T, g) {
        var s = "", F0 = F;
        /* 1: path of the HVNs */
        var hp = win(T, 5.4, 9);
        if (hp > 0) {
          var pts = F0.map(function (f, i) { return g.X(i).toFixed(1) + "," + g.Y(f.hvn).toFixed(1); });
          s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.gold + '" stroke-width="1.6" stroke-dasharray="4 4" opacity="' + (hp * 0.8).toFixed(3) + '"/>';
        }
        s += note(g, ["Large orders (HVN)", "One gold box per footprint:", "the busiest price in it.", "Watch it shift: that's where", "the heavy volume is moving."], C.gold, win(T, 5.4, 9), g.y0);
        /* 2: the cluster */
        var cl = win(T, 9.4, 13);
        if (cl > 0) {
          var xa = g.X(1) - g.w / 2 - 8, xb = g.X(2) + g.w / 2 + 8, ya = g.Y(14) - g.rh / 2 - 3, yb = g.Y(11) + g.rh / 2 + 3;
          s += frameRect(xa, ya, xb - xa, yb - ya, C.orange, 2, cl, 6);
          s += tag((xa + xb) / 2, yb + 14, "Volume cluster", C.orange, cl, "middle");
        }
        s += note(g, ["Volume clusters", "Total volume (bid + ask).", "Brighter = heavier. A block", "across several prices and two", "footprints: institutions", "building a position."], C.orange, win(T, 9.4, 13), g.y0);
        /* 3: the divergence */
        var dv = win(T, 13.6, 17.4);
        if (dv > 0) {
          s += frameRect(g.X(3) - g.slot / 2 + 4, g.deltaY - 18, g.slot * 2 - 8, 26, C.dn, 2, dv, 8);
          s += '<polyline points="' + [3, 4].map(function (i) { return g.X(i).toFixed(1) + "," + (g.Y(F0[i].hi) - g.rh).toFixed(1); }).join(" ") + '" fill="none" stroke="' + C.up + '" stroke-width="2.4" opacity="' + dv.toFixed(3) + '" marker-end="none"/>';
          s += tag(g.X(3.5), g.Y(F0[4].hi) - g.rh * 2.2, "Price higher highs", C.up, dv, "middle");
        }
        s += note(g, ["Delta divergence", "Price up, delta negative:", "sellers dominating a rising", "market. Price tends to", "follow delta. Not always,", "but often."], C.dn, win(T, 13.6, 17.4), g.y0);
        /* 4: stacked imbalances */
        var im = win(T, 17.8, 21.4);
        if (im > 0) {
          var xs = g.X(5) - g.w / 2 - 6, ws = g.w + 12;
          s += frameRect(xs, g.Y(17) - g.rh / 2 - 3, ws, g.rh * 4 + 6, C.cyan, 2, im, 6);
          s += tag(g.X(5), g.Y(F0[5].lo) + g.rh / 2 + 14 * FS, "4 stacked", C.cyan, im, "middle");
          s += tag(g.X(0), g.Y(F0[0].lo) + g.rh / 2 + 14 * FS, "one alone", C.cyan, im * 0.8, "middle");
        }
        s += note(g, ["Imbalances", "Blue: one side traded 3x", "the other at that price.", "Stacked at the bid = sellers", "far more aggressive. One", "alone means little."], C.cyan, win(T, 17.8, 21.4), g.y0);
        s += note(g, ["The four things", "1 Large orders (HVN)", "2 Volume clusters", "3 Delta", "4 Imbalances", "Skip the rest of the numbers."], C.ink, fade(T, 21.6, 0.4), g.y0);
        return s;
      }
    });
  }

  /* =====================================================================
     3. Confirmation at a level: the volume profile POC
     ===================================================================== */
  function levelSpec() {
    var R = rng(31), B = [], p = 5420;
    function push(c, w, v, hi, lo) {
      var o = p, h = hi != null ? hi : Math.max(o, c) + R() * w, l = lo != null ? lo : Math.min(o, c) - R() * w;
      B.push({ o: o, h: h, l: l, c: c, v: v }); p = c;
    }
    var i;
    for (i = 0; i < 14; i++) push(5420 + 2.6 * Math.sin(i * 1.3) + (R() - 0.5) * 1.2, 1.4, 0.75 + 0.3 * R());
    for (i = 1; i <= 6; i++) push(5420 - i * 2.6 + (R() - 0.5), 1, 0.55 + 0.2 * R());
    /* the profile from those first 20 bars, in half-point bins */
    var bins = {}, lo = 5398, hi = 5428, bmax = 0, poc = 5420;
    for (i = 0; i < 20; i++) {
      var b = B[i], steps = Math.max(1, Math.round((b.h - b.l) / 0.5));
      for (var k = 0; k <= steps; k++) { var pr = Math.round((b.l + k * (b.h - b.l) / steps) * 2) / 2; bins[pr] = (bins[pr] || 0) + b.v / (steps + 1); }
    }
    Object.keys(bins).forEach(function (k) { if (bins[k] > bmax) { bmax = bins[k]; poc = +k; } });
    /* then the trip away and back, relative to the point of control */
    for (i = 0; i < 3; i++) push(poc - 15.5 + (R() - 0.5) * 1.6, 1, 0.4);
    for (i = 1; i <= 6; i++) push(Math.min(poc - 0.6, poc - 15 + i * 2.45 + (R() - 0.5) * 0.8), 0.8, 0.45);
    push(poc + 0.6, 0.4, 0.4); push(poc - 0.8, 0.5, 0.42); push(poc + 0.3, 0.4, 0.38);
    var CI = B.length; push(poc - 3.2, 0, 1, poc + 1.1, poc - 3.6);
    for (i = 1; i <= 6; i++) push(poc - 3.2 - i * 1.9 + (R() - 0.5) * 0.8, 0.9, 0.55);
    var N = B.length;
    var CF = finish({ o: 5, c: 1, lo: 0, hi: 7, cells: { 7: [21, 30], 6: [64, 58], 5: [118, 96], 4: [486, 455], 3: [140, 92], 2: [96, 61], 1: [52, 33], 0: [12, 9] } });
    var ST = [
      { at: 0, title: "Find the level first", text: "Before any footprint: a volume profile over the session shows where the heaviest volume traded. The widest point is the point of control." },
      { at: 4.6, title: "Price leaves the level", text: "Price sells off away from the point of control. The players who built positions there are still in them." },
      { at: 8, title: "The pullback, from below", text: "Price climbs back to the point of control from below, so it's resistance: you're looking for a short. Hit from above, it would be support and a long." },
      { at: 11.6, title: "At the level: wait", text: "Price touches the line and moves around it. Nothing confirms yet. You don't sell just because price arrived." },
      { at: 14.6, title: "The confirmation", text: "Now open the footprint. A high volume node right at the level with heavy volume on both sides: absorption. Big players are defending it. That's when you pull the trigger." },
      { at: 18.4, title: "Without the level, it's noise", text: "The same footprint in the middle of nowhere means very little. The level tells you where to look; order flow tells you when." }
    ];
    var reveal = [[0, 0], [4.4, 14], [8, 23], [11.4, 29], [14.6, 32], [15.6, CI + 1], [18.4, CI + 1], [21.6, N]];
    function shownAt(T) {
      if (T <= reveal[0][0]) return reveal[0][1];
      for (var k = 1; k < reveal.length; k++) if (T <= reveal[k][0]) return lerp(reveal[k - 1][1], reveal[k][1], (T - reveal[k - 1][0]) / (reveal[k][0] - reveal[k - 1][0]));
      return N;
    }
    return {
      stages: ST, end: 23,
      size: function (n) { return n ? { W: 440, H: 760 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var px0 = n ? 14 : 40, pw = n ? 62 : 110, x0 = px0 + pw + 8, x1 = n ? 370 : 760, y0 = n ? 300 : 56, y1 = L.H - (n ? 36 : 40);
        function X(i) { return x0 + (i + 0.5) * (x1 - x0) / N; }
        function Y(v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); }
        var cw = Math.max(3, (x1 - x0) / N * 0.6);
        for (var v = 5400; v <= 5428; v += 4) { s += line(x0, Y(v), x1, Y(v), "rgba(255,255,255,0.05)", 1); s += txt(x1 + 6, Y(v) + 4, v.toLocaleString("en-US") + ".00", C.faint, 10.5); }
        s += txt(n ? 14 : 40, n ? y0 - 14 : 32, "Made-up 30-minute bars with a session volume profile", C.faint, 12);
        /* the profile */
        var pf = fade(T, 0.4, 3.6);
        Object.keys(bins).forEach(function (k) {
          var bw = pw * bins[k] / bmax * pf, y = Y(+k);
          s += rect(px0 + pw - bw, y - (Y(0) - Y(0.5)) / 2 + 0.5, bw, Math.max(1, (Y(0) - Y(0.5)) - 1), +k === poc ? C.gold : "#636366", 1, 0.8);
        });
        var pl = fade(T, 3.2, 0.6);
        s += line(px0, Y(poc), x1, Y(poc), C.gold, 1.8, "6 4", pl);
        s += tag(X(22), Y(poc) - 16, (n ? "POC " : "Point of control ") + poc.toLocaleString("en-US", { minimumFractionDigits: 2 }), C.gold, pl * (1 - win(T, 9.4, 11.6)), "middle");
        var sh = shownAt(T);
        for (var j = 0; j < N && j < sh; j++) s += candle(X(j), Y, [B[j].o, B[j].h, B[j].l, B[j].c], Math.min(1, sh - j), cw);
        var g = { n: n, nx: 830, y0: y0 };
        /* stage notes */
        s += note(g, ["Volume profile", "Volume at each price over", "the session. Widest point =", "point of control: the most", "traded price, where big", "players were active."], C.gold, win(T, 0.8, 4.6), y0);
        s += note(g, ["They're still in", "Whoever built positions at", "the point of control is", "likely to defend them when", "price comes back."], C.dim, win(T, 4.8, 8), y0);
        var pb = win(T, 9.4, 11.6);
        s += tag(X(24), Y(poc) - 16, n ? "From below" : "From below = resistance", C.orange, pb, "middle");
        s += note(g, ["Which side?", "Hit from below: resistance,", "look for shorts.", "Hit from above: support,", "look for longs."], C.orange, win(T, 8.2, 11.6), y0);
        s += note(g, ["Not yet", "Touching the line is not", "a signal. Open the footprint", "and wait for big players", "to show up there."], C.dim, win(T, 11.8, 14.6), y0);
        /* the footprint zoom */
        var zf = fade(T, 14.8, 0.5) * (n ? 1 - fade(T, 18.4, 0.3) : 1);
        if (zf > 0) {
          var zx = n ? 14 : 830, zy = n ? 30 : 60, zw = n ? 412 : 330, zh = n ? 230 : 330;
          s += '<g opacity="' + zf.toFixed(3) + '">' + rect(zx, zy, zw, zh, C.box, 12, 0.97) + frameRect(zx, zy, zw, zh, C.orange, 1, 1, 12);
          s += txt(zx + 14, zy + 24 * FS, "The footprint at the level", C.orange, 13, "start", 700);
          var fy0 = zy + (n ? 44 : 54), fy1 = zy + zh - (n ? 26 : 40), frh = (fy1 - fy0) / 8;
          var ZY = function (t) { return fy1 - (t + 0.5) * frh; };
          var fx = zx + (n ? 110 : 120), fw = n ? 120 : 130;
          s += drawFP(CF, fx, fw, ZY, frh, 1, { fs: n ? 12 : 12.5, hvn: 1, delta: 0, deltaY: 0 });
          s += txt(fx + fw / 2 + 12, ZY(4) - 4, "486 × 455", C.gold, 13, "start", 700);
          s += txt(fx + fw / 2 + 12, ZY(4) + 13 * FS, "both sides heavy", C.dim, 12);
          s += txt(fx + fw / 2 + 12, ZY(4) + 30 * FS, "= absorption", C.dim, 12);
          s += "</g>";
          s += pill(X(CI) + 10, Y(B[CI].h) - 12, "Short", C.dn, fade(T, 15.4, 0.4));
        }
        s += note({ n: n, nx: 830, y0: y0 }, ["Order flow is the trigger", "The level says where.", "The footprint says when.", "Without the level, order", "flow is just noise."], C.ink, n ? fade(T, 18.6, 0.4) : 0, y0);
        if (!n) s += callout(830, 404, ["Order flow is the trigger", "The level says where. The", "footprint says when."], C.ink, fade(T, 18.6, 0.4));
        s += txt(L.W - 14, L.H - 8, "Illustrative · made-up bars and footprint", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* =====================================================================
     4. The absorption setup
     ===================================================================== */
  function absorptionSpec() {
    var F = [
      fp(26, 21, 20, 27, 41, { vol: 80, bias: 0.38 }),
      fp(21, 15, 14, 22, 42, { vol: 86, bias: 0.37 }),
      fp(15, 10, 8, 16, 43, { vol: 90, bias: 0.37 }),
      fp(10, 11, 6, 13, 44, { vol: 92, bias: 0.55, peak: 8, set: { 7: [514, 1025], 6: [41, 55], 8: [168, 201] } }),
      fp(11, 17, 10, 18, 45, { vol: 84, bias: 0.6 }),
      fp(17, 22, 16, 23, 46, { vol: 78, bias: 0.6 })
    ];
    var avg = 0, cnt = 0;
    [0, 1, 2].forEach(function (i) { var f = F[i]; for (var t = f.lo; t <= f.hi; t++) { avg += f.cells[t][0] + f.cells[t][1]; cnt++; } });
    avg = Math.round(avg / cnt / 10) * 10;
    var ST = [
      { at: 0, title: "The support comes first", text: "A point of control from the volume profile, below current price. When price drops into it, that's when you open the footprint." },
      { at: 2.6, title: "Sellers push into it", text: "Three red footprints, negative delta every time: sellers hitting the bid, driving price down to the level." },
      { at: 6.8, title: "Heavy on both sides", text: "At the level: 514 contracts at the bid and 1,025 at the ask, in one price. Unusually heavy volume, on the bid and the ask, at the same time." },
      { at: 10.4, title: "Price stops dropping", text: "Sellers keep selling into it, buyers take everything they sell. Price stays at one level. The selling pressure is being absorbed." },
      { at: 13.4, title: "Bonus: positive delta", text: "That footprint closes with positive delta after three negative ones. Buyers are stepping in." },
      { at: 15.8, title: "Go long", text: "Enter as soon as you can see the absorption, with the stop below the support zone. Buyers defend the level and price moves away." }
    ];
    return strip({
      fps: F, lo: 4, hi: 28, at: [2.8, 3.8, 4.8, 7, 16.4, 17.4], dur: 0.9, stages: ST, end: 21, nSkip: 1,
      title: "Six made-up 5-minute footprints · bid × ask",
      deltaLabel: function (T) { return fade(T, 2.8, 0.4); },
      under: function (T, g) {
        return band(g, 6, 8, C.blue, fade(T, 0.3, 0.6), T < 15.8 ? "Support · point of control" : null, true);
      },
      look: function (T, i, g) {
        var o = { delta: i === 3 ? fade(T, 9, 0.4) : fade(T, 3, 0.4), hvn: i === 3 ? fade(T, 8, 0.4) : 0, maxVol: 600, imb: 0, fs: g.n ? 10.5 : null };
        if (i === 3) o.mark = function (t) { return t === 7 && T >= 7.6 && T < 13.4 ? C.gold : t === 7 && T >= 13.4 ? null : null; };
        if (T >= 13.4 && T < 15.8 && i !== 3) o.rowOp = function () { return 0.5; };
        return o;
      },
      overlay: function (T, g) {
        var s = "";
        s += note(g, ["Mark it before", "The level comes from your", "main method, here a volume", "profile point of control.", "Then you wait for price."], C.blue, win(T, 0.4, 2.6), g.y0);
        s += note(g, ["Sellers in control", "Red footprints, negative", "delta. Average cell here", "is about " + avg + " contracts."], C.dn, win(T, 3, 6.8), g.y0);
        var hv = win(T, 7.6, 10.4);
        s += tag(g.X(3) + g.w / 2 + 6, g.Y(7), "514 × 1,025", C.gold, hv, "start");
        s += note(g, ["Unusually heavy, both sides", "514 at the bid: sellers", "hitting it hard.", "1,025 at the ask: buyers", "taking all of it, and more."], C.gold, win(T, 7.6, 10.4), g.y0);
        s += note(g, ["Absorption", "Buyers absorb the selling", "pressure. Price stops falling", "and holds one level. It can", "take a few minutes to build."], C.gold, win(T, 10.6, 13.4), g.y0);
        var dl = win(T, 13.4, 15.8);
        if (dl > 0) s += frameRect(g.X(3) - g.slot / 2 + 4, g.deltaY - 18, g.slot - 8, 26, C.up, 2, dl, 8);
        s += note(g, ["Bonus confirmation", "Three negative deltas,", "then " + sgn(F[3].delta) + " on the", "absorption footprint."], C.up, win(T, 13.6, 15.8), g.y0);
        var lg = fade(T, 15.8, 0.4);
        if (lg > 0) {
          s += pill(g.X(3), g.Y(F[3].hi) - g.rh * 1.1, "Long", C.up, lg, "middle");
          s += '<g opacity="' + lg.toFixed(3) + '">' + line(g.X(3) - g.slot / 2, g.Y(5) - g.rh / 2 + 2, g.x1, g.Y(5) - g.rh / 2 + 2, C.dn, 1.6, "5 4") + "</g>";
          s += tag(g.x1 - 4, g.Y(5) + 6, "Stop below the zone", C.dn, lg, "end");
        }
        s += note(g, ["Long, confirmed", "Level first, absorption", "second, delta as a bonus.", "Stop below the support zone."], C.up, fade(T, 16, 0.4), g.y0);
        return s;
      }
    });
  }

  /* =====================================================================
     5. Four confirmations at a level
     ===================================================================== */
  function confirmSpec() {
    var LIM = strip({
      fps: [fp(16, 9, 8, 17, 51, { vol: 60, bias: 0.4 }), fp(9, 10, 5, 12, 52, { vol: 58, bias: 0.5, set: { 6: [612, 44], 7: [148, 66] } }), fp(10, 16, 9, 17, 53, { vol: 60, bias: 0.6 })],
      lo: 3, hi: 19, at: [0.3, 1.2, 3.2], dur: 0.8, stages: [], end: 5, every: 2,
      title: "Confirmation 1 · a big limit order",
      under: function (T, g) { return band(g, 5, 7, C.blue, 1, "Support zone", true); },
      look: function (T, i) { return { maxVol: 400, delta: 0, mark: i === 1 ? function (t) { return t === 6 && T >= 1.8 ? C.blue : null; } : null }; },
      overlay: function (T, g) {
        return note(g, ["Big limit order", "Support: a very large number", "on the BID (612 here).", "Limit buys fill on the bid.", "Resistance: look on the ASK."], C.blue, fade(T, 1.8, 0.4), g.y0) +
          tag(g.X(1) + g.w / 2 + 8, g.Y(6), "612 on the bid", C.blue, fade(T, 1.8, 0.4), "start");
      }
    });
    var ABS = strip({
      fps: [fp(8, 15, 7, 16, 54, { vol: 60, bias: 0.6 }), fp(15, 13, 12, 18, 55, { vol: 60, bias: 0.5, set: { 16: [486, 455] } }), fp(13, 7, 6, 14, 56, { vol: 60, bias: 0.4 })],
      lo: 3, hi: 19, at: [0.3, 1.2, 3.2], dur: 0.8, stages: [], end: 5,
      title: "Confirmation 2 · absorption",
      under: function (T, g) { return band(g, 15, 17, C.orange, 1, "Resistance zone", true); },
      look: function (T, i) { return { maxVol: 600, delta: 0, hvn: i === 1 ? fade(T, 1.8, 0.4) : 0 }; },
      overlay: function (T, g) {
        return note(g, ["Absorption", "Unusually heavy volume on", "the bid AND the ask in the", "zone. The buying pressure", "is being absorbed."], C.orange, fade(T, 1.8, 0.4), g.y0) +
          tag(g.X(1), g.Y(16) - g.rh * 1.6, "486 × 455", C.gold, fade(T, 1.8, 0.4), "middle");
      }
    });
    var AGG = strip({
      fps: [fp(8, 15, 7, 16, 57, { vol: 60, bias: 0.6 }), fp(15, 12, 11, 17, 58, { vol: 64, bias: 0.4, set: { 16: [212, 64], 15: [264, 71], 14: [231, 58] } }), fp(12, 6, 5, 13, 59, { vol: 60, bias: 0.4 })],
      lo: 3, hi: 19, at: [0.3, 1.2, 3.2], dur: 0.8, stages: [], end: 5,
      title: "Confirmation 3 · aggressive orders and delta",
      deltaLabel: function () { return 1; },
      under: function (T, g) { return band(g, 14, 17, C.dn, 1, "Resistance zone", true); },
      look: function (T, i) { return { maxVol: 340, delta: fade(T, 0.6, 0.4), mark: i === 1 ? function (t) { return t >= 14 && t <= 16 && T >= 1.8 ? C.dn : null; } : null }; },
      overlay: function (T, g) {
        return note(g, ["Aggressive sellers", "In resistance: big numbers", "on the BID, sellers hitting", "it with market orders.", "Delta turns clearly negative."], C.dn, fade(T, 1.8, 0.4), g.y0);
      }
    });
    /* 4: price vs cumulative delta, 1-minute lines */
    var R = rng(61), PR = [], CD = [], pp = 5412, cd = 0;
    for (var i = 0; i < 60; i++) {
      var ph = i < 40 ? -0.22 + 0.1 * Math.sin(i * 0.9) : 0.32;
      pp += ph + (R() - 0.5) * 0.5;
      cd += (i < 12 ? -30 : i < 40 ? 26 : 34) + (R() - 0.5) * 50;
      PR.push(pp); CD.push(cd);
    }
    var CDW = {
      frame: function (T, L) {
        var n = L.narrow, s = "", x0 = n ? 22 : 46, x1 = n ? 366 : 780, sh = Math.min(60, T / 3.6 * 60);
        var pa = [n ? 262 : 64, n ? 470 : 270], pb = [n ? 540 : 316, n ? L.H - 60 : L.H - 62];
        var pmin = Math.min.apply(null, PR) - 0.5, pmax = Math.max.apply(null, PR) + 0.5, cmin = Math.min.apply(null, CD) - 40, cmax = Math.max.apply(null, CD) + 40;
        function X(i) { return x0 + i / 59 * (x1 - x0); }
        function YP(v) { return pa[1] - (v - pmin) / (pmax - pmin) * (pa[1] - pa[0]); }
        function YC(v) { return pb[1] - (v - cmin) / (cmax - cmin) * (pb[1] - pb[0]); }
        s += txt(x0 - 8, n ? 218 : 32, "Confirmation 4 · cumulative delta divergence", C.faint, 12);
        s += txt(x0, pa[0] - 8, "Price · 1-minute", C.dim, 12, "start", 600);
        s += txt(x0, pb[0] - 8, "Cumulative delta", C.dim, 12, "start", 600);
        s += line(x0, YC(0), x1, YC(0), "rgba(255,255,255,0.12)", 1, "3 4");
        var p1 = [], p2 = [];
        for (var k = 0; k < 60 && k < sh; k++) { p1.push(X(k).toFixed(1) + "," + YP(PR[k]).toFixed(1)); p2.push(X(k).toFixed(1) + "," + YC(CD[k]).toFixed(1)); }
        if (p1.length > 1) {
          s += '<polyline points="' + p1.join(" ") + '" fill="none" stroke="' + C.ink + '" stroke-width="2" stroke-linejoin="round"/>';
          s += '<polyline points="' + p2.join(" ") + '" fill="none" stroke="' + C.cyan + '" stroke-width="2" stroke-linejoin="round"/>';
        }
        var dv = fade(T, 2.4, 0.4);
        if (dv > 0) {
          s += line(X(14), YP(PR[14]) - 10, X(38), YP(PR[38]) - 10, C.dn, 2.4, null, dv);
          s += line(X(14), YC(CD[14]) - 10, X(38), YC(CD[38]) - 10, C.up, 2.4, null, dv);
          s += tag(X(26), YP(PR[26]) - 30, "lower lows", C.dn, dv, "middle");
          s += tag(X(26), YC(CD[26]) - 30, "rising", C.up, dv, "middle");
        }
        s += note({ n: n, nx: 872, y0: 64 }, ["Cumulative delta divergence", "Price falling into support", "while cumulative delta rises:", "more is trading at the ask.", "Price should turn to follow."], C.cyan, fade(T, 2.4, 0.4), 64);
        s += txt(L.W - 14, L.H - 8, "Illustrative · made-up lines", C.faint, 11, "end");
        return s;
      }
    };
    var W = [LIM, ABS, AGG, CDW], SW = 5.6;
    var ST = [
      { at: 0, title: "1 · Big limit order", text: "Someone big was waiting at the zone and jumps in passively. A limit buy fills on the bid, so at support you want an unusually large number on the bid. At resistance, on the ask." },
      { at: SW, title: "2 · Absorption", text: "Unusually heavy volume on both the bid and the ask in the zone. The pressure that drove price there is being absorbed." },
      { at: SW * 2, title: "3 · Aggressive orders + delta", text: "In resistance, big volumes start appearing on the bid: aggressive sellers using market orders so they don't miss it. Delta goes negative. At support, the ask and positive delta." },
      { at: SW * 3, title: "4 · Cumulative delta divergence", text: "On a 1-minute chart, price keeps falling into support while cumulative delta rises. Price should turn to catch up with delta." }
    ];
    return {
      stages: ST, end: SW * 4,
      size: function (n) { return n ? { W: 440, H: 800 } : { W: 1180, H: 520 }; },
      frame: function (T, L) { var k = Math.min(3, Math.floor(T / SW)); return W[k].frame(T - k * SW, L); }
    };
  }

  var SPECS = { inside: insideSpec, four: fourSpec, level: levelSpec, absorption: absorptionSpec, confirm: confirmSpec };
  document.querySelectorAll("[data-of-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-of-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     The beginner action plan, as a stepper. Without the script the five
     steps simply show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-of-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "The chart",      c: C.blue,  tag: "A platform that draws footprints" },
      { k: "The data",       c: C.cyan,  tag: "Futures, level 1: executed trades" },
      { k: "One market",     c: C.gold,  tag: "Pick one instrument, only one" },
      { k: "Week one",       c: C.orange, tag: "Watch the four things, no trades" },
      { k: "Add the level",  c: C.up,    tag: "Point of control, then confirmation" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Order flow action plan");
    bar.innerHTML = '<span class="gs-line"><i></i></span>' + INFO.map(function (s, i) {
      return '<button type="button" role="tab" class="gs-step" data-i="' + i + '"><b>' + (i + 1) + "</b><span>" + s.k + "</span></button>";
    }).join("");
    var body = document.createElement("div"); body.className = "gs-body";
    var left = document.createElement("div"); left.className = "gs-left";
    var tg = document.createElement("p"); tg.className = "gs-tag";
    var nav = document.createElement("div"); nav.className = "gs-nav";
    nav.innerHTML = '<button type="button" class="pill gs-prev">&lsaquo; Back</button><button type="button" class="pill pill-buy gs-next"></button>';
    var fig = document.createElement("div"); fig.className = "gs-chart";
    fig.innerHTML = '<svg viewBox="0 0 560 300" role="img" aria-label="A small picture of the current step of the order flow action plan"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    function chartAt(k) {
      var narrow = fig.clientWidth > 0 && fig.clientWidth < 460, W = 560, H = narrow ? (k === 4 ? 380 : 480) : 300, s = "", F = narrow ? 1.45 : 1;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      function t(x, y, str, col, size, anchor, weight) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (size * F).toFixed(1) + '" font-weight="' + (weight || 600) + '" text-anchor="' + (anchor || "start") + '">' + str + "</text>"; }
      function box(x, y, w, h, col, fill) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="' + (fill || "#1c1c1e") + '" stroke="' + col + '" stroke-width="1.5"/>'; }
      if (k === 0) {
        var f = finish({ o: 1, c: 5, lo: 0, hi: 6, cells: { 6: [6, 14], 5: [22, 41], 4: [48, 77], 3: [90, 131], 2: [61, 70], 1: [33, 28], 0: [12, 7] } });
        var top = narrow ? 30 : 40, rh = narrow ? 48 : 30, fw = narrow ? 260 : 150, fx = narrow ? 280 : 150;
        s += drawFP(f, fx, fw, function (q) { return top + (6 - q + 0.5) * rh; }, rh, 1, { fs: narrow ? 20 : 13, hvn: 1, delta: 1, deltaY: top + 7 * rh + 26 * (narrow ? 1.3 : 1) });
        if (!narrow) {
          s += t(270, 70, "A footprint chart", C.ink, 15, "start", 700);
          s += t(270, 96, "bid × ask at every price", C.dim, 13);
          s += t(270, 120, "plus delta under each one", C.dim, 13);
          s += t(270, 160, "Not on every platform:", C.faint, 12);
          s += t(270, 180, "it's often an add-on or a", C.faint, 12);
          s += t(270, 200, "paid feature.", C.faint, 12);
        }
      } else if (k === 1) {
        var bw = narrow ? 500 : 240, bh = narrow ? 190 : 210, bx2 = narrow ? 30 : 300, by2 = narrow ? 250 : 30;
        s += box(30, 30, bw, bh, C.up) + box(bx2, by2, bw, bh, C.faint);
        s += t(48, 30 + 32 * F, "Level 1", C.up, 16, "start", 800) + t(48, 30 + 58 * F, "executed trades", C.dim, 13) + t(48, 30 + 84 * F, "✓ what order flow uses", C.up, 13);
        s += t(bx2 + 18, by2 + 32 * F, "Level 2", C.grey, 16, "start", 800) + t(bx2 + 18, by2 + 58 * F, "resting orders", C.dim, 13) + t(bx2 + 18, by2 + 84 * F, "often pulled before", C.faint, 13) + t(bx2 + 18, by2 + 104 * F, "price gets there", C.faint, 13);
        if (!narrow) s += t(30, 280, "Futures: one central exchange, everyone sees the same volume.", C.faint, 12, "start", 500);
      } else if (k === 2) {
        var mk = ["ES", "NQ", "CL", "GC", "6E", "ZN"], cols = narrow ? 2 : 3, tw = narrow ? 230 : 150, th = narrow ? 110 : 90, gx = narrow ? 30 : 40, gy = narrow ? 24 : 40;
        mk.forEach(function (m, i) {
          var x = gx + (i % cols) * (tw + 20), y = gy + Math.floor(i / cols) * (th + (narrow ? 18 : 24)), on = i === 0;
          s += '<rect x="' + x + '" y="' + y + '" width="' + tw + '" height="' + th + '" rx="12" fill="' + (on ? "#2a2410" : "#1c1c1e") + '" stroke="' + (on ? C.gold : "#3a3a3c") + '" stroke-width="' + (on ? 2.5 : 1) + '" opacity="' + (on ? 1 : 0.45) + '"/>';
          s += t(x + tw / 2, y + th / 2 + 8 * F, m, on ? C.gold : C.grey, 20, "middle", 800);
        });
        if (!narrow) s += t(40, 290, "Example tickers only: pick the one you'll learn deeply.", C.faint, 12, "start", 500);
      } else if (k === 3) {
        var items = ["Large orders (HVN)", "Volume clusters", "Delta", "Imbalances"], ly = narrow ? 50 : 50, lh = narrow ? 62 : 40;
        items.forEach(function (q, i) { s += t(40, ly + i * lh, "◉ " + q, C.dim, 14, "start", 600); });
        var ry = narrow ? 330 : 70, rx = narrow ? 40 : 360;
        s += box(rx - 14, ry - 36, narrow ? 480 : 180, narrow ? 120 : 150, C.orange);
        s += t(rx, ry, "Trades placed", C.faint, 12) + t(rx, ry + 48 * F, "0", C.orange, 34, "start", 800);
        if (!narrow) s += t(rx, ry + 92, "just observe", C.dim, 12);
      } else {
        var px0 = 40, ph = narrow ? 300 : 230, py0 = 30, prof = [3, 5, 8, 12, 17, 22, 26, 21, 15, 10, 7, 5, 3, 2], ph1 = ph / prof.length;
        prof.forEach(function (v, i) { s += '<rect x="' + px0 + '" y="' + (py0 + i * ph1).toFixed(1) + '" width="' + (v * 4).toFixed(1) + '" height="' + (ph1 - 2).toFixed(1) + '" rx="2" fill="' + (i === 6 ? C.gold : "#48484a") + '"/>'; });
        var py = py0 + 6.5 * ph1;
        s += '<line x1="' + px0 + '" x2="520" y1="' + py.toFixed(1) + '" y2="' + py.toFixed(1) + '" stroke="' + C.gold + '" stroke-dasharray="6 4" stroke-width="1.8"/>';
        s += '<polyline points="170,' + (py - 6) + " 230," + (py - 60) + " 290," + (py - 90) + " 350," + (py - 40) + " 400," + (py - 4) + '" fill="none" stroke="' + C.ink + '" stroke-width="2.4" stroke-linejoin="round"/>';
        s += '<circle cx="400" cy="' + (py - 4) + '" r="12" fill="none" stroke="' + C.up + '" stroke-width="2.4"/>';
        s += '<polyline points="400,' + (py - 4) + " 450," + (py - 70) + " 500," + (py - 110) + '" fill="none" stroke="' + C.up + '" stroke-width="2.4" stroke-dasharray="5 4"/>';
        s += t(170, py + 30 * F, "POC from above = support", C.gold, 12, "start", 700);
        s += t(170, py + 54 * F, "confirm on the footprint, then long", C.up, 12, "start", 600);
      }
      s += t(narrow ? 30 : 22, H - 8, "Illustrative", C.faint, 11, "start", 400);
      return s;
    }
    function show(k, focus) {
      steps.forEach(function (st, i) { st.hidden = i !== k; });
      bar.querySelectorAll(".gs-step").forEach(function (b, i) {
        b.classList.toggle("is-done", i < k); b.classList.toggle("is-on", i === k);
        b.setAttribute("aria-selected", i === k ? "true" : "false");
        b.querySelector("b").textContent = i < k ? "✓" : String(i + 1);
      });
      bar.querySelector(".gs-line i").style.width = (k / LAST * 100) + "%";
      root.style.setProperty("--gs", INFO[k].c);
      tg.textContent = "Step " + (k + 1) + " of " + INFO.length + " · " + INFO[k].tag;
      nav.querySelector(".gs-prev").disabled = k === 0;
      nav.querySelector(".gs-next").innerHTML = k < LAST ? "Next: " + INFO[k + 1].k + " &rsaquo;" : "Back to step 1 &rsaquo;";
      FS = 1;
      svg.innerHTML = chartAt(k);
      root.dataset.cur = k;
      if (focus) bar.querySelectorAll(".gs-step")[k].focus();
    }
    bar.addEventListener("click", function (e) { var b = e.target.closest(".gs-step"); if (b) show(+b.getAttribute("data-i")); });
    bar.addEventListener("keydown", function (e) {
      var k = +root.dataset.cur;
      if (e.key === "ArrowRight") { e.preventDefault(); show(Math.min(LAST, k + 1), true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(Math.max(0, k - 1), true); }
    });
    nav.querySelector(".gs-prev").addEventListener("click", function () { show(Math.max(0, +root.dataset.cur - 1)); });
    nav.querySelector(".gs-next").addEventListener("click", function () { var k = +root.dataset.cur; show(k < LAST ? k + 1 : 0); });
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { svg.innerHTML = chartAt(+root.dataset.cur); }, 150); });
    show(0);
  })();
})();
