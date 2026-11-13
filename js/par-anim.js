/* =====================================================================
   par-anim.js — the animated walkthrough on price-action-rules.html.
   Needs /js/anim-kit.js first.

   One short continuation trade, using the page's sizing numbers: a
   consolidation with its low at 48.40 breaks (close 48.05), pops back to
   touch the old support (touch candle high 48.60, low 47.95), stop 48.65
   above it, short 47.90 on the break of its low: 0.75 a share, $500 risk
   -> 666 shares. A second, tighter consolidation (46.95 - 47.30) gives a
   new setup to add: stop 47.35, add 46.90. Cover on the first close above
   the highest high of the previous two bars (46.40). Then the touch-and-go
   against three failures. Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("par", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt, clamp01 = K.clamp01, f2 = K.f2;
  var B = [[49.10, 49.30, 48.85, 48.95], [48.95, 49.20, 48.50, 49.15], [49.15, 49.25, 48.70, 48.80], [48.80, 49.10, 48.40, 49.00],
    [49.00, 49.15, 48.55, 48.65], [48.65, 48.90, 48.42, 48.60], [48.60, 48.68, 48.00, 48.05], [48.05, 48.15, 47.80, 48.10],
    [48.10, 48.45, 48.05, 48.38], [48.38, 48.60, 47.95, 48.02], [48.02, 48.05, 47.55, 47.60], [47.60, 47.70, 47.25, 47.30],
    [47.30, 47.40, 46.98, 47.05], [47.05, 47.28, 46.95, 47.20], [47.20, 47.30, 47.00, 47.05], [47.05, 47.22, 46.96, 47.15],
    [47.15, 47.20, 46.95, 47.00], [47.00, 47.02, 46.55, 46.60], [46.60, 46.70, 46.20, 46.25], [46.25, 46.35, 45.95, 46.05],
    [46.05, 46.15, 45.80, 45.90], [45.90, 46.45, 45.85, 46.40], [46.40, 46.60, 46.30, 46.55], [46.55, 46.70, 46.45, 46.50]];
  var N = B.length, CL = 48.40, BRK = 6, TOUCH = 9, GO = 10, C2a = 13, C2b = 16, ADDBAR = 17;
  var STOP = 48.65, ENTRY = 47.90, RISK = +(STOP - ENTRY).toFixed(2), BUDGET = 500, SIZE = Math.floor(BUDGET / RISK);
  var C2LO = 46.95, C2HI = 47.30, ASTOP = 47.35, AENTRY = 46.90, ARISK = +(ASTOP - AENTRY).toFixed(2);
  /* 2-bar trail: cover on the first close above the highest high of the previous two bars */
  var TR = [], OUT = -1;
  for (var i = GO + 1; i < N; i++) { TR[i] = Math.max(B[i - 1][1], B[i - 2][1]); if (OUT < 0 && B[i][3] > TR[i]) OUT = i; }
  var COVER = B[OUT][3], R1 = +(ENTRY - COVER).toFixed(2), R2 = +(AENTRY - COVER).toFixed(2);
  var TIMES = ["10:00", "", "", "10:15", "", "", "10:30", "", "", "10:45", "", "", "11:00", "", "", "11:15", "", "", "11:30", "", "", "11:45", "", ""];

  var G = K.geo({ yt: 56, yb: 440, pmin: 45.6, pmax: 49.5, x0: 90, dx: 36 });
  var TB = K.timeline(N, [[0, 5, 0.4, 0.5], [6, 6, 3.5, 1.0], [7, 8, 5.2, 0.6], [9, 9, 6.5, 1.2], [10, 10, 12.2, 1.2], [11, 12, 13.6, 0.55],
    [13, 16, 15.4, 0.5], [17, 17, 17.6, 1.1], [18, 20, 20.0, 0.55], [21, 21, 21.8, 1.2], [22, 23, 23.2, 0.4]]);
  var S2 = 5.0, S3 = 8.4, S4 = 12.0, S5 = 15.2, S6 = 19.8, S7 = 24.6, END = 30.0;
  var ST = [
    { at: 0, title: "Consolidation, then the break", text: "Price chops in a range with its low at 48.40, then a candle breaks it and closes at 48.05. That old support is now resistance." },
    { at: S2, title: "The pop back: the touch", text: "Price pops back up to retest 48.40. The touch candle wicks to 48.60, gets rejected and closes back under at 48.02. Don't short the touch itself." },
    { at: S3, title: "Stop first, then size", text: "Before any entry: stop 48.65, above the touch candle's high. Entry 47.90, the break of its low. That's 0.75 a share, so a $500 risk budget is 666 shares." },
    { at: S4, title: "The go", text: "The next candle breaks 47.90 and the short fills. Price continues lower in the original direction. The stop stays at 48.65." },
    { at: S5, title: "A new setup to add", text: "A second, tighter consolidation forms between 46.95 and 47.30. That's a completely new setup: its own stop at 47.35, its own entry at 46.90 on the break of its low." },
    { at: S6, title: "Out on a 2-bar trail", text: "Cover on the first close above the highest high of the previous two candles. That close is 46.40: +1.50 a share (2.0R) on the first entry, +0.50 (1.1R) on the add." },
    { at: S7, title: "Touch and go, or skip", text: "Only take the clean touch and go. Skip a retrace well above the level, a pop that never reaches it, and a touch that just chops sideways." }
  ];

  function box(i0, i1, lo, hi, col, op) {
    if (op <= 0) return "";
    var x = G.x(i0) - 16, w = G.x(i1) + 16 - x;
    return '<rect x="' + x + '" y="' + G.y(hi).toFixed(1) + '" width="' + w + '" height="' + (G.y(lo) - G.y(hi)).toFixed(1) + '" fill="' + col + '" fill-opacity="0.08" stroke="' + col + '" stroke-opacity="0.45" stroke-dasharray="4 4" opacity="' + op.toFixed(3) + '"/>';
  }
  /* the four pop-back cards */
  var CARDS = [
    { v: "Take it", c: C.up, p: [[20, 160], [50, 172], [70, 192], [90, 236], [110, 250], [130, 224], [150, 200], [166, 214], [186, 258], [210, 292], [236, 318]], t: ["Touches the old support, stalls,", "and continues. A clean touch and go."] },
    { v: "Skip", c: C.dn, p: [[20, 160], [50, 172], [70, 192], [90, 236], [110, 250], [130, 214], [150, 176], [170, 152], [196, 142], [222, 132]], t: ["Retraces well above the old level.", "A failed breakdown, not a touch."] },
    { v: "Skip", c: C.dn, p: [[20, 160], [50, 172], [70, 192], [90, 236], [110, 250], [130, 238], [150, 246], [172, 236], [196, 250], [222, 244]], t: ["Never gets back up to the level.", "There's no touch to trade off of."] },
    { v: "Skip", c: C.dn, p: [[20, 160], [50, 172], [70, 192], [90, 236], [110, 250], [130, 224], [150, 200], [166, 214], [182, 198], [198, 214], [214, 200], [234, 212]], t: ["Touches, then chops sideways.", "No real go: wait for the next one."] }
  ];
  function cards(T) {
    var a = fade(T, S7 + 0.1, 0.4);
    if (a <= 0) return "";
    var s = '<rect width="' + W + '" height="520" fill="' + C.bg + '" opacity="0.9"/><rect x="30" y="40" width="1120" height="384" rx="16" fill="#161617" stroke="#3a3a3c"/>';
    s += txt(56, 74, "Which pop-back you can trust", C.ink, 16, "start", 700);
    s += txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    CARDS.forEach(function (cd, k) {
      var x = 50 + k * 275, y = 96, t0 = S7 + 0.5 + k * 0.7, ak = fade(T, t0, 0.35), pr = clamp01((T - t0) / 0.9);
      if (ak <= 0) return;
      var py = function (ly) { return y + 50 + (ly - 130) * 0.85; };
      var c = '<rect x="' + x + '" y="' + y + '" width="255" height="290" rx="12" fill="' + C.box + '" stroke="' + (k ? "#3a3a3c" : C.up) + '"/>';
      c += txt(x + 16, y + 30, cd.v, cd.c, 16, "start", 800);
      c += '<line x1="' + (x + 14) + '" x2="' + (x + 241) + '" y1="' + py(200).toFixed(1) + '" y2="' + py(200).toFixed(1) + '" stroke="' + C.gold + '" stroke-dasharray="5 4" stroke-width="1.4"/>';
      c += txt(x + 241, py(200) - 6, "broken support", C.gold, 11, "end");
      var n = 1 + Math.floor(pr * (cd.p.length - 1)), pts = [];
      for (var j = 0; j < n; j++) pts.push((x + cd.p[j][0]).toFixed(1) + "," + py(cd.p[j][1]).toFixed(1));
      if (pr < 1 && n < cd.p.length) { var f = pr * (cd.p.length - 1) - (n - 1), A = cd.p[n - 1], Bq = cd.p[n]; pts.push((x + A[0] + (Bq[0] - A[0]) * f).toFixed(1) + "," + py(A[1] + (Bq[1] - A[1]) * f).toFixed(1)); }
      if (pts.length > 1) c += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.ink + '" stroke-width="2.2" stroke-linejoin="round"/>';
      c += txt(x + 16, y + 252, cd.t[0], C.dim, 12.5) + txt(x + 16, y + 270, cd.t[1], C.dim, 12.5);
      s += '<g opacity="' + ak.toFixed(3) + '">' + c + "</g>";
    });
    return '<g opacity="' + a.toFixed(3) + '">' + s + "</g>";
  }

  function frame(T) {
    var s = "", last = K.lastBar(T, TB), j;
    s += txt(70, 30, "Illustrative · 5-minute bars", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    s += K.grid(G, 46, 49, 0.5, 70, 990, 62);
    for (j = 0; j < N; j++) if (TIMES[j]) s += txt(G.x(j), 496, TIMES[j], C.faint, 11, "middle");
    /* first consolidation and its low */
    var aC = fade(T, 0.6, 0.5);
    s += box(0, 5, CL, 49.30, C.blue, aC) + txt(G.x(0) - 16, G.y(49.30) - 8, "consolidation", C.blue, 12, "start", 600, aC);
    var aL = fade(T, 1.6, 0.4), aBr = fade(T, TB[BRK][1], 0.3);
    s += K.hline(G, G.x(0) - 16, 990, CL, C.gold, "6 4", 1.5, aL);
    s += K.tag(G, 1000, CL, aBr > 0.5 ? "Resistance 48.40" : "Support 48.40", C.gold, aL, "#000");
    s += K.callout(G.x(0), 262, ["The break: close 48.05", "under the 48.40 low"], C.gold, aBr * (1 - fade(T, S3, 0.3)));
    /* stop and entry lines (drawn before the go) */
    var aS = fade(T, S3 + 0.3, 0.4), aE = fade(T, S3 + 0.9, 0.4);
    s += K.hline(G, G.x(TOUCH) - 16, 990, STOP, C.dn, "5 4", 1.5, aS) + K.tag(G, 1000, STOP, "Stop " + f2(STOP), C.dn, aS, "#fff");
    s += K.hline(G, G.x(TOUCH) - 16, 990, ENTRY, C.blue, null, 1.5, aE) + K.tag(G, 1000, ENTRY, "Short " + f2(ENTRY), C.blue, aE, "#fff");
    /* second consolidation, add stop and add entry */
    var aC2 = fade(T, TB[C2b][1], 0.3);
    s += box(C2a, C2b, C2LO, C2HI, C.cyan, aC2);
    var aA = fade(T, TB[C2b][1] + 0.2, 0.4);
    s += K.hline(G, G.x(C2a) - 16, 990, ASTOP, C.dn, "3 4", 1.2, aA) + K.tag(G, 1000, ASTOP, "Add stop " + f2(ASTOP), C.dn, aA, "#fff");
    s += K.hline(G, G.x(C2a) - 16, 990, AENTRY, C.cyan, null, 1.2, aA) + K.tag(G, 1000, AENTRY, "Add " + f2(AENTRY), C.cyan, aA, "#000");
    /* the 2-bar trail */
    var aT = fade(T, S6 + 0.1, 0.4);
    if (aT > 0) {
      for (j = ADDBAR + 1; j <= Math.min(last, OUT); j++) s += K.hline(G, G.x(j) - 16, G.x(j) + 16, TR[j], C.gold, null, 2, aT);
      s += txt(G.x(19), G.y(TR[19]) - 10, "2-bar high", C.gold, 12, "middle", 600, aT * (1 - fade(T, TB[OUT][1], 0.3)));
    }
    /* candles */
    for (j = 0; j < N; j++) { var pr = K.progress(T, TB, j); if (pr > 0) s += K.candle(G, j, B[j], pr, 18, j > OUT ? 0.35 : 1); }
    /* the touch */
    var aTo = fade(T, TB[TOUCH][1], 0.3);
    s += K.dot(G.x(TOUCH), G.y(B[TOUCH][1]), 7, C.gold, aTo);
    s += txt(G.x(TOUCH), G.y(B[TOUCH][1]) - 14, "touch", C.gold, 12, "middle", 700, aTo);
    s += K.callout(G.x(TOUCH) - 60, 66, ["Touch: high 48.60, low 47.95", "Rejected, closes back at 48.02"], C.gold, aTo * (1 - fade(T, S3, 0.3)));
    s += K.callout(510, 66, ["Stop first: 48.65, above the touch high", "Entry: 47.90, the break of its low", "0.75 a share · $" + BUDGET + " ÷ " + f2(RISK) + " = " + SIZE + " shares"], C.dn, fade(T, S3 + 1.4, 0.4) * (1 - fade(T, S4, 0.3)));
    /* the go */
    var aG = fade(T, TB[GO][0] + 0.6, 0.3);
    s += K.dot(G.x(GO), G.y(ENTRY), 6, C.blue, aG, true);
    s += K.callout(G.x(0), 318, ["The go: short fills at 47.90", "Stop stays at 48.65"], C.blue, fade(T, TB[GO][1], 0.3) * (1 - fade(T, S7, 0.3)));
    /* the add */
    var aAd = fade(T, TB[ADDBAR][0] + 0.5, 0.3);
    s += K.dot(G.x(ADDBAR), G.y(AENTRY), 6, C.cyan, aAd, true);
    s += K.callout(G.x(ADDBAR) - 14, 336, ["Add #1: a new setup", "Stop 47.35 · add 46.90", "Risk 0.45 a share"], C.cyan, aAd, true);
    /* the cover */
    var aX = fade(T, TB[OUT][1], 0.3);
    s += K.dot(G.x(OUT), G.y(COVER), 8, C.gold, aX);
    s += K.hline(G, G.x(OUT), 990, COVER, C.up, "5 4", 1.2, aX) + K.tag(G, 1000, COVER, "Cover " + f2(COVER), C.up, aX, "#000");
    s += K.callout(990, 66, ["Covered " + f2(COVER) + ": close above the 2-bar high", "First entry 47.90: +" + f2(R1) + " = " + (R1 / RISK).toFixed(1) + "R", "Add 46.90: +" + f2(R2) + " = " + (R2 / ARISK).toFixed(1) + "R"], C.up, aX, true);
    s += cards(T);
    return s;
  }
  function focus(T) {
    if (T >= S7) { var k = Math.min(3, Math.max(0, Math.floor((T - S7 - 0.5) / 0.7))); return 50 + k * 275 + 128 + 70; }
    return G.x(Math.max(0, K.lastBar(T, TB))) + 120;
  }
  return { stages: ST, end: END, frame: frame, focus: focus };
});
