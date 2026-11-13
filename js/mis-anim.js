/* =====================================================================
   mis-anim.js — the animated walkthrough on mistakes.html.
   Needs /js/anim-kit.js first.

   The same support level, 50.00, on two days. Day A: the index chops
   sideways; price wicks to 49.88 on 0.9x volume, closes back at 50.18 and
   rotates up to 51.00. The bounce is the trade. Day B: the index trends
   lower all day; bounce buyers step in at 50.00 again, the level breaks on
   a 49.62 close on 2.4x volume and price runs to 48.70. The break is the
   trade. Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("mis", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt, clamp01 = K.clamp01;
  var L = [[50.90, 51.20, 50.70, 51.05], [51.05, 51.15, 50.60, 50.70], [50.70, 50.95, 50.45, 50.85], [50.85, 51.10, 50.75, 51.00],
    [51.00, 51.05, 50.55, 50.60], [50.60, 50.70, 50.25, 50.35], [50.35, 50.55, 50.15, 50.45], [50.45, 50.50, 50.10, 50.15],
    [50.15, 50.25, 49.88, 50.18], [50.18, 50.55, 50.12, 50.50], [50.50, 50.80, 50.40, 50.75], [50.75, 51.05, 50.65, 51.00],
    [51.00, 51.15, 50.85, 50.95], [50.95, 51.10, 50.80, 51.05]];
  var R = [[51.40, 51.50, 51.10, 51.15], [51.15, 51.25, 50.85, 50.90], [50.90, 51.00, 50.60, 50.70], [50.70, 50.85, 50.45, 50.50],
    [50.50, 50.60, 50.20, 50.25], [50.25, 50.40, 50.05, 50.15], [50.15, 50.30, 50.04, 50.20], [50.20, 50.28, 50.00, 50.05],
    [50.05, 50.10, 49.55, 49.62], [49.62, 49.70, 49.25, 49.30], [49.30, 49.45, 49.05, 49.15], [49.15, 49.25, 48.80, 48.90],
    [48.90, 49.05, 48.65, 48.75], [48.75, 48.90, 48.60, 48.70]];
  var VL = [110, 95, 100, 90, 105, 95, 85, 100, 90, 110, 120, 95, 85, 80], VR = [100, 105, 110, 95, 115, 120, 110, 130, 240, 180, 150, 140, 120, 110], AVG = 100;
  var LEVEL = 50.00, TEST = 8, BRK = 8, N = 14;
  var IXL = [0.50, 0.72, 0.40, 0.66, 0.34, 0.62, 0.44, 0.70, 0.38, 0.62, 0.48, 0.68, 0.42, 0.56];
  var IXR = [0.92, 0.88, 0.80, 0.76, 0.68, 0.64, 0.58, 0.52, 0.42, 0.37, 0.30, 0.25, 0.18, 0.12];
  var TIMES = ["10:00", "", "", "10:15", "", "", "10:30", "", "", "10:45", "", "", "11:00", ""];
  var GL = K.geo({ yt: 150, yb: 380, pmin: 48.4, pmax: 51.6, x0: 100, dx: 26 }), GR = K.geo({ yt: 150, yb: 380, pmin: 48.4, pmax: 51.6, x0: 650, dx: 26 });
  var VVL = K.geo({ yt: 404, yb: 470, pmin: 0, pmax: 260, x0: 100, dx: 26 }), VVR = K.geo({ yt: 404, yb: 470, pmin: 0, pmax: 260, x0: 650, dx: 26 });
  /* bars 0-13 are day A, 14-27 day B */
  var TB = K.timeline(2 * N, [[0, 7, 4.3, 0.45], [8, 8, 8.0, 1.0], [9, 13, 9.5, 0.5], [14, 21, 13.2, 0.45], [22, 22, 17.4, 1.3], [23, 27, 20.6, 0.5]]);
  var S2 = 4.0, S3 = 9.3, S4 = 13.0, S5 = 17.2, S6 = 20.4, END = TB[27][1] + 1.6;
  var ST = [
    { at: 0, title: "Check the index first", text: "Same stock, same support at 50.00, two different days. On day A the index chops sideways. On day B it trends lower all day. Look at that before you look at the level." },
    { at: S2, title: "Choppy tape: the level holds", text: "Price wicks to 49.88 on 0.9x average volume, then closes back above at 50.18. Nobody is pushing it through, so the level does its job." },
    { at: S3, title: "The bounce is the trade", text: "With nothing driving the market one way, buyers defend 50.00 and price rotates back to 51.00. In a choppy tape the bounce is the better trade." },
    { at: S4, title: "Trending tape: same level", text: "Day B comes down to the same 50.00 with the index falling all morning. Traders who remember the bounce buy it again." },
    { at: S5, title: "It breaks, on 2.4x volume", text: "This candle closes at 49.62, through the level, on 2.4x average volume. Real participation on the way down. The bounce buyers are now trapped." },
    { at: S6, title: "The break is the trade", text: "Price keeps going to 48.70. Same level, different market, opposite trade. Check the index and the volume at the level before you trust it." }
  ];

  function strip(x0, x1, pts, upto, col, op) {
    if (op <= 0) return "";
    var n = Math.max(1, Math.min(pts.length - 1, upto)), out = [];
    var f = upto - Math.floor(upto), k = Math.floor(Math.min(upto, pts.length - 1));
    for (var i = 0; i <= k; i++) out.push((x0 + i * (x1 - x0) / (pts.length - 1)).toFixed(1) + "," + (114 - pts[i] * 48).toFixed(1));
    if (k < pts.length - 1 && f > 0) out.push((x0 + (k + f) * (x1 - x0) / (pts.length - 1)).toFixed(1) + "," + (114 - (pts[k] + (pts[k + 1] - pts[k]) * f) * 48).toFixed(1));
    return out.length > 1 ? '<polyline points="' + out.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" opacity="' + op.toFixed(3) + '"/>' : "";
  }
  function pane(T, G, GV, bars, vols, off, xa, xb, tagX) {
    var s = "", i;
    for (var p = 48.5; p <= 51.5 + 1e-9; p += 0.5) s += K.hline(G, xa, xb, p, "rgba(255,255,255,0.05)", null, 1);
    s += '<line x1="' + xa + '" x2="' + xb + '" y1="' + GV.y(AVG).toFixed(1) + '" y2="' + GV.y(AVG).toFixed(1) + '" stroke="' + C.faint + '" stroke-dasharray="3 4"/>' + txt(xa - 3, GV.y(AVG) + 4, "avg", C.faint, 10, "end");
    for (i = 0; i < N; i++) if (TIMES[i]) s += txt(G.x(i), 496, TIMES[i], C.faint, 11, "middle");
    var aLv = fade(T, 0.6, 0.4);
    s += K.hline(G, xa, xb, LEVEL, C.gold, "6 4", 1.6, aLv) + K.tag(G, tagX, LEVEL, "Support 50.00", C.gold, aLv, "#000");
    for (i = 0; i < N; i++) {
      var pr = K.progress(T, TB, off + i), hot = i === TEST;
      s += K.vol(GV, i, vols[i], pr, hot ? (off ? C.dn : C.up) : "rgba(255,255,255,0.22)", 16);
      s += K.candle(G, i, bars[i], pr, 16);
    }
    return s;
  }

  function frame(T) {
    var s = "";
    s += txt(76, 20, "Illustrative · 5-minute bars", C.faint, 12) + txt(W - 40, 510, "Illustrative", C.faint, 11, "end");
    s += '<line x1="604" x2="604" y1="34" y2="476" stroke="#3a3a3c"/>';
    /* pane titles and index strips */
    var a0 = fade(T, 0.1, 0.4);
    s += txt(76, 44, "Day A", C.ink, 14, "start", 700, a0) + txt(126, 44, "· index chopping sideways", C.dim, 13, "start", null, a0);
    s += txt(630, 44, "Day B", C.ink, 14, "start", 700, a0) + txt(680, 44, "· index trending lower", C.dim, 13, "start", null, a0);
    s += '<g opacity="' + a0.toFixed(3) + '"><rect x="76" y="56" width="364" height="64" rx="8" fill="#161617"/><rect x="630" y="56" width="360" height="64" rx="8" fill="#161617"/></g>';
    s += txt(86, 72, "Index", C.faint, 11, "start", null, a0) + txt(640, 72, "Index", C.faint, 11, "start", null, a0);
    var u = clamp01((T - 0.6) / 2.6) * (IXL.length - 1);
    s += strip(120, 430, IXL, u, C.cyan, a0) + strip(674, 980, IXR, u, C.dn, a0);
    s += txt(430, 112, "choppy", C.cyan, 12, "end", 700, fade(T, 3.2, 0.3)) + txt(980, 70, "trending down", C.dn, 12, "end", 700, fade(T, 3.2, 0.3));
    s += txt(66, VVL.yt + 4, "Vol", C.faint, 11, "end");
    s += K.grid(GL, 48.5, 51.5, 0.5, 76, 76, 68);
    s += pane(T, GL, VVL, L, VL, 0, 76, 440, 450) + pane(T, GR, VVR, R, VR, N, 630, 990, 1000);

    /* day A: the test */
    var aT = fade(T, TB[TEST][1], 0.3);
    s += K.dot(GL.x(TEST), GL.y(L[TEST][2]), 7, C.up, aT);
    s += txt(VVL.x(TEST), VVL.y(VL[TEST]) - 5, "0.9x", C.up, 12, "middle", 700, aT);
    s += K.callout(GL.x(4) - 6, 298, ["Wick to 49.88, close 50.18", "Volume 0.9x: no push through"], C.up, aT * (1 - fade(T, S3, 0.3)));
    var aB = fade(T, TB[11][1], 0.3);
    s += txt(GL.x(11), GL.y(L[11][1]) - 8, "51.00", C.up, 12, "middle", 700, aB);
    s += K.callout(GL.x(4) - 6, 298, ["The bounce is the trade", "50.00 held, back to 51.00"], C.up, aB);
    s += txt(440, 44, "trust the bounce", C.up, 13, "end", 700, aB);

    /* day B: the same level */
    var aR = fade(T, TB[N + 7][1], 0.3);
    s += K.dot(GR.x(7), GR.y(R[7][2]), 7, C.gold, aR * (1 - fade(T, S5, 0.3)));
    s += K.callout(GR.x(0) - 12, 298, ["Bounce buyers at 50.00", "into a falling index"], C.gold, aR * (1 - fade(T, S5, 0.3)));
    var aK = fade(T, TB[N + BRK][1], 0.3);
    s += txt(VVR.x(BRK), VVR.y(VR[BRK]) - 5, "2.4x", C.dn, 12, "middle", 800, aK);
    s += K.callout(990, 160, ["Close 49.62 on 2.4x volume", "Bounce longs trapped"], C.dn, aK, true);
    var aX = fade(T, TB[N + 13][1], 0.3);
    s += txt(GR.x(13), GR.y(R[13][2]) + 16, "48.70", C.dn, 12, "middle", 700, aX);
    s += K.callout(GR.x(0) - 12, 298, ["The break is the trade", "50.00 down to 48.70"], C.dn, aX);
    s += txt(990, 44, "trust the break", C.dn, 13, "end", 700, aX);
    return s;
  }
  return { stages: ST, end: END, frame: frame, focus: function (T) { return T < S4 ? 390 : 945; } };
});
