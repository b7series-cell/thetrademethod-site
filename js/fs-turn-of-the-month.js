/* =====================================================================
   fs-turn-of-the-month.js — walkthroughs on
   famous-strategies/turn-of-the-month.html
   (Lakonishok & Smidt 1988; McConnell & Xu 2008).

     calendar  which four days: the last of the month, the first three
     split     McConnell & Xu's average daily returns, in and out
     trade     a made-up year: in the market four days a month
     global    31 of 35 countries, and the explanations that failed
   Uses js/fs-kit.js. The calendar and the year are made up; the return
   bars and the country count use the paper's published numbers.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, rng = K.rng, sizeStd = K.sizeStd;

  /* 1 · the calendar */
  function calSpec() {
    /* two made-up months of trading days: [label, isTOM-last, isTOM-first] */
    var A = [], i;
    for (i = 1; i <= 22; i++) A.push({ m: 0, d: i, last: i === 22, first: false });
    for (i = 1; i <= 21; i++) A.push({ m: 1, d: i, last: false, first: i <= 3 });
    var ST = [
      { at: 0, title: "Two months of trading days", text: "Two made-up months, one box per trading day, weekends and holidays left out." },
      { at: 3, title: "The last trading day", text: "The turn of the month starts on the last trading day of the month, here day 22." },
      { at: 5.8, title: "And the first three", text: "It continues through the first three trading days of the new month. Four days in all, about a fifth of the trading days." },
      { at: 9, title: "Buy the day before", text: "To own the last day's return, buy at the close of the day before it, and sell at the close of the third trading day. Then wait for next month." }
    ];
    return {
      stages: ST, end: 12.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var cols = n ? 6 : 11, cw = (g.x1 - g.x0) / cols, ch = n ? 34 : 46, gap = 6;
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Two made-up months" : "Two made-up months of trading days", C.faint, 12, "start", 600);
        var k = Math.floor(track([[0.2, 0], [2.6, A.length]], T)), lt = fade(T, 3.2, 0.4), ft = fade(T, 6, 0.4), bt = fade(T, 9.2, 0.4);
        var yoff = 0, idx = 0;
        [0, 1].forEach(function (m) {
          var days = A.filter(function (a) { return a.m === m; });
          post += txt(g.x0, g.y0 + yoff + 12, m === 0 ? "Month one" : "Month two", C.dim, 12, "start", 800);
          days.forEach(function (a, j) {
            var x = g.x0 + (j % cols) * cw, y = g.y0 + yoff + 22 + Math.floor(j / cols) * (ch + gap), on = idx < k;
            var hot = (a.last && lt > 0) || (a.first && ft > 0), op = a.last ? lt : ft;
            if (on) {
              s += rect(x + 2, y, cw - 4, ch, hot ? C.up : "#2c2c2e", 6, hot ? 0.35 + 0.5 * op : 0.9);
              post += txt(x + cw / 2, y + ch / 2 + 5, String(a.d), hot ? "#000" : C.dim, n ? 12 : 14, "middle", 800);
              if (bt > 0 && m === 0 && a.d === 21) { s += rect(x + 2, y, cw - 4, ch, C.blue, 6, 0.6 * bt); post += txt(x + cw / 2, y - 6, n ? "buy" : "buy at close", C.blue, 11, "middle", 800, bt); }
              if (bt > 0 && m === 1 && a.d === 3) post += txt(x + cw / 2, y - 6, n ? "sell" : "sell at close", C.gold, 11, "middle", 800, bt);
            }
            idx++;
          });
          yoff += 22 + Math.ceil(days.length / cols) * (ch + gap) + (n ? 18 : 22);
        });
        s += post;
        s += note2(g, ["Trading days", "Weekends and", "holidays don't count."], C.ink, win(T, 0.3, 3));
        s += note2(g, ["Last day", "The month's final", "trading day."], C.up, win(T, 3.2, 5.8));
        s += note2(g, ["First three", "Four days in all,", "about a fifth."], C.up, win(T, 6, 9));
        s += note2(g, ["The trade", "Buy the day before,", "sell after day three."], C.blue, fade(T, 9.2, 0.4));
        return s + stamp(L, "Illustrative · made-up months");
      }
    };
  }

  /* 2 · McConnell & Xu's numbers */
  function splitSpec() {
    var G = [
      { h: "Value-weighted US stocks", a: 0.15, b: -0.001, at: 0.4 },
      { h: "Equal-weighted US stocks", a: 0.22, b: 0.04, at: 3.6 }
    ];
    var ST = [
      { at: 0, title: "Big stocks, 1926–2005", text: "McConnell and Xu, using every US stock from 1926 to 2005. On the four turn-of-the-month days, the value-weighted market averaged 0.15% a day." },
      { at: 3.4, title: "Every stock, equally", text: "Weighting every stock equally, the turn-of-the-month days averaged 0.22% a day, against 0.04% on the other days." },
      { at: 6.6, title: "The rest of the month: nothing", text: "For the value-weighted market, the other 16 or so days averaged −0.001% a day. In their words, investors got no average reward for market risk except around the turn of the month." },
      { at: 9.8, title: "Not just small stocks", text: "It wasn't confined to small or low-priced stocks, to quarter-ends or year-ends, and it held in recent decades too." }
    ];
    return {
      stages: ST, end: 13, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Average daily return, 1926–2005" : "Average return per trading day, US stocks, 1926–2005", C.faint, 12, "start", 600);
        var colW = n ? g.x1 - g.x0 : (g.x1 - g.x0 - 40) / 2;
        G.forEach(function (gp, gi) {
          var op = fade(T, gp.at, 0.4); if (op <= 0) return;
          var gx = n ? g.x0 : g.x0 + gi * (colW + 40), gy = n ? g.y0 + gi * (g.y1 - g.y0) / 2 : g.y0, gh = n ? (g.y1 - g.y0) / 2 - 10 : g.y1 - g.y0;
          post += txt(gx, gy + 16, gp.h, C.ink, n ? 13 : 15, "start", 800, op);
          var z = gy + gh * 0.82, sc = (gh * 0.6) / 0.24, bw = Math.min(110, colW / 3.2);
          s += line(gx, z, gx + colW, z, C.dim, 1, null, op);
          var gr = track([[gp.at, 0], [gp.at + 1.2, 1]], T), o2 = fade(T, gi === 0 ? 6.8 : gp.at, 0.4);
          var ha = gp.a * sc * gr, hb = Math.max(2, Math.abs(gp.b) * sc) * (gp.b < 0 ? -1 : 1) * (gi === 0 ? track([[6.8, 0], [7.8, 1]], T) : gr);
          var xa = gx + colW * 0.18, xb = gx + colW * 0.6;
          s += rect(xa, z - ha, bw, ha, C.up, 4, 0.9 * op);
          post += txt(xa + bw / 2, z - ha - 8, (gp.a * gr).toFixed(2) + "%", C.up, 15, "middle", 800, op);
          post += txt(xa + bw / 2, z + 18, n ? "turn of month" : "4 turn-of-month days", C.ink, 11.5, "middle", 700, op);
          if (o2 > 0) {
            s += rect(xb, hb > 0 ? z - hb : z, bw, Math.abs(hb), C.grey, 4, 0.85 * o2);
            post += txt(xb + bw / 2, z - Math.max(hb, 0) - 8, (gp.b < 0 ? "−" : "") + Math.abs(gp.b).toFixed(gi === 0 ? 3 : 2) + "%", C.dim, 15, "middle", 800, o2);
            post += txt(xb + bw / 2, z + 18, n ? "other days" : "the other days", C.ink, 11.5, "middle", 700, o2);
          }
        });
        s += post;
        s += note2(g, ["Big stocks", "0.15% a day on the", "four turn days."], C.up, win(T, 0.3, 3.4));
        s += note2(g, ["All stocks", "0.22% vs 0.04%", "a day."], C.up, win(T, 3.6, 6.6));
        s += note2(g, ["The rest", "−0.001% a day:", "no reward at all."], C.grey, win(T, 6.8, 9.8));
        s += note2(g, ["Robust", "Not small caps, not", "year-ends, not old."], C.ink, fade(T, 10, 0.4));
        return s + stamp(L, "McConnell & Xu (2008)");
      }
    };
  }

  /* 3 · a made-up year */
  function tradeSpec() {
    var r = rng(38), D = [], i, m;
    for (m = 0; m < 12; m++) for (i = 0; i < 21; i++) {
      var tom = i === 20 || i < 3;
      D.push({ tom: tom, ret: (tom ? 0.0015 : -0.0001) + (r() - 0.5) * 0.022, m: m });
    }
    var H = [100], S = [100];
    D.forEach(function (d, k) { H.push(H[k] * (1 + d.ret)); S.push(S[k] * (1 + (d.tom ? d.ret : 0.0002))); });
    var N = D.length, lo = Math.min(Math.min.apply(null, H), Math.min.apply(null, S)) * 0.97, hi = Math.max(Math.max.apply(null, H), Math.max.apply(null, S)) * 1.03;
    var ST = [
      { at: 0, title: "A made-up year", text: "A made-up year of daily returns for an index fund, built so the turn-of-the-month days average a little more, the way the history did, with plenty of noise." },
      { at: 3.4, title: "In four days a month", text: "The strategy is in the fund only on the green days: from the close before the last trading day to the close of the third. The rest of the time it holds cash." },
      { at: 6.8, title: "About a fifth of the time", text: "That's roughly 48 days a year in the market. It skips most of the market's swings, good and bad, and most of its risk." },
      { at: 10, title: "The result", text: "In this made-up year, the gold line holds the fund only on turn-of-the-month days and ends about level with the grey line, which holds it every day. Real years vary: in some, the other days carry big gains it misses." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (k) { return g.x0 + k / N * (g.x1 - g.x0); }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = Math.floor(track([[0.2, 5], [3.2, N]], T));
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up year · daily, growth of 100" : "A made-up year · daily, growth of 100", C.faint, 12, "start", 600);
        var bo = fade(T, 3.6, 0.4);
        if (bo > 0) D.forEach(function (d, k) { if (d.tom && k < cnt) s += rect(X(k), g.y0, X(1) - X(0) + 0.4, g.y1 - g.y0, C.up, 0, 0.16 * bo); });
        var ph = []; for (i = 0; i <= cnt; i++) ph.push([X(i), Y(H[i])]);
        s += poly(ph, C.grey, 1.8);
        var so = fade(T, 3.6, 0.4);
        if (so > 0) { var ps = []; for (i = 0; i <= cnt; i++) ps.push([X(i), Y(S[i])]); s += poly(ps, C.gold, 2.6, null, so); }
        var dd = fade(T, 7, 0.4);
        if (dd > 0) post += tag(g.x0 + 4, g.y0 + 14, "in the market " + D.filter(function (d) { return d.tom; }).length + " of " + N + " days", C.up, dd, "start");
        var fin = fade(T, 10.2, 0.4);
        if (fin > 0) {
          post += tag(g.x1, Y(S[N]) - 18, "turn of month only: " + (S[N] - 100 >= 0 ? "+" : "") + (S[N] - 100).toFixed(1) + "%", C.gold, fin, "end");
          post += tag(g.x1, Y(H[N]) + 20, "every day: " + (H[N] - 100 >= 0 ? "+" : "") + (H[N] - 100).toFixed(1) + "%", C.grey, fin, "end");
        }
        s += post;
        s += note2(g, ["A year", "Made-up returns,", "lots of noise."], C.ink, win(T, 0.3, 3.4));
        s += note2(g, ["Green days", "Owned only on the", "turn of the month."], C.up, win(T, 3.6, 6.8));
        s += note2(g, ["A fifth", "About 48 days", "a year in."], C.up, win(T, 7, 10));
        s += note2(g, ["Made up", "Same gain, a fifth", "of the time. Real years vary."], C.gold, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up returns");
      }
    };
  }

  /* 4 · global, and unexplained */
  function globalSpec() {
    var ST = [
      { at: 0, title: "35 countries", text: "McConnell and Xu also checked 35 countries' stock markets." },
      { at: 2.6, title: "31 of them", text: "The turn-of-the-month pattern showed up in 31 of the 35. Lakonishok and Smidt had already found it in 90 years of the Dow, back to 1897." },
      { at: 6, title: "Not the paycheck theory", text: "The obvious explanation is money arriving at month-end: paychecks, pension contributions, fund inflows. The authors looked for higher volume and net fund inflows at the turn of the month, and found neither." },
      { at: 9.6, title: "A puzzle", text: "Not small stocks, not quarter-ends, not higher volatility, not flows. The authors called it a puzzle in search of an answer." }
    ];
    return {
      stages: ST, end: 13, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var cols = n ? 5 : 7, rows = Math.ceil(35 / cols), cw = Math.min((g.x1 - g.x0) / cols, n ? 64 : 92), chh = Math.min((g.y1 - g.y0 - (n ? 120 : 80)) / rows, n ? 44 : 54);
        var gx = g.x0 + ((g.x1 - g.x0) - cols * cw) / 2;
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "35 countries" : "35 countries' stock markets (squares, not a map)", C.faint, 12, "start", 600);
        var k = Math.floor(track([[0.2, 0], [2.2, 35]], T)), lit = fade(T, 2.8, 0.6), miss = [6, 17, 23, 31];
        for (var i = 0; i < 35; i++) {
          if (i >= k) continue;
          var x = gx + (i % cols) * cw, y = g.y0 + 10 + Math.floor(i / cols) * chh, ok = miss.indexOf(i) < 0;
          s += rect(x + 4, y + 4, cw - 8, chh - 8, ok && lit > 0 ? C.up : "#3a3a3c", 6, ok && lit > 0 ? 0.3 + 0.55 * lit : 0.9);
        }
        if (lit > 0) post += tag((g.x0 + g.x1) / 2, g.y0 + 10 + rows * chh + 16, "31 of 35 countries", C.up, lit, "middle");
        var ex = fade(T, 6.2, 0.4);
        if (ex > 0) {
          var by = g.y0 + 10 + rows * chh + 40;
          [["higher volume?", "no"], ["fund inflows?", "no"], ["just small stocks?", "no"]].forEach(function (q, j) {
            var bx = n ? g.x0 : g.x0 + j * (g.x1 - g.x0) / 3, yy = n ? by + j * 22 : by;
            post += txt(bx, yy + 12, q[0], C.ink, 12.5, "start", 700, ex);
            post += txt(bx + (n ? 150 : 140), yy + 12, q[1], C.dn, 12.5, "start", 800, ex);
          });
        }
        s += post;
        s += note2(g, ["Worldwide?", "35 countries", "checked."], C.ink, win(T, 0.3, 2.6));
        s += note2(g, ["31 of 35", "The same four", "days stand out."], C.up, win(T, 2.8, 6));
        s += note2(g, ["Paychecks?", "No extra volume", "or fund inflows."], C.dn, win(T, 6.2, 9.6));
        s += note2(g, ["Unexplained", "\"A puzzle in search", "of an answer.\""], C.gold, fade(T, 9.8, 0.4));
        return s + stamp(L, "McConnell & Xu (2008)");
      }
    };
  }

  K.run({
    specs: { calendar: calSpec, split: splitSpec, trade: tradeSpec, global: globalSpec },
    steps: [
      { k: "Count", c: C.grey, tag: "Find the month's last trading day" },
      { k: "Buy", c: C.blue, tag: "At the close the day before it" },
      { k: "Hold", c: C.up, tag: "The last day and the first three" },
      { k: "Sell", c: C.gold, tag: "At the close of trading day three" },
      { k: "Wait", c: C.dn, tag: "Cash for the rest of the month" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W, mid = d.mid;
      var cells = ["18", "19", "20", "21", "22", "1", "2", "3", "4", "5"];
      cells.forEach(function (c, j) {
        var x = 30 + j * 50, tom = j >= 4 && j <= 7, ent = j === 3, ex = j === 7;
        var col = (k >= 2 && tom) ? C2.up : (k === 1 && ent) ? C2.blue : (k === 3 && ex) ? C2.gold : (k === 0 && j === 4) ? C2.ink : C2.dim;
        var hot = (k >= 2 && tom) || (k === 1 && ent) || (k === 3 && ex) || (k === 0 && j === 4);
        s += d.r(x, mid - 30, 42, 50, col, hot ? 0.8 : 0.18, 6) + d.t(x + 21, mid + 2, c, hot ? "#000" : C2.ink, 14, "middle", 800);
      });
      s += d.t(30, mid + 48, "month ends", C2.dim, 11, "start", 600) + d.t(280, mid + 48, "new month", C2.dim, 11, "start", 600);
      var t = ["Weekends and holidays don't count.", "Buy at the close of the second-to-last trading day.", "Four trading days in the market.", "Sell at the close of the third trading day.", "No position until next month's turn."][k];
      s += d.t(30, bot + 32, t, C2.dim, 12.5, "start", 500);
      return s;
    }
  });
})();
