/* =====================================================================
   macd-anim.js — the animated walkthrough on macd-continuation-scalp.html.
   Needs /js/anim-kit.js first.

   1-minute bars, MACD 3/9/5 computed from the scripted closes (MACD line =
   EMA3 − EMA9, signal = EMA5 of that line, no histogram). Twelve flat bars
   with the MACD wrapped around zero, an expansion, a pullback that keeps
   both lines above zero, the cross back up on the 22.40 close (stop 22.15
   under the 22.17 pullback low, 0.25 risk, 2,000 shares on $500), the exit
   on the cross back down (22.86 close), then a second cross on the same
   move that fails: skip it. Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("macd", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt;
  var B = [[21.85, 21.90, 21.82, 21.86], [21.86, 21.89, 21.81, 21.84], [21.84, 21.91, 21.83, 21.88], [21.88, 21.90, 21.82, 21.85],
    [21.85, 21.90, 21.83, 21.87], [21.87, 21.89, 21.83, 21.86], [21.86, 21.88, 21.81, 21.84], [21.84, 21.90, 21.83, 21.87],
    [21.87, 21.89, 21.84, 21.86], [21.86, 21.91, 21.85, 21.88], [21.88, 21.89, 21.82, 21.85], [21.85, 21.90, 21.84, 21.87],
    [21.87, 22.07, 21.86, 22.04], [22.04, 22.27, 22.02, 22.24], [22.24, 22.48, 22.22, 22.44],
    [22.44, 22.46, 22.27, 22.30], [22.30, 22.33, 22.19, 22.22], [22.22, 22.26, 22.18, 22.21], [22.21, 22.24, 22.17, 22.20],
    [22.20, 22.25, 22.18, 22.21], [22.21, 22.24, 22.18, 22.20],
    [22.20, 22.42, 22.19, 22.40], [22.40, 22.55, 22.38, 22.52], [22.52, 22.67, 22.50, 22.64], [22.64, 22.79, 22.62, 22.76],
    [22.76, 22.89, 22.73, 22.86], [22.86, 22.96, 22.83, 22.92], [22.92, 22.99, 22.88, 22.94],
    [22.94, 22.96, 22.83, 22.86], [22.86, 22.88, 22.77, 22.80], [22.80, 22.83, 22.73, 22.76], [22.76, 22.79, 22.70, 22.74],
    [22.74, 22.86, 22.72, 22.84], [22.84, 22.96, 22.82, 22.94], [22.94, 23.04, 22.91, 23.00], [23.00, 23.02, 22.84, 22.88]];
  var N = B.length, BASE1 = 11, EXP0 = 12, EXP1 = 14, PB0 = 15, PB1 = 20, PLOW = 18, IN = 21, OUT = 28, AGAIN = 34;
  var ENTRY = 22.40, STOP = 22.15, EXIT = 22.86;
  /* MACD 3/9/5 from the closes, every EMA seeded with the first value */
  function ema(arr, n) { var k = 2 / (n + 1), e = arr[0]; return arr.map(function (v) { e = v * k + e * (1 - k); return e; }); }
  var CL = B.map(function (b) { return b[3]; }), E3 = ema(CL, 3), E9 = ema(CL, 9);
  var M = E3.map(function (v, i) { return v - E9[i]; }), SG = ema(M, 5);
  var TIMES = []; for (var t = 0; t < N; t++) { var mm = 50 + t; TIMES.push((9 + Math.floor(mm / 60)) + ":" + ("0" + (mm % 60)).slice(-2)); }

  var G = K.geo({ yt: 52, yb: 320, pmin: 21.75, pmax: 23.10, x0: 96, dx: 24 });
  var GM = K.geo({ yt: 362, yb: 474, pmin: -0.02, pmax: 0.25, x0: 96, dx: 24 });
  var TB = K.timeline(N, [[0, 11, 0.3, 0.3], [12, 14, 4.8, 0.7], [15, 20, 8.6, 0.5], [21, 21, 12.6, 1.4],
    [22, 27, 16.4, 0.45], [28, 28, 19.2, 1.2], [29, 33, 22.6, 0.4], [34, 34, 24.6, 0.8], [35, 35, 25.5, 0.8]]);
  var END = TB[35][1] + 1.2;
  var S2 = 4.4, S3 = 8.2, S4 = 12.2, S5 = 16.2, S6 = 22.4;
  var ST = [
    { at: 0, title: "Find the flat base", text: "For 12 one-minute bars the MACD (3/9/5) sits wrapped around zero. The averages are converging and energy is building. Mark the spot: no signal yet." },
    { at: S2, title: "Watch the expansion", text: "Price breaks out and the MACD line shoots away from zero as the averages pull apart. You're still not in. Let the move prove itself." },
    { at: S3, title: "Pullback holds above zero", text: "Price pauses near 22.20 and the MACD curls under its signal line. Both lines stay above zero the whole time, so the setup is still alive." },
    { at: S4, title: "Cross back up: buy 22.40", text: "The MACD crosses back above its signal, both still above zero. Buy the close at 22.40. Stop 22.15 sits under the 22.17 pullback low: 0.25 risk, 2,000 shares on $500." },
    { at: S5, title: "Cross back down: out", text: "Stay in while the MACD line is above its signal. It crosses back below on the 22.86 close: out for +0.46 a share, about +1.8R. No guessing the top." },
    { at: S6, title: "That move is done: skip the next cross", text: "The MACD crosses up again on the same move, then fails a bar later. The sequence already played out here. Wait for a fresh flat base instead." }
  ];

  function vline(i, col, op) {
    if (op <= 0) return "";
    return '<line x1="' + G.x(i) + '" x2="' + G.x(i) + '" y1="' + 332 + '" y2="' + GM.yb + '" stroke="' + col + '" stroke-dasharray="3 4" stroke-width="1.2" opacity="' + op.toFixed(3) + '"/>';
  }
  function frame(T) {
    var s = "", last = K.lastBar(T, TB), i;
    s += txt(96, 30, "Illustrative · 1-minute bars · MACD 3/9/5", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    s += K.grid(G, 22, 23, 0.25, 70, 990, 60);
    for (i = 0; i < N; i += 5) s += txt(G.x(i), 496, TIMES[i], C.faint, 11, "middle");
    /* MACD pane frame */
    s += txt(70, GM.yt - 4, "MACD 3/9/5", C.faint, 11);
    s += K.hline(GM, 70, 990, 0, C.grey, "4 4", 1.1, 0.8) + txt(60, GM.y(0) + 4, "0", C.faint, 11, "end");
    s += '<line x1="1004" x2="1022" y1="396" y2="396" stroke="' + C.blue + '" stroke-width="2.2"/>' + txt(1028, 400, "MACD line", C.blue, 12, "start", 700);
    s += '<line x1="1004" x2="1022" y1="416" y2="416" stroke="' + C.gold + '" stroke-width="2"/>' + txt(1028, 420, "signal", C.gold, 12, "start", 700);
    /* the flat base, shaded in both panes */
    var aZ = fade(T, TB[BASE1][1], 0.4) * (1 - 0.6 * fade(T, S3, 0.4));
    if (aZ > 0) {
      var xz = G.x(0) - 12, wz = G.x(BASE1) + 12 - xz;
      s += '<rect x="' + xz + '" y="' + G.y(22.0).toFixed(1) + '" width="' + wz + '" height="' + (G.y(21.78) - G.y(22.0)).toFixed(1) + '" rx="6" fill="rgba(244,185,66,0.08)" stroke="rgba(244,185,66,0.35)" stroke-dasharray="4 4" opacity="' + aZ.toFixed(3) + '"/>';
      s += '<rect x="' + xz + '" y="' + GM.y(0.03).toFixed(1) + '" width="' + wz + '" height="' + (GM.y(-0.02) - GM.y(0.03)).toFixed(1) + '" rx="6" fill="rgba(244,185,66,0.08)" opacity="' + aZ.toFixed(3) + '"/>';
    }
    /* phase labels between the panes */
    var LY = 344;
    s += txt(G.x(5.5), LY, "consolidation", C.gold, 12, "middle", 700, fade(T, TB[BASE1][1], 0.4));
    s += txt(G.x(13), LY, "expansion", C.dim, 12, "middle", 700, fade(T, TB[EXP1][1], 0.4));
    s += txt(G.x(17.5), LY, "pullback", C.dim, 12, "middle", 700, fade(T, TB[PB1][1], 0.4));
    /* entry / exit verticals */
    var aC = fade(T, TB[IN][1], 0.3), aX = fade(T, TB[OUT][1], 0.3), aA = fade(T, TB[AGAIN][1], 0.3);
    s += vline(IN, C.up, aC) + txt(G.x(IN) + 4, LY, "cross = entry", C.up, 12, "start", 700, aC);
    s += vline(OUT, C.dn, aX) + txt(G.x(OUT) + 4, LY, "cross = exit", C.dn, 12, "start", 700, aX);
    s += txt(G.x(AGAIN), LY, "skip", C.grey, 12, "middle", 700, aA);
    /* candles */
    for (i = 0; i < N; i++) {
      var pr = K.progress(T, TB, i);
      if (pr > 0) s += K.candle(G, i, B[i], pr, 14, i > OUT ? 0.4 : 1);
    }
    /* MACD + signal up to the last completed bar */
    var lc = -1; for (i = 0; i < N; i++) if (T >= TB[i][1]) lc = i;
    if (lc >= 1) s += K.line(GM, SG, 0, lc, C.gold, 2, 1) + K.line(GM, M, 0, lc, C.blue, 2.2, 1);
    /* stage 1 */
    s += K.callout(G.x(0) - 12, G.y(22.62), ["Flat base: MACD wrapped around zero", "Mark it. No signal yet."], C.gold, fade(T, TB[BASE1][1], 0.3) * (1 - fade(T, S2, 0.4)));
    /* stage 2 */
    var a2 = fade(T, TB[EXP1][1], 0.3) * (1 - fade(T, S3, 0.4));
    s += K.callout(G.x(EXP0) - 22, G.y(22.95), ["Expansion: MACD leaves zero", "Not in yet. Let it develop."], C.blue, a2, true);
    /* stage 3 */
    var a3 = fade(T, TB[PB1][1], 0.3) * (1 - fade(T, S4, 0.4));
    s += K.dot(GM.x(PB1), GM.y(M[PB1]), 6, C.blue, a3);
    s += txt(GM.x(PB1) + 12, GM.y(M[PB1]) + 4, "MACD " + M[PB1].toFixed(2) + ": still above 0", C.blue, 12, "start", 700, a3);
    s += K.callout(G.x(PB0) - 20, G.y(22.95), ["MACD curls under its signal", "Both lines stay above zero"], C.blue, a3);
    /* stage 4: the cross back up */
    if (aC > 0) {
      var aL = 1 - 0.6 * fade(T, S6, 0.4);
      s += K.dot(GM.x(IN), GM.y(M[IN]), 6, C.up, aC) + K.dot(G.x(IN), G.y(ENTRY), 6, C.up, aC);
      s += K.dot(G.x(PLOW), G.y(B[PLOW][2]), 6, C.dn, aC * (1 - fade(T, S5, 0.4)));
      s += K.hline(G, G.x(IN), 990, ENTRY, C.blue, null, 1.4, aC * aL) + K.tag(G, 1000, ENTRY, "Buy 22.40", C.blue, aC, "#fff");
      s += K.hline(G, G.x(PB0) - 12, 990, STOP, C.dn, "5 4", 1.4, aC * aL) + K.tag(G, 1000, STOP, "Stop 22.15", C.dn, aC, "#fff");
      s += K.callout(G.x(IN) + 24, G.y(22.06), ["Cross back up, both above zero", "Buy 22.40 · stop 22.15 · 2,000 sh"], C.up, aC * (1 - fade(T, S5, 0.4)));
    }
    /* stage 5: the cross back down */
    if (aX > 0) {
      s += K.dot(GM.x(OUT), GM.y(M[OUT]), 6, C.dn, aX) + K.dot(G.x(OUT), G.y(EXIT), 7, C.dn, aX);
      s += K.hline(G, G.x(OUT), 990, EXIT, C.dn, "2 4", 1.2, aX) + K.tag(G, 1000, EXIT, "Exit 22.86", C.dn, aX, "#fff");
      s += K.callout(G.x(IN) + 24, G.y(22.06), ["MACD crosses under its signal: out", "22.86 close: +0.46, about +1.8R"], C.dn, aX * (1 - fade(T, S6, 0.4)));
    }
    /* stage 6: the second cross on the same move */
    if (aA > 0) {
      s += K.dot(GM.x(AGAIN), GM.y(M[AGAIN]), 6, C.grey, aA);
      s += K.callout(990, G.y(22.06), ["Crosses up again on the same move", "Already played out: skip it"], C.grey, aA, true);
    }
    return s;
  }
  return { stages: ST, end: END, frame: frame, focus: function (T) { return G.x(Math.max(0, K.lastBar(T, TB))) + 110; } };
});
