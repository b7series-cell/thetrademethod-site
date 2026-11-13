/* =====================================================================
   amt-anim.js — the animated walkthroughs on auction-market-theory.html.

     [data-amt-anim="phases"]    balance → transition candle → imbalance → new balance
     [data-amt-anim="balance"]   trading inside balance: wall to wall, 1:1.8 and 1:2, not 1:5
     [data-amt-anim="asym"]      the asymmetrical opportunity: room to the next value,
                                 profile A to B, delta peak + VAL with a margin of error
     [data-amt-anim="build"]     position building with one third of the locked profit
     [data-amt-anim="sessions"]  reading each session's auction: accepted lower, the failed
                                 auction tail, accepted above, fade the VAL
     [data-amt-anim="frame"]     candle framing intraday: the change of flow (POC migration)
     [data-amt-steps]            "where I'd start from zero", as a click-through stepper

   Same player as traps-anim.js / earn-anim.js: each chart redraws in a
   narrow layout on a phone instead of scrolling sideways, and on a phone
   the callouts sit in a band above the chart so they never cover it.

   Every bar, profile, trade and R figure is made up, labelled "Illustrative".
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
      if (REDUCED) { T = k + 1 < ST.length ? Math.max(ST[k].at, ST[k + 1].at - 0.4) : END; draw(); return; }
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


  /* ---------- chart helpers for this page ---------- */
  function fmt(v, d) { return (+v).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function mkBars(closes, open0, seed, wick) {
    var r = rng(seed), out = [], prev = open0;
    closes.forEach(function (c) {
      var o = prev, w = wick || 1;
      out.push({ o: o, h: Math.max(o, c) + r() * w, l: Math.min(o, c) - r() * w, c: c });
      prev = c;
    });
    return out;
  }
  function drawBars(B, X, Y, cnt, bw, opFn) {
    var s = "", full = Math.floor(cnt);
    for (var i = 0; i < B.length && i < Math.ceil(cnt); i++) {
      var p = i < full ? 1 : cnt - full;
      if (p <= 0) continue;
      var b = B[i];
      s += candle(X(i), Y, [b.o, b.h, b.l, b.c], p, bw, opFn ? opFn(i) : 1);
    }
    return s;
  }
  /* geometry: desktop puts notes in a column at the right, a phone puts them in a band on top */
  function geo(L, o) {
    o = o || {};
    if (L.narrow) return { n: 1, x0: 16, x1: L.W - 62, y0: o.band || 170, y1: L.H - (o.vol ? 118 : 40), vy1: L.H - 40, nx: 0 };
    return { n: 0, x0: o.x0 || 46, x1: o.x1 || 750, y0: o.y0 || 40, y1: L.H - (o.vol ? 138 : 50), vy1: L.H - 50, nx: 822 };
  }
  function note2(g, lines, col, op, wy) { return g.n ? callout(14, 18, lines, col, op) : callout(g.nx, wy == null ? g.y0 : wy, lines, col, op); }
  function axis(g, lo, hi, step, Y, dp, op) {
    var s = "", v0 = Math.ceil(lo / step) * step;
    for (var v = v0; v <= hi + 1e-9; v += step) {
      var y = Y(v);
      s += line(g.x0, y, g.x1, y, "#2c2c2e", 1, null, op == null ? 1 : op);
      s += txt(g.x1 + 6, y + 4, fmt(v, dp || 0), C.faint, 11, "start", null, op == null ? 1 : op);
    }
    return s;
  }
  function stamp(L, s) { return txt(L.W - 14, L.H - 10, s || "Illustrative · made-up bars", C.faint, 11, "end"); }
  /* piecewise-linear timeline: [[T, value], ...] */
  function track(pts, T) {
    if (T <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) if (T <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return lerp(a[1], b[1], (T - a[0]) / (b[0] - a[0] || 1)); }
    return pts[pts.length - 1][1];
  }
  function dot(x, y, r, col, op, stroke) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + (stroke ? "none" : col) + '"' + (stroke ? ' stroke="' + col + '" stroke-width="2.4"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }

  function poly(pts, col, w, dash, op) {
    if (pts.length < 2 || (op != null && op <= 0)) return "";
    return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2.4) + '" stroke-linejoin="round"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function money(v) { return (v < 0 ? "−$" : "+$") + fmt(Math.abs(v)); }
  function sR(v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), v % 1 ? 1 : 0) + "R"; }

  /* ---------- auction helpers: volume profiles, value areas ---------- */
  function noisy(N, pts, amp, seed) {
    var r = rng(seed), out = [];
    for (var i = 0; i < N; i++) out.push(track(pts, i) + (r() - 0.5) * 2 * amp);
    return out;
  }
  function vaOf(vol) {
    var tot = 0, poc = 0;
    vol.forEach(function (v, i) { tot += v; if (v > vol[poc]) poc = i; });
    var a = poc, z = poc, acc = vol[poc];
    while (acc < tot * 0.7 && (a > 0 || z < vol.length - 1)) {
      var dn = a > 0 ? vol[a - 1] : -1, up = z < vol.length - 1 ? vol[z + 1] : -1;
      if (up >= dn) { z++; acc += vol[z]; } else { a--; acc += vol[a]; }
    }
    return { poc: poc, val: a, vah: z };
  }
  /* volume at price for bars i0..i1: each bar spreads its volume over its range, heavier inside the body */
  function profileOf(B, i0, i1, lo, step, nb) {
    var vol = [], k;
    for (k = 0; k < nb; k++) vol.push(0);
    for (var i = i0; i <= i1 && i < B.length; i++) {
      var b = B[i], a = Math.max(0, Math.floor((b.l - lo) / step)), z = Math.min(nb - 1, Math.floor((b.h - lo) / step));
      if (z < a) continue;
      var w = 1 / (z - a + 1), bt = Math.min(b.o, b.c), tp = Math.max(b.o, b.c);
      for (k = a; k <= z; k++) { var mid = lo + (k + 0.5) * step; vol[k] += w * (mid >= bt && mid <= tp ? 1.8 : 1); }
    }
    return { vol: vol, lo: lo, step: step, va: vaOf(vol) };
  }
  function handProfile(vol, lo, step) { return { vol: vol, lo: lo, step: step, va: vaOf(vol) }; }
  function pocP(P) { return P.lo + (P.va.poc + 0.5) * P.step; }
  function vahP(P) { return P.lo + (P.va.vah + 1) * P.step; }
  function valP(P) { return P.lo + P.va.val * P.step; }
  /* draw a profile as horizontal bars from x (dir 1 = to the right, -1 = to the left); POC orange, value area brighter */
  function drawProfile(P, x, Y, maxW, col, op, dir) {
    if (op <= 0) return "";
    var m = Math.max.apply(null, P.vol) || 1, s = "";
    P.vol.forEach(function (v, k) {
      if (v <= 0) return;
      var yTop = Y(P.lo + (k + 1) * P.step), yBot = Y(P.lo + k * P.step), h = Math.max(1, yBot - yTop - 1), w = v / m * maxW;
      var inVA = k >= P.va.val && k <= P.va.vah;
      s += rect(dir < 0 ? x - w : x, yTop + 0.5, w, h, k === P.va.poc ? C.orange : col, 1, op * (k === P.va.poc ? 0.75 : inVA ? 0.5 : 0.22));
    });
    return s;
  }
  function riskBox(x0, x1, Y, entry, stop, target, op) {
    if (op <= 0) return "";
    var s = rect(x0, Math.min(Y(entry), Y(stop)), x1 - x0, Math.abs(Y(stop) - Y(entry)), C.dn, 2, 0.2 * op);
    s += rect(x0, Math.min(Y(entry), Y(target)), x1 - x0, Math.abs(Y(target) - Y(entry)), C.up, 2, 0.15 * op);
    s += line(x0, Y(entry), x1, Y(entry), C.ink, 1.4, null, op);
    return s;
  }
  function P0(v) { return fmt(v, 0); }

  /* =====================================================================
     1 · Balance → transition → imbalance → the next balance
     ===================================================================== */
  function phasesSpec() {
    var N = 60, r = rng(11), CL = [], i, lo = 29840, hi = 30500;
    for (i = 0; i < 28; i++) CL.push(30000 + 70 * Math.sin(i * 0.78 + 0.4) + (r() - 0.5) * 22);
    CL.push(30150);
    [30136, 30160, 30146, 30170, 30158].forEach(function (v) { CL.push(v); });
    for (i = 34; i < 48; i++) CL.push(lerp(30178, 30410, (i - 34) / 13) + (r() - 0.5) * 30);
    for (i = 48; i < 60; i++) CL.push(30392 + 38 * Math.sin((i - 48) * 0.9) + (r() - 0.5) * 14);
    var B = mkBars(CL, 30010, 12, 14);
    for (i = 0; i < 28; i++) { B[i].h = Math.min(B[i].h, 30097); B[i].l = Math.max(B[i].l, 29904); }
    B[28].h = 30162; B[28].l = Math.min(B[28].o, 30040) - 6;
    for (i = 29; i < 34; i++) B[i].l = Math.max(B[i].l, 30112);
    for (i = 48; i < 60; i++) { B[i].h = Math.min(B[i].h, 30444); B[i].l = Math.max(B[i].l, 30344); }
    var ST = [
      { at: 0, title: "Balance", text: "Price rotates between two walls. It isn't just compressing: buyers and sellers with different goals are accumulating and distributing, building the fuel for the next directional move." },
      { at: 5.6, title: "The catalyst", text: "Nearly every move from balance into imbalance this year had a fundamental catalyst behind it: a headline, a war threat, a change at the Fed, big tech earnings. Long term, fundamentals are why balance ends." },
      { at: 8, title: "The transition candle", text: "Big orders finally accept value outside the wall. Balance is switching to imbalance. Fabio calls this the transition candle, or the initiative auction." },
      { at: 10.6, title: "Imbalance", text: "The elastic band stretches. With value accepted above, the path of least resistance runs up until the market finds the next area it wants to trade." },
      { at: 14.2, title: "The next balance", text: "The snapback: buyers and sellers build a new area of battle and the cycle starts again. Balance, transition, imbalance, on any time frame, down to a single candle." }
    ];
    return {
      stages: ST, end: 18,
      size: function (n) { return n ? { W: 440, H: 760 } : { W: 1180, H: 540 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [5.4, 28], [8, 28], [8.6, 29], [10.6, 34], [14.2, 48], [17.4, 60]], T), bw = (g.x1 - g.x0) / N * 0.62, cur = Math.max(0, Math.ceil(cnt) - 1);
        s += axis(g, lo, hi, 100, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "made-up index · 30-min bars" : "made-up index future · 30-minute bars", C.faint, 12, "start", 600);
        var bo = fade(T, 0.5, 0.6), xb1 = X(27) + bw;
        s += rect(X(0) - bw, Y(30100), xb1 - X(0) + bw, Y(29900) - Y(30100), C.blue, 4, 0.1 * bo);
        s += line(X(0) - bw, Y(30100), xb1, Y(30100), C.blue, 1.8, null, bo) + line(X(0) - bw, Y(29900), xb1, Y(29900), C.blue, 1.8, null, bo);
        s += line(xb1, Y(30100), g.x1, Y(30100), C.blue, 1, "4 5", 0.45 * fade(T, 8.6, 0.5));
        s += txt(X(1), Y(30100) - 8, n ? "balance" : "balance · building fuel", C.blue, 12, "start", 700, bo);
        s += txt(X(1), Y(29900) + 16, n ? "walls 30,100 / 29,900" : "walls at 30,100 and 29,900", C.faint, 11.5, "start", 600, bo);
        s += drawBars(B, X, Y, cnt, bw);
        s += pill(X(26), Y(30100) - 34, "catalyst", C.gold, win(T, 5.8, 8.4), "middle");
        var to = win(T, 8.6, 14);
        if (to > 0) { s += frameRect(X(28) - bw, Y(B[28].h) - 6, bw * 2, Y(B[28].l) - Y(B[28].h) + 12, C.gold, 2, to); s += tag(X(28) - bw - 6, Y(30150) - 4, n ? "transition" : "transition candle", C.gold, to, "end"); }
        var eo = win(T, 10.8, 14.4);
        if (eo > 0 && cur > 30) {
          var x0 = X(14), y0 = Y(30000), x1 = X(cur), y1 = Y(B[cur].c), cx = (x0 + x1) / 2, cy = Math.max(y0, y1) + 40;
          s += '<path d="M' + x0.toFixed(1) + "," + y0.toFixed(1) + " Q" + cx.toFixed(1) + "," + cy.toFixed(1) + " " + x1.toFixed(1) + "," + y1.toFixed(1) + '" fill="none" stroke="' + C.gold + '" stroke-width="2" stroke-dasharray="5 5" opacity="' + (eo * 0.8).toFixed(3) + '"/>';
          s += tag(X(40), Y(30120), n ? "band stretches" : "the elastic band stretches", C.gold, eo, "middle");
        }
        s += tag(X(42), Y(30420), "imbalance", C.up, fade(T, 11.4, 0.4), "end");
        var no = fade(T, 14.4, 0.5);
        if (no > 0) {
          s += rect(X(48) - bw, Y(30448), X(59) - X(48) + 2 * bw, Y(30340) - Y(30448), C.cyan, 4, 0.12 * no);
          s += line(X(48) - bw, Y(30448), X(59) + bw, Y(30448), C.cyan, 1.6, null, no) + line(X(48) - bw, Y(30340), X(59) + bw, Y(30340), C.cyan, 1.6, null, no);
          s += txt(X(48), Y(30340) + 16, n ? "new balance" : "the next balance", C.cyan, 12, "start", 700, no);
        }
        s += note2(g, ["Balance", "Two walls, price rotating.", "Not just compression: it's", "building the fuel."], C.blue, win(T, 0.6, 5.4));
        s += note2(g, ["The catalyst", "A headline, a war threat,", "the Fed, big tech earnings.", "Fundamentals end balance."], C.gold, win(T, 5.8, 8));
        s += note2(g, ["Transition candle", "Big orders accept value", "outside the wall: balance", "is turning into imbalance."], C.gold, win(T, 8.6, 10.6));
        s += note2(g, ["Imbalance", "The band stretches: the path", "of least resistance runs to", "the next area of value."], C.up, win(T, 10.8, 14.2));
        s += note2(g, ["The next balance", "A new area of battle. The", "cycle starts again, on any", "time frame."], C.cyan, fade(T, 14.4, 0.4));
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     2 · Trading inside balance: wall to wall, 1:1.8 and 1:2, not 1:5
     ===================================================================== */
  function balanceSpec() {
    var N = 36, lo = 29840, hi = 30260, i;
    var CL = [29990, 30010, 30030, 30020, 30045, 30060, 30055, 30080, 30092, 30040,
              30020, 30030, 30000, 29985, 29995, 29970, 29955, 29965, 29945, 29950, 29962,
              29975, 29990, 30010, 30005, 30030, 30045, 30040, 30055, 30060, 30075,
              30085, 30050, 30000, 29950, 29905];
    var B = mkBars(CL, 29975, 21, 12);
    for (i = 0; i < N; i++) { if (i !== 8) B[i].h = Math.min(B[i].h, 30097); if (i < 35) B[i].l = Math.max(B[i].l, 29908); }
    B[8] = { o: 30080, h: 30128, l: 30072, c: 30092 };
    B[9] = { o: 30092, h: 30097, l: 30034, c: 30040 };
    B[16].l = 29946; B[17].l = 29912; B[18].l = 29905; B[19].l = 29914; B[28].h = Math.max(B[28].h, 30062); B[35].l = 29878;
    var ST = [
      { at: 0, title: "Two walls", text: "In balance the market defends both boundaries. Sellers sit on the upper wall, buyers on the lower one, and price keeps bouncing between them." },
      { at: 3.4, title: "Trapped buyers", text: "Price taps the upper wall and pokes above it. The big buy orders up there are trapped as soon as it slips back inside." },
      { at: 5.4, title: "The initiative auction candle", text: "A strong aggression candle back inside the range: a short-term trend-following trade toward the other wall. Short 30,070, stop 30,135, target 29,950: about 1:1.8." },
      { at: 8.8, title: "Absorption at the other wall", text: "At the lower wall, big orders absorb the selling (a delta profile shows it too). Price goes back inside balance: long 29,940, stop 29,885, target 30,050, for 1:2." },
      { at: 12.8, title: "Why not 1:5?", text: "A 1:5 target sits past the wall, where the market keeps turning. Hold for it and the same long round-trips into the stop: −1R instead of +2R. In balance, protecting capital comes first." }
    ];
    return {
      stages: ST, end: 17,
      size: function (n) { return n ? { W: 440, H: 760 } : { W: 1180, H: 540 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [3.4, 8], [4.2, 9], [5.4, 10], [8.6, 18], [9.2, 19], [12.6, 31], [13.2, 31], [16, 36]], T), bw = (g.x1 - g.x0) / N * 0.6;
        s += axis(g, lo, hi, 50, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "made-up index · in balance" : "made-up index future · a balance phase", C.faint, 12, "start", 600);
        s += line(g.x0, Y(30100), g.x1, Y(30100), C.blue, 2) + line(g.x0, Y(29900), g.x1, Y(29900), C.blue, 2);
        if (!n) { s += tag(g.x0 + 4, Y(30100) - 14, "upper wall 30,100", C.blue, 1, "start"); s += tag(g.x0 + 4, Y(29900) + 16, "lower wall 29,900", C.blue, 1, "start"); }
        else { s += tag(g.x0 + 2, Y(30100) - 14, "wall 30,100", C.blue, 1, "start"); s += tag(g.x0 + 2, Y(29900) + 16, "wall 29,900", C.blue, 1, "start"); }
        var so = fade(T, 5.6, 0.4) * (1 - 0.6 * fade(T, 9, 0.5));
        s += riskBox(X(9) - bw, X(16) + bw, Y, 30070, 30135, 29950, so);
        var sto = fade(T, 5.6, 0.4) * (1 - fade(T, 8.9, 0.3));
        if (sto > 0) { s += tag(X(16) + bw + 4, Y(30135), "stop 30,135", C.dn, sto, "start"); s += tag(X(16) + bw + 4, Y(29950), n ? "1:1.8" : "target 29,950 · 1:1.8", C.up, sto, "start"); }
        var lgo = fade(T, 9, 0.4) * (T < 12.8 ? 1 : 0.7);
        s += riskBox(X(18) - bw, X(28) + bw, Y, 29940, 29885, 30050, lgo);
        if (lgo > 0) { s += tag(X(28) + bw + 4, Y(30050), n ? "1:2" : "target 30,050 · 1:2", C.up, lgo, "start"); s += tag(X(28) + bw + 4, Y(29885), "stop 29,885", C.dn, lgo, "start"); }
        s += drawBars(B, X, Y, cnt, bw);
        var tp = win(T, 3.6, 8.6);
        if (tp > 0) { s += frameRect(X(8) - bw, Y(B[8].h) - 5, bw * 2, Y(30092) - Y(B[8].h) + 10, C.orange, 2, tp); s += tag(X(8), Y(B[8].h) - 18, n ? "trapped" : "trapped buyers", C.orange, tp, "middle"); }
        var io = win(T, 5.6, 8.6);
        if (io > 0) { s += frameRect(X(9) - bw, Y(B[9].h) - 5, bw * 2, Y(B[9].l) - Y(B[9].h) + 10, C.dn, 2, io); s += tag(X(9) + bw + 4, Y(30020) + 8, n ? "initiative" : "initiative auction candle", C.dn, io, "start"); }
        var ao = win(T, 9, 12.6);
        if (ao > 0) { s += frameRect(X(17) - bw, Y(29960), X(19) - X(17) + 2 * bw, Y(29900) - Y(29960), C.up, 2, ao); s += tag(X(18), Y(29900) + 30, n ? "absorption" : "absorption at the wall", C.up, ao, "middle"); }
        var fo = fade(T, 13, 0.4);
        if (fo > 0) {
          s += line(X(18), Y(30215), g.x1, Y(30215), C.gold, 1.6, "6 5", fo);
          s += tag(X(19), Y(30215) - 14, n ? "1:5 target 30,215" : "the 1:5 target, 30,215: past the wall", C.gold, fo, "start");
          s += dot(X(28), Y(30050), 6, C.up, fo); s += tag(X(28), Y(30050) - 34, "+2R at the wall", C.up, fo, "middle");
          var ho = fade(T, 15.6, 0.4);
          s += dot(X(35), Y(29885), 6, C.dn, ho); s += tag(X(35), Y(29885) + 26, n ? "−1R" : "1:5 hold: −1R", C.dn, ho, "end");
        }
        s += note2(g, ["Two walls", "Sellers defend the top,", "buyers defend the bottom.", "Price keeps bouncing."], C.blue, win(T, 0.4, 3.4));
        s += note2(g, ["Trapped buyers", "A poke over the wall, then", "back inside: the big buy", "orders up there are stuck."], C.orange, win(T, 3.6, 5.4));
        s += note2(g, ["Initiative auction candle", "Short 30,070, stop 30,135,", "target the other wall.", "About 1:1.8."], C.dn, win(T, 5.6, 8.8));
        s += note2(g, ["Absorption", "Big orders soak up selling", "at the lower wall. Long", "29,940 to 30,050: 1:2."], C.up, win(T, 9, 12.8));
        s += note2(g, ["Why not 1:5?", "The target is past a wall", "the market keeps defending.", "Capital first: take the 1:2."], C.gold, fade(T, 13, 0.4));
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     3 · The asymmetrical opportunity: room to the next value,
         profile A to B, delta peak + VAL with a margin of error
     ===================================================================== */
  function asymSpec() {
    var N = 40, lo = 29940, hi = 30420, i, r = rng(31), CL = [];
    for (i = 0; i < 16; i++) CL.push(30040 + 45 * Math.sin(i * 0.95 + 0.3) + (r() - 0.5) * 18);
    [30150, 30172, 30165, 30140, 30126, 30131, 30150].forEach(function (v) { CL.push(v); });
    for (i = 23; i < 36; i++) CL.push(lerp(30160, 30262, (i - 23) / 12) + (r() - 0.5) * 16);
    [30270, 30262, 30276, 30268].forEach(function (v) { CL.push(v); });
    var B = mkBars(CL, 30020, 33, 10);
    for (i = 0; i < 16; i++) { B[i].h = Math.min(B[i].h, 30098); B[i].l = Math.max(B[i].l, 29982); }
    B[16].h = 30158; B[16].l = Math.min(B[16].o, 30058); B[17].h = 30181; B[17].l = 30130; B[18].h = 30186; B[18].l = 30142;
    B[19].l = Math.max(B[19].l, 30124); B[20].l = 30116; B[21].l = Math.max(B[21].l, 30120); B[22].l = Math.max(B[22].l, 30126);
    var PM = profileOf(B, 0, 15, 29960, 10, 16);
    var AB = handProfile([3, 4, 6, 8, 10, 14, 22, 16, 12, 9, 7, 5, 3], 30055, 10);
    var NV = handProfile([2, 4, 7, 11, 15, 18, 20, 17, 14, 10, 7, 4, 2, 1], 30250, 10);
    var DP = 30120, VL = valP(AB);
    var ST = [
      { at: 0, title: "The battle", text: "The pre-market profile: the three hours before the New York open. Sellers defend the top of value, buyers defend the bottom. Nobody has shown their hand yet." },
      { at: 3.4, title: "Room to run", text: "Look above value: a low volume node, then the next balance far away, from about 30,260. If value moves up there's very little in the way. That's what can make the trade asymmetrical." },
      { at: 6, title: "They show their hand", text: "An initial volume breakout: the first time the buyers show their intention. Value is accepted above the wall. This is the transition candle." },
      { at: 8.6, title: "Profile A to B", text: "Take a profile of just the move from A to B and mark two levels: the delta peak, where buyers were most aggressive, and the value area low. Then add a margin of error above and below." },
      { at: 11.6, title: "Enter on the test", text: "Enter on the test of the big trade at 30,122. Tight stop under the delta peak's margin of error, 30,102: about 1:7. Relaxed stop under the VAL, 30,078: about 1:3." },
      { at: 14.2, title: "Expansion", text: "Price expands into the next value. Not every day gives you this: sometimes the market just rotates in balance and never offers an asymmetrical trade." }
    ];
    return {
      stages: ST, end: 18.5,
      size: function (n) { return n ? { W: 440, H: 800 } : { W: 1180, H: 560 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [3.2, 16], [6, 16], [7.2, 19], [8.6, 19], [11.6, 19], [12.6, 23], [14.2, 23], [17.6, 40]], T), bw = (g.x1 - g.x0) / N * 0.6;
        s += axis(g, lo, hi, 100, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "made-up index · pre-market, then the open" : "made-up index future · pre-market, then the New York open", C.faint, 12, "start", 600);
        s += drawProfile(PM, X(0) - bw, Y, (X(15) - X(0)) * 0.75, C.blue, fade(T, 0.3, 0.6) * (T > 8.6 ? 0.6 : 1), 1);
        var vo = fade(T, 1.2, 0.5);
        s += line(X(0) - bw, Y(vahP(PM)), X(16), Y(vahP(PM)), C.blue, 1.4, "5 4", vo) + line(X(0) - bw, Y(valP(PM)), X(16), Y(valP(PM)), C.blue, 1.4, "5 4", vo);
        var ro = fade(T, 3.6, 0.5);
        if (ro > 0) {
          s += rect(X(17), Y(30248), g.x1 - X(17), Y(vahP(PM) + 8) - Y(30248), C.gold, 3, 0.06 * ro);
          s += txt(X(n ? 21 : 24), Y(30190), n ? "low volume node" : "low volume node: little in the way", C.gold, 12, "start", 600, ro * (T > 11.6 ? 0 : 1));
          s += drawProfile(NV, g.x1, Y, n ? 70 : 130, C.grey, ro, -1);
          s += txt(g.x1 - 4, Y(30400) - 6, n ? "next value" : "next value · an older balance", C.dim, 11.5, "end", 600, ro);
        }
        s += drawBars(B, X, Y, cnt, bw);
        s += tag(X(0), Y(vahP(PM)) - 16, n ? "sellers defend VAH" : "sellers defend the top of value", C.dn, win(T, 1.4, 6), "start");
        s += tag(X(0), Y(valP(PM)) + 18, n ? "buyers defend VAL" : "buyers defend the bottom", C.up, win(T, 1.4, 6), "start");
        var to = win(T, 6.2, 8.6);
        if (to > 0) { s += frameRect(X(16) - bw, Y(B[16].h) - 5, bw * 2, Y(B[16].l) - Y(B[16].h) + 10, C.gold, 2, to); s += tag(X(16) - bw - 4, Y(30150), n ? "breakout" : "initial volume breakout", C.gold, to, "end"); }
        var po = fade(T, 8.8, 0.5);
        if (po > 0) {
          s += txt(X(16), Y(30200) - 4, "A → B", C.ink, 12, "middle", 700, po * (T < 14.2 ? 1 : 0.4));
          s += drawProfile(AB, X(19) + bw, Y, n ? 46 : 70, C.up, po, 1);
          s += rect(X(15), Y(DP + 8), g.x1 - X(15), Y(DP - 8) - Y(DP + 8), C.gold, 2, 0.14 * po);
          s += line(X(15), Y(DP), g.x1, Y(DP), C.gold, 2, null, po);
          s += line(X(15), Y(VL), g.x1, Y(VL), C.up, 2, null, po);
          s += tag(g.x1 - 4, Y(DP) - 14, n ? "delta peak ±8" : "delta peak 30,120 · margin of error ±8", C.gold, po, "end");
          s += tag(g.x1 - 4, Y(VL) + 15, n ? "VAL " + P0(VL) : "value area low " + P0(VL), C.up, po * (n && T > 11.6 ? 0 : 1), "end");
        }
        var eo = fade(T, 11.8, 0.4);
        if (eo > 0) {
          s += riskBox(X(20) - bw, X(36), Y, 30122, 30102, 30262, eo);
          s += line(X(20) - bw, Y(30078), X(36), Y(30078), C.dn, 1.4, "4 4", eo);
          s += dot(X(20), Y(30122), 6, C.ink, eo);
          s += tag(X(20) + bw + 6, Y(30102) + 12, n ? "tight 1:7" : "tight 30,102 · 1:7", C.dn, eo, "start");
          s += tag(X(20) + bw + 6, Y(30078) + 13, n ? "relaxed 1:3" : "relaxed 30,078 · 1:3", C.dn, eo * 0.85, "start");
          s += tag(X(30), Y(30262) - 14, n ? "target 30,262" : "target: next value, 30,262", C.up, eo, "middle");
        }
        var no = n ? null : 40;
        s += note2(g, ["The battle", "Pre-market profile, 3 hours", "before the open. Both sides", "defend their side of value."], C.blue, win(T, 0.4, 3.4), no);
        s += note2(g, ["Room to run", "Thin volume above, the next", "value far away. Little to", "stop a move once it starts."], C.gold, win(T, 3.6, 6), no);
        s += note2(g, ["They show their hand", "An initial volume breakout:", "value accepted above.", "The transition candle."], C.gold, win(T, 6.2, 8.6), no);
        s += note2(g, ["Profile A to B", "Mark the delta peak and", "the value area low, with a", "margin of error around them."], C.up, win(T, 8.8, 11.6), no);
        s += note2(g, ["Enter on the test", "30,122. Tight stop 30,102:", "about 1:7. Relaxed stop", "30,078: about 1:3."], C.ink, win(T, 11.8, 14.2), no);
        s += note2(g, ["Asymmetrical", "Small risk, a long way to", "the next value. Not every", "day. Don't force it."], C.up, fade(T, 14.4, 0.4), no);
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     4 · Position building with one third of the locked profit
     ===================================================================== */
  function buildSpec() {
    var N = 44, lo = 30040, hi = 30400, i, r = rng(41), CL = [30122];
    for (i = 1; i < 10; i++) CL.push(lerp(30135, 30280, (i - 1) / 8) + (r() - 0.5) * 14);
    for (i = 10; i < 22; i++) CL.push(30265 + 18 * Math.sin((i - 10) * 1.2) + (r() - 0.5) * 8);
    CL.push(30300); CL.push(30296);
    for (i = 24; i < 38; i++) CL.push(lerp(30305, 30362, (i - 24) / 13) + (r() - 0.5) * 12);
    for (i = 38; i < 44; i++) CL.push(30352 + 9 * Math.sin((i - 38) * 1.4));
    var B = mkBars(CL, 30106, 43, 8);
    for (i = 10; i < 22; i++) { B[i].h = Math.min(B[i].h, 30291); B[i].l = Math.max(B[i].l, 30242); }
    B[0].l = Math.max(B[0].l, 30098); B[22].h = 30306; B[22].l = Math.min(B[22].o, 30262); B[23].l = 30286; B[23].h = 30304;
    for (i = 24; i < N; i++) B[i].l = Math.max(B[i].l, 30262);
    var GH = [[23, 30296], [24, 30280], [25, 30262], [26, 30270], [27, 30250], [28, 30244], [29, 30234]];
    var ST = [
      { at: 0, title: "The long works", text: "Long 30,120 with the stop at 30,080: 1R is 40 points, call it $1,000. The trade goes well and price runs to 30,280: +4R floating." },
      { at: 3.8, title: "A new area of battle", text: "The market rotates and buyers and sellers build a new range. Two choices: take the position off as soon as the sellers kick in, or manage it and build, when the next balance is far away." },
      { at: 7, title: "Lock it in", text: "Buyers accept above the top of the range with big trades. Move the whole stop to the last invalidation point, 30,240. That locks in +3R, $3,000." },
      { at: 10, title: "Risk one third", text: "Take one third of the locked profit, $1,000 or 1R, and risk it on another trend-following position: add at 30,295 with the stop at 30,255." },
      { at: 12.2, title: "The worst case", text: "The market comes back. The add loses 1R and the first position stops at 30,240 for +3R. Net +2R: you still close green." },
      { at: 15, title: "The directional day", text: "Or the market goes. Out at 30,360: +6R on the first position and +1.6R on the add, a +7.6R session. One or two days like this a week makes an excellent week." }
    ];
    return {
      stages: ST, end: 19.5,
      size: function (n) { return n ? { W: 440, H: 780 } : { W: 1180, H: 540 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [3.6, 10], [6.8, 22], [7.4, 22], [9.8, 23], [10.4, 24], [12.2, 24], [14.8, 24], [17.6, 38], [19.2, 44]], T), bw = (g.x1 - g.x0) / N * 0.6;
        s += axis(g, lo, hi, 50, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "made-up index · 1R = 40 pts = $1,000" : "made-up index future · 1R = 40 points = $1,000", C.faint, 12, "start", 600);
        var moved = T >= 7.4;
        s += line(X(0) - bw, Y(30120), g.x1, Y(30120), C.ink, 1, "3 5", 0.5);
        s += line(X(0) - bw, Y(30080), moved ? X(22) : g.x1, Y(30080), C.dn, 1.6, "5 4", moved ? 0.35 : 1);
        if (!moved) s += tag(X(0), Y(30080) + 16, "stop 30,080", C.dn, 1, "start");
        var rb = fade(T, 4, 0.5);
        if (rb > 0) { s += rect(X(10) - bw, Y(30292), X(21) - X(10) + 2 * bw, Y(30240) - Y(30292), C.cyan, 3, 0.12 * rb); s += txt(X(10), Y(30240) + 15, n ? "new range" : "a new area of battle", C.cyan, 12, "start", 700, rb * (T > 12 ? 0.5 : 1)); }
        if (moved) {
          var mo = fade(T, 7.4, 0.4);
          s += line(X(22) - bw, Y(30240), g.x1, Y(30240), C.dn, 2, null, mo);
          s += tag(g.x1 - 2, Y(30240) + 15, n ? "stop 30,240 · +3R locked" : "stop to the last invalidation 30,240 · +3R locked", C.dn, mo, "end");
        }
        var ao = fade(T, 10.2, 0.4);
        if (ao > 0) {
          s += line(X(23) - bw, Y(30255), g.x1, Y(30255), C.orange, 1.6, "5 4", ao * (T > 15 ? 0.6 : 1));
          s += dot(X(23), Y(30295), 6, C.blue, ao);
          s += tag(X(23) - bw - 6, Y(30310), n ? "add 1R" : "add 30,295 · risks 1R of the 3R", C.blue, ao, "end");
        }
        s += dot(X(0), Y(30120), 6, C.ink, 1);
        s += tag(X(0) + 10, Y(30120) - 16, "long 30,120", C.ink, 1, "start");
        var wo = win(T, 12.4, 14.8);
        if (wo > 0) {
          s += poly(GH.map(function (p) { return [X(p[0]), Y(p[1])]; }), C.dn, 2.4, "6 5", wo);
          s += tag(X(29), Y(30234) + 20, n ? "net +2R" : "add −1R, first +3R: net +2R", C.dn, wo, "end");
        }
        s += drawBars(B, X, Y, cnt, bw, function (i) { return i >= 24 && T >= 12.2 && T < 14.8 ? 0.2 : 1; });
        var fl = Math.ceil(cnt) - 1, fr = (B[Math.max(0, fl)].c - 30120) / 40;
        if (T < 7) s += pill(X(Math.max(0, fl)), Y(B[Math.max(0, fl)].h) - 14, "floating " + sR(Math.round(fr * 10) / 10), fr >= 0 ? C.up : C.dn, fade(T, 0.6, 0.3), "middle");
        var bo = fade(T, 7.2, 0.4) * (T < 12 ? 1 : 0);
        if (bo > 0) { s += frameRect(X(22) - bw, Y(B[22].h) - 5, bw * 2, Y(B[22].l) - Y(B[22].h) + 10, C.gold, 2, bo); s += tag(X(22), Y(B[22].h) - 18, n ? "accepted" : "accepted above · big trades", C.gold, bo, "middle"); }
        var xo = fade(T, 17.4, 0.4);
        if (xo > 0) { s += dot(X(37), Y(30360), 6, C.up, xo); s += pill(X(37), Y(30360) - 16, "+7.6R day", C.up, xo, "end"); }
        s += note2(g, ["The long works", "Long 30,120, stop 30,080.", "1R = 40 points = $1,000.", "Runs to +4R floating."], C.ink, win(T, 0.4, 3.8));
        s += note2(g, ["A new area of battle", "Exit when sellers kick in,", "or manage and build if the", "next balance is far away."], C.cyan, win(T, 4, 7));
        s += note2(g, ["Lock it in", "Buyers accept above with", "big trades. Whole stop to", "30,240: +3R, $3,000 locked."], C.gold, win(T, 7.2, 10));
        s += note2(g, ["Risk one third", "$1,000 of the $3,000 = 1R.", "Add 30,295, stop 30,255.", "Still trend following."], C.blue, win(T, 10.2, 12.2));
        s += note2(g, ["The worst case", "Add −1R, first +3R.", "Net +2R. You still", "close the day green."], C.dn, win(T, 12.4, 14.8));
        s += note2(g, ["The directional day", "Out at 30,360: +6R and", "+1.6R. A +7.6R session.", "One or two a week is plenty."], C.up, fade(T, 15.2, 0.4));
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     5 · Reading each session's auction
     ===================================================================== */
  function sessionsSpec() {
    var lo = 29980, hi = 30400, DAY = [0, 12, 24, 42, 50], N = 50, i, r = rng(51), CL = [];
    for (i = 0; i < 12; i++) CL.push(30320 + 30 * Math.sin(i * 1.15) + (r() - 0.5) * 18);
    CL = CL.concat([30290, 30268, 30250, 30240, 30255, 30236, 30246, 30231, 30242, 30226, 30236, 30229]);
    CL = CL.concat([30200, 30160, 30120, 30085, 30064, 30092, 30110, 30072, 30048, 30054, 30095, 30150, 30200, 30240, 30268, 30282, 30276, 30288]);
    CL = CL.concat([30272, 30262, 30258, 30278, 30302, 30330, 30350, 30366]);
    var B = mkBars(CL, 30330, 53, 9);
    B[28].l = Math.min(B[28].l, 30058); B[31].l = 30014; B[32].l = 30010; B[33].l = 30018;
    var P = [], k;
    for (k = 0; k < 3; k++) P.push(profileOf(B, DAY[k], DAY[k + 1] - 1, 29990, 10, 40));
    var ACC = profileOf(B, 36, 41, 30200, 10, 12), AV = valP(ACC);
    B[44].l = AV + 2; B[43].l = Math.max(B[43].l, AV + 6); B[45].l = Math.max(B[45].l, AV + 4);
    var ST = [
      { at: 0, title: "Read the last session", text: "Start each day by asking who dominated the auction. The prior session built its value around 30,320." },
      { at: 3, title: "Accepted lower", text: "The next session breaches the prior value area low and builds value below it, with a lower POC. Expect the next regular session to be an aggressive sell auction, at least to the local low." },
      { at: 6.5, title: "Into the level", text: "It expands lower, right into a level you marked in advance, 30,060. That's where you expect the buyers to get aggressive. First rejection." },
      { at: 9.2, title: "The failed auction", text: "A second push makes a lower POC but can't accept below the absorption. Long wicks, a tail: they tried to go lower and failed." },
      { at: 12, title: "Accepted above", text: "Then value is accepted above the prior session's value, and above the prior two sessions merged. The pressure has flipped: look for longs next session." },
      { at: 15, title: "Fade the VAL", text: "Next session, fade the value area low of the new value in the direction of the pressure: long on the test, and let a directional session pay." }
    ];
    return {
      stages: ST, end: 19,
      size: function (n) { return n ? { W: 440, H: 800 } : { W: 1180, H: 560 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [2.6, 12], [6.2, 24], [8.8, 30], [11.6, 36], [14.6, 42], [18, 50]], T), bw = (g.x1 - g.x0) / N * 0.58, drawn = Math.ceil(cnt);
        s += axis(g, lo, hi, 50, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "made-up index · 4 sessions" : "made-up index future · four sessions, each with its own profile", C.faint, 12, "start", 600);
        var NAMES = n ? ["day 1", "day 2", "day 3", "day 4"] : ["day 1", "day 2 · accepted lower", "day 3 · failed auction, then up", "day 4"];
        for (k = 0; k < 4; k++) {
          var xa = X(DAY[k]) - bw * 1.2;
          if (k > 0) s += line(xa, g.y0, xa, g.y1, "#3a3a3c", 1, "3 4");
          if (drawn > DAY[k]) s += txt(xa + 6, g.y1 + 16, NAMES[k], C.faint, 11, "start", 600);
        }
        s += line(g.x0, Y(30060), g.x1, Y(30060), C.gold, 1.4, "6 5", 0.8);
        s += tag(g.x0 + 4, Y(30060) - 12, n ? "level 30,060" : "level marked in advance 30,060", C.gold, 0.9, "start");
        for (k = 0; k < 3; k++) {
          if (drawn <= DAY[k]) continue;
          var pk = profileOf(B, DAY[k], Math.min(DAY[k + 1], drawn) - 1, 29990, 10, 40), xa2 = X(DAY[k]) - bw;
          var wseg = X(DAY[k + 1] - 1) - X(DAY[k]);
          s += drawProfile(pk, xa2, Y, wseg * 0.7, k === 0 ? C.blue : k === 1 ? C.dn : C.cyan, 0.85, 1);
          if (drawn >= DAY[k + 1]) {
            var ex = k === 2 ? X(DAY[k + 1] - 1) + bw : g.x1;
            s += line(xa2, Y(valP(pk)), ex, Y(valP(pk)), k === 0 ? C.blue : C.dn, 1.3, "5 4", k === 2 ? 0 : 0.75);
            s += line(xa2, Y(pocP(pk)), X(DAY[k + 1] - 1) + bw, Y(pocP(pk)), C.orange, 1.3, null, 0.9);
          }
        }
        s += drawBars(B, X, Y, cnt, bw);
        if (T >= 3 && T < 9) {
          var lo1 = fade(T, 3.2, 0.4);
          s += tag(X(12), Y(valP(P[0])) + 14, n ? "day 1 VAL" : "day 1 VAL breached", C.blue, lo1, "start");
          s += tag(X(18), Y(pocP(P[1])) - 16, n ? "lower POC" : "value and POC lower", C.dn, fade(T, 4.4, 0.4), "middle");
          s += pill(X(23), Y(30200) + 8, n ? "sell bias" : "expect a sell auction", C.dn, fade(T, 5.2, 0.4), "end");
        }
        var ro = win(T, 6.8, 12);
        if (ro > 0) s += tag(X(28), Y(30060) + 22, "first rejection", C.up, ro * fade(T, 7.6, 0.3), "middle");
        var fo = fade(T, 9.4, 0.4);
        if (fo > 0) {
          s += rect(X(30) - bw, Y(30040), X(34) - X(30) + 2 * bw, Y(30006) - Y(30040), C.grey, 3, 0.25 * fo);
          s += tag(X(32), Y(30006) + 16, n ? "tail · failed" : "tail · a failed auction", C.dim, fo * (T < 15 ? 1 : 0.5), "middle");
        }
        var ac = fade(T, 12.2, 0.4);
        if (ac > 0) {
          s += rect(X(36) - bw, Y(vahP(ACC)), X(41) - X(36) + 2 * bw, Y(AV) - Y(vahP(ACC)), C.up, 3, 0.12 * ac);
          s += line(X(36) - bw, Y(AV), g.x1, Y(AV), C.up, 2, null, ac);
          s += tag(X(38), Y(vahP(ACC)) - 14, n ? "accepted above" : "value accepted above", C.up, ac * (T < 15 ? 1 : 0.6), "middle");
          s += pill(X(41), Y(30330), n ? "long bias" : "expect longs", C.up, fade(T, 13.2, 0.4), "end");
        }
        var vo = fade(T, 15.2, 0.4);
        if (vo > 0 && drawn > 44) { s += dot(X(44), Y(AV + 4), 6, C.up, vo); s += tag(n ? X(44) : X(44) - 10, Y(AV) + 18, n ? "fade the VAL" : "long the VAL, with the pressure", C.up, vo, n ? "middle" : "end"); }
        var nb = n ? null : 40;
        s += note2(g, ["Read the last session", "Who dominated the auction?", "Day 1 built value around", "30,320."], C.blue, win(T, 0.4, 3), nb);
        s += note2(g, ["Accepted lower", "Prior VAL breached, value", "and POC lower. Expect an", "aggressive sell auction."], C.dn, win(T, 3.2, 6.5), nb);
        s += note2(g, ["Into the level", "It expands into a level you", "marked before: 30,060. Where", "buyers should show up."], C.gold, win(T, 6.8, 9.2), nb);
        s += note2(g, ["The failed auction", "A second push, lower POC,", "but it can't accept below", "the absorption: a tail."], C.dim, win(T, 9.4, 12), nb);
        s += note2(g, ["Accepted above", "Value above the prior two", "sessions merged. The", "pressure has flipped."], C.up, win(T, 12.2, 15), nb);
        s += note2(g, ["Fade the VAL", "Next session: long the test", "of the new value area low,", "in the direction of pressure."], C.up, fade(T, 15.2, 0.4), nb);
        return s + stamp(L, "Illustrative · made-up bars and profiles");
      }
    };
  }

  /* =====================================================================
     6 · Candle framing intraday: the change of flow
     ===================================================================== */
  function frameSpec() {
    var N = 34, lo = 30170, hi = 30340, i, r = rng(61), CL = [30232, 30222, 30214, 30206];
    for (i = 4; i < 14; i++) CL.push(30210 + 11 * Math.sin(i * 1.3) + (r() - 0.5) * 6);
    CL = CL.concat([30232, 30250, 30268, 30282, 30293, 30300, 30284, 30266, 30252, 30248, 30251, 30270, 30268]);
    for (i = 27; i < 34; i++) CL.push(lerp(30276, 30322, (i - 27) / 6) + (r() - 0.5) * 5);
    var B = mkBars(CL, 30240, 63, 4);
    for (i = 4; i < 14; i++) { B[i].h = Math.min(B[i].h, 30227); B[i].l = Math.max(B[i].l, 30193); }
    B[25].l = 30241; B[26].l = 30243; B[26].o = 30270;
    for (i = 27; i < N; i++) B[i].l = Math.max(B[i].l, 30258);
    var POC = B.map(function (b) { return (b.o + b.c) / 2 + (b.c >= b.o ? 2 : -2); });
    [[20, 30288], [21, 30270], [22, 30256], [23, 30250], [24, 30249], [25, 30264], [26, 30262]].forEach(function (p) { POC[p[0]] = p[1]; });
    var AB = handProfile([2, 3, 5, 8, 14, 11, 7, 6, 9, 13, 9, 6, 5, 4, 3, 2], 30225, 5), VL = valP(AB);
    var ST = [
      { at: 0, title: "Compression", text: "Range bars, intraday. Sellers retrace the previous buy move, then the market compresses. Frame the compression as one area, the way you'd read a single candle." },
      { at: 3.2, title: "Who won it?", text: "The buyers win the auction of the compression: a series of green aggression candles. The range bias is bullish." },
      { at: 5.6, title: "Profile A to B", text: "Hide the candles and take the profile of just the move from A to B. Two delta peaks show where the buyers' pressure mattered most, plus the value area low." },
      { at: 8.4, title: "Back into the area", text: "The profile comes back into the area and starts to reaccumulate. Still a bullish bias, but a conservative trader waits for a change of flow." },
      { at: 11, title: "Change of flow", text: "Each candle has its own POC. Lower than the one before: sellers are still in control. Buyers try, and fail. Then the POC migrates higher: value accepted above." },
      { at: 14, title: "1:2 on the test", text: "Long on the test at 30,262, stop under the candle's low at 30,238, target 1:2 at 30,310. The retrace comes close to the stop, but the low holds: you battle where you battled before, then it expands." }
    ];
    return {
      stages: ST, end: 18.5,
      size: function (n) { return n ? { W: 440, H: 780 } : { W: 1180, H: 540 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [3, 14], [5.4, 20], [8.4, 20], [10.8, 23], [12.2, 24], [13.8, 26], [14.6, 27], [17.6, 34]], T), bw = (g.x1 - g.x0) / N * 0.56;
        s += axis(g, lo, hi, 25, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "made-up index · range bars" : "made-up index future · range bars, each with its own POC", C.faint, 12, "start", 600);
        var co = fade(T, 0.8, 0.5);
        s += rect(X(4) - bw, Y(30228), X(13) - X(4) + 2 * bw, Y(30192) - Y(30228), C.blue, 3, 0.12 * co);
        s += txt(X(4) - bw, Y(30192) + 15, "compression", C.blue, 12, "start", 700, co);
        var wo = fade(T, 3.4, 0.4);
        s += tag(X(13) + bw, Y(30228) - 14, n ? "buyers win" : "buyers win the compression", C.up, wo * (T < 8.4 ? 1 : 0), "start");
        var hide = T >= 5.6 && T < 8.4 ? 0.25 : 1;
        var po = fade(T, 5.8, 0.4);
        if (po > 0) {
          s += drawProfile(AB, X(14) - bw, Y, X(19) - X(14) + bw, C.up, po * (T >= 8.4 ? 0.5 : 1), 1);
          s += line(X(14) - bw, Y(30247.5), g.x1, Y(30247.5), C.gold, 1.8, null, po);
          s += line(X(14) - bw, Y(30272.5), g.x1, Y(30272.5), C.gold, 1.4, "5 4", po);
          s += line(X(14) - bw, Y(VL), g.x1, Y(VL), C.up, 1.6, null, po);
          var pt = po * (1 - fade(T, 13.8, 0.4));
          s += tag(g.x1 - 2, Y(30272.5) - 13, "delta peak 2", C.gold, pt, "end");
          s += tag(g.x1 - 2, Y(30247.5) - 13, "delta peak 1", C.gold, pt, "end");
          s += tag(g.x1 - 2, Y(VL) + 14, "VAL " + P0(VL), C.up, pt, "end");
          s += txt(X(14), Y(30232) + 30, "A", C.ink, 13, "middle", 700, po) + txt(X(19), Y(30308) - 8, "B", C.ink, 13, "middle", 700, po);
        }
        s += drawBars(B, X, Y, cnt, bw, function (i) { return i >= 14 && i <= 19 ? hide : 1; });
        var shown = Math.ceil(cnt), fo = fade(T, 11, 0.4);
        for (i = 14; i < shown; i++) {
          var hl = i >= 21 && i <= 25 && fo > 0;
          s += line(X(i) - bw * 0.95, Y(POC[i]), X(i) + bw * 0.95, Y(POC[i]), hl ? C.gold : C.ink, hl ? 3 : 1.6, null, hl ? 1 : 0.55);
        }
        if (fo > 0) {
          var pts = []; for (i = 21; i <= Math.min(25, shown - 1); i++) pts.push([X(i), Y(POC[i])]);
          s += poly(pts, C.gold, 1.4, "3 3", fo);
          s += tag(X(22), Y(POC[22]) + 26, n ? "POC lower" : "POC lower: sellers", C.dn, win(T, 11.2, 13.9), "middle");
          if (shown > 24) s += tag(X(24) + 4, Y(B[24].l) + 22, n ? "buyers fail" : "buyers try, fail", C.orange, win(T, 12.3, 13.9), "middle");
          if (shown > 25) s += tag(X(25), Y(B[25].h) - 16, n ? "POC higher" : "POC higher: accepted", C.up, fade(T, 13.9, 0.3), "middle");
        }
        var eo = fade(T, 14.2, 0.4);
        if (eo > 0) {
          s += riskBox(X(26) - bw, X(33) + bw, Y, 30262, 30238, 30310, eo);
          s += tag(X(33) + bw + 2, Y(30310), "1:2", C.up, eo, "start");
          s += tag(X(33) + bw + 2, Y(30238), n ? "stop" : "stop 30,238", C.dn, eo, "start");
          s += tag(X(26), Y(30243) + 36, n ? "low holds" : "close to the stop, the low holds", C.dim, fade(T, 15, 0.4), "middle");
        }
        var nb = n ? null : 40;
        s += note2(g, ["Compression", "Sellers retrace, then the", "market compresses. Frame", "it as one area."], C.blue, win(T, 0.4, 3.2), nb);
        s += note2(g, ["Who won it?", "Buyers win the auction of", "the compression. Range", "bias: bullish."], C.up, win(T, 3.4, 5.6), nb);
        s += note2(g, ["Profile A to B", "Hide the candles. Two delta", "peaks show where buyers", "pushed hardest."], C.gold, win(T, 5.8, 8.4), nb);
        s += note2(g, ["Back into the area", "Price reaccumulates at the", "peaks. Conservative? Wait", "for a change of flow."], C.cyan, win(T, 8.6, 11), nb);
        s += note2(g, ["Change of flow", "POC lower: sellers. Buyers", "try and fail. Then the POC", "migrates higher: accepted."], C.gold, win(T, 11.2, 14), nb);
        s += note2(g, ["1:2 on the test", "Long 30,262, stop 30,238", "under the candle low,", "target 30,310."], C.up, fade(T, 14.2, 0.4), nb);
        return s + stamp(L);
      }
    };
  }

  var SPECS = { phases: phasesSpec, balance: balanceSpec, asym: asymSpec, build: buildSpec, sessions: sessionsSpec, frame: frameSpec };
  document.querySelectorAll("[data-amt-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-amt-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     Where I'd start from zero, as a click-through stepper.
     Without the script the five show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-amt-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "Regime",     c: C.cyan,   tag: "Balance, transition or imbalance?" },
      { k: "Walls",      c: C.blue,   tag: "Trade wall to wall, 1:1.5 to 1:2" },
      { k: "Transition", c: C.gold,   tag: "Wait for value accepted outside" },
      { k: "Levels",     c: C.orange, tag: "Delta peak and VAL, with a margin of error" },
      { k: "Build",      c: C.up,     tag: "Risk one third of the locked profit" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Where to start from zero");
    bar.innerHTML = '<span class="gs-line"><i></i></span>' + INFO.map(function (s, i) {
      return '<button type="button" role="tab" class="gs-step" data-i="' + i + '"><b>' + (i + 1) + "</b><span>" + s.k + "</span></button>";
    }).join("");
    var body = document.createElement("div"); body.className = "gs-body";
    var left = document.createElement("div"); left.className = "gs-left";
    var tg = document.createElement("p"); tg.className = "gs-tag";
    var nav = document.createElement("div"); nav.className = "gs-nav";
    nav.innerHTML = '<button type="button" class="pill gs-prev">&lsaquo; Back</button><button type="button" class="pill pill-buy gs-next"></button>';
    var fig = document.createElement("div"); fig.className = "gs-chart";
    fig.innerHTML = '<svg viewBox="0 0 560 300" role="img" aria-label="A small picture of the current step"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    function chartAt(k) {
      var narrow = fig.clientWidth > 0 && fig.clientWidth < 460, W = 560, H = narrow ? 440 : 300, s = "", F = narrow ? 1.45 : 1;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      function t(x, y, str, col, size, anchor, weight) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (size * F).toFixed(1) + '" font-weight="' + (weight || 600) + '" text-anchor="' + (anchor || "start") + '">' + str + "</text>"; }
      function r(x, y, w, h, col, op, rx) { return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + (rx == null ? 4 : rx) + '" fill="' + col + '"' + (op != null ? ' opacity="' + op + '"' : "") + "/>"; }
      function ln(x1, y1, x2, y2, col, w, dash) { return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 2) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>"; }
      function pl(pts, col, w) { return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2.4) + '" stroke-linejoin="round"/>'; }
      var top = 30, bot = H - 50, mid = (top + bot) / 2;
      if (k === 0) {
        var cw = (W - 80) / 3, NM = ["Balance", "Transition", "Imbalance"], CO = [C.blue, C.gold, C.up];
        for (var i = 0; i < 3; i++) {
          var x = 30 + i * (cw + 10), yb = mid - 40, hb = 80;
          s += r(x, top + 8, cw, bot - top - 8, "#2c2c2e", null, 14);
          if (i === 0) s += r(x + 18, yb, cw - 36, hb, C.blue, 0.25) + pl([[x + 24, mid], [x + 50, yb + 10], [x + 80, yb + hb - 10], [x + 110, yb + 12], [x + cw - 24, mid]], C.ink, 2);
          if (i === 1) s += r(x + 18, yb, cw - 60, hb, C.blue, 0.25) + r(x + cw - 50, yb - 50, 16, 80, C.up, 1, 2) + ln(x + cw - 42, yb - 60, x + cw - 42, yb + 36, C.up, 1.6);
          if (i === 2) s += pl([[x + 20, bot - 30], [x + 60, bot - 70], [x + 80, bot - 60], [x + 120, bot - 120], [x + cw - 20, top + 40]], C.up, 2.6);
          s += t(x + cw / 2, bot - 8, NM[i], CO[i], 14, "middle", 700);
        }
        s += t(30, bot + 30, "Which one dominates, this week and today?", C.dim, 12.5, "start", 500);
      } else if (k === 1) {
        var yT = top + 40, yB = bot - 30;
        s += ln(30, yT, 530, yT, C.blue, 2.4) + ln(30, yB, 530, yB, C.blue, 2.4);
        s += pl([[40, (yT + yB) / 2], [110, yT + 6], [190, yB - 6], [270, yT + 6], [350, yB - 6], [430, yT + 6], [510, (yT + yB) / 2]], C.ink, 2.4);
        s += t(110, yT - 10, "sell", C.dn, 13, "middle", 700) + t(190, yB + 22, "buy", C.up, 13, "middle", 700) + t(270, yT - 10, "sell", C.dn, 13, "middle", 700) + t(350, yB + 22, "buy", C.up, 13, "middle", 700);
        s += t(30, bot + 30, "Targets at the other wall: 1:1.5 to 1:2.", C.dim, 12.5, "start", 500);
      } else if (k === 2) {
        var y1 = mid - 10, y2 = mid + 60;
        s += r(30, y1, 280, y2 - y1, C.blue, 0.22) + ln(30, y1, 330, y1, C.blue, 2) + ln(30, y2, 330, y2, C.blue, 2);
        s += pl([[40, y2 - 20], [90, y1 + 12], [150, y2 - 12], [210, y1 + 15], [270, y2 - 18], [300, y1 + 20]], C.ink, 2);
        s += r(318, y1 - 70, 18, 90, C.up, 1, 2) + r(350, y1 - 96, 16, 40, C.up, 0.9, 2) + r(380, y1 - 104, 16, 30, C.up, 0.9, 2);
        s += r(318, y1 - 112, 220, y1 - 14 - (y1 - 112), C.up, 0.1, 6);
        s += t(30, y1 - 60, "value accepted outside", C.up, 12.5, "start", 700);
        s += t(30, bot + 30, "Higher reward-to-risk lives here, not inside.", C.dim, 12.5, "start", 500);
      } else if (k === 3) {
        var VOL = [3, 4, 6, 8, 10, 14, 22, 16, 12, 9, 7, 5, 3], bh = (bot - top - 20) / VOL.length, mx = 22, yDP = 0, yVL = 0;
        VOL.forEach(function (v, i) {
          var y = bot - (i + 1) * bh, w = v / mx * 220;
          s += r(60, y + 1, w, bh - 2, i === 6 ? C.orange : i >= 3 && i <= 9 ? C.up : "#3a3a3c", i === 6 ? 1 : 0.6, 2);
          if (i === 6) yDP = y + bh / 2; if (i === 3) yVL = y + bh;
        });
        s += r(40, yDP - 14, 480, 28, C.gold, 0.14, 4) + ln(40, yDP, 520, yDP, C.gold, 2.2) + ln(40, yVL, 520, yVL, C.up, 2.2);
        s += t(520, yDP - 18, "delta peak ± margin", C.gold, 12.5, "end", 700) + t(520, yVL + 20, "value area low", C.up, 12.5, "end", 700);
        s += t(30, bot + 30, "Stop goes beyond the level, not on it.", C.dim, 12.5, "start", 500);
      } else {
        var RB = [["locked", 3, C.up], ["risk", -1, C.blue], ["worst", 2, C.orange], ["best", 7.6, C.up]], z = bot - (narrow ? 70 : 40), sc = (z - top - 20) / 8, bw2 = (W - 80) / 4;
        RB.forEach(function (b, i) {
          var x = 40 + i * bw2 + 14, h = Math.abs(b[1]) * sc;
          s += r(x, b[1] > 0 ? z - h : z, bw2 - 28, Math.max(3, h), b[2], 0.9, 6);
          s += t(x + (bw2 - 28) / 2, b[1] > 0 ? z - h - 8 : z - 8, (b[1] > 0 ? "+" : "−") + Math.abs(b[1]) + "R", b[2], 14, "middle", 700);
          s += t(x + (bw2 - 28) / 2, bot + 6, b[0], C.dim, 12, "middle", 600);
        });
        s += ln(40, z, 520, z, "#48484a", 1.4);
        s += t(30, bot + 32, "Risk 1R of the 3R locked. Worst case still green.", C.dim, 12.5, "start", 500);
      }
      s += t(W - 16, H - 8, "Illustrative", C.faint, 11, "end", 400);
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
      nav.querySelector(".gs-next").innerHTML = k < LAST ? "Next: " + INFO[k + 1].k + " &rsaquo;" : "Back to 1 &rsaquo;";
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
