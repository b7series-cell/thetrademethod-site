/* =====================================================================
   edge-anim.js — the animated walkthrough on edge.html.
   Needs /js/anim-kit.js first.

   Six scenes, one per idea on the page: four time frames telling the same
   story; catalyst -> setup -> trade, with four ideas screened for the one
   that gets risk; the stop first (49.40 under the higher low, entry 50.00,
   0.60 a share, $300 risk -> 500 shares); the mile-wide what-ifs against
   the inch-wide edge; and ten trades with the same 1R stops: cutting
   winners at +0.5R wins 6 of 10 and loses 1R (-0.1R a trade), holding to
   +2R wins 4 of 10 and makes 2R (+0.2R a trade). All illustrative.
   ===================================================================== */

AnimKit.mount("edge", function (K) {
  var C = K.C, W = K.W, fade = K.fade, txt = K.txt, clamp01 = K.clamp01;
  var S = [0, 5.8, 11.2, 16.2, 20.8, 25.4], END = 29.6;
  var ST = [
    { at: S[0], title: "Read every time frame", text: "Start on the daily, then step down to hourly, 15-minute and 2-minute. You want the same story on each one, here an uptrend with higher lows, not a new pattern on every chart." },
    { at: S[1], title: "Catalyst, setup, trade", text: "Edge needs all three links. Flesh out four ideas: three are missing a link and get cut. Only the one with a catalyst, a setup and a scoped trade gets risk." },
    { at: S[2], title: "Start with your stop", text: "Find where the edge began: the higher low at 49.45. The stop goes just under it at 49.40. Buying 50.00 risks 0.60 a share, so a $300 risk budget buys 500 shares." },
    { at: S[3], title: "An inch wide, miles deep", text: "At the trigger the what-ifs show up: fear, FOMO, greed. That field is a mile wide and an inch deep. Your edge is the opposite: one catalyst, one setup, one read. Stand in that." },
    { at: S[4], title: "Same trades, two mindsets", text: "Ten trades, same entries, same 1R stops. Letting the what-ifs cut winners at +0.5R wins 6 of 10 and still loses 1R. Holding the edge to +2R wins only 4 of 10 and makes +2R." },
    { at: S[5], title: "The math", text: "Expectancy = win rate × average win − loss rate × average loss. Cutting early: 0.6 × 0.5R − 0.4 × 1R = −0.1R a trade. Holding the edge: 0.4 × 2R − 0.6 × 1R = +0.2R a trade." }
  ];
  /* scene opacity: in at its start, out when the next one starts */
  function sc(T, k) { var a = k === 0 ? 1 : fade(T, S[k] + 0.1, 0.4); return k + 1 < S.length ? a * (1 - fade(T, S[k + 1], 0.3)) : a; }
  function g(op, inner) { return op > 0 ? '<g opacity="' + op.toFixed(3) + '">' + inner + "</g>" : ""; }
  function rect(x, y, w, h, fill, stroke, rx, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx == null ? 10 : rx) + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '"' : "") + (extra || "") + "/>"; }
  function check(x, y, ok, op) {
    if (op <= 0) return "";
    return ok ? '<path d="M' + (x - 6) + " " + y + " l4 5 l9 -11" + '" fill="none" stroke="' + C.up + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="' + op.toFixed(3) + '"/>'
      : '<path d="M' + (x - 5) + " " + (y - 6) + " l10 10 M" + (x + 5) + " " + (y - 6) + " l-10 10" + '" stroke="' + C.dn + '" stroke-width="2.4" stroke-linecap="round" opacity="' + op.toFixed(3) + '"/>';
  }

  /* ---------- scene 1: four time frames ---------- */
  var BASE = [[0, 0.10], [1, 0.34], [2, 0.22], [3, 0.50], [4, 0.38], [5, 0.66], [6, 0.53], [7, 0.80], [8, 0.68], [9, 0.94]];
  var TF = [["Daily", "Trending up, higher lows."], ["Hourly", "Same shape, smaller scale."], ["15-minute", "Still the same story."], ["2-minute", "Agreement. This is the read."]];
  function tfPts(k) {           /* the same zigzag, with more small wiggles on each lower time frame */
    var pts = [], sub = k + 1;
    for (var j = 0; j < BASE.length - 1; j++) for (var m = 0; m < sub; m++) {
      var f = m / sub, v = BASE[j][1] + (BASE[j + 1][1] - BASE[j][1]) * f;
      if (m > 0) v += (m % 2 ? 1 : -1) * 0.035;
      pts.push([BASE[j][0] + f, v]);
    }
    pts.push(BASE[BASE.length - 1]);
    return pts;
  }
  var TFP = [0, 1, 2, 3].map(tfPts);
  function scene1(T) {
    var s = "";
    TF.forEach(function (tf, k) {
      var x = 50 + k * 272, y = 64, t0 = 0.3 + k * 1.1, a = fade(T, t0 - 0.2, 0.3), p = clamp01((T - t0) / 1.0);
      if (a <= 0) return;
      var last = k === 3, inner = rect(x, y, 250, 268, "#161617", last ? C.up : "#3a3a3c", 12);
      inner += txt(x + 16, y + 28, tf[0], last ? C.up : C.ink, 15, "start", 700);
      var px = function (u) { return x + 22 + u / 9 * 206; }, py = function (v) { return y + 226 - v * 160; };
      var pts = TFP[k], nShow = 1 + Math.floor(p * (pts.length - 1)), poly = [];
      for (var j = 0; j < nShow; j++) poly.push(px(pts[j][0]).toFixed(1) + "," + py(pts[j][1]).toFixed(1));
      if (p < 1 && nShow < pts.length) {
        var f = p * (pts.length - 1) - (nShow - 1), A = pts[nShow - 1], B = pts[nShow];
        poly.push(px(A[0] + (B[0] - A[0]) * f).toFixed(1) + "," + py(A[1] + (B[1] - A[1]) * f).toFixed(1));
      }
      if (poly.length > 1) inner += '<polyline points="' + poly.join(" ") + '" fill="none" stroke="' + C.ink + '" stroke-width="2" stroke-linejoin="round"/>';
      [2, 4, 6, 8].forEach(function (b) { inner += K.dot(px(BASE[b][0]), py(BASE[b][1]), 4, C.up, fade(T, t0 + b / 9, 0.2), true); });
      inner += txt(x + 16, y + 254, tf[1], last ? C.up : C.dim, 13, "start", last ? 600 : null, fade(T, t0 + 1.0, 0.3));
      s += g(a, inner);
    });
    var a2 = fade(T, 4.7, 0.4);
    s += txt(590, 372, "Uniformity, not noise: every time frame tells the same story", C.gold, 15, "middle", 700, a2);
    var words = [["aggressive", 1], ["passive", 0], ["trending", 1], ["choppy", 0], ["boring", 0], ["a little scary", 0]], xw = 274;
    var a3 = fade(T, 5.0, 0.4);
    if (a3 > 0) {
      var w = "";
      w += txt(xw - 14, 425, "Tape words:", C.faint, 13, "end");
      words.forEach(function (wd) {
        var ww = 22 + wd[0].length * 7.4;
        w += rect(xw, 409, ww.toFixed(0), 24, wd[1] ? "rgba(48,209,88,0.16)" : "transparent", wd[1] ? C.up : "#48484a", 12);
        w += txt(xw + ww / 2, 425, wd[0], wd[1] ? C.up : C.faint, 13, "middle", wd[1] ? 600 : null);
        xw += ww + 10;
      });
      s += g(a3, w);
    }
    return s;
  }

  /* ---------- scene 2: catalyst -> setup -> trade, four ideas screened ---------- */
  var LINKS = [["Catalyst", "The reason others have to act", C.gold], ["Setup", "The price-action combination", C.blue], ["Trade", "The scoped execution", C.up]];
  var IDEAS = [
    { t: ["“Good company,", "due for a bounce”"], m: [0, 0, 0], v: "Cut: a story, not the tape" },
    { t: ["Earnings gap up,", "no pattern yet"], m: [1, 0, 0], v: "Cut: no setup" },
    { t: ["Clean flag, but", "no reason to move"], m: [0, 1, 0], v: "Cut: no catalyst" },
    { t: ["Earnings gap up,", "reclaims the prior high"], m: [1, 1, 1], v: "Take it: all three link" }
  ];
  function scene2(T) {
    var t = T - S[1], s = "";
    LINKS.forEach(function (L, k) {
      var x = 60 + k * 370, a = fade(t, 0.3 + k * 0.4, 0.4);
      s += g(a, rect(x, 56, 320, 84, C.box, L[2], 12) + txt(x + 18, 88, L[0], L[2], 18, "start", 800) + txt(x + 18, 116, L[1], C.dim, 13));
      if (k < 2) s += g(fade(t, 0.5 + k * 0.4, 0.3), '<path d="M' + (x + 330) + " 98 h28 m-8 -6 l8 6 l-8 6" + '" fill="none" stroke="' + C.faint + '" stroke-width="2"/>');
    });
    IDEAS.forEach(function (d, k) {
      var x = 60 + k * 270, y = 176, t0 = 1.6 + k * 0.85, a = fade(t, t0, 0.35), av = fade(t, t0 + 0.55, 0.3);
      if (a <= 0) return;
      var take = k === 3, dim = take ? 1 : 1 - 0.5 * av;
      var inner = rect(x, y, 250, 236, "#161617", take && av > 0 ? C.up : "#3a3a3c", 12, take ? ' stroke-width="' + (1 + av).toFixed(2) + '"' : "");
      inner += txt(x + 16, y + 20, "Idea " + (k + 1), C.faint, 12);
      inner += txt(x + 16, y + 42, d.t[0], C.ink, 14, "start", 600) + txt(x + 16, y + 60, d.t[1], C.ink, 14, "start", 600);
      ["Catalyst", "Setup", "Scoped trade"].forEach(function (lab, r) {
        var yy = y + 96 + r * 30, ar = fade(t, t0 + 0.12 + r * 0.12, 0.2);
        inner += txt(x + 16, yy + 5, lab, C.dim, 13, "start", null, ar) + check(x + 222, yy + 1, d.m[r], ar);
      });
      inner += '<line x1="' + (x + 16) + '" x2="' + (x + 234) + '" y1="' + (y + 188) + '" y2="' + (y + 188) + '" stroke="#3a3a3c"/>';
      inner += txt(x + 16, y + 214, d.v, take ? C.up : C.dn, 13, "start", 700, av);
      s += g(a * dim, inner);
    });
    s += txt(590, 450, "Four ideas fleshed out. One gets risk.", C.gold, 15, "middle", 700, fade(t, 5.0, 0.3));
    return s;
  }

  /* ---------- scene 3: start with your stop ---------- */
  var B3 = [[49.30, 49.70, 49.20, 49.65], [49.65, 50.10, 49.55, 50.00], [50.00, 50.40, 49.90, 50.30], [50.30, 50.45, 49.95, 50.05],
    [50.05, 50.15, 49.70, 49.75], [49.75, 49.85, 49.45, 49.60], [49.60, 49.95, 49.55, 49.90], [49.90, 50.15, 49.85, 50.10],
    [50.10, 50.50, 50.05, 50.45], [50.45, 50.80, 50.35, 50.70]];
  var HL = 5, IN = 7, STOP = 49.40, ENTRY = 50.00, RISK = +(ENTRY - STOP).toFixed(2), BUDGET = 300, SIZE = Math.floor(BUDGET / RISK + 1e-9);
  var G3 = K.geo({ yt: 70, yb: 420, pmin: 48.9, pmax: 51.1, x0: 110, dx: 36 });
  var TB3 = K.timeline(B3.length, [[0, 7, S[2] + 0.4, 0.3], [8, 9, S[2] + 4.0, 0.3]]);
  function scene3(T) {
    var t = T - S[2], s = "", i;
    s += K.grid(G3, 49, 51, 0.5, 80, 470, 72);
    s += txt(80, 50, "Illustrative · 5-minute bars", C.faint, 12);
    for (i = 0; i < B3.length; i++) s += K.candle(G3, i, B3[i], K.progress(T, TB3, i), 18);
    var aH = fade(t, 2.0, 0.3);
    s += K.dot(G3.x(HL), G3.y(B3[HL][2]) + 1, 8, C.up, aH);
    s += txt(G3.x(HL), G3.y(B3[HL][2]) + 30, "higher low 49.45", C.up, 12, "middle", 600, aH);
    var aS = fade(t, 2.4, 0.3), aE = fade(t, 2.9, 0.3);
    s += K.hline(G3, G3.x(HL) - 20, 470, STOP, C.dn, "5 4", 1.5, aS) + K.tag(G3, 480, STOP, "Stop " + STOP.toFixed(2), C.dn, aS, "#fff");
    s += K.hline(G3, G3.x(IN) - 14, 470, ENTRY, C.blue, null, 1.5, aE) + K.tag(G3, 480, ENTRY, "Buy " + ENTRY.toFixed(2), C.blue, aE, "#fff");
    var rows = [
      ["1  Stop " + STOP.toFixed(2), "just under the higher low, where the edge began", C.dn, 2.4],
      ["2  Risk " + RISK.toFixed(2) + " a share", ENTRY.toFixed(2) + " − " + STOP.toFixed(2) + " = " + RISK.toFixed(2), C.blue, 3.0],
      ["3  Size " + SIZE + " shares", "$" + BUDGET + " risk ÷ " + RISK.toFixed(2) + " = " + SIZE, C.up, 3.6]
    ];
    var x = 650;
    s += txt(x, 82, "Stop, then risk, then size", C.ink, 16, "start", 700, fade(t, 2.2, 0.3));
    rows.forEach(function (r, k) {
      var y = 104 + k * 84, a = fade(t, r[3], 0.35);
      s += g(a, rect(x, y, 480, 66, C.box, r[2], 10) + txt(x + 16, y + 27, r[0], r[2], 16, "start", 700) + txt(x + 16, y + 50, r[1], C.dim, 13));
      if (k < 2) s += g(fade(t, r[3] + 0.4, 0.3), '<path d="M' + (x + 40) + " " + (y + 68) + " v14 m-5 -6 l5 6 l5 -6" + '" fill="none" stroke="' + C.faint + '" stroke-width="1.6"/>');
    });
    var aN = fade(t, 4.2, 0.4);
    s += g(aN, rect(x, 368, 480, 54, "rgba(244,185,66,0.10)", C.gold, 10) + txt(x + 16, 391, "Move it on new price action, never on P&amp;L.", C.gold, 14, "start", 700) + txt(x + 16, 410, "A stop set by how the account feels is hope wearing a number.", C.dim, 12));
    return s;
  }

  /* ---------- scene 4: a mile wide, an inch deep ---------- */
  var WHATIF = [["what if it fails?", 190, 112], ["FOMO", 380, 140], ["what if I'm wrong?", 560, 112], ["greed", 740, 140], ["what if it reverses?", 900, 112], ["fear", 1040, 140]];
  function scene4(T) {
    var t = T - S[3], s = "";
    var aB = fade(t, 0.2, 0.4);
    s += g(aB, txt(590, 66, "Fear · FOMO · greed · every “what if”", "#f2a9ae", 15, "middle", 700) + rect(70, 84, 1040, 76, "rgba(255,69,58,0.13)", "rgba(255,69,58,0.55)", 8));
    WHATIF.forEach(function (w, k) { s += txt(w[1], w[2] + 6, w[0], "#f8dfe1", 13, "middle", 600, fade(t, 0.5 + k * 0.28, 0.3) * 0.9); });
    s += txt(70, 186, "A mile wide. An inch deep.", C.dn, 14, "start", 700, fade(t, 2.0, 0.3));
    s += txt(1110, 186, "the surface", C.faint, 12, "end", null, aB);
    var aC = fade(t, 2.2, 0.3), dep = clamp01((t - 2.2) / 1.4), yb = 160 + 290 * dep;
    if (aC > 0) {
      s += '<defs><linearGradient id="edge-col" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#30d158" stop-opacity="0.85"/><stop offset="1" stop-color="#30d158" stop-opacity="0.25"/></linearGradient></defs>';
      s += g(aC, rect(566, 160, 48, (yb - 160).toFixed(1), "url(#edge-col)", C.up, 4));
    }
    var aL = fade(t, 3.0, 0.4);
    s += g(aL, txt(640, 246, "Your edge", C.up, 16, "start", 800) + txt(640, 268, "One catalyst. One setup. One read.", C.dim, 13));
    s += txt(540, 330, "Plant your feet here,", C.ink, 14, "end", 600, fade(t, 3.4, 0.4)) + txt(540, 350, "not in the what-ifs", C.ink, 14, "end", 600, fade(t, 3.4, 0.4));
    s += txt(640, 436, "An inch wide. Miles deep.", C.up, 15, "start", 700, fade(t, 3.6, 0.4));
    return s;
  }

  /* ---------- scenes 5 and 6: ten trades, then the expectancy math ---------- */
  var MILE = [0.5, 0.5, -1, 0.5, -1, 0.5, 0.5, -1, 0.5, -1], INCH = [2, -1, -1, 2, -1, 2, -1, -1, 2, -1], STEP = 0.36, PX = 30;
  function stats(a) { var w = 0, tot = 0, sw = 0; a.forEach(function (r) { tot += r; if (r > 0) { w++; sw += r; } }); return { w: w, tot: tot, aw: sw / w, ev: tot / a.length }; }
  var SM = stats(MILE), SI = stats(INCH);
  function sgn(v) { return (v >= 0 ? "+" : "−") + Math.abs(v); }
  function scene5(T) {
    var t = T - S[4], s = "", X0 = 330;
    [["Cutting winners early", "the what-ifs take +0.5R", MILE, 170, C.gold], ["Standing in the edge", "holds winners to +2R", INCH, 345, C.up]].forEach(function (row, r) {
      var base = row[3], top0 = r ? base - 108 : base - 58, shown = 0, tot = 0, wins = 0, a0 = fade(t, 0.2 + r * 0.2, 0.3);
      s += g(a0, txt(X0 - 10, top0, row[0], row[4], 15, "start", 700) + txt(X0 - 10, top0 + 18, row[1], C.dim, 13) +
        '<line x1="' + (X0 - 10) + '" x2="' + (X0 + 480) + '" y1="' + base + '" y2="' + base + '" stroke="#48484a"/>');
      row[2].forEach(function (v, k) {
        var a = fade(t, 0.6 + (r * 10 + k) * STEP * 0.5, 0.25);
        if (a <= 0) return;
        shown++; tot += v; if (v > 0) wins++;
        var cx = X0 + k * 47, h = Math.abs(v) * PX, top = v > 0 ? base - h : base;
        s += '<rect x="' + cx + '" y="' + top + '" width="40" height="' + h + '" rx="3" fill="' + (v > 0 ? C.up : C.dn) + '" opacity="' + (0.85 * a).toFixed(3) + '"/>';
        s += txt(cx + 20, v > 0 ? top - 6 : top + h + 15, sgn(v) + "R", C.dim, 11, "middle", null, a);
      });
      if (shown) s += txt(X0 + 480, top0, wins + " of " + shown + " won", C.ink, 14, "end", 700) + txt(X0 + 480, top0 + 18, "total " + sgn(tot) + "R", tot >= 0 ? C.up : C.dn, 14, "end", 700);
    });
    s += txt(X0 - 10, 80, "Same ten entries, same 1R stops", C.faint, 13, "start", 600, fade(t, 0.2, 0.3));
    /* the math */
    var a6 = fade(T, S[5] + 0.1, 0.4);
    if (a6 > 0) {
      var y0 = 404, b = rect(X0 - 10, y0, 500, 84, C.box, "rgba(245,245,247,0.25)", 10);
      b += txt(X0 + 6, y0 + 23, "Expectancy = win% × avg win − loss% × avg loss", C.ink, 14, "start", 700);
      b += txt(X0 + 6, y0 + 47, "Cutting early: 0.6 × 0.5R − 0.4 × 1R = " + sgn(+SM.ev.toFixed(2)) + "R a trade", C.gold, 14, "start", 600);
      b += txt(X0 + 6, y0 + 70, "Standing in the edge: 0.4 × 2R − 0.6 × 1R = " + sgn(+SI.ev.toFixed(2)) + "R a trade", C.up, 14, "start", 600);
      s += g(a6, b);
    }
    return s;
  }

  function frame(T) {
    var s = txt(W - 40, 506, "Illustrative", C.faint, 11, "end"), fns = [scene1, scene2, scene3, scene4, scene5];
    for (var k = 0; k < 5; k++) { var a = k === 4 ? fade(T, S[4] + 0.1, 0.4) : sc(T, k); if (a > 0) s += g(a, fns[k](T)); }
    return s;
  }
  function focus(T) {
    if (T < S[1]) return 175 + Math.min(3, Math.max(0, Math.floor((T - 0.3) / 1.1))) * 272 + 60;
    if (T < S[2]) { var k = Math.min(3, Math.max(0, Math.floor((T - S[1] - 1.6) / 0.85))); return 185 + k * 270 + 60; }
    if (T < S[3]) return T < S[2] + 2.2 ? 330 : 890;
    if (T < S[4]) return 650;
    return 628;
  }
  return { stages: ST, end: END, frame: frame, focus: focus };
});
