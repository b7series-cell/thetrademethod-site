/* =====================================================================
   pyr-anim.js — the animated walkthroughs on pyramiding.html
   (SMB Capital, "The Prop Trading Technique that Will Make You Dangerously Good").

     [data-pyr-anim="ladder"]  the math in risk units: 1R, then 0.5R, then 0.25R,
                               the stop moving up behind every add
     [data-pyr-anim="model"]   the model: a fashionably late trade, a 0.5R add near
                               target, the whole stop to the old target (worst case +2.5R)
     [data-pyr-anim="amd"]     AMD: opening range break long 478 / 468, the puppy dog,
                               a 0.5R add at 493, the whole stop to 489
     [data-pyr-anim="cbrs"]    CBRS: opening range break short 155.50 / 157.50 under the
                               160 IPO price, a 0.5R add at 151.50 against VWAP
     [data-pyr-anim="volume"]  an add on volume alone, with no level of its own
     [data-pyr-steps]          "the pyramid, step by step" as a click-through stepper

   Same player as ttt-anim.js: each chart redraws in a narrow layout on a
   phone instead of scrolling sideways, and on a phone the callouts sit in a
   band above the chart so they never cover it.

   The prices and sizes are the ones named in the video; every bar is made up.
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

  /* =====================================================================
     1 · The math in risk units: 1R, then 0.5R, then 0.25R, the stop moving up each time
     ===================================================================== */
  function ladderSpec() {
    var N = 46, lo = 92, hi = 130;
    var CL = [98, 97.2, 98.8, 97.6, 99.1, 97.4, 98.6, 99.2,
              101.4, 102.6, 103.4, 104.9, 106.2, 107.4, 108.0,
              106.8, 105.6, 105.0, 105.4, 106.4, 105.8, 106.9, 107.2,
              109.0, 110.2, 111.6, 113.0, 114.2, 114.8,
              113.6, 112.9, 113.2, 113.0, 113.6,
              115.2, 116.4, 117.8, 117.2, 119.0, 120.6, 120.0, 122.4, 124.0, 123.4, 125.6, 127.0];
    var B = mkBars(CL, 98.4, 11, 0.7);
    clampRange(B, 0, 7, 96.1, 99.9); B[2].l = 96; B[5].l = 96.2;
    clampRange(B, 15, 22, 104.3, 107.8); B[17].l = 104.2;
    clampRange(B, 23, 45, 104.6, null);
    clampRange(B, 29, 33, 112.3, 114.0); B[31].l = 112.2;
    clampRange(B, 34, 45, 112.6, null);
    var E = [[8, 100], [23, 108], [34, 114]], STOPS = [[8, 96], [23, 104], [34, 112]];
    var ST = [
      { at: 0, title: "The first entry: 1R", text: "A breakout of a range. The stop goes below the low of the range, and the distance to it is one risk unit, 1R: the most you're willing to lose on the trade." },
      { at: 4, title: "Price builds structure", text: "Price goes up, pulls back and starts to consolidate. That prior area becomes support, and support is where an add can come from, if the tape hands you one." },
      { at: 7.6, title: "The add is smaller: 0.5R", text: "The add is a fraction of the first size and never more than 1R. Say 0.5R. As you take it, you move the stop up to that prior support." },
      { at: 11.2, title: "Again: 0.25R, stop up again", text: "Every add from here on, the stop moves in your favor and the sizing goes down. The size grows to 1.75R of entries, but the risk falls the entire time." },
      { at: 14.8, title: "Biggest size, least risk", text: "By the third entry you can hold your biggest position of the trade and risk less than on the very first entry. If it fails, you stop out small, likely in profit. If it runs, your biggest size is on for the real move." }
    ];
    return {
      stages: ST, end: 19, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [3.6, 9], [7.4, 24], [11, 35], [14.6, 40], [18, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        s += grid(g);
        s += txt(g.x0, g.y0 - 14, n ? "Risk units (made-up bars)" : "Pyramiding in risk units · made-up bars, no prices", C.faint, 12, "start", 600);
        /* the range */
        var ro = fade(T, 0.2, 0.5);
        if (ro > 0) { s += rect(X(0) - bw, Y(100), X(7) - X(0) + 2 * bw, Y(96) - Y(100), C.blue, 3, 0.14 * ro); s += frameRect(X(0) - bw, Y(100), X(7) - X(0) + 2 * bw, Y(96) - Y(100), C.blue, 1.4, ro); }
        /* the stop, stepping up behind each add */
        var stepIdx = T >= 11.4 ? 2 : T >= 7.8 ? 1 : 0, so = fade(T, 0.6, 0.4), last = Math.min(N - 1, Math.ceil(cnt));
        if (so > 0) {
          var pts = [];
          for (var k = 0; k <= stepIdx; k++) {
            var xa = X(STOPS[k][0]) - bw, xb = k < stepIdx ? X(STOPS[k + 1][0]) - bw : X(last) + bw;
            if (k > 0) pts.push([xa, Y(STOPS[k - 1][1])]);
            pts.push([xa, Y(STOPS[k][1])]); pts.push([xb, Y(STOPS[k][1])]);
          }
          s += poly(pts, C.dn, 2, "6 4", so);
          var sv = STOPS[stepIdx][1];
          post += n ? tag(X(last), Y(sv) - 14, stepIdx === 0 ? "stop" : "stop, moved up", C.dn, so, "end") : tag(X(last) + bw + 4, Y(sv), stepIdx === 0 ? "stop" : "stop, moved up", C.dn, so, "start");
        }
        s += drawBars(B, X, Y, cnt, bw);
        /* consolidation boxes the adds come from */
        var c1 = win(T, 4.2, 8.4), c2 = win(T, 9.6, 12);
        if (c1 > 0) s += frameRect(X(15) - bw, Y(107.9), X(22) - X(15) + 2 * bw, Y(104.2) - Y(107.9), C.cyan, 1.6, c1);
        if (c2 > 0) s += frameRect(X(29) - bw, Y(114.1), X(33) - X(29) + 2 * bw, Y(112.2) - Y(114.1), C.cyan, 1.6, c2);
        if (c1 > 0) post += tag(X(18.5), Y(107.9) - 14, n ? "support builds" : "pullback · consolidation", C.cyan, c1, "middle");
        /* the entries */
        var LBL = ["1R", "+0.5R", "+0.25R"], AT = [0.4, 7.8, 11.4];
        E.forEach(function (e, k) {
          var o = fade(T, AT[k], 0.4);
          if (o <= 0) return;
          s += dot(X(e[0]), Y(e[1]), 6, C.up, o);
          post += tag(X(e[0]) - bw - 4, Y(e[1]) - 16, LBL[k], C.up, o, "end");
        });
        var rb = win(T, 0.6, 4);
        if (rb > 0) { s += line(X(8) + bw + 8, Y(100), X(8) + bw + 8, Y(96), C.ink, 2, null, rb); post += tag(X(8) + bw + 14, Y(98), "1R", C.ink, rb, "start"); }
        var wc1 = win(T, 8.4, 11.2), wc2 = fade(T, 12, 0.4) * (1 - 0.4 * fade(T, 14.8, 0.3));
        if (wc1 > 0) post += tag(X(30), Y(104) + 22 * FS, n ? "if hit: +0.5R" : "stop hit here: still +0.5R", C.up, wc1, "middle");
        if (wc2 > 0) post += tag(X(40), Y(112) + 22 * FS, n ? "if hit: +3.25R" : "stop hit here: still +3.25R", C.up, wc2, "middle");
        s += post;
        s += note2(g, ["First entry: 1R", "Stop under the range low.", "1R is the most you're", "willing to lose."], C.blue, win(T, 0.4, 4));
        s += note2(g, ["Let it build", "Up, pull back, consolidate.", "The prior area turns", "into support."], C.cyan, win(T, 4.2, 7.6));
        s += note2(g, ["Add 0.5R, stop up", "Entries on: 1R + 0.5R.", "Stop for all at support.", "If it's hit: +0.5R."], C.up, win(T, 7.8, 11.2));
        s += note2(g, ["Add 0.25R, stop up", "Entries on: 1.75R.", "The stop moves up again.", "If it's hit: +3.25R."], C.up, win(T, 11.4, 14.8));
        s += note2(g, ["Small loss or home run", "The most size, the least", "risk. Flat, small win,", "small loss, or home run."], C.gold, fade(T, 15, 0.4));
        return s + stamp(L, "Illustrative · made-up bars · R math on the entries shown");
      }
    };
  }

  /* =====================================================================
     2 · The model: a fashionably late trade, a 0.5R add near target, the stop to the old target
     ===================================================================== */
  function modelSpec() {
    var N = 56, lo = 44, hi = 96;
    var CL = [71, 69.5, 68.2, 66, 64.8, 62.4, 60.1, 58.3, 55.6, 53.1, 51.2,
              52.4, 53.6, 53.0, 55.1, 56.4, 57.8, 57.2, 59.4, 60.8, 62.0,
              63.6, 65.0, 64.4, 66.8, 68.3, 69.0, 70.6, 72.1, 73.2, 73.0,
              72.4, 73.6, 72.8, 73.9, 72.6, 73.4, 72.9, 73.8,
              76.0, 77.2, 78.8, 78.1, 80.4, 82.0, 81.3, 83.6, 85.2, 84.6, 86.9, 88.4, 87.8, 89.9, 91.2, 90.6, 92.4];
    var B = mkBars(CL, 72.4, 21, 0.9);
    B[10].l = 50; clampRange(B, 11, 55, 50.6, null);
    clampRange(B, 20, 55, 58.4, null);
    clampRange(B, 29, 38, 71.8, 74.4); B[34].h = 74.4;
    setBar(B, 39, 73.8, 76.4, 73.6, 76.0);
    clampRange(B, 40, 55, 74.4, null);
    var VW = [[0, 72.5], [10, 64], [20, 61.8], [30, 64.5], [40, 67.5], [55, 72]];
    var EM = [[0, 72], [10, 55], [15, 55.4], [20, 61.6], [24, 65], [30, 71], [38, 73.2], [45, 79], [55, 89]];
    var ST = [
      { at: 0, title: "A distinct low, then a grind", text: "Just a drawing of the structure, no ticker and no prices. Price comes down, puts in a distinct low and starts to grind higher, with VWAP and the 9 EMA on the chart." },
      { at: 3.6, title: "The first entry: 1R", text: "As the 9 EMA gets ready to cross VWAP and price rides above it, that's the initial entry. The stop isn't at the low: it's a third of the measured move from the cross down to the low of the day." },
      { at: 7, title: "Target: one measured move", text: "The other fashionably late rule: the target is one full measured move. With the stop a third of the way, that target is 3R." },
      { at: 10, title: "Near target, it balances", text: "Price gets almost to target and balances. Here's where most traders go wrong: they see the open profit, treat it like a cushion, and add big because it feels free." },
      { at: 13.4, title: "The add: 0.5R above the highs", text: "First ask: is the structure stronger here than at the entry? If yes, it's a new, independently valid setup at a better location. Enter above the highs with half a risk unit and move the entire stop up to where the initial target was." },
      { at: 17, title: "Worst case: still up 2.5R", text: "If it fails, you were up 3R and lose 0.5R on the add. You gave back a little, and it was still a valid decision. Risk another 3R on the add instead and a failure wipes out every bit of profit. That's what puts traders on tilt." },
      { at: 21, title: "If it trends, the add is on", text: "If it turns into the trending trade you thought it might be, the add rides with it, and you only ever risked a portion of the first trade to get it." }
    ];
    return {
      stages: ST, end: 25, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [3.4, 21], [6.8, 21], [9.8, 31], [13.2, 39], [13.6, 40], [20.8, 40], [24.4, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        var up = Math.ceil(cnt);
        s += grid(g);
        s += txt(g.x0, g.y0 - 14, n ? "Fashionably late · the model" : "Fashionably late trade · the model (made-up bars, no prices)", C.faint, 12, "start", 600);
        s += poly(linePts(N, X, Y, VW, up), C.gold, 2, null, 0.9);
        s += poly(linePts(N, X, Y, EM, up), C.cyan, 2, null, 0.9);
        if (up > 4) { post += tag(X(Math.min(up - 1, 5)), Y(track(VW, 5)) - 16, "VWAP", C.gold, 1, "middle"); post += tag(X(Math.min(up - 1, 13)), Y(track(EM, 13)) + 20, "9 EMA", C.cyan, 1, "middle"); }
        /* LOD and the measured move */
        var lo1 = fade(T, 0.6, 0.4);
        if (lo1 > 0) { s += line(X(10) - bw, Y(50), g.x1, Y(50), C.grey, 1.4, "5 4", lo1); post += tag(X(10), Y(50) + 18, "low of day", C.grey, lo1, "middle"); }
        var eo = fade(T, 3.8, 0.4);
        if (eo > 0) {
          s += line(X(20) - bw, Y(62), g.x1, Y(62), C.ink, 1.4, null, eo);
          s += line(X(20) - bw, Y(58), g.x1, Y(58), C.dn, 2, "6 4", eo * (1 - fade(T, 13.6, 0.4)));
          post += tag(X(24), Y(58) + 16, n ? "stop · 1/3" : "stop · a third of the measured move", C.dn, eo * (1 - fade(T, 13.6, 0.4)), "start");
          s += dot(X(20), Y(62), 6, C.up, eo);
          post += tag(X(20) - bw - 4, Y(62) - 16, n ? "entry 1R" : "entry · 1R", C.up, eo, "end");
          var mm = win(T, 3.8, 10);
          if (mm > 0) { s += line(X(19) - 14, Y(62), X(19) - 14, Y(50), C.grey, 2, null, mm); post += tag(X(19) - 20, Y(56), n ? "move" : "measured move", C.grey, mm, "end"); }
        }
        var to = fade(T, 7.2, 0.4);
        if (to > 0) {
          s += line(X(20) - bw, Y(74), g.x1, Y(74), T >= 13.6 ? C.dn : C.up, 2, T >= 13.6 ? "6 4" : null, to);
          post += tag(g.x1 - 4, T >= 13.6 ? Y(74) + 18 : Y(74) - 16, T >= 13.6 ? (n ? "stop, moved up" : "whole stop · moved up to the old target") : (n ? "target · 3R" : "target · one measured move = 3R"), T >= 13.6 ? C.dn : C.up, to, "end");
        }
        var bo = win(T, 10.2, 17);
        if (bo > 0) { s += frameRect(X(29) - bw, Y(74.6), X(38) - X(29) + 2 * bw, Y(71.6) - Y(74.6), C.orange, 1.6, bo); post += tag(X(33.5), Y(71.6) + 18, "balance", C.orange, win(T, 10.2, 13.4), "middle"); }
        var cu = win(T, 10.4, 13.4);
        if (cu > 0) post += tag(X(26), Y(80), n ? "“it feels free”" : "“I'm up 3R, it feels free”", C.orange, cu, "middle");
        s += drawBars(B, X, Y, cnt, bw);
        var ao = fade(T, 13.6, 0.4);
        if (ao > 0) { s += dot(X(39), Y(75), 6, C.up, ao); post += tag(X(39) - bw - 4, Y(79), n ? "add +0.5R" : "add · 0.5R above the highs", C.up, ao, "end"); }
        /* the failure path, and what it would cost */
        var fo = win(T, 17.2, 21);
        if (fo > 0) {
          s += poly([[X(39), Y(76)], [X(41), Y(75.4)], [X(43), Y(74)]], C.dn, 2.4, "5 4", fo);
          s += cross(X(43), Y(74), C.dn, fo);
          post += tag(X(37), Y(86), n ? "0.5R add: +2.5R" : "0.5R add, stopped: still +2.5R", C.up, fo, "end");
          post += tag(X(37), Y(86) - 26 * FS, n ? "3R add: +0R" : "3R add, stopped: +0R, all of it gone", C.dn, fo, "end");
        }
        s += post;
        s += note2(g, ["A distinct low", "Down, a distinct low, then", "a grind higher. VWAP and", "the 9 EMA on the chart."], C.grey, win(T, 0.4, 3.6));
        s += note2(g, ["Entry: 1R", "9 EMA crossing VWAP, price", "riding above. Stop: 1/3 of", "the cross-to-low move."], C.up, win(T, 3.8, 7));
        s += note2(g, ["Target: one measured move", "Stop at a third of the", "move, target the full", "move: 3R."], C.up, win(T, 7.2, 10));
        s += note2(g, ["The trap", "Up 3R, so it feels free.", "Open profit is not a", "cushion to bet with."], C.orange, win(T, 10.2, 13.4));
        s += note2(g, ["Add 0.5R, stop up", "Stronger structure here?", "Then half a risk unit,", "whole stop to the old target."], C.up, win(T, 13.6, 17));
        s += note2(g, ["Worst case: +2.5R", "Up 3R, lose 0.5R on the add.", "Add 3R instead and a", "failure wipes it all out."], C.dn, win(T, 17.2, 21));
        s += note2(g, ["If it trends", "The add rides the move,", "for a portion of the", "first trade's risk."], C.up, fade(T, 21.2, 0.4));
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     3 · AMD: opening range break long, the puppy dog, a 0.5R add, the whole stop to 489
     ===================================================================== */
  function amdSpec() {
    var N = 48, lo = 462, hi = 518;
    var CL = [474.5, 471.2, 476.8, 470.4, 475.6, 477.2, 481.5,
              482.6, 484.0, 483.2, 485.4, 487.0, 488.2, 488.6,
              487.0, 485.2, 484.6, 485.8,
              486.4, 488.8, 491.0, 492.4,
              491.0, 492.4, 490.6, 491.8, 490.2, 492.0, 492.6,
              496.4,
              497.8, 499.4, 498.6, 500.9, 502.6, 501.8, 504.0, 505.6, 504.9, 507.0, 508.4, 507.6, 509.8, 511.2, 510.4, 512.0, 513.1, 512.6];
    var B = mkBars(CL, 472, 31, 1.1);
    clampRange(B, 0, 5, 468, 478); B[1].l = 468; B[2].h = 478; B[3].l = 468.4;
    setBar(B, 6, 477.4, 482.2, 477.0, 481.5);
    clampRange(B, 7, 13, 478.6, 489.2); B[13].h = 489.2;
    clampRange(B, 14, 17, 484.0, 488.8); B[16].l = 484.0;
    clampRange(B, 18, 21, 484.4, 493.2);
    clampRange(B, 22, 28, 489.6, 493.0); B[24].l = 489.6;
    setBar(B, 29, 492.6, 497.0, 492.2, 496.4);
    clampRange(B, 30, 47, 490.4, null);
    var V = volume(N, 33, 0.22);
    [0.9, 0.75, 0.7, 0.62, 0.55, 0.5, 0.95].forEach(function (v, i) { V[i] = v; });
    for (var i = 22; i <= 28; i++) V[i] = 0.14 + (i % 3) * 0.03;
    V[29] = 1;
    var ST = [
      { at: 0, title: "One R = $1,000", text: "An opening range break long above 478 with the stop at 468: 10 points. Risking $1,000 with a $10 stop is 100 shares. That's one risk unit for the day." },
      { at: 3.6, title: "A lot of checks in favor", text: "The trade works, and the variables say this could be a trending day up. Add right here? Not really. Some people take a 9 EMA continuation, but he likes the structure to be built first." },
      { at: 7.2, title: "The puppy dog", text: "A pullback, then a small “puppy dog” consolidation above the highs of that pullback. Tight and quiet, on light volume. Now there's a structure to stand on." },
      { at: 10.6, title: "Break on volume: add 0.5R", text: "It breaks on increased volume. Add around 493, stop 489 under the consolidation low: 4 points. Not a full $1,000 risk unit, half: $500 of risk is 125 shares." },
      { at: 14, title: "The whole stop to 489", text: "Now 225 shares, all with the stop at 489. Lose those 4 points from 493 and that's $900, which stings. But you started at 478, so a stop at 489 still leaves the trade up money." },
      { at: 17.6, title: "If it works, you're up a lot", text: "No random size increases, no adding without a plan. Half-sizing all the way up lets you keep adding while protecting against giving back too much open P&L, and protecting your mindset." }
    ];
    return {
      stages: ST, end: 22, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L, { vol: true }), s = "", post = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [3.4, 7], [7, 18], [10.4, 29], [11, 30], [17.4, 30], [21.4, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        var last = Math.min(N - 1, Math.ceil(cnt));
        s += axis(g, lo, hi, 10, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "AMD · 5-min (made up)" : "AMD · 5-minute bars (made up, prices from the video)", C.faint, 12, "start", 600);
        s += volBars(V, X, g, cnt, bw, T >= 10.6 ? [29] : []);
        var ro = fade(T, 0.2, 0.4);
        if (ro > 0) { s += rect(X(0) - bw, Y(478), X(5) - X(0) + 2 * bw, Y(468) - Y(478), C.blue, 3, 0.14 * ro); post += tag(X(0) - bw, Y(478) - 14, n ? "range" : "opening range", C.blue, ro * (1 - fade(T, 0.6, 0.3)), "start"); }
        var eo = fade(T, 0.6, 0.4), moved = fade(T, 14.2, 0.4);
        if (eo > 0) {
          s += line(X(6) - bw, Y(478), X(last) + bw, Y(478), C.ink, 1.4, null, eo);
          s += line(X(6) - bw, Y(468), X(last) + bw, Y(468), C.dn, 2, "6 4", eo * (1 - moved));
          post += tag(X(6) + bw + 6, Y(468) + 16, n ? "stop 468" : "stop 468 · 10 pts", C.dn, eo * (1 - moved), "start");
          s += dot(X(6), Y(478), 6, C.up, eo);
          post += tag(X(0) - bw, Y(478) - 14, n ? "long 478 · 100 sh" : "long 478 · 100 sh · 1R", C.up, eo, "start");
        }
        var nah = win(T, 3.8, 7.2);
        if (nah > 0) post += tag(X(11), Y(495), n ? "add here? not yet" : "add here? not really", C.grey, nah, "middle");
        var pd = fade(T, 7.4, 0.4) * (1 - 0.6 * fade(T, 14, 0.4));
        if (pd > 0) {
          s += line(X(13) - bw, Y(489.2), X(28) + bw, Y(489.2), C.grey, 1.2, "4 4", pd);
          s += frameRect(X(22) - bw, Y(493.2), X(28) - X(22) + 2 * bw, Y(489.4) - Y(493.2), C.cyan, 1.8, pd);
          post += tag(X(25), Y(493.2) - 14, n ? "puppy dog" : "puppy dog consolidation", C.cyan, pd, "middle");
        }
        s += drawBars(B, X, Y, cnt, bw);
        var ao = fade(T, 10.8, 0.4);
        if (ao > 0) {
          s += line(X(29) - bw, Y(493), X(last) + bw, Y(493), C.ink, 1.2, "3 3", ao * (1 - 0.5 * moved));
          s += line(X(22) - bw, Y(489), X(last) + bw, Y(489), C.dn, 2, "6 4", ao);
          s += dot(X(29), Y(493), 6, C.up, ao);
          post += tag(X(29) - bw - 4, Y(500), n ? "+125 sh · 0.5R" : "add 493 · 125 sh · 0.5R", C.up, ao, "end");
          post += tag(X(29) + bw + 6, Y(489) + 16, moved > 0 ? (n ? "all stops 489" : "stop 489 · all 225 sh") : "stop 489 · 4 pts", C.dn, ao, "start");
        }
        var bk = win(T, 14.2, 17.6);
        if (bk > 0) {
          s += line(X(36), Y(478), X(36), Y(489), C.up, 3, null, bk);
          post += tag(X(36) + 8, Y(483.5), n ? "still above 478" : "489 is still 11 pts above the 478 entry", C.up, bk, "start");
        }
        s += post;
        s += note2(g, ["1R = $1,000", "Long over 478, stop 468.", "$10 stop: 100 shares.", "That's one risk unit."], C.blue, win(T, 0.4, 3.6), g.n ? null : g.y0);
        s += note2(g, ["Checks in favor", "Could be a trend day. Add", "now? Not really. Let the", "structure build first."], C.grey, win(T, 3.8, 7.2));
        s += note2(g, ["The puppy dog", "Pullback, then a tight", "consolidation above its", "highs, on light volume."], C.cyan, win(T, 7.4, 10.6));
        s += note2(g, ["Break on volume: 0.5R", "Add 493, stop 489: 4 pts.", "$500 of risk, not $1,000:", "125 shares."], C.up, win(T, 10.8, 14));
        s += note2(g, ["Stop all 225 to 489", "Lose 4 pts from 493: −$900.", "But 489 is above the 478", "entry: still up money."], C.dn, win(T, 14.2, 17.6));
        s += note2(g, ["If it works", "You're up a lot. Half-size", "every add and you can keep", "adding without the giveback."], C.up, fade(T, 17.8, 0.4));
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     4 · CBRS: opening range break short under the IPO price, a 0.5R add against VWAP
     ===================================================================== */
  function cbrsSpec() {
    var N = 50, lo = 142, hi = 162;
    var CL = [156.4, 157.0, 156.0, 157.2, 156.2, 156.6, 154.2,
              153.4, 152.0, 152.6, 151.0, 149.6, 150.2, 148.8, 147.6, 148.2, 147.2,
              148.6, 149.8, 149.2, 150.6, 151.4, 152.2, 152.6, 152.4,
              150.8];
    var tail = noisy(24, [[0, 150.2], [3, 149.0], [9, 146.4], [16, 145.2], [23, 144.2]], 0.45, 47);
    CL = CL.concat(tail);
    var B = mkBars(CL, 157.4, 41, 0.35);
    clampRange(B, 0, 5, 155.6, 157.4); B[1].h = 157.4; B[2].l = 155.6;
    setBar(B, 6, 156.6, 156.8, 153.9, 154.2);
    B[16].l = 146.8;
    clampRange(B, 17, 24, 147.2, 153.1); B[23].h = 153.1;
    setBar(B, 25, 152.4, 153.0, 150.6, 150.8);
    clampRange(B, 26, 49, null, 151.4);
    var VW = [[0, 157.0], [6, 156.4], [16, 153.9], [24, 153.4], [35, 152.4], [49, 151.4]];
    var ST = [
      { at: 0, title: "Under the IPO price", text: "CBRS broke 160, its IPO price, and the opening range broke below that level. Short 155.50, stop 157.50: 2 points. At $1,000 a risk unit, that's 500 shares." },
      { at: 3.6, title: "A higher-timeframe breakdown", text: "A great move. This looks like a higher-timeframe breakdown, and it might trade into the low of the day." },
      { at: 6.8, title: "The pop and the curl", text: "A pop, then a curl back up toward VWAP. If there's a clear and distinct turn, look for a VWAP continuation style trade." },
      { at: 10.2, title: "Add 0.5R against VWAP", text: "Short 151.50, stop 153.50 against VWAP. You don't have to risk all the way to the highs. It's an add, so 0.5R: $500 on 2 points is 250 shares. Worst case, you get stopped out." },
      { at: 13.8, title: "Stay with it", text: "A low-of-day style close. There was only one chance to add on this one, but you could keep going: 0.25R, then down to 0.1R as the lowest tier." }
    ];
    return {
      stages: ST, end: 18, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [3.4, 7], [6.6, 17], [10, 25], [10.4, 26], [13.6, 26], [17.4, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        var up = Math.ceil(cnt), last = Math.min(N - 1, up);
        s += axis(g, lo, hi, 2, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "CBRS · 5-min (made up)" : "CBRS · 5-minute bars (made up, prices from the video)", C.faint, 12, "start", 600);
        s += line(g.x0, Y(160), g.x1, Y(160), C.grey, 1.6, "5 4");
        post += tag(g.x1 - 4, Y(160) - 14, n ? "IPO price 160" : "IPO price 160 · broken", C.grey, 1, "end");
        s += poly(linePts(N, X, Y, VW, up), C.gold, 2, null, 0.9);
        if (up > 10) post += tag(X(10), Y(track(VW, 10)) - 16, "VWAP", C.gold, 1, "middle");
        var ro = fade(T, 0.2, 0.4);
        if (ro > 0) s += rect(X(0) - bw, Y(157.5), X(5) - X(0) + 2 * bw, Y(155.5) - Y(157.5), C.blue, 3, 0.14 * ro);
        var eo = fade(T, 0.6, 0.4);
        if (eo > 0) {
          s += line(X(6) - bw, Y(155.5), X(last) + bw, Y(155.5), C.ink, 1.4, null, eo);
          s += line(X(6) - bw, Y(157.5), X(last) + bw, Y(157.5), C.dn, 2, "6 4", eo);
          s += dot(X(6), Y(155.5), 6, C.dn, eo);
          post += tag(X(6) + bw + 6, Y(155.5) + 16, n ? "short 155.50 · 500 sh" : "short 155.50 · 500 sh · 1R", C.dn, eo, "start");
          post += tag(X(6) + bw + 6, Y(157.5) - 14, n ? "stop 157.50" : "stop 157.50 · 2 pts", C.dn, eo, "start");
        }
        var cu = win(T, 7, 13.8);
        if (cu > 0) s += frameRect(X(17) - bw, Y(153.4), X(24) - X(17) + 2 * bw, Y(147.0) - Y(153.4), C.orange, 1.6, cu * 0.9);
        if (cu > 0) post += tag(X(20.5), Y(147.0) + 18, n ? "pop · curl" : "the pop and the curl", C.orange, cu, "middle");
        s += drawBars(B, X, Y, cnt, bw);
        var ao = fade(T, 10.4, 0.4);
        if (ao > 0) {
          s += line(X(25) - bw, Y(153.5), X(last) + bw, Y(153.5), C.dn, 2, "6 4", ao);
          s += dot(X(25), Y(151.5), 6, C.dn, ao);
          post += tag(X(25) + bw + 6, Y(151.5) + 16, n ? "add 151.50 · 250 sh" : "add 151.50 · 250 sh · 0.5R", C.dn, ao, "start");
          post += tag(X(25) + bw + 6, Y(153.5) - 14, n ? "stop 153.50" : "stop 153.50 · against VWAP", C.dn, ao, "start");
        }
        var tiers = fade(T, 14, 0.4);
        if (tiers > 0) post += tag(X(38), Y(147.6), n ? "next: 0.25R → 0.1R" : "could keep going: 0.25R, then 0.1R", C.cyan, tiers, "middle");
        s += post;
        s += note2(g, ["Short 155.50, 500 sh", "Opening range break under", "the 160 IPO price. Stop", "157.50: 2 pts = 1R."], C.dn, win(T, 0.4, 3.6));
        s += note2(g, ["Higher-timeframe breakdown", "A great move. It might", "trade into the low of", "the day."], C.dn, win(T, 3.8, 6.8));
        s += note2(g, ["The pop and the curl", "Back up toward VWAP.", "Wait for a clear,", "distinct turn."], C.orange, win(T, 7, 10.2));
        s += note2(g, ["Add 0.5R: 250 sh", "Short 151.50, stop 153.50", "against VWAP. $500 of", "risk, not $1,000."], C.dn, win(T, 10.4, 13.8));
        s += note2(g, ["Stay with it", "Low-of-day style close.", "More adds would step down:", "0.25R, then 0.1R."], C.cyan, fade(T, 14, 0.4));
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     5 · Volume alone isn't an add: no level, no structure, no stop of its own
     ===================================================================== */
  function volumeSpec() {
    var N = 44, lo = 44, hi = 78;
    var CL = [50.2, 51.0, 50.6, 51.8, 52.6, 52.2, 53.4, 54.6, 54.1, 55.6, 56.8, 56.4, 58.2,
              61.2,
              60.4, 59.6, 59.9, 58.8, 58.2, 57.4,
              58.0, 57.6, 58.6, 58.2, 59.0, 58.4, 59.2,
              61.0, 62.2, 61.6, 63.4, 64.6, 64.0, 65.8, 67.0, 66.4, 68.2, 69.4, 68.8, 70.6, 71.8, 71.2, 72.8, 73.6];
    var B = mkBars(CL, 49.6, 51, 0.5);
    setBar(B, 13, 58.2, 61.8, 58.0, 61.2);
    clampRange(B, 20, 26, 57.0, 59.6);
    var V = volume(N, 53, 0.25); V[13] = 1; V[27] = 0.72;
    var ST = [
      { at: 0, title: "A winner, working", text: "A long that's working: higher highs, higher lows, structure under it." },
      { at: 3.4, title: "A volume spike", text: "Volume jumps in the middle of the move and it's tempting to add right there. But the add has no technical location of its own: no level, no structure, no stop." },
      { at: 6.8, title: "Against the add, out of the trade", text: "Price moves against the add, and the whole position gets closed. The add didn't just lose. It took the original trade with it." },
      { at: 10.2, title: "The re-entry that works", text: "Later a real structure builds and a re-entry does work. But you've already taken yourself out." },
      { at: 13.4, title: "Structure, not volume", text: "Volume isn't a reason to add. The structure is what you can stand on. An add with no level, no structure and no stop of its own isn't a second trade. It's adding risk on hope." }
    ];
    return {
      stages: ST, end: 17, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L, { vol: true }), s = "", post = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [3.2, 13], [3.6, 14], [6.6, 14], [9.8, 20], [13.2, 34], [16.6, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        s += grid(g, 5);
        s += txt(g.x0, g.y0 - 14, n ? "An add on volume alone" : "An add on volume alone (made-up bars, no prices)", C.faint, 12, "start", 600);
        s += volBars(V, X, g, cnt, bw, T >= 3.6 ? [13] : []);
        var eo = fade(T, 0.4, 0.4);
        if (eo > 0) { s += dot(X(1), Y(51), 6, C.up, eo * (1 - 0.5 * fade(T, 10.2, 0.4))); post += tag(X(1) - bw - 2, Y(51) + 20, "long", C.up, eo * (1 - 0.5 * fade(T, 10.2, 0.4)), "start"); }
        s += drawBars(B, X, Y, cnt, bw);
        var ao = fade(T, 3.8, 0.4);
        if (ao > 0) {
          s += dot(X(13), Y(61.2), 6, C.orange, ao);
          post += tag(X(13) - bw - 4, Y(63.6), n ? "add on volume" : "add on the volume spike", C.orange, ao * (1 - 0.5 * fade(T, 10.2, 0.4)), "end");
          var nq = win(T, 4.2, 6.8);
          if (nq > 0) post += tag(X(13) + bw + 6, Y(56), n ? "no level · no stop" : "no level · no structure · no stop", C.grey, nq, "start");
        }
        var xo = fade(T, 7.6, 0.4);
        if (xo > 0) {
          s += cross(X(19), Y(57.4), C.dn, xo);
          post += tag(X(19) + bw + 6, Y(54.6), n ? "whole position out" : "the whole position gets closed", C.dn, xo * (1 - 0.4 * fade(T, 13.4, 0.4)), "start");
        }
        var bo = win(T, 10.4, 13.4);
        if (bo > 0) s += frameRect(X(20) - bw, Y(59.8), X(26) - X(20) + 2 * bw, Y(56.8) - Y(59.8), C.cyan, 1.6, bo);
        var re = fade(T, 10.8, 0.4);
        if (re > 0) { s += dot(X(27), Y(61), 6, C.cyan, re); post += tag(X(27) - bw - 4, Y(64), n ? "re-entry" : "re-entry works", C.cyan, re, "end"); }
        var gone = fade(T, 12.4, 0.4);
        if (gone > 0) post += tag(X(36), Y(74.6), n ? "you're already out" : "but you'd already taken yourself out", C.grey, gone, "middle");
        s += post;
        s += note2(g, ["A winner, working", "Higher highs, higher", "lows. Structure under", "the trade."], C.up, win(T, 0.4, 3.4));
        s += note2(g, ["Add on the spike?", "Volume, but no location:", "no level, no structure,", "no stop of its own."], C.orange, win(T, 3.6, 6.8));
        s += note2(g, ["It takes the trade with it", "Price moves against the", "add and the whole", "position gets closed."], C.dn, win(T, 7, 10.2));
        s += note2(g, ["The re-entry works", "A real structure builds.", "But you've already", "taken yourself out."], C.cyan, win(T, 10.4, 13.4));
        s += note2(g, ["Structure, not volume", "No level, no structure,", "no stop of its own: it's", "risk added on hope."], C.grey, fade(T, 13.6, 0.4));
        return s + stamp(L);
      }
    };
  }

  var SPECS = { ladder: ladderSpec, model: modelSpec, amd: amdSpec, cbrs: cbrsSpec, volume: volumeSpec };
  document.querySelectorAll("[data-pyr-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-pyr-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     The pyramid, step by step, as a click-through stepper.
     Without the script the five show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-pyr-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "Entry", c: C.blue,   tag: "The first entry is a full 1R" },
      { k: "Wait",  c: C.cyan,   tag: "The tape hands you the add, or it doesn't" },
      { k: "Ask",   c: C.orange, tag: "Two questions, out loud" },
      { k: "Add",   c: C.up,     tag: "Smaller than the one before" },
      { k: "Stop",  c: C.dn,     tag: "Stop up, total risk checked" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Pyramiding, step by step");
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
      var top = 30, bot = H - 50, mid = (top + bot) / 2;
      if (k === 0) {
        var rt = mid + 10, rb = mid + 50;
        s += r(40, rt, 200, rb - rt, C.blue, 0.2);
        s += pl([[50, mid + 30], [90, rt + 6], [130, rb - 6], [170, rt + 4], [210, rb - 8], [250, rt - 4], [330, top + 40], [400, top + 20]], C.ink, 2.2);
        s += dt(250, rt, C.up) + t(256, rt + 22, "entry", C.up, 12.5, "start", 700);
        s += ln(250, rb + 6, 420, rb + 6, C.dn, 2, "6 4") + t(426, rb + 10, "stop", C.dn, 12.5, "start", 700);
        s += ln(460, rt, 460, rb + 6, C.ink, 2) + t(468, (rt + rb) / 2 + 6, "1R", C.ink, 14, "start", 700);
        s += t(30, bot + 30, "A full risk unit to the low of the range.", C.dim, 12.5, "start", 500);
      } else if (k === 1) {
        s += pl([[40, bot - 20], [140, top + 60], [190, top + 110], [220, top + 92], [250, top + 106], [280, top + 94], [310, top + 104]], C.ink, 2.2);
        s += r(185, top + 84, 135, 30, C.cyan, 0.2);
        s += t(252, top + 74, "structure builds", C.cyan, 12.5, "middle", 700);
        s += pl([[310, top + 104], [400, bot - 40], [440, bot - 10]], C.faint, 2, "5 4");
        s += t(440, bot + 4, "or it doesn't", C.faint, 12.5, "middle", 700);
        s += pl([[310, top + 104], [380, top + 40], [460, top + 10]], C.up, 2.4);
        s += t(30, bot + 30, "Don't hunt for the add. The tape hands it to you.", C.dim, 12.5, "start", 500);
      } else if (k === 2) {
        var rows = [["1", "Is the idea still valid, and playing", "out better than expected?"], ["2", "Would I take this on its own?", "What's my total risk now?"]];
        rows.forEach(function (q, i) {
          var y = top + 10 + i * (narrow ? 150 : 108);
          s += r(30, y, 500, narrow ? 126 : 90, C.box, 1, 14);
          s += '<circle cx="66" cy="' + (y + (narrow ? 63 : 45)) + '" r="' + (18 * F).toFixed(1) + '" fill="' + C.orange + '"/>' + t(66, y + (narrow ? 63 : 45) + 6 * F, q[0], "#000", 15, "middle", 800);
          s += t(102, y + (narrow ? 52 : 38), q[1], C.ink, 13.5, "start", 600) + t(102, y + (narrow ? 82 : 60), q[2], C.ink, 13.5, "start", 600);
        });
        s += t(30, bot + 30, "No number for the total risk? Don't add.", C.dim, 12.5, "start", 500);
      } else if (k === 3) {
        var tiers = [["1R", 1, C.blue], ["0.5R", 0.5, C.up], ["0.25R", 0.25, C.up], ["0.1R", 0.1, C.up]];
        var bh = narrow ? 52 : 36, gap = narrow ? 30 : 18;
        tiers.forEach(function (q, i) {
          var y = top + 6 + i * (bh + gap);
          s += r(110, y, 400 * q[1], bh, q[2], i === 0 ? 0.9 : 0.75, 6);
          s += t(96, y + bh / 2 + 5, q[0], q[2], 14, "end", 700);
          s += t(110 + 400 * q[1] + 10, y + bh / 2 + 5, ["first entry", "first add", "next add", "the lowest tier"][i], C.dim, 12, "start", 500);
        });
        s += t(30, bot + 30, "Every add smaller than the one before.", C.dim, 12.5, "start", 500);
      } else {
        var path = [[40, bot - 10], [110, bot - 60], [140, bot - 44], [210, bot - 120], [240, bot - 104], [320, bot - 180], [350, bot - 164], [460, top + 6]];
        s += pl(path, C.ink, 2.2);
        s += pl([[110, bot - 6], [210, bot - 6], [210, bot - 54], [320, bot - 54], [320, bot - 114], [470, bot - 114]], C.dn, 2.2, "6 4");
        [[110, bot - 60], [210, bot - 120], [320, bot - 180]].forEach(function (p, i) { s += dt(p[0], p[1], C.up) + t(p[0] - 10, p[1] - 12, ["1R", "+0.5R", "+0.25R"][i], C.up, 12.5, "end", 700); });
        s += t(470, bot - 122, "stop", C.dn, 12.5, "end", 700);
        s += t(30, bot + 30, "The size grows. The risk falls.", C.dim, 12.5, "start", 500);
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
