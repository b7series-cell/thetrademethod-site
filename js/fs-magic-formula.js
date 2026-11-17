/* =====================================================================
   fs-magic-formula.js — walkthroughs on
   famous-strategies/magic-formula.html (Joel Greenblatt, 2005).

     two       the two numbers for one made-up company: earnings yield and
               return on capital
     rank      twelve made-up stocks ranked on each, ranks added, best totals
     results   the book's backtest figures, 1988-2004 and the updated run
     patience  made-up yearly results vs the market: it loses some years,
               and the buy-in-batches, sell-at-a-year schedule
   Uses js/fs-kit.js. Book figures are labelled; every company is made up.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win, ease = K.ease,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, hbar = K.hbar, arrow = K.arrow, rng = K.rng, sizeStd = K.sizeStd, fmt = K.fmt;

  /* 1 · the two numbers */
  function twoSpec() {
    var ST = [
      { at: 0, title: "A cheap company?", text: "Earnings yield asks how much the business earns for the price of the whole company. A made-up company with $100M of operating profit (EBIT) and an enterprise value of $800M earns 12.5%." },
      { at: 3.6, title: "Enterprise value, not price", text: "Enterprise value is the stock's market value plus its debt, minus excess cash: what it would cost to buy the whole business. That way two companies with different amounts of debt compare fairly." },
      { at: 7, title: "A good company?", text: "Return on capital asks how much the business earns on the money tied up in it to run: working capital plus factories and equipment. $100M on $400M of capital is 25%." },
      { at: 10.4, title: "Good and cheap", text: "The formula wants both at once: a business that earns a lot on its capital, bought at a price that gives a high earnings yield. Either one alone isn't enough." }
    ];
    return {
      stages: ST, end: 13.8, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var colW = n ? (g.x1 - g.x0) : (g.x1 - g.x0) / 2 - 20;
        var lx = g.x0, rx = n ? g.x0 : g.x0 + colW + 40;
        var ly0 = g.y0 + 10, ry0 = n ? g.y0 + 290 : g.y0 + 10;
        s += txt(g.x0, g.y0 - (n ? 4 : 14), "One made-up company", C.faint, 12, "start", 600);
        /* earnings yield block */
        var e1 = fade(T, 0.3, 0.6);
        s += rect(lx, ly0, colW, n ? 250 : 400, C.bg, 14, e1);
        post += txt(lx + 18, ly0 + 32, "Earnings yield", C.gold, 18, "start", 800, e1);
        post += txt(lx + 18, ly0 + 56, "EBIT ÷ enterprise value", C.dim, 13, "start", 600, e1);
        var bw = colW - 36, ebW = bw * 100 / 800 * ease(fade(T, 0.8, 0.8)), evW = bw * ease(fade(T, 0.6, 0.8));
        s += rect(lx + 18, ly0 + 78, evW, 26, "#48484a", 4, e1);
        post += txt(lx + 24, ly0 + 96, "enterprise value $800M", C.ink, 12, "start", 700, e1);
        s += rect(lx + 18, ly0 + 112, ebW, 26, C.gold, 4, e1);
        post += txt(lx + 24 + ebW, ly0 + 130, "EBIT $100M", C.gold, 12, "start", 700, e1);
        var evx = fade(T, 3.8, 0.4) * (1 - fade(T, 7, 0.4));
        if (evx > 0) {
          var yy = ly0 + (n ? 160 : 170);
          post += txt(lx + 18, yy, "market value  $700M", C.dim, 13, "start", 600, evx);
          post += txt(lx + 18, yy + 22, "+ debt          $200M", C.dim, 13, "start", 600, evx);
          post += txt(lx + 18, yy + 44, "− excess cash  $100M", C.dim, 13, "start", 600, evx);
          post += txt(lx + 18, yy + 70, "= $800M", C.ink, 15, "start", 800, evx);
        }
        var ey = fade(T, 1.8, 0.5);
        post += txt(lx + colW - 18, ly0 + 40, "12.5%", C.gold, n ? 30 : 36, "end", 800, ey);
        /* return on capital block */
        var r1 = fade(T, 7.2, 0.5);
        if (r1 > 0) {
          s += rect(rx, ry0, colW, n ? 250 : 400, C.bg, 14, r1);
          post += txt(rx + 18, ry0 + 32, "Return on capital", C.blue, 18, "start", 800, r1);
          post += txt(rx + 18, ry0 + 56, n ? "EBIT ÷ (working cap. + fixed assets)" : "EBIT ÷ (net working capital + net fixed assets)", C.dim, 13, "start", 600, r1);
          var w1 = bw * 150 / 400 * ease(fade(T, 7.4, 0.7)), w2 = bw * 250 / 400 * ease(fade(T, 7.7, 0.7)), w3 = bw * 100 / 400 * ease(fade(T, 8.2, 0.7));
          s += rect(rx + 18, ry0 + 78, w1, 26, "#5e5ce6", 4, r1) + rect(rx + 18 + w1, ry0 + 78, w2, 26, "#48484a", 4, r1);
          post += txt(rx + 24, ry0 + 96, "$150M", C.ink, 12, "start", 700, r1) + txt(rx + 24 + w1, ry0 + 96, n ? "$250M fixed" : "$250M plants + equipment", C.ink, 12, "start", 700, r1);
          s += rect(rx + 18, ry0 + 112, w3, 26, C.blue, 4, r1);
          post += txt(rx + 24 + w3, ry0 + 130, "EBIT $100M", C.blue, 12, "start", 700, r1);
          post += txt(rx + colW - 18, ry0 + 40, "25%", C.blue, n ? 30 : 36, "end", 800, fade(T, 8.6, 0.5));
        }
        var both = fade(T, 10.6, 0.4);
        if (both > 0) post += tag((g.x0 + g.x1) / 2, g.y1 - 10, n ? "good AND cheap" : "a good business (25%) at a cheap price (12.5%)", C.up, both, "middle");
        s += post;
        s += note2(g, ["Cheap?", "$100M earned on an", "$800M price: 12.5%."], C.gold, win(T, 0.3, 3.6));
        s += note2(g, ["Enterprise value", "Market value + debt", "− excess cash."], C.dim, win(T, 3.8, 7));
        s += note2(g, ["Good?", "$100M earned on", "$400M of capital: 25%."], C.blue, win(T, 7.2, 10.4));
        s += note2(g, ["Both at once", "High return on capital,", "high earnings yield."], C.up, fade(T, 10.6, 0.4));
        return s + stamp(L, "Illustrative · made-up company");
      }
    };
  }

  /* 2 · rank on each, add the ranks */
  function rankSpec() {
    var S = [["Stock A", 14.1, 38], ["Stock B", 9.2, 61], ["Stock C", 18.5, 12], ["Stock D", 6.0, 22], ["Stock E", 12.0, 45], ["Stock F", 4.3, 90],
             ["Stock G", 11.2, 28], ["Stock H", 16.0, 30], ["Stock I", 7.5, 15], ["Stock J", 10.4, 52], ["Stock K", 3.1, 9], ["Stock L", 8.8, 33]];
    function rk(col) { var o = S.map(function (x, i) { return i; }).sort(function (a, b) { return S[b][col] - S[a][col]; }); var r = []; o.forEach(function (i, k) { r[i] = k + 1; }); return r; }
    var rE = rk(1), rR = rk(2), tot = S.map(function (x, i) { return rE[i] + rR[i]; });
    var ord = S.map(function (x, i) { return i; }).sort(function (a, b) { return tot[a] - tot[b] || rE[a] - rE[b]; });
    var place = []; ord.forEach(function (i, k) { place[i] = k; });
    var ST = [
      { at: 0, title: "Rank on earnings yield", text: "Line up every stock (the book used the largest 3,500 US companies) and rank them on earnings yield. The highest yield, the cheapest business, gets rank 1." },
      { at: 3.4, title: "Rank on return on capital", text: "Rank the same stocks again on return on capital. The best business gets rank 1. Notice the cheapest stocks are often not the best businesses." },
      { at: 6.8, title: "Add the two ranks", text: "Add each stock's two ranks. A stock that's 3rd on one and 4th on the other scores 7. Lowest total wins: good on both beats great on one and poor on the other." },
      { at: 10.2, title: "Buy the top of the list", text: "Sort by the total and buy from the top. The book's version held 20 to 30 stocks, bought a few at a time. Stock C was the cheapest of all here, but its business is poor, so it doesn't make the cut." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var rh = n ? 40 : 34, y0 = g.y0 + (n ? 30 : 26);
        var srt = ease(fade(T, 10.4, 1.2));
        var cx = n ? [g.x0, g.x0 + 110, g.x0 + 190, g.x0 + 270, g.x0 + 330] : [g.x0, g.x0 + 170, g.x0 + 300, g.x0 + 430, g.x0 + 560];
        var hd = ["company", "earn. yield", "ret. on cap.", "total", ""];
        hd.forEach(function (h, j) { if (h) post += txt(cx[j] + (j ? 40 : 0), y0 - 10, h, C.faint, 12, j ? "middle" : "start", 700, j === 2 ? fade(T, 3.4, 0.4) : j === 3 ? fade(T, 6.8, 0.4) : 1); });
        S.forEach(function (x, i) {
          var y = y0 + rh * (i + (place[i] - i) * srt), top = place[i] < 3 && srt > 0.5;
          s += rect(g.x0 - 6, y + 2, cx[3] + 90 - g.x0, rh - 4, top ? "#173d24" : C.bg, 6, 1);
          post += txt(cx[0] + 4, y + rh / 2 + 5, x[0], C.ink, 13, "start", 700);
          var eo = fade(T, 0.4 + i * 0.05, 0.3);
          post += txt(cx[1] + 40, y + rh / 2 + 5, x[1].toFixed(1) + "% · #" + rE[i], rE[i] <= 3 ? C.gold : C.dim, 12.5, "middle", 700, eo);
          var ro = fade(T, 3.6 + i * 0.05, 0.3);
          post += txt(cx[2] + 40, y + rh / 2 + 5, x[2] + "% · #" + rR[i], rR[i] <= 3 ? C.blue : C.dim, 12.5, "middle", 700, ro);
          var to = fade(T, 7 + i * 0.05, 0.3);
          post += txt(cx[3] + 40, y + rh / 2 + 5, String(tot[i]), C.ink, 14, "middle", 800, to);
          if (top) post += tag(cx[3] + 92, y + rh / 2, "buy", C.up, fade(T, 11.2, 0.4), "start");
        });
        var cc = fade(T, 12, 0.4);
        if (cc > 0) { var yc = y0 + rh * place[2]; post += tag(n ? g.x1 : cx[3] + 92, yc + rh / 2, n ? "cheap, poor business" : "cheapest, but a poor business", C.orange, cc, n ? "end" : "start"); }
        s += post;
        s += note2(g, ["Earnings yield", "Highest = rank 1.", "The cheapest businesses."], C.gold, win(T, 0.3, 3.4));
        s += note2(g, ["Return on capital", "Highest = rank 1.", "The best businesses."], C.blue, win(T, 3.6, 6.8));
        s += note2(g, ["Add the ranks", "Lowest total wins:", "good on both."], C.ink, win(T, 7, 10.2));
        s += note2(g, ["Buy the top", "20–30 stocks in the book;", "the top 3 here."], C.up, fade(T, 10.4, 0.4));
        return s + stamp(L, "Illustrative · made-up companies");
      }
    };
  }

  /* 3 · the book's numbers */
  function resultsSpec() {
    var ST = [
      { at: 0, title: "1988 to 2004", text: "Greenblatt's book tested the formula on the largest 3,500 US stocks from 1988 to 2004: buy the top 30, hold each for a year, repeat. It reported an average of 30.8% a year against 12.4% for the S&P 500." },
      { at: 3.6, title: "What that compounds to", text: "Over those 17 years, the book says $10,000 would have grown to about $960,000 with the formula and about $73,000 in the S&P 500. Before costs and taxes, and with hindsight on which version to publish." },
      { at: 7, title: "Bigger stocks, smaller edge", text: "Limited to the largest 1,000 stocks (above about $1 billion), the book reported 22.9% a year. The edge was biggest in smaller companies, where fewer professionals look." },
      { at: 10.4, title: "The updated run", text: "The updated edition carried the test to 2009: about 23.8% a year for stocks above $50 million and 19.7% above $1 billion, against 9.5% for the S&P 500. Still ahead, by less." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var a = fade(T, 0.3, 0.4) * (1 - fade(T, 3.6, 0.4)) + fade(T, 7, 0.4) * (1 - fade(T, 10.4, 0.4));
        var showBars = T < 3.6 || (T >= 7 && T < 10.4) ? 1 : 0;
        var grow = fade(T, 3.8, 0.4) * (1 - fade(T, 7, 0.4)), upd = fade(T, 10.6, 0.4);
        var mid = g.y1 - 40, sc = (mid - g.y0 - 60) / 32;
        if (showBars || T < 0.5) {
          var bars = T < 3.6 ? [["Magic Formula", 30.8, C.up], ["S&P 500", 12.4, C.dn]] : [["All 3,500", 30.8, C.up], ["Largest 1,000", 22.9, C.gold], ["S&P 500", 12.4, C.dn]];
          var t0 = T < 3.6 ? 0.4 : 7.2, slot = (g.x1 - g.x0) / bars.length;
          s += txt(g.x0, g.y0 - (n ? 4 : 14), "Average annual return, 1988–2004 (the book)", C.faint, 12, "start", 600, a);
          s += line(g.x0, mid, g.x1, mid, "#48484a", 1.2, null, a);
          bars.forEach(function (b, k) {
            var h = b[1] * sc * ease(fade(T, t0 + k * 0.3, 0.8)), x = g.x0 + k * slot + slot * 0.2;
            s += hbar(x, mid, slot * 0.6, -h, b[2], 0.9 * a);
            post += txt(x + slot * 0.3, mid - h - 10, b[1].toFixed(1) + "%", b[2], 20, "middle", 800, a * fade(T, t0 + 0.6 + k * 0.3, 0.4));
            post += txt(x + slot * 0.3, mid + 20, b[0], C.dim, 13, "middle", 700, a);
          });
        }
        if (grow > 0) {
          s += txt(g.x0, g.y0 - (n ? 4 : 14), "$10,000 over 17 years, 1988–2004 (the book)", C.faint, 12, "start", 600, grow);
          var X = function (y) { return g.x0 + y / 17 * (g.x1 - g.x0); }, LY = function (v) { return g.y1 - Math.log(v / 10000) / Math.log(110) * (g.y1 - g.y0 - 30); };
          var up = track([[3.8, 0], [6.2, 17]], T), pm = [], ps = [];
          for (var y = 0; y <= up + 1e-9; y += 0.25) { pm.push([X(y), LY(10000 * Math.pow(1.308, y))]); ps.push([X(y), LY(10000 * Math.pow(1.124, y))]); }
          [1e4, 1e5, 1e6].forEach(function (v) { s += line(g.x0, LY(v), g.x1, LY(v), "#2c2c2e", 1, null, grow); post += txt(g.x1 + 6, LY(v) + 4, "$" + fmt(v), C.faint, 11, "start", 600, grow); });
          s += poly(pm, C.up, 2.8, null, grow) + poly(ps, C.dn, 2.4, null, grow);
          if (up >= 17) { post += tag(X(17), LY(960000) + 22, "≈ $960,000", C.up, grow, "end"); post += tag(X(17), LY(73000) + 22, "≈ $73,000", C.dn, grow, "end"); }
          post += txt(g.x0, g.y1 + 18, n ? "log scale · smooth lines at the averages" : "Log scale · smooth lines drawn at the average rates, not the real year-by-year path", C.faint, 11, "start", 600, grow);
        }
        if (upd > 0) {
          var B2 = [["over $50M", 23.8, C.up], ["over $1B", 19.7, C.gold], ["S&P 500", 9.5, C.dn]], sl = (g.x1 - g.x0) / 3;
          s += txt(g.x0, g.y0 - (n ? 4 : 14), "Average annual return, 1988–2009 (updated edition)", C.faint, 12, "start", 600, upd);
          s += line(g.x0, mid, g.x1, mid, "#48484a", 1.2, null, upd);
          B2.forEach(function (b, k) {
            var h = b[1] * sc * ease(fade(T, 10.8 + k * 0.3, 0.8)), x = g.x0 + k * sl + sl * 0.2;
            s += hbar(x, mid, sl * 0.6, -h, b[2], 0.9 * upd);
            post += txt(x + sl * 0.3, mid - h - 10, b[1].toFixed(1) + "%", b[2], 20, "middle", 800, upd * fade(T, 11.4 + k * 0.3, 0.4));
            post += txt(x + sl * 0.3, mid + 20, b[0], C.dim, 13, "middle", 700, upd);
          });
        }
        s += post;
        s += note2(g, ["The book's test", "30.8% a year vs 12.4%,", "1988–2004."], C.up, win(T, 0.3, 3.6));
        s += note2(g, ["Compounded", "$10,000 → ~$960,000", "vs ~$73,000."], C.up, win(T, 3.8, 7));
        s += note2(g, ["Largest 1,000", "22.9% a year:", "less edge in big stocks."], C.gold, win(T, 7.2, 10.4));
        s += note2(g, ["Through 2009", "23.8% and 19.7%", "vs 9.5% for the S&P."], C.up, fade(T, 10.6, 0.4));
        return s + stamp(L, "Figures: Greenblatt, The Little Book That (Still) Beats the Market");
      }
    };
  }

  /* 4 · it doesn't work every year */
  function patienceSpec() {
    var R = [9, 14, -6, 22, 5, -9, 17, 11, 3, -4, 26, 8, 13, -7, 19, 6];
    var ST = [
      { at: 0, title: "Ahead on average, not every year", text: "These are made-up yearly results against the market. The book says the formula trailed the market in roughly one year out of four." },
      { at: 3.6, title: "Why that matters", text: "Greenblatt's argument is that the losing stretches are why it keeps working: most people can't stick with a method that looks wrong for a year or two, so the bargains don't get bought up." },
      { at: 7, title: "Buy in batches", text: "The book's schedule: buy 5 to 7 top-ranked stocks, then repeat every two or three months until you hold 20 to 30. That spreads the buying across the year." },
      { at: 10.4, title: "Sell at a year", text: "Each stock is sold after a year and replaced from the current list. In a taxable account, the book suggests selling losers just before a year and winners just after, for the tax treatment." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var a = 1 - fade(T, 7, 0.5), b = fade(T, 7.2, 0.5);
        if (a > 0) {
          var mid = (g.y0 + g.y1) / 2, sc = (g.y1 - g.y0) / 2 / 30, slot = (g.x1 - g.x0) / R.length;
          s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Yearly result vs market · made up" : "Made-up yearly results, formula minus market (percentage points)", C.faint, 12, "start", 600, a);
          s += line(g.x0, mid, g.x1, mid, "#48484a", 1.2, null, a);
          R.forEach(function (v, k) {
            var h = v * sc * ease(fade(T, 0.3 + k * 0.12, 0.5)), x = g.x0 + k * slot + slot * 0.15;
            s += hbar(x, mid, slot * 0.7, -h, v >= 0 ? C.up : C.dn, a * (v < 0 ? 1 : 0.85));
          });
          var lo = fade(T, 2.4, 0.4) * a;
          if (lo > 0) post += tag((g.x0 + g.x1) / 2, g.y1 - 10, n ? "4 losing years of 16" : "4 losing years out of 16: about one in four", C.dn, lo, "middle");
          var wh = fade(T, 3.8, 0.4) * a;
          if (wh > 0) post += tag((g.x0 + g.x1) / 2, g.y0 + 14, n ? "most people quit here" : "the years most people quit", C.orange, wh, "middle");
        }
        if (b > 0) {
          s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "The first two years" : "The book's schedule, months 0 to 24", C.faint, 12, "start", 600, b);
          var X = function (m) { return g.x0 + m / 24 * (g.x1 - g.x0); }, lanes = [0, 2.5, 5, 7.5, 10], lh = n ? 70 : 52;
          for (var m = 0; m <= 24; m += 6) { s += line(X(m), g.y0 + 20, X(m), g.y0 + 20 + lh * 5 + 10, "#2c2c2e", 1, null, b); post += txt(X(m), g.y0 + 46 + lh * 5, "month " + m, C.faint, 11, "middle", 600, b); }
          lanes.forEach(function (st, k) {
            var y = g.y0 + 30 + k * lh, gr = ease(fade(T, 7.4 + k * 0.4, 0.6));
            s += rect(X(st), y, (X(st + 12) - X(st)) * gr, lh - 16, C.blue, 6, 0.85 * b);
            post += txt(X(st) + 8, y + (lh - 16) / 2 + 5, n ? "5–7" : "buy 5–7", "#000", 12, "start", 800, b * gr);
            var sl = fade(T, 10.6 + k * 0.3, 0.4) * b;
            if (sl > 0) {
              s += rect(X(st + 12), y, (X(Math.min(24, st + 24)) - X(st + 12)) * Math.min(1, ease(fade(T, 10.8 + k * 0.3, 0.6))), lh - 16, C.up, 6, 0.55 * sl);
              s += line(X(st + 12), y - 4, X(st + 12), y + lh - 12, C.gold, 2.4, null, sl);
              if (k === 0) post += tag(X(st + 12), y - 10, n ? "sell, replace" : "1 year: sell, replace", C.gold, sl, "middle");
            }
          });
        }
        s += post;
        s += note2(g, ["Not every year", "Behind in about one", "year out of four."], C.dn, win(T, 0.3, 3.6));
        s += note2(g, ["Why it lasts", "The losing years shake", "most people out."], C.orange, win(T, 3.8, 7));
        s += note2(g, ["Buy in batches", "5–7 stocks every 2–3", "months, up to 20–30."], C.blue, win(T, 7.2, 10.4));
        s += note2(g, ["Sell at a year", "Replace from the list.", "Losers just before, winners", "just after, for taxes."], C.gold, fade(T, 10.6, 0.4));
        return s + stamp(L, b > 0.5 ? "Schedule: Greenblatt's book" : "Illustrative · made-up years");
      }
    };
  }

  K.run({
    specs: { two: twoSpec, rank: rankSpec, results: resultsSpec, patience: patienceSpec },
    steps: [
      { k: "Screen", c: C.dim, tag: "Big enough, no banks or utilities" },
      { k: "Score", c: C.gold, tag: "Earnings yield and return on capital" },
      { k: "Rank", c: C.blue, tag: "Two ranks, added" },
      { k: "Buy", c: C.up, tag: "5–7 at a time, up to 20–30" },
      { k: "Replace", c: C.orange, tag: "Sell at a year, buy from the new list" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W;
      if (k === 0) {
        var r = rng(3);
        for (var i = 0; i < 60; i++) { var x = 40 + (i % 12) * 40, y = top + 20 + Math.floor(i / 12) * 34, out = r() < 0.25; s += d.r(x, y, 26, 22, out ? "#3a3a3c" : C2.blue, out ? 0.6 : 0.8, 4); }
        s += d.t(30, bot + 32, "Drop financials, utilities and tiny stocks.", C2.dim, 12.5, "start", 500);
      } else if (k === 1) {
        s += d.t(W / 2, top + 50, "EBIT ÷ enterprise value", C2.gold, 17, "middle", 700);
        s += d.t(W / 2, top + 76, "how cheap", C2.dim, 13, "middle", 600);
        s += d.t(W / 2, top + 140, "EBIT ÷ capital employed", C2.blue, 17, "middle", 700);
        s += d.t(W / 2, top + 166, "how good", C2.dim, 13, "middle", 600);
        s += d.t(30, bot + 32, "Two numbers per company.", C2.dim, 12.5, "start", 500);
      } else if (k === 2) {
        [["#3", "+", "#4", "= 7", C2.up], ["#1", "+", "#40", "= 41", C2.dn]].forEach(function (row, j) {
          var y = top + 60 + j * 80;
          s += d.t(80, y, row[0], C2.gold, 22, "middle", 800) + d.t(150, y, row[1], C2.dim, 22, "middle", 700) + d.t(220, y, row[2], C2.blue, 22, "middle", 800) + d.t(330, y, row[3], row[4], 24, "middle", 800);
        });
        s += d.t(30, bot + 32, "Good on both beats great on one.", C2.dim, 12.5, "start", 500);
      } else if (k === 3) {
        for (var j = 0; j < 4; j++) s += d.r(40 + j * 120, bot - 40 - j * 30, 100, 30 + j * 30, C2.up, 0.3 + j * 0.15, 6) + d.t(90 + j * 120, bot - 50 - j * 30, (j + 1) * 6 + "", C2.ink, 14, "middle", 800);
        s += d.t(30, bot + 32, "Positions held, building over the first year.", C2.dim, 12.5, "start", 500);
      } else {
        s += d.r(40, d.mid - 30, 220, 50, C2.blue, 0.7, 8) + d.t(150, d.mid, "bought", "#000", 14, "middle", 800);
        s += d.ln(270, d.mid - 5, 320, d.mid - 5, C2.gold, 3);
        s += d.r(330, d.mid - 30, 190, 50, C2.up, 0.6, 8) + d.t(425, d.mid, "replacement", "#000", 14, "middle", 800);
        s += d.t(295, d.mid - 46, "1 year", C2.gold, 13, "middle", 800);
        s += d.t(30, bot + 32, "Re-rank, and keep doing it for years.", C2.dim, 12.5, "start", 500);
      }
      return s;
    }
  });
})();
