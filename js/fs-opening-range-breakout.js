/* =====================================================================
   fs-opening-range-breakout.js — walkthroughs on
   famous-strategies/opening-range-breakout.html
   (Crabel 1990; Zarattini & Aziz 2023; Zarattini, Barbon & Aziz 2024).

     candle   one made-up stock in play: the first 5-minute candle sets
              the side, a stop order at its high, a 10% ATR stop, out at
              the close
     inplay   relative volume: which made-up stocks qualify, top picks
     results  the paper's total returns, 2016-2023 (real numbers)
     odds     a made-up run of trades: lose more often, win bigger
   Uses js/fs-kit.js. Every stock and bar is made up; only the results
   chart uses the paper's published numbers.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, arrow = K.arrow, rng = K.rng, sizeStd = K.sizeStd,
      mkBars = K.mkBars, drawBars = K.drawBars, cross = K.cross;

  /* 1 · one day, one stock */
  function candleSpec() {
    var N = 78, CL = [], r = rng(11);
    var path = [[0, 50.6], [1, 50.75], [3, 50.9], [8, 51.2], [14, 51.0], [24, 51.7], [36, 52.2], [44, 51.9], [56, 52.8], [66, 53.1], [77, 53.4]];
    for (var i = 0; i < N; i++) CL.push(track(path, i) + (r() - 0.5) * 0.22);
    var B = mkBars(CL, 50.2, 5, 0.12);
    B[0] = { o: 50.2, h: 50.82, l: 50.12, c: 50.7 };
    B[1] = { o: 50.68, h: 50.8, l: 50.55, c: 50.74 };
    B[2] = { o: 50.74, h: 51.02, l: 50.7, c: 50.95 };
    var orH = 50.82, atr = 2.1, stop = orH - atr * 0.1;
    for (var k = 3; k < N; k++) B[k].l = Math.max(B[k].l, stop + 0.06);
    var ST = [
      { at: 0, title: "The first 5 minutes", text: "A made-up stock in play opens at 9:30 and closes its first 5-minute candle higher: green. That decides the side for the whole day. A green first candle means longs only, a red one shorts only, and a doji means no trade." },
      { at: 3.4, title: "A stop order at the high", text: "Place a buy stop at the high of that first candle, $50.82. If the stock never trades above it, you never get in, and that's fine: no breakout, no trade." },
      { at: 6.6, title: "Filled, with a tight stop", text: "It breaks the high and fills you. The stop loss goes 10% of the stock's 14-day ATR below the entry: with an ATR of $2.10, that's 21 cents. Size the trade so those 21 cents cost 1% of the account." },
      { at: 10, title: "Out at the close", text: "There's no profit target. If the stop isn't hit, the position is closed at 4:00 pm, whatever the gain. Here the made-up stock closed near $53.40, about 12 times the risk." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var lo = 50.0, hi = 53.8, X = function (j) { return g.x0 + (j + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 0], [1.6, 1], [3.2, 1], [3.6, 1], [6.4, 2], [6.8, 2], [9.6, 14], [10.2, 14], [12, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up stock in play · 5-min" : "A made-up stock in play · 5-minute bars", C.faint, 12, "start", 600);
        /* the first candle, drawn big and highlighted */
        var c1 = fade(T, 0.4, 0.4);
        if (c1 > 0) { s += rect(X(0) - bw, g.y0, bw * 2, g.y1 - g.y0, C.blue, 0, 0.1 * c1); post += tag(X(0) + (n ? 4 : 8), Y(50.05), n ? "9:30–9:35" : "first 5 min: 9:30–9:35", C.blue, c1, "start"); }
        var gr = fade(T, 1.8, 0.4) * (1 - fade(T, 6.6, 0.3));
        if (gr > 0) post += tag(X(0) + 8, Y(B[0].h) - 18, n ? "green: longs only" : "green candle: longs only today", C.up, gr, "start");
        var bs = fade(T, 3.6, 0.4);
        if (bs > 0) { s += line(X(0), Y(orH), g.x1, Y(orH), C.up, 1.8, "6 4", bs); post += tag(g.x1, Y(orH) - 14, "buy stop $50.82", C.up, bs, "end"); }
        s += drawBars(B, X, Y, cnt, bw);
        var fl = fade(T, 6.8, 0.4);
        if (fl > 0 && cnt > 2) {
          s += dot(X(2), Y(orH), 6, C.up, fl);
          s += line(X(2), Y(stop), g.x1, Y(stop), C.dn, 1.8, "4 3", fl);
          post += tag(g.x1, Y(stop) + 16, n ? "stop: 10% ATR = $0.21" : "stop $50.61: 10% of ATR $2.10", C.dn, fl, "end");
        }
        var ex = fade(T, 11.8, 0.4);
        if (ex > 0) { s += dot(X(N - 1), Y(B[N - 1].c), 6, C.gold, ex); post += tag(X(N - 1), Y(B[N - 1].c) - 22, n ? "4:00 · out" : "4:00 pm: out at the close", C.gold, ex, "end"); }
        s += post;
        s += note2(g, ["First candle", "Green: longs only.", "Red: shorts. Doji: none."], C.blue, win(T, 0.3, 3.4));
        s += note2(g, ["Stop order", "Buy stop at the", "first candle's high."], C.up, win(T, 3.6, 6.6));
        s += note2(g, ["Tight stop", "10% of the 14-day ATR.", "That risk = 1% of capital."], C.dn, win(T, 6.8, 10));
        s += note2(g, ["No target", "Held to the close:", "about 12 times the risk."], C.gold, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
  }

  /* 2 · stocks in play */
  function inplaySpec() {
    /* name, relative volume %, passes price/volume/ATR filters */
    var S = [
      ["Stock A", 540, true], ["Stock B", 410, true], ["Stock C", 360, false], ["Stock D", 290, true],
      ["Stock E", 190, true], ["Stock F", 130, true], ["Stock G", 95, true], ["Stock H", 70, true], ["Stock I", 55, true]
    ];
    var ST = [
      { at: 0, title: "Relative volume", text: "At 9:35, compare each made-up stock's first-5-minute volume with its average first-5-minute volume over the last 14 days. That ratio is relative volume. A stock with news trades many times its normal opening volume." },
      { at: 3.4, title: "At least 100%", text: "Only stocks trading at least their normal opening volume qualify as stocks in play. The quiet ones, under 100%, are skipped for the day." },
      { at: 6.4, title: "Tradeable stocks only", text: "The paper also required an opening price over $5, average volume of at least a million shares a day over 14 days, and an ATR over 50 cents. Stock C fails one of those." },
      { at: 9.4, title: "Take the top of the list", text: "Of what's left, trade the highest relative volume. The paper took the top 20 from more than 7,000 US stocks each day. Here, with nine made-up names, the top four." }
    ];
    return {
      stages: ST, end: 12.8, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var lx = g.x0 + (n ? 64 : 90), max = n ? 760 : 700, Wd = g.x1 - lx, rh = (g.y1 - g.y0 - 10) / S.length;
        var Xv = function (v) { return lx + v / max * Wd; };
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Relative volume at 9:35" : "Relative volume at 9:35 · nine made-up stocks", C.faint, 12, "start", 600);
        var grow = track([[0.3, 0], [2.6, 1]], T);
        var th = fade(T, 3.6, 0.4), flt = fade(T, 6.6, 0.4), top = fade(T, 9.6, 0.4);
        var picks = 0;
        S.forEach(function (row, k) {
          var y = g.y0 + 10 + k * rh, h = Math.min(rh - 8, 26), quiet = row[1] < 100, bad = !row[2];
          var pick = !quiet && !bad && picks < 4; if (pick) picks++;
          var dim = 1 - 0.65 * Math.max(quiet ? th : 0, bad ? flt : 0);
          var col = pick && top > 0 ? C.up : quiet && th > 0 ? C.grey : bad && flt > 0 ? C.dn : C.blue;
          post += txt(g.x0, y + h / 2 + 4, row[0], C.ink, n ? 11.5 : 13, "start", 700, dim);
          s += rect(lx, y, (Xv(row[1]) - lx) * grow, h, col, 3, 0.8 * dim);
          post += txt(lx + (Xv(row[1]) - lx) * grow + 6, y + h / 2 + 4, Math.round(row[1] * grow) + "%", C.dim, 11.5, "start", 700, dim * fade(T, 1.6, 0.4));
          if (bad && flt > 0) s += cross(Xv(row[1]) + (n ? 46 : 52), y + h / 2, C.dn, flt);
          if (pick && top > 0) post += txt(g.x1, y + h / 2 + 4, "trade", C.up, 12, "end", 800, top);
        });
        if (th > 0) { s += line(Xv(100), g.y0 + 2, Xv(100), g.y1, C.gold, 1.8, "6 4", th); post += tag(Xv(100), g.y1 + 12, n ? "100%" : "100%: in play", C.gold, th, "middle"); }
        s += post;
        s += note2(g, ["Relative volume", "First 5 min vs its", "14-day average."], C.blue, win(T, 0.3, 3.4));
        s += note2(g, ["In play", "At least 100% of", "normal opening volume."], C.gold, win(T, 3.6, 6.4));
        s += note2(g, ["Filters", "Over $5, 1M+ shares a day,", "ATR over $0.50."], C.dn, win(T, 6.6, 9.4));
        s += note2(g, ["Top of the list", "The paper: top 20", "of 7,000+ stocks."], C.up, fade(T, 9.6, 0.4));
        return s + stamp(L, "Illustrative · made-up stocks");
      }
    };
  }

  /* 3 · the paper's results */
  function resultsSpec() {
    var R = [
      ["ORB, every stock", "no relative-volume filter", 29, C.grey, 0.4],
      ["5-min ORB, in play", "top 20 by relative volume", 1637, C.up, 3.4],
      ["15-min ORB, in play", "", 272, C.blue, 6.6],
      ["30-min ORB, in play", "", 21, C.blue, 7.0],
      ["60-min ORB, in play", "", 39, C.blue, 7.4],
      ["S&P 500, buy and hold", "same period", 198, C.gold, 9.8]
    ];
    var ST = [
      { at: 0, title: "Every stock, no filter", text: "Zarattini, Barbon and Aziz ran the 5-minute ORB on US stocks from 2016 to 2023, with commissions. Traded on every stock that passed the basic filters, it made just 29% in eight years." },
      { at: 3.2, title: "Only stocks in play", text: "Restricted to the 20 stocks with the highest relative volume each day, the same rules returned 1,637% net, with a Sharpe ratio of 2.81 and an annual alpha of 35.8%. The filter is the strategy." },
      { at: 6.4, title: "Longer ranges, weaker results", text: "Waiting longer for the range made it worse: 272% with a 15-minute range, 21% with 30 minutes and 39% with 60. The first five minutes held most of the edge." },
      { at: 9.6, title: "Against the market", text: "Holding the S&P 500 made 198% over the same years, with a 34% worst drawdown against the strategy's 12%. Both are backtests, after commissions but before any slippage you'd add." }
    ];
    return {
      stages: ST, end: 13.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var lx = n ? g.x0 : g.x0 + 190, wd = g.x1 - lx - (n ? 50 : 70), rh = (g.y1 - g.y0 - 8) / R.length;
        var Xv = function (v) { return lx + Math.sqrt(v / 1637) * wd; };
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Total return 2016–2023, net" : "Total return, 2016–2023, after commissions (square-root scale)", C.faint, 12, "start", 600);
        R.forEach(function (row, k) {
          var y = g.y0 + 8 + k * rh, op = fade(T, row[4], 0.4), gr = track([[row[4], 0], [row[4] + 1.4, 1]], T);
          if (op <= 0) return;
          var by = n ? y + 22 : y + 4, h = n ? Math.min(rh - 30, 18) : Math.min(rh - 14, 30);
          post += txt(g.x0, n ? y + 14 : y + h / 2 + 2, row[0], C.ink, n ? 12 : 13.5, "start", 800, op);
          if (!n && row[1]) post += txt(g.x0, y + h / 2 + 18, row[1], C.dim, 11.5, "start", 600, op);
          s += rect(lx, by, Math.max(2, (Xv(row[2]) - lx) * gr), h, row[3], 4, 0.85 * op);
          post += txt(lx + Math.max(2, (Xv(row[2]) - lx) * gr) + 8, by + h / 2 + 5, (row[2] * gr >= 1000 ? Math.round(row[2] * gr).toLocaleString("en-US") : Math.round(row[2] * gr)) + "%", row[3] === C.grey ? C.ink : row[3], 13, "start", 800, op);
        });
        var sh = fade(T, 10.4, 0.4);
        if (sh > 0) post += n ? tag(g.x0, g.y1 + 12, "Sharpe 2.81 vs 0.78", C.gold, sh, "start") : tag((g.x0 + g.x1) / 2, g.y1 + 18, "Sharpe 2.81 vs 0.78 · worst drawdown 12% vs 34% · beta 0.00", C.gold, sh, "middle");
        s += post;
        s += note2(g, ["No filter", "Same rules on every", "stock: 29% in 8 years."], C.grey, win(T, 0.3, 3.2));
        s += note2(g, ["In play", "1,637%, Sharpe 2.81.", "The filter does the work."], C.up, win(T, 3.4, 6.4));
        s += note2(g, ["Wait longer?", "15 min: 272%.", "30 and 60 min: weak."], C.blue, win(T, 6.6, 9.6));
        s += note2(g, ["Vs the S&P 500", "198%, with a 34%", "drawdown. A backtest."], C.gold, fade(T, 9.8, 0.4));
        return s + stamp(L, "Zarattini, Barbon & Aziz (2024)");
      }
    };
  }

  /* 4 · the odds */
  function oddsSpec() {
    var Rr = [-1, 2.4, -1, -1, -0.6, 4.1, -1, -1, 1.2, -1, 6.8, -1, -1, 0.4, -1, 3.2, -1, -1, 1.8, -1];
    var eq = [0]; Rr.forEach(function (v) { eq.push(eq[eq.length - 1] + v); });
    var ST = [
      { at: 0, title: "More losers than winners", text: "A made-up run of 20 trades. The paper's 5-minute version won just 48.4% of the time, so a losing streak of three or four in a row is normal." },
      { at: 3.6, title: "Losses capped at 1R", text: "Every loser is cut at the stop: 1R, the 1% of capital the trade was sized to risk. A few close slightly better, when the stock fades into the close without hitting the stop." },
      { at: 6.8, title: "Winners run to the close", text: "With no profit target, the days that trend all day pay several R. A handful of those carries the whole run." },
      { at: 10, title: "Costs decide it", text: "The made-up run ends at about +7R from 7 winners and 13 losers. With a stop this tight, slippage and commissions eat a big share of each R, so real fills matter more than in the backtest." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var N = Rr.length, lo = -3, hi = 8;
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y0 + (g.y1 - g.y0) * 0.55 - v * (g.y1 - g.y0) * 0.55 / (hi + 1); };
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "20 made-up trades, in R" : "20 made-up trades, each in R (1R = the 1% risked)", C.faint, 12, "start", 600);
        s += line(g.x0, Y(0), g.x1, Y(0), C.dim, 1.2);
        var cnt = track([[0.3, 0], [3.4, 8], [3.8, 8], [6.6, 14], [7, 14], [9.8, N], [13, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        var cap = fade(T, 3.8, 0.4);
        if (cap > 0) { s += line(g.x0, Y(-1), g.x1, Y(-1), C.dn, 1.4, "4 3", cap); post += tag(g.x1, Y(-1) + 16, "−1R: the stop", C.dn, cap, "end"); }
        for (var k = 0; k < Math.floor(cnt); k++) {
          var v = Rr[k], col = v > 0 ? C.up : C.dn, big = v > 2 && fade(T, 7, 0.4) > 0;
          s += rect(X(k) - bw / 2, v > 0 ? Y(v) : Y(0), bw, Math.abs(Y(v) - Y(0)), col, 2, 0.85);
          if (big) post += txt(X(k), Y(v) - 6, "+" + v.toFixed(1), C.up, 11, "middle", 800, fade(T, 7, 0.4));
        }
        var eqOp = fade(T, 10.2, 0.4);
        if (eqOp > 0) {
          var eTop = Y(-1) + 40, eBot = g.y1 - 30, pts = [];
          for (var j = 0; j <= N; j++) pts.push([g.x0 + j * (g.x1 - g.x0) / N, eBot - (eq[j] + 1.5) / 10.5 * (eBot - eTop)]);
          s += line(g.x0, eBot - 1.5 / 10.5 * (eBot - eTop), g.x1, eBot - 1.5 / 10.5 * (eBot - eTop), C.faint, 1, "3 3", eqOp);
          s += poly(pts, C.gold, 2.4, null, eqOp);
          post += tag(g.x1, eBot + 14, n ? "total +" + eq[N].toFixed(1) + "R" : "running total: +" + eq[N].toFixed(1) + "R", C.gold, eqOp, "end");
        }
        var wr = fade(T, 1.2, 0.4) * (1 - fade(T, 10, 0.3));
        if (wr > 0) post += tag(g.x0, g.y1 + (n ? 12 : 16), n ? "paper: 48.4% winners" : "the paper's 5-minute version: 48.4% winners", C.blue, wr, "start");
        s += post;
        s += note2(g, ["Hit rate", "Under half the trades", "win (48.4%)."], C.blue, win(T, 0.3, 3.6));
        s += note2(g, ["Small losses", "Every loser stops", "at 1R or less."], C.dn, win(T, 3.8, 6.8));
        s += note2(g, ["Big winners", "Trend days run", "to the close."], C.up, win(T, 7, 10));
        s += note2(g, ["Costs", "A tight stop makes", "every cent of slippage count."], C.gold, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up trades");
      }
    };
  }

  K.run({
    specs: { candle: candleSpec, inplay: inplaySpec, results: resultsSpec, odds: oddsSpec },
    steps: [
      { k: "Scan", c: C.blue, tag: "Stocks in play at 9:35" },
      { k: "Side", c: C.cyan, tag: "Green first candle: long; red: short" },
      { k: "Order", c: C.up, tag: "Stop order at the high (or low)" },
      { k: "Stop", c: C.dn, tag: "10% of ATR; risk 1% of capital" },
      { k: "Close", c: C.gold, tag: "No target: out at 4:00 pm" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W, mid = d.mid;
      if (k === 0) {
        [["A", 0.9], ["B", 0.7], ["C", 0.5], ["D", 0.25], ["E", 0.15]].forEach(function (b, j) {
          var y = top + 20 + j * 38, w = b[1] * (W - 180);
          s += d.t(40, y + 18, "Stock " + b[0], C2.ink, 13, "start", 700) + d.r(120, y, w, 24, j < 3 ? C2.up : C2.dim, 0.7, 4);
        });
        s += d.ln(120 + 0.3 * (W - 180), top + 10, 120 + 0.3 * (W - 180), top + 210, C2.gold, 1.6, "6 4");
        s += d.t(30, bot + 32, "Relative volume of 100%+, then the top of the list.", C2.dim, 12.5, "start", 500);
      } else if (k === 1) {
        s += d.r(120, mid - 70, 50, 110, C2.up, 0.85, 4) + d.ln(145, mid - 90, 145, mid + 60, C2.up, 2) + d.t(145, mid + 86, "green: long", C2.up, 13, "middle", 800);
        s += d.r(340, mid - 50, 50, 100, C2.dn, 0.85, 4) + d.ln(365, mid - 70, 365, mid + 70, C2.dn, 2) + d.t(365, mid + 96, "red: short", C2.dn, 13, "middle", 800);
        s += d.t(30, bot + 32, "The first 5-minute candle picks the side. A doji: no trade.", C2.dim, 12.5, "start", 500);
      } else if (k === 2 || k === 3) {
        s += d.r(80, mid - 30, 34, 80, C2.up, 0.85, 3) + d.ln(97, mid - 44, 97, mid + 64, C2.up, 2);
        s += d.ln(80, mid - 44, W - 40, mid - 44, C2.up, 1.6, "6 4") + d.t(W - 40, mid - 54, "buy stop at the high", C2.up, 12.5, "end", 700);
        s += d.pl([[120, mid + 10], [170, mid - 10], [210, mid - 44], [260, mid - 80], [320, mid - 70]], C2.ink, 2.2) + d.dt(210, mid - 44, C2.up);
        if (k === 3) s += d.ln(200, mid - 14, W - 40, mid - 14, C2.dn, 1.6, "4 3") + d.t(W - 40, mid + 6, "stop: 10% of the 14-day ATR", C2.dn, 12.5, "end", 700);
        s += d.t(30, bot + 32, k === 2 ? "No break of the high, no trade." : "Size it so the stop costs 1% of capital.", C2.dim, 12.5, "start", 500);
      } else {
        s += d.pl([[40, mid + 60], [120, mid + 30], [200, mid + 40], [300, mid - 10], [420, mid - 50], [W - 70, mid - 80]], C2.up, 2.4);
        s += d.dt(W - 70, mid - 80, C2.gold) + d.t(W - 70, mid - 98, "4:00 pm: out", C2.gold, 13, "end", 800);
        s += d.t(30, bot + 32, "Never held overnight.", C2.dim, 12.5, "start", 500);
      }
      return s;
    }
  });
})();
