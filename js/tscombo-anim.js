/* =====================================================================
   tscombo-anim.js — "Combine them: trail each portion differently" on
   trailing-stops.html. Needs /js/anim-kit.js first.

   One illustrative long on 5-minute bars: a break of 40.00 fills at 40.05,
   stop 39.35 under the base (R = 0.70). The position is split in half.
     Half A (the pop)   5-minute bar trail: stop under the prior bar's low,
                        out on the touch.
     Half B (the swing) 15-minute ATR trail: the 5-minute bars are grouped
                        into 15-minute bars; trail = highest high since
                        entry − 3 × ATR(3) of the 15-minute bars, never
                        lowered and never under the initial stop; out on a
                        15-minute close below it.
   Both exits and the blended result are computed here from the bars.
   Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("tscombo", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt, f2 = K.f2, i, k, j;
  var B = [[39.70, 39.95, 39.55, 39.85], [39.85, 40.00, 39.60, 39.65], [39.65, 39.80, 39.40, 39.75],
    [39.75, 39.95, 39.65, 39.90], [39.90, 39.98, 39.70, 39.78], [39.78, 39.96, 39.72, 39.92],
    [39.92, 40.45, 39.88, 40.40], [40.40, 40.85, 40.32, 40.78], [40.78, 41.25, 40.70, 41.18],
    [41.18, 41.60, 41.08, 41.52], [41.52, 41.95, 41.42, 41.88], [41.88, 42.25, 41.78, 42.10],
    [42.10, 42.20, 41.62, 41.70], [41.70, 41.90, 41.45, 41.80], [41.80, 42.05, 41.70, 41.95],
    [41.95, 42.10, 41.60, 41.72], [41.72, 41.98, 41.55, 41.90], [41.90, 42.15, 41.82, 42.08],
    [42.08, 42.40, 41.98, 42.32], [42.32, 42.62, 42.25, 42.55], [42.55, 42.92, 42.48, 42.85],
    [42.85, 43.20, 42.78, 43.12], [43.12, 43.35, 42.98, 43.28], [43.28, 43.70, 43.22, 43.62],
    [43.62, 43.95, 43.50, 43.88], [43.88, 44.10, 43.72, 43.98], [43.98, 44.45, 43.92, 44.38],
    [44.38, 44.70, 44.28, 44.62], [44.62, 44.85, 44.48, 44.75], [44.75, 45.20, 44.70, 45.12],
    [45.12, 45.50, 45.05, 45.42], [45.42, 45.65, 45.28, 45.55], [45.55, 46.00, 45.50, 45.92],
    [45.92, 46.40, 45.85, 46.30], [46.30, 46.55, 46.10, 46.45], [46.45, 46.90, 46.38, 46.80],
    [46.80, 46.95, 46.30, 46.40], [46.40, 46.55, 45.95, 46.05], [46.05, 46.20, 45.70, 45.85],
    [45.85, 45.95, 45.20, 45.30], [45.30, 45.50, 44.80, 44.95], [44.95, 45.05, 43.70, 43.80]];
  var N = B.length, IN = 6, ENTRY = 40.05, STOP = 39.35, R = ENTRY - STOP, LEVEL = 40.00;
  var TIMES = []; for (i = 0; i < N; i++) { var mm = 30 + i * 5; TIMES.push((9 + Math.floor(mm / 60)) + ":" + ("0" + mm % 60).slice(-2)); }
  function tEnd(i) { var mm = 30 + (i + 1) * 5; return (9 + Math.floor(mm / 60)) + ":" + ("0" + mm % 60).slice(-2); }

  /* Half A · 5-minute bar trail: the stop for bar i is the low of bar i-1 */
  var BAR = [], aOut = null;
  for (i = IN + 1; i < N && !aOut; i++) { BAR[i] = B[i - 1][2]; if (B[i][2] < BAR[i]) aOut = { i: i, px: Math.min(BAR[i], B[i][0]) }; }
  /* Half B · 15-minute bars from the 5-minute bars (block q = bars 3q..3q+2) */
  var NQ = Math.floor(N / 3), Q = [];
  for (k = 0; k < NQ; k++) { var bs = B.slice(3 * k, 3 * k + 3); Q.push([bs[0][0], Math.max.apply(null, bs.map(function (b) { return b[1]; })), Math.min.apply(null, bs.map(function (b) { return b[2]; })), bs[2][3]]); }
  var TR = Q.map(function (q, n) { return n ? Math.max(q[1] - q[2], Math.abs(q[1] - Q[n - 1][3]), Math.abs(q[2] - Q[n - 1][3])) : q[1] - q[2]; });
  var ATR = Q.map(function (q, n) { return n < 2 ? null : (TR[n] + TR[n - 1] + TR[n - 2]) / 3; });
  var QIN = IN / 3, LINE = [], lv = STOP, bOut = null, set = null;   /* LINE[q] = the trail in force during block q */
  for (k = QIN; k < NQ && !bOut; k++) {
    if (k > QIN && Q[k][3] < LINE[k]) { bOut = { q: k, i: 3 * k + 2, px: Q[k][3], line: LINE[k] }; break; }
    var hh = -Infinity; for (j = IN; j <= 3 * k + 2; j++) hh = Math.max(hh, B[j][1]);
    var raw = hh - 3 * ATR[k];
    if (raw > lv) { lv = raw; set = { q: k, hh: hh, atr: ATR[k] }; }
    LINE[k + 1] = lv;
  }
  var HIGH = -Infinity, HIGHBAR = 0; for (i = IN; i <= bOut.i; i++) if (B[i][1] > HIGH) { HIGH = B[i][1]; HIGHBAR = i; }
  var dA = aOut.px - ENTRY, dB = bOut.px - ENTRY, BLEND = (dA + dB) / 2;
  function sg(d) { return (d >= 0 ? "+" : "−") + f2(Math.abs(d)); }
  function rr(d) { return (d / R).toFixed(1) + "R"; }
  var FLAT = LINE[QIN + 2];   /* the level the trail holds through the consolidation */

  var G = K.geo({ yt: 50, yb: 352, pmin: 39.0, pmax: 47.4, x0: 84, dx: 21 });
  var S2 = 4.2, S3 = 9.4, S4 = 13.6, S5 = 19.8, S6 = 24.6, END = 30;
  var TB = K.timeline(N, [[0, 5, 0.4, 0.35], [IN, IN, 2.6, 1.0], [IN + 1, aOut.i, S2 + 0.2, 0.55], [aOut.i + 1, 14, S3 + 0.4, 0.5],
    [15, 35, S4 + 0.2, 0.26], [36, N - 1, S5 + 0.2, 0.5]]);
  var ST = [
    { at: 0, title: "One setup, two trades", text: "A break of 40.00 fills at " + f2(ENTRY) + ", stop " + f2(STOP) + " under the base. The position is split in half: one half for the pop, one for the trend." },
    { at: S2, title: "Half A: a 5-minute bar trail", text: "The stop rides under each prior bar's low. The first bar to break one ends it at " + f2(aOut.px) + " at " + TIMES[aOut.i] + ": " + sg(dA) + " a share, banked." },
    { at: S3, title: "Half B: a 15-minute ATR trail", text: "Highest high minus 3 x ATR(3), measured on 15-minute bars and never lowered. It sits at " + f2(FLAT) + " and flatlines through the pause." },
    { at: S4, title: "The trend leg", text: "Every new 15-minute high lifts it. By " + tEnd(set.q * 3 + 2) + " it reads " + f2(set.hh) + " − 3 × " + set.atr.toFixed(3) + " = " + f2(LINE[set.q + 1]) + "." },
    { at: S5, title: "The 15-minute close below it", text: "It waits for a 15-minute close, not a touch. The 15-minute bar that closes at " + f2(bOut.px) + ", under " + f2(bOut.line) + ", does: " + sg(dB) + " a share, " + f2(HIGH - bOut.px) + " under the " + f2(HIGH) + " high." },
    { at: S6, title: "The blended result", text: "Half at " + sg(dA) + " and half at " + sg(dB) + " blend to " + sg(BLEND) + " a share, about " + rr(BLEND) + ". The pop was paid for early, and the trend still had room." }
  ];

  function steps(vals, from, to, half, col, w, op) {
    var p = []; for (var n = from; n <= to; n++) if (vals[n] != null) { p.push((G.x(n) - half).toFixed(1) + "," + G.y(vals[n]).toFixed(1)); p.push((G.x(n) + half).toFixed(1) + "," + G.y(vals[n]).toFixed(1)); }
    return p.length > 1 ? '<polyline points="' + p.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round" opacity="' + op.toFixed(3) + '"/>' : "";
  }
  /* the ATR trail per 5-minute bar (value in force during its 15-minute block) */
  var ATRB = []; for (i = IN; i <= bOut.i; i++) ATRB[i] = LINE[Math.floor(i / 3)] != null ? LINE[Math.floor(i / 3)] : STOP;

  function frame(T) {
    var s = "", last = K.lastBar(T, TB);
    s += txt(84, 30, "Illustrative · 5-minute bars · one long, split in half", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    s += K.grid(G, 40, 47, 1, 70, 990, 62);
    for (i = 0; i < N; i += 6) s += txt(G.x(i), 496, TIMES[i], C.faint, 11, "middle");
    /* 15-minute bars, faint boxes behind the candles while Half B is explained */
    var aQ = fade(T, S3, 0.5) * (1 - 0.6 * fade(T, S5, 0.5));
    if (aQ > 0) for (k = 0; k < NQ; k++) {
      if (3 * k + 2 > last) break;
      var x1 = G.x(3 * k) - 9, x2 = G.x(3 * k + 2) + 9;
      s += '<rect x="' + x1.toFixed(1) + '" y="' + G.y(Q[k][1]).toFixed(1) + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (G.y(Q[k][2]) - G.y(Q[k][1])).toFixed(1) + '" fill="rgba(100,210,255,0.06)" stroke="rgba(100,210,255,0.28)" stroke-width="1" rx="3" opacity="' + aQ.toFixed(3) + '"/>';
    }
    /* breakout level + initial stop */
    var aL = fade(T, 0.6, 0.5);
    s += K.hline(G, 70, G.x(IN) + 12, LEVEL, C.faint, "3 4", 1, aL * (1 - fade(T, S2, 0.4)));
    var aE = fade(T, TB[IN][1], 0.3);
    s += K.hline(G, G.x(IN) - 10, 990, ENTRY, C.blue, null, 1.2, aE * 0.7) + K.tag(G, 1000, ENTRY + 0.1, "Buy " + f2(ENTRY), C.blue, aE, "#fff");
    s += K.hline(G, G.x(IN) - 10, G.x(IN) + 10, STOP, C.dn, null, 2, aE) + K.tag(G, 1000, STOP - 0.2, "Stop " + f2(STOP), C.dn, aE * (1 - fade(T, S4, 0.4)), "#fff");
    s += K.hline(G, G.x(IN) + 10, 990, STOP, C.dn, "5 4", 1.2, aE * (1 - fade(T, S3, 0.4)));
    s += K.callout(G.x(0) - 8, G.y(43.6), ["Break of 40.00: buy " + f2(ENTRY), "Stop " + f2(STOP) + " under the base", "Split: Half A + Half B"], C.blue, aE * (1 - fade(T, S2, 0.4)));
    /* Half A: bar trail */
    var aA = fade(T, S2, 0.3);
    if (aA > 0 && last > IN) s += steps(BAR, IN + 1, Math.min(last, aOut.i), 8.5, C.gold, 2.2, aA * (T >= S3 ? 0.45 + 0.55 * fade(T, S6, 0.4) : 1));
    /* Half B: ATR trail */
    var aB = fade(T, S3, 0.4);
    if (aB > 0) s += steps(ATRB, IN, Math.min(last, bOut.i), 10.5, C.cyan, 2.4, aB);
    /* candles */
    for (i = 0; i < N; i++) {
      var pr = K.progress(T, TB, i);
      if (pr > 0) s += K.candle(G, i, B[i], pr, 13);
    }
    /* Half A exit */
    var aAx = fade(T, TB[aOut.i][1], 0.3);
    if (aAx > 0) {
      s += K.dot(G.x(aOut.i), G.y(aOut.px), 7, C.gold, aAx);
      s += K.tag(G, 1000, aOut.px, "Half A " + f2(aOut.px), C.gold, aAx, "#000");
      s += K.callout(G.x(aOut.i) + 18, G.y(41.3), ["Half A out " + f2(aOut.px) + ": " + sg(dA), "low " + f2(B[aOut.i][2]) + " broke " + f2(BAR[aOut.i])], C.gold, aAx * (1 - fade(T, S3, 0.4)));
    }
    /* Half B explained */
    var aBf = fade(T, S3 + 0.6, 0.4) * (1 - fade(T, S4, 0.4));
    s += K.callout(G.x(13), G.y(45.2), ["15-minute ATR trail (boxes = 15-min bars)", "highest high − 3 × ATR(3), never lowered", "now " + f2(FLAT) + ", flat through the pause"], C.cyan, aBf);
    var aSt = fade(T, S4 + 1.2, 0.4) * (1 - fade(T, S5, 0.4));
    if (aSt > 0) {
      var ix = set.q * 3 + 3;
      s += K.callout(G.x(ix) + 14, G.y(LINE[set.q + 1]) + 16, [f2(set.hh) + " − 3 × " + set.atr.toFixed(3) + " = " + f2(LINE[set.q + 1])], C.cyan, aSt);
    }
    /* Half B exit */
    var aBx = fade(T, TB[bOut.i][1], 0.3);
    if (aBx > 0) {
      s += K.hline(G, G.x(HIGHBAR) - 8, 990, HIGH, C.grey, "2 4", 1, aBx) + K.tag(G, 1000, HIGH, "High " + f2(HIGH), C.grey, aBx, "#fff");
      s += K.dot(G.x(bOut.i), G.y(bOut.px), 7, C.cyan, aBx);
      s += K.tag(G, 1000, bOut.px - 0.12, "Half B " + f2(bOut.px), C.cyan, aBx, "#000");
      s += K.callout(G.x(bOut.i) + 18, G.y(43.35), ["15-min close " + f2(bOut.px) + " < trail " + f2(bOut.line), "Half B out " + f2(bOut.px) + ": " + sg(dB)], C.cyan, aBx * (1 - fade(T, S6, 0.4)), true);
    }
    /* the scoreboard */
    var rows = [
      { name: "Half A · 5-min bar trail", col: C.gold, end: aOut.i, d: dA, at: TB[aOut.i][1] },
      { name: "Half B · 15-min ATR trail", col: C.cyan, end: bOut.i, d: dB, at: TB[bOut.i][1] }
    ];
    s += txt(70, 386, "Time in the trade", C.faint, 11, "start", null, fade(T, rows[0].at, 0.4));
    rows.forEach(function (r, n) {
      var y = 404 + n * 20, a = fade(T, r.at, 0.4);
      if (a <= 0) return;
      s += '<g opacity="' + a.toFixed(3) + '">' + txt(G.x(IN) - 12, y + 4, r.name, r.col, 12, "end", 700) +
        '<rect x="' + G.x(IN) + '" y="' + (y - 4) + '" width="' + (G.x(r.end) - G.x(IN)).toFixed(1) + '" height="8" rx="3" fill="' + r.col + '" opacity="0.75"/>' +
        txt(G.x(r.end) + 10, y + 4, sg(r.d) + " · " + rr(r.d), r.col, 12, "start", 700) + "</g>";
    });
    var aBl = fade(T, S6, 0.5);
    if (aBl > 0) {
      var y3 = 404 + 2 * 20 + 4;
      s += '<g opacity="' + aBl.toFixed(3) + '">' + '<line x1="' + (G.x(IN) - 160) + '" x2="' + G.x(bOut.i) + '" y1="' + (y3 - 13) + '" y2="' + (y3 - 13) + '" stroke="' + C.faint + '"/>' +
        txt(G.x(IN) - 12, y3 + 4, "Blended", C.up, 13, "end", 800) + txt(G.x(IN), y3 + 4, "(" + f2(dA) + " + " + f2(dB) + ") ÷ 2 = " + sg(BLEND) + " a share · about " + rr(BLEND), C.up, 13, "start", 800) + "</g>";
      s += K.callout(G.x(0) - 8, G.y(47.1), ["Blended: " + sg(BLEND) + " a share", "Half A " + sg(dA) + " · Half B " + sg(dB), "Risk 0.70 a share: about " + rr(BLEND)], C.up, aBl);
    }
    return s;
  }
  function focus(T) {
    if (T >= S6 + 0.4) return 390;
    return G.x(Math.max(0, K.lastBar(T, TB))) + 120;
  }
  return { stages: ST, end: END, frame: frame, focus: focus,
    _check: { Q: Q, TR: TR, ATR: ATR, LINE: LINE, BAR: BAR, aOut: aOut, bOut: bOut, set: set, BLEND: BLEND, HIGH: HIGH, text: ST.map(function (x) { return x.text; }) } };
});
