/* =====================================================================
   lwr-anim.js — the four animated walkthroughs on let-winners-run.html.

     [data-lwr-anim="ev"]     same entries, different exits: why a lower
                              win rate with bigger winners makes more
     [data-lwr-anim="one"]    the One Below rule: out on the first close
                              below the previous candle's low
     [data-lwr-anim="atr"]    the ATR trail: highest high of the previous
                              10 candles minus ATR(14), out on a close below
     [data-lwr-anim="levels"] key levels: raise the exit to each new pause,
                              out on a close below the latest one

   All bars are scripted and labelled "Illustrative". The worked numbers
   (One Below 325 / 324 and +22%; ATR 341 − 14 = 327) are the ones stated
   in the reference video. No market data.
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

  /* =====================================================================
     1 · expected value: same entries, different exits
     ===================================================================== */
  function evSpec() {
    var B = [[98.6, 99.4, 98.3, 99.1], [99.1, 99.6, 98.8, 99.3], [99.3, 99.9, 99.0, 99.6], [99.6, 100.3, 99.4, 100.0],
      [100.0, 101.2, 99.8, 101.0], [101.0, 102.4, 100.8, 102.2], [102.2, 103.6, 102.0, 103.4], [103.4, 104.1, 102.9, 103.8],
      [103.8, 105.6, 103.6, 105.4], [105.4, 107.0, 105.1, 106.8], [106.8, 108.6, 106.5, 108.2], [108.2, 108.4, 106.6, 107.1],
      [107.1, 107.5, 105.8, 106.0], [106.0, 106.4, 104.9, 105.2]];
    var ENTRY = 100, STOP = 98, TGT = 102, YOUBAR = 5, PROBAR = 12, PROX = 106;
    var G = geo({ yt: 70, yb: 430, pmin: 96.5, pmax: 109.5, x0: 80, dx: 36 });
    var TB = timeline(B.length, [[0, 3, 0.5, 0.45], [4, 5, 6.2, 0.6], [6, 13, 9.6, 0.42]]);
    var YOU = [1, 1, -1, 1, 1, -1, 1, -1, 1, -1], PRO = [3, -1, -1, 3, -1, 3, -1, -1, 3, -1];
    var T5 = 14.4, STEP = 0.42, T6 = T5 + 10 * STEP + 1.4, END = T6 + 4.5;
    var ST = [
      { at: 0, title: "Same setup, same entry", text: "You and a profitable trader see the same setup and buy at the same price, 100.00. Same strategy, same moment." },
      { at: 3.4, title: "Same stop", text: "Both of you would exit a loser at the same place, 98.00. One unit of risk (1R) is 2.00. You already keep losers in check. That part isn't the problem." },
      { at: 6.0, title: "You sell at your target", text: "Price reaches your fixed target, 102.00, and you lock in +1R. Then you watch it keep going without you." },
      { at: 9.4, title: "The pro lets the move decide", text: "The pro has no fixed target. They never sell a green candle, and hold until price shows weakness: here, the first close below the previous candle's low, at 106.00. That's +3R." },
      { at: T5, title: "Run it ten times", text: "Same ten entries, same stops. You win 6 of 10 at +1R. The pro wins only 4 of 10, but each win is +3R. You finish +2R; the pro finishes +6R." },
      { at: T6, title: "The math", text: "Expected value per trade = win rate × average win − loss rate × average loss. You: +0.2R a trade. The pro: +0.6R, three times as much, with a lower win rate." }
    ];
    function frame(T) {
      var s = "", last = lastBar(T, TB);
      s += txt(80, 40, "One trade · illustrative", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
      s += grid(G, 98, 108, 2, 60, 600, 640);
      for (var i = 0; i < B.length; i++) {
        var pr = progress(T, TB, i), after = i > PROBAR;
        if (pr > 0) s += candle(G, i, B[i], pr, 16, after ? 0.35 : 1);
      }
      var a1 = fade(T, TB[3][1], 0.3), xe = G.x(3);
      if (a1 > 0) {
        s += hline(G, xe, 600, ENTRY, C.blue, null, 1.5, a1) + txt(xe + 14, G.y(ENTRY) + 18, "both buy 100.00", C.blue, 12, "start", 600, a1);
      }
      var a2 = fade(T, 3.4, 0.4);
      s += hline(G, xe, 600, STOP, C.dn, "5 4", 1.5, a2) + txt(596, G.y(STOP) + 16, "same stop · 98.00 (1R = 2.00)", C.dn, 12, "end", 600, a2);
      var a3 = fade(T, TB[YOUBAR][1], 0.3);
      if (a3 > 0) {
        s += hline(G, xe, 600, TGT, C.grey, "3 4", 1.2, a3 * 0.8);
        s += '<circle cx="' + G.x(YOUBAR) + '" cy="' + G.y(TGT) + '" r="7" fill="none" stroke="' + C.gold + '" stroke-width="2" opacity="' + a3.toFixed(3) + '"/>';
        s += callout(G.x(YOUBAR) - 16, G.y(105.6), ["You: sold at the target", "102.00 · +1R"], C.gold, a3 * (1 - 0.35 * fade(T, T5, 0.5)), true);
      }
      var a4 = fade(T, TB[PROBAR][1], 0.3);
      if (a4 > 0) {
        s += hline(G, G.x(PROBAR - 1) - 10, G.x(PROBAR) + 14, B[PROBAR - 1][2], C.cyan, "4 3", 1.4, a4);
        s += '<circle cx="' + G.x(PROBAR) + '" cy="' + G.y(PROX) + '" r="7" fill="none" stroke="' + C.up + '" stroke-width="2" opacity="' + a4.toFixed(3) + '"/>';
        s += callout(G.x(PROBAR + 1) + 10, G.y(103.4), ["Pro: out on weakness", "106.00 · +3R"], C.up, a4, true);
      }
      var a35 = fade(T, TB[8][1], 0.3) * (1 - fade(T, TB[PROBAR][0], 0.3));
      s += txt(G.x(8), G.y(B[8][1]) - 14, "never sells a green candle", C.up, 12, "middle", 600, a35);
      /* the tally */
      var a5 = fade(T, T5 - 0.2, 0.4);
      if (a5 > 0) {
        var X0 = 680, s5 = '<g opacity="' + a5.toFixed(3) + '"><rect x="660" y="56" width="490" height="400" rx="14" fill="#161617" stroke="#3a3a3c"/>';
        s5 += txt(684, 92, "Ten trades, same entries and stops", C.ink, 15, "start", 700);
        [["You · fixed target", YOU, 150, C.gold, 120], ["Pro · lets winners run", PRO, 290, C.up, 236]].forEach(function (row) {
          var tot = 0, wins = 0, shownN = 0;
          s5 += txt(684, row[4], row[0], row[3], 14, "start", 700);
          row[1].forEach(function (r, k) {
            var a = fade(T, T5 + k * STEP, 0.25);
            if (a <= 0) return;
            shownN++; tot += r; if (r > 0) wins++;
            var cx = X0 + k * 44, h = Math.abs(r) * 22, top = r > 0 ? row[2] + 40 - h : row[2] + 40;
            s5 += '<rect x="' + cx + '" y="' + top + '" width="34" height="' + h + '" rx="3" fill="' + (r > 0 ? C.up : C.dn) + '" opacity="' + (0.85 * a).toFixed(3) + '"/>';
            s5 += txt(cx + 17, r > 0 ? top - 6 : top + h + 15, (r > 0 ? "+" : "−") + Math.abs(r), C.dim, 11, "middle", null, a);
          });
          s5 += '<line x1="' + (X0 - 6) + '" x2="' + (X0 + 440) + '" y1="' + (row[2] + 40) + '" y2="' + (row[2] + 40) + '" stroke="#48484a"/>';
          if (shownN) s5 += txt(1128, row[4], wins + " of " + shownN + " won · " + (tot >= 0 ? "+" : "−") + Math.abs(tot) + "R", C.ink, 14, "end", 700);
        });
        s += s5 + "</g>";
      }
      var a6 = fade(T, T6, 0.5);
      if (a6 > 0) {
        var y0 = 378;
        s += '<g opacity="' + a6.toFixed(3) + '"><rect x="672" y="' + y0 + '" width="466" height="70" rx="10" fill="' + C.box + '" stroke="' + C.ink + '" stroke-opacity="0.25"/>' +
          txt(688, y0 + 22, "EV per trade = win% × avg win − loss% × avg loss", C.ink, 13, "start", 700) +
          txt(688, y0 + 42, "You: 0.6 × 1R − 0.4 × 1R = +0.2R", C.gold, 13, "start", 600) +
          txt(688, y0 + 60, "Pro: 0.4 × 3R − 0.6 × 1R = +0.6R  → 3× more per trade", C.up, 13, "start", 600) + "</g>";
      }
      return s;
    }
    return { stages: ST, end: END, frame: frame, focus: function (T) { return T < T5 - 0.3 ? 360 : 900; } };
  }

  /* =====================================================================
     2 · One Below: out on the first close below the previous low
     ===================================================================== */
  function oneSpec() {
    var B = [[262, 264, 261, 263], [263, 265, 262, 264], [264, 265.2, 263, 264.6], [264.6, 272, 264.4, 271],
      [271, 280, 270.5, 279], [279, 284, 276, 283], [283, 286, 278.5, 280], [280, 281, 277, 280.5],
      [280.5, 292, 280, 291], [291, 298, 289, 297], [297, 299, 292, 294], [294, 295, 288, 293.5],
      [293.5, 305, 293, 304], [304, 312, 302, 311], [311, 318, 309, 316], [316, 321, 312, 314],
      [314, 323, 313, 322], [322, 330, 320, 328], [328, 334, 325, 326.5], [326.5, 327, 321.5, 324],
      [324, 325, 316, 318], [318, 320, 312, 315], [315, 319, 313, 317], [317, 318, 309, 311]];
    var ENTRY = 265.5, IN = 3, OUT = 19, WICKS = [7, 11], FIVE = 4;
    var G = geo({ yt: 50, yb: 450, pmin: 255, pmax: 340, x0: 70, dx: 40 });
    var TB = timeline(B.length, [[0, 2, 0.4, 0.4], [3, 3, 2.0, 1.0], [4, 6, 3.4, 0.55], [7, 7, 7.0, 1.2], [8, 10, 8.6, 0.5], [11, 11, 10.4, 1.2], [12, 18, 12.0, 0.5], [19, 19, 16.4, 1.6], [20, 23, 22.5, 0.4]]);
    var END = TB[23][1] + 1.2;
    var ST = [
      { at: 0, title: "In on the breakout", text: "Price breaks out and you buy at 265.50. From this moment, one rule handles both the stop and the profit." },
      { at: 3.2, title: "The rule", text: "Exit on the first candle that CLOSES below the previous candle's low. The dashed step under each candle is that candle's line: the low of the one before it." },
      { at: 6.8, title: "Wicks don't count", text: "This candle trades below the previous low but closes back above it. No exit. Only a close below the line gets you out, so the wicks don't shake you out." },
      { at: 12.0, title: "Never sell a green candle", text: "Up 5% on the first candle is where most traders sell. The rule keeps you in while every close holds above the previous low." },
      { at: 16.2, title: "The close below", text: "This candle closes at 324.00, one dollar under the previous candle's low of 325.00. That's the exit." },
      { at: 18.8, title: "+22% instead of +5%", text: "In at 265.50, out at 324.00: about +22%. The same rule would have cut a loser just as fast, which keeps your losers small too." }
    ];
    function frame(T) {
      var s = "", last = lastBar(T, TB);
      s += txt(70, 30, "Illustrative · levels as stated in the reference video", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
      s += grid(G, 260, 340, 10, 50, 1000, 1150);
      /* the one-below steps: under bar i, the low of bar i−1 */
      var aR = fade(T, 3.2, 0.4);
      for (var i = IN + 1; i <= Math.min(last, OUT); i++) {
        var lv = B[i - 1][2], x = G.x(i), hot = i === OUT, wick = WICKS.indexOf(i) >= 0;
        s += '<line x1="' + (x - 18) + '" x2="' + (x + 18) + '" y1="' + G.y(lv).toFixed(1) + '" y2="' + G.y(lv).toFixed(1) + '" stroke="' + (hot ? C.dn : C.cyan) + '" stroke-width="' + (hot || wick ? 2.2 : 1.4) + '" stroke-dasharray="4 3" opacity="' + (aR * (hot || wick ? 1 : 0.7)).toFixed(3) + '"/>';
      }
      for (i = 0; i < B.length; i++) {
        var pr = progress(T, TB, i);
        if (pr > 0) s += candle(G, i, B[i], pr, 20, i > OUT ? 0.35 : 1);
      }
      var aE = fade(T, TB[IN][1], 0.3);
      s += hline(G, G.x(IN), 1000, ENTRY, C.blue, null, 1.4, aE) + tag(G, 1012, ENTRY, "Entry 265.50", C.blue, aE, "#fff");
      s += callout(G.x(IN) + 22, G.y(268), ["Breakout · buy 265.50"], C.blue, aE * (1 - fade(T, 6.8, 0.4)));
      s += callout(G.x(5) + 14, G.y(300), ["Out on the first CLOSE", "below the previous low"], C.cyan, aR * (1 - fade(T, 6.8, 0.4)));
      WICKS.forEach(function (w, k) {
        var a = fade(T, TB[w][1], 0.3);
        if (a <= 0) return;
        s += '<circle cx="' + G.x(w) + '" cy="' + G.y(B[w][2]).toFixed(1) + '" r="7" fill="none" stroke="' + C.cyan + '" stroke-width="2" opacity="' + a.toFixed(3) + '"/>';
        s += txt(G.x(w), G.y(B[w][2]) + 24, "wick · stay in", C.cyan, 12, "middle", 600, a * (1 - 0.5 * fade(T, 16.2, 0.4)));
        if (k === 0) s += callout(G.x(w) + 20, G.y(268) + 20, ["Low 277 < previous low 278.50", "Close 280.50 is above it: no exit"], C.cyan, a * (1 - fade(T, 12.0, 0.4)));
      });
      var a5 = fade(T, TB[FIVE][1], 0.3) * (1 - fade(T, 16.2, 0.4));
      if (a5 > 0) {
        s += txt(G.x(FIVE) - 16, G.y(B[FIVE][3]) + 4, "+5% · most sell here", C.gold, 12, "end", 700, fade(T, 12.0, 0.4) * a5 + 0.001);
      }
      var aX = fade(T, TB[OUT][1], 0.3);
      if (aX > 0) {
        s += '<circle cx="' + G.x(OUT) + '" cy="' + G.y(B[OUT][3]).toFixed(1) + '" r="8" fill="none" stroke="' + C.dn + '" stroke-width="2.2" opacity="' + aX.toFixed(3) + '"/>';
        s += callout(G.x(OUT) - 24, G.y(312), ["Close 324.00 < previous low 325.00", "EXIT on this close"], C.dn, aX, true);
        s += hline(G, G.x(OUT), 1000, 324, C.dn, "5 4", 1.4, aX) + tag(G, 1012, 324, "Exit 324.00", C.dn, aX, "#fff");
      }
      var aF = fade(T, 18.8, 0.4);
      if (aF > 0) {
        var bx = 986;
        s += '<g opacity="' + aF.toFixed(3) + '"><line x1="' + bx + '" x2="' + bx + '" y1="' + G.y(ENTRY) + '" y2="' + G.y(324) + '" stroke="' + C.up + '" stroke-width="2"/>' +
          txt(bx - 10, G.y(295) + 4, "+22%", C.up, 22, "end", 800) + "</g>";
      }
      return s;
    }
    return { stages: ST, end: END, frame: frame, focus: function (T) { var k = lastBar(T, TB); return G.x(Math.max(0, k)) + 120; } };
  }

  /* =====================================================================
     3 · the ATR trail: highest high (previous 10) − ATR(14)
     ===================================================================== */
  function atrSpec() {
    var B = [[278, 280, 276.5, 279], [279, 281, 277, 278], [278, 281.5, 277.5, 281], [281, 282.5, 279, 280], [280, 283, 279.5, 282.5], [282.5, 283.5, 281, 283],
      [283, 290, 282.5, 289], [289, 296, 287, 295], [295, 301, 292, 299], [299, 303, 294, 296], [296, 302, 293, 301], [301, 309, 299, 308],
      [308, 314, 305, 312], [312, 316, 306, 309], [309, 313, 304, 311], [311, 319, 309, 318], [318, 325, 315, 323], [323, 327, 316, 318],
      [318, 324, 314, 322], [322, 330, 320, 329], [329, 335, 326, 333], [333, 337, 327, 331], [331, 336, 326, 334], [334, 339, 331, 337],
      [337, 341, 333, 335], [335, 337, 329, 331], [331, 334, 327.5, 330], [330, 332, 326, 329], [329, 330, 325.5, 328], [328, 331, 325, 327.6],
      [327.6, 328.5, 323.5, 326.4], [326.4, 327, 320, 321.5], [321.5, 323, 316, 318]];
    var N = B.length, ENTRY = 284, IN = 6, OUT = 30, PEAK = 24, WICKS = [28, 29];
    var ATR = B.map(function (b, i) { return i < IN ? 4 + i * 0.3 : i >= PEAK ? 14 : 6 + (i - IN) / (PEAK - IN) * 8; });
    /* the line under bar i: highest high of the previous 10 candles minus ATR of the previous candle */
    var LINE = B.map(function (b, i) {
      if (i < 1) return null;
      var hh = -Infinity; for (var k = Math.max(0, i - 10); k < i; k++) hh = Math.max(hh, B[k][1]);
      return hh - ATR[i - 1];
    });
    var G = geo({ yt: 46, yb: 372, pmin: 268, pmax: 348, x0: 70, dx: 28 });
    var GA = geo({ yt: 402, yb: 478, pmin: 0, pmax: 16, x0: 70, dx: 28 });
    var TB = timeline(N, [[0, 5, 0.4, 0.32], [6, 6, 2.6, 0.8], [7, 23, 6.0, 0.36], [24, 24, 12.2, 0.8], [25, 27, 13.2, 0.45], [28, 29, 15.0, 1.0], [30, 30, 17.6, 1.4], [31, 32, 22.0, 0.4]]);
    var END = TB[32][1] + 1.2;
    var ST = [
      { at: 0, title: "ATR measures volatility", text: "ATR(14) is the average true range of the last 14 candles, in dollars. A wild ticker has a big ATR; a calm one has a small ATR. The panel below tracks it live." },
      { at: 3.6, title: "The trail: highest high minus ATR", text: "The cyan line is the highest high of the previous 10 candles minus the current ATR. A volatile ticker gets more room; a quiet one gets a tighter exit." },
      { at: 6.0, title: "New highs lift the line", text: "Every candle that makes a new high pulls the line up behind it. You let the stock keep making highs, always one ATR of breathing room below the latest one." },
      { at: 14.8, title: "Below the line, but closed above", text: "These two candles trade below the line and close back above it. No exit. You wait for a close, not a touch." },
      { at: 17.4, title: "The close below: out", text: "Highest high 341 minus ATR 14 puts the line at 327. This candle closes at 326.40, below it. That's the exit." },
      { at: 19.6, title: "Kept +15% of a +20% run", text: "In at 284.00, peak 341 (+20%), out at 326.40 (+15%). You give some back at the end, but you'd never have held for +15% with a fixed target." }
    ];
    function frame(T) {
      var s = "", last = lastBar(T, TB);
      s += txt(70, 30, "Illustrative · 341 − 14 = 327 as stated in the reference video", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
      s += grid(G, 270, 340, 10, 50, 1010, 1150);
      /* ATR panel */
      s += '<line x1="50" x2="1010" y1="' + GA.yb + '" y2="' + GA.yb + '" stroke="rgba(255,255,255,0.1)"/>' + txt(54, GA.yt - 6, "ATR(14), dollars", C.faint, 11);
      if (last >= 0) {
        var pts = []; for (var i = 0; i <= last; i++) pts.push(GA.x(i).toFixed(1) + "," + GA.y(ATR[i]).toFixed(1));
        s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.gold + '" stroke-width="2"/>';
        s += txt(GA.x(last) + 10, GA.y(ATR[last]) + 4, ATR[last].toFixed(1), C.gold, 12, "start", 700);
      }
      /* the trail */
      var aL = fade(T, 3.6, 0.5);
      if (aL > 0 && last > IN) {
        var lp = [];
        for (i = IN + 1; i <= Math.min(last, OUT); i++) {
          lp.push((G.x(i) - 12).toFixed(1) + "," + G.y(LINE[i]).toFixed(1));
          lp.push((G.x(i) + 12).toFixed(1) + "," + G.y(LINE[i]).toFixed(1));
        }
        s += '<polyline points="' + lp.join(" ") + '" fill="none" stroke="' + C.cyan + '" stroke-width="2.4" opacity="' + aL.toFixed(3) + '"/>';
        var li = Math.min(last, OUT);
        if (li > IN) s += txt(G.x(li) + 16, G.y(LINE[li]) + 4, "trail " + f2(LINE[li]), C.cyan, 12, "start", 700, aL * (1 - fade(T, 19.6, 0.4)));
      }
      for (i = 0; i < N; i++) {
        var pr = progress(T, TB, i);
        if (pr > 0) s += candle(G, i, B[i], pr, 14, i > OUT ? 0.35 : 1);
      }
      var aE = fade(T, TB[IN][1], 0.3);
      s += hline(G, G.x(IN), 1010, ENTRY, C.blue, null, 1.3, aE) + txt(G.x(IN) + 12, G.y(ENTRY) + 18, "entry 284.00", C.blue, 12, "start", 600, aE);
      s += callout(G.x(12), G.y(282), ["Trail = highest high (10) − ATR(14)", "Exit on a close below it"], C.cyan, fade(T, 3.6, 0.4) * (1 - fade(T, 14.8, 0.4)));
      var aH = fade(T, 6.6, 0.4) * (1 - fade(T, 14.8, 0.4));
      [11, 15, 19, 24].forEach(function (k) {
        if (T < TB[k][1]) return;
        s += '<path d="M' + G.x(k) + ' ' + (G.y(B[k][1]) - 8) + ' l-5 -8 h10 z" fill="' + C.up + '" opacity="' + aH.toFixed(3) + '"/>';
      });
      s += txt(G.x(19), G.y(343), "new highs pull the line up", C.up, 12, "middle", 700, aH);
      WICKS.forEach(function (w) {
        var a = fade(T, TB[w][1], 0.3);
        if (a <= 0) return;
        s += '<circle cx="' + G.x(w) + '" cy="' + G.y(B[w][2]).toFixed(1) + '" r="6" fill="none" stroke="' + C.cyan + '" stroke-width="2" opacity="' + a.toFixed(3) + '"/>';
      });
      s += callout(G.x(27) - 10, G.y(306), ["Traded below the line,", "closed above it: stay in"], C.cyan, fade(T, TB[29][1], 0.3) * (1 - fade(T, 17.4, 0.4)), true);
      var aX = fade(T, TB[OUT][1], 0.3);
      if (aX > 0) {
        s += '<circle cx="' + G.x(OUT) + '" cy="' + G.y(B[OUT][3]).toFixed(1) + '" r="8" fill="none" stroke="' + C.dn + '" stroke-width="2.2" opacity="' + aX.toFixed(3) + '"/>';
        s += callout(G.x(OUT) - 22, G.y(300), ["341 − 14 = 327", "Close 326.40 < 327: EXIT"], C.dn, aX, true);
      }
      var aF = fade(T, 19.6, 0.4);
      if (aF > 0) {
        s += hline(G, G.x(PEAK), 1010, 341, C.grey, "2 4", 1, aF) + txt(1006, G.y(341) - 6, "peak 341 · +20%", C.grey, 12, "end", 600, aF);
        s += hline(G, G.x(OUT), 1010, 326.4, C.up, "5 4", 1.4, aF) + txt(1006, G.y(326.4) + 18, "out 326.40 · +15%", C.up, 13, "end", 800, aF);
      }
      return s;
    }
    return { stages: ST, end: END, frame: frame, focus: function (T) { var k = lastBar(T, TB); return G.x(Math.max(0, k)) + 100; }, _check: { B: B, LINE: LINE, IN: IN, OUT: OUT } };
  }

  /* =====================================================================
     4 · key levels: raise the exit to each new pause
     ===================================================================== */
  function levelSpec() {
    var B = [[48.6, 49.4, 48.3, 49.1], [49.1, 49.6, 48.8, 49.2], [49.2, 49.9, 49.0, 49.7], [49.7, 49.95, 49.3, 49.5], [49.5, 49.9, 49.2, 49.8],
      [49.8, 51.2, 49.7, 51.0], [51.0, 52.3, 50.8, 52.1], [52.1, 53.6, 51.9, 53.4], [53.4, 54.4, 53.1, 54.2],
      [54.2, 54.5, 53.2, 53.5], [53.5, 54.0, 52.8, 53.9], [53.9, 54.3, 53.0, 53.2], [53.2, 54.1, 52.9, 54.0],
      [54.0, 55.6, 53.9, 55.4], [55.4, 56.9, 55.2, 56.7], [56.7, 58.2, 56.5, 58.0], [58.0, 58.6, 57.4, 58.4],
      [58.4, 58.5, 57.1, 57.3], [57.3, 58.1, 56.6, 57.9], [57.9, 58.3, 57.0, 57.2], [57.2, 57.9, 56.2, 57.6], [57.6, 58.0, 56.9, 57.1],
      [57.1, 57.4, 56.0, 56.3], [56.3, 56.6, 55.1, 55.4], [55.4, 55.9, 54.6, 55.0]];
    var N = B.length, ENTRY = 50, IN = 5, L1 = 52.8, L2 = 56.6, OUT = 22, WICK = 20;
    var G = geo({ yt: 50, yb: 450, pmin: 47.5, pmax: 59.8, x0: 80, dx: 36 });
    var TB = timeline(N, [[0, 4, 0.4, 0.34], [5, 5, 2.2, 0.9], [6, 8, 4.0, 0.55], [9, 12, 6.2, 0.5], [13, 16, 10.0, 0.5], [17, 19, 12.4, 0.5], [20, 20, 14.6, 1.2], [21, 21, 16.2, 0.6], [22, 22, 17.2, 1.4], [23, 24, 21.6, 0.4]]);
    var END = TB[24][1] + 1.2;
    var ST = [
      { at: 0, title: "Get in as the wave starts", text: "Like a surfer, you don't paddle out and hope. You wait for the move to start, then get in on the breakout: 50.00." },
      { at: 3.8, title: "Never sell a green candle", text: "The stock runs. No target, no selling into strength. You let it show you everything it's got." },
      { at: 6.0, title: "Mark the pause", text: "It stalls and chops. The bottom of that pause, 52.80, becomes your exit level: a close below it says the wave is fading." },
      { at: 9.8, title: "Raise it on the next leg", text: "It rips again and pauses again. Your exit moves up to the new pause, 56.60. The old level no longer matters." },
      { at: 14.4, title: "A wick through: hold", text: "This candle dips under 56.60 but closes back above it. Still riding the wave." },
      { at: 17.0, title: "The close below: off the board", text: "A close at 56.30, under 56.60. The wave is dissipating, so you step off: about +12.6% from 50.00." }
    ];
    function band(p, a, label, col) {
      if (a <= 0) return "";
      return '<g opacity="' + a.toFixed(3) + '"><rect x="60" y="' + (G.y(p) - 1).toFixed(1) + '" width="950" height="2" fill="' + col + '"/>' +
        txt(64, G.y(p) - 8, label, col, 12, "start", 700) + "</g>";
    }
    function frame(T) {
      var s = "";
      s += txt(80, 30, "Illustrative · you choose the levels", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
      s += grid(G, 48, 59, 1, 60, 1010, 1150);
      var a1 = fade(T, TB[12][1], 0.4) * (1 - 0.75 * fade(T, TB[19][1], 0.5)), a2 = fade(T, TB[19][1], 0.4);
      /* shade the two pauses */
      [[9, 12, a1 > 0 ? fade(T, TB[12][1], 0.4) : 0], [17, 19, a2]].forEach(function (z) {
        if (z[2] <= 0) return;
        s += '<rect x="' + (G.x(z[0]) - 16) + '" y="' + G.y(58.9) + '" width="' + (G.x(z[1]) - G.x(z[0]) + 32) + '" height="' + (G.y(47.6) - G.y(58.9)) + '" fill="' + C.gold + '" opacity="' + (0.06 * z[2]).toFixed(3) + '"/>';
      });
      s += band(L1, a1, "level 1 · 52.80", C.gold) + band(L2, a2, "level 2 · 56.60 · active exit", C.gold);
      for (var i = 0; i < N; i++) {
        var pr = progress(T, TB, i);
        if (pr > 0) s += candle(G, i, B[i], pr, 18, i > OUT ? 0.35 : 1);
      }
      var aE = fade(T, TB[IN][1], 0.3);
      s += hline(G, G.x(IN), 1010, ENTRY, C.blue, null, 1.3, aE) + txt(G.x(IN) + 14, G.y(ENTRY) + 18, "in on the breakout · 50.00", C.blue, 12, "start", 600, aE);
      var aG = fade(T, 3.8, 0.4) * (1 - fade(T, 6.0, 0.4));
      s += txt(G.x(7), G.y(54.9), "hold every green candle", C.up, 12, "middle", 700, aG);
      s += callout(G.x(13), G.y(51.6), ["The pause sets the level", "Exit on a close below 52.80"], C.gold, fade(T, TB[12][1], 0.3) * (1 - fade(T, 9.8, 0.4)));
      s += callout(G.x(14), G.y(51.9), ["New leg, new pause", "Exit level moves up to 56.60"], C.gold, fade(T, TB[19][1], 0.3) * (1 - fade(T, 14.4, 0.4)));
      var aW = fade(T, TB[WICK][1], 0.3);
      if (aW > 0) {
        s += '<circle cx="' + G.x(WICK) + '" cy="' + G.y(B[WICK][2]).toFixed(1) + '" r="6" fill="none" stroke="' + C.cyan + '" stroke-width="2" opacity="' + aW.toFixed(3) + '"/>';
        s += txt(G.x(WICK), G.y(B[WICK][2]) + 22, "wick · hold", C.cyan, 12, "middle", 700, aW);
      }
      var aX = fade(T, TB[OUT][1], 0.3);
      if (aX > 0) {
        s += '<circle cx="' + G.x(OUT) + '" cy="' + G.y(B[OUT][3]).toFixed(1) + '" r="8" fill="none" stroke="' + C.dn + '" stroke-width="2.2" opacity="' + aX.toFixed(3) + '"/>';
        s += callout(G.x(OUT) + 18, G.y(54.4), ["Close 56.30 < 56.60", "EXIT · about +12.6%"], C.dn, aX);
      }
      return s;
    }
    return { stages: ST, end: END, frame: frame, focus: function (T) { var k = lastBar(T, TB); return G.x(Math.max(0, k)) + 120; } };
  }

  var SPECS = { ev: evSpec, one: oneSpec, atr: atrSpec, levels: levelSpec };
  document.querySelectorAll("[data-lwr-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-lwr-anim")];
    if (f) player(root, f());
  });
  window.LWRAnim = { _specs: SPECS };          // exposed for the rule checks in testing
})();
