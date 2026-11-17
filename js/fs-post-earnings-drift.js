/* =====================================================================
   fs-post-earnings-drift.js — walkthroughs on
   famous-strategies/post-earnings-drift.html (Bernard and Thomas, 1989, 1990).

     surprise  expected vs reported earnings, the SUE score, ten deciles
     drift     made-up cumulative abnormal returns for the deciles, fanning out
     next      the drift bunching at the next three reports, and the
               autocorrelations investors don't price (0.34, 0.19, 0.06, -0.24)
     fade      the long-short spread shrinking over the decades (Kettell et al.)
     trade     a trader's version: a big beat, a gap that holds, weeks of drift
   Uses js/fs-kit.js. Paper figures are labelled; every price path is made up.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win, ease = K.ease,
      lerp = K.lerp, track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, hbar = K.hbar, pct = K.pct, arrow = K.arrow, frameRect = K.frameRect,
      rng = K.rng, mkBars = K.mkBars, drawBars = K.drawBars, sizeStd = K.sizeStd, clamp01 = K.clamp01, fmt = K.fmt, bracket = K.bracket;

  /* 1 · the surprise, scored and sorted */
  function surpriseSpec() {
    var ST = [
      { at: 0, title: "What was expected", text: "Bernard and Thomas measured the surprise against a simple forecast: the same quarter last year, plus the company's usual growth (a seasonal random walk with drift). Here the forecast is $1.00 a share." },
      { at: 3.4, title: "What was reported", text: "The company reports $1.18. The raw surprise is 18 cents. But 18 cents means something different for a steady utility than for a chip maker whose earnings jump around." },
      { at: 6.6, title: "Scale it: the SUE", text: "So the surprise is divided by how much this company's earnings usually miss the forecast. That's the standardized unexpected earnings, SUE. 18 cents against a usual miss of 6 cents is a SUE of 3: a big beat." },
      { at: 10, title: "Sort every company", text: "Every quarter, every company that reported gets a SUE, and they're sorted into ten groups. Decile 10 is the biggest positive surprises, decile 1 the biggest negative. The strategy buys 10 and shorts 1." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var lo = 0, hi = 1.4, Y = function (v) { return g.y1 - 40 - (v - lo) / (hi - lo) * (g.y1 - 40 - g.y0 - 30); };
        var sortOp = fade(T, 10.2, 0.5), barsOp = 1 - sortOp;
        if (barsOp > 0) {
          var bw = n ? 90 : 120, x1 = n ? g.x0 + 40 : g.x0 + 120, x2 = n ? g.x0 + 190 : g.x0 + 330;
          s += line(g.x0, Y(0), g.x1, Y(0), "#48484a", 1.2, null, barsOp);
          var e = ease(fade(T, 0.2, 1.2)), a = ease(fade(T, 3.6, 1.2));
          s += hbar(x1, Y(0), bw, Y(1.0 * e) - Y(0), C.blue, 0.85 * barsOp);
          post += txt(x1 + bw / 2, Y(1.0 * e) - 10, "$1.00", C.blue, 15, "middle", 700, barsOp * fade(T, 1, 0.4));
          post += txt(x1 + bw / 2, Y(0) + 20, "expected", C.dim, 12, "middle", 600, barsOp);
          if (a > 0) {
            s += hbar(x2, Y(0), bw, Y(1.18 * a) - Y(0), C.up, 0.9 * barsOp);
            post += txt(x2 + bw / 2, Y(1.18 * a) - 10, "$1.18", C.up, 15, "middle", 700, barsOp * fade(T, 4.4, 0.4));
            post += txt(x2 + bw / 2, Y(0) + 20, "reported", C.dim, 12, "middle", 600, barsOp);
          }
          var so = fade(T, 4.8, 0.4) * barsOp;
          if (so > 0) { s += rect(x2, Y(1.18), bw, Y(1.0) - Y(1.18), C.gold, 2, 0.5 * so); post += tag(x2 + bw + 8, (Y(1.0) + Y(1.18)) / 2, "surprise 18¢", C.gold, so, "start"); }
          var su = fade(T, 6.8, 0.5) * barsOp;
          if (su > 0) {
            var bx = n ? g.x0 + 10 : g.x0 + 470, by = n ? Y(0) + 46 : Y(1.0) - 30, bW = n ? 340 : 260;
            s += rect(bx, by, bW, 96, "#2c2c2e", 12, su);
            post += txt(bx + bW / 2, by + 30, "SUE = 18¢ ÷ 6¢ usual miss", C.dim, 13, "middle", 600, su);
            post += txt(bx + bW / 2, by + 70, "= 3.0", C.gold, 30, "middle", 800, su);
          }
        }
        if (sortOp > 0) {
          var D = 10, slot = (g.x1 - g.x0) / D, mid = n ? g.y0 + 280 : g.y0 + 230, sc = n ? 30 : 34;
          s += line(g.x0, mid, g.x1, mid, "#48484a", 1.2, null, sortOp);
          for (var d = 0; d < D; d++) {
            var v = -2.6 + d * 0.58, h = v * sc * ease(fade(T, 10.4 + d * 0.08, 0.5));
            var col = d === 9 ? C.up : d === 0 ? C.dn : "#48484a";
            s += hbar(g.x0 + d * slot + slot * 0.2, mid, slot * 0.6, -h, col, sortOp);
            post += txt(g.x0 + d * slot + slot / 2, v >= 0 ? mid + 18 : mid - 8, "D" + (d + 1), d === 9 ? C.up : d === 0 ? C.dn : C.faint, 11, "middle", 700, sortOp);
          }
          var lt = fade(T, 11.6, 0.4);
          post += tag(g.x0 + 9.5 * slot, mid - 2.6 * sc - 24, "BUY", C.up, lt, "middle");
          post += tag(g.x0 + 0.5 * slot, mid + 2.6 * sc + 26, "SHORT", C.dn, lt, "middle");
          post += txt(g.x0, g.y0 - (n ? 4 : 14), "SUE by decile · made-up quarter", C.faint, 12, "start", 600, sortOp);
        } else post += txt(g.x0, g.y0 - (n ? 4 : 14), "One company · made-up numbers", C.faint, 12, "start", 600);
        s += post;
        s += note2(g, ["The forecast", "Same quarter last year,", "plus usual growth."], C.blue, win(T, 0.3, 3.4));
        s += note2(g, ["The report", "$1.18 against $1.00:", "an 18¢ surprise."], C.up, win(T, 3.6, 6.6));
        s += note2(g, ["Standardize it", "Divide by the usual miss.", "18¢ ÷ 6¢ = SUE of 3."], C.gold, win(T, 6.8, 10));
        s += note2(g, ["Ten deciles", "Buy the biggest beats (D10),", "short the biggest misses (D1)."], C.up, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up numbers");
      }
    };
  }

  /* 2 · the drift: deciles fan out after the report */
  function driftSpec() {
    var D = [-3.1, -2.2, -1.5, -1.0, -0.4, 0.1, 0.6, 1.2, 1.8, 2.9];
    var ST = [
      { at: 0, title: "Day 0: the report", text: "Line every company up on its report day, grouped by its surprise decile, and follow its return beyond what the market did (the abnormal return) for the next 60 trading days, about a quarter." },
      { at: 2.6, title: "The news isn't fully priced", text: "If prices absorbed earnings news at once, every line would go flat after day 0. They don't. The good-news deciles keep rising and the bad-news deciles keep falling: the drift. The paths here are made up to show the shape." },
      { at: 7, title: "Long D10, short D1", text: "Buy the biggest beats, short the biggest misses, and hold for the quarter. In Bernard and Thomas's data that long-short position made money in 41 of 48 quarters from 1974 to 1985, and in 11 of the 16 quarters when the market fell." },
      { at: 10.6, title: "Stronger in smaller stocks", text: "The drift was larger for smaller companies, the ones with less analyst coverage and fewer professional investors watching. That's also where trading costs are highest." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (d) { return g.x0 + d / 60 * (g.x1 - g.x0); }, Y = function (v) { return g.y1 - (v + 4) / 8 * (g.y1 - g.y0); };
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Abnormal return by SUE decile" : "Cumulative abnormal return after the report, by SUE decile", C.faint, 12, "start", 600);
        for (var v = -4; v <= 4; v += 2) { s += line(g.x0, Y(v), g.x1, Y(v), v === 0 ? "#48484a" : "#2c2c2e", 1); s += txt(g.x1 + 6, Y(v) + 4, (v > 0 ? "+" : "") + v + "%", C.faint, 11); }
        [0, 20, 40, 60].forEach(function (d) { s += txt(X(d), g.y1 + 18, "day " + d, C.faint, 11, "middle"); });
        var upto = track([[0, 0], [2.6, 0], [6.8, 60]], T), r = rng(5);
        var hl = fade(T, 7.2, 0.4);
        D.forEach(function (fin, i) {
          var pts = [], w = 0, rr = rng(11 + i);
          for (var d = 0; d <= upto; d += 1) { w += (rr() - 0.5) * 0.18; pts.push([X(d), Y(fin * (1 - Math.pow(1 - d / 60, 1.3)) + w * Math.min(1, d / 10))]); }
          var col = i === 9 ? C.up : i === 0 ? C.dn : "#636366", op = (i === 9 || i === 0) ? 1 : 1 - 0.5 * hl;
          s += poly(pts, col, i === 9 || i === 0 ? 2.6 : 1.6, null, op);
          if (upto >= 59.5) post += txt(g.x1 - 4, Y(fin) + 4, "D" + (i + 1), col, 10.5, "end", 700, i === 9 || i === 0 ? 1 : 0.6 * (1 - hl));
        });
        s += dot(X(0), Y(0), 5, C.gold);
        post += tag(X(0) + 6, Y(0) - 18, "report", C.gold, 1, "start");
        if (hl > 0) { s += arrow(X(56), Y(-3.1), X(56), Y(2.9), C.gold, hl); post += tag(X(54), Y(0) + 4, "long − short", C.gold, hl, "end"); }
        var sm = fade(T, 10.8, 0.4);
        if (sm > 0) post += tag((g.x0 + g.x1) / 2, Y(3.6), n ? "bigger in small stocks" : "the drift was bigger in smaller companies", C.orange, sm, "middle");
        s += post;
        s += note2(g, ["Day 0", "Group every report by", "its surprise decile."], C.gold, win(T, 0.3, 2.6));
        s += note2(g, ["The drift", "Beats keep rising,", "misses keep falling."], C.up, win(T, 2.8, 7));
        s += note2(g, ["Long D10, short D1", "Up in 41 of 48 quarters,", "1974–1985; 11 of 16 when", "the market fell."], C.gold, win(T, 7.2, 10.6));
        s += note2(g, ["Small stocks", "Larger drift where fewer", "people are watching."], C.orange, fade(T, 10.8, 0.4));
        return s + stamp(L, n ? "Paths illustrative · counts: Bernard & Thomas" : "Paths illustrative · quarter counts: Bernard & Thomas (1989)");
      }
    };
  }

  /* 3 · it arrives at the next reports; the autocorrelations */
  function nextSpec() {
    var AC = [0.34, 0.19, 0.06, -0.24];
    var ST = [
      { at: 0, title: "The drift isn't smooth", text: "Follow the long-short position for three quarters after the report. Much of the drift comes in jumps, and the jumps land on the next earnings reports. The path here is made up to show the shape." },
      { at: 3.6, title: "25–30% in a few days", text: "Bernard and Thomas (1990) found about 25–30% of the drift happens in the three-day windows around the next earnings reports: roughly 5% of the trading days." },
      { at: 7, title: "Why: earnings repeat", text: "A surprise this quarter tends to be followed by smaller surprises in the same direction over the next three quarters, then a partial reversal a year later. The correlations of seasonally differenced earnings: 0.34, 0.19, 0.06 and −0.24." },
      { at: 10.6, title: "Prices act like they don't know", text: "Prices behave as if investors expect next quarter to look like last year's same quarter, ignoring that the surprise will partly repeat. When the next report confirms it, the price jumps again." }
    ];
    return {
      stages: ST, end: 14.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var acOp = fade(T, 7.2, 0.5), pathOp = 1 - acOp;
        if (pathOp > 0) {
          var X = function (d) { return g.x0 + d / 190 * (g.x1 - g.x0); }, Y = function (v) { return g.y1 - (v + 1) / 9 * (g.y1 - g.y0); };
          s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Long − short, three quarters" : "Long D10 − short D1 · three quarters after the report", C.faint, 12, "start", 600, pathOp);
          s += line(g.x0, Y(0), g.x1, Y(0), "#48484a", 1, null, pathOp);
          var E = [63, 126, 189], jmp = [1.6, 1.0, 0.5];
          var upto = track([[0, 0], [3.4, 190]], T), pts = [], v = 0, rr = rng(4);
          for (var d = 0; d <= upto; d++) {
            v += 0.012 + (rr() - 0.5) * 0.12;
            E.forEach(function (e, k) { if (d >= e - 1 && d <= e + 1) v += jmp[k] / 3; });
            pts.push([X(d), Y(v)]);
          }
          s += poly(pts, C.gold, 2.6, null, pathOp);
          var wo = fade(T, 3.8, 0.4) * pathOp;
          E.forEach(function (e, k) {
            if (wo <= 0) return;
            s += rect(X(e - 3), g.y0, X(e + 3) - X(e - 3), g.y1 - g.y0, C.blue, 0, 0.18 * wo);
            post += txt(X(e), g.y1 + 18, "report " + (k + 2), C.blue, 11, "middle", 700, wo);
          });
          if (wo > 0) post += tag((g.x0 + g.x1) / 2, Y(7.6), n ? "25–30% of drift, ~5% of days" : "about 25–30% of the drift in ~5% of the days", C.blue, wo, "middle");
        }
        if (acOp > 0) {
          var mid = n ? g.y0 + 250 : g.y0 + 210, sc = n ? 380 : 360, slot = (g.x1 - g.x0) / 4;
          post += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Earnings change correlation" : "Correlation of this quarter's surprise with the next four", C.faint, 12, "start", 600, acOp);
          s += line(g.x0, mid, g.x1, mid, "#48484a", 1.2, null, acOp);
          AC.forEach(function (a, k) {
            var gr = ease(fade(T, 7.4 + k * 0.5, 0.6)), h = a * sc * gr, x = g.x0 + k * slot + slot * 0.2;
            s += hbar(x, mid, slot * 0.6, -h, a >= 0 ? C.up : C.dn, acOp);
            post += txt(x + slot * 0.3, a >= 0 ? mid - h - 8 : mid - h + 18, (a > 0 ? "+" : "−") + Math.abs(a).toFixed(2), a >= 0 ? C.up : C.dn, 14, "middle", 800, acOp * fade(T, 7.8 + k * 0.5, 0.4));
            post += txt(x + slot * 0.3, a >= 0 ? mid + 18 : mid - 8, "Q+" + (k + 1), C.dim, 12, "middle", 700, acOp);
          });
          var pr = fade(T, 10.8, 0.4);
          if (pr > 0) post += tag((g.x0 + g.x1) / 2, mid + (n ? 150 : 130), n ? "prices act like it's 0, 0, 0, 0" : "prices behave as if these were all zero", C.orange, pr, "middle");
        }
        s += post;
        s += note2(g, ["In jumps", "The drift lands on", "the next reports."], C.gold, win(T, 0.3, 3.6));
        s += note2(g, ["25–30% of the drift", "in the 3-day windows", "around the next reports", "(Bernard & Thomas, 1990)."], C.blue, win(T, 3.8, 7));
        s += note2(g, ["Surprises repeat", "+0.34, +0.19, +0.06,", "then −0.24 a year out."], C.up, win(T, 7.2, 10.6));
        s += note2(g, ["The mispricing", "Investors act as if next", "quarter ignores this one."], C.orange, fade(T, 10.8, 0.4));
        return s + stamp(L, acOp > 0.5 ? "Figures: Bernard & Thomas (1990)" : "Path illustrative · share: Bernard & Thomas (1990)");
      }
    };
  }

  /* 4 · the edge has shrunk */
  function fadeSpec() {
    var ST = [
      { at: 0, title: "A famous anomaly", text: "Post-earnings drift was first documented by Ball and Brown in 1968 and became one of the most studied anomalies in finance. Being famous has a cost: more people trade it." },
      { at: 3.4, title: "The spread has shrunk", text: "Kettell, McInnis and Zhao (2022) found the return spread between the highest and lowest SUE groups fell from about 5% in the 1980s and 1990s to 3% or less by the late 2010s." },
      { at: 7, title: "Why it may have shrunk", text: "Their explanation is partly that the earnings surprises themselves have become less persistent. Faster news, algorithmic traders and cheaper trading all make it harder for a simple version to keep paying." },
      { at: 10.2, title: "What's left", text: "The plain, all-stocks version is much weaker than in the original papers. Traders who still use the idea look for the cases where the drift has been strongest: big, clean surprises, with price confirming the news." }
    ];
    return {
      stages: ST, end: 13.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var mid = g.y1 - 40, sc = (mid - g.y0 - 40) / 6, slot = (g.x1 - g.x0) / 2;
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "High − low SUE spread" : "Return spread, highest minus lowest SUE group", C.faint, 12, "start", 600);
        s += line(g.x0, mid, g.x1, mid, "#48484a", 1.2);
        var bars = [["1980s–1990s", 5, C.up, 3.6], ["late 2010s", 3, C.orange, 5.2]];
        bars.forEach(function (b, k) {
          var gr = ease(fade(T, b[3], 1)), x = g.x0 + k * slot + slot * 0.25, h = b[1] * sc * gr;
          s += hbar(x, mid, slot * 0.5, -h, b[2], 0.95);
          post += txt(x + slot * 0.25, mid - h - 10, (k ? "≤ " : "≈ ") + b[1] + "%", b[2], 20, "middle", 800, fade(T, b[3] + 0.6, 0.4));
          post += txt(x + slot * 0.25, mid + 20, b[0], C.dim, 13, "middle", 700, gr);
        });
        var hist = fade(T, 0.3, 0.5) * (1 - fade(T, 3.4, 0.4));
        if (hist > 0) {
          post += tag((g.x0 + g.x1) / 2, g.y0 + 60, "1968 · Ball & Brown", C.blue, hist, "middle");
          post += tag((g.x0 + g.x1) / 2, g.y0 + 100, "1989–90 · Bernard & Thomas", C.blue, hist, "middle");
          post += tag((g.x0 + g.x1) / 2, g.y0 + 140, "2022 · Kettell, McInnis & Zhao", C.blue, hist, "middle");
        }
        var why = fade(T, 7.2, 0.4);
        if (why > 0) s += arrow(g.x0 + slot * 0.5 + 40, mid - 5 * sc + 20, g.x0 + slot * 1.5 - 40, mid - 3 * sc - 10, C.orange, why);
        s += post;
        s += note2(g, ["Famous since 1968", "Ball & Brown first;", "Bernard & Thomas made", "it a strategy."], C.blue, win(T, 0.3, 3.4));
        s += note2(g, ["Smaller spread", "About 5% then,", "3% or less lately", "(Kettell et al., 2022)."], C.orange, win(T, 3.6, 7));
        s += note2(g, ["Less persistent", "Surprises repeat less,", "and more traders hunt them."], C.orange, win(T, 7.2, 10.2));
        s += note2(g, ["What's left", "Big, clean surprises", "with price confirming."], C.up, fade(T, 10.4, 0.4));
        return s + stamp(L, "Figures: Kettell, McInnis & Zhao (2022), rounded");
      }
    };
  }

  /* 5 · a trader's version on one stock */
  function tradeSpec() {
    var N = 60, lo = 92, hi = 132;
    var CL = [100, 100.6, 99.8, 100.4, 101, 100.2, 100.8, 101.4, 100.9, 101.2,
              109.5, 110.8, 110.1, 111.6, 111.2, 112.4, 111.8, 113.1, 112.6, 114.0, 113.4, 114.6, 115.4, 114.8, 116.1, 115.6, 116.9, 117.4, 116.8, 118.2,
              117.5, 118.9, 119.6, 118.8, 120.1, 119.4, 121.0, 121.8, 120.9, 122.3, 121.6, 123.0, 123.7, 122.8, 124.1, 123.5, 125.0, 125.6, 124.7, 126.1,
              125.4, 126.8, 127.4, 126.5, 127.9, 127.2, 128.4, 129.0, 128.1, 129.4];
    var B = mkBars(CL, 100.2, 7, 0.9);
    B[10] = { o: 108.2, h: 111.2, l: 107.4, c: 109.5 };
    for (var i = 11; i < N; i++) B[i].l = Math.max(B[i].l, 107.6);
    var ST = [
      { at: 0, title: "Before the report", text: "A made-up stock drifts sideways into earnings. The trade is planned before the number comes out: only act on a big surprise, and only if price agrees with it." },
      { at: 2.6, title: "A big beat, and a gap that holds", text: "The company beats by a wide margin and the stock gaps up and closes near the high. The surprise is big, and price is confirming it. That's the setup traders look for." },
      { at: 5.6, title: "Buy, stop under the report-day low", text: "Enter after the report day, with the stop under the report day's low. If the gap fills, the news didn't stick, and you're out with a defined loss." },
      { at: 8.6, title: "Hold for weeks, not minutes", text: "The drift plays out over weeks. Hold through the noise for a set window, about a quarter in the research, or trail a stop under higher lows." }
    ];
    return {
      stages: ST, end: 13, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 1], [2.4, 10], [2.8, 11], [5.4, 11], [5.8, 13], [8.4, 13], [12.4, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up stock · daily" : "A made-up stock · daily bars around an earnings report", C.faint, 12, "start", 600);
        var ro = fade(T, 2.6, 0.4);
        if (ro > 0) { s += line(X(10), g.y0, X(10), g.y1, C.gold, 1.4, "5 4", ro); post += tag(X(10), g.y0 + 14, n ? "report" : "earnings: big beat", C.gold, ro, "middle"); }
        s += drawBars(B, X, Y, cnt, bw);
        var en = fade(T, 5.8, 0.4);
        if (en > 0) {
          s += line(X(10) - bw, Y(107.4), g.x1, Y(107.4), C.dn, 2, "6 4", en);
          post += tag(g.x1, Y(107.4) + 16, n ? "stop" : "stop · under the report-day low", C.dn, en, "end");
          s += dot(X(12), Y(110.4), 6, C.up, en);
          post += tag(X(12) - 8, Y(110.4) - 18, "buy", C.up, en, "end");
        }
        var hd = fade(T, 8.8, 0.4);
        if (hd > 0) { s += K.bracket(X(12), X(N - 1), Y(131), C.up, hd, true); post += tag((X(12) + X(N - 1)) / 2, Y(131) - 14, n ? "hold the drift" : "hold for weeks: the drift", C.up, hd, "middle"); }
        s += post;
        s += note2(g, ["Plan first", "Only a big surprise,", "only if price agrees."], C.blue, win(T, 0.3, 2.6));
        s += note2(g, ["Big beat, gap holds", "Closes near the high:", "price confirms the news."], C.gold, win(T, 2.8, 5.6));
        s += note2(g, ["Buy after the report", "Stop under the", "report-day low."], C.up, win(T, 5.8, 8.6));
        s += note2(g, ["Hold for weeks", "About a quarter in the", "research, or trail lows."], C.up, fade(T, 8.8, 0.4));
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
  }

  K.run({
    specs: { surprise: surpriseSpec, drift: driftSpec, next: nextSpec, fade: fadeSpec, trade: tradeSpec },
    steps: [
      { k: "Expect", c: C.blue, tag: "Know the forecast before the number" },
      { k: "Score", c: C.gold, tag: "Surprise ÷ the company's usual miss" },
      { k: "Sort", c: C.cyan, tag: "Ten groups, every quarter" },
      { k: "Trade", c: C.up, tag: "Long the beats, short the misses" },
      { k: "Hold", c: C.orange, tag: "About a quarter, through the next report" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W;
      if (k === 0) {
        s += d.pl([[40, bot - 30], [130, bot - 50], [220, bot - 70], [310, bot - 90]], C2.faint, 2.2);
        s += d.pl([[310, bot - 90], [400, bot - 110]], C2.blue, 2.4, "6 4");
        s += d.dt(400, bot - 110, C2.blue) + d.t(410, bot - 116, "forecast $1.00", C2.blue, 13, "start", 700);
        s += d.t(30, bot + 30, "Same quarter last year, plus usual growth.", C2.dim, 12.5, "start", 500);
      } else if (k === 1) {
        s += d.t(W / 2, top + 60, "(reported − forecast)", C2.ink, 18, "middle", 700);
        s += d.ln(120, top + 80, W - 120, top + 80, C2.dim, 2);
        s += d.t(W / 2, top + 112, "usual size of the miss", C2.ink, 18, "middle", 700);
        s += d.t(W / 2, top + 170, "= SUE", C2.gold, 26, "middle", 800);
        s += d.t(30, bot + 30, "A big number for this company, not just in cents.", C2.dim, 12.5, "start", 500);
      } else if (k === 2) {
        for (var i = 0; i < 10; i++) { var h = (i - 4.5) * 18, x = 40 + i * 48; s += d.r(x, h >= 0 ? d.mid - h : d.mid, 34, Math.abs(h) + 2, i === 9 ? C2.up : i === 0 ? C2.dn : "#48484a", 1, 3); }
        s += d.t(30, bot + 30, "Every report this quarter, best to worst.", C2.dim, 12.5, "start", 500);
      } else if (k === 3) {
        var bh = d.narrow ? 120 : 90;
        s += d.r(40, top + 10, 220, bh, C2.up, 0.22, 12) + d.t(150, top + 10 + bh / 2, "BUY", C2.up, 18, "middle", 800) + d.t(150, top + 10 + bh / 2 + 22, "biggest beats", C2.ink, 13, "middle", 600);
        s += d.r(300, top + 10, 220, bh, C2.dn, 0.22, 12) + d.t(410, top + 10 + bh / 2, "SHORT", C2.dn, 18, "middle", 800) + d.t(410, top + 10 + bh / 2 + 22, "biggest misses", C2.ink, 13, "middle", 600);
        s += d.t(30, bot + 30, "Or long-only: just the big beats.", C2.dim, 12.5, "start", 500);
      } else {
        s += d.pl([[40, bot - 20], [140, bot - 50], [160, bot - 80], [260, bot - 100], [280, bot - 130], [380, bot - 150], [400, bot - 170], [500, bot - 180]], C2.gold, 2.6);
        [150, 270, 390].forEach(function (x, i) { s += d.r(x - 14, top, 28, bot - top, C2.blue, 0.18, 4) + d.t(x, bot + 12, "Q+" + (i + 1), C2.blue, 11, "middle", 700); });
        s += d.t(30, bot + 32, "The drift jumps at the next reports.", C2.dim, 12.5, "start", 500);
      }
      return s;
    }
  });
})();
