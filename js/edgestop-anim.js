/* =====================================================================
   edgestop-anim.js — the second animation on edge.html: moving a stop
   for the wrong reason vs the right one. Needs /js/anim-kit.js first.

   The same trade on two charts: buy 50.00, stop 49.40 under the 49.45
   higher low, 500 shares, $300 = 1R (the numbers of the page's top
   animation). Left: price slides to 49.50 (-$250), the stop is dragged to
   48.80 "for room", 49.40 breaks and the exit comes at 48.80: -$600, -2R.
   Right: price runs to 50.72, makes a new higher low at 50.05, takes out
   50.72; the stop goes up to 50.00, just under it. Worst case $0, and the
   trade is up $600 (+2R) at 51.20. Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("edgestop", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt, clamp01 = K.clamp01;
  var BASE = [[49.30, 49.70, 49.20, 49.65], [49.65, 50.10, 49.55, 50.00], [50.00, 50.40, 49.90, 50.30], [50.30, 50.45, 49.95, 50.05],
    [50.05, 50.15, 49.70, 49.75], [49.75, 49.85, 49.45, 49.60], [49.60, 49.95, 49.55, 49.90], [49.90, 50.15, 49.85, 50.10]];
  var LEFT = BASE.concat([[50.10, 50.20, 49.88, 49.92], [49.92, 49.98, 49.70, 49.74], [49.74, 49.80, 49.52, 49.56], [49.56, 49.62, 49.46, 49.50],
    [49.50, 49.55, 49.25, 49.30], [49.30, 49.36, 49.05, 49.10], [49.10, 49.18, 48.90, 48.95], [48.95, 49.00, 48.75, 48.80]]);
  var RIGHT = BASE.concat([[50.10, 50.45, 50.05, 50.40], [50.40, 50.72, 50.35, 50.65], [50.65, 50.70, 50.30, 50.36], [50.36, 50.42, 50.05, 50.18],
    [50.18, 50.55, 50.14, 50.50], [50.50, 50.85, 50.45, 50.80], [50.80, 51.05, 50.70, 51.00], [51.00, 51.25, 50.92, 51.20]]);
  var N = 16, HL = 5, IN = 7, ENTRY = 50.00, STOP = 49.40, SH = 500, RISK = +(ENTRY - STOP).toFixed(2), ONE_R = Math.round(RISK * SH);
  var WIDE = 48.80, NERV = 11, BREAK = 12, OUTL = 15;                 /* left */
  var HI2 = 9, HL2 = 11, CONF = 13, NEWSTOP = 50.00, LASTR = 15;     /* right */
  var GL = K.geo({ yt: 96, yb: 452, pmin: 48.6, pmax: 51.4, x0: 92, dx: 21 }), GR = K.geo({ yt: 96, yb: 452, pmin: 48.6, pmax: 51.4, x0: 682, dx: 21 });
  /* bars 0-15 left, 16-31 right; the shared start plays on both at once */
  var TB = K.timeline(2 * N, [[0, 7, 0.4, 0.35], [8, 11, 5.4, 0.7], [12, 15, 12.6, 0.75], [16, 23, 0.4, 0.35], [24, 29, 17.2, 0.6], [30, 31, 23.2, 0.7]]);
  var S2 = 5.2, S3 = 9.0, S4 = 12.4, S5 = 17.0, S6 = 23.0, END = 28.0;
  var DRAG = [S3 + 0.6, 1.4], RAISE = [TB[N + CONF][1] + 0.3, 1.0];
  function usd(v) { return (v < 0 ? "−$" : "+$") + Math.abs(Math.round(v)); }
  function pnl(p) { return (p - ENTRY) * SH; }
  var ST = [
    { at: 0, title: "One trade, one plan", text: "Both charts start the same: buy 50.00, stop 49.40 just under the 49.45 higher low. 0.60 a share × 500 shares = $300 at risk. That is 1R." },
    { at: S2, title: "It comes back", text: "On the left, price slides back to 49.50. The trade is down $250, but the 49.45 low that defined the idea has not broken. Nothing on the chart says change the plan." },
    { at: S3, title: "Widened to give it room", text: "Nervous about the account, the trader drags the stop from 49.40 down to 48.80 to give it room. That move comes from the P&L, not from the price action." },
    { at: S4, title: "−1R becomes −2R", text: "49.40 breaks, where the plan would have been out for −$300. Instead price runs to the new stop at 48.80: 1.20 × 500 = −$600, twice the planned loss." },
    { at: S5, title: "New structure, new stop", text: "On the right, price runs to 50.72, pulls back to a new higher low at 50.05, then takes out 50.72. That is new price action: raise the stop to 50.00, just under it." },
    { at: S6, title: "Price action, not P&L", text: "Same entry, same 1R plan. Moving the stop on P&L doubled the loss to −$600. Moving it on a new higher low cut the worst case to $0, with the trade up $600, +2R." }
  ];
  function ease(u) { u = clamp01(u); return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }

  function pane(T, G, bars, off, xa, xb, tagX, stopNow, ghostOp, buyOp, ghostLab) {
    var s = "", i;
    for (var p = 49; p <= 51 + 1e-9; p += 0.5) s += K.hline(G, xa, xb, p, "rgba(255,255,255,0.05)", null, 1) + txt(xa - 8, G.y(p) + 4, p.toFixed(2), C.faint, 11, "end");
    var aP = fade(T, 3.3, 0.4), aS = fade(T, 3.7, 0.4), aH = fade(T, 2.9, 0.3);
    s += K.dot(G.x(HL), G.y(bars[HL][2]) + 1, 7, C.up, aH);
    s += txt(G.x(HL), G.y(bars[HL][2]) + 26, "higher low 49.45", C.up, 12, "middle", 600, aH);
    s += K.hline(G, G.x(IN) - 12, xb, ENTRY, C.blue, null, 1.4, aP) + K.tag(G, tagX, ENTRY, "Buy " + ENTRY.toFixed(2), C.blue, aP * buyOp, "#fff");
    if (ghostOp > 0) s += K.hline(G, G.x(HL) - 12, xb, STOP, C.dn, "2 5", 1.2, ghostOp * 0.7) + txt(xb, G.y(STOP) - 6, ghostLab, C.dn, 11, "end", 600, ghostOp * 0.85);
    s += K.hline(G, G.x(HL) - 12, xb, stopNow, C.dn, "5 4", 1.6, aS) + K.tag(G, tagX, stopNow, "Stop " + stopNow.toFixed(2), C.dn, aS, "#fff");
    for (i = 0; i < N; i++) s += K.candle(G, i, bars[i], K.progress(T, TB, off + i), 14);
    return s;
  }
  function status(T, bars, off, closedAt, closedBar) {
    var k = K.lastBar(T, TB.slice(off, off + N));
    if (k >= 0 && K.progress(T, TB, off + k) < 1) k = k - 1;
    if (T < S2) k = -1;
    if (closedAt != null && k >= closedBar) return { t: "Closed at " + closedAt.toFixed(2) + ": " + usd(pnl(closedAt)) + " (" + (pnl(closedAt) / ONE_R).toFixed(0).replace("-", "−") + "R)", c: C.dn };
    if (k < IN) return { t: SH + " shares · risk $" + ONE_R + " = 1R", c: C.dim };
    var v = pnl(bars[k][3]);
    return { t: "Open P&amp;L " + (Math.abs(v) < 0.5 ? "$0" : usd(v)) + " · " + SH + " shares", c: v >= 0 ? C.up : C.dn };
  }

  function frame(T) {
    var s = "";
    s += txt(76, 20, "Illustrative · 5-minute bars · the same trade, two ways", C.faint, 12) + txt(W - 40, 510, "Illustrative", C.faint, 11, "end");
    s += '<line x1="616" x2="616" y1="34" y2="476" stroke="#3a3a3c"/>';
    var a0 = fade(T, 0.1, 0.4);
    s += txt(76, 46, "Wrong reason:", C.dn, 15, "start", 700, a0) + txt(186, 46, "moved on the P&amp;L", C.ink, 15, "start", 600, a0);
    s += txt(660, 46, "Right reason:", C.up, 15, "start", 700, a0) + txt(764, 46, "moved on new structure", C.ink, 15, "start", 600, a0);
    var sl = status(T, LEFT, 0, WIDE, OUTL), sr = status(T, RIGHT, N, null, 99);
    s += txt(76, 68, sl.t, sl.c, 13, "start", 600, a0) + txt(660, 68, sr.t, sr.c, 13, "start", 600, a0);
    if (T >= RAISE[0] + RAISE[1]) s += txt(1028, 68, "worst case $0", C.up, 13, "end", 700, fade(T, RAISE[0] + RAISE[1], 0.3));

    /* left: dragged lower, then hit */
    var dL = ease((T - DRAG[0]) / DRAG[1]), stopL = +(STOP + (WIDE - STOP) * dL).toFixed(2);
    s += pane(T, GL, LEFT, 0, 70, 466, 474, stopL, dL, 1, "planned stop 49.40");
    /* right: raised on the new higher low */
    var dR = ease((T - RAISE[0]) / RAISE[1]), stopR = +(STOP + (NEWSTOP - STOP) * dR).toFixed(2);
    s += pane(T, GR, RIGHT, N, 660, 1028, 1036, stopR, dR, 1 - fade(T, RAISE[0] + RAISE[1] * 0.6, 0.3), "old stop 49.40");

    /* left callouts */
    var aN = fade(T, TB[NERV][1], 0.3);
    s += K.dot(GL.x(NERV), GL.y(LEFT[NERV][3]), 6, C.gold, aN * (1 - fade(T, S4 + 0.5, 0.3)));
    var aD = fade(T, S3 + 0.2, 0.3) * (1 - fade(T, TB[BREAK][1], 0.3));
    s += K.callout(170, 106, ["Down $250 and nervous", "Stop dragged 49.40 → 48.80", "No new price action, just P&amp;L"], C.gold, aD);
    if (dL > 0 && dL < 1) s += K.arrow(GL.x(HL) - 24, GL.y(stopL) + 2, false, C.dn, 1);
    var aB = fade(T, TB[BREAK][1], 0.3);
    s += K.dot(GL.x(BREAK), GL.y(STOP), 8, C.ink, aB);
    s += K.callout(170, 106, ["49.40 breaks: the plan was", "out here for −$" + ONE_R + " (−1R)"], C.dn, aB * (1 - fade(T, TB[OUTL][1], 0.3)));
    var aX = fade(T, TB[OUTL][1], 0.3);
    s += K.dot(GL.x(OUTL), GL.y(WIDE), 8, C.dn, aX, true);
    s += K.callout(170, 106, ["Out at 48.80: 1.20 × 500", "−$" + Math.round((ENTRY - WIDE) * SH) + " = " + ((ENTRY - WIDE) / RISK).toFixed(0) + "R lost, not 1R"], C.dn, aX * (1 - fade(T, S6 + 1.6, 0.3)));
    s += K.callout(170, 106, ["Planned: −$" + ONE_R + " (−1R)", "Widened: −$" + Math.round((ENTRY - WIDE) * SH) + " (−" + ((ENTRY - WIDE) / RISK).toFixed(0) + "R)"], C.dn, fade(T, S6 + 1.9, 0.4));

    /* right callouts */
    var aHi = fade(T, TB[N + HI2][1], 0.3);
    s += txt(GR.x(HI2), GR.y(RIGHT[HI2][1]) - 10, "50.72", C.dim, 12, "middle", 700, aHi);
    var aHL = fade(T, TB[N + CONF][1], 0.3);
    s += K.dot(GR.x(HL2), GR.y(RIGHT[HL2][2]) + 1, 7, C.up, aHL);
    s += txt(GR.x(HL2), GR.y(RIGHT[HL2][2]) + 24, "new higher low 50.05", C.up, 12, "middle", 600, aHL * (1 - fade(T, S6, 0.3)));
    s += K.arrow(GR.x(CONF), GR.y(RIGHT[CONF][1]) - 5, false, C.up, aHL);
    var aR = fade(T, RAISE[0], 0.3) * (1 - fade(T, S6 + 1.6, 0.3));
    s += K.callout(1028, 330, ["New structure:", "higher low 50.05 holds,", "then 50.72 breaks.", "Stop up to 50.00"], C.up, aR, true);
    s += K.callout(1028, 330, ["Moved on structure", "Worst case $0", "Open +$" + Math.round(pnl(RIGHT[LASTR][3])) + " (+" + (pnl(RIGHT[LASTR][3]) / ONE_R).toFixed(0) + "R)"], C.up, fade(T, S6 + 1.9, 0.4), true);
    return s;
  }
  function focus(T) { return T < S5 ? 330 : 900; }
  return { stages: ST, end: END, frame: frame, focus: focus };
});
