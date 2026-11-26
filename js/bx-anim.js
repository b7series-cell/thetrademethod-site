/* =====================================================================
   bx-anim.js — the walkthroughs, calculators and steppers on the Basics
   pages built from Martik Finance's beginner videos:

     investment-funds.html   [data-bx-anim="fees"|"lev"]   [data-bx-calc="fee"]
     options-basics.html     [data-bx-anim="call"|"decay"] [data-bx-calc="opt"]
     recession-investing.html[data-bx-anim="crash"|"lag"]  [data-bx-calc="plan"]
     arbitrage.html          [data-bx-anim="gap"|"tri"]    [data-bx-calc="arb"]
     analysis-types.html     [data-bx-anim="chart"]        [data-bx-pick]
     eps-pe-ratio.html       [data-bx-anim="cake"|"pe"]    [data-bx-calc="eps"]
     every page              [data-bx-steps="<set>"]       five-step stepper

   The player and drawing helpers are copied from fb-anim.js: each chart
   redraws in a narrow layout on a phone instead of scrolling sideways,
   with the callouts in a band on top. Numbers are the videos' unless a
   stage says made up; the 2008 and 2020 dates and S&P 500 closes are
   from the public record (approximate between them).
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#64d2ff", gold: "#f4b942", orange: "#ff9f0a", purple: "#bf5af2", grey: "#8e8e93",
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
  function callout(x, y, lines, col, op) {
    if (op <= 0) return "";
    var w = 18 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z]+;/g, "x").length; })) * 7.3 * FS, h = 10 + lines.length * 18 * FS;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt(x + 10, y + 21 * FS + k * 18 * FS, ln, k === 0 ? col : C.dim, 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
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
  function dot(x, y, r, col, op, stroke) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + (stroke ? "none" : col) + '"' + (stroke ? ' stroke="' + col + '" stroke-width="2.4"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function poly(pts, col, w, dash, op) {
    if (pts.length < 2 || (op != null && op <= 0)) return "";
    return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2.4) + '" stroke-linejoin="round"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function arrow(x1, y1, x2, y2, col, op, dash) {
    if (op <= 0) return "";
    var a = Math.atan2(y2 - y1, x2 - x1), h = 10;
    return line(x1, y1, x2, y2, col, 2.2, dash, op) +
      '<path d="M' + x2.toFixed(1) + "," + y2.toFixed(1) + " L" + (x2 - h * Math.cos(a - 0.45)).toFixed(1) + "," + (y2 - h * Math.sin(a - 0.45)).toFixed(1) +
      " L" + (x2 - h * Math.cos(a + 0.45)).toFixed(1) + "," + (y2 - h * Math.sin(a + 0.45)).toFixed(1) + 'Z" fill="' + col + '" opacity="' + op.toFixed(3) + '"/>';
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
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function track(pts, T) {
    if (T <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) if (T <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return lerp(a[1], b[1], (T - a[0]) / (b[0] - a[0] || 1)); }
    return pts[pts.length - 1][1];
  }
  function fmt(v, d) { return (+v).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function usd(v, d) { return (v < 0 ? "−$" : "$") + fmt(Math.abs(v), d || 0); }
  function sgn(v, d) { return (v < 0 ? "−$" : "+$") + fmt(Math.abs(v), d || 0); }
  function kUSD(v) { return v === 0 ? "$0" : "$" + fmt(v / 1000, 0) + "k"; }
  function sizeStd(n) { return n ? { W: 440, H: 760 } : { W: 1180, H: 540 }; }
  function stamp(L, s) { return txt(L.W - 14, L.H - 10, s || "Illustrative · made-up numbers", C.faint, 11, "end"); }
  function hgrid(x0, x1, Y, lo, hi, step, fmtFn, op) {
    var s = "";
    for (var v = Math.ceil(lo / step - 1e-9) * step || 0; v <= hi + 1e-9; v += step) {
      var y = Y(v);
      s += line(x0, y, x1, y, "#2c2c2e", 1, null, op);
      s += txt(x1 + 6, y + 4, fmtFn(v), C.faint, 11, "start", null, op);
    }
    return s;
  }
  function nb(n, lines, col, op) { return n ? callout(14, 18, lines, col, op) : callout(822, 50, lines, col, op); }
  /* a chart area: index x (0..N-1), value y */
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
  /* a line through values[0..], drawn up to a fractional count */
  function series(vals, X, Y, upto) {
    var out = [], full = Math.floor(upto);
    for (var i = 0; i < vals.length && i <= full; i++) out.push([X(i), Y(vals[i])]);
    if (upto > full && full + 1 < vals.length) { var f = upto - full; out.push([lerp(X(full), X(full + 1), f), Y(lerp(vals[full], vals[full + 1], f))]); }
    return out;
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

  /* =====================================================================
     FUNDS · the fee: $10,000 for 30 years at 7% a year before fees
     ===================================================================== */
  function grow(p, r, fee, y) { return p * Math.pow(1 + r - fee, y); }
  function feesSpec() {
    var YRS = 30, P = 10000, R = 0.07;
    var LOW = [], HIGH = [], MID = [], AVG = [];
    for (var y = 0; y <= YRS; y++) { LOW.push(grow(P, R, 0.0005, y)); HIGH.push(grow(P, R, 0.01, y)); MID.push(grow(P, R, 0.0015, y)); AVG.push(grow(P, R, 0.004, y)); }
    var ST = [
      { at: 0, title: "Same money, same market", text: "You invest $10,000 for 30 years and the investments grow 7% a year before fees. Two funds hold the same things. The only difference is the yearly fee." },
      { at: 3.5, title: "0.05% vs 1%", text: "The cheap fund ends near $75,000. The 1% fund ends near $57,000. Nothing else changed." },
      { at: 7, title: "The gap grows", text: "About $1,700 apart after 10 years, $6,300 after 20, and about $18,000 after 30. The fee is charged every year on all your money, whether the fund makes money or not." },
      { at: 10.5, title: "Where the usual fees land", text: "Index funds often charge under 0.15% a year, stock mutual funds about 0.4% on average, and some active funds 1% or more. Same $10,000, same 7%." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var c = ctx(L, YRS + 1, 0, 80000), s = "", n = c.n;
        s += hgrid(c.g.x0, c.g.x1, c.Y, 0, 80000, 20000, function (v) { return kUSD(v); });
        s += title(c, "$10,000 growing 7% a year before fees · 30 years", "$10,000 at 7% · 30 years");
        [0, 10, 20, 30].forEach(function (y) { s += txt(c.X(y), c.g.y1 + 22, "yr " + y, C.faint, 11, "middle"); });
        var cnt = track([[0, 0], [0.4, 0], [3.2, 10], [3.6, 10], [6.6, YRS]], T);
        s += poly(series(LOW, c.X, c.Y, cnt), C.up, 3);
        s += poly(series(HIGH, c.X, c.Y, cnt), C.orange, 3);
        s += dot(c.X(0), c.Y(P), 6, C.ink, fade(T, 0.2, 0.3));
        var oe = fade(T, 6.6, 0.4);
        s += tag(c.X(YRS) - 8, c.Y(LOW[YRS]) - 18, (n ? "0.05%: " : "0.05% fee: ") + kUSD(LOW[YRS]), C.up, oe, "end");
        s += tag(c.X(YRS) - 8, c.Y(HIGH[YRS]) + 22, (n ? "1%: " : "1% fee: ") + kUSD(HIGH[YRS]), C.orange, oe, "end");
        var og = win(T, 7.2, 10.5);
        if (og > 0) {
          [10, 20, 30].forEach(function (y, k) {
            var o = og * fade(T, 7.3 + k * 0.7, 0.3), x = c.X(y);
            s += line(x, c.Y(LOW[y]), x, c.Y(HIGH[y]), C.dn, 3, null, o);
            s += tag(x - 6, (c.Y(LOW[y]) + c.Y(HIGH[y])) / 2, "−" + usd(LOW[y] - HIGH[y]), C.dn, o, "end");
          });
        }
        var om = fade(T, 10.8, 0.5);
        if (om > 0) {
          s += poly(series(MID, c.X, c.Y, YRS), C.cyan, 2, "6 5", om);
          s += poly(series(AVG, c.X, c.Y, YRS), C.gold, 2, "6 5", om);
          var xr = c.X(YRS) + 4;
          s += dot(xr - 4, c.Y(MID[YRS]), 5, C.cyan, om) + dot(xr - 4, c.Y(AVG[YRS]), 5, C.gold, om);
          s += tag(c.X(YRS * 0.62), c.Y(MID[Math.round(YRS * 0.62)]) - 20, "0.15% index: " + kUSD(MID[YRS]), C.cyan, fade(T, 11.2, 0.4), "middle");
          s += tag(c.X(YRS * 0.74), c.Y(AVG[Math.round(YRS * 0.74)]) + 26, "0.4% average: " + kUSD(AVG[YRS]), C.gold, fade(T, 11.6, 0.4), "middle");
        }
        s += notes(c, T, [
          [["$10,000 for 30 years", "7% a year before fees.", "Only the fee differs."], C.ink, 0.3, 3.5],
          [["0.05% vs 1%", "About $75,000", "vs about $57,000."], C.up, 3.7, 7],
          [["About $18,000 apart", "Charged every year,", "win or lose."], C.dn, 7.2, 10.5],
          [["Usual fees", "Index under 0.15%,", "average 0.4%, active 1%+."], C.cyan, 10.7, null]
        ]);
        return s + stamp(L, "Illustrative · 7% a year is an assumption, not a promise");
      }
    };
  }

  /* =====================================================================
     FUNDS · the 3x fund in a choppy month: +3%, −3% for 20 days
     ===================================================================== */
  function levSpec() {
    var D = 20, IDX = [100], X3 = [100];
    for (var d = 1; d <= D; d++) { var m = d % 2 ? 0.03 : -0.03; IDX.push(IDX[d - 1] * (1 + m)); X3.push(X3[d - 1] * (1 + 3 * m)); }
    var ST = [
      { at: 0, title: "A nervous month", text: "The index goes up 3% one day and down 3% the next, for 20 trading days. It ends the month less than 1% lower." },
      { at: 4, title: "The 3x fund", text: "A 3x leveraged ETF tries to give three times the daily move: up 9%, down 9%, every day. It resets every single day." },
      { at: 8, title: "After 20 days", text: "The index is down about 0.9%. The 3x fund is down about 7.8%, not three times 0.9%. The daily reset is what does it." },
      { at: 11.5, title: "Why", text: "Up 9% then down 9% is 1.09 × 0.91 = 0.9919: a 0.8% loss every two days, even though the index went nowhere. Over weeks it adds up. These are built for short-term traders, not buy and hold." }
    ];
    return {
      stages: ST, end: 15, size: sizeStd,
      frame: function (T, L) {
        var c = ctx(L, D + 1, 84, 116), s = "", n = c.n;
        s += hgrid(c.g.x0, c.g.x1, c.Y, 85, 115, 5, function (v) { return fmt(v); });
        s += title(c, "Value of $100 · index vs 3x leveraged ETF · made-up month", "$100 · index vs 3x · made up");
        [0, 5, 10, 15, 20].forEach(function (d) { s += txt(c.X(d), c.g.y1 + 22, d === 0 ? "start" : "day " + d, C.faint, 11, "middle"); });
        s += line(c.g.x0, c.Y(100), c.g.x1, c.Y(100), C.faint, 1.2, "4 4");
        var ci = track([[0, 0], [0.4, 0], [3.6, D]], T), cx = track([[4, 0], [7.6, D]], T);
        s += poly(series(IDX, c.X, c.Y, ci), C.blue, 2.6);
        if (T >= 4) s += poly(series(X3, c.X, c.Y, cx), C.orange, 2.6);
        var oe = fade(T, 8, 0.4);
        s += tag(c.X(D) - 8, c.Y(IDX[D]) - 18, "index " + fmt((IDX[D] / 100 - 1) * 100, 1) + "%", C.blue, oe, "end");
        s += tag(c.X(D) - 8, c.Y(X3[D]) + 22, "3x fund " + fmt((X3[D] / 100 - 1) * 100, 1) + "%", C.orange, oe, "end");
        var ow = fade(T, 11.7, 0.4);
        if (ow > 0) {
          s += line(c.X(0), c.Y(100), c.X(2), c.Y(X3[2]), C.dn, 3, null, ow);
          s += tag(c.X(2) + 8, c.Y(X3[2]) + 24, n ? "1.09 × 0.91 = 0.9919" : "two days: 1.09 × 0.91 = 0.9919", C.dn, ow, "start");
        }
        s += notes(c, T, [
          [["+3%, −3%, repeat", "20 days. The index ends", "less than 1% lower."], C.blue, 0.3, 4],
          [["3x: +9%, −9%", "Three times the DAILY", "move. Resets every day."], C.orange, 4.2, 8],
          [["After 20 days", "Index: about −0.9%.", "3x fund: about −7.8%."], C.dn, 8.2, 11.5],
          [["Built for short trades", "Choppy markets eat it,", "even when the index is flat."], C.dn, 11.7, null]
        ]);
        return s + stamp(L, "Illustrative · the video's +3% / −3% month");
      }
    };
  }

  /* =====================================================================
     OPTIONS · Anna's call: strike $100, $2 premium, 100 shares
     ===================================================================== */
  function callSpec() {
    var K = 100, PR = 2, SH = 100, LO = 40, HI = 126;
    function buyPL(p) { return Math.max(0, p - K) * SH - PR * SH; }
    var ST = [
      { at: 0, title: "The deal", text: "Anna buys one call: the right to buy 100 shares at $100 (the strike), any time in the next month. She pays a $2 per share premium, $200 in total. The stock is at $100." },
      { at: 3.5, title: "The stock rises to $120", text: "She can buy 100 shares at $100 that are worth $120: $2,000 of value, minus the $200 premium, is $1,800 profit on $200. That's the leverage." },
      { at: 7, title: "Flat, down, or crashing", text: "At $100, $95 or $50, there's no reason to buy at $100. She lets it expire. The loss is the $200 premium, and it can't get bigger." },
      { at: 10.5, title: "Break-even is $102", text: "Strike plus premium. At $101 the option is in the money by $1, worth $100, but she paid $200: still down $100. The premium is a hurdle." },
      { at: 14, title: "Marco, on the other side", text: "Marco sold Anna the call and kept the $200 no matter what. His best case is +$200. Above $102 he loses, and the loss has no ceiling." }
    ];
    return {
      stages: ST, end: 18, size: sizeStd,
      frame: function (T, L) {
        var c = ctx(L, HI - LO + 1, -2800, 2800), s = "", n = c.n;
        function X(p) { return c.X(p - LO); }
        s += hgrid(c.g.x0, c.g.x1, c.Y, -2000, 2000, 1000, function (v) { return v === 0 ? "$0" : sgn(v); });
        s += title(c, "Profit or loss at expiration · one call, strike $100, premium $200", "Call P&L at expiry · strike $100");
        [40, 60, 80, 100, 120].forEach(function (p) { s += txt(X(p), c.g.y1 + 22, "$" + p, C.faint, 11, "middle"); });
        s += txt(c.g.x1, c.g.y1 + 40, "stock price at expiration", C.faint, 11, "end");
        s += line(c.g.x0, c.Y(0), c.g.x1, c.Y(0), C.faint, 1.4);
        var ok = fade(T, 0.4, 0.4);
        s += line(X(K), c.g.y0, X(K), c.g.y1, C.blue, 1.4, "5 4", ok);
        s += tag(X(K), c.g.y0 + 10, "strike $100", C.blue, ok, "middle");
        /* buyer line */
        var reach = track([[0.8, LO], [3.4, HI]], T), pts = [];
        for (var p = LO; p <= reach; p += 1) pts.push([X(p), c.Y(buyPL(p))]);
        s += poly(pts, C.up, 3, null, T < 14 ? 1 : 0.55);
        var o1 = fade(T, 3.7, 0.4);
        s += dot(X(120), c.Y(buyPL(120)), 7, C.up, o1);
        s += tag(X(120) - 10, c.Y(buyPL(120)) - 20, "$120: +$1,800", C.up, o1 * (T < 14 ? 1 : 0.5), "end");
        var o2 = fade(T, 7.2, 0.4);
        [[100, "$100"], [95, "$95"], [50, "$50"]].forEach(function (q, k) {
          var oo = o2 * fade(T, 7.3 + k * 0.5, 0.3);
          s += dot(X(q[0]), c.Y(-200), 6, C.dn, oo);
        });
        s += tag(X(72), c.Y(-200) + 26, n ? "−$200, no worse" : "$50, $95 or $100: −$200, no worse", C.dn, o2 * (T < 14 ? 1 : 0.5), "middle");
        var o3 = win(T, 10.7, 14);
        if (o3 > 0) {
          s += dot(X(102), c.Y(0), 7, C.gold, o3);
          s += tag(X(102) - 12, c.Y(0) - 22, "break-even $102", C.gold, o3, "end");
          s += dot(X(101), c.Y(buyPL(101)), 5, C.orange, o3);
          s += tag(X(101) + 10, c.Y(buyPL(101)) + 22, n ? "$101: −$100" : "$101: in the money, still −$100", C.orange, fade(T, 11.4, 0.3) * o3, "start");
        }
        var o4 = fade(T, 14.2, 0.5);
        if (o4 > 0) {
          var sp = [];
          for (var q = LO; q <= HI; q += 1) sp.push([X(q), c.Y(-buyPL(q))]);
          s += poly(sp, C.dn, 3, "7 5", o4);
          s += tag(X(60), c.Y(200) - 20, "Marco keeps +$200", C.dn, o4, "middle");
          s += tag(X(118), c.Y(-buyPL(118)) + 24, n ? "losses keep growing" : "his losses keep growing", C.dn, fade(T, 14.8, 0.4), "end");
        }
        s += notes(c, T, [
          [["Anna buys 1 call", "Strike $100, 1 month.", "Premium $2 × 100 = $200."], C.blue, 0.3, 3.5],
          [["Stock to $120", "$2,000 of value − $200", "= +$1,800 on $200."], C.up, 3.7, 7],
          [["$100, $95 or $50", "Let it expire.", "Most she loses: $200."], C.dn, 7.2, 10.5],
          [["Break-even $102", "Strike + premium.", "Know it before you buy."], C.gold, 10.7, 14],
          [["Marco sold it", "Best case: +$200.", "Worst case: no ceiling."], C.dn, 14.2, null]
        ]);
        return s + stamp(L, "Illustrative · the video's fictional company");
      }
    };
  }

  /* =====================================================================
     OPTIONS · the two forces: time decay, then the volatility crush
     ===================================================================== */
  function decaySpec() {
    var D = 30, TV = [];
    for (var d = 0; d <= D; d++) TV.push(200 * Math.sqrt((D - d) / D));
    var ST = [
      { at: 0, title: "A lit fuse", text: "Made-up shape. Anna's $200 call is mostly time value: the chance the stock moves before expiration. If the stock just sits at $100, that value shrinks every day." },
      { at: 3.5, title: "It speeds up", text: "Decay is slow with lots of time left and fast in the final days and weeks. Three weeks of nothing and most of the $200 is gone." },
      { at: 7, title: "Right, but out of time", text: "At expiration, with the stock still at $100, the option is worth $0. Not because Anna was wrong about the direction. She ran out of time." },
      { at: 10, title: "The volatility crush", text: "Another trade. Anna pays $200 right before earnings, when fear makes options expensive. The report comes out, the stock barely moves, the fear is gone: the option is worth $80." },
      { at: 13.5, title: "Marco buys it back", text: "Marco sold that call for $200. He buys it back at $80 and locks in $120, instead of waiting weeks for the last $80 and risking a bad headline." }
    ];
    return {
      stages: ST, end: 17, size: sizeStd,
      frame: function (T, L) {
        var c = ctx(L, D + 1, 0, 240), s = "", n = c.n, mB = ease(fade(T, 10, 0.8));
        s += hgrid(c.g.x0, c.g.x1, c.Y, 0, 240, 50, function (v) { return "$" + fmt(v); });
        s += title(c, mB < 0.5 ? "Value of the $200 call if the stock sits at $100 · made-up shape" : "The same call through an earnings report · made up", mB < 0.5 ? "Call value, stock flat · made up" : "Through earnings · made up");
        [0, 10, 20, 30].forEach(function (d) { s += txt(c.X(d), c.g.y1 + 22, d === 30 ? "expiry" : (D - d) + " days left", C.faint, 11, "middle"); });
        var oa = 1 - mB;
        if (oa > 0) {
          var cnt = track([[0, 0], [0.4, 0], [3.2, 21], [3.6, 21], [6.6, D]], T);
          s += poly(series(TV, c.X, c.Y, cnt), C.gold, 3, null, oa);
          s += dot(c.X(0), c.Y(200), 6, C.gold, fade(T, 0.2, 0.3) * oa);
          var o2 = win(T, 3.7, 10);
          s += tag(c.X(21) + 8, c.Y(TV[21]) - 18, "3 weeks: $" + fmt(TV[21]), C.gold, o2 * oa, "start");
          var o3 = fade(T, 7.2, 0.4) * oa;
          s += dot(c.X(D), c.Y(0), 7, C.dn, o3);
          s += tag(c.X(D) - 10, c.Y(0) - 18, "expiry: $0", C.dn, o3, "end");
        }
        if (mB > 0) {
          var E = 12, path = [];
          for (var d = 0; d <= D; d++) path.push(d < E ? 200 - d * 1.2 : d === E ? 80 : Math.max(0, 80 * Math.sqrt((D - d) / (D - E))));
          var cnt2 = track([[10.2, 0], [11.6, E + 1], [13.5, E + 1], [16, E + 4]], T);
          s += poly(series(path, c.X, c.Y, cnt2), C.orange, 3, null, mB);
          s += line(c.X(E - 0.5), c.g.y0, c.X(E - 0.5), c.g.y1, C.blue, 1.4, "5 4", mB);
          s += tag(c.X(E - 0.5), c.g.y0 + 10, "earnings report", C.blue, mB, "middle");
          var oc = fade(T, 11.6, 0.4);
          s += tag(c.X(E) + 10, c.Y(80) + 22, n ? "fear gone: $80" : "stock barely moved, fear gone: $80", C.orange, oc, "start");
          var om = fade(T, 13.7, 0.4);
          if (om > 0) {
            s += line(c.X(0), c.Y(200), c.X(E), c.Y(200), C.up, 1.4, "4 4", om);
            s += arrow(c.X(E) + 2, c.Y(196), c.X(E) + 2, c.Y(86), C.up, om);
            s += tag(c.X(E) + 12, c.Y(140), n ? "Marco: +$120" : "Marco sold $200, buys back $80: +$120", C.up, om, "start");
          }
        }
        s += notes(c, T, [
          [["Time value", "Shrinks every day,", "even if nothing happens."], C.gold, 0.3, 3.5],
          [["It accelerates", "Slow early,", "fast in the final weeks."], C.gold, 3.7, 7],
          [["Expiry at $100", "Worth $0. Right about", "direction, out of time."], C.dn, 7.2, 10],
          [["Volatility crush", "Paid $200 before earnings.", "Fear gone: worth $80."], C.orange, 10.2, 13.5],
          [["The seller's side", "Sold $200, bought $80:", "+$120, trade closed."], C.up, 13.7, null]
        ]);
        return s + stamp(L, "Illustrative · made-up decay curve, the video's $200 and $80");
      }
    };
  }

  /* =====================================================================
     RECESSION · the S&P 500 in 2020 (weekly, approximate)
     ===================================================================== */
  function crashSpec() {
    /* week index from Feb 19, 2020; anchors are closes from the public record */
    var A = [[0, 3386], [3, 2481], [4, 2386], [5, 2237], [6, 2541], [8, 2790], [10, 2912], [11, 2930], [13, 2955], [16, 3232], [19, 3083], [21, 3185], [24, 3271], [26, 3390], [29, 3500], [31, 3319], [36, 3270], [38, 3510], [41, 3638], [45, 3756]];
    var r = rng(7), W = [];
    for (var i = 0; i <= 45; i++) { var v = track(A, i), hit = A.some(function (a) { return a[0] === i; }); W.push(hit ? v : v + (r() - 0.5) * 50); }
    var ST = [
      { at: 0, title: "The fall", text: "February 19, 2020: the S&P 500 closes at a record, about 3,386. Lockdowns spread. By March 23 it's about 2,237, down 34% in five weeks." },
      { at: 3.5, title: "Worst and best days, same month", text: "March 2020 had two of the S&P 500's ten worst days (March 12 and 16) and two of its eleven best (March 13 and 24), sometimes one day apart." },
      { at: 7, title: "A bottom nobody rang", text: "March 23 was the low. Headlines were still terrible, unemployment was still climbing (14.7% for April), and there was no end in sight." },
      { at: 10.5, title: "Waiting for good news", text: "On June 8 the official call came: the US had been in recession since February. The S&P 500 was already about 44% off its low." },
      { at: 14, title: "Back to the high", text: "August 18, 2020: a new record close, five months after the low. Anyone who sold in March and waited for things to feel safe missed most of it." }
    ];
    return {
      stages: ST, end: 18, size: sizeStd,
      frame: function (T, L) {
        var c = ctx(L, 46, 2000, 3900), s = "", n = c.n;
        s += hgrid(c.g.x0, c.g.x1, c.Y, 2000, 3800, 400, function (v) { return fmt(v); });
        s += title(c, "S&P 500, 2020 · weekly path, key closes from the public record", "S&P 500, 2020 · approximate");
        [[0, "Feb"], [6, "Apr"], [15, "Jun"], [24, "Aug"], [32, "Oct"], [41, "Dec"]].forEach(function (q) { s += txt(c.X(q[0]), c.g.y1 + 22, q[1], C.faint, 11, "middle"); });
        var cnt = track([[0, 0], [0.4, 0], [3.2, 5], [10.5, 5], [10.6, 5], [13, 16], [14, 16], [16.5, 45]], T);
        s += lvl(c, 3386, C.faint, null, fade(T, 0.3, 0.3), "4 4", false, 1.2);
        s += poly(series(W, c.X, c.Y, cnt), C.blue, 2.8);
        s += tag(c.X(0) + 8, c.Y(3386) - 16, n ? "Feb 19: 3,386" : "Feb 19 record: 3,386", C.ink, fade(T, 0.3, 0.3), "start");
        var o1 = fade(T, 3, 0.4);
        s += dot(c.X(5), c.Y(2237), 7, C.dn, o1);
        s += tag(c.X(5) + 12, c.Y(2237) + 4, "Mar 23: 2,237 · −34%", C.dn, o1, "start");
        var o2 = win(T, 3.7, 7);
        if (o2 > 0) {
          s += tag(c.X(3) - 6, c.Y(2481) - 36, "Mar 12 −9.5%", C.dn, o2 * fade(T, 3.8, 0.3), "end");
          s += tag(c.X(3) - 6, c.Y(2481) - 12, "Mar 13 +9.3%", C.up, o2 * fade(T, 4.3, 0.3), "end");
          s += tag(c.X(4) - 6, c.Y(2386) + 22, "Mar 16 −12%", C.dn, o2 * fade(T, 4.8, 0.3), "end");
          s += tag(c.X(6) + 8, c.Y(2541) - 18, "Mar 24 +9.4%", C.up, o2 * fade(T, 5.3, 0.3), "start");
        }
        var o3 = win(T, 7.2, 10.5);
        if (o3 > 0) {
          s += pill(c.X(5) + 12, c.Y(2237) + 34, n ? "news: still terrible" : "headlines: still terrible", C.orange, o3, "start");
          s += pill(c.X(11), c.Y(2930) + 60, "Apr jobless 14.7%", C.orange, fade(T, 8, 0.4) * o3, "middle");
        }
        var o4 = fade(T, 13, 0.4);
        if (o4 > 0) {
          s += line(c.X(16), c.g.y0, c.X(16), c.g.y1, C.gold, 1.4, "5 4", o4);
          s += tag(c.X(16) + 6, c.g.y1 - 14, n ? "Jun 8: recession!" : "Jun 8: \"it's a recession\"", C.gold, o4, "start");
          s += dot(c.X(16), c.Y(3232), 6, C.gold, o4);
          s += tag(c.X(16) - 8, c.Y(3232) - 18, "3,232 · +44% off the low", C.gold, o4, "end");
        }
        var o5 = fade(T, 15.6, 0.4);
        s += dot(c.X(26), c.Y(3390), 7, C.up, o5);
        s += tag(c.X(26), c.Y(3390) - 22, "Aug 18: new record", C.up, o5, "middle");
        s += notes(c, T, [
          [["Feb 19 to Mar 23", "3,386 to 2,237.", "Down 34% in five weeks."], C.dn, 0.3, 3.5],
          [["Same month", "Two of the 10 worst days,", "two of the 11 best."], C.orange, 3.7, 7],
          [["The low: Mar 23", "Headlines still awful.", "Jobless still climbing."], C.orange, 7.2, 10.5],
          [["The official call: Jun 8", "Already +44%", "off the low."], C.gold, 10.7, 14],
          [["Aug 18: a new high", "Five months", "after the bottom."], C.up, 14.2, null]
        ]);
        return s + stamp(L, "Key closes from the public record · weekly path approximate");
      }
    };
  }

  /* =====================================================================
     RECESSION · the official call comes late (NBER dates, public record)
     ===================================================================== */
  function lagSpec() {
    /* months counted from Jan 2007 (row 1) and Jan 2020 (row 2) */
    var R1 = { a: 0, b: 48, rec: [11, 29], call: [23, 44.6], low: 26.3, lab: ["2007", "2008", "2009", "2010"], callTxt: ["Dec 1, 2008", "Sep 20, 2010"], lowTxt: "Mar 9, 2009", len: "18 months" };
    var R2 = { a: 0, b: 21, rec: [1.6, 3.5], call: [5.25, 18.6], low: 2.75, lab: ["2020", "2021"], callTxt: ["Jun 8, 2020", "Jul 19, 2021"], lowTxt: "Mar 23, 2020", len: "2 months" };
    var ST = [
      { at: 0, title: "2008: it began in December 2007", text: "The Great Recession started in December 2007 and ended in June 2009: 18 months. In the US, the official call is made by the NBER, after the fact." },
      { at: 3.5, title: "Announced a year late", text: "The NBER said the recession had started on December 1, 2008, a full year in. The S&P 500 bottomed March 9, 2009, months before the recession ended." },
      { at: 7, title: "The end, announced in 2010", text: "The June 2009 end was announced September 20, 2010, over a year later. Investors waiting for that all-clear waited long after the market had turned." },
      { at: 10.5, title: "2020: two months", text: "The pandemic recession ran from February to April 2020. The market bottomed March 23. The NBER called the start on June 8, and the end on July 19, 2021." },
      { at: 14, title: "By the time you hear it", text: "When the word recession hits the news, the economy has usually been in one for a while, and the market has usually already moved. Bad news and a bad time to invest aren't the same thing." }
    ];
    function row(R, y0, y1, x0, x1, T, t0, n) {
      var s = "", X = function (m) { return x0 + (m - R.a) / (R.b - R.a) * (x1 - x0); }, ym = (y0 + y1) / 2;
      var span = R.lab.length, per = (R.b - R.a) / span;
      R.lab.forEach(function (l, k) {
        var xa = X(R.a + k * per);
        s += line(xa, y0, xa, y1, "#2c2c2e", 1);
        s += txt(xa + 6, y1 + 18, l, C.faint, 11, "start");
      });
      s += line(x0, ym, x1, ym, "#3a3a3c", 3);
      var o = fade(T, t0, 0.5), w = (X(R.rec[1]) - X(R.rec[0])) * ease(fade(T, t0, 1.2));
      s += rect(X(R.rec[0]), ym - 22, w, 44, C.dn, 6, 0.28 * o);
      s += tag(X(R.rec[0]), y0 + 2, "recession · " + R.len, C.dn, o, "start");
      var ol = fade(T, t0 + (R === R1 ? 3.6 : 1.2), 0.4);
      s += dot(X(R.low), ym, 7, C.up, ol);
      s += tag(X(R.low), ym + 40, "market low " + R.lowTxt, C.up, ol, n ? (R === R2 ? "start" : "middle") : "middle");
      var oc1 = fade(T, t0 + (R === R1 ? 3.6 : 1.8), 0.4), oc2 = fade(T, t0 + (R === R1 ? 7 : 2.4), 0.4);
      s += line(X(R.call[0]), ym - 30, X(R.call[0]), ym + 30, C.gold, 3, null, oc1);
      s += tag(X(R.call[0]), ym - 44, "start called " + R.callTxt[0], C.gold, oc1, R === R2 ? "start" : "middle");
      s += line(X(R.call[1]), ym - 30, X(R.call[1]), ym + 30, C.gold, 3, null, oc2);
      s += tag(X(R.call[1]), ym + (R === R1 ? -44 : 40), "end called " + R.callTxt[1], C.gold, oc2, "end");
      return s;
    }
    return {
      stages: ST, end: 17.5, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var x0 = n ? 22 : 46, x1 = n ? L.W - 22 : 760;
        var a = n ? [250, 420] : [70, 230], b = n ? [520, 690] : [300, 460];
        s += txt(x0, a[0] - 14, "The 2007–09 recession", C.faint, 12, "start", 600);
        s += row(R1, a[0], a[1], x0, x1, T, 0.3, n);
        var ob = fade(T, 10.3, 0.5);
        if (ob > 0) {
          s += '<g opacity="' + ob.toFixed(3) + '">' + txt(x0, b[0] - 14, "The 2020 recession", C.faint, 12, "start", 600) + "</g>";
          s += row(R2, b[0], b[1], x0, x1, T, 10.5, n);
        }
        var c = { n: n };
        s += notes(c, T, [
          [["Dec 2007 to Jun 2009", "18 months.", "Called by the NBER."], C.dn, 0.3, 3.5],
          [["Called Dec 1, 2008", "A year in. The market", "bottomed Mar 9, 2009."], C.gold, 3.7, 7],
          [["End called Sep 2010", "Over a year after", "it actually ended."], C.gold, 7.2, 10.5],
          [["2020: Feb to Apr", "Low Mar 23. Called", "Jun 8, 2020."], C.dn, 10.7, 14],
          [["By the time you hear it", "the economy is in one,", "and the market moved."], C.up, 14.2, null]
        ]);
        return s + stamp(L, "NBER dates and market lows from the public record");
      }
    };
  }

  /* =====================================================================
     ARBITRAGE · one asset, two prices, and the gap closing
     ===================================================================== */
  function gapSpec() {
    var N = 40;
    var ST = [
      { at: 0, title: "Same asset, two prices", text: "The same asset shows $100 on exchange A and $105 on exchange B, at the same moment. Different speeds, regions or a delay in the news can open a gap like this." },
      { at: 3.5, title: "Buy cheap, sell rich", text: "An arbitrage trader, most likely a computer, buys on A at $100 and sells on B at $105 at the same time: $5 a unit, if everything fills and you ignore fees." },
      { at: 7, title: "The trade closes the gap", text: "Buying on A pushes A's price up. Selling on B pushes B's down. The two prices move toward each other because of the arbitrage itself." },
      { at: 10.5, title: "Gone in milliseconds", text: "In liquid markets the gap is usually gone in milliseconds, before a person could see it on two screens. That's why arbitrage keeps prices in line across markets." }
    ];
    function pathA(i) { return i < 12 ? 100 : i < 26 ? lerp(100, 102.4, ease((i - 12) / 14)) : 102.4 + Math.sin(i * 1.7) * 0.05; }
    function pathB(i) { return i < 12 ? 105 : i < 26 ? lerp(105, 102.6, ease((i - 12) / 14)) : 102.6 + Math.sin(i * 1.3) * 0.05; }
    var A = [], B = [];
    for (var i = 0; i < N; i++) { A.push(pathA(i)); B.push(pathB(i)); }
    return {
      stages: ST, end: 14.5, size: sizeStd,
      frame: function (T, L) {
        var c = ctx(L, N, 98, 107), s = "", n = c.n;
        s += hgrid(c.g.x0, c.g.x1, c.Y, 98, 107, 1, function (v) { return "$" + fmt(v); });
        s += title(c, "One asset on two exchanges · made-up prices", "Two exchanges · made up");
        s += txt(c.g.x0, c.g.y1 + 22, "time →", C.faint, 11, "start");
        var cnt = track([[0, 0], [0.4, 0], [3, 11], [7, 11], [10.2, 26], [10.5, 26], [13.5, N - 1]], T);
        s += poly(series(A, c.X, c.Y, cnt), C.up, 3);
        s += poly(series(B, c.X, c.Y, cnt), C.orange, 3);
        var o0 = fade(T, 0.5, 0.4);
        s += tag(c.X(0) + 4, c.Y(100) + 20, "exchange A $100", C.up, o0 * (1 - fade(T, 7, 0.3)), "start");
        s += tag(c.X(0) + 4, c.Y(105) - 20, "exchange B $105", C.orange, o0 * (1 - fade(T, 7, 0.3)), "start");
        var o1 = win(T, 3.7, 10.5);
        if (o1 > 0) {
          s += line(c.X(11), c.Y(100), c.X(11), c.Y(105), C.gold, 3, null, o1);
          s += tag(c.X(11) + 10, c.Y(102.5), n ? "+$5 a unit" : "buy A, sell B: +$5 a unit", C.gold, o1, "start");
        }
        var o2 = fade(T, 7.2, 0.4);
        if (o2 > 0) {
          [13, 15, 17, 19, 21, 23].forEach(function (k, j) {
            var oo = o2 * fade(T, 7.3 + j * 0.45, 0.3) * (1 - fade(T, 13, 0.4));
            s += dot(c.X(k), c.Y(A[k]) + 14, 5, C.up, oo);
            s += dot(c.X(k), c.Y(B[k]) - 14, 5, C.orange, oo);
          });
          s += tag(c.X(19), c.Y(A[19]) + 34, "buying lifts A", C.up, o2 * (1 - fade(T, 13, 0.4)), "middle");
          s += tag(c.X(19), c.Y(B[19]) - 34, "selling sinks B", C.orange, o2 * (1 - fade(T, 13, 0.4)), "middle");
        }
        var o3 = fade(T, 12.8, 0.4);
        s += tag(c.X(N - 1) - 6, c.Y(102.5) - 22, "gap closed", C.ink, o3, "end");
        s += notes(c, T, [
          [["Spatial arbitrage", "Same asset, different", "places, different prices."], C.ink, 0.3, 3.5],
          [["Buy $100, sell $105", "At the same moment.", "+$5 a unit before fees."], C.gold, 3.7, 7],
          [["The trade moves prices", "Buying lifts the cheap side.", "Selling sinks the rich side."], C.up, 7.2, 10.5],
          [["Milliseconds", "The gap closes before", "most people see it."], C.ink, 10.7, null]
        ]);
        return s + stamp(L, "Illustrative · the video's $100 and $105");
      }
    };
  }

  /* =====================================================================
     ARBITRAGE · the triangle: dollars to euros to yen to dollars
     ===================================================================== */
  var TRI = { ue: 0.92, ej: 162.2, ju: 149.0, fee: 0.0005 };
  function triSpec() {
    var u0 = 10000, e1 = u0 * TRI.ue, j2 = e1 * TRI.ej, u3 = j2 / TRI.ju;
    var f = 1 - TRI.fee, u3f = u0 * TRI.ue * f * TRI.ej * f / TRI.ju * f;
    var ST = [
      { at: 0, title: "Start with dollars", text: "Made-up rates. Triangular arbitrage happens in currency markets: start with $10,000 and go around three exchange rates." },
      { at: 3, title: "Dollars to euros", text: "At 0.92 euros per dollar, $10,000 becomes €9,200." },
      { at: 5.5, title: "Euros to yen", text: "At 162.2 yen per euro, €9,200 becomes ¥1,492,240." },
      { at: 8, title: "Yen back to dollars", text: "At 149.0 yen per dollar, ¥1,492,240 becomes $10,015. The three rates don't quite line up, so the loop pays $15." },
      { at: 11, title: "Then the fees", text: "Pay a made-up 0.05% on each of the three trades and the $15 is gone. Real gaps are tiny and short, so only the fastest, cheapest traders keep anything." }
    ];
    return {
      stages: ST, end: 15, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var cx = n ? 220 : 400, cy = n ? 480 : 290, R = n ? 150 : 190;
        var P = [[cx, cy - R], [cx + R * 0.95, cy + R * 0.62], [cx - R * 0.95, cy + R * 0.62]];
        var LBL = [["$", "dollars", C.up], ["€", "euros", C.blue], ["¥", "yen", C.orange]];
        var VAL = ["$" + fmt(u0), "€" + fmt(e1), "¥" + fmt(j2)];
        var RATE = ["× 0.92", "× 162.2", "÷ 149.0"];
        var leg = T < 3 ? -1 : T < 5.5 ? 0 : T < 8 ? 1 : T < 11 ? 2 : 3;
        for (var k = 0; k < 3; k++) {
          var a = P[k], b = P[(k + 1) % 3], on = leg >= k ? 1 : 0.35;
          var sx = lerp(a[0], b[0], 0.2), sy = lerp(a[1], b[1], 0.2), ex = lerp(a[0], b[0], 0.8), ey = lerp(a[1], b[1], 0.8);
          s += arrow(sx, sy, ex, ey, leg === k ? C.gold : "#48484a", 1, null) ;
          var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ox = (mx - cx) * 0.28, oy = (my - cy) * 0.28;
          s += tag(mx + ox, my + oy, RATE[k], leg === k ? C.gold : C.dim, on, "middle");
        }
        P.forEach(function (p, k) {
          var hot = (leg === -1 && k === 0) || (leg >= 0 && leg < 3 && k === (leg + 1) % 3) || (leg === 3 && k === 0);
          s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (n ? 40 : 46) + '" fill="#2c2c2e" stroke="' + (hot ? LBL[k][2] : "#48484a") + '" stroke-width="' + (hot ? 3 : 1.5) + '"/>';
          s += txt(p[0], p[1] + 9, LBL[k][0], LBL[k][2], 28, "middle", 800);
          s += txt(p[0], p[1] + (k === 0 ? -(n ? 52 : 58) : (n ? 64 : 72)), LBL[k][1], C.faint, 12, "middle", 600);
        });
        /* the moving token */
        if (leg >= 0 && leg < 3) {
          var t0 = [3, 5.5, 8][leg], m = ease(fade(T, t0, 1.6)), a2 = P[leg], b2 = P[(leg + 1) % 3];
          s += dot(lerp(a2[0], b2[0], m), lerp(a2[1], b2[1], m), 9, C.gold, 1);
        }
        /* running total */
        var tot = leg < 0 ? VAL[0] : leg === 0 ? VAL[1] : leg === 1 ? VAL[2] : leg === 2 ? "$" + fmt(u3) : "$" + fmt(u3f);
        var tx = n ? 220 : 400, ty = n ? 250 : 40;
        s += txt(tx, n ? ty : cy + 10, tot, leg === 2 ? C.up : leg === 3 ? C.dn : C.ink, n ? 26 : 30, "middle", 800);
        if (leg === 2) s += txt(tx, (n ? ty : cy + 10) + 26 * FS, "+$" + fmt(u3 - u0) + " before fees", C.up, 13, "middle", 600);
        if (leg === 3) s += txt(tx, (n ? ty : cy + 10) + 26 * FS, "after 3 × 0.05% fees: " + (u3f - u0 >= 0 ? "+$" : "−$") + fmt(Math.abs(u3f - u0), 2), C.dn, 13, "middle", 600);
        s += notes({ n: n }, T, [
          [["Start: $10,000", "Three trades,", "back to dollars."], C.up, 0.3, 3],
          [["$ → €", "$10,000 × 0.92", "= €9,200."], C.blue, 3.2, 5.5],
          [["€ → ¥", "€9,200 × 162.2", "= ¥1,492,240."], C.orange, 5.7, 8],
          [["¥ → $", "¥1,492,240 ÷ 149.0", "= $10,015. +$15."], C.up, 8.2, 11],
          [["Fees eat it", "0.05% × 3 trades", "and the $15 is gone."], C.dn, 11.2, null]
        ]);
        return s + stamp(L, "Illustrative · made-up exchange rates and fees");
      }
    };
  }

  /* =====================================================================
     ANALYSIS · reading a chart: trend, support and resistance, breakouts
     ===================================================================== */
  function chartSpec() {
    var CL = [50, 51.2, 50.6, 52, 53.1, 52.2, 53.6, 54.8, 53.9, 55.2, 56.4, 55.3, 56.9, 58.1, 57.2, 58.8, 60.2, 59.4,
              61.2, 59.8, 58.6, 59.9, 61.3, 60.1, 58.9, 61.6, 59.4, 60.6, 61.4, 60.2, 63.6, 64.9, 64.2, 65.8];
    var r = rng(19), B = [], prev = 49.6;
    CL.forEach(function (c, i) {
      var o = prev, b = { o: o, h: Math.max(o, c) + 0.2 + r() * 0.5, l: Math.min(o, c) - 0.2 - r() * 0.5, c: c };
      if (i >= 18 && i <= 29) { b.h = Math.min(b.h, 62); b.l = Math.max(b.l, 58); }
      B.push(b); prev = c;
    });
    B[25].h = 62.9; B[25].c = 61.6; B[25].o = 59.6; /* the fakeout: pokes over, closes back in */
    B[26].o = 61.6; B[26].c = 59.4;
    B[30].o = 60.3; B[30].h = 63.9;
    var VOL = CL.map(function (c, i) { return i === 30 ? 1 : i === 25 ? 0.42 : i < 18 ? 0.35 + r() * 0.2 : i < 30 ? 0.22 + r() * 0.15 : 0.55 + r() * 0.2; });
    var N = CL.length;
    var ST = [
      { at: 0, title: "Price and volume", text: "Made-up bars. Technical analysis starts with price, what moves up and down on the chart, and volume, how many shares traded: the energy behind a move." },
      { at: 3.5, title: "An uptrend", text: "New highs, and pullbacks that don't fall as far as before: higher highs and higher lows. A downtrend is the opposite." },
      { at: 7, title: "Support and resistance", text: "Price stalls in a range. Resistance is the ceiling where sellers keep showing up. Support is the floor where buyers keep stepping in." },
      { at: 10.5, title: "A fakeout", text: "Price pokes over resistance on light volume, then snaps right back inside. Traders who jumped in early are trapped." },
      { at: 14, title: "The breakout", text: "This time price closes above resistance on the biggest volume in weeks and keeps going. A break can signal a new leg, but not every break is real." }
    ];
    return {
      stages: ST, end: 18, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, gp = n ? { x0: 14, x1: L.W - 62, y0: 226, y1: 600 } : { x0: 46, x1: 750, y0: 60, y1: 400 };
        var c = ctx(L, N, 48, 67.5, gp), s = "";
        var vy0 = gp.y1 + 30, vy1 = L.H - 40;
        s += hgrid(gp.x0, gp.x1, c.Y, 50, 66, 4, function (v) { return "$" + fmt(v); });
        s += title(c, "Made-up daily bars, with volume underneath", "Made-up daily bars");
        var cnt = track([[0, 0], [0.4, 0], [3.2, 18], [7, 18], [9.8, 25], [10.5, 25], [11.6, 27], [14, 30], [15.6, N]], T);
        var full = Math.floor(cnt);
        for (var i = 0; i < N && i < Math.ceil(cnt); i++) {
          var p = i < full ? 1 : cnt - full; if (p <= 0) continue;
          var b = B[i];
          s += candle(c.X(i), c.Y, [b.o, b.h, b.l, b.c], p, c.bw);
          var vh = (vy1 - vy0) * VOL[i] * Math.min(1, p * 1.5);
          s += rect(c.X(i) - c.bw / 2, vy1 - vh, c.bw, vh, i === 30 ? C.up : i === 25 ? C.orange : "#48484a", 2, 0.9);
        }
        s += txt(gp.x0, vy0 - 6, "volume", C.faint, 11, "start");
        var ou = win(T, 3.7, 7.2);
        if (ou > 0) {
          [[4, 53.1, "HH"], [7, 54.8, "HH"], [10, 56.4, "HH"], [13, 58.1, "HH"], [16, 60.2, "HH"]].forEach(function (q) { s += tag(c.X(q[0]), c.Y(B[q[0]].h) - 14, q[2], C.up, ou, "middle"); });
          [[5, "HL"], [8, "HL"], [11, "HL"], [14, "HL"]].forEach(function (q) { s += tag(c.X(q[0]), c.Y(B[q[0]].l) + 16, q[1], C.blue, ou, "middle"); });
        }
        var os = fade(T, 7.2, 0.5);
        if (os > 0) {
          var x18 = c.X(17.5);
          s += line(x18, c.Y(62), gp.x1, c.Y(62), C.dn, 2, "7 4", os);
          s += line(x18, c.Y(58), gp.x1, c.Y(58), C.up, 2, "7 4", os);
          s += tag(gp.x1 - 2, c.Y(62) + (n ? 15 : -13), "resistance $62", C.dn, os, "end");
          s += tag(gp.x1 - 2, c.Y(58) + 15, "support $58", C.up, os, "end");
        }
        var of = fade(T, 10.7, 0.4);
        if (of > 0 && cnt > 25) {
          s += dot(c.X(25), c.Y(62.9), 11, C.orange, of, true);
          s += tag(c.X(25) - 16, c.Y(63.6) - 14, n ? "fakeout" : "fakeout: back inside", C.orange, of, "end");
        }
        var ob = fade(T, 14.6, 0.4);
        if (ob > 0) {
          s += dot(c.X(30), c.Y(63.6), 11, C.up, ob, true);
          s += tag(c.X(30) - 16, c.Y(64.6) - 16, n ? "breakout" : "breakout on volume", C.up, ob, "end");
        }
        s += notes(c, T, [
          [["Price and volume", "What moved, and how", "much energy was behind it."], C.ink, 0.3, 3.5],
          [["Uptrend", "Higher highs,", "higher lows."], C.up, 3.7, 7],
          [["Support and resistance", "A floor where buyers step in,", "a ceiling where sellers do."], C.blue, 7.2, 10.5],
          [["Fakeout", "Over resistance, light volume,", "back inside: a trap."], C.orange, 10.7, 14],
          [["Breakout", "Closes above, heavy volume,", "and keeps going."], C.up, 14.2, null]
        ]);
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
  }

  /* =====================================================================
     EPS · the cake: earnings cut into one slice per share
     ===================================================================== */
  function wedge(cx, cy, r, a0, a1, col, op) {
    var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return '<path d="M' + cx.toFixed(1) + "," + cy.toFixed(1) + " L" + x0.toFixed(1) + "," + y0.toFixed(1) + " A" + r + "," + r + " 0 " + (a1 - a0 > Math.PI ? 1 : 0) + " 1 " + x1.toFixed(1) + "," + y1.toFixed(1) +
      'Z" fill="' + col + '" stroke="#1d1d1f" stroke-width="3"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function cakeSpec() {
    var ST = [
      { at: 0, title: "The formula", text: "Earnings per share is net income, minus any preferred dividends, divided by the common shares outstanding. Company A: ($5,000,000 − $200,000) ÷ 1,000,000 shares = $4.80." },
      { at: 3.5, title: "Company A vs Company B", text: "Company B earns more, $8,000,000, but pays $300,000 in preferred dividends and has 2,000,000 shares: $3.85 a share. A earns more for each share." },
      { at: 7, title: "More slices: dilution", text: "Made-up numbers. If A issues 250,000 new shares to raise cash, the same $4.8 million is cut into 1,250,000 slices: EPS falls to $3.84. Each slice got smaller." },
      { at: 10.5, title: "Fewer slices: a buyback", text: "If A instead buys back 200,000 of its shares, the $4.8 million is cut into 800,000 slices: EPS rises to $6.00, with no change in profit at all." },
      { at: 14, title: "Into the P/E", text: "EPS is the bottom of the price-to-earnings ratio. At a made-up $96 share price, A's P/E is 96 ÷ 4.80 = 20." }
    ];
    var EARN = 4800000;
    return {
      stages: ST, end: 17.5, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var cx = n ? 220 : 330, cy = n ? 420 : 300, R = n ? 130 : 170;
        var sh = T < 7 ? 1000000 : T < 10.5 ? lerp(1000000, 1250000, ease(fade(T, 7.4, 1))) : T < 14 ? lerp(1250000, 800000, ease(fade(T, 10.8, 1))) : 800000;
        var slices = sh / 125000, showB = win(T, 3.5, 7);
        /* company A cake */
        var ca = 1 - showB * 0.65;
        var nS = Math.max(1, slices), whole = Math.floor(nS), part = nS - whole, step = Math.PI * 2 / nS, a = -Math.PI / 2;
        for (var k = 0; k < Math.ceil(nS); k++) {
          var span = k < whole ? step : step * part; if (span <= 0.001) continue;
          s += wedge(cx, cy, R, a, a + span, k % 2 ? "#c9a227" : C.gold, ca);
          a += span;
        }
        var eps = EARN / sh;
        s += txt(cx, cy - R - (n ? 54 : 44), n ? "Company A" : "Company A · $4.8M for common shares", C.dim, 14, "middle", 600);
        s += txt(cx, cy - R - (n ? 30 : 18), fmt(sh) + " shares", C.faint, 12, "middle", 600);
        s += txt(cx, cy + R + 44, "EPS $" + fmt(eps, 2), T >= 7 && T < 10.5 ? C.dn : T >= 10.5 && T < 14 ? C.up : C.ink, 26, "middle", 800);
        /* the formula */
        var of = win(T, 0.3, 3.5);
        var fy = n ? 170 : 300;
        s += txt(n ? 220 : 680, fy, "($5,000,000 − $200,000) ÷ 1,000,000", C.dim, n ? 14 : 18, "middle", 600, of);
        if (!n) s += txt(680, fy + 34, "= $4.80 per share", C.gold, 18, "middle", 700, of);
        /* company B */
        if (showB > 0) {
          var bx = n ? 220 : 640, by = n ? 640 : 300, rb = n ? 0 : 150;
          if (!n) {
            for (var j = 0; j < 16; j++) s += wedge(bx, by, rb, -Math.PI / 2 + j * Math.PI / 8, -Math.PI / 2 + (j + 1) * Math.PI / 8, j % 2 ? "#1f6fbf" : C.blue, showB);
            s += txt(bx, by - rb - 44, "Company B · $7.7M for common shares", C.dim, 14, "middle", 600, showB);
            s += txt(bx, by - rb - 18, "2,000,000 shares", C.faint, 12, "middle", 600, showB);
            s += txt(bx, by + rb + 44, "EPS $3.85", C.blue, 26, "middle", 800, showB);
          } else {
            s += txt(bx, by + 40, "Company B: $7.7M ÷ 2,000,000", C.blue, 14, "middle", 700, showB);
            s += txt(bx, by + 70, "EPS $3.85", C.blue, 24, "middle", 800, showB);
          }
        }
        var op = fade(T, 14.2, 0.4);
        if (op > 0) {
          var px = n ? 220 : 700, py = n ? 680 : 280;
          s += txt(px, py, "P/E = $96 ÷ $4.80 = 20", C.up, n ? 20 : 26, "middle", 800, op);
          s += txt(px, py + 30 * FS, "$20 paid for each $1 of yearly earnings", C.dim, 13, "middle", 600, op);
        }
        s += notes({ n: n }, T, [
          [["EPS", "(Net income − preferred", "dividends) ÷ shares."], C.gold, 0.3, 3.5],
          [["A: $4.80, B: $3.85", "B earns more in total,", "A earns more per share."], C.blue, 3.7, 7],
          [["Dilution", "250,000 new shares:", "EPS $4.80 → $3.84."], C.dn, 7.2, 10.5],
          [["Buyback", "200,000 shares retired:", "EPS $4.80 → $6.00."], C.up, 10.7, 14],
          [["P/E = price ÷ EPS", "$96 ÷ $4.80 = 20.", "Price made up."], C.up, 14.2, null]
        ]);
        return s + stamp(L, "Illustrative · the video's A and B; dilution, buyback and price made up");
      }
    };
  }

  /* =====================================================================
     P/E · what it says, and trailing vs forward
     ===================================================================== */
  function peSpec() {
    var ST = [
      { at: 0, title: "Price ÷ EPS", text: "A stock at $100 with $10 of earnings per share has a P/E of 10: investors pay $10 for every $1 the company earns a year. If earnings held steady, about 10 years to earn back the price." },
      { at: 3.5, title: "Compare inside the industry", text: "Two consumer goods companies, both earning $5 a share. FreshBite at $50 has a P/E of 10, Tasty Treats at $75 has 15. Against an industry average of 12, FreshBite looks cheap, Tasty Treats pricey unless its growth is real." },
      { at: 7.5, title: "Trailing P/E", text: "BrightTech makes solar panels. The stock is $100 and last year's EPS was $5: a trailing P/E of 20, built on real results." },
      { at: 10.5, title: "Forward P/E", text: "Analysts expect EPS of $10 next year: a forward P/E of 10. Lower than trailing means growth is expected. But it's an estimate." },
      { at: 13.5, title: "If the estimate drops", text: "If the forecast were $4 instead, the forward P/E would be 25, higher than trailing: earnings are expected to shrink." }
    ];
    return {
      stages: ST, end: 17, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var x0 = n ? 22 : 220, x1 = n ? L.W - 40 : 740, MAX = 30;
        function X(v) { return x0 + v / MAX * (x1 - x0); }
        var y0 = n ? 250 : 80, rowH = n ? 92 : 78;
        for (var v = 0; v <= MAX; v += 5) {
          s += line(X(v), y0 - 20, X(v), y0 + rowH * 4.6, "#2c2c2e", 1);
          s += txt(X(v), y0 + rowH * 4.6 + 18, String(v), C.faint, 11, "middle");
        }
        s += txt(x0, y0 - 30, "P/E ratio", C.faint, 12, "start", 600);
        var rows = [], phase = T < 3.5 ? 0 : T < 7.5 ? 1 : 2;
        if (phase === 0) rows = [["$100 ÷ $10", 10, C.gold, "10 years to earn it back"]];
        else if (phase === 1) rows = [["FreshBite · $50 ÷ $5", 10, C.up, "below average"], ["Tasty Treats · $75 ÷ $5", 15, C.orange, "above average"]];
        else {
          var fwd = T < 13.5 ? lerp(20, 10, ease(fade(T, 10.7, 1))) : lerp(10, 25, ease(fade(T, 13.7, 1)));
          rows = [["BrightTech trailing · $100 ÷ $5", 20, C.blue, "real results"]];
          if (T >= 10.5) rows.push(["BrightTech forward · $100 ÷ $" + (T < 13.5 ? "10" : "4"), fwd, T < 13.5 ? C.up : C.dn, T < 13.5 ? "growth expected" : "decline expected"]);
        }
        var t0 = phase === 0 ? 0.3 : phase === 1 ? 3.7 : 7.7;
        rows.forEach(function (rw, k) {
          var y = y0 + k * rowH * 1.25, o = fade(T, t0 + k * 0.6, 0.4), g = ease(fade(T, t0 + k * 0.6, 1.1));
          s += txt(x0, y + 4, rw[0], C.dim, 13, "start", 600, o);
          s += rect(x0, y + 14, (X(rw[1]) - x0) * g, 30, rw[2], 6, 0.85 * o);
          var inb = n && phase === 1 && rw[1] < 12;
          s += txt(inb ? X(rw[1]) - 8 : X(rw[1]) + 8, y + 35, fmt(rw[1], rw[1] % 1 ? 1 : 0), inb ? "#111" : rw[2], 18, inb ? "end" : "start", 800, o * g);
          s += txt(x0, y + 66, rw[3], C.faint, 12, "start", 500, o * g);
        });
        if (phase === 1) {
          var oa = fade(T, 4.8, 0.4);
          s += line(X(12), y0 - 16, X(12), y0 + rowH * 2.6, C.ink, 2, "6 4", oa);
          s += tag(X(12), y0 + rowH * 2.75, "industry average 12", C.ink, oa, "middle");
        }
        s += notes({ n: n }, T, [
          [["P/E = price ÷ EPS", "$100 ÷ $10 = 10:", "$10 per $1 of earnings."], C.gold, 0.3, 3.5],
          [["Same industry", "10 vs 15, average 12.", "Context is everything."], C.ink, 3.7, 7.5],
          [["Trailing: 20", "Last 12 months.", "Real data."], C.blue, 7.7, 10.5],
          [["Forward: 10", "Next year's estimate.", "Growth expected."], C.up, 10.7, 13.5],
          [["Forward: 25", "Lower estimate:", "decline expected."], C.dn, 13.7, null]
        ]);
        return s + stamp(L, "Illustrative · the video's fictional companies");
      }
    };
  }

  var SPECS = { fees: feesSpec, lev: levSpec, call: callSpec, decay: decaySpec, crash: crashSpec, lag: lagSpec, gap: gapSpec, tri: triSpec, chart: chartSpec, cake: cakeSpec, pe: peSpec };
  document.querySelectorAll("[data-bx-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-bx-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     Calculators
     ===================================================================== */
  function num(root, n) { var el = root.querySelector("[name=" + n + "]"); return el ? parseFloat(el.value) : NaN; }
  function sel(root, n) { var el = root.querySelector("[name=" + n + "]"); return el ? el.value : ""; }
  function cells(list) { return '<div class="calc-out">' + list.map(function (q) { return "<div><span>" + q[0] + "</span><b" + (q[2] ? ' class="' + q[2] + '"' : "") + ">" + q[1] + "</b></div>"; }).join("") + "</div>"; }
  var CALCS = {
    /* what a yearly fee costs */
    fee: function (root, out) {
      var p = num(root, "amt"), y = Math.round(num(root, "yrs")), r = num(root, "ret") / 100, fa = num(root, "fa") / 100, fb = num(root, "fb") / 100;
      if (![p, y, r, fa, fb].every(isFinite) || p <= 0 || y <= 0 || y > 80) { out.innerHTML = '<p class="calc-note">Fill in every box (up to 80 years).</p>'; return; }
      var A = grow(p, r, fa, y), B = grow(p, r, fb, y), gap = Math.abs(A - B);
      out.innerHTML = cells([["Fund A ends at", usd(A)], ["Fund B ends at", usd(B)], ["Difference", usd(gap), "neg"], ["Fees cost you", fmt(gap / Math.max(A, B) * 100, 1) + "%"]]) +
        '<p class="calc-note">Same ' + usd(p) + ", same " + fmt(r * 100, 1) + "% a year before fees, " + y + " years. The only thing that changed is the yearly fee: " + fmt(fa * 100, 2) + "% vs " + fmt(fb * 100, 2) + "%.</p>";
    },
    /* an option at expiration */
    opt: function (root, out) {
      var type = sel(root, "type"), side = sel(root, "side"), k = num(root, "k"), pr = num(root, "pr"), q = Math.max(1, Math.round(num(root, "q") || 1)), px = num(root, "px");
      if (![k, pr, px].every(isFinite) || k <= 0 || pr < 0 || px < 0) { out.innerHTML = '<p class="calc-note">Fill in the strike, the premium and a price at expiration.</p>'; return; }
      var m = 100 * q, intr = type === "call" ? Math.max(0, px - k) : Math.max(0, k - px), buy = (intr - pr) * m, pl = side === "buy" ? buy : -buy;
      var be = type === "call" ? k + pr : k - pr, prem = pr * m;
      var maxG = side === "buy" ? (type === "call" ? "No ceiling" : usd((k - pr) * m)) : usd(prem);
      var maxL = side === "buy" ? usd(prem) : (type === "call" ? "No ceiling" : usd((k - pr) * m));
      var itm = intr > 0 ? "in the money" : px === k ? "at the money" : "out of the money";
      out.innerHTML = cells([["Break-even", "$" + fmt(be, 2)], ["Most you can make", maxG, "pos"], ["Most you can lose", maxL, "neg"], ["P&L at $" + fmt(px, 2), (pl >= 0 ? "+" : "") + usd(pl), pl >= 0 ? "pos" : "neg"]]) +
        '<p class="calc-note">' + (side === "buy" ? "Buying" : "Selling") + " " + q + " " + type + (q > 1 ? "s" : "") + " (" + fmt(m) + " shares) at a $" + fmt(pr, 2) + " premium: " + (side === "buy" ? "you pay " : "you collect ") + usd(prem) + ". At $" + fmt(px, 2) + " the option is " + itm + ", worth " + usd(intr * m) + " at expiration." +
        (side === "sell" ? " Sellers can be assigned early on American-style options." : "") + "</p>";
    },
    /* a recession plan, written before the panic */
    plan: function (root, out) {
      var ex = num(root, "ex"), mo = num(root, "mo"), ct = num(root, "ct"), dd = num(root, "dd"), xt = num(root, "xt"), rb = num(root, "rb");
      if (![ex, mo, ct, dd, xt, rb].every(isFinite) || ex < 0 || mo < 0) { out.innerHTML = '<p class="calc-note">Fill in every box.</p>'; return; }
      var fund = ex * mo;
      out.innerHTML = cells([["Emergency fund", usd(fund)], ["Monthly investing", usd(ct)], ["If it drops " + fmt(dd) + "%", usd(ct + xt) + "/mo"], ["Rebalance band", "±" + fmt(rb) + "%"]]) +
        '<pre class="plan">MY RECESSION PLAN (decided ' + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ")\n" +
        "1. Cash first: " + fmt(mo) + " months of expenses = " + usd(fund) + " set aside, not invested.\n" +
        "2. I keep investing " + usd(ct) + " a month, no matter the headlines.\n" +
        "3. If the market falls " + fmt(dd) + "% or more from its high, I add " + usd(xt) + " a month" + (xt > 0 ? "" : " (nothing extra)") + ".\n" +
        "4. I rebalance only when my mix drifts more than " + fmt(rb) + " points from target.\n" +
        "5. I don't sell because of a headline. I follow this list.</pre>";
    },
    /* does the gap survive the fees? */
    arb: function (root, out) {
      var a = num(root, "pa"), b = num(root, "pb"), fee = num(root, "fee") / 100, want = num(root, "want"), avail = num(root, "avail");
      if (![a, b, fee, want, avail].every(isFinite) || a <= 0 || b <= 0 || want <= 0) { out.innerHTML = '<p class="calc-note">Fill in every box.</p>'; return; }
      var lo = Math.min(a, b), hi = Math.max(a, b), units = Math.min(want, Math.max(0, avail)) / lo;
      var gross = (hi - lo) * units, fees = (lo + hi) * units * fee, net = gross - fees, gp = (hi - lo) / lo * 100;
      out.innerHTML = cells([["The gap", fmt(gp, 2) + "%"], ["Fills at the good price", usd(units * lo)], ["Fees, both sides", usd(fees)], ["Left over", (net >= 0 ? "+" : "") + usd(net), net >= 0 ? "pos" : "neg"]]) +
        '<p class="calc-note">' + (avail < want ? "Only " + usd(avail) + " is available at the good price, not the " + usd(want) + " you wanted. " : "") +
        "That's before the price moves while your order fills, and before any transfer delay." + (net < 0 ? " Here the fees eat the whole gap." : "") + "</p>";
    },
    /* EPS and P/E */
    eps: function (root, out) {
      var ni = num(root, "ni"), pd = num(root, "pd"), sh = num(root, "sh"), px = num(root, "px"), ind = num(root, "ind");
      if (![ni, pd, sh, px].every(isFinite) || sh <= 0) { out.innerHTML = '<p class="calc-note">Fill in net income, preferred dividends, shares and price.</p>'; return; }
      var eps = (ni - pd) / sh, pe = eps > 0 ? px / eps : null;
      var vs = pe == null || !isFinite(ind) || ind <= 0 ? "" : pe < ind ? "below" : pe > ind ? "above" : "at";
      out.innerHTML = cells([["EPS", (eps < 0 ? "−$" : "$") + fmt(Math.abs(eps), 2), eps < 0 ? "neg" : ""], ["P/E", pe == null ? "n/a" : fmt(pe, 1)], ["Years to earn back", pe == null ? "n/a" : fmt(pe, 1)], ["Vs industry", vs ? vs + " " + fmt(ind, 0) : "n/a"]]) +
        '<p class="calc-note">' + (pe == null ? "Negative or zero earnings: the P/E isn't meaningful. Look at revenue growth, cash flow and debt instead." :
          "Investors pay $" + fmt(pe, 2) + " for each $1 of yearly earnings." + (vs === "below" ? " Below the industry average: possibly cheap, or the market sees a problem." : vs === "above" ? " Above the industry average: growth is expected, or it may be overvalued." : "")) + "</p>";
    }
  };
  document.querySelectorAll("[data-bx-calc]").forEach(function (root) {
    var f = CALCS[root.getAttribute("data-bx-calc")], out = root.querySelector("[data-calc-out]");
    if (!f || !out) return;
    function run() { f(root, out); }
    root.querySelectorAll("[data-preset]").forEach(function (b) {
      b.addEventListener("click", function () {
        var vals = JSON.parse(b.getAttribute("data-preset"));
        Object.keys(vals).forEach(function (k) { var el = root.querySelector("[name=" + k + "]"); if (el) el.value = vals[k]; });
        root.querySelectorAll("[data-preset]").forEach(function (x) { x.classList.toggle("is-on", x === b); });
        run();
      });
    });
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    run();
  });

  /* ---------- pick a card, read the answer ---------- */
  document.querySelectorAll("[data-bx-pick]").forEach(function (root) {
    var out = root.querySelector("[data-pick-out]");
    root.addEventListener("click", function (e) {
      var b = e.target.closest(".pick"); if (!b) return;
      root.querySelectorAll(".pick").forEach(function (x) { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      var t = root.querySelector("template[data-for=" + b.getAttribute("data-k") + "]");
      out.innerHTML = t ? t.innerHTML : "";
    });
  });

  /* =====================================================================
     Five-step lists as click-through steppers. Each set gives the tab
     names, colors and a small figure per step. Without the script the
     steps show as cards.
     ===================================================================== */
  var STEPSETS = {
    funds: { label: "Before you buy any fund", info: [
      { k: "Package", c: C.blue, tag: "How do you buy it?", fig: { rows: [["Mutual fund", "once a day, at NAV"], ["ETF", "all day, on the exchange"], ["Closed-end", "may trade above or below value"]] } },
      { k: "Who picks", c: C.purple, tag: "Who decides what it buys?", fig: { rows: [["Index", "copies a list, like the S&P 500"], ["Active", "a manager tries to beat it"], ["In a typical year", "about 2 in 3 active large-cap funds trail"]] } },
      { k: "Inside", c: C.gold, tag: "What does it hold?", fig: { bars: [["Money market", 1, C.up], ["Bonds", 2, C.cyan], ["Dividend stocks", 3, C.blue], ["Sector / theme", 4, C.orange], ["Leveraged ETF", 5, C.dn]], cap: "calm → nervous" } },
      { k: "Fee", c: C.dn, tag: "The expense ratio", fig: { big: "0.05% vs 1%", sub: "about $18,000 apart after 30 years", col: C.dn } },
      { k: "Check", c: C.up, tag: "Read the fund page", fig: { rows: [["Expense ratio", "what it costs each year"], ["Top holdings", "what's really inside"], ["Goal", "follow an index, or beat one?"]] } }
    ] },
    options: { label: "Before your first option trade", info: [
      { k: "Break-even", c: C.gold, tag: "Strike plus (or minus) premium", fig: { big: "$102", sub: "$100 strike + $2 premium (call)", col: C.gold } },
      { k: "Max loss", c: C.dn, tag: "Know it in dollars", fig: { rows: [["Buy a call or put", "the premium you paid"], ["Sell a call", "no ceiling"], ["Sell a put", "down to the stock at $0"]] } },
      { k: "Time", c: C.orange, tag: "The clock runs against buyers", fig: { big: "Every day", sub: "time value shrinks, fastest near expiry", col: C.orange } },
      { k: "Volatility", c: C.purple, tag: "Fear is in the price", fig: { big: "$200 → $80", sub: "after earnings, with the stock barely moving", col: C.purple } },
      { k: "Exit", c: C.up, tag: "Sell the ticket", fig: { big: "Sell it", sub: "most traders close the contract, not exercise", col: C.up } }
    ] },
    recession: { label: "Decide this before the next crash", info: [
      { k: "Cash", c: C.cyan, tag: "Emergency fund first", fig: { big: "__ months", sub: "of expenses, your number, decided today", col: C.cyan } },
      { k: "Keep going", c: C.blue, tag: "Your regular contributions", fig: { big: "Same amount", sub: "every month, whatever the headlines", col: C.blue } },
      { k: "Extra", c: C.up, tag: "If the market drops hard", fig: { big: "−20%?", sub: "decide now if you add more, and how much", col: C.up } },
      { k: "Rebalance", c: C.gold, tag: "A concrete trigger", fig: { rows: [["A percentage", "e.g. 5 points off target"], ["Or a date", "e.g. every January"], ["Not a feeling", "never \"when it feels safe\""]] } },
      { k: "Write it", c: C.purple, tag: "Then follow it mechanically", fig: { big: "Decide once", sub: "while calm, not over and over while scared", col: C.purple } }
    ] },
    arbitrage: { label: "The life of a price gap", info: [
      { k: "Opens", c: C.blue, tag: "Why gaps appear", fig: { rows: [["Different exchanges", "not all move at the same speed"], ["Different regions", "supply, taxes, capital controls"], ["Information lag", "news hits one venue first"]] } },
      { k: "Spotted", c: C.gold, tag: "By machines, first", fig: { rows: [["Co-located servers", "microseconds from the exchange"], ["Direct data feeds", "no lag"], ["Ultra-low fees", "negotiated"]] } },
      { k: "Traded", c: C.up, tag: "Buy cheap, sell rich at once", fig: { big: "+$5", sub: "buy at $100, sell at $105, before costs", col: C.up } },
      { k: "Squeezed", c: C.dn, tag: "Where it goes wrong", fig: { rows: [["Execution", "the other price moves first"], ["Fees", "0.2% a side eats a 1–2% gap"], ["Liquidity / transfers", "too little size, coins in transit"]] } },
      { k: "Closed", c: C.ink, tag: "Markets back in line", fig: { big: "Milliseconds", sub: "the trade itself closes the gap", col: C.ink } }
    ] },
    analysis: { label: "Reading a chart", info: [
      { k: "Price", c: C.blue, tag: "Where everything starts", fig: { big: "Price", sub: "what moves up and down on the chart", col: C.blue } },
      { k: "Volume", c: C.purple, tag: "The energy behind a move", fig: { bars: [["Quiet day", 1.2, "#48484a"], ["Normal day", 2.4, "#48484a"], ["Breakout day", 5, C.up]], cap: "shares traded" } },
      { k: "Trend", c: C.up, tag: "Higher highs, higher lows", fig: { big: "HH · HL", sub: "an uptrend; a downtrend is LH · LL", col: C.up } },
      { k: "Levels", c: C.gold, tag: "Support and resistance", fig: { rows: [["Resistance", "the ceiling: sellers show up"], ["Support", "the floor: buyers step in"]] } },
      { k: "Breaks", c: C.orange, tag: "Breakout or fakeout?", fig: { rows: [["Breakout", "closes through, on volume, keeps going"], ["Fakeout", "pokes through, snaps back, traps"]] } }
    ] },
    eps: { label: "Reading a P/E in five checks", info: [
      { k: "EPS", c: C.gold, tag: "Work out the earnings", fig: { big: "$4.80", sub: "($5M − $0.2M) ÷ 1M shares", col: C.gold } },
      { k: "Sign", c: C.dn, tag: "Is it positive?", fig: { big: "EPS < 0", sub: "no meaningful P/E: check revenue, cash, debt", col: C.dn } },
      { k: "Industry", c: C.blue, tag: "Compare with peers", fig: { bars: [["FreshBite", 10, C.up], ["Industry avg", 12, C.ink], ["Tasty Treats", 15, C.orange]], cap: "P/E, consumer goods" } },
      { k: "Which P/E", c: C.purple, tag: "Trailing or forward?", fig: { rows: [["Trailing", "last 12 months: real data"], ["Forward", "next 12 months: an estimate"], ["Forward < trailing", "growth expected"]] } },
      { k: "Shares", c: C.up, tag: "Watch the share count", fig: { rows: [["Dilution", "more shares: EPS down"], ["Buybacks", "fewer shares: EPS up"], ["Also check", "debt and cash flow"]] } }
    ] }
  };
  document.querySelectorAll("[data-bx-steps]").forEach(function (root) {
    var set = STEPSETS[root.getAttribute("data-bx-steps")];
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (!set || steps.length !== set.info.length) return;
    var INFO = set.info, LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", set.label);
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
      var narrow = fig.clientWidth > 0 && fig.clientWidth < 460, W = 560, H = narrow ? 420 : 300, s = "", F = narrow ? 1.45 : 1, f = INFO[k].fig;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      function t(x, y, str, col, size, anchor, weight) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (size * F).toFixed(1) + '" font-weight="' + (weight || 600) + '" text-anchor="' + (anchor || "start") + '">' + str + "</text>"; }
      function bx(x, y, w, h, col, op) { return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" rx="8" fill="' + col + '"' + (op != null ? ' opacity="' + op + '"' : "") + "/>"; }
      var top = 26, bot = H - 30;
      if (f.big) {
        s += t(W / 2, (top + bot) / 2 - (narrow ? 10 : 0), f.big, f.col, narrow ? 34 : 44, "middle", 800);
        var words = f.sub.split(" "), l1 = f.sub, l2 = "";
        if (narrow && f.sub.length > 30) { var half = Math.ceil(words.length / 2); l1 = words.slice(0, half).join(" "); l2 = words.slice(half).join(" "); }
        s += t(W / 2, (top + bot) / 2 + (narrow ? 56 : 44), l1, C.dim, 14, "middle", 500);
        if (l2) s += t(W / 2, (top + bot) / 2 + 56 + 22 * F, l2, C.dim, 14, "middle", 500);
      } else if (f.rows) {
        var rh = (bot - top) / f.rows.length;
        f.rows.forEach(function (r, i) {
          var y = top + i * rh;
          s += bx(24, y + 4, W - 48, rh - 10, "#2c2c2e");
          if (narrow) {
            s += t(42, y + rh * 0.42, r[0], INFO[k].c, 14, "start", 700);
            s += t(42, y + rh * 0.42 + 24, r[1], C.ink, 12, "start", 500);
          } else {
            s += t(44, y + rh / 2 + 1, r[0], INFO[k].c, 15, "start", 700);
            s += t(W - 44, y + rh / 2 + 1, r[1], C.ink, 13.5, "end", 500);
          }
        });
      } else if (f.bars) {
        var mx = Math.max.apply(null, f.bars.map(function (b) { return b[1]; })), bh = (bot - top - 20) / f.bars.length, lw = narrow ? 0 : 170;
        f.bars.forEach(function (b, i) {
          var y = top + i * bh, x0 = 24 + lw, w = (W - 48 - lw - 60) * b[1] / mx;
          if (narrow) { s += t(24, y + 16, b[0], C.dim, 12, "start", 600); s += bx(24, y + 24, (W - 110) * b[1] / mx, bh - 34, b[2], 0.85); }
          else { s += t(24, y + bh / 2 + 5, b[0], C.dim, 13, "start", 600); s += bx(x0, y + 6, w, bh - 14, b[2], 0.85); }
          if (f.cap === "P/E, consumer goods") s += t(narrow ? 24 + (W - 110) * b[1] / mx + 8 : x0 + w + 10, narrow ? y + 24 + (bh - 34) / 2 + 6 : y + bh / 2 + 5, String(b[1]), b[2], 14, "start", 800);
        });
        s += t(24, bot + 8, f.cap, C.faint, 11, "start", 500);
      }
      s += t(W - 14, H - 8, "Illustrative", C.faint, 10, "end", 400);
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
  });

  if (typeof window !== "undefined") window.__bx = { SPECS: SPECS, TRI: TRI };
})();
