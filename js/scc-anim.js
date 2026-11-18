/* =====================================================================
   scc-anim.js — the animated walkthroughs on seven-cheat-codes.html
   (Scarface Trades, "Trading is a Video Game, Here are the Cheat Codes").

     [data-scc-anim="edge"]       the three scalping setups: pre-market low
                                  break and retest, the one candle rule, and
                                  the 5-minute opening range retest
     [data-scc-anim="structure"]  uptrend, downtrend, range
     [data-scc-anim="mtf"]        a bearish daily, then the 1-minute entry off
                                  the last up-close candles ($670 for $2,070)
     [data-scc-anim="fast"]       a loser cut in 5 minutes, a winner that
                                  works in minutes
     [data-scc-anim="days"]       the choppy day vs the trend day
     [data-scc-quiz]              "which trade is higher probability?"
     [data-scc-steps]             a trading day with all seven, as a stepper
     [data-scc-calc]              same trade, any size

   Every bar and price is made up. The dollar results quoted from the video
   are his. Same player as lrad-anim.js: each chart redraws in a narrow
   layout on a phone instead of scrolling sideways, with the callouts in a
   band on top.
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

  /* =====================================================================
     1 · Cheat code one: a proven edge. The three scalping setups.
     ===================================================================== */
  function edgeSpec() {
    /* A: the pre-market low, the break, the retest from below, the short */
    function sceneA() {
      var d = bars(40, [[0, 101.0], [3, 101.6], [5, 101.85], [8, 100.6], [10, 100.15], [13, 100.9], [14, 100.8], [16, 100.45], [18, 100.2],
        [19, 99.45], [21, 98.95], [22, 99.05], [24, 99.6], [25, 99.8], [26, 99.58], [28, 99.1], [31, 98.6], [34, 98.1], [36, 97.95], [39, 98.15]], 0.06, 11, 0.12,
        { 18: 100.2, 19: 99.45, 25: 99.8, 26: 99.58, 36: 97.92 });
      var B = d.B;
      clampRange(B, 0, 13, 100.0, 102.0); B[5].h = 102.0; B[10].l = 100.0;
      clampRange(B, 14, 18, 100.08, null);
      B[19].h = Math.max(B[19].o, 100.28); B[19].l = 99.32;
      clampRange(B, 20, 25, null, 99.94); B[26].h = 99.96;
      clampRange(B, 27, 39, 97.9, 99.62);
      tidy(B);
      return {
        N: 40, lo: 97.5, hi: 102.4, step: 0.5, dp: 2, B: B,
        title: "Setup 1 · pre-market high and low, break and retest · made-up 1-minute bars", short: "Setup 1 · pre-market low, break and retest",
        cnt: [[0, 0], [2.6, 14], [3.2, 14], [5.6, 22], [6.4, 22], [7.6, 27], [10, 40]],
        under: function (t, c) {
          var o = fade(t, 0.2, 0.5);
          return rect(c.X(0) - c.bw, c.g.y0, c.X(13) - c.X(0) + 2 * c.bw, c.g.y1 - c.g.y0, C.blue, 4, 0.07 * o) +
            txt((c.X(0) + c.X(13)) / 2, c.g.y1 - 10, "pre-market 4:00–9:30", C.blue, 11, "middle", 600, o) +
            line(c.X(13.5), c.g.y0, c.X(13.5), c.g.y1, C.faint, 1, "3 4", o) + txt(c.X(14), c.g.y1 - 10, "9:30 open", C.faint, 11, "start", null, o);
        },
        draw: function (t, c) {
          var s = "", lo = fade(t, 1.2, 0.5);
          s += hl(c, 102.0, 0, C.dim, "pre-market high 102.00", lo, "5 5", 1.4);
          s += hl(c, 100.0, 0, C.gold, t < 6.4 ? "pre-market low 100.00" : "support turned resistance", lo, null, 2);
          var bo = win(t, 3.6, 6.4);
          if (bo > 0) s += cross(c.X(19), c.Y(99.2), C.dn, bo) + pill(c.X(19) + 14, c.Y(99.0) + 6, c.n ? "don't chase" : "don't chase the break", C.dn, bo, "start");
          var eo = fade(t, 7.3, 0.4);
          if (eo > 0) {
            s += boxAround(c, 26, B[26], C.gold, eo);
            s += riskBox(c.X(26), c.g.x1, c.Y, 99.58, 100.02, 98.0, eo * 0.9);
            s += ent(c, 26, 99.58, C.dn, "short 99.58", eo, true);
            s += tag(c.g.x1 - 2, c.Y(100.02) - 12, "stop 100.02", C.dn, eo * win(t, 7.3, 8.8), "end");
          }
          var lod = fade(t, 9.4, 0.4);
          if (lod > 0) s += pill(c.X(36), c.Y(97.92) + 30, "low-of-day move", C.up, lod, "middle");
          s += nt(c, ["Mark the range", "High and low from 4:00 to 9:30", "Eastern, then wait for a break."], C.blue, win(t, 0.2, 3.2));
          s += nt(c, ["Don't chase the break", "This is where traders get", "faked out. Wait for the retest."], C.dn, win(t, 3.4, 6.4));
          s += nt(c, ["Short the retest", "Old support is now resistance.", "Weak candle there: short, stop", "above it, look for the low of day."], C.gold, fade(t, 6.6, 0.4));
          return s;
        }
      };
    }
    /* B: the one candle rule in an uptrend */
    function sceneB() {
      var d = bars(36, [[0, 48.7], [3, 49.4], [5, 49.05], [8, 49.9], [10, 50.55], [12, 50.75], [13, 50.3], [15, 50.9], [17, 51.4], [19, 51.75],
        [21, 51.2], [22, 50.75], [23, 50.5], [24, 50.9], [26, 51.3], [29, 51.8], [32, 52.25], [35, 52.45]], 0.05, 21, 0.1,
        { 4: 49.45, 5: 49.1, 12: 50.75, 13: 50.3, 22: 50.75, 23: 50.5, 24: 50.9 });
      var B = d.B;
      B[13].h = 50.8; B[13].l = 50.2;
      clampRange(B, 14, 39, 50.33, 52.55); B[23].l = 50.36; B[24].l = 50.4; B[24].h = 50.96;
      clampRange(B, 25, 35, 50.75, null);
      tidy(B);
      return {
        N: 36, lo: 48.2, hi: 52.8, step: 0.5, dp: 2, B: B,
        title: "Setup 2 · the one candle rule · made-up 1-minute bars", short: "Setup 2 · the one candle rule",
        cnt: [[0, 0], [3, 17], [4.4, 20], [6.4, 25], [9, 36]],
        draw: function (t, c) {
          var s = "", mo = fade(t, 1.6, 0.4);
          s += boxAround(c, 13, B[13], C.gold, mo);
          s += band(c.X(13) - c.bw, c.g.x1, c.Y, 50.75, 50.3, C.gold, mo * 0.8, 0.1);
          if (mo > 0) s += tag(c.X(13), c.Y(50.2) + 18, "last down-close candle", C.gold, mo, "middle");
          var eo = fade(t, 6.2, 0.4);
          if (eo > 0) {
            s += riskBox(c.X(24), c.g.x1, c.Y, 50.9, 50.15, 52.4, eo * 0.9);
            s += ent(c, 24, 50.9, C.up, "long 50.90", eo, false);
            s += hl(c, 52.4, 24, C.up, "2R · 52.40", eo, "5 4", 1.4);
            s += tag(c.g.x1 - 2, c.Y(50.15) + 14, "stop under the candle 50.15", C.dn, eo * win(t, 6.2, 8), "end");
          }
          s += nt(c, ["One candle rule", "In an uptrend, down-close candles", "should support price. Mark the", "last (highest) one."], C.gold, win(t, 0.3, 4.4));
          s += nt(c, ["The retest holds", "Price comes back into that candle", "and buyers step in. Long, looking", "for 2R or the high of day."], C.up, fade(t, 4.6, 0.4));
          return s;
        }
      };
    }
    /* C: the 5-minute opening range, break and retest */
    function sceneC() {
      var d = bars(34, [[0, 74.6], [1, 74.3], [2, 74.8], [3, 74.5], [4, 74.7], [6, 74.5], [8, 74.8], [9, 75.35], [11, 75.6], [13, 75.2], [14, 75.1],
        [15, 75.42], [18, 75.7], [22, 76.0], [26, 76.25], [30, 76.4], [33, 76.35]], 0.04, 31, 0.08,
        { 8: 74.8, 9: 75.35, 14: 75.1, 15: 75.42 });
      var B = d.B;
      clampRange(B, 0, 4, 74.2, 75.0); B[1].l = 74.2; B[2].h = 75.0;
      clampRange(B, 5, 8, 74.3, 74.95);
      clampRange(B, 10, 33, 75.03, null); B[14].l = 75.03;
      tidy(B);
      return {
        N: 34, lo: 73.8, hi: 76.8, step: 0.5, dp: 2, B: B,
        title: "Setup 3 · the 5-minute opening range · made-up 1-minute bars", short: "Setup 3 · 5-minute opening range",
        cnt: [[0, 0], [2, 5], [2.8, 5], [4.6, 12], [5, 12], [6.2, 16], [9, 34]],
        under: function (t, c) {
          var o = fade(t, 1.6, 0.4);
          return rect(c.X(0) - c.bw, c.Y(75.0), c.X(4) - c.X(0) + 2 * c.bw, c.Y(74.2) - c.Y(75.0), C.blue, 3, 0.16 * o) +
            txt((c.X(0) + c.X(4)) / 2, c.Y(74.2) + 20, "1 2 3 4 5", C.blue, 11, "middle", 600, o);
        },
        draw: function (t, c) {
          var s = "", o = fade(t, 1.8, 0.4);
          s += hl(c, 75.0, 0, C.blue, "5-minute high 75.00", o, null, 2);
          s += hl(c, 74.2, 0, C.dim, "5-minute low 74.20", o, "5 5", 1.4);
          var ro = win(t, 5.4, 9);
          if (ro > 0) s += dot(c.X(14), c.Y(75.03), 13, C.gold, ro, true);
          var eo = fade(t, 6, 0.4);
          if (eo > 0) {
            s += riskBox(c.X(15), c.g.x1, c.Y, 75.42, 74.95, 76.4, eo * 0.9);
            s += ent(c, 15, 75.42, C.up, "long 75.42", eo, false);
          }
          s += nt(c, ["Opening range", "Mark the high and low of the", "first 5 minutes after the open."], C.blue, win(t, 0.3, 2.8));
          s += nt(c, ["Break, then retest", "Price breaks above. Wait for it", "to come back to the level."], C.gold, win(t, 3, 5.4));
          s += nt(c, ["Strong price action at the level", "Enter for the continuation in", "the trend. Keep it simple."], C.up, fade(t, 5.6, 0.4));
          return s;
        }
      };
    }
    var ST = [
      { at: 0, title: "Pre-market high and low", text: "From 4:00 to 9:30 a.m. Eastern, mark the high and the low of the pre-market session. Then wait for the stock to break one of them." },
      { at: 3.2, title: "Don't chase the break", text: "It breaks below the pre-market low. You don't sell the breakout. That's where a lot of traders get faked out." },
      { at: 6.4, title: "Short the retest", text: "Price pulls back into the level: support turned resistance. A weak candle there is the low-risk, high-reward entry, looking for a clear low-of-day move." },
      { at: 10.4, title: "The one candle rule", text: "In an uptrend, down-close candles should support price. Mark the last down-close candle, the highest one, and wait for price to come back to it." },
      { at: 14.8, title: "The candle holds", text: "Price comes back, holds that exact candle, and buyers step in. Long, with the stop under the candle, looking for 2R or a high-of-day move." },
      { at: 20, title: "The 5-minute opening range", text: "Count the first five minutes after the open: 1, 2, 3, 4, 5. Mark the high and the low of that range." },
      { at: 22.8, title: "Break, then retest", text: "Price breaks above the 5-minute high. Again, wait for it to come back and test the level." },
      { at: 25.4, title: "Enter on strong price action", text: "Strong price action at the retest is the entry, looking for the trend to continue. Three setups, and none of them is complicated." }
    ];
    return { stages: ST, end: 29.5, size: sizeStd, frame: scenes([{ t0: 0, make: sceneA }, { t0: 10.4, make: sceneB }, { t0: 20, make: sceneC }]) };
  }

  /* =====================================================================
     2 · Cheat code two: market structure. Three ways the market moves.
     ===================================================================== */
  function partial(pts, p) {
    var n = pts.length - 1, f = clamp01(p) * n, k = Math.floor(f), out = pts.slice(0, k + 1);
    if (k < n) out.push([lerp(pts[k][0], pts[k + 1][0], f - k), lerp(pts[k][1], pts[k + 1][1], f - k)]);
    return out;
  }
  function structureSpec() {
    var Z = [
      { name: "Uptrend", col: C.up, at: 0, pts: [[0, .12], [.16, .5], [.28, .3], [.46, .7], [.58, .5], [.78, .9], [.9, .72], [1, .86]],
        marks: [[2, "HL"], [4, "HL"], [6, "HL"]], below: true, verdict: "Trade it: longs" },
      { name: "Downtrend", col: C.dn, at: 3.5, pts: [[0, .88], [.16, .5], [.28, .7], [.46, .3], [.58, .5], [.78, .1], [.9, .28], [1, .14]],
        marks: [[2, "LH"], [4, "LH"], [6, "LH"]], below: false, verdict: "Trade it: shorts" },
      { name: "Range", col: C.gold, at: 7, pts: [[0, .3], [.14, .74], [.28, .3], [.44, .75], [.58, .29], [.74, .74], [.88, .31], [1, .52]],
        marks: [], range: true, verdict: "Skip it" }
    ];
    var ST = [
      { at: 0, title: "Uptrend", text: "A low, then higher lows. Every low is higher than the one before. That's bullish: look for price to continue up." },
      { at: 3.5, title: "Downtrend", text: "A high, then lower highs, all the way down. That's bearish: look for continuation down. You can make money with the stock going down too." },
      { at: 7, title: "Range", text: "Equal highs and equal lows. No clear direction: the market is just consolidating between the two." },
      { at: 10.5, title: "Trade the trends, skip the range", text: "He trades the uptrend and the downtrend and avoids the range, because that's where traders using these setups blow their accounts." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        Z.forEach(function (z, i) {
          var x0, y0, w, h;
          if (n) { x0 = 24; w = L.W - 48; h = 112; y0 = 156 + i * 204; }
          else { x0 = 46 + i * 250; w = 220; y0 = 90; h = 330; }
          var op = fade(T, z.at, 0.3), p = clamp01((T - z.at - 0.2) / 2.4);
          s += rect(x0 - 12, y0 - 40, w + 24, h + (n ? 86 : 92), C.box, 14, 0.55 * Math.max(0.25, op));
          s += txt(x0, y0 - 16, z.name, z.col, 15, "start", 700, Math.max(0.3, op));
          var P = z.pts.map(function (q) { return [x0 + q[0] * w, y0 + h - q[1] * h]; });
          if (z.range && op > 0) {
            s += line(x0, y0 + h - .745 * h, x0 + w, y0 + h - .745 * h, C.gold, 1.4, "5 4", fade(T, z.at + 2.2, 0.4));
            s += line(x0, y0 + h - .3 * h, x0 + w, y0 + h - .3 * h, C.gold, 1.4, "5 4", fade(T, z.at + 2.2, 0.4));
            s += txt(x0 + w, y0 + h - .745 * h - 8, "equal highs", C.gold, 11, "end", 600, fade(T, z.at + 2.2, 0.4));
            s += txt(x0 + w, y0 + h - .3 * h + 18, "equal lows", C.gold, 11, "end", 600, fade(T, z.at + 2.2, 0.4));
          }
          if (op > 0) s += poly(partial(P, p), z.col, 2.6, null, op);
          z.marks.forEach(function (m) {
            var mo = fade(T, z.at + 0.2 + 2.4 * m[0] / (P.length - 1), 0.3);
            if (mo > 0) s += dot(P[m[0]][0], P[m[0]][1], 4.5, z.col, mo) + txt(P[m[0]][0], P[m[0]][1] + (z.below ? 20 : -10), m[1], z.col, 12, "middle", 700, mo);
          });
          var vo = fade(T, 10.7, 0.4);
          if (vo > 0) {
            var vy = y0 + h + (n ? 34 : 36);
            s += pill(x0 + w / 2, vy, (z.range ? "✕ " : "✓ ") + z.verdict, z.range ? C.dn : z.col, vo, "middle");
            if (z.range) s += rect(x0 - 12, y0 - 40, w + 24, h + (n ? 86 : 92), "#000", 14, 0.35 * vo);
          }
        });
        if (!n) {
          s += callout(822, 50, ["Only three ways", "Up, down, or sideways. That's", "the only way the market moves."], C.dim, win(T, 0.3, 10.5));
          s += callout(822, 50, ["Scalper or not", "Quick trades still need the", "trend. Same setup, better odds", "when the structure is with you."], C.up, fade(T, 10.6, 0.4));
        } else {
          s += callout(14, 18, ["Only three ways", "Up, down, or sideways."], C.dim, win(T, 0.3, 10.5));
          s += callout(14, 18, ["Trade the trends", "Avoid the range."], C.up, fade(T, 10.6, 0.4));
        }
        return s + stamp(L, "Illustrative");
      }
    };
  }

  /* =====================================================================
     3 · Cheat code three: combine time frames.
         A bearish daily, then the 1-minute entry.
     ===================================================================== */
  function mtfSpec() {
    var dd = bars(26, [[0, 200], [4, 209], [6, 206], [9, 214], [12, 207], [15, 211.5], [18, 203.5], [20, 207.5], [23, 201], [25, 199.5]], 0.6, 41, 1.1,
      { 9: 214, 12: 207, 15: 211.5, 18: 203.5, 20: 207.5 });
    var D = dd.B; D[9].h = 214.8; D[12].l = 206.3; D[15].h = 212.2; D[20].h = 208.2; tidy(D);
    var md = bars(46, [[0, 192.3], [1, 192.0], [2, 192.6], [3, 192.2], [4, 192.4], [5, 191.5], [6, 190.55], [7, 190.8], [8, 190.95], [9, 190.45], [10, 190.2],
      [12, 190.0], [13, 190.1], [14, 190.25], [15, 190.4], [16, 190.6], [17, 190.75], [18, 190.88], [19, 190.55], [22, 190.2], [25, 189.8], [28, 189.5],
      [31, 189.2], [34, 189.0], [36, 189.15], [40, 189.3], [45, 189.2]], 0.03, 51, 0.07,
      { 4: 192.4, 5: 191.5, 6: 190.55, 7: 190.8, 8: 190.95, 9: 190.45, 18: 190.88, 19: 190.55, 34: 189.04 });
    var M = md.B;
    clampRange(M, 0, 4, 191.9, 192.8); M[1].l = 191.9; M[2].h = 192.8;
    clampRange(M, 6, 45, null, 191.4);
    M[8].h = 191.0; M[19].h = 191.0; M[19].l = Math.min(M[19].l, 190.5);
    clampRange(M, 20, 45, 189.0, 190.6); M[34].l = 189.0;
    tidy(M);
    var ENT = 190.55, STP = 191.05, TGT = 189.0;
    var ST = [
      { at: 0, title: "Start on the daily", text: "A high, then a higher low. Then price breaks below that last higher low and puts in lower highs. On the daily, this stock is bearish." },
      { at: 3.6, title: "Let the first five minutes play out", text: "Now the 1-minute chart, with a plan. Mark the 5-minute high and low. Because the daily is bearish, you're looking for the short side." },
      { at: 6.2, title: "No retest of the 5-minute low", text: "It just keeps pushing down. There's no retest of the 5-minute low to sell, so that setup never comes." },
      { at: 9, title: "Mark the last up-close candles", text: "The second setup: in a downtrend, up-close candles should hold price for a move down. Mark the last up-close candles. The retest of them is the trade." },
      { at: 11.2, title: "Short the weak candle", text: "Price comes back to those candles and prints a weak candle. Short there, with the stop a break back above the candle you entered on." },
      { at: 14.2, title: "About $670 for about $2,070", text: "The target is the $189 whole number. In the video that's about $670 of risk for about $2,070, and the trade is done before the first hour of the open." }
    ];
    var DC = [[0, 0], [2.6, 26]], MC = [[0, 0], [3.6, 0], [5, 5], [6.2, 5], [8, 13], [11.2, 13], [12.6, 20], [14.2, 20], [16.8, 35], [18.6, 46]];
    return {
      stages: ST, end: 19.2, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var gd = n ? { x0: 14, x1: L.W - 62, y0: 150, y1: 288 } : { x0: 46, x1: 290, y0: 70, y1: L.H - 70 };
        var gm = n ? { x0: 14, x1: L.W - 62, y0: 372, y1: L.H - 46 } : { x0: 350, x1: 740, y0: 70, y1: L.H - 70 };
        /* daily */
        var Xd = function (i) { return gd.x0 + (i + 0.5) * (gd.x1 - gd.x0) / 26; }, Yd = function (v) { return gd.y1 - (v - 197) / (217 - 197) * (gd.y1 - gd.y0); };
        var dop = T < 3.6 ? 1 : 0.55 + 0.45 * (1 - fade(T, 3.6, 0.5));
        s += rect(gd.x0 - 6, gd.y0 - 8, gd.x1 - gd.x0 + 12, gd.y1 - gd.y0 + 16, C.box, 8, 0.5);
        s += txt(gd.x0, gd.y0 - 18, "Daily · the direction", C.faint, 12, "start", 600);
        s += '<g opacity="' + dop.toFixed(3) + '">' + drawBars(D, Xd, Yd, track(DC, T), (gd.x1 - gd.x0) / 26 * 0.6) + "</g>";
        var hlo = fade(T, 1.5, 0.4);
        if (hlo > 0) {
          s += line(Xd(12), Yd(206.3), Xd(19), Yd(206.3), C.gold, 1.4, "4 3", hlo * dop);
          s += txt(Xd(9), Yd(214.8) - 8, "H", C.ink, 12, "middle", 700, hlo * dop) + txt(Xd(12), Yd(206.3) + 18, "HL", C.up, 12, "middle", 700, hlo * dop);
          s += txt(Xd(15), Yd(212.2) - 8, "LH", C.dn, 12, "middle", 700, fade(T, 1.9, 0.3) * dop) + txt(Xd(20), Yd(208.2) - 8, "LH", C.dn, 12, "middle", 700, fade(T, 2.4, 0.3) * dop);
        }
        var bo = fade(T, 2.7, 0.4);
        if (bo > 0) s += pill((gd.x0 + gd.x1) / 2, gd.y1 + (n ? 26 : 34), "bearish → shorts", C.dn, bo, "middle");
        /* 1-minute */
        var X = function (i) { return gm.x0 + (i + 0.5) * (gm.x1 - gm.x0) / 46; }, Y = function (v) { return gm.y1 - (v - 188.6) / (193.0 - 188.6) * (gm.y1 - gm.y0); };
        var c = { g: gm, X: X, Y: Y, n: n, bw: (gm.x1 - gm.x0) / 46 * 0.62 };
        var mo = 0.35 + 0.65 * fade(T, 3.4, 0.4);
        s += '<g opacity="' + mo.toFixed(3) + '">' + axis(gm, 188.6, 193.0, 0.5, Y, 2) + "</g>";
        s += txt(gm.x0, gm.y0 - 18, n ? "1-minute · the entry" : "1-minute · the entry · made-up bars", C.faint, 12, "start", 600);
        var fo = fade(T, 4.6, 0.4);
        if (fo > 0) {
          s += rect(X(0) - c.bw, Y(192.8), X(4) - X(0) + 2 * c.bw, Y(191.9) - Y(192.8), C.blue, 3, 0.16 * fo);
          s += hl(c, 191.9, 0, C.blue, "5-minute low", fo * (T < 11.2 ? 1 : 0.5), "5 4", 1.6);
        }
        var nr = win(T, 6.6, 9.4);
        if (nr > 0) s += pill(X(10), Y(191.9) + 34, n ? "no retest" : "no retest of the 5-minute low", C.dim, nr, "start");
        var zo = fade(T, 9.2, 0.4);
        if (zo > 0) {
          s += boxAround(c, 7, M[7], C.gold, zo) + boxAround(c, 8, M[8], C.gold, zo);
          s += band(X(7) - c.bw, gm.x1, Y, 190.95, 190.55, C.gold, zo * 0.8, 0.1);
          s += tag(X(8) + 8, Y(191.0) - 16, "last up-close candles", C.gold, zo * win(T, 9.2, 14.2), "start");
        }
        s += drawBars(M, X, Y, track(MC, T), c.bw);
        var eo = fade(T, 12.5, 0.4);
        if (eo > 0) {
          s += riskBox(X(19), gm.x1, Y, ENT, STP, TGT, eo * 0.9);
          s += ent(c, 19, ENT, C.dn, "short 190.55", eo, true);
          s += hl(c, TGT, 19, C.up, "$189 whole number", eo, "5 4", 1.4);
          s += tag(gm.x1 - 2, Y(STP) - 12, "stop 191.05", C.dn, eo * win(T, 12.5, 15), "end");
        }
        var po = fade(T, 16.6, 0.4);
        if (po > 0) s += pill(X(34), Y(189.0) + 30, n ? "target · ~3 to 1" : "target · about 3 to 1", C.up, po, "middle");
        var nts = [
          [["Higher time frame first", "Broke the last higher low,", "then lower highs. Bearish."], C.dn, 0.3, 3.6],
          [["Then the plan", "First 5 minutes, mark the range.", "Daily is bearish: shorts only."], C.blue, 3.8, 6.2],
          [["No retest, no trade", "The first setup never shows up.", "Don't force it."], C.dim, 6.4, 9],
          [["Second setup", "Last up-close candles should", "hold price for a move down."], C.gold, 9.2, 11.2],
          [["Weak candle at the retest", "Short. Stop a break back above", "the candle you entered on."], C.dn, 11.4, 14.2],
          [["Risk about $670", "for about $2,070 (the video).", "Done before the first hour."], C.up, 14.4, null]
        ];
        nts.forEach(function (q) { s += n ? callout(14, 18, q[0], q[1], win(T, q[2], q[3])) : callout(822, 50, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     4 · Cheat code four: 90% of scalps should work right away.
     ===================================================================== */
  function clockBar(c, i0, k, col, op) {
    if (op <= 0) return "";
    var s = "", x0 = c.X(i0 + 1) - c.bw / 2, w = c.X(i0 + 5) - c.X(i0 + 1) + c.bw, y = c.g.y1 - 6, cw = w / 5;
    for (var m = 0; m < 5; m++) s += rect(x0 + m * cw + 1, y - 10, cw - 2, 10, m < k ? col : "#3a3a3c", 2, op);
    return s + txt(x0 + w / 2, y - 16, "minutes 1–5 after entry", C.faint, 11, "middle", 600, op);
  }
  function fastSpec() {
    function sceneA() {
      var d = bars(46, [[0, 60.7], [3, 60.85], [5, 60.75], [7, 60.92], [8, 61.3], [9, 61.4], [10, 61.2], [11, 61.06], [12, 61.18], [13, 61.1], [14, 61.2],
        [15, 61.06], [16, 61.15], [17, 61.05], [18, 61.1], [24, 61.2], [30, 61.02], [36, 61.15], [40, 60.98], [42, 60.86], [45, 60.75]], 0.025, 61, 0.05,
        { 7: 60.92, 8: 61.3, 11: 61.06, 12: 61.18, 17: 61.05, 43: 60.84 });
      var B = d.B;
      clampRange(B, 0, 7, null, 60.98);
      clampRange(B, 10, 17, 61.01, 61.28);
      tidy(B);
      return {
        N: 46, lo: 60.5, hi: 61.6, step: 0.25, dp: 2, B: B,
        title: "A loser · pre-market high break and retest · made-up 1-minute bars", short: "A loser · cut in five minutes",
        cnt: [[0, 0], [2.4, 13], [3, 13], [5.4, 18], [8, 18], [10.6, 46]],
        dim: function (i, t) { return i >= 18 ? 0.32 : 1; },
        draw: function (t, c) {
          var s = "";
          s += hl(c, 61.0, 0, C.gold, "pre-market high 61.00", fade(t, 0.3, 0.4), null, 2);
          var eo = fade(t, 2.3, 0.3);
          s += ent(c, 12, 61.18, C.up, "long 61.18", eo, false);
          s += clockBar(c, 12, Math.min(5, Math.floor(clamp01((t - 3) / 2.4) * 5 + (t > 3 ? 1 : 0))), C.gold, win(t, 3, 8));
          var xo = fade(t, 5.6, 0.3);
          if (xo > 0) s += dot(c.X(17), c.Y(61.05), 6, C.dn, xo) + pill(c.X(17) + 12, c.Y(61.05) + (c.n ? 76 : 34), "out · −$1,650", C.dn, xo, "start");
          var go = fade(t, 8.2, 0.4);
          if (go > 0) {
            s += hl(c, 60.85, 12, C.dn, "stop", go * 0.8, "4 4", 1.2);
            s += cross(c.X(43), c.Y(60.84), C.dn, fade(t, 10.2, 0.3));
            s += tag((c.X(18) + c.X(45)) / 2, c.Y(61.45), c.n ? "if he'd stayed: an hour, then the stop" : "if he'd stayed: an hour of nothing, then the stop", C.faint, go, "middle");
          }
          s += nt(c, ["A break and retest", "Off the pre-market high.", "It looks fine. Long."], C.gold, win(t, 0.3, 3));
          s += nt(c, ["Five minutes, nothing", "If steps 1 to 3 were right, it", "should be working by now."], C.gold, win(t, 3.2, 5.6));
          s += nt(c, ["Thesis wrong: out", "A −$1,650 loss in the video,", "kept small because he left fast."], C.dn, win(t, 5.8, 8.2));
          s += nt(c, ["The cost of waiting", "Sitting in chop for an hour", "would have ended the same way."], C.dim, fade(t, 8.4, 0.4));
          return s;
        }
      };
    }
    function sceneB() {
      var d = bars(40, [[0, 139.5], [1, 139.3], [2, 139.6], [3, 139.35], [4, 139.55], [6, 139.8], [8, 139.95], [9, 139.7], [10, 139.3], [11, 139.0], [12, 138.7],
        [13, 138.6], [14, 138.8], [16, 139.05], [17, 139.1], [18, 138.95], [20, 138.6], [24, 138.2], [28, 137.9], [32, 137.7], [36, 137.55], [39, 137.65]], 0.03, 71, 0.06,
        { 8: 139.95, 9: 139.7, 17: 139.12, 18: 138.95 });
      var B = d.B;
      clampRange(B, 0, 4, 139.2, null); B[1].l = 139.2;
      clampRange(B, 5, 8, null, 139.99); B[9].h = 139.99;
      clampRange(B, 14, 17, null, 139.18); B[17].h = 139.18; B[18].h = 139.17;
      clampRange(B, 19, 39, 137.5, 139.0);
      tidy(B);
      return {
        N: 40, lo: 137.2, hi: 140.4, step: 0.5, dp: 2, B: B,
        title: "A winner · previous-day low retest · made-up 1-minute bars", short: "A winner · works in minutes",
        cnt: [[0, 0], [2.4, 10], [3, 10], [4.6, 14], [5.4, 14], [7, 19], [7.8, 19], [10.4, 40]],
        draw: function (t, c) {
          var s = "";
          s += hl(c, 140.0, 0, C.gold, "previous-day low 140.00", fade(t, 0.3, 0.4), null, 2);
          var fl = fade(t, 5.4, 0.4);
          if (fl > 0) { s += rect(c.X(0) - c.bw, c.Y(139.6), c.X(4) - c.X(0) + 2 * c.bw, c.Y(139.2) - c.Y(139.6), C.blue, 3, 0.16 * fl); s += hl(c, 139.2, 0, C.blue, "5-minute low 139.20", fl, "5 4", 1.6); }
          s += ent(c, 9, 139.7, C.dn, "short 139.70", fade(t, 2.3, 0.3), false);
          s += clockBar(c, 9, Math.min(5, Math.floor(clamp01((t - 3) / 1.6) * 5 + (t > 3 ? 1 : 0))), C.up, win(t, 3, 5.4));
          var wo = fade(t, 4.4, 0.3);
          if (wo > 0) s += pill(c.X(13), c.Y(138.6) + 30, c.n ? "low of day, in minutes" : "back to the low of day in minutes", C.up, wo * win(t, 4.4, 7.8), "middle");
          s += ent(c, 18, 138.95, C.dn, "again 138.95", fade(t, 6.8, 0.3), false);
          var to = fade(t, 10, 0.4);
          if (to > 0) s += pill(c.X(32), c.Y(137.7) + 30, "≈ $12,000 (the video)", C.up, to, "middle");
          s += nt(c, ["A previous-day low retest", "Sellers step in at the level.", "Weak price action: short."], C.gold, win(t, 0.3, 3));
          s += nt(c, ["Working right away", "Within a couple of minutes", "it's back at the low of day."], C.up, win(t, 3.2, 5.4));
          s += nt(c, ["Then the 5-minute low", "Another retest, from cheat", "code one. Continuation."], C.blue, win(t, 5.6, 7.8));
          s += nt(c, ["Five minutes tells you", "Working or failing: you know.", "Don't sit in consolidation."], C.up, fade(t, 8, 0.4));
          return s;
        }
      };
    }
    var ST = [
      { at: 0, title: "A pre-market high retest", text: "A break and retest off the pre-market high. He enters on the green arrow." },
      { at: 3, title: "Five minutes, nothing", text: "If steps one to three were done right, most scalps should work within minutes of the entry. This one isn't working." },
      { at: 5.6, title: "Out for −$1,650", text: "Within five minutes he knows the thesis is wrong and exits: a $1,650 loss in the video, kept small because he got out fast." },
      { at: 8.2, title: "What staying would have cost", text: "He'd have sat in it for at least another hour for it to just not work out. Getting out early is what kept the loss small." },
      { at: 11, title: "A previous-day low retest", text: "Price comes back up into the previous day's low. Sellers step in, and he shorts once he sees weak price action." },
      { at: 14, title: "Working within minutes", text: "Within the first couple of minutes it's back down at the low of the day. That's what a trade that's right looks like." },
      { at: 16.4, title: "Then the 5-minute low retest", text: "Coming back into the low of the day, it gives another retest, this time off the 5-minute low from cheat code one, with a lot of continuation." },
      { at: 18.8, title: "That's the tell", text: "About a $12,000 trade in the video. Within the first five minutes he knew whether it was working or failing. Don't sit in consolidation too long." }
    ];
    return { stages: ST, end: 22, size: sizeStd, frame: scenes([{ t0: 0, make: sceneA }, { t0: 11, make: sceneB }]) };
  }

  /* =====================================================================
     6 · Cheat code six: only trade A+ conditions. A choppy day vs a trend day.
     ===================================================================== */
  function daysSpec() {
    var cd = bars(40, [[0, 50.4], [2, 50.75], [4, 50.95], [7, 50.5], [10, 50.97], [12, 50.6], [15, 50.1], [18, 50.5], [21, 50.97], [24, 50.6], [27, 50.08],
      [30, 50.5], [33, 50.96], [35, 50.98], [37, 50.7], [39, 50.5]], 0.04, 81, 0.07, {});
    var CB = cd.B; clampRange(CB, 0, 39, 49.98, 51.04); [4, 10, 21, 33].forEach(function (i) { CB[i].h = 51.04; }); [15, 27].forEach(function (i) { CB[i].l = 49.99; }); tidy(CB);
    var td = bars(40, [[0, 70.2], [5, 70.95], [8, 70.65], [13, 71.55], [16, 71.2], [21, 72.15], [24, 71.85], [29, 72.75], [32, 72.45], [39, 73.45]], 0.05, 91, 0.08, {});
    var TB = td.B; tidy(TB);
    var CT = [{ i: 11, v: 50.97, r: -500, at: 4.6, lbl: "5-min high retest" }, { i: 22, v: 50.97, r: -1200, at: 6, lbl: "again" }, { i: 34, v: 50.95, r: 600, at: 7.4, lbl: "third try" }];
    var TT = [{ i: 8, v: 70.7, r: 700, at: 9.6, lbl: "pre-market high retest" }, { i: 16, v: 71.25, r: 400, at: 11, lbl: "one candle rule · 2R" }];
    var ST = [
      { at: 0, title: "Two days, same rules", text: "Out of a month of trading days, maybe 10 to 15 are A+ conditions. The rest are B+ or B− days. Here are two days side by side." },
      { at: 4.2, title: "The choppy day", text: "Every try at the high rejects, and every try at the low rejects. Take the 5-minute high retest three times: −$500, −$1,200, then +$600." },
      { at: 9.2, title: "The trend day", text: "A clear uptrend: a move, a retest, a move, a retest. The pre-market high retest makes $700, and the one candle rule makes $400 at 2R." },
      { at: 12.6, title: "Your edge has conditions", text: "Same setups, same trader. The choppy day ends −$1,100 and the trend day +$1,100. You don't need to trade every day." }
    ];
    return {
      stages: ST, end: 16, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var P = n ? [{ x0: 14, x1: L.W - 62, y0: 160, y1: 410 }, { x0: 14, x1: L.W - 62, y0: 486, y1: L.H - 46 }]
                  : [{ x0: 46, x1: 370, y0: 70, y1: L.H - 70 }, { x0: 430, x1: 754, y0: 70, y1: L.H - 70 }];
        var defs = [{ B: CB, lo: 49.7, hi: 51.3, step: 0.5, trades: CT, name: n ? "Choppy day" : "Choppy day · every break rejects", col: C.dn, total: -1100, from: 4.2 },
                    { B: TB, lo: 69.9, hi: 74.1, step: 1, trades: TT, name: n ? "Trend day" : "Trend day · move, retest, move", col: C.up, total: 1100, from: 9.2 }];
        var cnt = track([[0, 0], [3.6, 40]], T);
        defs.forEach(function (d, k) {
          var g = P[k], X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / 40; }, Y = function (v) { return g.y1 - (v - d.lo) / (d.hi - d.lo) * (g.y1 - g.y0); };
          var foc = T < 4.2 || T >= 12.6 ? 1 : (T < 9.2 ? (k === 0 ? 1 : 0.4) : (k === 1 ? 1 : 0.4));
          s += '<g opacity="' + foc.toFixed(3) + '">';
          s += axis(g, d.lo, d.hi, d.step, Y, d.step < 1 ? 1 : 0);
          s += txt(g.x0, g.y0 - 18, d.name, d.col, 13, "start", 700);
          s += drawBars(d.B, X, Y, cnt, (g.x1 - g.x0) / 40 * 0.6);
          var run = 0;
          d.trades.forEach(function (q) {
            var o = fade(T, q.at, 0.3);
            if (o <= 0) return;
            run += q.r;
            var col = q.r < 0 ? C.dn : C.up;
            s += dot(X(q.i), Y(q.v), 6, col, o);
            s += tag(X(q.i), Y(q.v) + (k === 0 && q.r < 0 ? -22 : 24), money(q.r), col, o, "middle");
          });
          var ro = fade(T, d.from + 0.4, 0.3);
          if (ro > 0) s += pill(g.x1, g.y0 - 20, "day " + money(run), run < 0 ? C.dn : C.up, ro, "end");
          s += "</g>";
        });
        var nts = [
          [["A+ days are fewer", "Of ~30 trading days, maybe", "10 to 15 are A+ conditions."], C.gold, 0.3, 4.2],
          [["Chop", "Two losers, then a $600 win", "that feels like the right call.", "The day is still −$1,100."], C.dn, 4.4, 9.2],
          [["Trend", "Two trades, two winners.", "Easier to execute and to hold."], C.up, 9.4, 12.6],
          [["Not every day is a trading day", "Your edge is built for certain", "conditions, not all of them."], C.gold, 12.8, null]
        ];
        nts.forEach(function (q) { s += n ? callout(14, 18, q[0], q[1], win(T, q[2], q[3])) : callout(822, 50, q[0], q[1], win(T, q[2], q[3])); });
        return s + stamp(L);
      }
    };
  }

  var SPECS = { edge: edgeSpec, structure: structureSpec, mtf: mtfSpec, fast: fastSpec, days: daysSpec };
  document.querySelectorAll("[data-scc-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-scc-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     The quiz: which one candle rule trade is higher probability?
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-scc-quiz]");
    if (!root) return;
    var figs = root.querySelectorAll("[data-opt]"), out = root.querySelector("[data-quiz-out]"), btns = root.querySelectorAll("[data-pick]");
    var o1 = bars(40, [[0, 20.0], [4, 21.0], [7, 20.4], [11, 21.6], [14, 20.95], [18, 22.0], [20, 21.75], [21, 21.45], [23, 21.9], [25, 22.4], [27, 21.75],
      [30, 22.3], [34, 22.9], [39, 23.6]], 0.05, 101, 0.08, { 20: 21.75, 21: 21.45, 27: 21.72 });
    var B1 = o1.B; B1[21].l = 21.38; clampRange(B1, 22, 39, 21.46, null); B1[27].l = 21.5; tidy(B1);
    var o2 = bars(40, [[0, 22.4], [4, 23.2], [8, 22.3], [12, 22.95], [16, 22.2], [18, 22.55], [19, 22.3], [20, 22.22], [22, 22.8], [24, 23.18], [27, 22.5],
      [30, 22.2], [33, 21.8], [36, 21.5], [39, 21.35]], 0.05, 111, 0.08, { 18: 22.55, 19: 22.3, 27: 22.5 });
    var B2 = o2.B; B2[4].h = 23.25; B2[24].h = 23.24; B2[16].l = 22.15; B2[20].l = 22.15; tidy(B2);
    var OPT = [
      { B: B1, lo: 19.6, hi: 24.0, mark: 21, z: [21.75, 21.45], lab: [[7, "low", 1], [14, "HL", 1], [27, "HL", 1]], good: true },
      { B: B2, lo: 20.9, hi: 23.7, mark: 19, z: [22.55, 22.3], lab: [[4, "high", 0], [12, "LH", 0], [16, "equal lows", 1], [24, "equal high", 0]], good: false }
    ];
    var shown = 28, raf = 0, picked = null;
    function draw() {
      figs.forEach(function (fig, k) {
        var svg = fig.querySelector("svg"), d = OPT[k];
        var narrow = fig.clientWidth > 0 && fig.clientWidth < 420, W = 560, H = narrow ? 460 : 320;
        FS = narrow ? 1.85 : 1;
        svg.setAttribute("viewBox", "0 0 " + W + " " + H);
        var g = { x0: 16, x1: W - 16, y0: 44, y1: H - 22 };
        var X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / 40; }, Y = function (v) { return g.y1 - (v - d.lo) / (d.hi - d.lo) * (g.y1 - g.y0); };
        var bw = (g.x1 - g.x0) / 40 * 0.62, s = '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
        s += txt(g.x0, 26, "Option " + (k + 1), C.ink, 15, "start", 700);
        var mb = d.B[d.mark];
        s += band(X(d.mark) - bw, g.x1, Y, d.z[0], d.z[1], C.gold, 0.9, 0.12);
        s += frameRect(X(d.mark) - bw, Y(mb.h) - 4, 2 * bw, Y(mb.l) - Y(mb.h) + 8, C.gold, 2, 1, 3);
        s += drawBars(d.B, X, Y, shown, bw);
        if (shown < 28.5) s += dot(X(27), Y(d.B[27].l), 14, C.gold, 1, true) + txt(X(27) + 22, Y(d.B[27].l) + 6, "retest?", C.gold, 13, "start", 700);
        if (shown >= 39.9) {
          d.lab.forEach(function (q) { var b = d.B[q[0]]; s += txt(X(q[0]), q[2] ? Y(b.l) + 20 : Y(b.h) - 9, q[1], d.good ? C.up : C.orange, 12, "middle", 700); });
          s += pill(g.x1, 30, d.good ? "worked · clear higher lows" : "failed · no clear trend", d.good ? C.up : C.dn, 1, "end");
        }
        svg.innerHTML = s;
        FS = 1;
      });
    }
    function reveal() {
      var t0 = performance.now();
      cancelAnimationFrame(raf);
      (function step(now) {
        shown = Math.min(40, 28 + (now - t0) / 1000 * 6);
        draw();
        if (shown < 40) raf = requestAnimationFrame(step);
      })(t0);
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        picked = +b.getAttribute("data-pick");
        btns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        out.innerHTML = (picked === 1 ? "<b>Right.</b> " : "<b>Not this time.</b> ") +
          "Option 1 worked and option 2 failed hard. It's the same setup both times. Option 1 had clear structure: a low, a higher low, and price coming into the level was making a new higher low. Option 2 had a high, a lower high, equal lows and then an equal high: no trend, so it was the low-probability trade, and it could have been skipped.";
        if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { shown = 40; draw(); } else reveal();
      });
    });
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
    draw();
  })();

  /* =====================================================================
     A trading day with all seven, as a click-through stepper.
     Without the script the five show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-scc-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "Day",    c: C.gold,   tag: "Is today an A+ day?" },
      { k: "Daily",  c: C.dn,     tag: "Which way is the higher time frame going?" },
      { k: "Levels", c: C.blue,   tag: "Mark the levels your setups use" },
      { k: "Entry",  c: C.up,     tag: "A retest, price action, a stop, a size" },
      { k: "Clock",  c: C.orange, tag: "Working in minutes, or out" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "A trading day, step by step");
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
      function ln(x1, y1, x2, y2, col, w, dash, op) { return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 2) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op + '"' : "") + "/>"; }
      function pl(pts, col, w, dash) { return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2.4) + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>"; }
      function cdl(x, o, c, h, l, w) { var col = c <= o ? C.up : C.dn; /* screen y: a lower close is a larger y */ return ln(x, h, x, l, col, 1.6) + '<rect x="' + (x - w / 2).toFixed(1) + '" y="' + Math.min(o, c).toFixed(1) + '" width="' + w + '" height="' + Math.max(2, Math.abs(c - o)).toFixed(1) + '" rx="1.5" fill="' + col + '"/>'; }
      var top = 34, bot = H - 54, mid = (top + bot) / 2;
      if (k === 0) {
        var hw = narrow ? 230 : 240, rr = rng(5), chop = [], trend = [];
        for (var i = 0; i <= 24; i++) {
          chop.push([30 + i * hw / 24, mid - 10 + Math.sin(i * 1.3) * 34 + (rr() - 0.5) * 10]);
          trend.push([300 + i * hw / 24, bot - 20 - i * (bot - top - 50) / 24 + Math.sin(i * 1.1) * 12]);
        }
        s += ln(30, mid - 46, 30 + hw, mid - 46, C.faint, 1.2, "4 4") + ln(30, mid + 26, 30 + hw, mid + 26, C.faint, 1.2, "4 4");
        s += pl(chop, C.dn, 2.2) + pl(trend, C.up, 2.2);
        s += t(30 + hw / 2, top + 4, "chop · sit out", C.dn, 14, "middle", 700) + t(300 + hw / 2, top + 4, "trend · A+", C.up, 14, "middle", 700);
        s += t(30, bot + 34, "Not every day is a trading day.", C.dim, 12, "start", 500);
      } else if (k === 1) {
        var zz = [[40, bot - 40], [110, top + 30], [170, mid + 10], [240, top + 60], [300, mid + 60], [360, mid + 10], [430, bot - 10], [480, mid + 50], [520, bot]];
        s += ln(170, mid + 10, 330, mid + 10, C.gold, 1.6, "5 4");
        s += pl(zz, C.ink, 2.4);
        s += t(110, top + 22, "H", C.ink, 13, "middle", 700) + t(170, mid + 30, "HL", C.up, 13, "middle", 700) + t(240, top + 52, "LH", C.dn, 13, "middle", 700) + t(360, mid + 2, "LH", C.dn, 13, "middle", 700);
        s += t(300, mid + 86, "broke the higher low", C.gold, 12, "middle", 600);
        s += t(30, bot + 34, "Daily is bearish: on the 1-minute, shorts only.", C.dim, 12, "start", 500);
      } else if (k === 2) {
        var L2 = [["pre-market high", top + 14, C.dim], ["5-minute high", mid - 30, C.blue], ["5-minute low", mid + 20, C.blue], ["pre-market low", bot - 14, C.gold]];
        L2.forEach(function (q) { s += ln(30, q[1], W - 30, q[1], q[2], 2, q[2] === C.dim ? "5 4" : null) + t(W - 30, q[1] - 7, q[0], q[2], 12, "end", 700); });
        s += cdl(150, mid - 4, mid + 14, mid - 10, mid + 22, 16) + '<rect x="134" y="' + (mid - 16) + '" width="32" height="44" rx="4" fill="none" stroke="' + C.gold + '" stroke-width="2"/>';
        s += t(150, mid + 48, "last opposite-close candle", C.gold, 12, "middle", 700);
        s += t(30, bot + 34, "Marked before the trade, not during it.", C.dim, 12, "start", 500);
      } else if (k === 3) {
        var lv = mid - 20;
        s += ln(30, lv, W - 30, lv, C.gold, 2.4) + t(30, lv - 8, "level", C.gold, 12, "start", 700);
        var path = [[40, lv - 70], [90, lv - 40], [130, lv + 40], [170, lv + 70], [220, lv + 30], [260, lv + 6]];
        s += pl(path, C.ink, 2.2);
        s += cdl(280, lv + 10, lv + 34, lv - 2, lv + 38, 16);
        s += '<circle cx="292" cy="' + (lv + 34) + '" r="7" fill="' + C.dn + '"/>';
        s += ln(266, lv - 12, 420, lv - 12, C.dn, 2, "5 4") + t(narrow ? 330 : 424, lv - 20, narrow ? "stop" : "stop: above the candle", C.dn, 12, "start", 700);
        s += pl([[300, lv + 40], [340, lv + 70], [380, lv + 64], [430, lv + 110], [480, lv + 104], [520, bot - 6]], C.up, 2.2, "6 4");
        s += t(30, bot + 34, "Retest, weak candle, short. Size you can afford.", C.dim, 12, "start", 500);
      } else {
        var cx = narrow ? 150 : 140, cy = mid + 6, rad = narrow ? 82 : 78;
        for (var m = 0; m < 5; m++) {
          var a0 = -Math.PI / 2 + m * 2 * Math.PI / 5 + 0.05, a1 = a0 + 2 * Math.PI / 5 - 0.1;
          s += '<path d="M' + (cx + rad * Math.cos(a0)).toFixed(1) + "," + (cy + rad * Math.sin(a0)).toFixed(1) + " A" + rad + "," + rad + " 0 0 1 " + (cx + rad * Math.cos(a1)).toFixed(1) + "," + (cy + rad * Math.sin(a1)).toFixed(1) + '" fill="none" stroke="' + C.orange + '" stroke-width="14" opacity="' + (0.35 + 0.13 * m) + '"/>';
        }
        s += t(cx, cy + 8, "5 min", C.ink, 20, "middle", 700);
        s += t(narrow ? 270 : 280, cy - 30, "working? hold it", C.up, 15, "start", 700) + t(narrow ? 270 : 280, cy + 10, "not? get out", C.dn, 15, "start", 700) + t(narrow ? 270 : 280, cy + 50, "then done for the day", C.dim, 13, "start", 600);
        s += t(30, bot + 34, "A trade that's right usually works right away.", C.dim, 12, "start", 500);
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
     Same trade, any size: shares from the risk you pick
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-scc-calc]");
    if (!root) return;
    var f = {};
    ["entry", "stop", "target", "risk"].forEach(function (k) { f[k] = root.querySelector('[name="' + k + '"]'); });
    var out = {};
    ["per", "shares", "loss", "win", "rr"].forEach(function (k) { out[k] = root.querySelector('[data-out="' + k + '"]'); });
    function val(el) { var v = parseFloat(String(el.value).replace(/[,$]/g, "")); return isFinite(v) ? v : NaN; }
    function calc() {
      var e = val(f.entry), st = val(f.stop), tg = val(f.target), r = val(f.risk);
      var per = Math.abs(e - st), rew = Math.abs(tg - e);
      var okDir = (tg - e) * (e - st) > 0;
      if (!(per > 0) || !(r > 0) || isNaN(tg) || !okDir) {
        ["per", "shares", "loss", "win", "rr"].forEach(function (k) { out[k].textContent = "–"; });
        if (!okDir && per > 0 && !isNaN(tg)) out.rr.textContent = "the target and the stop should be on opposite sides of the entry";
        return;
      }
      var sh = Math.floor(r / per);
      out.per.textContent = "$" + fmt(per, 2) + " a share";
      out.shares.textContent = sh > 0 ? fmt(sh) + " shares" : "less than 1 share: raise the risk or tighten the stop";
      out.loss.textContent = "−$" + fmt(sh * per, 0);
      out.win.textContent = "+$" + fmt(sh * rew, 0);
      out.rr.textContent = fmt(rew / per, 1) + " to 1";
    }
    root.addEventListener("input", calc);
    root.querySelectorAll("[data-preset]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-preset").split(",");
        f.entry.value = v[0]; f.stop.value = v[1]; f.target.value = v[2]; f.risk.value = v[3];
        calc();
      });
    });
    calc();
  })();

  if (typeof window !== "undefined") window.__scc = { SPECS: SPECS };
})();
