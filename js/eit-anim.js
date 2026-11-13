/* =====================================================================
   eit-anim.js — the animated walkthrough on setups/energy-in-the-tank.html.
   Needs /js/anim-kit.js first.

   Weekly squeeze first, then daily bars. The measure is 2 standard
   deviations of the last 20 closes divided by ATR(14), computed here
   from the scripted bars (20 unseen warm-up days feed the first values).
   It drops under 1.5 in week 3 while price coils under 200. A poke to
   200.80 closes 198.60 on ordinary volume: no trade. The break closes
   204.00 on 3.4M shares (avg + 2 sigma is about 1.34M): buy 204.00,
   stop on a close back below the level (199.00), risk 5.00. The measure
   crosses 6 at a close of 242.60: trim, +38.60, about 7.7R.
   Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("eit", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt;
  /* 20 warm-up days (not drawn): the prior run-up into the range */
  var PRE = [[175, 177.6, 173.4, 176], [176, 177.6, 173.9, 175.5], [175.5, 180.6, 173.9, 179], [179, 180.6, 177.4, 179], [179, 180.6, 176.9, 178.5],
    [178.5, 183.6, 176.9, 182], [182, 183.6, 180.4, 182], [182, 183.6, 179.9, 181.5], [181.5, 186.6, 179.9, 185], [185, 186.6, 183.4, 185],
    [185, 186.6, 182.9, 184.5], [184.5, 189.6, 182.9, 188], [188, 189.6, 186.4, 188], [188, 189.6, 185.9, 187.5], [187.5, 192.6, 185.9, 191],
    [191, 192.6, 189.4, 191], [191, 192.6, 188.9, 190.5], [190.5, 195.6, 188.9, 194], [194, 195.6, 192.4, 194], [194, 195.6, 191.9, 193.5]];
  var B = [[193.5, 195.3, 192.8, 194.6], [194.6, 196.5, 193.9, 195.8], [195.8, 196.5, 194.2, 194.9], [194.9, 196.9, 194.2, 196.2], [196.2, 196.9, 194.8, 195.5],
    [195.5, 197.1, 194.8, 196.4], [196.4, 197.1, 194.9, 195.6], [195.6, 197.6, 194.9, 196.9], [196.9, 197.6, 194.9, 195.6], [195.6, 197.5, 194.9, 196.8],
    [196.8, 197.5, 194.7, 195.4], [195.4, 197.3, 194.7, 196.6], [196.6, 198.1, 195.9, 197.4], [197.4, 198.1, 195.5, 196.2], [196.2, 197.7, 195.5, 197],
    [197, 197.7, 195.7, 196.4], [196.4, 198.3, 195.7, 197.6], [197.6, 198.3, 196.1, 196.8], [196.8, 197.9, 196.1, 197.2], [197.2, 198.5, 196.5, 197.8],
    [197.8, 198.5, 196.2, 196.9], [196.9, 198.2, 196.2, 197.5], [197.5, 198.2, 196.4, 197.1], [197.1, 198.6, 196.4, 197.9], [197.9, 198.6, 196.6, 197.3],
    [197.3, 200.8, 196.6, 198.6], [198.6, 199.3, 196.9, 197.6], [197.6, 198.8, 196.9, 198.1], [198.1, 198.8, 197, 197.7], [197.7, 199.1, 197, 198.4],
    [202.2, 205.1, 201.75, 204], [204, 207.7, 203.1, 206.8], [206.8, 210.8, 205.9, 209.9], [209.9, 213, 209, 212.1], [212.1, 213, 210.5, 211.4],
    [211.4, 215.7, 210.5, 214.8], [214.8, 219, 213.9, 218.1], [218.1, 222.1, 217.2, 221.2], [221.2, 222.1, 219.4, 220.3], [220.3, 224.8, 219.4, 223.9],
    [223.9, 228.3, 223, 227.4], [227.4, 231.1, 226.5, 230.2], [230.2, 234.7, 229.3, 233.8], [233.8, 234.7, 231.7, 232.6], [232.6, 237.3, 231.7, 236.4],
    [236.4, 240.7, 235.5, 239.8], [239.8, 243.5, 238.9, 242.6], [242.6, 243.5, 240.1, 241], [241, 241.9, 237.3, 238.2], [238.2, 241.3, 237.3, 240.4],
    [240.4, 241.3, 236, 236.9], [236.9, 240, 236, 239.1]];
  var V = [1.3, 1.2, 1.25, 1.1, 1.15, 1.05, 1.0, 1.1, 0.95, 1.0,
    1.2, 0.8, 1.0, 1.3, 0.7, 0.9, 1.1, 0.75, 1.25, 0.9, 0.8, 1.15, 0.7, 1.0, 1.2, 0.95, 0.85, 1.1, 0.75, 0.9,
    3.4, 2.2, 1.9, 1.7, 1.4, 1.6, 1.8, 1.7, 1.3, 1.6, 1.8, 1.7, 1.9, 1.5, 1.8, 2.1, 2.4, 1.7, 1.6, 1.3, 1.4, 1.2];
  var N = B.length, LEVEL = 200, POKE = 25, BRK = 30, ENTRY = 204.00, STOP = 199.00, LOWB = 201.75;

  /* the squeeze measure: 2 x stdev(close, 20) / ATR(14), seeded by the warm-up days */
  var ALL = PRE.concat(B), M = [], SQ = -1, EX = -1;
  for (var j = PRE.length; j < ALL.length; j++) {
    var cs = ALL.slice(j - 19, j + 1).map(function (b) { return b[3]; }), mu = cs.reduce(function (a, b) { return a + b; }) / 20;
    var sd = Math.sqrt(cs.reduce(function (a, b) { return a + (b - mu) * (b - mu); }, 0) / 20), tr = 0;
    for (var k = j - 13; k <= j; k++) tr += Math.max(ALL[k][1] - ALL[k][2], Math.abs(ALL[k][1] - ALL[k - 1][3]), Math.abs(ALL[k][2] - ALL[k - 1][3]));
    M.push(2 * sd / (tr / 14));
  }
  M.forEach(function (m, i) { if (SQ < 0 && m < 1.5) SQ = i; if (EX < 0 && i > BRK && m > 6) EX = i; });   /* SQ = 14, EX = 46 */
  var TRIM = B[EX][3];
  /* average volume and the 2-sigma line over the 20 days before the break */
  var pv = V.slice(BRK - 20, BRK), vAvg = pv.reduce(function (a, b) { return a + b; }) / 20;
  var vSd = Math.sqrt(pv.reduce(function (a, b) { return a + (b - vAvg) * (b - vAvg); }, 0) / 20), V2S = vAvg + 2 * vSd;   /* 0.97, 1.34 */

  var G = K.geo({ yt: 50, yb: 300, pmin: 190, pmax: 246, x0: 92, dx: 16.5 });
  var GV = K.geo({ yt: 318, yb: 372, pmin: 0, pmax: 4, x0: 92, dx: 16.5 });
  var GI = K.geo({ yt: 392, yb: 474, pmin: 0, pmax: 7, x0: 92, dx: 16.5 });
  var S2 = 4.6, S3 = 9.4, S4 = 13.2, S5 = 17.4, S6 = 23.0;
  var TB = K.timeline(N, [[0, 24, 4.8, 0.17], [25, 25, 9.8, 1.4], [26, 29, 11.6, 0.3], [30, 30, 13.4, 1.4], [31, 46, 17.6, 0.3], [47, 51, 23.2, 0.32]]);
  var END = TB[N - 1][1] + 1.2;
  var ST = [
    { at: 0, title: "Find the squeeze one time frame up", text: "For a daily trade, check the weekly chart first. After a run-up, this one has coiled under 200 for eight weeks with volatility compressed: stored energy." },
    { at: S2, title: "Read the cycle on the daily", text: "The measure is 2 standard deviations of 20 closes divided by ATR. It drops under 1.5 in week 3 and stays there while the range tightens." },
    { at: S3, title: "Mark the level, ignore the poke", text: "200 is the top of the coil. One day trades to 200.80 but closes at 198.60 on ordinary volume. A poke is not a close: no trade." },
    { at: S4, title: "The close, on outlier volume", text: "The break closes at 204.00 on 3.4M shares, well above the 2-sigma line at 1.34M. Buy the close. Invalidation is a close back below the level, 199.00: risk 5.00." },
    { at: S5, title: "Expansion spends the energy", text: "As the move runs, the same measure climbs. It crosses 6 at a close of 242.60: trim there, +38.60 a share, about 7.7R." },
    { at: S6, title: "A cue, not a top call", text: "Past 6x ATR most of the stored energy is spent. Protect the rest and expect some mean reversion; it is not proof the move is over." }
  ];

  function frame(T) {
    var s = "", last = K.lastBar(T, TB), i;
    s += txt(92, 30, "Illustrative · daily bars, weekly squeeze above", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    s += K.grid(G, 200, 240, 10, 70, 990, 60);
    var WK = [[0, "wk 1"], [10, "wk 3"], [20, "wk 5"], [BRK, "break"], [40, "wk 9"], [50, "wk 11"]];
    WK.forEach(function (w) { s += txt(G.x(w[0]), 496, w[1], w[1] === "break" ? C.up : C.faint, 11, "middle", w[1] === "break" ? 700 : null, w[1] === "break" ? fade(T, TB[BRK][1], 0.3) : null); });
    s += txt(70, GV.yt - 4, "Volume", C.faint, 11) + txt(70, GI.yt - 5, "2 &#963; of 20 closes &#247; ATR", C.faint, 11);

    /* weekly inset */
    var aW = fade(T, 0.3, 0.5) * (1 - fade(T, S2 + 0.6, 0.5));
    if (aW > 0) {
      var bx = 300, by = 66, wb = [[150, 158, 148, 156], [156, 166, 154, 164], [164, 175, 162, 173], [173, 184, 170, 182], [182, 191, 179, 189], [189, 197, 186, 194],
        [194, 199, 189, 191], [191, 198, 188, 196], [196, 199, 191, 193], [193, 198.5, 190, 197], [197, 199, 193, 195], [195, 198.6, 193, 197.5], [197.5, 199.2, 195, 196.5], [196.5, 199.1, 195.5, 198.4]];
      var GW = K.geo({ yt: by + 44, yb: by + 170, pmin: 145, pmax: 205, x0: bx + 34, dx: 30 });
      s += '<g opacity="' + aW.toFixed(3) + '"><rect x="' + bx + '" y="' + by + '" width="480" height="210" rx="12" fill="' + K.C.box + '" stroke="' + C.gold + '"/>';
      s += txt(bx + 16, by + 24, "Weekly chart", C.gold, 13, "start", 700) + txt(bx + 464, by + 24, "red dots: squeeze on, 8 weeks", C.gold, 12, "end", 600);
      s += K.hline(GW, bx + 16, bx + 464, 200, C.ink, "5 4", 1.2) + txt(bx + 464, GW.y(200) - 6, "200", C.ink, 11, "end", 600);
      wb.forEach(function (b, n) {
        s += K.candle(GW, n, b, K.clamp01((T - 0.6 - n * 0.2) / 0.25), 14);
        var on = n >= 6, ad = K.clamp01((T - 0.6 - n * 0.2) / 0.25);
        if (ad > 0) s += '<circle cx="' + GW.x(n) + '" cy="' + (by + 188) + '" r="4" fill="' + (on ? C.dn : C.faint) + '" opacity="' + ad.toFixed(3) + '"/>';
      });
      s += "</g>";
    }

    /* the level */
    var aL = fade(T, S3, 0.5);
    if (aL > 0) {
      s += K.hline(G, 70, 70 + 920 * aL, LEVEL, C.ink, "6 5", 1.5);
      s += K.tag(G, 1000, LEVEL, "Level 200.00", C.ink, fade(T, S3 + 0.4, 0.4) * (1 - fade(T, TB[BRK][1], 0.3)), "#000");
    }

    /* compression band in the indicator pane */
    var aSq = fade(T, TB[SQ][1], 0.4);
    if (aSq > 0) {
      var xs = G.x(SQ) - 8, xe = G.x(Math.min(BRK - 1, Math.max(SQ, last))) + 8;
      s += '<rect x="' + xs + '" y="' + GI.y(1.5).toFixed(1) + '" width="' + Math.max(0, xe - xs).toFixed(1) + '" height="' + (GI.yb - GI.y(1.5)).toFixed(1) + '" fill="rgba(244,185,66,0.16)" opacity="' + aSq.toFixed(3) + '"/>';
      s += '<rect x="' + xs + '" y="' + G.y(199.4).toFixed(1) + '" width="' + Math.max(0, xe - xs).toFixed(1) + '" height="' + (G.y(195.2) - G.y(199.4)).toFixed(1) + '" fill="rgba(244,185,66,0.08)" stroke="rgba(244,185,66,0.35)" stroke-dasharray="4 4" opacity="' + aSq.toFixed(3) + '"/>';
      var aC = aSq * (1 - fade(T, S3, 0.4));
      s += txt(G.x(SQ) - 6, G.y(214), "Compressed for weeks:", C.gold, 13, "start", 700, aC) + txt(G.x(SQ) - 6, G.y(214) + 17, "energy building, not being spent", C.dim, 13, "start", null, aC);
    }

    /* threshold lines and the measure */
    s += K.hline(GI, 70, 990, 6, C.up, "4 4", 1.1, 0.8) + K.hline(GI, 70, 990, 1.5, C.gold, "4 4", 1.1, 0.8);
    s += K.tag(GI, 1000, 6, "Expansion 6&#215;", C.up, 1, "#000") + K.tag(GI, 1000, 1.5, "Squeeze 1.5&#215;", C.gold, 1, "#000");
    if (last >= 0) {
      var aM = fade(T, S2, 0.3);
      s += K.line(GI, M, 0, last, C.cyan, 2, aM);
      s += K.dot(GI.x(SQ), GI.y(M[SQ]), 5, C.gold, fade(T, TB[SQ][1], 0.3), true);
    }

    /* volume and candles */
    s += K.hline(GV, 70, 990, V2S, C.faint, "3 4", 1, fade(T, S4, 0.4)) + txt(990, GV.y(V2S) - 4, "avg + 2&#963;", C.faint, 11, "end", null, fade(T, S4, 0.4));
    for (i = 0; i < N; i++) {
      var pr = K.progress(T, TB, i), vc = i === BRK ? C.up : i === POKE ? C.dn : "rgba(255,255,255,0.22)";
      s += K.vol(GV, i, V[i], pr, vc, 9, i > EX ? 0.45 : 1);
      s += K.candle(G, i, B[i], pr, 9, i > EX ? 0.45 : 1);
    }

    /* the poke */
    var aP = fade(T, TB[POKE][1], 0.3) * (1 - fade(T, S4, 0.4));
    s += K.dot(G.x(POKE), G.y(B[POKE][1]), 7, C.dn, aP);
    s += K.callout(G.x(POKE) - 120, G.y(221), ["Poke to 200.80, close 198.60", "Ordinary volume: no trade"], C.dn, aP);

    /* the break */
    var aB = fade(T, TB[BRK][1], 0.3);
    if (aB > 0) {
      s += txt(GV.x(BRK), GV.y(V[BRK]) - 4, "3.4M", C.up, 12, "middle", 800, aB);
      s += K.hline(G, G.x(BRK) - 10, 990, ENTRY, C.blue, null, 1.4, aB) + K.tag(G, 1000, ENTRY, "Buy 204.00", C.blue, aB, "#fff");
      s += K.hline(G, G.x(BRK) - 10, 990, STOP, C.dn, "5 4", 1.4, aB) + K.tag(G, 1000, STOP - 0.6, "Stop: close &lt;199", C.dn, aB, "#fff");
      s += K.callout(G.x(BRK) + 22, G.y(229), ["Buy the close: 204.00", "Stop: a close back below 199.00", "Not the 201.75 low. Risk 5.00"], C.blue, aB * (1 - fade(T, S5, 0.4)));
    }

    /* the expansion extreme */
    var aX = fade(T, TB[EX][1], 0.3);
    if (aX > 0) {
      s += K.dot(G.x(EX), G.y(TRIM), 7, C.up, aX) + K.dot(GI.x(EX), GI.y(M[EX]), 5, C.up, aX, true);
      s += K.tag(G, 1000, TRIM, "Trim 242.60", C.up, aX, "#000");
      s += K.callout(990, G.y(222), ["Past 6&#215; ATR: trim", "242.60, +38.60 = 7.7R"], C.up, aX, true);
    }
    return s;
  }
  return { stages: ST, end: END, frame: frame, focus: function (T) { return T < S2 ? 560 : G.x(Math.max(0, K.lastBar(T, TB))) + 160; } };
});
