/* =====================================================================
   em-anim.js — the animated walkthroughs on expected-move.html.

     [data-em-anim="bell"]      the 68% bell curve, then SPY's weekly numbers on it
     [data-em-anim="chain"]     methods 1 and 2: ATM straddle, then + first ITM strangle ÷ 2
     [data-em-anim="delta"]     method 3: the 16 delta strikes and the put skew
     [data-em-anim="examples"]  SPY, QQQ and AAPL side by side, as % of price
     [data-em-anim="context"]   a made-up week: inside the range, the break, don't chase

   Same player and chart frame as fp-anim.js: each chart redraws in a
   narrow layout on a phone instead of scrolling sideways, and on a phone
   the callouts sit in a band above the chart so they never cover candles.

   The SPY, QQQ and AAPL totals are the ones read off the chains in the
   reference video; individual leg prices and other chain rows are an
   illustrative split. The week chart is made-up bars.
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

  /* a bracket over a span: |———| with a label above it */
  function bracket(xa, xb, y, s, col, op, size) {
    if (op <= 0) return "";
    return line(xa, y, xb, y, col, 1.6, null, op) + line(xa, y - 6, xa, y + 6, col, 1.6, null, op) + line(xb, y - 6, xb, y + 6, col, 1.6, null, op) +
      txt((xa + xb) / 2, y - 10, s, col, size || 14, "middle", 800, op);
  }
  /* a horizontal range bar between two x positions, with a label inside */
  function rbar(xa, xb, y, h, col, s, op) {
    if (op <= 0 || xb <= xa) return "";
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xa.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (xb - xa).toFixed(1) + '" height="' + h + '" rx="5" fill="' + col + '" fill-opacity="0.22" stroke="' + col + '" stroke-width="1.4"/>' +
      (s ? txt((xa + xb) / 2, y + h / 2 + 4 * FS, s, col, 12, "middle", 700) : "") + "</g>";
  }
  function money(v) { return "$" + v.toFixed(2); }

  /* =====================================================================
     what it is · the 68% bell curve, then SPY's numbers on it
     ===================================================================== */
  function bellSpec() {
    var S1 = 3.4, S2 = 6.6, S3 = 9.6, S4 = 12.8, END = 18;
    var LAST = 410.54, EM = 10.19;
    function pdf(z) { return Math.exp(-z * z / 2); }
    return {
      stages: [
        { at: 0,  title: "A bell curve of outcomes", text: "Picture every place price could finish by Friday. Under normal conditions most outcomes bunch up near where it started and thin out the further you go." },
        { at: S1, title: "One standard deviation each way", text: "About 34% of outcomes land between the middle and one standard deviation up, and about 34% between the middle and one standard deviation down." },
        { at: S2, title: "68% inside", text: "Add the two together: roughly 68% of the time, price finishes inside one standard deviation. That band is the expected move." },
        { at: S3, title: "16% in each tail", text: "What's left over is about 16% on each side: 13.5% out to two standard deviations, 2.35% out to three and a sliver beyond. Remember the 16. It comes back in method 3." },
        { at: S4, title: "Now put prices on it", text: "SPY closed Friday at $410.54 and the weekly expected move was ±$10.19, so the one-standard-deviation band for the week runs from $400.35 to $420.73." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 600 } : { W: 1180, H: 500 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var xa = n ? 24 : 90, xb = n ? 416 : 1090, y1 = n ? 500 : 400, h = n ? 250 : 270, Z = 3.2;
        function X(z) { return xa + (z + Z) / (2 * Z) * (xb - xa); }
        function Y(z) { return y1 - pdf(z) * h; }
        function area(a, b, col, op) {
          if (op <= 0) return "";
          var pts = [X(a).toFixed(1) + "," + y1];
          for (var z = a; z <= b + 1e-9; z += 0.04) pts.push(X(z).toFixed(1) + "," + Y(z).toFixed(1));
          pts.push(X(b).toFixed(1) + "," + Y(b).toFixed(1), X(b).toFixed(1) + "," + y1);
          return '<polygon points="' + pts.join(" ") + '" fill="' + col + '" opacity="' + (op * 0.3).toFixed(3) + '"/>';
        }
        s += txt(n ? 14 : 64, 28, "Illustrative · a normal distribution", C.faint, 12);
        /* shading first, so the curve draws on top */
        var a1 = fade(T, S1, 0.6);
        s += area(-1, 0, C.blue, a1) + area(0, 1, C.blue, a1);
        var a3 = fade(T, S3, 0.6);
        s += area(-Z, -1, C.dn, a3) + area(1, Z, C.dn, a3);
        /* the curve */
        var zmax = -Z + 2 * Z * ease(fade(T, 0.2, 2.6)), pts = [];
        for (var z = -Z; z <= zmax + 1e-9; z += 0.04) pts.push(X(z).toFixed(1) + "," + Y(z).toFixed(1));
        if (pts.length > 1) s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.ink + '" stroke-width="2.6" stroke-linejoin="round"/>';
        s += line(xa, y1, xb, y1, "rgba(255,255,255,0.25)", 1);
        /* ±1σ guides */
        [-1, 1].forEach(function (k) { s += line(X(k), y1, X(k), Y(k), C.blue, 1.4, "4 4", a1); });
        s += line(X(0), y1, X(0), Y(0), "rgba(255,255,255,0.3)", 1, "3 4", fade(T, S1, 0.4));
        s += txt(X(-0.5), y1 - h * 0.32, "34%", C.cyan, 18, "middle", 800, a1) + txt(X(0.5), y1 - h * 0.32, "34%", C.cyan, 18, "middle", 800, a1);
        /* 68% */
        var a2 = fade(T, S2, 0.5);
        s += bracket(X(-1), X(1), Y(0) - 26, "68%", C.cyan, a2, 20);
        /* tails */
        var tz = n ? 2.65 : 2.35, ty = n ? y1 - 34 : y1 - 70;
        s += txt(X(-tz), ty, "16%", C.dn, 16, "middle", 800, a3) + txt(X(tz), ty, "16%", C.dn, 16, "middle", 800, a3);
        if (!n) {
          s += txt(X(-tz), ty + 18, "13.5 + 2.35 + 0.15", C.dim, 12, "middle", null, a3 * 0.9) + txt(X(tz), ty + 18, "13.5 + 2.35 + 0.15", C.dim, 12, "middle", null, a3 * 0.9);
        }
        /* axis: σ labels, then SPY's prices */
        var a4 = fade(T, S4, 0.6);
        [-3, -2, -1, 0, 1, 2, 3].forEach(function (k) {
          var lab = k === 0 ? "start" : (k > 0 ? "+" : "−") + Math.abs(k) + "σ";
          var keep = Math.abs(k) <= 1;
          s += txt(X(k), y1 + 22, lab, C.faint, 12, "middle", null, 1 - (keep ? 0 : a4 * 0.75));
          s += line(X(k), y1, X(k), y1 + 6, "rgba(255,255,255,0.3)", 1);
        });
        [[-1, LAST - EM, C.blue], [0, LAST, C.ink], [1, LAST + EM, C.blue]].forEach(function (q) {
          s += txt(X(q[0]), y1 + (n && q[0] === 0 ? 68 : 46), money(q[1]), q[2], n ? 12 : 13, "middle", 700, a4);
        });
        if (n) s += callout(14, 40, ["SPY closed $410.54", "weekly move ±$10.19", "$400.35 to $420.73"], C.gold, a4);
        else s += callout(xb, 46, ["SPY closed $410.54", "weekly expected move ±$10.19", "range $400.35 to $420.73"], C.gold, a4, true);
        if (n) s += callout(14, 40, ["About 68% of the time", "price stays inside ±1σ"], C.cyan, win(T, S2 + 0.3, S3 - 0.3));
        else s += callout(64, 46, ["About 68% of the time", "price stays inside ±1σ"], C.cyan, win(T, S2 + 0.3, S3 - 0.3));
        s += txt(L.W - 14, L.H - 8, "Illustrative · not a forecast", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* =====================================================================
     methods 1 and 2 · the at-the-money straddle, then add the first ITM strangle
     ===================================================================== */
  function chainSpec() {
    var K = [408, 409, 410, 411, 412, 413];
    var CALL = { 408: 6.50, 409: 5.88, 410: 5.29, 411: 4.73, 412: 4.22, 413: 3.75 };
    var PUT  = { 408: 3.96, 409: 4.34, 410: 4.75, 411: 5.18, 412: 5.68, 413: 6.21 };
    var S1 = 3.4, S2 = 6.4, S3 = 10.6, S4 = 14.4, END = 19.5;
    return {
      stages: [
        { at: 0,  title: "Friday's close and the chain", text: "SPY closed at $410.54. Open the options chain for the expiration this coming Friday, six days out. That's the weekly chain." },
        { at: S1, title: "Find the at-the-money strike", text: "$410.54 is 4 cents above $410.50, so round up: the strike closest to the last price is 411." },
        { at: S2, title: "Method 1 · the straddle", text: "Price the 411 call and the 411 put, both on the ask, and add them: $9.91. A quick, rough expected move, about 30 cents under the platform's ±$10.19." },
        { at: S3, title: "Method 2 · add the ITM strangle", text: "Go one strike in the money on each side: the 410 call and the 411 put again, both on the ask. That's $10.47." },
        { at: S4, title: "Divide by two", text: "Straddle plus strangle is $20.38. You added two prices, so take the average: $20.38 ÷ 2 = $10.19, the same number the platform shows." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 660 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var tx0 = n ? 14 : 64, tx1 = n ? 426 : 600, ty0 = n ? 96 : 92, rh = n ? 38 : 50, cw = (tx1 - tx0) / 3;
        function CX(c) { return tx0 + cw * (c + 0.5); }
        function RY(r) { return ty0 + rh * (r + 1); }            /* top of row r; header occupies row -1 */
        s += txt(tx0, 28, "SPY · weekly chain, 6 days to expiration · asks", C.faint, 12);
        s += txt(tx0, n ? 62 : 64, "Last price $410.54", n ? C.gold : C.ink, 15, "start", 700, fade(T, 0.2, 0.4));
        if (n) s += line(tx0 + 196, 57, tx0 + 230, 57, C.gold, 1.6, "5 4", fade(T, 1.6, 0.4));
        if (!n) s += txt(tx1, 64, "platform: expected move ±$10.19", C.dim, 13, "end", null, fade(T, 0.6, 0.4));
        /* header */
        s += rect(tx0, ty0, tx1 - tx0, rh, C.box, 8);
        ["Call ask", "Strike", "Put ask"].forEach(function (h, c) { s += txt(CX(c), ty0 + rh / 2 + 5, h, C.faint, 13, "middle", 600); });
        K.forEach(function (k, r) {
          var y = RY(r), op = fade(T, 0.3 + r * 0.12, 0.3);
          s += line(tx0, y + rh, tx1, y + rh, "rgba(255,255,255,0.07)", 1, null, op);
          s += txt(CX(0), y + rh / 2 + 5, CALL[k].toFixed(2), k <= 410 ? C.ink : C.dim, 15, "middle", null, op);
          s += txt(CX(1), y + rh / 2 + 5, String(k), C.ink, 15, "middle", 700, op);
          s += txt(CX(2), y + rh / 2 + 5, PUT[k].toFixed(2), k >= 411 ? C.ink : C.dim, 15, "middle", null, op);
        });
        /* last price marker between 410 and 411 (0.54 of the way from 410's row centre to 411's) */
        var yl = RY(2) + rh / 2 + 0.54 * rh;
        s += line(tx0, yl, tx1, yl, C.gold, 1.6, "5 4", fade(T, 1.6, 0.4));
        if (!n) s += tag(tx1 + 8, yl, "last $410.54", C.gold, fade(T, 1.6, 0.4), "start");
        /* highlights */
        function cell(r, c, col, op, inset) {
          if (op <= 0) return "";
          var d = inset || 0;
          return '<rect x="' + (CX(c) - cw / 2 + 4 + d).toFixed(1) + '" y="' + (RY(r) + 3 + d).toFixed(1) + '" width="' + (cw - 8 - 2 * d).toFixed(1) + '" height="' + (rh - 6 - 2 * d).toFixed(1) + '" rx="7" fill="none" stroke="' + col + '" stroke-width="2.2" opacity="' + op.toFixed(3) + '"/>';
        }
        var aA = fade(T, S1, 0.4), aM1 = fade(T, S2, 0.4), aM2 = fade(T, S3, 0.4);
        s += cell(3, 1, C.gold, aA);
        s += cell(3, 0, C.blue, aM1) + cell(3, 2, C.blue, aM1);
        s += cell(2, 0, C.orange, aM2) + cell(3, 2, C.orange, aM2, 4);
        if (aM2 > 0) s += tag(CX(2) + cw / 2 - 6, RY(3) + 6, "×2", C.orange, aM2, "end");
        /* the arithmetic */
        var px = n ? 14 : 716, py = n ? RY(6) + 30 : 128, gap = n ? 25 : 30;
        function row(k, str, col, op, size, w) { return txt(px, py + k * gap * (n ? FS : 1), str, col, size || 15, "start", w, op); }
        s += row(0, "Method 1 · at-the-money straddle", C.blue, aM1, 13, 700);
        s += row(1, "411 call 4.73 + 411 put 5.18 = $9.91", C.ink, fade(T, S2 + 0.6, 0.4), 15, 600);
        s += row(2, "rough read · about 30¢ under ±$10.19", C.dim, fade(T, S2 + 1.6, 0.4), 13);
        var o2 = n ? 3.4 : 3.6;
        s += row(o2, "Method 2 · add the first ITM strangle", C.orange, aM2, 13, 700);
        s += row(o2 + 1, "410 call 5.29 + 411 put 5.18 = $10.47", C.ink, fade(T, S3 + 0.6, 0.4), 15, 600);
        var a4 = fade(T, S4, 0.4), o3 = n ? 5.8 : 6.2;
        s += row(o3, "$9.91 + $10.47 = $20.38", C.ink, a4, 15, 600);
        s += row(o3 + (n ? 1.15 : 1.25), "$20.38 ÷ 2 = $10.19", C.up, fade(T, S4 + 0.8, 0.4), 22, 800);
        s += row(o3 + (n ? 2.1 : 2.25), "same as the platform's ±$10.19", C.dim, fade(T, S4 + 1.6, 0.4), 13);
        s += txt(L.W - 14, L.H - 8, "Totals from the video · leg prices an illustrative split", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* =====================================================================
     method 3 · the 16 delta strikes, and the skew they reveal
     ===================================================================== */
  function deltaSpec() {
    var CK = [420.5, 421, 421.5, 422, 422.5, 423], CD = [0.21, 0.19, 0.18, 0.17, 0.15, 0.14];
    var PK = [395, 396, 397, 398, 399, 400], PD = [-0.12, -0.14, -0.15, -0.17, -0.19, -0.21];
    var LAST = 410.54, EM = 10.19, HI = 422.25, LO = 397.5;
    var S1 = 3.4, S2 = 6.8, S3 = 10.2, S4 = 14.2, END = 19.5;
    return {
      stages: [
        { at: 0,  title: "Delta as a probability", text: "An option's delta is roughly the market's odds it finishes in the money. Method 3 skips the pricing and looks for the 16 delta strike on each side." },
        { at: S1, title: "Call side · 16 delta", text: "On the call side, 16 delta falls between the 422 and 422.50 strikes. Call it $422.25: the top of the range." },
        { at: S2, title: "Put side · 16 delta", text: "On the put side (ignore the minus sign), 16 delta falls between 397 and 398. Call it $397.50: the bottom of the range." },
        { at: S3, title: "Wider, and lopsided", text: "Against the ±$10.19 move, the 16 delta range gives $13.04 of room down and only $11.71 up. Put volatility runs higher because markets fall faster than they rise. That's skew." },
        { at: S4, title: "Why 16 works", text: "16% odds of finishing past a strike is the tail beyond one standard deviation. The probability of touching it runs about 31 to 35%, close to the 34% between the middle and the edge." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 600 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        s += txt(n ? 14 : 64, 28, "SPY · weekly chain · delta column", C.faint, 12);
        var ty0 = n ? 56 : 52, rh = n ? 30 : 32;
        function table(x0, x1, K, D, head, col, hit, aHit, label, val) {
          var cw = (x1 - x0) / 2, t = "";
          t += rect(x0, ty0, x1 - x0, rh, C.box, 8);
          t += txt(x0 + cw * 0.5, ty0 + rh / 2 + 5, head + " strike", C.faint, 12, "middle", 600) + txt(x0 + cw * 1.5, ty0 + rh / 2 + 5, "delta", C.faint, 12, "middle", 600);
          K.forEach(function (k, r) {
            var y = ty0 + rh * (r + 1), on = r === hit || r === hit + 1;
            t += line(x0, y + rh, x1, y + rh, "rgba(255,255,255,0.07)", 1);
            t += txt(x0 + cw * 0.5, y + rh / 2 + 5, k.toFixed(k % 1 ? 2 : 0), on && aHit > 0 ? col : C.ink, 14, "middle", on ? 700 : null);
            t += txt(x0 + cw * 1.5, y + rh / 2 + 5, (D[r] < 0 ? "−" : "") + Math.abs(D[r]).toFixed(2), on && aHit > 0 ? col : C.dim, 14, "middle", on ? 700 : null);
          });
          var ym = ty0 + rh * (hit + 2);
          t += line(x0, ym, x1, ym, col, 2, null, aHit);
          t += tag((x0 + x1) / 2, ym, label, col, aHit, "middle");
          if (val) t += txt((x0 + x1) / 2, ty0 + rh * 7 + (n ? 22 : 24), val, col, 15, "middle", 800, aHit);
          return t;
        }
        var cx0 = n ? 14 : 64, cx1 = n ? 214 : 540, px0 = n ? 226 : 640, px1 = n ? 426 : 1116;
        s += table(cx0, cx1, CK, CD, "call", C.up, 3, fade(T, S1, 0.4), "16Δ", "top ≈ $422.25");
        s += table(px0, px1, PK, PD, "put", C.dn, 2, fade(T, S2, 0.4), "16Δ", "bottom ≈ $397.50");
        /* the price ladder */
        var a3 = fade(T, S3, 0.5), lx0 = n ? 14 : 64, lx1 = n ? 426 : 1116, plo = 395, phi = 425;
        function PX(p) { return lx0 + (p - plo) / (phi - plo) * (lx1 - lx0); }
        var by = n ? 400 : 392, bh = n ? 24 : 24, gy = by + bh + (n ? 12 : 12);
        if (a3 > 0) {
          var g1 = ease(fade(T, S3, 1.2)), g2 = ease(fade(T, S3 + 1.2, 1.2));
          s += line(PX(LAST), by - 10, PX(LAST), gy + bh + 10, "rgba(255,255,255,0.35)", 1.2, "3 4", a3);
          s += rbar(PX(LAST - EM * g1), PX(LAST + EM * g1), by, bh, C.blue, "platform ±$10.19", a3);
          s += rbar(PX(LAST - (LAST - LO) * g2), PX(LAST + (HI - LAST) * g2), gy, bh, C.gold, n ? "16 delta" : "16 delta range", a3 * fade(T, S3 + 1.2, 0.3));
          var aL = fade(T, S3 + 2.4, 0.4);
          s += txt(PX(LAST - EM), by - 8, "$400.35", C.blue, 12, "start", 600, aL) + txt(PX(LAST + EM), by - 8, "$420.73", C.blue, 12, "end", 600, aL);
          s += txt(PX(LO), gy + bh + 18 * FS, "$397.50 · −13.04", C.gold, 12, "start", 700, aL) + txt(PX(HI), gy + bh + 18 * FS, "+11.71 · $422.25", C.gold, 12, "end", 700, aL);
          s += txt(PX(LAST), gy + bh + (n ? 46 : 42), "last $410.54", C.ink, 12, "middle", 600, a3);
          if (!n) s += txt(lx1, by - 40, "more room priced to the downside", C.dn, 13, "end", 700, aL);
        }
        var a4 = fade(T, S4, 0.4);
        if (n) s += tag(220, by - 34, "16% past each edge ≈ the 1σ tail", C.gold, a4, "middle");
        else s += tag(lx0, by - 44, "16% past each edge ≈ the tail beyond 1σ", C.gold, a4, "start");
        s += txt(L.W - 14, L.H - 8, "Reads from the video · other rows illustrative", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* =====================================================================
     the same three reads on SPY, QQQ and AAPL, as % of price
     ===================================================================== */
  function examplesSpec() {
    var ROWS = [
      { t: "SPY",  last: 410.54, em: 10.19, lo: 397.5, hi: 422.25, note: "straddle $9.91 · ÷2 read $10.19" },
      { t: "QQQ",  last: 306.20, em: 10.47, lo: 293,   hi: 318,    note: "÷2 read $10.46 · off by a penny" },
      { t: "AAPL", last: 145.38, em: 6.06,  lo: 137.5, hi: 153,    note: "straddle $5.70 · ÷2 read $5.98" }
    ];
    var S1 = 4.6, S2 = 9.2, S3 = 13.8, END = 18.5, M = 6;
    return {
      stages: [
        { at: 0,  title: "SPY", text: "Platform ±$10.19 from $410.54. The 16 delta range, $397.50 to $422.25, leans to the downside." },
        { at: S1, title: "QQQ", text: "Platform ±$10.47 from $306.20, so $295.73 to $316.67. Straddle plus strangle was $20.93, ÷ 2 = $10.46, a penny off. 16 delta: $293 to $318, again more room down." },
        { at: S2, title: "AAPL", text: "Platform ±$6.06 from $145.38, so $139.32 to $151.44. Straddle $5.70, straddle plus strangle $11.97 ÷ 2 ≈ $5.98. 16 delta: about $137.50 to $153, closer to even this time." },
        { at: S3, title: "Same reading, every chain", text: "As a share of price, AAPL priced the biggest week and SPY the smallest. AAPL's skew came out smaller, probably because the chain's strikes were uneven up near 150 to 152.50. Each read is an estimate, not a to-the-penny line." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 640 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var ax0 = n ? 14 : 300, ax1 = n ? 426 : 1110;
        function PX(pct) { return (ax0 + ax1) / 2 + pct / M * (ax1 - ax0) / 2; }
        s += txt(n ? 14 : 64, 28, "Weekly expected move as % of price · 6 days to expiration", C.faint, 12);
        var top = n ? 118 : 96, step = n ? 168 : 136;
        /* grid */
        for (var p = -M; p <= M; p += 2) {
          s += line(PX(p), top - 30, PX(p), top + step * 2 + 70, p === 0 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.06)", 1, p === 0 ? "3 4" : null);
          s += txt(PX(p), top + step * 2 + (n ? 96 : 92), (p > 0 ? "+" : p < 0 ? "−" : "") + Math.abs(p) + "%", C.faint, 11, "middle");
        }
        ROWS.forEach(function (R, k) {
          var at = [0, S1, S2][k], a = fade(T, at, 0.4), y = top + k * step, g = ease(fade(T, at + 0.3, 1.2)), g2 = ease(fade(T, at + 1.2, 1.2));
          if (a <= 0) return;
          var e = R.em / R.last * 100, dl = (R.last - R.lo) / R.last * 100, du = (R.hi - R.last) / R.last * 100;
          if (n) s += txt(14, y - 34, R.t + "  " + money(R.last), C.ink, 15, "start", 800, a) + txt(426, y - 34, R.note, C.dim, 11, "end", null, a * fade(T, at + 2, 0.4));
          else s += txt(64, y + 18, R.t, C.ink, 22, "start", 800, a) + txt(64, y + 42, "last " + money(R.last), C.dim, 13, "start", null, a) + txt(64, y + 62, R.note, C.faint, 12, "start", null, a * fade(T, at + 2, 0.4));
          var bh = 22, al = fade(T, at + 2.2, 0.4);
          s += rbar(PX(-e * g), PX(e * g), y, bh, C.blue, "±" + money(R.em), a);
          s += txt(PX(-e), y - 7, money(R.last - R.em), C.blue, 12, "start", 600, al) + txt(PX(e), y - 7, money(R.last + R.em), C.blue, 12, "end", 600, al);
          var y2 = y + bh + 8;
          s += rbar(PX(-dl * g2), PX(du * g2), y2, bh, C.gold, "16 delta", a * fade(T, at + 1.2, 0.3));
          s += txt(PX(-dl), y2 + bh + 17 * FS, money(R.lo) + (n ? "" : " · −" + dl.toFixed(1) + "%"), C.gold, 12, "start", 700, al) +
               txt(PX(du), y2 + bh + 17 * FS, (n ? "" : "+" + du.toFixed(1) + "% · ") + money(R.hi), C.gold, 12, "end", 700, al);
        });
        if (!n) s += txt(1110, 40, "16 delta", C.gold, 12, "end", 700, fade(T, 0.6, 0.4)) + txt(1040, 40, "platform", C.blue, 12, "end", 700, fade(T, 0.6, 0.4));
        s += txt(L.W - 14, L.H - 8, "Numbers read off the chains in the video", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* =====================================================================
     using it · a made-up week inside its expected move: don't chase the break
     ===================================================================== */
  function contextSpec() {
    var B = path(23, 100, [
      { n: 7, to: 101.3, noise: 0.35, wick: 0.4 },
      { n: 7, to: 103.1, noise: 0.35, wick: 0.4, cap: 103.9 },
      { n: 7, to: 105.6, noise: 0.3, wick: 0.4, v: 0.6 },
      { n: 7, to: 102.7, noise: 0.35, wick: 0.4 },
      { n: 7, to: 101.6, noise: 0.35, wick: 0.4 }
    ]);
    B[0].o = 100;
    var BRK = -1; B.forEach(function (b, i) { if (BRK < 0 && b.c > 104) BRK = i; });
    var PK = 0; B.forEach(function (b, i) { if (b.h > B[PK].h) PK = i; });
    var BACK = -1; B.forEach(function (b, i) { if (BACK < 0 && i > PK && b.c < 104) BACK = i; });
    var S1 = 3.2, S2 = 7.4, S3 = 11.4, S4 = 15.4, END = 19.5;
    var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    return chart({
      bars: B, lo: 94.6, hi: 107.4, step: 2, vol: false, title: "Illustrative · one week against its expected move",
      reveal: [[0, 0], [S1, 0], [S1 + 3.6, 14], [S2, 14], [S2 + 3.4, 21], [S3, 21], [S3 + 3.6, 35]],
      stages: [
        { at: 0,  title: "Draw it before Monday", text: "Take the reading after Friday's close, before Monday's open. A $100 close and a ±$4 weekly move give a $96 to $104 range: two lines and a shaded box." },
        { at: S1, title: "Inside the range", text: "Most of the week's trading happens inside the box. In here, the move is ordinary: about what the options market priced." },
        { at: S2, title: "Cracking out the top", text: "Wednesday breaks above $104. It can keep going, but a brand-new long out here is starting to chase: the market has already moved more than the whole week was priced for." },
        { at: S3, title: "Think about the other side", text: "Instead of chasing, ask whether there's reason to expect a retracement back lower, and whether there's a pullback you can trade. Here price slips back inside by Thursday." },
        { at: S4, title: "Context, not a cage", text: "Prices can and do close outside the range. It isn't a to-the-penny target. It's one more piece of context next to your levels to help you make better decisions." }
      ],
      end: END,
      under: function (T, g) {
        var s = "", a = fade(T, 0.4, 0.6);
        if (a > 0) s += '<rect x="' + g.x0.toFixed(1) + '" y="' + g.Y(104).toFixed(1) + '" width="' + (g.x1 - g.x0).toFixed(1) + '" height="' + (g.Y(96) - g.Y(104)).toFixed(1) + '" fill="' + C.blue + '" opacity="' + (a * 0.1).toFixed(3) + '"/>';
        for (var d = 1; d < 5; d++) { var x = (g.X(d * 7 - 1) + g.X(d * 7)) / 2; s += line(x, g.y0, x, g.y1, "rgba(255,255,255,0.08)", 1, "3 5"); }
        DAYS.forEach(function (dn, d) { s += txt(g.X(d * 7 + 3), g.n ? g.y0 - 8 : g.y1 + 18, dn, C.faint, 11, "middle"); });
        return s;
      },
      overlay: function (T, g) {
        var s = "", a = fade(T, 0.4, 0.6);
        s += hl(g, 104, null, null, C.blue, 2, null, a) + hl(g, 96, null, null, C.blue, 2, null, a) + hl(g, 100, null, null, "rgba(255,255,255,0.4)", 1.2, "4 4", a);
        s += tag(g.x0 + 6, g.Y(104) - 13 * FS, g.n ? "+$4 · top" : "+$4 · top of the expected move", C.blue, a, "start");
        s += tag(g.x1 - 4, g.Y(96) + 14 * FS, "−$4 · bottom", C.blue, a, "end");
        s += tag(g.x0 + 6, g.Y(100) + 14 * FS, "Friday close $100", C.dim, a * (1 - fade(T, S1 + 0.6, 0.5)), "start");
        s += note(g, ["About 68% odds", "price stays in here"], C.cyan, win(T, S1 + 0.6, S2), g.X(0), g.Y(107.2));
        var aB = fade(T, S2, 0.3) * clamp01(g.shown - BRK);
        s += ring(g.X(BRK), g.Y(B[BRK].c), 12, C.orange, aB);
        var aC = fade(T, S2 + 1.6, 0.4) * clamp01(g.shown - PK) * (1 - 0.5 * fade(T, S4, 0.4));
        s += tag(g.X(PK) + (g.n ? 0 : 16), g.Y(B[PK].h) - 16 * FS, "new long up here = chasing", C.orange, aC, g.n ? "middle" : "start");
        var aR = fade(T, S3 + 1.2, 0.4) * clamp01(g.shown - BACK);
        if (aR > 0 && BACK > 0) s += zone(g, PK, BACK + 3, B[BACK].c - 0.4, B[PK].h, C.dn, aR) + (g.n ? tag(g.X(BACK + 3), g.Y(99), "back inside", C.dn, aR, "middle") : tag(g.X(BACK + 3) + g.cw + 6, g.Y(103), "back inside", C.dn, aR, "start"));
        s += note(g, ["A piece of context,", "not a to-the-penny line"], C.gold, fade(T, S4 + 0.6, 0.4), g.X(0), g.Y(107.2));
        return s;
      }
    });
  }

  var SPECS = { bell: bellSpec, chain: chainSpec, delta: deltaSpec, examples: examplesSpec, context: contextSpec };
  document.querySelectorAll("[data-em-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-em-anim")];
    if (f) player(root, f());
  });
  window.EMAnim = { _specs: SPECS };            // exposed for checks in testing
})();
