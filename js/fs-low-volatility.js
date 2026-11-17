/* =====================================================================
   fs-low-volatility.js — walkthroughs on
   famous-strategies/low-volatility.html (Ang, Hodrick, Xing and Zhang, 2006;
   Frazzini and Pedersen, 2014).

     line     the security market line: theory vs the flat line in the data,
              with Frazzini-Pedersen's beta-decile endpoints
     ivol     idiosyncratic volatility, and the AHXZ quintile spread
     bab      how the betting-against-beta factor is built, and what it earned
     why      three explanations, and the price: lagging in strong rallies
   Uses js/fs-kit.js. Paper figures are labelled; every stock is made up.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win, ease = K.ease,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, hbar = K.hbar, arrow = K.arrow, rng = K.rng, sizeStd = K.sizeStd;

  /* 1 · the flat line */
  function lineSpec() {
    var ST = [
      { at: 0, title: "More risk, more return?", text: "Textbook finance says riskier stocks should pay more. Measured by beta, the line from low-beta to high-beta stocks should slope up: the dashed line." },
      { at: 3.4, title: "In the data, it's flat", text: "Frazzini and Pedersen sorted US stocks from 1926 to 2012 into ten groups by beta. Average excess returns were nearly the same across all ten: about 0.9% a month at both ends." },
      { at: 7, title: "So low beta wins on risk", text: "If returns are the same but risk isn't, the calm stocks win once risk is counted. The CAPM alpha fell from 0.52% a month for the lowest-beta group to −0.10% for the highest." },
      { at: 10.4, title: "Return per unit of risk", text: "The Sharpe ratio, return per unit of volatility, fell from 0.70 for the lowest-beta group to 0.28 for the highest. The safest stocks were the best deal." }
    ];
    return {
      stages: ST, end: 13.8, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var a = 1 - fade(T, 7, 0.5), b = fade(T, 7.2, 0.5);
        if (a > 0) {
          var X = function (bt) { return g.x0 + (bt - 0.3) / 1.6 * (g.x1 - g.x0); }, Y = function (v) { return g.y1 - (v - 0.3) / 1.2 * (g.y1 - g.y0); };
          s += K.grid(g, 4);
          s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Beta vs excess return" : "Beta against average monthly excess return", C.faint, 12, "start", 600, a);
          [0.6, 0.9, 1.2, 1.5].forEach(function (v) { post += txt(g.x1 + 6, Y(v) + 4, v.toFixed(1) + "%", C.faint, 11, "start", 600, a); });
          ["low β", "high β"].forEach(function (lb, k) { post += txt(k ? g.x1 : g.x0, g.y1 + 18, lb, C.faint, 12, k ? "end" : "start", 700, a); });
          var th = ease(fade(T, 0.4, 1.2));
          s += line(X(0.4), Y(0.55), X(0.4 + 1.4 * th), Y(0.55 + 0.9 * th), C.blue, 2.2, "7 5", a);
          if (th > 0.9) post += tag(X(1.8), Y(1.45) - 14, n ? "theory" : "theory: higher beta, higher return", C.blue, a * fade(T, 1.2, 0.4), "end");
          var fl = fade(T, 3.6, 0.5) * a;
          if (fl > 0) {
            s += line(X(0.45), Y(0.91), X(1.8), Y(0.97), C.up, 2.6, null, fl);
            s += dot(X(0.45), Y(0.91), 7, C.up, fl) + dot(X(1.8), Y(0.97), 7, C.up, fl);
            post += tag(X(0.45), Y(0.91) + 24, "lowest β · 0.91%", C.up, fl, "start");
            post += tag(X(1.8), Y(0.97) - 22, "highest β · 0.97%", C.up, fl, "end");
          }
        }
        if (b > 0) {
          var mid = n ? g.y0 + 260 : g.y0 + 240, sc = n ? 300 : 280, slot = (g.x1 - g.x0) / 2;
          var al = 1 - fade(T, 10.4, 0.4), sh = fade(T, 10.6, 0.4);
          s += line(g.x0, mid, g.x1, mid, "#48484a", 1.2, null, b);
          if (al > 0) {
            s += txt(g.x0, g.y0 - (n ? 4 : 14), "CAPM alpha, % a month, 1926–2012", C.faint, 12, "start", 600, b * al);
            [["lowest β", 0.52, C.up], ["highest β", -0.10, C.dn]].forEach(function (x, k) {
              var h = x[1] * sc * ease(fade(T, 7.4 + k * 0.4, 0.7)), xx = g.x0 + k * slot + slot * 0.25;
              s += hbar(xx, mid, slot * 0.5, -h, x[2], b * al);
              post += txt(xx + slot * 0.25, x[1] >= 0 ? mid - h - 10 : mid - h + 22, (x[1] > 0 ? "+" : "−") + Math.abs(x[1]).toFixed(2) + "%", x[2], 20, "middle", 800, b * al * fade(T, 8 + k * 0.4, 0.4));
              post += txt(xx + slot * 0.25, x[1] >= 0 ? mid + 20 : mid - 10, x[0], C.dim, 13, "middle", 700, b * al);
            });
          }
          if (sh > 0) {
            s += txt(g.x0, g.y0 - (n ? 4 : 14), "Sharpe ratio, 1926–2012", C.faint, 12, "start", 600, sh);
            var sc2 = n ? 300 : 260;
            [["lowest β", 0.70, C.up], ["highest β", 0.28, C.dn]].forEach(function (x, k) {
              var h = x[1] * sc2 * ease(fade(T, 10.8 + k * 0.4, 0.7)), xx = g.x0 + k * slot + slot * 0.25;
              s += hbar(xx, mid, slot * 0.5, -h, x[2], sh);
              post += txt(xx + slot * 0.25, mid - h - 10, x[1].toFixed(2), x[2], 20, "middle", 800, sh * fade(T, 11.4 + k * 0.4, 0.4));
              post += txt(xx + slot * 0.25, mid + 20, x[0], C.dim, 13, "middle", 700, sh);
            });
          }
        }
        s += post;
        s += note2(g, ["Theory", "Higher beta should", "pay more."], C.blue, win(T, 0.3, 3.4));
        s += note2(g, ["The data", "About the same return", "at both ends: flat."], C.up, win(T, 3.6, 7));
        s += note2(g, ["Alpha", "+0.52% a month lowest β,", "−0.10% highest β."], C.up, win(T, 7.2, 10.4));
        s += note2(g, ["Sharpe ratio", "0.70 for the calmest,", "0.28 for the wildest."], C.up, fade(T, 10.6, 0.4));
        return s + stamp(L, "Figures: Frazzini & Pedersen (2014)");
      }
    };
  }

  /* 2 · idiosyncratic volatility */
  function ivolSpec() {
    var ST = [
      { at: 0, title: "Two stocks, same market", text: "Take two made-up stocks on the same days. Strip out what the market, size and value factors explain, and what's left is each stock's own noise: its idiosyncratic volatility." },
      { at: 3.6, title: "Measure the noise", text: "Ang, Hodrick, Xing and Zhang measured it from the past month of daily returns, then sorted stocks into five groups, calmest to noisiest, and held each group for a month." },
      { at: 7, title: "The noisiest did worst", text: "The noisiest fifth earned 1.06% a month less than the calmest fifth. After adjusting for the Fama-French factors the gap was 1.31% a month. The authors called the returns \"abysmally low\"." },
      { at: 10.4, title: "Not explained by risk", text: "They checked whether exposure to market-wide volatility explained it. It didn't. The most volatile stocks just did badly, which is the opposite of what a risk premium would predict." }
    ];
    return {
      stages: ST, end: 13.8, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var a = 1 - fade(T, 7, 0.5), b = fade(T, 7.2, 0.5);
        if (a > 0) {
          var N = 21, r = rng(6), A = [], B = [], X = function (i) { return g.x0 + i / (N - 1) * (g.x1 - g.x0); };
          var ya = n ? g.y0 + 130 : g.y0 + 110, yb = n ? g.y0 + 380 : g.y0 + 320, amp = n ? 70 : 60;
          for (var i = 0; i < N; i++) { var m = (r() - 0.5); A.push(m * 0.6 + (r() - 0.5) * 0.25); B.push(m * 0.6 + (r() - 0.5) * 1.6); }
          s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Daily residual returns · a month" : "Daily returns left after the market and factors, one month (made up)", C.faint, 12, "start", 600, a);
          [[A, ya, C.blue, "Calm Co."], [B, yb, C.orange, "Jumpy Co."]].forEach(function (row) {
            s += line(g.x0, row[1], g.x1, row[1], "#48484a", 1, null, a);
            var up = Math.floor(track([[0.3, 0], [3.2, N - 1]], T));
            for (var k = 0; k <= up; k++) s += line(X(k), row[1], X(k), row[1] - row[0][k] * amp, row[2], n ? 6 : 10, null, a);
            post += tag(g.x0, row[1] - amp - 16, row[3], row[2], a, "start");
          });
          var mo = fade(T, 3.8, 0.4) * a;
          if (mo > 0) {
            s += rect(g.x0, ya - 0.2 * amp, g.x1 - g.x0, 0.4 * amp, C.blue, 3, 0.16 * mo);
            s += rect(g.x0, yb - 0.75 * amp, g.x1 - g.x0, 1.5 * amp, C.orange, 3, 0.16 * mo);
            post += tag(g.x1, ya + 0.2 * amp + 16, "low idiosyncratic vol", C.blue, mo, "end");
            post += tag(g.x1, yb + 0.75 * amp + 16, "high idiosyncratic vol", C.orange, mo, "end");
          }
        }
        if (b > 0) {
          var mid = n ? g.y0 + 230 : g.y0 + 200, sc = n ? 140 : 120, slot = (g.x1 - g.x0) / 2;
          s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Noisiest fifth minus calmest" : "Noisiest fifth minus calmest fifth, % a month", C.faint, 12, "start", 600, b);
          s += line(g.x0, mid, g.x1, mid, "#48484a", 1.2, null, b);
          [["raw return", -1.06, 7.4], ["Fama-French alpha", -1.31, 7.9]].forEach(function (x, k) {
            var h = x[1] * sc * ease(fade(T, x[2], 0.7)), xx = g.x0 + k * slot + slot * 0.25;
            s += hbar(xx, mid, slot * 0.5, -h, C.dn, 0.9 * b);
            post += txt(xx + slot * 0.25, mid - h + 24, "−" + Math.abs(x[1]).toFixed(2) + "%", C.dn, 20, "middle", 800, b * fade(T, x[2] + 0.6, 0.4));
            post += txt(xx + slot * 0.25, mid - 10, x[0], C.dim, 13, "middle", 700, b);
          });
          var ab = fade(T, 8.8, 0.4) * (1 - fade(T, 10.4, 0.4));
          if (ab > 0) post += tag((g.x0 + g.x1) / 2, g.y1 - 20, "\"abysmally low average returns\"", C.orange, ab, "middle");
          var nr = fade(T, 10.6, 0.4);
          if (nr > 0) post += tag((g.x0 + g.x1) / 2, g.y1 - 20, n ? "not a risk premium" : "not explained by market-volatility risk", C.gold, nr, "middle");
        }
        s += post;
        s += note2(g, ["Own noise", "What's left after the", "market and factors."], C.ink, win(T, 0.3, 3.6));
        s += note2(g, ["Measured monthly", "Past month of daily", "returns, five groups."], C.orange, win(T, 3.8, 7));
        s += note2(g, ["Noisiest lost", "−1.06% a month raw,", "−1.31% after factors."], C.dn, win(T, 7.2, 10.4));
        s += note2(g, ["Not risk", "Market-wide volatility", "didn't explain it."], C.gold, fade(T, 10.6, 0.4));
        return s + stamp(L, b > 0.5 ? "Figures: Ang, Hodrick, Xing & Zhang (2006)" : "Illustrative · made-up returns");
      }
    };
  }

  /* 3 · betting against beta */
  function babSpec() {
    var ST = [
      { at: 0, title: "Two baskets", text: "Split stocks by beta. The low-beta basket moves less than the market (say beta 0.7); the high-beta basket moves more (say 1.4)." },
      { at: 3.4, title: "Lever the calm, shrink the wild", text: "Buy about $1.40 of low-beta stocks and short about $0.70 of high-beta stocks. Both legs now have a beta of 1, so the market move cancels: that's the betting-against-beta (BAB) factor." },
      { at: 7, title: "What it earned", text: "In US stocks from 1926 to 2012, BAB earned 0.70% a month above cash, with a Sharpe ratio of 0.78. Adding the size, value and momentum factors still left 0.55% a month." },
      { at: 10.4, title: "The catch: leverage", text: "The trade needs borrowed money on the long side. When borrowing gets hard (they used the TED spread as a gauge), BAB did badly at the same time. The edge exists because many investors can't or won't borrow." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var a = 1 - fade(T, 7, 0.5), b = fade(T, 7.2, 0.5);
        if (a > 0) {
          var bw = n ? 150 : 200, gx = n ? [g.x0 + 10, g.x0 + 200] : [g.x0 + 60, g.x0 + 380], base = g.y1 - 60, unit = n ? 150 : 130;
          s += line(g.x0, base, g.x1, base, "#48484a", 1.2, null, a);
          var lev = ease(fade(T, 3.6, 1.2));
          var dl = 1 + 0.4 * lev, ds = 1 - 0.3 * lev;
          s += rect(gx[0], base - dl * unit, bw, dl * unit, C.up, 8, 0.85 * a);
          s += rect(gx[1], base - ds * unit, bw, ds * unit, C.dn, 8, 0.85 * a);
          post += txt(gx[0] + bw / 2, base - dl * unit - 12, "long $" + dl.toFixed(2), C.up, 16, "middle", 800, a);
          post += txt(gx[1] + bw / 2, base - ds * unit - 12, "short $" + ds.toFixed(2), C.dn, 16, "middle", 800, a);
          post += txt(gx[0] + bw / 2, base + 22, "low beta (β 0.7)", C.dim, 13, "middle", 700, a);
          post += txt(gx[1] + bw / 2, base + 22, "high beta (β 1.4)", C.dim, 13, "middle", 700, a);
          var eq = fade(T, 5, 0.4) * a;
          if (eq > 0) {
            post += txt(gx[0] + bw / 2, base - dl * unit / 2, "1.40 × 0.7 ≈ 1", "#000", 14, "middle", 800, eq);
            post += txt(gx[1] + bw / 2, base - ds * unit / 2, "0.70 × 1.4 ≈ 1", "#000", 14, "middle", 800, eq);
            post += tag((g.x0 + g.x1) / 2, g.y0 + 20, n ? "beta 1 vs beta 1: neutral" : "beta 1 long, beta 1 short: market-neutral", C.gold, eq, "middle");
          }
        }
        if (b > 0) {
          var rows = n ? [["Excess return", "0.70%/mo"], ["Sharpe ratio", "0.78"], ["After 4 factors", "0.55%/mo"], ["Sample", "1926–2012"]] :
                         [["Excess return", "0.70% a month"], ["Sharpe ratio (annual)", "0.78"], ["Alpha after size, value, momentum", "0.55% a month"], ["Sample", "US stocks, 1926–2012"]];
          rows.forEach(function (rw, k) {
            var y = g.y0 + 30 + k * (n ? 62 : 56), op = fade(T, 7.4 + k * 0.3, 0.4) * b;
            s += rect(g.x0, y, g.x1 - g.x0, n ? 50 : 44, C.bg, 10, op);
            post += txt(g.x0 + 16, y + (n ? 31 : 28), rw[0], C.dim, 14, "start", 700, op);
            post += txt(g.x1 - 16, y + (n ? 31 : 28), rw[1], C.up, 17, "end", 800, op);
          });
          var lv = fade(T, 10.6, 0.4);
          if (lv > 0) {
            var y2 = g.y0 + 30 + 4 * (n ? 62 : 56) + 30;
            var r = rng(12), pts = [], v = 0;
            for (var i = 0; i < 60; i++) { v += 0.5 + (r() - 0.5) * 3 - (i > 34 && i < 44 ? 3.2 : 0); pts.push([g.x0 + i / 59 * (g.x1 - g.x0), y2 + 60 - v * 1.4]); }
            s += poly(pts, C.gold, 2.4, null, lv);
            s += rect(g.x0 + 34 / 59 * (g.x1 - g.x0), y2 - 20, 10 / 59 * (g.x1 - g.x0), 130, C.dn, 0, 0.15 * lv);
            post += tag(g.x0 + 39 / 59 * (g.x1 - g.x0), y2 - 30, n ? "funding squeeze" : "borrowing gets tight (made up)", C.dn, lv, "middle");
          }
        }
        s += post;
        s += note2(g, ["Two baskets", "Low beta ~0.7,", "high beta ~1.4."], C.ink, win(T, 0.3, 3.4));
        s += note2(g, ["Beta-neutral", "Long ~$1.40 calm,", "short ~$0.70 wild."], C.gold, win(T, 3.6, 7));
        s += note2(g, ["BAB, 1926–2012", "0.70% a month,", "Sharpe ratio 0.78."], C.up, win(T, 7.2, 10.4));
        s += note2(g, ["Needs leverage", "Hurts when borrowing", "gets hard."], C.dn, fade(T, 10.6, 0.4));
        return s + stamp(L, "Figures: Frazzini & Pedersen (2014) · paths made up");
      }
    };
  }

  /* 4 · why, and the price */
  function whySpec() {
    var N = 120, r = rng(13), lv = [], mk = [], a = 100, m = 100;
    for (var i = 0; i < N; i++) {
      var bull = i < 50 ? 1 : i < 70 ? -1 : 1;
      var mr = (bull > 0 ? 0.006 : -0.014) + (r() - 0.5) * 0.02;
      m *= 1 + mr; a *= 1 + 0.55 * mr + 0.0006 + (r() - 0.5) * 0.006;
      mk.push(m); lv.push(a);
    }
    var ST = [
      { at: 0, title: "Why would it last?", text: "If calm stocks are such a good deal, why doesn't everyone buy them? The researchers give three main reasons, and none of them needs investors to be foolish." },
      { at: 3.6, title: "Leverage, benchmarks, lotteries", text: "Investors who can't borrow buy high-beta stocks to get more return (Frazzini and Pedersen). Fund managers judged against an index avoid low-beta stocks that can lag it (Baker, Bradley and Wurgler). And people overpay for lottery-like stocks." },
      { at: 7, title: "The price: lagging in rallies", text: "A made-up low-volatility portfolio against the market. In strong rallies, calm stocks fall behind, sometimes for years. That's exactly the discomfort that keeps the edge alive." },
      { at: 10.4, title: "Where it earns its keep", text: "It earns its keep in the falls: it loses less, so it has less to make back. Over a full cycle it can finish ahead with a smoother ride, but not every cycle." }
    ];
    return {
      stages: ST, end: 13.8, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var a1 = 1 - fade(T, 7, 0.5), b = fade(T, 7.2, 0.5);
        if (a1 > 0) {
          var cards = [["Leverage limits", "Can't borrow? Buy high beta instead.", C.gold], ["Benchmarks", "Managers fear lagging the index.", C.blue], ["Lottery tickets", "People overpay for a long shot.", C.orange]];
          cards.forEach(function (c, k) {
            var op = fade(T, 3.8 + k * 0.5, 0.5) * a1, h = n ? 140 : 120;
            var x = n ? g.x0 : g.x0 + k * ((g.x1 - g.x0) / 3), w = n ? g.x1 - g.x0 : (g.x1 - g.x0) / 3 - 16, y = n ? g.y0 + 20 + k * (h + 16) : g.y0 + 120;
            s += rect(x, y, w, h, C.bg, 12, op);
            s += rect(x, y, 6, h, c[2], 3, op);
            post += txt(x + 22, y + 40, c[0], c[2], 18, "start", 800, op);
            post += txt(x + 22, y + 72, c[1], C.dim, 13, "start", 600, op);
          });
          var q = fade(T, 0.4, 0.5) * (1 - fade(T, 3.6, 0.4));
          if (q > 0) post += txt((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2, "If it's a free lunch, why is it still on the table?", C.ink, n ? 15 : 22, "middle", 800, q);
        }
        if (b > 0) {
          var lo = Math.min.apply(null, lv.concat(mk)) - 5, hi = Math.max.apply(null, lv.concat(mk)) + 5;
          var X = function (i) { return g.x0 + i / (N - 1) * (g.x1 - g.x0); }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
          s += K.grid(g);
          s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Low vol vs market · made up" : "A made-up low-volatility portfolio against the market", C.faint, 12, "start", 600, b);
          var up = Math.floor(track([[7.2, 1], [10, 70], [10.4, 70], [13, N - 1]], T)), pm = [], pl = [];
          for (var k = 0; k <= up; k++) { pm.push([X(k), Y(mk[k])]); pl.push([X(k), Y(lv[k])]); }
          s += rect(X(50), g.y0, X(70) - X(50), g.y1 - g.y0, C.dn, 0, 0.1 * fade(T, 10.4, 0.4));
          s += poly(pm, C.dim, 2.2, null, b) + poly(pl, C.up, 2.6, null, b);
          if (up > 40) { post += tag(X(Math.min(up, 49)), Y(mk[Math.min(up, 49)]) - 18, "market", C.dim, b, "end"); post += tag(X(Math.min(up, 49)), Y(lv[Math.min(up, 49)]) + 20, "low vol", C.up, b, "end"); }
          var rl = fade(T, 8, 0.4) * (1 - fade(T, 10.4, 0.4));
          if (rl > 0) post += tag(X(25), g.y0 + 18, "rally: low vol lags", C.dim, rl, "middle");
          var fa = fade(T, 10.6, 0.4);
          if (fa > 0) post += tag(X(60), g.y0 + 18, n ? "loses less" : "the fall: it loses less", C.up, fa, "middle");
        }
        s += post;
        s += note2(g, ["Why it lasts", "Three reasons, from", "the research."], C.ink, win(T, 0.3, 3.6));
        s += note2(g, ["Three reasons", "Leverage limits, benchmarks,", "lottery-ticket buying."], C.gold, win(T, 3.8, 7));
        s += note2(g, ["The price", "It lags in strong", "rallies, sometimes for years."], C.dim, win(T, 7.2, 10.4));
        s += note2(g, ["The payoff", "Smaller falls,", "less to make back."], C.up, fade(T, 10.6, 0.4));
        return s + stamp(L, "Illustrative · made-up paths");
      }
    };
  }

  K.run({
    specs: { line: lineSpec, ivol: ivolSpec, bab: babSpec, why: whySpec },
    steps: [
      { k: "Measure", c: C.gold, tag: "Volatility or beta over the past year" },
      { k: "Rank", c: C.blue, tag: "Calmest to wildest" },
      { k: "Hold", c: C.up, tag: "The calmest group, spread out" },
      { k: "Rebalance", c: C.cyan, tag: "Monthly or quarterly" },
      { k: "Expect", c: C.orange, tag: "Lags rallies, holds up in falls" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W, mid = d.mid;
      if (k === 0) {
        var r = rng(3), p1 = [], p2 = [];
        for (var i = 0; i <= 40; i++) { p1.push([40 + i * 12, mid - 40 + (r() - 0.5) * 14]); p2.push([40 + i * 12, mid + 50 + (r() - 0.5) * 70]); }
        s += d.pl(p1, C2.blue, 2.2) + d.pl(p2, C2.orange, 2.2);
        s += d.t(40, mid - 64, "calm", C2.blue, 13, "start", 700) + d.t(40, mid + 6, "wild", C2.orange, 13, "start", 700);
        s += d.t(30, bot + 32, "Standard deviation of daily returns, past year.", C2.dim, 12.5, "start", 500);
      } else if (k === 1 || k === 2) {
        for (var j = 0; j < 10; j++) { var h = 20 + j * 16, hot = k === 2 && j < 3; s += d.r(40 + j * 48, bot - 20 - h, 36, h, hot ? C2.up : j > 6 ? C2.dn : "#48484a", hot ? 0.9 : 0.6, 4); }
        s += d.t(30, bot + 32, k === 1 ? "Volatility, calmest on the left." : "Own the calmest third, many names.", C2.dim, 12.5, "start", 500);
      } else if (k === 3) {
        for (var q = 0; q < 4; q++) { var x = 70 + q * 130; s += d.ln(x, top + 20, x, bot - 10, C2.cyan, 2, "5 4") + d.t(x, bot + 8, "Q" + (q + 1), C2.cyan, 12, "middle", 700); }
        s += d.t(30, bot + 32, "Re-rank on a schedule; trade little.", C2.dim, 12.5, "start", 500);
      } else {
        s += d.pl([[40, mid], [160, mid - 90], [280, mid + 40], [400, mid - 60], [520, mid - 110]], C2.dim, 2.2);
        s += d.pl([[40, mid], [160, mid - 50], [280, mid - 10], [400, mid - 60], [520, mid - 90]], C2.up, 2.6);
        s += d.t(30, bot + 32, "Less up, much less down.", C2.dim, 12.5, "start", 500);
      }
      return s;
    }
  });
})();
