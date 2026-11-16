/* =====================================================================
   si-anim.js — the animated walkthroughs on stacked-imbalances.html
   (Orderflows, "Stacked Imbalances In The Order Flow Find Low Risk Trades").

     [data-si-anim="diagonal"]  what an imbalance is: the bid at one price against the
                                offer one tick up, 20 vs 150, about 4 to 1
     [data-si-anim="stack"]     one imbalance alone vs three or more stacked, carried forward
     [data-si-anim="memory"]    payroll Friday: the stack at 3,973–3,974, bid 3,974,
                                stop 3,973, the rally to 3,994
     [data-si-anim="outcomes"]  four returns to a stack: holds, one tick through,
                                sideways, blows through
     [data-si-anim="short"]     the selling stack at 3,921–3,922: a shallow return with
                                sellers still there, and the short
     [data-si-steps]            "trading a stacked imbalance, step by step" as a stepper

   Imbalances are read diagonally at 4:1, as in the video: the offer at a price
   against the bid one tick lower (buying), the bid against the offer one tick
   higher (selling).

   Same player as pyr-anim.js: each chart redraws in a narrow layout on a
   phone instead of scrolling sideways, and on a phone the callouts sit in a
   band above the chart so they never cover it.

   Prices named in the video are kept; every bar and footprint is made up.
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

  /* ---------- seeded randomness, so every replay draws the same bars ---------- */
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
  function riskBox(x0, x1, Y, entry, stop, target, op) {
    if (op <= 0) return "";
    var s = rect(x0, Math.min(Y(entry), Y(stop)), x1 - x0, Math.abs(Y(stop) - Y(entry)), C.dn, 2, 0.2 * op);
    s += rect(x0, Math.min(Y(entry), Y(target)), x1 - x0, Math.abs(Y(target) - Y(entry)), C.up, 2, 0.15 * op);
    s += line(x0, Y(entry), x1, Y(entry), C.ink, 1.4, null, op);
    return s;
  }
  function P0(v) { return fmt(v, 0); }

  /* ---------- page helpers ---------- */
  function noisy(N, pts, amp, seed) {
    var r = rng(seed), out = [];
    for (var i = 0; i < N; i++) out.push(track(pts, i) + (r() - 0.5) * 2 * amp);
    return out;
  }
  function band(x0, x1, Y, a, b, col, op, fill) {
    if (op <= 0) return "";
    var yt = Y(Math.max(a, b)), yb = Y(Math.min(a, b));
    return rect(x0, yt, x1 - x0, Math.max(2, yb - yt), col, 3, (fill == null ? 0.16 : fill) * op) +
      line(x0, yt, x1, yt, col, 1.6, null, op) + line(x0, yb, x1, yb, col, 1.6, null, op);
  }
  function emaOf(B, n) { var out = [], e = null; B.forEach(function (b) { e = e == null ? b.c : e + (b.c - e) * 2 / (n + 1); out.push(e); }); return out; }
  function clampBars(B, lo, hi, skip) {
    B.forEach(function (b, i) { if (skip && skip.indexOf(i) >= 0) return; b.h = Math.min(b.h, hi); b.l = Math.max(b.l, lo); });
  }
  function arrow(x1, y1, x2, y2, col, op, dash) {
    if (op <= 0) return "";
    var a = Math.atan2(y2 - y1, x2 - x1), h = 10;
    return line(x1, y1, x2, y2, col, 2.2, dash, op) +
      '<path d="M' + x2.toFixed(1) + "," + y2.toFixed(1) + " L" + (x2 - h * Math.cos(a - 0.45)).toFixed(1) + "," + (y2 - h * Math.sin(a - 0.45)).toFixed(1) +
      " L" + (x2 - h * Math.cos(a + 0.45)).toFixed(1) + "," + (y2 - h * Math.sin(a + 0.45)).toFixed(1) + 'Z" fill="' + col + '" opacity="' + op.toFixed(3) + '"/>';
  }
  function sizeStd(n) { return n ? { W: 440, H: 760 } : { W: 1180, H: 540 }; }
  function cross(x, y, col, op) {
    if (op <= 0) return "";
    return line(x - 7, y - 7, x + 7, y + 7, col, 2.6, null, op) + line(x - 7, y + 7, x + 7, y - 7, col, 2.6, null, op);
  }

  /* ---------- small helpers for this page ---------- */
  function grid(g, n) {
    var s = "";
    for (var i = 0; i <= (n || 6); i++) { var y = g.y0 + (g.y1 - g.y0) * i / (n || 6); s += line(g.x0, y, g.x1, y, "#2c2c2e", 1); }
    return s;
  }
  function clampRange(B, a, b, lo, hi) { for (var i = a; i <= b && i < B.length; i++) { if (lo != null) B[i].l = Math.max(B[i].l, lo); if (hi != null) B[i].h = Math.min(B[i].h, hi); } }
  function ob(a) { return { o: a[0], h: a[1], l: a[2], c: a[3] }; }
  function P2(v) { return fmt(v, 2); }

  /* =====================================================================
     Footprints, read the way the video reads them: diagonally.
     cells[t] = [contracts at the bid, contracts at the ask] at tick t.
       buying imbalance at t:  ask[t] >= 4 x bid[t-1]  (the offer vs the bid one tick lower)
       selling imbalance at t: bid[t] >= 4 x ask[t+1]  (the bid vs the offer one tick higher)
     ===================================================================== */
  var RATIO = 4;
  function imbs(f) {
    f.buy = {}; f.sell = {};
    var mx = 0;
    for (var t = f.lo; t <= f.hi; t++) {
      var q = f.cells[t], dn = f.cells[t - 1], up = f.cells[t + 1];
      if (dn && t - 1 >= f.lo && q[1] >= RATIO * Math.max(1, dn[0])) f.buy[t] = 1;
      if (up && t + 1 <= f.hi && q[0] >= RATIO * Math.max(1, up[1])) f.sell[t] = 1;
      mx = Math.max(mx, q[0] + q[1]);
    }
    f.max = mx;
    return f;
  }
  /* o/c/lo/hi in ticks. opt.vol = average contracts per row, opt.set = exact rows {t: [bid, ask]} */
  function fpGen(o, c, lo, hi, seed, opt) {
    opt = opt || {};
    var R = rng(seed), cells = {}, vol = opt.vol || 40, bias = c > o ? 0.55 : c < o ? 0.45 : 0.5;
    var mid = (o + c) / 2, half = Math.max(1, (hi - lo) / 2), fixed = opt.set || {};
    for (var t = lo; t <= hi; t++) {
      var d = Math.min(1, Math.abs(t - mid) / half);
      var v = vol * (1.15 - 0.5 * d) * (0.8 + 0.4 * R());
      var a = Math.max(0.38, Math.min(0.62, bias + (R() - 0.5) * 0.16));
      cells[t] = [Math.max(4, Math.round(v * (1 - a))), Math.max(4, Math.round(v * a))];
    }
    /* keep the random rows calm: no accidental diagonal imbalances */
    for (var pass = 0; pass < 4; pass++) for (t = lo + 1; t <= hi; t++) {
      if (fixed[t] || fixed[t - 1]) continue;
      var u = cells[t], w = cells[t - 1];
      if (u[1] > 2.4 * w[0]) w[0] = Math.ceil(u[1] / 2.4);
      if (w[0] > 2.4 * u[1]) u[1] = Math.ceil(w[0] / 2.4);
    }
    Object.keys(fixed).forEach(function (k) { cells[k] = fixed[k].slice(); });
    return imbs({ o: o, c: c, lo: lo, hi: hi, cells: cells });
  }
  /* one footprint centred on X. o: { imb (0..1), rowOp(t), fs } */
  function drawFP(f, X, w, Y, rh, prog, o) {
    if (prog <= 0) return "";
    o = o || {};
    var s = "", k = ease(prog), fs = o.fs || Math.min(11, rh * 0.66), x0 = X - w / 2, io = o.imb || 0;
    var col = f.c >= f.o ? C.up : C.dn, cx = x0 - 5;
    s += line(cx, Y(f.hi) - rh / 2 + 2, cx, Y(f.lo) + rh / 2 - 2, col, 1.3, null, k);
    s += rect(cx - 2.5, Y(Math.max(f.o, f.c)) - rh / 2 + 1, 5, Math.max(2, (Math.abs(f.c - f.o) + 1) * rh - 2), col, 1, k);
    for (var t = f.lo; t <= f.hi; t++) {
      var q = f.cells[t], rk = clamp01((k - (t - f.lo) / (f.hi - f.lo + 1) * 0.6) / 0.4);
      if (rk <= 0) continue;
      var y = Y(t) - rh / 2, m = o.rowOp ? o.rowOp(t) : 1, share = Math.min(1, (q[0] + q[1]) / f.max);
      s += rect(x0, y + 0.5, w, rh - 1, "#48484a", 2, (0.22 + 0.4 * share) * m * rk);
      var hb = f.sell[t] ? io : 0, ha = f.buy[t] ? io : 0;
      if (hb > 0) s += rect(x0, y + 0.5, w / 2 - 0.5, rh - 1, C.dn, 2, 0.55 * hb * m * rk);
      if (ha > 0) s += rect(X + 0.5, y + 0.5, w / 2 - 0.5, rh - 1, C.up, 2, 0.55 * ha * m * rk);
      var ty = y + rh / 2 + fs * 0.36, nop = m * rk;
      s += num(x0 + 3, ty, String(q[0]), hb > 0.5 ? "#fff" : C.dim, fs, "start", hb > 0.5 ? 800 : null, nop);
      s += num(x0 + w - 3, ty, String(q[1]), ha > 0.5 ? "#fff" : C.dim, fs, "end", ha > 0.5 ? 800 : null, nop);
    }
    return s;
  }
  /* a strip of footprints with a price axis; desktop notes in a column on the right, phone notes in a band on top */
  function fpStrip(cfg) {
    var F = cfg.fps;
    function size(n) { return n ? { W: 440, H: cfg.nH || 840 } : { W: 1180, H: 540 }; }
    function frame(T, L) {
      var n = L.narrow, s = "";
      var x0 = n ? 22 : 46, x1 = n ? 366 : 750, y0 = n ? (cfg.nTop || 236) : 58, y1 = L.H - (n ? 36 : 40);
      var N = F.length, slot = (x1 - x0) / N, w = slot * (n ? 0.8 : 0.68);
      var rows = cfg.hi - cfg.lo + 1, rh = (y1 - y0) / rows;
      function X(i) { return x0 + (i + 0.5) * slot + 3; }
      function Y(t) { return y1 - (t - cfg.lo + 0.5) * rh; }
      for (var t = cfg.lo; t <= cfg.hi; t++) {
        if ((t - cfg.lo) % 4) continue;
        s += line(x0 - 6, Y(t), x1, Y(t), "rgba(255,255,255,0.05)", 1);
        s += txt(x1 + 6, Y(t) + 4, P2(cfg.base + t * 0.25), C.faint, 10.5);
      }
      s += txt(x0 - 6, y0 - 16, n ? cfg.titleN : cfg.title, C.faint, 12, "start", 600);
      var g = { T: T, n: n, L: L, X: X, Y: Y, x0: x0, x1: x1, y0: y0, y1: y1, rh: rh, w: w, slot: slot, nx: 840 };
      if (cfg.under) s += cfg.under(T, g);
      F.forEach(function (f, i) {
        var o = cfg.look(T, i, g);
        o.fs = n ? Math.min(11.5, rh * 0.62) : Math.min(11, rh * 0.68);
        s += drawFP(f, X(i), w, Y, rh, clamp01((T - cfg.at[i]) / 0.8), o);
      });
      if (cfg.overlay) s += cfg.overlay(T, g);
      return s + stamp(L, n ? "Illustrative · made-up footprints" : "Illustrative · made-up footprints · imbalances at 4:1, read diagonally");
    }
    return { stages: cfg.stages, end: cfg.end, frame: frame, size: size };
  }
  /* a zone carried forward from footprint i0 toward the right edge (ext 0..1) */
  function zoneFP(g, a, b, col, op, i0, ext) {
    if (op <= 0) return "";
    var ya = g.Y(b) - g.rh / 2, yb = g.Y(a) + g.rh / 2, xa = g.X(i0) - g.w / 2 - 8, xb = lerp(g.X(i0) + g.w / 2 + 6, g.x1, ease(ext == null ? 1 : ext));
    return rect(xa, ya, xb - xa, yb - ya, col, 3, 0.13 * op) + line(xa, ya, xb, ya, col, 1.6, "5 4", op) + line(xa, yb, xb, yb, col, 1.6, "5 4", op);
  }
  function ringRows(g, i, a, b, col, op) {
    if (op <= 0) return "";
    var ya = g.Y(b) - g.rh / 2 - 3, yb = g.Y(a) + g.rh / 2 + 3;
    return frameRect(g.X(i) - g.w / 2 - 12, ya, g.w + 18, yb - ya, col, 2.2, op, 6);
  }

  /* =====================================================================
     1 · What an imbalance is: the bid at one price against the offer one tick up
     ===================================================================== */
  function diagonalSpec() {
    var BASE = 3962.75;
    var CELLS = { 0: [24, 18], 1: [41, 22], 2: [96, 30], 3: [52, 19], 4: [38, 33], 5: [35, 41],
                  6: [30, 47], 7: [27, 52], 8: [25, 58], 9: [20, 64], 10: [18, 150] };
    var F = imbs({ o: 1, c: 10, lo: 0, hi: 10, cells: CELLS });
    var ST = [
      { at: 0, title: "A bid, and an offer one tick up", text: "Every moment of the auction has a bid at one price and an offer at the next price up. Sellers in a hurry hit the bid. Buyers in a hurry lift the offer." },
      { at: 3.6, title: "20 on the bid, 150 on the offer", text: "Say the market is 3,965.00 bid at 3,965.25. Only 20 contracts trade on the bid while 150 trade on the offer. That's a buying imbalance: far more aggressive buying than selling across that one-tick gap." },
      { at: 7.4, title: "The line: about 4 to 1", text: "How lopsided does it have to be? People use 3 to 1, 5 to 1, even 6 to 1. If there's an industry standard, it's about 4 to 1. Pick one and keep it." },
      { at: 11, title: "Read the whole footprint that way", text: "A footprint lists the bid and ask volume at every price in the bar. Compare each offer with the bid one tick below it, all the way up. Here only one row clears 4 to 1." },
      { at: 15.2, title: "The mirror: a selling imbalance", text: "Flip it for sellers: compare each bid with the offer one tick above it. 96 hit the bid at 3,963.25 against 19 lifting the offer at 3,963.50. Five to one: a selling imbalance." }
    ];
    return {
      stages: ST, end: 19.6,
      size: function (n) { return n ? { W: 440, H: 780 } : { W: 1180, H: 540 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "", post = "";
        var y0 = n ? 300 : 62, y1 = L.H - (n ? 34 : 44), rh = (y1 - y0) / 11;
        var pX = n ? 96 : 210, bX0 = n ? 106 : 226, cw = n ? 124 : 132, aX0 = bX0 + cw + 6;
        function Y(t) { return y1 - (t + 0.5) * rh; }
        var full = fade(T, 11, 0.6);
        s += txt(n ? 14 : pX - 150, y0 - 30, n ? "A footprint's price ladder" : "A footprint's price ladder · made-up index future", C.faint, 12, "start", 600);
        s += txt(bX0 + cw / 2, y0 - 10, "BID", C.dn, 12, "middle", 700);
        s += txt(aX0 + cw / 2, y0 - 10, "ASK / OFFER", C.up, 12, "middle", 700);
        var focus = T < 11 ? function (t) { return t === 9 || t === 10; } : function () { return true; };
        for (var t = 0; t <= 10; t++) {
          var y = Y(t) - rh / 2 + 1, on = focus(t) ? 1 : 0.35, q = F.cells[t];
          s += txt(pX, Y(t) + 4, P2(BASE + t * 0.25), on > 0.5 ? C.dim : C.faint, 12, "end", on > 0.5 ? 600 : null);
          s += rect(bX0, y, cw, rh - 2, "#2c2c2e", 4, on);
          s += rect(aX0, y, cw, rh - 2, "#2c2c2e", 4, on);
          /* numbers: only the two cells of the example until the whole ladder fills in */
          var showB = t === 9 ? fade(T, 3.8, 0.5) : full, showA = t === 10 ? fade(T, 4.4, 0.5) : full;
          var bHot = t === 2 && T >= 15.4, aHot = t === 10 && T >= 4.4 && (T < 15.2);
          if (bHot) s += rect(bX0, y, cw, rh - 2, C.dn, 4, 0.6 * fade(T, 15.6, 0.4));
          if (aHot || (t === 10 && T >= 15.2)) s += rect(aX0, y, cw, rh - 2, C.up, 4, (T >= 15.2 ? 0.25 : 0.55) * fade(T, 4.6, 0.4));
          if (t === 3 && T >= 15.4) s += frameRect(aX0, y, cw, rh - 2, C.dn, 2, fade(T, 15.8, 0.4), 4);
          if (t === 9 && T >= 3.8 && T < 15.2) s += frameRect(bX0, y, cw, rh - 2, C.dn, 2, fade(T, 3.8, 0.4), 4);
          s += num(bX0 + cw / 2, Y(t) + 5, String(Math.round(q[0] * ease(showB))), bHot ? "#fff" : C.dim, 15, "middle", bHot || (t === 9 && T < 11) ? 800 : null, showB);
          s += num(aX0 + cw / 2, Y(t) + 5, String(Math.round(q[1] * ease(showA))), aHot ? "#fff" : C.dim, 15, "middle", aHot || t === 10 ? 800 : null, showA);
        }
        /* stage 1: the best bid and best offer */
        var s1 = win(T, 0.4, 3.6);
        if (s1 > 0) {
          s += frameRect(bX0 - 2, Y(9) - rh / 2, cw + 4, rh, C.blue, 2.4, s1, 5);
          s += frameRect(aX0 - 2, Y(10) - rh / 2, cw + 4, rh, C.blue, 2.4, s1, 5);
          post += tag(bX0 + cw / 2, Y(9) + rh / 2 + 12, "best bid", C.blue, s1, "middle");
          post += tag(aX0 + cw / 2, Y(10) - rh / 2 - 12, "best offer", C.blue, s1, "middle");
        }
        /* the diagonal: bid at 3,965.00 against the offer at 3,965.25 */
        var dg = fade(T, 4.2, 0.5) * (1 - fade(T, 11, 0.3)), xb = bX0 + cw - 10, xa = aX0 + 10;
        if (dg > 0) {
          s += arrow(xb, Y(9) - 6, xa, Y(10) + 6, C.gold, dg);
          post += tag(n ? 220 : aX0 + cw + 12, n ? 200 : Y(10), "150 ÷ 20 = 7.5 : 1 · buying imbalance", C.up, fade(T, 5, 0.4) * (1 - fade(T, n ? 7.4 : 11, 0.3)), n ? "middle" : "start");
        }
        /* stage 3: the ratio scale */
        var rs = win(T, 7.6, 11);
        if (rs > 0) {
          var sx0 = n ? 40 : aX0 + cw + 40, sx1 = n ? 400 : 760, sy = n ? 205 : Y(5);
          var RX = function (r) { return sx0 + (r - 1) / 7 * (sx1 - sx0); };
          s += line(sx0, sy, sx1, sy, C.faint, 2, null, rs);
          [1, 2, 3, 4, 5, 6, 7, 8].forEach(function (r) { s += line(RX(r), sy - 5, RX(r), sy + 5, C.faint, 1.4, null, rs); s += txt(RX(r), sy + 22 * FS, r + ":1", r === 4 ? C.gold : C.faint, 12, "middle", r === 4 ? 700 : null, rs); });
          s += rect(RX(3), sy - 4, RX(6) - RX(3), 8, C.grey, 3, 0.5 * rs);
          s += dot(RX(4), sy, 8, C.gold, rs);
          s += dot(RX(7.5), sy, 6, C.up, rs);
          post += tag(RX(4), sy - 22, n ? "~4:1 standard" : "about 4:1 · the closest thing to a standard", C.gold, rs, "middle");
          post += tag(RX(7.5), sy + 44 * FS, "our 7.5:1", C.up, rs, "middle");
        }
        /* stage 4: scan up the ladder */
        var sc = win(T, 11.4, 15.2);
        if (sc > 0) {
          var r = Math.min(10, 1 + Math.floor(clamp01((T - 11.6) / 2.8) * 10));
          var hit = F.buy[r];
          s += arrow(xb, Y(r - 1) - 6, xa, Y(r) + 6, hit ? C.up : C.gold, sc);
          post += tag(n ? 220 : aX0 + cw + 12, n ? 200 : Y(r), Math.round(F.cells[r][1]) + " vs " + F.cells[r - 1][0] + " = " + (F.cells[r][1] / F.cells[r - 1][0]).toFixed(1) + ":1" + (hit ? " ✓" : ""), hit ? C.up : C.dim, sc, n ? "middle" : "start");
        }
        /* stage 5: the selling imbalance */
        var s5 = fade(T, 15.4, 0.4);
        if (s5 > 0) {
          s += arrow(aX0 + 10, Y(3) + 6, bX0 + cw - 10, Y(2) - 6, C.dn, s5);
          post += tag(n ? 220 : aX0 + cw + 12, n ? 200 : Y(2) + 4, "96 ÷ 19 = 5.1 : 1 · selling imbalance", C.dn, s5, n ? "middle" : "start");
        }
        s += post;
        var g = { n: n, nx: 840, y0: 62 };
        s += note2(g, ["The two-way auction", "Bid at one price, offer", "one tick above it.", "Sellers hit the bid.", "Buyers lift the offer."], C.blue, win(T, 0.4, 3.6));
        s += note2(g, ["Buying imbalance", "Compare diagonally: the", "offer at 3,965.25 with the", "bid at 3,965.00.", "150 vs 20: buyers won."], C.up, win(T, 4.4, 7.4));
        s += note2(g, ["Pick a ratio, keep it", "3:1, 4:1, 5:1 or 6:1.", "About 4:1 is the closest", "thing to a standard.", "This page uses 4:1."], C.gold, win(T, 7.6, 11), n ? null : 300);
        s += note2(g, ["Read it diagonally", "Each offer against the", "bid one tick below it.", "Most rows are balanced.", "One clears 4:1."], C.up, win(T, 11.4, 15.2));
        s += note2(g, ["Selling imbalance", "Each bid against the", "offer one tick above it.", "96 vs 19: sellers were", "five times as aggressive."], C.dn, fade(T, 15.6, 0.4));
        return s + stamp(L, "Illustrative · made-up footprint");
      }
    };
  }

  /* =====================================================================
     2 · When they stack: one imbalance is noise, three or more in a row is a level
     ===================================================================== */
  function stackSpec() {
    var F = [
      fpGen(3, 8, 1, 10, 31, { set: { 5: [6, 22], 6: [18, 41] } }),
      fpGen(8, 20, 7, 21, 32, { set: { 11: [7, 24], 12: [5, 46], 13: [6, 52], 14: [4, 49], 15: [9, 38], 17: [8, 21], 18: [15, 37] } }),
      fpGen(20, 23, 18, 25, 33),
      fpGen(23, 25, 21, 27, 34),
      fpGen(25, 14, 13, 26, 35, { set: { 18: [44, 20], 19: [51, 8], 20: [47, 6], 21: [39, 9], 22: [20, 9] } })
    ];
    var ST = [
      { at: 0, title: "Five footprints print", text: "An up-move that rolls over, in made-up footprints on an index future. Bid on the left of each row, ask on the right." },
      { at: 4.4, title: "Light up the imbalances", text: "Green: an offer that traded at least 4 times the bid one tick below. Red: a bid that traded at least 4 times the offer one tick above. They're scattered around." },
      { at: 8, title: "One on its own means little", text: "A single imbalance is one burst at one price. It happens all day. On its own it's not worth a level." },
      { at: 11.6, title: "Three or more in a row: a stack", text: "Three or more imbalances stacked neatly on top of each other, at 3,943.00, .25, .50 and .75: buyers were aggressive at every price through that gap. That's a stacked buying imbalance." },
      { at: 15.2, title: "Mark it, carry it forward", text: "Make a note of where it happened. Order flow software draws it as a line across the chart, because markets have memory and price often comes back to it." },
      { at: 19, title: "Sellers stack too", text: "The last footprint turns down with four selling imbalances stacked from 3,944.50 to 3,945.25. That's a stacked selling imbalance: a level to look for shorts if price returns." }
    ];
    return fpStrip({
      fps: F, base: 3940, lo: 0, hi: 27, at: [0.3, 1.1, 1.9, 2.7, 3.5], stages: ST, end: 23.4,
      title: "Five made-up footprints · bid × ask at each price", titleN: "Five made-up footprints",
      look: function (T, i) {
        var imb = fade(T, 4.6, 0.6), op = function () { return 1; };
        if (T >= 8 && T < 11.6) op = function (t) { return (i === 0 && t === 6) || (i === 1 && t === 18) ? 1 : 0.4; };
        else if (T >= 11.6 && T < 15.2) op = function (t) { return i === 1 && t >= 12 && t <= 15 ? 1 : 0.4; };
        else if (T >= 19) op = function (t) { return (i === 4 && t >= 18 && t <= 21) || (i === 1 && t >= 12 && t <= 15) ? 1 : 0.5; };
        return { imb: imb, rowOp: op };
      },
      under: function (T, g) {
        return zoneFP(g, 12, 15, C.up, fade(T, 15.4, 0.4), 1, fade(T, 15.6, 1.4)) + zoneFP(g, 18, 21, C.dn, fade(T, 19.6, 0.4), 4, fade(T, 19.8, 0.8));
      },
      overlay: function (T, g) {
        var s = "";
        var lo = win(T, 8.2, 11.6);
        s += ringRows(g, 0, 6, 6, C.gold, lo) + ringRows(g, 1, 18, 18, C.gold, lo);
        s += tag(g.X(0), g.Y(6) - g.rh - 8, "alone", C.gold, lo, "middle");
        s += ringRows(g, 1, 12, 15, C.up, win(T, 11.8, 15.4));
        s += tag(g.X(1), g.Y(11) + g.rh + 10, g.n ? "4 stacked" : "4 stacked · buying", C.up, win(T, 11.8, 15.4), "middle");
        var zl = fade(T, 16.4, 0.4);
        s += tag(g.X(1) + g.w / 2 + 12, g.Y(12) + g.rh / 2 + 14, g.n ? "3,943.00–.75 · buyers" : "stacked buying · 3,943.00–3,943.75", C.up, zl, "start");
        s += ringRows(g, 4, 18, 21, C.dn, fade(T, 19.2, 0.4));
        s += tag(g.X(4) + g.w / 2 + 6, g.Y(12) + g.rh / 2 + 14 + 26 * FS, g.n ? "3,944.50–.25 · sellers" : "selling · 3,944.50–3,945.25", C.dn, fade(T, 19.6, 0.4), "end");
        s += note(g, ["Footprints", "Each row: contracts at the", "bid (left) and at the ask", "(right) at that price."], C.dim, win(T, 0.6, 4.4));
        s += note(g, ["Imbalances at 4:1", "Green ask: buyers lifted it", "4x the bid one tick down.", "Red bid: sellers hit it 4x", "the offer one tick up."], C.up, win(T, 4.6, 8));
        s += note(g, ["One alone", "A single burst at one price.", "It happens all day.", "Not a level on its own."], C.gold, win(T, 8.2, 11.6));
        s += note(g, ["A stack: 3 or more", "Imbalances on top of each", "other at consecutive prices.", "Buyers were aggressive all", "the way through the gap."], C.up, win(T, 11.8, 15.2));
        s += note(g, ["Carry it forward", "Note where it happened.", "Liquidity has memory: price", "often comes back to it."], C.up, win(T, 15.4, 19));
        s += note(g, ["A selling stack", "Four red bids in a row as", "the bar turns down. A level", "for shorts on a return."], C.dn, fade(T, 19.2, 0.4));
        return s;
      }
    });
  }

  /* =====================================================================
     3 · Markets have memory: the payroll stack at 3,973–3,974, bid 3,974, stop 3,973, to 3,994
     ===================================================================== */
  function memorySpec() {
    var RAW = [
      [3961, 3963, 3959.5, 3962], [3962, 3962.75, 3959, 3959.5], [3959.5, 3962.5, 3958.5, 3962], [3962, 3963.5, 3960, 3960.5],
      [3960.5, 3964, 3960, 3963], [3963, 3963.75, 3960.5, 3961], [3961, 3963.25, 3960.25, 3962.5], [3962.5, 3963, 3961, 3962],
      [3962, 3989.5, 3961.5, 3987.5],
      [3987.5, 3991, 3985.5, 3990], [3990, 3994, 3988.75, 3993], [3993, 3994.5, 3990.5, 3991.5], [3991.5, 3996.25, 3991, 3995], [3995, 3998, 3993.5, 3996.5]
    ];
    var B = RAW.map(ob);
    var prev = 3996.5;
    [3993.5, 3990.75, 3988.5, 3990, 3986, 3983.25, 3984.5, 3980.5, 3978, 3979.25, 3976.25, 3975.5].forEach(function (c) {
      B.push({ o: prev, h: Math.max(prev, c) + 0.75, l: Math.max(3974.5, Math.min(prev, c) - 0.75), c: c }); prev = c;
    });
    [[3975.5, 3976.5, 3974, 3975], [3975, 3976, 3974.25, 3974.75], [3974.75, 3976.25, 3974, 3975.75], [3975.75, 3976.5, 3974.5, 3976.25],
     [3976.25, 3979.5, 3975.75, 3979], [3979, 3983, 3978.5, 3982.5], [3982.5, 3987.25, 3982, 3986.75], [3986.75, 3987.5, 3984.75, 3985.5],
     [3985.5, 3989.5, 3985, 3989], [3989, 3992.25, 3988.25, 3991.75], [3991.75, 3994.25, 3990.75, 3993.5], [3993.5, 3994, 3991.5, 3992.25]
    ].forEach(function (a) { B.push(ob(a)); });
    var N = B.length, lo = 3955, hi = 4001, TOUCH = 26;
    /* the zoomed footprint rows inside the payroll bar, 3,971.50 to 3,975.50 */
    var ZB = 3971.5, ZC = [[14, 22], [12, 25], [15, 28], [11, 30], [13, 31], [6, 29], [7, 41], [5, 38], [4, 46], [6, 35], [8, 33], [15, 29], [17, 34], [14, 30], [18, 33], [16, 27], [19, 31]];
    var ZF = { lo: 0, hi: 16, cells: {} };
    ZC.forEach(function (q, i) { ZF.cells[i] = q; });
    imbs(ZF);
    var ST = [
      { at: 0, title: "A normal candle chart", text: "Open, high, low, close, and a color. Before the jobs number the market chops in a tight range. That's all a candle chart will tell you." },
      { at: 3.2, title: "The payroll bar", text: "The non-farm payroll number comes out and the market shoots straight up: boom, boom, boom. A lot of aggressive buying, and not much liquidity in the way." },
      { at: 6.4, title: "Back to 3,974. Why there?", text: "Later the market comes off and drifts right back down to 3,974, then stops. On a candle chart you can't see why. Something happened at that price earlier." },
      { at: 10, title: "Open up the payroll bar", text: "Inside the payroll bar, the footprint shows five buying imbalances stacked from 3,973.00 to 3,974.00. That's market-generated information, and your software draws it forward as a line." },
      { at: 14, title: "Bid 3,974, stop 3,973", text: "If you knew that level, all you had to do was put a bid in around 3,974 with a stop at 3,973. And it holds: one bar, two bars, three bars, four bars." },
      { at: 18, title: "3,974 to 3,994", text: "Then it rallies from 3,974 to 3,994 in about 10 to 15 minutes. One point of risk, twenty points of move. He's clear this isn't normal: you still need context and risk management." }
    ];
    return {
      stages: ST, end: 23,
      size: function (n) { return n ? { W: 440, H: 820 } : { W: 1180, H: 540 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L, { band: 316 }), s = "", post = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [2.8, 8], [3.4, 9], [6, 14], [9.4, 27], [14.2, 27], [17.4, 30], [21, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        var last = Math.min(N - 1, Math.ceil(cnt) - 1);
        s += grid(g);
        s += axis(g, lo, hi, 10, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "Made-up bars · index future" : "Payroll Friday on an index future · made-up bars", C.faint, 12, "start", 600);
        /* the stacked imbalance zone, drawn forward from the payroll bar */
        var zo = fade(T, 11.6, 0.4), ze = fade(T, 12, 1.2);
        if (zo > 0) {
          var xa = X(8) - bw, xb = lerp(X(8) + bw, Math.max(X(last) + bw, X(8) + bw), ease(ze));
          if (T >= 14) xb = g.x1;
          s += rect(xa, Y(3974), xb - xa, Y(3973) - Y(3974), C.up, 2, 0.22 * zo);
          s += line(xa, Y(3974), xb, Y(3974), C.up, 1.6, null, zo) + line(xa, Y(3973), xb, Y(3973), C.up, 1.6, null, zo);
          post += tag(X(9.5), Y(3973) + 16 * FS, n ? "stack 3,973–3,974" : "stacked buying imbalance · 3,973–3,974", C.up, zo, "start");
        }
        /* the stop and the target */
        var eo = fade(T, 14.2, 0.4);
        if (eo > 0) {
          s += line(X(TOUCH) - bw, Y(3973) + 3, g.x1, Y(3973) + 3, C.dn, 2, "6 4", eo);
          post += tag(g.x1 - 2, Y(3973) + 22 * FS, "stop 3,973", C.dn, eo, "end");
        }
        s += drawBars(B, X, Y, cnt, bw);
        if (eo > 0) {
          s += dot(X(TOUCH), Y(3974), 6, C.up, eo);
          post += tag(X(TOUCH) - bw - 6, Y(3974) - 4, "bid 3,974", C.up, eo, "end");
          for (var h = 0; h < (n ? 0 : 4); h++) {
            var ho = fade(T, 14.6 + h * 0.6, 0.3) * (1 - 0.6 * fade(T, 18, 0.4));
            post += tag(X(TOUCH + h), Y(B[TOUCH + h].h) - 14, String(h + 1), C.up, ho, "middle");
          }
        }
        var to = fade(T, 20.6, 0.4);
        if (to > 0) {
          s += line(X(TOUCH), Y(3994.25), g.x1, Y(3994.25), C.up, 1.4, "4 4", to);
          s += line(X(TOUCH) + bw + 6, Y(3974), X(TOUCH) + bw + 6, Y(3994.25), C.ink, 1.6, null, to);
          post += tag(X(TOUCH) + bw + 12, Y(3984), "+20 pts", C.ink, to, "start");
          post += tag(g.x1 - 2, Y(3994.25) - 14, "3,994", C.up, to, "end");
        }
        /* the payroll label and the question mark */
        var po = win(T, 3.4, 10);
        post += tag(X(8), Y(3989.5) - 16, "payrolls", C.ink, po, "middle");
        var qo = win(T, 9, 14);
        if (qo > 0) post += tag(X(TOUCH), Y(3974) + (n ? 50 : 26) * FS, "why here?", C.orange, qo, "middle");
        /* stage 4: open the payroll bar: a zoomed footprint */
        var io = win(T, 10.2, 14);
        if (io > 0) {
          s += frameRect(X(8) - bw - 4, Y(3975.5), 2 * bw + 8, Y(3971.5) - Y(3975.5), C.gold, 2, io, 3);
          var ix0 = n ? 92 : 876, iy0 = n ? 34 : 56, irh = n ? 15.6 : 21.5, icw = n ? 122 : 124;
          var IY = function (t) { return iy0 + (16 - t) * irh; };
          s += '<g opacity="' + io.toFixed(3) + '">';
          s += rect(ix0 - (n ? 82 : 86), iy0 - (n ? 26 : 30), (n ? 82 : 86) + icw * 2 + 18, 17 * irh + (n ? 34 : 40), C.bg, 10, 0.96);
          s += txt(ix0 - (n ? 74 : 78), iy0 - (n ? 10 : 12), n ? "Inside the payroll bar" : "Inside the payroll bar · zoomed in", C.gold, 12, "start", 700);
          for (var t = 0; t <= 16; t++) {
            var yy = IY(t), q = ZC[t], sb = ZF.buy[t] && T >= 11;
            s += txt(ix0 - 8, yy + irh / 2 + 4, P2(ZB + t * 0.25), sb ? C.up : C.faint, 10.5, "end", sb ? 700 : null);
            s += rect(ix0, yy + 1, icw, irh - 2, "#2c2c2e", 3);
            s += rect(ix0 + icw + 4, yy + 1, icw, irh - 2, sb ? C.up : "#2c2c2e", 3, sb ? 0.55 : 1);
            s += num(ix0 + icw / 2, yy + irh / 2 + 4, String(q[0]), C.dim, 11, "middle");
            s += num(ix0 + icw + 4 + icw / 2, yy + irh / 2 + 4, String(q[1]), sb ? "#fff" : C.dim, 11, "middle", sb ? 800 : null);
          }
          s += "</g>";
          if (!n) s += line(X(8) + bw + 6, Y(3973.5), ix0 - 90, iy0 + 8 * irh, C.gold, 1.2, "4 4", io);
        }
        s += post;
        s += note2(g, ["A candle chart", "Open, high, low, close.", "It shows what price did,", "not who did it or where."], C.dim, win(T, 0.4, 3.2));
        s += note2(g, ["The payroll bar", "Non-farm payrolls. Price", "shoots straight up on", "aggressive buying."], C.up, win(T, 3.4, 6.4));
        s += note2(g, ["Why 3,974?", "The pullback stops at a", "price you can't explain", "from the candles alone."], C.orange, win(T, 6.6, 10));
        s += note2(g, ["Bid 3,974, stop 3,973", "Buy the return to the stack,", "stop at the other end.", "It holds bar after bar."], C.up, win(T, 14.2, 18));
        s += note2(g, ["About 20 to 1", "Risk: 1 point.", "Move: 3,974 to 3,994", "in about 10 to 15 minutes.", "Not normal. Still a level."], C.up, fade(T, 18.2, 0.4));
        return s + stamp(L, n ? "Illustrative · made-up bars" : "Illustrative · made-up bars · levels and prices from the video");
      }
    };
  }

  /* =====================================================================
     4 · Not every stack holds: four returns, four outcomes
     ===================================================================== */
  function outcomesSpec() {
    function panel(def, seed) {
      var B = mkBars(def.cl, def.cl[0] + (def.side === "buy" ? 0.4 : -0.4), seed, (def.hi - def.lo) * 0.045);
      if (def.side === "buy") clampRange(B, 0, def.touch - 1, 1.15, null);
      else clampRange(B, 0, def.touch - 1, null, -0.15);
      if (def.fix) def.fix(B);
      def.B = B;
      return def;
    }
    var P = [
      panel({ title: "Holds, then goes", side: "buy", lo: -2, hi: 8, touch: 9, res: "+5 pts", rcol: C.up,
              cl: [5, 4.4, 4.8, 3.6, 3.9, 2.8, 2.1, 2.6, 1.6, 1.3, 1.7, 2.6, 3.4, 4.2, 5.1, 5.9, 6.2, 6.0],
              fix: function (B) { B[9].l = 1.0; clampRange(B, 10, 17, 1.1, null); } }, 41),
      panel({ title: "One tick through, then goes", side: "buy", lo: -4, hi: 24, touch: 8, res: "+20 pts", rcol: C.up,
              cl: [7, 6, 6.4, 4.8, 5.1, 3.6, 2.9, 2.2, 1.4, 3.2, 5.5, 7.8, 7.1, 10.4, 13.5, 12.8, 16.2, 18.6, 20.4, 21.2],
              fix: function (B) { B[8].l = 0.75; clampRange(B, 9, 19, 1.4, null); } }, 42),
      panel({ title: "Goes sideways", side: "sell", lo: -8, hi: 4, touch: 9, res: "scratch", rcol: C.grey,
              cl: [-6, -5.2, -5.6, -4.1, -4.5, -3.2, -2.4, -2.8, -1.6, -1.0, -1.4, -0.8, -1.5, -1.1, -0.7, -1.3, -0.9, -1.2],
              fix: function (B) { B[9].h = 0.0; clampRange(B, 10, 17, null, 0.2); } }, 43),
      panel({ title: "Blows through", side: "sell", lo: -7, hi: 7, touch: 8, res: "−1 pt", rcol: C.dn,
              cl: [-5, -4.2, -4.6, -3.3, -3.6, -2.4, -1.8, -1.2, -0.4, 0.9, 1.8, 2.9, 2.6, 3.8, 4.6, 4.3, 5.4],
              fix: function (B) { B[8].h = 0.4; } }, 44)
    ];
    var AT = [0.3, 4.6, 9.2, 13.8];
    var ST = [
      { at: 0, title: "Holds, then goes", text: "A small buying stack that only lasted three bars. Price comes back, holds it, and a buy around the level rallies into the next handle: a quick five points." },
      { at: 4.6, title: "One tick through, then goes", text: "Price comes back and pushes one tick past the level before shooting up about 20 points in a methodical move. A stack is a zone, not a laser line." },
      { at: 9.2, title: "Goes sideways", text: "A selling stack that holds, but nothing happens. The question to ask: is this market paying me, or just going sideways on me? If it's sideways, get out and wait for something better." },
      { at: 13.8, title: "Blows through", text: "A selling stack that fails. Price goes straight through and keeps going. Market conditions change, and the aggressive sellers who were there earlier aren't interested anymore. Take the small loss." },
      { at: 18.4, title: "Same signal, four outcomes", text: "Not every stack holds, and you can't trade them blindly. It's something to build a strategy around, with market context and real risk management on every one." }
    ];
    return {
      stages: ST, end: 22.4,
      size: function (n) { return n ? { W: 440, H: 1080 } : { W: 1180, H: 540 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        P.forEach(function (p, i) {
          var px0, py0, pw, ph;
          if (n) { px0 = 12; pw = 416; ph = 252; py0 = 14 + i * (ph + 14); }
          else { pw = 548; ph = 238; px0 = 24 + (i % 2) * (pw + 36); py0 = 22 + Math.floor(i / 2) * (ph + 24); }
          var on = T >= AT[i] ? 1 : 0.25, cur = stageIs(T, i);
          s += rect(px0, py0, pw, ph, "#141416", 14, 1);
          if (cur) s += frameRect(px0, py0, pw, ph, p.rcol === C.grey ? C.dim : p.rcol, 1.6, 0.8, 14);
          var x0 = px0 + 16, x1 = px0 + pw - 18, y0 = py0 + 44, y1 = py0 + ph - 18;
          var Nb = p.cl.length, X = function (k) { return x0 + (k + 0.5) * (x1 - x0) / Nb; }, Y = function (v) { return y1 - (v - p.lo) / (p.hi - p.lo) * (y1 - y0); };
          var bw = (x1 - x0) / Nb * 0.6, cnt = clamp01((T - AT[i]) / 3.6) * Nb;
          s += txt(px0 + 16, py0 + 26, (i + 1) + " · " + p.title, T >= AT[i] ? C.ink : C.faint, 15, "start", 700);
          var zc = p.side === "buy" ? C.up : C.dn;
          s += rect(x0, Y(1), x1 - x0, Y(0) - Y(1), zc, 2, 0.18 * on);
          s += line(x0, Y(1), x1, Y(1), zc, 1.2, "5 4", on) + line(x0, Y(0), x1, Y(0), zc, 1.2, "5 4", on);
          s += txt(x1, p.side === "buy" ? Y(0) + 15 * FS : Y(1) - 6, p.side === "buy" ? "buying stack" : "selling stack", zc, 11.5, "end", 600, on);
          if (cnt > 0) s += drawBars(p.B, X, Y, cnt, bw);
          var eo = cnt >= p.touch + 0.6 ? 1 : 0;
          if (eo) {
            var ey = p.side === "buy" ? 1 : 0;
            s += dot(X(p.touch), Y(ey), 5, p.side === "buy" ? C.up : C.dn, 1);
          }
          if (cnt >= Nb - 0.05) {
            s += pill(px0 + pw - 18, py0 + 30, p.res, p.rcol, 1, "end");
            if (i === 1) s += tag(X(p.touch), Y(0.75) + 16 * FS, "1 tick through", C.orange, 1, "middle");
            if (i === 3) s += cross(X(9), Y(1), C.dn, 1);
          }
        });
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
    function stageIs(T, i) { var k = 0; ST.forEach(function (st, j) { if (T >= st.at) k = j; }); return k === i; }
  }

  /* =====================================================================
     5 · The short side: the stack at 3,921–3,922, a shallow return, sellers still there
     ===================================================================== */
  function shortSpec() {
    var F = [
      fpGen(25, 8, 7, 26, 51, { set: { 16: [47, 14], 17: [52, 10], 18: [58, 9], 19: [49, 12], 20: [44, 8], 21: [30, 11] } }),
      fpGen(8, 4, 2, 10, 52),
      fpGen(4, 9, 3, 10, 53),
      fpGen(9, 15, 8, 16, 54),
      fpGen(15, 13, 12, 17, 55, { set: { 14: [34, 13], 15: [38, 8], 16: [44, 9], 17: [36, 10] } }),
      fpGen(13, 4, 3, 14, 56)
    ];
    var ST = [
      { at: 0, title: "A stacked selling imbalance", text: "A bar breaks down hard. Inside it, five selling imbalances stack up from 3,921.00 to 3,922.00: sellers hitting the bid far harder than buyers lifted the offer." },
      { at: 4, title: "Mark 3,921 to 3,922", text: "That's the level. Not a calculation, just what actually traded: more aggressive selling than buying, at those prices." },
      { at: 7.4, title: "Price comes back up", text: "The market drops, then rallies back toward the level. Now you wait to see what happens when it gets there." },
      { at: 11.4, title: "Barely in, sellers still there", text: "It only pokes one tick into the stack, and the footprint shows fresh selling imbalances right at the level. Not penetrating much, aggressive selling still coming in: that's the short." },
      { at: 15.4, title: "Short at the stack", text: "Sell at 3,921.00 with a stop at 3,922.00, the far end of the stack. The market rolls over from the level." }
    ];
    return fpStrip({
      fps: F, base: 3917, lo: 0, hi: 26, at: [0.3, 7.6, 8.6, 9.6, 10.6, 15.6], stages: ST, end: 19.8,
      title: "Six made-up footprints · bid × ask at each price", titleN: "Six made-up footprints",
      look: function (T, i) {
        var op = function () { return 1; };
        if (T >= 11.4 && T < 15.4) op = function (t) { return i === 4 && t >= 14 && t <= 16 ? 1 : (i === 0 && t >= 16 && t <= 20 ? 0.9 : 0.45); };
        return { imb: fade(T, 1.6, 0.6), rowOp: op };
      },
      under: function (T, g) { return zoneFP(g, 16, 20, C.dn, fade(T, 4.2, 0.4), 0, fade(T, 4.4, 1.4)); },
      overlay: function (T, g) {
        var s = "";
        s += ringRows(g, 0, 16, 20, C.dn, win(T, 2, 4.4));
        s += tag(g.X(0) + g.w / 2 + 12, g.Y(20) - g.rh / 2 - 13, "5 stacked", C.dn, win(T, 2, 4.4), "start");
        var zl = fade(T, 5, 0.4);
        s += tag(g.x1 - 4, g.Y(20) - g.rh / 2 - 13, g.n ? "3,921–3,922 · sellers" : "stacked selling · 3,921.00–3,922.00", C.dn, zl, "end");
        var r4 = win(T, 11.6, 15.6);
        s += ringRows(g, 4, 14, 16, C.dn, r4);
        s += tag(g.X(4), g.Y(12) + g.rh / 2 + 14, g.n ? "sellers again" : "fresh selling imbalances", C.dn, r4, "middle");
        s += tag(g.X(4), g.Y(17) - g.rh - 12, "1 tick in", C.orange, r4, "middle");
        var eo = fade(T, 15.6, 0.4);
        if (eo > 0) {
          s += line(g.X(4) - g.w / 2, g.Y(20) - g.rh / 2 - 1, g.x1, g.Y(20) - g.rh / 2 - 1, C.ink, 2, "6 4", eo);
          s += tag(g.x1 - 4, g.Y(20) - g.rh / 2 - 34 * FS, "stop 3,922.00", C.ink, eo, "end");
          s += dot(g.X(4) + g.w / 2 + 8, g.Y(16), 6, C.dn, eo);
          s += tag(g.X(4), g.Y(17) - g.rh - 12, g.n ? "short 3,921" : "short 3,921.00", C.dn, eo, "middle");
        }
        s += note(g, ["A selling stack", "Five bids in a row, each", "4x the offer one tick", "above it."], C.dn, win(T, 0.6, 4));
        s += note(g, ["The level", "3,921.00 to 3,922.00.", "Generated by what traded,", "not by a formula."], C.dn, win(T, 4.2, 7.4));
        s += note(g, ["Wait for the return", "Price drops, then rallies", "back toward the stack."], C.dim, win(T, 7.6, 11.4));
        s += note(g, ["Two checks", "Not penetrating much:", "only 1 tick in.", "Sellers still aggressive:", "new red imbalances."], C.orange, win(T, 11.6, 15.4));
        s += note(g, ["Short the stack", "Sell 3,921.00.", "Stop 3,922.00, the", "far end of the stack."], C.dn, fade(T, 15.6, 0.4));
        return s;
      }
    });
  }

  var SPECS = { diagonal: diagonalSpec, stack: stackSpec, memory: memorySpec, outcomes: outcomesSpec, short: shortSpec };
  document.querySelectorAll("[data-si-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-si-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     Trading a stacked imbalance, step by step, as a click-through stepper.
     Without the script the five show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-si-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "Spot",  c: C.blue,   tag: "4 to 1, read diagonally" },
      { k: "Stack", c: C.up,     tag: "Three or more in a row" },
      { k: "Wait",  c: C.cyan,   tag: "Let price come back" },
      { k: "Read",  c: C.orange, tag: "Holding, and the same side still there?" },
      { k: "Trade", c: C.dn,     tag: "Small stop, and a reason to stay" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Trading a stacked imbalance, step by step");
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
      function pl(pts, col, w, dash) { return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2.4) + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>"; }
      function dt(x, y, col) { return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7" fill="' + col + '"/>'; }
      function n(x, y, str, col, size, anchor, weight) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (size * F).toFixed(1) + '" font-weight="' + (weight || 600) + '" text-anchor="' + (anchor || "middle") + '" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">' + str + "</text>"; }
      var top = 30, bot = H - 50;
      if (k === 0) {
        var rh = narrow ? 70 : 52, ya = top + 20, yb = ya + rh + 8, bx = 120, ax = 300, cw = 160;
        s += t(bx + cw / 2, top + 6, "BID", C.dn, 12.5, "middle", 700) + t(ax + cw / 2, top + 6, "ASK", C.up, 12.5, "middle", 700);
        s += r(bx, ya, cw, rh, "#2c2c2e", 1, 8) + r(ax, ya, cw, rh, C.up, 0.55, 8);
        s += r(bx, yb, cw, rh, "#2c2c2e", 1, 8) + r(ax, yb, cw, rh, "#2c2c2e", 1, 8);
        s += t(bx - 10, ya + rh / 2 + 5, "6", C.dim, 13, "end") + t(bx - 10, yb + rh / 2 + 5, "5", C.dim, 13, "end");
        s += n(ax + cw / 2, ya + rh / 2 + 7, "150", "#fff", 19, "middle", 800) + n(bx + cw / 2, yb + rh / 2 + 7, "20", C.ink, 19, "middle", 800);
        s += pl([[bx + cw - 16, yb + 12], [ax + 16, ya + rh - 12]], C.gold, 2.6);
        s += t(W / 2, yb + rh + (narrow ? 70 : 44), "150 ÷ 20 = 7.5 : 1, past 4 : 1", C.up, 14, "middle", 700);
        s += t(30, bot + 30, "The offer against the bid one tick lower.", C.dim, 12.5, "start", 500);
      } else if (k === 1) {
        var rows = 8, rh2 = (bot - top - 10) / rows, cx = 190, cw2 = 100;
        for (var i = 0; i < rows; i++) {
          var y = top + i * rh2, hot = i >= 2 && i <= 5;
          s += r(cx, y + 2, cw2, rh2 - 4, "#2c2c2e", 1, 4) + r(cx + cw2 + 4, y + 2, cw2, rh2 - 4, hot ? C.up : "#2c2c2e", hot ? 0.6 : 1, 4);
        }
        s += r(cx - 14, top + 2 * rh2, 380 - cx + 160, 4 * rh2, C.up, 0.12, 4);
        s += ln(cx - 14, top + 2 * rh2, 540, top + 2 * rh2, C.up, 1.6, "5 4") + ln(cx - 14, top + 6 * rh2, 540, top + 6 * rh2, C.up, 1.6, "5 4");
        s += t(cx - 24, top + 4 * rh2 + 5, "3+ in a row", C.up, 13, "end", 700);
        s += t(30, bot + 30, "Note the zone and carry it forward.", C.dim, 12.5, "start", 500);
      } else if (k === 2) {
        var zy = narrow ? 300 : 200;
        s += r(40, zy - 10, 480, 22, C.up, 0.2, 3);
        s += pl([[40, zy], [80, zy - 150], [130, zy - 120], [180, zy - 170], [240, zy - 110], [300, zy - 70], [360, zy - 30], [410, zy - 2]], C.ink, 2.4);
        s += pl([[410, zy - 2], [470, zy - 60], [520, zy - 110]], C.faint, 2, "5 4");
        s += t(410, zy + 34, "it comes back", C.cyan, 12.5, "middle", 700);
        s += t(30, bot + 30, "Markets have memory. Wait for the return.", C.dim, 12.5, "start", 500);
      } else if (k === 3) {
        var Q = [["Holding?", "Not pushing deep into the stack"], ["Same side still there?", "Fresh imbalances at the level"], ["US session?", "Overnight stacks carry less volume"]];
        Q.forEach(function (q, i) {
          var y = top + i * (narrow ? 124 : 80);
          s += r(30, y, 500, narrow ? 104 : 66, C.box, 1, 14);
          s += '<circle cx="64" cy="' + (y + (narrow ? 52 : 33)) + '" r="' + (16 * F).toFixed(1) + '" fill="' + C.orange + '"/>' + t(64, y + (narrow ? 52 : 33) + 6 * F, String(i + 1), "#000", 14, "middle", 800);
          s += t(98, y + (narrow ? 44 : 28), q[0], C.ink, 14, "start", 700) + t(98, y + (narrow ? 76 : 50), q[1], C.dim, 12.5, "start", 500);
        });
      } else {
        var zt = narrow ? 290 : 196, zb = zt + 20;
        s += r(40, zt, 480, zb - zt, C.up, 0.2, 3);
        s += pl([[60, zt - 120], [130, zt - 60], [190, zt - 4], [240, zt - 2], [290, zt - 8], [340, zt - 70], [420, top + 30], [500, top + 6]], C.ink, 2.4);
        s += dt(190, zt, C.up) + t(180, zt - 14, "entry at the stack", C.up, 12.5, "end", 700);
        s += ln(40, zb + 8, 520, zb + 8, C.dn, 2, "6 4") + t(520, zb + 28, "stop at the far end", C.dn, 12.5, "end", 700);
        s += t(30, bot + 30, "Sideways and not paying you? Get out.", C.dim, 12.5, "start", 500);
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
