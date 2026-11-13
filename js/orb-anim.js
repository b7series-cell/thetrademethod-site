/* =====================================================================
   orb-anim.js — the animated walkthrough on opening-range-break.html.
   Needs /js/anim-kit.js first.

   One long, 5-minute bars: the 15-minute range forms (52.40 / 51.20),
   a first poke above it on light volume closes back inside (no trade),
   the second break comes on 2.6x volume: buy 52.45, stop 52.02 under the
   breakout bar. Half off at 1 ATR (53.50), the rest trails the 9 EMA and
   exits on the first close below it (53.55). Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("orb", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt;
  var B = [[51.60, 52.40, 51.40, 52.10], [52.10, 52.30, 51.20, 51.50], [51.50, 52.05, 51.30, 51.90],
    [51.90, 52.20, 51.70, 52.15], [52.15, 52.62, 52.05, 52.30], [52.30, 52.35, 51.80, 51.95], [51.95, 52.25, 51.85, 52.20],
    [52.20, 52.95, 52.10, 52.85], [52.85, 53.30, 52.70, 53.20], [53.20, 53.60, 53.05, 53.45], [53.45, 53.95, 53.30, 53.85],
    [53.85, 54.40, 53.70, 54.30], [54.30, 54.70, 54.05, 54.55], [54.55, 54.85, 54.20, 54.35], [54.35, 54.50, 53.95, 54.05],
    [54.05, 54.20, 53.50, 53.55], [53.55, 53.75, 53.30, 53.40], [53.40, 53.60, 53.20, 53.50]];
  var V = [260, 180, 140, 90, 68, 80, 85, 250, 170, 150, 140, 130, 120, 100, 95, 110, 80, 70], AVG = 96;
  var N = B.length, ORH = 52.40, ORL = 51.20, POKE = 4, BRK = 7, ENTRY = 52.45, STOP = 52.02, T1 = 53.50, T1BAR = 9, OUT = 15;
  var TIMES = ["9:30", "9:35", "9:40", "9:45", "9:50", "9:55", "10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30", "10:35", "10:40", "10:45", "10:50", "10:55"];
  /* 9 EMA of the closes, seeded with the first close */
  var EMA = [], e = B[0][3];
  B.forEach(function (b) { e = b[3] * 0.2 + e * 0.8; EMA.push(+e.toFixed(2)); });

  var G = K.geo({ yt: 52, yb: 352, pmin: 50.8, pmax: 55.2, x0: 96, dx: 50 });
  var GV = K.geo({ yt: 388, yb: 470, pmin: 0, pmax: 280, x0: 96, dx: 50 });
  var TB = K.timeline(N, [[0, 2, 0.5, 0.7], [3, 3, 4.4, 0.6], [4, 4, 6.2, 1.1], [5, 6, 8.6, 0.6], [7, 7, 10.6, 1.4], [8, 9, 14.6, 0.7], [10, 14, 18.6, 0.55], [15, 15, 21.6, 1.2], [16, 17, 25.0, 0.4]]);
  var END = TB[17][1] + 1;
  var ST = [
    { at: 0, title: "Let the range form", text: "The first 15 minutes print a high of 52.40 and a low of 51.20. That box is the opening range. No trade until the window has finished." },
    { at: 3.2, title: "Check the higher time frame", text: "The daily chart has a reason: the stock reclaimed a multi-month level yesterday on news. A break of today's range has something bigger behind it." },
    { at: 6.0, title: "A poke on light volume: no trade", text: "Price trades above 52.40 but on 0.7x average volume, and the candle closes back inside the range. No volume, no trade. Set an alert and wait." },
    { at: 10.4, title: "The real break, on 2.6x volume", text: "The next try clears 52.40 on 2.6x average volume. Buy 52.45 as it breaks. The stop goes a few cents under the breakout bar's low: 52.02." },
    { at: 14.4, title: "First scale at 1 ATR", text: "ATR is 1.10, so the first target is 52.40 + 1.10 = 53.50. Take half there: about +2.4R on that half." },
    { at: 18.4, title: "Trail the rest on the 9 EMA", text: "The rest rides until a candle closes below the 9 EMA. That close comes at 53.55, about +2.6R on the second half." }
  ];

  function frame(T) {
    var s = "", last = K.lastBar(T, TB), i;
    s += txt(96, 30, "Illustrative · 5-minute bars", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    s += K.grid(G, 51, 55, 1, 70, 990, 60);
    for (i = 0; i < N; i += 3) s += txt(G.x(i), 496, TIMES[i], C.faint, 11, "middle");
    s += txt(70, GV.yt - 6, "Volume", C.faint, 11);
    /* the opening-range box */
    var aR = K.clamp01((T - 0.5) / 2.1);
    if (aR > 0) {
      var xr = G.x(0) - 22, wr = (G.x(2) + 22 - xr) + (G.x(N - 1) + 22 - G.x(2) - 22) * fade(T, 3.0, 0.8);
      s += '<rect x="' + xr + '" y="' + G.y(ORH).toFixed(1) + '" width="' + wr.toFixed(1) + '" height="' + (G.y(ORL) - G.y(ORH)).toFixed(1) + '" fill="rgba(41,151,255,0.08)" stroke="rgba(41,151,255,0.35)" stroke-dasharray="4 4" opacity="' + aR.toFixed(3) + '"/>';
      s += K.tag(G, 1000, ORH, "OR high 52.40", C.blue, fade(T, 2.6, 0.4) * (1 - fade(T, TB[BRK][1], 0.3)), "#fff") + K.tag(G, 1000, ORL, "OR low 51.20", C.grey, fade(T, 2.6, 0.4), "#fff");
      s += txt(G.x(1), G.y(ORL) + 22, "first 15 minutes", C.blue, 12, "middle", 600, aR * (1 - fade(T, 10.4, 0.4)));
    }
    /* higher time frame inset */
    var aH = fade(T, 3.2, 0.5) * (1 - fade(T, 6.0, 0.4));
    if (aH > 0) {
      var bx = 560, by = 70, d = [[0, 40], [10, 44], [20, 38], [30, 46], [40, 42], [50, 50], [60, 47], [70, 56], [80, 60], [90, 72]];
      s += '<g opacity="' + aH.toFixed(3) + '"><rect x="' + bx + '" y="' + by + '" width="380" height="150" rx="12" fill="' + C.box + '" stroke="' + C.gold + '"/>';
      s += txt(bx + 14, by + 22, "Daily chart", C.gold, 13, "start", 700);
      s += '<line x1="' + (bx + 20) + '" x2="' + (bx + 360) + '" y1="' + (by + 92) + '" y2="' + (by + 92) + '" stroke="' + C.gold + '" stroke-dasharray="5 4"/>';
      s += txt(bx + 360, by + 86, "multi-month level", C.gold, 11, "end");
      s += '<polyline fill="none" stroke="' + C.ink + '" stroke-width="2" points="' + d.map(function (p) { return (bx + 30 + p[0] * 3.4) + "," + (by + 140 - p[1] * 1.3); }).join(" ") + '"/>';
      s += txt(bx + 14, by + 140, "reclaimed yesterday on news", C.dim, 12) + "</g>";
    }
    /* 9 EMA, from the break on */
    var aE = fade(T, 18.4, 0.6);
    if (aE > 0 && last > BRK) s += K.line(G, EMA, BRK - 1, Math.min(last, N - 1), C.gold, 2, aE) + txt(G.x(Math.min(last, OUT)) + 14, G.y(EMA[Math.min(last, OUT)]) + 16, "9 EMA", C.gold, 12, "start", 700, aE * (1 - fade(T, 25, 0.4)));
    /* volume */
    s += '<line x1="70" x2="990" y1="' + GV.y(AVG).toFixed(1) + '" y2="' + GV.y(AVG).toFixed(1) + '" stroke="' + C.faint + '" stroke-dasharray="3 4"/>' + txt(990, GV.y(AVG) - 5, "avg", C.faint, 11, "end");
    for (i = 0; i < N; i++) {
      var pr = K.progress(T, TB, i);
      var vc = i === BRK ? C.up : i === POKE ? C.dn : "rgba(255,255,255,0.22)";
      s += K.vol(GV, i, V[i], pr, vc, 22, i > OUT ? 0.4 : 1);
      if (pr > 0) s += K.candle(G, i, B[i], pr, 22, i > OUT ? 0.35 : 1);
    }
    /* the poke */
    var aP = fade(T, TB[POKE][1], 0.3) * (1 - fade(T, 10.4, 0.4));
    s += K.dot(G.x(POKE), G.y(B[POKE][1]), 8, C.dn, aP);
    s += K.callout(G.x(POKE) - 30, G.y(54.4), ["Above 52.40, closed back inside", "Volume 0.7x avg: NO TRADE"], C.dn, aP);
    s += txt(GV.x(POKE), GV.y(V[POKE]) - 6, "0.7x", C.dn, 12, "middle", 700, aP);
    /* the break */
    var aB = fade(T, TB[BRK][1], 0.3);
    if (aB > 0) {
      s += txt(GV.x(BRK), GV.y(V[BRK]) - 6, "2.6x", C.up, 13, "middle", 800, aB);
      s += K.hline(G, G.x(BRK), 990, ENTRY, C.blue, null, 1.4, aB) + K.tag(G, 1000, ENTRY, "Buy 52.45", C.blue, aB * (1 - fade(T, 25, 0.4)), "#fff");
      s += K.hline(G, G.x(BRK) - 24, 990, STOP, C.dn, "5 4", 1.4, aB) + K.tag(G, 1000, STOP - 0.12, "Stop 52.02", C.dn, aB * (1 - fade(T, 25, 0.4)), "#fff");
      s += K.callout(G.x(BRK) + 30, G.y(51.95), ["Stop a few cents under", "the breakout bar's low"], C.dn, aB * (1 - fade(T, 14.4, 0.4)));
    }
    /* first target */
    var a1 = fade(T, 14.4, 0.4);
    if (a1 > 0) {
      s += K.hline(G, G.x(BRK), 990, T1, C.up, "5 4", 1.4, a1) + K.tag(G, 1000, T1, "1 ATR 53.50", C.up, a1, "#000");
      var a1d = fade(T, TB[T1BAR][1], 0.3);
      s += K.dot(G.x(T1BAR), G.y(T1), 7, C.up, a1d);
      s += K.callout(G.x(T1BAR) - 20, G.y(54.6), ["Half off at 53.50", "+1.05 = about +2.4R"], C.up, a1d * (1 - fade(T, 18.4, 0.4)), true);
    }
    /* trailed exit */
    var aX = fade(T, TB[OUT][1], 0.3);
    if (aX > 0) {
      s += K.dot(G.x(OUT), G.y(B[OUT][3]), 8, C.dn, aX);
       s += K.callout(G.x(N - 1) + 20, G.y(52.95), ["Close 53.55 < 9 EMA " + EMA[OUT].toFixed(2), "Rest out: about +2.6R"], C.gold, aX, true);
    }
    return s;
  }
  return { stages: ST, end: END, frame: frame, focus: function (T) { return G.x(Math.max(0, K.lastBar(T, TB))) + 120; } };
});
