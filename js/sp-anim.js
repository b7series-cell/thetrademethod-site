/* =====================================================================
   sp-anim.js — the walkthroughs and tools on stop-placement.html
   (SMB Capital, "The Stop Technique that Will Take You to the Trading
   Big Leagues", Jeff Holden).

     [data-sp-anim="claim"]    what an opening range break claims, and
                               where the claim dies
     [data-sp-anim="review"]   the CRWV review: three stops on one trade
     [data-sp-anim="manage"]   start wide, then step the stop up
     [data-sp-anim="turn"]     the turn trade at 54 with a tight stop
     [data-sp-calc]            same target, different stop: R and break-even
     [data-sp-pick]            pick your stop before the review
     [data-sp-ev]              wide vs closer stop over a sample
     [data-sp-steps]           your stop, step by step (click-through stepper)

   CRWV levels are the video's. Every bar, exact stop price, partial exit
   and sample number is made up to show the idea. Helpers and player are
   copied from etr-anim.js: each chart redraws in a narrow layout on a
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
     The made-up CRWV morning from the video's review: a 54 to 57 opening
     range, pre-market high 57.75, long 57.82, target 60
     ===================================================================== */
  var OPEN0 = 55.60, RH = 57.00, PMH = 57.75, LOD = 54.00, ENTRY = 57.82, TGT = 60.00;
  var STOP_A = 54.00, STOP_B = 55.90, STOP_C = 56.90, STOP_D = 57.65;
  var CLOSES = [55.95, 56.60, 56.10, 55.10, 54.30, 54.85, 55.45, 55.90, 56.40, 56.20, 56.55, 56.80, 56.60, 56.90, 57.25, 57.10, 57.45, 57.90,
                58.10, 57.95, 58.35, 58.60, 58.45, 58.80, 59.05, 58.90, 59.30, 59.55, 59.40, 59.80, 60.10, 59.85, 60.00, 60.20, 60.05, 60.35,
                60.15, 60.40, 60.25, 60.50, 60.30, 60.45, 60.60, 60.40, 60.55, 60.35, 60.50, 60.65];
  var VWAP = [[0, 55.85], [4, 55.55], [8, 55.70], [13, 55.90], [17, 56.00], [30, 57.30], [47, 58.30]];
  function morning() {
    var r = rng(77), B = [], prev = OPEN0;
    CLOSES.forEach(function (c) { var o = prev; B.push({ o: o, h: Math.max(o, c) + 0.04 + r() * 0.16, l: Math.min(o, c) - 0.04 - r() * 0.16, c: c }); prev = c; });
    clampRange(B, 0, 13, LOD, RH);
    B[11].h = RH; B[4].l = LOD; B[5].l = 54.06;
    B[7].h = Math.max(B[7].h, 56.02); B[8].h = Math.max(B[8].h, 56.55);
    clampRange(B, 12, 16, 56.45, 57.70);
    B[17].h = Math.max(B[17].h, 57.98); B[17].l = Math.max(B[17].l, 57.38);
    clampRange(B, 18, 47, 57.78, null);
    clampRange(B, 0, 29, null, 59.98);
    B[30].h = 60.15;
    tidy(B);
    return B;
  }
  var MORNING = morning();

  function ctx(L, N, lo, hi) {
    var n = L.narrow;
    var g = n ? { x0: 14, x1: L.W - 62, y0: 226, y1: L.H - 56 } : { x0: 46, x1: 750, y0: 60, y1: L.H - 56 };
    return {
      n: n, g: g, L: L, lo: lo, hi: hi, N: N,
      X: function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; },
      Y: function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); },
      bw: (g.x1 - g.x0) / N * 0.6
    };
  }
  /* a horizontal level with a tag at the right (or left) end */
  function lvl(c, v, col, label, op, dash, left, w, i0) {
    if (op <= 0) return "";
    var y = c.Y(v), x0 = i0 == null ? c.g.x0 : c.X(i0);
    return line(x0, y, c.g.x1, y, col, w || 1.6, dash, op) +
      (label ? (left ? tag(x0 + 4, y - 13, label, col, op, "start") : tag(c.g.x1 - 2, y - 13, label, col, op, "end")) : "");
  }
  function vwapLine(c, upto, op) {
    var pts = [];
    for (var i = 0; i < upto && i < c.N; i++) pts.push([c.X(i), c.Y(track(VWAP, i))]);
    return poly(pts, C.cyan, 2, null, op);
  }
  function title(c, s, short) { return txt(c.g.x0, c.g.y0 - 18, c.n ? (short || s) : s, C.faint, 12, "start", 600); }
  function be(risk, reward) { return Math.round(risk / (risk + reward) * 100); }
  function rr(risk, reward) { return fmt(reward / risk, 1); }

  /* =====================================================================
     What an opening range break claims, and where the claim dies
     ===================================================================== */
  function claimSpec() {
    var B = MORNING.slice(0, 26), N = 30;
    var GH = [], prev = B[17].c;
    [57.30, 56.70, 55.95, 55.20, 54.55, 54.10].forEach(function (cl) { var o = prev; GH.push({ o: o, h: Math.max(o, cl) + 0.08, l: Math.min(o, cl) - 0.1, c: cl }); prev = cl; });
    var ST = [
      { at: 0, title: "The opening range", text: "Made-up 1-minute bars. The first stretch of the morning chops between 54.00 and 57.00, with VWAP near 56 in the middle." },
      { at: 3.2, title: "The claim", text: "It breaks above 57 and then the pre-market high. An opening range break claims one thing: price leaves the range and stays out." },
      { at: 6.5, title: "What failure looks like", text: "If the claim were wrong, it wouldn't drift. A failed break in a choppy range tends to fall back in, lose VWAP and run to the other side fast." },
      { at: 9.5, title: "Where the claim dies", text: "Back inside the range and under VWAP, the claim is dead. That's where the stop goes, around 55.90. The low of the day is where a failure ends, not where it starts." },
      { at: 12.5, title: "The stop's one job", text: "Mark the price where the claim is dead. How far away it is and how it feels come second." }
    ];
    return {
      stages: ST, end: 16, size: sizeStd,
      frame: function (T, L) {
        var c = ctx(L, N, 53.4, 59.4), s = "";
        s += hgrid(c.g.x0, c.g.x1, c.Y, 53.5, 59.4, 0.5, function (v) { return fmt(v, 2); });
        s += title(c, "An opening range break on made-up 1-minute bars", "1-minute bars · made up");
        var cnt = track([[0, 0], [3, 14], [3.2, 14], [6, 24], [12.5, 24], [14.5, 26]], T);
        var ghost = win(T, 6.5, 12.5);
        s += band(c.X(0) - c.bw, c.X(13) + c.bw, c.Y, LOD, RH, C.blue, fade(T, 1.8, 0.5), 0.1);
        s += tag(c.X(0) - c.bw + 4, c.Y(RH) - 13, "range high 57.00", C.blue, fade(T, 1.8, 0.5), "start");
        s += lvl(c, PMH, C.grey, c.n ? "PM high 57.75" : "pre-market high 57.75", fade(T, 2.4, 0.4), "4 4");
        s += vwapLine(c, Math.min(cnt, 26), 0.9);
        s += tag(c.X(1), c.Y(track(VWAP, 1)) + 18, "VWAP", C.cyan, fade(T, 0.6, 0.4), "start");
        s += drawBars(B, c.X, c.Y, cnt, c.bw, function (i) { return i > 17 ? 1 - 0.82 * ghost : 1; });
        if (ghost > 0) {
          var gc = track([[6.5, 0], [9, 6]], T);
          s += '<g opacity="' + (0.85 * ghost).toFixed(3) + '">' + drawBars(GH, function (i) { return c.X(18 + i); }, c.Y, gc, c.bw) + "</g>";
          s += tag(c.X(23) - 14, c.Y(54.1) + 2, "failed break", C.dn, fade(T, 8.6, 0.3) * ghost * (T < 9.5 ? 1 : 0), "end");
        }
        var oc = win(T, 3.4, 6.3);
        s += arrow(c.X(17), c.Y(58.2), c.X(24), c.Y(59.1), C.up, oc);
        s += tag(c.X(24), c.Y(59.1) + 22, "leaves and stays out", C.up, oc, "end");
        var od = fade(T, 9.5, 0.4);
        s += rect(c.g.x0, c.Y(RH), c.g.x1 - c.g.x0, c.Y(STOP_B) - c.Y(RH), C.orange, 2, 0.14 * od);
        s += lvl(c, STOP_B, C.orange, "claim dies · stop 55.90", od, null, true, 2.2);
        s += lvl(c, LOD, C.dn, "low of day 54.00", od, "5 4");
        var nts = [
          [["Opening range", "54.00 to 57.00,", "VWAP near 56."], C.blue, 0.3, 3.2],
          [["The claim", "Price leaves the range", "and stays out."], C.up, 3.4, 6.5],
          [["If it's wrong", "Back in the range, through", "VWAP, down to 54. Fast."], C.dn, 6.7, 9.5],
          [["Where the claim dies", "Back in the range and under", "VWAP: stop about 55.90."], C.orange, 9.7, 12.5],
          [["One job", "Mark where the claim is dead.", "Distance and comfort come second."], C.gold, 12.7, null]
        ];
        nts.forEach(function (q) { s += nb(c.n, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     The review: three stops on the same CRWV trade
     ===================================================================== */
  function reviewSpec() {
    var N = 48, R = TGT - ENTRY;
    var STOPS = [
      { v: STOP_A, k: "A", lb: "low of day", col: C.dn, at: 3.5, i0: 19 },
      { v: STOP_B, k: "B", lb: "under VWAP", col: C.orange, at: 6.5, i0: 25 },
      { v: STOP_C, k: "C", lb: "under range", col: C.up, at: 9.5, i0: 31 }
    ];
    var ST = [
      { at: 0, title: "The trade", text: "Made-up 1-minute bars with the video's levels. CRWV chops in a 54 to 57 range, then breaks the pre-market high. Long 57.82, target 60.00, which the trader called resistance." },
      { at: 3.5, title: "Stop A: the low of the day", text: "His stop: the 54.00 low. 3.82 of risk to make 2.18, about 0.6 to 1. It has to win 64% of the time just to break even." },
      { at: 6.5, title: "Stop B: just under VWAP", text: "Same entry, same target, stop 55.90 just under VWAP. 1.92 of risk, about 1.1 to 1, break even at 47%. The probability barely changes." },
      { at: 9.5, title: "Stop C: just under the range", text: "Stop 56.90, just under where the range breaks back down. 0.92 of risk, about 2.4 to 1, break even at 30%. Now you start to change the probability." },
      { at: 12.5, title: "Same trade", text: "It works either way: 60 breaks, he sells 90% and keeps a runner. Same entry, same target, same trade. Only the stop changed what it was worth." }
    ];
    return {
      stages: ST, end: 18, size: sizeStd,
      frame: function (T, L) {
        var c = ctx(L, N, 53.4, 61.0), s = "";
        s += hgrid(c.g.x0, c.g.x1, c.Y, 53.5, 61, 0.5, function (v) { return fmt(v, 2); });
        s += title(c, "CRWV opening range break · made-up 1-minute bars, levels from the video", "CRWV · made-up bars");
        var cnt = track([[0, 0], [3, 18], [12.5, 18], [16, 48]], T);
        s += band(c.X(0) - c.bw, c.X(13) + c.bw, c.Y, LOD, RH, C.blue, 1, 0.08);
        s += lvl(c, PMH, C.grey, null, 0.8, "4 4");
        s += c.n ? tag(c.g.x1 - 2, c.Y(PMH) + 16, "PM high 57.75", C.grey, 1, "end") : tag(c.X(0) - c.bw + 4, c.Y(PMH) - 12, "PM high 57.75", C.grey, 1, "start");
        s += lvl(c, TGT, C.up, "target 60.00", fade(T, 1.6, 0.4), "5 4", c.n);
        s += vwapLine(c, cnt, 0.85);
        s += drawBars(MORNING, c.X, c.Y, cnt, c.bw);
        var oe = fade(T, 2.2, 0.3);
        s += dot(c.X(17), c.Y(ENTRY), 6, C.ink, oe);
        s += tag(c.X(17) - 10, c.Y(ENTRY) - 16, "long 57.82", C.ink, oe, "end");
        var dim = T >= 12.5 ? 0.4 : 1;
        STOPS.forEach(function (st) {
          var o = fade(T, st.at, 0.4) * dim;
          if (o <= 0) return;
          var x0 = c.X(st.i0) - c.bw, x1 = c.X(st.i0 + 4) + c.bw, risk = ENTRY - st.v;
          s += rect(x0, c.Y(ENTRY), x1 - x0, c.Y(st.v) - c.Y(ENTRY), st.col, 3, 0.24 * o);
          s += rect(x0, c.Y(TGT), x1 - x0, c.Y(ENTRY) - c.Y(TGT), C.up, 3, 0.1 * o);
          s += line(x0, c.Y(st.v), x1, c.Y(st.v), st.col, 2.2, null, o);
          s += line(c.X(17), c.Y(ENTRY), x1, c.Y(ENTRY), C.ink, 1.2, "3 3", o);
          s += txt((x0 + x1) / 2, c.Y(st.v) + 18, st.k + " " + fmt(st.v, 2), st.col, 12, "middle", 700, o);
          s += txt((x0 + x1) / 2, c.Y(st.v) + 34, rr(risk, R) + " to 1", C.dim, 12, "middle", 600, o);
        });
        var nts = [
          [["The trade", "Long 57.82 on the PM-high break.", "Target 60.00 (2.18 away)."], C.ink, 0.3, 3.5],
          [["A · low of day 54.00", "Risk 3.82 for 2.18: 0.6 to 1.", "Break even: win 64%."], C.dn, 3.7, 6.5],
          [["B · under VWAP 55.90", "Risk 1.92 for 2.18: 1.1 to 1.", "Break even: win 47%."], C.orange, 6.7, 9.5],
          [["C · under range 56.90", "Risk 0.92 for 2.18: 2.4 to 1.", "Break even: win 30%."], C.up, 9.7, 12.5],
          [["Same trade", "60 breaks: sell 90%, keep a", "runner. Only the stop changed."], C.gold, 12.7, null]
        ];
        nts.forEach(function (q) { s += nb(c.n, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L, "Illustrative · made-up bars, levels from the video");
      }
    };
  }

  /* =====================================================================
     Start wide, then move it: the stop steps up at each "am I wrong?"
     ===================================================================== */
  function manageSpec() {
    var N = 48;
    var STEPS = [[17, STOP_A], [20, STOP_B], [24, STOP_C], [28, STOP_D]];
    function stopAt(i) { var v = null; STEPS.forEach(function (q) { if (i >= q[0]) v = q[1]; }); return v; }
    var ST = [
      { at: 0, title: "Entry, stop at the low", text: "Long 57.82 on the break of the pre-market high, stop at the 54.00 low. Starting wide is allowed. Staying wide is the problem." },
      { at: 3, title: "Wrong under VWAP?", text: "It's holding above the range. If it dropped back under VWAP and the 55.60 open, would the trade be wrong? Yes. Stop to 55.90." },
      { at: 6, title: "Wrong back in the range?", text: "Still holding above 57. Back inside the range would mean the break failed. Stop to 56.90." },
      { at: 9, title: "Wrong under the pre-market high?", text: "Pushing toward 59. Losing the pre-market high now would be a failed breakout. Stop to 57.65." },
      { at: 12, title: "Sell 90% at 60", text: "60 breaks. Sell 90% and keep a runner with the stop under the pre-market high. The risk went from 3.82 to 0.17 without changing the trade." }
    ];
    return {
      stages: ST, end: 17, size: sizeStd,
      frame: function (T, L) {
        var c = ctx(L, N, 53.4, 61.0), s = "";
        s += hgrid(c.g.x0, c.g.x1, c.Y, 53.5, 61, 0.5, function (v) { return fmt(v, 2); });
        s += title(c, "The same CRWV trade · made-up 1-minute bars", "CRWV · made-up bars");
        var cnt = track([[0, 0], [2.5, 18], [3, 18], [5, 21], [6, 21], [8, 25], [9, 25], [11, 29], [12, 29], [16, 48]], T);
        s += band(c.X(0) - c.bw, c.X(13) + c.bw, c.Y, LOD, RH, C.blue, 1, 0.08);
        s += lvl(c, OPEN0, C.grey, null, 0.6, "2 4", false, 1, 0);
        s += c.n ? tag(c.g.x1 - 2, c.Y(OPEN0) + 16, "open 55.60", C.grey, 1, "end") : tag(c.X(0) - c.bw + 4, c.Y(OPEN0) + 16, "open 55.60", C.grey, 1, "start");
        s += lvl(c, PMH, C.grey, null, 0.8, "4 4");
        s += c.n ? tag(c.g.x1 - 2, c.Y(PMH) + 16, "PM high 57.75", C.grey, 1, "end") : tag(c.X(0) - c.bw + 4, c.Y(PMH) - 12, "PM high 57.75", C.grey, 1, "start");
        s += lvl(c, TGT, C.up, "target 60.00", 1, "5 4", c.n);
        s += vwapLine(c, cnt, 0.85);
        s += drawBars(MORNING, c.X, c.Y, cnt, c.bw);
        if (cnt >= 17) {
          s += dot(c.X(17), c.Y(ENTRY), 6, C.ink, 1);
          s += tag(c.X(17) - 10, c.Y(ENTRY) - 16, "long 57.82", C.ink, 1, "end");
          var pts = [], last = Math.min(47, Math.floor(cnt));
          for (var i = 17; i <= last; i++) {
            var v = stopAt(i), x0 = c.X(i) - (c.X(1) - c.X(0)) / 2, x1 = c.X(i) + (c.X(1) - c.X(0)) / 2;
            if (pts.length && pts[pts.length - 1][1] !== c.Y(v)) pts.push([x0, c.Y(v)]);
            if (!pts.length) pts.push([x0, c.Y(v)]);
            pts.push([x1, c.Y(v)]);
          }
          s += poly(pts, C.dn, 2.6);
          var cur = stopAt(last);
          var ex = pts[pts.length - 1][0];
          s += ex > c.g.x1 - 90 ? tag(ex - 4, c.Y(cur) + 16, "stop " + fmt(cur, 2), C.dn, 1, "end") : tag(ex + 4, c.Y(cur) + 16, "stop " + fmt(cur, 2), C.dn, 1, "start");
        }
        var o4 = fade(T, 13.6, 0.3);
        s += dot(c.X(30), c.Y(TGT), 6, C.up, o4);
        s += tag(c.X(30), c.Y(TGT) - 18, "sell 90%", C.up, o4, "middle");
        var nts = [
          [["Start wide", "Long 57.82, stop 54.00.", "Risk 3.82."], C.dn, 0.3, 3],
          [["Wrong under VWAP?", "Yes. Stop to 55.90.", "Risk 1.92."], C.orange, 3.2, 6],
          [["Wrong back in the range?", "Yes. Stop to 56.90.", "Risk 0.92."], C.gold, 6.2, 9],
          [["Wrong under the PM high?", "Yes. Stop to 57.65.", "Risk 0.17."], C.up, 9.2, 12],
          [["Sell 90% at 60", "Runner's stop under the PM high.", "Same trade, far less at risk."], C.up, 12.2, null]
        ];
        nts.forEach(function (q) { s += nb(c.n, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L, "Illustrative · made-up bars, levels from the video");
      }
    };
  }

  /* =====================================================================
     Same morning, a different trade: the turn at 54
     ===================================================================== */
  function turnSpec() {
    var N = 20, B = MORNING.slice(0, 20), TE = 54.08, TS = 53.92;
    var EX = [{ i: 6, v: 55.40 }, { i: 7, v: 56.00 }, { i: 8, v: 56.50 }];
    var ST = [
      { at: 0, title: "The flush to 54", text: "Made-up 1-minute bars, same morning. CRWV pulls down to 54: higher time frame support, the low of the range, where the pre-market buyers were." },
      { at: 3, title: "Buyers step in", text: "Buyers show up at the level with conviction. That's the whole thesis: a strong stock, a key level, buyers defending it." },
      { at: 5.5, title: "Entry and stop", text: "Long 54.08, stop 53.92 just under 54. If 54 breaks, the level's gone and the trade is gone with it. 16 cents of risk." },
      { at: 8, title: "Pieces off", text: "Pieces come off on the way back up, at 55.40 and 56.00. The last piece sits on a resting order at 56.50, and it fills: about 15 to 1 on 16 cents." },
      { at: 11.5, title: "Two honest stops", text: "Same stock, same morning: 3.82 of risk on the breakout, 0.16 on the bounce. Only one of those stops belonged to the trade it was protecting." }
    ];
    return {
      stages: ST, end: 15, size: sizeStd,
      frame: function (T, L) {
        var c = ctx(L, N, 53.6, 57.4), s = "";
        s += hgrid(c.g.x0, c.g.x1, c.Y, 53.75, 57.4, 0.25, function (v) { return fmt(v, 2); });
        s += title(c, "The turn trade at 54 · made-up 1-minute bars", "Turn at 54 · made up");
        var cnt = track([[0, 0], [2.5, 5], [3, 5], [5, 5.7], [5.5, 6], [8, 6], [10.5, 9], [11.5, 9], [14, 14]], T);
        var o1 = fade(T, 1.6, 0.5);
        s += band(c.g.x0, c.g.x1, c.Y, 53.96, 54.04, C.blue, o1, 0.3);
        s += tag(c.g.x1 - 2, c.Y(54) + 18, c.n ? "54 support" : "54 · HTF support, range low", C.blue, o1, "end");
        s += lvl(c, RH, C.grey, "range high 57.00", 0.8, "4 4");
        s += vwapLine(c, cnt, 0.7);
        var oBuy = win(T, 3, 5.5);
        s += rect(c.X(4) - c.bw, c.Y(54.4), c.bw * 2 + (c.X(5) - c.X(4)), c.Y(54.0) - c.Y(54.4) + 6, C.up, 4, 0.22 * oBuy);
        s += tag(c.X(5) + 14, c.Y(54.2), "buyers", C.up, oBuy, "start");
        s += drawBars(B, c.X, c.Y, cnt, c.bw);
        var oe = fade(T, 5.5, 0.4);
        if (oe > 0) {
          var x0 = c.X(5) + c.bw, x1 = c.X(9) + c.bw;
          s += rect(x0, c.Y(TE), x1 - x0, c.Y(TS) - c.Y(TE), C.dn, 2, 0.35 * oe);
          s += rect(x0, c.Y(56.5), x1 - x0, c.Y(TE) - c.Y(56.5), C.up, 2, 0.1 * oe);
          s += line(x0, c.Y(TS), x1, c.Y(TS), C.dn, 2.2, null, oe);
          s += dot(c.X(5), c.Y(TE), 6, C.ink, oe);
          s += tag(x1 + 6, c.Y(TS) + 12, "stop 53.92", C.dn, oe, "start");
          s += tag(x1 + 6, c.Y(TE) - 10, "long 54.08", C.ink, oe, "start");
          s += lvl(c, 56.5, C.up, "resting sell 56.50", oe, "5 4", false, 1.4, 5);
        }
        EX.forEach(function (e, k) {
          var o = fade(T, 8.6 + k * 0.8, 0.3);
          s += dot(c.X(e.i), c.Y(e.v), 5, C.up, o);
          s += tag(c.X(e.i) - 10, c.Y(e.v), fmt(e.v, 2), C.up, o, "end");
        });
        var oc = fade(T, 11.7, 0.4);
        if (oc > 0) {
          var cx = c.n ? 14 : 790, cy = c.n ? 18 : 250, cw = c.n ? L.W - 28 : 370, ch = c.n ? 176 : 210, bwMax = cw - 40;
          s += '<g opacity="' + oc.toFixed(3) + '">' + rect(cx, cy, cw, ch, C.box, 12);
          s += txt(cx + 16, cy + 28, "Risk per share, same morning", C.ink, 14, "start", 700);
          [["Breakout · stop at the low", 3.82, C.dn], ["Turn · stop under 54", 0.16, C.up]].forEach(function (q, k) {
            var yy = cy + (c.n ? 62 : 70) + k * (c.n ? 58 : 66);
            s += txt(cx + 16, yy, q[0], C.dim, 13, "start", 600);
            s += rect(cx + 16, yy + 10, Math.max(4, bwMax * q[1] / 3.82 * track([[11.7, 0], [13, 1]], T)), 18, q[2], 4, 0.9);
            s += txt(cx + cw - 16, yy, fmt(q[1], 2), q[2], 15, "end", 800);
          });
          s += "</g>";
        }
        var nts = [
          [["The flush to 54", "HTF support, the range low,", "where pre-market buyers were."], C.blue, 0.3, 3],
          [["Buyers step in", "With conviction, right at", "the level."], C.up, 3.2, 5.5],
          [["Entry and stop", "Long 54.08, stop 53.92.", "Lose 54, lose the trade."], C.dn, 5.7, 8],
          [["Pieces off", "55.40, 56.00, then the", "resting order at 56.50."], C.up, 8.2, 11.5]
        ];
        nts.forEach(function (q) { s += nb(c.n, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L, "Illustrative · made-up bars, levels from the video");
      }
    };
  }

  var SPECS = { claim: claimSpec, review: reviewSpec, manage: manageSpec, turn: turnSpec };
  document.querySelectorAll("[data-sp-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-sp-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     Same target, different stop: reward to risk and the break-even win rate
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-sp-calc]");
    if (!root) return;
    var out = root.querySelector("[data-calc-out]");
    function val(n) { return parseFloat(root.querySelector("input[name=" + n + "]").value); }
    function run() {
      var e = val("entry"), t = val("target"), st = val("stop");
      if (!isFinite(e) || !isFinite(t) || !isFinite(st)) { out.innerHTML = '<p class="calc-note">Enter all three prices.</p>'; return; }
      var long = t > e, risk = long ? e - st : st - e, reward = long ? t - e : e - t;
      if (reward <= 0 || risk <= 0) { out.innerHTML = '<p class="calc-note">The stop has to be on the other side of the entry from the target.</p>'; return; }
      var b = risk / (risk + reward) * 100, ratio = reward / risk;
      var verdict = ratio < 1 ? "The trade risks more than it can make. It has to be right most of the time just to break even." :
                    ratio < 1.5 ? "About even money. It needs to win roughly half the time to break even." :
                    "The same target on a closer stop: it can be wrong more often than right and still pay.";
      out.innerHTML = '<div class="calc-out">' +
        "<div><span>Risk / share</span><b>" + fmt(risk, 2) + "</b></div>" +
        "<div><span>Reward / share</span><b>" + fmt(reward, 2) + "</b></div>" +
        "<div><span>Reward to risk</span><b>" + fmt(ratio, ratio < 10 ? 2 : 1) + " to 1</b></div>" +
        "<div><span>Break-even win rate</span><b>" + Math.round(b) + "%</b></div></div>" +
        '<div class="meter" aria-hidden="true"><i style="width:' + b.toFixed(1) + '%"></i></div>' +
        '<p class="calc-note">Needs to win about ' + fmt(b / 10, 1) + " of every 10 trades to break even" + (long ? "" : " (short)") + ". " + verdict + "</p>";
    }
    root.querySelectorAll("[data-p]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = b.getAttribute("data-p").split(",");
        ["entry", "target", "stop"].forEach(function (n, i) { root.querySelector("input[name=" + n + "]").value = p[i]; });
        run();
      });
    });
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     Pick your stop before the review
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-sp-pick]");
    if (!root) return;
    var out = root.querySelector("[data-pick-out]");
    var TXT = {
      lod: "<p><b>The low of the day, 54.00.</b> That's what the trader picked: 3.82 of risk to make 2.18. Now ask: if price got all the way back to 54, would the breakout's claim still be right? No. It was dead long before that.</p>",
      vwap: "<p><b>Just under VWAP, about 55.90.</b> 1.92 of risk for the same 2.18. If price is back under VWAP the break has failed, and in a choppy range the odds favor a run to the low anyway.</p>"
    };
    root.addEventListener("click", function (e) {
      var b = e.target.closest(".pick"); if (!b) return;
      root.querySelectorAll(".pick").forEach(function (x) { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      out.innerHTML = TXT[b.getAttribute("data-k")] + '<p class="calc-note">The walkthrough below puts both, plus a third stop, on the chart.</p>';
    });
    root.querySelectorAll(".pick").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
  })();

  /* =====================================================================
     Wide stop vs closer stop over a sample: expected value per trade
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-sp-ev]");
    if (!root) return;
    var out = root.querySelector("[data-ev-out]");
    function val(n) { return parseFloat(root.querySelector("input[name=" + n + "]").value); }
    function ev(w, a, l) { return w / 100 * a - (1 - w / 100) * l; }
    function sg(v) { return (v < 0 ? "−" : "+") + fmt(Math.abs(v), 2); }
    function run() {
      var w1 = val("w1"), a1 = val("a1"), l1 = val("l1"), w2 = val("w2"), a2 = val("a2"), l2 = val("l2");
      if ([w1, a1, l1, w2, a2, l2].some(function (v) { return !isFinite(v); })) { out.innerHTML = '<p class="calc-note">Fill in every box.</p>'; return; }
      var e1 = ev(w1, a1, l1), e2 = ev(w2, a2, l2), best = e2 > e1 ? 2 : 1;
      var html = '<div class="ev-res">' +
        '<div class="' + (best === 1 ? "best" : "") + '"><span>Wide stop · per trade, per share</span><b>' + sg(e1) + "</b><span>" + sg(e1 * 100 * 20).replace(/\.00$/, "") + " over 20 trades of 100 shares</span></div>" +
        '<div class="' + (best === 2 ? "best" : "") + '"><span>Closer stop · per trade, per share</span><b>' + sg(e2) + "</b><span>" + sg(e2 * 100 * 20).replace(/\.00$/, "") + " over 20 trades of 100 shares</span></div></div>";
      var msg = Math.abs(e2 - e1) < 0.005 ? "About the same. Keep collecting trades before you make either one a rule." :
        best === 2 ? "The closer stop wins less often but pays more over the sample. Keep tracking it before it becomes a rule." :
        "The wide stop is better here: the closer stop gets hit too often to pay for itself. Too tight is a real cost.";
      out.innerHTML = html + '<p class="calc-note">' + msg + "</p>";
    }
    root.querySelectorAll("[data-p]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = b.getAttribute("data-p").split(",");
        ["w1", "a1", "l1", "w2", "a2", "l2"].forEach(function (n, i) { root.querySelector("input[name=" + n + "]").value = p[i]; });
        run();
      });
    });
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     Your stop, step by step, as a click-through stepper. Without the
     script the five show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-sp-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "Claim",   c: C.blue,   tag: "What the trade says will happen" },
      { k: "Wrong if", c: C.gold,  tag: "Behavior, not dollars" },
      { k: "Stop",    c: C.orange, tag: "Where the claim dies" },
      { k: "Move it", c: C.up,     tag: "Am I wrong if it drops this?" },
      { k: "Review",  c: C.cyan,   tag: "Let your sample decide" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Your stop, step by step");
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
      function bx(x, y, w, h, col, op) { return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="8" fill="' + col + '"' + (op != null ? ' opacity="' + op + '"' : "") + "/>"; }
      var top = 30, bot = H - 54, mid = (top + bot) / 2;
      /* a little price path used by several steps: chop in a box, then break up */
      var bxL = 40, bxR = 250, bxT = mid - 30, bxB = mid + 50;
      var path = [[40, mid + 10], [70, mid - 20], [100, mid + 30], [130, mid + 46], [160, mid], [190, mid - 22], [220, mid + 4], [250, mid - 26], [290, mid - 60], [330, mid - 54], [370, mid - 84], [410, mid - 96], [450, mid - 112]];
      if (k === 0) {
        s += bx(bxL, bxT, bxR - bxL, bxB - bxT, C.blue, 0.16);
        s += t(bxL + 8, bxB + 22, "opening range", C.blue, 12, "start", 700);
        s += pl(path, C.ink, 2.4);
        s += ln(290, mid - 60, 440, mid - 116, C.up, 3) + t(narrow ? 300 : 330, mid - 128, "leaves and stays out", C.up, 13, "start", 700);
        s += t(30, bot + 34, "The claim, in one sentence.", C.dim, 12, "start", 500);
      } else if (k === 1) {
        s += bx(40, top + 10, W - 80, bot - top - 20, "#2c2c2e");
        s += t(62, top + 44, "Opening range break, long", C.gold, 15, "start", 700);
        s += t(62, top + (narrow ? 100 : 84), "Wrong if: back in the range", C.ink, 15, "start", 600);
        s += t(62, top + (narrow ? 136 : 110), "and under VWAP.", C.ink, 15, "start", 600);
        s += t(62, top + (narrow ? 196 : 152), "Not: \"if I lose $500\".", C.faint, 13, "start", 500);
        s += t(30, bot + 34, "No line, no stop. Just a hope.", C.dim, 12, "start", 500);
      } else if (k === 2) {
        var yE = mid - 40, yT = top + 10, yW = bot - 4, yB = mid + 20;
        s += bx(70, yT, 150, yE - yT, C.up, 0.18) + bx(70, yE, 150, yW - yE, C.dn, 0.22);
        s += t(145, yW - 34 * F, "low of day", C.dim, 12, "middle", 600);
        s += t(145, yW - 12, "0.6 to 1", C.dn, 14, "middle", 700);
        s += bx(300, yT, 150, yE - yT, C.up, 0.18) + bx(300, yE, 150, yB - yE, C.orange, 0.3);
        s += t(375, yB + 22, "under VWAP", C.orange, 12, "middle", 600);
        s += t(375, yB + 44, "1.1 to 1", C.orange, 14, "middle", 700);
        s += ln(50, yE, 480, yE, C.ink, 1.6) + t(486, yE + 4, "entry", C.dim, 11, "start", 600);
        s += ln(50, yT, 480, yT, C.up, 1.4, "5 4") + t(486, yT + 4, "target", C.up, 11, "start", 600);
        s += t(30, bot + 34, "Same target. The honest stop is closer.", C.dim, 12, "start", 500);
      } else if (k === 3) {
        s += pl(path, C.ink, 2.2);
        var stairs = [[250, bot - 6], [300, bot - 6], [300, mid + 6], [350, mid + 6], [350, mid - 30], [400, mid - 30], [400, mid - 62], [460, mid - 62]];
        s += pl(stairs, C.dn, 2.6);
        s += t(470, mid - 58, "stop", C.dn, 12, "start", 700);
        s += t(narrow ? 40 : 60, top + 6, "wrong under VWAP? wrong in the range?", C.up, 12, "start", 600);
        s += t(30, bot + 34, "Each yes moves the stop up.", C.dim, 12, "start", 500);
      } else {
        var base = mid + 60, sc = 150;
        s += ln(60, base, 500, base, "#3a3a3c", 1.4);
        [["wide stop", 0.08, C.grey], ["closer stop", 0.46, C.up]].forEach(function (q, i) {
          var x = 120 + i * 200, h = q[1] / 0.5 * sc;
          s += bx(x, base - h, 110, h, q[2], 0.85);
          s += t(x + 55, base - h - 10, "+" + q[1].toFixed(2), q[2], 15, "middle", 800);
          s += t(x + 55, base + 22, q[0], C.dim, 12, "middle", 600);
        });
        s += t(60, top + 6, "expected value per trade, per share", C.cyan, 12, "start", 600);
        s += t(30, bot + 34, "Made-up sample. Track your own first.", C.dim, 12, "start", 500);
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

  if (typeof window !== "undefined") window.__sp = { SPECS: SPECS, MORNING: MORNING };
})();
