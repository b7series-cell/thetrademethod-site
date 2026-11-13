/* =====================================================================
   rvol-anim.js — the animated walkthroughs on relative-volume.html.

     [data-rvol-anim="self"]   relative to itself: three stocks ranked by
                               total volume, then by RVOL; the ranking flips
     [data-rvol-anim="cum"]    how the cumulative RVOL histogram is built:
                               today's volume so far vs normal volume by the
                               same time of day, 20-day and 5-day
     [data-rvol-anim="break"]  the same 155 breakout twice: once with RVOL
                               under 1 (fails), once with RVOL over 1.7 (holds)
     [data-rvol-spark]         small static histograms for the four readings

   Unlike the older walkthroughs these redraw for the space they have: on
   a phone the chart is drawn in a narrow layout instead of a wide one you
   have to scroll sideways.

   Everything is scripted and labelled "Illustrative". The 1M → 5M, 10M vs
   50M and 2M vs 200K numbers, the 155 level, and the "a little over 2,
   then 1.7 to 1.8" readings are the ones stated in the reference video.
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
  /* RVOL column colour: under 1 grey, 1–2 blue, 2+ green (same as the indicator) */
  function rvCol(v) { return v >= 2 ? C.up : v >= 1 ? C.blue : C.grey; }
  function fmtM(v) { return v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M" : Math.round(v / 1e3) + "K"; }

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

  /* =====================================================================
     1 · relative to itself: total volume vs RVOL
     ===================================================================== */
  function selfSpec() {
    var ROWS = [
      { name: "Stock 1", today: 5e6,  normal: 1e6,  sub: "usually 1M by 10:15",   verdict: "5x normal: in play",       vcol: C.up },
      { name: "Stock 2", today: 1e7,  normal: 5e7,  sub: "usually 50M by 10:15",  verdict: "0.2x: quieter than usual", vcol: C.grey },
      { name: "Stock 3", today: 2e6,  normal: 2e5,  sub: "usually 200K by 10:15", verdict: "10x: something changed",   vcol: C.up }
    ];
    var T1 = 3.6, T2 = 7.2, T3 = 10.6, END = 14.5, RMAX = 11;
    var ST = [
      { at: 0,  title: "Total volume, on its own", text: "Three stocks at 10:15. Stock 2 has traded the most shares, 10 million, so on raw volume it looks like the active one." },
      { at: T1, title: "Add what's normal for each", text: "Stock 2 usually trades 50 million by now. Stock 3 usually trades only 200,000. The same raw number means very different things." },
      { at: T2, title: "Compare each stock to itself", text: "Divide today's volume by that stock's normal volume by this time. That ratio is relative volume, RVOL. 1.0x is a normal day." },
      { at: T3, title: "The ranking flips", text: "Stock 2 is at 0.2x, quieter than usual. Stock 1 is doing 5x normal. Stock 3, the smallest by shares, is doing 10x: something changed." }
    ];
    function size(n) { return n ? { W: 440, H: 540 } : { W: 1180, H: 520 }; }
    function frame(T, L) {
      var n = L.narrow, s = "";
      var x0 = n ? 20 : 300, x1 = n ? 404 : 1090, len = x1 - x0;
      var k = ease(fade(T, T1 + 0.2, 1.2)), m = ease(fade(T, T2 + 0.2, 1.6));
      var absMax = lerp(12e6, 55e6, k);
      var axY = n ? 494 : 470;
      s += txt(n ? 20 : 60, n ? 26 : 32, "Illustrative · shares traded by 10:15", C.faint, 12);
      /* axis: shares, then multiples of normal */
      var stepA = absMax <= 16e6 ? 2e6 : 10e6;
      for (var v = 0; v <= absMax + 1; v += stepA) {
        var xa = x0 + v / absMax * len;
        if (xa > x1 + 1) break;
        s += line(xa, n ? 70 : 92, xa, axY - 14, "rgba(255,255,255,0.05)", 1, null, 1 - m);
        if (!n || v % (stepA * 2) === 0) s += txt(xa, axY, v === 0 ? "0" : fmtM(v), C.faint, 11, "middle", null, 1 - m);
      }
      for (var r = 0; r <= 10; r += 1) {
        var xr = x0 + r / RMAX * len;
        s += line(xr, n ? 70 : 92, xr, axY - 14, r === 1 ? "rgba(255,255,255,0.0)" : "rgba(255,255,255,0.05)", 1, null, m);
        if (!n || r % 2 === 0 || r === 1) s += txt(xr, axY, r + "x", r === 1 ? C.dim : C.faint, 11, "middle", r === 1 ? 600 : null, m);
      }
      /* the "normal" line in ratio mode */
      var xN = x0 + 1 / RMAX * len;
      s += line(xN, n ? 66 : 92, xN, axY - 14, C.dim, 1.4, "5 4", m * 0.8);
      ROWS.forEach(function (row, i) {
        var yc = n ? 118 + i * 136 : 160 + i * 112, bh = n ? 26 : 34;
        var yBar = n ? yc : yc - bh / 2;
        var grow = ease(fade(T, 0.4 + i * 0.5, 1.4));
        var fa = row.today / absMax * grow, fr = row.today / row.normal / RMAX;
        var w = lerp(fa, fr, m) * len;
        var ratio = row.today / row.normal;
        var col = m < 0.5 ? C.blue : rvCol(ratio);
        /* labels */
        if (n) {
          s += txt(20, yc - 12, row.name, C.ink, 16, "start", 700);
          s += txt(404, yc - 12, row.sub, C.dim, 13, "end", null, k);
          s += txt(404, yc + bh + 22, row.verdict, row.vcol, 13, "end", 700, fade(T, T3 + 0.3 + i * 0.4, 0.4));
        } else {
          s += txt(60, yc - 6, row.name, C.ink, 18, "start", 700);
          s += txt(60, yc + 15, row.sub, C.dim, 13, "start", null, k);
          s += txt(60, yc + 36, row.verdict, row.vcol, 13, "start", 700, fade(T, T3 + 0.3 + i * 0.4, 0.4));
        }
        s += rect(x0, yBar, len, bh, "rgba(255,255,255,0.04)", 6);
        s += rect(x0, yBar, Math.max(0, w), bh, col, 6);
        /* value at the end of the bar: shares, then RVOL */
        var lx = x0 + w + 10, ly = yBar + bh / 2 + 5;
        var inside = lx > x1 - 60;
        s += txt(inside ? x0 + w - 10 : lx, ly, fmtM(row.today), inside ? "#000" : C.ink, 14, inside ? "end" : "start", 700, grow * (1 - clamp01(m * 2)));
        s += txt(inside ? x0 + w - 10 : lx, ly, ratio.toFixed(1) + "x", inside ? "#000" : C.ink, 14, inside ? "end" : "start", 700, clamp01(m * 2 - 1));
        /* the stock's own normal: a tick on its bar */
        var nx = x0 + lerp(row.normal / absMax, 1 / RMAX, m) * len;
        var aN = k * (1 - m);
        s += line(nx, yBar - 6, nx, yBar + bh + 6, C.gold, 2.2, null, aN);
        if (n) s += txt(nx, yBar + bh + 20, "normal " + fmtM(row.normal), C.gold, 12, nx > x1 - 80 ? "end" : nx < x0 + 50 ? "start" : "middle", 700, aN);
        else s += txt(nx, yBar - 10, "normal " + fmtM(row.normal), C.gold, 12, nx > x1 - 80 ? "end" : "middle", 700, aN);
      });
      s += txt(xN + 8, n ? 56 : 106, "1.0x = normal", C.dim, 12, "start", 600, m);
      s += txt(L.W - 20, L.H - 8, "Illustrative", C.faint, 11, "end");
      return s;
    }
    return { stages: ST, end: END, frame: frame, size: size };
  }

  /* =====================================================================
     2 · building the cumulative RVOL histogram
     ===================================================================== */
  function cumSpec() {
    var N = 30, AT = 8;                      // 5-minute bars 9:30 → 12:00; slot 8 ends at 10:15
    var MULT = [1.3, 1.35, 1.45, 1.9, 2.6, 3.6, 4.2, 3.9, 3.4, 2.9, 2.6, 2.4, 2.3, 2.25, 2.2, 2.2, 2.15, 2.2, 2.25, 2.2, 2.2, 2.15, 2.2, 2.2, 2.25, 2.2, 2.2, 2.2, 2.15, 2.2];
    var CA = [], CT = [], a = 0, t = 0, i;
    for (i = 0; i < N; i++) { var p = 0.35 + 1.4 * Math.exp(-i / 5); a += p; t += p * MULT[i]; CA.push(a); CT.push(t); }
    var ka = 1.2e6 / CA[AT], kt = 3.0e6 / CT[AT];
    CA = CA.map(function (v) { return v * ka; }); CT = CT.map(function (v) { return v * kt; });
    var R20 = CT.map(function (v, j) { return v / CA[j]; }), R5 = R20.map(function (v) { return v / 1.25; });
    var VMAX = 6e6, RMAX = 4;
    var S1 = 3.4, S2 = 5.8, S3 = 9.4, S4 = 15.4, S5 = 17.6, END = 21.5;
    var ST = [
      { at: 0,  title: "Normal, by time of day", text: "The grey curve is this stock's average volume so far at each time of day, over its last 20 sessions. It climbs fast at the open and slows toward lunch." },
      { at: S1, title: "Today, on the same clock", text: "The blue curve is today's volume so far. By 10:15 it is well above the grey one." },
      { at: S2, title: "Compare at 10:15", text: "Today: 3.0M shares by 10:15. Normal by 10:15: 1.2M. 3.0 ÷ 1.2 = 2.5x. Not today against a whole day: today against the same time of day." },
      { at: S3, title: "Every bar becomes a column", text: "Do that at every bar and you get the histogram. Above the dashed 1.0 line, the stock is busier than usual for that moment of the day." },
      { at: S4, title: "A second baseline: 5 days", text: "The bottom histogram uses the last 5 sessions. It reads lower here, 2.0x at 10:15, because the stock was already busier this week." },
      { at: S5, title: "Read the shape", text: "Increasing into the move, then holding near 2.5x. Participation showed up and stayed. That's what you want under a breakout." }
    ];
    function size(n) { return n ? { W: 440, H: 600 } : { W: 1180, H: 540 }; }
    /* how many slots of each curve are visible at time T */
    function avgShown(T) { return lerp(0, N - 1, ease(fade(T, 0.3, 2.8))); }
    function todayShown(T) {
      if (T < S3 + 1.4) return lerp(0, AT, fade(T, S1 + 0.1, 2.0));
      return lerp(AT, N - 1, fade(T, S3 + 1.4, 4.2));
    }
    function colsShown(T) {
      if (T < S3) return -1;
      if (T < S3 + 1.4) return lerp(-1, AT, fade(T, S3, 1.2));
      return todayShown(T);
    }
    function frame(T, L) {
      var n = L.narrow, s = "";
      var x0 = n ? 46 : 110, x1 = n ? 424 : 1070, dx = (x1 - x0) / (N - 1);
      var top = { y0: n ? 60 : 56, y1: n ? 250 : 236 };
      var h20 = { y0: n ? 296 : 270, y1: n ? 410 : 378 };
      var h5 = { y0: n ? 454 : 412, y1: n ? 546 : 500 };
      var timeY = n ? 576 : 528;
      function X(j) { return x0 + j * dx; }
      function YV(v) { return top.y1 - v / VMAX * (top.y1 - top.y0); }
      s += txt(n ? 20 : 60, 30, "Illustrative · 5-minute bars, 9:30 to 12:00", C.faint, 12);
      /* top panel: cumulative volume */
      for (var v = 0; v <= VMAX; v += 2e6) {
        s += line(x0, YV(v), x1, YV(v), "rgba(255,255,255,0.05)", 1);
        s += txt(x0 - 8, YV(v) + 4, v === 0 ? "0" : fmtM(v), C.faint, 11, "end");
      }
      s += txt(x0, top.y0 - 8, "Cumulative volume so far", C.dim, 12, "start", 600);
      function curve(arr, upto, col, w, dash) {
        if (upto <= 0) return "";
        var pts = [], last = Math.floor(upto);
        for (var j = 0; j <= last; j++) pts.push(X(j).toFixed(1) + "," + YV(arr[j]).toFixed(1));
        if (upto > last && last + 1 < N) pts.push(X(upto).toFixed(1) + "," + YV(lerp(arr[last], arr[last + 1], upto - last)).toFixed(1));
        return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + ' stroke-linejoin="round"/>';
      }
      var aS = avgShown(T), tS = todayShown(T);
      s += curve(CA, aS, C.grey, 2.4, "6 4");
      if (aS > 4) s += txt(X(Math.min(aS, N - 1)) - 4, YV(CA[Math.floor(Math.min(aS, N - 1))]) + 20, "normal, 20-day avg", C.grey, 12, "end", 600);
      s += curve(CT, tS, C.blue, 3);
      if (tS > 0.5) {
        var tj = Math.floor(tS);
        s += txt(X(tS) + (n ? -6 : 8), YV(lerp(CT[tj], CT[Math.min(N - 1, tj + 1)], tS - tj)) - 8, "today", C.blue, 13, n ? "end" : "start", 700);
      }
      /* the 10:15 comparison */
      var aC = fade(T, S2, 0.4) * (1 - 0.7 * fade(T, S3 + 1.4, 0.5));
      if (aC > 0) {
        var xc = X(AT);
        s += line(xc, top.y0, xc, h5.y1, C.gold, 1.4, "3 3", aC);
        s += txt(xc, timeY - 18 + (n ? 0 : 0), "10:15", C.gold, 12, "middle", 700, aC);
        s += '<circle cx="' + xc.toFixed(1) + '" cy="' + YV(CT[AT]).toFixed(1) + '" r="5" fill="' + C.blue + '" opacity="' + aC.toFixed(3) + '"/>';
        s += '<circle cx="' + xc.toFixed(1) + '" cy="' + YV(CA[AT]).toFixed(1) + '" r="5" fill="' + C.grey + '" opacity="' + aC.toFixed(3) + '"/>';
        var aCo = fade(T, S2 + 0.3, 0.4) * (1 - fade(T, S3, 0.4));
        s += callout(xc + 16, n ? top.y0 + 14 : top.y0 + 20, ["By 10:15", "today 3.0M · normal 1.2M", "3.0 ÷ 1.2 = 2.5x"], C.gold, aCo);
      }
      /* histograms */
      function hist(H, R, upto, label, col5, op) {
        if (op <= 0) return "";
        var g = '<g opacity="' + op.toFixed(3) + '">';
        function YR(r) { return H.y1 - r / RMAX * (H.y1 - H.y0); }
        g += rect(x0 - 6, H.y0 - 4, x1 - x0 + 12, H.y1 - H.y0 + 4, "rgba(255,255,255,0.025)", 6);
        var cw = Math.max(3, dx * 0.62);
        g += line(x0 - 6, YR(1), x1 + 6, YR(1), C.dim, 1.2, "5 4", 0.8);
        g += txt(x0 - cw / 2 - 6, YR(1) + 4, "1.0", C.dim, 11, "end", 600);
        g += txt(x0 - cw / 2 - 6, YR(3) + 4, "3.0", C.faint, 11, "end");
        g += txt(x0, H.y0 - 10, label, col5 || C.dim, 12, "start", 600);
        for (var j = 0; j <= Math.floor(upto); j++) {
          var hv = R[j], grow = clamp01(upto - j + 1);
          var y = YR(hv * grow);
          g += rect(X(j) - cw / 2, y, cw, H.y1 - y, rvCol(hv), 1.5, j > 0 && hv < R[j - 1] - 0.005 ? 0.55 : 1);
        }
        return g + "</g>";
      }
      var cS = colsShown(T);
      s += hist(h20, R20, cS, "RVOL vs 20-day, same time of day", null, fade(T, S3 - 0.2, 0.4));
      var c5 = T < S4 ? -1 : lerp(-1, N - 1, fade(T, S4, 1.6));
      s += hist(h5, R5, c5, "RVOL vs 5-day, same time of day", C.orange, fade(T, S4 - 0.2, 0.4));
      if (cS >= AT) {
        var aV = fade(T, S3 + 1.2, 0.3) * (1 - 0.6 * fade(T, S5, 0.4));
        var yv = h20.y1 - R20[AT] / RMAX * (h20.y1 - h20.y0);
        s += txt(X(AT), yv - 8, "2.5x", C.up, 13, "middle", 800, aV);
      }
      if (c5 >= AT) {
        var y5 = h5.y1 - R5[AT] / RMAX * (h5.y1 - h5.y0);
        s += txt(X(AT), y5 - 8, "2.0x", C.up, 13, "middle", 800, fade(T, S4 + 0.6, 0.3) * (1 - 0.6 * fade(T, S5, 0.4)));
      }
      /* the shape */
      var aR = fade(T, S5, 0.5);
      if (aR > 0) {
        var yb = h20.y0 + (n ? 14 : 12);
        s += line(X(1), yb, X(AT - 1), yb, C.up, 2, null, aR) + txt((X(1) + X(AT - 1)) / 2, yb - 5, n ? "increasing" : "increasing into the move", C.up, 12, "middle", 700, aR);
        s += line(X(AT + 2), yb, X(N - 1), yb, C.blue, 2, null, aR) + txt((X(AT + 2) + X(N - 1)) / 2, yb - 6, "holding near 2.5x", C.blue, 12, "middle", 700, aR);
      }
      /* time axis */
      for (var m = 0; m <= 150; m += 30) {
        var jx = m / 5, tl = Math.floor((570 + m) / 60) + ":" + ("0" + (570 + m) % 60).slice(-2);
        if (n && m % 60 !== 0 && m !== 150) continue;
        s += txt(X(jx), timeY, tl, C.faint, 11, m === 150 ? "end" : m === 0 ? "start" : "middle");
      }
      s += txt(L.W - 20, 30, "Illustrative", C.faint, 11, "end");
      return s;
    }
    return { stages: ST, end: END, frame: frame, size: size, _check: { R20: R20, R5: R5, CA: CA, CT: CT } };
  }

  /* =====================================================================
     3 · the same 155 breakout, without and with RVOL
     ===================================================================== */
  function breakSpec() {
    var A = [[153.8, 154.2, 153.5, 154.0], [154.0, 154.5, 153.8, 154.3], [154.3, 154.8, 154.1, 154.6], [154.6, 154.9, 154.2, 154.4], [154.4, 154.8, 154.1, 154.7],
      [154.7, 154.95, 154.4, 154.5], [154.5, 154.9, 154.3, 154.8], [154.8, 154.95, 154.5, 154.7], [154.7, 155.0, 154.5, 154.9],
      [154.9, 155.7, 154.8, 155.6], [155.6, 156.1, 155.4, 155.9], [155.9, 156.0, 155.5, 155.6], [155.6, 155.7, 155.1, 155.2],
      [155.2, 155.4, 154.6, 154.7], [154.7, 154.9, 154.0, 154.2], [154.2, 154.4, 153.6, 153.8], [153.8, 154.1, 153.3, 153.5],
      [153.5, 153.9, 153.2, 153.7], [153.7, 153.8, 153.0, 153.2], [153.2, 153.5, 152.8, 153.0], [153.0, 153.3, 152.7, 152.9], [152.9, 153.2, 152.6, 153.1]];
    var B = [[153.9, 154.3, 153.6, 154.2], [154.2, 154.6, 154.0, 154.5], [154.5, 154.8, 154.3, 154.7], [154.7, 154.95, 154.5, 154.6], [154.6, 154.9, 154.4, 154.8],
      [154.8, 154.95, 154.6, 154.7], [154.7, 154.95, 154.6, 154.9], [154.9, 155.0, 154.7, 154.8], [154.8, 155.0, 154.7, 154.95],
      [154.95, 156.0, 154.9, 155.9], [155.9, 156.5, 155.7, 156.3], [156.3, 156.4, 155.6, 155.8], [155.8, 156.0, 155.3, 155.5],
      [155.5, 156.1, 155.4, 156.0], [156.0, 156.6, 155.9, 156.5], [156.5, 156.9, 156.2, 156.8], [156.8, 157.2, 156.5, 156.6],
      [156.6, 157.4, 156.5, 157.3], [157.3, 157.8, 157.1, 157.6], [157.6, 157.9, 157.2, 157.4], [157.4, 158.1, 157.3, 158.0], [158.0, 158.4, 157.8, 158.2]];
    var RA = [0.78, 0.80, 0.81, 0.80, 0.79, 0.80, 0.82, 0.83, 0.84, 0.88, 0.90, 0.89, 0.87, 0.86, 0.86, 0.85, 0.85, 0.84, 0.84, 0.84, 0.83, 0.83];
    var RB = [1.20, 1.25, 1.28, 1.30, 1.32, 1.33, 1.36, 1.40, 1.48, 2.05, 2.12, 1.95, 1.84, 1.80, 1.78, 1.76, 1.74, 1.75, 1.77, 1.76, 1.74, 1.75];
    var RA5 = RA.map(function (v) { return v * 0.86; }), RB5 = RB.map(function (v) { return v * 0.88; });
    var NB = A.length, LEVEL = 155, PMIN = 152.3, PMAX = 158.8, RMAX = 2.8;
    var BRK = 9;
    /* bar reveal start times, per panel */
    function times(segs) { var tb = []; segs.forEach(function (sg) { for (var j = sg[0]; j <= sg[1]; j++) tb[j] = sg[2] + (j - sg[0]) * sg[3]; }); return tb; }
    var TA = times([[0, 8, 0.3, 0.22], [9, 10, 2.5, 0.6], [11, 21, 6.8, 0.26]]);
    var TBB = times([[0, 8, 11.3, 0.2], [9, 10, 13.3, 0.6], [11, 15, 14.8, 0.36], [16, 21, 17.4, 0.26]]);
    var PER = 0.5;
    var S1 = 3.9, S2 = 6.6, S3 = 11.0, S4 = 14.6, S5 = 17.2, END = 21.8;
    var ST = [
      { at: 0,  title: "Price breaks the level", text: "The stock has been basing under 155. It pokes through and, for a few minutes, the breakout looks like it's working. This is where traders chase." },
      { at: S1, title: "Look underneath", text: "Cumulative RVOL never confirms. The 20-day columns and the 5-day line both sit under 1.0: less volume than normal for this time of day." },
      { at: S2, title: "No buyers, no breakout", text: "Nobody showed up to hold it. Price slips back under 155 and the breakout fails. The RVOL warned you before it happened." },
      { at: S3, title: "Same level, another day", text: "Same 155 resistance, a similar-looking setup. This time RVOL is already above 1 and jumps a little over 2 on the break." },
      { at: S4, title: "Settles and holds", text: "It cools to 1.7 to 1.8x and stays there. Not monster RVOL, just steady proof that participation is still there on the pullback." },
      { at: S5, title: "Price plus participation", text: "The pullback holds above 155 and the stock trends. In the video's example it went on toward 175 over the next couple of days." }
    ];
    function size(n) { return n ? { W: 440, H: 560 } : { W: 1180, H: 540 }; }
    function panel(T, L, P, op) {
      if (op <= 0) return "";
      var n = L.narrow;
      var px0 = P.x0, px1 = P.x0 + P.w, cx0 = px0 + (n ? 34 : 44), cx1 = px1 - 14, dx = (cx1 - cx0) / (NB - 1);
      var pr = { y0: 82, y1: n ? 330 : 318 }, hr = { y0: n ? 380 : 362, y1: n ? 510 : 492 };
      function X(j) { return cx0 + j * dx; }
      function YP(p) { return pr.y1 - (p - PMIN) / (PMAX - PMIN) * (pr.y1 - pr.y0); }
      function YR(r) { return hr.y1 - r / RMAX * (hr.y1 - hr.y0); }
      var s = '<g opacity="' + op.toFixed(3) + '">';
      s += rect(px0, 48, P.w, (n ? 530 : 516) - 48, "rgba(255,255,255,0.025)", 14);
      s += txt(px0 + 14, 72, P.title, P.tcol, 15, "start", 700);
      for (var p = 153; p <= 158; p += 1) {
        s += line(cx0, YP(p), cx1, YP(p), "rgba(255,255,255,0.05)", 1);
        s += txt(cx0 - 6, YP(p) + 4, p, C.faint, 11, "end");
      }
      s += line(cx0, YP(LEVEL), cx1, YP(LEVEL), C.gold, 1.6, "6 4");
      s += txt(cx1, YP(LEVEL) + 16, "155 resistance", C.gold, 12, "end", 700);
      /* RVOL panel */
      s += line(cx0, YR(1), cx1, YR(1), C.dim, 1.2, "5 4", 0.85);
      s += line(cx0, YR(2), cx1, YR(2), "rgba(255,255,255,0.12)", 1, "2 4");
      s += txt(cx0 - 6, YR(1) + 4, "1.0", C.dim, 11, "end", 600) + txt(cx0 - 6, YR(2) + 4, "2.0", C.faint, 11, "end");
      s += txt(cx0, hr.y0 - 10, "Cum RVOL · columns 20-day", C.dim, 12, "start", 600);
      s += txt(cx1, hr.y0 - 10, "line 5-day", C.orange, 12, "end", 600);
      var cw = dx * 0.58, last = -1, pts = [];
      for (var j = 0; j < NB; j++) {
        var g = clamp01((T - P.tb[j]) / PER);
        if (g <= 0) break;
        last = j;
        s += candle(X(j), YP, P.bars[j], g, cw);
        var y = YR(P.r[j] * ease(g));
        s += rect(X(j) - cw / 2, y, cw, hr.y1 - y, rvCol(P.r[j]), 1.5, j > 0 && P.r[j] < P.r[j - 1] - 0.005 ? 0.55 : 1);
        pts.push((X(j) - dx / 2).toFixed(1) + "," + YR(P.r5[j]).toFixed(1), (X(j) + dx / 2).toFixed(1) + "," + YR(P.r5[j]).toFixed(1));
      }
      if (pts.length) s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.orange + '" stroke-width="2"/>';
      s += P.notes(T, X, YP, YR, last);
      return s + "</g>";
    }
    function frame(T, L) {
      var n = L.narrow, s = "";
      s += txt(n ? 20 : 40, 30, "Illustrative · 2-minute bars", C.faint, 12);
      var PA = {
        x0: n ? 12 : 30, w: n ? 416 : 550, bars: A, r: RA, r5: RA5, tb: TA,
        title: "Breakout 1 · RVOL under 1", tcol: C.dn,
        notes: function (T, X, YP, YR, last) {
          var s = "";
          var a1 = fade(T, S1, 0.4) * (1 - fade(T, S2 + 0.6, 0.4));
          if (a1 > 0) {
            s += '<ellipse cx="' + X(BRK).toFixed(1) + '" cy="' + YR(0.85).toFixed(1) + '" rx="' + (n ? 30 : 40) + '" ry="22" fill="none" stroke="' + C.dn + '" stroke-width="2" opacity="' + a1.toFixed(3) + '"/>';
            s += callout(X(BRK) + (n ? -150 : 50), YR(2.6), ["Under 1.0 on the break", "20-day 0.88 · 5-day 0.76"], C.dn, a1);
          }
          var aB = fade(T, TA[BRK] + 0.5, 0.3) * (1 - fade(T, S2, 0.3));
          s += txt(X(BRK), YP(156.6), "looks like a breakout", C.up, 12, "middle", 700, aB);
          var aF = fade(T, TA[13] + 0.5, 0.4);
          if (aF > 0) {
            s += '<circle cx="' + X(13).toFixed(1) + '" cy="' + YP(154.7).toFixed(1) + '" r="9" fill="none" stroke="' + C.dn + '" stroke-width="2.2" opacity="' + aF.toFixed(3) + '"/>';
            s += callout(X(13) + 16, YP(157.6), ["Back under 155", "breakout failed"], C.dn, aF);
          }
          return s;
        }
      };
      var PB = {
        x0: n ? 12 : 600, w: n ? 416 : 550, bars: B, r: RB, r5: RB5, tb: TBB,
        title: "Breakout 2 · RVOL over 1.7", tcol: C.up,
        notes: function (T, X, YP, YR, last) {
          var s = "";
          var a1 = fade(T, TBB[BRK] + 0.5, 0.3) * (1 - fade(T, S4 + 0.2, 0.4));
          s += txt(X(BRK), YR(2.05) - 8, "2.05x on the break", C.up, 12, "middle", 800, a1);
          var a2 = fade(T, S4 + 0.4, 0.4);
          if (a2 > 0 && last >= 12) {
            var x1 = X(Math.min(last, NB - 1));
            s += rect(X(12) - 6, YR(1.8), x1 - X(12) + 12, YR(1.7) - YR(1.8), C.blue, 2, 0.25 * a2);
            s += txt(X(12), YR(1.86) - 8, "settles 1.7–1.8x and holds", C.blue, 12, "start", 700, a2 * (1 - 0.5 * fade(T, S5 + 2, 0.4)));
          }
          var aP = fade(T, TBB[12] + 0.5, 0.3) * (1 - fade(T, S5 + 0.4, 0.3));
          if (aP > 0) s += '<circle cx="' + X(12).toFixed(1) + '" cy="' + YP(155.3).toFixed(1) + '" r="8" fill="none" stroke="' + C.cyan + '" stroke-width="2" opacity="' + aP.toFixed(3) + '"/>' +
            txt(X(12), YP(155.3) + 26, "pullback holds 155", C.cyan, 12, "middle", 700, aP);
          var aE = fade(T, TBB[21] + 0.5, 0.4);
          s += callout(X(NB - 1) + 4, YP(154.3), ["Price + participation", "the move toward 175 came next"], C.up, aE, true);
          return s;
        }
      };
      var aA = n ? 1 - fade(T, S3, 0.35) : 1;
      var aBp = n ? fade(T, S3 + 0.25, 0.4) : fade(T, S3, 0.4);
      s += panel(T, L, PA, aA);
      s += panel(T, L, PB, aBp);
      if (!n && aBp < 1) s += txt(875, 300, "same level, another day…", C.faint, 14, "middle", 600, 1 - aBp);
      s += txt(L.W - 20, L.H - 8, "Illustrative", C.faint, 11, "end");
      return s;
    }
    return { stages: ST, end: END, frame: frame, size: size };
  }

  /* =====================================================================
     the four readings: tiny static histograms
     ===================================================================== */
  var SPARKS = {
    increasing: [0.9, 1.0, 1.1, 1.3, 1.5, 1.8, 2.1, 2.4, 2.6],
    holding:    [1.5, 2.1, 2.0, 1.9, 1.85, 1.8, 1.82, 1.8, 1.81],
    fading:     [2.6, 2.4, 2.1, 1.8, 1.5, 1.25, 1.05, 0.9, 0.8],
    absent:     [0.7, 0.75, 0.72, 0.8, 0.78, 0.74, 0.76, 0.73, 0.75]
  };
  function spark(el) {
    var d = SPARKS[el.getAttribute("data-rvol-spark")]; if (!d) return;
    var W = 180, H = 64, base = 60, sc = 18, s = "";
    d.forEach(function (v, j) {
      var y = base - v * sc;
      s += rect(8 + j * 19, y, 12, base - y, rvCol(v), 1.5, j > 0 && v < d[j - 1] - 0.005 ? 0.55 : 1);
    });
    s += line(2, base - sc, W - 2, base - sc, C.dim, 1, "4 3", 0.8);
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" aria-hidden="true">' + s + "</svg>";
  }

  var SPECS = { self: selfSpec, cum: cumSpec, "break": breakSpec };
  document.querySelectorAll("[data-rvol-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-rvol-anim")];
    if (f) player(root, f());
  });
  document.querySelectorAll("[data-rvol-spark]").forEach(spark);
  window.RVOLAnim = { _specs: SPECS };          // exposed for checks in testing
})();
