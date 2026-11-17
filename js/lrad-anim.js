/* =====================================================================
   lrad-anim.js — the animated walkthroughs on level-radar.html
   (The Good, The Bad And The Bitcoin, "Level Radar", a free indicator for
   TradingView and NinjaTrader).

     [data-lrad-anim="levels"]  one made-up 5-minute session: the levels at the
                                open with their odds, ORH / ORL locking in after
                                30 minutes, a touch (tick mark), the ranking panel,
                                far levels fading late in the day
     [data-lrad-anim="math"]    how the odds are worked out: distance, the room
                                left today, today's pace, 7 of 10 days = 70%
     [data-lrad-anim="decay"]   the same distance, worth less every hour
     [data-lrad-anim="use"]     a long: the realistic target vs the long shot,
                                and the clock running down on it
     [data-lrad-steps]          "the odds, step by step" as a click-through stepper
     [data-lrad-calc]           the room-left odds calculator

   The odds drawn here use the indicator's random-walk law,
   2 x (1 - Phi(1.596 x distance / scale)), with the scale it uses on session
   charts: the average range of the last ten sessions, times the square root
   of the share of the session still to come, times today's pace (capped at
   0.5x and 2x). The real indicator also blends in a 15-year table and your
   own chart's last 20 sessions, so its numbers will differ. Every bar and
   level price is made up.

   Same player as pyr-anim.js: each chart redraws in a narrow layout on a
   phone instead of scrolling sideways, with the callouts in a band on top.
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

  /* ---------- extra helpers for this page ---------- */
  function grid(g, n) {
    var s = "";
    for (var i = 0; i <= (n || 6); i++) { var y = g.y0 + (g.y1 - g.y0) * i / (n || 6); s += line(g.x0, y, g.x1, y, "#2c2c2e", 1); }
    return s;
  }
  function volBars(V, X, g, cnt, bw, hot) {
    var s = "", full = Math.floor(cnt), top = g.y1 + 24, hMax = g.vy1 - top;
    for (var i = 0; i < V.length && i < Math.ceil(cnt); i++) {
      var p = i < full ? 1 : cnt - full;
      if (p <= 0) continue;
      var h = V[i] * hMax * p, isHot = hot && hot.indexOf(i) >= 0;
      s += rect(X(i) - bw / 2, g.vy1 - h, bw, h, isHot ? C.gold : "#48484a", 1, isHot ? 0.95 : 0.8);
    }
    return s + txt(g.x0, top - 6, "volume", C.faint, 11, "start");
  }
  function volume(N, seed, base) {
    var r = rng(seed), out = [];
    for (var i = 0; i < N; i++) out.push((base || 0.3) + r() * 0.25);
    return out;
  }
  function setBar(B, i, o, h, l, c) { B[i] = { o: o, h: h, l: l, c: c }; }
  function clampRange(B, a, b, lo, hi) { for (var i = a; i <= b && i < B.length; i++) { if (lo != null) B[i].l = Math.max(B[i].l, lo); if (hi != null) B[i].h = Math.min(B[i].h, hi); } }
  function linePts(N, X, Y, pts, upto) {
    var out = [];
    for (var i = 0; i < N && i < upto; i++) out.push([X(i), Y(track(pts, i))]);
    return out;
  }
  function cross(x, y, col, op) {
    if (op <= 0) return "";
    return line(x - 7, y - 7, x + 7, y + 7, col, 2.6, null, op) + line(x - 7, y + 7, x + 7, y - 7, col, 2.6, null, op);
  }
  function chain(B, i0, closes) { var prev = B[i0 - 1].c; closes.forEach(function (c, k) { var o = prev; B[i0 + k] = { o: o, h: Math.max(o, c) + 0.3, l: Math.min(o, c) - 0.3, c: c }; prev = c; }); }

  /* ---------- the odds model used for the drawings ---------- */
  var C_RW = 1.596;
  function erfc(u) {
    var k = 1 / (1 + 0.3275911 * u);
    return k * (0.254829592 + k * (-0.284496736 + k * (1.421413741 + k * (-1.453152027 + k * 1.061405429)))) * Math.exp(-u * u);
  }
  /* chance of a touch: x = distance / scale */
  function odds(x) { if (!(x >= 0)) return 0; return Math.min(1, erfc(C_RW * x / Math.SQRT2)); }
  function scaleOf(rbar, tau, pace) { return rbar * Math.sqrt(Math.max(0, tau)) * Math.min(2, Math.max(0.5, pace == null ? 1 : pace)); }
  function pct(p) { return p > 0 && p < 0.005 ? "<1%" : Math.round(p * 100) + "%"; }
  function P2(v) { return fmt(v, 2); }
  function clock(i, N, t0) {            /* bar i of a 5-minute session that opens at t0 minutes after midnight */
    var m = (t0 || 570) + i * 5, h = Math.floor(m / 60), mm = m % 60;
    return (h > 12 ? h - 12 : h) + ":" + (mm < 10 ? "0" : "") + mm;
  }
  function glowLine(x0, x1, y, col, p, op) {
    if (op <= 0) return "";
    return line(x0, y, x1, y, col, 6 + 14 * p, null, (0.05 + 0.16 * p) * op) +
           line(x0, y, x1, y, col, 2 + 5 * p, null, (0.12 + 0.3 * p) * op) +
           line(x0, y, x1, y, col, p >= 0.5 ? 2 : 1.3, null, (0.35 + 0.65 * p) * op);
  }
  function meter(x, y, w, h, p, col, op) {
    var s = "", cw = (w - 18) / 10;
    for (var k = 0; k < 10; k++) s += rect(x + k * (cw + 2), y, cw, h, k < Math.round(p * 10) ? col : "#3a3a3c", 1.5, op * (k < Math.round(p * 10) ? 0.5 + 0.05 * k : 1));
    return s;
  }

  /* =====================================================================
     1 · One made-up session: the levels, their odds, the opening range,
         a touch, the panel, and far levels fading late in the day
     ===================================================================== */
  var SESSION = (function () {
    var N = 78, RBAR = 48;
    var CL = noisy(N, [[0, 5018], [2, 5013], [5, 5024], [8, 5021], [13, 5027.5], [19, 5030.5], [22, 5028], [30, 5025], [38, 5028], [46, 5023], [54, 5026], [62, 5024], [70, 5027], [77, 5025.5]], 1.6, 7);
    for (var q = 6; q < N; q++) CL[q] = Math.min(5030.25, Math.max(5013, CL[q]));
    CL[0] = 5016.25; CL[2] = 5011.5; CL[5] = 5025.5; CL[19] = 5030.25; CL[20] = 5029.5;
    var B = mkBars(CL, 5018, 21, 1.4);
    B[2].l = 5009.75; B[4].h = 5027.25; B[5].h = Math.min(B[5].h, 5027.0);
    for (var i = 0; i < N; i++) { if (i !== 2) B[i].l = Math.max(B[i].l, 5010.5); if (i !== 20) B[i].h = Math.min(B[i].h, 5030.75); }
    B[20].h = 5031.5;
    for (i = 6; i < N; i++) { B[i].h = Math.min(B[i].h, i === 20 ? 5031.5 : 5030.75); B[i].l = Math.max(B[i].l, 5012.25); }
    var LV = [
      { k: "PDH",  v: 5041.00, from: 0 },
      { k: "ONH",  v: 5031.00, from: 0 },
      { k: "PDC",  v: 5021.25, from: 0 },
      { k: "OPEN", v: 5018.00, from: 0 },
      { k: "ONL",  v: 5008.50, from: 0 },
      { k: "PDL",  v: 4996.50, from: 0 }
    ];
    var orh = -1e9, orl = 1e9;
    for (i = 0; i < 6; i++) { orh = Math.max(orh, B[i].h); orl = Math.min(orl, B[i].l); }
    LV.push({ k: "ORH", v: orh, from: 6 }, { k: "ORL", v: orl, from: 6 });
    /* state after bar i closes */
    function at(i) {
      var hi = -1e9, lo = 1e9, c = B[i].c, out = [];
      for (var j = 0; j <= i; j++) { hi = Math.max(hi, B[j].h); lo = Math.min(lo, B[j].l); }
      var tau = (N - 1 - i) / N, el = (i + 1) / N, pace = (hi - lo) / (RBAR * Math.sqrt(el));
      var sc = scaleOf(RBAR, tau, pace);
      LV.forEach(function (L) {
        if (i < L.from) return;
        var touched = false;
        for (var j = Math.max(1, L.from); j <= i; j++) { var trH = Math.max(B[j].h, B[j - 1].c), trL = Math.min(B[j].l, B[j - 1].c); if (trL <= L.v && L.v <= trH) touched = true; }
        out.push({ k: L.k, v: L.v, p: sc > 0 ? odds(Math.abs(L.v - c) / sc) : 0, t: touched, from: L.from });
      });
      return { lv: out, c: c, sc: sc, tau: tau, pace: pace, hi: hi, lo: lo };
    }
    return { N: N, RBAR: RBAR, B: B, LV: LV, at: at };
  })();

  function levelsSpec() {
    var S = SESSION, N = S.N, B = S.B, lo = 4990, hi = 5048;
    var ST = [
      { at: 0, title: "The levels at the open", text: "Yesterday's high, low and close, the overnight high and low, and today's open. Each one gets a number: the chance in percent that price touches it before today's session ends." },
      { at: 3.4, title: "Green above, red below, brighter = likelier", text: "Levels above price are green, levels below are red. The brighter and thicker the line, the higher the odds, so the levels that matter right now stand out and the unlikely ones fade." },
      { at: 6.8, title: "30 minutes in: ORH and ORL lock in", text: "The opening range is the first 30 minutes by default. Once it's over, its high and low become two new levels with their own odds. ORL sits almost on top of ONL, so the two share one label." },
      { at: 10.4, title: "A touch gets a tick mark", text: "Price trades up through the overnight high. ONH now carries a tick mark: it was touched today, and its percentage is the chance price comes back to it once more." },
      { at: 14, title: "The panel ranks them", text: "In the corner: the level price is most likely to touch next, with its price and distance, a session clock, and every level ranked from most to least likely, each with a meter." },
      { at: 17.6, title: "Late in the day, far levels fade", text: "Price hasn't moved far, but the clock has. With an hour left, yesterday's high and low are long shots, and only the levels close to price still show real odds." }
    ];
    var CNT = [[0, 1], [3.4, 2], [6.6, 7], [10.2, 23], [13.8, 24], [17.4, 34], [21, 66]];
    return {
      stages: ST, end: 23, size: function (n) { return n ? { W: 440, H: 800 } : { W: 1180, H: 560 }; },
      frame: function (T, L) {
        var n = L.narrow, g = n ? { n: 1, x0: 14, x1: 268, y0: 236, y1: L.H - 46, nx: 0 } : { n: 0, x0: 46, x1: 600, y0: 40, y1: L.H - 46, nx: 830 };
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track(CNT, T), bw = (g.x1 - g.x0) / N * 0.62, last = Math.max(0, Math.min(N - 1, Math.ceil(cnt) - 1));
        var st = S.at(last), s = "", lab = "";
        s += txt(g.x0, g.y0 - 14, n ? "Made-up index future · 5-min" : "A made-up index future · 5-minute bars · 9:30 to 16:00", C.faint, 12, "start", 600);
        (n ? [0, 30, 54, 77] : [0, 6, 30, 54, 77]).forEach(function (k) { s += txt(X(k), g.y1 + 18, clock(k), C.faint, 11, "middle"); });
        if (n) [5000, 5020, 5040].forEach(function (v) { s += line(g.x0, Y(v), g.x1, Y(v), "#2c2c2e", 1); });
        else [4995, 5005, 5015, 5025, 5035, 5045].forEach(function (v) { s += line(g.x0, Y(v), g.x1, Y(v), "#2c2c2e", 1) + txt(g.x0 - 6, Y(v) + 4, fmt(v, 0), C.faint, 10.5, "end"); });
        /* session shade */
        s += rect(X(0) - bw, g.y0, X(N - 1) - X(0) + 2 * bw, g.y1 - g.y0, "#7c5cff", 2, 0.05);
        var lvo = fade(T, 0.2, 0.6), vivid = fade(T, 3.6, 0.6), xr = g.x1 + 6;
        /* lines */
        var vis = st.lv.filter(function (l) { return l.from <= last; });
        vis.forEach(function (l) {
          var col = l.v > st.c ? C.up : C.dn, p = vivid > 0 ? lerp(0.5, l.p, vivid) : 0.5;
          var o = l.from > 0 ? fade(T, 6.9, 0.5) : lvo;
          s += glowLine(X(l.from) - bw, xr, Y(l.v), col, p, o);
        });
        s += drawBars(B, X, Y, cnt, bw, function () { return 0.55; });
        /* labels: levels that sit within a label's height share one */
        var sorted = vis.slice().sort(function (a, b) { return b.v - a.v; }), groups = [], gap = (n ? 16 : 13) / ((g.y1 - g.y0) / (hi - lo));
        sorted.forEach(function (l) { var gr = groups[groups.length - 1]; if (gr && gr[gr.length - 1].v - l.v <= gap) gr.push(l); else groups.push([l]); });
        groups.forEach(function (gr) {
          var best = gr.reduce(function (a, b) { return b.p > a.p ? b : a; }), col = best.v > st.c ? C.up : C.dn;
          var o = gr.some(function (l) { return l.from > 0; }) && gr.every(function (l) { return l.from > 0; }) ? fade(T, 6.9, 0.5) : lvo;
          var name = gr.map(function (l) { return l.k; }).join(" · ") + (gr.some(function (l) { return l.t; }) ? " ✓" : "");
          var str = n ? name + "  " + pct(best.p) : name + "  " + P2(best.v) + "   " + pct(best.p);
          lab += tag(xr + 2, Y(best.v), str, col, o * (0.45 + 0.55 * (vivid > 0 ? Math.max(0.25, best.p) : 1)), "start");
        });
        s += lab;
        /* price marker */
        var cy = Y(st.c);
        s += line(X(last) + bw, cy, xr, cy, C.ink, 1, "3 3", 0.6);
        /* opening range box */
        var ob = win(T, 6.6, 10.4);
        if (ob > 0) {
          var orh = S.LV[6].v, orl = S.LV[7].v;
          s += frameRect(X(0) - bw, Y(orh), X(5) - X(0) + 2 * bw, Y(orl) - Y(orh), C.blue, 1.4, ob);
          s += tag(X(2.5), Y(orh) - 14, "first 30 min", C.blue, ob, "middle");
        }
        var tb = win(T, 10.6, 14);
        if (tb > 0) s += dot(X(20), Y(5031), 9, C.gold, tb, true);
        /* the panel */
        var po = fade(T, 14.1, 0.5);
        if (po > 0) s += panel(n ? 14 : 830, n ? 14 : 40, n ? 412 : 330, st, po, n);
        /* notes */
        if (!n) {
          s += callout(g.nx, g.y0, ["Odds to the session end", "Distance against the room", "price still has today."], C.gold, win(T, 0.4, 3.4));
          s += callout(g.nx, g.y0, ["Colour and glow", "Green above price, red below.", "Brighter, thicker = likelier."], C.up, win(T, 3.6, 6.8));
          s += callout(g.nx, g.y0, ["Opening range locked", "ORH " + P2(S.LV[6].v) + " · ORL " + P2(S.LV[7].v), "ORL and ONL share a label."], C.blue, win(T, 7, 10.4));
          s += callout(g.nx, g.y0, ["ONH ✓ touched", "The % is now the chance", "of one more touch."], C.gold, win(T, 10.6, 14));
          s += callout(g.nx, 420, ["15:00 · an hour left", "The same levels, less time:", "the far ones are long shots."], C.dn, fade(T, 17.8, 0.4));
        } else {
          s += callout(14, 18, ["Odds to the session end", "Distance vs room left today."], C.gold, win(T, 0.4, 3.4));
          s += callout(14, 18, ["Green above, red below", "Brighter, thicker = likelier."], C.up, win(T, 3.6, 6.8));
          s += callout(14, 18, ["Opening range locked", "ORL and ONL share a label."], C.blue, win(T, 7, 10.4));
          s += callout(14, 18, ["ONH ✓ touched", "The % is one more touch."], C.gold, win(T, 10.6, 14));
        }
        return s + stamp(L, "Illustrative · made-up bars and levels · odds from the random-walk law");
      }
    };
  }
  /* the ranking panel: next likely touch, session clock, levels ranked with meters */
  function panel(x, y, w, st, op, n) {
    var rows = st.lv.slice().sort(function (a, b) { return b.p - a.p; }), top = rows[0], col = top.v > st.c ? C.up : C.dn;
    var rh = n ? 22 : 24, h = 118 + rows.length * rh, s = "";
    if (n) { rows = rows.slice(0, 5); h = 118 + rows.length * rh; }
    s += rect(x, y, w, h, "#161618", 10, op) + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="none" stroke="#3a3a3c" opacity="' + op.toFixed(3) + '"/>';
    s += rect(x, y, w, 76, col, 10, 0.12 * op);
    s += txt(x + 12, y + 20, "◉ LEVEL RADAR", C.gold, 11, "start", 700, op);
    s += txt(x + 12, y + 50, pct(top.p) + "  " + top.k + (top.t ? " ✓" : ""), C.ink, 22, "start", 700, op);
    s += txt(x + 12, y + 68, "next likely touch · " + P2(top.v) + " · " + P2(Math.abs(top.v - st.c)) + (top.v > st.c ? " above" : " below"), col, 11, "start", null, op);
    var mins = Math.round(st.tau * 390), left = (mins >= 60 ? Math.floor(mins / 60) + "h " : "") + (mins % 60) + "m";
    s += txt(x + 12, y + 98, "SESSION", C.faint, 11, "start", 600, op) + meter(x + 80, y + 88, w - 150, 12, 1 - st.tau, C.gold, op) + txt(x + w - 12, y + 98, left, C.ink, 11, "end", null, op);
    rows.forEach(function (l, i) {
      var yy = y + 118 + i * rh, c2 = l.v > st.c ? C.up : C.dn;
      s += txt(x + 12, yy + 4, l.k + (l.t ? " ✓" : ""), c2, 12, "start", 600, op) + meter(x + 80, yy - 7, w - 150, 12, l.p, c2, op) + txt(x + w - 12, yy + 4, pct(l.p), C.ink, 12, "end", null, op);
    });
    return s;
  }

  /* =====================================================================
     2 · How the odds are worked out
     ===================================================================== */
  function mathSpec() {
    var RB = 48, now = 18, N = 78, c0 = 5024, LV = 5041;
    var tau = (N - 1 - now) / N;
    var RANGES = [41, 55, 47, 38, 60, 44, 52, 49, 43, 51];        /* made up, average 48 */
    var r = rng(5), PATHS = [], HIT = [1, 1, 0, 1, 1, 0, 1, 1, 0, 1];
    HIT.forEach(function (h, k) {
      var p = [c0], v = c0, peak = h ? 0 : 1e9;
      var tgt = h ? LV + 2 + r() * 8 : LV - 4 - r() * 10, at = 8 + Math.floor(r() * 40);
      for (var i = 1; i <= N - 1 - now; i++) {
        var drift = i <= at ? (tgt - c0) / at : (c0 + (r() - 0.5) * 24 - v) / 30;
        v += drift + (r() - 0.5) * 3.2;
        if (!h) v = Math.min(v, LV - 1.5);
        p.push(v);
      }
      PATHS.push(p);
    });
    var ST = [
      { at: 0, title: "First, the distance", text: "It's 11:00 and price is at 5,024. Yesterday's high is at 5,041. To touch it, price has to travel 17 points from here." },
      { at: 3.2, title: "Then, the room left today", text: "The typical range is the average of the last ten sessions, 48 points here. It shrinks as the session runs out, by the square root of the time left: about three quarters of the day is still to come, and the square root of 0.76 is 0.87, so the room is about 42 points." },
      { at: 7, title: "Today's pace", text: "If today is moving more than usual by this time, the room grows; if it's quieter, it shrinks. The indicator caps that between half and double." },
      { at: 10.4, title: "Then it checks the past", text: "On earlier days, at this time of day, how often did price still travel that far before the close? If it happened on seven out of ten days, the level shows 70%." },
      { at: 14.4, title: "Two sources of past days", text: "Fifteen years of S&P 500, Nasdaq, Dow and gold futures are built into the indicator, and the last twenty sessions of your own chart are mixed in, so the odds fit the market you're watching." }
    ];
    return {
      stages: ST, end: 19, size: function (n) { return n ? { W: 440, H: 760 } : { W: 1180, H: 540 }; },
      frame: function (T, L) {
        var n = L.narrow, g = n ? { x0: 14, x1: 420, y0: 236, y1: L.H - 60 } : { x0: 60, x1: 780, y0: 50, y1: L.H - 60 }, s = "";
        var lo = 4990, hi = 5060, X = function (i) { return g.x0 + i / (N - 1) * (g.x1 - g.x0); }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        s += txt(g.x0, g.y0 - 18, n ? "The odds for one level · 11:00" : "How the odds for one level are worked out · made-up numbers", C.faint, 12, "start", 600);
        (n ? [0, 18, 54, 77] : [0, 18, 30, 54, 77]).forEach(function (k) { s += txt(X(k), g.y1 + 18, clock(k), C.faint, 11, "middle"); });
        s += line(X(now), g.y0, X(now), g.y1, C.faint, 1, "4 4");
        s += txt(X(now) + 6, g.y1 - 8, "now", C.faint, 11, "start");
        /* price so far, made up */
        var past = noisy(now + 1, [[0, 5018], [5, 5025], [10, 5020], [18, c0]], 1.4, 3); past[now] = c0;
        s += poly(past.map(function (v, i) { return [X(i), Y(v)]; }), C.ink, 2);
        s += dot(X(now), Y(c0), 5, C.ink);
        /* the level */
        s += glowLine(g.x0, g.x1, Y(LV), C.up, 0.6, 1) + tag(g.x1, Y(LV) - 14, "PDH 5,041.00", C.up, 1, "end");
        var d = fade(T, 0.3, 0.6);
        if (d > 0) { s += arrow(X(now) + 18, Y(c0), X(now) + 18, Y(LV) + 4, C.gold, d); s += tag(X(now) + 26, (Y(c0) + Y(LV)) / 2, "17.00 pts", C.gold, d, "start"); }
        /* ten past ranges */
        var ro = win(T, 3.3, 7);
        if (ro > 0) {
          var bx = n ? 20 : 830, by = n ? 30 : 60, bwid = n ? 30 : 26, sc = n ? 2.2 : 3;
          RANGES.forEach(function (v, i) { s += rect(bx + i * (bwid + 6), by + 60 * sc / 2.2 - v * sc / 2.2, bwid, v * sc / 2.2, C.blue, 3, 0.7 * ro); });
          s += line(bx - 4, by + 60 * sc / 2.2 - RB * sc / 2.2, bx + 10 * (bwid + 6), by + 60 * sc / 2.2 - RB * sc / 2.2, C.gold, 2, "5 4", ro);
          s += txt(bx, by + 60 * sc / 2.2 + 20, "last 10 session ranges · average 48 pts", C.dim, 12, "start", 600, ro);
        }
        /* the cone of room left */
        var co = fade(T, 4.6, 0.6), pace = track([[0, 1], [7.4, 1], [8.6, 1.25], [9.8, 1.25], [10.2, 1]], T);
        if (co > 0) {
          var up = [], dn = [];
          for (var i = now; i < N; i++) {
            var w = 0.5 * RB * Math.sqrt((i - now) / N) * pace;
            up.push([X(i), Y(c0 + w)]); dn.unshift([X(i), Y(c0 - w)]);
          }
          s += '<polygon points="' + up.concat(dn).map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="' + C.blue + '" opacity="' + (0.13 * co).toFixed(3) + '"/>';
          s += poly(up, C.blue, 1.4, null, co) + poly(dn.slice().reverse(), C.blue, 1.4, null, co);
          var scl = scaleOf(RB, tau, pace), p = odds(17 / scl);
          var lbl = n ? "room ≈ " + fmt(scl, 0) + " pts" : "room left ≈ " + fmt(scl, 0) + " pts" + (pace > 1.01 ? " · busy day" : "");
          s += tag(X(66), Y(c0) + (n ? 74 : 92), lbl, C.blue, co * (1 - fade(T, 10.4, 0.3)), "middle");
          var po = win(T, 5, 10.4);
          if (po > 0) s += pill(X(now) + (n ? 60 : 80), Y(LV) - 30, "≈ " + pct(p), C.up, po, "middle");
        }
        /* earlier days from this time of day */
        var pp = fade(T, 10.6, 0.4);
        if (pp > 0) {
          var shown = Math.min(10, Math.floor(track([[10.6, 0], [13.6, 10]], T) + 0.999)), hits = 0;
          PATHS.forEach(function (p, k) {
            if (k >= shown) return;
            var hit = HIT[k]; if (hit) hits++;
            s += poly(p.map(function (v, i) { return [X(now + i), Y(v)]; }), hit ? C.up : C.dn, 1.4, null, 0.5 * pp);
          });
          s += pill(X(now) + (n ? 60 : 80), Y(LV) - 30, hits + " of " + shown + " reached it", C.up, pp * (1 - fade(T, 14.4, 0.3)), "middle");
          if (T >= 13.7) s += pill(X(now) + (n ? 60 : 80), Y(LV) - 30, "7 of 10 → 70%", C.up, fade(T, 14.4, 0.3), "middle");
        }
        var so = fade(T, 14.6, 0.5);
        if (so > 0) {
          var bx2 = n ? 14 : 820, by2 = n ? 22 : 300;
          s += callout(bx2, by2, ["Built in: 15 years", "ES, NQ, YM 9:30 to 16:00, GC", "8:20 to 13:30, 5-min, 2011-26"], C.gold, so);
          s += callout(bx2, by2 + (n ? 84 : 84), ["Your chart: last 20 sessions", "Crypto, forex: random-walk", "formula + time-of-day profile"], C.blue, so);
        }
        if (!n) {
          s += callout(830, 300, ["Distance", "From the last close", "to the level: 17.00."], C.gold, win(T, 0.4, 3.2));
          s += callout(830, 300, ["Room left today", "48 × √(share of day left)", "× today's pace."], C.blue, win(T, 4.6, 10.4));
          s += callout(830, 300, ["Count the days", "How often, from this time,", "price still went that far."], C.up, win(T, 10.6, 14.4));
        }
        return s + stamp(L, "Illustrative · made-up paths and numbers");
      }
    };
  }

  /* =====================================================================
     3 · Time is an input: the same distance is worth less every hour
     ===================================================================== */
  function decaySpec() {
    var RB = 48, N = 78;
    var D = [{ d: 12, k: "12 pts away (¼ of the usual range)", c: C.up }, { d: 24, k: "24 pts away (½ the usual range)", c: C.gold }];
    function p(d, i) { var tau = (N - 1 - i) / N; return tau <= 0 ? 0 : odds(d / scaleOf(RB, tau, 1)); }
    var MARK = [0, 24, 54, 72];
    var ST = MARK.map(function (i, k) {
      var a = pct(p(12, i)), b = pct(p(24, i));
      var t = ["Right after the open", "11:30", "14:00", "15:30, 25 minutes left"][k];
      var body = ["Price doesn't move all day. Two levels sit 12 and 24 points away, with a usual range of 48. Right after the open they show " + a + " and " + b + ".",
                  "Two hours in, same distance, same quiet market. The odds have slipped to " + a + " and " + b + ".",
                  "By the afternoon there's far less day left to travel in: " + a + " and " + b + ".",
                  "The near level is down to " + a + " and the far one to " + b + ". A target that looked easy in the morning is now a long shot."][k];
      return { at: k * 3.6, title: t, text: body };
    });
    return {
      stages: ST, end: 16, size: function (n) { return n ? { W: 440, H: 640 } : { W: 1180, H: 500 }; },
      frame: function (T, L) {
        var n = L.narrow, g = n ? { x0: 46, x1: 420, y0: 180, y1: L.H - 60 } : { x0: 70, x1: 780, y0: 50, y1: L.H - 60 }, s = "";
        var X = function (i) { return g.x0 + i / (N - 1) * (g.x1 - g.x0); }, Y = function (v) { return g.y1 - v * (g.y1 - g.y0); };
        s += txt(g.x0, g.y0 - 20, n ? "Touch odds as the day runs out" : "Touch odds to the close as the day runs out · price not moving", C.faint, 12, "start", 600);
        [0, 0.25, 0.5, 0.75].forEach(function (v) { s += line(g.x0, Y(v), g.x1, Y(v), "#2c2c2e", 1) + txt(g.x0 - 8, Y(v) + 4, Math.round(v * 100) + "%", C.faint, 11, "end"); });
        (n ? [0, 24, 54, 77] : [0, 18, 42, 66, 77]).forEach(function (k) { s += txt(X(k), g.y1 + 20, clock(k), C.faint, 11, "middle"); });
        var cur = track([[0, 0], [1, 0], [3.6, 24], [7.2, 54], [10.8, 72], [16, 72]], T);
        D.forEach(function (o, k) {
          var pts = [];
          for (var i = 0; i < N; i++) pts.push([X(i), Y(p(o.d, i))]);
          s += poly(pts, o.c, 1.2, "4 4", 0.35);
          s += poly(pts.slice(0, Math.floor(cur) + 1), o.c, 2.6);
          var v = p(o.d, cur);
          s += dot(X(cur), Y(v), 6, o.c);
          s += X(cur) > g.x1 - 70 ? tag(X(cur) - 10, Y(v) - 16, pct(v), o.c, 1, "end") : tag(X(cur) + 10, Y(v), pct(v), o.c, 1, "start");
          s += txt(n ? g.x0 : g.x0 + 10, n ? 30 + k * 22 : g.y0 + 10 + k * 22, "● " + o.k, o.c, 12.5, "start", 600);
        });
        if (!n) s += callout(830, 60, ["Less time, less room", "The room left shrinks with", "the square root of the time", "left in the session."], C.blue, 1);
        s += callout(n ? 14 : 830, n ? 84 : 190, ["The clock", clock(Math.round(cur)) + " · " + Math.round((N - 1 - cur) / N * 390) + " min left"], C.gold, 1);
        return s + stamp(L, "Illustrative · usual range 48 pts · random-walk law");
      }
    };
  }

  /* =====================================================================
     4 · Using it: the realistic target, the long shot, and the clock
     ===================================================================== */
  function useSpec() {
    var N = 78, RB = 48, lo = 5000, hi = 5058, E = 18;
    var CL = noisy(N, [[0, 5016], [6, 5010], [12, 5019], [18, 5024], [26, 5027], [34, 5024], [46, 5027], [60, 5025], [68, 5030.5], [72, 5032], [77, 5029.5]], 1.4, 31);
    for (var q = 19; q < N; q++) CL[q] = Math.min(q < 66 ? 5028.5 : 5032, CL[q]);
    CL[18] = 5024;
    var B = mkBars(CL, 5016, 41, 1.2);
    B.forEach(function (b, i) { b.h = Math.min(b.h, i === 70 ? 5033.25 : 5032.5); });
    B[70].h = 5033.25;
    var NEAR = 5033, FAR = 5050;
    function stAt(i) {
      var hi2 = -1e9, lo2 = 1e9; for (var j = 0; j <= i; j++) { hi2 = Math.max(hi2, B[j].h); lo2 = Math.min(lo2, B[j].l); }
      var tau = (N - 1 - i) / N, pace = (hi2 - lo2) / (RB * Math.sqrt((i + 1) / N)), sc = scaleOf(RB, tau, pace);
      return { near: odds(Math.abs(NEAR - B[i].c) / sc), far: odds(Math.abs(FAR - B[i].c) / sc) };
    }
    var s18 = stAt(E), s46 = stAt(60);
    var ST = [
      { at: 0, title: "Your setup says long", text: "At 11:00 your own strategy gives a long at 5,024. Level Radar doesn't make that call. The question it helps with is the next one: where to take profits." },
      { at: 3.4, title: "Two targets, two numbers", text: "The overnight high at 5,033 shows " + pct(s18.near) + ". Yesterday's high at 5,050 shows " + pct(s18.far) + ". One is a realistic target, the other is a long shot." },
      { at: 7, title: "As a filter", text: "If your setup only pays when price reaches a level the radar puts at 10 or 20%, you're betting against the odds. The trade can still work. It's a reason to think twice, or to size down." },
      { at: 10.6, title: "As a timer", text: "By 14:30 the trade is still short of the overnight high, and its odds have slipped to " + pct(s46.near) + ". Yesterday's high is down to " + pct(s46.far) + ". Watching the numbers fall keeps you from holding on to a target the market no longer has time to reach." },
      { at: 14.2, title: "Then your own tools take over", text: "Price reaches the overnight high. Whether it holds or breaks there is a different question. That's market structure, trend, volume, order flow, whatever your method is." }
    ];
    var CNT = [[0, 19], [10.4, 19], [13.8, 61], [17, 74]];
    return {
      stages: ST, end: 19, size: function (n) { return n ? { W: 440, H: 760 } : { W: 1180, H: 540 }; },
      frame: function (T, L) {
        var n = L.narrow, g = n ? { x0: 14, x1: 290, y0: 210, y1: L.H - 46 } : { x0: 46, x1: 640, y0: 40, y1: L.H - 46 };
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track(CNT, T), bw = (g.x1 - g.x0) / N * 0.62, last = Math.min(N - 1, Math.ceil(cnt) - 1), st = stAt(last), s = "";
        s += txt(g.x0, g.y0 - 14, n ? "A long, and two targets" : "A long, two targets and the clock · made-up 5-minute bars", C.faint, 12, "start", 600);
        (n ? [0, 18, 60] : [0, 18, 60, 77]).forEach(function (k) { s += txt(X(k), g.y1 + 18, clock(k), C.faint, 11, "middle"); });
        var xr = g.x1 + 6;
        var to = fade(T, 3.4, 0.5);
        if (to > 0) {
          s += glowLine(X(0), xr, Y(NEAR), C.up, st.near, to) + glowLine(X(0), xr, Y(FAR), C.up, st.far, to);
          s += tag(xr + 2, Y(NEAR), (n ? "ONH  " : "ONH  5,033.00   ") + pct(st.near) + (last >= 70 ? " ✓" : ""), C.up, to, "start");
          s += tag(xr + 2, Y(FAR), (n ? "PDH  " : "PDH  5,050.00   ") + pct(st.far), C.up, to * (0.45 + 0.55 * Math.max(0.3, st.far)), "start");
        }
        s += drawBars(B, X, Y, cnt, bw);
        s += dot(X(E), Y(5024), 6, C.blue) + (n ? tag(X(E) + 8, Y(5024) + 26, "long 5,024", C.blue, 1, "start") : tag(X(E) - 10, Y(5024) + 22, "long 5,024", C.blue, 1, "end"));
        var fo = win(T, 7, 10.6);
        if (fo > 0) s += pill(X(E) + 40, Y(FAR) + 28, n ? "10-20%? size down" : "needs a 10-20% level? think twice, or size down", C.orange, fo, "start");
        var ho = fade(T, 14.4, 0.4);
        if (ho > 0) s += pill(X(70), Y(NEAR) - 24, n ? "hold or break?" : "hold or break? your tools decide", C.gold, ho, "middle");
        if (!n) {
          s += callout(830, 40, ["Targets", "64% or 17%: one is realistic,", "one is a long shot."], C.up, win(T, 3.4, 7));
          s += callout(830, 40, ["Filter", "Betting on a 10-20% level", "is betting against the odds."], C.orange, win(T, 7, 10.6));
          s += callout(830, 40, ["Timing", "Odds shrink as the session", "runs out. Don't hold on to a", "target there's no time for."], C.gold, win(T, 10.8, 14.2));
          s += callout(830, 40, ["Not a signal", "It says where price is likely", "to go, not what happens there."], C.dim, fade(T, 14.4, 0.4));
        } else {
          s += callout(14, 18, ["Targets", "One realistic, one a long shot."], C.up, win(T, 3.4, 7));
          s += callout(14, 18, ["Filter", "10-20%: against the odds."], C.orange, win(T, 7, 10.6));
          s += callout(14, 18, ["Timing", "Odds shrink with the clock."], C.gold, win(T, 10.8, 14.2));
          s += callout(14, 18, ["Not a signal", "Hold or break: your tools."], C.dim, fade(T, 14.4, 0.4));
        }
        return s + stamp(L, "Illustrative · made-up bars and levels");
      }
    };
  }

  var SPECS = { levels: levelsSpec, math: mathSpec, decay: decaySpec, use: useSpec };
  document.querySelectorAll("[data-lrad-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-lrad-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     The odds, step by step, as a click-through stepper.
     Without the script the five show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-lrad-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "Mark",    c: C.blue,   tag: "The levels most traders watch" },
      { k: "Measure", c: C.gold,   tag: "How far price has to travel" },
      { k: "Room",    c: C.cyan,   tag: "How far it can still travel today" },
      { k: "Past",    c: C.up,     tag: "How often it did, from this time of day" },
      { k: "Read",    c: C.orange, tag: "A percent per level, every bar" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "The odds, step by step");
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
      function ln(x1, y1, x2, y2, col, w, dash, op) { return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 2) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op + '"' : "") + "/>"; }
      function pl(pts, col, w, dash) { return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2.4) + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>"; }
      function dt(x, y, col) { return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7" fill="' + col + '"/>'; }
      var top = 30, bot = H - 50, mid = (top + bot) / 2;
      var px = 150, py = mid + 10;
      var path = [[30, mid + 30], [60, mid + 18], [90, mid + 36], [120, mid + 4], [px, py]];
      if (k === 0) {
        var L0 = [["PDH", top + 10, C.up], ["ONH", top + 60, C.up], ["OPEN", mid + 30, C.dn], ["PDC", mid + 50, C.dn], ["ONL", bot - 30, C.dn], ["PDL", bot - 4, C.dn]];
        L0.forEach(function (q) { s += ln(20, q[1], 430, q[1], q[2], 2, null, 0.8) + t(440, q[1] + 5, q[0], q[2], 13, "start", 700); });
        s += pl(path, C.ink, 2.2) + dt(px, py, C.ink);
        s += t(30, bot + 32, "Yesterday, overnight, today's open, the opening range.", C.dim, 12, "start", 500);
      } else if (k === 1) {
        s += ln(20, top + 30, 430, top + 30, C.up, 3) + t(440, top + 35, "PDH", C.up, 13, "start", 700);
        s += pl(path, C.ink, 2.2) + dt(px, py, C.ink);
        s += ln(px + 40, py, px + 40, top + 36, C.gold, 2.4) + '<path d="M' + (px + 34) + "," + (top + 44) + " L" + (px + 40) + "," + (top + 32) + " L" + (px + 46) + "," + (top + 44) + 'Z" fill="' + C.gold + '"/>';
        s += t(px + 54, (py + top + 30) / 2 + 5, "distance", C.gold, 14, "start", 700);
        s += t(30, bot + 32, "How far price has to move to get there.", C.dim, 12, "start", 500);
      } else if (k === 2) {
        var cone = [], cone2 = [];
        for (var i = 0; i <= 20; i++) { var x = px + i * 14, w = 100 * Math.sqrt(i / 20); cone.push([x, py - w]); cone2.unshift([x, py + w]); }
        s += '<polygon points="' + cone.concat(cone2).map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="' + C.cyan + '" opacity="0.18"/>';
        s += pl(cone, C.cyan, 1.6) + pl(cone2.slice().reverse(), C.cyan, 1.6);
        s += pl(path, C.ink, 2.2) + dt(px, py, C.ink);
        s += t(px + 150, py + 6, "room left", C.cyan, 14, "middle", 700);
        s += t(30, bot + 32, "Average range of the last 10 sessions, shrunk by the time left.", C.dim, 12, "start", 500);
      } else if (k === 3) {
        var rr = rng(9);
        for (var q = 0; q < 10; q++) {
          var pts = [[px, py]], v = py, hit = q % 10 !== 2 && q !== 5 && q !== 8;
          for (var j = 1; j <= 20; j++) { v += (hit ? -3.2 : 0.2) + (rr() - 0.5) * 16; if (!hit) v = Math.max(v, top + 36); pts.push([px + j * 14, v]); }
          s += pl(pts, hit ? C.up : C.dn, 1.4);
        }
        s += ln(20, top + 30, 450, top + 30, C.up, 3) + t(456, top + 35, "PDH", C.up, 13, "start", 700);
        s += pl(path, C.ink, 2.2) + dt(px, py, C.ink);
        s += t(30, bot + 32, "7 of 10 earlier days got there from here: 70%.", C.dim, 12, "start", 500);
      } else {
        var rows = [["ONH", 0.72, C.up], ["PDC", 0.55, C.dn], ["ORH", 0.41, C.up], ["PDH", 0.18, C.up], ["PDL", 0.06, C.dn]];
        var rh = narrow ? 56 : 40;
        rows.forEach(function (q, i) {
          var y = top + i * rh;
          s += t(40, y + 16, q[0], q[2], 14, "start", 700);
          for (var m = 0; m < 10; m++) s += r(110 + m * 33, y + 2, 30, 18, m < Math.round(q[1] * 10) ? q[2] : "#3a3a3c", m < Math.round(q[1] * 10) ? 0.5 + 0.05 * m : 1, 3);
          s += t(520, y + 16, Math.round(q[1] * 100) + "%", C.ink, 14, "end", 700);
        });
        s += t(30, bot + 32, "Ranked, updated on every bar.", C.dim, 12, "start", 500);
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

  /* =====================================================================
     The room-left calculator
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-lrad-calc]");
    if (!root) return;
    var f = {};
    ["dist", "rbar", "left", "today"].forEach(function (k) { f[k] = root.querySelector('[name="' + k + '"]'); });
    var out = {};
    ["room", "pace", "x", "odds"].forEach(function (k) { out[k] = root.querySelector('[data-out="' + k + '"]'); });
    var meterEl = root.querySelector("[data-meter] i");
    function num(el) { var v = parseFloat(String(el.value).replace(/,/g, "")); return isFinite(v) ? v : NaN; }
    function calc() {
      var d = Math.abs(num(f.dist)), rb = num(f.rbar), left = Math.min(100, Math.max(0, num(f.left))) / 100, td = num(f.today);
      if (!(rb > 0) || isNaN(d) || isNaN(left)) { out.odds.textContent = "–"; return; }
      var el = 1 - left, pace = 1;
      if (td > 0 && el > 0) pace = td / (rb * Math.sqrt(el));
      var capped = Math.min(2, Math.max(0.5, pace));
      var sc = scaleOf(rb, left, capped), p = sc > 0 ? odds(d / sc) : (d === 0 ? 1 : 0);
      out.room.textContent = fmt(sc, 2);
      out.pace.textContent = el > 0 && td > 0 ? fmt(pace, 2) + "×" + (capped !== pace ? " (capped at " + fmt(capped, 1) + "×)" : "") : "1.00× (no range yet)";
      out.x.textContent = sc > 0 ? fmt(d / sc, 2) : "–";
      out.odds.textContent = pct(p);
      if (meterEl) meterEl.style.width = (p * 100).toFixed(1) + "%";
    }
    root.addEventListener("input", calc);
    root.querySelectorAll("[data-preset]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-preset").split(",");
        f.dist.value = v[0]; f.rbar.value = v[1]; f.left.value = v[2]; f.today.value = v[3];
        calc();
      });
    });
    calc();
  })();

  if (typeof window !== "undefined") window.__lrad = { odds: odds, scaleOf: scaleOf, SESSION: SESSION, SPECS: SPECS };
})();
