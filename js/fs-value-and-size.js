/* =====================================================================
   fs-value-and-size.js — walkthroughs on
   famous-strategies/value-and-size.html (Fama and French, 1992, 1993).

     beta     beta vs average return: the line the textbook expects, and the
              flat one the paper found
     sort     size and book-to-market sorts: the paper's endpoint returns
     boxes    the six size x value boxes, and how SMB and HML are built
     decline  the value premium before and after publication (Fama-French 2021)
   Uses js/fs-kit.js. Paper figures are labelled; every stock is made up.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win, ease = K.ease,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, hbar = K.hbar, arrow = K.arrow, rng = K.rng, sizeStd = K.sizeStd;

  /* 1 · beta doesn't line up */
  function betaSpec() {
    var r = rng(8), P = [];
    for (var i = 0; i < 20; i++) { var b = 0.7 + i * 0.045 + (r() - 0.5) * 0.05; P.push([b, 1.15 + (r() - 0.5) * 0.5]); }
    var ST = [
      { at: 0, title: "What the textbook says", text: "The capital asset pricing model says one number, beta (how much a stock moves with the market), should explain average returns. Higher beta, higher return: the dashed line." },
      { at: 3.4, title: "What the data said", text: "Fama and French sorted NYSE, AMEX and NASDAQ stocks from 1963 to 1990 into portfolios with different betas. The relation between beta and average return was flat. The dots here are made up to show the shape." },
      { at: 7, title: "Very different betas, same return", text: "Two of their portfolios had very different betas but nearly identical average returns: 1.20% and 1.18% a month. On its own, beta's slope was 0.15% a month with a t-statistic of 0.46: indistinguishable from zero." },
      { at: 10.4, title: "Two numbers did the work", text: "What did line up with returns were two easy numbers: size (market value) and book-to-market (book value of equity divided by market value). Together they captured what beta, leverage and earnings yield had seemed to explain." }
    ];
    return {
      stages: ST, end: 13.8, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        if (n) g.y1 -= 24;
        var X = function (b) { return g.x0 + (b - 0.6) / 1.2 * (g.x1 - g.x0); }, Y = function (v) { return g.y1 - (v - 0.4) / 1.6 * (g.y1 - g.y0); };
        s += K.grid(g, 4);
        [0.6, 1, 1.4, 1.8].forEach(function (v) { post += txt(g.x1 + 6, Y(v) + 4, v.toFixed(1) + "%", C.faint, 11); });
        [0.8, 1.0, 1.2, 1.4, 1.6].forEach(function (b) { post += txt(X(b), g.y1 + 18, "β " + b.toFixed(1), C.faint, 11, "middle"); });
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Beta vs average monthly return" : "Beta against average monthly return, by portfolio", C.faint, 12, "start", 600);
        var th = ease(fade(T, 0.4, 1.2));
        s += line(X(0.6), Y(0.7), X(0.6 + 1.2 * th), Y(0.7 + 1.0 * th), C.blue, 2.2, "7 5");
        if (th > 0.9) post += tag(X(1.65), Y(1.6) - 14, "CAPM: higher beta, higher return", C.blue, fade(T, 1.2, 0.4), "end");
        var dp = fade(T, 3.6, 0.4);
        P.forEach(function (p, k) { s += dot(X(p[0]), Y(p[1]), 6, C.gold, dp * fade(T, 3.6 + k * 0.05, 0.3)); });
        var fl = fade(T, 5.4, 0.6);
        if (fl > 0) { s += line(X(0.65), Y(1.17), X(1.75), Y(1.19), C.up, 2.6, null, fl); post += tag(X(1.75), Y(1.19) + 24, "what they found: flat", C.up, fl, "end"); }
        var tw = fade(T, 7.2, 0.4) * (1 - fade(T, 10.4, 0.4));
        if (tw > 0) {
          s += dot(X(0.78), Y(1.20), 9, C.ink, tw, true) + dot(X(1.62), Y(1.18), 9, C.ink, tw, true);
          post += tag(X(0.78), Y(1.20) - 24, "low β · 1.20%", C.ink, tw, "middle");
          post += tag(X(1.62), Y(1.18) - 24, "high β · 1.18%", C.ink, tw, "middle");
        }
        var two = fade(T, 10.6, 0.4);
        if (two > 0) post += tag((g.x0 + g.x1) / 2, g.y0 + 20, n ? "size + book-to-market instead" : "what mattered instead: size and book-to-market", C.gold, two, "middle");
        s += post;
        s += note2(g, ["The textbook", "Higher beta should", "mean higher return."], C.blue, win(T, 0.3, 3.4));
        s += note2(g, ["The data", "1963–1990: the relation", "between beta and return", "was flat."], C.up, win(T, 3.6, 7));
        s += note2(g, ["Same return", "1.20% and 1.18% a month", "despite very different betas."], C.ink, win(T, 7.2, 10.4));
        s += note2(g, ["Two easy numbers", "Size and book-to-market", "captured the differences."], C.gold, fade(T, 10.6, 0.4));
        return s + stamp(L, n ? "Dots illustrative · figures: F&F (1992)" : "Dots illustrative · figures: Fama & French (1992)");
      }
    };
  }

  /* 2 · the two sorts */
  function sortSpec() {
    var ST = [
      { at: 0, title: "Sort by size", text: "Each June, rank stocks by market value and split them into ten groups, using NYSE stocks to set the cut-offs. Then follow each group's return for the next year." },
      { at: 3.4, title: "Small earned more", text: "From 1963 to 1990, average returns fell from 1.64% a month for the smallest group to 0.90% for the largest. Small stocks earned more, on average, than big ones." },
      { at: 7, title: "Sort by book-to-market", text: "Now sort on book value divided by market value. A high ratio means the market prices the company cheaply against its accounts: a \"value\" stock. A low ratio is a \"growth\" stock." },
      { at: 10.2, title: "Value earned much more", text: "Average returns rose from 0.30% a month for the lowest book-to-market group to 1.83% for the highest: a difference of 1.53% a month. That's the value effect." }
    ];
    return {
      stages: ST, end: 13.8, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var a = 1 - fade(T, 7, 0.5), b = fade(T, 7.2, 0.5);
        var mid = g.y1 - 40, sc = (mid - g.y0 - 60) / 2, slot = (g.x1 - g.x0) / 10;
        s += line(g.x0, mid, g.x1, mid, "#48484a", 1.2);
        for (var v = 0.5; v <= 2; v += 0.5) { s += line(g.x0, mid - v * sc, g.x1, mid - v * sc, "#2c2c2e", 1); post += txt(g.x1 + 6, mid - v * sc + 4, v.toFixed(1) + "%", C.faint, 11); }
        function sortBars(op, t0, ends, lab, colA, colB, axisL, axisR) {
          for (var d = 0; d < 10; d++) {
            var x = g.x0 + d * slot + slot * 0.15, gr = ease(fade(T, t0 + d * 0.08, 0.5)), end = d === 0 || d === 9;
            var val = end ? (d === 0 ? ends[0] : ends[1]) * gr : 0;
            if (!end) s += line(x, mid - 1, x + slot * 0.7, mid - 1, "#48484a", 3, null, op * gr);
            var col = end ? (d === 0 ? colA : colB) : "#3a3a3c";
            s += hbar(x, mid, slot * 0.7, -val * sc, col, op * (end ? 1 : 0.5));
            post += txt(x + slot * 0.35, mid + 18, String(d + 1), C.faint, 11, "middle", 700, op);
          }
          post += txt(g.x0, mid + 40, axisL, C.dim, 12, "start", 700, op);
          post += txt(g.x1, mid + 40, axisR, C.dim, 12, "end", 700, op);
          post += txt(g.x0, g.y0 - (n ? 4 : 14), lab, C.faint, 12, "start", 600, op);
        }
        if (a > 0) {
          sortBars(a, 0.4, [1.64 * fade(T, 3.4, 0.5), 0.90 * fade(T, 3.4, 0.5)], n ? "Size deciles, 1963–1990" : "Ten size groups, average monthly return, 1963–1990", C.up, C.dn, "smallest", "largest");
          var sr = fade(T, 3.8, 0.4) * a;
          post += txt(g.x0 + slot * 0.5, mid - 1.64 * sc - 10, "1.64%", C.up, 16, "middle", 800, sr);
          post += txt(g.x0 + slot * 9.5, mid - 0.90 * sc - 10, "0.90%", C.dn, 16, "middle", 800, sr);
          if (sr > 0) post += tag((g.x0 + g.x1) / 2, g.y0 + 20, n ? "middle bars: shape not shown" : "middle groups left blank: only the endpoints are quoted here", C.faint, sr, "middle");
        }
        if (b > 0) {
          sortBars(b, 7.4, [0.30 * fade(T, 10.2, 0.5), 1.83 * fade(T, 10.2, 0.5)], n ? "Book-to-market deciles" : "Ten book-to-market groups, average monthly return, 1963–1990", C.dn, C.up, "lowest (growth)", "highest (value)");
          var vr = fade(T, 10.6, 0.4);
          post += txt(g.x0 + slot * 0.5, mid - 0.30 * sc - 10, "0.30%", C.dn, 16, "middle", 800, vr);
          post += txt(g.x0 + slot * 9.5, mid - 1.83 * sc - 10, "1.83%", C.up, 16, "middle", 800, vr);
          if (vr > 0) post += tag((g.x0 + g.x1) / 2, g.y0 + 20, "a gap of 1.53% a month", C.up, vr, "middle");
        }
        s += post;
        s += note2(g, ["Size", "Ranked each June on", "market value."], C.blue, win(T, 0.3, 3.4));
        s += note2(g, ["Small > big", "1.64% vs 0.90%", "a month, 1963–1990."], C.up, win(T, 3.6, 7));
        s += note2(g, ["Book-to-market", "High = cheap vs its", "accounts: value."], C.gold, win(T, 7.2, 10.2));
        s += note2(g, ["Value > growth", "1.83% vs 0.30% a month:", "a 1.53% gap."], C.up, fade(T, 10.4, 0.4));
        return s + stamp(L, "Figures: Fama & French (1992)");
      }
    };
  }

  /* 3 · six boxes, SMB and HML */
  function boxesSpec() {
    var ST = [
      { at: 0, title: "Six boxes", text: "The 1993 paper sorts stocks two ways at once: small or big (split at the NYSE median), and growth, neutral or value (split at the 30th and 70th percentiles of book-to-market). That makes six boxes." },
      { at: 3.6, title: "SMB: small minus big", text: "Average the three small boxes, subtract the average of the three big ones. That's the size factor, SMB. It's the return of being small, with value and growth balanced out." },
      { at: 7, title: "HML: high minus low", text: "Average the two value boxes, subtract the two growth boxes. That's the value factor, HML: the return of cheap over expensive, with size balanced out." },
      { at: 10.4, title: "The three-factor model", text: "Add the market itself, and three factors (market, SMB, HML) describe most of what diversified stock portfolios earn. It became the standard yardstick for judging fund managers and new strategies." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var gx0 = g.x0 + (n ? 56 : 120), gw = (g.x1 - gx0) / 3, gy0 = g.y0 + (n ? 50 : 40), gh = n ? 150 : 150;
        var cols = ["growth", "neutral", "value"], rows = ["small", "big"];
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Size × book-to-market" : "Two sorts at once: size × book-to-market", C.faint, 12, "start", 600);
        var smb = fade(T, 3.8, 0.4) * (1 - fade(T, 7, 0.4)), hml = fade(T, 7.2, 0.4) * (1 - fade(T, 10.4, 0.4)), all = fade(T, 10.6, 0.4);
        cols.forEach(function (c, j) { post += txt(gx0 + gw * (j + 0.5), gy0 - 10, c, C.dim, 13, "middle", 700); });
        rows.forEach(function (rw, i) {
          post += txt(gx0 - 12, gy0 + gh * (i + 0.5) + 5, rw, C.dim, 13, "end", 700);
          cols.forEach(function (c, j) {
            var op = ease(fade(T, 0.3 + (i * 3 + j) * 0.15, 0.4));
            var col = "#3a3a3c";
            if (smb > 0) col = i === 0 ? C.up : C.dn;
            if (hml > 0 && j !== 1) col = j === 2 ? C.up : C.dn;
            var fillOp = smb > 0 ? 0.25 + 0.35 * smb : hml > 0 ? (j === 1 ? 0.15 : 0.25 + 0.35 * hml) : 0.5;
            s += rect(gx0 + gw * j + 4, gy0 + gh * i + 4, gw - 8, gh - 8, col, 10, fillOp * op);
            post += txt(gx0 + gw * (j + 0.5), gy0 + gh * (i + 0.5) + 5, (rw === "small" ? "S" : "B") + "/" + c.charAt(0).toUpperCase(), C.ink, 15, "middle", 800, op);
          });
        });
        var fy = gy0 + gh * 2 + (n ? 50 : 40);
        if (smb > 0) post += txt((g.x0 + g.x1) / 2, fy, "SMB = avg(small row) − avg(big row)", C.up, n ? 14 : 17, "middle", 800, smb);
        if (hml > 0) post += txt((g.x0 + g.x1) / 2, fy, "HML = avg(value column) − avg(growth column)", C.up, n ? 13 : 17, "middle", 800, hml);
        if (all > 0) {
          post += txt((g.x0 + g.x1) / 2, fy, "return ≈ market + SMB + HML", C.gold, n ? 16 : 20, "middle", 800, all);
          post += txt((g.x0 + g.x1) / 2, fy + 28, n ? "(each with its own loading)" : "(each with its own loading, estimated from the portfolio's history)", C.dim, 12, "middle", 600, all);
        }
        s += post;
        s += note2(g, ["Six boxes", "Small/big × growth/", "neutral/value."], C.dim, win(T, 0.3, 3.6));
        s += note2(g, ["SMB", "Small row minus big row:", "the size factor."], C.up, win(T, 3.8, 7));
        s += note2(g, ["HML", "Value column minus growth", "column: the value factor."], C.up, win(T, 7.2, 10.4));
        s += note2(g, ["Three factors", "Market, SMB, HML: the", "standard yardstick since 1993."], C.gold, fade(T, 10.6, 0.4));
        return s + stamp(L, "Construction: Fama & French (1993)");
      }
    };
  }

  /* 4 · the value premium after publication */
  function declineSpec() {
    var ST = [
      { at: 0, title: "Did it last?", text: "Fama and French went back to their own value premium nearly 30 years later, comparing 1963–1991 (before their paper) with 1992–2019 (after it)." },
      { at: 3.4, title: "Smaller after publication", text: "The average value premium fell from 0.42% a month before publication to 0.11% a month after. Big value stocks barely beat the market at all in the later period." },
      { at: 7, title: "But noisy", text: "Monthly value returns swing so much that, as the authors put it, the high volatility limits confidence in the decline. A real drop and a long bad run can look the same for decades." },
      { at: 10.4, title: "Size, too", text: "The size effect, first reported by Banz in 1981, also looked weak after it was published. Later work (Asness and others, 2018) found it comes back once you avoid low-quality \"junk\" small stocks." }
    ];
    return {
      stages: ST, end: 13.8, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var mid = g.y1 - 40, sc = (mid - g.y0 - 70) / 0.6, slot = (g.x1 - g.x0) / 2;
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Value premium, % a month" : "Average value premium, percent a month (Fama & French, 2021)", C.faint, 12, "start", 600);
        s += line(g.x0, mid, g.x1, mid, "#48484a", 1.2);
        [["1963–1991", 0.42, C.up, 0.4], ["1992–2019", 0.11, C.orange, 3.6]].forEach(function (b, k) {
          var h = b[1] * sc * ease(fade(T, b[3], 0.9)), x = g.x0 + k * slot + slot * 0.25;
          s += hbar(x, mid, slot * 0.5, -h, b[2], 0.95);
          post += txt(x + slot * 0.25, mid - h - 10, b[1].toFixed(2) + "%", b[2], 20, "middle", 800, fade(T, b[3] + 0.6, 0.4));
          post += txt(x + slot * 0.25, mid + 20, b[0] + (k ? " (after)" : " (before)"), C.dim, 13, "middle", 700, fade(T, b[3], 0.4));
        });
        var nz = fade(T, 7.2, 0.4);
        if (nz > 0) {
          var r = rng(2), pts = [];
          for (var i = 0; i < 80; i++) pts.push([g.x0 + i / 79 * (g.x1 - g.x0), g.y0 + 70 + (r() - 0.5) * 70 * nz]);
          s += poly(pts, C.faint, 1.4, null, nz * (1 - fade(T, 10.4, 0.4)));
          post += tag((g.x0 + g.x1) / 2, g.y0 + 24, n ? "monthly swings: noisy" : "monthly swings (made up): big noise around a small average", C.faint, nz * (1 - fade(T, 10.4, 0.4)), "middle");
        }
        var sz = fade(T, 10.6, 0.4);
        if (sz > 0) post += tag((g.x0 + g.x1) / 2, g.y0 + 24, n ? "size: weak, unless you skip junk" : "size: weak after 1981, stronger once junk is removed", C.blue, sz, "middle");
        s += post;
        s += note2(g, ["Before vs after", "Their own data,", "1963–2019."], C.ink, win(T, 0.3, 3.4));
        s += note2(g, ["Smaller", "0.42% a month before,", "0.11% after."], C.orange, win(T, 3.6, 7));
        s += note2(g, ["Noisy", "Too volatile to say", "for sure it's gone."], C.faint, win(T, 7.2, 10.4));
        s += note2(g, ["Size", "Weak since 1981, unless", "you avoid junk stocks."], C.blue, fade(T, 10.6, 0.4));
        return s + stamp(L, "Figures: Fama & French (2021)");
      }
    };
  }

  K.run({
    specs: { beta: betaSpec, sort: sortSpec, boxes: boxesSpec, decline: declineSpec },
    steps: [
      { k: "Measure", c: C.gold, tag: "Market value and book-to-market" },
      { k: "Sort", c: C.blue, tag: "Small or big, growth to value" },
      { k: "Tilt", c: C.up, tag: "Toward small and value" },
      { k: "Rebalance", c: C.cyan, tag: "Once a year, each June" },
      { k: "Wait", c: C.orange, tag: "Premiums show up over decades" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W, mid = d.mid;
      if (k === 0) {
        s += d.t(W / 2, top + 50, "size = price × shares", C2.blue, 18, "middle", 700);
        s += d.t(W / 2, top + 120, "book-to-market = book equity ÷ size", C2.gold, 17, "middle", 700);
        s += d.t(30, bot + 32, "Two numbers from any annual report.", C2.dim, 12.5, "start", 500);
      } else if (k === 1 || k === 2) {
        var gx = 110, gw = 140, gh = 70;
        ["growth", "neutral", "value"].forEach(function (c, j) { s += d.t(gx + gw * (j + 0.5), top + 14, c, C2.dim, 12, "middle", 700); });
        ["small", "big"].forEach(function (rw, i) {
          s += d.t(gx - 10, top + 30 + gh * (i + 0.5) + 4, rw, C2.dim, 12, "end", 700);
          for (var j = 0; j < 3; j++) {
            var hot = k === 2 && i === 0 && j === 2;
            s += d.r(gx + gw * j + 3, top + 30 + gh * i + 3, gw - 6, gh - 6, hot ? C2.up : "#3a3a3c", hot ? 0.8 : 0.6, 8);
          }
        });
        if (k === 2) s += d.t(gx + gw * 2.5, top + 30 + gh * 0.5 + 5, "tilt here", "#000", 13, "middle", 800);
        s += d.t(30, bot + 32, k === 1 ? "Six boxes, like the 1993 paper." : "Small value: both premiums at once.", C2.dim, 12.5, "start", 500);
      } else if (k === 3) {
        for (var y = 0; y < 4; y++) { var x = 60 + y * 120; s += d.ln(x, top + 20, x, bot - 10, C2.cyan, 2, "5 4") + d.t(x, bot + 8, "June", C2.cyan, 12, "middle", 700); }
        s += d.t(30, bot + 32, "Re-sort once a year; trade little in between.", C2.dim, 12.5, "start", 500);
      } else {
        var r = rng(5), pts = [], v = 0;
        for (var i = 0; i <= 60; i++) { v += 0.3 + (r() - 0.5) * 6; pts.push([40 + i * 8, mid - v * 1.2]); }
        s += d.pl(pts, C2.orange, 2.4);
        s += d.t(30, bot + 32, "Long flat or losing stretches are normal.", C2.dim, 12.5, "start", 500);
      }
      return s;
    }
  });
})();
