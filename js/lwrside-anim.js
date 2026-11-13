/* =====================================================================
   lwrside-anim.js — "Three exits, side by side" on let-winners-run.html.
   Needs /js/anim-kit.js first.

   One scripted trade, all three exit rules applied to the same bars:
     One Below   exit on the first close below the previous candle's low
     ATR trail   highest high of the previous 10 candles minus ATR(14)
                 (ATR of the previous candle, same as lwr-anim.js), exit on
                 a close below
     Key levels  the bottom of the latest pause, raised once price breaks
                 out of that pause, exit on a close below
   Every line, exit, % and candle count is computed from the bars below.
   Buy 100.00 on the break of a base (high 99.80, low 97.00). Illustrative.
   ===================================================================== */

AnimKit.mount("lwrside", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt, f2 = K.f2;
  var B = [[97.6, 98.6, 97.0, 98.2], [98.2, 99.1, 97.6, 97.8], [97.8, 98.7, 97.1, 98.5], [98.5, 99.4, 97.9, 99.0], [99.0, 99.6, 98.2, 98.5],
    [98.5, 99.1, 97.6, 98.0], [98.0, 98.9, 97.4, 98.6], [98.6, 99.5, 98.0, 99.2], [99.2, 99.8, 98.4, 98.8], [98.8, 99.4, 98.0, 98.4],
    [98.4, 99.2, 97.9, 98.9], [98.9, 99.7, 98.3, 99.3], [99.3, 99.7, 98.5, 98.9], [98.9, 99.6, 98.4, 99.4],
    [99.4, 102.2, 99.1, 101.8],
    [101.8, 104.2, 101.0, 103.6], [103.6, 106.0, 102.8, 105.5], [105.5, 106.8, 104.2, 106.3], [106.3, 109.0, 105.6, 108.6], [108.6, 110.6, 107.6, 110.1],
    [110.1, 110.6, 108.1, 108.9], [108.9, 110.2, 107.7, 109.8], [109.8, 110.4, 109.0, 109.2], [109.2, 109.6, 107.9, 108.7], [108.7, 109.9, 107.9, 109.6],
    [109.6, 111.4, 109.0, 111.1], [111.1, 113.6, 110.6, 113.2], [113.2, 115.6, 112.4, 115.1], [115.1, 117.4, 114.3, 116.9], [116.9, 119.2, 116.0, 118.7],
    [118.7, 119.3, 116.8, 117.4], [117.4, 118.6, 116.1, 118.2], [118.2, 118.8, 116.6, 117.0], [117.0, 118.4, 116.3, 118.0],
    [118.0, 120.2, 117.6, 119.8], [119.8, 122.0, 119.0, 121.5], [121.5, 122.4, 119.4, 119.9], [119.9, 120.6, 117.2, 117.6],
    [117.6, 118.8, 115.9, 116.9], [116.9, 117.6, 115.4, 115.7], [115.7, 116.6, 115.0, 116.2], [116.2, 116.8, 114.4, 114.8],
    [114.8, 115.6, 113.6, 114.0], [114.0, 114.9, 112.8, 113.2]];
  var N = B.length, IN = 14, ENTRY = 100, i, k;
  var BASEHI = 0; for (i = 0; i < IN; i++) BASEHI = Math.max(BASEHI, B[i][1]);

  /* ATR(14): simple average of the last 14 true ranges */
  var TR = B.map(function (b, i) { return i ? Math.max(b[1] - b[2], Math.abs(b[1] - B[i - 1][3]), Math.abs(b[2] - B[i - 1][3])) : b[1] - b[2]; });
  var ATR = TR.map(function (t, i) { if (i < 13) return null; var s = 0; for (var k = i - 13; k <= i; k++) s += TR[k]; return s / 14; });
  /* rule lines under bar i (known at the close of bar i-1) */
  var OBL = B.map(function (b, i) { return i ? B[i - 1][2] : null; });
  var HH = B.map(function (b, i) { if (i < 10) return null; var h = -Infinity; for (var k = i - 10; k < i; k++) h = Math.max(h, B[k][1]); return h; });
  var ATL = B.map(function (b, i) { return HH[i] == null || ATR[i - 1] == null ? null : HH[i] - ATR[i - 1]; });
  /* pauses [from, to]: the level = lowest low of the pause, live once a close clears the pause high */
  var PAUSES = [[0, 13], [20, 24], [30, 33]].map(function (p) {
    var lo = Infinity, hi = -Infinity;
    for (var k = p[0]; k <= p[1]; k++) { lo = Math.min(lo, B[k][2]); hi = Math.max(hi, B[k][1]); }
    var c = p[1] + 1; while (B[c][3] <= hi) c++;
    return { from: p[0], to: p[1], lo: lo, hi: hi, conf: c, live: c + 1 };
  });
  PAUSES[0].live = IN + 1;                       // the base low is the initial level from the entry on
  var KLL = B.map(function (b, i) { var v = null; PAUSES.forEach(function (p) { if (i >= p.live) v = p.lo; }); return v; });
  function firstClose(L) { for (var i = IN + 1; i < N; i++) if (L[i] != null && B[i][3] < L[i]) return i; return -1; }
  var RULES = [
    { name: "One Below", short: "One Below", L: OBL, col: C.gold, ink: "#000" },
    { name: "ATR trail", short: "ATR trail", L: ATL, col: C.cyan, ink: "#000" },
    { name: "Key levels", short: "Key level", L: KLL, col: C.blue, ink: "#fff" }
  ];
  var PEAK = -Infinity;
  RULES.forEach(function (r) {
    r.x = firstClose(r.L); r.out = B[r.x][3]; r.pct = (r.out / ENTRY - 1) * 100; r.held = r.x - IN;
  });
  for (i = IN; i <= RULES[2].x; i++) PEAK = Math.max(PEAK, B[i][1]);
  var OB = RULES[0], AT = RULES[1], KL = RULES[2];
  var KWICK = -1; for (i = AT.x + 1; i < KL.x; i++) if (B[i][2] < KLL[i] && B[i][3] >= KLL[i]) KWICK = i;
  function pc(v) { return "+" + v.toFixed(1) + "%"; }

  var G = K.geo({ yt: 56, yb: 440, pmin: 95, pmax: 124, x0: 70, dx: 21 });
  var TB = K.timeline(N, [[0, 13, 0.3, 0.15], [14, 14, 2.5, 0.8], [15, 22, 4.0, 0.4], [23, 23, 7.8, 1.1], [24, 25, 11.6, 0.4], [26, 34, 12.6, 0.36],
    [35, 36, 16.0, 0.4], [37, 37, 17.6, 1.1], [38, 38, 21.2, 0.9], [39, 39, 22.6, 1.1], [40, 43, 26.2, 0.25]]);
  var S2 = 3.6, S3 = 7.6, S4 = 11.4, S5 = 17.4, S6 = 21.0, S7 = 26.0, END = TB[N - 1][1] + 3.3;
  var ST = [
    { at: 0, title: "One entry, three exits", text: "Price breaks out of a base and you buy at " + f2(ENTRY) + ". From here, all three rules watch the same candles." },
    { at: S2, title: "Three lines, one trade", text: "Gold steps: the previous candle's low. Cyan: highest high of the previous 10 candles minus ATR(14). Blue: the bottom of the latest pause, starting at the base low, " + f2(PAUSES[0].lo) + ". Each rule exits on a close below its own line." },
    { at: S3, title: "One Below is out first", text: "This candle closes at " + f2(OB.out) + ", under the previous low of " + f2(OBL[OB.x]) + ". One Below exits with " + pc(OB.pct) + " after " + OB.held + " candles. It only wicks under the ATR trail at " + f2(ATL[OB.x]) + ", so the other two stay in." },
    { at: S4, title: "Pauses raise the key level", text: "Each time price breaks out of a pause, the key level moves up to that pause's low: " + f2(PAUSES[1].lo) + ", then " + f2(PAUSES[2].lo) + ". The ATR trail climbs with every new high." },
    { at: S5, title: "The ATR trail is out", text: "Highest high " + f2(HH[AT.x]) + " minus ATR " + f2(ATR[AT.x - 1]) + " puts the line at " + f2(ATL[AT.x]) + ". This candle closes at " + f2(AT.out) + ", below it: out with " + pc(AT.pct) + " after " + AT.held + " candles." },
    { at: S6, title: "Key levels is out last", text: "One candle wicks under " + f2(KL.L[KL.x]) + " and closes above it: hold. The next closes at " + f2(KL.out) + ", below it: out with " + pc(KL.pct) + " after " + KL.held + " candles." },
    { at: S7, title: "What each one kept", text: "Same entry, same candles. One Below kept " + pc(OB.pct) + ", the ATR trail " + pc(AT.pct) + ", key levels " + pc(KL.pct) + " of a move that peaked at " + pc((PEAK / ENTRY - 1) * 100) + ". The tightest rule exits first; the widest holds longest but gave more back here." }
  ];

  /* right-edge tags, pushed apart so they never overlap */
  function tags(list) {
    list = list.filter(function (t) { return t.op > 0; }).map(function (t) { t.y0 = G.y(t.p); t.y = t.y0; return t; });
    list.sort(function (a, b) { return a.y0 - b.y0; });
    for (var k = 1; k < list.length; k++) list[k].y = Math.max(list[k].y, list[k - 1].y + 23);
    var s = "";
    list.forEach(function (t) {
      var o = t.op.toFixed(3);
      if (Math.abs(t.y - t.y0) > 1) s += '<polyline points="986,' + t.y0.toFixed(1) + " 994," + t.y0.toFixed(1) + " 1000," + t.y.toFixed(1) + '" fill="none" stroke="' + t.col + '" stroke-width="1.2" opacity="' + o + '"/>';
      s += '<g opacity="' + o + '"><rect x="1000" y="' + (t.y - 10).toFixed(1) + '" width="138" height="20" rx="5" fill="' + t.col + '"/>' + txt(1008, (t.y + 4.5).toFixed(1), t.label, t.ink, 12, "start", 600) + "</g>";
    });
    return s;
  }
  function stepPath(L, from, to, col, w, op, dash) {
    if (to < from || op <= 0) return "";
    var pts = [];
    for (var i = from; i <= to; i++) { pts.push((G.x(i) - 10.5).toFixed(1) + "," + G.y(L[i]).toFixed(1)); pts.push((G.x(i) + 10.5).toFixed(1) + "," + G.y(L[i]).toFixed(1)); }
    return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + ' opacity="' + op.toFixed(3) + '"/>';
  }

  function frame(T) {
    var s = "", last = K.lastBar(T, TB), aL = fade(T, S2, 0.5);
    s += txt(70, 30, "Illustrative · one trade, three exits", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    /* legend */
    var lx = 470;
    RULES.forEach(function (r, k) {
      var x = lx + k * 130;
      s += '<rect x="' + x + '" y="23" width="18" height="4" rx="2" fill="' + r.col + '"/>' + txt(x + 24, 30, r.name, C.dim, 12);
    });
    s += K.grid(G, 96, 124, 4, 50, 990, 1170);
    /* pause shading for the key levels, once each level is set */
    PAUSES.forEach(function (p, k) {
      var a = k === 0 ? fade(T, S2, 0.5) : fade(T, TB[p.conf][1], 0.4);
      if (a <= 0) return;
      var top = -Infinity; for (var j = p.from; j <= p.to; j++) top = Math.max(top, B[j][1]);
      s += '<rect x="' + (G.x(p.from) - 9) + '" y="' + (G.y(top) - 6).toFixed(1) + '" width="' + (G.x(p.to) - G.x(p.from) + 18) + '" height="' + (G.y(p.lo) - G.y(top) + 12).toFixed(1) + '" rx="4" fill="' + C.blue + '" opacity="' + (0.09 * a).toFixed(3) + '"/>';
    });
    /* entry */
    var aE = fade(T, TB[IN][1], 0.3);
    s += K.hline(G, G.x(IN) - 10, 990, ENTRY, C.grey, null, 1.2, aE * 0.8);
    /* the three lines, each up to its own exit */
    var to = Math.max(IN + 1, last);
    s += stepPath(KLL, IN + 1, Math.min(to, KL.x), C.blue, 2.4, aL * (1 - 0.45 * fade(T, TB[KL.x][1], 0.4)));
    s += stepPath(ATL, IN + 1, Math.min(to, AT.x), C.cyan, 2.2, aL * (1 - 0.45 * fade(T, TB[AT.x][1], 0.4)));
    for (i = IN + 1; i <= Math.min(to, OB.x); i++) {
      var hot = i === OB.x;
      s += '<line x1="' + (G.x(i) - 9) + '" x2="' + (G.x(i) + 9) + '" y1="' + G.y(OBL[i]).toFixed(1) + '" y2="' + G.y(OBL[i]).toFixed(1) + '" stroke="' + C.gold + '" stroke-width="' + (hot ? 2.6 : 1.8) + '" opacity="' + (aL * (1 - 0.45 * fade(T, TB[OB.x][1] + 2, 0.4))).toFixed(3) + '"/>';
    }
    /* candles */
    for (i = 0; i < N; i++) {
      var pr = K.progress(T, TB, i);
      if (pr > 0) s += K.candle(G, i, B[i], pr, 11, i > KL.x ? 0.35 : 1);
    }
    /* exit lines to the right edge */
    RULES.forEach(function (r) {
      var a = fade(T, TB[r.x][1], 0.3);
      if (a <= 0) return;
      s += K.hline(G, G.x(r.x), 990, r.out, r.col, "5 4", 1.3, a * 0.9);
      s += K.dot(G.x(r.x), G.y(r.out), 7, C.dn, a);
    });
    /* stage 1: the breakout */
    s += K.callout(G.x(IN) - 18, G.y(104.6), ["Breakout above " + f2(BASEHI), "Buy " + f2(ENTRY)], C.ink, aE * (1 - fade(T, S3, 0.4)), true);
    /* stage 2: what each line is */
    var a2 = fade(T, S2 + 0.3, 0.4) * (1 - fade(T, S3, 0.4));
    if (a2 > 0) {
      var bx = 74, by = 120;
      s += '<g opacity="' + a2.toFixed(3) + '"><rect x="' + bx + '" y="' + by + '" width="320" height="94" rx="8" fill="' + C.box + '" stroke="#48484a"/>';
      s += txt(bx + 12, by + 22, "Each rule, its own line", C.ink, 13, "start", 700);
      [["Previous candle's low", C.gold], ["Highest high (10) − ATR(14)", C.cyan], ["Bottom of the latest pause", C.blue]].forEach(function (r, k) {
        s += '<rect x="' + (bx + 12) + '" y="' + (by + 36 + k * 18) + '" width="16" height="4" rx="2" fill="' + r[1] + '"/>' + txt(bx + 36, by + 42 + k * 18, r[0], C.dim, 13);
      });
      s += "</g>";
    }
    /* stage 3: One Below out, ATR only wicked */
    var a3 = fade(T, TB[OB.x][1], 0.3);
    s += K.callout(G.x(OB.x) + 26, 296, ["One Below: close " + f2(OB.out) + " < previous low " + f2(OBL[OB.x]), "EXIT · " + pc(OB.pct) + " after " + OB.held + " candles", "ATR trail " + f2(ATL[OB.x]) + ": only a wick, stay in"], C.gold, a3 * (1 - fade(T, S4, 0.4)));
    /* stage 4: key level raises */
    [1, 2].forEach(function (k) {
      var p = PAUSES[k], a = fade(T, TB[p.conf][1], 0.3) * (k === 1 ? 1 - fade(T, TB[PAUSES[2].conf][1], 0.3) : 1 - fade(T, S5, 0.4));
      s += K.callout(G.x(26), 296, ["Out of the pause: key level", "moves up to its low, " + f2(p.lo)], C.blue, a);
    });
    /* stage 5: ATR out */
    var a5 = fade(T, TB[AT.x][1], 0.3);
    s += K.callout(986, 290, ["ATR trail: " + f2(HH[AT.x]) + " − " + f2(ATR[AT.x - 1]) + " = " + f2(ATL[AT.x]), "Close " + f2(AT.out) + " < " + f2(ATL[AT.x]) + ": EXIT · " + pc(AT.pct)], C.cyan, a5 * (1 - fade(T, S6, 0.4)), true);
    /* stage 6: wick through the key level, then the close below */
    if (KWICK > 0) {
      var aw = fade(T, TB[KWICK][1], 0.3) * (1 - fade(T, S7, 0.4));
      s += K.dot(G.x(KWICK), G.y(B[KWICK][2]), 5, C.blue, aw);
      s += txt(G.x(KWICK) - 2, G.y(B[KWICK][2]) + 64, "wick · hold", C.blue, 12, "middle", 700, aw);
      s += '<line x1="' + G.x(KWICK) + '" x2="' + G.x(KWICK) + '" y1="' + (G.y(B[KWICK][2]) + 7).toFixed(1) + '" y2="' + (G.y(B[KWICK][2]) + 50).toFixed(1) + '" stroke="' + C.blue + '" stroke-width="1" opacity="' + aw.toFixed(3) + '"/>';
    }
    var a6 = fade(T, TB[KL.x][1], 0.3);
    s += K.callout(986, 290, ["Key levels: close " + f2(KL.out) + " < " + f2(KL.L[KL.x]), "EXIT · " + pc(KL.pct) + " after " + KL.held + " candles"], C.blue, a6 * (1 - fade(T, S7, 0.4)), true);
    /* right-edge tags */
    var tl = [{ p: ENTRY, label: "Entry " + f2(ENTRY), col: C.grey, ink: "#000", op: aE }];
    RULES.forEach(function (r) {
      var done = T >= TB[r.x][1], j = Math.min(Math.max(last, IN + 1), r.x);
      if (done) tl.push({ p: r.out, label: "Out " + f2(r.out) + " " + pc(r.pct), col: r.col, ink: r.ink, op: fade(T, TB[r.x][1], 0.3) });
      else tl.push({ p: r.L[j], label: r.short + " " + f2(r.L[j]), col: r.col, ink: r.ink, op: aL });
    });
    s += tags(tl);
    /* stage 7: the scorecard */
    var a7 = fade(T, S7, 0.5);
    if (a7 > 0) {
      var cx = 590, cy = 296, cw = 398;
      var c = '<g opacity="' + a7.toFixed(3) + '"><rect x="' + cx + '" y="' + cy + '" width="' + cw + '" height="138" rx="10" fill="#161617" stroke="#3a3a3c"/>';
      c += txt(cx + 14, cy + 22, "In at " + f2(ENTRY) + " · peak " + f2(PEAK) + " (" + pc((PEAK / ENTRY - 1) * 100) + ")", C.ink, 13, "start", 700);
      c += txt(cx + 152, cy + 44, "exit", C.faint, 11) + txt(cx + 260, cy + 44, "kept", C.faint, 11, "end") + txt(cx + 274, cy + 44, "held", C.faint, 11);
      RULES.forEach(function (r, k) {
        var y = cy + 66 + k * 24, bw = 40 * r.pct / ((PEAK / ENTRY - 1) * 100);
        c += '<rect x="' + (cx + 14) + '" y="' + (y - 7) + '" width="16" height="4" rx="2" fill="' + r.col + '"/>' + txt(cx + 38, y, r.name, C.dim, 13);
        c += txt(cx + 152, y, f2(r.out), C.dim, 13) + txt(cx + 260, y, pc(r.pct), C.up, 13, "end", 700) + txt(cx + 274, y, r.held + " candles", C.dim, 13);
        c += '<rect x="' + (cx + cw - 54) + '" y="' + (y - 9) + '" width="40" height="8" rx="2" fill="#3a3a3c"/><rect x="' + (cx + cw - 54) + '" y="' + (y - 9) + '" width="' + bw.toFixed(1) + '" height="8" rx="2" fill="' + r.col + '"/>';
      });
      s += c + "</g>";
    }
    return s;
  }
  function focus(T) { return T >= S7 ? 860 : Math.min(860, G.x(Math.max(0, K.lastBar(T, TB))) + 120); }
  return { stages: ST, end: END, frame: frame, focus: focus,
    _check: { B: B, TR: TR, ATR: ATR, OBL: OBL, HH: HH, ATL: ATL, KLL: KLL, PAUSES: PAUSES, RULES: RULES, PEAK: PEAK, KWICK: KWICK, IN: IN } };
});
