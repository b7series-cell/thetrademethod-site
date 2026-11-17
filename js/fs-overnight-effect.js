/* =====================================================================
   fs-overnight-effect.js — walkthroughs on
   famous-strategies/overnight-effect.html
   (Cliff, Cooper & Gulen 2008; Kelly & Clark 2011).

     split   one day, two halves: close to open, open to close
     paper   Cliff, Cooper & Gulen's averages, 1993–2006
     spy     our run of the indicator on SPY since 1993
     costs   what a round trip every day costs the edge
   Uses js/fs-kit.js. The candles in "split" are made up; the paper
   bars use the published numbers; the SPY bars are our own run.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, sizeStd = K.sizeStd;

  function pct(v, dp) { return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(dp == null ? 3 : dp) + "%"; }

  /* 1 · one day, two halves (made-up candles) */
  function splitSpec() {
    /* [open, close]; the previous close to this open is the night */
    var D = [[100.0, 100.2], [100.6, 100.1], [100.5, 100.9], [101.3, 100.8], [101.2, 101.4], [101.9, 101.3], [101.8, 101.6], [102.1, 102.4]];
    var c0 = 99.8, N = D.length;
    var ST = [
      { at: 0, title: "A day has two halves", text: "Eight made-up trading days of an index fund. Each daily candle opens where the morning's trading starts and closes at 4 pm." },
      { at: 3, title: "The night", text: "The gap from yesterday's close to today's open is the overnight return: news, earnings and foreign markets, all while US exchanges are shut. Here it's the dashed green or red link." },
      { at: 6.4, title: "The day", text: "The candle body, from the open to the close, is the intraday return: the part almost all trading happens in." },
      { at: 9.6, title: "Add them up", text: "Total each half separately. In this made-up week the nights did the climbing and the days gave a little back, the pattern the research found on average." }
    ];
    return {
      stages: ST, end: 13.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var tallyH = n ? 110 : 96, top = g.y0 + 10, bot = g.y1 - tallyH - 20;
        var lo = 99.4, hi = 102.8;
        var Y = function (v) { return bot - (v - lo) / (hi - lo) * (bot - top); };
        var slot = (g.x1 - g.x0) / N, bw = Math.min(n ? 18 : 30, slot * 0.42);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up days · index fund" : "Eight made-up trading days · an index fund", C.faint, 12, "start", 600);
        var cnt = track([[0.2, 0], [2.6, N]], T), nOp = fade(T, 3.2, 0.4), dOp = fade(T, 6.6, 0.4);
        var nightSum = 0, daySum = 0, prev = c0;
        s += line(g.x0, Y(c0), g.x0 + slot * 0.2, Y(c0), C.grey, 2);
        for (var i = 0; i < N; i++) {
          if (i >= cnt) break;
          var o = D[i][0], c = D[i][1], cx = g.x0 + slot * (i + 0.5);
          var up = c >= o, col = up ? C.up : C.dn;
          var nr = (o / prev - 1) * 100, dr = (c / o - 1) * 100;
          nightSum += nr; daySum += dr;
          /* night link */
          var px = i === 0 ? g.x0 + slot * 0.2 : g.x0 + slot * (i - 0.5) + bw / 2;
          if (nOp > 0) {
            var nc = nr >= 0 ? C.up : C.dn;
            s += line(px, Y(prev), cx - bw / 2, Y(o), nc, 2.4, "5 4", nOp);
            s += dot(cx - bw / 2, Y(o), 3.5, nc, nOp);
          }
          /* day body */
          s += line(cx, Y(Math.max(o, c) + 0.12), cx, Y(Math.min(o, c) - 0.12), C.grey, 1.2);
          var by = Y(Math.max(o, c)), bh = Math.max(2, Math.abs(Y(o) - Y(c)));
          s += rect(cx - bw / 2, by, bw, bh, dOp > 0 ? C.gold : col, 2, dOp > 0 ? 0.55 + 0.4 * dOp : 0.85);
          prev = c;
        }
        /* tallies */
        var tOp = fade(T, 9.8, 0.4);
        if (tOp > 0) {
          var ty = g.y1 - tallyH + 6, mx = 2.2, half = (g.x1 - g.x0) / 2 - (n ? 4 : 30);
          var scale = function (v) { return Math.abs(v) / mx * (half * (n ? 0.62 : 0.7)); };
          var rows = [["nights, added", nightSum, C.up], ["days, added", daySum, C.gold]];
          rows.forEach(function (r, j) {
            var yy = ty + j * (n ? 48 : 40), w = scale(r[1]) * track([[9.8, 0], [10.8, 1]], T);
            var lx = g.x0 + (n ? 0 : 0), bx = g.x0 + (n ? 104 : 130);
            post += txt(lx, yy + 14, r[0], C.ink, 12.5, "start", 700, tOp);
            s += rect(bx, yy + 2, Math.max(2, w), 16, r[2], 3, 0.85 * tOp);
            post += txt(bx + Math.max(2, w) + 8, yy + 15, pct(r[1], 1), r[2], 13, "start", 800, tOp);
          });
        }
        s += post;
        s += note2(g, ["Two halves", "Close to open,", "then open to close."], C.ink, win(T, 0.3, 3));
        s += note2(g, ["Night", "The gap from the", "close to the open."], C.up, win(T, 3.2, 6.4));
        s += note2(g, ["Day", "The candle body,", "open to close."], C.gold, win(T, 6.6, 9.6));
        s += note2(g, ["Made up", "Nights climbed,", "days gave some back."], C.up, fade(T, 9.8, 0.4));
        return s + stamp(L, "Illustrative · made-up days");
      }
    };
  }

  /* 2 · the paper's averages, 1993–2006 */
  function paperSpec() {
    var E = [["QQQQ", 0.18], ["SPY", 0.068], ["DIA", 0.061]];
    var ST = [
      { at: 0, title: "S&P 500 stocks, 1993–2006", text: "Cliff, Cooper and Gulen split each day into night (4 pm to 9:30 am) and day. For S&P 500 stocks the average night returned 0.028% to 0.048%, depending on how they averaged." },
      { at: 3.4, title: "The day: about nothing", text: "The average day returned −0.028% to 0.002%. Over 14 years, the stocks' gain came from the hours the market was closed." },
      { at: 6.8, title: "The big index ETFs", text: "Night return minus day return, per day: 0.18% for QQQQ (now QQQ), 0.068% for SPY and 0.061% for DIA." },
      { at: 10, title: "14 of 14", text: "Across 14 heavily traded ETFs, nights beat days in all 14, and the day's return was negative in 12. Nights were also less volatile." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Average per day, 1993–2006" : "Average return per night or day, 1993–2006", C.faint, 12, "start", 600);
        var colW = n ? g.x1 - g.x0 : (g.x1 - g.x0 - 50) / 2;
        /* panel A: ranges */
        var ax = g.x0, ay = g.y0, ah = n ? (g.y1 - g.y0) * 0.46 : g.y1 - g.y0 - 70;
        var aOp = fade(T, 0.3, 0.4);
        post += txt(ax, ay + 16, "S&P 500 stocks", C.ink, n ? 13 : 15, "start", 800, aOp);
        var z = ay + ah * 0.66, sc = (ah * 0.5) / 0.05, bw = Math.min(90, colW / 3.4);
        s += line(ax, z, ax + colW, z, C.dim, 1, null, aOp);
        var gA = track([[0.3, 0], [1.5, 1]], T), xa = ax + colW * 0.14, xb = ax + colW * 0.58;
        s += rect(xa, z - 0.048 * sc * gA, bw, (0.048 - 0.028) * sc * gA, C.up, 4, 0.9 * aOp);
        s += rect(xa, z - 0.028 * sc * gA, bw, 0.028 * sc * gA, C.up, 4, 0.35 * aOp);
        post += txt(xa + bw / 2, z - 0.048 * sc * gA - 8, "0.028–0.048%", C.up, n ? 12.5 : 14, "middle", 800, aOp);
        post += txt(xa + bw / 2, z + 18, "night", C.ink, 12, "middle", 700, aOp);
        var bOp = fade(T, 3.6, 0.4);
        if (bOp > 0) {
          var gB = track([[3.6, 0], [4.6, 1]], T);
          s += rect(xb, z - 0.002 * sc * gB, bw, 0.03 * sc * gB, C.gold, 4, 0.85 * bOp);
          post += txt(xb + bw / 2, z + 0.028 * sc * gB + 18, "−0.028 to 0.002%", C.gold, n ? 12.5 : 14, "middle", 800, bOp);
          post += txt(xb + bw / 2, z - 0.002 * sc - 8, "day", C.ink, 12, "middle", 700, bOp);
        }
        /* panel B: ETF spreads */
        var cOp = fade(T, 7, 0.4);
        if (cOp > 0) {
          var bx = n ? g.x0 : g.x0 + colW + 50, by = n ? g.y0 + (g.y1 - g.y0) * 0.56 : g.y0;
          post += txt(bx, by + 16, n ? "Night minus day" : "Night minus day, per day", C.ink, n ? 13 : 15, "start", 800, cOp);
          var rowH = n ? 30 : 42, maxW = colW - (n ? 120 : 140);
          E.forEach(function (e, j) {
            var yy = by + 34 + j * rowH, w = e[1] / 0.2 * maxW * track([[7 + j * 0.3, 0], [8 + j * 0.3, 1]], T);
            post += txt(bx, yy + 14, e[0], C.dim, 12.5, "start", 800, cOp);
            s += rect(bx + 52, yy + 2, w, n ? 16 : 20, C.up, 3, 0.85 * cOp);
            post += txt(bx + 60 + w, yy + 16, e[1].toFixed(e[1] < 0.1 ? 3 : 2) + "%", C.up, 13, "start", 800, cOp);
          });
          var dOp = fade(T, 10.2, 0.4);
          if (dOp > 0) {
            var qy = by + 34 + 3 * rowH + (n ? 10 : 18), sq = n ? 14 : 18, gp = n ? 4 : 6;
            post += txt(bx, qy, "14 ETFs: day return", C.dim, 12, "start", 700, dOp);
            for (var q = 0; q < 14; q++) {
              var neg = q < 12, qx = bx + q * (sq + gp);
              s += rect(qx, qy + 8, sq, sq, neg ? C.dn : C.grey, 3, (neg ? 0.8 : 0.6) * dOp);
            }
            post += txt(bx, qy + sq + 26, "12 of 14 negative", C.dn, 12.5, "start", 800, dOp);
          }
        }
        s += post;
        s += note2(g, ["Night", "0.028% to 0.048%", "on average."], C.up, win(T, 0.3, 3.4));
        s += note2(g, ["Day", "−0.028% to 0.002%:", "about nothing."], C.gold, win(T, 3.6, 6.8));
        s += note2(g, ["ETFs too", "SPY: nights beat", "days by 0.068%."], C.up, win(T, 7, 10));
        s += note2(g, ["14 of 14", "Nights beat days", "in every ETF tested."], C.up, fade(T, 10.2, 0.4));
        return s + stamp(L, "Cliff, Cooper & Gulen (2008)");
      }
    };
  }

  /* 3 · our SPY run, plus Kelly & Clark */
  function spySpec() {
    var ST = [
      { at: 0, title: "SPY since 1993", text: "Our run of the indicator on this page: SPY's daily bars since 1993, 8,508 days, price only. $100 held only overnight grew to about $1,359." },
      { at: 3.4, title: "Held only by day", text: "$100 held only from the open to the close grew to about $124 over the same 33 years." },
      { at: 6.8, title: "Per day", text: "The average night returned +0.033% and the average day +0.007%. Nights were up 55.0% of the time, days 52.4%." },
      { at: 10, title: "QQQQ, 1999–2006", text: "Kelly and Clark found the same split in QQQQ: a geometric average close-to-open risk premium of +23.7% against −23.3% for open to close, with less volatility at night." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "SPY, daily, since 1993 · our run" : "SPY daily bars since 1993, price only · our run of the indicator", C.faint, 12, "start", 600);
        var lx = g.x0, bx = g.x0 + (n ? 0 : 150), maxW = g.x1 - bx - (n ? 70 : 90);
        var y = g.y0 + 6;
        /* growth of 100 */
        var aOp = fade(T, 0.3, 0.4);
        post += txt(lx, y + 12, "$100 grew to", C.ink, 13, "start", 800, aOp);
        var rows = [["overnight only", 1359, C.up, 0.4], ["intraday only", 124, C.gold, 3.6]];
        rows.forEach(function (r, j) {
          var op = fade(T, r[3], 0.4); if (op <= 0) return;
          var yy = y + 24 + j * (n ? 44 : 36), w = r[1] / 1400 * maxW * track([[r[3], 0], [r[3] + 1.4, 1]], T);
          var by2 = n ? yy + 18 : yy;
          post += txt(lx + (n ? 0 : 0), yy + 14, r[0], C.dim, 12, "start", 700, op);
          s += rect(bx, by2 + 2, Math.max(2, w), 18, r[2], 3, 0.85 * op);
          post += txt(bx + Math.max(2, w) + 8, by2 + 16, "$" + Math.round(r[1] * Math.min(1, track([[r[3], 0], [r[3] + 1.4, 1]], T))).toLocaleString("en-US"), r[2], 14, "start", 800, op);
        });
        /* per day */
        var y2 = y + (n ? 128 : 110), cOp = fade(T, 7, 0.4);
        if (cOp > 0) {
          var cells = [["avg night", "+0.033%", C.up], ["avg day", "+0.007%", C.gold], ["up nights", "55.0%", C.up], ["up days", "52.4%", C.gold]];
          var cw = (g.x1 - g.x0) / (n ? 2 : 4);
          cells.forEach(function (c, j) {
            var cx = g.x0 + (j % (n ? 2 : 4)) * cw, cy = y2 + Math.floor(j / (n ? 2 : 4)) * 62;
            s += rect(cx, cy, cw - 10, 54, C.box, 8, 0.9 * cOp);
            post += txt(cx + 12, cy + 20, c[0], C.dim, 11.5, "start", 700, cOp);
            post += txt(cx + 12, cy + 44, c[1], c[2], 18, "start", 800, cOp);
          });
        }
        /* Kelly & Clark */
        var y3 = y2 + (n ? 140 : 80), dOp = fade(T, 10.2, 0.4);
        if (dOp > 0 && y3 + 70 < g.y1 + 30) {
          post += txt(lx, y3 + 12, n ? "QQQQ 1999–2006, risk premium" : "Kelly & Clark: QQQQ 1999–2006, risk premium", C.ink, 13, "start", 800, dOp);
          var mid = n ? g.x0 + (g.x1 - g.x0) / 2 : bx + maxW * 0.42, sc2 = (n ? (g.x1 - g.x0) / 2 - 92 : maxW * 0.36) / 25;
          s += line(mid, y3 + 22, mid, y3 + 72, C.dim, 1, null, dOp);
          var k1 = 23.7 * sc2 * track([[10.2, 0], [11.2, 1]], T), k2 = 23.3 * sc2 * track([[10.2, 0], [11.2, 1]], T);
          s += rect(mid, y3 + 24, k1, 18, C.up, 3, 0.85 * dOp);
          post += txt(mid + k1 + 6, y3 + 38, "+23.7% night", C.up, 12.5, "start", 800, dOp);
          s += rect(mid - k2, y3 + 50, k2, 18, C.dn, 3, 0.85 * dOp);
          post += txt(mid - k2 - 6, y3 + 64, n ? "−23.3% day" : "day −23.3%", C.dn, 12.5, "end", 800, dOp);
        }
        s += post;
        s += note2(g, ["Overnight", "$100 to about", "$1,359 since 1993."], C.up, win(T, 0.3, 3.4));
        s += note2(g, ["By day", "$100 to about", "$124."], C.gold, win(T, 3.6, 6.8));
        s += note2(g, ["Per day", "+0.033% a night,", "+0.007% a day."], C.ink, win(T, 7, 10));
        s += note2(g, ["Same in QQQQ", "Kelly & Clark,", "1999–2006."], C.up, fade(T, 10.2, 0.4));
        return s + stamp(L, "Our TradingView run · Kelly & Clark (2011)");
      }
    };
  }

  /* 4 · the cost of a round trip every day (arithmetic) */
  function costSpec() {
    var EDGE = 0.033;
    var ST = [
      { at: 0, title: "A round trip every day", text: "To own only the nights you buy at every close and sell at every open: about 252 round trips a year. Each one pays the bid-ask spread, any commission and slippage." },
      { at: 3.4, title: "The edge per night", text: "On our SPY run the average night was +0.033% before costs. That's what each round trip has to pay for." },
      { at: 6.8, title: "Where it runs out", text: "Subtract a cost per round trip from 0.033% and the line falls to zero at a cost of 0.033%, about 3 cents on a $100 share. Above that, the average night loses money." },
      { at: 10, title: "The fine print", text: "In price-only data the ex-dividend drop lands in the overnight half, so the nights look slightly worse than they were. The paper's averages are before any costs." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var cmax = 0.06, vlo = -0.03, vhi = 0.04;
        var X = function (c) { return g.x0 + c / cmax * (g.x1 - g.x0); }, Y = function (v) { return g.y1 - 30 - (v - vlo) / (vhi - vlo) * (g.y1 - 30 - g.y0 - 20); };
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Average night after costs" : "Average night, SPY since 1993, after a cost per round trip", C.faint, 12, "start", 600);
        var aOp = fade(T, 0.2, 0.4);
        s += line(g.x0, Y(0), g.x1, Y(0), C.dim, 1, null, aOp);
        post += txt(g.x0 - 6, Y(0) + 4, "0", C.faint, 11, "end", 600, aOp);
        [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06].forEach(function (c) {
          if (n && (c * 100) % 2 > 0.001 && c !== 0) return;
          post += txt(X(c), g.y1 - 8, c.toFixed(2) + "%", C.faint, 11, c === 0 ? "start" : c === 0.06 ? "end" : "middle", 600, aOp);
        });
        post += txt(g.x1, g.y1 + 10, "cost per round trip", C.faint, 11, "end", 600, aOp);
        /* round-trip dots */
        if (T < 3.6) {
          var nd = Math.floor(track([[0.3, 0], [3, n ? 18 : 36]], T));
          for (var i = 0; i < nd; i++) s += dot(g.x0 + 10 + (i % (n ? 9 : 18)) * (n ? 24 : 32), g.y0 + 20 + Math.floor(i / (n ? 9 : 18)) * 26, 7, C.blue, 0.7 * (1 - fade(T, 3.2, 0.4)));
        }
        var eOp = fade(T, 3.6, 0.4);
        if (eOp > 0) { s += dot(X(0), Y(EDGE), 6, C.up, eOp); post += tag(X(0) + 12, Y(EDGE) - 16, "+0.033% before costs", C.up, eOp, "start"); }
        var lOp = fade(T, 7, 0.4);
        if (lOp > 0) {
          var cEnd = cmax * track([[7, 0], [8.6, 1]], T), pts = [];
          for (var c = 0; c <= cEnd + 1e-9; c += 0.001) pts.push([X(c), Y(EDGE - c)]);
          s += poly(pts, C.gold, 2.6, null, lOp);
          var zOp = fade(T, 8.6, 0.4);
          if (zOp > 0) {
            s += line(X(EDGE), Y(0) - 40, X(EDGE), Y(0) + 40, C.dn, 1.4, "4 4", zOp);
            s += dot(X(EDGE), Y(0), 5, C.dn, zOp);
            post += tag(X(EDGE) + 10, Y(0) - 24, "edge gone at 0.033%", C.dn, zOp, "start");
            s += rect(X(EDGE), Y(0), g.x1 - X(EDGE), Y(EDGE - cmax) - Y(0), C.dn, 0, 0.08 * zOp);
          }
        }
        var fOp = fade(T, 10.2, 0.4);
        if (fOp > 0) post += tag(g.x0 + 4, Y(vlo) - 22, n ? "price only · before tax" : "price only: ex-dividend drops land overnight", C.ink, fOp, "start");
        s += post;
        s += note2(g, ["252 a year", "A buy and a sell", "every trading day."], C.blue, win(T, 0.3, 3.4));
        s += note2(g, ["The edge", "+0.033% a night", "before costs."], C.up, win(T, 3.6, 6.8));
        s += note2(g, ["Break-even", "About 3 cents on", "a $100 share."], C.dn, win(T, 7, 10));
        s += note2(g, ["Before costs", "The research is too.", "Test your own fills."], C.gold, fade(T, 10.2, 0.4));
        return s + stamp(L, "Arithmetic on our SPY run");
      }
    };
  }

  K.run({
    specs: { split: splitSpec, paper: paperSpec, spy: spySpec, costs: costSpec },
    steps: [
      { k: "Close", c: C.blue, tag: "Buy at the closing price" },
      { k: "Night", c: C.up, tag: "Hold while the market is shut" },
      { k: "Open", c: C.gold, tag: "Sell at the opening price" },
      { k: "Day", c: C.grey, tag: "No position during the session" },
      { k: "Repeat", c: C.dn, tag: "Every trading day, after costs" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, bot = d.bot, mid = d.mid;
      var x1 = 70, x2 = 400, w = 44;
      var c1 = mid + 10, o2 = mid - 30, c2 = mid - 10;
      /* day one candle, night link, day two candle */
      s += d.r(x1 - w / 2, mid - 10, w, 20, k === 3 ? C2.grey : C2.dim, k === 3 ? 0.9 : 0.35, 3);
      s += d.r(x2 - w / 2, o2, w, c2 - o2, k === 3 ? C2.gold : C2.dim, k === 3 ? 0.9 : 0.35, 3);
      s += d.ln(x1 + w / 2, c1, x2 - w / 2, o2, k === 1 ? C2.up : C2.dim, k === 1 ? 3 : 1.5, "6 5");
      if (k === 0 || k === 4) s += d.dt(x1 + w / 2, c1, C2.blue, 7);
      if (k === 2 || k === 4) s += d.dt(x2 - w / 2, o2, C2.gold, 7);
      s += d.t(x1, mid + 54, "4:00 pm close", C2.dim, 11, "middle", 600) + d.t(x2, mid + 54, "9:30 am open", C2.dim, 11, "middle", 600);
      s += d.t((x1 + x2) / 2, mid - 46, "overnight", k === 1 ? C2.up : C2.dim, 12, "middle", 700);
      var t = ["Buy at the close.", "Hold through the night.", "Sell at the next open.", "Flat from the open to the close.", "Every day: costs decide if it pays."][k];
      s += d.t(30, bot + 32, t, C2.dim, 12.5, "start", 500);
      return s;
    }
  });
})();
