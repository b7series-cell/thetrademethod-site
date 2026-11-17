/* =====================================================================
   fs-pairs-trading.js — walkthroughs on
   famous-strategies/pairs-trading.html (Gatev, Goetzmann and Rouwenhorst, 2006).

     match     12-month formation: normalize prices, measure the distance to
               every candidate, keep the closest partner
     trade     the 6-month trading period: open at 2 standard deviations,
               close at the next crossing, or when the period ends
     results   the paper's monthly excess returns, same day vs wait a day
     neutral   a made-up market drop vs a pairs book: why it's market neutral,
               and what can still go wrong
   Uses js/fs-kit.js. Paper figures are labelled; every price path is made up.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win, ease = K.ease,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, hbar = K.hbar, arrow = K.arrow, rng = K.rng, sizeStd = K.sizeStd, cross = K.cross, bracket = K.bracket;

  function walk(N, seed, drift, vol, start) {
    var r = rng(seed), v = start || 1, out = [];
    for (var i = 0; i < N; i++) { v *= 1 + (drift || 0) + (r() - 0.5) * 2 * (vol || 0.012); out.push(v); }
    return out;
  }

  /* 1 · formation: find the closest partner */
  function matchSpec() {
    var N = 120, A = walk(N, 3, 0.0018, 0.014);
    var cand = [
      { k: "Stock B", off: 0.01, seed: 21, col: C.blue },
      { k: "Stock C", off: 0.05, seed: 22, col: "#bf5af2" },
      { k: "Stock D", off: 0.11, seed: 23, col: C.cyan },
      { k: "Stock E", off: 0.2, seed: 24, col: C.orange }
    ];
    cand.forEach(function (c, j) {
      var r = rng(c.seed), w = 0, sgn = j % 2 ? -1 : 1;
      c.v = A.map(function (a, i) { w += (r() - 0.5) * c.off * 0.25; w *= 0.96; return a * (1 + sgn * c.off * Math.sin(i / 18 + j) + w); });
      c.ssd = 0; c.v.forEach(function (v, i) { c.ssd += (v - A[i]) * (v - A[i]); });
    });
    var ST = [
      { at: 0, title: "Start everyone at $1", text: "Take twelve months of daily total returns (dividends included) and start every stock's line at the same point. Now prices of $20 and $200 stocks can be compared on one chart." },
      { at: 3.4, title: "Measure the gap", text: "For each possible partner, add up the squared gap between the two lines on every day of the year. Stocks that moved together all year have a small total: they're \"close\"." },
      { at: 7, title: "Keep the closest", text: "Each stock gets the partner with the smallest total distance. No industry list, no story: just the stock that tracked it best over the year. Here that's Stock B." },
      { at: 10.4, title: "Trade the top 20", text: "Do that for every stock and rank all the pairs by distance. The paper traded the 5 and the 20 closest pairs, plus a version with 20 pairs after skipping the top 100." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var all = A.slice(); cand.forEach(function (c) { all = all.concat(c.v); });
        var lo = Math.min.apply(null, all) - 0.03, hi = Math.max.apply(null, all) + 0.03, X = function (i) { return g.x0 + i / (N - 1) * (g.x1 - g.x0); }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "12-month formation · made up" : "Formation period: 12 months of normalized prices (made up)", C.faint, 12, "start", 600);
        var upto = Math.floor(track([[0, 2], [3, N - 1]], T));
        var best = fade(T, 7.2, 0.5), others = 1 - 0.8 * best;
        cand.forEach(function (c, j) {
          var co = fade(T, 1.2 + j * 0.3, 0.4) * (j === 0 ? 1 : others);
          if (co <= 0) return;
          var pts = []; for (var i = 0; i <= upto; i++) pts.push([X(i), Y(c.v[i])]);
          s += poly(pts, c.col, j === 0 && best > 0 ? 2.4 : 1.6, null, co);
          if (upto >= N - 1) post += txt(g.x1 + 6, Y(c.v[N - 1]) + 4, c.k, c.col, 11.5, "start", 700, co);
        });
        var gap = fade(T, 3.6, 0.5) * (1 - fade(T, 7, 0.4));
        if (gap > 0) {
          var c1 = cand[2], pg = [];
          for (var i = 0; i < N; i += 2) pg.push([X(i), Y(A[i])]);
          for (var k = N - 1; k >= 0; k -= 2) pg.push([X(k), Y(c1.v[k])]);
          s += '<polygon points="' + pg.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="' + C.cyan + '" opacity="' + (0.22 * gap).toFixed(3) + '"/>';
          for (var d = 10; d < N; d += 22) s += line(X(d), Y(A[d]), X(d), Y(c1.v[d]), C.cyan, 1.4, "3 3", gap);
          post += tag(X(60), Y(Math.max(A[60], c1.v[60])) - 22, n ? "gap², added up" : "squared gap, added up every day", C.cyan, gap, "middle");
        }
        var ap = []; for (var a = 0; a <= upto; a++) ap.push([X(a), Y(A[a])]);
        s += poly(ap, C.gold, 2.8);
        post += tag(g.x0 + 4, Y(1) - 18, "Stock A", C.gold, 1, "start");
        s += dot(X(0), Y(1), 5, C.ink);
        /* distance list */
        var lst = fade(T, 7.2, 0.4) * (1 - fade(T, 10.4, 0.4));
        if (lst > 0) {
          var bx = n ? g.x0 + 4 : g.x0 + 20, by = n ? g.y1 - 150 : g.y1 - 150, mx = cand[3].ssd;
          s += rect(bx - 8, by - 24, n ? 330 : 360, 142, C.bg, 10, 0.92 * lst);
          post += txt(bx, by - 6, "Distance from Stock A", C.dim, 12, "start", 700, lst);
          cand.forEach(function (c, j) {
            var w = 170 * c.ssd / mx, y = by + 8 + j * 26;
            s += rect(bx + 70, y, Math.max(3, w * ease(fade(T, 7.4 + j * 0.15, 0.5))), 16, c.col, 3, lst);
            post += txt(bx, y + 13, c.k, c.col, 12, "start", 700, lst);
            if (j === 0) post += txt(bx + 80 + w, y + 13, "closest", C.up, 12, "start", 800, lst);
          });
        }
        var top = fade(T, 10.6, 0.4);
        if (top > 0) post += tag((g.x0 + g.x1) / 2, g.y0 + 24, n ? "A + B: one pair of thousands" : "A + B is one pair · rank every pair, trade the 20 closest", C.up, top, "middle");
        s += post;
        s += note2(g, ["Normalize", "Every line starts at $1:", "12 months, dividends in."], C.gold, win(T, 0.3, 3.4));
        s += note2(g, ["Distance", "Add up the squared gap", "on every day of the year."], C.cyan, win(T, 3.6, 7));
        s += note2(g, ["Closest partner", "The smallest total wins.", "Here: Stock B."], C.blue, win(T, 7.2, 10.4));
        s += note2(g, ["Top 20 pairs", "Rank every pair by distance;", "trade the 5 or 20 closest."], C.up, fade(T, 10.6, 0.4));
        return s + stamp(L, "Illustrative · made-up prices");
      }
    };
  }

  /* 2 · trading period: open at 2 sigma, close at the crossing */
  function tradeSpec() {
    var N = 126, r = rng(9), SP = [], B = walk(N, 31, 0.0006, 0.011);
    var keys = [[0, 0.2], [12, -0.6], [24, 1.2], [32, 2.3], [40, 1.6], [52, 0.6], [58, -0.15], [66, -0.9], [76, -1.6], [84, -2.25], [96, -1.5], [108, -1.9], [118, -1.1], [125, -0.8]];
    for (var i = 0; i < N; i++) SP.push(track(keys, i) + (r() - 0.5) * 0.35);
    var o1 = 0; while (SP[o1] < 2) o1++;
    var c1 = o1; while (SP[c1] > 0) c1++;
    var o2 = c1; while (SP[o2] > -2) o2++;
    var sd = 0.035, A = B.map(function (b, i) { return b * (1 + SP[i] * sd); });
    var ST = [
      { at: 0, title: "Six months to trade", text: "The pair is fixed. For the next six months, watch the gap between the two normalized prices, measured in the standard deviations it had during the formation year." },
      { at: 3.6, title: "Two standard deviations: open", text: "Stock A runs ahead of Stock B by two standard deviations. Sell A short and buy B, a dollar of each, and wait for the gap to close. The paper opens the day after the signal." },
      { at: 7, title: "The prices cross: close", text: "When the two lines cross again, the gap is gone. Close both legs. The profit came from the gap shrinking, whatever the market did in the meantime." },
      { at: 10.4, title: "Not every gap closes", text: "Later, A falls two standard deviations below B, so buy A and short B. This time the lines never cross. The position is closed when the six months end, at whatever it shows." }
    ];
    return {
      stages: ST, end: 14.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (k) { return g.x0 + k / (N - 1) * (g.x1 - g.x0); };
        var t0 = g.y0, t1 = n ? g.y0 + 250 : g.y0 + 200, b0 = t1 + (n ? 44 : 40), b1 = g.y1;
        var lo = Math.min.apply(null, A.concat(B)) - 0.02, hi = Math.max.apply(null, A.concat(B)) + 0.02;
        var YP = function (v) { return t1 - (v - lo) / (hi - lo) * (t1 - t0); }, YS = function (v) { return b1 - (v + 3) / 6 * (b1 - b0); };
        var upto = Math.floor(track([[0, 1], [3.4, o1], [3.8, o1], [6.8, c1], [7.2, c1], [10.2, o2], [10.6, o2], [13.6, N - 1]], T));
        s += txt(g.x0, t0 - (n ? 4 : 14), n ? "Prices, normalized" : "Trading period: the two normalized prices (made up)", C.faint, 12, "start", 600);
        s += txt(g.x0, b0 - 10, n ? "Gap, in standard deviations" : "The gap (A − B), in standard deviations from the formation year", C.faint, 12, "start", 600);
        [-2, 0, 2].forEach(function (v) {
          s += line(g.x0, YS(v), g.x1, YS(v), v === 0 ? "#636366" : v > 0 ? C.dn : C.up, v === 0 ? 1.2 : 1.6, v === 0 ? null : "6 4", v === 0 ? 1 : 0.7);
          post += txt(g.x1 + 6, YS(v) + 4, (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + "σ", C.faint, 11);
        });
        /* trade shading */
        function shade(a, b, col) { if (upto <= a) return; var e = Math.min(upto, b); s += rect(X(a), t0, X(e) - X(a), b1 - t0, col, 0, 0.1); }
        shade(o1, c1, C.dn); shade(o2, N - 1, C.up);
        var pa = [], pb = [], ps = [];
        for (var k = 0; k <= upto; k++) { pa.push([X(k), YP(A[k])]); pb.push([X(k), YP(B[k])]); ps.push([X(k), YS(SP[k])]); }
        s += poly(pb, C.blue, 2.2) + poly(pa, C.gold, 2.4) + poly(ps, C.ink, 2.2);
        if (upto > 6) { post += tag(X(4), YP(A[4]) - 16, "A", C.gold, 1, "start"); post += tag(X(4), YP(B[4]) + 18, "B", C.blue, 1, "start"); }
        var op1 = fade(T, 3.8, 0.3);
        if (op1 > 0) {
          s += dot(X(o1), YS(SP[o1]), 6, C.dn, op1);
          post += tag(X(o1), YS(SP[o1]) - 20, n ? "short A, buy B" : "open: short A, buy B", C.dn, op1, "middle");
          s += arrow(X(o1), YP(A[o1]) - 6, X(o1), YP(A[o1]) - 34, C.dn, op1);
        }
        var cl1 = fade(T, 7.2, 0.3);
        if (cl1 > 0) { s += dot(X(c1), YS(SP[c1]), 6, C.ink, cl1); post += tag(X(c1) + 8, YS(SP[c1]) + 22, n ? "cross: close" : "crossed: close both, profit", C.up, cl1, "start"); }
        var op2 = fade(T, 10.6, 0.3);
        if (op2 > 0) { s += dot(X(o2), YS(SP[o2]), 6, C.up, op2); post += tag(X(o2), YS(SP[o2]) + 22, n ? "buy A, short B" : "open: buy A, short B", C.up, op2, "middle"); }
        var end = fade(T, 13.6, 0.4);
        if (end > 0) { s += cross(X(N - 1), YS(SP[N - 1]), C.orange, end); post += tag(X(N - 1) - 8, YS(SP[N - 1]) - 22, n ? "time's up" : "six months up: closed, no cross", C.orange, end, "end"); }
        s += post;
        s += note2(g, ["Watch the gap", "Measured in the formation", "year's standard deviations."], C.ink, win(T, 0.3, 3.6));
        s += note2(g, ["Open at 2σ", "Short the one that ran,", "buy the one that lagged."], C.dn, win(T, 3.8, 7));
        s += note2(g, ["Close at the cross", "The gap is gone:", "close both legs."], C.up, win(T, 7.2, 10.4));
        s += note2(g, ["No cross?", "Closed when the six", "months run out."], C.orange, fade(T, 10.6, 0.4));
        return s + stamp(L, "Illustrative · made-up prices");
      }
    };
  }

  /* 3 · the paper's returns */
  function resultsSpec() {
    var G = [["Top 5 pairs", 1.31, 0.75], ["Top 20 pairs", 1.44, 0.90]];
    var ST = [
      { at: 0, title: "1962 to 2002", text: "Gatev, Goetzmann and Rouwenhorst ran the rule on every liquid US stock from 1962 to 2002, starting a new six-month trading period every month and averaging them." },
      { at: 3.2, title: "Same-day signals", text: "Trading on the same day as the signal, the top 5 pairs earned 1.31% a month above the risk-free rate and the top 20 earned 1.44% (on the money invested in pairs that opened)." },
      { at: 6.6, title: "Wait one day", text: "Some of that came from closing prices bouncing between the bid and the ask. Waiting a day before trading cut the returns to about 0.75% and 0.90% a month. That's the paper's base case: up to about 11% a year." },
      { at: 10.2, title: "After costs", text: "They estimated trading costs at roughly 1.6% per round trip for a pair, and the profits stayed significant after them. Costs are the first thing to check in any copy of this." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var mid = g.y1 - 40, sc = (mid - g.y0 - 70) / 1.6, slot = (g.x1 - g.x0) / 2;
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Monthly excess return" : "Average monthly excess return, 1962–2002", C.faint, 12, "start", 600);
        s += line(g.x0, mid, g.x1, mid, "#48484a", 1.2);
        for (var v = 0.5; v <= 1.5; v += 0.5) { s += line(g.x0, mid - v * sc, g.x1, mid - v * sc, "#2c2c2e", 1); post += txt(g.x1 + 6, mid - v * sc + 4, v.toFixed(1) + "%", C.faint, 11); }
        G.forEach(function (gr, k) {
          var x = g.x0 + k * slot + slot * 0.12, bw = slot * 0.34;
          var a = ease(fade(T, 3.4 + k * 0.3, 0.8)), b = ease(fade(T, 6.8 + k * 0.3, 0.8));
          s += hbar(x, mid, bw, -gr[1] * sc * a, C.blue, 0.9);
          post += txt(x + bw / 2, mid - gr[1] * sc * a - 10, gr[1].toFixed(2) + "%", C.blue, 16, "middle", 800, fade(T, 4 + k * 0.3, 0.4));
          s += hbar(x + bw + 8, mid, bw, -gr[2] * sc * b, C.gold, 0.95);
          post += txt(x + bw * 1.5 + 8, mid - gr[2] * sc * b - 10, gr[2].toFixed(2) + "%", C.gold, 16, "middle", 800, fade(T, 7.4 + k * 0.3, 0.4));
          post += txt(x + bw + 4, mid + 22, gr[0], C.dim, 13, "middle", 700);
        });
        var lg = fade(T, 3.4, 0.4);
        post += txt(g.x0, mid + 48, "■ same day", C.blue, 12, "start", 700, lg);
        post += txt(g.x0 + (n ? 110 : 120), mid + 48, "■ wait one day", C.gold, 12, "start", 700, fade(T, 6.8, 0.4));
        var yr = fade(T, 8.4, 0.4);
        if (yr > 0) post += tag((g.x0 + g.x1) / 2, g.y0 + 20, "up to ~11% a year (the paper's abstract)", C.gold, yr, "middle");
        var co = fade(T, 10.4, 0.4);
        if (co > 0) post += tag((g.x0 + g.x1) / 2, g.y0 + 54, n ? "costs ~1.6% per pair round trip" : "estimated cost: about 1.6% per pair, per round trip", C.orange, co, "middle");
        s += post;
        s += note2(g, ["41 years of data", "Every liquid US stock,", "1962–2002."], C.ink, win(T, 0.3, 3.2));
        s += note2(g, ["Same-day signals", "1.31% (top 5) and", "1.44% (top 20) a month."], C.blue, win(T, 3.4, 6.6));
        s += note2(g, ["Wait one day", "About 0.75% and 0.90%:", "bid-ask bounce removed."], C.gold, win(T, 6.8, 10.2));
        s += note2(g, ["After costs", "Still significant, but", "costs eat a big share."], C.orange, fade(T, 10.4, 0.4));
        return s + stamp(L, "Figures: Gatev, Goetzmann & Rouwenhorst (2006)");
      }
    };
  }

  /* 4 · market neutral, not risk free */
  function neutralSpec() {
    var N = 100, M = [], P = [], r = rng(14), m = 100, p = 100;
    for (var i = 0; i < N; i++) {
      m *= 1 + (i > 40 && i < 62 ? -0.011 : 0.0012) + (r() - 0.5) * 0.02;
      p *= 1 + 0.0009 + (r() - 0.5) * 0.006 + (i > 74 && i < 80 ? -0.006 : 0);
      M.push(m); P.push(p);
    }
    var ST = [
      { at: 0, title: "A made-up market drop", text: "Here the market falls about 20% in a few weeks. A long-only portfolio takes the whole hit." },
      { at: 3.2, title: "The pairs book barely notices", text: "Every pair is long one stock and short a similar one, so a market move mostly cancels out. The paper found market betas close to zero: about −0.03 for the top 20 pairs." },
      { at: 6.6, title: "But it isn't riskless", text: "The risk is a pair that stops behaving like a pair: a takeover, a bad quarter, a delisting. The gap keeps widening and never closes, and the loss is real. The dip here is made up." },
      { at: 10, title: "And it has shrunk", text: "The paper itself found smaller profits after the late 1980s, as more hedge funds traded the same idea. They stayed positive in its data through 2002, but a plain copy today should expect less." }
    ];
    return {
      stages: ST, end: 13.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (k) { return g.x0 + k / (N - 1) * (g.x1 - g.x0); }, lo = 70, hi = 120, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Market vs pairs book · made up" : "A made-up market drop against a pairs book, both starting at 100", C.faint, 12, "start", 600);
        var upto = Math.floor(track([[0, 1], [3, N - 1]], T)), pm = [], pp = [];
        for (var k = 0; k <= upto; k++) { pm.push([X(k), Y(M[k])]); pp.push([X(k), Y(P[k])]); }
        var po = fade(T, 3.4, 0.5);
        s += poly(pm, C.dn, 2.4);
        s += poly(pp, C.up, 2.6, null, po);
        if (upto >= N - 1) {
          post += tag(X(N - 1), Y(M[N - 1]) + 20, "market", C.dn, 1, "end");
          post += tag(X(N - 1), Y(P[N - 1]) - 20, "pairs book", C.up, po, "end");
        }
        var bt = fade(T, 3.8, 0.4) * (1 - fade(T, 6.6, 0.4));
        if (bt > 0) post += tag(X(52), Y(112), "market beta ≈ 0", C.up, bt, "middle");
        var rk = fade(T, 6.8, 0.4);
        if (rk > 0) { s += rect(X(74), g.y0, X(80) - X(74), g.y1 - g.y0, C.orange, 0, 0.18 * rk); post += tag(X(77), g.y0 + 18, n ? "a pair breaks" : "a pair breaks apart", C.orange, rk, "middle"); }
        var sh = fade(T, 10.2, 0.4);
        if (sh > 0) post += tag((g.x0 + g.x1) / 2, g.y1 - 20, n ? "smaller after the 1980s" : "profits smaller after the late 1980s (same paper)", C.gold, sh, "middle");
        s += post;
        s += note2(g, ["Market drop", "Long-only takes", "the whole hit."], C.dn, win(T, 0.3, 3.2));
        s += note2(g, ["Market neutral", "Long one, short its twin:", "beta about −0.03 (top 20)."], C.up, win(T, 3.4, 6.6));
        s += note2(g, ["Pair risk", "Takeovers, bad news,", "gaps that never close."], C.orange, win(T, 6.8, 10));
        s += note2(g, ["Crowding", "Smaller since the late", "1980s, as funds piled in."], C.gold, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · beta: Gatev et al. (2006)");
      }
    };
  }

  K.run({
    specs: { match: matchSpec, trade: tradeSpec, results: resultsSpec, neutral: neutralSpec },
    steps: [
      { k: "Form", c: C.gold, tag: "Twelve months of normalized prices" },
      { k: "Match", c: C.blue, tag: "The partner with the smallest distance" },
      { k: "Watch", c: C.ink, tag: "Six months, gap in standard deviations" },
      { k: "Open", c: C.dn, tag: "Two standard deviations apart" },
      { k: "Close", c: C.up, tag: "The prices cross, or time runs out" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W, mid = d.mid;
      var xa = 40, xb = W - 40;
      function wave(off, amp, ph) { var p = []; for (var i = 0; i <= 40; i++) p.push([xa + i * (xb - xa) / 40, mid + 20 - off * i / 40 - amp * (Math.sin(i / 6 + ph) - Math.sin(ph)) - i * 1.2]); return p; }
      if (k === 0) {
        s += d.pl(wave(0, 18, 0), C2.gold, 2.6) + d.pl(wave(30, 24, 1), C2.blue, 2) + d.pl(wave(-40, 30, 2), "#bf5af2", 2);
        s += d.dt(xa, mid + 20, C2.ink, 6) + d.t(xa, mid + 56, "all start at $1", C2.ink, 13, "start", 700);
        s += d.t(30, bot + 32, "Twelve months, dividends included.", C2.dim, 12.5, "start", 500);
      } else if (k === 1) {
        s += d.pl(wave(0, 18, 0), C2.gold, 2.6) + d.pl(wave(6, 18, 0.15), C2.blue, 2.4);
        s += d.t(W / 2, top + 20, "smallest total gap = the pair", C2.blue, 14, "middle", 700);
        s += d.t(30, bot + 32, "No story needed: just the closest line.", C2.dim, 12.5, "start", 500);
      } else if (k === 2 || k === 3 || k === 4) {
        var Y = function (v) { return mid - v * (bot - top) / 6; };
        [-2, 0, 2].forEach(function (v) { s += d.ln(xa, Y(v), xb, Y(v), v === 0 ? "#636366" : v > 0 ? C2.dn : C2.up, 1.6, v ? "6 4" : null); });
        var pts = [], keys = [0, 0.8, 1.6, 2.3, 1.6, 0.8, 0, -0.6];
        for (var i = 0; i < keys.length; i++) pts.push([xa + i * (xb - xa) / (keys.length - 1), Y(keys[i])]);
        s += d.pl(pts, C2.ink, 2.4);
        if (k >= 3) s += d.dt(pts[3][0], pts[3][1], C2.dn) + d.t(pts[3][0], pts[3][1] - 16, "open: short the rich one", C2.dn, 12.5, "middle", 700);
        if (k === 4) s += d.dt(pts[6][0], pts[6][1], C2.up) + d.t(pts[6][0], pts[6][1] + 26, "cross: close", C2.up, 12.5, "middle", 700);
        s += d.t(30, bot + 32, k === 2 ? "The gap, in standard deviations." : k === 3 ? "Buy the laggard, short the leader." : "Or close when six months end.", C2.dim, 12.5, "start", 500);
      }
      return s;
    }
  });
})();
