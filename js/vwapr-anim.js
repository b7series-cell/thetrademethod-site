/* =====================================================================
   vwapr-anim.js — the animated walkthrough on vwap-reversal.html.
   Needs /js/anim-kit.js first.

   5-minute bars. An old daily high at 84.85 is marked first. The session
   VWAP and its 2nd (2 standard deviation) bands are computed from the
   scripted bars and volumes. Price runs up and tags the upper band (84.83)
   right at the old high, pushes through to 85.05 (the failure test) and
   closes back at 84.60 as a shooting star. Short the close at 84.60, stop
   85.10 above the extreme (0.50 risk, 1,000 shares on $500), target 2:1 at
   83.60. Scripted bars, no market data.
   ===================================================================== */

AnimKit.mount("vwapr", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt;
  var B = [[83.80, 84.55, 83.50, 84.40], [84.40, 84.60, 83.80, 83.95], [83.95, 84.05, 83.10, 83.25], [83.25, 83.40, 82.60, 82.80],
    [82.80, 83.20, 82.50, 83.10], [83.10, 83.40, 82.90, 83.00], [83.00, 83.36, 82.94, 83.28], [83.28, 83.58, 83.20, 83.50],
    [83.50, 83.76, 83.42, 83.68], [83.68, 83.96, 83.62, 83.90], [83.90, 84.14, 83.82, 84.06], [84.06, 84.28, 83.96, 84.20],
    [84.20, 84.36, 84.08, 84.28], [84.28, 84.52, 84.22, 84.46], [84.46, 84.70, 84.40, 84.64], [84.64, 84.84, 84.58, 84.76],
    [84.76, 85.05, 84.56, 84.60],
    [84.60, 84.66, 84.30, 84.38], [84.38, 84.45, 84.05, 84.12], [84.12, 84.20, 83.85, 83.95], [83.95, 84.02, 83.62, 83.70],
    [83.70, 83.74, 83.52, 83.58], [83.58, 83.70, 83.50, 83.66]];
  var V = [1000, 800, 700, 650, 550, 420, 300, 260, 240, 230, 220, 200, 190, 200, 220, 260, 420, 280, 240, 220, 230, 250, 170];
  var N = B.length, LEVEL = 84.85, TOUCH = 15, FAIL = 16, ENTRY = 84.60, STOP = 85.10, TGT = 83.60, HIT = 21, B0 = 2;
  var TIMES = []; for (var t = 0; t < N; t++) { var mm = 30 + t * 5; TIMES.push((9 + Math.floor(mm / 60)) + ":" + ("0" + (mm % 60)).slice(-2)); }
  /* session VWAP of the typical price, and its standard-deviation bands */
  var VW = [], UP2 = [], DN2 = [], pv = 0, vv = 0, pv2 = 0;
  B.forEach(function (b, i) {
    var tp = (b[1] + b[2] + b[3]) / 3; pv += tp * V[i]; vv += V[i]; pv2 += tp * tp * V[i];
    var w = pv / vv, sd = Math.sqrt(Math.max(0, pv2 / vv - w * w));
    VW.push(w); UP2.push(w + 2 * sd); DN2.push(w - 2 * sd);
  });
  function f2(v) { return v.toFixed(2); }

  var G = K.geo({ yt: 52, yb: 352, pmin: 82.3, pmax: 85.3, x0: 96, dx: 38 });
  var GV = K.geo({ yt: 388, yb: 470, pmin: 0, pmax: 1100, x0: 96, dx: 38 });
  var TB = K.timeline(N, [[0, 5, 0.6, 0.4], [6, 12, 4.2, 0.5], [13, 15, 8.8, 0.7], [16, 16, 12.6, 3.0], [17, 21, 21.0, 0.6], [22, 22, 25.2, 0.4]]);
  var END = TB[22][1] + 1.2;
  var S2 = 3.6, S3 = 8.6, S4 = 12.4, S5 = 16.6, S6 = 20.8;
  var ST = [
    { at: 0, title: "Mark the old level first", text: "Before zooming in, check the daily chart. The old high at 84.85 is where sellers showed up before. Draw it across the intraday chart." },
    { at: S2, title: "Build the VWAP and its 2nd band", text: "The VWAP is the session's volume-weighted average. The 2nd band sits two standard deviations above it. Price climbs off the morning low toward both." },
    { at: S3, title: "Signals 1 and 2: band touch at the level", text: "This bar tags the upper band at " + f2(UP2[TOUCH]) + ", right at the old high of 84.85. Two signals from two different sources, at one price." },
    { at: S4, title: "Signal 3: the failure test", text: "Price pushes through 84.85 to 85.05, then falls straight back under it. Late breakout buyers are trapped, and their stops sit just above." },
    { at: S5, title: "Short the close: 84.60", text: "The bar closes as a shooting star at 84.60: the third signal. Short the close. Stop 85.10, just above the 85.05 extreme: 0.50 risk, 1,000 shares on $500." },
    { at: S6, title: "Take 2:1 at 83.60", text: "The target is twice the risk: 84.60 − 1.00 = 83.60. Price gets there five bars later: +1.00 a share, +2R, or $1,000 on 1,000 shares." }
  ];

  function frame(T) {
    var s = "", last = K.lastBar(T, TB), i;
    s += txt(96, 30, "Illustrative · 5-minute bars", C.faint, 12) + txt(W - 40, 506, "Illustrative", C.faint, 11, "end");
    s += K.grid(G, 82.5, 85, 0.5, 70, 990, 60);
    for (i = 0; i < N; i += 3) s += txt(G.x(i), 496, TIMES[i], C.faint, 11, "middle");
    s += txt(70, GV.yt - 6, "Volume", C.faint, 11);
    /* the old level */
    var aL = fade(T, 0.3, 0.6);
    s += K.hline(G, 70, 990, LEVEL, C.gold, "6 4", 1.6, aL) + K.tag(G, 1000, LEVEL, "Old high 84.85", C.gold, aL, "#000");
    /* daily-chart inset */
    var aH = fade(T, 0.4, 0.5) * (1 - fade(T, S2 + 0.6, 0.4));
    if (aH > 0) {
      var bx = 560, by = 150, d = [[0, 52], [10, 70], [20, 92], [30, 80], [40, 62], [50, 55], [60, 66], [70, 74], [80, 82], [90, 88]];
      s += '<g opacity="' + aH.toFixed(3) + '"><rect x="' + bx + '" y="' + by + '" width="380" height="150" rx="12" fill="' + C.box + '" stroke="' + C.gold + '"/>';
      s += txt(bx + 14, by + 22, "Daily chart", C.gold, 13, "start", 700);
      s += '<line x1="' + (bx + 20) + '" x2="' + (bx + 360) + '" y1="' + (by + 140 - 92 * 1.2) + '" y2="' + (by + 140 - 92 * 1.2) + '" stroke="' + C.gold + '" stroke-dasharray="5 4"/>';
      s += txt(bx + 360, by + 140 - 92 * 1.2 - 6, "old high 84.85", C.gold, 11, "end");
      s += '<polyline fill="none" stroke="' + C.ink + '" stroke-width="2" points="' + d.map(function (p) { return (bx + 30 + p[0] * 3.4) + "," + (by + 140 - p[1] * 1.2); }).join(" ") + '"/>';
      s += txt(bx + 14, by + 140, "sellers stepped in here before", C.dim, 12) + "</g>";
    }
    /* VWAP and the 2nd bands, up to the last completed bar */
    var lc = -1; for (i = 0; i < N; i++) if (T >= TB[i][1]) lc = i;
    var aV = fade(T, S2, 0.6);
    if (aV > 0 && lc > B0) {
      s += K.line(G, DN2, B0, lc, C.cyan, 1.4, aV * 0.45, "5 4");
      s += K.line(G, VW, B0, lc, C.blue, 2, aV);
      s += K.line(G, UP2, B0, lc, C.cyan, 2.4, aV);
      s += '<g opacity="' + aV.toFixed(3) + '">' +
        '<line x1="1004" x2="1022" y1="286" y2="286" stroke="' + C.blue + '" stroke-width="2"/>' + txt(1028, 290, "VWAP", C.blue, 12, "start", 700) +
        '<line x1="1004" x2="1022" y1="306" y2="306" stroke="' + C.cyan + '" stroke-width="2.4"/>' + txt(1028, 310, "2nd band", C.cyan, 12, "start", 700) +
        txt(1028, 326, "2 std. dev.", C.faint, 11) + "</g>";
    }
    /* volume */
    for (i = 0; i < N; i++) {
      var pr = K.progress(T, TB, i);
      var vc = i === FAIL ? C.dn : "rgba(255,255,255,0.22)";
      s += K.vol(GV, i, V[i], pr, vc, 20, i > HIT ? 0.4 : 1);
      if (pr > 0) s += K.candle(G, i, B[i], pr, 20, i > HIT ? 0.35 : 1);
    }
    /* stage 3: band touch at the level */
    var aT = fade(T, TB[TOUCH][1], 0.3);
    s += K.dot(G.x(TOUCH), G.y(B[TOUCH][1]), 7, C.cyan, aT * (1 - 0.5 * fade(T, S6, 0.4)));
    s += K.callout(G.x(TOUCH) + 26, G.y(84.55), ["Band " + f2(UP2[TOUCH]) + " + old high 84.85", "Signals 1 and 2 at one price"], C.cyan, aT * (1 - fade(T, S4, 0.4)));
    /* stage 4: the failure test */
    var aF = fade(T, TB[FAIL][0] + 1.0, 0.4);
    s += K.callout(G.x(FAIL) + 26, G.y(84.55), ["Through 84.85 to 85.05, then back under", "Late breakout buyers trapped"], C.dn, aF * (1 - fade(T, S5, 0.4)));
    var aStops = fade(T, TB[FAIL][0] + 1.4, 0.4) * (1 - fade(T, S5, 0.4));
    s += txt(G.x(FAIL), G.y(85.05) - 12, "their stops", C.dn, 11, "middle", 600, aStops);
    /* stage 5: short the close */
    var aE = fade(T, S5, 0.4);
    if (aE > 0) {
      s += K.txt(GV.x(FAIL), GV.y(V[FAIL]) - 6, "shooting star", C.dn, 11, "middle", 700, aE);
      s += K.dot(G.x(FAIL), G.y(ENTRY), 7, C.blue, aE);
      s += K.hline(G, G.x(FAIL), 990, ENTRY, C.blue, null, 1.4, aE) + K.tag(G, 1000, ENTRY, "Short 84.60", C.blue, aE, "#fff");
      s += K.hline(G, G.x(FAIL) - 22, 990, STOP, C.dn, "5 4", 1.4, aE) + K.tag(G, 1000, STOP, "Stop 85.10", C.dn, aE, "#fff");
      s += K.callout(G.x(FAIL) + 26, G.y(84.35), ["Shooting star: short the close", "84.60 · stop 85.10 · 1,000 sh"], C.blue, aE * (1 - fade(T, S6, 0.3)));
    }
    /* stage 6: the 2:1 target */
    var aG = fade(T, S6, 0.4);
    if (aG > 0) {
      s += K.hline(G, G.x(FAIL), 990, TGT, C.up, "5 4", 1.4, aG) + K.tag(G, 1000, TGT, "Target 83.60", C.up, aG, "#000");
      var aHit = fade(T, TB[HIT][1], 0.3);
      s += K.dot(G.x(HIT), G.y(TGT), 7, C.up, aHit);
      s += K.callout(G.x(HIT) - 18, G.y(83.42), ["2:1 hit at 83.60", "+1.00 a share = +2R"], C.up, aHit, true);
    }
    return s;
  }
  return { stages: ST, end: END, frame: frame, focus: function (T) { return G.x(Math.max(0, K.lastBar(T, TB))) + 120; } };
});
