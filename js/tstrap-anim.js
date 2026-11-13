/* =====================================================================
   tstrap-anim.js — "The rationalization trap" on trailing-stops.html.
   Needs /js/anim-kit.js first.

   Brings the static "What no trail looks like" panel to life, with its
   numbers: daily bars, a breakout through 230 bought at 230.00, a run to
   a 244.00 close (+14.00 open, targets of 260 and 300 imagined), then a
   pullback that closes below the 10-day trail (10-day simple average of
   the closes, computed here) at 237.40: the plan's exit, +7.40.
   Without the plan, three more weeks (15 sessions) of reasons not to sell
   ("just retesting", "should hold here", "I'd buy more here anyway"),
   then a 2.5% gap down from 229.60 to 223.86 and a close at 221.80, −8.20.
   Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("tstrap", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt, f2 = K.f2, i;
  var B = [[224.6, 226.0, 224.1, 225.2], [225.2, 226.9, 224.8, 226.4], [226.4, 226.8, 225.0, 225.6], [225.6, 227.6, 225.3, 227.1],
    [227.1, 227.4, 225.8, 226.3], [226.3, 228.3, 226.0, 227.8], [227.8, 228.2, 226.6, 227.0], [227.0, 229.2, 226.8, 228.4],
    [228.4, 228.9, 227.2, 227.6], [227.6, 229.6, 227.4, 228.9],
    [229.0, 231.8, 228.7, 231.4], [231.4, 234.0, 231.0, 233.6], [233.6, 236.6, 233.2, 236.2], [236.2, 239.2, 235.8, 238.8],
    [238.8, 241.9, 238.4, 241.5], [241.5, 244.9, 241.1, 244.0],
    [244.0, 244.4, 242.2, 242.6], [242.6, 243.6, 241.8, 243.1], [243.1, 243.4, 240.0, 240.4], [240.4, 240.9, 237.1, 237.4],
    [237.4, 238.9, 236.8, 238.5], [238.5, 238.8, 236.6, 237.0], [237.0, 237.4, 235.0, 235.4], [235.4, 236.5, 235.0, 236.1],
    [236.1, 236.3, 233.9, 234.2], [234.2, 234.6, 232.7, 233.1], [233.1, 234.3, 232.8, 233.9], [233.9, 234.2, 232.2, 232.6],
    [232.6, 233.6, 232.3, 233.2], [233.2, 233.4, 231.4, 231.8], [231.8, 232.1, 230.3, 230.6], [230.6, 231.7, 230.2, 231.3],
    [231.3, 231.5, 229.9, 230.2], [230.2, 231.1, 229.8, 230.8], [230.8, 231.0, 229.3, 229.6]];
  /* the gap: 2.5% under the prior close */
  var PC = B[B.length - 1][3], GO = Math.round(PC * 0.975 * 100) / 100;
  B.push([GO, GO + 0.7, 221.4, 221.8]);
  var V = [70, 64, 58, 66, 55, 72, 60, 78, 62, 80, 190, 150, 140, 130, 120, 115, 80, 70, 85, 95, 60, 58, 66, 54, 62, 64, 52, 58, 50, 60, 62, 52, 56, 50, 58, 210];
  var N = B.length, BRK = 10, LEVEL = 230, ENTRY = 230.00, TOP = 15, GAP = N - 1;
  /* the 10-day trail: simple average of the last 10 closes */
  var SMA = B.map(function (b, j) { if (j < 9) return null; var s = 0; for (var k = j - 9; k <= j; k++) s += B[k][3]; return s / 10; });
  var OUT = -1; for (i = BRK + 1; i < N && OUT < 0; i++) if (B[i][3] < SMA[i]) OUT = i;
  var XPX = B[OUT][3], HELD = B[GAP][3], PEAKC = B[TOP][3];
  var RETEST = OUT + 1, HOLD = 25, MORE = 31;   /* the three rationalized bars */
  function pnl(px) { var d = px - ENTRY; return (d >= 0 ? "+" : "−") + f2(Math.abs(d)); }

  var G = K.geo({ yt: 52, yb: 352, pmin: 219, pmax: 247, x0: 96, dx: 24 });
  var GV = K.geo({ yt: 400, yb: 470, pmin: 0, pmax: 220, x0: 96, dx: 24 });
  var S2 = 3.8, S3 = 7.8, S4 = 11.6, S5 = 14.8, S6 = 19.8, S7 = 24.2, END = 30;
  var TB = K.timeline(N, [[0, 9, 0.4, 0.2], [BRK, BRK, 2.6, 1.0], [BRK + 1, TOP, S2 + 0.2, 0.55], [TOP + 1, OUT - 1, S3 + 1.4, 0.6], [OUT, OUT, S4 + 0.2, 1.0],
    [OUT + 1, 28, S5 + 0.2, 0.5], [29, GAP - 1, S6 + 0.2, 0.5], [GAP, GAP, S7 + 0.3, 1.2]]);
  var ST = [
    { at: 0, title: "The breakout at 230", text: "Daily bars. Price clears 230 after two weeks under it, on the heaviest volume of the base. Buy " + f2(ENTRY) + "." },
    { at: S2, title: "A big open profit", text: "Five days later it closes at " + f2(PEAKC) + ", +" + f2(PEAKC - ENTRY) + " a share. Bigger targets start to feel real: 260, even 300." },
    { at: S3, title: "The plan: a 10-day trail", text: "The exit rule is a close below the 10-day average. The first pullback is healthy: " + f2(B[OUT - 1][3]) + " still closes above it at " + f2(SMA[OUT - 1]) + "." },
    { at: S4, title: "The close below the trail", text: "It closes at " + f2(XPX) + ", under the 10-day trail at " + f2(SMA[OUT]) + ". This is exactly where the plan says exit: " + pnl(XPX) + " a share, kept." },
    { at: S5, title: "“Just retesting”", text: "Without the plan, every level comes with a reason. The bounce to " + f2(B[RETEST][1]) + " is “just a retest”. The dip to 233 “should hold here”." },
    { at: S6, title: "“I'd buy more here anyway”", text: "Fifteen sessions after the exit, price is back at the 230 breakout. If it pulls back here, the thinking goes, you'd want to buy more anyway." },
    { at: S7, title: "The gap down", text: "It opens 2.5% lower at " + f2(GO) + " and closes at " + f2(HELD) + ": " + pnl(HELD) + ". The plan kept " + pnl(XPX) + ". Same trade, a " + f2(XPX - HELD) + " difference per share." }
  ];

  function thought(x, y, lines, op, right) { return K.callout(x, y, lines, C.dn, op, right); }

  function frame(T) {
    var s = "", last = K.lastBar(T, TB);
    s += txt(96, 30, "Illustrative · daily bars", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    s += K.grid(G, 220, 245, 5, 70, 990, 62);
    for (i = 0; i < N; i += 5) s += txt(G.x(i), 496, "Day " + (i + 1), C.faint, 11, "middle");
    s += txt(70, GV.yt - 6, "Volume", C.faint, 11);
    /* the breakout level */
    var aL = fade(T, 0.6, 0.6);
    s += K.hline(G, 70, 990, LEVEL, C.faint, "3 4", 1, aL * 0.9);
    s += txt(G.x(1), G.y(LEVEL) - 8, "230 resistance", C.faint, 12, "start", 600, aL * (1 - fade(T, S2, 0.4)));
    /* the 10-day trail, drawn up to the exit, then faint beyond it */
    var aS = fade(T, S3, 0.5), upS = Math.min(last, BRK - 1 + Math.floor((OUT - BRK + 1) * K.clamp01((T - S3) / 1.2)));
    if (aS > 0 && upS >= 9) {
      s += K.line(G, SMA, 9, Math.min(upS, OUT), C.gold, 2.2, aS);
      if (last > OUT) s += K.line(G, SMA, OUT, last, C.gold, 1.6, aS * 0.45, "4 4");
      s += txt(G.x(12) + 8, G.y(SMA[12]) + 22, "10-day trail", C.gold, 12, "start", 700, aS * (1 - fade(T, S5, 0.4)));
    }
    /* volume + candles */
    for (i = 0; i < N; i++) {
      var pr = K.progress(T, TB, i);
      var vc = i === BRK ? C.gold : i === GAP ? C.dn : "rgba(255,255,255,0.22)";
      s += K.vol(GV, i, V[i], pr, vc, 14);
      if (pr > 0) s += K.candle(G, i, B[i], pr, 14);
    }
    /* entry */
    var aE = fade(T, TB[BRK][1], 0.3);
    s += K.tag(G, 1000, ENTRY, "Buy " + f2(ENTRY), C.blue, aE, "#fff");
    s += K.dot(G.x(BRK), G.y(ENTRY), 7, C.blue, aE * (1 - fade(T, S3, 0.4)));
    s += K.callout(G.x(BRK) + 18, G.y(226.2), ["Clears 230 on heavy volume", "Buy " + f2(ENTRY)], C.blue, aE * (1 - fade(T, S2, 0.4)));
    /* the top */
    var aT = fade(T, TB[TOP][1], 0.3);
    if (aT > 0) {
      s += K.hline(G, G.x(TOP) - 8, 990, PEAKC, C.grey, "2 4", 1, aT) + K.tag(G, 1000, PEAKC, "Close " + f2(PEAKC), C.grey, aT, "#fff");
      s += K.callout(G.x(TOP) - 22, G.y(246.6), ["Big open profit: +" + f2(PEAKC - ENTRY), "Imagined next: 260, even 300"], C.cyan, aT * (1 - fade(T, S3, 0.4)), true);
    }
    /* healthy pullback */
    var aH = fade(T, TB[OUT - 1][1], 0.3) * (1 - fade(T, S5, 0.4));
    s += txt(G.x(OUT - 2), G.y(B[OUT - 2][1]) - 12, "“healthy pullback”", C.dim, 12, "middle", 600, aH);
    /* the plan's exit */
    var aX = fade(T, TB[OUT][1], 0.3);
    if (aX > 0) {
      s += K.dot(G.x(OUT), G.y(XPX), 8, C.gold, aX);
      s += K.tag(G, 1000, XPX, "Plan exit " + f2(XPX), C.gold, aX, "#000");
      s += K.callout(G.x(OUT) + 22, G.y(XPX) + 26, ["Close " + f2(XPX) + " < 10-day " + f2(SMA[OUT]), "The plan sells: " + pnl(XPX) + " kept"], C.gold, aX * (1 - fade(T, S5, 0.4)));
    }
    /* the rationalizations */
    var a1 = fade(T, TB[RETEST][1], 0.3), a2 = fade(T, TB[HOLD + 1][1], 0.3), a3 = fade(T, TB[MORE][1], 0.3), aG = fade(T, S7, 0.4);
    if (a1 > 0) {
      s += K.dot(G.x(RETEST), G.y(B[RETEST][1]), 6, C.dn, a1 * (1 - aG));
      s += thought(G.x(RETEST) - 10, G.y(246.6), ["“Just retesting the average”", "bounce to " + f2(B[RETEST][1]) + ", still under it"], a1 * (1 - 0.6 * a2) * (1 - aG));
    }
    if (a2 > 0) {
      s += K.hline(G, G.x(HOLD) - 14, G.x(HOLD + 1) + 14, 233, C.dn, "3 3", 1.4, a2 * (1 - aG));
      s += thought(G.x(HOLD) - 10, G.y(240.2), ["“Should hold here”", "two lows near 233"], a2 * (1 - 0.6 * a3) * (1 - aG));
    }
    if (a3 > 0) {
      s += K.dot(G.x(MORE), G.y(B[MORE][2]), 6, C.dn, a3 * (1 - aG));
      s += thought(G.x(MORE) + 20, G.y(228.0), ["“I'd buy more here anyway”", "back at the 230 breakout"], a3 * (1 - aG), true);
    }
    /* three more weeks */
    var aW = fade(T, S5 + 0.4, 0.4);
    if (aW > 0) {
      var xa = G.x(OUT + 1) - 8, xb = G.x(Math.max(OUT + 1, Math.min(last, GAP - 1))) + 8;
      s += '<path d="M' + xa + ' 366 v6 H' + xb.toFixed(1) + ' v-6" fill="none" stroke="' + C.dn + '" stroke-width="1.4" opacity="' + aW.toFixed(3) + '"/>';
      s += txt(xb, 388, (last >= GAP - 1 ? "15 sessions: three more weeks of reasons not to sell" : "more reasons not to sell"), C.dn, 12, "end", 600, aW);
    }
    /* the gap */
    var aD = fade(T, TB[GAP][1], 0.3);
    if (aD > 0) {
      s += K.dot(G.x(GAP), G.y(HELD), 8, C.dn, aD);
      s += K.tag(G, 1000, HELD, "Held " + f2(HELD), C.dn, aD, "#fff");
      s += K.callout(G.x(GAP) - 22, G.y(227.0), ["Gap down 2.5%: " + f2(PC) + " to " + f2(GO), "Close " + f2(HELD) + ": " + pnl(HELD)], C.dn, aD, true);
      var aR = fade(T, TB[GAP][1] + 0.8, 0.4);
      s += K.callout(G.x(1), G.y(246.6), ["Same trade, two endings", "10-day trail: out " + f2(XPX) + ", " + pnl(XPX), "No plan: out " + f2(HELD) + ", " + pnl(HELD), "Gave back the +" + f2(PEAKC - ENTRY) + " and " + f2(ENTRY - HELD) + " more"], C.gold, aR);
    }
    return s;
  }
  function focus(T) { return G.x(Math.max(0, K.lastBar(T, TB))) + 120; }
  return { stages: ST, end: END, frame: frame, focus: focus,
    _check: { B: B, SMA: SMA, OUT: OUT, XPX: XPX, HELD: HELD, GO: GO, PC: PC, text: ST.map(function (x) { return x.text; }) } };
});
