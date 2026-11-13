/* =====================================================================
   anim-kit.js — the shared engine behind the stage-by-stage animations.

   A page includes this file, then its own spec file, which calls
       AnimKit.mount("key", function (K) { ... return { stages, end, frame, focus }; });
   and the kit finds <section class="anim" data-tm-anim="key"> and plays it:
   captions, stage chips, Play / Pause / Replay, autoplay when scrolled into
   view, and a still final frame for reduced motion.

   Spec contract
     stages : [{ at: seconds, title, text }]   (first at 0, ascending)
     end    : seconds when the animation stops
     frame  : function (T) -> SVG markup for time T (1180 x 520 viewBox;
              the kit paints the background)
     focus  : optional function (T) -> x in viewBox units to keep in view
              when the chart is scrolled sideways on a phone

   Helpers (K.*): C colours, W, H, clamp01, fade, f2, txt, geo, hline, tag,
   candle, callout, grid, timeline, progress, lastBar, line, vol, dot, arrow.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#64d2ff", gold: "#f4b942", grey: "#8e8e93", ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e" };
  var W = 1180, H = 520;

  /* ---------- shared drawing helpers ---------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function f2(v) { return v.toFixed(2); }
  function txt(x, y, s, col, size, anchor, weight, op) {
    return '<text x="' + x + '" y="' + y + '" fill="' + col + '" font-size="' + (size || 13) + '" text-anchor="' + (anchor || "start") + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  function geo(o) {
    o.y = function (p) { return o.yb - (p - o.pmin) / (o.pmax - o.pmin) * (o.yb - o.yt); };
    o.x = function (i) { return o.x0 + i * o.dx; };
    return o;
  }
  function hline(G, x1, x2, p, col, dash, w, op) {
    var yy = G.y(p).toFixed(1);
    return '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + yy + '" y2="' + yy + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function tag(G, xTag, p, label, col, op, ink) {
    if (op <= 0) return "";
    var yy = G.y(p);
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xTag + '" y="' + (yy - 10) + '" width="130" height="20" rx="5" fill="' + col + '"/>' +
      txt(xTag + 8, yy + 4.5, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function candle(G, i, b, prog, wBody, op) {
    if (prog <= 0) return "";
    var xx = G.x(i), o = b[0], h = b[1], l = b[2], c = b[3], up = c >= o;
    var pth = up ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = prog >= 1 ? c : pth[idx] + (pth[idx + 1] - pth[idx]) * f;
    var hi = o, lo = o;
    for (var k = 0; k <= idx; k++) { hi = Math.max(hi, pth[k]); lo = Math.min(lo, pth[k]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var col = cur >= o ? C.up : C.dn, top = G.y(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(G.y(o) - G.y(cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + xx + '" x2="' + xx + '" y1="' + G.y(hi).toFixed(1) + '" y2="' + G.y(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.3"/>' +
      '<rect x="' + (xx - wBody / 2) + '" y="' + top.toFixed(1) + '" width="' + wBody + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  function callout(x, y, lines, col, op, right) {
    if (op <= 0) return "";
    var w = 16 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z]+;/g, "x").length; })) * 7.2, h = 10 + lines.length * 17;
    var x0 = right ? x - w : x;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt((x0 + 10).toFixed(0), (y + 20 + k * 17).toFixed(0), ln, k === 0 ? col : C.dim, 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  function grid(G, from, to, step, x1, x2, xAx) {
    var s = "";
    for (var p = from; p <= to + 1e-9; p += step) s += hline(G, x1, x2, p, "rgba(255,255,255,0.05)", null, 1) + txt(xAx, G.y(p) + 4, p.toFixed(step < 1 ? 2 : 0), C.faint, 11, "end");
    return s;
  }
  /* bar reveal times: one segment per range [i0, i1, tStart, perBar, dur] */
  function timeline(n, segs) {
    var TB = [];
    segs.forEach(function (s) { for (var i = s[0]; i <= s[1]; i++) TB[i] = [s[2] + (i - s[0]) * s[3], s[2] + (i - s[0]) * s[3] + (s[4] || s[3] * 0.9)]; });
    for (var i = 0; i < n; i++) if (!TB[i]) TB[i] = [0, 0.01];
    return TB;
  }
  function progress(T, TB, i) { return clamp01((T - TB[i][0]) / (TB[i][1] - TB[i][0])); }
  function lastBar(T, TB) { var k = -1; for (var i = 0; i < TB.length; i++) if (T >= TB[i][0]) k = i; return k; }

  /* ---------- the player: captions, chips, play / replay, autoplay on view ---------- */
  function player(root, spec) {
    var svg = root.querySelector("svg");
    var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
    var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay"), chips = root.querySelector(".anim-chips");
    var scroller = root.querySelector(".anim-scroll");
    var ST = spec.stages, END = spec.end, T = END, playing = false, lastNow = 0, raf = 0, shown = -1;
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
    function follow() {
      if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 2 || !spec.focus) return;
      var fx = spec.focus(T);
      scroller.scrollLeft = Math.max(0, fx / W * scroller.scrollWidth - scroller.clientWidth * 0.62);
    }
    function draw() { svg.innerHTML = '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>' + spec.frame(T); caption(); follow(); }
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
    draw();
    if (!REDUCED && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); T = 0; draw(); setPlaying(true); }
      }, { threshold: 0.45 });
      io.observe(svg.parentNode || svg);
    }
  }


  /* ---------- extras for indicator lines, volume and markers ---------- */
  /* a polyline through vals[i] (null = gap) for bars from..to; stops at bar `to` */
  function line(G, vals, from, to, col, w, op, dash) {
    var s = "", pts = [];
    function flush() { if (pts.length > 1) s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2) + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>"; pts = []; }
    for (var i = from; i <= to; i++) { if (vals[i] == null) { flush(); continue; } pts.push(G.x(i).toFixed(1) + "," + G.y(vals[i]).toFixed(1)); }
    flush();
    return s;
  }
  /* a volume bar for bar i in a volume pane GV (geo with pmin 0); grows with prog */
  function vol(GV, i, v, prog, col, wBody, op) {
    if (prog <= 0) return "";
    var hgt = (GV.yb - GV.y(v)) * clamp01(prog);
    return '<rect x="' + (GV.x(i) - wBody / 2) + '" y="' + (GV.yb - hgt).toFixed(1) + '" width="' + wBody + '" height="' + Math.max(0.5, hgt).toFixed(1) + '" fill="' + col + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function dot(x, y, r, col, op, fill) {
    if (op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + (fill ? col : "none") + '" stroke="' + col + '" stroke-width="2.2" opacity="' + op.toFixed(3) + '"/>';
  }
  /* small triangle marker: up = below the bar pointing up, else above pointing down */
  function arrow(x, y, up, col, op) {
    if (op <= 0) return "";
    return '<path d="M' + x.toFixed(1) + " " + y.toFixed(1) + (up ? " l-6 10 h12 z" : " l-6 -10 h12 z") + '" fill="' + col + '" opacity="' + op.toFixed(3) + '"/>';
  }

  function mount(key, make) {
    function go() {
      document.querySelectorAll('[data-tm-anim="' + key + '"]').forEach(function (root) { player(root, make(K)); });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  }

  var K = { C: C, W: W, H: H, clamp01: clamp01, fade: fade, f2: f2, txt: txt, geo: geo, hline: hline, tag: tag, candle: candle,
            callout: callout, grid: grid, timeline: timeline, progress: progress, lastBar: lastBar,
            line: line, vol: vol, dot: dot, arrow: arrow, player: player, mount: mount, specs: {} };
  var _mount = mount;
  K.mount = function (key, make) { K.specs[key] = make; _mount(key, make); };   // specs kept for testing
  window.AnimKit = K;
})();
