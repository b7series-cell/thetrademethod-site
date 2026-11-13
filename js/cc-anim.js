/* =====================================================================
   cc-anim.js — the animated walkthroughs on covered-calls.html.

     [data-cc-anim="deal"]       buy 100 shares, sell the $34 call, collect $150 today
     [data-cc-anim="scenarios"]  the video's four INTC outcomes, side by side
     [data-cc-anim="payoff"]     profit at expiration: stock alone vs covered call
     [data-cc-anim="duration"]   one six-month call vs three two-month calls
     [data-cc-anim="strike"]     the $34 strike vs the $38 strike
     [data-cc-anim="order"]      500 shares, sell to open 5 contracts, $750

   Same player and chart frame as fp-anim.js: each chart redraws in a
   narrow layout on a phone instead of scrolling sideways, and on a phone
   the callouts sit in a band above the chart so they never cover the lines.

   Prices are the video's INTC numbers; every price path is made up and
   labelled "Illustrative". No market data.
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

  /* =====================================================================
     the deal · buy 100 shares, sell the $34 call, collect $150 today
     ===================================================================== */
  function dealSpec() {
    var B = path(41, 31.2, [
      { n: 5, to: 31.75, noise: 0.12, wick: 0.15 },
      { n: 4, to: 31.35, noise: 0.12, wick: 0.15 },
      { list: [{ c: 31.6 }, { c: 31.82 }, { c: 32.0, v: 0.7 }] },
      { n: 24, to: 32.4, noise: 0.2, wick: 0.15 }       // never shown: the next two months haven't happened yet
    ]);
    var BUY = 11, S1 = 4.2, S2 = 8, S3 = 11.8, S4 = 15.8, END = 20.5;
    return chart({
      bars: B, lo: 29.6, hi: 35.4, step: 1, vol: false, title: "Illustrative · the video's INTC numbers, made-up bars",
      reveal: [[0, 0], [3, BUY + 1]],
      stages: [
        { at: 0,  title: "Buy 100 shares at $32", text: "You own 100 shares of INTC at $32, $3,200 of stock. Options come in 100-share blocks, so 100 shares cover one contract." },
        { at: S1, title: "Sell the $34 call, two months out", text: "You sell someone the right to buy your 100 shares at $34 any time in the next two months. That's the covered call." },
        { at: S2, title: "$150 lands in your account today", text: "$1.50 a share times 100 shares. It's paid up front, and it's yours to keep whatever the stock does next." },
        { at: S3, title: "What you agreed to", text: "If INTC is above $34 at expiration, your shares are sold at $34. If it's below $34, the call expires worthless and you keep the shares." },
        { at: S4, title: "Break-even moves to $30.50", text: "The $1.50 cushions the first $1.50 of a drop. Below $30.50 you're losing money, the same as any other shareholder." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", xb = g.X(BUY), aB = fade(T, 2.8, 0.4), aK = fade(T, S1, 0.5);
        s += ring(xb, g.Y(32), 13, C.ink, aB) + tag(xb, g.Y(30.95), g.n ? "bought $32" : "bought 100 shares · $32", C.ink, aB, "middle");
        if (aK > 0) s += rect(xb + g.cw, g.y0, g.x1 - xb - g.cw, g.y1 - g.y0, C.gold, 0, aK * 0.06);
        s += line(xb + g.cw, g.y0, xb + g.cw, g.y1, C.faint, 1, "3 4", aK) + line(g.x1, g.y0, g.x1, g.y1, C.gold, 1.4, "3 4", aK);
        s += txt(xb + g.cw + 6, g.y1 - 8, "today", C.faint, 11, "start", 600, aK) + txt(g.x1 - 6, g.y1 - 8, g.n ? "expiry" : "expiration · ~2 months", C.gold, 11, "end", 600, aK);
        s += hl(g, 34, BUY, null, C.gold, 2.2, "7 4", aK) + tag(g.x1 - 6, g.Y(34) - 14 * FS, "$34 strike", C.gold, aK, "end");
        var aP = fade(T, S2, 0.4), rise = ease(fade(T, S2, 1.2));
        s += pill(xb + 18, lerp(g.Y(32) - 8, g.Y(33.1), rise), "+$150", C.up, aP * (1 - 0.6 * fade(T, S3, 0.4)));
        s += note(g, ["$1.50 × 100 shares = $150", "in your account today"], C.up, win(T, S2 + 0.5, S3), xb + 90, g.Y(35.25));
        var aA = fade(T, S3 + 0.3, 0.4) * (1 - fade(T, S4, 0.4)), mx = (xb + g.cw + g.x1) / 2;
        s += tag(mx, g.Y(34.6), g.n ? "above: sold at $34" : "above $34 at expiry · shares sold at $34", C.gold, aA, "middle");
        s += tag(mx, g.Y(33.35), g.n ? "below: keep shares" : "below $34 · call expires, keep the shares", C.up, aA, "middle");
        s += note(g, ["What you agreed to", "Above $34: sold at $34", "Below $34: keep the shares"], C.gold, win(T, S3 + 0.5, S4) * (g.n ? 1 : 0), 0, 0);
        var aE = fade(T, S4, 0.5);
        s += hl(g, 30.5, BUY, null, C.blue, 1.8, "5 4", aE) + tag(g.x1 - 6, g.Y(30.5) + 15 * FS, "break-even $30.50", C.blue, aE, "end");
        s += note(g, ["$32 paid − $1.50 collected", "= $30.50 break-even"], C.blue, fade(T, S4 + 0.6, 0.4), xb + 90, g.Y(35.25));
        return s;
      }
    });
  }

  /* =====================================================================
     the four scenarios · same start, four endings, per share
     ===================================================================== */
  function scenariosSpec() {
    var D = 40;
    function walk(seed, end, cap, curve) {
      var R = rng(seed), w = [0];
      for (var i = 1; i <= D; i++) w.push(w[i - 1] + (R() - 0.5) * 0.34);
      return w.map(function (x, i) {
        var f = i / D, v = 32 + (end - 32) * (curve ? Math.pow(f, curve) : f) + (x - f * w[D]);
        return cap != null ? Math.min(v, cap) : v;
      });
    }
    var SC = [
      { p: walk(3, 30), end: 30, col: C.dn, name: "Falls to $30", how: "call expires worthless", cc: "−$0.50", br: "−2.00 stock + 1.50 call", alone: "−$2.00" },
      { p: walk(8, 32, 33.4), end: 32, col: C.ink, name: "Stays at $32", how: "call expires worthless", cc: "+$1.50", br: "about 4.7% in two months", alone: "$0.00" },
      { p: walk(5, 33, 33.7), end: 33, col: C.up, name: "Rises to $33", how: "call expires worthless", cc: "+$2.50", br: "+1.00 stock + 1.50 call", alone: "+$1.00" },
      { p: walk(11, 40, null, 1.6), end: 40, col: C.cyan, name: "Shoots to $40", how: "shares called away at $34", cc: "+$3.50", br: "+2.00 stock + 1.50 call", alone: "+$8.00" }
    ];
    var A = [3.6, 7.8, 12, 16.2], S5 = 21, END = 25.5;
    return {
      stages: [
        { at: 0,    title: "Four ways the next two months can go", text: "Same start every time: 100 shares at $32, the $34 call sold for $1.50. Here's what each path pays at expiration, per share." },
        { at: A[0], title: "INTC falls to $30", text: "Nobody pays $34 for a $30 stock, so the call expires worthless. You're down $2 on the shares and up $1.50 from the premium: −$0.50 instead of −$2." },
        { at: A[1], title: "INTC does nothing", text: "Still $32 at expiration. The call expires and you keep the $1.50: about 4.7% in two months on a stock that didn't move." },
        { at: A[2], title: "INTC rises to $33", text: "Still under $34, so the call expires and you keep the shares. $1 on the stock plus $1.50 premium: $2.50, about 7.8%." },
        { at: A[3], title: "INTC shoots to $40", text: "Now the buyer uses the call: your shares go at $34. $2 on the stock plus $1.50: $3.50, about 10.9%. Holding the stock alone made $8." },
        { at: S5,   title: "The best case is fixed", text: "Every path that ends above $34 pays the same $3.50. You traded the big upside for cash up front, and the stock can still fall." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 800 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var x0 = n ? 14 : 64, x1 = n ? 380 : 640, y0 = n ? 44 : 58, y1 = n ? 330 : 440, lo = 28.6, hi = 41.2;
        function X(i) { return x0 + i * (x1 - x0) / D; }
        function Y(p) { return y1 - (p - lo) / (hi - lo) * (y1 - y0); }
        for (var p = 30; p <= 40; p += 2) { s += line(x0, Y(p), x1, Y(p), "rgba(255,255,255,0.05)", 1) + txt(x1 + 8, Y(p) + 4, "$" + p, C.faint, 11); }
        s += txt(x0, 28, "Illustrative · INTC per share over two months, made-up paths", C.faint, 12);
        s += line(x0, Y(32), x1, Y(32), C.faint, 1, "2 4") + txt(x0 + 4, Y(32) + 16 * FS, "bought $32", C.faint, 11, "start", 600);
        s += line(x0, Y(34), x1, Y(34), C.gold, 2, "7 4") + tag(x0 + 4, Y(34) - 13 * FS, "$34 strike", C.gold, 1);
        s += line(x1, y0, x1, y1, C.faint, 1, "3 4") + txt(x1 - 6, y1 + 18, "expiration", C.faint, 11, "end", 600);
        var cur = -1; A.forEach(function (a, k) { if (T >= a) cur = k; });
        SC.forEach(function (sc, k) {
          var pr = clamp01((T - A[k] - 0.3) / 2.8);
          if (pr <= 0) return;
          var op = T >= S5 ? 0.9 : k === cur ? 1 : 0.28, m = Math.round(pr * D), pts = [];
          for (var i = 0; i <= m; i++) pts.push(X(i).toFixed(1) + "," + Y(sc.p[i]).toFixed(1));
          s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + sc.col + '" stroke-width="2.6" stroke-linejoin="round" opacity="' + op.toFixed(3) + '"/>';
          if (pr >= 1) s += '<circle cx="' + X(D).toFixed(1) + '" cy="' + Y(sc.end).toFixed(1) + '" r="5" fill="' + sc.col + '" opacity="' + op.toFixed(3) + '"/>' +
            txt(X(D) - 10, Y(sc.end) + (k === 1 ? 18 : -9), "$" + sc.end, sc.col, 12, "end", 700, op);
        });
        var aG = fade(T, A[3] + 3.2, 0.4) * (T >= S5 ? 0.6 : 1);
        if (aG > 0) s += rect(X(D - 3), Y(40), X(D) - X(D - 3), Y(34) - Y(40), C.cyan, 3, aG * 0.18) + tag(X(D - 4), Y(38.6), n ? "to the buyer" : "$34 → $40 goes to the buyer", C.cyan, aG, "end");
        /* scoreboard */
        var hy = n ? 372 : 92, cx = n ? 300 : 1000, ax = n ? 426 : 1150, nx = n ? 14 : 700, rh = n ? 82 : 76;
        s += txt(nx, hy, "At expiration", C.faint, 11, "start", 600) + txt(cx, hy, "Covered call", C.faint, 11, "end", 600) + txt(ax, hy, "Stock alone", C.faint, 11, "end", 600);
        s += line(nx, hy + 10, ax, hy + 10, "rgba(255,255,255,0.12)", 1);
        SC.forEach(function (sc, k) {
          var a = fade(T, A[k] + 2.8, 0.4);
          if (a <= 0) return;
          var y = hy + 40 + k * rh, act = k === cur && T < S5;
          if (act) s += rect(nx - 8, y - 24 * FS, ax - nx + 16, (n ? 70 : 58) * FS, C.box, 10, a);
          s += txt(nx, y, sc.name, sc.col, 15, "start", 700, a) + txt(nx, y + 19 * FS, sc.how, C.dim, 12, "start", null, a);
          s += txt(cx, y, sc.cc, k === 0 ? C.dn : C.up, 17, "end", 800, a) + txt(ax, y, sc.alone, k === 3 ? C.cyan : C.dim, 15, "end", 700, a);
          s += n ? txt(nx, y + 37 * FS, sc.br, C.faint, 11, "start", null, a) : txt(cx, y + 19 * FS, sc.br, C.faint, 11, "end", null, a);
        });
        var aE = fade(T, S5 + 0.4, 0.4), fy = hy + 40 + 4 * rh + (n ? 6 : -4);
        s += txt(nx, fy, "Covered call best case: +$3.50 a share, $350 a contract", C.gold, 13, "start", 700, aE);
        s += txt(L.W - 14, L.H - 8, "Illustrative · made-up paths", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* ---------- profit at expiration, per share: the payoff frame shared by two walkthroughs ---------- */
  function payoff(cfg) {
    function size(n) { return n ? { W: 440, H: 640 } : { W: 1180, H: 520 }; }
    function frame(T, L) {
      var n = L.narrow, s = "";
      var x0 = n ? 14 : 64, x1 = n ? 380 : 1080, y0 = n ? 168 : 52, y1 = n ? 584 : 452;
      function X(p) { return x0 + (p - cfg.p0) / (cfg.p1 - cfg.p0) * (x1 - x0); }
      function Y(v) { return y1 - (v - cfg.lo) / (cfg.hi - cfg.lo) * (y1 - y0); }
      for (var v = Math.ceil(cfg.lo / 2) * 2; v <= cfg.hi; v += 2) {
        s += line(x0, Y(v), x1, Y(v), v === 0 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.05)", 1);
        s += txt(x1 + 8, Y(v) + 4, (v > 0 ? "+$" : v < 0 ? "−$" : "$") + Math.abs(v), v === 0 ? C.dim : C.faint, 11);
      }
      for (var p = Math.ceil(cfg.p0 / 2) * 2; p <= cfg.p1; p += n ? 4 : 2) s += txt(X(p), y1 + 18, "$" + p, C.faint, 11, "middle");
      s += txt(x0, n ? 28 : 28, cfg.title, C.faint, 12);
      s += txt(x1, n ? 148 : y0 - 10, "profit or loss per share at expiration", C.faint, 11, "end");
      var g = { T: T, n: n, L: L, X: X, Y: Y, x0: x0, x1: x1, y0: y0, y1: y1 };
      s += cfg.overlay(T, g);
      s += txt(L.W - 14, L.H - 6, "INTC price at expiration →", C.faint, 11, "end");
      return s;
    }
    return { stages: cfg.stages, end: cfg.end, frame: frame, size: size };
  }
  /* draw f(p) from p0 to p0 + pr·(p1 − p0) */
  function curveP(g, cfg, f, pr, col, w, dash, op) {
    if (pr <= 0 || op <= 0) return "";
    var pts = [], pe = lerp(cfg.p0, cfg.p1, clamp01(pr));
    for (var p = cfg.p0; p <= pe + 1e-9; p += 0.25) pts.push(g.X(p).toFixed(1) + "," + g.Y(f(p)).toFixed(1));
    pts.push(g.X(pe).toFixed(1) + "," + g.Y(f(pe)).toFixed(1));
    return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + ' opacity="' + op.toFixed(3) + '"/>';
  }
  function fillP(g, cfg, f, pr, op) {
    if (pr <= 0 || op <= 0) return "";
    var pe = lerp(cfg.p0, cfg.p1, clamp01(pr)), up = [], dn = [];
    for (var p = cfg.p0; p <= pe + 1e-9; p += 0.25) {
      var v = f(p), x = g.X(p).toFixed(1);
      up.push(x + "," + g.Y(Math.max(0, v)).toFixed(1)); dn.push(x + "," + g.Y(Math.min(0, v)).toFixed(1));
    }
    var z0 = g.X(cfg.p0).toFixed(1) + "," + g.Y(0).toFixed(1), z1 = g.X(Math.min(pe, cfg.p1)).toFixed(1) + "," + g.Y(0).toFixed(1);
    return '<polygon points="' + z0 + " " + up.join(" ") + " " + z1 + '" fill="' + C.up + '" opacity="' + (op * 0.13).toFixed(3) + '"/>' +
           '<polygon points="' + z0 + " " + dn.join(" ") + " " + z1 + '" fill="' + C.dn + '" opacity="' + (op * 0.13).toFixed(3) + '"/>';
  }
  function dot(g, p, v, col, op, label, dy, anchor) {
    if (op <= 0) return "";
    return '<circle cx="' + g.X(p).toFixed(1) + '" cy="' + g.Y(v).toFixed(1) + '" r="6" fill="' + col + '" stroke="' + C.bg + '" stroke-width="2" opacity="' + op.toFixed(3) + '"/>' +
      (label ? tag(g.X(p) + (anchor === "end" ? -10 : anchor === "start" ? 10 : 0), g.Y(v) + (dy || -18) * FS, label, col, op, anchor || "middle") : "");
  }
  function vline(g, p, col, op, label) {
    if (op <= 0) return "";
    return line(g.X(p), g.y0, g.X(p), g.y1, col, 1.2, "3 4", op) + (label ? txt(g.X(p) + 6, g.y0 + 14, label, col, 11, "start", 700, op) : "");
  }

  /* =====================================================================
     payoff · profit at expiration, stock alone vs covered call
     ===================================================================== */
  function payoffSpec() {
    function stock(p) { return p - 32; }
    function cc(p) { return Math.min(p, 34) - 30.5; }
    var S1 = 4, S2 = 8, S3 = 11.6, S4 = 15.2, S5 = 19.2, END = 24;
    var cfg = {
      p0: 24, p1: 42, lo: -8.6, hi: 10.6, title: "Illustrative · INTC bought at $32, $34 call sold for $1.50",
      stages: [
        { at: 0,  title: "Owning the stock alone", text: "Profit or loss per share at expiration. Owning the stock alone, every dollar up or down is yours." },
        { at: S1, title: "Add the covered call", text: "The covered call line sits $1.50 higher, the premium you already collected, until $34. Then it goes flat." },
        { at: S2, title: "Max profit: $3.50", text: "Above $34 it doesn't matter how high the stock goes. Your shares are sold at $34, so $2 plus $1.50 is the most you can make." },
        { at: S3, title: "Break-even: $30.50", text: "The premium cushions the first $1.50 of a drop. Below $30.50 the covered call loses money too." },
        { at: S4, title: "A real drop is still yours", text: "At $25 the stock alone is down $7.00 and the covered call is down $5.50. Selling the call softens a fall by $1.50. It doesn't stop one." },
        { at: S5, title: "The four scenarios, on one line", text: "$30, $32, $33 and $40 all sit on the same bent line. Below $34 you're always $1.50 ahead of the stock alone; above it, you're capped." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", pA = clamp01((T - 0.5) / 3), pB = clamp01((T - S1 - 0.2) / 3);
        s += fillP(g, cfg, cc, pB, fade(T, S1 + 0.2, 0.4));
        s += curveP(g, cfg, stock, pA, C.grey, 2.4, null, T >= S1 ? 0.75 : 1) + curveP(g, cfg, cc, pB, C.up, 3.2, null, 1);
        s += tag(g.X(g.n ? 37.6 : 39.4), g.Y(stock(g.n ? 37.6 : 39.4)) - 18 * FS, "stock alone", C.grey, fade(T, 2.6, 0.4) * (1 - fade(T, S5, 0.4)), "end");
        s += tag(g.X(g.n ? 41 : 41.6), g.Y(3.5) + 18 * FS, "covered call", C.up, fade(T, S1 + 2.6, 0.4) * (1 - fade(T, S5, 0.4)), "end");
        var aM = fade(T, S2, 0.4);
        s += vline(g, 34, C.gold, aM * (1 - 0.6 * fade(T, S5, 0.4)), "strike $34");
        s += hl({ x0: g.X(34), x1: g.x1, Y: g.Y }, 3.5, null, null, C.gold, 2, "6 4", aM * (1 - fade(T, S3, 0.4)));
        s += note(g, ["Above $34, it's flat:", "+$3.50 a share, $350 a contract"], C.gold, win(T, S2 + 0.4, S3), g.X(24.4), g.Y(10.2));
        var aE = fade(T, S3, 0.4);
        s += dot(g, 30.5, 0, C.blue, aE * (1 - fade(T, S5, 0.4)), "break-even $30.50", g.n ? 24 : -18, g.n ? "start" : "end");
        s += dot(g, 32, 0, C.grey, aE * (1 - fade(T, S4, 0.4)), g.n ? "stock $32" : "stock alone $32", g.n ? 50 : 22, "start");
        var aD = fade(T, S4, 0.4) * (1 - fade(T, S5, 0.4));
        s += line(g.X(25), g.Y(-7), g.X(25), g.Y(-5.5), C.dn, 1.4, "2 3", aD);
        s += dot(g, 25, -7, C.grey, aD, "−$7.00", 22, "start") + dot(g, 25, -5.5, C.up, aD, "−$5.50", -18, "start");
        s += note(g, ["The stock can still fall.", "The call softens it by $1.50."], C.dn, win(T, S4 + 0.6, S5), g.X(24.4), g.Y(10.2));
        var aS = fade(T, S5, 0.4);
        [[30, "−$0.50", 20, C.dn], [32, "+$1.50", -18], [33, "+$2.50", 22], [40, "+$3.50", -20]].forEach(function (q, k) {
          s += dot(g, q[0], cc(q[0]), q[3] || C.up, aS * fade(T, S5 + 0.3 + k * 0.4, 0.3), q[1], q[2], g.n && k === 1 ? "end" : "middle");
        });
        s += dot(g, 40, 8, C.cyan, aS * fade(T, S5 + 1.9, 0.3), g.n ? "+$8 alone" : "+$8.00 stock alone", 22, g.n ? "end" : "middle");
        return s;
      }
    };
    return payoff(cfg);
  }

  /* =====================================================================
     strike · $34 for $1.50 vs $38 for $0.50
     ===================================================================== */
  function strikeSpec() {
    function stock(p) { return p - 32; }
    function c34(p) { return Math.min(p, 34) - 30.5; }
    function c38(p) { return Math.min(p, 38) - 31.5; }
    var S1 = 3.6, S2 = 7.4, S3 = 11.2, S4 = 14.8, S5 = 19, END = 23;
    var cfg = {
      p0: 26, p1: 41, lo: -6.6, hi: 9.6, title: "Illustrative · INTC bought at $32, two strikes from the video",
      stages: [
        { at: 0,  title: "Two strikes, same stock", text: "Two months out, the $34 call sells for $1.50 and the $38 call for $0.50. The closer the strike is to the price, the more it pays." },
        { at: S1, title: "Sell the $34 call", text: "$1.50 now, and the stock has $2 of room before you're capped at +$3.50." },
        { at: S2, title: "Or sell the $38 call", text: "A third of the premium, but the stock can run to $38 before you're capped at +$6.50." },
        { at: S3, title: "The stock goes nowhere: $34 wins", text: "INTC sits at $32. The $34 call kept you $1.50, the $38 call only $0.50." },
        { at: S4, title: "The stock runs to $38: $38 wins", text: "Now the $34 strike stopped you at +$3.50 while the $38 strike made +$6.50. The two lines cross at $35." },
        { at: S5, title: "That's the dilemma", text: "More premium today, or more room to run. Pick the strike for what you actually expect the stock to do." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", p0 = clamp01((T - 0.4) / 2.6), pA = clamp01((T - S1 - 0.2) / 2.8), pB = clamp01((T - S2 - 0.2) / 2.8);
        s += curveP(g, cfg, stock, p0, C.grey, 1.8, "5 5", 0.6);
        s += curveP(g, cfg, c34, pA, C.up, 3, null, 1) + curveP(g, cfg, c38, pB, C.cyan, 3, null, 1);
        s += tag(g.X(g.n ? 37.4 : 39.6), g.Y(stock(g.n ? 37.4 : 39.6)) - 18 * FS, "stock alone", C.grey, fade(T, 2.4, 0.4), "end");
        s += tag(g.X(41) - 4, g.Y(3.5) + 18 * FS, g.n ? "$34 · max +$3.50" : "$34 strike · max +$3.50", C.up, fade(T, S1 + 2.4, 0.4), "end");
        s += tag(g.X(41) - 4, g.Y(6.5) - 18 * FS, g.n ? "$38 · max +$6.50" : "$38 strike · max +$6.50", C.cyan, fade(T, S2 + 2.4, 0.4), "end");
        var a3 = fade(T, S3, 0.4) * (1 - 0.7 * fade(T, S4, 0.4));
        s += vline(g, 32, C.faint, a3, "$32") + dot(g, 32, 1.5, C.up, a3, "+$1.50", -18, "end") + dot(g, 32, 0.5, C.cyan, a3, "+$0.50", 22, "start");
        var a4 = fade(T, S4, 0.4) * (1 - 0.7 * fade(T, S5, 0.4));
        s += vline(g, 38, C.faint, a4, "$38") + dot(g, 38, 3.5, C.up, a4, "+$3.50", 22, "end") + dot(g, 38, 6.5, C.cyan, a4, "+$6.50", -18, "end");
        s += dot(g, 35, 3.5, C.gold, fade(T, S4 + 1, 0.4) * (1 - 0.7 * fade(T, S5, 0.4)), g.n ? "cross $35" : "they cross at $35", 22, "start");
        s += note(g, ["Closer strike: more premium,", "less room to run"], C.gold, fade(T, S5 + 0.4, 0.4), g.X(26.4), g.Y(9.3));
        return s;
      }
    };
    return payoff(cfg);
  }

  /* =====================================================================
     duration · one six-month call vs three two-month calls
     ===================================================================== */
  function durationSpec() {
    var DAYS = 126;
    function world(seed, drop) {
      var R = rng(seed), w = 0;
      return Array.apply(null, new Array(DAYS + 1)).map(function (_, i) {
        w += (R() - 0.5) * 0.28; w *= 0.96;
        var base = drop ? 32 - 4 * ease(clamp01(i / 42)) : 32;
        return base + w * (i === 0 ? 0 : 1);
      });
    }
    var W1 = world(21, false), W2 = world(23, true);
    var S1 = 4, S2 = 8, S3 = 13.4, S4 = 18.6, END = 23;
    function segs(T) { return T < S3 ? [1.5, 1.5, 1.5] : [1.5, 0.5, 0.5]; }
    return {
      stages: [
        { at: 0,  title: "Same strike, different clock", text: "The $34 call two months out sells for $1.50. Six months out it sells for $2.61. More time on the contract means more premium." },
        { at: S1, title: "Sell one six-month call", text: "$2.61 today, and that's settled for the next six months, whatever INTC does in between." },
        { at: S2, title: "Or three two-month calls", text: "If INTC sits near $32 and the $34 call keeps selling for $1.50, three in a row make $4.50. That beats $2.61." },
        { at: S3, title: "But option prices move", text: "If INTC drops to $28 in the first two months, the next $34 call might fetch about $0.50 or less. Three short calls: about $2.50." },
        { at: S4, title: "Known now, or unknown later", text: "The six-month call tells you today what you'll collect. Short calls might pay more or less, depending on prices you can't see yet." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 580 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var x0 = n ? 14 : 64, x1 = n ? 380 : 1080, y0 = n ? 56 : 56, y1 = n ? 236 : 206, lo = 26.6, hi = 34.6;
        function X(d) { return x0 + d / DAYS * (x1 - x0); }
        function Y(p) { return y1 - (p - lo) / (hi - lo) * (y1 - y0); }
        s += txt(x0, 28, "Illustrative · INTC over six months, made-up paths", C.faint, 12);
        for (var p = 28; p <= 34; p += 2) s += line(x0, Y(p), x1, Y(p), p === 34 ? "rgba(244,185,66,0.5)" : "rgba(255,255,255,0.05)", 1, p === 34 ? "6 4" : null) + txt(x1 + 8, Y(p) + 4, "$" + p, p === 34 ? C.gold : C.faint, 11);
        [0, 2, 4, 6].forEach(function (m) {
          var x = X(m * 21);
          s += line(x, y0, x, n ? 470 : 420, "rgba(255,255,255,0.08)", 1, "3 4") + txt(x, y1 + 18, m === 0 ? "today" : m + " mo", C.faint, 11, m === 0 ? "start" : m === 6 ? "end" : "middle");
        });
        var Wn = T < S3 ? W1 : W2, t0 = T < S3 ? S2 : S3, pr = T < S2 ? 0 : clamp01((T - t0 - 0.3) / 3.6), last = Math.round(pr * DAYS);
        if (T >= S3) { var gp = []; for (var j = 0; j <= DAYS; j++) gp.push(X(j).toFixed(1) + "," + Y(W1[j]).toFixed(1)); s += '<polyline points="' + gp.join(" ") + '" fill="none" stroke="' + C.grey + '" stroke-width="1.6" opacity="0.25"/>'; }
        var pts = []; for (var i = 0; i <= last; i++) pts.push(X(i).toFixed(1) + "," + Y(Wn[i]).toFixed(1));
        if (pts.length > 1) s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + (T < S3 ? C.ink : C.dn) + '" stroke-width="2.4" stroke-linejoin="round"/>';
        s += '<circle cx="' + X(0).toFixed(1) + '" cy="' + Y(32).toFixed(1) + '" r="5" fill="' + C.ink + '"/>' + txt(X(0) + 10, Y(32) - 10, "$32", C.ink, 12, "start", 700);
        if (T >= S3) s += tag(X(44), Y(28) + 22 * FS, n ? "$28 · next call ≈ $0.50" : "INTC at $28 · the next $34 call ≈ $0.50", C.dn, fade(T, S3 + 1.8, 0.4), "start");
        /* the two ways to collect */
        var rA = n ? 296 : 270, rB = n ? 400 : 370, bh = n ? 54 : 50;
        function row(y, label, total, col, op) { return txt(x0, y - 12, label, C.dim, 13, "start", 600, op) + txt(x1, y - 12, total, col, 15, "end", 800, op); }
        var aA = fade(T, S1, 0.4);
        s += row(rA, n ? "One 6-month call" : "One six-month $34 call", "$2.61", C.gold, aA);
        s += rect(X(0) + 2, rA, (X(DAYS) - X(0)) * ease(fade(T, S1, 1.2)) - 4, bh, C.gold, 8, aA * 0.28);
        s += txt((X(0) + X(DAYS)) / 2, rA + bh / 2 + 5, "$2.61 · locked in today", C.gold, 14, "middle", 700, fade(T, S1 + 0.8, 0.4));
        var aB = fade(T, S2, 0.4), V = segs(T), tot = 0;
        V.forEach(function (v, k) {
          var a = aB * clamp01((pr * DAYS - k * 42 + 2) / 6);
          if (a <= 0) return;
          tot += v;
          var good = v >= 1.5, col = good ? C.up : C.orange;
          s += rect(X(k * 42) + 3, rB, X(42) - X(0) - 6, bh, col, 8, a * 0.28) + txt(X(k * 42 + 21), rB + bh / 2 + 5, good ? "$1.50" : "≈ $0.50", col, 14, "middle", 700, a);
        });
        s += row(rB, n ? "Three 2-month calls" : "Three two-month $34 calls", (T >= S3 && tot < 4 ? "≈ $" : "$") + tot.toFixed(2), tot >= 2.61 ? C.up : C.orange, aB);
        var a4 = fade(T, S4, 0.4), ny = rB + bh + (n ? 30 : 32);
        s += txt(x0, ny, n ? "6-month: $0.44 a month, known today" : "Six-month call: about $0.44 a month, known today", C.gold, 12, "start", 600, a4);
        s += txt(x0, ny + 18 * FS, n ? "2-month: $0.75 a month, if prices hold" : "Two-month calls: $0.75 a month, only if prices hold", C.dim, 12, "start", 600, a4);
        s += txt(L.W - 14, L.H - 8, "Illustrative · made-up paths", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* =====================================================================
     the order · 500 shares, sell to open 5 contracts, $750
     ===================================================================== */
  function orderSpec() {
    var S1 = 3.4, S2 = 8.2, S3 = 12.6, S4 = 16.8, END = 21;
    var FIELDS = [["Action", "Sell to open"], ["Quantity", "5 contracts"], ["Symbol", "INTC"], ["Expiration", "about 2 months out"], ["Strike", "$34 call"], ["Limit price", "$1.50"]];
    return {
      stages: [
        { at: 0,  title: "You own 500 shares", text: "Five blocks of 100 shares of INTC. Each block can cover one call contract." },
        { at: S1, title: "Sell to open 5 contracts", text: "One order: sell to open, 5 contracts, the expiration, the $34 strike, and $1.50 as the price. Many brokers also let you buy the stock and sell the call in one order." },
        { at: S2, title: "$1.50 × 100 × 5 = $750", text: "$1.50 a share is $150 a contract. Five contracts is $750, credited to your account as soon as the order fills." },
        { at: S3, title: "Above $34 at expiration", text: "All 500 shares are sold at $34 automatically. You keep the $750 plus $17,000 for the shares." },
        { at: S4, title: "Below $34 at expiration", text: "The five calls expire worthless and drop off on their own. You keep the 500 shares and the $750, and can sell again." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 600 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        s += txt(n ? 14 : 64, 28, "Illustrative · the video's 5-contract example", C.faint, 12);
        /* ticket */
        var tx = n ? 14 : 64, ty = n ? 44 : 64, tw = n ? 412 : 420, th = n ? 226 : 380;
        s += rect(tx, ty, tw, th, C.box, 14, 1) + txt(tx + 16, ty + 28, "Order ticket", C.ink, 15, "start", 700);
        FIELDS.forEach(function (f, k) {
          var a = fade(T, S1 + 0.3 + k * 0.5, 0.3), y = ty + (n ? 62 : 84) + k * (n ? 27 : 46);
          s += line(tx + 16, y + (n ? 9 : 14), tx + tw - 16, y + (n ? 9 : 14), "rgba(255,255,255,0.07)", 1);
          s += txt(tx + 16, y, f[0], C.faint, 13) + txt(tx + tw - 16, y, f[1], k === 0 ? C.up : C.ink, 14, "end", 700, a);
        });
        var cred = Math.min(5, Math.max(0, Math.floor((T - S2 - 0.3) / 0.45) + 1)) * (T >= S2 ? 1 : 0);
        if (!n) s += txt(tx + 16, ty + th - 24, "Credit: $" + (cred * 150).toLocaleString("en-US"), cred ? C.up : C.faint, 17, "start", 800);
        /* the five blocks */
        var bx = n ? 22 : 540, by = n ? 312 : 140, bw = n ? 72 : 104, gap = n ? 9 : 12, bH = n ? 70 : 96;
        var away = ease(fade(T, S3 + 0.4, 1)) * (1 - fade(T, S4, 0.5)), exp = fade(T, S4 + 0.4, 0.5);
        for (var k = 0; k < 5; k++) {
          var x = bx + k * (bw + gap), a = fade(T, 0.3 + k * 0.25, 0.3), dy = -away * (n ? 26 : 40), op = a * (1 - 0.7 * away);
          s += rect(x, by + dy, bw, bH, C.blue, 10, op * 0.3) + txt(x + bw / 2, by + dy + bH / 2 - 2, "100", C.ink, n ? 16 : 20, "middle", 800, op) + txt(x + bw / 2, by + dy + bH / 2 + 18 * FS, "INTC", C.dim, 11, "middle", 600, op);
          var aT = fade(T, S1 + 0.6 + k * 0.35, 0.3) * (1 - exp * 0.75) * (1 - 0.7 * away), ty2 = by + bH + (n ? 10 : 14);
          s += rect(x, ty2, bw, n ? 28 : 34, C.gold, 8, aT * 0.25) + txt(x + bw / 2, ty2 + (n ? 19 : 22), n ? "$34 call" : "1 · $34 call", C.gold, 12, "middle", 700, aT);
          s += pill(x + bw / 2, by - (n ? 10 : 14), "+$150", C.up, k < cred ? (1 - fade(T, S3, 0.4)) : 0, "middle");
        }
        var my = by + bH + (n ? 74 : 92);
        s += txt(bx, my, "$1.50 × 100 shares × 5 contracts = $750", C.up, n ? 14 : 18, "start", 800, fade(T, S2 + 2.4, 0.4));
        s += txt(bx, my + (n ? 30 : 36), n ? "Above $34: all 500 sold at $34" : "Above $34: all 500 shares sold at $34, automatically", C.gold, 13, "start", 700, fade(T, S3 + 0.6, 0.4) * (1 - 0.6 * fade(T, S4, 0.4)));
        s += txt(bx, my + (n ? 30 : 36) + 22 * FS, n ? "$750 + $17,000 for the shares" : "Kept: $750 premium + $17,000 for the shares", C.dim, 12, "start", 600, fade(T, S3 + 1, 0.4) * (1 - 0.6 * fade(T, S4, 0.4)));
        s += txt(bx, my + (n ? 30 : 36) + 52 * FS, n ? "Below $34: calls expire worthless" : "Below $34: the calls expire worthless, the shares stay", C.up, 13, "start", 700, exp);
        s += txt(bx, my + (n ? 30 : 36) + 74 * FS, n ? "Kept: 500 shares + $750" : "Kept: 500 shares + $750, ready to sell again", C.dim, 12, "start", 600, fade(T, S4 + 0.9, 0.4));
        s += txt(L.W - 14, L.H - 8, "Illustrative · not a real order", C.faint, 11, "end");
        return s;
      }
    };
  }

  var SPECS = { deal: dealSpec, scenarios: scenariosSpec, payoff: payoffSpec, strike: strikeSpec, duration: durationSpec, order: orderSpec };
  document.querySelectorAll("[data-cc-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-cc-anim")];
    if (f) player(root, f());
  });
  window.CCAnim = { _specs: SPECS };            // exposed for checks in testing
})();
