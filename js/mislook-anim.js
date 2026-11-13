/* =====================================================================
   mislook-anim.js — the second animation on mistakes.html: look left,
   then plan the trade that works. Needs /js/anim-kit.js first.

   Today's 5-minute chart shows a day low of 50.60; price closes through it
   at 50.52 and the obvious short is 50.55 with a stop at 50.85. Zooming out
   to the last three sessions shows 50.00 held as the low two days ago and
   yesterday (50.02). Price drops to 50.04 and holds. The planned long:
   buy 50.20, stop 49.95 (0.25 = 1R), half off at 50.70 (+2R), the rest
   trailed 2 cents under each higher low, out at 51.20 (+4R): about +3R.
   With no plan, everything is covered at 50.35 (+0.6R). The short's 50.85
   stop is hit on the way up. Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("mislook", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt, clamp01 = K.clamp01;
  /* two prior sessions (shown only after the zoom) */
  var D2 = [[51.40, 51.55, 51.25, 51.30], [51.30, 51.38, 51.05, 51.10], [51.10, 51.20, 50.85, 50.90], [50.90, 51.00, 50.62, 50.70],
    [50.70, 50.80, 50.45, 50.50], [50.50, 50.58, 50.20, 50.25], [50.25, 50.32, 50.00, 50.10], [50.10, 50.45, 50.05, 50.40],
    [50.40, 50.70, 50.35, 50.65], [50.65, 50.92, 50.58, 50.85], [50.85, 51.00, 50.75, 50.90]];
  var D1 = [[50.95, 51.20, 50.90, 51.15], [51.15, 51.50, 51.10, 51.40], [51.40, 51.45, 51.05, 51.10], [51.10, 51.15, 50.70, 50.75],
    [50.75, 50.85, 50.40, 50.45], [50.45, 50.50, 50.15, 50.20], [50.20, 50.28, 50.02, 50.12], [50.12, 50.48, 50.08, 50.42],
    [50.42, 50.80, 50.38, 50.75], [50.75, 51.05, 50.70, 51.00], [51.00, 51.20, 50.92, 51.15]];
  /* today */
  var B = [[51.20, 51.35, 50.95, 51.05], [51.05, 51.10, 50.75, 50.80], [50.80, 50.88, 50.60, 50.72], [50.72, 51.00, 50.68, 50.95],
    [50.95, 51.10, 50.88, 51.02], [51.02, 51.08, 50.82, 50.86], [50.86, 50.92, 50.66, 50.70], [50.70, 50.76, 50.50, 50.52],
    [50.52, 50.56, 50.30, 50.34], [50.34, 50.38, 50.12, 50.15], [50.15, 50.24, 50.04, 50.20], [50.20, 50.42, 50.18, 50.38],
    [50.38, 50.62, 50.32, 50.58], [50.58, 50.80, 50.52, 50.74], [50.74, 50.98, 50.66, 50.92], [50.92, 51.30, 50.88, 51.25],
    [51.25, 51.45, 51.22, 51.38], [51.38, 51.42, 51.12, 51.18]];
  var N = B.length, P2 = -24, P1 = -12;          /* slot of the first bar of each prior session */
  var DLOW = 50.60, LOWBAR = 2, BRK = 7, SHORT = 50.55, SSTOP = 50.85, SUP = 50.00, HOLD = 10;
  var ENTRY = 50.20, STOP = 49.95, R = +(ENTRY - STOP).toFixed(2), T1 = 50.70, T1BAR = 13, NOPLAN = 50.35, NPBAR = 11, SHIT = 14, OUT = 17;
  /* trail: 2 cents under the prior bar's low; first bar whose low trades through it is the exit */
  var TRAIL = +(B[OUT - 1][2] - 0.02).toFixed(2);
  function rr(p) { return (p - ENTRY) / R; }
  var TIMES = ["9:30", "", "9:40", "", "9:50", "", "10:00", "", "10:10", "", "10:20", "", "10:30", "", "10:40", "", "10:50", ""];

  var Z0 = 6.4, ZD = 2.0;                          /* the zoom-out */
  var TB = K.timeline(N, [[0, 7, 0.5, 0.55], [8, 10, 11.8, 0.8], [11, 11, 19.8, 1.0], [12, 17, 23.2, 0.62]]);
  var S2 = 6.2, S3 = 11.6, S4 = 15.0, S5 = 19.6, S6 = 23.0, END = TB[17][1] + 1.6;
  var ST = [
    { at: 0, title: "This looks like the low", text: "On today's 5-minute chart, 50.60 is the low of the day. A candle closes through it at 50.52, and the obvious trade is a short at 50.55 with a stop at 50.85." },
    { at: S2, title: "Look left first", text: "Zoom out to the last three sessions. 50.00 was the low two days ago and again yesterday at 50.02. It sits only 0.55 under the short, less than 2R of room." },
    { at: S3, title: "Real support holds", text: "Price drops to 50.04 and stalls on the level that matters, then closes back at 50.20. The short is pressing into real support, not through it." },
    { at: S4, title: "Plan it before you buy", text: "The trade is the long off 50.00. Decide first: buy 50.20, stop 49.95 (0.25 = 1R), half off at 50.70 for +2R, trail the rest 2 cents under each higher low." },
    { at: S5, title: "No plan: out too soon", text: "It works, and the trader with no plan covers everything at 50.35 a few minutes later: +0.15, about +0.6R. Right about the level, barely paid." },
    { at: S6, title: "The plan gets paid", text: "Half comes off at 50.70 for +2R, and the short's 50.85 stop is hit on the way. The rest trails out at 51.20 for +4R. Same entry, about +3R instead of +0.6R." }
  ];

  function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function geoAt(z) { return K.geo({ yt: 64, yb: 430, pmin: lerp(50.30, 49.70, z), pmax: lerp(51.70, 51.80, z), x0: lerp(130, 594, z), dx: lerp(48, 21, z) }); }
  function bars(G, arr, start, wB, op) { var s = ""; arr.forEach(function (b, k) { s += K.candle(G, start + k, b, 1, wB, op); }); return s; }
  function sg(v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(/\.0$/, ""); }

  function frame(T) {
    var s = "", i, z = ease(clamp01((T - Z0) / ZD)), G = geoAt(z), wB = lerp(24, 12, z), last = K.lastBar(T, TB);
    s += '<defs><clipPath id="mislook-clip"><rect x="0" y="50" width="992" height="396"/></clipPath></defs>';
    s += txt(76, 30, z < 0.5 ? "Illustrative · 5-minute bars, today" : "Illustrative · 5-minute bars, last three sessions", C.faint, 12) + txt(W - 40, 510, "Illustrative", C.faint, 11, "end");
    var c = '<g clip-path="url(#mislook-clip)">';
    c += K.grid(G, 49.5, 51.5, 0.5, 70, 990, 62);
    /* session dividers and the prior sessions */
    if (z > 0) {
      [-13, -1].forEach(function (k) { var xx = G.x(k).toFixed(1); c += '<line x1="' + xx + '" x2="' + xx + '" y1="56" y2="440" stroke="#48484a" stroke-dasharray="3 5" opacity="' + z.toFixed(3) + '"/>'; });
      c += bars(G, D2, P2, wB, z.toFixed(3)) + bars(G, D1, P1, wB, z.toFixed(3));
    }
    /* the real level */
    var aS = fade(T, Z0 + ZD + 0.1, 0.5);
    c += K.hline(G, 70, 990, SUP, C.gold, "6 4", 1.8, aS);
    c += K.dot(G.x(P2 + 6), G.y(D2[6][2]) + 1, 7, C.gold, aS) + K.dot(G.x(P1 + 6), G.y(D1[6][2]) + 1, 7, C.gold, aS);
    c += txt(G.x(P2 + 6), G.y(SUP) + 24, "low 50.00", C.gold, 12, "middle", 700, aS) + txt(G.x(P1 + 6), G.y(SUP) + 24, "low 50.02", C.gold, 12, "middle", 700, aS);
    /* today's low */
    var aL = fade(T, TB[LOWBAR][1] + 0.2, 0.4);
    c += K.hline(G, G.x(LOWBAR) - 12, 990, DLOW, C.blue, "4 4", 1.4, aL * (1 - 0.5 * fade(T, S4, 0.4)));
    /* plan lines */
    var aP = [fade(T, S4 + 0.3, 0.4), fade(T, S4 + 0.9, 0.4), fade(T, S4 + 1.5, 0.4)];
    c += K.hline(G, G.x(HOLD) - 10, 990, ENTRY, C.blue, null, 1.4, aP[0]);
    c += K.hline(G, G.x(HOLD) - 10, 990, STOP, C.dn, "5 4", 1.4, aP[1]);
    c += K.hline(G, G.x(HOLD) - 10, 990, T1, C.up, "5 4", 1.4, aP[2]);
    /* trail steps under each higher low, from bar 13 on */
    var aTr = fade(T, TB[T1BAR][1], 0.3);
    if (aTr > 0 && last > T1BAR) {
      var pts = [];
      for (i = T1BAR + 1; i <= Math.min(last, OUT); i++) { var st = B[i - 1][2] - 0.02; pts.push((G.x(i) - 10).toFixed(1) + "," + G.y(st).toFixed(1), (G.x(i) + 10).toFixed(1) + "," + G.y(st).toFixed(1)); }
      if (pts.length > 1) c += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.gold + '" stroke-width="2" opacity="' + aTr.toFixed(3) + '"/>';
    }
    /* today's candles */
    for (i = 0; i < N; i++) c += K.candle(G, i, B[i], K.progress(T, TB, i), wB);
    c += "</g>";
    s += c;

    /* time / session labels */
    var aT = 1 - fade(T, Z0, 0.5);
    for (i = 0; i < N; i++) if (TIMES[i] && G.x(i) < 990) s += txt(G.x(i), 460, TIMES[i], C.faint, 11, "middle", null, aT);
    s += txt(G.x(P2 + 5), 460, "2 days ago", C.faint, 12, "middle", null, z) + txt(G.x(P1 + 5), 460, "Yesterday", C.faint, 12, "middle", null, z) + txt(G.x(8), 460, "Today", C.faint, 12, "middle", null, z);

    /* tags on the right */
    s += K.tag(G, 1000, DLOW, "Day low 50.60", C.blue, aL * (1 - fade(T, S4, 0.4)), "#fff");
    s += K.tag(G, 1000, SUP, "Support 50.00", C.gold, aS * (1 - fade(T, S4, 0.4)), "#000");
    s += K.tag(G, 1000, ENTRY, "Buy " + ENTRY.toFixed(2), C.blue, aP[0], "#fff");
    s += K.tag(G, 1000, STOP - 0.04, "Stop " + STOP.toFixed(2), C.dn, aP[1], "#fff");
    s += K.tag(G, 1000, T1, "Target " + T1.toFixed(2), C.up, aP[2], "#000");

    /* stage 1: the break of the day low (before the zoom) */
    var aB = fade(T, TB[BRK][1], 0.3), aB1 = aB * (1 - fade(T, Z0, 0.4));
    s += K.arrow(G.x(BRK), G.y(B[BRK][1]) - 8, false, C.dn, aB1);
    s += K.callout(G.x(BRK) + 40, G.y(50.98), ["Closes 50.52, under the day low", "Short 50.55, stop 50.85"], C.dn, aB1);

    /* stage 2: look left */
    var aLL = fade(T, Z0 + ZD + 0.4, 0.4) * (1 - fade(T, S3 + 2.2, 0.4));
    s += K.callout(612, 72, ["50.00 held two sessions running", "Only 0.55 under the short"], C.gold, aLL);
    if (aLL > 0) s += '<g opacity="' + aLL.toFixed(3) + '"><line x1="' + (G.x(BRK) + 14).toFixed(1) + '" x2="' + (G.x(BRK) + 14).toFixed(1) + '" y1="' + G.y(SHORT).toFixed(1) + '" y2="' + (G.y(SUP) - 4).toFixed(1) + '" stroke="' + C.gold + '" stroke-width="1.6"/>' +
      K.arrow(G.x(BRK) + 14, G.y(SUP) - 2, false, C.gold, 1) + txt(G.x(BRK) + 22, G.y(50.30), "0.55", C.gold, 12, "start", 700) + "</g>";

    /* stage 3: the hold at 50.00 */
    var aH = fade(T, TB[HOLD][1], 0.3);
    s += K.dot(G.x(HOLD), G.y(B[HOLD][2]) + 1, 8, C.up, aH);
    s += K.callout(836, G.y(SUP) - 82, ["Low 50.04, closes 50.20", "50.00 holds"], C.up, aH * (1 - fade(T, S4, 0.3)));

    /* stage 4: the plan card */
    var aC = fade(T, S4 + 0.2, 0.4) * (1 - fade(T, S5, 0.3));
    s += K.callout(660, 72, ["The plan, before the entry", "Buy 50.20, stop 49.95: 1R = 0.25", "Half off at 50.70: +2R", "Rest trails 2c under each higher low"], C.blue, aC);

    /* stage 5: no plan */
    var aN = fade(T, TB[NPBAR][1], 0.3);
    s += K.dot(G.x(NPBAR), G.y(NOPLAN), 7, C.grey, aN, true);
    s += K.callout(660, 72, ["No plan: all out at 50.35", "+0.15 = " + sg(rr(NOPLAN)) + "R, minutes after entry"], C.grey, aN * (1 - fade(T, S6 + 2.4, 0.4)));

    /* stage 6: the plan pays */
    var a1 = fade(T, TB[T1BAR][1], 0.3);
    s += K.dot(G.x(T1BAR), G.y(T1), 7, C.up, a1);
    s += txt(G.x(T1BAR) - 12, G.y(T1) - 12, "half +" + rr(T1).toFixed(0) + "R", C.up, 12, "end", 700, a1);
    var aSh = fade(T, TB[SHIT][1], 0.3);
    s += K.dot(G.x(SHIT), G.y(SSTOP), 6, C.dn, aSh);
    s += txt(G.x(SHIT) + 12, G.y(SSTOP) + 18, "short stopped 50.85", C.dn, 11, "start", 600, aSh * (1 - fade(T, TB[OUT][0], 0.3)));
    var aX = fade(T, TB[OUT][1], 0.3);
    s += K.dot(G.x(OUT), G.y(TRAIL), 7, C.gold, aX);
    s += K.callout(612, 72, ["The plan: half +2R, rest out 51.20 +" + rr(TRAIL).toFixed(0) + "R", "About +" + ((rr(T1) + rr(TRAIL)) / 2).toFixed(0) + "R on the trade, vs " + sg(rr(NOPLAN)) + "R"], C.up, aX);
    return s;
  }
  function focus(T) {
    if (T < Z0) return 130 + Math.max(0, K.lastBar(T, TB)) * 48 + 160;
    if (T < S3) return 560;
    return 900;
  }
  return { stages: ST, end: END, frame: frame, focus: focus };
});
