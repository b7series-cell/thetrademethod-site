/* =====================================================================
   fs-sector-rotation.js — walkthroughs on
   famous-strategies/sector-rotation.html
   (Moskowitz & Grinblatt 1999; Faber 2010).

     rank        ten sectors ranked on trailing return, top three held
     rotate      ranks month by month: who drops out, who comes in
     industries  stocks inside a hot industry move together
     filter      the trend filter: T-bills when the market is below
                 its 10-month average
   Uses js/fs-kit.js. Every return is made up.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, rng = K.rng, sizeStd = K.sizeStd;

  var SECT = ["Technology", "Energy", "Industrials", "Financials", "Health care", "Materials", "Consumer disc.", "Communication", "Staples", "Utilities"];
  var SCOL = ["#2997ff", "#ff9f0a", "#64d2ff", "#bf5af2", "#30d158", "#f4b942", "#ff375f", "#5e5ce6", "#a2845e", "#8e8e93"];

  /* 1 · rank */
  function rankSpec() {
    var R = [24.1, 18.6, 15.2, 11.9, 9.4, 7.7, 5.1, 2.6, -1.8, -4.3];
    var ST = [
      { at: 0, title: "Ten sectors", text: "Month-end. Ten made-up sector returns over the trailing months. Faber used ten industry groups going back to the 1920s; today the SPDR sector ETFs are the usual stand-ins." },
      { at: 3.2, title: "Rank them", text: "Sort them from best to worst trailing return. Faber tested lookbacks from 1 to 12 months, and a combined score that averages the 1, 3, 6, 9 and 12-month returns." },
      { at: 6.4, title: "Hold the top three", text: "Put a third of the money in each of the top three sectors. That's it until next month: no forecasts about the economy, just what's been working." },
      { at: 9.6, title: "Skip the laggards", text: "The bottom seven aren't held at all. Industry momentum says the leaders tend to keep leading for a while, and the laggards to keep lagging." }
    ];
    return {
      stages: ST, end: 12.8, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var order = [3, 0, 7, 9, 1, 5, 2, 8, 4, 6], srt = fade(T, 3.4, 1.2);
        var rh = (g.y1 - g.y0 - 10) / 10, lx = g.x0 + (n ? 104 : 140), zx = lx + (n ? 40 : 90), wmax = g.x1 - zx - 60;
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Trailing return · made-up" : "Trailing return · ten made-up sectors", C.faint, 12, "start", 600);
        if (srt > 0.5) s += line(zx, g.y0 + 4, zx, g.y1, C.dim, 1);
        var top = fade(T, 6.6, 0.4), bot = fade(T, 9.8, 0.4);
        if (top > 0) s += rect(g.x0 - 6, g.y0 + 6, g.x1 - g.x0 + 12, rh * 3 - 2, C.up, 6, 0.1 * top);
        for (var i = 0; i < 10; i++) {
          var from = order.indexOf(i), y = g.y0 + 10 + (from + (i - from) * K.ease(srt)) * rh, h = Math.min(rh - 8, 22);
          var op = fade(T, 0.3 + i * 0.08, 0.3), dim = i >= 3 ? 1 - 0.6 * bot : 1;
          if (op <= 0) continue;
          post += txt(g.x0, y + h / 2 + 4, SECT[i], C.ink, n ? 11.5 : 13, "start", 700, op * dim);
          var w = R[i] / 25 * wmax;
          s += rect(Math.min(zx, zx + w), y, Math.abs(w), h, SCOL[i], 3, 0.8 * op * dim);
          post += txt(w >= 0 ? zx + w + 6 : zx + 6, y + h / 2 + 4, (R[i] > 0 ? "+" : "−") + Math.abs(R[i]).toFixed(1) + "%", C.dim, 11.5, "start", 700, op * dim);
          if (i < 3 && top > 0) post += txt(g.x1 + (n ? 8 : 10), y + h / 2 + 4, "⅓", C.up, 14, "start", 800, top);
          if (srt > 0.9) post += txt(lx - 10 + (n ? 0 : 0), y + h / 2 + 4, "#" + (i + 1), C.faint, 11, "end", 700, srt);
        }
        if (top > 0) post += tag(g.x1, g.y0 + 3 * rh + 18, n ? "held: top 3" : "held: top three, a third each", C.up, top, "end");
        s += post;
        s += note2(g, ["Ten sectors", "One trailing return", "for each."], C.ink, win(T, 0.3, 3.2));
        s += note2(g, ["Rank", "Best to worst.", "No forecasts."], C.blue, win(T, 3.4, 6.4));
        s += note2(g, ["Top three", "A third of the money", "in each."], C.up, win(T, 6.6, 9.6));
        s += note2(g, ["The rest", "Not held until", "they climb back."], C.grey, fade(T, 9.8, 0.4));
        return s + stamp(L, "Illustrative · made-up returns");
      }
    };
  }

  /* 2 · rotate */
  function rotateSpec() {
    var M = 9;
    /* rank of each sector (index into SECT) by month; lower is better */
    var RK = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [1, 3, 2, 4, 5, 6, 7, 8, 9, 10],
      [1, 4, 2, 3, 6, 5, 7, 8, 9, 10],
      [2, 5, 1, 3, 7, 4, 6, 8, 9, 10],
      [3, 6, 1, 2, 7, 4, 5, 9, 8, 10],
      [4, 7, 1, 2, 6, 3, 5, 10, 8, 9],
      [5, 8, 2, 1, 4, 3, 6, 10, 7, 9],
      [6, 9, 3, 1, 4, 2, 5, 10, 7, 8],
      [7, 9, 4, 1, 3, 2, 5, 10, 6, 8]
    ];
    var ST = [
      { at: 0, title: "Ranks change slowly", text: "Each line is one made-up sector's rank, month by month. Number one is at the top. The green band is the top three, the ones held." },
      { at: 3.4, title: "One drops out", text: "When a sector slips out of the top three at a month-end, it's sold, and the sector that moved into the top three is bought with the money." },
      { at: 6.8, title: "Leaders fade, new ones rise", text: "Technology leads for months, then fades. Financials and Materials work their way up. The model follows them without needing a reason." },
      { at: 10, title: "A few trades a year", text: "Because trailing returns move slowly, most months the top three don't change, and a typical switch replaces one sector, not all three." }
    ];
    return {
      stages: ST, end: 13.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (m) { return g.x0 + (n ? 0 : 20) + m / (M - 1) * (g.x1 - g.x0 - (n ? 80 : 150)); }, Y = function (r) { return g.y0 + 14 + (r - 1) * (g.y1 - g.y0 - 28) / 9; };
        var cnt = track([[0.3, 0], [3.2, 3], [3.6, 3], [6.6, 6], [7, 6], [9.6, M - 1]], T);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Rank by month · made-up" : "Each sector's rank, month by month · made-up", C.faint, 12, "start", 600);
        s += rect(g.x0, Y(1) - 12, g.x1 - g.x0, Y(3) - Y(1) + 24, C.up, 6, 0.1);
        post += txt(g.x0 + 4, Y(3) + 26, "top three: held", C.up, 11.5, "start", 800);
        for (var m = 0; m < M; m++) post += txt(X(m), g.y1 + 14, "m" + (m + 1), C.faint, 11, "middle", 600, m <= cnt ? 1 : 0.3);
        for (var i = 0; i < 10; i++) {
          var pts = [], full = Math.floor(cnt), fr = cnt - full;
          for (var k = 0; k <= full; k++) pts.push([X(k), Y(RK[k][i])]);
          if (full < M - 1 && fr > 0) pts.push([X(full) + (X(full + 1) - X(full)) * fr, Y(RK[full][i] + (RK[full + 1][i] - RK[full][i]) * fr)]);
          var hot = i === 0 || i === 3 || i === 5;
          s += poly(pts, SCOL[i], hot ? 2.8 : 1.6, null, hot ? 1 : 0.55);
          var last = pts[pts.length - 1];
          s += dot(last[0], last[1], 4, SCOL[i]);
          if (cnt >= M - 1.01 && !n) post += txt(last[0] + 10, last[1] + 4, SECT[i], SCOL[i], 11.5, "start", 700, hot ? 1 : 0.7);
          if (cnt >= M - 1.01 && n && hot) post += txt(last[0] + 8, last[1] + 4, SECT[i].split(" ")[0], SCOL[i], 11, "start", 700);
        }
        /* swap markers: where the top-3 set changed */
        var swaps = [];
        for (var a = 1; a < M; a++) for (var j = 0; j < 10; j++) if (RK[a][j] <= 3 && RK[a - 1][j] > 3) swaps.push([a, j]);
        swaps.forEach(function (sw) { if (sw[0] <= cnt) s += dot(X(sw[0]), Y(RK[sw[0]][sw[1]]), 8, C.up, 0.35); });
        var nt = fade(T, 10.2, 0.4);
        if (nt > 0) post += tag(g.x0 + 4, g.y1 - 10, swaps.length + " swaps in " + (M - 1) + " months", C.gold, nt, "start");
        s += post;
        s += note2(g, ["Ranks", "One line per sector.", "Top three held."], C.up, win(T, 0.3, 3.4));
        s += note2(g, ["A swap", "Out of the top three:", "sold and replaced."], C.gold, win(T, 3.6, 6.8));
        s += note2(g, ["Rotation", "Leaders fade,", "new ones climb."], C.blue, win(T, 7, 10));
        s += note2(g, ["Few trades", "Most months,", "no change."], C.ink, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up ranks");
      }
    };
  }

  /* 3 · industries explain momentum */
  function indSpec() {
    var N = 40, r = rng(23), groups = [
      { name: "a hot industry", col: C.up, drift: 0.011, k: 5 },
      { name: "a cold industry", col: C.dn, drift: -0.007, k: 5 }
    ];
    var lines = [];
    groups.forEach(function (gp, gi) {
      for (var k = 0; k < gp.k; k++) {
        var v = [100], own = (r() - 0.5) * 0.004;
        for (var i = 1; i < N; i++) v.push(v[i - 1] * (1 + gp.drift + own + (r() - 0.5) * 0.035));
        lines.push({ g: gi, v: v });
      }
    });
    var ST = [
      { at: 0, title: "Ten made-up stocks", text: "Ten made-up stocks over 40 months. At first they look like ten separate stories." },
      { at: 3.2, title: "Colored by industry", text: "Color them by industry and a pattern appears: five belong to one industry, and they rose together. The other five belong to another, and they fell together." },
      { at: 6.6, title: "Momentum in industries", text: "Moskowitz and Grinblatt found that much of the momentum in single stocks is really momentum in their industries. Controlling for industry, stock momentum got much weaker." },
      { at: 9.8, title: "Why sectors work", text: "That's the case for rotating sectors instead of picking stocks: most of the momentum is in the group, with far fewer positions and lower costs." }
    ];
    return {
      stages: ST, end: 13, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (i) { return g.x0 + i / (N - 1) * (g.x1 - g.x0 - (n ? 0 : 40)); }, lo = 50, hi = 190, Y = function (v) { return g.y1 - Math.log(v / lo) / Math.log(hi / lo) * (g.y1 - g.y0); };
        var cnt = Math.floor(track([[0.3, 2], [3, N - 1]], T)), col = fade(T, 3.4, 0.6);
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Ten made-up stocks · monthly" : "Ten made-up stocks · monthly, log scale", C.faint, 12, "start", 600);
        lines.forEach(function (ln) {
          var pts = []; for (var i = 0; i <= cnt; i++) pts.push([X(i), Y(ln.v[i])]);
          var c = col > 0.5 ? groups[ln.g].col : C.grey;
          s += poly(pts, c, 1.8, null, 0.5 + 0.4 * col);
        });
        if (col > 0) {
          var avg = function (gi) { var a = 0, k = 0; lines.forEach(function (ln) { if (ln.g === gi) { a += Math.log(ln.v[N - 1]); k++; } }); return Math.exp(a / k); };
          post += tag(X(N - 1), Y(avg(0)) - 30, groups[0].name, C.up, col, "end");
          post += tag(X(N - 1), Y(avg(1)) + 30, groups[1].name, C.dn, col, "end");
        }
        s += post;
        s += note2(g, ["Ten stocks", "Ten separate", "stories?"], C.grey, win(T, 0.3, 3.2));
        s += note2(g, ["By industry", "They moved in", "two groups."], C.up, win(T, 3.4, 6.6));
        s += note2(g, ["The finding", "Stock momentum is largely", "industry momentum."], C.blue, win(T, 6.8, 9.8));
        s += note2(g, ["So: sectors", "Fewer positions,", "much of the effect."], C.up, fade(T, 10, 0.4));
        return s + stamp(L, "Illustrative · made-up prices");
      }
    };
  }

  /* 4 · trend filter */
  function filterSpec() {
    var N = 72, r = rng(41), P = [100], Rt = [100];
    for (var i = 1; i < N; i++) {
      var mu = track([[0, 0.012], [28, 0.01], [32, -0.02], [44, -0.035], [50, 0.015], [71, 0.014]], i);
      P.push(P[i - 1] * (1 + mu + (r() - 0.5) * 0.05));
    }
    var MA = P.map(function (_, i) { if (i < 9) return null; var s = 0; for (var k = i - 9; k <= i; k++) s += P[k]; return s / 10; });
    var on = P.map(function (p, i) { return MA[i] == null ? true : p > MA[i]; });
    var Rr = [100], rr = rng(77);
    for (var j = 1; j < N; j++) { var mkt = P[j] / P[j - 1] - 1, rot = mkt * 1.1 + 0.003 + (rr() - 0.5) * 0.02; Rt.push(Rt[j - 1] * (1 + rot)); Rr.push(Rr[j - 1] * (on[j - 1] ? 1 + rot : 1.003)); }
    var dd = function (a) { var pk = 0, m = 0; a.forEach(function (v) { pk = Math.max(pk, v); m = Math.min(m, v / pk - 1); }); return Math.round(-m * 100); };
    var ST = [
      { at: 0, title: "Rotation in a bear market", text: "Ranking sectors picks the best of what's available. In a bear market, the best sectors usually fall too, just less. The made-up rotation line here falls with the market." },
      { at: 3.4, title: "Add the market's trend", text: "Faber's test added a filter: when the S&P 500 closes a month below its 10-month average, hold T-bills instead of any sectors." },
      { at: 6.8, title: "Out for the worst of it", text: "The filtered line steps out a few months into the decline and comes back once the market closes above its average again." },
      { at: 10, title: "Smaller drawdowns", text: "In Faber's test, the filter cut the worst drawdowns from about 70–80% to about 40–50% while keeping most of the return. Here, made up: −" + dd(Rt) + "% vs −" + dd(Rr) + "%." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var all = Rt.concat(Rr), lo = Math.min.apply(null, all) * 0.92, hi = Math.max.apply(null, all) * 1.06;
        var X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - Math.log(v / lo) / Math.log(hi / lo) * (g.y1 - g.y0); };
        var cnt = Math.floor(track([[0.3, 4], [3.2, N - 1]], T));
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up rotation · monthly, log" : "A made-up sector rotation · monthly, growth of 100 (log scale)", C.faint, 12, "start", 600);
        var fo = fade(T, 3.6, 0.4);
        if (fo > 0) for (var k = 0; k <= cnt; k++) if (!on[k]) s += rect(X(k) - (X(1) - X(0)) / 2, g.y0, X(1) - X(0) + 0.5, g.y1 - g.y0, C.dn, 0, 0.1 * fo);
        var p1 = []; for (var i = 0; i <= cnt; i++) p1.push([X(i), Y(Rt[i])]);
        s += poly(p1, C.grey, 2.2);
        var f2 = fade(T, 6.8, 0.4);
        if (f2 > 0) { var p2 = []; for (var j = 0; j < N; j++) p2.push([X(j), Y(Rr[j])]); s += poly(p2, C.up, 2.8, null, f2); }
        if (fo > 0) post += tag(g.x0 + 4, g.y0 + 14, n ? "red: market below 10M avg" : "red: S&P below its 10-month average, hold T-bills", C.dn, fo, "start");
        var fin = fade(T, 10.2, 0.4);
        if (fin > 0) {
          post += tag(X(N - 1), Y(Rr[N - 1]) - 20, "with filter: worst −" + dd(Rr) + "%", C.up, fin, "end");
          post += tag(X(N - 1), Y(Rt[N - 1]) + 22, "no filter: worst −" + dd(Rt) + "%", C.grey, fin, "end");
        }
        s += post;
        s += note2(g, ["No filter", "The best sectors", "still fall."], C.grey, win(T, 0.3, 3.4));
        s += note2(g, ["Trend filter", "S&P below 10-month", "average: T-bills."], C.dn, win(T, 3.6, 6.8));
        s += note2(g, ["Filtered", "Out for most of", "the decline."], C.up, win(T, 7, 10));
        s += note2(g, ["Faber's test", "Drawdowns 70–80%", "cut to 40–50%."], C.up, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up returns");
      }
    };
  }

  K.run({
    specs: { rank: rankSpec, rotate: rotateSpec, industries: indSpec, filter: filterSpec },
    steps: [
      { k: "Month-end", c: C.grey, tag: "Trailing total returns" },
      { k: "Rank", c: C.blue, tag: "Ten sectors, best to worst" },
      { k: "Hold", c: C.up, tag: "The top three, a third each" },
      { k: "Swap", c: C.gold, tag: "Replace any that drop out" },
      { k: "Filter", c: C.dn, tag: "Optional: T-bills below the 10-month average" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W, mid = d.mid;
      var vals = [0.9, 0.75, 0.6, 0.45, 0.38, 0.3, 0.2, 0.12, -0.05, -0.15];
      vals.forEach(function (v, j) {
        var x = 40 + j * 50, h = v * 150, held = j < 3 && k >= 2;
        var c = k === 4 ? C2.dn : held ? C2.up : k === 3 && j === 3 ? C2.gold : C2.blue;
        s += d.r(x, h >= 0 ? mid + 50 - h : mid + 50, 36, Math.abs(h), c, k === 0 ? 0.35 : held || k === 1 || (k === 3 && j === 3) ? 0.85 : 0.3, 4);
      });
      s += d.ln(30, mid + 50, W - 30, mid + 50, C2.dim, 1);
      var t = ["Ten sectors, trailing returns.", "Sorted best to worst.", "Top three, a third each.", "Number four moved up: swap it in.", "Market below its average: T-bills."][k];
      s += d.t(30, bot + 32, t, C2.dim, 12.5, "start", 500);
      return s;
    }
  });
})();
