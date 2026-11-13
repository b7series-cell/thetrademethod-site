/* =====================================================================
   d3b-anim.js — the animated walkthrough on setups/day-three-breakout.html.
   Needs /js/anim-kit.js first.

   Left: daily bars. Day one's catalyst closes 5.60, +66% from 3.38, on
   62M shares. Day two is a quiet inside day (5.30 to 5.80) on 14M.
   Right: day three on 5-minute bars. The break of the day-two high is
   the entry, 5.80, stop 5.55 under the breakout bar's 5.60 low (risk
   0.25). Thirds: 6.50 into blow-off volume (+0.70, 2.8R), 7.00 at the
   whole dollar after a VWAP dip holds (+1.20, 4.8R), and the rest on the
   first close below the 9 EMA, 6.62 (+0.82, 3.3R). The EMA and VWAP are
   computed from the scripted bars. Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("d3b", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt;
  /* daily: five quiet days, day one, day two (day three is built from the 5-minute bars) */
  var D = [[3.30, 3.42, 3.22, 3.35], [3.35, 3.45, 3.25, 3.30], [3.30, 3.38, 3.18, 3.28], [3.28, 3.44, 3.24, 3.40], [3.40, 3.48, 3.32, 3.38],
    [3.90, 6.10, 3.80, 5.60], [5.55, 5.80, 5.30, 5.62]];
  var DV = [4, 3, 3, 4, 3, 62, 14, 45];
  var D1 = 5, D2 = 6, D3 = 7, PRIOR = D[4][3], GAIN = Math.round((D[D1][3] / PRIOR - 1) * 100);   /* 66 */
  /* day three, 5-minute bars */
  var B = [[5.70, 5.78, 5.52, 5.64], [5.64, 5.98, 5.60, 5.94], [5.94, 6.15, 5.90, 6.12], [6.12, 6.30, 6.05, 6.26], [6.26, 6.58, 6.22, 6.50],
    [6.50, 6.52, 6.25, 6.30], [6.30, 6.34, 6.12, 6.18], [6.18, 6.40, 6.15, 6.36], [6.36, 6.70, 6.32, 6.66], [6.66, 7.04, 6.60, 6.96],
    [6.96, 7.12, 6.90, 7.06], [7.06, 7.10, 6.92, 6.96], [6.96, 7.02, 6.84, 6.90], [6.90, 6.92, 6.58, 6.62], [6.62, 6.70, 6.55, 6.66], [6.66, 6.74, 6.60, 6.70]];
  var V = [90, 160, 120, 110, 210, 120, 100, 110, 150, 180, 120, 90, 80, 100, 70, 60];
  var N = B.length, BRK = 1, ENTRY = 5.80, STOP = 5.55, T1 = 6.50, T1BAR = 4, DIP = 6, T2 = 7.00, T2BAR = 9, OUT = 13;
  var TIMES = ["9:30", "9:35", "9:40", "9:45", "9:50", "9:55", "10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30", "10:35", "10:40", "10:45"];
  /* 9 EMA seeded with the first close, and session VWAP */
  var EMA = [], VW = [], e = B[0][3], pv = 0, vv = 0;
  B.forEach(function (b, i) { e = b[3] * 0.2 + e * 0.8; EMA.push(e); pv += (b[1] + b[2] + b[3]) / 3 * V[i]; vv += V[i]; VW.push(pv / vv); });
  var R = ENTRY - STOP, X = B[OUT][3];
  var r1 = (T1 - ENTRY) / R, r2 = (T2 - ENTRY) / R, r3 = (X - ENTRY) / R, rAvg = (r1 + r2 + r3) / 3;   /* 2.8, 4.8, 3.3, 3.6 */

  var GD = K.geo({ yt: 56, yb: 360, pmin: 3.0, pmax: 7.4, x0: 110, dx: 52 });
  var GDV = K.geo({ yt: 388, yb: 470, pmin: 0, pmax: 70, x0: 110, dx: 52 });
  var G = K.geo({ yt: 56, yb: 360, pmin: 5.40, pmax: 7.25, x0: 612, dx: 23 });
  var GV = K.geo({ yt: 388, yb: 470, pmin: 0, pmax: 230, x0: 612, dx: 23 });
  var S2 = 5.0, S3 = 9.2, S4 = 13.6, S5 = 17.4, S6 = 21.6;
  var TD = K.timeline(7, [[0, 4, 0.4, 0.3], [5, 5, 2.2, 1.6], [6, 6, 5.4, 1.4]]);
  var TB = K.timeline(N, [[0, 0, 9.8, 0.5], [1, 1, 10.5, 1.4], [2, 4, 13.8, 0.6], [5, 9, 17.6, 0.55], [10, 13, 21.8, 0.6], [14, 15, 24.6, 0.4]]);
  var END = TB[N - 1][1] + 1.2;
  var ST = [
    { at: 0, title: "Day one: the catalyst", text: "News hits and the stock closes at 5.60, up " + GAIN + "% from 3.38, on 62M shares. A real story behind the move is what feeds the next two days." },
    { at: S2, title: "Day two: the quiet inside day", text: "Day two stays inside day one's range, 5.30 to 5.80, on 14M shares, under a quarter of day one. Shorts get comfortable while size keeps building." },
    { at: S3, title: "Day three: buy the break of 5.80", text: "Off the open, the second 5-minute bar breaks the day-two high. Buy 5.80. The stop goes a few cents under that bar's 5.60 low: 5.55, a 0.25 risk." },
    { at: S4, title: "First third into blow-off volume", text: "The move runs to 6.58 on the heaviest bar of the morning. Sell a third at 6.50: +0.70 a share, 2.8R." },
    { at: S5, title: "VWAP holds, second third at 7.00", text: "A dip into VWAP holds and a fresh push comes on volume. Sell another third at the 7.00 whole dollar: +1.20, 4.8R." },
    { at: S6, title: "Trail the rest on the 9 EMA", text: "The last third rides until the first 5-minute close below the 9 EMA: 6.62, under the EMA at 6.66. +0.82, 3.3R. All three average about 3.6R." }
  ];

  function frame(T) {
    var s = "", last = K.lastBar(T, TB), i;
    s += txt(110, 30, "Illustrative · daily bars", C.faint, 12) + txt(612, 30, "Day three · 5-minute bars", C.faint, 12, "start", null, fade(T, S3, 0.5));
    s += txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    s += K.grid(GD, 3, 7, 1, 80, 520, 70);
    s += '<line x1="545" x2="545" y1="44" y2="476" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3 5"/>';
    s += txt(GD.x(2), 496, "quiet days", C.faint, 11, "middle") + txt(GD.x(D1), 496, "Day 1", C.ink, 11, "middle", 700) + txt(GD.x(D2), 496, "Day 2", C.ink, 11, "middle", 700) + txt(GD.x(D3), 496, "Day 3", C.ink, 11, "middle", 700, fade(T, S3, 0.4));
    s += txt(80, GDV.yt - 6, "Volume", C.faint, 11);

    /* daily volume and candles */
    for (i = 0; i < 7; i++) {
      var pd = K.progress(T, TD, i);
      s += K.vol(GDV, i, DV[i], pd, i === D1 ? C.up : i === D2 ? C.gold : "rgba(255,255,255,0.22)", 24);
      s += K.candle(GD, i, D[i], pd, 24);
    }
    s += txt(GDV.x(D1), GDV.y(DV[D1]) - 6, "62M", C.up, 12, "middle", 700, fade(T, TD[D1][1], 0.3));
    s += txt(GDV.x(D2), GDV.y(DV[D2]) - 6, "14M", C.gold, 12, "middle", 700, fade(T, TD[D2][1], 0.3));

    /* day three on the daily chart, built from the 5-minute bars so far */
    if (last >= 0) {
      var done = 0, hi = B[0][0], lo = B[0][0], vsum = 0, vall = 0;
      for (i = 0; i < N; i++) { vall += V[i]; if (K.progress(T, TB, i) >= 1) { done = i; hi = Math.max(hi, B[i][1]); lo = Math.min(lo, B[i][2]); vsum += V[i]; } }
      if (K.progress(T, TB, 0) >= 1) {
        s += K.candle(GD, D3, [B[0][0], hi, lo, B[done][3]], 1, 24);
        s += K.vol(GDV, D3, DV[D3] * vsum / vall, 1, "rgba(255,255,255,0.22)", 24);
      }
    }

    /* day one callout */
    var a1 = fade(T, TD[D1][1], 0.3) * (1 - fade(T, S2, 0.4));
    s += K.callout(150, 66, ["Catalyst: news hits", "Close 5.60, +" + GAIN + "% from 3.38"], C.up, a1);

    /* day two: inside day one's range */
    var a2 = fade(T, TD[D2][1], 0.3);
    if (a2 > 0) {
      s += '<rect x="' + (GD.x(D1) - 20) + '" y="' + GD.y(D[D1][1]).toFixed(1) + '" width="' + (GD.x(D2) - GD.x(D1) + 40) + '" height="' + (GD.y(D[D1][2]) - GD.y(D[D1][1])).toFixed(1) + '" fill="none" stroke="rgba(255,255,255,0.28)" stroke-dasharray="4 4" opacity="' + a2.toFixed(3) + '"/>';
      s += K.hline(GD, GD.x(D1) - 20, 532, ENTRY, C.blue, "5 4", 1.4, a2) + txt(GD.x(D1) - 26, GD.y(ENTRY) + 4, "Day-two high 5.80", C.blue, 12, "end", 700, a2);
      s += K.callout(GD.x(D2) + 6, 66, ["Inside day, 14M shares", "Shorts get comfortable"], C.gold, a2 * (1 - fade(T, S3, 0.4)), true);
    }

    /* the intraday panel */
    var aP = fade(T, S3, 0.5);
    if (aP > 0) {
      s += '<g opacity="' + aP.toFixed(3) + '">' + K.grid(G, 5.5, 7.0, 0.5, 600, 990, 596);
      for (i = 0; i < N; i += 3) s += txt(G.x(i), 496, TIMES[i], C.faint, 11, "middle");
      s += K.hline(G, 600, 990, ENTRY, C.blue, "5 4", 1.2, 0.5) + "</g>";
    }
    /* VWAP */
    if (last >= 0) {
      s += K.line(G, VW, 0, last, C.cyan, 1.6, 0.85, "6 4");
      if (T >= S5 && T < S6) s += txt(G.x(last) + 10, G.y(VW[last]) + 4, "VWAP", C.cyan, 11, "start", 700);
    }
    /* 9 EMA, for the trail */
    var aE = fade(T, S6, 0.5);
    if (aE > 0 && last >= 0) s += K.line(G, EMA, 0, last, C.gold, 2, aE) + txt(G.x(last) + 10, G.y(EMA[last]) + 4, "9 EMA", C.gold, 12, "start", 700, aE);

    /* intraday volume and candles */
    for (i = 0; i < N; i++) {
      var pr = K.progress(T, TB, i), vc = i === BRK ? C.up : i === T1BAR ? C.gold : "rgba(255,255,255,0.22)";
      s += K.vol(GV, i, V[i], pr, vc, 14, i > OUT ? 0.4 : 1);
      s += K.candle(G, i, B[i], pr, 14, i > OUT ? 0.35 : 1);
    }

    /* the entry and stop */
    var aB = fade(T, TB[BRK][0] + 0.5, 0.3);
    if (aB > 0) {
      s += K.dot(G.x(BRK), G.y(ENTRY), 7, C.blue, aB * (1 - fade(T, S4, 0.4)));
      s += K.hline(G, G.x(BRK) - 10, 990, ENTRY, C.blue, null, 1.4, aB) + K.tag(G, 1000, ENTRY, "Buy 5.80", C.blue, aB, "#fff");
      s += K.hline(G, G.x(BRK) - 10, 990, STOP, C.dn, "5 4", 1.4, aB) + K.tag(G, 1000, STOP, "Stop 5.55", C.dn, aB, "#fff");
      s += K.callout(G.x(BRK) + 30, G.y(6.62), ["Breaks the day-two high: buy 5.80", "Stop 5.55, under the bar's 5.60 low", "Risk 0.25 a share"], C.blue, fade(T, TB[BRK][1], 0.3) * (1 - fade(T, S4, 0.4)));
    }

    /* first third */
    var aT1 = fade(T, TB[T1BAR][1], 0.3);
    s += K.dot(G.x(T1BAR), G.y(T1), 7, C.up, aT1);
    s += K.callout(G.x(T1BAR) - 10, G.y(6.13), ["Blow-off volume: a third at 6.50", "+0.70 a share, " + r1.toFixed(1) + "R"], C.up, aT1 * (1 - fade(T, S5, 0.4)));

    /* the VWAP dip, then the second third */
    var aD = fade(T, TB[DIP][1], 0.3);
    s += K.dot(G.x(DIP), G.y(B[DIP][2]), 6, C.cyan, aD * (1 - fade(T, S6, 0.4)));
    s += K.callout(G.x(DIP) - 30, G.y(5.98), ["Dips into VWAP and holds"], C.cyan, aD * (1 - fade(T, S6, 0.4)));
    var aT2 = fade(T, TB[T2BAR][1], 0.3);
    s += K.dot(G.x(T2BAR), G.y(T2), 7, C.up, aT2);
    s += K.callout(G.x(T2BAR) + 20, G.y(6.86), ["A third at 7.00, the whole dollar", "+1.20 a share, " + r2.toFixed(1) + "R"], C.up, aT2 * (1 - fade(T, S6, 0.4)));

    /* the trailed exit */
    var aX = fade(T, TB[OUT][1], 0.3);
    s += K.dot(G.x(OUT), G.y(X), 8, C.dn, aX);
    s += K.callout(990, G.y(6.10), ["Close 6.62 &lt; 9 EMA " + EMA[OUT].toFixed(2), "Last third out: +0.82, " + r3.toFixed(1) + "R"], C.gold, aX, true);

    /* running tally of the thirds */
    var rows = ["Out in thirds"];
    if (aT1 > 0) rows.push("6.50 · +0.70 · " + r1.toFixed(1) + "R");
    if (aT2 > 0) rows.push("7.00 · +1.20 · " + r2.toFixed(1) + "R");
    if (aX > 0) rows.push("6.62 · +0.82 · " + r3.toFixed(1) + "R", "Average about " + rAvg.toFixed(1) + "R");
    s += K.callout(602, 62, rows, C.up, aT1 > 0 ? 1 : 0);
    return s;
  }
  return { stages: ST, end: END, frame: frame, focus: function (T) { return T < S3 ? 330 : G.x(Math.max(0, K.lastBar(T, TB))) + 150; } };
});
