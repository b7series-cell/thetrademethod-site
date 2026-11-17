/* =====================================================================
   fs-dual-momentum.js — walkthroughs on
   famous-strategies/dual-momentum.html (Antonacci 2014, GEM).

     relative  US vs non-US stocks over 12 months: hold the stronger
     absolute  the winner vs T-bills: if it trails, bonds
     switch    a made-up decade, month by month: what GEM held
     results   the book's published numbers, GEM vs ACWI, 1974-2013
   Uses js/fs-kit.js. Every price is made up; only the results chart
   uses the book's published numbers.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, rng = K.rng, sizeStd = K.sizeStd;

  var US = C.blue, EX = C.up, BD = C.gold, TB = C.grey;

  function walk(path, N, seed, noise) { var r = rng(seed), out = []; for (var i = 0; i < N; i++) out.push(track(path, i) * (1 + (r() - 0.5) * noise)); return out; }

  /* 1 · relative momentum */
  function relSpec() {
    var N = 13, U = walk([[0, 100], [4, 104], [8, 103], [12, 109]], N, 4, 0.012), E = walk([[0, 100], [3, 98], [7, 108], [12, 117]], N, 9, 0.012);
    U[12] = 109; E[12] = 117;
    var ST = [
      { at: 0, title: "Two stock markets", text: "Month-end. Look back 12 months at two made-up stock markets: US stocks and non-US stocks, both rebased to 100 a year ago." },
      { at: 3.4, title: "Who did better?", text: "Over the year, non-US stocks are up 17% and US stocks 9%. Relative momentum says hold the stronger one, because what has outperformed tends to keep outperforming for a while." },
      { at: 6.8, title: "Hold the winner", text: "So for the next month, all of the money goes into non-US stocks. Not a mix: one market at a time." },
      { at: 10, title: "Check again next month", text: "Next month-end, compare again. If the lead changes, switch. Most months nothing changes." }
    ];
    return {
      stages: ST, end: 13.2, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (i) { return g.x0 + i / (N - 1) * (g.x1 - g.x0 - (n ? 0 : 60)); }, lo = 92, hi = 122, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0.3, 0], [3, N - 1]], T);
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Last 12 months · made-up" : "The last 12 months · two made-up markets, rebased to 100", C.faint, 12, "start", 600);
        s += line(g.x0, Y(100), g.x1, Y(100), C.faint, 1, "3 3");
        var pu = [], pe = []; for (var i = 0; i <= cnt; i++) { pu.push([X(i), Y(U[i])]); pe.push([X(i), Y(E[i])]); }
        var dim = fade(T, 7, 0.4);
        s += poly(pu, US, 2.6, null, 1 - 0.55 * dim);
        s += poly(pe, EX, 3, null, 1);
        var lb = fade(T, 3.6, 0.4);
        if (lb > 0) {
          post += tag(X(12) + 8, Y(117), "non-US +17%", EX, lb, n ? "end" : "start");
          post += tag(X(12) + 8, Y(109) + (n ? 18 : 0), "US +9%", US, lb, n ? "end" : "start");
        }
        var w = fade(T, 7, 0.4);
        if (w > 0) { s += dot(X(12), Y(117), 8, EX, w); post += tag((g.x0 + g.x1) / 2, g.y1 - 18, "next month: 100% non-US stocks", EX, w, "middle"); }
        var nx = fade(T, 10.2, 0.4);
        if (nx > 0) post += tag(g.x0 + 4, g.y0 + 14, "next check: next month-end", C.dim, nx, "start");
        s += post;
        s += note2(g, ["Lookback", "12 months of", "total return."], C.ink, win(T, 0.3, 3.4));
        s += note2(g, ["Relative", "Which market", "did better?"], EX, win(T, 3.6, 6.8));
        s += note2(g, ["All in one", "The whole account", "in the winner."], EX, win(T, 7, 10));
        s += note2(g, ["Monthly", "Switch only when", "the lead changes."], C.ink, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up prices");
      }
    };
  }

  /* 2 · absolute momentum */
  function absSpec() {
    var bars = [["US stocks", -6, US], ["Non-US stocks", -11, EX], ["T-bills", 3, TB]];
    var ST = [
      { at: 0, title: "A bad year for stocks", text: "Another month-end, after a made-up bad year. US stocks are down 6% over 12 months, non-US stocks down 11%. US is the relative winner." },
      { at: 3.4, title: "Compare with T-bills", text: "Absolute momentum asks a second question: did US stocks beat T-bills, the return you get for taking no risk? Here T-bills made 3%, so the answer is no." },
      { at: 6.8, title: "Then hold bonds", text: "When US stocks trail T-bills, GEM holds US aggregate bonds instead of any stocks, and checks again each month." },
      { at: 10, title: "Why two tests", text: "Relative momentum picks the stronger market. Absolute momentum decides whether to own stocks at all. Together, they're dual momentum." }
    ];
    return {
      stages: ST, end: 13.2, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var z = (g.y0 + g.y1) / 2 - 10, sc = (g.y1 - g.y0) / 34, bw = n ? 64 : 110, gap = n ? 26 : 60;
        var x0 = g.x0 + (n ? 6 : 40);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "12-month return · made-up" : "12-month total return · a made-up bad year", C.faint, 12, "start", 600);
        s += line(g.x0, z, g.x1, z, C.dim, 1.2);
        bars.forEach(function (b, k) {
          var op = k < 2 ? fade(T, 0.4 + k * 0.4, 0.4) : fade(T, 3.6, 0.4); if (op <= 0) return;
          var x = x0 + k * (bw + gap), h = b[1] * sc * track([[k < 2 ? 0.4 + k * 0.4 : 3.6, 0], [k < 2 ? 1.6 + k * 0.4 : 4.8, 1]], T);
          s += rect(x, h > 0 ? z - h : z, bw, Math.abs(h), b[2], 4, 0.85 * op);
          post += txt(x + bw / 2, h > 0 ? z - h - 8 : z - h + 18, (b[1] > 0 ? "+" : "−") + Math.abs(b[1]) + "%", b[2] === TB ? C.ink : b[2], 14, "middle", 800, op);
          post += txt(x + bw / 2, h > 0 ? z + 20 : z - 10, b[0], C.ink, n ? 11 : 12.5, "middle", 700, op);
        });
        var cmp = fade(T, 4.4, 0.4);
        if (cmp > 0) { s += line(x0, z - 3 * sc, x0 + 3 * bw + 2 * gap, z - 3 * sc, TB, 1.6, "5 4", cmp); post += tag(x0 + bw / 2, z - 3 * sc - 18, n ? "US < T-bills" : "US stocks trail T-bills", C.dn, cmp, "start"); }
        var bd = fade(T, 7, 0.4);
        if (bd > 0) {
          var bx = n ? g.x0 : x0 + 3 * (bw + gap) + 10, by = n ? g.y1 - 56 : z - 90;
          s += rect(bx, by, n ? g.x1 - g.x0 : 190, 52, BD, 10, 0.16 * bd);
          post += txt(bx + 14, by + 22, "Hold: US bonds", BD, 15, "start", 800, bd);
          post += txt(bx + 14, by + 42, "until US stocks beat T-bills", C.dim, 12, "start", 600, bd);
        }
        s += post;
        s += note2(g, ["Relative", "US wins: it fell", "less."], US, win(T, 0.3, 3.4));
        s += note2(g, ["Absolute", "But it trailed", "T-bills."], C.dn, win(T, 3.6, 6.8));
        s += note2(g, ["Bonds", "No stocks until", "the trend turns."], BD, win(T, 7, 10));
        s += note2(g, ["Dual", "Which market, and", "whether to own stocks."], C.ink, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up returns");
      }
    };
  }

  /* 3 · a made-up decade */
  function switchSpec() {
    var N = 96, r = rng(17);
    var U = [100], E = [100], B = [100], tb = 0.0025;
    for (var i = 1; i < N; i++) {
      var mu = track([[0, 0.012], [30, 0.008], [40, -0.03], [50, -0.02], [56, 0.02], [70, 0.01], [95, 0.012]], i);
      var me = track([[0, 0.006], [18, 0.02], [32, 0.012], [40, -0.035], [52, -0.015], [56, 0.018], [80, 0.006], [95, 0.004]], i);
      U.push(U[i - 1] * (1 + mu + (r() - 0.5) * 0.06)); E.push(E[i - 1] * (1 + me + (r() - 0.5) * 0.07)); B.push(B[i - 1] * (1 + 0.004 + (r() - 0.5) * 0.012));
    }
    var hold = [], G = [100], W = [100], tbI = [100];
    for (var j = 1; j < N; j++) tbI.push(tbI[j - 1] * (1 + tb));
    for (var k = 0; k < N; k++) {
      if (k < 12) { hold.push(1); continue; }
      var ru = U[k] / U[k - 12] - 1, re = E[k] / E[k - 12] - 1, rt = tbI[k] / tbI[k - 12] - 1;
      hold.push(ru > rt ? (ru >= re ? 1 : 2) : 3);
    }
    for (var m = 1; m < N; m++) {
      var h = hold[m - 1], gr = h === 1 ? U[m] / U[m - 1] : h === 2 ? E[m] / E[m - 1] : B[m] / B[m - 1];
      G.push(G[m - 1] * gr); W.push(W[m - 1] * (0.5 * U[m] / U[m - 1] + 0.5 * E[m] / E[m - 1]));
    }
    var hi = Math.max(Math.max.apply(null, G), Math.max.apply(null, W)) * 1.06, lo = Math.min(Math.min.apply(null, G), Math.min.apply(null, W)) * 0.94;
    var ST = [
      { at: 0, title: "A made-up decade", text: "Eight made-up years of monthly returns for US stocks, non-US stocks and bonds. The strip under the chart shows what dual momentum held each month." },
      { at: 3.4, title: "Following the leader", text: "In the good years it rides whichever stock market is stronger, switching a few times as the lead changes hands." },
      { at: 6.8, title: "Out for the bear market", text: "When both markets roll over and US stocks fall behind T-bills, it moves to bonds. Late, as always with a 12-month lookback, but before most of the fall." },
      { at: 10.2, title: "Back in, and the result", text: "It returns to stocks once US stocks beat T-bills again. The gold line is dual momentum; the grey line holds half in each stock market the whole time." }
    ];
    return {
      stages: ST, end: 13.8, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L, { vol: true }), s = "", post = "";
        var X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - Math.log(v / lo) / Math.log(hi / lo) * (g.y1 - g.y0); };
        var cnt = Math.floor(track([[0, 12], [3.2, 40], [3.6, 40], [6.6, 58], [7, 58], [10, N - 1]], T));
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up decade · monthly, log" : "A made-up decade · monthly, growth of 100 (log scale)", C.faint, 12, "start", 600);
        var pw = [], pg = []; for (var i = 0; i <= cnt; i++) { pw.push([X(i), Y(W[i])]); pg.push([X(i), Y(G[i])]); }
        s += poly(pw, C.grey, 2);
        s += poly(pg, C.gold, 2.8);
        var sy = g.y1 + 30, sh = g.vy1 - sy - 10, bw = (g.x1 - g.x0) / N;
        for (var k = 0; k <= cnt; k++) s += rect(X(k) - bw / 2, sy, bw + 0.4, sh, hold[k] === 1 ? US : hold[k] === 2 ? EX : BD, 0, 0.75);
        post += txt(g.x0, sy - 6, "held:", C.dim, 11, "start", 700);
        var lgx = g.x0 + 40;
        [["US", US], ["non-US", EX], ["bonds", BD]].forEach(function (a, j) { post += txt(lgx + [0, n ? 44 : 60, n ? 118 : 150][j], sy - 6, "■ " + a[0], a[1], 11, "start", 700); });
        var fin = fade(T, 10.4, 0.4);
        if (fin > 0) {
          post += tag(X(N - 1), Y(G[N - 1]) - 18, "dual momentum: " + Math.round(G[N - 1]), C.gold, fin, "end");
          post += tag(X(N - 1), Y(W[N - 1]) + 20, n ? "50/50 stocks: " + Math.round(W[N - 1]) : "half in each market: " + Math.round(W[N - 1]), C.grey, fin, "end");
        }
        s += post;
        s += note2(g, ["The strip", "What it held,", "month by month."], C.ink, win(T, 0.3, 3.4));
        s += note2(g, ["Relative", "Rides the", "stronger market."], EX, win(T, 3.6, 6.8));
        s += note2(g, ["Absolute", "Bonds while stocks", "trail T-bills."], BD, win(T, 7, 10.2));
        s += note2(g, ["The result", "Late both ways,", "but out of the worst."], C.gold, fade(T, 10.4, 0.4));
        return s + stamp(L, "Illustrative · made-up returns");
      }
    };
  }

  /* 4 · the book's numbers */
  function resultsSpec() {
    var R = [
      ["Return a year", 17.43, 8.85, 20, "%", 0.4],
      ["Volatility", 12.64, 15.56, 20, "%", 3.6],
      ["Worst drawdown", 22.72, 60.21, 70, "%", 6.8],
      ["Sharpe ratio", 0.87, 0.22, 1, "", 10]
    ];
    var ST = [
      { at: 0, title: "1974–2013: the return", text: "Antonacci's backtest of Global Equities Momentum, 1974–2013, before costs and taxes: 17.43% a year, against 8.85% for the MSCI All Country World Index." },
      { at: 3.4, title: "Less volatile", text: "Even while holding a single stock market most of the time, its volatility was lower: 12.64% against 15.56%, because it spent the worst stretches in bonds." },
      { at: 6.6, title: "A third of the drawdown", text: "The worst drawdown was 22.72%, against 60.21% for the world index. Missing most of the two big bear markets did most of the work." },
      { at: 9.8, title: "Risk-adjusted", text: "The Sharpe ratio, return per unit of risk, was 0.87 against 0.22. These are backtests of indexes over one 40-year period; results since the book have been more uneven." }
    ];
    return {
      stages: ST, end: 13.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "GEM vs world stocks, 1974–2013" : "Global Equities Momentum vs MSCI ACWI, 1974–2013, before costs and taxes", C.faint, 12, "start", 600);
        var rh = (g.y1 - g.y0 - 20) / R.length, lw = n ? 0 : 150, bx = g.x0 + lw, wmax = g.x1 - bx - 70;
        R.forEach(function (row, k) {
          var op = fade(T, row[5], 0.4); if (op <= 0) return;
          var y = g.y0 + 10 + k * rh, bh = Math.min(20, (rh - (n ? 34 : 16)) / 2), yb = n ? y + 20 : y + 4, gr = track([[row[5], 0], [row[5] + 1.2, 1]], T);
          post += txt(g.x0, n ? y + 12 : y + bh + 6, row[0], C.ink, n ? 12.5 : 13.5, "start", 800, op);
          var a = row[1] / row[3] * wmax * gr, b = row[2] / row[3] * wmax * gr, dp = row[4] ? 2 : 2;
          s += rect(bx, yb, a, bh, C.gold, 3, 0.9 * op);
          post += txt(bx + a + 6, yb + bh - 4, (k === 2 ? "−" : "") + (row[1] * gr).toFixed(dp) + row[4], C.gold, 12.5, "start", 800, op);
          s += rect(bx, yb + bh + 4, b, bh, C.grey, 3, 0.8 * op);
          post += txt(bx + b + 6, yb + 2 * bh, (k === 2 ? "−" : "") + (row[2] * gr).toFixed(dp) + row[4], C.dim, 12.5, "start", 800, op);
        });
        var lg = fade(T, 0.8, 0.4);
        if (lg > 0) { post += tag(g.x0, g.y1 + 14, "GEM", C.gold, lg, "start"); post += tag(g.x0 + 54, g.y1 + 14, n ? "world stocks" : "MSCI ACWI (world stocks)", C.grey, lg, "start"); }
        s += post;
        s += note2(g, ["Return", "17.43% vs 8.85%", "a year."], C.gold, win(T, 0.3, 3.4));
        s += note2(g, ["Volatility", "12.64% vs 15.56%.", "Bonds in bad years."], C.gold, win(T, 3.6, 6.6));
        s += note2(g, ["Drawdown", "22.72% vs 60.21%.", "Out of the worst."], C.gold, win(T, 6.8, 9.8));
        s += note2(g, ["Sharpe", "0.87 vs 0.22.", "A 40-year backtest."], C.gold, fade(T, 10, 0.4));
        return s + stamp(L, "Antonacci (2014)");
      }
    };
  }

  K.run({
    specs: { relative: relSpec, absolute: absSpec, "switch": switchSpec, results: resultsSpec },
    steps: [
      { k: "Month-end", c: C.grey, tag: "Once a month, 12-month returns" },
      { k: "Relative", c: C.up, tag: "US vs non-US: take the stronger" },
      { k: "Absolute", c: C.dn, tag: "US stocks vs T-bills" },
      { k: "Hold", c: C.blue, tag: "Stocks if they win, bonds if not" },
      { k: "Repeat", c: C.gold, tag: "Switch only when a test flips" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W, mid = d.mid;
      var items = [["US", 0.55, C2.blue], ["non-US", 0.8, C2.up], ["T-bills", 0.2, C2.dim], ["bonds", 0.3, C2.gold]];
      items.forEach(function (it, j) {
        var x = 60 + j * 120, h = it[1] * 160, hl = (k === 1 && j < 2) || (k === 2 && (j === 0 || j === 2)) || (k === 3 && j === 1) || k === 0 || k === 4;
        s += d.r(x, mid + 60 - h, 80, h, it[2], hl ? 0.85 : 0.2, 6) + d.t(x + 40, mid + 82, it[0], C2.ink, 12.5, "middle", 700);
      });
      if (k === 1) s += d.t(30, bot + 32, "Non-US did better: it's the pick.", C2.dim, 12.5, "start", 500);
      else if (k === 2) s += d.t(30, bot + 32, "US stocks beat T-bills: stay in stocks.", C2.dim, 12.5, "start", 500);
      else if (k === 3) s += d.t(30, bot + 32, "Hold non-US stocks for the next month.", C2.dim, 12.5, "start", 500);
      else if (k === 0) s += d.t(30, bot + 32, "Total returns over the last 12 months.", C2.dim, 12.5, "start", 500);
      else s += d.t(30, bot + 32, "Most months, nothing changes.", C2.dim, 12.5, "start", 500);
      return s;
    }
  });
})();
