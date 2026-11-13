/* =====================================================================
   mm-anim.js — the animated walkthrough on setups/market-memory.html.
   Needs /js/anim-kit.js first.

   Day one (compressed on the left): a news move tops at 106.00, buyers
   defend 103.00 twice, and the two sides fight at 104.50. Day two
   (5-minute bars): price runs straight into 106.00, prints a John Wick
   candle (wick 106.60, close 105.30), short the break of its low 105.20,
   stop 106.65 above the wick (risk 1.45). Price loses 104.50 and holds
   under it (stop to breakeven), then auctions down to 103.00:
   +2.20 = about 1.5R. Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("mm", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt;
  /* yesterday, compressed */
  var Y = [[104.00, 105.20, 103.80, 105.00], [105.00, 106.00, 104.90, 105.70], [105.70, 105.95, 105.10, 105.25], [105.25, 105.40, 104.40, 104.55],
    [104.55, 104.70, 103.60, 103.75], [103.75, 103.90, 103.00, 103.30], [103.30, 104.10, 103.20, 104.00], [104.00, 104.55, 103.85, 104.45],
    [104.45, 104.50, 103.70, 103.85], [103.85, 103.95, 103.05, 103.20], [103.20, 104.20, 103.15, 104.10], [104.10, 104.50, 103.95, 104.35],
    [104.35, 104.45, 104.05, 104.20], [104.20, 104.40, 104.00, 104.30]];
  /* today, 5-minute bars */
  var B = [[104.40, 104.85, 104.30, 104.80], [104.80, 105.35, 104.70, 105.30], [105.30, 105.80, 105.20, 105.75], [105.75, 106.05, 105.55, 105.95],
    [105.95, 106.60, 105.20, 105.30], [105.30, 105.40, 104.90, 105.00], [105.00, 105.10, 104.55, 104.65], [104.65, 104.80, 104.30, 104.40],
    [104.40, 104.55, 104.20, 104.30], [104.30, 104.35, 103.80, 103.90], [103.90, 104.10, 103.75, 104.00], [104.00, 104.05, 103.50, 103.60],
    [103.60, 103.70, 103.20, 103.30], [103.30, 103.40, 102.95, 103.05], [103.05, 103.45, 103.00, 103.35], [103.35, 103.55, 103.25, 103.50]];
  var NY = Y.length, N = B.length, HI = 106.00, MID = 104.50, LO = 103.00;
  var JW = 4, ENTRY = 105.20, STOP = 106.65, HOLD = 8, COVER = 13;
  var TIMES = ["9:30", "9:35", "9:40", "9:45", "9:50", "9:55", "10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30", "10:35", "10:40", "10:45"];

  var GY = K.geo({ yt: 56, yb: 440, pmin: 102.4, pmax: 107.0, x0: 96, dx: 17 });
  var G = K.geo({ yt: 56, yb: 440, pmin: 102.4, pmax: 107.0, x0: 380, dx: 36 });
  var TY = K.timeline(NY, [[0, NY - 1, 0.4, 0.26]]);
  var TB = K.timeline(N, [[0, 3, 8.6, 0.55], [4, 4, 12.0, 1.6], [5, 5, 15.4, 0.9], [6, 13, 18.6, 0.55], [14, 15, 23.6, 0.35]]);
  var END = TB[N - 1][1] + 1.2;
  var S2 = 4.6, S3 = 8.4, S4 = 11.8, S5 = 15.0, S6 = 18.4;
  var ST = [
    { at: 0, title: "Yesterday left a map", text: "A stock moved on news yesterday. Sellers stopped it at 106.00, buyers defended 103.00 twice, and the two sides fought over 104.50." },
    { at: S2, title: "Draw the box", text: "Three lines, each one a decision you can name: the top of the box is the largest seller, the bottom is the largest buyer, 104.50 is the inflection." },
    { at: S3, title: "Don't buy the run into the top", text: "Today opens at 104.40 and runs straight into yesterday's 106.00 seller. Buying here, before any hold above it, is mistake one." },
    { at: S4, title: "The John Wick candle", text: "A wick through 106.00 to 106.60, then a close at 105.30, back under the level. The close settles it: the level was rejected live." },
    { at: S5, title: "Short the break of its low", text: "Sell 105.20 as the next bar breaks the candle's low. The stop goes above the wick at 106.65: 1.45 of risk, sized off the wick, not the level." },
    { at: S6, title: "Ride it to the other side", text: "Price loses 104.50 and holds under it, so the stop moves to breakeven. The target is yesterday's buyer at 103.00: +2.20, about 1.5R." }
  ];

  function frame(T) {
    var s = "", i;
    s += txt(96, 30, "Illustrative · yesterday compressed, today on 5-minute bars", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    s += K.grid(GY, 103, 107, 1, 70, 990, 60);
    s += '<line x1="345" x2="345" y1="50" y2="470" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3 5"/>';
    s += txt(GY.x(6.5), 496, "Yesterday", C.faint, 11, "middle", 600);
    for (i = 0; i < N; i += 3) s += txt(G.x(i), 496, TIMES[i], C.faint, 11, "middle");

    /* the three remembered lines */
    var aL = fade(T, S2, 0.6);
    if (aL > 0) {
      var xL = 70 + (990 - 70) * aL;
      [[HI, C.ink, "6 5"], [MID, C.grey, "3 5"], [LO, C.cyan, "6 5"]].forEach(function (l) {
        s += '<line x1="70" x2="' + xL.toFixed(1) + '" y1="' + G.y(l[0]).toFixed(1) + '" y2="' + G.y(l[0]).toFixed(1) + '" stroke="' + l[1] + '" stroke-width="1.6" stroke-dasharray="' + l[2] + '"/>';
      });
      var aT = fade(T, S2 + 0.6, 0.4);
      s += K.tag(G, 1000, HI, "Yday high 106.00", C.ink, aT, "#000") + K.tag(G, 1000, MID, "Battle line 104.50", C.grey, aT, "#fff") + K.tag(G, 1000, LO, "Yday low 103.00", C.cyan, aT, "#000");
      var aN = fade(T, S2 + 1.0, 0.4) * (1 - fade(T, S3, 0.4));
      s += txt(G.x(0) - 4, G.y(HI) - 8, "top of the box: largest seller", C.ink, 12, "start", 600, aN);
      s += txt(G.x(0) - 4, G.y(MID) - 8, "inflection, not as important", C.dim, 12, "start", 600, aN);
      s += txt(G.x(0) - 4, G.y(LO) + 18, "bottom of the box: largest buyer", C.cyan, 12, "start", 600, aN);
    }

    /* yesterday's bars and the fights that made the lines */
    for (i = 0; i < NY; i++) s += K.candle(GY, i, Y[i], K.progress(T, TY, i), 9, T >= S2 ? 0.75 : 1);
    var aY = fade(T, TY[NY - 1][1], 0.4) * (1 - fade(T, S3, 0.4));
    s += K.dot(GY.x(1), GY.y(HI), 7, C.dn, aY) + txt(GY.x(1), GY.y(HI) - 14, "sellers", C.dn, 12, "middle", 700, aY);
    s += K.dot(GY.x(5), GY.y(LO), 7, C.up, aY) + K.dot(GY.x(9), GY.y(103.05), 7, C.up, aY) + txt(GY.x(7), GY.y(LO) + 26, "buyers, twice", C.up, 12, "middle", 700, aY);
    s += K.dot(GY.x(7), GY.y(104.55), 6, C.gold, aY) + K.dot(GY.x(11), GY.y(MID), 6, C.gold, aY) + txt(GY.x(9), GY.y(104.55) - 14, "fight", C.gold, 12, "middle", 700, aY);

    /* today's bars */
    for (i = 0; i < N; i++) s += K.candle(G, i, B[i], K.progress(T, TB, i), 22, i > COVER ? 0.35 : 1);

    /* mistake one: the run into the top */
    var a3 = fade(T, TB[3][1], 0.3) * (1 - fade(T, S4, 0.4));
    s += K.callout(G.x(0) - 12, 66, ["Ran fast into 106.00, no hold above", "Buying here is mistake one"], C.dn, a3);

    /* the John Wick candle */
    var a4 = fade(T, TB[JW][1], 0.3);
    s += K.dot(G.x(JW), G.y(B[JW][1]), 7, C.gold, a4 * (1 - fade(T, S6, 0.4)));
    s += K.callout(G.x(JW) + 24, 66, ["John Wick: wick to 106.60", "closes 105.30, back under 106.00"], C.gold, a4 * (1 - fade(T, S5, 0.4)));

    /* the short */
    var a5 = fade(T, TB[JW + 1][0] + 0.3, 0.3);
    if (a5 > 0) {
      var be = fade(T, TB[HOLD][1], 0.4);
      s += K.hline(G, G.x(JW) - 14, 990, ENTRY, C.blue, null, 1.4, a5) + K.tag(G, 1000, ENTRY, "Short 105.20", C.blue, a5, "#fff");
      var pStop = STOP + (ENTRY - STOP) * be;
      s += K.hline(G, G.x(JW) - 14, 990, pStop, C.dn, "5 4", 1.4, a5) + K.tag(G, 1000, STOP, "Stop 106.65", C.dn, a5 * (1 - be), "#fff");
      s += K.callout(G.x(JW + 2), G.y(105.9), ["Stop above the wick: 106.65", "Risk 1.45 a share, sized off the wick"], C.dn, a5 * (1 - fade(T, S6, 0.4)));
    }

    /* the hold under 104.50: stop to breakeven */
    var a6 = fade(T, TB[HOLD][1], 0.3);
    s += K.dot(G.x(HOLD), G.y(B[HOLD][1]), 7, C.grey, a6);
    s += K.callout(G.x(HOLD) - 22, G.y(103.9), ["Holds under 104.50", "Stop to breakeven 105.20"], C.blue, a6, true);

    /* the cover at yesterday's low */
    var a7 = fade(T, TB[COVER][1], 0.3);
    s += K.dot(G.x(COVER), G.y(LO), 8, C.up, a7);
    s += K.callout(990, G.y(LO) + 14, ["Cover at 103.00", "+2.20 a share, about 1.5R"], C.up, a7, true);
    return s;
  }
  return { stages: ST, end: END, frame: frame, focus: function (T) { return T < S3 ? 260 : G.x(Math.max(0, K.lastBar(T, TB))) + 140; } };
});
