/* =====================================================================
   etr-anim.js — the animated walkthroughs on eight-trading-rules.html
   (SMB Capital, "These 8 Trading Rules Can Make You Profitable").

     [data-etr-anim="slump"]   Shark's way out of a slump: the slump, the urge
                               to size up, get out, trade smaller, book green
                               days, then a setup brings the account back
     [data-etr-anim="size"]    rule 1: the same trades at full and half size
     [data-etr-anim="select"]  rule 2: forced trades vs trades that fall into
                               your lap
     [data-etr-anim="time"]    rule 3: the longer the hold, the more can happen
     [data-etr-anim="entry"]   rule 6: on time, a bit late, chased, graded
     [data-etr-anim="heart"]   rule 7: heart rate and decisions
     [data-etr-diag]           which rules fit your slump
     [data-etr-card]           a daily report card on entries
     [data-etr-steps]          the way back, as a click-through stepper

   Every bar, price and dollar figure is made up to show the idea. Same
   player as scc-anim.js: each chart redraws in a narrow layout on a phone
   instead of scrolling sideways, with the callouts in a band on top.
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


  /* ---------- page helpers ---------- */
  function P2(v) { return fmt(v, 2); }
  function bars(N, pts, amp, seed, wick, fix) {
    var CL = noisy(N, pts, amp, seed);
    if (fix) Object.keys(fix).forEach(function (k) { CL[+k] = fix[k]; });
    return { CL: CL, B: mkBars(CL, pts[0][1], seed + 1, wick) };
  }
  /* keep every bar's high and low around its own body after clamping */
  function tidy(B) { B.forEach(function (b) { b.h = Math.max(b.h, b.o, b.c); b.l = Math.min(b.l, b.o, b.c); }); }
  function G(L) {
    if (L.narrow) return { n: 1, x0: 14, x1: L.W - 62, y0: 214, y1: L.H - 46 };
    return { n: 0, x0: 46, x1: 740, y0: 50, y1: L.H - 48, nx: 822 };
  }
  function nt(c, lines, col, op) { return c.n ? callout(14, 18, lines, col, op) : callout(822, 50, lines, col, op); }
  function hl(c, v, i0, col, label, op, dash, w) {
    if (op <= 0) return "";
    var x0 = i0 == null ? c.g.x0 : c.X(i0), y = c.Y(v);
    return line(x0, y, c.g.x1, y, col, w || 1.8, dash, op) + (label ? tag(c.g.x1 - 2, y - 13, label, col, op, "end") : "");
  }
  function ent(c, i, v, col, label, op, below) {
    if (op <= 0) return "";
    var x = c.X(i), y = c.Y(v);
    return dot(x, y, 6, col, op) + tag(x + (c.n ? 0 : -10), y + (below ? 24 : -22), label, col, op, c.n ? "middle" : "end");
  }
  function boxAround(c, i, b, col, op) {
    if (op <= 0) return "";
    var x = c.X(i), w = c.bw + 10;
    return frameRect(x - w / 2, c.Y(b.h) - 5, w, c.Y(b.l) - c.Y(b.h) + 10, col, 2, op, 4);
  }

  /* a walkthrough made of scenes: each scene is its own chart, with its own bars */
  function scenes(list) {
    var S = list.map(function (x) { var o = x.make(); o.t0 = x.t0; return o; });
    return function (T, L) {
      var k = 0; S.forEach(function (o, i) { if (T >= o.t0) k = i; });
      var o = S[k], t = T - o.t0, g = G(L), s = "";
      var X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / o.N; };
      var Y = function (v) { return g.y1 - (v - o.lo) / (o.hi - o.lo) * (g.y1 - g.y0); };
      var cnt = track(o.cnt, t), bw = (g.x1 - g.x0) / o.N * 0.62;
      var c = { g: g, X: X, Y: Y, n: g.n, cnt: cnt, L: L, bw: bw, t: t };
      var op = fade(t, 0, 0.35);
      s += axis(g, o.lo, o.hi, o.step, Y, o.dp, op);
      s += txt(g.x0, g.y0 - 18, g.n ? (o.short || o.title) : o.title, C.faint, 12, "start", 600, op);
      if (o.under) s += o.under(t, c);
      s += '<g opacity="' + op.toFixed(3) + '">' + drawBars(o.B, X, Y, cnt, bw, o.dim ? function (i) { return o.dim(i, t); } : null) + "</g>";
      s += o.draw(t, c);
      return s + stamp(L);
    };
  }

  /* ---------- extra helpers for this page ---------- */
  function sizeTall(n) { return n ? { W: 440, H: 780 } : { W: 1180, H: 540 }; }
  function nb(n, lines, col, op) { return n ? callout(14, 18, lines, col, op) : callout(822, 50, lines, col, op); }
  function hgrid(x0, x1, Y, lo, hi, step, fmtFn, op) {
    var s = "";
    for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      var y = Y(v);
      s += line(x0, y, x1, y, "#2c2c2e", 1, null, op);
      s += txt(x1 + 6, y + 4, fmtFn(v), C.faint, 11, "start", null, op);
    }
    return s;
  }
  function kUSD(v) { return v === 0 ? "$0" : (v < 0 ? "−$" : "+$") + fmt(Math.abs(v) / 1000, Math.abs(v) % 1000 ? 1 : 0) + "k"; }
  function check(x, y, col, op) {
    if (op <= 0) return "";
    return poly([[x - 7, y], [x - 2, y + 6], [x + 8, y - 7]], col, 3, null, op);
  }

  /* =====================================================================
     Shark's way out of a slump: get out, take inventory, trade smaller,
     book green days, then a setup brings the account back
     ===================================================================== */
  function slumpSpec() {
    var D = [-800, 300, -1200, -600, 400, -1500, -900, -1100, -2600, -3400, 250, 180, -120, 300, 220, 260, -90, 310, 4600, 3300, 2600];
    var SZ = [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1];
    var CUM = []; D.reduce(function (a, v) { a += v; CUM.push(a); return a; }, 0);
    var N = D.length;
    var ST = [
      { at: 0, title: "The slump", text: "Everyone goes through it. If social media shows everyone making money every day, that's not the truth. Here's a made-up month: a run of red days." },
      { at: 3.6, title: "The urge to make it back", text: "The natural thing is to trade bigger and make the money back right away. Shark says he still does it sometimes, and it can take two or three large losses before he trades smaller." },
      { at: 5.4, title: "When in doubt, get out", text: "Frozen in a position? Get out and reassess. You can always get back in. A one-minute walk around the office and a breath of fresh air can make for a much better decision." },
      { at: 7.4, title: "Take a personal inventory", text: "Keep a journal and ask why. Sometimes it was a really good setup you risked more on. Other times you just aren't seeing things well, or the market doesn't suit your style." },
      { at: 9.2, title: "Trade smaller, book a green day", text: "Then trade smaller. Book a green day, then a couple more. They don't need to be big. They need to be green." },
      { at: 12.8, title: "Then a setup shows up", text: "Things turn around quicker than you'd think. A setup slaps you in the face, you're back at normal size for it, and the account is positive again." }
    ];
    return {
      stages: ST, end: 17, size: sizeTall,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var x0 = n ? 14 : 46, x1 = n ? L.W - 62 : 750;
        var e0 = n ? 196 : 62, e1 = n ? 440 : 290, d0 = n ? 478 : 326, d1 = n ? 640 : 456, z0 = n ? 676 : 486, z1 = n ? 704 : 512;
        var X = function (i) { return x0 + (i + 0.5) * (x1 - x0) / N; };
        var lo = -13000, hi = 3000;
        var Y = function (v) { return e1 - (v - lo) / (hi - lo) * (e1 - e0); };
        var dm = (d0 + d1) / 2, DS = (d1 - d0) / 2 / 5000;
        var cnt = track([[0, 0], [3.2, 8], [3.6, 8], [5.0, 10], [9.2, 10], [12.4, 18], [12.8, 18], [14.4, 21]], T);
        s += hgrid(x0, x1, Y, lo, hi, 4000, kUSD);
        s += line(x0, Y(0), x1, Y(0), C.dim, 1.2, "5 4");
        s += txt(x0, e0 - 16, n ? "Account P&L · made-up month" : "Account P&L over a made-up month of trading days", C.faint, 12, "start", 600);
        s += txt(x0, d0 - 8, "each day's P&L", C.faint, 11, "start");
        s += line(x0, dm, x1, dm, "#3a3a3c", 1);
        s += txt(x0, z0 - 6, "size", C.faint, 11, "start");
        /* equity line */
        var pts = [[x0, Y(0)]], full = Math.floor(cnt);
        for (var i = 0; i < full && i < N; i++) pts.push([X(i), Y(CUM[i])]);
        if (full < N && cnt > full) { var pv = full ? CUM[full - 1] : 0, px = full ? X(full - 1) : x0; pts.push([lerp(px, X(full), cnt - full), Y(lerp(pv, CUM[full], cnt - full))]); }
        s += poly(pts, C.ink, 2.6);
        if (pts.length > 1) s += dot(pts[pts.length - 1][0], pts[pts.length - 1][1], 4.5, C.ink);
        /* daily bars + size */
        var bw = (x1 - x0) / N * 0.62;
        for (var j = 0; j < N && j < Math.ceil(cnt); j++) {
          var p = j < full ? 1 : cnt - full, h = Math.abs(D[j]) * DS * p, col = D[j] < 0 ? C.dn : C.up;
          s += rect(X(j) - bw / 2, D[j] < 0 ? dm : dm - h, bw, h, col, 1.5, 0.9);
          var zh = (z1 - z0) * SZ[j] / 2;
          s += rect(X(j) - bw / 2, z1 - zh, bw, zh, SZ[j] > 1 ? C.orange : SZ[j] < 1 ? C.blue : "#636366", 1, p);
        }
        /* marks */
        var o1 = fade(T, 4.2, 0.3);
        if (o1 > 0) s += tag((X(8) + X(9)) / 2, z0 - 14, "size ×2", C.orange, o1, "middle");
        var o2 = fade(T, 5.4, 0.3), gx = (X(9) + X(10)) / 2;
        if (o2 > 0) { s += line(gx, e0, gx, z1, C.gold, 1.8, "5 4", o2); s += tag(gx, e0 + 10, n ? "get out" : "when in doubt, get out", C.gold, o2, n ? "middle" : "middle"); }
        var o3 = fade(T, 7.4, 0.3);
        if (o3 > 0) s += tag(gx, Y(-11400) + 34, "journal · why?", C.blue, o3, "middle");
        var o4 = fade(T, 10.4, 0.3);
        if (o4 > 0) { s += line(X(10) - bw / 2, z0 - 4, X(17) + bw / 2, z0 - 4, C.blue, 2, null, o4); s += tag((X(10) + X(17)) / 2, z0 - 16, n ? "half size" : "half size · small green days", C.blue, o4, "middle"); }
        var o5 = fade(T, 14.6, 0.3);
        if (o5 > 0) s += pill(X(20), Y(CUM[20]) - 16, "back above even", C.up, o5, "end");
        var nts = [
          [["The slump", "A run of red days. Everyone", "has them, pros included."], C.dn, 0.3, 3.6],
          [["The urge", "Trade bigger to make it", "back right away. It digs", "the hole deeper."], C.orange, 3.8, 5.4],
          [["When in doubt, get out", "Frozen? Flatten and reassess.", "You can always get back in."], C.gold, 5.6, 7.4],
          [["Personal inventory", "Journal it: a good setup", "sized up, or not seeing", "things well right now?"], C.blue, 7.6, 9.2],
          [["Trade smaller", "Book a green day, then a", "couple more. Small is fine."], C.up, 9.4, 12.8],
          [["Then a setup shows up", "Normal size again, and the", "account is positive again."], C.up, 13.0, null]
        ];
        nts.forEach(function (q) { s += nb(n, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     Rule 1: lower your size and risk. Same trades, two sizes.
     ===================================================================== */
  function sizeSpec() {
    var R = [-1, 2, -1, -1, -1, 1.5, -1, -1, -1, 2, -1, 1];
    var CR = [0]; R.forEach(function (r) { CR.push(CR[CR.length - 1] + r); });
    var N = R.length;
    var ST = [
      { at: 0, title: "Same trades, two sizes", text: "Twelve made-up trades in a rough patch: four winners, eight losers. The orange line risks $1,000 a trade, the blue line $500. The trades are identical." },
      { at: 6.4, title: "The hole", text: "From the best point to the worst, full size gives back $4,500. Half size gives back $2,250. Same mistakes, half the damage." },
      { at: 9.4, title: "Why rule 1 comes first", text: "Lower size and risk don't fix what's wrong. They buy you time and a calmer head to find it, and the hole you climb out of later is smaller." }
    ];
    return {
      stages: ST, end: 13.5, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var x0 = n ? 14 : 46, x1 = n ? L.W - 62 : 750, y0 = n ? 210 : 70, y1 = n ? L.H - 60 : L.H - 60;
        var X = function (i) { return x0 + i * (x1 - x0) / N; };
        var lo = -5000, hi = 2500;
        var Y = function (v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); };
        s += hgrid(x0, x1, Y, lo, hi, 1000, kUSD);
        s += line(x0, Y(0), x1, Y(0), C.dim, 1.2, "5 4");
        s += txt(x0, y0 - 18, n ? "Running P&L · 12 trades" : "Running P&L over 12 made-up trades", C.faint, 12, "start", 600);
        var cnt = track([[0, 0], [5.8, N]], T), full = Math.floor(cnt);
        [[1000, C.orange, "$1,000 risk"], [500, C.blue, "$500 risk"]].forEach(function (d) {
          var pts = [];
          for (var i = 0; i <= full && i <= N; i++) pts.push([X(i), Y(CR[i] * d[0])]);
          if (full < N) pts.push([lerp(X(full), X(full + 1), cnt - full), Y(lerp(CR[full], CR[full + 1], cnt - full) * d[0])]);
          s += poly(pts, d[1], 2.6);
          for (var k = 1; k <= full && k <= N; k++) s += dot(X(k), Y(CR[k] * d[0]), 3.5, R[k - 1] < 0 ? C.dn : C.up);
          if (pts.length) { var e = pts[pts.length - 1]; s += n ? tag(x0 + 4, Y(2000) + (d[0] === 1000 ? 0 : 26), d[2], d[1], fade(T, 0.4, 0.3), "start") : tag(e[0] - 10, e[1] + (d[0] === 1000 ? 22 : -18), d[2], d[1], fade(T, 0.4, 0.3), "end"); }
        });
        var o = fade(T, 6.6, 0.4);
        if (o > 0) {
          /* peak after trade 2 (+1R), trough after trade 9 (−3.5R) */
          var px = X(2), tx = X(9);
          s += line(px, Y(1000), tx + 30, Y(1000), C.faint, 1, "3 3", o);
          s += arrow(tx + 26, Y(1000), tx + 26, Y(-3500), C.orange, o);
          s += arrow(tx - 10, Y(500), tx - 10, Y(-1750), C.blue, o);
          s += tag(tx + 34, Y(-3500) + 18, "−$4,500", C.orange, o, "start");
          s += tag(tx - 18, Y(-1750) + (n ? 34 : 18), "−$2,250", C.blue, o, "end");
        }
        var nts = [
          [["Lower your size and risk", "Same 12 trades. Only the", "risk per trade differs."], C.gold, 0.3, 6.4],
          [["The hole", "Full size: −$4,500 peak to", "trough. Half size: −$2,250."], C.orange, 6.6, 9.4],
          [["It buys you time", "Smaller losses, a calmer", "head, and a smaller hole", "to climb out of later."], C.blue, 9.6, null]
        ];
        nts.forEach(function (q) { s += nb(n, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L, "Illustrative · made-up trades");
      }
    };
  }

  /* =====================================================================
     Rule 2: be more selective. Trades that fall into your lap.
     ===================================================================== */
  function selectSpec() {
    var d = bars(60, [[0, 42.0], [5, 42.3], [8, 41.9], [12, 42.25], [16, 41.95], [19, 42.12], [20, 42.32], [24, 43.1], [28, 42.85], [32, 43.05], [36, 42.8],
      [40, 43.0], [44, 42.85], [47, 43.02], [48, 43.18], [54, 43.95], [59, 43.82]], 0.05, 211, 0.07, { 20: 42.32, 24: 43.1, 48: 43.18, 54: 43.95 });
    var B = d.B; tidy(B);
    var TR = [
      { i: 6, r: -300, lap: 0, at: 4.6 }, { i: 14, r: -450, lap: 0, at: 5.4 }, { i: 30, r: 150, lap: 0, at: 6.2 }, { i: 40, r: -300, lap: 0, at: 7.0 },
      { i: 20, r: 800, lap: 1, at: 8.4 }, { i: 48, r: 650, lap: 1, at: 9.2 }
    ];
    var ST = [
      { at: 0, title: "A busy morning", text: "Made-up 1-minute bars. There's something to trade every few minutes if you want there to be." },
      { at: 4.4, title: "Forcing it", text: "Marginal trades in the chop: −$300, −$450, +$150, −$300. Each one looked okay at the time. Together they're −$900." },
      { at: 8.2, title: "Trades that fall into your lap", text: "Two trades were obvious: a clean break with volume and a clean continuation. You didn't have to talk yourself into them. +$800 and +$650." },
      { at: 11.2, title: "Be more selective", text: "All six trades: +$550. Only the two that fell into your lap: +$1,450. In a slump, take the trades that are easy to see and skip the rest." }
    ];
    return {
      stages: ST, end: 15, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var g = n ? { x0: 14, x1: L.W - 62, y0: 214, y1: L.H - 70 } : { x0: 46, x1: 750, y0: 60, y1: L.H - 60 };
        var lo = 41.7, hi = 44.1;
        var X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / 60; };
        var Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        s += hgrid(g.x0, g.x1, Y, lo, hi, 0.5, function (v) { return fmt(v, 2); });
        s += txt(g.x0, g.y0 - 18, n ? "1-minute bars · made up" : "One morning on made-up 1-minute bars", C.faint, 12, "start", 600);
        var cnt = track([[0, 0], [4, 60]], T);
        var dimF = T >= 11.2 ? function () { return 0.55; } : null;
        s += drawBars(B, X, Y, cnt, (g.x1 - g.x0) / 60 * 0.6, dimF);
        var allR = 0, lapR = 0;
        TR.forEach(function (q) {
          var o = fade(T, q.at, 0.3);
          if (o <= 0) return;
          allR += q.r; if (q.lap) lapR += q.r;
          var b = B[q.i], x = X(q.i), y = Y(b.c), col = q.r < 0 ? C.dn : C.up;
          var oo = T >= 11.2 && !q.lap ? o * 0.45 : o;
          if (q.lap) s += dot(x, y, 11, C.gold, oo, true);
          s += dot(x, y, 5, col, oo);
          s += tag(x, q.lap ? y - 26 : y + 26, money(q.r), col, oo, "middle");
        });
        var o2 = fade(T, 11.4, 0.4);
        if (o2 > 0) {
          s += pill(g.x0 + 4, g.y0 + 14, "all six " + money(allR), C.grey, o2);
          s += pill(g.x0 + 4, g.y0 + 44, "lap only " + money(lapR), C.gold, o2);
        }
        var nts = [
          [["Plenty to trade", "Something every few minutes,", "if you go looking for it."], C.grey, 0.3, 4.4],
          [["Forcing it", "Four trades in the chop.", "−$900 between them."], C.dn, 4.6, 8.2],
          [["Fell into your lap", "Obvious, clean, no talking", "yourself into it. +$1,450."], C.gold, 8.4, 11.2],
          [["Rule 2", "Be more selective. Take the", "trades that are easy to see."], C.up, 11.4, null]
        ];
        nts.forEach(function (q) { s += nb(n, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     Rule 3: shorten your time frame. Randomness grows with the hold.
     ===================================================================== */
  function timeSpec() {
    var TMAX = 390, SIG = 0.17;
    function edge(t) { return 1.0 * (1 - Math.exp(-t / 5)); }
    var STEPS = 160, TS = [];
    for (var k = 0; k <= STEPS; k++) TS.push(TMAX * Math.pow(k / STEPS, 2));
    var PATHS = [];
    for (var p = 0; p < 9; p++) {
      var r = rng(300 + p * 7), w = 0, path = [0];
      for (var k2 = 1; k2 <= STEPS; k2++) {
        var dt = TS[k2] - TS[k2 - 1];
        w += (r() + r() + r() - 1.5) * 2 * Math.sqrt(dt) * SIG;
        path.push(edge(TS[k2]) + w);
      }
      PATHS.push(path);
    }
    var FACT = [[25, "a headline"], [70, "the market turns"], [150, "lunch chop"], [250, "a sector move"], [370, "the close"]];
    var ST = [
      { at: 0, title: "One entry", text: "A made-up long. The green dashed line is your edge: the setup's push, which mostly happens in the first few minutes." },
      { at: 2, title: "A short hold", text: "Over the first 5 to 10 minutes, the paths stay close together. Your edge is most of what moves the trade." },
      { at: 5.6, title: "A longer hold", text: "Hold all day and more things can come in: a headline, the market turning, lunch chop, a sector move, the close. Each one is randomness your setup didn't plan for." },
      { at: 10.2, title: "Shorten your time frame", text: "The spread of outcomes keeps widening with time. For active traders, a shorter time frame generally means more consistent results. That's what this trader needed." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var g = n ? { x0: 14, x1: L.W - 62, y0: 214, y1: L.H - 76 } : { x0: 46, x1: 750, y0: 60, y1: L.H - 70 };
        var lo = -5, hi = 5;
        var X = function (t) { return g.x0 + (g.x1 - g.x0) * Math.sqrt(t / TMAX); };
        var Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        s += hgrid(g.x0, g.x1, Y, lo, hi, 1, function (v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + "R"; });
        s += txt(g.x0, g.y0 - 18, n ? "Outcomes vs hold time" : "Where a made-up long can be, by how long you hold it", C.faint, 12, "start", 600);
        [[5, "5m"], [30, "30m"], [60, "1h"], [120, "2h"], [240, "4h"], [390, "close"]].forEach(function (q) {
          s += line(X(q[0]), g.y1, X(q[0]), g.y1 + 6, C.faint, 1);
          s += txt(X(q[0]), g.y1 + 22, q[1], C.faint, 11, "middle");
        });
        var tm = track([[0, 0], [2, 0.01], [4.4, 10], [5.6, 10], [9.6, TMAX]], T);
        /* the one-sd cone */
        if (tm > 0.01) {
          var up = [], dn = [];
          for (var k = 0; k <= 80; k++) { var t = tm * k / 80; up.push([X(t), Y(Math.min(hi, edge(t) + SIG * Math.sqrt(t)))]); dn.push([X(t), Y(Math.max(lo, edge(t) - SIG * Math.sqrt(t)))]); }
          s += '<polygon points="' + up.concat(dn.reverse()).map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="' + C.blue + '" opacity="0.13"/>';
          PATHS.forEach(function (path) {
            var pts = [];
            for (var k3 = 0; k3 < TS.length && TS[k3] <= tm; k3++) pts.push([X(TS[k3]), Y(Math.max(lo, Math.min(hi, path[k3])))]);
            s += poly(pts, "#8e8e93", 1.3, null, 0.75);
          });
        }
        var eg = [];
        for (var k4 = 0; k4 <= 60; k4++) { var t4 = TMAX * k4 / 60; eg.push([X(t4), Y(edge(t4))]); }
        s += poly(eg, C.up, 2.2, "6 4", fade(T, 0.3, 0.4));
        s += line(g.x0, Y(0), g.x1, Y(0), C.dim, 1, "3 3");
        s += dot(g.x0 + 2, Y(0), 6, C.ink, fade(T, 0, 0.3));
        s += tag(g.x0 + 12, Y(0) + 22, "entry", C.ink, fade(T, 0, 0.3), "start");
        FACT.forEach(function (f, i) {
          var o = fade(T, 5.8 + i * 0.7, 0.3);
          if (o <= 0) return;
          var x = X(f[0]);
          s += line(x, g.y0 + 8, x, g.y1, C.orange, 1, "2 4", o * 0.7);
          s += tag(x, g.y0 + 8 + (n ? i % 3 : i % 2) * 24, f[1], C.orange, o, i === FACT.length - 1 ? "end" : "middle");
        });
        var o5 = fade(T, 10.4, 0.4);
        if (o5 > 0) {
          var a = SIG * Math.sqrt(10), b = Math.min(SIG * Math.sqrt(TMAX), hi - edge(TMAX));
          s += line(X(10), Y(edge(10) + a), X(10), Y(edge(10) - a), C.up, 4, null, o5);
          s += line(g.x1 - 6, Y(edge(TMAX) + b), g.x1 - 6, Y(edge(TMAX) - b), C.dn, 4, null, o5);
          s += tag(X(10) + 8, Y(edge(10) - a) + 18, "10 min: ±" + fmt(a, 1) + "R", C.up, o5, "start");
          s += tag(g.x1 - 14, Y(edge(TMAX) - b) - 14, "close: ±" + fmt(SIG * Math.sqrt(TMAX), 1) + "R", C.dn, o5, "end");
        }
        var nts = [
          [["One entry", "The green line is your edge:", "most of it shows up early."], C.up, 0.3, 2],
          [["A short hold", "In the first minutes the", "paths stay close together."], C.blue, 2.2, 5.6],
          [["A longer hold", "More can come in. Each", "one is randomness your", "setup didn't plan for."], C.orange, 5.8, 10.2],
          [["Rule 3", "Shorter time frame, tighter", "spread, steadier results."], C.up, 10.4, null]
        ];
        nts.forEach(function (q) { s += nb(n, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L, "Illustrative · made-up paths");
      }
    };
  }

  /* =====================================================================
     Rule 6: a daily report card on entries. On time, a bit late, chased.
     ===================================================================== */
  function entrySpec() {
    var d = bars(40, [[0, 49.7], [4, 49.88], [8, 49.66], [12, 49.9], [15, 49.75], [16, 49.92], [17, 50.2], [18, 50.18], [19, 50.12], [20, 50.1], [22, 50.25],
      [24, 50.38], [25, 50.45], [27, 50.6], [29, 50.72], [31, 50.55], [33, 50.42], [35, 50.6], [37, 50.78], [39, 50.88]], 0.025, 401, 0.05,
      { 16: 49.92, 17: 50.22, 20: 50.12, 24: 50.36, 29: 50.72, 33: 50.42, 39: 50.88 });
    var B = d.B;
    clampRange(B, 0, 16, 49.55, 49.98);
    B[20].l = 50.02; clampRange(B, 18, 23, 50.02, null); B[33].l = 50.38; B[29].h = 50.76; tidy(B);
    var STOP = 49.85, TGT = 50.85;
    var EN = [
      { i: 20, v: 50.05, k: "on time", col: C.up, at: 4.6, g: "A", r: (TGT - 50.05) / (50.05 - STOP) },
      { i: 24, v: 50.35, k: "a bit late", col: C.gold, at: 7.2, g: "B", r: (TGT - 50.35) / (50.35 - STOP) },
      { i: 29, v: 50.70, k: "chased", col: C.dn, at: 9.6, g: "F", r: (TGT - 50.70) / (50.70 - STOP) }
    ];
    var ST = [
      { at: 0, title: "The level", text: "Made-up 1-minute bars basing under 50.00. The plan: a long on the break and hold of the level, stop under the base at 49.85, target 50.85." },
      { at: 3, title: "The break", text: "It breaks. Now the only question is where you get in." },
      { at: 4.6, title: "On time", text: "In at 50.05 on the first hold of the level. $0.20 of risk for $0.80: 4 to 1. A pullback later doesn't bother you." },
      { at: 7.2, title: "A bit late", text: "In at 50.35 after the first push. Same stop, so $0.50 of risk for $0.50: 1 to 1. Same idea, a much worse trade." },
      { at: 9.6, title: "Chasing", text: "In at 50.70 near the top of the move. $0.85 of risk for $0.15. Then the normal pullback to 50.42 feels like a disaster, and chasers usually sell it." },
      { at: 12, title: "Grade every entry", text: "This trader's issue was sloppy entries: a little late, chasing. So the daily report card scores just that, every trade, every day, until it's clean." }
    ];
    return {
      stages: ST, end: 16, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var g = n ? { x0: 14, x1: L.W - 62, y0: 214, y1: L.H - 60 } : { x0: 46, x1: 750, y0: 60, y1: L.H - 60 };
        var lo = 49.5, hi = 51.0;
        var X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / 40; };
        var Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        s += hgrid(g.x0, g.x1, Y, lo, hi, 0.25, function (v) { return fmt(v, 2); });
        s += txt(g.x0, g.y0 - 18, n ? "1-minute bars · made up" : "A break of 50.00 on made-up 1-minute bars", C.faint, 12, "start", 600);
        s += line(g.x0, Y(50), g.x1, Y(50), C.blue, 1.8);
        s += tag(g.x0 + 4, Y(50) + 16, "level 50.00", C.blue, 1, "start");
        var o0 = fade(T, 0.6, 0.3);
        s += line(g.x0, Y(STOP), g.x1, Y(STOP), C.dn, 1.4, "5 4", o0);
        s += tag(g.x1 - 2, Y(STOP) + 16, "stop 49.85", C.dn, o0, "end");
        s += line(g.x0, Y(TGT), g.x1, Y(TGT), C.up, 1.4, "5 4", o0);
        s += tag(g.x0 + 4, Y(TGT) - 14, "target 50.85", C.up, o0, "start");
        var cnt = track([[0, 0], [3, 17], [3.6, 18], [4.6, 21], [7.2, 25], [9.6, 30], [12, 40]], T);
        s += drawBars(B, X, Y, cnt, (g.x1 - g.x0) / 40 * 0.6);
        EN.forEach(function (e, k) {
          var o = fade(T, e.at, 0.3);
          if (o <= 0) return;
          var x = X(e.i), y = Y(e.v);
          var bx0 = x - 8, bx1 = x + 22;
          s += rect(bx0, y, bx1 - bx0, Y(STOP) - y, C.dn, 2, 0.18 * o);
          s += rect(bx0, Y(TGT), bx1 - bx0, y - Y(TGT), C.up, 2, 0.12 * o);
          s += dot(x, y, 6, e.col, o);
          var lbl = e.k + " " + fmt(e.v, 2);
          s += k === 0 ? tag(x + 12, y + 26, lbl, e.col, o, "start") : tag(x - 10, y + (k === 2 ? -24 : 0), lbl, e.col, o, "end");
        });
        var o6 = fade(T, 12.2, 0.4);
        if (o6 > 0) {
          var cx = n ? 14 : 790, cy = n ? 18 : 290, cw = n ? L.W - 28 : 360;
          if (!n) {
            s += '<g opacity="' + o6.toFixed(3) + '">' + rect(cx, cy, cw, 196, C.box, 12) + txt(cx + 16, cy + 28, "Today's report card · entries", C.ink, 14, "start", 700);
            EN.forEach(function (e, k) {
              var yy = cy + 64 + k * 42;
              s += txt(cx + 16, yy, e.k, C.dim, 13) + txt(cx + 150, yy, fmt(e.r, 1) + " to 1", C.dim, 13) + txt(cx + cw - 22, yy, e.g, e.col, 22, "end", 800);
            });
            s += "</g>";
          }
        }
        var nts = [
          [["The plan", "Long the break and hold of", "50.00. Stop 49.85, target 50.85."], C.blue, 0.3, 4.6],
          [["On time · grade A", "50.05: $0.20 risk for $0.80.", "4 to 1."], C.up, 4.8, 7.2],
          [["A bit late · grade B", "50.35: $0.50 risk for $0.50.", "1 to 1."], C.gold, 7.4, 9.6],
          [["Chased · grade F", "50.70: $0.85 risk for $0.15.", "The pullback shakes you out."], C.dn, 9.8, 12],
          [n ? ["Report card", "On time A · 4 to 1", "A bit late B · 1 to 1", "Chased F · 0.2 to 1"] : ["Grade every entry", "One issue, scored daily,", "until it's clean."], C.gold, 12.2, null]
        ];
        nts.forEach(function (q) { s += nb(n, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     Rule 7: keep your heart rate low. Decisions above the calm range.
     ===================================================================== */
  function heartSpec() {
    var K = [[0, 72], [10, 74], [20, 71], [25, 73], [27, 96], [30, 112], [36, 106], [42, 109], [48, 104], [52, 101], [56, 88], [60, 79], [70, 75], [85, 77], [95, 80], [100, 76], [120, 74]];
    var r = rng(77), HR = [];
    for (var m = 0; m <= 120; m++) HR.push(track(K, m) + (r() - 0.5) * 3);
    var DEC = [
      { m: 33, k: "revenge entry", ok: 0, at: 5.2 }, { m: 41, k: "moved the stop", ok: 0, at: 6.2 }, { m: 47, k: "doubled down", ok: 0, at: 7.2 },
      { m: 74, k: "waited for an A trade", ok: 1, at: 11.4 }, { m: 96, k: "one good trade", ok: 1, at: 12.6 }
    ];
    var ST = [
      { at: 0, title: "Calm at the open", text: "A made-up heart rate, 9:30 to 11:30. It sits in the low 70s while things go to plan." },
      { at: 3, title: "A loss, and it jumps", text: "A loss hits and the heart rate goes over 100 in a couple of minutes. Fast data is still going by." },
      { at: 5, title: "Decisions made up here", text: "A revenge entry, a moved stop, a double-down. With the heart rate up, you're not going to make good decisions." },
      { at: 8.6, title: "Step away", text: "Notice it, get out, walk, breathe. It comes back down." },
      { at: 11, title: "Back in range", text: "Back in the calm range, the decisions get good again. Dr. Brett Steenbarger has written about measuring heart rate in real time, and the trader was excited to try it." }
    ];
    return {
      stages: ST, end: 15.5, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var g = n ? { x0: 14, x1: L.W - 62, y0: 214, y1: L.H - 76 } : { x0: 46, x1: 750, y0: 60, y1: L.H - 70 };
        var lo = 55, hi = 125;
        var X = function (m) { return g.x0 + m / 120 * (g.x1 - g.x0); };
        var Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        s += rect(g.x0, Y(85), g.x1 - g.x0, Y(60) - Y(85), C.up, 0, 0.1);
        s += hgrid(g.x0, g.x1, Y, 60, 120, 10, function (v) { return v + " bpm"; });
        s += tag(g.x0 + 6, Y(62), "your calm range", C.up, 1, "start");
        s += line(g.x0, Y(100), g.x1, Y(100), C.dn, 1.2, "5 4");
        s += txt(g.x0, g.y0 - 18, n ? "Heart rate · made up" : "A made-up heart rate through the morning", C.faint, 12, "start", 600);
        ["9:30", "10:00", "10:30", "11:00", "11:30"].forEach(function (lb, i) { s += txt(X(i * 30), g.y1 + 22, lb, C.faint, 11, i === 0 ? "start" : i === 4 ? "end" : "middle"); });
        var mm = track([[0, 0], [3, 25], [4.6, 31], [8.2, 52], [10.6, 62], [14, 120]], T);
        var pts = [];
        for (var m = 0; m <= Math.floor(mm); m++) pts.push([X(m), Y(HR[m])]);
        s += poly(pts, C.dn, 2.4);
        if (pts.length) s += dot(pts[pts.length - 1][0], pts[pts.length - 1][1], 5, C.dn);
        var oL = fade(T, 3.2, 0.3);
        if (oL > 0) s += tag(X(26), Y(HR[26]) + 26, "a loss", C.dim, oL, "middle");
        var oW = fade(T, 8.8, 0.3);
        if (oW > 0) { s += rect(X(52), g.y0, X(58) - X(52), g.y1 - g.y0, C.blue, 0, 0.12 * oW); s += tag(X(55), g.y1 - 12, "walk · breathe", C.blue, oW, "middle"); }
        DEC.forEach(function (q, i) {
          var o = fade(T, q.at, 0.3);
          if (o <= 0) return;
          var x = X(q.m), y = Y(HR[q.m]);
          s += q.ok ? check(x, y - 18, C.up, o) : cross(x, y - 18, C.dn, o);
          if (!n || q.ok) s += tag(x + (q.ok ? 0 : 30), q.ok ? y + 26 : y - 40 - (2 - i) * 24, q.k, q.ok ? C.up : C.dn, o, q.ok ? "middle" : "start");
        });
        var nts = [
          [["Calm at the open", "Low 70s. Seeing the screen", "well, following the plan."], C.up, 0.3, 3],
          [["A loss", "Over 100 in a couple of", "minutes. Data keeps flying."], C.dn, 3.2, 5],
          [["Decisions up here", "Revenge entry, a moved stop,", "a double-down. Poor ones."], C.dn, 5.2, 8.6],
          [["Step away", "Notice it, get out, walk,", "breathe. It comes down."], C.blue, 8.8, 11],
          [["Back in range", "Good decisions again: wait", "for an A trade, one good trade."], C.up, 11.2, null]
        ];
        nts.forEach(function (q) { s += nb(n, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L, "Illustrative · made-up heart rate");
      }
    };
  }

  var SPECS = { slump: slumpSpec, size: sizeSpec, select: selectSpec, time: timeSpec, entry: entrySpec, heart: heartSpec };
  document.querySelectorAll("[data-etr-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-etr-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     Which rules fit your slump? Tick what sounds like you.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-etr-diag]");
    if (!root) return;
    var NAMES = { 1: "Lower your size and risk", 2: "Be more selective", 3: "Shorten your time frame", 4: "Don't do this alone", 5: "One good trade",
                  6: "A daily report card", 7: "Keep your heart rate low", 8: "Write your solution down and send it" };
    var out = root.querySelector("[data-diag-out]");
    function run() {
      var hits = {}, market = false, any = false;
      root.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
        if (!cb.checked) return;
        any = true;
        var r = cb.getAttribute("data-rules");
        if (r === "market") { market = true; return; }
        r.split(",").forEach(function (k) { hits[k] = (hits[k] || 0) + 1; });
      });
      var keys = Object.keys(hits).sort(function (a, b) { return hits[b] - hits[a] || a - b; });
      if (!any) { out.innerHTML = "Tick anything that sounds like your last couple of weeks."; return; }
      var html = "";
      if (keys.length) {
        html += "<p>Start with " + (keys.length === 1 ? "this rule" : "these rules") + ":</p><ol>" + keys.map(function (k) {
          return '<li><a href="#rule' + k + '">Rule ' + k + ": " + NAMES[k] + "</a></li>";
        }).join("") + "</ol>";
        if (keys.indexOf("8") < 0) html += '<p class="diag-foot">And whatever you pick, <a href="#rule8">write it down and send it to someone</a> (rule 8).</p>';
      }
      if (market) html += '<p class="diag-foot"><b>The market changed?</b> That one is different: you adjust to the new market, like buying pullbacks after the Fed started raising rates in 2022. <a href="#market">Rule it in or out first</a>.</p>';
      out.innerHTML = html;
    }
    root.addEventListener("change", run);
    run();
  })();

  /* =====================================================================
     A daily report card on one thing: entries
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-etr-card]");
    if (!root) return;
    var rows = root.querySelector("[data-card-rows]"), out = root.querySelector("[data-card-out]");
    var OPTS = [["", "No trade"], ["2", "On time"], ["1", "A bit late"], ["0", "Chased"]];
    var DEF = ["2", "1", "0", "2", ""];
    rows.innerHTML = DEF.map(function (v, i) {
      return '<label class="card-row"><span>Trade ' + (i + 1) + '</span><select name="t' + i + '">' + OPTS.map(function (o) {
        return '<option value="' + o[0] + '"' + (o[0] === v ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select></label>";
    }).join("");
    function grade(p) { return p >= 0.9 ? "A" : p >= 0.75 ? "B" : p >= 0.6 ? "C" : p >= 0.45 ? "D" : "F"; }
    function run() {
      var tot = 0, n = 0, chased = 0, late = 0;
      rows.querySelectorAll("select").forEach(function (s) {
        if (s.value === "") return;
        n++; tot += +s.value;
        if (s.value === "0") chased++;
        if (s.value === "1") late++;
      });
      if (!n) { out.innerHTML = "<b>No trades graded.</b> A day with no forced trades counts too."; return; }
      var p = tot / (2 * n), gr = grade(p);
      var tip = chased ? "Tomorrow: no entry more than a few cents past the level. If it's gone, it's gone." :
                late ? "Tomorrow: have the order ready at the level before price gets there." :
                "Clean. Keep the same card on entries for a few more days before you move on.";
      out.innerHTML = '<span class="card-grade g-' + gr + '">' + gr + "</span><span><b>" + Math.round(p * 100) + "% on-time score</b> over " + n + " trade" + (n > 1 ? "s" : "") +
        (chased ? ", " + chased + " chased" : "") + (late ? ", " + late + " a bit late" : "") + ".<br>" + tip + "</span>";
    }
    root.addEventListener("change", run);
    run();
  })();

  /* =====================================================================
     The way back, as a click-through stepper. Without the script the five
     show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-etr-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "Stop",     c: C.gold,   tag: "When in doubt, get out" },
      { k: "Diagnose", c: C.blue,   tag: "Find the real issue" },
      { k: "Shrink",   c: C.cyan,   tag: "Make the game easier" },
      { k: "Focus",    c: C.up,     tag: "One issue, one good trade" },
      { k: "Commit",   c: C.orange, tag: "A written plan someone else sees" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "The way back, step by step");
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
      function ln(x1, y1, x2, y2, col, w, dash) { return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 2) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>"; }
      function pl(pts, col, w, dash) { return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2.4) + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>"; }
      function bx(x, y, w, h, col, op) { return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="10" fill="' + col + '"' + (op != null ? ' opacity="' + op + '"' : "") + "/>"; }
      var top = 30, bot = H - 54, mid = (top + bot) / 2;
      if (k === 0) {
        var p = [[30, mid - 40], [80, mid - 20], [120, mid + 10], [160, mid - 4], [200, mid + 40], [240, mid + 30], [270, mid + 70]];
        s += pl(p, C.dn, 2.6);
        s += '<circle cx="270" cy="' + (mid + 70) + '" r="8" fill="' + C.gold + '"/>';
        s += t(270, mid + 104, "flatten", C.gold, 13, "middle", 700);
        s += ln(300, top + 10, 300, bot, "#3a3a3c", 1.4, "4 4");
        s += t(narrow ? 420 : 430, mid - 20, "walk", C.ink, 18, "middle", 700) + t(narrow ? 420 : 430, mid + 14, "breathe", C.ink, 18, "middle", 700) + t(narrow ? 420 : 430, mid + 48, "reassess", C.ink, 18, "middle", 700);
        s += t(30, bot + 34, "You can always get back in.", C.dim, 12, "start", 500);
      } else if (k === 1) {
        var Q = [["Market changed?", 0], ["Strategy broken?", 0], ["Entries sloppy?", 1], ["Size too big?", 1]];
        var cw = narrow ? 240 : 240, ch = narrow ? 70 : 46;
        Q.forEach(function (q, i) {
          var x = 30 + (i % 2) * (cw + 20), y = mid - 10 - (2 * ch + 22) / 2 + Math.floor(i / 2) * (ch + 22);
          s += bx(x, y, cw, ch, q[1] ? "#123d22" : "#2c2c2e");
          s += t(x + 14, y + ch / 2 + 5 * F, q[0], q[1] ? C.up : C.faint, 14, "start", 700);
          s += t(x + cw - 14, y + ch / 2 + 6 * F, q[1] ? "✓" : "✗", q[1] ? C.up : C.faint, 16, "end", 800);
        });
        s += t(30, bot + 34, "For this trader: entries and sizing, not the market.", C.dim, 12, "start", 500);
      } else if (k === 2) {
        var R2 = [["size", 1, 0.5], ["trades", 1, 0.35], ["hold time", 1, 0.25]], bwid = narrow ? 300 : 300;
        R2.forEach(function (q, i) {
          var y = top + 12 + i * (narrow ? 104 : 66);
          s += t(30, y + 4, q[0], C.dim, 13, "start", 700);
          s += bx(150, y - 14, bwid * q[1], 20, "#3a3a3c") + bx(150, y + 12, bwid * q[2], 20, C.cyan);
          s += t(150 + bwid * q[2] + 10, y + 28, "smaller", C.cyan, 12, "start", 700);
        });
        s += t(30, bot + 34, "Rules 1 to 3: an easier game to win.", C.dim, 12, "start", 500);
      } else if (k === 3) {
        var G = [["Mon", "B"], ["Tue", "B"], ["Wed", "A"], ["Thu", "A"], ["Fri", "A"]];
        var cwd = narrow ? 92 : 88;
        s += t(30, top + 12, "report card · entries only", C.up, 13, "start", 700);
        G.forEach(function (q, i) {
          var x = 30 + i * (cwd + 8), y = top + 32;
          s += bx(x, y, cwd, narrow ? 120 : 92, "#2c2c2e");
          s += t(x + cwd / 2, y + 26 * F, q[0], C.faint, 12, "middle", 600);
          s += t(x + cwd / 2, y + (narrow ? 96 : 72), q[1], q[1] === "A" ? C.up : C.gold, 26, "middle", 800);
        });
        s += t(W / 2, bot - 6, "“one good trade”", C.ink, 18, "middle", 700);
        s += t(30, bot + 34, "Rules 5 and 6: one issue, one trade at a time.", C.dim, 12, "start", 500);
      } else {
        s += bx(30, top + 4, narrow ? 230 : 210, bot - top - 10, "#2c2c2e");
        s += t(48, top + 34, "My plan", C.orange, 15, "start", 700);
        ["half size until 5 green days", "A trades only", "report card: entries", "heart rate under 85"].forEach(function (q, i) { s += t(48, top + 64 + i * (narrow ? 44 : 30), "· " + q, C.dim, 11, "start", 500); });
        var ax = narrow ? 290 : 270;
        s += ln(ax, mid, ax + 70, mid - 50, C.orange, 2.4) + ln(ax, mid, ax + 70, mid + 50, C.orange, 2.4);
        s += t(ax + 80, mid - 44, "mentor", C.ink, 16, "start", 700) + t(ax + 80, mid + 62, "teammate", C.ink, 16, "start", 700);
        s += t(30, bot + 34, "Rules 4 and 8: written, sent, accountable.", C.dim, 12, "start", 500);
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

  if (typeof window !== "undefined") window.__etr = { SPECS: SPECS };
})();
