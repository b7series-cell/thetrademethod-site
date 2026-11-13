/* =====================================================================
   traps-anim.js — the animated walkthroughs on seven-trading-traps.html.

     [data-tt-anim="drift"]     trap 1 · style drift: momentum vs calls far out in time
     [data-tt-anim="regime"]    trap 2 · the three-part regime filter (high, 20-day, 50-day)
     [data-tt-anim="giveback"]  trap 3 · a grand slam round trip vs a hard give-back rule
     [data-tt-anim="select"]    trap 4 · three-notch downgrade and the poker fold
     [data-tt-anim="cash"]      trap 5 · waiting vs slicing out short-term cash flow
     [data-tt-anim="size"]      trap 6 · cycle size with the setup vs desperation size
     [data-tt-anim="options"]   trap 7 · the stop honored on stock, frozen on calls
     [data-tt-steps]            the five-point reset, as a click-through stepper

   Same player as raschke-anim.js / gbf-anim.js: each chart redraws in a
   narrow layout on a phone instead of scrolling sideways, and on a phone
   the callouts sit in a band above the chart so they never cover it.

   Every bar, trade and dollar figure is made up, labelled "Illustrative".
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


  /* ---------- seeded randomness, so every replay draws the same footprints ---------- */
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

  /* =====================================================================
     Trap 1 · Style drift: short-term momentum vs calls far out in time
     ===================================================================== */
  function driftSpec() {
    var CA = [42.02, 42.08, 41.98, 42.05, 42.12, 42.06, 42.15, 42.22, 42.18, 42.3, 42.52, 42.66, 42.8, 42.95, 43.02, 43.06, 42.98, 42.9, 42.94, 42.86, 42.9, 42.84, 42.88, 42.8];
    var BA = mkBars(CA, 42.0, 41, 0.06), i, LV = 42.35;
    for (i = 0; i <= 9; i++) BA[i].h = Math.min(BA[i].h, LV);
    BA[10].l = Math.min(BA[10].l, 42.31);
    var r = rng(9), CB = [];
    for (i = 0; i < 30; i++) CB.push(43 + Math.sin(i * 0.7) * 0.55 + (r() - 0.5) * 0.5);
    var BB = mkBars(CB, 42.9, 43, 0.25);
    function prem(k) { return 3.4 - 2.25 * Math.pow(k / 29, 1.25); }
    var ST = [
      { at: 0, title: "Their bread and butter", text: "A team that's outstanding at short-term momentum. A base under 42.35, the break, in at 42.40, out at 43.05 six bars later. Quick, repeatable, and backed by their statistics." },
      { at: 5.5, title: "The drift", text: "Then they start buying calls much further out in time and stretching the holding period. Same stocks, but a time horizon where they have zero statistical edge." },
      { at: 9.5, title: "The premium bleeds", text: "The longer-term move never shows up. The stock chops sideways for six weeks and the call premium bleeds from $3.40 to $1.15, down 66%, without one dramatic bar." },
      { at: 14, title: "Stay in your playbook", text: "Add up a made-up month: the playbook trades carry the account and the drifted trades hand most of it back. If your P&L is bleeding, first check: am I still trading my setups?" }
    ];
    return {
      stages: ST, end: 18.5,
      size: function (n) { return n ? { W: 440, H: 760 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var g = geo(L), s = "";
        var opA = 1 - fade(T, 5.5, 0.7), opB = fade(T, 5.9, 0.6) * (T >= 14 ? 0.3 : 1);
        if (opA > 0) {
          var lo = 41.8, hi = 43.3, N = 24;
          var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
          s += '<g opacity="' + opA.toFixed(3) + '">';
          s += axis(g, lo, hi, 0.25, Y, 2);
          s += txt(g.x0, g.y0 - 14, "5-minute bars · the team's own setup", C.faint, 12, "start", 600);
          s += line(X(0), Y(LV), X(10), Y(LV), C.blue, 1.6, "6 5", fade(T, 1, 0.4));
          s += drawBars(BA, X, Y, 1 + clamp01(T / 4) * 23, (g.x1 - g.x0) / N * 0.6);
          s += pill(X(10), Y(42.4) + 34, "in 42.40", C.blue, fade(T, 2.2, 0.3), "middle");
          s += pill(X(15), Y(43.06) - 18, "out 43.05", C.up, fade(T, 3.2, 0.3), "middle");
          s += tag(X(15) + 14, Y(42.62), "+$0.65 · 25 minutes", C.up, fade(T, 3.6, 0.4), "start");
          s += note2(g, ["Short-term momentum", "Base, break, in, out. The", "trade lasts minutes, and the", "team has years of stats on it."], C.up, win(T, 0.8, 5.4));
          s += "</g>";
        }
        if (opB > 0) {
          var mid = g.y0 + (g.y1 - g.y0) * 0.5, lo2 = 41.6, hi2 = 46.6, N2 = 30;
          var X2 = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N2; }, Y2 = function (v) { return mid - (v - lo2) / (hi2 - lo2) * (mid - g.y0); };
          var pY = function (v) { return g.y1 - v / 4 * (g.y1 - mid - 44); };
          var cnt = clamp01((T - 6.2) / 6.5) * 30;
          s += '<g opacity="' + opB.toFixed(3) + '">';
          s += txt(g.x0, g.y0 - 14, "Daily bars · the same stock, six weeks", C.faint, 12, "start", 600);
          s += line(g.x0, Y2(46), g.x1, Y2(46), C.orange, 1.6, "6 5");
          s += tag(g.x1 - 4, Y2(46) - 14, "46 call · 60 days out", C.orange, 1, "end");
          s += drawBars(BB, X2, Y2, cnt, (g.x1 - g.x0) / N2 * 0.55);
          s += txt(g.x0, mid + 30, "call premium", C.faint, 12, "start", 600);
          [1, 2, 3, 4].forEach(function (v) { s += line(g.x0, pY(v), g.x1, pY(v), "#2c2c2e", 1) + txt(g.x1 + 6, pY(v) + 4, "$" + v, C.faint, 11); });
          var pts = [];
          for (var k = 0; k <= Math.min(29, Math.floor(cnt)); k++) pts.push([X2(k), pY(prem(k))]);
          s += poly(pts, C.orange, 2.6);
          if (pts.length) { var lp = pts[pts.length - 1]; s += dot(lp[0], lp[1], 4, C.orange); s += tag(lp[0] - 8, lp[1] - 16, "$" + fmt(prem(pts.length - 1), 2), C.orange, 1, "end"); }
          s += note2(g, ["Out of the playbook", "Calls 60 days out, held for", "weeks. A time frame with", "zero statistical edge."], C.orange, win(T, 6.3, 9.4));
          s += note2(g, ["Bleeding out premium", "No crash, no bad print. Just", "time: $3.40 down to $1.15.", "The move never materialized."], C.dn, win(T, 9.8, 13.9));
          s += "</g>";
        }
        var so = fade(T, 14.2, 0.5);
        if (so > 0) {
          var n = g.n, cx = n ? 220 : 398, cy = n ? 420 : 250, bw = n ? 380 : 560, unit = (n ? 130 : 280) / 12000;
          s += '<g opacity="' + so.toFixed(3) + '">';
          s += rect(cx - bw / 2 - (n ? 4 : 20), cy - 110, bw + (n ? 8 : 40), 230, C.box, 16, 0.97);
          s += txt(cx, cy - 76, "One made-up month", C.ink, 15, "middle", 700);
          s += line(cx, cy - 56, cx, cy + 86, "#48484a", 1.2);
          var gw = ease(fade(T, 14.6, 0.8)), rw = ease(fade(T, 15.3, 0.8));
          s += txt(cx - bw / 2 + (n ? 14 : 0), cy - 36, "Short-term momentum · 42 trades", C.dim, 12.5, "start");
          s += rect(cx, cy - 26, 11400 * unit * gw, 26, C.up, 4);
          s += txt(cx + 11400 * unit * gw + 8, cy - 8, "+$11,400", C.up, 13, "start", 700, gw);
          s += txt(cx - bw / 2 + (n ? 14 : 0), cy + 30, "Calls far out in time · 6 positions", C.dim, 12.5, "start");
          s += rect(cx - 8900 * unit * rw, cy + 40, 8900 * unit * rw, 26, C.dn, 4);
          s += txt(cx - 8900 * unit * rw - 8, cy + 58, "−$8,900", C.dn, 13, "end", 700, rw);
          s += txt(cx, cy + 104, "78% of the month's gains handed back", C.gold, 13, "middle", 700, fade(T, 16.2, 0.4));
          s += "</g>";
        }
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     Trap 2 · Missing a regime change: Brandon's three-part filter
     ===================================================================== */
  function regimeSpec() {
    var r = rng(7), CL = [], i;
    for (i = 0; i < 110; i++) {
      var c = i < 85 ? 430 + 90 * (i / 85) + 4 * Math.sin(i * 0.9) + (r() - 0.5) * 4 : i < 100 ? 520 - 32 * ((i - 85) / 14) + (r() - 0.5) * 4 : 488 + 4 * Math.sin(i * 1.3) + (r() - 0.5) * 3;
      CL.push(c);
    }
    function ma(n, k) { var s = 0; for (var j = k - n + 1; j <= k; j++) s += CL[j]; return s / n; }
    var B = mkBars(CL.slice(50), CL[49], 17, 2.2), M20 = [], M50 = [], ATH = [], CHK = [], a = 0;
    for (i = 0; i < 110; i++) { a = Math.max(a, CL[i]); if (i >= 50) { var k = i - 50; M20.push(ma(20, i)); M50.push(ma(50, i)); ATH.push(a); CHK.push([CL[i] >= a * 0.95, CL[i] > M20[k], CL[i] > M50[k]]); } }
    var ST = [
      { at: 0, title: "Six months flat", text: "Dr. Brett Steenberger reviewed a top portfolio manager who was flat to down for six straight months. The process was fine. There was no system for moving from trending momentum to mean-reverting chop." },
      { at: 3, title: "Brandon's three checks", text: "Senior trader Brandon built a strict three-part filter for QQQ: within a set percentage of all-time highs, above the 20-day moving average, above the 50-day. The 5% here and the bars are made up." },
      { at: 7.5, title: "One check fails", text: "The fund rolls over and closes under its 20-day. If all three aren't met, Brandon turns defensive: cut risk on upside momentum, switch to a scalp-minded, move-to-move posture." },
      { at: 11, title: "All three fail", text: "More than 5% off the high and under both averages. The momentum trades that worked all quarter are now the wrong trade. Defense stays on until all three are green again." },
      { at: 14.5, title: "Decided before the open", text: "Objective rules, checked before you size a single trade. That work kept him green while others drew down." }
    ];
    return {
      stages: ST, end: 18,
      size: function (n) { return n ? { W: 440, H: 800 } : { W: 1180, H: 560 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var x0 = g.x0, x1 = g.x1, y0 = n ? 312 : 120, y1 = L.H - (n ? 130 : 140), sy0 = L.H - (n ? 100 : 108), sy1 = L.H - (n ? 50 : 62);
        var lo = 452, hi = 530, N = 60;
        var X = function (k) { return x0 + (k + 0.5) * (x1 - x0) / N; }, Y = function (v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); };
        var cur = Math.round(track([[0, 4], [3, 4], [6.8, 38], [7.4, 38], [7.7, 40], [10.4, 42], [11.3, 47], [14, 59]], T)), gg = { x0: x0, x1: x1 };
        s += axis(gg, 460, 520, 10, Y);
        s += txt(x0, y0 - 12, "Daily bars · a made-up index fund", C.faint, 12, "start", 600);
        var vis = cur + 1;
        s += poly(M50.slice(0, vis).map(function (v, k) { return [X(k), Y(v)]; }), C.gold, 2);
        s += poly(M20.slice(0, vis).map(function (v, k) { return [X(k), Y(v)]; }), C.cyan, 2);
        s += poly(ATH.slice(0, vis).map(function (v, k) { return [X(k), Y(v * 0.95)]; }), C.grey, 1.4, "5 5");
        s += drawBars(B, X, Y, vis, (x1 - x0) / N * 0.6);
        if (T >= 3) {
          s += tag(X(cur) + 8, Y(M20[cur]) + (CHK[cur][1] ? 16 : -16), "20-day", C.cyan, fade(T, 3.3, 0.4), "start");
          s += tag(X(Math.max(0, cur - 10)), Y(M50[Math.max(0, cur - 10)]) + 18, "50-day", C.gold, fade(T, 3.6, 0.4), "middle");
          s += tag(X(Math.min(cur, 30)), Y(ATH[Math.min(cur, 30)] * 0.95) + 18, "5% under the high", C.grey, fade(T, 3.9, 0.4), "middle");
          s += line(X(cur), y0, X(cur), y1, C.ink, 1, "2 4", 0.5);
        }
        /* the three lights */
        var lab = ["≤5% off high", "above 20-day", "above 50-day"], lw = n ? 128 : 170, lx = n ? 16 : x0, ly = n ? 214 : 52, on = T >= 3;
        lab.forEach(function (t, k) {
          var ok = CHK[cur][k], col = !on ? "#48484a" : ok ? C.up : C.dn, x = lx + k * (lw + (n ? 10 : 14));
          s += rect(x, ly - 20, lw, 34, C.box, 10, 1);
          s += dot(x + 18, ly - 3, 7, col);
          s += txt(x + 32, ly + 2, t, on ? C.ink : C.faint, 12, "start", 600);
        });
        var all = CHK[cur][0] && CHK[cur][1] && CHK[cur][2], px = n ? 220 : x0 + 3 * 184 + 10 + 90;
        if (on) s += pill(px, n ? 262 : ly + 4, all ? "Offense · momentum size" : "Defense · scalp, move-to-move", all ? C.up : C.orange, 1, "middle");
        /* the size strip */
        s += txt(x0, sy0 - 8, "risk on upside momentum", C.faint, 11);
        for (var k = 0; k < vis; k++) {
          var ok2 = k < 3 || (CHK[k][0] && CHK[k][1] && CHK[k][2]), h = (ok2 ? 1 : 0.35) * (sy1 - sy0), w = (x1 - x0) / N * 0.6;
          s += rect(X(k) - w / 2, sy1 - h, w, h, T < 3 ? "#48484a" : ok2 ? C.up : C.orange, 1.5, 0.8);
        }
        var nb = n ? null : 120;
        s += note2(g, ["Flat to down for six months", "Not a process problem. No", "system to adapt from trend", "to chop."], C.ink, win(T, 0.4, 2.9), nb);
        s += note2(g, ["Three objective checks", "Close within 5% of the all-", "time high? Above the 20-day?", "Above the 50-day? All green:", "trade momentum, full size."], C.up, win(T, 3.3, 7.4), nb);
        s += note2(g, ["The 20-day breaks", "Not all three: defense. Cut", "risk on upside momentum.", "Scalp-minded, move-to-move."], C.orange, win(T, 7.7, 10.9), nb);
        s += note2(g, ["All three red", "The trade that paid all", "quarter is now the wrong", "trade. Stay defensive."], C.dn, win(T, 11.2, 14.4), nb);
        s += note2(g, ["Checked before you size", "Objective, decided before the", "open. It kept Brandon green", "while others drew down."], C.up, fade(T, 14.7, 0.4), nb);
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     Trap 3 · Grand slams: the round trip vs a hard give-back rule
     ===================================================================== */
  function givebackSpec() {
    var CL = [23.6, 23.9, 24.3, 24.9, 25.6, 26.1, 27.0, 27.8, 28.6, 29.4, 30.3, 31.0, 31.5, 30.9, 30.2, 29.1, 28.4, 27.5, 26.9, 26.0, 25.4, 24.9, 24.2, 23.8, 23.5, 23.2];
    var B = mkBars(CL, 23.4, 51, 0.35), EN = 24, SH = 1000, EXIT = 17, LOCK = 27.75;
    B[2].l = Math.min(B[2].l, 23.95);
    var STOP = [], pk = 0;
    CL.forEach(function (c, k) { pk = Math.max(pk, c); STOP.push(k >= 6 ? EN + 0.5 * (pk - EN) : 23); });
    var ST = [
      { at: 0, title: "A good trade at a good price", text: "In at 24.00 with a stop at 23.00, 1,000 shares. One point of risk: 1R is $1,000. Made-up daily bars." },
      { at: 3.5, title: "Well in the money", text: "It runs to 31.50. That's +$7,500 open, 7.5R: a windfall." },
      { at: 6.5, title: "\"I haven't made enough\"", text: "No register gets rung. The trader wants a grand slam, so the pullback is just noise. Then it keeps pulling back." },
      { at: 9.5, title: "The round trip", text: "It rolls all the way back under the entry: −$800. A massive winner turned into a red trade on the month, the way a partner described traders round-tripping CCXI." },
      { at: 13, title: "A hard give-back rule", text: "One version: once open profit passes 3R, never give back more than half of the best close. The stop ratchets up to 27.75 and the exit locks in +$3,750." }
    ];
    return {
      stages: ST, end: 17.5,
      size: function (n) { return n ? { W: 440, H: 800 } : { W: 1180, H: 560 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var y0 = n ? 190 : 40, y1 = L.H - (n ? 230 : 190), py0 = L.H - (n ? 190 : 150), py1 = L.H - (n ? 50 : 50);
        var lo = 22, hi = 32.5, N = 26, x0 = g.x0, x1 = g.x1;
        var X = function (k) { return x0 + (k + 0.5) * (x1 - x0) / N; }, Y = function (v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); };
        var cnt = track([[0, 3], [3.5, 13], [6.5, 16], [9.5, 26]], T), vis = Math.ceil(cnt), rule = fade(T, 13.2, 0.5);
        s += axis({ x0: x0, x1: x1 }, 22, 32, 2, Y, 0);
        s += line(x0, Y(EN), x1, Y(EN), C.blue, 1.4, "6 5");
        s += tag(X(13), Y(EN) + 16, "entry 24.00", C.blue, 1, "middle");
        s += line(x0, Y(23), X(Math.min(vis, 6)), Y(23), C.dn, 1.4, "3 4");
        s += drawBars(B, X, Y, cnt, (x1 - x0) / N * 0.6, function (k) { return rule > 0 && k > EXIT ? 1 - rule * 0.65 : 1; });
        if (T >= 3.5) s += tag(X(12), Y(B[12].h) - 16, "31.50 · +$7,500 open", C.up, fade(T, 3.7, 0.4), "middle");
        if (T >= 9.5) s += tag(X(25) - 4, Y(B[25].l) + 20, "23.20 · −$800", C.dn, fade(T, 10.2, 0.4), "end");
        if (rule > 0) {
          var sp = [];
          for (var k = 6; k <= EXIT; k++) { sp.push([X(k) - 9, Y(STOP[k])]); sp.push([X(k) + 9, Y(STOP[k])]); }
          s += poly(sp, C.gold, 2.4, null, rule);
          s += dot(X(EXIT), Y(LOCK), 7, C.gold, rule);
          s += tag(X(EXIT) - 12, Y(LOCK) + 22, "give-back stop hit · 27.75", C.gold, fade(T, 13.8, 0.4), "end");
        }
        /* open P&L strip */
        var pY = function (v) { return py1 - (v + 1500) / 9500 * (py1 - py0); };
        s += txt(x0, py0 - 8, "open P&L, 1,000 shares", C.faint, 11.5, "start", 600);
        s += line(x0, pY(0), x1, pY(0), "#48484a", 1);
        var pts = [];
        for (var j = 0; j < vis; j++) pts.push([X(j), pY((CL[j] - EN) * SH)]);
        s += poly(pts, rule > 0 ? "#8e8e93" : C.ink, 2.2);
        if (rule > 0) {
          var rp = [];
          for (var q = 0; q <= 25; q++) rp.push([X(q), pY(q < 2 ? (CL[q] - EN) * SH : q <= EXIT - 1 ? (CL[q] - EN) * SH : (LOCK - EN) * SH)]);
          s += poly(rp, C.gold, 2.6, null, rule);
          s += tag(X(25), pY(3750) - 14, "+$3,750 locked", C.gold, fade(T, 14.2, 0.4), "end");
        }
        var nb = n ? null : 40;
        s += note2(g, ["Good trade, good price", "In 24.00, stop 23.00.", "1R = $1,000."], C.blue, win(T, 0.4, 3.4), nb);
        s += note2(g, ["The windfall", "+$7,500 open. 7.5R.", "This is where the rule", "should already be working."], C.up, win(T, 3.8, 6.4), nb);
        s += note2(g, ["Holding for a grand slam", "\"I haven't made enough.\"", "No exit, no stop moved."], C.orange, win(T, 6.8, 9.4), nb);
        s += note2(g, ["Round trip", "7.5R up became −$800.", "A great trade, now a loser."], C.dn, win(T, 9.8, 12.9), nb);
        s += note2(g, ["Hard give-back rule", "Past 3R open, give back no", "more than half the best", "close. Exit 27.75: +$3,750."], C.gold, fade(T, 13.4, 0.4), nb);
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     Trap 4 · Not selective enough: Nano's three notches, Lance's fold
     ===================================================================== */
  function selectSpec() {
    var GR = ["A+", "A", "A−", "B+", "B", "B−", "C+", "C"];
    var NU = ["Stronger than the index all morning", "Holding above VWAP", "A clean level to trade against", "Volume on the push", "The index isn't rolling over"];
    var CB = [57.62, 57.7, 57.66, 57.78, 57.85, 57.82, 57.9, 57.94, 57.98, 58.16, 58.12, 58.05, 58.02, 57.96, 57.95];
    var BB = mkBars(CB, 57.6, 61, 0.05), LV = 58, i;
    for (i = 0; i <= 8; i++) BB[i].h = Math.min(BB[i].h, 58.0);
    BB[9].h = 58.24;
    var VOL = [0.5, 0.45, 0.4, 0.55, 0.5, 0.45, 0.6, 0.65, 0.7, 1, 0.42, 0.3, 0.26, 0.22, 0.2];
    var ST = [
      { at: 0, title: "Missing one nuance", text: "A relative-strength setup with five things you want to see. Four are there. The fifth isn't: the index is starting to roll over. In a normal tape you might shave one grade and still trade it." },
      { at: 4, title: "Nano's rule: three notches", text: "In a tough regime, grade it down three notches, not one. A+ becomes B+. When the tape demands perfection, B+ doesn't get traded. Pass." },
      { at: 8, title: "Positive signs at entry", text: "Lance B's poker rule. Long at 58.10 on the break over 58.00, stop 57.60. Strong relative strength and the best volume of the morning." },
      { at: 11, title: "The flop comes up wrong", text: "The next bars stall, slip back under 58.00 and the volume dries up. The variables that made it a trade aren't there anymore." },
      { at: 14, title: "Fold the hand", text: "There are no blinds forcing you to play. Out at 57.95 for −0.3R, instead of riding it to the full −1R stop. Made-up 2-minute bars." }
    ];
    return {
      stages: ST, end: 18,
      size: function (n) { return n ? { W: 440, H: 780 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L, { vol: true }), s = "";
        var opA = 1 - fade(T, 7.8, 0.6), opB = fade(T, 8.1, 0.6);
        if (opA > 0) {
          s += '<g opacity="' + opA.toFixed(3) + '">';
          var cx0 = n ? 16 : 60, cy0 = n ? 196 : 60, cw = n ? 408 : 420;
          s += rect(cx0, cy0, cw, n ? 220 : 250, C.box, 16, 1);
          s += txt(cx0 + 18, cy0 + 32, "Relative-strength long · checklist", C.ink, 14, "start", 700);
          NU.forEach(function (t, k) {
            var y = cy0 + (n ? 66 : 74) + k * (n ? 30 : 34), ok = k < 4, op = fade(T, 0.4 + k * 0.4, 0.3);
            s += txt(cx0 + 20, y, ok ? "✓" : "✗", ok ? C.up : C.dn, 15, "start", 700, op);
            s += txt(cx0 + 44, y, t, ok ? C.dim : C.dn, 13, "start", ok ? null : 600, op);
          });
          var lx = n ? 30 : 600, ly = n ? 470 : 70, rh = n ? 30 : 46, lw = n ? 70 : 90;
          GR.forEach(function (t, k) {
            var y = n ? ly : ly + k * rh, x = n ? lx + k * 48 : lx;
            s += rect(x, y, n ? 40 : lw, n ? 28 : rh - 8, k <= 1 ? "rgba(48,209,88,0.22)" : "#2c2c2e", 7, 1);
            s += txt(x + (n ? 20 : lw / 2), y + (n ? 19 : 25), t, k <= 1 ? C.up : C.dim, 14, "middle", 700);
          });
          var mk = track([[0, 0], [2.6, 0], [3.4, 1], [4.2, 1], [6, 3]], T), on = fade(T, 2.4, 0.3);
          if (n) {
            var mx = lx + mk * 48 + 20;
            s += '<path d="M' + (mx - 9) + "," + (ly - 16) + " L" + (mx + 9) + "," + (ly - 16) + " L" + mx + "," + (ly - 4) + 'Z" fill="' + C.gold + '" opacity="' + on.toFixed(3) + '"/>';
            s += txt(lx, ly + 58, "Tradable in a tough tape: A and A+ only", C.up, 12.5, "start", 600, fade(T, 4.6, 0.4));
            s += pill(220, ly + 104, T < 4 ? "Normal tape: A · take it" : "Tough tape: B+ · pass", T < 4 ? C.up : C.dn, fade(T, 3.4, 0.3), "middle");
          } else {
            var my = ly + mk * rh + (rh - 8) / 2;
            s += '<path d="M' + (lx - 22) + "," + (my - 9) + " L" + (lx - 22) + "," + (my + 9) + " L" + (lx - 8) + "," + my + 'Z" fill="' + C.gold + '" opacity="' + on.toFixed(3) + '"/>';
            s += line(lx - 8, ly + 2 * rh - 4, lx + lw + 8, ly + 2 * rh - 4, C.up, 2, "5 4", fade(T, 4.6, 0.4));
            s += txt(lx + lw + 14, ly + 2 * rh, "tough-tape cutoff", C.up, 12, "start", 600, fade(T, 4.6, 0.4));
            s += pill(cx0 + cw / 2, cy0 + 300, T < 4 ? "Normal tape: A · take it" : "Tough tape: B+ · pass", T < 4 ? C.up : C.dn, fade(T, 3.4, 0.3), "middle");
          }
          var nb = n ? null : 320;
          if (!n) {
            s += note2(g, ["One nuance missing", "Normal tape: one notch.", "A+ to A. Still a trade."], C.up, win(T, 2.8, 3.9), nb);
            s += note2(g, ["Tough tape: three notches", "A+ to B+, and B+ isn't", "good enough today. Pass."], C.dn, win(T, 4.3, 7.7), nb);
          } else {
            s += note2(g, ["One nuance missing", "Normal tape: one notch.", "A+ to A. Still a trade."], C.up, win(T, 2.8, 3.9));
            s += note2(g, ["Tough tape: three notches", "A+ to B+, and B+ isn't", "good enough today. Pass."], C.dn, win(T, 4.3, 7.7));
          }
          s += "</g>";
        }
        if (opB > 0) {
          var lo = 57.5, hi = 58.35, N = 15, gx = g;
          var X = function (k) { return gx.x0 + (k + 0.5) * (gx.x1 - gx.x0) / N; }, Y = function (v) { return gx.y1 - (v - lo) / (hi - lo) * (gx.y1 - gx.y0); };
          var cnt = track([[8, 0], [10, 10], [11, 10], [13.5, 15]], T), bw = (gx.x1 - gx.x0) / N * 0.6, vy0 = gx.y1 + 26, vy1 = gx.vy1;
          s += '<g opacity="' + opB.toFixed(3) + '">';
          s += axis(gx, lo, hi, 0.1, Y, 2);
          s += txt(gx.x0, gx.y0 - 14, "2-minute bars · the poker rule", C.faint, 12, "start", 600);
          s += line(gx.x0, Y(LV), gx.x1, Y(LV), C.blue, 1.6, "6 5");
          s += tag(gx.x0 + 4, Y(LV) - 14, "level 58.00", C.blue, 1, "start");
          s += line(X(9), Y(57.6), gx.x1, Y(57.6), C.dn, 1.4, "3 4", fade(T, 9.4, 0.3));
          s += tag(gx.x1 - 4, Y(57.6) - 14, "stop 57.60 · −1R", C.dn, fade(T, 9.4, 0.3), "end");
          s += drawBars(BB, X, Y, cnt, bw);
          for (var k = 0; k < Math.ceil(cnt); k++) { var vh = VOL[k] * (vy1 - vy0); s += rect(X(k) - bw / 2, vy1 - vh, bw, vh, k === 9 ? C.up : k > 9 ? C.orange : "#48484a", 1.5, k > 9 ? 0.75 : 1); }
          s += txt(gx.x0, vy0 - 6, "volume", C.faint, 11, "start");
          s += pill(X(9), Y(58.1) + 40, "long 58.10", C.blue, fade(T, 9.6, 0.3), "middle");
          var fo = fade(T, 14.2, 0.4);
          if (fo > 0) {
            s += dot(X(14), Y(57.95), 7, C.gold, fo);
            s += tag(X(14) - 12, Y(57.95) + 26, "fold 57.95 · −0.3R", C.gold, fo, "end");
          }
          s += note2(g, ["Good signs at entry", "Relative strength, the best", "volume of the morning. Long."], C.blue, win(T, 9.6, 10.9));
          s += note2(g, ["The flop: suboptimal", "Stalls, back under 58.00,", "volume dries up. The", "variables are gone."], C.orange, win(T, 11.4, 13.9));
          s += note2(g, ["No blinds. Fold.", "Out −0.3R instead of the", "full −1R stop. Then wait", "for the next real hand."], C.gold, fade(T, 14.3, 0.4));
          s += "</g>";
        }
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     Trap 5 · Not enough easy money trades: waiting vs slicing out cash flow
     ===================================================================== */
  function cashSpec() {
    var W = [0, -0.5, 0, 0, -0.5, 0, 0, 0, -0.5, 0, 0, -0.5, 0, 0, 0, -0.5, 6, 0, -0.5, 0];
    var G = [0.8, 1.2, -0.4, 0.6, 1, 0.5, 1.4, -0.3, 0.9, 0.7, 1.1, 0.4, -0.5, 0.8, 1, 0.6, 6, 0.9, 0.5, 1.2];
    var ST = [
      { at: 0, title: "Twenty quiet days", text: "Overnight momentum has dried up. Two traders, same desk, same twenty days. Made-up results in R." },
      { at: 3, title: "Waiting and complaining", text: "One sits at the screen saying the market isn't any good. Nothing to do, a few forced trades, small losses: −2.5R after sixteen days." },
      { at: 6.5, title: "Slicing out cash flow", text: "The other takes what the day offers: turn trades, tape scalps, low floats, breaking news. Small, frequent, mostly green: +9.8R over the same sixteen days." },
      { at: 10.5, title: "Then the big one", text: "Day 17, the larger opportunity shows up and both catch it for +6R. Only one walked in sharp and already green." },
      { at: 14, title: "Graham's challenge", text: "Month end: +3R for the waiter, +18.4R for the scalper. On the desk Graham was quietly slicing out $50,000 to $75,000 a day in scalps while others said there was nothing to do." }
    ];
    function row(P, R, cnt, title, col, op) {
      var s = '<g opacity="' + op.toFixed(3) + '">', sc = (P.y1 - P.y0) / 8.5, z = P.y1 - 1.6 * sc;
      var X = function (k) { return P.x0 + (k + 0.5) * (P.x1 - P.x0) / 20; }, w = (P.x1 - P.x0) / 20 * 0.62, tot = 0;
      s += txt(P.x0, P.y0 - 10, title, col, 14, "start", 700);
      s += line(P.x0, z, P.x1, z, "#48484a", 1);
      for (var k = 0; k < Math.min(20, Math.ceil(cnt)); k++) {
        var v = R[k] * Math.min(1, cnt - k), h = Math.abs(v) * sc;
        tot += v;
        if (R[k] === 0) { s += rect(X(k) - w / 2, z - 1, w, 2, "#636366", 1); continue; }
        s += rect(X(k) - w / 2, v > 0 ? z - h : z, w, Math.max(1.5, h), v > 0 ? (k === 16 ? C.gold : C.up) : C.dn, 2);
      }
      s += tag(P.x1, P.y0 - 14, "total " + sR(Math.round(tot * 10) / 10), tot >= 0 ? C.up : C.dn, cnt > 0.5 ? 1 : 0, "end");
      return s + "</g>";
    }
    return {
      stages: ST, end: 18,
      size: function (n) { return n ? { W: 440, H: 760 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var cw = track([[0, 0], [2.4, 3], [3, 3], [6, 16], [10.5, 16], [11.5, 17], [14, 20]], T), cg = track([[0, 0], [2.4, 3], [6.5, 3], [10, 16], [10.5, 16], [11.5, 17], [14, 20]], T);
        var PA = n ? { x0: 16, x1: 424, y0: 230, y1: 430 } : { x0: 46, x1: 750, y0: 60, y1: 230 };
        var PB = n ? { x0: 16, x1: 424, y0: 520, y1: 720 } : { x0: 46, x1: 750, y0: 300, y1: 470 };
        s += row(PA, W, cw, n ? "Waiting for momentum" : "Waiting for overnight momentum to come back", C.cyan, T >= 6.5 && T < 10.5 ? 0.45 : 1);
        s += row(PB, G, cg, n ? "Short-term trades" : "Turn trades, tape scalps, low floats, news", C.up, T >= 3 && T < 6.5 ? 0.45 : 1);
        var nb = n ? null : 60;
        s += note2(g, ["Same desk, same 20 days", "Overnight momentum dried up.", "Top: waiting. Bottom: taking", "the short-term trades."], C.ink, win(T, 0.4, 2.9), nb);
        s += note2(g, ["\"The market isn't any good\"", "Mostly nothing. A few forced", "trades, small losses."], C.cyan, win(T, 3.3, 6.4), nb);
        s += note2(g, ["Keep the cash flowing", "Small, frequent, mostly green.", "+9.8R before the big day.", "And the mind stays sharp."], C.up, win(T, 6.8, 10.4), nb);
        s += note2(g, ["The larger opportunity", "Both catch +6R on day 17.", "One of them started it", "already green and focused."], C.gold, win(T, 10.8, 13.9), nb);
        s += note2(g, ["Expand your playbook", "+3R vs +18.4R. Same market.", "One complained, one adapted."], C.up, fade(T, 14.2, 0.4), nb);
        return s + stamp(L, "Illustrative · made-up results in R");
      }
    };
  }

  /* =====================================================================
     Trap 6 · Sizing poorly: cycle size with the setup vs desperation size
     ===================================================================== */
  function sizeSpec() {
    var R = [1, 2, -1, 1.5, 2, 1, -1, 2, -1, -1, 0.5, -1, -1, -1, -1, 0.5, -1, -1, 1, 2, -1, 1.5, 2, 1];
    var SM = [1, 1, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1.5, 1.5, 1.5];
    var SD = R.map(function (v, k) { return k === 13 || k === 16 ? 3 : 1; }), N = 24;
    function eq(S) { var e = [0], t = 0; R.forEach(function (r, k) { t += r * S[k]; e.push(t); }); return e; }
    var EM = eq(SM), ED = eq(SD);
    var ST = [
      { at: 0, title: "Performance is cyclical", text: "The same setup, 24 trades: hot for a stretch, then cold, then hot again. Made-up results in R." },
      { at: 3.5, title: "Hot: size up", text: "While the setup is printing, the methodical trader steps up to 1.5 units." },
      { at: 7, title: "Cold: cut 50% or more", text: "Two losers into the drawdown, size drops to half right away, and stays there until the setup starts working again." },
      { at: 11, title: "Desperation size", text: "The other trader hasn't seen the favorite setup in weeks. The first thing that vaguely resembles it gets monster A+ size: 3 units. Twice, on a cold setup in a bad tape." },
      { at: 15, title: "Same trades, different damage", text: "Every trade is identical. Methodical sizing: +12.5R. One even size would have made +7R. Desperation size: +3R, and both 3-unit trades were losers." }
    ];
    function panel(P, E, S, cnt, title, col, op, hl) {
      var s = '<g opacity="' + op.toFixed(3) + '">', lo = -4, hi = 16;
      var X = function (k) { return P.x0 + k / N * (P.x1 - P.x0); }, Y = function (v) { return P.e1 - (v - lo) / (hi - lo) * (P.e1 - P.e0); };
      s += txt(P.x0, P.e0 - 12, title, col, 14, "start", 700);
      [0, 5, 10, 15].forEach(function (v) { s += line(P.x0, Y(v), P.x1, Y(v), v === 0 ? "#48484a" : "#2c2c2e", 1) + txt(P.x1 + 5, Y(v) + 4, (v > 0 ? "+" : "") + v + "R", C.faint, 10.5); });
      var full = Math.floor(cnt), pts = [];
      for (var k = 0; k <= full && k < E.length; k++) pts.push([X(k), Y(E[k])]);
      if (cnt > full && full + 1 < E.length) pts.push([X(cnt), Y(lerp(E[full], E[full + 1], cnt - full))]);
      s += poly(pts, col, 2.6);
      if (pts.length > 1) { var lp = pts[pts.length - 1]; s += tag(lp[0] + 4, lp[1] - 14, sR(Math.round(lerp(E[full], E[Math.min(full + 1, N)], cnt - full) * 10) / 10), col, 1, "end"); }
      s += txt(P.x0, P.s0 - 6, "size", C.faint, 11);
      for (var j = 0; j < Math.min(N, Math.ceil(cnt)); j++) {
        var h = S[j] / 3 * (P.s1 - P.s0), w = (P.x1 - P.x0) / N * 0.6;
        s += rect(X(j + 0.5) - w / 2, P.s1 - h, w, h, hl(j) ? hl(j) : "#636366", 2);
      }
      return s + "</g>";
    }
    return {
      stages: ST, end: 19,
      size: function (n) { return n ? { W: 440, H: 900 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var cnt = track([[0, 0], [3, 8], [3.5, 8], [7, 8], [10.5, 18], [11, 18], [14.5, 24]], T);
        /* temperature band */
        var bx0 = n ? 22 : 46, bx1 = n ? 390 : 754, by = n ? 180 : 40;
        for (var k = 0; k < N; k++) {
          var hot = k < 8 || k >= 18, x = bx0 + k / N * (bx1 - bx0);
          s += rect(x + 1, by, (bx1 - bx0) / N - 2, 12, hot ? C.up : C.blue, 3, k < cnt ? 0.8 : 0.15);
        }
        s += txt(bx0, by + 30, "setup running hot", C.up, 11.5, "start", 600, fade(T, 0.6, 0.4));
        s += txt(bx0 + 8 / N * (bx1 - bx0), by + 30, "cold", C.blue, 11.5, "start", 600, fade(T, 7, 0.4));
        var PM = n ? { x0: 22, x1: 390, e0: 250, e1: 470, s0: 490, s1: 540 } : { x0: 46, x1: 370, e0: 100, e1: 360, s0: 392, s1: 470 };
        var PD = n ? { x0: 22, x1: 390, e0: 610, e1: 800, s0: 820, s1: 870 } : { x0: 430, x1: 754, e0: 100, e1: 360, s0: 392, s1: 470 };
        var oM = T >= 11 && T < 15 ? 0.4 : 1, oD = T >= 3.5 && T < 11 ? 0.4 : 1;
        s += panel(PM, EM, SM, cnt, "Methodical: cycle the size", C.up, oM, function (j) { return SM[j] > 1 ? C.up : SM[j] < 1 ? C.blue : null; });
        s += panel(PD, ED, SD, cnt, "Desperate: same size, then A+ size", C.orange, oD, function (j) { return SD[j] > 1 ? C.dn : null; });
        var XD = function (k) { return PD.x0 + (k + 0.5) / N * (PD.x1 - PD.x0); };
        s += tag(XD(13), PD.s0 - 14, "3 units", C.dn, win(T, 11.6, 19) * oD, "middle");
        var nb = n ? null : 100;
        s += note2(g, ["One setup, 24 trades", "Hot, then cold, then hot.", "Two traders take every one."], C.ink, win(T, 0.4, 3.4), nb);
        s += note2(g, ["Hot: size up", "While it prints, step up", "to 1.5 units."], C.up, win(T, 3.8, 6.9), nb);
        s += note2(g, ["Cold: cut 50% or more", "Two losers into the drawdown:", "half size, right away. Stay", "there until it works again."], C.blue, win(T, 7.3, 10.9), nb);
        s += note2(g, ["Desperation size", "Weeks without the favorite", "setup. Something vaguely like", "it shows up: 3 units. Twice."], C.dn, win(T, 11.3, 14.9), nb);
        s += note2(g, ["Same trades", "Methodical +12.5R. Even size", "+7R. Desperate +3R. Biggest", "bets where the edge is lowest."], C.gold, fade(T, 15.3, 0.4), nb);
        return s + stamp(L, "Illustrative · made-up trades");
      }
    };
  }

  /* =====================================================================
     Trap 7 · Overusing options: the stop you honor on stock, frozen on calls
     ===================================================================== */
  function optionsSpec() {
    var CS = [50.0, 49.86, 49.72, 49.42, 49.3, 49.12, 49.4, 49.62, 49.3, 49.8, 49.5, 49.38, 49.6, 49.3];
    var B = mkBars(CS, 50.1, 71, 0.18);
    B[3].l = Math.min(B[3].l, 49.36);
    var PR = [1.0, 0.85, 0.7, 0.55, 0.42, 0.3, 0.32, 0.26, 0.22, 0.18, 0.14, 0.1, 0.07, 0.05], N = 14;
    var ST = [
      { at: 0, title: "Same idea, two ways", text: "Stock: 1,000 shares at 50.00, stop 49.50, $500 at risk. Options: the loss feels capped, so the trader buys 30 calls at $1.00, $3,000 of premium. Made-up numbers." },
      { at: 4, title: "The level breaks", text: "The stock trader is out at 49.50 for −$500. At that moment the calls are worth about $0.55. Honoring the same level on the option would cost $1,350." },
      { at: 7.5, title: "Paralysis", text: "\"I paid a dollar and it's only worth 30 cents right now, so I'll just let it ride.\" The same trader who never skips a stop on stock freezes on the option." },
      { at: 10.5, title: "Paper cuts", text: "The stock chops with no follow-through. Market makers don't need a crash: time decay takes a slice every day." },
      { at: 14, title: "Audit your options exposure", text: "Expiry week: $0.05, −$2,850. If you wouldn't hold the stock through that level, don't hold the option. And size the option by the dollars at risk, not by the cap." }
    ];
    return {
      stages: ST, end: 18,
      size: function (n) { return n ? { W: 440, H: 800 } : { W: 1180, H: 560 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var x0 = g.x0, x1 = g.x1, y0 = n ? 200 : 40, mid = n ? 450 : 270, py0 = mid + 50, py1 = L.H - 50;
        var X = function (k) { return x0 + (k + 0.5) * (x1 - x0) / N; }, Y = function (v) { return mid - (v - 48.9) / (50.4 - 48.9) * (mid - y0); }, PY = function (v) { return py1 - v / 1.1 * (py1 - py0); };
        var cnt = track([[0, 1], [4, 4], [7.5, 6], [10.5, 9], [13.5, 14]], T), vis = Math.ceil(cnt);
        s += txt(x0, y0 - 12, n ? "the stock · daily bars · red line = stop 49.50" : "the stock · daily bars", C.faint, 12, "start", 600);
        s += axis({ x0: x0, x1: x1 }, 49, 50.25, 0.25, Y, 2);
        s += line(x0, Y(50), x1, Y(50), C.blue, 1.2, "6 5", 0.7);
        s += line(x0, Y(49.5), x1, Y(49.5), C.dn, 1.6, "4 4");
        if (!n) s += tag(x0 + 2, Y(49.5) + 16, "stop level 49.50", C.dn, 1, "start");
        s += drawBars(B, X, Y, cnt, (x1 - x0) / N * 0.55);
        var so = fade(T, 4.2, 0.4);
        if (so > 0) { s += dot(X(3), Y(49.5), 7, C.dn, so); s += tag(X(3) + 12, Y(49.5) - 18, "stock out · −$500", C.dn, so, "start"); }
        s += txt(x0, py0 - 12, "the 30 calls you bought at $1.00", C.faint, 12, "start", 600);
        [0.25, 0.5, 0.75, 1].forEach(function (v) { s += line(x0, PY(v), x1, PY(v), "#2c2c2e", 1) + txt(x1 + 6, PY(v) + 4, "$" + fmt(v, 2), C.faint, 11); });
        var pts = [];
        for (var k = 0; k < vis; k++) pts.push([X(k), PY(PR[k])]);
        s += poly(pts, C.orange, 2.6);
        pts.forEach(function (p) { s += dot(p[0], p[1], 3, C.orange); });
        if (so > 0) { s += line(X(3), Y(49.5), X(3), PY(0.55), C.dn, 1.2, "3 4", so); s += tag(X(3) + 10, PY(0.55) - 14, "$0.55 here · −$1,350 if you honor it", C.gold, so, "start"); }
        s += tag(n ? X(3) : X(5) - 6, PY(0.3) + 24, n ? "\"let it ride\"" : "\"only worth 30 cents… let it ride\"", C.orange, win(T, 7.8, 18), n ? "middle" : "end");
        if (!n) for (var d = 7; d < Math.min(vis, N); d++) s += tag(X(d), PY(PR[d]) - 14, "−" + fmt((PR[d - 1] - PR[d]) * 100, 0) + "¢", C.dn, win(T, 10.6 + (d - 7) * 0.4, 13.9) * 0.9, "middle");
        var eo = fade(T, 14.2, 0.4);
        if (n) s += tag(X(10), PY(0.14) - 26, "time decay, daily", C.dn, win(T, 10.6, 13.9), "middle");
        if (eo > 0) s += tag(X(13), PY(0.05) - 30, "$0.05 · −$2,850", C.dn, eo, "end");
        var nb = n ? null : 40;
        s += note2(g, ["Same idea, two ways", "Stock: $500 at risk.", "Calls: \"max loss is capped\"", "so 30 of them: $3,000."], C.ink, win(T, 0.4, 3.9), nb);
        s += note2(g, ["The level breaks", "Stock out: −$500.", "Calls at $0.55: honoring the", "same level costs $1,350."], C.dn, win(T, 4.3, 7.4), nb);
        s += note2(g, ["Paralysis", "\"I paid a dollar, it's worth", "30 cents, I'll let it ride.\"", "That's not risk management."], C.orange, win(T, 7.8, 10.4), nb);
        s += note2(g, ["Paper cuts", "Chop, no follow-through.", "Time decay takes a slice", "every single day."], C.dn, win(T, 10.8, 13.9), nb);
        s += note2(g, ["The reset rule", "Wouldn't hold the stock", "through the level? Don't hold", "the option. −$2,850 vs −$500."], C.gold, fade(T, 14.3, 0.4), nb);
        return s + stamp(L, "Illustrative · made-up prices");
      }
    };
  }

  var SPECS = { drift: driftSpec, regime: regimeSpec, giveback: givebackSpec, select: selectSpec, cash: cashSpec, size: sizeSpec, options: optionsSpec };
  document.querySelectorAll("[data-tt-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-tt-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     The five-point reset, as a click-through stepper.
     Without the script the five show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-tt-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var INFO = [
      { k: "Regime",      c: C.cyan,   tag: "Audit your regime before sizing" },
      { k: "Size",        c: C.up,     tag: "Cycle your size methodically" },
      { k: "Options",     c: C.orange, tag: "Audit your options exposure" },
      { k: "Selectivity", c: C.gold,   tag: "Demand ruthless selectivity" },
      { k: "Playbook",    c: C.blue,   tag: "Accept Graham's challenge" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "The five-point trading reset");
    bar.innerHTML = '<span class="gs-line"><i></i></span>' + INFO.map(function (s, i) {
      return '<button type="button" role="tab" class="gs-step" data-i="' + i + '"><b>' + (i + 1) + "</b><span>" + s.k + "</span></button>";
    }).join("");
    var body = document.createElement("div"); body.className = "gs-body";
    var left = document.createElement("div"); left.className = "gs-left";
    var tg = document.createElement("p"); tg.className = "gs-tag";
    var nav = document.createElement("div"); nav.className = "gs-nav";
    nav.innerHTML = '<button type="button" class="pill gs-prev">&lsaquo; Back</button><button type="button" class="pill pill-buy gs-next"></button>';
    var fig = document.createElement("div"); fig.className = "gs-chart";
    fig.innerHTML = '<svg viewBox="0 0 560 300" role="img" aria-label="A small picture of the current reset step"></svg>';
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
      var top = 30, bot = H - 50;
      if (k === 0) {
        var CK = ["Within a set % of the high", "Above the 20-day", "Above the 50-day"], rh = narrow ? 92 : 58;
        CK.forEach(function (c, i) {
          var y = top + 10 + i * rh;
          s += r(30, y, W - 60, rh - 14, "#2c2c2e", null, 12);
          s += '<circle cx="62" cy="' + (y + (rh - 14) / 2).toFixed(1) + '" r="' + (9 * F).toFixed(1) + '" fill="' + (i < 2 ? C.up : C.dn) + '"/>';
          s += t(90, y + (rh - 14) / 2 + 5 * F, c, C.ink, 14, "start", 600);
        });
        s += t(30, bot + 26, "Not all three: defense. Scalp, move-to-move.", C.orange, 12.5, "start", 700);
      } else if (k === 1) {
        var SZ = [1, 1, 1.5, 1.5, 1.5, 1.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1.5, 1.5], bw = (W - 60) / SZ.length;
        SZ.forEach(function (v, i) { var h = v / 1.6 * (bot - top - 30); s += r(30 + i * bw + 5, bot - h, bw - 10, h, v > 1 ? C.up : v < 1 ? C.blue : "#636366"); });
        s += t(30, top + 6, "hot: size up", C.up, 12.5, "start", 700) + t(30 + 6 * bw, top + 6, "drawdown: −50% at once", C.blue, 12.5, "start", 700);
        s += t(30, bot + 26, "Size follows the setup's form, not your hope.", C.dim, 12.5, "start", 500);
      } else if (k === 2) {
        var lv = top + (bot - top) * 0.55;
        s += '<polyline points="30,' + (top + 20) + " 120," + (top + 50) + " 210," + (top + 40) + " 300," + (lv + 30) + " 390," + (lv + 10) + " 480," + (lv + 40) + " 530," + (lv + 20) + '" fill="none" stroke="' + C.ink + '" stroke-width="2.4" stroke-linejoin="round"/>';
        s += '<line x1="30" x2="530" y1="' + lv + '" y2="' + lv + '" stroke="' + C.dn + '" stroke-width="2" stroke-dasharray="6 5"/>';
        s += '<circle cx="' + (290) + '" cy="' + lv + '" r="' + (8 * F) + '" fill="' + C.gold + '"/>';
        s += t(316, lv - 14, narrow ? "exit both here" : "exit the stock and the option here", C.gold, 12.5, "start", 700);
        s += t(30, bot + 26, "Size options by dollars at risk, not by the cap.", C.dim, 12.5, "start", 500);
      } else if (k === 3) {
        var GR = ["A+", "A", "A−", "B+", "B"], gw = (W - 60) / GR.length;
        GR.forEach(function (gname, i) {
          s += r(30 + i * gw + 6, top + 20, gw - 12, narrow ? 80 : 56, i < 2 ? "rgba(48,209,88,0.22)" : "#2c2c2e", null, 10);
          s += t(30 + i * gw + gw / 2, top + (narrow ? 72 : 56), gname, i < 2 ? C.up : C.dim, 16, "middle", 700);
        });
        s += '<path d="M' + (30 + gw / 2) + "," + (top + (narrow ? 112 : 88)) + " Q" + (30 + 2 * gw) + "," + (top + (narrow ? 170 : 130)) + " " + (30 + 3.5 * gw) + "," + (top + (narrow ? 112 : 88)) + '" fill="none" stroke="' + C.gold + '" stroke-width="2.4"/>';
        s += t(30 + 2 * gw, top + (narrow ? 200 : 150), "one nuance missing: −3 notches", C.gold, 12.5, "middle", 700);
        s += t(30, bot + 26, "Fold when the flop doesn't fit.", C.dim, 12.5, "start", 500);
      } else {
        var D = [0.8, 1.2, -0.4, 0.6, 1, 0.5, 1.4, -0.3, 0.9, 0.7, 1.1, 0.4], dw = (W - 60) / D.length, z = bot - 30, cum = 0, pts = [];
        D.forEach(function (v, i) { var h = Math.abs(v) * 40; s += r(30 + i * dw + 5, v > 0 ? z - h : z, dw - 10, Math.max(2, h), v > 0 ? C.up : C.dn); cum += v; pts.push([30 + (i + 0.5) * dw, z - 60 - cum * (narrow ? 20 : 11)]); });
        s += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + C.blue + '" stroke-width="2.4"/>';
        s += t(30, top + 6, "small daily cash flow, adding up", C.blue, 12.5, "start", 700);
        s += t(30, bot + 26, "Turn trades, tape scalps, low floats, news.", C.dim, 12.5, "start", 500);
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
      tg.textContent = "Reset " + (k + 1) + " of " + INFO.length + " · " + INFO[k].tag;
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
