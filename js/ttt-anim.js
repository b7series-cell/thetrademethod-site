/* =====================================================================
   ttt-anim.js — the animated walkthroughs on thesis-to-trade.html
   (Vincent Desiano's "my entire trading system" live stream).

     [data-ttt-anim="zones"]     build the levels on the higher time frames: group the
                                 lowest low and the lows near it into one zone
     [data-ttt-anim="story"]     think through the levels: structure, the lower high
                                 under 7,600, the game plan for Monday
     [data-ttt-anim="reclaim"]   read the price action at the level: slide, sweep,
                                 reclaim, retest, the "reclaim ripper" long
     [data-ttt-anim="frontrun"]  idea vs entry: front-running the retest vs waiting
                                 for confirmation (the 28,340 break and retest)
     [data-ttt-anim="pdl"]       Friday: no level, no trade; don't short into the 200 MA
                                 or the PDL; short the break and retest of the PDL,
                                 then hold it with intraday structure and the cloud
     [data-ttt-steps]            "every morning, thesis to trade" as a click-through stepper

   Same player as amt-anim.js: each chart redraws in a narrow layout on a
   phone instead of scrolling sideways, and on a phone the callouts sit in a
   band above the chart so they never cover it.

   The levels are the ones named in the video; every bar is made up.
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

  /* =====================================================================
     1 · Build the levels on the higher time frames
     ===================================================================== */
  function zonesSpec() {
    var N = 64, lo = 7270, hi = 7720;
    var CL = noisy(N, [[0, 7480], [7, 7340], [15, 7560], [22, 7372], [30, 7630], [35, 7540], [42, 7650], [46, 7560], [50, 7352], [54, 7480], [58, 7655], [61, 7560], [63, 7585]], 14, 31);
    var B = mkBars(CL, 7470, 32, 16);
    clampBars(B, 7324, 7662);
    B[7].l = 7322; B[22].l = 7358; B[50].l = 7341; B[30].h = 7648; B[42].h = 7660; B[58].h = 7665; B[57].h = Math.max(B[57].h, 7652);
    var LOWS = [[7, 7322], [22, 7358], [50, 7341]], HIGHS = [[30, 7648], [42, 7660], [58, 7665]];
    var ST = [
      { at: 0, title: "Start on the daily", text: "Every level starts on the weekly, daily, 4-hour or hourly chart, never lower. An intraday trade should come off a major inflection point, not a little pivot from yesterday." },
      { at: 3.6, title: "The lowest low, and the lows near it", text: "Find the clearest daily low (7,322 here). Then look for the other lows close to it. Mark only the 7,322 line and you'll miss that the lows at 7,341 and 7,358 sit right on top of it." },
      { at: 6.8, title: "Group them into one zone", text: "Put a zone between the lowest low and the highest low near it: 7,322 to 7,358. Keep it within reason, about 20 to 30 points on the S&P (roughly 100 on the Nasdaq). The more touches, the better." },
      { at: 9.8, title: "Supply on the 4-hour", text: "Same idea at the highs: 7,648 to 7,665, with highs, lows and a fresh rejection all inside it. That's the next supply." },
      { at: 12.4, title: "Nothing above the extreme", text: "No need to draw levels above a high that's clearly rejecting. If price gets above it, add levels the next day. It saves time, and the big zones stay on the chart until they break." },
      { at: 14.6, title: "Fill in on the hourly", text: "Between the extremes, add the hourly levels: the 7,469 to 7,490 demand and the 7,590 to 7,600 area. These are the only places you'll look for an entry." }
    ];
    return {
      stages: ST, end: 19, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [3.4, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        s += axis(g, lo, hi, 100, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "S&P future · daily (made-up bars)" : "S&P 500 future · daily bars (made up, levels from the video)", C.faint, 12, "start", 600);
        var dz = fade(T, 7, 0.6);
        s += band(g.x0, g.x1, Y, 7322, 7358, C.blue, dz);
        if (dz > 0) post += tag(g.x0 + 4, Y(7322) + 16, n ? "demand 7,322–7,358" : "daily demand zone · 7,322 – 7,358", C.blue, dz, "start");
        var sz = fade(T, 10, 0.6);
        s += band(g.x0, g.x1, Y, 7648, 7665, C.dn, sz);
        if (sz > 0) post += tag(g.x0 + 4, Y(7665) - 14, n ? "supply 7,648–7,665" : "4-hour supply · 7,648 – 7,665", C.dn, sz, "start");
        var no = win(T, 12.6, 14.6);
        if (no > 0) { s += rect(g.x0, g.y0, g.x1 - g.x0, Y(7672) - g.y0, C.grey, 3, 0.12 * no); s += tag((g.x0 + g.x1) / 2, (g.y0 + Y(7672)) / 2, n ? "no levels up here" : "no levels above the extreme, for now", C.grey, no, "middle"); }
        var hz = fade(T, 14.8, 0.6);
        s += band(g.x0, g.x1, Y, 7469, 7490, C.up, hz, 0.14);
        s += band(g.x0, g.x1, Y, 7590, 7600, C.orange, hz, 0.14);
        if (hz > 0) { post += tag(g.x1 - 4, Y(7469) + 16, n ? "1h 7,469–7,490" : "hourly demand · 7,469 – 7,490", C.up, hz, "end"); post += tag(g.x1 - 4, Y(7600) - 14, n ? "1h 7,590–7,600" : "hourly · 7,590 – 7,600", C.orange, hz, "end"); }
        s += drawBars(B, X, Y, cnt, bw) + post;
        var lo1 = fade(T, 3.8, 0.4), lo2 = fade(T, 5, 0.4);
        if (lo1 > 0) { s += dot(X(7), Y(7322) + 8, 6, C.cyan, lo1, true); s += tag(X(7), Y(7322) + 30, "7,322", C.cyan, lo1 * (1 - fade(T, 7, 0.3)), "middle"); }
        [[1, 22, 7358], [2, 50, 7341]].forEach(function (p) {
          if (lo2 > 0) { s += dot(X(p[1]), Y(p[2]) + 8, 6, C.cyan, lo2, true); s += tag(X(p[1]), Y(p[2]) + 30, fmt(p[2]), C.cyan, lo2 * (1 - fade(T, 7, 0.3)), "middle"); }
        });
        var hiO = fade(T, 10.2, 0.5);
        HIGHS.forEach(function (p) { s += dot(X(p[0]), Y(p[1]) - 8, 6, C.dn, hiO * (1 - 0.5 * fade(T, 12.4, 0.3)), true); });
        s += note2(g, ["Higher time frames only", "Weekly, daily, 4-hour, hourly.", "Never lower than the hourly", "for building levels."], C.cyan, win(T, 0.4, 3.6));
        s += note2(g, ["The lowest low + the lows", "near it: 7,322, 7,341, 7,358.", "One line would miss the", "other two."], C.cyan, win(T, 3.8, 6.8));
        s += note2(g, ["One zone: 7,322 – 7,358", "Lowest low to highest low.", "About 20–30 pts on the ES,", "~100 on the Nasdaq."], C.blue, win(T, 7, 9.8));
        s += note2(g, ["4-hour supply", "7,648 – 7,665: highs, lows", "and a fresh rejection.", "More touches, more trust."], C.dn, win(T, 10, 12.4));
        s += note2(g, ["Skip what's above", "No levels above a high", "that's clearly rejecting.", "Adjust if it breaks."], C.grey, win(T, 12.6, 14.6));
        s += note2(g, ["Fill in on the hourly", "7,469 – 7,490 demand and", "7,590 – 7,600. Only these", "zones get your attention."], C.up, fade(T, 14.8, 0.4));
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     2 · Think through the levels: the story and the game plan
     ===================================================================== */
  function storySpec() {
    var N = 46, lo = 7440, hi = 7720;
    var CL = noisy(N, [[0, 7500], [5, 7565], [8, 7540], [13, 7612], [16, 7585], [21, 7660], [24, 7618], [27, 7640], [31, 7570], [36, 7596], [41, 7515], [45, 7508]], 6, 41);
    var B = mkBars(CL, 7495, 42, 8);
    B[5].h = 7568; B[8].l = 7538; B[13].h = 7614; B[16].l = 7583; B[21].h = 7665; B[24].l = 7616; B[31].l = 7562; B[36].h = 7598; B[44].l = 7503;
    for (var i = 33; i < 40; i++) B[i].h = Math.min(B[i].h, 7598);
    var ST = [
      { at: 0, title: "Stair-stepping higher", text: "Before Friday the S&P was building a clean bullish structure: each push makes a new high, and the old highs turn into the new lows. One, two, three." },
      { at: 4.6, title: "Highs turn into lows", text: "As long as that structure lasts, you look for the direction to continue. The old highs at 7,565 and 7,612 held as support on the way up." },
      { at: 8.2, title: "Structure lost", text: "How do you know when it flips? The market loses the structure: it breaks back under the last higher low and a previous high turns back into a ceiling." },
      { at: 11.4, title: "A lower high under 7,600", text: "The bounce stalls under the 7,590 to 7,600 level, and the S&P had also rejected a daily 20 SMA and a triple top. The bulls couldn't hold the key lows." },
      { at: 14.6, title: "The game plan", text: "Monday's plan, written before the open: if the S&P pushes back into 7,600 and starts to fail, fade it toward Friday's low or the 7,469 to 7,490 demand. If it never gets there, no trade." }
    ];
    return {
      stages: ST, end: 19, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var NS = 58, X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / NS; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [4.4, 25], [8, 33], [11.2, 38], [14.4, 46]], T), bw = (g.x1 - g.x0) / NS * 0.62;
        s += axis(g, lo, hi, 50, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "S&P future · hourly (made up)" : "S&P 500 future · hourly bars (made up)", C.faint, 12, "start", 600);
        var zo = fade(T, 11.6, 0.5);
        s += band(g.x0, g.x1, Y, 7590, 7600, C.orange, zo);
        var dz = fade(T, 14.8, 0.5);
        s += band(g.x0, g.x1, Y, 7469, 7490, C.up, dz);
        if (dz > 0) s += tag(g.x0 + 4, Y(7469) + 16, n ? "7,469–7,490" : "demand 7,469 – 7,490", C.up, dz, "start");
        /* old highs carried forward as the new lows */
        var so = fade(T, 4.8, 0.5) * (1 - 0.6 * fade(T, 8.4, 0.4));
        [[5, 7568, 8, 7565], [13, 7614, 16, 7612]].forEach(function (p, k) {
          s += line(X(p[0]), Y(p[1]), X(p[2] + 6), Y(p[3]), C.cyan, 1.6, "5 4", so);
          s += tag(X(p[0]), Y(p[1]) - 14, String(k + 1), C.cyan, so, "middle");
        });
        s += tag(X(21), Y(7665) - 14, "3", C.cyan, so, "middle");
        s += drawBars(B, X, Y, cnt, bw);
        var bo = fade(T, 8.4, 0.4);
        if (bo > 0) { s += line(X(22), Y(7616), X(34), Y(7616), C.dn, 1.8, "6 4", bo); s += tag(X(30) + 4, Y(7616) - 14, n ? "structure lost" : "last higher low lost", C.dn, bo, "start"); }
        var lh = fade(T, 11.6, 0.4);
        if (lh > 0) { s += frameRect(X(36) - bw, Y(7604), bw * 2, 30, C.orange, 2, lh); s += tag(X(36), Y(7604) - 16, "lower high", C.orange, lh, "middle"); }
        var fl = fade(T, 11.6, 0.4);
        if (fl > 0) { s += line(X(40), Y(7503), g.x1, Y(7503), C.dim, 1.4, "4 4", fl); s += tag(X(42), Y(7503) + 16, "Friday's low", C.dim, fl, "middle"); }
        var pl = fade(T, 14.8, 0.5), p2 = fade(T, 15.8, 0.5);
        if (pl > 0) {
          s += arrow(X(45) + bw, Y(7512), X(50), Y(7592), C.grey, pl, "5 5");
          s += tag(X(50), Y(7612) - 6, n ? "push in?" : "push into 7,600?", C.grey, pl, "middle");
        }
        if (p2 > 0) {
          s += arrow(X(50) + 4, Y(7590), X(56), Y(7486), C.dn, p2);
          s += tag(X(56), Y(7486) + 22, n ? "fade it" : "fails: fade it", C.dn, p2, "end");
        }
        s += note2(g, ["Stair-stepping", "New highs; old highs turn", "into new lows. Bullish", "until it isn't."], C.cyan, win(T, 0.4, 4.6));
        s += note2(g, ["Highs turn into lows", "7,565 and 7,612 held on", "the way up. Look for the", "direction to continue."], C.cyan, win(T, 4.8, 8.2));
        s += note2(g, ["Structure lost", "Back under the last", "higher low: the short-term", "picture is flipping."], C.dn, win(T, 8.4, 11.4));
        s += note2(g, ["Lower high under 7,600", "Plus a daily 20 SMA reject", "and a triple top. The", "bulls lost the key lows."], C.orange, win(T, 11.6, 14.6));
        s += note2(g, ["The game plan", "Push into 7,600 and fail?", "Fade to Friday's low or", "7,469 – 7,490. Else: no trade."], C.up, fade(T, 14.8, 0.4));
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     3 · Read the price action at the level: hold, fail, or trap
     ===================================================================== */
  function reclaimSpec() {
    var N = 42, lo = 7430, hi = 7580;
    var CL = [7556, 7550, 7544, 7546, 7537, 7530, 7524, 7527, 7516, 7509, 7502, 7497,
              7492, 7488, 7493, 7487, 7484, 7476, 7468, 7463, 7472, 7486, 7495, 7499,
              7494, 7492, 7496, 7502, 7508, 7515, 7512, 7520, 7528, 7524, 7533, 7541,
              7538, 7547, 7553, 7549, 7558, 7564];
    var B = mkBars(CL, 7560, 51, 3.5);
    B[19] = { o: 7468, h: 7470, l: 7452, c: 7463 }; B[18].l = Math.min(B[18].l, 7464);
    B[20] = { o: 7463, h: 7474, l: 7458, c: 7472 }; B[21] = { o: 7472, h: 7489, l: 7470, c: 7486 };
    B[22] = { o: 7486, h: 7497, l: 7484, c: 7495 }; B[24].l = 7489; B[25].l = 7490; B[25].h = 7495;
    var ST = [
      { at: 0, title: "Sliding: nothing to do", text: "Price slides lower and there's no level in the way. No trade. You can't base a decision on nothing, so you leave it alone and save your attention." },
      { at: 3.6, title: "At the zone: sit up", text: "Now price is in the 7,469 to 7,490 demand. This is where all your attention goes. Being at the level isn't a reason to buy. You need to see something develop." },
      { at: 6, title: "The break: a trap", text: "Expect games here. It breaks under the zone. Anyone who bought blindly at the level is stopped, and anyone who shorted the break is about to be trapped." },
      { at: 8.6, title: "The reclaim", text: "Price gets back above the level. A break can be the best thing that happens, as long as you don't chase it." },
      { at: 11, title: "Retest, higher low, long", text: "It pulls back to the level, holds, and makes a higher low over the last pivot. That's the entry: the sweep, the reclaim, the \"reclaim ripper\". Stop under the higher low." },
      { at: 14.4, title: "The two things to look for", text: "After a level breaks, look for one of two things: a retest that rejects it (trade with the break) or a reclaim that retests and holds (trade against the break, like this one)." }
    ];
    return {
      stages: ST, end: 19, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [3.4, 12], [5.8, 18], [6.6, 20], [8.6, 21], [9.4, 23], [11, 25], [11.6, 27], [14.2, 34], [17.4, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        s += axis(g, lo, hi, 25, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "S&P future · 5-min (made up)" : "S&P 500 future · 5-minute bars (made up)", C.faint, 12, "start", 600);
        var zo = fade(T, 3.8, 0.5), held = fade(T, 8.8, 0.4);
        s += band(g.x0, g.x1, Y, 7469, 7490, held > 0 ? C.up : C.blue, zo);
        s += tag(g.x1 - 4, Y(7469) + 16, n ? "7,469–7,490" : "demand zone 7,469 – 7,490", held > 0 ? C.up : C.blue, zo, "end");
        var sl = win(T, 0.5, 3.6);
        if (sl > 0) s += tag(X(6), Y(7560), n ? "no level · no trade" : "no level in the way · no trade", C.grey, sl, "middle");
        s += drawBars(B, X, Y, cnt, bw);
        var tr = win(T, 6.2, 14.4);
        if (tr > 0) { s += frameRect(X(19) - bw, Y(7470), bw * 2, Y(7450) - Y(7470), C.orange, 2, tr); s += tag(X(19), Y(7452) + 22, n ? "sweep" : "the sweep · a trap", C.orange, tr, "middle"); }
        var rc = win(T, 8.8, 11.2);
        if (rc > 0) { s += frameRect(X(21) - bw, Y(7497), X(22) - X(21) + bw * 2, Y(7470) - Y(7497), C.up, 2, rc); s += tag(X(22) + bw + 4, Y(7505), "reclaim", C.up, rc, "start"); }
        var en = fade(T, 11.2, 0.4);
        if (en > 0) {
          s += riskBox(X(26) - bw, X(41) + bw, Y, 7499, 7486, 7560, en * (1 - 0.4 * fade(T, 14.4, 0.4)));
          s += dot(X(25), Y(7490) + 8, 6, C.up, en, true);
          s += tag(X(26) - bw - 4, Y(7513), n ? "long 7,499" : "long 7,499 over the pivot", C.ink, en, "end");
          s += tag(X(41), Y(7486) + 14, n ? "stop 7,486" : "stop 7,486 · under the higher low", C.dn, en, "end");
        }
        s += note2(g, ["Sliding: nothing to do", "No level in the way.", "Don't fumble into a trade", "with nothing to base it on."], C.grey, win(T, 0.4, 3.6));
        s += note2(g, ["At the zone: sit up", "All your attention, here", "only. Being at a level", "isn't the entry."], C.blue, win(T, 3.8, 6));
        s += note2(g, ["The break: a trap", "Blind buyers stopped,", "breakout shorts about", "to be trapped."], C.orange, win(T, 6.2, 8.6));
        s += note2(g, ["The reclaim", "Back above the level.", "Breaking it can be the", "best thing that happens."], C.up, win(T, 8.8, 11));
        s += note2(g, ["Retest, higher low, long", "Over the last pivot, stop", "under the higher low.", "The reclaim ripper."], C.up, win(T, 11.2, 14.4));
        s += note2(g, ["After any break, two trades", "Retest and reject: go with", "the break. Reclaim and", "hold: go against it."], C.cyan, fade(T, 14.6, 0.4));
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     4 · Idea vs entry: front-running the retest
     ===================================================================== */
  function frontrunSpec() {
    var N = 40, lo = 28240, hi = 28600;
    var CL = [28290, 28302, 28296, 28312, 28320, 28314, 28326, 28333, 28322, 28330,
              28336, 28361, 28378, 28384, 28372, 28364, 28352, 28345, 28349, 28362,
              28376, 28390, 28384, 28402, 28418, 28411, 28430, 28446, 28440, 28458,
              28472, 28466, 28488, 28501, 28495, 28514, 28526, 28520, 28537, 28545];
    var B = mkBars(CL, 28282, 61, 5);
    for (var i = 0; i < 11; i++) B[i].h = Math.min(B[i].h, 28338);
    B[11] = { o: 28336, h: 28366, l: 28333, c: 28361 }; B[14] = { o: 28384, h: 28388, l: 28370, c: 28372 };
    B[16].l = 28344; B[17] = { o: 28352, h: 28355, l: 28331, c: 28345 }; B[18] = { o: 28345, h: 28352, l: 28336, c: 28349 };
    B[19] = { o: 28349, h: 28364, l: 28346, c: 28362 };
    var ST = [
      { at: 0, title: "The idea", text: "A key level at 28,340 on the Nasdaq future, and the plan is a break and retest long. As an idea it's S tier: it ends up doing exactly that." },
      { at: 3, title: "The break", text: "Price breaks above 28,340 and pushes up. Now the job is to wait for the retest." },
      { at: 5.2, title: "Front-running", text: "This is the mistake: trusting the idea so much, with a little FOMO, that you buy the first pullback candle at 28,374, before price has even come back to the level." },
      { at: 7.6, title: "The retest: drawdown", text: "Price comes all the way back to 28,340 and a little under. The early long sits about 43 points in the red, with no confirmation behind it. Sometimes this one doesn't come back." },
      { at: 10.4, title: "Confirmation: the only entry", text: "The retest holds and a candle closes back up over it. That's the entry: 28,362, stop under the retest candle low at 28,330. Better reward-to-risk, and a better win rate." },
      { at: 13.6, title: "Patience pays", text: "It runs about 200 points. You didn't have to get in early. Patience for the level, patience for the retest, patience for it to develop." }
    ];
    return {
      stages: ST, end: 18, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [2.8, 11], [3.2, 12], [5, 14], [5.6, 15], [7.4, 15], [8.4, 18], [10.2, 18], [10.8, 20], [13.4, 26], [16.8, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        s += axis(g, lo, hi, 50, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "Nasdaq future · 2-min (made up)" : "Nasdaq 100 future · 2-minute bars (made up)", C.faint, 12, "start", 600);
        s += line(g.x0, Y(28340), g.x1, Y(28340), C.blue, 2);
        var ce = fade(T, 10.6, 0.4);
        if (ce > 0) s += riskBox(X(19) - bw, X(39) + bw, Y, 28362, 28330, 28545, ce * 0.9);
        s += drawBars(B, X, Y, cnt, bw);
        s += tag(g.x0 + 4, Y(28340) - 16, n ? "key level 28,340" : "key level 28,340 · break and retest long", C.blue, 1 - 0.75 * fade(T, 10.4, 0.4), "start");
        var eo = fade(T, 5.4, 0.4);
        if (eo > 0) {
          s += frameRect(X(14) - bw, Y(28390), bw * 2, Y(28368) - Y(28390), C.orange, 2, eo * (1 - 0.5 * fade(T, 10.4, 0.4)));
          s += line(X(14) - bw, Y(28374), X(N - 1) + bw, Y(28374), C.orange, 1.6, "6 4", eo * (1 - 0.6 * fade(T, 10.4, 0.4)));
          s += tag(X(14), Y(28390) - 14, n ? "early 28,374" : "front-run long 28,374", C.orange, eo * (1 - 0.6 * fade(T, 10.4, 0.4)), "middle");
        }
        var dd = win(T, 7.8, 10.4);
        if (dd > 0) {
          s += line(X(17) + bw + 6, Y(28374), X(17) + bw + 6, Y(28331), C.dn, 2, null, dd);
          s += tag(X(17) + bw + 12, Y(28352), n ? "−43 pts" : "−43 pts on the early long", C.dn, dd, "start");
        }
        if (ce > 0) {
          s += tag(X(19) - bw - 4, Y(28362) - 2, n ? "long 28,362" : "confirmed long 28,362", C.ink, ce, "end");
          s += tag(X(19) + bw + 4, Y(28330) + 14, n ? "stop 28,330" : "stop 28,330 · under the retest low", C.dn, ce, "start");
        }
        var po = fade(T, 13.8, 0.4);
        if (po > 0) s += tag(X(39), Y(28545) - 18, n ? "about +200" : "about +200 points", C.up, po, "end");
        s += note2(g, ["The idea: S tier", "Break and retest long at", "28,340. The idea and the", "entry are two things."], C.blue, win(T, 0.4, 3));
        s += note2(g, ["The break", "Up and away. Don't chase", "it: wait for price to come", "back to the level."], C.blue, win(T, 3.2, 5.2));
        s += note2(g, ["Front-running", "In at 28,374 on the first", "pullback, before the", "retest. FOMO, not a signal."], C.orange, win(T, 5.4, 7.6));
        s += note2(g, ["The retest: drawdown", "Back to 28,340 and under:", "the early long is −43 pts", "with nothing confirming it."], C.dn, win(T, 7.8, 10.4));
        s += note2(g, ["The only entry", "Retest holds, candle closes", "up: long 28,362, stop", "28,330 under the low."], C.up, win(T, 10.6, 13.6));
        s += note2(g, ["Patience pays", "About 200 points, and you", "didn't need the early", "entry to get them."], C.up, fade(T, 13.8, 0.4));
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     5 · Friday: no level, no trade; short the PDL break and retest;
         hold it with intraday structure and the cloud
     ===================================================================== */
  function pdlSpec() {
    var N = 60, lo = 25330, hi = 25700, i;
    var CL = noisy(N, [[0, 25640], [2, 25610], [9, 25520], [12, 25500], [15, 25540], [19, 25485], [22, 25520], [24, 25472], [26, 25456],
                       [28, 25468], [30, 25440], [34, 25420], [37, 25438], [41, 25400], [44, 25414], [48, 25378], [51, 25392], [54, 25360], [57, 25392], [59, 25412]], 5, 71);
    var B = mkBars(CL, 25660, 72, 7);
    B[0] = { o: 25660, h: 25668, l: 25612, c: 25630 };
    B[3].l = Math.min(B[3].l, 25603); B[4].h = Math.min(B[4].h, 25612);
    B[12].l = 25494; B[19].l = 25482;
    B[27] = { o: 25458, h: 25478, l: 25452, c: 25474 }; B[28] = { o: 25474, h: 25481, l: 25464, c: 25466 }; B[29] = { o: 25466, h: 25468, l: 25436, c: 25440 };
    B[57] = { o: 25362, h: 25398, l: 25360, c: 25395 }; B[58] = { o: 25395, h: 25416, l: 25390, c: 25410 };
    var E8 = emaOf(B, 8), E21 = emaOf(B, 21);
    var LH = [[37, 25446], [44, 25420], [51, 25399]];
    for (i = 0; i < LH.length; i++) B[LH[i][0]].h = LH[i][1];
    var ST = [
      { at: 0, title: "The first candle low", text: "Mark the low of the first one-minute candle of the day. It's an experiment Vincent has been running this year, not a rule, but it keeps showing up as an inflection." },
      { at: 2.6, title: "Sliding, no level", text: "Friday dropped all morning with nothing in the way. A five-year-old shorting it would have made money. A system can't, because there's nothing to base the trade on." },
      { at: 5.6, title: "Don't short into the 200", text: "Price reaches the 200 moving average. Shorting into it is how you get squeezed. He's seen it a thousand times. No trade." },
      { at: 8.2, title: "Don't short into the PDL", text: "Then the previous day's low. A PDL sweep, a bounce, and a squeeze that annihilates everyone shorting there: also seen a million times. No trade." },
      { at: 10.8, title: "Break and retest of the PDL", text: "It breaks the PDL, comes back up, and the retest from below rejects. That's the repeatable trade: short the break and retest of the PDL. Stop above the retest high." },
      { at: 13.6, title: "Hold it with structure", text: "Lows, highs, lows, highs: every bounce makes a lower high and price stays under the EMA cloud. Trail the stop above the last lower high, and stay in while that's true." },
      { at: 17, title: "Exit when the structure breaks", text: "Price holds back above a previous low and pushes through the cloud. The lower-high structure is gone, so that's the exit. This only works in a trending market." }
    ];
    return {
      stages: ST, end: 21, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [2.4, 3], [5.4, 13], [8, 20], [10.6, 26], [11.4, 28], [13.4, 30], [16.8, 54], [19.6, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        var full = Math.ceil(cnt);
        s += axis(g, lo, hi, 50, Y, 0);
        s += txt(g.x0, g.y0 - 14, n ? "Nasdaq future · 5-min (made up)" : "Nasdaq 100 future · Friday, 5-minute bars (made up)", C.faint, 12, "start", 600);
        var fo = fade(T, 0.4, 0.5);
        s += line(X(0), Y(25612), g.x1, Y(25612), C.cyan, 1.4, "5 4", fo * (1 - 0.6 * fade(T, 2.6, 0.4)));
        s += tag(X(1), Y(25612) + 16, "first candle low", C.cyan, fo * (1 - 0.6 * fade(T, 2.6, 0.4)), "start");
        var mo = fade(T, 5.8, 0.4);
        if (mo > 0) { s += poly([[X(0), Y(25520)], [g.x1, Y(25470)]], C.gold, 2, null, mo); post += tag(X(50), Y(25478) - 16, n ? "200 MA" : "200 moving average", C.gold, mo, "middle"); }
        var po = fade(T, 8.4, 0.4), broke = fade(T, 11, 0.4);
        if (po > 0) { s += line(g.x0, Y(25462), g.x1, Y(25462), broke > 0 ? C.dn : C.blue, 2, null, po); post += tag(g.x0 + 4, Y(25462) + 16, n ? "PDL 25,462" : "previous day low 25,462", broke > 0 ? C.dn : C.blue, po, "start"); }
        /* the EMA cloud, drawn up to the last printed bar */
        var co = fade(T, 13.8, 0.5);
        if (co > 0 && full > 2) {
          var top = [], bot = [];
          for (i = 0; i < full; i++) { top.push([X(i), Y(Math.max(E8[i], E21[i]))]); bot.unshift([X(i), Y(Math.min(E8[i], E21[i]))]); }
          s += '<polygon points="' + top.concat(bot).map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="' + C.dn + '" opacity="' + (0.18 * co).toFixed(3) + '"/>';
          s += tag(X(36), Y(E21[36]) - 18, n ? "cloud" : "EMA cloud", C.dn, co * (1 - fade(T, 17, 0.4)), "middle");
        }
        var nl = win(T, 2.8, 5.6);
        if (nl > 0) post += tag(X(16), Y(25578), "no level · no trade", C.grey, nl, "middle");
        var no1 = win(T, 5.8, 13.6);
        if (no1 > 0) post += tag(X(12), Y(25494) + 22, n ? "no short" : "no short into the 200", C.gold, no1, "middle");
        var no2 = win(T, 8.4, 13.6);
        if (no2 > 0) post += tag(X(19), Y(25462) + 40, n ? "no short" : "no short into the PDL", C.blue, no2, "middle");
        var en = fade(T, 11, 0.4);
        if (en > 0) {
          s += frameRect(X(27) - bw, Y(25484), X(28) - X(27) + 2 * bw, Y(25460) - Y(25484), C.dn, 2, en * (1 - 0.6 * fade(T, 13.6, 0.4)));
          post += tag(X(28) + bw + 4, Y(25462) + 40, n ? "retest rejects · short" : "retest from below rejects · short 25,462", C.dn, en * (1 - fade(T, 13.6, 0.4)), "start");
        }
        s += drawBars(B, X, Y, cnt, bw) + post;
        var so = fade(T, 13.8, 0.4);
        if (so > 0) {
          var stp = 25484;
          LH.forEach(function (p, k) { var o = fade(T, 13.8 + k * 0.9, 0.4); if (o > 0) { s += dot(X(p[0]), Y(p[1]) - 8, 5.5, C.orange, o, true); stp = Math.min(stp, p[1] + 4); } });
          s += line(X(28), Y(25484), X(Math.min(N - 1, full)), Y(stp), C.orange, 1.6, "5 4", so * (1 - fade(T, 17.2, 0.4)));
          s += tag(X(44), Y(25426) - 18, n ? "lower highs" : "lower highs · trail the stop above them", C.orange, so * (1 - fade(T, 17.2, 0.4)), "middle");
        }
        var xo = fade(T, 17.2, 0.4);
        if (xo > 0) { s += frameRect(X(57) - bw, Y(25418), X(58) - X(57) + 2 * bw, Y(25358) - Y(25418), C.up, 2, xo); s += tag(X(57) - bw - 4, Y(25430), n ? "exit" : "structure breaks · exit", C.up, xo, "end"); }
        s += note2(g, ["The first candle low", "An experiment, not a rule:", "mark the first 1-min", "candle's low and watch it."], C.cyan, win(T, 0.4, 2.6));
        s += note2(g, ["Sliding, no level", "Straight down all morning.", "Nothing to base a trade on,", "so no trade."], C.grey, win(T, 2.8, 5.6));
        s += note2(g, ["Not into the 200", "Shorting into the 200 MA", "is how you get squeezed.", "Pass."], C.gold, win(T, 5.8, 8.2));
        s += note2(g, ["Not into the PDL", "Sweep, bounce, squeeze:", "seen a million times.", "Pass."], C.blue, win(T, 8.4, 10.8));
        s += note2(g, ["Break and retest a PDL", "Breaks, retests from", "below, rejects: short.", "Stop above the retest high."], C.dn, win(T, 11, 13.6));
        s += note2(g, ["Hold it with structure", "Lower highs, under the", "cloud. Trail above the", "last lower high."], C.orange, win(T, 13.8, 17));
        s += note2(g, ["Exit on the break", "Holds back above a low,", "through the cloud: the", "structure is gone. Out."], C.up, fade(T, 17.2, 0.4));
        return s + stamp(L);
      }
    };
  }

  var SPECS = { zones: zonesSpec, story: storySpec, reclaim: reclaimSpec, frontrun: frontrunSpec, pdl: pdlSpec };
  document.querySelectorAll("[data-ttt-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-ttt-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     Every morning, thesis to trade, as a click-through stepper.
     Without the script the five show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ttt-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "Levels",  c: C.blue,   tag: "Zones from the weekly, daily, 4-hour, hourly" },
      { k: "Story",   c: C.cyan,   tag: "If this happens, then that" },
      { k: "Read",    c: C.orange, tag: "Hold, fail, or trap?" },
      { k: "Entry",   c: C.up,     tag: "Break and retest, after confirmation" },
      { k: "Manage",  c: C.dn,     tag: "Structure and the cloud, then self-control" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Thesis to trade, step by step");
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
      function cd(x, o, c, h, l, w) { var col = c >= o ? C.up : C.dn; return ln(x, h, x, l, col, 1.4) + r(x - (w || 9) / 2, Math.min(o, c), w || 9, Math.max(2, Math.abs(c - o)), col, 1, 1.5); }
      var top = 30, bot = H - 50, mid = (top + bot) / 2;
      if (k === 0) {
        var zt = mid + 30, zb = mid + 62, st = top + 26, sb = top + 46;
        s += r(30, st, 500, sb - st, C.dn, 0.2) + ln(30, st, 530, st, C.dn, 2) + ln(30, sb, 530, sb, C.dn, 2);
        s += r(30, zt, 500, zb - zt, C.blue, 0.2) + ln(30, zt, 530, zt, C.blue, 2) + ln(30, zb, 530, zb, C.blue, 2);
        s += pl([[40, mid], [100, zb - 2], [170, st + 6], [240, zt + 6], [310, sb - 4], [380, zb - 4], [450, sb], [520, mid]], C.ink, 2.2);
        s += t(530, st - 8, "supply · highs that reject", C.dn, 12.5, "end", 700) + t(530, zb + 20, "demand · lowest low to highest low", C.blue, 12.5, "end", 700);
        s += t(30, bot + 30, "Weekly, daily, 4-hour, hourly. Nothing lower.", C.dim, 12.5, "start", 500);
      } else if (k === 1) {
        var y0 = mid - 10;
        s += r(30, y0 - 12, 500, 24, C.orange, 0.2) + ln(30, y0, 530, y0, C.orange, 2);
        s += pl([[40, bot - 20], [130, y0 + 50], [200, y0 + 6], [240, y0 + 40]], C.ink, 2.2);
        s += pl([[240, y0 + 40], [320, y0 - 4]], C.ink, 2.2);
        s += pl([[320, y0 - 4], [420, bot - 10]], C.dn, 2.4) + pl([[320, y0 - 4], [420, top + 10]], C.up, 2.4);
        s += t(426, bot - 6, "fails: fade it", C.dn, 12.5, "start", 700) + t(426, top + 18, "holds: no short", C.up, 12.5, "start", 700);
        s += t(30, bot + 30, "Write the plan before the open: if this, then that.", C.dim, 12.5, "start", 500);
      } else if (k === 2) {
        var lv = mid + 20, x0s = 60, dx = 30;
        var PB = [[60, 45], [45, 30], [30, 14], [14, 5], [5, -20], [-20, 8], [8, 2], [2, 14], [14, 26], [26, 40], [40, 52], [52, 66], [66, 78], [78, 92], [92, 104]];
        s += r(30, lv - 10, 500, 20, C.blue, 0.2) + ln(30, lv, 530, lv, C.blue, 2);
        PB.forEach(function (b, i) {
          var o = lv - b[0] * 1.3, c = lv - b[1] * 1.3, hiY = Math.min(o, c) - 6, loY = Math.max(o, c) + (i === 4 ? 14 : 6);
          var col = b[1] >= b[0] ? C.up : C.dn;
          s += ln(x0s + i * dx, hiY, x0s + i * dx, loY, col, 1.4) + r(x0s + i * dx - 5, Math.min(o, c), 10, Math.max(2, Math.abs(c - o)), col, 1, 1.5);
        });
        s += t(x0s + 4 * dx, lv + 62, "sweep", C.orange, 12.5, "middle", 700);
        s += t(x0s + 7 * dx + 10, lv + 34, "reclaim, higher low", C.up, 12.5, "start", 700);
        s += t(30, bot + 30, "At the level, wait. Expect a trap first.", C.dim, 12.5, "start", 500);
      } else if (k === 3) {
        var lv2 = mid + 20;
        s += ln(30, lv2, 530, lv2, C.blue, 2.2);
        s += pl([[40, bot - 10], [130, lv2 + 20], [200, lv2 - 70], [250, lv2 - 50]], C.ink, 2.2);
        s += pl([[250, lv2 - 50], [300, lv2 - 2], [340, lv2 - 30], [520, top + 6]], C.ink, 2.2);
        s += '<circle cx="250" cy="' + (lv2 - 50) + '" r="7" fill="none" stroke="' + C.orange + '" stroke-width="2.4"/>' + t(250, lv2 - 64, "front-run", C.orange, 12.5, "middle", 700);
        s += '<circle cx="340" cy="' + (lv2 - 30) + '" r="7" fill="' + C.up + '"/>' + t(352, lv2 - 34, "entry after the hold", C.up, 12.5, "start", 700);
        s += ln(300, lv2 + 14, 380, lv2 + 14, C.dn, 2, "5 4") + t(386, lv2 + 18, "stop", C.dn, 12.5, "start", 700);
        s += t(30, bot + 30, "The idea can be S tier. The entry still waits.", C.dim, 12.5, "start", 500);
      } else {
        var pts = [[40, top + 20], [90, top + 70], [120, top + 50], [170, top + 110], [200, top + 90], [250, top + 150], [280, top + 132], [330, top + 190], [360, top + 160], [400, top + 120]];
        s += pl(pts, C.ink, 2.2);
        [[120, top + 50], [200, top + 90], [280, top + 132]].forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="none" stroke="' + C.orange + '" stroke-width="2.2"/>'; });
        s += '<circle cx="400" cy="' + (top + 120) + '" r="7" fill="' + C.up + '"/>' + t(412, top + 124, "structure breaks: out", C.up, 12.5, "start", 700);
        s += t(140, top + 30, "lower highs", C.orange, 12.5, "start", 700);
        s += t(30, bot + 30, "Levels, price action, self-control. That's it.", C.dim, 12.5, "start", 500);
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
