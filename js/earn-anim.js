/* =====================================================================
   earn-anim.js — the animated walkthroughs on trading-earnings.html.

     [data-ea-anim="headline"]  step 1: the headline spike to 152 that fades in minutes
     [data-ea-anim="call"]      step 2: the conference call checklist, row by row
     [data-ea-anim="confirm"]   step 3: price confirms, the long near 154, what proves it wrong
     [data-ea-anim="plan"]      step 4: next day, Plan A holds 155-156, Plan B loses it
     [data-ea-anim="contrast"]  the same process in the other direction (a Tesla-style call)
     [data-ea-steps]            the four-step checklist, as a click-through stepper

   Same player as raschke-anim.js / of-anim.js: each chart redraws in a
   narrow layout on a phone instead of scrolling sideways, and on a phone
   the callouts sit in a band above the chart so they never cover it.

   Every bar is made up, labelled "Illustrative". The levels (150, 152,
   154, 155-156, 160) are the ones named in the video. No market data.
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
      if (REDUCED) { T = k + 1 < ST.length ? ST[k + 1].at - 0.01 : END; draw(); return; }
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

  /* chart frame for a price window: x slots, y scale */
  function frameXY(g, N, lo, hi) {
    return {
      X: function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; },
      Y: function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); },
      bw: (g.x1 - g.x0) / N * 0.6
    };
  }
  function clampBars(B, from, to, lo, hi) {
    for (var i = from; i <= to && i < B.length; i++) {
      if (hi != null) { B[i].h = Math.min(B[i].h, hi); B[i].c = Math.min(B[i].c, hi); B[i].o = Math.min(B[i].o, hi); }
      if (lo != null) { B[i].l = Math.max(B[i].l, lo); B[i].c = Math.max(B[i].c, lo); B[i].o = Math.max(B[i].o, lo); }
    }
  }
  function lastClose(B, cnt) { var k = Math.max(0, Math.min(B.length - 1, Math.ceil(cnt) - 1)); return B[k].c; }
  function money(v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2); }

  /* =====================================================================
     1 · The headline reaction: watch it, don't chase it
     ===================================================================== */
  function headlineSpec() {
    var CL = [147.9, 148.1, 147.8, 148.2, 148.0, 147.7, 148.0, 148.3, 148.1, 148.0,
              149.8, 151.3, 151.0, 150.1, 149.0, 148.3, 147.7, 147.9, 147.4, 147.8, 148.1, 147.9, 148.3, 148.2];
    var B = mkBars(CL, 148.0, 41, 0.3), N = CL.length, REP = 10;
    clampBars(B, 0, 9, 147.3, 148.6);
    B[10].h = Math.max(B[10].h, 150.4); B[11].h = 152.0; B[12].h = Math.min(B[12].h, 151.7);
    var ST = [
      { at: 0, title: "Before the report", text: "The stock drifts in a tight range into the release. Everyone knows the numbers are coming. What nobody knows yet is how the market will react to them." },
      { at: 3, title: "The headline beats", text: "The numbers look good and the stock jumps through 150 toward 152. The headline is the least important number in the report, but it's the one everyone reacts to first." },
      { at: 7, title: "The temptation", text: "You see the stock moving, you see the positive headline, and you don't want to miss it. Buying the first spike at 152 is exactly the trade to skip." },
      { at: 10, title: "Five minutes later", text: "Buyers don't support the higher price. The stock fades right back to where it started, and anyone who bought 152 is immediately in a difficult position." },
      { at: 14, title: "That's information", text: "Good news that can't hold tells you the headline alone isn't enough. It isn't a short and it isn't a bad report. It just hasn't confirmed anything. Watch where it settles." }
    ];
    return {
      stages: ST, end: 19,
      size: function (n) { return n ? { W: 440, H: 790 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var g = geo(L, { band: 196 }), F = frameXY(g, N, 146.8, 153), X = F.X, Y = F.Y, s = "";
        var cnt = track([[0, 1], [3, 10], [4.2, 11], [5.4, 12], [6.6, 13], [10, 13], [13.5, 24]], T);
        s += axis(g, 146.8, 153, 1, Y);
        s += txt(g.x0, g.y0 - 14, "1-minute bars · after the close", C.faint, 12, "start", 600);
        var xr = (X(REP - 1) + X(REP)) / 2, ro = fade(T, 2.8, 0.4);
        s += line(xr, g.y0, xr, g.y1, C.grey, 1.2, "4 5", ro);
        s += tag(xr, g.y1 - 12, "earnings out", C.dim, ro, "middle");
        s += line(g.x0, Y(150), g.x1, Y(150), "#48484a", 1.4, "2 4", fade(T, 3.6, 0.4));
        var so = fade(T, 5.4, 0.4);
        s += line(X(11), Y(152), g.x1, Y(152), C.orange, 1.6, "6 5", so);
        s += tag(g.x1 - 4, Y(152) - 14, "spike high 152", C.orange, so, "end");
        if (T >= 14) s += rect(X(15) - F.bw, Y(148.6), X(23) - X(15) + F.bw * 2, Y(147.2) - Y(148.6), C.blue, 8, 0.16 * fade(T, 14, 0.5));
        s += tag(X(19), Y(147.2) + 16, "where does it settle?", C.blue, fade(T, 14.4, 0.4), "middle");
        s += drawBars(B, X, Y, cnt, F.bw, function (k) { return T >= 14 && k < 15 ? 0.55 : 1; });
        var bo = fade(T, 3.2, 0.4) * (T < 6.5 ? 1 : 0.55);
        if (bo > 0) s += pill(X(10) - 4, Y(152.6) - 8, "EARNINGS BEAT", C.up, bo, "end");
        var co = fade(T, 7.2, 0.4);
        if (co > 0) {
          s += dot(X(11), Y(152), 7, C.orange, co);
          s += tag(X(11) - 10, Y(152) - 2, "chaser buys 152", C.orange, co * (T >= 14 ? 0.6 : 1), "end");
        }
        if (T >= 10) {
          var pl = lastClose(B, cnt) - 152, po = fade(T, 10.4, 0.4);
          s += tag(g.x1 - 4, Y(152) + 22, "chaser " + money(pl) + " a share", C.dn, po, "end");
        }
        s += note2(g, ["Quiet into the release", "The range before the report is", "your baseline for the reaction."], C.dim, win(T, 0.5, 2.8), g.y0);
        s += note2(g, ["Through 150, toward 152", "The stock doesn't care if the", "headline sounds good. It cares if", "it's better than what was expected."], C.up, win(T, 3.4, 6.8), g.y0);
        s += note2(g, ["Don't chase the first spike", "Wait to see if buyers will", "actually support the higher price."], C.orange, win(T, 7.3, 9.8), g.y0);
        s += note2(g, ["They didn't", "The whole move is gone in about", "five minutes. The 152 buyer is", "stuck under water."], C.dn, win(T, 10.4, 13.8), g.y0);
        s += note2(g, ["Why it faded? Maybe:", "· the good numbers were expected", "· investors worry about something else", "· pre-earnings longs took profits", "You don't need to know which."], C.blue, fade(T, 14.4, 0.4), g.y0);
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     2 · The conference call: what actually changes the story
     ===================================================================== */
  function callSpec() {
    var CL = [148.2, 147.9, 148.3, 148.0, 148.4, 148.2, 148.6, 148.5, 149.0, 149.4, 149.2, 149.8, 150.3, 150.1, 150.6, 150.9];
    var B = mkBars(CL, 148.2, 52, 0.25), N = CL.length;
    var ROWS = [
      { k: "Contracts", q: "Are customers committing to spend?", a: "Signed contracts tied to the capex", c: C.up, v: "bullish", at: 2.5 },
      { k: "Next-quarter guidance", q: "Raised, or a letdown?", a: "Very strong revenue guidance", c: C.up, v: "bullish", at: 5.5 },
      { k: "Financing", q: "Cash flow, borrowing, or stock?", a: "~$500B infrastructure spend next year", c: C.orange, v: "watch", at: 8.5 },
      { k: "Dilution", q: "Will it need to sell new shares?", a: "Selling stock to fund it = new supply", c: C.orange, v: "watch", at: 11 },
      { k: "Share unlocks", q: "How much stock can come loose?", a: "~900M shares unlock the next day", c: C.orange, v: "watch", at: 13.5 }
    ];
    var ST = [
      { at: 0, title: "The call starts", text: "The headline gave you a snapshot of what the company just did. The call tells you what might happen next. Many short-term traders think the event is over by now. It isn't." },
      { at: 2.5, title: "Contracts", text: "Is new business real, and is it big relative to the company? \"Demand is strong\" and \"we've signed contracts that support future revenue\" are very different statements. SpaceX tied its spending to contracts." },
      { at: 5.5, title: "Next quarter's guidance", text: "A great quarter with weak guidance can get crushed. An okay quarter with raised guidance can run. SpaceX's revenue guidance gave the market a reason to rethink the weak first reaction." },
      { at: 8.5, title: "Financing", text: "Where does the money for growth come from: cash flow, borrowing, or issuing stock? SpaceX talked about spending on the order of $500 billion on infrastructure next year." },
      { at: 11, title: "Dilution", text: "If the company raises money by selling shares, the market has to absorb that new supply. A bullish growth story doesn't automatically mean the stock goes up tomorrow." },
      { at: 13.5, title: "Share unlocks", text: "Are large blocks of stock about to become eligible for sale? SpaceX had roughly 900 million shares unlocking the next day. Not everyone will sell, but buyers may have to absorb it." },
      { at: 15.5, title: "Enough to look for a long", text: "Two items changed the story, three add possible supply. The bullish part was strong enough to start looking for a long. But one thing is still missing: price has to confirm it." }
    ];
    return {
      stages: ST, end: 20,
      size: function (n) { return n ? { W: 440, H: 920 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var g = n ? { n: 1, x0: 16, x1: 378, y0: 124, y1: 346 } : { n: 0, x0: 46, x1: 470, y0: 70, y1: 410 };
        var F = frameXY(g, N, 147.2, 151.6), X = F.X, Y = F.Y;
        var cnt = track([[0, 4], [5.5, 7], [8.5, 11], [15.5, 16]], T);
        s += axis(g, 147.2, 151.6, 1, Y);
        s += txt(g.x0, g.y0 - 14, "During the call · price keeps printing", C.faint, 12, "start", 600);
        s += drawBars(B, X, Y, cnt, F.bw, function () { return T >= 15.5 ? 0.45 : 1; });
        /* tone of the call */
        var ty = n ? 40 : 462, tx0 = g.x0, tx1 = n ? 424 : g.x1, tone = track([[0, 0.5], [2.5, 0.5], [4, 0.66], [7, 0.84], [9, 0.8], [16, 0.78]], T);
        s += txt(tx0, ty - 10, "Tone of the call", C.faint, 12, "start", 600);
        s += rect(tx0, ty, tx1 - tx0, 8, "#3a3a3c", 4);
        s += rect(tx0, ty, (tx1 - tx0) * tone, 8, tone > 0.6 ? C.up : C.grey, 4);
        s += dot(tx0 + (tx1 - tx0) * tone, ty + 4, 8, C.ink);
        s += txt(tx0, ty + 28, "bearish", C.faint, 11) + txt(tx1, ty + 28, "bullish", C.faint, 11, "end");
        /* the checklist */
        var px = n ? 14 : 540, pw = n ? 412 : 620, py = n ? 384 : 40, rh = n ? 96 : 84;
        ROWS.forEach(function (r, i) {
          var y = py + i * rh, on = T >= r.at, cur = on && (i === ROWS.length - 1 ? T < 15.5 : T < ROWS[i + 1].at);
          s += rect(px, y, pw, rh - 10, cur ? "#3a3a3c" : C.box, 14, 1);
          if (cur) s += frameRect(px, y, pw, rh - 10, r.c, 1.6, 1, 14);
          s += dot(px + 26, y + 26, 14, on ? r.c : "#48484a");
          s += txt(px + 26, y + 31, on ? (r.v === "bullish" ? "✓" : "!") : String(i + 1), on ? "#000" : C.dim, 13, "middle", 700);
          s += txt(px + 52, y + 30, r.k, on ? C.ink : C.dim, 15, "start", 700);
          s += txt(px + 52, y + (n ? 56 : 54), on ? r.a : r.q, on ? r.c : C.faint, 13, "start", on ? 600 : null, on ? fade(T, r.at, 0.4) : 1);
          if (on) s += pill(px + pw - 12, y + 32, r.v, r.c, fade(T, r.at + 0.2, 0.4), "end");
        });
        var so = fade(T, 15.7, 0.5);
        if (so > 0) {
          var cx = (g.x0 + g.x1) / 2, cy = (g.y0 + g.y1) / 2, bw2 = n ? 380 : 400;
          s += '<g opacity="' + so.toFixed(3) + '">' + rect(cx - bw2 / 2, cy - 70, bw2, 140, C.box, 16, 0.97) + frameRect(cx - bw2 / 2, cy - 70, bw2, 140, C.up, 1.2, 1, 16);
          s += txt(cx, cy - 34, "2 change the story · 3 add supply", C.ink, 15, "middle", 700);
          s += txt(cx, cy - 6, "Bullish enough to look for a long.", C.up, 14, "middle", 600);
          s += txt(cx, cy + 22, "Not enough to buy. Price has to agree.", C.dim, 13, "middle");
          s += txt(cx, cy + 48, "→ step 3", C.gold, 13, "middle", 700) + "</g>";
        }
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
  }

  /* =====================================================================
     3 · Price confirmation: where the trade actually happens
     ===================================================================== */
  function confirmSpec() {
    var CL = [147.9, 148.3, 147.8, 148.4, 148.9, 148.5, 149.2, 149.8, 149.4, 150.3, 150.9, 150.6, 151.4, 151.9, 151.6,
              152.5, 152.3, 152.8, 153.4, 153.9, 154.2, 154.0, 154.8, 155.4, 155.9, 156.4, 156.1, 156.6];
    var GH = [156.0, 156.5, 155.5, 156.4, 155.1, 154.4, 153.6];
    var B = mkBars(CL, 148.0, 63, 0.3), G = mkBars(GH, 156.6, 71, 0.3), N = CL.length + GH.length;
    var HL = [2, 5, 8, 11, 14];
    HL.forEach(function (k) { B[k].l = Math.min(B[k].l, B[k].c - 0.25); });
    clampBars(B, 0, 14, null, 151.95);
    clampBars(B, 16, 18, 152.1, null);
    G[1].h = 156.7; G[3].h = 156.6;
    var ST = [
      { at: 0, title: "After the failed spike", text: "The headline spike to 152 is gone. The stock is settling in the high 140s while the call goes on. You can like what management says and still lose money buying at the wrong price." },
      { at: 3, title: "Buyers start responding", text: "As the call talks contracts and next-quarter revenue, the selling slows and each dip stops higher. Now the information on the call and the chart are starting to agree." },
      { at: 6, title: "Through the old spike high", text: "152 is where the headline buyers failed. This time price goes through it and holds. A real change in buying interest looks different from another temporary spike." },
      { at: 9, title: "Long around 154", text: "The exact price isn't the point. The reasons are: the headline move already failed, the call added new information, and buyers are now accepting higher prices." },
      { at: 12, title: "Follow-through through 156", text: "That's the follow-through you want. But a move in your favor doesn't mean the trade will work for the next two hours." },
      { at: 14.5, title: "Know what proves you wrong", text: "You're long because buyers accept higher prices. If it starts failing at those prices again and again, that changes the trade: reduce size or exit. If it sets up again, you can get back in." }
    ];
    return {
      stages: ST, end: 20,
      size: function (n) { return n ? { W: 440, H: 800 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var g = geo(L, { band: 190 }), F = frameXY(g, N, 147, 158.4), X = F.X, Y = F.Y, s = "";
        var cnt = track([[0, 3], [3, 7], [6, 15], [8.5, 19], [9, 21], [12, 28]], T), gc = track([[14.5, 0], [18, GH.length]], T);
        s += axis(g, 147, 158.4, 2, Y);
        s += txt(g.x0, g.y0 - 14, "Price while the call plays out", C.faint, 12, "start", 600);
        var zo = fade(T, 14.5, 0.5);
        if (zo > 0) { s += rect(X(15) - F.bw, Y(154), g.x1 - X(15) + F.bw, Y(152) - Y(154), C.up, 6, 0.13 * zo); s += tag(X(16), Y(152) + 14, g.n ? "must hold 152–154" : "buyers must keep accepting 152–154", C.up, zo, "start"); }
        var lv = fade(T, 6, 0.4), rec = cnt > 15.5;
        s += line(g.x0, Y(152), g.x1, Y(152), rec ? C.up : C.orange, 1.6, "6 5", lv);
        s += tag(g.x0 + 4, Y(152) - 14, rec ? "152 reclaimed" : "headline spike high 152", rec ? C.up : C.orange, lv, "start");
        s += drawBars(B, X, Y, cnt, F.bw, function () { return T >= 14.5 ? 0.6 : 1; });
        HL.forEach(function (k, j) { if (cnt > k + 1 && T >= 3) s += dot(X(k), Y(B[k].l) + 9, 4, C.cyan, fade(T, 3 + j * 0.5, 0.3) * (T >= 9 ? 0.5 : 1)); });
        s += tag(X(8), Y(B[8].l) + 28, "higher lows", C.cyan, win(T, 3.4, 9), "middle");
        var eo = fade(T, 9.1, 0.4);
        if (eo > 0) { s += line(X(20), Y(154), g.x1, Y(154), C.up, 1.4, "3 4", eo * 0.8); s += dot(X(20), Y(154), 7, C.up, eo); s += pill(X(20) + 12, Y(154) + 30, "long ~154", C.up, eo, "start"); }
        var fo = fade(T, 12.2, 0.4);
        if (fo > 0) s += tag(X(25), Y(B[25].h) - 16, "through 156", C.up, fo, "middle");
        if (gc > 0) {
          s += '<g opacity="0.9">';
          for (var i = 0; i < Math.ceil(gc); i++) {
            var b = G[i], p = i < Math.floor(gc) ? 1 : gc - Math.floor(gc), x = X(CL.length + i);
            if (p <= 0) continue;
            s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + Y(b.h).toFixed(1) + '" y2="' + Y(b.l).toFixed(1) + '" stroke="' + C.orange + '" stroke-width="1.3" stroke-dasharray="3 2" opacity="' + p.toFixed(2) + '"/>';
            s += '<rect x="' + (x - F.bw / 2).toFixed(1) + '" y="' + Y(Math.max(b.o, b.c)).toFixed(1) + '" width="' + F.bw.toFixed(1) + '" height="' + Math.max(1.5, Math.abs(Y(b.o) - Y(b.c))).toFixed(1) + '" rx="1.5" fill="none" stroke="' + C.orange + '" stroke-width="1.4" stroke-dasharray="3 2" opacity="' + p.toFixed(2) + '"/>';
          }
          s += "</g>";
          s += tag(X(CL.length + 2), Y(157.6), "fails, fails again", C.orange, fade(T, 15.6, 0.3), "middle");
          s += tag(X(CL.length + 6), Y(153.6) + (g.n ? 44 : 22), "reduce or exit", C.dn, fade(T, 17.6, 0.3), "middle");
        }
        s += note2(g, ["Not buying the opinion", "A great call at the wrong price", "still loses money. Wait for", "price to show buyers are back."], C.dim, win(T, 0.5, 2.9), g.y0);
        s += note2(g, ["Selling slows, dips stop higher", "The call is turning bullish and", "price is starting to agree."], C.cyan, win(T, 3.4, 5.9), g.y0);
        s += note2(g, ["Can it hold above the level?", "152 is where the headline", "buyers gave up. Going through", "and holding it is new behavior."], C.up, win(T, 6.4, 8.9), g.y0);
        s += note2(g, ["Why long here, not at 152?", "· the headline move already failed", "· new information from the call", "· buying interest at higher prices"], C.up, win(T, 9.4, 11.9), g.y0);
        s += note2(g, ["Through 156", "Follow-through, not a guarantee.", "Keep asking: is price still", "confirming the idea?"], C.up, win(T, 12.4, 14.4), g.y0);
        s += note2(g, ["What would change the trade", "Repeated failure at higher prices.", "Then: smaller, or out.", "Sets up again? Get back in.", "Trade the move, not the company."], C.orange, fade(T, 14.8, 0.4), g.y0);
        return s + stamp(L, "Illustrative · made-up bars at the video's levels");
      }
    };
  }

  /* =====================================================================
     4 · Plan A and Plan B for the next day
     ===================================================================== */
  function planSpec() {
    var YC = [154.2, 154.9, 155.4, 155.1, 155.9, 156.4, 156.2, 156.6];
    var AC = [156.2, 155.7, 155.4, 155.8, 156.4, 155.9, 155.5, 156.1, 156.8, 157.4, 157.1, 157.9, 158.4, 158.1, 158.8, 159.4, 159.1, 159.8, 160.3, 160.6];
    var BC = [156.0, 155.5, 155.2, 155.5, 154.7, 154.1, 154.5, 154.9, 154.6, 155.0, 154.4, 153.8, 154.2, 153.6, 153.1, 153.4, 152.8, 152.5, 152.9, 152.4];
    var Yb = mkBars(YC, 154.0, 81, 0.3), A = mkBars(AC, 156.4, 83, 0.3), Bb = mkBars(BC, 156.4, 85, 0.3);
    clampBars(A, 0, 8, 155.15, null);
    A[2].l = 155.1; A[6].l = 155.12;
    clampBars(Bb, 5, 19, null, 155.15);
    Bb[7].h = 155.1; Bb[9].h = 155.15;
    var NY = YC.length, OFF = NY + 1, N = OFF + AC.length;
    var ST = [
      { at: 0, title: "Yesterday's close", text: "The post-call move closed near the highs. Today you don't want one prediction. You want to know what you'll do if buyers take control, and what you'll do if sellers do." },
      { at: 2.5, title: "Plan A · defend 155–156", text: "The bullish case: contracts behind the spending, very strong guidance, and buyers who stepped in after the failed headline. Are they still there? Watch the 155–156 area hold despite selling pressure." },
      { at: 6, title: "Plan A · build toward 160", text: "If buyers keep defending the zone and the stock keeps building higher, a close above 160 becomes a reasonable upside scenario. Possible, not promised." },
      { at: 9.5, title: "Plan B · the zone breaks", text: "If it keeps testing 155–156 and can't hold, stop forcing the long. Buried inside the growth story are two supply risks: financing about $500 billion of spending, and about 900 million shares unlocking." },
      { at: 12.5, title: "Plan B · can't reclaim it", text: "It loses the area and every bounce fails under it. Now the financing worries and the possible new supply may be winning over the bullish story. Be much more cautious." },
      { at: 15.5, title: "Let the stock decide", text: "Both sides can be true at once: excited buyers and holders ready to sell. The call can be fantastic and the stock can still go down. Don't argue with price." }
    ];
    return {
      stages: ST, end: 20,
      size: function (n) { return n ? { W: 440, H: 780 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var g = geo(L), F = frameXY(g, N, 151.6, 161.8), X = F.X, Y = F.Y, s = "";
        var cy = track([[0, 0], [2.2, NY]], T), ca = track([[2.5, 0], [6, 9], [9, AC.length]], T), cb = track([[9.6, 0], [12.5, 10], [15.3, BC.length]], T);
        var aOp = T < 9.5 ? 1 : T < 15.5 ? 1 - 0.72 * fade(T, 9.5, 0.6) : 0.28 + 0.5 * fade(T, 15.5, 0.6);
        var bOp = T < 15.5 ? 1 : 0.78;
        s += axis(g, 151.6, 161.8, 2, Y);
        s += txt(g.x0, g.y0 - 14, "Yesterday's close, then today", C.faint, 12, "start", 600);
        var xd = (X(NY - 1) + X(OFF)) / 2;
        s += line(xd, g.y0, xd, g.y1, C.grey, 1.2, "4 5", fade(T, 2, 0.4));
        s += tag(xd, g.y0 + 12, "next day", C.dim, fade(T, 2, 0.4), "middle");
        var zo = fade(T, 2.2, 0.4);
        if (zo > 0) { s += rect(xd, Y(156), g.x1 - xd, Y(155) - Y(156), C.blue, 4, 0.2 * zo); s += tag(g.x1 - 4, Y(155.5), "155–156", C.blue, zo, "end"); }
        var to = fade(T, 6, 0.4);
        s += line(xd, Y(160), g.x1, Y(160), C.gold, 1.4, "6 5", to);
        s += tag(xd + 6, Y(160) - 14, "close above 160?", C.gold, to, "start");
        s += drawBars(Yb, X, Y, cy, F.bw);
        if (ca > 0) s += drawBars(A, function (k) { return X(OFF + k); }, Y, ca, F.bw, function () { return aOp; });
        if (cb > 0) s += drawBars(Bb, function (k) { return X(OFF + k); }, Y, cb, F.bw * 0.82, function () { return bOp; });
        [2, 6].forEach(function (k, j) { if (ca > k + 1) s += dot(X(OFF + k), Y(A[k].l) + 9, 4.5, C.up, fade(T, 3.4 + j * 1.2, 0.3) * aOp); });
        s += tag(X(OFF + 4), Y(154.4), "defended twice", C.up, win(T, 4.8, 9.4), "middle");
        if (cb > 5) s += tag(X(OFF + 4), Y(Bb[4].l) + 18, "lost 155", C.dn, fade(T, 11, 0.3) * (T >= 15.5 ? 0.8 : 1), "middle");
        if (cb > 10) s += tag(X(OFF + 9), Y(156.3), "can't reclaim", C.dn, fade(T, 12.6, 0.3) * (T >= 15.5 ? 0.8 : 1), "middle");
        var fo = fade(T, 15.6, 0.4);
        s += tag(X(N - 1), Y(160.6) - 18, "Plan A", C.up, fo, "end");
        s += tag(X(N - 1), Y(152.4) + 20, "Plan B", C.dn, fo, "end");
        s += note2(g, ["Two plans, not one guess", "What do I do if buyers take", "control? What if sellers do?"], C.dim, win(T, 0.4, 2.4), g.y0);
        s += note2(g, ["Plan A · bullish case", "Contracts behind the capex,", "strong guidance, buyers after", "the failed headline. Do they", "still defend 155–156?"], C.up, win(T, 2.8, 5.9), g.y0);
        s += note2(g, ["Holding and building", "A close above 160 becomes", "possible. Not promised."], C.up, win(T, 6.3, 9.3), g.y0);
        s += note2(g, ["Plan B · the supply problem", "· ~$500B to finance next year:", "  borrow? sell stock?", "· ~900M shares unlock", "Both can weigh on price."], C.dn, win(T, 9.8, 12.4), g.y0);
        s += note2(g, ["Loses the zone, can't reclaim", "Stop forcing the long.", "Supply may be dominating", "the bullish story."], C.dn, win(T, 12.8, 15.3), g.y0);
        s += note2(g, ["Don't argue with price", "Holds 155–156: interested long.", "Loses it, can't reclaim: much", "more cautious."], C.gold, fade(T, 15.8, 0.4), g.y0);
        return s + stamp(L, "Illustrative · made-up bars at the video's levels");
      }
    };
  }

  /* =====================================================================
     5 · Same process, different direction (a Tesla-style call)
     ===================================================================== */
  function contrastSpec() {
    var SX = [0, 0.15, -0.1, 0.05, 1.6, 2.6, 2.2, 1.0, 0.2, -0.3, -0.1, -0.4, 0.0, 0.6, 1.1, 1.8, 2.3, 2.9, 3.4, 3.9, 4.3, 4.8];
    var TS = [0, 0.1, -0.05, 0.1, 2.0, 3.2, 3.6, 3.3, 3.8, 3.5, 3.9, 3.6, 3.0, 2.2, 1.4, 0.6, -0.2, -0.9, -1.6, -2.1, -2.6, -3.0];
    var BS = mkBars(SX, 0, 91, 0.25), BT = mkBars(TS, 0, 93, 0.25), N = SX.length, CALL = 12;
    var ST = [
      { at: 0, title: "Two earnings reports", text: "Same process, run on two different reports. On the left, the SpaceX pattern from the video. On the right, a pattern seen in plenty of Tesla earnings calls." },
      { at: 2, title: "The headline reactions", text: "Left: the headline spike fails and gives it all back. Right: the first reaction is positive and holds. If you stopped here, you'd want the right-hand stock." },
      { at: 6, title: "Then the call", text: "Left: contracts and strong guidance strengthen the bullish case. Right: management starts talking about something investors don't like: margins, spending, guidance. The stock starts selling off." },
      { at: 10.5, title: "Same process, different direction", text: "Tesla calls don't always go down. The point is the call can change the trade either way. Never decide what an earnings trade should do before you've heard the important information and watched the stock respond." }
    ];
    return {
      stages: ST, end: 15,
      size: function (n) { return n ? { W: 440, H: 880 } : { W: 1180, H: 480 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "", cnt = track([[0, 4], [2, 4], [5.5, CALL], [6.3, CALL], [10, N]], T);
        var P = n ? [{ x0: 16, x1: 378, y0: 70, y1: 360 }, { x0: 16, x1: 378, y0: 530, y1: 810 }]
                  : [{ x0: 40, x1: 520, y0: 80, y1: 400 }, { x0: 630, x1: 1110, y0: 80, y1: 400 }];
        var D = [
          { B: BS, title: "SpaceX · weak headline, call strengthens it", col: C.up, callTag: "contracts · guidance", end: "+4.8%" },
          { B: BT, title: "Tesla-style · good headline, call undermines it", col: C.dn, callTag: "margins? spending? guidance?", end: "−3.0%" }
        ];
        D.forEach(function (d, i) {
          var g = P[i], F = frameXY(g, N, -4, 6), X = F.X, Y = F.Y;
          s += txt(g.x0, g.y0 - 30, d.title, C.ink, 14, "start", 700);
          [-3, 0, 3, 6].forEach(function (v) { s += line(g.x0, Y(v), g.x1, Y(v), v === 0 ? "#48484a" : "#2c2c2e", 1) + txt(g.x1 + 6, Y(v) + 4, (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + "%", C.faint, 11); });
          var xr = (X(3) + X(4)) / 2, xc = (X(CALL - 1) + X(CALL)) / 2;
          s += line(xr, g.y0, xr, g.y1, C.grey, 1, "4 5", fade(T, 1.8, 0.4)) + tag(xr, g.y0 + 10, "headline", C.dim, fade(T, 1.8, 0.4), "middle");
          var co = fade(T, 6, 0.4);
          if (co > 0) { s += rect(xc, g.y0, g.x1 - xc, g.y1 - g.y0, d.col, 0, 0.07 * co); s += line(xc, g.y0, xc, g.y1, d.col, 1.4, "4 5", co) + tag(xc + 6, g.y0 + 10, "the call", d.col, co, "start"); }
          s += drawBars(d.B, X, Y, cnt, F.bw);
          s += tag(X(CALL + 4), i === 0 ? Y(-1.6) : Y(4.6), d.callTag, d.col, fade(T, 7, 0.4), "middle");
          s += tag(X(N - 1), Y(d.B[N - 1].c) + (i === 0 ? -18 : 20), d.end, d.col, fade(T, 10, 0.4), "end");
          var ho = win(T, 2.6, 6);
          s += tag(X(6), i === 0 ? Y(3.6) : Y(4.8), i === 0 ? "spike fails" : "first reaction holds", i === 0 ? C.orange : C.up, ho, "middle");
        });
        var fo = fade(T, 10.6, 0.5);
        if (fo > 0) {
          var cx = n ? 220 : 590, yy = n ? 448 : 446;
          s += pill(cx, yy, "Same process · different direction", C.gold, fo, "middle");
        }
        return s + stamp(L, "Illustrative · made-up bars, not actual prices");
      }
    };
  }

  var SPECS = { headline: headlineSpec, call: callSpec, confirm: confirmSpec, plan: planSpec, contrast: contrastSpec };
  document.querySelectorAll("[data-ea-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-ea-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     The four-step checklist, as a click-through stepper.
     Without the script the four show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ea-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 4) return;
    var INFO = [
      { k: "Headline", c: C.orange, tag: "Watch the first reaction, don't chase it" },
      { k: "The call", c: C.blue,   tag: "Listen for what changes expectations" },
      { k: "Price",    c: C.up,     tag: "Wait for buyers to confirm at a level" },
      { k: "Plan A / B", c: C.gold, tag: "Write both plans before tomorrow's open" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "The four-step earnings process");
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
      function poly(pts, col, w, dash) { return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2.4) + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>"; }
      function hl(y, col, label) { return '<line x1="30" x2="530" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + col + '" stroke-width="1.6" stroke-dasharray="6 5"/>' + t(530, y - 8, label, col, 12, "end", 700); }
      var top = 40, bot = H - 50, Y = function (v) { return bot - v * (bot - top); };
      if (k === 0) {
        var P = [[30, 0.3], [80, 0.32], [130, 0.28], [170, 0.3], [200, 0.62], [230, 0.86], [260, 0.7], [300, 0.42], [340, 0.3], [390, 0.26], [440, 0.32], [490, 0.29], [530, 0.31]];
        s += hl(Y(0.86), C.orange, "spike high");
        s += poly(P.map(function (p) { return [p[0], Y(p[1])]; }), C.ink);
        s += '<circle cx="230" cy="' + Y(0.86).toFixed(1) + '" r="7" fill="' + C.orange + '"/>' + t(214, Y(0.86) + 5, "don't chase", C.orange, 12, "end", 700);
        s += t(30, bot + 30, "Good headline, gone in five minutes: unconfirmed", C.dim, 12, "start", 500);
      } else if (k === 1) {
        var R = [["Contracts", C.up, "✓"], ["Next-quarter guidance", C.up, "✓"], ["Financing", C.orange, "!"], ["Dilution", C.orange, "!"], ["Share unlocks", C.orange, "!"]];
        var rh = (bot - top) / 5;
        R.forEach(function (r, i) {
          var y = top + i * rh + rh / 2;
          s += '<circle cx="50" cy="' + y.toFixed(1) + '" r="' + (12 * F).toFixed(1) + '" fill="' + r[1] + '"/>' + t(50, y + 5 * F, r[2], "#000", 13, "middle", 700) + t(78, y + 5 * F, r[0], C.ink, 14, "start", 600);
        });
        s += t(30, bot + 30, "Listen for what changes expectations", C.dim, 12, "start", 500);
      } else if (k === 2) {
        var Q = [[30, 0.3], [70, 0.24], [110, 0.34], [150, 0.3], [190, 0.42], [230, 0.38], [270, 0.52], [310, 0.66], [340, 0.62], [380, 0.74], [430, 0.82], [480, 0.8], [530, 0.9]];
        s += hl(Y(0.6), C.up, "old spike high, reclaimed");
        s += poly(Q.map(function (p) { return [p[0], Y(p[1])]; }), C.ink);
        s += '<circle cx="380" cy="' + Y(0.74).toFixed(1) + '" r="7" fill="' + C.up + '"/>' + t(392, Y(0.74) + 26, "long", C.up, 12, "start", 700);
        s += t(30, bot + 30, "Information plus buyers at higher prices", C.dim, 12, "start", 500);
      } else {
        var Z = Y(0.5);
        s += '<rect x="200" y="' + (Z - 14).toFixed(1) + '" width="330" height="28" rx="6" fill="' + C.blue + '" opacity="0.2"/>' + t(526, Z + 5, "the zone", C.blue, 12, "end", 700);
        s += poly([[30, Y(0.36)], [90, Y(0.44)], [150, Y(0.48)], [200, Y(0.52)]], C.ink);
        s += poly([[200, Y(0.52)], [260, Y(0.5)], [320, Y(0.6)], [400, Y(0.72)], [470, Y(0.8)], [530, Y(0.9)]], C.up);
        s += poly([[200, Y(0.52)], [260, Y(0.46)], [320, Y(0.38)], [360, Y(0.45)], [420, Y(0.3)], [530, Y(0.16)]], C.dn, 2.4, "6 5");
        s += t(530, Y(0.9) - 10, "Plan A: holds, builds", C.up, 12, "end", 700) + t(530, Y(0.16) + 22, "Plan B: loses it", C.dn, 12, "end", 700);
        s += t(30, bot + 30, "What confirms the idea, what kills it", C.dim, 12, "start", 500);
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
