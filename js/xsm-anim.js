/* =====================================================================
   xsm-anim.js — the animated walkthroughs on
   famous-strategies/cross-sectional-momentum.html
   (Jegadeesh and Titman, 1993, "Returns to Buying Winners and Selling Losers").

     [data-xsm-anim="rank"]       rank the whole universe on past returns, split into tenths,
                                  long the top tenth, short the bottom tenth
     [data-xsm-anim="window"]     formation period J, the skip, holding period K, and the
                                  overlapping monthly cohorts
     [data-xsm-anim="event"]      what the paper found in event time: up about 9.5% after a
                                  year, about half of it given back over the next two
     [data-xsm-anim="crash"]      the 2009 momentum crash (Daniel and Moskowitz, 2016)
     [data-xsm-anim="rebalance"]  a long-only version: hold the top 3 of 12, re-rank monthly
     [data-xsm-steps]             "the strategy, step by step" as a click-through stepper

   Same player as pyr-anim.js: each chart redraws in a narrow layout on a
   phone instead of scrolling sideways, and on a phone the notes sit in a
   band above the chart so they never cover it.

   Figures quoted from the papers are labelled on the charts; every stock,
   ranking and price path is made up.
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
  function hbar(x, y, w, h, col, op) { return rect(Math.min(x, x + w), Math.min(y, y + h), Math.abs(w), Math.abs(h), col, 2, op); }
  function pct(v, d) { return (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), d || 0) + "%"; }
  function bracket(x1, x2, y, col, op, up) {
    if (op <= 0) return "";
    var d = up ? 8 : -8;
    return poly([[x1, y + d], [x1, y], [x2, y], [x2, y + d]], col, 2, null, op);
  }

  /* =====================================================================
     1 · Rank the universe, split it into tenths, long the top, short the bottom
     ===================================================================== */
  function rankSpec() {
    var RET = [12, -31, 45, 7, -8, 88, 23, -19, 3, 61, -44, 15, -2, 34, 9, -26, 52, 0, 19, -12, 71, 5, -37, 28, -5, 40, 11, -15, 18, -22];
    var N = RET.length, lo = -50, hi = 100;
    var order = RET.map(function (v, i) { return i; }).sort(function (a, b) { return RET[b] - RET[a]; });
    var rankOf = []; order.forEach(function (i, r) { rankOf[i] = r; });
    var ST = [
      { at: 0, title: "The whole universe", text: "Start with every stock in the universe, not a watchlist of favorites. Each bar is one made-up stock, and its height is its return over the formation period: the last 3 to 12 months, depending on the version." },
      { at: 3.2, title: "Rank them on past return", text: "Sort every stock from the best past return to the worst. That's the cross-section: each stock is judged against all the others on the same date, not against its own history." },
      { at: 6.4, title: "Split into tenths", text: "Cut the ranked list into ten equal groups, deciles. Jegadeesh and Titman call the top tenth the winners and the bottom tenth the losers. The middle eight tenths are ignored." },
      { at: 9.6, title: "Buy winners, short losers", text: "Buy the top tenth and sell short the bottom tenth, each stock equally weighted. The bet isn't that the market goes up. It's that winners keep beating losers." },
      { at: 12.8, title: "A zero-cost portfolio", text: "The dollars on the long side match the dollars on the short side, so the paper treats it as zero-cost: the return is the winners' return minus the losers' return. On this made-up ranking that's +73% against −37%." }
    ];
    return {
      stages: ST, end: 16.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var m = ease(fade(T, 3.4, 2.2)), dec = fade(T, 6.6, 0.6), side = fade(T, 9.8, 0.6), zc = fade(T, 13, 0.6);
        var slot, bw, P, V, Z;
        if (!n) {
          slot = (g.x1 - g.x0) / N; bw = slot * 0.66;
          P = function (p) { return g.x0 + (p + 0.5) * slot; };
          V = function (v) { return g.y1 - 30 - (v - lo) / (hi - lo) * (g.y1 - 30 - g.y0 - 30); };
          Z = V(0);
        } else {
          slot = (g.y1 - g.y0 - 20) / N; bw = slot * 0.7;
          P = function (p) { return g.y0 + 20 + (p + 0.5) * slot; };
          V = function (v) { return g.x0 + 40 + (v - lo) / (hi - lo) * (g.x1 - g.x0 - 80); };
          Z = V(0);
        }
        s += txt(g.x0, g.y0 - (n ? 14 : 14), n ? "30 made-up stocks · past return" : "30 made-up stocks · return over the formation period", C.faint, 12, "start", 600);
        /* zero line */
        s += n ? line(Z, g.y0 + 14, Z, g.y1, "#48484a", 1.2) : line(g.x0, Z, g.x1, Z, "#48484a", 1.2);
        s += n ? txt(Z, g.y0 + 10, "0%", C.faint, 11, "middle") : txt(g.x1 + 6, Z + 4, "0%", C.faint, 11);
        /* decile dividers */
        if (dec > 0) {
          for (var d = 1; d < 10; d++) {
            var at = P(d * 3 - 0.5);
            s += n ? line(g.x0, at, g.x1, at, "#3a3a3c", 1, "3 4", dec) : line(at, g.y0 + 6, at, g.y1, "#3a3a3c", 1, "3 4", dec);
          }
          for (var d2 = 0; d2 < 10; d2++) {
            var c = P(d2 * 3 + 1), lab = "P" + (10 - d2), col = d2 === 0 ? C.up : d2 === 9 ? C.dn : C.faint;
            s += n ? txt(g.x1 + 30, c + 4, lab, col, 10, "end", 600, dec) : txt(c, g.y1 + 2, lab, col, 11, "middle", 600, dec);
          }
        }
        /* the bars */
        RET.forEach(function (v, i) {
          var grow = ease(fade(T, 0.2 + i * 0.07, 0.6));
          if (grow <= 0) return;
          var p = lerp(i, rankOf[i], m), r = rankOf[i], vv = v * grow;
          var isW = r < 3, isL = r >= N - 3;
          var col = v >= 0 ? C.up : C.dn, op = 0.8;
          if (dec > 0) { if (isW) { col = C.up; op = 1; } else if (isL) { col = C.dn; op = 1; } else { col = v >= 0 ? C.up : C.dn; op = 0.8 - 0.55 * dec; } }
          if (Math.abs(vv) < 0.6) vv = vv < 0 ? -0.6 : 0.6;
          if (!n) s += hbar(P(p) - bw / 2, Z, bw, V(vv) - Z, col, op);
          else s += hbar(Z, P(p) - bw / 2, V(vv) - Z, bw, col, op);
          if (dec > 0 && (isW || isL)) {
            if (!n) post += txt(P(p), v >= 0 ? V(v) - 7 : V(v) + 15, pct(v), col, 11, "middle", 700, dec);
            else post += txt(v >= 0 ? V(v) + 5 : V(v) - 5, P(p) + 4, pct(v), col, 10.5, v >= 0 ? "start" : "end", 700, dec);
          }
        });
        /* long and short brackets */
        if (side > 0) {
          if (!n) {
            post += bracket(P(0) - bw / 2, P(2) + bw / 2, V(100) - 4, C.up, side, true) + tag(P(1), V(100) - 18, "LONG", C.up, side, "middle");
            post += bracket(P(27) - bw / 2, P(29) + bw / 2, V(-50) + 10, C.dn, side, false) + tag(P(28), V(-50) + 26, "SHORT", C.dn, side, "middle");
          } else {
            post += tag(Z - 8, P(1) + 1, "LONG", C.up, side, "end");
            post += tag(Z + 8, P(28) + 1, "SHORT", C.dn, side, "start");
          }
        }
        if (zc > 0) {
          var mid = n ? P(14.5) : V(70);
          if (!n) post += tag((P(3) + P(26)) / 2, mid, "winners − losers = +73% − (−37%) = +110 pts", C.gold, zc, "middle");
          else post += tag((g.x0 + g.x1) / 2 + 20, P(14), "+73% − (−37%)", C.gold, zc, "middle");
        }
        s += post;
        s += note2(g, ["The universe", "Every stock, same date,", "same formation period."], C.blue, win(T, 0.3, 3.2));
        s += note2(g, ["Rank, best to worst", "Judged against each other,", "not against their own past."], C.blue, win(T, 3.4, 6.4));
        s += note2(g, ["Ten equal groups", "P10: winners (top tenth)", "P1: losers (bottom tenth)", "P2 to P9: ignored"], C.ink, win(T, 6.6, 9.6));
        s += note2(g, ["Long P10, short P1", "Equal weight in each.", "The bet: winners keep", "beating losers."], C.up, win(T, 9.8, 12.8));
        s += note2(g, ["Zero-cost", "Long dollars = short dollars.", "Return = winners minus", "losers, not the market."], C.gold, fade(T, 13, 0.4));
        return s + stamp(L, "Illustrative · made-up stocks and returns");
      }
    };
  }

  /* =====================================================================
     2 · Formation J, the skip, holding K, and the overlapping cohorts
     ===================================================================== */
  function windowSpec() {
    var M = 26, J = 12, K = 6;
    var ST = [
      { at: 0, title: "Formation: the last J months", text: "J is the lookback. Jegadeesh and Titman tested 3, 6, 9 and 12 months. Every stock's return over that window decides where it ranks. Here J is 12 months." },
      { at: 3.4, title: "Skip the most recent stretch", text: "The paper also ran every test with a one-week gap between ranking and buying, to sidestep the bid-ask bounce and very short-term reversal. Later research usually skips the most recent month (ranking on months t−12 to t−2)." },
      { at: 6.4, title: "Hold for K months", text: "K is the holding period, also 3, 6, 9 or 12 months in the paper. Here it's 6. The position isn't touched in between: no stops, no profit targets, no chart reading." },
      { at: 9.6, title: "A new cohort every month", text: "Next month you rank again and build a new portfolio, but last month's is still being held. With K = 6 you always hold six overlapping cohorts, each one sixth of the book, and one sixth is replaced every month." },
      { at: 14, title: "16 combinations tested", text: "J × K = 16 versions, each run with and without the one-week skip. All of them made money in the 1965–1989 sample. The best was 12-month ranking with 3-month holding: 1.31% a month, or 1.49% a month with the skip." }
    ];
    return {
      stages: ST, end: 19, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (mo) { return g.x0 + mo / M * (g.x1 - g.x0); };
        var gridOp = fade(T, 14.2, 0.6), rowsOp = 1 - gridOp;
        var rh = n ? 26 : 30, gap = n ? 54 : 52, top = g.y0 + (n ? 40 : 54);
        if (rowsOp > 0) {
          s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Months · J = 12, K = 6" : "Months · formation J = 12, holding K = 6", C.faint, 12, "start", 600, rowsOp);
          for (var mo = 0; mo <= M; mo += 3) {
            s += line(X(mo), top - 16, X(mo), g.y1 - 10, "#2c2c2e", 1, null, rowsOp);
            s += txt(X(mo), g.y1 + 6, String(mo), C.faint, 11, "middle", null, rowsOp);
          }
          var cohorts = 1 + Math.floor(clamp01((T - 9.8) / 3.6) * 5.999);
          if (T < 9.8) cohorts = 1;
          for (var k = 0; k < cohorts; k++) {
            var y = top + k * gap, a0 = k === 0 ? 0 : 9.8 + (k - 1) * 0.72, op = rowsOp * (k === 0 ? 1 : fade(T, a0, 0.4));
            if (op <= 0) continue;
            var fp = k === 0 ? ease(fade(T, 0.3, 2.6)) : 1;
            var sp = k === 0 ? fade(T, 3.6, 0.6) : 1;
            var hp = k === 0 ? ease(fade(T, 6.6, 2.2)) : 1;
            var f0 = X(k), f1 = X(k + J * fp), s1 = X(k + J + 1), h1 = X(k + J + 1 + K * hp);
            s += rect(f0, y, f1 - f0, rh, C.blue, 4, (k === 0 ? 0.85 : 0.35) * op);
            if (sp > 0) s += rect(X(k + J) + 2, y, X(k + J + 1) - X(k + J) - 4, rh, C.grey, 3, 0.55 * sp * op);
            if (hp > 0 && sp > 0) s += rect(s1, y, h1 - s1, rh, C.up, 4, (k === 0 ? 0.95 : 0.6) * op);
            if (k === 0) {
              post += txt((f0 + X(k + J)) / 2, y + rh / 2 + 4.5, n ? "formation · 12" : "formation · 12 months", "#000", 12, "middle", 700, op * fade(T, 1.6, 0.5));
              if (sp > 0) post += txt(X(k + J + 0.5), y - 8, "skip", C.dim, 11, "middle", 600, sp * op);
              if (hp > 0.5) post += txt((s1 + X(k + J + 1 + K)) / 2, y + rh / 2 + 4.5, n ? "hold" : "hold · 6", "#000", 12, "middle", 700, op * fade(T, 7.4, 0.5));
            } else {
              post += txt(f0 - 6, y + rh / 2 + 4, "#" + (k + 1), C.faint, 11, "end", 600, op);
            }
          }
          /* the "today" line through every cohort's holding period */
          var tl = fade(T, 13.2, 0.5) * rowsOp;
          if (tl > 0) {
            var xt = X(19.5);
            s += line(xt, top - 22, xt, top + 5 * gap + rh + 8, C.gold, 2, "6 4", tl);
            post += tag(xt, top - 30, n ? "today: 6 held" : "today: 6 cohorts held", C.gold, tl, "middle");
          }
        }
        /* the J x K grid */
        if (gridOp > 0) {
          var Js = [3, 6, 9, 12], Ks = [3, 6, 9, 12];
          var gx0 = n ? g.x0 + 56 : g.x0 + 120, gy0 = n ? g.y0 + 60 : g.y0 + 50, cw = n ? 76 : 140, ch = n ? 92 : 92;
          s += txt(gx0 + cw * 2, gy0 - 22, "K · holding months", C.faint, 12, "middle", 600, gridOp);
          s += '<g opacity="' + gridOp.toFixed(3) + '"><text transform="translate(' + (gx0 - 40) + "," + (gy0 + ch * 2) + ') rotate(-90)" fill="' + C.faint + '" font-size="' + (12 * FS).toFixed(1) + '" text-anchor="middle" font-weight="600">J · formation months</text></g>';
          Js.forEach(function (j, r) {
            s += txt(gx0 - 10, gy0 + r * ch + ch / 2 + 5, String(j), C.dim, 13, "end", 700, gridOp);
            Ks.forEach(function (kk, c) {
              var hot = (j === 12 && kk === 3) || (j === 6 && kk === 6);
              var x = gx0 + c * cw, y = gy0 + r * ch;
              s += rect(x + 3, y + 3, cw - 6, ch - 6, hot ? (j === 12 ? C.up : C.blue) : "#2c2c2e", 8, gridOp * (hot ? 0.9 : 1));
              if (r === 0) s += txt(x + cw / 2, gy0 - 6, String(kk), C.dim, 13, "middle", 700, gridOp);
              if (hot) {
                s += txt(x + cw / 2, y + ch / 2 - 6, j === 12 ? "1.31%" : "0.95%", "#000", n ? 13 : 16, "middle", 800, gridOp);
                s += txt(x + cw / 2, y + ch / 2 + 14, n ? (j === 12 ? "1.49% skip" : "1.10% skip") : (j === 12 ? "1.49% w/ skip" : "1.10% w/ skip"), "#000", 11, "middle", 600, gridOp);
              } else s += txt(x + cw / 2, y + ch / 2 + 4, "+", C.faint, 14, "middle", 600, gridOp);
            });
          });
          if (!n) post += txt(gx0, gy0 + ch * 4 + 30, "Per month, winners minus losers. + = also profitable; only the two highlighted figures are quoted here.", C.faint, 12, "start", 500, gridOp);
          else post += txt(g.x0, gy0 + ch * 4 + 26, "Per month, winners minus losers.", C.faint, 11, "start", 500, gridOp);
        }
        s += post;
        s += note2(g, ["J: the lookback", "Rank on the last 3, 6,", "9 or 12 months."], C.blue, win(T, 0.3, 3.4));
        s += note2(g, ["The skip", "J&T: one week.", "Later work: one month", "(rank on t−12 to t−2)."], C.grey, win(T, 3.6, 6.4));
        s += note2(g, ["K: the holding period", "3, 6, 9 or 12 months.", "No stops, no targets."], C.up, win(T, 6.6, 9.6));
        s += note2(g, ["Overlapping cohorts", "Six held at once,", "each 1/6 of the book.", "1/6 replaced monthly."], C.gold, win(T, 9.8, 14));
        s += note2(g, ["The paper's grid", "12/3 was the best:", "1.31% a month,", "1.49% with the skip.", "6/6: 0.95% and 1.10%."], C.up, fade(T, 14.2, 0.4));
        return s + stamp(L, gridOp > 0.5 ? "Figures: Jegadeesh & Titman (1993), 1965–1989" : "Illustrative timeline");
      }
    };
  }

  /* =====================================================================
     3 · Event time: up about 9.5% after a year, about half given back by month 36
     ===================================================================== */
  function eventSpec() {
    var lo = -2, hi = 12, M = 36;
    function path(mo) {
      var base = mo <= 12 ? 9.5 * (1 - Math.pow(1 - mo / 12, 1.7)) : 9.5 - 5.5 * ease((mo - 12) / 24);
      var w = Math.sin(mo * 1.9) * 0.14 + Math.sin(mo * 0.7 + 1) * 0.09;
      var damp = Math.min(mo, Math.abs(12 - mo), 36 - mo, 3) / 3;
      return base + w * damp;
    }
    var ST = [
      { at: 0, title: "Form the portfolio, then just watch", text: "The paper's event-time test: form winners-minus-losers, then track its cumulative return month by month for three years after formation, with no rebalancing. The line's path here is drawn for illustration; the two marked points are the paper's." },
      { at: 3, title: "Year one: about +9.5%", text: "Over the first 12 months after formation, the zero-cost portfolio earned an average cumulative return of about 9.5%. Winners kept beating losers for a year." },
      { at: 7.4, title: "Years two and three: half fades", text: "Then it reverses. More than half of the first year's return is lost over the next 24 months, leaving about 4% by month 36. The authors note those later negative returns are not statistically significant." },
      { at: 11.6, title: "Hold months, not years", text: "That's why the strategy rebalances. The edge lives in the first year. Holding winners for three years hands much of it back, which fits the paper's reading: prices underreact at first, then overshoot." }
    ];
    return {
      stages: ST, end: 15, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        if (n) g.y1 = L.H - 84;
        var X = function (mo) { return g.x0 + mo / M * (g.x1 - g.x0); }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Winners − losers · cumulative" : "Winners minus losers · cumulative return after formation", C.faint, 12, "start", 600);
        for (var v = 0; v <= 12; v += 2) { s += line(g.x0, Y(v), g.x1, Y(v), v === 0 ? "#48484a" : "#2c2c2e", 1); s += txt(g.x1 + 6, Y(v) + 4, v + "%", C.faint, 11); }
        for (var mo = 0; mo <= 36; mo += 6) s += txt(X(mo), g.y1 + 18, mo === 0 ? "0" : String(mo), C.faint, 11, "middle");
        s += txt(g.x1, g.y1 + 34, "months after formation", C.faint, 11, "end");
        var y1 = fade(T, 0.4, 0.4), yr1 = win(T, 3.2, 11.6) * 0.16, yr23 = fade(T, 7.6, 0.4) * 0.14;
        if (y1 > 0) { s += rect(X(0), g.y0, X(12) - X(0), g.y1 - g.y0, C.up, 0, 0.05 + yr1); post += txt((X(0) + X(12)) / 2, g.y0 + 18, "year 1", C.up, 12, "middle", 700, y1); }
        if (yr23 > 0) { s += rect(X(12), g.y0, X(36) - X(12), g.y1 - g.y0, C.dn, 0, yr23); post += txt((X(12) + X(36)) / 2, g.y0 + 18, "years 2 and 3", C.dn, 12, "middle", 700, fade(T, 7.6, 0.4)); }
        var upto = track([[0, 0], [3.2, 0], [7, 12], [7.6, 12], [11.4, 36]], T);
        var pts = [];
        for (var m2 = 0; m2 <= upto + 1e-6; m2 += 0.25) pts.push([X(m2), Y(path(m2))]);
        if (pts.length > 1) {
          var area = "M" + X(0).toFixed(1) + "," + Y(0).toFixed(1) + " " + pts.map(function (p) { return "L" + p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + " L" + pts[pts.length - 1][0].toFixed(1) + "," + Y(0).toFixed(1) + "Z";
          s += '<path d="' + area + '" fill="' + C.gold + '" opacity="0.10"/>';
          s += poly(pts, C.gold, 2.6);
          s += dot(pts[pts.length - 1][0], pts[pts.length - 1][1], 4.5, C.gold);
        }
        var p12 = fade(T, 7, 0.4), p36 = fade(T, 11.4, 0.4);
        if (p12 > 0) { s += dot(X(12), Y(9.5), 7, C.up, p12, true); post += tag(X(12), Y(9.5) - 22, n ? "≈ +9.5%" : "month 12: ≈ +9.5%", C.up, p12, "middle"); }
        if (p36 > 0) { s += dot(X(36), Y(4), 7, C.dn, p36, true); post += tag(X(36) - 6, Y(4) - 22, n ? "≈ +4%" : "month 36: ≈ +4%", C.dn, p36, "end"); }
        var giv = fade(T, 11.8, 0.4);
        if (giv > 0) { s += arrow(X(30), Y(9.5), X(30), Y(4.6), C.dn, giv); post += tag(X(30) + 8, Y(7.2), n ? "half back" : "more than half given back", C.dn, giv, "start"); }
        s += post;
        s += note2(g, ["Event time", "Form once, then hold", "and track for 36 months.", "No rebalancing."], C.gold, win(T, 0.3, 3));
        s += note2(g, ["Year one", "About +9.5% cumulative", "for winners minus losers."], C.up, win(T, 3.2, 7.4));
        s += note2(g, ["Years two and three", "More than half given back,", "about +4% by month 36.", "(Not statistically", "significant, per the paper.)"], C.dn, win(T, 7.6, 11.6));
        s += note2(g, ["The takeaway", "The edge is in the first", "year. Rebalance; don't", "marry the winners."], C.blue, fade(T, 11.8, 0.4));
        return s + stamp(L, n ? "Points: J&T (1993) · path illustrative" : "Marked points: Jegadeesh & Titman (1993) · path between them illustrative");
      }
    };
  }

  /* =====================================================================
     4 · The 2009 momentum crash (Daniel and Moskowitz, 2016)
     ===================================================================== */
  function crashSpec() {
    var IDX = [100, 102, 99, 96, 98, 93, 90, 92, 86, 80, 83, 74, 66, 70, 61, 55, 58, 52, 49, 54, 50, 46, 44];
    var REB = [44, 50, 53, 56, 55, 59, 61, 63];
    var ST = [
      { at: 0, title: "First, a bear market", text: "Momentum's worst months don't come out of nowhere. They follow a big market decline. In 2008 and early 2009 the market fell hard (the path here is drawn for illustration), and the stocks that fell most landed in the loser decile." },
      { at: 3.6, title: "The short side loads up on beta", text: "After a crash, the loser decile is full of beaten-down, high-beta stocks. Daniel and Moskowitz found loser betas above 3 after market declines. The momentum portfolio is now short a lot of market exposure without meaning to be." },
      { at: 6.8, title: "The rebound: March to May 2009", text: "Then the market turned. From March to May 2009 the market rose 26%, the past winners rose 8%, and the past losers rose 163%. The stocks you were short went up six times as much as the market." },
      { at: 10.4, title: "The momentum portfolio crashes", text: "Winners minus losers lost 42% in March 2009 and 46% in April 2009 (value-weighted deciles, ranked on months t−12 to t−2). Years of gains can go in two months." },
      { at: 14, title: "When it happens", text: "In their data, 14 of the 15 worst momentum months came after a negative two-year market return, and all 15 came in a rising market. Panic, high volatility, then a rebound: that's the warning sign." }
    ];
    return {
      stages: ST, end: 18, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        /* top: the market path */
        var py0 = g.y0 + (n ? 14 : 4), py1 = n ? g.y0 + 210 : g.y0 + 186;
        var all = IDX.concat(REB.slice(1)), NP = all.length;
        var PX = function (i) { return g.x0 + i / (NP - 1) * (g.x1 - g.x0); }, PY = function (v) { return py1 - (v - 40) / 66 * (py1 - py0); };
        var upto = track([[0, 0], [3.2, IDX.length - 1], [6.8, IDX.length - 1], [9.6, NP - 1]], T);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "The market (illustrative path)" : "The market · illustrative path, 2007 to mid-2009", C.faint, 12, "start", 600);
        s += line(g.x0, py1, g.x1, py1, "#2c2c2e", 1);
        var pts = [];
        for (var i = 0; i <= upto && i < NP; i++) pts.push([PX(i), PY(all[i])]);
        if (upto % 1 && Math.ceil(upto) < NP) { var a = Math.floor(upto), f = upto - a; pts.push([PX(upto), PY(lerp(all[a], all[a + 1], f))]); }
        var redPts = pts.slice(0, Math.min(pts.length, IDX.length)), grnPts = pts.length > IDX.length - 1 ? pts.slice(IDX.length - 1) : [];
        s += poly(redPts, C.dn, 2.4);
        if (grnPts.length > 1) s += poly(grnPts, C.up, 2.6);
        var reb = fade(T, 6.9, 0.4);
        if (reb > 0) { s += rect(PX(IDX.length - 1), py0, PX(NP - 1) - PX(IDX.length - 1), py1 - py0, C.gold, 0, 0.1 * reb); post += tag((PX(IDX.length - 1) + PX(NP - 1)) / 2, py0 + 12, n ? "Mar–May '09" : "March–May 2009", C.gold, reb, "middle"); }
        var bt = fade(T, 3.8, 0.4);
        var ww = fade(T, 14.2, 0.4);
        if (bt > 0) post += tag(PX(16), PY(52) + 30, n ? "loser beta > 3" : "loser-decile beta above 3", C.orange, bt * (1 - ww), "middle");
        if (ww > 0) post += tag(n ? (g.x0 + g.x1) / 2 : PX(13), PY(52) + 30, n ? "decline → volatility → rebound" : "the setup for a crash: decline → high volatility → rebound", C.orange, ww, "middle");
        /* bottom: the bars */
        var by0 = n ? g.y0 + 260 : g.y0 + 230, base = n ? g.y1 - 70 : g.y1 - 60, upPx = base - by0 - 20, dnPx = n ? 60 : 52;
        var BARS = [["Market", 26, C.blue, 6.9], ["Winners", 8, C.up, 7.3], ["Losers", 163, C.dn, 7.7], ["W − L, Mar", -42.28, C.gold, 10.6], ["W − L, Apr", -45.52, C.gold, 11]];
        var bslot = (g.x1 - g.x0) / (BARS.length + 0.6), bbw = bslot * 0.56;
        var bOp = fade(T, 6.8, 0.4);
        if (bOp > 0) {
          s += line(g.x0, base, g.x1, base, "#48484a", 1.2, null, bOp);
          s += txt(g.x0, by0 - 6, n ? "Returns, Mar–May 2009" : "Returns · March–May 2009 (Daniel & Moskowitz)", C.faint, 12, "start", 600, bOp);
          BARS.forEach(function (b, k) {
            var gr = ease(fade(T, b[3], 1.2));
            if (gr <= 0) return;
            var x = g.x0 + (k + 0.5 + (k >= 3 ? 0.6 : 0)) * bslot, v = b[1] * gr;
            var h = v >= 0 ? v / 170 * upPx : v / 50 * dnPx;
            s += hbar(x - bbw / 2, base, bbw, -h, b[2], 0.95);
            var yl = v >= 0 ? base - h - 8 : base - h + 18;
            post += txt(x, yl, pct(b[1], b[1] % 1 && !n ? 2 : 0), b[2], n ? 12 : 13, "middle", 800, fade(T, b[3] + 0.8, 0.4));
            post += txt(x, v >= 0 ? base + 18 : base - 8, b[0], C.dim, n ? 10 : 12, "middle", 600, gr);
          });
        }
        s += post;
        s += note2(g, ["A bear market first", "The biggest fallers end", "up in the loser decile."], C.dn, win(T, 0.3, 3.6));
        s += note2(g, ["Short a lot of beta", "Loser betas above 3", "after market declines", "(Daniel & Moskowitz)."], C.orange, win(T, 3.8, 6.8));
        s += note2(g, ["March–May 2009", "Market +26%", "Winners +8%", "Losers +163%"], C.gold, win(T, 6.9, 10.4));
        s += note2(g, ["The crash", "W − L: −42.28% in March,", "−45.52% in April 2009."], C.dn, win(T, 10.6, 14));
        s += note2(g, ["The warning sign", "14 of the 15 worst months", "followed a 2-year decline;", "all 15 in a rising market."], C.orange, fade(T, 14.2, 0.4));
        return s + stamp(L, "Bar figures: Daniel & Moskowitz (2016) · market path illustrative");
      }
    };
  }

  /* =====================================================================
     5 · A long-only version: hold the top 3 of 12, re-rank every month
     ===================================================================== */
  function rebalanceSpec() {
    var NAMES = "ABCDEFGHIJKL".split("");
    var RK = ["ABCDEFGHIJKL", "BAECDGFIHKJL", "EBGACDFHIJLK", "GEBFACDHIKJL"].map(function (r) { return r.split(""); });
    var HOLD = 3;
    function retAt(m, r, name) { return Math.round(58 - r * 8.5 + ((name.charCodeAt(0) * 7 + m * 3) % 5) - 2); }
    var ST = [
      { at: 0, title: "Month 1: rank, hold the top 3", text: "A simpler, long-only version a single account can run: rank a list of 12 made-up stocks on their return from 12 months ago to 1 month ago, and hold the top 3 in equal size." },
      { at: 3.4, title: "Month 2: re-rank everything", text: "A month later, rank again. Stock E climbed into the top 3, so it comes in; Stock C slipped to fourth, so it goes. One of three positions turns over." },
      { at: 6.8, title: "Month 3: re-rank again", text: "Stock G jumps to third and Stock A drops out. The rule decides, not the chart, not the news, not how you feel about the name." },
      { at: 10.2, title: "Month 4: nothing changes", text: "The same three are still on top, so you do nothing. Turnover is the hidden cost of momentum: every swap pays a spread and commissions, and in a taxable account, short-term gains." },
      { at: 13.4, title: "Not the paper, but the same idea", text: "Jegadeesh and Titman's portfolio was long the top tenth and short the bottom tenth of NYSE and AMEX stocks. A long-only top-few version keeps the ranking idea but adds market risk and concentration; test it before you trust it." }
    ];
    return {
      stages: ST, end: 17, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var mf = track([[0, 0], [3.4, 0], [4.6, 1], [6.8, 1], [8, 2], [10.2, 2], [11.4, 3]], T);
        var m0 = Math.floor(mf), mfrac = ease(mf - m0), m1 = Math.min(3, m0 + 1);
        var cur = Math.round(mf);
        var lx0 = g.x0 + (n ? 4 : 40), lw = n ? 250 : 330, rowH = n ? 30 : 32, ly0 = g.y0 + (n ? 22 : 30);
        s += txt(lx0, ly0 - 12, "Rank · month " + (cur + 1), C.faint, 12, "start", 600);
        /* the held box */
        s += rect(lx0 - 8, ly0 - 4, lw + 16, rowH * HOLD + 8, C.up, 10, 0.12);
        s += frameRect(lx0 - 8, ly0 - 4, lw + 16, rowH * HOLD + 8, C.up, 1.6, 0.9, 10);
        post += txt(lx0 + lw + 14, ly0 + rowH * 1.5 + 4, "held", C.up, 12, "start", 700);
        NAMES.forEach(function (nm) {
          var r0 = RK[m0].indexOf(nm), r1 = RK[m1].indexOf(nm), r = lerp(r0, r1, mfrac);
          var y = ly0 + r * rowH, inNow = Math.round(r) < HOLD;
          var wasIn = cur > 0 && RK[cur - 1].indexOf(nm) < HOLD, isIn = RK[cur].indexOf(nm) < HOLD;
          var entering = cur > 0 && isIn && !wasIn, leaving = cur > 0 && !isIn && wasIn;
          var col = entering ? C.up : leaving ? C.dn : inNow ? C.ink : C.dim;
          var bg = entering ? "#123d22" : leaving ? "#4a1714" : "#2c2c2e";
          s += rect(lx0, y + 3, lw, rowH - 6, bg, 7, 1);
          s += txt(lx0 + 12, y + rowH / 2 + 4.5, "Stock " + nm, col, 13, "start", 700);
          var rv = lerp(retAt(m0, r0, nm), retAt(m1, r1, nm), mfrac);
          s += txt(lx0 + lw - 12, y + rowH / 2 + 4.5, pct(rv), rv >= 0 ? C.up : C.dn, 12.5, "end", 600);
          if (entering && mfrac > 0.9 || entering && mf === cur) post += tag(lx0 + lw + 14, y + rowH / 2, "in", C.up, 1, "start");
          if (leaving && mfrac > 0.9 || leaving && mf === cur) post += tag(lx0 + lw + 14, y + rowH / 2, "out", C.dn, 1, "start");
        });
        /* the history of what was held */
        var hx0 = n ? g.x0 + 4 : lx0 + lw + 110, hy0 = n ? ly0 + rowH * 12 + 46 : ly0, cw = n ? 88 : 72, chh = n ? 26 : 32;
        s += txt(hx0, hy0 - 12, "Held each month", C.faint, 12, "start", 600);
        for (var m = 0; m < 4; m++) {
          var op = m <= cur ? 1 : 0.25, x = hx0 + m * cw;
          s += txt(x + cw / 2 - 4, hy0 + 8, "M" + (m + 1), C.dim, 12, "middle", 700, op);
          for (var h = 0; h < HOLD; h++) {
            var nm2 = RK[m][h], fresh = m > 0 && RK[m - 1].indexOf(nm2) >= HOLD;
            s += rect(x, hy0 + 18 + h * chh, cw - 8, chh - 6, fresh ? "#123d22" : "#2c2c2e", 6, op);
            s += txt(x + (cw - 8) / 2, hy0 + 18 + h * chh + chh / 2 + 1.5, nm2, fresh ? C.up : C.ink, 13, "middle", 700, op);
          }
          if (m > 0) {
            var tv = 0; for (var q = 0; q < HOLD; q++) if (RK[m - 1].indexOf(RK[m][q]) >= HOLD) tv++;
            s += txt(x + (cw - 8) / 2, hy0 + 18 + HOLD * chh + 16, tv + " swap" + (tv === 1 ? "" : "s"), tv ? C.orange : C.faint, 11, "middle", 600, op);
          }
        }
        s += post;
        s += note2(g, ["Rank and hold the top 3", "12 made-up stocks, ranked", "on 12-to-1-month return.", "Equal size in each."], C.blue, win(T, 0.3, 3.4));
        s += note2(g, ["Month 2", "E moves up: in.", "C slips to 4th: out."], C.up, win(T, 3.6, 6.8));
        s += note2(g, ["Month 3", "G jumps to 3rd: in.", "A drops to 4th: out."], C.up, win(T, 7, 10.2));
        s += note2(g, ["Month 4: no trades", "Every swap costs spread,", "commission and, in a", "taxable account, tax."], C.orange, win(T, 10.4, 13.4));
        s += note2(g, ["Not the paper's version", "Long-only adds market", "risk and concentration.", "Test before you trust it."], C.gold, fade(T, 13.6, 0.4));
        return s + stamp(L, "Illustrative · made-up stocks and returns");
      }
    };
  }

  var SPECS = { rank: rankSpec, window: windowSpec, event: eventSpec, crash: crashSpec, rebalance: rebalanceSpec };
  document.querySelectorAll("[data-xsm-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-xsm-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     The strategy, step by step, as a click-through stepper.
     Without the script the five show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-xsm-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "Universe", c: C.blue,   tag: "Decide what you rank" },
      { k: "Measure",  c: C.cyan,   tag: "Past return, skipping the latest stretch" },
      { k: "Rank",     c: C.gold,   tag: "Best to worst, split into tenths" },
      { k: "Build",    c: C.up,     tag: "Long the top, short the bottom" },
      { k: "Rebalance", c: C.orange, tag: "Hold, then re-rank on a schedule" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Cross-sectional momentum, step by step");
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
        var cols = narrow ? 14 : 20, rows = narrow ? 14 : 8, gx = (W - 80) / cols, gy = (bot - top - 10) / rows;
        for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
          var keep = ((i * 7 + j * 13) % 9) > 1;
          s += '<circle cx="' + (40 + (i + 0.5) * gx).toFixed(1) + '" cy="' + (top + (j + 0.5) * gy).toFixed(1) + '" r="' + (narrow ? 6 : 5) + '" fill="' + (keep ? C.blue : "#3a3a3c") + '"/>';
        }
        s += t(30, bot + 30, "A fixed, liquid universe. Grey: too thin to trade.", C.dim, 12.5, "start", 500);
      } else if (k === 1) {
        var pth = [[40, bot - 20], [100, bot - 60], [150, bot - 40], [220, bot - 110], [280, bot - 90], [340, top + 70], [390, top + 40], [420, top + 60], [460, top + 50]];
        s += pl(pth, C.ink, 2.2);
        s += r(40, top, 340, bot - top, C.cyan, 0.12, 6);
        s += r(390, top, 70, bot - top, C.grey, 0.18, 6);
        s += t(210, top + 20, "measure: t−12 to t−2", C.cyan, 13, "middle", 700);
        s += t(425, top + 20, "skip", C.grey, 13, "middle", 700);
        s += t(30, bot + 30, "Lookback return, minus the latest stretch.", C.dim, 12.5, "start", 500);
      } else if (k === 2) {
        var vals = [88, 71, 61, 52, 45, 40, 34, 28, 23, 19, 15, 11, 7, 3, 0, -5, -12, -19, -26, -31, -37, -44], nb = vals.length, bw = (W - 80) / nb, z = top + (bot - top) * 0.66, sc = (z - top) / 92;
        vals.forEach(function (v, i) {
          var col = i < 2 ? C.up : i >= nb - 2 ? C.dn : "#48484a", h = v * sc;
          s += r(40 + i * bw + 2, v >= 0 ? z - h : z, bw - 4, Math.max(2, Math.abs(h)), col, 1, 2);
        });
        s += ln(40, z, W - 40, z, C.faint, 1);
        s += t(40, top - 8 + 4, "winners", C.up, 12.5, "start", 700) + t(W - 40, bot + 6, "losers", C.dn, 12.5, "end", 700);
        s += t(30, bot + 30, "Sorted best to worst. Only the ends matter.", C.dim, 12.5, "start", 500);
      } else if (k === 3) {
        var bh = narrow ? 120 : 90;
        s += r(40, top + 10, 220, bh, C.up, 0.22, 12) + t(150, top + 10 + bh / 2 - 4, "LONG", C.up, 18, "middle", 800) + t(150, top + 10 + bh / 2 + 20, "top 10%", C.ink, 13, "middle", 600);
        s += r(300, top + 10, 220, bh, C.dn, 0.22, 12) + t(410, top + 10 + bh / 2 - 4, "SHORT", C.dn, 18, "middle", 800) + t(410, top + 10 + bh / 2 + 20, "bottom 10%", C.ink, 13, "middle", 600);
        s += t(W / 2, top + bh + 60, "$1 long = $1 short · equal weight", C.gold, 14, "middle", 700);
        s += t(30, bot + 30, "The return is winners minus losers.", C.dim, 12.5, "start", 500);
      } else {
        var cx = W / 2, cy = (top + bot) / 2, rad = narrow ? 120 : 92, mths = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
        mths.forEach(function (mm, i) {
          var ang = -Math.PI / 2 + i / 12 * Math.PI * 2, x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
          s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (narrow ? 17 : 14) + '" fill="' + (i % 3 === 0 ? C.orange : "#2c2c2e") + '"/>' + t(x, y + 4.5, mm, i % 3 === 0 ? "#000" : C.dim, 12, "middle", 700);
        });
        s += t(cx, cy - 4, "re-rank", C.orange, 15, "middle", 800) + t(cx, cy + 18, "monthly or every K", C.dim, 12, "middle", 600);
        s += t(30, bot + 30, "Hold, re-rank, swap. Repeat on the calendar.", C.dim, 12.5, "start", 500);
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
