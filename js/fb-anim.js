/* =====================================================================
   fb-anim.js — the walkthroughs and tools on futures-basics.html
   (Martik Finance, "How Futures Trading Really Work (Full Beginner's
   Guide)").

     [data-fb-anim="deal"]     the wheat deal: a price both sides keep
     [data-fb-anim="margin"]   one gold contract, marked to market daily,
                               with a margin call
     [data-fb-anim="curve"]    contango, backwardation, April 2020 oil
     [data-fb-calc]            what a move is worth: contract size and ticks
     [data-fb-lev]             leverage and the room before a margin call
     [data-fb-steps]           before your first futures trade (stepper)

   Contract specs are the video's (gold tick and the micro E-mini are
   CME specs). The wheat paths, daily gold settlements, the maintenance
   level and the curves are made up to show the idea. Helpers and player
   are copied from sp-anim.js: each chart redraws in a narrow layout on a
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

  /* ---------- from sp-anim.js ---------- */
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
  function nb(n, lines, col, op) { return n ? callout(14, 18, lines, col, op) : callout(822, 50, lines, col, op); }

  function linePts(N, X, Y, pts, upto) {
    var out = [];
    for (var i = 0; i < N && i < upto; i++) out.push([X(i), Y(track(pts, i))]);
    return out;
  }
  function cross(x, y, col, op) {
    if (op <= 0) return "";
    return line(x - 7, y - 7, x + 7, y + 7, col, 2.6, null, op) + line(x - 7, y + 7, x + 7, y - 7, col, 2.6, null, op);
  }

  /* ---------- page helpers ---------- */
  function P2(v) { return fmt(v, 2); }
  function usd(v, d) { return (v < 0 ? "−$" : "$") + fmt(Math.abs(v), d || 0); }
  function ctx(L, N, lo, hi, gg) {
    var n = L.narrow;
    var g = gg || (n ? { x0: 14, x1: L.W - 62, y0: 226, y1: L.H - 56 } : { x0: 46, x1: 750, y0: 60, y1: L.H - 56 });
    return {
      n: n, g: g, L: L, lo: lo, hi: hi, N: N,
      X: function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; },
      Y: function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); },
      bw: (g.x1 - g.x0) / N * 0.6
    };
  }
  function lvl(c, v, col, label, op, dash, left, w) {
    if (op <= 0) return "";
    var y = c.Y(v);
    return line(c.g.x0, y, c.g.x1, y, col, w || 1.6, dash, op) +
      (label ? (left ? tag(c.g.x0 + 4, y - 13, label, col, op, "start") : tag(c.g.x1 - 2, y - 13, label, col, op, "end")) : "");
  }
  function title(c, s, short) { return txt(c.g.x0, c.g.y0 - 18, c.n ? (short || s) : s, C.faint, 12, "start", 600); }
  function notes(c, T, list) { var s = ""; list.forEach(function (q) { s += nb(c.n, q[0], q[1], win(T, q[2], q[3])); }); return s; }

  /* =====================================================================
     The wheat deal: 5,000 bushels at $6 in September
     ===================================================================== */
  function dealSpec() {
    var N = 27, LOCK = 6.0, BU = 5000;
    var DOWN = noisy(N, [[0, 6.0], [6, 5.85], [12, 5.55], [18, 5.2], [23, 4.95], [26, 4.8]], 0.09, 11);
    var UP = noisy(N, [[0, 6.0], [5, 6.15], [11, 6.45], [17, 6.7], [22, 7.0], [26, 7.2]], 0.09, 23);
    DOWN[0] = UP[0] = 6.0; DOWN[N - 1] = 4.8; UP[N - 1] = 7.2;
    var MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
    var ST = [
      { at: 0, title: "The handshake", text: "Made-up wheat prices. In March the farmer and a bread company agree: 5,000 bushels in September at $6.00 a bushel. That's $30,000, locked today." },
      { at: 3, title: "If wheat falls", text: "Wheat slides to $4.80 by September. At market, 5,000 bushels would bring only $24,000. The farmer still gets $30,000: the hedge saved $6,000." },
      { at: 6.5, title: "If wheat rises", text: "Or wheat climbs to $7.20. At market it would cost $36,000. The bread company still pays $30,000, and the farmer gives up the extra." },
      { at: 10, title: "Both on the hook", text: "Either way, both sides must go through with it, or close it out before expiration. That's the difference from an option, where the buyer can walk away." },
      { at: 13, title: "The deal itself trades", text: "The agreement can be bought and sold on an exchange. Speculators who never want a bushel take the other side, betting on the price move itself." }
    ];
    return {
      stages: ST, end: 17, size: sizeStd,
      frame: function (T, L) {
        var c = ctx(L, N, 4.4, 7.6), s = "";
        s += hgrid(c.g.x0, c.g.x1, c.Y, 4.5, 7.5, 0.5, function (v) { return "$" + fmt(v, 2); });
        s += title(c, "Wheat, $ per bushel · made-up prices, March to September", "Wheat $/bu · made up");
        MONTHS.forEach(function (m, k) { s += txt(c.X(k * 13 / 3), c.g.y1 + 22, m, C.faint, 11, "middle"); });
        var ol = fade(T, 0.6, 0.5);
        s += lvl(c, LOCK, C.gold, c.n ? "locked $6.00" : "locked: $6.00 × 5,000 bu = $30,000", ol, "6 4", false, 2.4);
        s += dot(c.X(0), c.Y(LOCK), 7, C.gold, fade(T, 0.3, 0.3));
        s += tag(c.X(0) + 2, c.Y(LOCK) + 24, "March handshake", C.gold, fade(T, 0.3, 0.3) * (1 - fade(T, 3, 0.3)), "start");
        /* path down */
        var dCnt = track([[3, 1], [5.6, N]], T), dOp = T < 6.5 ? 1 : T < 10 ? 0.25 : T < 13 ? 0.8 : 0.25;
        if (T >= 3) s += poly(linePts(N, c.X, c.Y, DOWN.map(function (v, i) { return [i, v]; }), dCnt), C.dn, 2.6, null, dOp);
        var od = win(T, 5.6, 6.5);
        if (od > 0) {
          var xe = c.X(N - 1);
          s += rect(xe - 14, c.Y(LOCK), 28, c.Y(4.8) - c.Y(LOCK), C.up, 3, 0.3 * od);
          s += tag(xe - 20, c.Y(4.8) + 2, "$4.80 · farmer +$6,000 vs market", C.up, od, "end");
        }
        /* path up */
        var uCnt = track([[6.5, 1], [9.1, N]], T), uOp = T < 10 ? 1 : 0.8;
        if (T >= 6.5) s += poly(linePts(N, c.X, c.Y, UP.map(function (v, i) { return [i, v]; }), uCnt), C.up, 2.6, null, uOp);
        var ou = win(T, 9.1, 10);
        if (ou > 0) {
          var xu = c.X(N - 1);
          s += rect(xu - 14, c.Y(7.2), 28, c.Y(LOCK) - c.Y(7.2), C.blue, 3, 0.3 * ou);
          s += tag(xu - 20, c.Y(7.2) - 2, "$7.20 · buyer saves $6,000", C.blue, ou, "end");
        }
        var ob = win(T, 10.2, 13);
        s += tag(c.X(N - 1) - 20, c.Y(7.2) - 2, "bread co. must buy at $6", C.blue, ob, "end");
        s += tag(c.X(N - 1) - 20, c.Y(4.8) + 2, "farmer must sell at $6", C.gold, ob, "end");
        /* trades on an exchange */
        var ot = fade(T, 13.2, 0.4);
        if (ot > 0) {
          [3, 7, 11, 15, 19, 23].forEach(function (i, k) {
            var o = fade(T, 13.4 + k * 0.4, 0.3);
            s += dot(c.X(i), c.Y(UP[i]), 6, k % 2 ? C.cyan : "#bf5af2", o);
          });
          s += tag(c.X(13), c.Y(UP[13]) - 22, "contract changes hands", C.cyan, fade(T, 14.4, 0.4), "middle");
        }
        s += notes(c, T, [
          [["The handshake", "5,000 bushels in September", "at $6.00: $30,000, fixed."], C.gold, 0.3, 3],
          [["Wheat falls to $4.80", "Market: $24,000.", "Farmer still gets $30,000."], C.dn, 3.2, 6.5],
          [["Wheat rises to $7.20", "Market: $36,000.", "Bread co. still pays $30,000."], C.up, 6.7, 10],
          [["Not an option", "Neither side can walk away,", "unless they close it first."], C.gold, 10.2, 13],
          [["Speculators", "Trade the agreement itself,", "never touching a bushel."], C.cyan, 13.2, null]
        ]);
        return s + stamp(L, "Illustrative · made-up prices, deal from the video");
      }
    };
  }

  /* =====================================================================
     One gold contract, marked to market every day
     ===================================================================== */
  var SETTLE = [2000, 2012, 2004, 1995, 1986, 1994, 2008, 2021];
  var IM = 10000, MM = 9000, OZ = 100;
  function marginSpec() {
    var BAL = [IM], dep = [0];
    for (var d = 1; d < SETTLE.length; d++) {
      var b = BAL[d - 1] + (SETTLE[d] - SETTLE[d - 1]) * OZ;
      BAL.push(b); dep.push(0);
    }
    /* day 4 drops under maintenance: top back up to initial */
    var CALL = 4, TOP = IM - BAL[CALL];
    for (var k = CALL + 1; k < BAL.length; k++) BAL[k] += TOP;
    var r = rng(5), B = SETTLE.map(function (cl, i) {
      var o = i ? SETTLE[i - 1] : 1996;
      return { o: o, h: Math.max(o, cl) + 2 + r() * 3, l: Math.min(o, cl) - 2 - r() * 3, c: cl };
    });
    var ST = [
      { at: 0, title: "Open the trade", text: "Long one gold contract at $2,000. It's 100 ounces, about $200,000 of gold, so every $1 move is $100. You deposit $10,000 of initial margin." },
      { at: 3, title: "Settled every day", text: "Made-up settlements. Each day's gain or loss is paid in cash: +$1,200, then −$800, then −$900. The balance moves whether you look at it or not." },
      { at: 7, title: "Below maintenance", text: "Day 4 settles at $1,986. The balance falls to $8,600, under the $9,000 maintenance level (made up). Margin call: deposit $1,400 to get back to $10,000." },
      { at: 11, title: "Or the broker closes it", text: "If you don't add the money, or the market keeps running against you, the broker can close the trade for you. Here that would lock in a $1,400 loss." },
      { at: 14, title: "Close with the opposite trade", text: "You add the $1,400 and hold. Gold rallies, and you sell one contract at $2,021 to close: $21 × 100 ounces = +$2,100." }
    ];
    return {
      stages: ST, end: 20, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "", N = SETTLE.length;
        var gp = n ? { x0: 14, x1: L.W - 62, y0: 160, y1: 380 } : { x0: 46, x1: 750, y0: 60, y1: 250 };
        var ga = n ? { x0: 14, x1: L.W - 62, y0: 450, y1: 700 } : { x0: 46, x1: 750, y0: 310, y1: 480 };
        var cp = ctx(L, N, 1974, 2030, gp), ca = ctx(L, N, 7000, 14000, ga);
        var cnt = track([[0, 0], [0.4, 1], [3, 1], [3.2, 1], [6.5, 4], [7, 4], [8, 5], [14, 5], [17.5, 8]], T);
        s += hgrid(gp.x0, gp.x1, cp.Y, 1980, 2030, 10, function (v) { return "$" + fmt(v); });
        s += hgrid(ga.x0, ga.x1, ca.Y, 7000, 14000, 1000, function (v) { return "$" + fmt(v / 1000) + "k"; });
        s += txt(gp.x0, gp.y0 - 18, n ? "Gold, daily settle · made up" : "Gold futures, daily settlement · made-up prices", C.faint, 12, "start", 600);
        s += txt(ga.x0, ga.y0 - 18, n ? "Your account balance" : "Your account balance after each settlement", C.faint, 12, "start", 600);
        for (var i = 0; i < N; i++) s += txt(cp.X(i), ga.y1 + 22, i === 0 ? (n ? "Buy" : "Buy") : (n ? "D" + i : "Day " + i), C.faint, 11, "middle");
        s += lvl(cp, 2000, C.ink, null, fade(T, 0.4, 0.3), "4 4", false, 1.2);
        s += tag(gp.x1 - 2, cp.Y(2000) - 13, n ? "entry $2,000" : "long 1 at $2,000", C.ink, win(T, 0.4, 13.6), "end");
        s += drawBars(B, cp.X, cp.Y, cnt, cp.bw);
        /* account columns */
        s += lvl(ca, IM, C.blue, null, fade(T, 0.8, 0.4), "6 4");
        s += lvl(ca, MM, C.orange, null, fade(T, 1.2, 0.4), "6 4");
        var levTags = tag(ga.x1 - 2, ca.Y(IM) - 13, "initial $10,000", C.blue, fade(T, 0.8, 0.4), "end") +
          tag(ga.x1 - 2, ca.Y(MM) + 15, n ? "maint. $9,000" : "maintenance $9,000 (made up)", C.orange, fade(T, 1.2, 0.4), "end");
        var full = Math.floor(cnt), calLab = null;
        for (var d = 0; d < N && d < Math.ceil(cnt); d++) {
          var p = d < full ? 1 : cnt - full; if (p <= 0) continue;
          var raw = d === 0 ? IM : (d <= CALL ? BAL[d] : BAL[d]);
          var prev = d === 0 ? IM : BAL[d - 1] + (d === CALL + 1 ? 0 : 0);
          var shown = d === CALL ? IM - TOP : raw;
          var col = d === 0 ? C.blue : d === CALL ? C.dn : (SETTLE[d] >= SETTLE[d - 1] ? C.up : C.dn);
          var h = (ca.Y(7000) - ca.Y(shown)) * p;
          s += rect(ca.X(d) - ca.bw / 2, ca.Y(7000) - h, ca.bw, h, col, 3, 0.8);
          if (p >= 1) {
            if (d === CALL) { calLab = [ca.X(d), ca.Y(shown) + 18, n ? "8.6k" : "$" + fmt(shown)]; }
            var chg = d === 0 ? null : (SETTLE[d] - SETTLE[d - 1]) * OZ;
            if (d !== CALL) s += txt(ca.X(d), ca.Y(shown) - 8, n ? fmt(shown / 1000, 1) + "k" : "$" + fmt(shown), C.dim, 11, "middle", 600);
            if (chg != null && !n) s += txt(cp.X(d), cp.Y(B[d].l) + 18, (chg > 0 ? "+$" : "−$") + fmt(Math.abs(chg)), chg > 0 ? C.up : C.dn, 11, "middle", 700);
            if (chg != null && n) s += txt(cp.X(d), cp.Y(B[d].l) + 18, (chg > 0 ? "+" : "−") + fmt(Math.abs(chg) / 1000, 1) + "k", chg > 0 ? C.up : C.dn, 11, "middle", 700);
          }
          void prev;
        }
        /* margin call: top-up segment on day 4 */
        var oc = fade(T, 8.3, 0.4);
        if (oc > 0 && cnt >= CALL + 1) {
          s += rect(ca.X(CALL) - ca.bw / 2, ca.Y(IM), ca.bw, ca.Y(IM - TOP) - ca.Y(IM), C.gold, 3, 0.9 * oc);
          s += pill(ca.X(CALL), ca.Y(IM) - 24, n ? "call +$1.4k" : "margin call +$1,400", C.gold, oc, "middle");
        }
        if (calLab) s += txt(calLab[0], calLab[1], calLab[2], C.ink, 11, "middle", 700);
        s += levTags;
        /* broker closes: ghost */
        var ob = win(T, 11, 14);
        if (ob > 0) {
          s += cross(cp.X(CALL), cp.Y(SETTLE[CALL]), C.dn, ob);
          s += tag(cp.X(CALL) + 14, cp.Y(SETTLE[CALL]) + 22, n ? "closed: −$1,400" : "broker closes it: −$1,400", C.dn, ob, "start");
        }
        var oe = fade(T, 17.6, 0.4);
        if (oe > 0) {
          s += dot(cp.X(N - 1), cp.Y(SETTLE[N - 1]), 6, C.up, oe);
          s += tag(cp.X(N - 1) - 10, cp.Y(SETTLE[N - 1]) - 18, n ? "sell 1 · +$2,100" : "sell 1 at $2,021 · +$2,100", C.up, oe, "end");
        }
        s += notes(ca, T, [
          [["Long 1 gold at $2,000", "100 oz: about $200,000.", "Deposit: $10,000."], C.blue, 0.3, 3],
          [["Settled every day", "Each $1 move is $100:", "+$1,200, −$800, −$900."], C.ink, 3.2, 7],
          [["Margin call", "Day 4: balance $8,600,", "under $9,000. Add $1,400."], C.gold, 7.2, 11],
          [["Don't add it?", "The broker can close it,", "locking in −$1,400."], C.dn, 11.2, 14],
          [["Close: sell 1 at $2,021", "+$21 × 100 oz = +$2,100", "on $11,400 put in."], C.up, 14.2, null]
        ]);
        return s + stamp(L, "Illustrative · made-up settlements and maintenance level");
      }
    };
  }

  /* =====================================================================
     The futures curve: contango, backwardation, and April 20, 2020
     ===================================================================== */
  function curveSpec() {
    var N = 7;
    var SPOT = [70, 70, 70, 70, 70, 70, 70];
    var CONT = [70, 70.8, 71.5, 72.1, 72.6, 73.0, 73.3];
    var BACK = [70, 69.0, 68.2, 67.5, 66.9, 66.4, 66.0];
    var NEG = [null, -37.63, 20.4, 26, 28.5, 30, 31];
    var ST = [
      { at: 0, title: "Spot vs futures", text: "Made-up oil prices. Spot is the price right now. A futures price is the market's guess for a later date, plus the cost of storage, interest and insurance until then." },
      { at: 3, title: "Contango", text: "Line up each expiry month and you get the curve. When later months cost more than spot, that's contango, common for things that are costly to store." },
      { at: 6.5, title: "Backwardation", text: "When later months cost less than spot, that's backwardation: high demand or a shortage right now, so people pay more today than they expect to later." },
      { at: 10, title: "April 20, 2020", text: "Lockdowns crushed demand and storage filled up. The expiring May crude contract settled at −$37.63, while later months stayed positive (approximate here)." },
      { at: 13.5, title: "Why it went negative", text: "The May contract was physically settled. Holders with nowhere to put 1,000 barrels paid others to take it. Not worthless oil: a worthless obligation, for a short window." }
    ];
    return {
      stages: ST, end: 17, size: sizeStd,
      frame: function (T, L) {
        var m = ease(fade(T, 10, 1.2));
        var lo = lerp(62, -45, m), hi = lerp(76, 40, m);
        var c = ctx(L, N, lo, hi), s = "";
        var step = m < 0.5 ? 2 : 10;
        s += hgrid(c.g.x0, c.g.x1, c.Y, lo, hi, step, function (v) { return (v < 0 ? "−$" : "$") + fmt(Math.abs(v)); }, 1);
        s += title(c, m < 0.5 ? "Crude oil futures curve · made-up prices" : "WTI crude oil futures, April 20, 2020 · later months approximate", m < 0.5 ? "Oil curve · made up" : "WTI, Apr 20, 2020");
        var LAB = m < 0.5 ? ["Spot", "+1 mo", "+2 mo", "+3 mo", "+4 mo", "+5 mo", "+6 mo"] : ["", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
        LAB.forEach(function (lb, k) { s += txt(c.X(k), c.g.y1 + 22, lb, C.faint, 11, "middle"); });
        if (lo < 0) s += lvl(c, 0, C.ink, "$0", m, null, true, 1.6);
        var cur;
        if (T < 3) cur = SPOT;
        else if (T < 6.5) { var a = ease(fade(T, 3, 1.4)); cur = SPOT.map(function (v, i) { return lerp(v, CONT[i], a); }); }
        else if (T < 10) { var b = ease(fade(T, 6.5, 1.4)); cur = CONT.map(function (v, i) { return lerp(v, BACK[i], b); }); }
        else cur = BACK.map(function (v, i) { return NEG[i] == null ? v : lerp(v, NEG[i], m); });
        if (T < 3) {
          s += dot(c.X(0), c.Y(70), 8, C.ink, fade(T, 0.3, 0.3));
          s += tag(c.X(0) + 14, c.Y(70) + 24, "spot $70", C.ink, fade(T, 0.3, 0.3), "start");
          var of = fade(T, 1, 0.4);
          s += dot(c.X(3), c.Y(71.5), 8, C.gold, of);
          s += tag(c.X(3), c.Y(71.5) - 22, "3-month future $71.50", C.gold, of, "middle");
          s += arrow(c.X(0) + 12, c.Y(70.2), c.X(3) - 12, c.Y(71.4), C.gold, of, "4 4");
          s += tag(c.X(1.5), c.Y(70.8) + 34, "storage · interest · insurance", C.dim, fade(T, 1.6, 0.4), "middle");
        } else {
          var pts = [], col = T < 6.5 ? C.up : T < 10 ? C.orange : C.dn;
          cur.forEach(function (v, i) { if (m > 0.98 && i === 0) return; pts.push([c.X(i), c.Y(v)]); });
          s += poly(pts, col, 3);
          cur.forEach(function (v, i) {
            if (m > 0.98 && i === 0) return;
            s += dot(c.X(i), c.Y(v), i === 0 ? 8 : 6, i === 0 ? C.ink : col, 1);
          });
          if (T < 10) s += tag(c.X(6) - 6, c.Y(cur[6]) + (T < 6.5 ? -22 : 24), T < 6.5 ? "contango: later costs more" : "backwardation: later costs less", col, fade(T, T < 6.5 ? 4.4 : 7.9, 0.4) * (1 - fade(T, 9.8, 0.2)), "end");
          var on = fade(T, 11.2, 0.4);
          if (on > 0) {
            s += tag(c.X(1) + 14, c.Y(-37.63), "May settles −$37.63", C.dn, on, "start");
            s += tag(c.X(2), c.Y(20.4) - 22, n2(c) ? "Jun ~$20" : "June about $20", C.dim, on, "middle");
          }
        }
        s += notes(c, T, [
          [["Spot vs futures", "Futures = expectations plus", "storage, interest, insurance."], C.gold, 0.3, 3],
          [["Contango", "Later months higher.", "Costly-to-store goods."], C.up, 3.2, 6.5],
          [["Backwardation", "Later months lower.", "Demand or shortage now."], C.orange, 6.7, 10],
          [["April 20, 2020", "Storage full. May crude", "settles at −$37.63."], C.dn, 10.2, 13.5],
          [["Why negative?", "Physical delivery, nowhere", "to store it: pay to get out."], C.dn, 13.7, null]
        ]);
        return s + stamp(L, m < 0.5 ? "Illustrative · made-up prices" : "May settlement from the record · later months approximate");
      }
    };
  }
  function n2(c) { return c.n; }

  var SPECS = { deal: dealSpec, margin: marginSpec, curve: curveSpec };
  document.querySelectorAll("[data-fb-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-fb-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     What a move is worth: contract size, ticks and P&L
     ===================================================================== */
  var CONTRACTS = {
    cl:  { name: "Crude oil", mult: 1000, unit: "barrels", tick: 0.01, dp: 2, e: 70.00, x: 71.00 },
    gc:  { name: "Gold", mult: 100, unit: "troy ounces", tick: 0.10, dp: 1, e: 2000.0, x: 2010.0 },
    es:  { name: "E-mini S&P 500", mult: 50, unit: "× the index", tick: 0.25, dp: 2, e: 6000.00, x: 6010.00 },
    mes: { name: "Micro E-mini S&P 500", mult: 5, unit: "× the index", tick: 0.25, dp: 2, e: 6000.00, x: 6010.00 }
  };
  (function () {
    var root = document.querySelector("[data-fb-calc]");
    if (!root) return;
    var out = root.querySelector("[data-calc-out]"), cur = "cl";
    function el(n) { return root.querySelector("[name=" + n + "]"); }
    function pick(k, setVals) {
      cur = k;
      root.querySelectorAll("[data-c]").forEach(function (b) { var on = b.getAttribute("data-c") === k; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
      if (setVals) { el("entry").value = CONTRACTS[k].e.toFixed(CONTRACTS[k].dp); el("exit").value = CONTRACTS[k].x.toFixed(CONTRACTS[k].dp); }
      run();
    }
    function run() {
      var c = CONTRACTS[cur], side = +el("side").value, e = parseFloat(el("entry").value), x = parseFloat(el("exit").value), q = Math.max(1, Math.round(parseFloat(el("qty").value) || 1));
      if (!isFinite(e) || !isFinite(x) || e <= 0) { out.innerHTML = '<p class="calc-note">Enter an entry and an exit price.</p>'; return; }
      var pts = (x - e) * side, ticks = pts / c.tick, pl = pts * c.mult * q, tv = c.tick * c.mult;
      out.innerHTML = '<div class="calc-out">' +
        "<div><span>Contract value</span><b>" + usd(e * c.mult * q) + "</b></div>" +
        "<div><span>Move in your favor</span><b>" + (pts < 0 ? "−" : "") + fmt(Math.abs(x - e), c.dp) + "</b></div>" +
        "<div><span>Ticks</span><b>" + (ticks < 0 ? "−" : "") + fmt(Math.abs(ticks), Math.abs(ticks % 1) > 0.001 ? 1 : 0) + "</b></div>" +
        '<div><span>Profit or loss</span><b class="' + (pl >= 0 ? "pos" : "neg") + '">' + (pl >= 0 ? "+" : "") + usd(pl) + "</b></div></div>" +
        '<p class="calc-note">' + c.name + ": " + fmt(c.mult) + " " + c.unit + ". One tick is " + fmt(c.tick, 2) + ", worth " + usd(tv, 2) + " per contract; a 1-point move is " + usd(c.mult) + " per contract" + (q > 1 ? ", " + usd(c.mult * q) + " on " + q + " contracts" : "") + ".</p>";
    }
    root.querySelectorAll("[data-c]").forEach(function (b) { b.addEventListener("click", function () { pick(b.getAttribute("data-c"), true); }); });
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    pick("cl", false);
  })();

  /* =====================================================================
     Leverage and the room before a margin call
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-fb-lev]");
    if (!root) return;
    var out = root.querySelector("[data-lev-out]");
    function val(n) { return parseFloat(root.querySelector("input[name=" + n + "]").value); }
    function run() {
      var v = val("val"), im = val("im"), mm = val("mm"), mv = val("mv");
      if ([v, im, mm, mv].some(function (x) { return !isFinite(x); }) || v <= 0 || im <= 0) { out.innerHTML = '<p class="calc-note">Fill in every box.</p>'; return; }
      if (mm >= im) { out.innerHTML = '<p class="calc-note">Maintenance margin sits below the initial margin.</p>'; return; }
      var lev = v / im, dmv = v * mv / 100, pct = dmv / im * 100, room = (im - mm) / v * 100, wipe = im / v * 100;
      out.innerHTML = '<div class="calc-out">' +
        "<div><span>Leverage</span><b>" + fmt(lev, lev < 10 ? 1 : 0) + "×</b></div>" +
        "<div><span>A " + fmt(mv, mv % 1 ? 1 : 0) + "% move</span><b>" + usd(dmv) + "</b></div>" +
        '<div><span>Of your deposit</span><b class="' + (pct >= 50 ? "neg" : "") + '">' + fmt(pct, 0) + "%</b></div>" +
        "<div><span>Room to a margin call</span><b>" + fmt(room, room < 1 ? 2 : 1) + "%</b></div></div>" +
        '<div class="meter" aria-hidden="true"><i style="width:' + Math.min(100, pct).toFixed(1) + '%"></i></div>' +
        '<p class="calc-note">Every 1% move in the contract is ' + usd(v / 100) + ", " + fmt(lev, lev < 10 ? 1 : 0) + "% of your deposit. A move of " + fmt(room, room < 1 ? 2 : 1) + "% against you (" + usd(im - mm) + ") triggers a margin call, and " + fmt(wipe, 1) + "% against you wipes out the whole deposit." + (pct > 100 ? " This move is bigger than the deposit: you'd owe the broker the difference." : "") + "</p>";
    }
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     Before your first futures trade, as a click-through stepper.
     Without the script the five show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-fb-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "Contract", c: C.blue,   tag: "Size, tick, tick value" },
      { k: "Margin",   c: C.gold,   tag: "Initial and maintenance" },
      { k: "Risk",     c: C.dn,     tag: "Dollars, not points" },
      { k: "Calendar", c: C.orange, tag: "Expiry and settlement" },
      { k: "Liquidity", c: C.up,    tag: "Where the volume is" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Before your first futures trade");
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
      function bx(x, y, w, h, col, op) { return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" rx="8" fill="' + col + '"' + (op != null ? ' opacity="' + op + '"' : "") + "/>"; }
      var top = 30, bot = H - 54;
      if (k === 0) {
        var rows = [["Crude oil", "1,000 bbl", "tick $10"], ["Gold", "100 oz", "$1 = $100"], ["E-mini S&P", "$50 × index", "tick $12.50"]];
        var rh = (bot - top) / 3;
        rows.forEach(function (r, i) {
          var y = top + i * rh;
          s += bx(30, y + 4, W - 60, rh - 10, "#2c2c2e");
          if (narrow) {
            s += t(48, y + rh * 0.42, r[0], C.blue, 14, "start", 700);
            s += t(48, y + rh * 0.42 + 26, r[1] + " · " + r[2], C.ink, 13, "start", 600);
          } else {
            s += t(50, y + rh / 2 + 4, r[0], C.blue, 15, "start", 700);
            s += t(250, y + rh / 2 + 4, r[1], C.ink, 15, "start", 600);
            s += t(W - 50, y + rh / 2 + 4, r[2], C.gold, 15, "end", 700);
          }
        });
        s += t(30, bot + 34, "Set by the exchange. You can't change it.", C.dim, 12, "start", 500);
      } else if (k === 1) {
        var base = bot - (narrow ? 40 : 4), full = base - top - 16;
        s += bx(70, base - full, 150, full, C.blue, 0.35);
        s += t(145, base - full / 2, "$200,000", C.ink, 15, "middle", 700);
        s += t(145, base + 22, "contract value", C.dim, 12, "middle", 600);
        var dh = full * 0.05;
        s += bx(320, base - dh, 150, dh, C.gold, 0.9);
        s += t(395, base - dh - 14, "$10,000 deposit", C.gold, 14, "middle", 700);
        s += t(395, base + 22, "initial margin", C.dim, 12, "middle", 600);
        s += t(narrow ? 300 : 320, top + 30, "0.5% against you", C.dn, 14, "start", 700);
        s += t(narrow ? 300 : 320, top + 30 + 22 * F, "= margin call", C.dn, 14, "start", 700);
        s += t(30, bot + 34, "Gold example. 20× leverage.", C.dim, 12, "start", 500);
      } else if (k === 2) {
        var items = [["8", "ticks to stop"], ["$12.50", "per tick"], ["2", "contracts"], ["$200", "at risk"]];
        var cw = narrow ? (W - 60) / 2 : (W - 60) / 4;
        items.forEach(function (q, i) {
          var cx = narrow ? 30 + (i % 2) * cw : 30 + i * cw, cy = narrow ? top + 10 + Math.floor(i / 2) * 150 : top + 60;
          s += bx(cx + 6, cy, cw - 12, 110, i === 3 ? C.dn : "#2c2c2e", i === 3 ? 0.3 : 1);
          s += t(cx + cw / 2, cy + 52, q[0], i === 3 ? C.dn : C.ink, 22, "middle", 800);
          s += t(cx + cw / 2, cy + 84, q[1], C.dim, 12, "middle", 600);
          if (i < 3 && !narrow) s += t(cx + cw, cy + 60, i < 2 ? "×" : "=", C.faint, 20, "middle", 700);
        });
        s += t(30, bot + 34, "E-mini S&P, 2-point stop. Gaps can blow past it.", C.dim, 12, "start", 500);
      } else if (k === 3) {
        var y = (top + bot) / 2, x0 = 40, x1 = W - 40;
        s += ln(x0, y, x1, y, "#3a3a3c", 3);
        s += '<circle cx="' + x0 + '" cy="' + y + '" r="7" fill="' + C.blue + '"/>' + t(x0, y + 30, "open", C.blue, 12, "start", 700);
        var xr = x0 + (x1 - x0) * 0.68, xe = x1 - 10;
        s += bx(xr - 50, y - 22, 100, 44, C.up, 0.25) + t(xr, y - 32, "close or roll", C.up, 13, "middle", 700);
        s += ln(xe, y - 40, xe, y + 40, C.dn, 3) + t(xe, y + 62, "expiry", C.dn, 13, "end", 700);
        s += t(xe, y - 52, narrow ? "delivery?" : "delivery or cash?", C.dn, 12, "end", 600);
        s += t(30, bot + 34, "\"Your 1,000 barrels are ready for pickup.\"", C.dim, 12, "start", 500);
      } else {
        var mid = (top + bot) / 2, colw = (W - 80) / 2;
        [["liquid", 0.25, C.up, "you get your price"], ["thin", 2.5, C.dn, "you give up the gap"]].forEach(function (q, i) {
          var cx = 40 + i * (colw + 20) + colw / 2, gap = q[1] * 22;
          s += t(cx, top + 14, q[0], q[2], 14, "middle", 700);
          s += bx(cx - 60, mid - gap / 2 - 30, 120, 30, C.up, 0.3) + t(cx, mid - gap / 2 - 10, "ask", C.ink, 12, "middle", 600);
          s += bx(cx - 60, mid + gap / 2, 120, 30, C.dn, 0.3) + t(cx, mid + gap / 2 + 20, "bid", C.ink, 12, "middle", 600);
          s += t(cx, bot - 4, q[3], C.dim, 12, "middle", 600);
        });
        s += t(30, bot + 34, "The front month of the big contracts trades most.", C.dim, 12, "start", 500);
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

  if (typeof window !== "undefined") window.__fb = { SPECS: SPECS };
})();
