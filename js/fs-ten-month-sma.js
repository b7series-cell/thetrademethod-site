/* =====================================================================
   fs-ten-month-sma.js — walkthroughs on
   famous-strategies/ten-month-sma.html (Faber 2007, updated 2013).

     rule     made-up monthly index, its 10-month average, month-end
              checks, invested vs cash
     crash    a made-up bear market: out early, back in late, the
              drawdown cut
     whipsaw  the cost: a sideways market flips in and out
     results  Faber's published numbers, timing vs buy and hold
   Uses js/fs-kit.js. Every bar is made up; only the results chart uses
   the paper's published numbers.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, rng = K.rng, sizeStd = K.sizeStd, arrow = K.arrow;

  function sma(a, n) { return a.map(function (_, i) { if (i < n - 1) return null; var s = 0; for (var k = i - n + 1; k <= i; k++) s += a[k]; return s / n; }); }
  function series(path, N, seed, noise) { var r = rng(seed), out = []; for (var i = 0; i < N; i++) out.push(track(path, i) * (1 + (r() - 0.5) * noise)); return out; }
  function signals(P, M, from) { var st = []; for (var i = 0; i < P.length; i++) st.push(i < from || M[i] == null ? null : P[i] > M[i]); return st; }
  /* the timing equity: hold next month if this month closed above */
  function timed(P, S, cashM) { var e = [P[0]]; for (var i = 1; i < P.length; i++) { var inv = S[i - 1] === null ? true : S[i - 1]; e.push(e[i - 1] * (inv ? P[i] / P[i - 1] : 1 + cashM)); } return e; }
  function lineOf(a, X, Y, upto) { var p = []; for (var i = 0; i < a.length && i <= upto; i++) if (a[i] != null) p.push([X(i), Y(a[i])]); return p; }
  function bands(S, X, g, upto, op, s0) {
    var s = "";
    for (var i = s0 || 0; i < S.length && i <= upto; i++) {
      if (S[i] == null) continue;
      s += rect(X(i) - (X(1) - X(0)) / 2, g.y0, X(1) - X(0) + 0.5, g.y1 - g.y0, S[i] ? C.up : C.dn, 0, 0.09 * op);
    }
    return s;
  }

  /* 1 · the rule */
  function ruleSpec() {
    var N = 60, P = series([[0, 100], [14, 124], [20, 128], [26, 114], [32, 104], [38, 112], [48, 132], [59, 146]], N, 3, 0.03), M = sma(P, 10), S = signals(P, M, 9);
    var ST = [
      { at: 0, title: "One price a month", text: "A made-up stock index, one point per month-end close. The rule ignores everything that happens in between: no daily charts, no news." },
      { at: 3, title: "The 10-month average", text: "Add the average of the last ten month-end closes. It's roughly the 200-day moving average, checked twelve times a year instead of every day." },
      { at: 6.2, title: "Above: hold. Below: cash.", text: "At each month-end, if the index closed above its 10-month average, own it for the next month. If it closed below, sell and hold T-bills until it closes above again." },
      { at: 9.6, title: "Mostly invested", text: "Most months it's in the market. It steps aside only when a decline drags the price under a year's worth of trend, and comes back once the price recovers." }
    ];
    return {
      stages: ST, end: 13.2, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; }, lo = 90, hi = 156, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = Math.floor(track([[0, 4], [2.8, N - 1]], T));
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up index · month-end closes" : "A made-up stock index · one close a month", C.faint, 12, "start", 600);
        var bo = fade(T, 6.4, 0.5);
        if (bo > 0) s += bands(S, X, g, Math.floor(track([[6.4, 9], [9, N - 1]], T)), bo, 9);
        var ma = fade(T, 3.2, 0.4);
        if (ma > 0) { s += poly(lineOf(M, X, Y, Math.floor(track([[3.2, 9], [5.6, N - 1]], T))), C.blue, 2.6, null, ma); post += tag(X(N - 1), Y(M[N - 1]) + 20, n ? "10-month avg" : "10-month average", C.blue, ma, "end"); }
        s += poly(lineOf(P, X, Y, cnt), C.ink, 1.6);
        for (var i = 0; i <= cnt; i++) s += dot(X(i), Y(P[i]), 2.6, S[i] == null || bo === 0 ? C.ink : S[i] ? C.up : C.dn);
        var lb = fade(T, 7.4, 0.4);
        if (lb > 0) {
          var flip = -1; for (var k = 10; k < N; k++) if (S[k] === false && S[k - 1] === true) { flip = k; break; }
          if (flip > 0) post += tag(X(flip), Y(P[flip]) + 34, n ? "below: cash" : "closed below: to cash", C.dn, lb, "middle");
          var back = -1; for (var j = flip + 1; j < N; j++) if (S[j] === true && S[j - 1] === false) { back = j; break; }
          if (back > 0) post += tag(X(back) + 8, Y(P[back]) + 34, n ? "above: back in" : "closed above: back in", C.up, lb, "start");
        }
        var pi = fade(T, 9.8, 0.4);
        if (pi > 0) { var inv = 0, tot = 0; S.forEach(function (v) { if (v != null) { tot++; if (v) inv++; } }); post += tag(g.x0 + 4, g.y0 + 14, Math.round(inv / tot * 100) + "% of months invested", C.up, pi, "start"); }
        s += post;
        s += note2(g, ["Monthly", "Only the month-end", "close counts."], C.ink, win(T, 0.3, 3));
        s += note2(g, ["10-month SMA", "About a 200-day", "average, checked monthly."], C.blue, win(T, 3.2, 6.2));
        s += note2(g, ["The switch", "Above: hold it.", "Below: T-bills."], C.up, win(T, 6.4, 9.6));
        s += note2(g, ["Mostly in", "Out only when the", "trend has turned."], C.up, fade(T, 9.8, 0.4));
        return s + stamp(L, "Illustrative · made-up prices");
      }
    };
  }

  /* 2 · a bear market */
  function crashSpec() {
    var N = 54, P = series([[0, 78], [16, 118], [19, 121], [23, 114], [26, 100], [29, 82], [31, 68], [33, 62], [36, 70], [40, 84], [46, 98], [53, 108]], N, 8, 0.025);
    var M = sma(P, 10), S = signals(P, M, 9), E = timed(P, S, 0.003);
    var peakB = 0, ddB = 0, peakE = 0, ddE = 0;
    for (var i = 0; i < N; i++) { peakB = Math.max(peakB, P[i]); ddB = Math.min(ddB, P[i] / peakB - 1); peakE = Math.max(peakE, E[i]); ddE = Math.min(ddE, E[i] / peakE - 1); }
    var ST = [
      { at: 0, title: "A bull market rolls over", text: "A made-up index climbs for a year, then starts to slide. Buy and hold rides the whole way down." },
      { at: 3.2, title: "Out early in the fall", text: "A few months in, the index closes below its 10-month average and the rule moves to T-bills. It doesn't sell the top: it gives up the first part of the decline." },
      { at: 6.6, title: "Back in late", text: "It buys back only after the index closes above its average again, well off the bottom. It misses the first part of the recovery too." },
      { at: 10, title: "The drawdown, cut", text: "Late out and late in, the timed line still skips the deepest part of the bear market, and in a fast V like this one it ends well ahead. Buy and hold fell " + Math.round(-ddB * 100) + "% at worst; the timed version " + Math.round(-ddE * 100) + "%." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; }, lo = 55, hi = Math.max.apply(null, E) * 1.04, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = Math.floor(track([[0, 10], [3, 22], [3.4, 22], [6.4, 38], [6.8, 38], [9.6, N - 1]], T));
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up bear market · monthly" : "A made-up bear market · monthly closes, both lines start together", C.faint, 12, "start", 600);
        s += bands(S, X, g, cnt, fade(T, 3.4, 0.4), 9);
        s += poly(lineOf(M, X, Y, cnt), C.blue, 2, "5 4");
        s += poly(lineOf(P, X, Y, cnt), C.grey, 2);
        var eo = fade(T, 3.4, 0.4);
        if (eo > 0) s += poly(lineOf(E, X, Y, cnt), C.up, 2.6, null, eo);
        var out = -1, back = -1; for (var k = 10; k < N; k++) { if (out < 0 && S[k] === false) out = k; if (out > 0 && back < 0 && S[k] === true) back = k; }
        if (cnt >= out + 1 && out > 0) { s += dot(X(out), Y(P[out]), 6, C.dn); post += tag(X(out) + 10, Y(P[out]) - 22, n ? "to cash" : "closed below: to cash", C.dn, fade(T, 3.6, 0.3), "start"); }
        if (cnt >= back && back > 0) { s += dot(X(back), Y(P[back]), 6, C.up); post += tag(X(back), Y(P[back]) + 26, n ? "back in" : "closed above: back in", C.up, fade(T, 7, 0.3), "middle"); }
        var dd = fade(T, 10.2, 0.4);
        if (dd > 0) {
          post += tag(g.x1, Y(P[N - 1]) + 22, "buy and hold: worst −" + Math.round(-ddB * 100) + "%", C.grey, dd, "end");
          post += tag(g.x1, Y(E[N - 1]) - 22, "timed: worst −" + Math.round(-ddE * 100) + "%", C.up, dd, "end");
        }
        s += post;
        s += note2(g, ["Buy and hold", "Rides the whole", "decline."], C.grey, win(T, 0.3, 3.2));
        s += note2(g, ["Out", "Below the average:", "T-bills, not the top."], C.dn, win(T, 3.4, 6.6));
        s += note2(g, ["Back in", "Above again: in,", "off the bottom."], C.up, win(T, 6.8, 10));
        s += note2(g, ["Drawdown", "Late both ways,", "but far shallower."], C.up, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up prices");
      }
    };
  }

  /* 3 · whipsaw */
  function whipSpec() {
    var N = 44, P = series([[0, 100], [6, 108], [10, 104], [14, 109], [18, 102], [22, 107], [26, 100], [30, 106], [34, 101], [38, 108], [43, 116]], N, 3, 0.03);
    var M = sma(P, 10), S = signals(P, M, 9), E = timed(P, S, 0.002);
    var flips = 0; for (var i = 10; i < N; i++) if (S[i] !== S[i - 1] && S[i - 1] != null) flips++;
    var ST = [
      { at: 0, title: "A market going nowhere", text: "A made-up index chops sideways for years, crossing its 10-month average back and forth." },
      { at: 3.2, title: "In, out, in, out", text: "Every cross is a trade. The rule sells after small dips and buys back after small bounces, " + flips + " switches here, each a little worse than the last price." },
      { at: 6.6, title: "Lagging buy and hold", text: "In a choppy market the timed line falls behind. Each switch costs a bit, plus trading costs and, in a taxable account, taxes." },
      { at: 10, title: "The insurance premium", text: "That's the price of the rule. It loses a little in sideways markets to stay out of the long, deep declines." }
    ];
    return {
      stages: ST, end: 13.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; }, lo = 84, hi = 126, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = Math.floor(track([[0, 10], [3, N - 1]], T));
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up sideways market · monthly" : "A made-up sideways market · monthly closes", C.faint, 12, "start", 600);
        var bo = fade(T, 3.4, 0.4);
        s += bands(S, X, g, cnt, bo, 9);
        s += poly(lineOf(M, X, Y, cnt), C.blue, 2, "5 4");
        s += poly(lineOf(P, X, Y, cnt), C.grey, 2);
        if (bo > 0) for (var k = 10; k < N; k++) if (S[k] !== S[k - 1] && S[k - 1] != null) s += dot(X(k), Y(P[k]), 4.5, S[k] ? C.up : C.dn, bo);
        var eo = fade(T, 6.8, 0.4);
        if (eo > 0) { s += poly(lineOf(E, X, Y, N), C.up, 2.6, null, eo); post += tag(g.x1, Y(E[N - 1]) + 22, "timed: " + (E[N - 1] >= 100 ? "+" : "−") + Math.abs(Math.round((E[N - 1] / 100 - 1) * 100)) + "%", C.up, eo, "end"); post += tag(g.x1, Y(P[N - 1]) - 22, "buy and hold: +" + Math.round((P[N - 1] / 100 - 1) * 100) + "%", C.grey, eo, "end"); }
        var cn = fade(T, 3.6, 0.4);
        if (cn > 0) post += tag(g.x0 + 4, g.y0 + 14, flips + " switches", C.gold, cn, "start");
        s += post;
        s += note2(g, ["Sideways", "Price keeps crossing", "its average."], C.grey, win(T, 0.3, 3.2));
        s += note2(g, ["Whipsaw", "Sell low, buy back", "a little higher."], C.gold, win(T, 3.4, 6.6));
        s += note2(g, ["It lags", "Plus costs and,", "if taxable, taxes."], C.dn, win(T, 6.8, 10));
        s += note2(g, ["The premium", "Small losses here buy", "protection from crashes."], C.up, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up prices");
      }
    };
  }

  /* 4 · Faber's results */
  function resultsSpec() {
    var G = [
      { h: "S&P 500, 1901–2012", rows: [["Return a year", 10.2, 9.3, "%"], ["Volatility", 12.0, 17.9, "%"], ["Worst drawdown", 50.3, 83.5, "%", true]], at: 0.4 },
      { h: "Five assets, 1973–2012", rows: [["Return a year", 10.5, 9.9, "%"], ["Volatility", 7.0, 10.3, "%"], ["Worst drawdown", 9.5, 46.0, "%", true]], at: 6.4 }
    ];
    var ST = [
      { at: 0, title: "The S&P 500, 1901–2012", text: "Faber's update ran the rule on the S&P 500 back to 1901. The return was about the same as holding, 10.2% a year against 9.3%, before trading costs and taxes." },
      { at: 3.2, title: "With far less pain", text: "The difference was risk: volatility of 12.0% against 17.9%, and a worst drawdown of 50% against 84%. The Sharpe ratio went from 0.32 to 0.55." },
      { at: 6.2, title: "Five assets, each timed", text: "Spread equally over US stocks, foreign stocks, 10-year Treasuries, real estate and commodities, each with its own 10-month rule, 1973–2012: 10.5% a year against 9.9% for holding the same mix." },
      { at: 9.6, title: "Bond-like drawdowns", text: "The timed mix's worst drawdown was 9.5%, against 46% for holding it, with volatility of 7.0% against 10.3%. It was invested about 70% of the time on average." }
    ];
    return {
      stages: ST, end: 13.2, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Faber: timed vs buy and hold" : "Faber (2013 update): timed vs buy and hold, before costs and taxes", C.faint, 12, "start", 600);
        var colW = n ? (g.x1 - g.x0) : (g.x1 - g.x0 - 40) / 2;
        G.forEach(function (grp, gi) {
          var op = fade(T, grp.at, 0.4); if (op <= 0) return;
          var gx = n ? g.x0 : g.x0 + gi * (colW + 40), gy = n ? g.y0 + gi * ((g.y1 - g.y0) / 2 + 6) : g.y0 + 6, gh = n ? (g.y1 - g.y0) / 2 - 10 : g.y1 - g.y0 - 10;
          post += txt(gx, gy + 14, grp.h, C.ink, n ? 13 : 15, "start", 800, op);
          var rh = Math.min((gh - 30) / 3, n ? 60 : 84);
          grp.rows.forEach(function (row, ri) {
            var ro = fade(T, grp.at + (ri === 0 ? 0.2 : 3.0), 0.4) * op; if (ro <= 0) return;
            var y = gy + 32 + ri * rh, max = row[4] ? 90 : 20, lw = n ? 92 : 120, bw = colW - lw - 56, bh = Math.min(16, (rh - 16) / 2);
            post += txt(gx, y + bh + 4, n ? row[0].replace("Worst drawdown", "Worst drop").replace("Return a year", "Return/yr") : row[0], C.dim, 12, "start", 700, ro);
            var a = row[1] / max * bw, b = row[2] / max * bw;
            s += rect(gx + lw, y, a, bh, C.up, 3, 0.9 * ro);
            post += txt(gx + lw + a + 6, y + bh - 3, (row[4] ? "−" : "") + row[1].toFixed(1) + row[3], C.up, 12, "start", 800, ro);
            s += rect(gx + lw, y + bh + 4, b, bh, C.grey, 3, 0.8 * ro);
            post += txt(gx + lw + b + 6, y + 2 * bh + 1, (row[4] ? "−" : "") + row[2].toFixed(1) + row[3], C.dim, 12, "start", 800, ro);
          });
        });
        var lg = fade(T, 0.8, 0.4);
        if (lg > 0) { post += tag(g.x0, g.y1 + 14, "timed", C.up, lg, "start"); post += tag(g.x0 + 64, g.y1 + 14, "buy and hold", C.grey, lg, "start"); }
        s += post;
        s += note2(g, ["Same return", "10.2% vs 9.3% a year,", "before costs."], C.up, win(T, 0.3, 3.2));
        s += note2(g, ["Less risk", "Sharpe 0.55 vs 0.32.", "Worst drop 50% vs 84%."], C.up, win(T, 3.4, 6.2));
        s += note2(g, ["Five assets", "Each timed on its own,", "equal weights."], C.blue, win(T, 6.4, 9.6));
        s += note2(g, ["Worst drop", "9.5% vs 46%.", "Sharpe 0.73 vs 0.44."], C.up, fade(T, 9.8, 0.4));
        return s + stamp(L, "Faber (2007, updated 2013)");
      }
    };
  }

  K.run({
    specs: { rule: ruleSpec, crash: crashSpec, whipsaw: whipSpec, results: resultsSpec },
    steps: [
      { k: "Wait", c: C.grey, tag: "Do nothing until month-end" },
      { k: "Check", c: C.blue, tag: "The close vs its 10-month average" },
      { k: "Hold", c: C.up, tag: "Above: own it next month" },
      { k: "Cash", c: C.dn, tag: "Below: T-bills next month" },
      { k: "Repeat", c: C.gold, tag: "Each asset on its own, every month" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W, mid = d.mid;
      var pts = [[40, mid + 30], [100, mid + 10], [160, mid - 20], [220, mid - 30], [280, mid + 10], [340, mid + 50], [400, mid + 40], [460, mid], [520, mid - 40]];
      s += d.pl(pts, C2.ink, 2);
      s += d.pl([[40, mid + 40], [160, mid + 10], [280, mid - 6], [400, mid + 20], [520, mid + 4]], C2.blue, 2.2);
      if (k === 0) s += d.t(30, bot + 32, "Ignore the daily moves.", C2.dim, 12.5, "start", 500);
      if (k === 1) { pts.forEach(function (p) { s += d.dt(p[0], p[1], C2.blue); }); s += d.t(30, bot + 32, "One check per month, at the close.", C2.dim, 12.5, "start", 500); }
      if (k === 2) { s += d.r(100, top + 10, 180, bot - top - 20, C2.up, 0.12, 0) + d.t(190, top + 30, "hold", C2.up, 14, "middle", 800); s += d.t(30, bot + 32, "Closed above: stay in.", C2.dim, 12.5, "start", 500); }
      if (k === 3) { s += d.r(300, top + 10, 140, bot - top - 20, C2.dn, 0.12, 0) + d.t(370, top + 30, "T-bills", C2.dn, 14, "middle", 800); s += d.t(30, bot + 32, "Closed below: move to cash.", C2.dim, 12.5, "start", 500); }
      if (k === 4) { ["US stocks", "Foreign", "Bonds", "REITs", "Commodities"].forEach(function (a, j) { s += d.r(40 + j * 100, top + 6, 90, 26, j === 2 ? C2.dn : C2.up, 0.3, 6) + d.t(85 + j * 100, top + 24, a, C2.ink, 11.5, "middle", 700); }); s += d.t(30, bot + 32, "Five assets, five signals, equal weights.", C2.dim, 12.5, "start", 500); }
      return s;
    }
  });
})();
