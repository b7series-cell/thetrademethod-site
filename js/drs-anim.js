/* =====================================================================
   drs-anim.js — the animated walkthroughs on dynamic-risk-sizing.html.

     [data-drs-anim="trade1"]    an A premarket high break: Jack risks $200, Sam $300
     [data-drs-anim="trade2"]    a B+ second chance short: $200 vs $250
     [data-drs-anim="trade3"]    a B- range break that fails, then the A big dog break
     [data-drs-anim="day"]       the day added up, trade by trade
     [data-drs-anim="tiers"]     the risk tiering model: A+, A, B, C
     [data-drs-anim="compound"]  the same 60 trades, static vs tiered risk
     [data-drs-steps]            build your own tiers, as a click-through stepper

   Same player and chart frame as gbf-anim.js: each chart redraws in a
   narrow layout on a phone instead of scrolling sideways, and on a phone
   the callouts and the two-trader scoreboard sit in a band above the
   chart so they never cover candles.

   Every chart is made-up bars or made-up trades, labelled "Illustrative".
   No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#64d2ff", gold: "#f4b942", orange: "#ff9f0a", grey: "#8e8e93",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e" };
  var NARROW_BELOW = 640;   // px of drawing width under which the narrow layout is used
  var FS = 1;               // text scale: larger in the narrow layout so labels stay readable on a phone

  /* ---------- shared drawing helpers ---------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function ease(v) { v = clamp01(v); return v * v * (3 - 2 * v); }
  function lerp(a, b, m) { return a + (b - a) * m; }
  function txt(x, y, s, col, size, anchor, weight, op) {
    if (op != null && op <= 0) return "";
    return '<text x="' + (+x).toFixed(1) + '" y="' + (+y).toFixed(1) + '" fill="' + col + '" font-size="' + ((size || 13) * FS).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' +
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
  function callout(x, y, lines, col, op, right) {
    if (op <= 0) return "";
    var w = 18 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z]+;/g, "x").length; })) * 7.3 * FS, h = 10 + lines.length * 18 * FS;
    var x0 = right ? x - w : x;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt(x0 + 10, y + 21 * FS + k * 18 * FS, ln, k === 0 ? col : C.dim, 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  function candle(x, yf, b, prog, wBody, op) {
    if (prog <= 0) return "";
    var o = b[0], h = b[1], l = b[2], c = b[3], up = c >= o;
    var pth = up ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
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
      }, { threshold: 0.45 });
      io.observe(svg.parentNode || svg);
    }
  }

  /* ---------- made-up bars: a seeded path of segments, so every replay draws the same chart ---------- */
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* segs: { n, to | fn(i, n, from, idx), noise, wick, cap, flo, v }  or  { list: [{ c, h, l, v }] } */
  function path(seed, start, segs) {
    var R = rng(seed), out = [], p = start;
    function val(x, idx) { return typeof x === "function" ? x(idx) : x; }
    segs.forEach(function (sg) {
      var from = p, items = sg.list || new Array(sg.n);
      for (var i = 1; i <= items.length; i++) {
        var idx = out.length, it = sg.list ? sg.list[i - 1] : null, o = p, c, h, l, w = sg.wick != null ? sg.wick : 0.1;
        if (it) {
          c = it.c;
          h = it.h != null ? it.h : Math.max(o, c) + R() * w;
          l = it.l != null ? it.l : Math.min(o, c) - R() * w;
        } else {
          c = (sg.fn ? sg.fn(i, sg.n, from, idx) : lerp(from, sg.to, i / sg.n)) + (R() - 0.5) * 2 * (sg.noise || 0);
          var cap = val(sg.cap, idx), flo = val(sg.flo, idx);
          if (cap != null) c = Math.min(c, cap - 0.02);
          if (flo != null) c = Math.max(c, flo + 0.02);
          h = Math.max(o, c) + R() * w; l = Math.min(o, c) - R() * w;
          if (cap != null) h = Math.min(h, cap);
          if (flo != null) l = Math.max(l, flo);
        }
        var v = it && it.v != null ? it.v : sg.v != null ? sg.v * (0.8 + 0.4 * R()) : 0.35 * (0.7 + 0.6 * R());
        out.push({ o: o, h: h, l: l, c: c, v: v });
        p = c;
      }
    });
    return out;
  }
  function emaOf(B, n) { var e = null; return B.map(function (b) { e = e == null ? b.c : e + (b.c - e) * 2 / (n + 1); return e; }); }
  function usd(p) { return "$" + p.toFixed(2); }
  function win(T, a, b) { return fade(T, a, 0.4) * (b != null ? 1 - fade(T, b, 0.3) : 1); }

  /* ---------- the chart frame every walkthrough shares ---------- */
  function chart(cfg) {
    var B = cfg.bars, N = B.length, E = cfg.ema ? emaOf(B, cfg.ema) : null;
    function shownAt(T) {
      var R = cfg.reveal;
      if (T <= R[0][0]) return R[0][1];
      for (var k = 1; k < R.length; k++) if (T <= R[k][0]) return lerp(R[k - 1][1], R[k][1], ease((T - R[k - 1][0]) / (R[k][0] - R[k - 1][0])) * 0.25 + (T - R[k - 1][0]) / (R[k][0] - R[k - 1][0]) * 0.75);
      return R[R.length - 1][1];
    }
    function size(n) { return n ? { W: 440, H: cfg.vol ? 640 : 580 } : { W: 1180, H: cfg.vol ? 520 : 470 }; }
    function frame(T, L) {
      var n = L.narrow, s = "";
      var x0 = n ? 14 : 64, x1 = n ? 380 : 1080, y0 = n ? 152 : 52, y1 = n ? (cfg.vol ? 500 : 540) : (cfg.vol ? 392 : 432);
      function X(i) { return x0 + (i + 0.5) * (x1 - x0) / N; }
      function Y(p) { return y1 - (p - cfg.lo) / (cfg.hi - cfg.lo) * (y1 - y0); }
      var cw = Math.max(3, (x1 - x0) / N * 0.62);
      for (var p = Math.ceil(cfg.lo / cfg.step - 1e-9) * cfg.step; p <= cfg.hi + 1e-9; p += cfg.step) {
        s += line(x0, Y(p), x1, Y(p), "rgba(255,255,255,0.05)", 1);
        s += txt(x1 + 8, Y(p) + 4, (cfg.fmt || usd)(p), C.faint, 11);
      }
      s += txt(n ? 14 : 64, 28, cfg.title, C.faint, 12);
      var sh = shownAt(T), g = { T: T, n: n, L: L, X: X, Y: Y, x0: x0, x1: x1, y0: y0, y1: y1, cw: cw, shown: sh, bars: B, ema: E };
      if (cfg.under) s += cfg.under(T, g);
      if (E && sh > 1) {
        var eo = cfg.emaOp ? cfg.emaOp(T) : 1, pts = [];
        for (var j = 0; j < N && j < sh; j++) pts.push(X(j).toFixed(1) + "," + Y(E[j]).toFixed(1));
        if (eo > 0 && pts.length > 1) {
          s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.orange + '" stroke-width="2.4" stroke-linejoin="round" opacity="' + eo.toFixed(3) + '"/>';
          var je = Math.min(N - 1, Math.floor(sh - 0.01));
          s += txt(X(je) + 8, Y(E[je]) + 16, "9 EMA", C.orange, 12, "start", 700, eo);
        }
      }
      for (var i = 0; i < N && i < sh; i++) s += candle(X(i), Y, [B[i].o, B[i].h, B[i].l, B[i].c], Math.min(1, sh - i), cw);
      if (cfg.vol) {
        var vy1 = L.H - (n ? 30 : 26), vy0 = vy1 - (n ? 66 : 62);
        s += txt(x0, vy0 - 6, "Volume", C.faint, 11);
        for (var k = 0; k < N && k < sh; k++) {
          var hv = B[k].v * Math.min(1, sh - k) * (vy1 - vy0);
          s += rect(X(k) - cw / 2, vy1 - hv, cw, hv, B[k].c >= B[k].o ? C.up : C.dn, 1, 0.5);
        }
      }
      if (cfg.overlay) s += cfg.overlay(T, g);
      s += txt(L.W - 14, L.H - 8, "Illustrative · made-up bars", C.faint, 11, "end");
      return s;
    }
    return { stages: cfg.stages, end: cfg.end, frame: frame, size: size };
  }

  /* ---------- overlay helpers ---------- */
  function hl(g, p, i0, i1, col, w, dash, op) {
    var xa = i0 == null ? g.x0 : g.X(i0) - g.cw, xb = i1 == null ? g.x1 : Math.min(g.x1, g.X(i1) + g.cw);
    return line(xa, g.Y(p), xb, g.Y(p), col, w || 1.6, dash, op);
  }
  /* a callout: on a phone it sits in the band above the chart; on desktop at (wx, wy) */
  function note(g, lines, col, op, wx, wy, right) { return g.n ? callout(14, 40, lines, col, op) : callout(wx, wy, lines, col, op, right); }
  function pill(x, y, s, col, op, anchor) {
    if (op <= 0) return "";
    var w = s.length * 7.2 * FS + 18, h = 22 * FS, xa = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xa.toFixed(1) + '" y="' + (y - h + 6).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + (h / 2).toFixed(1) + '" fill="' + col + '"/>' +
      txt(xa + w / 2, y - 1, s, "#000", 12, "middle", 700) + "</g>";
  }
  function ring(x, y, r, col, op) { return op > 0 ? '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="2" opacity="' + op.toFixed(3) + '"/>' : ""; }
  function zone(g, i0, i1, lo, hi, col, op) {
    if (op <= 0) return "";
    var xa = g.X(i0) - g.cw, xb = g.X(i1) + g.cw;
    return '<rect x="' + xa.toFixed(1) + '" y="' + g.Y(hi).toFixed(1) + '" width="' + (xb - xa).toFixed(1) + '" height="' + (g.Y(lo) - g.Y(hi)).toFixed(1) + '" rx="4" fill="' + col + '" fill-opacity="0.12" stroke="' + col + '" stroke-opacity="0.7" opacity="' + op.toFixed(3) + '"/>';
  }
  function lab(g, p, s, col, op, x) { return txt(x != null ? x : g.x0 + 6, g.Y(p) - 7, s, col, 12, "start", 700, op); }

  var PURPLE = "#bf5af2";
  function sma(B, n) { return B.map(function (b, i) { var w = B.slice(Math.max(0, i - n + 1), i + 1), m = 0; w.forEach(function (x) { m += x.c; }); return m / w.length; }); }
  function sdev(B, n, M) { return B.map(function (b, i) { var w = B.slice(Math.max(0, i - n + 1), i + 1), s = 0; w.forEach(function (x) { s += (x.c - M[i]) * (x.c - M[i]); }); return Math.sqrt(s / w.length); }); }
  function poly(g, vals, upto, col, w, op, dash) {
    if (op <= 0) return "";
    var pts = [];
    for (var j = 0; j < vals.length && j < upto; j++) pts.push(g.X(j).toFixed(1) + "," + g.Y(vals[j]).toFixed(1));
    return pts.length > 1 ? '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + ' opacity="' + op.toFixed(3) + '"/>' : "";
  }
  /* a label on a dark chip, so it stays readable over candles */
  function tag(x, y, s, col, op, anchor) {
    if (op <= 0) return "";
    var w = s.replace(/&[a-z]+;/g, "x").length * 6.9 * FS + 14, h = 19 * FS, xa = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xa.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="6" fill="' + C.bg + '" fill-opacity="0.9"/>' +
      txt(xa + w / 2, y + 4 * FS, s, col, 12, "middle", 700) + "</g>";
  }
  /* numbered touch marker on a level */
  function touch(g, i, p, k, col, op, below) {
    if (op <= 0) return "";
    var y = g.Y(p) + (below ? 16 : -16);
    return ring(g.X(i), g.Y(p), 11, col, op) + txt(g.X(i), y + (below ? 8 : 0), String(k), col, 12, "middle", 800, op);
  }

  /* two charts shown one after the other: the first until SW, then the second */
  function twoWorlds(WA, WB, SW, stages, end) {
    return { size: WA.size, stages: stages, end: end, frame: function (T, L) { return T < SW ? WA.frame(T, L) : WB.frame(T - SW, L); } };
  }
  /* pills stacked down the left on desktop, two columns in the phone band */
  function pills(g, list, at, step, op) {
    var s = "";
    list.forEach(function (q, k) {
      var a = op * fade(g.T, at + k * step, 0.35);
      if (g.n) s += pill(14 + (k % 2) * 210, 60 + Math.floor(k / 2) * 30 * FS, q[1], q[2], a);
      else s += pill(g.x0 + 8, g.y0 + 22 + k * 28, q[0], q[2], a);
    });
    return s;
  }
  function cross(x, y, col, op) {
    return op > 0 ? '<g opacity="' + op.toFixed(3) + '">' + line(x - 7, y - 7, x + 7, y + 7, col, 2.4) + line(x - 7, y + 7, x + 7, y - 7, col, 2.4) + "</g>" : "";
  }

  function money(v) { return (v < 0 ? "−" : "+") + "$" + Math.abs(Math.round(v)).toLocaleString("en-US"); }
  function shortMoney(v) { return Math.abs(v) >= 1000 ? (v < 0 ? "−" : "+") + (Math.abs(v) / 1000).toFixed(1) + "k" : money(v); }
  var JACK = C.orange, SAM = C.up;

  /* the two-trader scoreboard: on a phone it fills the band above the chart */
  function duel(g, rows, op, wx, wy) {
    if (op <= 0) return "";
    var n = g.n, x = n ? 14 : wx, y = n ? 40 : wy, w = n ? 412 : 330, rh = n ? 46 : 40, s = "";
    s += '<g opacity="' + op.toFixed(3) + '">' + rect(x, y, w, 12 + rows.length * rh, C.box, 10, 0.96);
    rows.forEach(function (r, k) {
      var ry = y + 8 + k * rh;
      s += txt(x + 12, ry + 18 * FS, r.who, r.col, 13, "start", 700);
      s += txt(x + (n ? 190 : 150), ry + 18 * FS, "risk $" + r.risk, C.dim, 13);
      s += rect(x + 12, ry + 26 * FS, (n ? 150 : 120) * r.risk / 400, 5, r.col, 2, 0.85);
      if (r.res != null) s += txt(x + w - 12, ry + 18 * FS, r.res, r.resCol || (r.res.charAt(0) === "−" ? C.dn : C.up), 15, "end", 800, r.resOp == null ? 1 : r.resOp);
    });
    return s + "</g>";
  }
  function rows2(jr, sr, jRes, sRes, resOp) {
    return [
      { who: "Jack · static", col: JACK, risk: jr, res: jRes, resOp: resOp },
      { who: "Sam · dynamic", col: SAM, risk: sr, res: sRes, resOp: resOp }
    ];
  }

  /* =====================================================================
     1 · an A premarket high break: same entry, same stop, more risk
     prices, shares and P&L from the video's own table; the bars are made up
     ===================================================================== */
  function trade1Spec() {
    var B = path(71, 124.75, [
      { list: [{ c: 124.6, h: 124.85, l: 124.52 }, { c: 124.55, h: 124.7, l: 124.48, v: 0.55 }, { c: 124.72, h: 124.78, l: 124.5 }] },
      { n: 7, fn: function (i) { return 124.74 + 0.12 * Math.sin(i * 1.6); }, noise: 0.03, wick: 0.06, cap: 125, flo: 124.52, v: 0.32 },
      { list: [{ c: 125.2, h: 125.25, v: 1 }] },
      { n: 7, to: 127.7, noise: 0.08, wick: 0.1, v: 0.65 },
      { list: [{ c: 127.95, h: 128.1, l: 127.61, v: 0.9 }, { c: 128.15, h: 128.3, l: 127.8, v: 0.8 }, { c: 127.45, h: 128.15, l: 127.35, v: 0.85 }] },
      { n: 3, to: 127.6, noise: 0.08, wick: 0.1, v: 0.4 }
    ]);
    var BRK = 10, OUT = 20, LV = 125, EP = 125, SP = 124.48, XP = 127.61;
    var S1 = 3.6, S2 = 7.4, S3 = 10.6, END = 16.5;
    return chart({
      bars: B, lo: 124.2, hi: 128.6, step: 0.5, vol: true, title: "Illustrative · trade 1, a premarket high break",
      reveal: [[0, 0], [3, BRK], [S2, BRK], [S2 + 0.6, BRK + 1], [S3, BRK + 6], [S3 + 3, B.length]],
      stages: [
        { at: 0,  title: "The plan, before the open", text: "A positive catalyst, and the stock is sitting under $125, a key resistance level on the higher time frame. If it breaks the premarket high on volume, both traders want it." },
        { at: S1, title: "Two traders grade it", text: "Jack: “I risk $200, that's what I risk.” Sam: “Catalyst, volume and a clean premarket high break: that's the A version. I'll risk $300.” 50% more, not ten times more." },
        { at: S2, title: "Same entry, same stop", text: "The break prints. Both buy $125.00 with the stop at the low of the day, $124.48. Jack's $200 buys 384 shares, Sam's $300 buys 576. Same trade; only the size differs." },
        { at: S3, title: "Same momentum exit", text: "It accelerates, then a bar breaks the low of the prior two: the momentum exit at $127.61, about +5R. Jack makes $1,002. Sam makes $1,503 on the same trade." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", a = fade(T, 0.4, 0.5);
        s += hl(g, LV, 0, null, C.blue, 2, null, a);
        s += g.n ? tag(g.x1 - 4, g.Y(LV) + 14 * FS, "$125 · PMH", C.blue, a * (1 - fade(T, S2, 0.3)), "end") : tag(g.X(0.2), g.Y(LV) + 16, "$125 · premarket high + higher-time-frame level", C.blue, a * (1 - fade(T, S2, 0.3)));
        s += note(g, ["Positive catalyst", "breaking a higher-time-frame level"], C.blue, win(T, 1, S1), g.X(1), g.Y(128.4));
        var aE = fade(T, S2 + 0.3, 0.3);
        s += ring(g.X(BRK), g.Y(EP), 12, C.up, aE * (1 - fade(T, S3, 0.4)));
        s += hl(g, SP, 0, null, C.dn, 1.6, "5 4", aE);
        s += tag(g.x1 - 4, g.Y(SP) + 14 * FS, g.n ? "stop $124.48" : "stop · low of day $124.48", C.dn, aE, "end");
        s += tag(g.X(BRK) + g.cw + 8, g.Y(EP) - 16 * FS, "entry $125.00", C.ink, aE * (g.n ? 0 : 1));
        var aX = fade(T, S3 + 2.8, 0.3);
        s += hl(g, XP, OUT - 3, OUT + 2, C.gold, 1.6, "5 4", aX) + ring(g.X(OUT), g.Y(XP), 12, C.gold, aX);
        s += tag(g.X(OUT), g.Y(XP) + 24 * FS, g.n ? "exit ≈ +5R" : "two-bar trailing break · exit $127.61", C.gold, aX, g.n ? "middle" : "end");
        var aD = fade(T, S1 + 0.4, 0.4), res = fade(T, S3 + 3.2, 0.4);
        s += duel(g, rows2(200, 300, res > 0 ? "+$1,002" : null, res > 0 ? "+$1,503" : null, res), aD, g.X(0.2) - 4, g.Y(128.5));
        return s;
      }
    });
  }

  /* =====================================================================
     2 · a B+ second chance short: a little more than baseline
     ===================================================================== */
  function trade2Spec() {
    var B = path(83, 325.8, [
      { list: [{ c: 324.6, h: 326.0, l: 324.3 }, { c: 323.3, h: 324.8, l: 323.0, v: 0.6 }, { c: 324.2, h: 324.4, l: 323.1 }] },
      { n: 6, to: 329.3, noise: 0.2, wick: 0.2, cap: 330.2, v: 0.55 },
      { list: [{ c: 329.9, h: 330.25, l: 329.2, v: 0.6 }, { c: 329.5, h: 330.3, l: 329.2, v: 0.5 }, { c: 329.8, h: 330.2, l: 329.3, v: 0.45 }] },
      { list: [{ c: 329.0, h: 329.9, l: 328.8, v: 0.9 }] },
      { n: 4, to: 323.6, noise: 0.3, wick: 0.25, flo: 323.1, v: 0.6 },
      { list: [{ c: 322.4, h: 323.7, l: 322.2, v: 0.8 }] },
      { n: 3, to: 320.0, noise: 0.2, wick: 0.2, flo: 319.6, v: 0.45 },
      { list: [{ c: 320.9, h: 321.0, l: 319.8, v: 0.55 }] },
      { n: 2, to: 320.6, noise: 0.2, wick: 0.2, v: 0.35 }
    ]);
    var TURN = 12, HALF = 17, REST = 21, LV = 330, EP = 329, SP = 330.5, LOW = 323, XP = 320.5;
    var S1 = 3.8, S2 = 7.6, S3 = 10.4, END = 16;
    return chart({
      bars: B, lo: 318.6, hi: 332.4, step: 2, vol: true, title: "Illustrative · trade 2, a second chance short",
      reveal: [[0, 0], [3.2, 9], [S1, 9], [S1 + 2.4, TURN], [S2, TURN], [S2 + 0.6, TURN + 1], [S3, TURN + 1], [S3 + 3.2, HALF + 1], [S3 + 4.6, B.length]],
      stages: [
        { at: 0,  title: "Awful news, a gap below the lows", text: "After 10:00. The stock gapped below its 52-week low on very negative news. The $330 area, support before, is now overhead." },
        { at: S1, title: "It drives back into old support", text: "It rises quickly into $330, the area that was support before. That's the second chance. An A would be a big dog consolidation all below $330; this isn't offering that, so it's a B+." },
        { at: S2, title: "B+ gets a little more", text: "The turn shows on the tape: short $329.00, stop above the highs at $330.50. Jack risks his standard $200, 133 shares. Sam: “a little better than baseline, not an A.” $250, 166 shares." },
        { at: S3, title: "Same target, same exit", text: "Let it look for the lows: cover into the prior low, trail the rest, out at $320.50, about +5.7R for both. Jack +$1,131, Sam +$1,411, and the gap widens." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", a = fade(T, 0.4, 0.5);
        s += hl(g, LV, 0, null, C.blue, 2, null, a);
        s += g.n ? tag(g.x1 - 4, g.Y(LV) - 14 * FS, "$330 · old support", C.blue, a * (1 - fade(T, S2, 0.3)), "end") : tag(g.X(0.2), g.Y(LV) - 14, "$330 · 52-week low, old support, now resistance", C.blue, a);
        s += note(g, ["Gap below the 52-week low", "on extremely negative news"], C.dn, win(T, 1, S1), g.X(4), g.Y(332.2));
        var aZ = fade(T, S1 + 2.4, 0.4) * (1 - fade(T, S3, 0.5));
        s += zone(g, 9, 11, 329.2, 330.3, C.orange, aZ);
        s += tag(g.X(10), g.Y(331.6), "second chance · B+", C.orange, aZ * (g.n ? 0 : 1), "middle");
        var aE = fade(T, S2 + 0.4, 0.3);
        s += hl(g, SP, TURN - 3, null, C.dn, 1.6, "5 4", aE);
        s += tag(g.x1 - 4, g.Y(SP) - 14 * FS, g.n ? "stop $330.50" : "stop above the highs · $330.50", C.dn, aE, "end");
        s += ring(g.X(TURN), g.Y(EP), 12, C.dn, aE * (1 - fade(T, S3, 0.4)));
        s += tag(g.X(TURN) + g.cw + 8, g.Y(EP) + 16 * FS, "short $329.00", C.ink, aE * (g.n ? 0 : 1));
        var aL = fade(T, S3 + 0.2, 0.4);
        s += hl(g, LOW, 0, null, C.gold, 1.4, "5 4", aL);
        var aH = fade(T, S3 + 2.6, 0.3), aR = fade(T, S3 + 4.4, 0.3);
        s += ring(g.X(HALF), g.Y(LOW), 11, C.gold, aH) + tag(g.X(HALF) - 14, g.Y(LOW) - 16 * FS, g.n ? "cover into the low" : "cover into the prior low", C.gold, aH, "end");
        s += ring(g.X(REST), g.Y(XP), 11, C.gold, aR) + tag(g.X(REST), g.Y(XP) + 24 * FS, g.n ? "out $320.50" : "trail the rest · out $320.50", C.gold, aR, "middle");
        var aD = fade(T, S2 + 0.2, 0.4), res = fade(T, S3 + 4.6, 0.4);
        s += duel(g, rows2(200, 250, res > 0 ? "+$1,131" : null, res > 0 ? "+$1,411" : null, res), aD, g.X(0.2) - 4, g.Y(322.5));
        return s;
      }
    });
  }

  /* =====================================================================
     3 · a B- range break that fails, then the A big dog break
     ===================================================================== */
  function trade3Spec() {
    var B = path(97, 240.2, [
      { list: [{ c: 241.2, h: 241.5, l: 240.0 }, { c: 239.6, h: 241.4, l: 239.3 }, { c: 240.6, h: 240.9, l: 239.4 }, { c: 241.3, h: 241.6, l: 240.4 },
               { c: 240.1, h: 241.5, l: 239.8, v: 0.5 }, { c: 239.5, h: 240.3, l: 239.2 }, { c: 240.9, h: 241.2, l: 239.4 }] },
      { list: [{ c: 242.0, h: 242.2, l: 240.8, v: 0.7 }, { c: 241.8, h: 242.3, l: 241.4, v: 0.45 }, { c: 240.2, h: 241.9, l: 239.9, v: 0.55 }, { c: 238.9, h: 240.4, l: 238.6, v: 0.7 }] },
      { list: [{ c: 239.8, h: 240.1, l: 238.9 }, { c: 240.9, h: 241.3, l: 239.6 }, { c: 240.3, h: 241.1, l: 240.0 }, { c: 241.1, h: 241.35, l: 240.5 },
               { c: 240.8, h: 241.3, l: 240.72, v: 0.28 }, { c: 241.2, h: 241.38, l: 240.8, v: 0.26 }, { c: 241.0, h: 241.36, l: 240.85, v: 0.22 }, { c: 241.25, h: 241.4, l: 240.95, v: 0.2 }] },
      { list: [{ c: 242.3, h: 242.5, l: 241.2, v: 1.15 }] },
      { n: 8, to: 251.5, noise: 0.4, wick: 0.4, v: 0.6 },
      { list: [{ c: 253.3, h: 253.8, l: 251.4, v: 0.7 }, { c: 253.7, h: 254.1, l: 253.1, v: 0.6 }, { c: 252.5, h: 253.8, l: 252.2, v: 0.75 }] },
      { n: 2, to: 252.6, noise: 0.3, wick: 0.3, v: 0.4 }
    ]);
    var E1 = 7, STOP1 = 10, W0 = 11, W1 = 18, T0 = 15, BRK = 19, OUT = 30;
    var EP1 = 241.75, SP1 = 238.8, WH = 241.4, EP2 = 241.5, SP2 = 240.7, XP = 253;
    var S1 = 3.4, S2 = 6.6, S3 = 9.4, S4 = 13.4, S5 = 16.4, END = 22;
    return chart({
      bars: B, lo: 237.8, hi: 255.2, step: 2, vol: true, title: "Illustrative · trade 3, the same stock twice",
      reveal: [[0, 0], [3, E1], [S1, E1], [S1 + 0.6, E1 + 1], [S2, E1 + 2], [S2 + 1.4, STOP1 + 1], [S3, STOP1 + 1], [S3 + 2.6, W1 + 1], [S4, W1 + 1], [S4 + 0.6, BRK + 1], [S5, BRK + 3], [S5 + 3.4, B.length]],
      stages: [
        { at: 0,  title: "A range break, not a great one", text: "Another positive catalyst and a range under $241.75. But the range is wide, it already failed once and rolled over, and the time of day is a little weird. It isn't trading fluidly." },
        { at: S1, title: "Jack $200, Sam $150", text: "Both take the break at $241.75 with the same stop under the range, $238.80. Jack risks his normal $200, 67 shares. Sam doesn't like how wide and choppy it is: $150, 50 shares." },
        { at: S2, title: "Both get stopped", text: "It pauses and rolls over, and both lose a full stop. Jack −$200, Sam −$150. A loss is still a loss; the B− version just costs Sam less." },
        { at: S3, title: "Then it sets up properly", text: "Price wedges into a tight big dog consolidation under the same highs. Tighter, cleaner, a better time of day. Did a B− just become an A?" },
        { at: S4, title: "Jack $200, Sam $300", text: "The break comes on a big volume increase. Same entry for both, $241.50, stop under the tight lows at $240.70. Jack: $200, 249 shares, because that's what he risks. Sam: $300, 374 shares, because it's an A." },
        { at: S5, title: "This is where the gap opens", text: "They hold it until a distinct, clear break and exit at $253.00, more than +14R. Jack +$2,864. Sam +$4,301. Same trade, it was just better than before." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "";
        var aR = fade(T, 0.6, 0.4) * (1 - fade(T, S3, 0.5));
        s += zone(g, 0, 6, 239.2, 241.6, C.orange, aR);
        s += tag(g.X(3), g.Y(243.2), g.n ? "wide · choppy · B−" : "wide, choppy, failed once · B−", C.orange, aR * (1 - fade(T, S1 + 0.4, 0.3) * (g.n ? 1 : 0)), "middle");
        var aE1 = fade(T, S1 + 0.4, 0.3) * (1 - fade(T, S3, 0.5));
        s += hl(g, EP1, 0, STOP1 + 1, C.ink, 1.3, null, aE1 * 0.8) + hl(g, SP1, 0, STOP1 + 1, C.dn, 1.6, "5 4", aE1);
        s += ring(g.X(E1), g.Y(EP1), 11, C.up, aE1 * (1 - fade(T, S2, 0.4)));
        s += tag(g.X(0.2), g.Y(SP1) + 16 * FS, "stop $238.80", C.dn, aE1);
        s += cross(g.X(STOP1), g.Y(SP1), C.dn, fade(T, S2 + 1.4, 0.3) * (1 - fade(T, S3 + 1, 0.4)));
        var aW = fade(T, S3 + 1.2, 0.5), aWo = aW * (1 - fade(T, S5, 0.6));
        s += zone(g, T0, W1, SP2 + 0.02, WH, C.up, aWo);
        s += hl(g, WH, W0, null, C.blue, 2, null, aWo);
        s += tag(g.X(W0 + 3.5), g.Y(WH) - 18 * FS, g.n ? "tight · A" : "big dog consolidation · tight · A", C.up, aWo, "middle");
        var aE2 = fade(T, S4 + 0.4, 0.3);
        s += hl(g, SP2, T0, null, C.dn, 1.6, "5 4", aE2) + tag(g.x1 - 4, g.Y(SP2) + 16 * FS, g.n ? "stop $240.70" : "stop under the tight lows · $240.70", C.dn, aE2, "end");
        s += ring(g.X(BRK), g.Y(EP2), 12, C.up, aE2 * (1 - fade(T, S5 + 1, 0.4)));
        s += tag(g.X(BRK) + g.cw + 8, g.Y(EP2) - 16 * FS, "entry $241.50", C.ink, aE2 * (g.n ? 0 : 1) * (1 - fade(T, S5 + 1, 0.4)));
        var aX = fade(T, S5 + 3.2, 0.3);
        s += ring(g.X(OUT), g.Y(XP), 12, C.gold, aX) + tag(g.X(OUT) - 14, g.Y(XP), g.n ? "exit $253" : "clear break · exit $253.00", C.gold, aX, "end");
        /* the scoreboard: the first try, then the second */
        var r1 = fade(T, S2 + 1.6, 0.4), d1 = fade(T, S1 + 0.2, 0.4) * (1 - fade(T, S3, 0.3));
        s += duel(g, rows2(200, 150, r1 > 0 ? "−$200" : null, r1 > 0 ? "−$150" : null, r1), d1, g.x1 - 334, g.Y(254.9));
        var r2 = fade(T, S5 + 3.4, 0.4), d2 = fade(T, S4 + 0.2, 0.4);
        s += duel(g, rows2(200, 300, r2 > 0 ? "+$2,864" : null, r2 > 0 ? "+$4,301" : null, r2), d2, g.X(0.2) - 4, g.Y(254.9));
        s += note(g, ["How much more do you like", "the second trade?"], C.up, win(T, S3 + 1.6, S4) * (g.n ? 1 : 0), 0, 0);
        return s;
      }
    });
  }

  /* =====================================================================
     4 · the day added up
     ===================================================================== */
  var DAY = [
    { k: "Trade 1", g: "A", j: 1002, s: 1503, jr: 200, sr: 300 },
    { k: "Trade 2", g: "B+", j: 1131, s: 1411, jr: 200, sr: 250 },
    { k: "Trade 3", g: "B−", j: -200, s: -150, jr: 200, sr: 150 },
    { k: "Trade 3 again", g: "A", j: 2864, s: 4301, jr: 200, sr: 300 }
  ];
  function daySpec() {
    var S = [0, 3, 6, 9], SUM = 12.4, END = 17;
    var JT = 0, STOT = 0, JR = 0, SR = 0;
    DAY.forEach(function (d) { JT += d.j; STOT += d.s; JR += d.jr; SR += d.sr; });
    return {
      stages: [
        { at: 0, title: "Trade 1 · the A", text: "Same premarket high break, about +5R. Jack risked $200 and made $1,002. Sam graded it an A, risked $300 and made $1,503." },
        { at: S[1], title: "Trade 2 · the B+", text: "Same second chance short, about +5.7R. Jack +$1,131 on $200. Sam +$1,411 on $250, a little more than baseline." },
        { at: S[2], title: "Trade 3 · the B−", text: "Same failed range break, a full stop. Jack −$200. Sam −$150, because he didn't like the chop." },
        { at: S[3], title: "Trade 3 again · the A", text: "Same big dog break, more than +14R. Jack +$2,864. Sam +$4,301. This is where the biggest gap occurs." },
        { at: SUM, title: "Same trades, " + money(JT) + " vs " + money(STOT), text: "Same tickers, same setups, same entries, stops and exits. Jack risked " + "$" + JR + " in total; Sam risked $" + SR.toLocaleString("en-US") + ", only " + Math.round((SR / JR - 1) * 100) + "% more, and made " + Math.round((STOT / JT - 1) * 100) + "% more. He moved risk from the weak trade to the strong ones." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 640 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var x0 = n ? 14 : 64, x1 = n ? 426 : 760, y0 = n ? 200 : 96, y1 = n ? 560 : 420;
        var lo = -500, hi = 4600;
        function Y(v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); }
        s += txt(x0, 28, "Illustrative · the day, trade by trade", C.faint, 12);
        for (var p = 0; p <= 4000; p += 1000) {
          s += line(x0, Y(p), x1, Y(p), p === 0 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.05)", 1);
          if (!n) s += txt(x1 + 8, Y(p) + 4, "$" + p.toLocaleString("en-US"), C.faint, 11);
        }
        var slot = (x1 - x0) / DAY.length, bw = slot * (n ? 0.3 : 0.26), jt = 0, st = 0;
        DAY.forEach(function (d, k) {
          var a = ease(fade(T, S[k] + 0.2, 0.8)), cx = x0 + slot * (k + 0.5), op = fade(T, S[k], 0.3);
          if (op <= 0) return;
          [[d.j, JACK, -1, d.jr], [d.s, SAM, 1, d.sr]].forEach(function (q) {
            var x = cx + q[2] * (bw / 2 + 3), yv = Y(q[0] * a), y0b = Y(0);
            s += rect(x - bw / 2, Math.min(y0b, yv), bw, Math.abs(yv - y0b), q[1], 3, op * 0.9);
            s += txt(x, q[0] >= 0 ? yv - 8 : yv + 17 + (n && q[2] < 0 ? 14 : 0), n ? shortMoney(q[0]) : money(q[0]), q[1], n ? 10.5 : 12, "middle", 700, op * a);
            s += txt(x, y1 + (n ? 34 : 36), "$" + q[3], C.faint, n ? 9.5 : 11, "middle", null, op);
          });
          s += txt(cx, y1 + (n ? 16 : 18), (n ? "T" + (k === 3 ? "3b" : k + 1) : d.k) + " · " + d.g, C.dim, n ? 11 : 12, "middle", 600, op);
          jt += d.j * a; st += d.s * a;
        });
        if (!n) s += txt(x0 - 8, y1 + 36, "risk", C.faint, 11, "end");
        /* running totals */
        var bx = n ? 14 : 820, by = n ? 40 : 110, bw2 = n ? 412 : 300;
        s += rect(bx, by, bw2, n ? 120 : 210, C.box, 12, 0.96);
        s += txt(bx + 16, by + (n ? 26 : 32), "Running total", C.faint, 12);
        s += txt(bx + 16, by + (n ? 58 : 80), "Jack · static", JACK, 13, "start", 700);
        s += txt(bx + bw2 - 16, by + (n ? 58 : 80), money(jt), JACK, n ? 18 : 24, "end", 800);
        s += txt(bx + 16, by + (n ? 92 : 132), "Sam · dynamic", SAM, 13, "start", 700);
        s += txt(bx + bw2 - 16, by + (n ? 92 : 132), money(st), SAM, n ? 18 : 24, "end", 800);
        var aG = fade(T, SUM, 0.5);
        if (!n) {
          s += txt(bx + 16, by + 176, "Gap · " + money(STOT - JT).replace("+", ""), C.gold, 15, "start", 700, aG);
          s += callout(bx, by + 236, ["Risked $" + SR.toLocaleString("en-US") + " vs $" + JR, "made " + money(STOT) + " vs " + money(JT)], C.gold, aG);
        } else {
          s += txt(bx + bw2 - 16, by + 114, "gap " + money(STOT - JT).replace("+", ""), C.gold, 12, "end", 700, aG);
        }
        s += txt(L.W - 14, L.H - 8, "Numbers from the video's table", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* =====================================================================
     5 · the risk tiering model
     ===================================================================== */
  var TIERS = [
    { g: "A+", r: 400, col: C.gold, k: "the most risk", d: "rare, everything lines up" },
    { g: "A",  r: 300, col: C.up,   k: "really good risk", d: "catalyst, level, volume, clean" },
    { g: "B",  r: 200, col: C.blue, k: "baseline risk", d: "your standard version" },
    { g: "C",  r: 100, col: "#ff6961", k: "really, really small", d: "choppy, late, not confident" }
  ];
  function tiersSpec() {
    var S1 = 3.4, S2 = 6.6, S3 = 9.8, S4 = 13, END = 19;
    var TODAY = [
      { t: "Premarket high break", g: "A", r: 300, row: 1 },
      { t: "Second chance short", g: "B+", r: 250, row: 2 },
      { t: "Choppy range break", g: "B−", r: 150, row: 2 },
      { t: "Big dog break", g: "A", r: 300, row: 1 }
    ];
    return {
      stages: [
        { at: 0,  title: "Static: one size for everything", text: "Every trade gets the same $200, whether it's a clean A+ or a midday chopfest you aren't even confident in." },
        { at: S1, title: "B is the baseline", text: "Your normal, standard version of a trade in your playbook gets your normal risk. Here that's $200." },
        { at: S2, title: "Press the gas on the A and A+", text: "When the edge is real, the A setups get really good risk and the A+ setups, the favorite, get the most. Small steps up, not ten times more." },
        { at: S3, title: "Coast on the C", text: "The C setups, the ones you take but aren't confident in, get sized really, really small. Or skipped." },
        { at: S4, title: "Today's trades, graded", text: "Sam's day on the model: the premarket high break and the big dog break were A's, the second chance short a B+, the choppy range break a B−. In between grades get in-between risk." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 580 } : { W: 1180, H: 560 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var lx = n ? 14 : 64, bx0 = n ? 70 : 150, bx1 = n ? 350 : 640, ty = n ? 172 : 86, rh = n ? 74 : 78;
        function X(r) { return bx0 + r / 400 * (bx1 - bx0); }
        s += txt(lx, 28, "Illustrative · risk per trade by grade", C.faint, 12);
        [0, 100, 200, 300, 400].forEach(function (r) {
          s += line(X(r), ty - 16, X(r), ty + rh * 4 - 18, "rgba(255,255,255," + (r === 200 ? 0.16 : 0.05) + ")", 1);
          s += txt(X(r), ty + rh * 4, "$" + r, C.faint, 11, "middle");
        });
        TIERS.forEach(function (t, k) {
          var y = ty + k * rh, r = 200, col = C.grey;
          if (k === 2) { col = lerpCol(fade(T, S1, 0.6), C.grey, t.col); }
          if (k < 2) { var m = ease(fade(T, S2 + k * 0.3, 1)); r = lerp(200, t.r, m); col = m > 0 ? t.col : C.grey; }
          if (k === 3) { var m2 = ease(fade(T, S3, 1)); r = lerp(200, t.r, m2); col = m2 > 0 ? t.col : C.grey; }
          s += txt(lx, y + 22, t.g, col, 26, "start", 800);
          s += rect(bx0, y, X(r) - bx0, 30, col, 6, 0.85);
          s += txt(X(r) + 10, y + 21, "$" + Math.round(r), C.ink, 14, "start", 700);
          var on = k === 2 ? fade(T, S1, 0.4) : k < 2 ? fade(T, S2 + 0.8, 0.4) : fade(T, S3 + 0.8, 0.4);
          if (!n) s += txt(bx1 + 70, y + 12, t.k, t.col, 14, "start", 700, on) + txt(bx1 + 70, y + 30, t.d, C.dim, 13, "start", null, on);
          else s += txt(bx0, y + 50, t.k + " · " + t.d, t.col, 11, "start", 600, on);
        });
        s += note({ n: n }, ["Every trade, the same $200"], C.grey, win(T, 0.4, S1), bx1 + 70, ty + 10);
        /* today's trades drop onto the scale */
        var aT = fade(T, S4, 0.4);
        if (aT > 0) {
          var ry = ty + rh * 4 + (n ? 34 : 28);
          s += txt(lx, ry + 5, "Sam today", C.dim, 12, "start", 700, aT);
          s += line(bx0, ry, bx1, ry, "rgba(255,255,255,0.12)", 1, null, aT);
          TODAY.forEach(function (q, k) {
            var a = fade(T, S4 + 0.5 + k * 0.6, 0.4), x = X(q.r) + (k === 3 ? 18 * FS : 0), col = q.row === 1 ? C.up : C.blue;
            s += '<circle cx="' + x.toFixed(1) + '" cy="' + ry.toFixed(1) + '" r="' + (8 * FS).toFixed(1) + '" fill="' + col + '" opacity="' + a.toFixed(3) + '"/>';
            s += txt(x, ry + 4 * FS, String(k + 1), "#000", 10, "middle", 800, a);
            if (!n) {
              var cy = ry + 34;
              s += txt(lx + k * 270, cy, (k + 1) + " · " + q.t + " · ", C.ink, 13, "start", 600, a) + txt(lx + k * 270 + (q.t.length + 7) * 6.5, cy, q.g + " $" + q.r, col, 13, "start", 700, a);
            } else {
              s += txt(14 + (k % 2) * 210, 50 + Math.floor(k / 2) * 44, (k + 1) + " · " + q.t, C.ink, 11, "start", 600, a) + txt(14 + (k % 2) * 210, 68 + Math.floor(k / 2) * 44, q.g + " · $" + q.r, col, 11, "start", 700, a);
            }
          });
        }
        s += txt(L.W - 14, L.H - 8, "Illustrative · example dollar amounts", C.faint, 11, "end");
        return s;
      }
    };
  }
  function lerpCol(m, a, b) {
    function hex(c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
    var A = hex(a), Bc = hex(b);
    return "#" + A.map(function (v, i) { var x = Math.round(lerp(v, Bc[i], clamp01(m))).toString(16); return x.length < 2 ? "0" + x : x; }).join("");
  }

  /* =====================================================================
     6 · the same 60 trades, static vs tiered risk
     ===================================================================== */
  function compoundSpec() {
    var R = rng(2024), N = 60, TR = [];
    var RISK = { "A+": 400, A: 300, B: 200, C: 100 };
    var ODDS = { "A+": [0.7, 2.6], A: [0.6, 2.1], B: [0.5, 1.6], C: [0.36, 1.3] };   // win rate, average winner in R
    for (var i = 0; i < N; i++) {
      var u = R(), g = u < 0.08 ? "A+" : u < 0.3 ? "A" : u < 0.72 ? "B" : "C";
      var w = R() < ODDS[g][0], r = w ? ODDS[g][1] * (0.6 + 0.8 * R()) : -(0.7 + 0.3 * R());
      TR.push({ g: g, r: r });
    }
    var CS = [0], CD = [0], BY = { "A+": [0, 0], A: [0, 0], B: [0, 0], C: [0, 0] };
    TR.forEach(function (t, k) { CS.push(CS[k] + t.r * 200); CD.push(CD[k] + t.r * RISK[t.g]); BY[t.g][0] += t.r * 200; BY[t.g][1] += t.r * RISK[t.g]; });
    var FS0 = CS[N], FD = CD[N], lo = Math.min(0, Math.min.apply(null, CS), Math.min.apply(null, CD)) - 500, hi = Math.max(FS0, FD) * 1.08;
    var S1 = 4.6, S2 = 9, S3 = 13.4, END = 18;
    return {
      stages: [
        { at: 0,  title: "60 trades, static", text: "Sixty made-up trades from one playbook, a mix of A+, A, B and C. Static sizing: $200 on every one. It ends " + money(FS0) + "." },
        { at: S1, title: "The same 60 trades, tiered", text: "Same entries, same exits, same R on every trade. Only the risk changes: A+ $400, A $300, B $200, C $100. It ends " + money(FD) + "." },
        { at: S2, title: "Where the gap comes from", text: "The A and A+ trades earn more because they get more risk. The C trades, the weakest edge, cost half as much when they lose." },
        { at: S3, title: "Subtle shifts, magnified", text: "Nobody went from $100 to $1,000. Small steps, sized to the grade, applied every day. Over a month that's the difference between two traders with the same edge." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 660 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var x0 = n ? 14 : 64, x1 = n ? 370 : 760, y0 = n ? 160 : 70, y1 = n ? 430 : 440;
        function X(i) { return x0 + i * (x1 - x0) / N; }
        function Y(v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); }
        s += txt(x0, 28, "Illustrative · 60 made-up trades, cumulative P&L", C.faint, 12);
        var stepv = hi > 8000 ? 2000 : 1000;
        for (var p = Math.ceil(lo / stepv) * stepv; p <= hi; p += stepv) {
          s += line(x0, Y(p), x1, Y(p), p === 0 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.05)", 1);
          s += txt(x1 + 6, Y(p) + 4, (p < 0 ? "−" : "") + "$" + Math.abs(p / 1000) + "k", C.faint, 11);
        }
        function curve(V, upto, col, w) {
          var pts = [], k = Math.floor(upto);
          for (var j = 0; j <= k && j <= N; j++) pts.push(X(j).toFixed(1) + "," + Y(V[j]).toFixed(1));
          if (k < N) { var f = upto - k; pts.push(lerp(X(k), X(k + 1), f).toFixed(1) + "," + Y(lerp(V[k], V[k + 1], f)).toFixed(1)); }
          return pts.length > 1 ? '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round"/>' : "";
        }
        var u1 = lerp(0, N, clamp01(T / (S1 - 0.6))), u2 = lerp(0, N, clamp01((T - S1) / (S2 - S1 - 0.6)));
        s += curve(CS, u1, JACK, 2.6);
        if (T >= S1) s += curve(CD, u2, SAM, 2.8);
        /* grade ticks along the bottom */
        var gy = y1 + (n ? 14 : 16);
        for (var i2 = 0; i2 < N && i2 < Math.max(u1, 0); i2++) {
          var tc = TIERS.filter(function (t) { return t.g === TR[i2].g; })[0];
          s += rect(X(i2) + 1, gy, Math.max(2, (x1 - x0) / N - 2), n ? 8 : 10, tc.col, 2, 0.85);
        }
        s += txt(x0, gy + (n ? 24 : 28), "grade of each trade", C.faint, 11);
        var k1 = Math.min(N, Math.floor(u1));
        s += txt(X(k1) + 6, Y(CS[k1]) + (n ? 26 : 16), "Static · " + money(CS[k1]), JACK, 12, k1 > N - 18 ? "end" : "start", 700, fade(T, 0.5, 0.4));
        if (T >= S1) { var k2 = Math.min(N, Math.floor(u2)); s += txt(X(k2) - 6, Y(CD[k2]) - 10, "Tiered · " + money(CD[k2]), SAM, 12, "end", 700, fade(T, S1, 0.4)); }
        /* by grade: what each tier contributed */
        var aB = fade(T, S2, 0.5);
        if (aB > 0) {
          var px = n ? 14 : 820, py = n ? 492 : 80, pw = n ? 412 : 300, ph = n ? 34 : 70;
          if (!n) s += rect(px - 14, py - 30, pw + 28, 4 * ph + 50, C.box, 12, aB * 0.96) + txt(px, py - 8, "P&L by grade · static vs tiered", C.faint, 12, "start", null, aB);
          var mx = 0; ["A+", "A", "B", "C"].forEach(function (g) { mx = Math.max(mx, Math.abs(BY[g][0]), Math.abs(BY[g][1])); });
          ["A+", "A", "B", "C"].forEach(function (g, k) {
            var tc = TIERS[k], yy = py + k * ph + (n ? 4 : 10), mid = px + (n ? 40 : 34) + (pw - (n ? 40 : 34)) * 0.28, sc = (pw - (n ? 40 : 34)) * 0.7 / mx;
            var a = aB * fade(T, S2 + 0.3 + k * 0.3, 0.4);
            s += txt(px, yy + (n ? 14 : 22), g, tc.col, n ? 13 : 16, "start", 800, a);
            [[BY[g][0], JACK, 0], [BY[g][1], SAM, 1]].forEach(function (q) {
              var bh = n ? 11 : 16, by = yy + q[2] * (bh + 3), v = q[0] * sc;
              s += rect(v >= 0 ? mid : mid + v, by, Math.abs(v), bh, q[1], 3, a * 0.9);
              if (!n) s += txt(v >= 0 ? mid + v + 6 : mid + v - 6, by + bh - 3, money(q[0]), q[1], 11, v >= 0 ? "start" : "end", 600, a);
            });
            s += line(mid, yy - 2, mid, yy + (n ? 28 : 36), "rgba(255,255,255,0.25)", 1, null, a);
          });
        }
        s += note({ n: n }, ["Same trades, same R", "static " + money(FS0) + " · tiered " + money(FD)], C.gold, fade(T, S3, 0.5), x0 + 12, y0);
        if (n) s += note({ n: n }, ["Static $200 on everything"], JACK, win(T, 0.6, S1), 0, 0) + note({ n: n }, ["Same trades, risk by grade"], SAM, win(T, S1 + 0.3, S3), 0, 0);
        s += txt(L.W - 14, L.H - 8, "Illustrative · made-up trades", C.faint, 11, "end");
        return s;
      }
    };
  }

  var SPECS = { trade1: trade1Spec, trade2: trade2Spec, trade3: trade3Spec, day: daySpec, tiers: tiersSpec, compound: compoundSpec };
  document.querySelectorAll("[data-drs-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-drs-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     build your own tiers, as a stepper: one step at a time, with a small
     picture of 20 examples of one playbook trade. Without the script the
     five steps simply show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-drs-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var GR = ["B", "A", "C", "B", "A+", "B", "C", "A", "B", "B", "C", "A", "B", "A", "C", "B", "A+", "B", "A", "C"];
    var COL = { "A+": C.gold, A: C.up, B: C.blue, C: "#ff6961" };
    var INFO = [
      { k: "Collect 20",  c: C.ink,    tag: "Twenty examples of one playbook trade" },
      { k: "Grade them",  c: C.gold,   tag: "A+, A, B or C, after the fact" },
      { k: "Name why",    c: C.up,     tag: "What the A's had that the C's didn't" },
      { k: "Set the risk", c: C.blue,  tag: "Subtle steps around your baseline" },
      { k: "Grade it live", c: C.cyan, tag: "Before the entry, then size to it" }
    ];
    var LAST = INFO.length - 1, cur = 0;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Build your risk tiers");
    bar.innerHTML = '<span class="gs-line"><i></i></span>' + INFO.map(function (s, i) {
      return '<button type="button" role="tab" class="gs-step" data-i="' + i + '"><b>' + (i + 1) + "</b><span>" + s.k + "</span></button>";
    }).join("");
    var body = document.createElement("div"); body.className = "gs-body";
    var left = document.createElement("div"); left.className = "gs-left";
    var tg = document.createElement("p"); tg.className = "gs-tag";
    var nav = document.createElement("div"); nav.className = "gs-nav";
    nav.innerHTML = '<button type="button" class="pill gs-prev">&lsaquo; Back</button><button type="button" class="pill pill-buy gs-next"></button>';
    var fig = document.createElement("div"); fig.className = "gs-chart";
    fig.innerHTML = '<svg viewBox="0 0 560 300" role="img" aria-label="Twenty examples of one playbook trade, graded into risk tiers, with the current step highlighted"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    function chartAt(k) {
      var narrow = fig.clientWidth > 0 && fig.clientWidth < 460, W = 560, H = narrow ? 520 : 300, s = "";
      var F = narrow ? 1.5 : 1;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      function t(x, y, str, col, size, anchor, weight) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (size * F).toFixed(1) + '" font-weight="' + (weight || 600) + '" text-anchor="' + (anchor || "start") + '">' + str + "</text>"; }
      /* 20 tiles: left half on desktop, top on a phone */
      var gx = narrow ? 30 : 22, gy = narrow ? 20 : 30, tw = narrow ? 96 : 50, th = narrow ? 46 : 46, gap = narrow ? 8 : 6;
      GR.forEach(function (g, i) {
        var c = i % 5, r = Math.floor(i / 5), x = gx + c * (tw + gap), y = gy + r * (th + gap);
        var col = k >= 1 ? COL[g] : "#3a3a3c", dim = k === 2 && g !== "A+" && g !== "A" && g !== "C" ? 0.35 : 1;
        if (k === 4) dim = 0.35;
        s += '<g opacity="' + dim + '"><rect x="' + x + '" y="' + y + '" width="' + tw + '" height="' + th + '" rx="7" fill="#1c1c1e" stroke="' + col + '" stroke-width="' + (k >= 1 ? 2 : 1) + '"/>';
        var pts = [], seed = i * 7 + 3;
        for (var j = 0; j < 6; j++) { seed = (seed * 37 + 11) % 97; pts.push((x + 6 + j * (tw - 12) / 5).toFixed(1) + "," + (y + th - 8 - (j / 5) * (th - 30) * (g === "C" ? 0.3 : g === "B" ? 0.6 : 1) - (seed % 7)).toFixed(1)); }
        s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + (k >= 1 ? col : "#8e8e93") + '" stroke-width="2" stroke-linejoin="round"/>';
        if (k >= 1) s += t(x + tw - 6, y + 15 * (narrow ? 1.2 : 1), g, col, 11, "end", 800);
        s += "</g>";
      });
      var rx = narrow ? 30 : 310, ry = narrow ? 250 : 40, rw = narrow ? 500 : 236;
      if (k === 0) {
        s += t(rx, ry + 10, "One trade from", C.dim, 13) + t(rx, ry + 10 + 20 * F, "your playbook,", C.dim, 13) + t(rx, ry + 10 + 40 * F, "20 times", C.ink, 15, "start", 700);
        s += t(rx, ry + 10 + 76 * F, "screenshots + context", C.faint, 12);
      } else if (k === 1) {
        [["A+", 2], ["A", 5], ["B", 8], ["C", 5]].forEach(function (q, i) {
          var y = ry + 6 + i * 34 * F;
          s += t(rx, y, q[0], COL[q[0]], 16, "start", 800) + t(rx + 46 * F, y, q[1] + " of 20", C.dim, 13);
        });
      } else if (k === 2) {
        s += t(rx, ry + 6, "A's had", C.up, 13, "start", 700);
        ["fresh catalyst", "higher-time-frame level", "volume on the break", "tight, clean base"].forEach(function (q, i) { s += t(rx, ry + 6 + (i + 1) * 19 * F, "✓ " + q, C.dim, 12); });
        s += t(rx, ry + 6 + 5.6 * 19 * F, "C's had", C.orange, 13, "start", 700);
        ["midday chop", "wide range, failed once"].forEach(function (q, i) { s += t(rx, ry + 6 + (6.6 + i) * 19 * F, "✗ " + q, C.dim, 12); });
      } else if (k === 3) {
        TIERS.forEach(function (q, i) {
          var y = ry + i * 40 * F, bw = (narrow ? 320 : 150) * q.r / 400;
          s += t(rx, y + 16 * F, q.g, q.col, 15, "start", 800);
          s += '<rect x="' + (rx + 36 * F).toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (14 * F).toFixed(1) + '" rx="4" fill="' + q.col + '" opacity="0.85"/>';
          s += t(rx + 36 * F + bw + 6, y + 16 * F, "$" + q.r, C.ink, 12, "start", 700);
        });
      } else {
        s += '<rect x="' + (rx - 10) + '" y="' + (ry - 16) + '" width="' + (rw + 10) + '" height="' + (narrow ? 250 : 220) + '" rx="12" fill="#1c1c1e" stroke="' + C.cyan + '"/>';
        s += t(rx, ry + 8, "Today, before the entry", C.faint, 12);
        s += t(rx, ry + 8 + 24 * F, "✓ catalyst  ✓ level", C.dim, 12) + t(rx, ry + 8 + 44 * F, "✓ volume  ✓ tight", C.dim, 12);
        s += t(rx, ry + 8 + 78 * F, "Grade · A", C.up, 17, "start", 800) + t(rx, ry + 8 + 104 * F, "Risk · $300", C.ink, 15, "start", 700);
        s += t(rx, ry + 8 + 128 * F, "not $200, not $2,000", C.faint, 11);
      }
      s += t(narrow ? 30 : 22, H - 8, "Illustrative · made-up examples and amounts", C.faint, 11, "start", 400);
      return s;
    }
    function show(k, focus) {
      cur = k;
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
      svg.innerHTML = chartAt(k);
      if (focus) bar.querySelectorAll(".gs-step")[k].focus();
    }
    bar.addEventListener("click", function (e) { var b = e.target.closest(".gs-step"); if (b) show(+b.getAttribute("data-i")); });
    bar.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" && cur < LAST) { e.preventDefault(); show(cur + 1, true); }
      if (e.key === "ArrowLeft" && cur > 0) { e.preventDefault(); show(cur - 1, true); }
    });
    nav.querySelector(".gs-prev").addEventListener("click", function () { if (cur > 0) show(cur - 1); });
    nav.querySelector(".gs-next").addEventListener("click", function () { show(cur < LAST ? cur + 1 : 0); });
    show(0);
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { svg.innerHTML = chartAt(cur); }, 120); });
  })();

  window.DRSAnim = { _specs: SPECS };            // exposed for checks in testing
})();
