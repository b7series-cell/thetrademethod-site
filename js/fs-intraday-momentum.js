/* =====================================================================
   fs-intraday-momentum.js — walkthroughs on
   famous-strategies/intraday-momentum.html
   (Gao, Han, Li & Zhou 2018).

     halves   one made-up day in 13 half-hours; the first and the last
     trade    two made-up days: up first half-hour -> long the last;
              down -> short
     noise    a made-up scatter: a weak but real tilt (R-squared 1.6%)
     results  the paper's published numbers vs always long
   Uses js/fs-kit.js. Every bar and point is made up; the results chart
   uses the paper's published numbers.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, rng = K.rng, sizeStd = K.sizeStd, mkBars = K.mkBars, drawBars = K.drawBars;

  var HH = ["9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "1:00", "1:30", "2:00", "2:30", "3:00", "3:30"];

  /* one day: index 0 = yesterday's close, 1..13 = half-hours */
  function dayBars(closes, prev, seed) {
    var B = [{ o: prev, h: prev + 0.05, l: prev - 0.05, c: prev }], r = rng(seed), o = closes[0] - (closes[0] - prev) * 0.35;
    for (var i = 0; i < 13; i++) {
      var c = closes[i], op = i === 0 ? o : closes[i - 1];
      B.push({ o: op, h: Math.max(op, c) + r() * 0.35, l: Math.min(op, c) - r() * 0.35, c: c });
    }
    return B;
  }

  /* 1 · the half-hours */
  function halvesSpec() {
    var prev = 500, CLS = [503.4, 503.0, 502.2, 502.9, 503.6, 503.1, 502.6, 503.3, 504.0, 503.5, 504.2, 504.6, 506.1];
    var B = dayBars(CLS, prev, 3);
    var r1 = (CLS[0] / prev - 1) * 100, r13 = (CLS[12] / CLS[11] - 1) * 100;
    var ST = [
      { at: 0, title: "Thirteen half-hours", text: "A made-up day in an S&P 500 fund, as thirteen 30-minute bars from 9:30 am to 4:00 pm, after yesterday's close on the left." },
      { at: 3.2, title: "The first half-hour", text: "The paper's first half-hour runs from yesterday's 4:00 pm close to 10:00 am today, so it includes the overnight gap: everything that happened since the last close. Here it's +" + r1.toFixed(2) + "%." },
      { at: 6.6, title: "The last half-hour", text: "The last half-hour runs from 3:30 to 4:00 pm. The finding: its direction tends to follow the first half-hour's. Here it's +" + r13.toFixed(2) + "%." },
      { at: 9.8, title: "The middle doesn't matter", text: "The eleven half-hours in between showed no such pattern. The two ends of the day are linked, the middle is noise." }
    ];
    return {
      stages: ST, end: 13, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var N = 14, lo = 498.8, hi = 507, X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = Math.floor(track([[0, 1], [3, N]], T)), bw = (g.x1 - g.x0) / N * 0.6;
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up S&P 500 fund · 30-min" : "A made-up S&P 500 fund · 30-minute bars", C.faint, 12, "start", 600);
        var f = fade(T, 3.4, 0.4), l = fade(T, 6.8, 0.4), m = fade(T, 10, 0.4);
        if (f > 0) { s += rect(X(0) - bw, g.y0, X(1) - X(0) + 2 * bw, g.y1 - g.y0, C.blue, 4, 0.12 * f); s += line(X(0), Y(prev), X(1), Y(CLS[0]), C.blue, 2, "4 3", f); post += tag(X(1), g.y0 + 14, n ? "r1 +" + r1.toFixed(2) + "%" : "first half-hour: +" + r1.toFixed(2) + "%", C.blue, f, "start"); }
        if (l > 0) { s += rect(X(13) - bw, g.y0, 2 * bw, g.y1 - g.y0, C.gold, 4, 0.16 * l); post += tag(X(13), g.y0 + 34, n ? "last +" + r13.toFixed(2) + "%" : "last half-hour: +" + r13.toFixed(2) + "%", C.gold, l, "end"); }
        if (m > 0) s += rect(X(2) - bw, g.y1 - 22, X(12) - X(2) + 2 * bw, 16, C.grey, 4, 0.2 * m);
        if (m > 0) post += txt((X(2) + X(12)) / 2, g.y1 - 10, "the middle: no pattern", C.dim, 11.5, "middle", 700, m);
        s += drawBars(B, X, Y, cnt, bw);
        for (var i = 1; i < N; i += n ? 3 : 2) post += txt(X(i), g.y1 + 14, HH[i - 1], C.faint, 10.5, "middle", 600);
        post += txt(X(0), g.y1 + 14, n ? "prev" : "prev close", C.faint, 10.5, "middle", 600);
        s += post;
        s += note2(g, ["13 half-hours", "9:30 am to", "4:00 pm."], C.ink, win(T, 0.3, 3.2));
        s += note2(g, ["First", "Yesterday's close", "to 10:00 am."], C.blue, win(T, 3.4, 6.6));
        s += note2(g, ["Last", "3:30 to 4:00 pm.", "It tends to follow."], C.gold, win(T, 6.8, 9.8));
        s += note2(g, ["Middle", "No pattern", "in between."], C.grey, fade(T, 10, 0.4));
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
  }

  /* 2 · the trade on two days */
  function tradeSpec() {
    var days = [
      { prev: 500, c: [502.6, 502.1, 501.6, 502.3, 502.0, 501.4, 501.9, 502.5, 502.2, 502.8, 502.5, 503.0, 503.9], seed: 4 },
      { prev: 503.9, c: [501.2, 501.8, 501.0, 500.6, 501.3, 500.9, 500.2, 500.7, 501.1, 500.4, 500.8, 500.5, 499.4], seed: 7 }
    ];
    var ST = [
      { at: 0, title: "Day one: up first", text: "Made-up day one: from yesterday's close to 10:00 am, the fund is up. Nothing to do yet: the trade happens at the other end of the day." },
      { at: 3.4, title: "Long at 3:30", text: "At 3:30 pm, because the first half-hour was up, buy. Sell at the 4:00 pm close. Thirty minutes in the market." },
      { at: 6.8, title: "Day two: down first", text: "Made-up day two opens with a gap down, and the first half-hour is negative. At 3:30 pm, sell short, and cover at the close." },
      { at: 10.2, title: "One trade a day", text: "Every day gets a trade in the direction of the first half-hour. The paper's version was long or short every day there was a first half-hour return." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var N = 28, lo = 498, hi = 505.5, X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var B = dayBars(days[0].c, days[0].prev, days[0].seed).concat(dayBars(days[1].c, days[1].prev, days[1].seed));
        var cnt = Math.floor(track([[0, 2], [3, 12], [3.4, 12], [6.4, 14], [6.8, 16], [9.8, 26], [10.2, N]], T)), bw = (g.x1 - g.x0) / N * 0.6;
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Two made-up days · 30-min" : "Two made-up days · 30-minute bars", C.faint, 12, "start", 600);
        s += line(X(13.5), g.y0, X(13.5), g.y1, C.dim, 1, "3 3");
        [0, 1].forEach(function (d) {
          var off = d * 14, dy = days[d], up = dy.c[0] > dy.prev, f = fade(T, d ? 6.8 : 0.4, 0.4), t = fade(T, d ? 8.4 : 3.6, 0.4);
          if (f > 0) { s += rect(X(off) - bw, g.y0, X(off + 1) - X(off) + 2 * bw, g.y1 - g.y0, C.blue, 4, 0.1 * f); post += tag(X(off + 1), g.y0 + 14, (up ? "r1 up " : "r1 down ") + ((dy.c[0] / dy.prev - 1) * 100).toFixed(2) + "%", up ? C.up : C.dn, f, "start"); }
          if (t > 0 && cnt > off + 13) {
            var e = dy.c[11], x = dy.c[12], pnl = (x / e - 1) * 100 * (up ? 1 : -1);
            s += rect(X(off + 13) - bw, g.y0, 2 * bw, g.y1 - g.y0, C.gold, 4, 0.16 * t);
            s += dot(X(off + 12) + bw, Y(e), 5, up ? C.up : C.dn, t);
            post += tag(X(off + 13), Y(Math.max(e, x)) - 26, (up ? "long " : "short ") + (pnl >= 0 ? "+" : "") + pnl.toFixed(2) + "%", up ? C.up : C.dn, t, "end");
          }
        });
        s += drawBars(B, X, Y, cnt, bw);
        s += post;
        s += note2(g, ["Day one", "First half-hour", "up."], C.up, win(T, 0.3, 3.4));
        s += note2(g, ["3:30 pm", "Long until", "the close."], C.up, win(T, 3.6, 6.8));
        s += note2(g, ["Day two", "First half-hour down:", "short at 3:30."], C.dn, win(T, 7, 10.2));
        s += note2(g, ["Every day", "The first half-hour", "sets the side."], C.gold, fade(T, 10.4, 0.4));
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
  }

  /* 3 · it's mostly noise */
  function noiseSpec() {
    var P = [], r = rng(31);
    for (var i = 0; i < 160; i++) {
      var a = (r() + r() + r() - 1.5) * 1.2, b = 0.12 * a + (r() + r() + r() - 1.5) * 0.28;
      P.push([a, b]);
    }
    var ST = [
      { at: 0, title: "One dot per day", text: "Each dot is a made-up day: the first half-hour's return across, the last half-hour's up and down." },
      { at: 3.2, title: "A slight tilt", text: "Fit a line and it tilts up: days that started up tended to end up in the last half-hour, and down days down. But the dots are scattered all over." },
      { at: 6.6, title: "R-squared of 1.6%", text: "In the paper, the first half-hour explained 1.6% of the variation in the last half-hour on SPY, 1993–2013. Adding the 3:00–3:30 pm half-hour raised it to 2.6%." },
      { at: 9.8, title: "Small, but repeated daily", text: "A 1.6% fit is weak for one day. Repeated every trading day for twenty years, a small tilt in your favor adds up, if costs don't eat it." }
    ];
    return {
      stages: ST, end: 13, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var cx = (g.x0 + g.x1) / 2, cy = (g.y0 + g.y1) / 2, sx = (g.x1 - g.x0) / 2 / 2.2, sy = (g.y1 - g.y0) / 2 / 0.9;
        var X = function (a) { return cx + a * sx; }, Y = function (b) { return cy - b * sy; };
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up days" : "Made-up days: first half-hour vs last half-hour", C.faint, 12, "start", 600);
        s += line(g.x0, cy, g.x1, cy, C.dim, 1) + line(cx, g.y0, cx, g.y1, C.dim, 1);
        post += txt(g.x1, cy - 6, "first half-hour →", C.faint, 11, "end", 600);
        post += txt(cx + 6, g.y0 + 10, "last half-hour ↑", C.faint, 11, "start", 600);
        var k = Math.floor(track([[0.2, 0], [2.8, P.length]], T));
        for (var i = 0; i < k; i++) { var p = P[i], q = p[0] * p[1] > 0; s += dot(X(p[0]), Y(p[1]), 3.2, fade(T, 3.4, 0.4) > 0 ? (q ? C.up : C.dn) : C.ink, 0.7); }
        var ln = fade(T, 3.4, 0.6);
        if (ln > 0) { s += line(X(-2.2), Y(-2.2 * 0.12), X(2.2), Y(2.2 * 0.12), C.gold, 2.6, null, ln); }
        var r2 = fade(T, 6.8, 0.4);
        if (r2 > 0) post += tag(g.x0 + 4, g.y0 + 14, "paper: R² 1.6% (2.6% with 3:00–3:30)", C.gold, r2, "start");
        var q2 = fade(T, 3.6, 0.4);
        if (q2 > 0 && !n) { post += txt(g.x1 - 4, g.y0 + 14, "same direction: green", C.up, 11.5, "end", 700, q2); post += txt(g.x1 - 4, g.y0 + 30, "opposite: red", C.dn, 11.5, "end", 700, q2); }
        s += post;
        s += note2(g, ["Each day", "First half-hour vs", "last half-hour."], C.ink, win(T, 0.3, 3.2));
        s += note2(g, ["The tilt", "Up starts lean to", "up finishes."], C.gold, win(T, 3.4, 6.6));
        s += note2(g, ["R² 1.6%", "Weak on any", "single day."], C.gold, win(T, 6.8, 9.8));
        s += note2(g, ["Repeated", "Small edges add up,", "if costs allow."], C.up, fade(T, 10, 0.4));
        return s + stamp(L, "Illustrative · made-up days");
      }
    };
  }

  /* 4 · results */
  function resultsSpec() {
    var R = [
      ["Return a year", 6.67, -1.11, 8, "%", 0.4],
      ["Volatility", 6.19, 6.21, 8, "%", 3.6],
      ["Sharpe ratio", 1.08, -0.18, 1.3, "", 3.9],
      ["Right direction", 54.37, 50.42, 60, "%", 6.8]
    ];
    var ST = [
      { at: 0, title: "The timing strategy", text: "Gao, Han, Li and Zhou's timing rule on SPY, 1993–2013: in the last half-hour, long after an up first half-hour and short after a down one. It made 6.67% a year." },
      { at: 3.4, title: "Against always long", text: "Simply being long every last half-hour lost 1.11% a year over the same period, with the same volatility. The Sharpe ratios: 1.08 against −0.18." },
      { at: 6.6, title: "Right 54% of the time", text: "The rule called the last half-hour's direction right on 54.37% of days, against 50.42% for always long. A small edge, used every day." },
      { at: 9.8, title: "Before costs, and since", text: "The paper's returns are before trading costs. In our own run of this page's indicator on the last 464 days of SPY 30-minute bars, it was right 47.8% of the time, with an average close to zero." }
    ];
    return {
      stages: ST, end: 13.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "SPY last half-hour, 1993–2013" : "SPY, last half-hour only, 1993–2013: timing rule vs always long", C.faint, 12, "start", 600);
        var rh = (g.y1 - g.y0 - 20) / R.length, lw = n ? 0 : 150, zx = g.x0 + lw + (n ? 40 : 60), wmax = g.x1 - zx - 70;
        R.forEach(function (row, k) {
          var op = fade(T, row[5], 0.4); if (op <= 0) return;
          var y = g.y0 + 10 + k * rh, bh = Math.min(20, (rh - (n ? 34 : 16)) / 2), yb = n ? y + 20 : y + 4, gr = track([[row[5], 0], [row[5] + 1.2, 1]], T);
          post += txt(g.x0, n ? y + 12 : y + bh + 6, row[0], C.ink, n ? 12.5 : 13.5, "start", 800, op);
          var base = k === 3 ? 45 : 0, sc = wmax / (row[3] - base);
          var a = (row[1] - base) * sc * gr, b = (row[2] - base) * sc * gr;
          s += rect(Math.min(zx, zx + a), yb, Math.abs(a), bh, C.gold, 3, 0.9 * op);
          post += txt(Math.max(zx, zx + a) + 6, yb + bh - 4, (row[1] < 0 ? "−" : "") + Math.abs(row[1]).toFixed(2) + row[4], C.gold, 12.5, "start", 800, op);
          s += rect(Math.min(zx, zx + b), yb + bh + 4, Math.abs(b), bh, C.grey, 3, 0.8 * op);
          post += txt(Math.max(zx, zx + b) + 6, yb + 2 * bh, (row[2] < 0 ? "−" : "") + Math.abs(row[2]).toFixed(2) + row[4], C.dim, 12.5, "start", 800, op);
          if (k === 3) post += txt(zx - 4, yb + bh + 4, "45%", C.faint, 10, "end", 600, op);
        });
        s += line(zx, g.y0 + 6, zx, g.y1 - 4, C.dim, 1);
        var lg = fade(T, 0.8, 0.4);
        if (lg > 0) { post += tag(g.x0, g.y1 + 14, "timing rule", C.gold, lg, "start"); post += tag(g.x0 + 96, g.y1 + 14, "always long", C.grey, lg, "start"); }
        s += post;
        s += note2(g, ["Timing rule", "6.67% a year from", "30 minutes a day."], C.gold, win(T, 0.3, 3.4));
        s += note2(g, ["Always long", "−1.11% a year.", "Sharpe 1.08 vs −0.18."], C.grey, win(T, 3.6, 6.6));
        s += note2(g, ["Hit rate", "54.37% vs 50.42%", "of days."], C.gold, win(T, 6.8, 9.8));
        s += note2(g, ["Caveats", "Before costs. Our recent", "run: 47.8%, about zero."], C.dn, fade(T, 10, 0.4));
        return s + stamp(L, "Gao, Han, Li & Zhou (2018)");
      }
    };
  }

  K.run({
    specs: { halves: halvesSpec, trade: tradeSpec, noise: noiseSpec, results: resultsSpec },
    steps: [
      { k: "Measure", c: C.blue, tag: "Yesterday's close to 10:00 am" },
      { k: "Wait", c: C.grey, tag: "Do nothing until 3:30 pm" },
      { k: "Enter", c: C.up, tag: "Long if it was up, short if down" },
      { k: "Exit", c: C.gold, tag: "At the 4:00 pm close" },
      { k: "Costs", c: C.dn, tag: "A small edge: keep costs tiny" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W, mid = d.mid;
      var x0 = 40, x1 = W - 40, xs = function (i) { return x0 + i * (x1 - x0) / 13; };
      for (var i = 0; i < 13; i++) {
        var col = i === 0 ? C2.blue : i === 12 ? C2.gold : C2.dim, on = (i === 0 && k >= 0) || (i === 12 && k >= 2) || (k === 1 && i > 0 && i < 12);
        s += d.r(xs(i) + 2, mid - 30, (x1 - x0) / 13 - 4, 60, col, on ? 0.75 : 0.18, 4);
      }
      s += d.t(xs(0.5), mid + 54, "9:30", C2.dim, 11, "middle", 600) + d.t(xs(12.5), mid + 54, "3:30", C2.dim, 11, "middle", 600);
      var t = ["The first half-hour includes the overnight gap.", "Eleven half-hours with no pattern.", "Trade the direction of the first half-hour.", "Out at the close. Never held overnight.", "Commissions and spread matter on a 30-minute trade."][k];
      s += d.t(30, bot + 32, t, C2.dim, 12.5, "start", 500);
      return s;
    }
  });
})();
