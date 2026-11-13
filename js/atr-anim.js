/* =====================================================================
   atr-anim.js — the animated walkthrough on setups/atr-band-hybrid.html.
   Needs /js/anim-kit.js first.

   Index-futures style 5-minute bars. ATR(14) is computed from the bars
   (Wilder smoothing, carried in at 11.00 from the overnight session).
   The lower band for each candle is the previous candle's close minus
   3.1 x the previous candle's ATR. The opening candle touches it: skip.
   Later the previous candle's ATR reads 17.85 (the page's worked number),
   the band sits 55.34 under 20950, a wick clips it: buy 20894.50, target
   +35.70 (2 x ATR), stop -26.75 (1.5 x ATR, to the tick). Target hits two
   candles later. Then the short side: an upper wick 2.8x its body with a
   0.5-point lower wick, prior day red; short the next open 20962, out at
   that candle's close 20947 (+15). Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("atr", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt;
  var B = [[21000, 21006, 20995, 21003], [21003, 21008, 20998, 21001], [21001, 21005, 20994.5, 20997], [20997, 21004, 20993, 21002],
    [21002, 21009, 20999, 21006], [21006, 21010, 21000, 21004], [21004, 21012, 20962, 20975], [20975, 20990, 20960, 20984],
    [20984, 20996, 20970, 20978], [20978, 20982, 20950, 20955], [20955, 20970, 20941, 20962], [20962, 20966, 20945, 20950],
    [20950, 20955, 20892, 20915], [20915, 20926, 20905, 20922], [20922, 20934, 20916, 20931], [20931, 20945, 20926, 20940],
    [20940, 20952, 20934, 20948], [20948, 20951, 20936, 20942], [20942, 20958, 20940, 20955], [20955, 20960, 20946, 20952],
    [20952, 20990, 20951.5, 20962], [20962, 20966, 20944, 20947], [20947, 20958, 20940, 20954], [20954, 20962, 20949, 20958]];
  var N = B.length, OPEN = 6, IN = 12, HIT = 14, WICK = 20, SHORT = 21, MULT = 3.1;
  var TIMES = []; for (var t = 0; t < N; t++) { var mm = t * 5; TIMES.push((9 + Math.floor(mm / 60)) + ":" + ("0" + mm % 60).slice(-2)); }
  /* ATR(14), Wilder smoothing, seeded with 11.00 from the overnight bars */
  var ATR = [], a = 11, pc = B[0][0];
  B.forEach(function (b) { var tr = Math.max(b[1] - b[2], Math.abs(b[1] - pc), Math.abs(b[2] - pc)); a = (a * 13 + tr) / 14; ATR.push(a); pc = b[3]; });
  /* lower band for candle i: previous close minus 3.1 x previous ATR (static for the whole candle) */
  var BAND = B.map(function (b, i) { return i ? B[i - 1][3] - MULT * ATR[i - 1] : null; });
  var A0 = ATR[IN - 1];                                   /* 17.85 */
  var ENTRY = Math.floor(BAND[IN] * 4) / 4;               /* buy limit at the band, to the tick: 20894.50 */
  var TD = 2 * A0, SD = Math.round(1.5 * A0 * 4) / 4;     /* +35.70, -26.75 */
  var TGT = ENTRY + TD, STP = ENTRY - SD;
  var SIN = B[SHORT][0], SOUT = B[SHORT][3];

  var G = K.geo({ yt: 52, yb: 352, pmin: 20845, pmax: 21015, x0: 96, dx: 36 });
  var GA = K.geo({ yt: 392, yb: 468, pmin: 0, pmax: 24, x0: 96, dx: 36 });
  var TB = K.timeline(N, [[0, 5, 0.4, 0.4], [6, 6, 6.2, 1.3], [7, 11, 9.6, 0.45], [12, 12, 12.0, 1.4], [13, 14, 16.6, 0.8], [15, 20, 20.2, 0.42], [21, 21, 24.4, 1.3], [22, 23, 27.0, 0.35]]);
  var END = TB[23][1] + 1;
  var ST = [
    { at: 0, title: "ATR measures volatility", text: "ATR is how far price has typically moved per candle lately, up or down. Overnight it sits near 11 points. The panel below tracks it candle by candle." },
    { at: 3.2, title: "Anchor the band to the prior close", text: "The lower band for the next candle is the previous close minus 3.1 x ATR: 21004 - 3.1 x 10.78 = 20970.58. It is set before the candle opens and does not move." },
    { at: 6.0, title: "Skip the opening candle", text: "The 9:30 candle drops through the band. No trade: at the open, the ATR behind the band is not reliable yet." },
    { at: 9.4, title: "The wick clips the band: buy", text: "ATR climbs to 17.85, so the band stretches 55.34 under the 20950 close. The next candle's wick clips 20894.66 and the limit fills at 20894.50." },
    { at: 14.6, title: "Fixed 2 / 1.5 ATR exit", text: "Target is 2 x 17.85 = +35.70 (20930.20). Stop is 1.5 x 17.85 = -26.75 (20867.75). Both are set at entry and never move. Two candles later the target fills." },
    { at: 19.8, title: "Shorts read a wick, not the band", text: "The prior day closed red, so shorts are on. This candle's upper wick is 28 points, 2.8x its 10-point body, and its lower wick is only 0.5: a rejection off the highs." },
    { at: 24.2, title: "Out on time, not price", text: "Short at the next candle's open, 20962. No target, no stop: the trade closes at that candle's close, 20947, for +15 points." }
  ];

  function frame(T) {
    var s = "", last = K.lastBar(T, TB), i;
    s += txt(96, 30, "Illustrative · index futures, 5-minute bars", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    s += K.grid(G, 20860, 21000, 20, 70, 990, 62);
    for (i = 0; i < N; i += 3) s += txt(G.x(i), 496, TIMES[i], C.faint, 11, "middle");
    /* ATR panel */
    s += '<line x1="70" x2="990" y1="' + GA.yb + '" y2="' + GA.yb + '" stroke="rgba(255,255,255,0.1)"/>' + txt(70, GA.yt - 6, "ATR(14), points", C.faint, 11);
    if (last >= 0) {
      var pts = []; for (i = 0; i <= last; i++) pts.push(GA.x(i).toFixed(1) + "," + GA.y(ATR[i]).toFixed(1));
      if (pts.length > 1) s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.gold + '" stroke-width="2"/>';
      s += K.dot(GA.x(last), GA.y(ATR[last]), 3, C.gold, 1, true) + txt(GA.x(last) + 10, GA.y(ATR[last]) + 4, K.f2(ATR[last]), C.gold, 12, "start", 700);
    }
    /* the lower band: one static step per candle; the next candle's step shows once the previous one has closed */
    var aB = fade(T, 3.2, 0.5);
    if (aB > 0) {
      var bp = [], upto = Math.min(N - 1, last + (T >= 3.2 && last >= 0 && K.progress(T, TB, last) >= 1 ? 1 : 0));
      for (i = 1; i <= upto; i++) { bp.push((G.x(i) - 18).toFixed(1) + "," + G.y(BAND[i]).toFixed(1)); bp.push((G.x(i) + 18).toFixed(1) + "," + G.y(BAND[i]).toFixed(1)); }
      if (bp.length > 1) s += '<polyline points="' + bp.join(" ") + '" fill="none" stroke="' + C.blue + '" stroke-width="2" stroke-dasharray="5 3" opacity="' + (aB * (1 - 0.6 * fade(T, 19.8, 0.5))).toFixed(3) + '"/>';
      s += txt(G.x(1) - 18, G.y(BAND[1]) + 18, "lower band", C.blue, 12, "start", 700, aB * (1 - fade(T, 19.8, 0.5)));
    }
    /* the anchor: previous close down to the next band, before the opening candle */
    var aA = fade(T, 3.6, 0.4) * (1 - fade(T, 6.0, 0.4));
    if (aA > 0) {
      var xa = G.x(OPEN);
      s += '<g opacity="' + aA.toFixed(3) + '"><line x1="' + (G.x(OPEN - 1) + 8) + '" x2="' + (xa + 6) + '" y1="' + G.y(B[5][3]).toFixed(1) + '" y2="' + G.y(B[5][3]).toFixed(1) + '" stroke="' + C.dim + '" stroke-dasharray="2 3"/>' +
        '<line x1="' + xa + '" x2="' + xa + '" y1="' + G.y(B[5][3]).toFixed(1) + '" y2="' + G.y(BAND[OPEN]).toFixed(1) + '" stroke="' + C.blue + '" stroke-width="2"/></g>';
      s += K.callout(xa + 24, G.y(20984), ["Next band, fixed before it opens", "21004 − 3.1 × 10.78 = 20970.58"], C.blue, aA);
    }
    /* candles */
    for (i = 0; i < N; i++) {
      var pr = K.progress(T, TB, i);
      if (pr > 0) s += K.candle(G, i, B[i], pr, 20, i > SHORT ? 0.35 : 1);
    }
    /* opening candle: touched, skipped */
    var aO = fade(T, TB[OPEN][1], 0.3);
    if (aO > 0) {
      s += K.dot(G.x(OPEN), G.y(B[OPEN][2]), 7, C.grey, aO * (1 - 0.6 * fade(T, 9.4, 0.4)));
      s += txt(G.x(OPEN) - 14, G.y(B[OPEN][2]) + 18, "open · skip", C.grey, 12, "end", 700, aO * (1 - 0.5 * fade(T, 19.8, 0.4)));
      s += K.callout(G.x(OPEN) + 26, G.y(20926), ["Opening candle touched the band", "No trade: ATR not reliable yet"], C.dn, aO * (1 - fade(T, 9.4, 0.4)));
    }
    /* the entry: band stretched by a bigger ATR, the wick clips it */
    var aS = fade(T, TB[IN - 1][1], 0.3) * (1 - fade(T, 14.6, 0.4));
    if (aS > 0) {
      var xs = G.x(IN);
      s += '<g opacity="' + aS.toFixed(3) + '"><line x1="' + (G.x(IN - 1) + 8) + '" x2="' + (xs + 26) + '" y1="' + G.y(B[IN - 1][3]).toFixed(1) + '" y2="' + G.y(B[IN - 1][3]).toFixed(1) + '" stroke="' + C.dim + '" stroke-dasharray="2 3"/>' +
        '<line x1="' + (xs + 22) + '" x2="' + (xs + 22) + '" y1="' + G.y(B[IN - 1][3]).toFixed(1) + '" y2="' + G.y(BAND[IN]).toFixed(1) + '" stroke="' + C.blue + '" stroke-width="2"/></g>';
      s += txt(xs + 30, G.y((B[IN - 1][3] + BAND[IN]) / 2) - 4, "3.1 × 17.85", C.blue, 12, "start", 700, aS) + txt(xs + 30, G.y((B[IN - 1][3] + BAND[IN]) / 2) + 12, "= 55.34", C.blue, 12, "start", 700, aS);
    }
    var aE = fade(T, TB[IN][1], 0.3);
    if (aE > 0) {
      var aL = aE * (1 - 0.7 * fade(T, 19.8, 0.5)), xe = G.x(IN) - 18, xr = 990 - (990 - (G.x(HIT) + 22)) * fade(T, 19.8, 0.6);
      s += K.dot(G.x(IN), G.y(B[IN][2]), 7, C.up, aE * (1 - fade(T, 19.8, 0.4)));
      s += K.hline(G, xe, xr, ENTRY, C.blue, null, 1.4, aL) + K.tag(G, 1000, ENTRY, "Buy " + K.f2(ENTRY), C.blue, aE * (1 - fade(T, 19.8, 0.4)), "#fff");
      var aT = fade(T, 14.6, 0.4);
      s += K.hline(G, xe, xr, TGT, C.up, "5 4", 1.4, aT * aL / aE) + K.tag(G, 1000, TGT, "Target " + K.f2(TGT), C.up, aT * (1 - fade(T, 19.8, 0.4)), "#000");
      s += K.hline(G, xe, xr, STP, C.dn, "5 4", 1.4, aT * aL / aE) + K.tag(G, 1000, STP, "Stop " + K.f2(STP), C.dn, aT * (1 - fade(T, 19.8, 0.4)), "#fff");
      s += K.callout(G.x(IN) - 30, G.y(20872) + 28, ["Wick clipped the band: buy " + K.f2(ENTRY)], C.up, aE * (1 - fade(T, 14.6, 0.4)), true);
      s += K.callout(660, G.y(21004), ["Previous candle's ATR: 17.85", "Target  2 × 17.85 = +35.70", "Stop  1.5 × 17.85 = −26.75 (to the tick)"], C.gold, aT * (1 - fade(T, 19.8, 0.4)));
    }
    var aH = fade(T, TB[HIT][1], 0.3);
    if (aH > 0) {
      s += K.dot(G.x(HIT), G.y(TGT), 7, C.up, aH);
      s += txt(G.x(HIT), G.y(TGT) - 30, "target +35.70", C.up, 12, "middle", 700, aH * (1 - 0.6 * fade(T, 19.8, 0.4)));
    }
    /* short side: prior day red, the rejection wick */
    var aD = fade(T, 19.8, 0.4);
    if (aD > 0) {
      s += '<g opacity="' + aD.toFixed(3) + '"><rect x="560" y="62" width="196" height="26" rx="13" fill="' + C.box + '" stroke="' + C.dn + '"/>' +
        txt(658, 79.5, "Prior day closed red", C.dn, 12, "middle", 700) + "</g>";
    }
    var aW = fade(T, TB[WICK][1], 0.3);
    if (aW > 0) {
      var xw = G.x(WICK) - 22, b = B[WICK];
      s += '<g opacity="' + aW.toFixed(3) + '" stroke="' + C.gold + '" stroke-width="1.6">' +
        '<line x1="' + xw + '" x2="' + xw + '" y1="' + G.y(b[1]).toFixed(1) + '" y2="' + G.y(b[3]).toFixed(1) + '"/>' +
        '<line x1="' + (xw - 4) + '" x2="' + (xw + 4) + '" y1="' + G.y(b[1]).toFixed(1) + '" y2="' + G.y(b[1]).toFixed(1) + '"/>' +
        '<line x1="' + (xw - 4) + '" x2="' + (xw + 4) + '" y1="' + G.y(b[3]).toFixed(1) + '" y2="' + G.y(b[3]).toFixed(1) + '"/></g>';
      s += txt(xw - 6, G.y((b[1] + b[3]) / 2) + 4, "wick 28", C.gold, 12, "end", 700, aW);
      s += K.callout(G.x(WICK) + 26, G.y(21000), ["Upper wick 28 = 2.8× body 10", "Lower wick 0.5: negligible"], C.gold, aW * (1 - fade(T, 24.2, 0.4)));
    }
    /* time exit */
    var aI = fade(T, TB[SHORT][0], 0.2), aX = fade(T, TB[SHORT][1], 0.3);
    if (aI > 0) {
      var xs2 = G.x(SHORT);
      s += K.hline(G, xs2 - 18, 990, SIN, C.dn, "5 4", 1.4, aI) + K.tag(G, 1000, SIN, "Short " + SIN, C.dn, aI, "#fff");
      if (aX > 0) {
        s += K.hline(G, xs2 - 18, 990, SOUT, C.up, "5 4", 1.4, aX) + K.tag(G, 1000, SOUT, "Out " + SOUT + " · +15", C.up, aX, "#000");
        s += K.callout(990, G.y(21012), ["One candle, then out", "No target, no stop"], C.dn, aX, true);
      }
    }
    return s;
  }
  return { stages: ST, end: END, frame: frame, focus: function (T) { return G.x(Math.max(0, K.lastBar(T, TB))) + 120; },
    _check: { B: B, ATR: ATR, BAND: BAND, ENTRY: ENTRY, TGT: TGT, STP: STP, IN: IN, HIT: HIT, WICK: WICK, SHORT: SHORT, OPEN: OPEN } };
});
