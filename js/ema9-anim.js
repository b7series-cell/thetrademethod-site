/* =====================================================================
   ema9-anim.js — the animated walkthrough on nine-ema-continuation.html.
   Needs /js/anim-kit.js first.

   5-minute bars. A breakout above 64.05 on 2.6x volume (no chase), a
   pullback to the 9 EMA, a failed first test (close 64.30 under the EMA)
   and a sold lift, then the reclaim: buy the 64.50 close, stop 64.20
   under the 64.24 pullback low (0.30 risk, 1,666 shares on $500). Half off
   on the second acceleration at 65.80, the rest out on the first close
   below the 9 EMA (65.16). The EMA is computed from the scripted closes.
   Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("ema9", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt;
  var B = [[63.70, 63.95, 63.60, 63.85], [63.85, 64.00, 63.70, 63.78], [63.78, 63.92, 63.62, 63.88], [63.88, 64.02, 63.75, 63.82],
    [63.82, 63.98, 63.72, 63.92], [63.92, 64.05, 63.80, 63.98],
    [63.98, 64.50, 63.95, 64.44], [64.44, 64.90, 64.38, 64.82], [64.82, 65.15, 64.74, 65.04],
    [65.04, 65.10, 64.72, 64.80], [64.80, 64.86, 64.44, 64.52],
    [64.52, 64.58, 64.24, 64.30], [64.30, 64.50, 64.26, 64.34], [64.34, 64.56, 64.30, 64.50],
    [64.50, 64.82, 64.45, 64.78], [64.78, 65.05, 64.70, 64.98], [64.98, 65.40, 64.95, 65.35], [65.35, 65.95, 65.30, 65.88],
    [65.88, 66.02, 65.62, 65.72], [65.72, 65.82, 65.48, 65.60], [65.60, 65.66, 65.32, 65.44], [65.44, 65.50, 65.08, 65.16],
    [65.16, 65.30, 65.00, 65.24], [65.24, 65.32, 65.02, 65.10]];
  var V = [90, 70, 65, 60, 62, 75, 260, 210, 170, 105, 90, 110, 95, 165, 125, 115, 160, 230, 140, 105, 95, 125, 80, 70], AVG = 100;
  var N = B.length, RH = 64.05, BRK = 6, FAIL = 11, LIFT = 12, REC = 13, ENTRY = 64.50, STOP = 64.20, PLOW = 64.24;
  var HALF = 65.80, HBAR = 17, OUT = 21;
  var TIMES = ["9:45", "9:50", "9:55", "10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30", "10:35", "10:40", "10:45", "10:50",
    "10:55", "11:00", "11:05", "11:10", "11:15", "11:20", "11:25", "11:30", "11:35", "11:40"];
  /* 9 EMA of the closes, seeded with the first close */
  var EMA = [], e = B[0][3];
  B.forEach(function (b) { e = b[3] * 0.2 + e * 0.8; EMA.push(e); });
  function ef(i) { return EMA[i].toFixed(2); }

  var G = K.geo({ yt: 52, yb: 352, pmin: 63.3, pmax: 66.3, x0: 96, dx: 37 });
  var GV = K.geo({ yt: 388, yb: 470, pmin: 0, pmax: 280, x0: 96, dx: 37 });
  var TB = K.timeline(N, [[0, 5, 0.3, 0.35], [6, 8, 2.6, 0.6], [9, 10, 5.4, 0.8], [11, 11, 7.9, 1.2], [12, 12, 9.4, 1.2],
    [13, 13, 11.5, 1.4], [14, 17, 15.6, 0.6], [18, 20, 20.4, 0.6], [21, 21, 22.4, 1.4], [22, 23, 26.0, 0.4]]);
  var END = TB[23][1] + 1;
  var S2 = 5.4, S3 = 7.7, S4 = 11.3, S5 = 15.4, S6 = 20.2;
  var ST = [
    { at: 0, title: "Breakout on volume: don't chase", text: "Price clears the 64.05 range high on 2.6x average volume. Buying the spike gives you no level to be wrong at, so wait for the pullback." },
    { at: S2, title: "Pull back to the 9 EMA", text: "Price drifts back to the 9 EMA on lighter volume. The touch tells you where to watch, not when to buy." },
    { at: S3, title: "Failed test: sellers hit the lift", text: "The first test closes at 64.30, under the 9 EMA at " + ef(FAIL) + ", and the next lift is sold too. No reclaim yet, so keep watching the bid." },
    { at: S4, title: "The reclaim: buy 64.50", text: "Buyers step in and the candle closes at 64.50, back above the 9 EMA at " + ef(REC) + ". Buy the close. Stop 64.20 sits under the 64.24 pullback low: 0.30 risk, 1,666 shares on $500." },
    { at: S5, title: "Half off on the second acceleration", text: "The move speeds up, then speeds up again. Sell half into that push at 65.80: +1.30 a share, about +4.3R." },
    { at: S6, title: "Trail the rest on the 9 EMA", text: "The rest rides until a candle closes below the 9 EMA. That close is 65.16 against " + ef(OUT) + ": +0.66, about +2.2R on the second half." }
  ];

  function frame(T) {
    var s = "", last = K.lastBar(T, TB), i;
    s += txt(96, 30, "Illustrative · 5-minute bars", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    s += K.grid(G, 63.5, 66, 0.5, 70, 990, 60);
    for (i = 0; i < N; i += 3) s += txt(G.x(i), 496, TIMES[i], C.faint, 11, "middle");
    s += txt(70, GV.yt - 6, "Volume", C.faint, 11);
    /* the range high the breakout clears */
    var aR = fade(T, TB[5][1], 0.4) * (1 - fade(T, S4, 0.4));
    s += K.hline(G, G.x(0) - 16, G.x(9), RH, C.grey, "4 4", 1.2, aR) + txt(G.x(0) - 14, G.y(RH) - 7, "range high 64.05", C.grey, 12, "start", 600, aR);
    /* 9 EMA, drawn up to the last revealed bar */
    var aE = fade(T, 0.6, 0.6);
    if (last >= 1) {
      var le = Math.min(last, N - 1);
      s += K.line(G, EMA, 0, le, C.gold, 2.2, aE);
      s += txt(G.x(le) + 14, G.y(EMA[le]) + 18, "9 EMA", C.gold, 12, "start", 700, aE * (1 - fade(T, S6, 0.4)));
    }
    /* volume */
    s += '<line x1="70" x2="990" y1="' + GV.y(AVG).toFixed(1) + '" y2="' + GV.y(AVG).toFixed(1) + '" stroke="' + C.faint + '" stroke-dasharray="3 4"/>' + txt(990, GV.y(AVG) - 5, "avg", C.faint, 11, "end");
    for (i = 0; i < N; i++) {
      var pr = K.progress(T, TB, i);
      var vc = i === BRK ? C.up : i === REC ? C.blue : "rgba(255,255,255,0.22)";
      s += K.vol(GV, i, V[i], pr, vc, 18, i > OUT ? 0.4 : 1);
      if (pr > 0) s += K.candle(G, i, B[i], pr, 18, i > OUT ? 0.35 : 1);
    }
    /* stage 1: the breakout, no chase */
    var aB = fade(T, TB[BRK][1], 0.3);
    s += txt(GV.x(BRK), GV.y(V[BRK]) - 6, "2.6x", C.up, 13, "middle", 800, aB);
    s += K.callout(G.x(0) - 20, G.y(66.15), ["Breakout on 2.6x volume", "Don't chase: no level to be wrong at"], C.up, fade(T, TB[7][1], 0.3) * (1 - fade(T, S2, 0.4)));
    /* stage 2: pullback to the line */
    var aP = fade(T, TB[10][1], 0.3) * (1 - fade(T, S3, 0.4));
    s += K.dot(G.x(10), G.y(B[10][2]), 7, C.gold, aP);
    s += K.callout(G.x(7), G.y(66.15), ["Pullback on lighter volume", "The touch is where you watch, not a buy"], C.gold, aP);
    /* stage 3: the failed test and the sold lift */
    var aF = fade(T, TB[FAIL][1], 0.3) * (1 - fade(T, S4, 0.4));
    s += K.dot(G.x(FAIL), G.y(B[FAIL][3]), 7, C.dn, aF);
    var aL = fade(T, TB[LIFT][1], 0.3) * (1 - fade(T, S4, 0.4));
    s += K.arrow(G.x(LIFT), G.y(B[LIFT][1]) - 6, false, C.dn, aL);
    s += K.callout(G.x(9) - 14, G.y(63.95), ["Close 64.30 < 9 EMA " + ef(FAIL), "Next lift sold too: no reclaim yet"], C.dn, aF);
    /* stage 4: the reclaim, entry and stop */
    var aC = fade(T, TB[REC][1], 0.3);
    if (aC > 0) {
      var aEnd = 1 - 0.6 * fade(T, S6, 0.4);
      s += K.dot(G.x(REC), G.y(ENTRY), 7, C.blue, aC);
      s += K.hline(G, G.x(REC), 990, ENTRY, C.blue, null, 1.4, aC * aEnd) + K.tag(G, 1000, ENTRY, "Buy 64.50", C.blue, aC, "#fff");
      s += K.hline(G, G.x(FAIL) - 14, 990, STOP, C.dn, "5 4", 1.4, aC * aEnd) + K.tag(G, 1000, STOP, "Stop 64.20", C.dn, aC, "#fff");
      s += K.callout(G.x(9) - 14, G.y(63.95), ["Close 64.50 > 9 EMA " + ef(REC) + ": buy", "Stop 64.20 · 0.30 risk · 1,666 sh"], C.blue, aC * (1 - fade(T, S5, 0.4)));
    }
    /* stage 5: half off on the second acceleration */
    var aH = fade(T, S5 + 0.2, 0.4);
    if (aH > 0) {
      s += K.hline(G, G.x(REC), 990, HALF, C.up, "5 4", 1.4, aH) + K.tag(G, 1000, HALF, "Half off 65.80", C.up, aH, "#000");
      var aH2 = fade(T, TB[HBAR][1], 0.3);
      s += K.dot(G.x(HBAR), G.y(HALF), 7, C.up, aH2);
      var aPu = 1 - fade(T, S6, 0.4);
      s += txt(G.x(16), G.y(B[16][1]) - 12, "1st push", C.dim, 11, "middle", 600, fade(T, TB[16][1], 0.3) * aPu);
      s += txt(G.x(HBAR), G.y(B[HBAR][1]) - 12, "2nd push", C.dim, 11, "middle", 600, aH2 * aPu);
      s += K.callout(G.x(16) - 16, G.y(66.15), ["Acceleration after acceleration", "Half off 65.80: +1.30, about +4.3R"], C.up, aH2, true);
    }
    /* stage 6: the trailed exit */
    var aX = fade(T, TB[OUT][1], 0.3);
    if (aX > 0) {
      s += K.dot(G.x(OUT), G.y(B[OUT][3]), 8, C.dn, aX);
      s += K.callout(G.x(N - 1) + 20, G.y(63.95), ["Close 65.16 < 9 EMA " + ef(OUT), "Rest out: +0.66, about +2.2R"], C.gold, aX, true);
    }
    return s;
  }
  return { stages: ST, end: END, frame: frame, focus: function (T) { return G.x(Math.max(0, K.lastBar(T, TB))) + 120; } };
});
