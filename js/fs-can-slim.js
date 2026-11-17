/* =====================================================================
   fs-can-slim.js — walkthroughs on
   famous-strategies/can-slim.html (William O'Neil, 1988).

     letters  the seven letters as a checklist on one made-up stock
     base     a made-up cup with handle: base, pivot, breakout on volume,
              the buy zone up to 5% above the pivot
     sell     the 7-8% loss rule, and the 20-25% profit rule
     market   M: distribution, correction, follow-through day
   Uses js/fs-kit.js. Every company, bar and number is made up.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win, ease = K.ease,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, hbar = K.hbar, arrow = K.arrow, rng = K.rng, sizeStd = K.sizeStd,
      mkBars = K.mkBars, drawBars = K.drawBars, cross = K.cross, bracket = K.bracket;

  /* 1 · the checklist */
  function lettersSpec() {
    var L7 = [
      ["C", "Current quarterly earnings", "EPS up 25%+ vs a year ago", "+38%", 0.4],
      ["A", "Annual earnings", "25%+ a year for 3 years, ROE 17%+", "+29%/yr · ROE 24%", 1.2],
      ["N", "New", "New product, management or high", "new product · near high", 2.0],
      ["S", "Supply and demand", "Volume up on the breakout", "+70% vs average", 4.0],
      ["L", "Leader or laggard", "Relative strength 80 or more", "RS 94", 4.8],
      ["I", "Institutional sponsorship", "More good funds buying", "fund owners rising", 5.6],
      ["M", "Market direction", "The market in a confirmed uptrend", "uptrend", 7.8]
    ];
    var ST = [
      { at: 0, title: "C, A, N: the earnings and the story", text: "A made-up company, run through O'Neil's checklist. C: quarterly earnings up at least 25% on a year ago. A: annual earnings up 25% or more a year for three years, with return on equity of 17% or more. N: something new, and a stock near new highs." },
      { at: 3.8, title: "S, L, I: the buying", text: "S: big volume when it breaks out, a sign of demand. L: a leader, with relative strength of 80 or more (beating 80% of stocks over the past year). I: good funds owning more of it each quarter." },
      { at: 7.6, title: "M: the market", text: "M: the general market has to be in a confirmed uptrend. O'Neil's point is that three out of four stocks follow the market's direction, so a great stock in a falling market usually falls too." },
      { at: 10.6, title: "All seven, then a chart", text: "Passing the checklist only makes it a candidate. The buy comes from the chart: a breakout from a sound base, which is the next walkthrough." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var rh = n ? 74 : 58, y0 = g.y0 + (n ? 0 : 4);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), "One made-up stock, letter by letter", C.faint, 12, "start", 600);
        L7.forEach(function (r, k) {
          var y = y0 + k * rh, op = fade(T, r[4], 0.4), ok = fade(T, r[4] + 0.6, 0.3);
          s += rect(g.x0, y, g.x1 - g.x0, rh - 8, C.bg, 10, op);
          s += rect(g.x0, y, n ? 46 : 56, rh - 8, k === 6 ? C.gold : C.blue, 10, 0.85 * op);
          post += txt(g.x0 + (n ? 23 : 28), y + (rh - 8) / 2 + 9, r[0], "#000", n ? 24 : 26, "middle", 900, op);
          post += txt(g.x0 + (n ? 58 : 72), y + (n ? 24 : 24), r[1], C.ink, n ? 13 : 15, "start", 800, op);
          post += txt(g.x0 + (n ? 58 : 72), y + (n ? 46 : 44), r[2], C.dim, 12, "start", 600, op);
          if (!n) post += txt(g.x1 - 50, y + (rh - 8) / 2 + 5, r[3], C.up, 13, "end", 800, ok);
          else post += txt(g.x0 + 58, y + 64, r[3], C.up, 12, "start", 800, ok);
          s += dot(g.x1 - 22, y + (rh - 8) / 2, 11, C.up, ok);
          post += txt(g.x1 - 22, y + (rh - 8) / 2 + 5, "✓", "#000", 14, "middle", 900, ok);
        });
        var all = fade(T, 10.8, 0.4);
        if (all > 0) post += tag((g.x0 + g.x1) / 2, Math.min(g.y1 - 6, y0 + 7 * rh + 10), n ? "a candidate, not a buy yet" : "7 of 7: a candidate. The chart decides when to buy.", C.gold, all, "middle");
        s += post;
        s += note2(g, ["C · A · N", "Earnings growth and", "something new."], C.blue, win(T, 0.3, 3.8));
        s += note2(g, ["S · L · I", "Demand, leadership,", "big buyers."], C.blue, win(T, 4, 7.6));
        s += note2(g, ["M", "Three out of four stocks", "follow the market."], C.gold, win(T, 7.8, 10.6));
        s += note2(g, ["Then the chart", "A breakout from a", "sound base."], C.up, fade(T, 10.8, 0.4));
        return s + stamp(L, "Illustrative · made-up company");
      }
    };
  }

  /* 2 · cup with handle */
  function baseSpec() {
    var CL = [], r = rng(4), N = 64;
    var path = [[0, 100], [6, 112], [10, 116], [22, 92], [30, 90], [40, 108], [44, 115.4], [48, 110], [52, 111.5], [54, 113], [55, 118.2], [60, 123], [63, 125]];
    for (var i = 0; i < N; i++) CL.push(track(path, i) + (r() - 0.5) * 2.2);
    CL[55] = 118.6;
    var B = mkBars(CL, 99, 9, 1.1);
    for (var k = 45; k < 55; k++) { B[k].h = Math.min(B[k].h, 116); }
    B[55] = { o: 113.4, h: 119.2, l: 113.0, c: 118.6 };
    var V = []; var rv = rng(7);
    for (var j = 0; j < N; j++) V.push(0.6 + rv() * 0.5 - (j > 44 && j < 55 ? 0.25 : 0));
    V[55] = 1.9; V[56] = 1.5;
    var pivot = 116.2;
    var ST = [
      { at: 0, title: "The base", text: "After a run-up, a made-up leader pulls back and spends weeks building a rounded base: the cup. O'Neil wanted bases of at least seven weeks, with the correction not too deep." },
      { at: 3.6, title: "The handle and the pivot", text: "Near the old high it drifts down a little on light volume: the handle. The top of the handle is the pivot, the buy point. Light volume here means sellers have dried up." },
      { at: 7, title: "The breakout", text: "It clears the pivot on volume about 90% above its 50-day average. O'Neil wanted breakout volume at least 40% to 50% above normal: that's the big buyers showing up." },
      { at: 10.2, title: "The buy zone", text: "Buy as close to the pivot as you can, and no more than 5% above it. Past that, the stock is extended: a normal pullback would hit your stop." }
    ];
    return {
      stages: ST, end: 13.4, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L, { vol: true }), s = "", post = "";
        var lo = 84, hi = 128, X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 6], [3.4, 44], [3.8, 44], [6.8, 55], [7.2, 55], [9.8, 58], [10.2, 58], [12.8, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up leader · daily" : "A made-up leader · daily bars", C.faint, 12, "start", 600);
        var cup = fade(T, 2, 0.6);
        if (cup > 0) { var cp = []; for (var a = 10; a <= 44; a++) cp.push([X(a), Y(track([[10, 117], [22, 91], [30, 89.5], [44, 116.5]], a)) + 14]); s += poly(cp, C.blue, 2, "5 4", cup); post += tag(X(26), Y(86), n ? "cup · 7+ weeks" : "the cup: at least 7 weeks", C.blue, cup, "middle"); }
        var hd = fade(T, 4.2, 0.4);
        if (hd > 0) { s += rect(X(44), Y(116.4), X(54) - X(44), Y(109) - Y(116.4), C.gold, 4, 0.16 * hd); post += tag(X(49), Y(106.5), "handle", C.gold, hd, "middle"); }
        var pv = fade(T, 5.4, 0.4);
        if (pv > 0) { s += line(X(40), Y(pivot), g.x1, Y(pivot), C.ink, 1.8, "6 4", pv); post += tag(g.x1, Y(pivot) - 14, "pivot " + pivot.toFixed(2), C.ink, pv, "end"); }
        var bz = fade(T, 10.4, 0.4);
        if (bz > 0) { s += rect(X(54), Y(pivot * 1.05), g.x1 - X(54), Y(pivot) - Y(pivot * 1.05), C.up, 0, 0.18 * bz); post += tag(X(54) + 6, Y(pivot * 1.05) - 12, n ? "buy zone ≤ +5%" : "buy zone: pivot to +5%", C.up, bz, "start"); }
        s += drawBars(B, X, Y, cnt, bw);
        /* volume */
        var vy0 = g.y1 + 24, vh = g.vy1 - vy0;
        for (var v = 0; v < Math.floor(cnt); v++) s += rect(X(v) - bw / 2, g.vy1 - V[v] / 2 * vh, bw, V[v] / 2 * vh, v === 55 ? C.up : (v > 44 && v < 55) ? C.gold : "#48484a", 1, v === 55 ? 0.95 : 0.6);
        s += line(g.x0, g.vy1 - 0.85 / 2 * vh, g.x1, g.vy1 - 0.85 / 2 * vh, C.faint, 1, "3 3");
        var bo = fade(T, 7.2, 0.4);
        if (bo > 0) { post += tag(X(55), g.vy1 - 1.9 / 2 * vh - 12, n ? "+90% vol" : "volume +90% vs average", C.up, bo, "middle"); s += dot(X(55), Y(118.6), 6, C.up, bo); }
        s += post;
        s += note2(g, ["The base", "A rounded cup,", "at least 7 weeks."], C.blue, win(T, 0.3, 3.6));
        s += note2(g, ["Handle + pivot", "A light-volume dip;", "its top is the buy point."], C.gold, win(T, 3.8, 7));
        s += note2(g, ["Breakout", "Over the pivot on volume", "40–50%+ above normal."], C.up, win(T, 7.2, 10.2));
        s += note2(g, ["Buy zone", "Pivot to 5% above.", "Past that, don't chase."], C.up, fade(T, 10.4, 0.4));
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
  }

  /* 3 · selling */
  function sellSpec() {
    var N = 60, entry = 100;
    function pathA(i) { return track([[0, 100], [6, 103], [12, 98], [18, 93.5], [22, 91.6]], i); }
    function pathB(i) { return track([[0, 100], [8, 106], [14, 104], [24, 112], [30, 110], [40, 120], [46, 123.5], [52, 121], [59, 124]], i); }
    var ST = [
      { at: 0, title: "Bought at the pivot", text: "Two made-up breakouts, both bought at $100 in the buy zone. The rules for getting out are decided before either one moves." },
      { at: 2.8, title: "Cut it at 7–8%", text: "The first one fails. O'Neil's rule has no exceptions: sell when a stock falls 7% to 8% below what you paid. Here, at $92. The loss stays small." },
      { at: 6.6, title: "Take 20–25%", text: "The second one works. O'Neil's general rule is to take most gains at 20% to 25%. With the loss rule, that's about three dollars of gain for every dollar risked." },
      { at: 10.2, title: "Unless it's a monster", text: "The exception: a stock that jumps 20% within three weeks of the breakout is held for at least eight weeks, because those are often the biggest winners." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var X = function (k) { return g.x0 + k / (N - 1) * (g.x1 - g.x0); }, lo = 86, hi = 130, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Two made-up trades from $100" : "Two made-up breakouts, both bought at $100", C.faint, 12, "start", 600);
        s += line(g.x0, Y(100), g.x1, Y(100), C.ink, 1.2, "4 4");
        post += txt(g.x1 + 6, Y(100) + 4, "$100", C.ink, 11, "start", 700);
        var sl = fade(T, 0.8, 0.4);
        s += line(g.x0, Y(92), g.x1, Y(92), C.dn, 2, "6 4", sl);
        post += txt(g.x1 + 6, Y(92) + 4, "−8%", C.dn, 11, "start", 800, sl);
        var tp = fade(T, 6.8, 0.4);
        s += rect(g.x0, Y(125), g.x1 - g.x0, Y(120) - Y(125), C.up, 0, 0.14 * tp);
        post += txt(g.x1 + 6, Y(122.5) + 4, "+20–25%", C.up, 11, "start", 800, tp);
        var ua = track([[0.3, 0], [5, 22]], T), pa = [];
        for (var i = 0; i <= ua; i++) pa.push([X(i), Y(pathA(i))]);
        s += poly(pa, C.dn, 2.4);
        if (ua >= 22) { s += cross(X(22), Y(92), C.dn, 1); post += tag(X(22) + 10, Y(92) + 22, n ? "sold −8%" : "sold at $92: −8%", C.dn, fade(T, 5, 0.3), "start"); }
        var ub = track([[0.3, 0], [3, 6], [6.6, 24], [9.8, 46], [13, 59]], T), pb = [];
        for (var j = 0; j <= ub; j++) pb.push([X(j), Y(pathB(j))]);
        s += poly(pb, C.up, 2.6);
        if (ub >= 40) { s += dot(X(41), Y(120.3), 7, C.up); post += tag(X(41), Y(120.3) - 22, n ? "+20%: take it" : "+20%: take most of it", C.up, fade(T, 9.6, 0.3), "middle"); }
        var ex = fade(T, 10.4, 0.4);
        if (ex > 0) { s += bracket(X(0), X(15), Y(127), C.gold, ex, true); post += tag(X(7.5), Y(127) - 14, n ? "+20% in 3 wks? hold 8" : "+20% within 3 weeks? hold 8 weeks", C.gold, ex, "middle"); }
        s += post;
        s += note2(g, ["Plan first", "Exit rules set", "before the move."], C.ink, win(T, 0.3, 2.8));
        s += note2(g, ["7–8% loss rule", "No exceptions:", "small losses only."], C.dn, win(T, 3, 6.6));
        s += note2(g, ["20–25% gains", "Take most of it:", "about 3 to 1."], C.up, win(T, 6.8, 10.2));
        s += note2(g, ["8-week rule", "+20% in 3 weeks:", "hold at least 8 weeks."], C.gold, fade(T, 10.4, 0.4));
        return s + stamp(L, "Illustrative · made-up prices");
      }
    };
  }

  /* 4 · the M */
  function marketSpec() {
    var N = 90, CL = [], r = rng(31);
    var path = [[0, 100], [20, 112], [26, 113], [34, 110], [44, 96], [52, 92], [56, 93], [60, 95.4], [70, 101], [89, 112]];
    for (var i = 0; i < N; i++) CL.push(track(path, i) + (r() - 0.5) * 1.6);
    CL[60] = 96.6;
    var B = mkBars(CL, 99.6, 3, 0.8);
    B[60] = { o: 94.6, h: 96.9, l: 94.4, c: 96.6 };
    var DD = [21, 24, 27, 29, 32];
    var ST = [
      { at: 0, title: "Distribution days", text: "A made-up index rises, then starts having down days on higher volume than the day before. O'Neil called them distribution days: big holders selling. Several in a few weeks is a warning." },
      { at: 3.6, title: "The correction", text: "The index rolls over. In a correction, CAN SLIM says stop buying breakouts: most of them fail when the market is falling, because three out of four stocks follow it." },
      { at: 7, title: "The follow-through day", text: "After the low, wait for a rally attempt to hold, then a big up day on higher volume, usually from the fourth day of the attempt on. That follow-through day signals a new confirmed uptrend." },
      { at: 10.4, title: "Back to buying", text: "Now breakouts from sound bases are worth buying again, starting small. Not every follow-through works, but no new bull market has started without one, by O'Neil's account." }
    ];
    return {
      stages: ST, end: 14, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var lo = 86, hi = 118, X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var cnt = track([[0, 18], [3.4, 34], [3.8, 34], [6.8, 56], [7.2, 56], [9.8, 62], [10.2, 62], [13.4, N]], T), bw = (g.x1 - g.x0) / N * 0.62;
        s += K.grid(g);
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up index · daily" : "A made-up market index · daily bars", C.faint, 12, "start", 600);
        var cor = fade(T, 3.8, 0.4);
        if (cor > 0) { s += rect(X(34), g.y0, X(Math.min(cnt, 60)) - X(34), g.y1 - g.y0, C.dn, 0, 0.1 * cor); post += tag(X(46), g.y0 + 18, n ? "correction: no buying" : "correction: stop buying breakouts", C.dn, cor, "middle"); }
        var up = fade(T, 10.4, 0.4);
        if (up > 0) { s += rect(X(60), g.y0, X(N - 1) - X(60), g.y1 - g.y0, C.up, 0, 0.1 * up); post += tag(X(76), g.y0 + 18, "confirmed uptrend", C.up, up, "middle"); }
        s += drawBars(B, X, Y, cnt, bw);
        DD.forEach(function (d, k) { var op = fade(T, 0.6 + k * 0.5, 0.3); if (d < cnt && op > 0) { s += dot(X(d), Y(B[d].h) - 12, 5, C.orange, op); } });
        var dl = fade(T, 2.6, 0.4) * (1 - fade(T, 7, 0.4));
        if (dl > 0) post += tag(X(26), Y(117), n ? "5 distribution days" : "5 distribution days in a few weeks", C.orange, dl, "middle");
        var ft = fade(T, 7.4, 0.4);
        if (ft > 0 && cnt > 60) { s += arrow(X(60), Y(91), X(60), Y(94.2), C.up, ft); post += tag(X(60), Y(89.6), n ? "follow-through" : "follow-through day", C.up, ft, "middle"); }
        s += post;
        s += note2(g, ["Distribution", "Down on higher volume:", "big holders selling."], C.orange, win(T, 0.3, 3.6));
        s += note2(g, ["Correction", "Most breakouts fail.", "Stand aside."], C.dn, win(T, 3.8, 7));
        s += note2(g, ["Follow-through", "Day 4+ of a rally, a big", "gain on higher volume."], C.up, win(T, 7.2, 10.4));
        s += note2(g, ["Uptrend", "Buy breakouts again,", "starting small."], C.up, fade(T, 10.6, 0.4));
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
  }

  K.run({
    specs: { letters: lettersSpec, base: baseSpec, sell: sellSpec, market: marketSpec },
    steps: [
      { k: "Market", c: C.gold, tag: "M first: a confirmed uptrend" },
      { k: "Screen", c: C.blue, tag: "C, A, N, S, L, I" },
      { k: "Base", c: C.cyan, tag: "A sound base and a pivot" },
      { k: "Buy", c: C.up, tag: "On volume, within 5% of the pivot" },
      { k: "Sell", c: C.dn, tag: "−7–8% always; most gains at 20–25%" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W, mid = d.mid;
      if (k === 0) {
        s += d.pl([[40, mid + 40], [140, mid + 60], [200, mid + 90], [260, mid + 70], [300, mid + 40], [400, mid - 10], [520, mid - 60]], C2.dim, 2.4);
        s += d.dt(300, mid + 40, C2.up) + d.t(316, mid + 72, "follow-through", C2.up, 12.5, "start", 700);
        s += d.t(30, bot + 32, "Three out of four stocks follow the market.", C2.dim, 12.5, "start", 500);
      } else if (k === 1) {
        "CANSLI".split("").forEach(function (ch, j) { var x = 50 + j * 80; s += d.r(x, mid - 40, 60, 60, C2.blue, 0.85, 10) + d.t(x + 30, mid - 2, ch, "#000", 24, "middle", 900); });
        s += d.t(30, bot + 32, "Earnings, leadership, demand, sponsors.", C2.dim, 12.5, "start", 500);
      } else if (k === 2 || k === 3) {
        var p = [[40, top + 40], [120, mid + 50], [200, mid + 70], [300, top + 50], [340, top + 70], [380, top + 56]];
        if (k === 3) p.push([440, top + 10]);
        s += d.pl(p, C2.cyan, 2.6);
        s += d.ln(280, top + 46, W - 30, top + 46, C2.ink, 1.6, "6 4") + d.t(W - 30, top + 38, "pivot", C2.ink, 12, "end", 700);
        if (k === 3) s += d.r(380, top + 46 - 24, W - 410, 24, C2.up, 0.25, 2) + d.t(W - 30, top + 86, "buy zone ≤ +5%", C2.up, 12.5, "end", 700);
        s += d.t(30, bot + 32, k === 2 ? "Cup with handle, at least 7 weeks." : "Volume 40–50%+ above normal.", C2.dim, 12.5, "start", 500);
      } else {
        s += d.r(60, mid - 20, 180, 60, C2.dn, 0.25, 8) + d.t(150, mid + 16, "−7 to −8%: out", C2.dn, 15, "middle", 800);
        s += d.r(310, mid - 20, 200, 60, C2.up, 0.25, 8) + d.t(410, mid + 16, "+20–25%: take it", C2.up, 15, "middle", 800);
        s += d.t(30, bot + 32, "Small losses, bigger gains.", C2.dim, 12.5, "start", 500);
      }
      return s;
    }
  });
})();
