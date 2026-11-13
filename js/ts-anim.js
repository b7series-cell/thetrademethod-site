/* =====================================================================
   ts-anim.js — the animations on The Strat page.

   1. [data-ts-anim]  one weekly 2-1-2 down reversal, start to finish, in
      eight stages: number every weekly bar (1, 2 up, 2 down, 3) → the
      broadening formation and its other side → Sunday night: an inside
      week at the top, a setup and not yet evidence → Monday: the ETF
      and 7 of 8 holdings break last week's low inside the first hour
      (the simultaneous break) → in force, full time frame continuity
      down → short a penny under the low, stop just above this week's
      high → walk the stop down above each lower daily high → the other
      side of the formation. A weekly panel sits beside the 60-minute
      chart, and this week's weekly candle grows as the hourly bars print.
   2. [data-ts-quiz]  "Name the bar": a previous bar and a new one; pick
      1, 2 up, 2 down or 3. Color never decides it.
   3. [data-ts-tfc]   time frame continuity from the four opens.
   4. [data-ts-calc]  the break level, the stop past this week's
      extreme, the size and the R to the other side.
   5. [data-ts-steps] the six steps as a click-through stepper with a
      small chart that lights up the part each step is about.

   Like av-anim.js the walkthrough redraws for the space it has: under
   640px of drawing width it uses a tall, narrow layout with larger text.
   The bars are scripted and labelled "Illustrative". No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#22d3ee", gold: "#f4b942", orange: "#ff9f0a", purple: "#bf5af2",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e", one: "#8e8e93", three: "#bf5af2" };
  var FS = 1;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function txt(x, y, s, col, size, anchor, weight, op) {
    if (op != null && op <= 0) return "";
    return '<text x="' + (+x).toFixed(1) + '" y="' + (+y).toFixed(1) + '" fill="' + col + '" font-size="' + ((size || 13) * FS).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  function hl(x1, x2, y, col, dash, w, op) {
    if (op != null && op <= 0) return "";
    return '<line x1="' + x1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function vl(x, y1, y2, col, dash, w, op) {
    if (op != null && op <= 0) return "";
    return '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + y1.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function seg(x1, y1, x2, y2, col, w, op, dash) {
    if (op != null && op <= 0) return "";
    return '<line x1="' + x1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y1="' + y1.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '" stroke-linecap="round"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function rect(x, y, w, h, fill, op, stroke, rx) {
    if (op <= 0) return "";
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '"' + (rx ? ' rx="' + rx + '"' : "") + ' fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="1.4"' : "") + ' opacity="' + op.toFixed(3) + '"/>';
  }
  function ring(x, y, r, col, w, op) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2) + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function dot(x, y, r, col, op) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + col + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function poly(pts, col, w, op, dash) {
    if (pts.length < 2 || (op != null && op <= 0)) return "";
    return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function callout(x, y, lines, col, op) {
    if (op <= 0) return "";
    var w = 18 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z#0-9]+;/g, "x").length; })) * 7.2 * FS, h = 10 + lines.length * 18 * FS;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt(x + 10, y + 21 * FS + k * 18 * FS, ln, k === 0 ? col : C.dim, 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  /* where a bar is after `prog` of its print: open → first extreme → second extreme → close */
  function partial(b, prog) {
    var o = b[0], h = b[1], l = b[2], c = b[3];
    if (prog >= 1) return { hi: h, lo: l, cur: c };
    var pth = c >= o ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = pth[idx] + (pth[idx + 1] - pth[idx]) * f, hi = o, lo = o;
    for (var k = 0; k <= idx; k++) { hi = Math.max(hi, pth[k]); lo = Math.min(lo, pth[k]); }
    return { hi: Math.max(hi, cur), lo: Math.min(lo, cur), cur: cur };
  }
  function candle(x, yf, b, prog, wBody, op, paint) {
    if (prog <= 0) return "";
    var o = b[0], p = partial(b, prog);
    var col = paint || (p.cur >= o ? C.up : C.dn), top = yf(Math.max(o, p.cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(p.cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + yf(p.hi).toFixed(1) + '" y2="' + yf(p.lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.3"/>' +
      '<rect x="' + (x - wBody / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wBody.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  function tag(xTag, y, label, col, op, ink) {
    if (op <= 0) return "";
    var w = (label.length * 7 + 16) * FS, h = 20 * FS;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xTag.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="' + col + '"/>' +
      txt(xTag + 8 * FS, y + 4.5 * FS, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function f2(v) { return v.toFixed(2); }

  /* the bar's number against the bar before it: the only four outcomes */
  function scen(p, b) {
    var up = b[1] > p[1], dn = b[2] < p[2];
    return up && dn ? "3" : up ? "2U" : dn ? "2D" : "1";
  }
  function scenCol(s) { return s === "2U" ? C.up : s === "2D" ? C.dn : s === "3" ? C.three : C.one; }
  function scenTxt(s) { return s === "2U" ? "2&#8593;" : s === "2D" ? "2&#8595;" : s; }

  /* ---------------------------------------------------------------------
     The bars. Weekly [o,h,l,c] for eleven finished weeks of a made-up
     sector ETF, then this week, Monday to Friday, on 60-minute bars.
     --------------------------------------------------------------------- */
  var WEEKS = [
    [296.0, 300.2, 292.4, 298.1],
    [298.1, 303.0, 294.0, 301.8],   // 2 up
    [301.8, 302.4, 291.0, 292.6],   // 2 down
    [292.6, 298.5, 292.0, 297.2],   // 1
    [297.2, 306.8, 289.4, 293.0],   // 3
    [293.0, 309.5, 292.0, 307.9],   // 2 up
    [307.9, 309.0, 291.0, 292.5],   // 2 down
    [292.5, 294.8, 285.0, 288.6],   // 2 down, the lowest low
    [288.6, 306.6, 287.2, 306.0],   // 2 up
    [306.0, 318.6, 301.0, 304.2],   // 2 up, red, the highest high
    [304.2, 312.4, 301.8, 305.0]    // 1: last week, inside
  ];
  var NW = WEEKS.length;
  var LWH = WEEKS[NW - 1][1], LWL = WEEKS[NW - 1][2];
  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  var BARS = [
    [303.9, 304.6, 301.2, 301.6], [301.6, 302.1, 300.4, 300.7], [300.7, 301.5, 300.2, 301.2], [301.2, 301.6, 299.8, 300.0],
    [300.0, 300.5, 299.1, 299.4], [299.4, 299.9, 298.6, 298.9], [298.9, 299.3, 298.4, 299.0],
    [298.6, 299.0, 297.6, 297.9], [297.9, 298.8, 297.7, 298.6], [298.6, 299.7, 298.3, 299.5], [299.5, 300.4, 299.1, 300.2],
    [300.2, 300.9, 299.8, 300.0], [300.0, 300.6, 299.6, 300.4], [300.4, 300.7, 300.0, 300.2],
    [300.0, 300.6, 298.9, 299.1], [299.1, 299.4, 297.5, 297.8], [297.8, 298.2, 296.6, 296.9], [296.9, 297.6, 296.4, 297.3],
    [297.3, 297.5, 295.6, 295.9], [295.9, 296.3, 295.0, 295.4], [295.4, 295.7, 294.8, 295.1],
    [295.0, 296.2, 294.6, 295.8], [295.8, 296.0, 293.9, 294.2], [294.2, 294.6, 292.5, 292.8], [292.8, 293.6, 292.2, 293.3],
    [293.3, 293.5, 291.4, 291.7], [291.7, 292.0, 290.6, 290.9], [290.9, 291.2, 289.9, 290.4],
    [290.6, 291.9, 290.2, 291.6], [291.6, 291.8, 290.4, 290.6], [290.6, 290.9, 288.9, 289.2], [289.2, 289.6, 287.8, 288.0],
    [288.0, 288.4, 286.6, 286.9], [286.9, 287.3, 284.9, 285.6], [285.6, 286.6, 285.3, 286.2]
  ];
  var N = BARS.length, PER = 7;
  function dayOf(i) { return Math.floor(i / PER); }
  var DAYBAR = [0, 1, 2, 3, 4].map(function (d) {
    var s = BARS.slice(d * PER, d * PER + PER);
    return [s[0][0], Math.max.apply(null, s.map(function (b) { return b[1]; })), Math.min.apply(null, s.map(function (b) { return b[2]; })), s[PER - 1][3]];
  });
  var THIS_WEEK = [BARS[0][0], Math.max.apply(null, BARS.map(function (b) { return b[1]; })), Math.min.apply(null, BARS.map(function (b) { return b[2]; })), BARS[N - 1][3]];

  var ENTRY = Math.round((LWL - 0.01) * 100) / 100;          // 301.79
  var STOP = Math.round((DAYBAR[0][1] + 0.01) * 100) / 100;  // 304.61, just above this week's high
  var RISK = Math.round((STOP - ENTRY) * 100) / 100;          // 2.82
  var TARGET = WEEKS[7][2];                                   // 285.00, the other side
  var WIN = Math.round((ENTRY - TARGET) * 100) / 100;         // 16.79
  var RMULT = WIN / RISK;
  var HIT = (function () { for (var i = 0; i < N; i++) if (BARS[i][2] <= TARGET) return i; return N - 1; })();
  /* the stop walks down above each lower daily high */
  var STOPS = [STOP];
  for (var d = 1; d < 5; d++) STOPS[d] = Math.min(STOPS[d - 1], Math.round((DAYBAR[d][1] + 0.01) * 100) / 100);
  var OPENS = { Q: 306.00, M: 304.20, W: BARS[0][0] };
  /* the formation: highs from week 4 to week 9, lows from week 2 to week 7 */
  var UP = [4, 9], LO = [2, 7];
  /* the eight holdings and when each breaks last week's low on Monday (the 8th never does) */
  var TILES = [
    { n: "Chip 1", t: "9:38", at: 10.5 }, { n: "Chip 2", t: "9:44", at: 10.8 }, { n: "Chip 3", t: "9:51", at: 11.15 }, { n: "Chip 4", t: "9:55", at: 11.4 },
    { n: "Chip 5", t: "10:03", at: 11.65 }, { n: "Chip 6", t: "10:12", at: 11.9 }, { n: "Chip 7", t: "10:21", at: 12.15 }, { n: "Chip 8", t: "", at: 1e9 }
  ];
  var NBROKE = TILES.filter(function (t) { return t.at < 1e8; }).length;

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ts-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;

    var STAGES = [
      { at: 0,    title: "Price can only do three things", text: "From one bar to the next, price can stay inside the last bar's range (a 1), take out one side of it (a 2 up or a 2 down), or take out both sides (a 3). Number every weekly bar. Look at the red bar near the top: it took out the high, so it's a 2 up. Color doesn't decide it, the break does." },
      { at: 3.8,  title: "The broadening formation", text: "Every 3 is a broadening formation, and so is this chart: higher highs and lower lows. Draw it right to left. Price is at the top, where everyone has already bought. If it turns here, the target is the other side of the range, the lowest low that got taken out: " + f2(TARGET) + "." },
      { at: 6.6,  title: "Sunday night: a setup, not evidence", text: "Last week was an inside week, a 1, right under the top. One break of its low makes a 2-1-2 down reversal. Mark last week's low, " + f2(LWL) + ". Eight big holdings in the sector show the same picture. It's a setup. Nothing has happened yet." },
      { at: 9.0,  title: "Monday: the simultaneous break", text: "Monday pops to " + f2(DAYBAR[0][1]) + ", then rolls over. Inside the first hour the ETF and " + NBROKE + " of the 8 holdings break last week's low at the same time. Retail traders can't do that together. It's one big order split across the group: the algorithms just turned on." },
      { at: 12.8, title: "In force, and every group is selling", text: "In force means it trades through last week's low and stays there: it retests " + f2(LWL) + " from below and fails. Price is under the quarter, month, week and day opens: full time frame continuity down. Everyone we know is a seller." },
      { at: 15.4, title: "The stop: just above this week's high", text: "Short " + f2(ENTRY) + ", a penny under last week's low. At worst, the stop goes just above this week's high: " + f2(STOP) + ", " + f2(RISK) + " of risk. If the algorithms really are selling, it should go right away. There's no need to risk the other side of the whole bar." },
      { at: 17.8, title: "Walk the stop down", text: "Tuesday is a green 2 down: it took out Monday's low, then bounced. That's profit taking, not buying, and the day group turns green for a while. Each day makes a lower high, so walk the stop down above it. Wednesday, 2 down. Thursday, 2 down. They have more to sell." },
      { at: 24.2, title: "To the other side", text: "Friday bounces, then turns back down: another place to add. It tags " + f2(TARGET) + ", the other side of the formation: +" + f2(WIN) + " a share, about " + RMULT.toFixed(1) + "R. The week closes a 2 down, and the 2-1-2 down reversal is done." }
    ];
    var TW = WEEKS.map(function (w, i) { return [0.3 + i * 0.24, 0.3 + i * 0.24 + 0.22]; });
    var TB = [];
    function segT(a, b, t0, step, dur) { for (var i = a; i <= b; i++) TB[i] = [t0 + (i - a) * step, t0 + (i - a) * step + dur]; }
    TB[0] = [9.3, 12.3];
    segT(1, 6, 12.9, 0.35, 0.3);
    segT(7, 27, 18.0, 0.28, 0.24);
    segT(28, N - 1, 24.4, 0.32, 0.28);
    var END = TB[N - 1][1] + 1.6;
    function prog(i, T) { return clamp01((T - TB[i][0]) / (TB[i][1] - TB[i][0])); }
    /* days whose last bar has finished printing */
    /* where price is right now */
    function now(T) {
      var last = -1; for (var i = 0; i < N; i++) if (T >= TB[i][0]) last = i;
      if (last < 0) return null;
      var hi = -1e9, lo = 1e9;
      for (var j = 0; j <= last; j++) { var p = partial(BARS[j], prog(j, T)); hi = Math.max(hi, p.hi); lo = Math.min(lo, p.lo); if (j === last) var cur = p.cur; }
      return { i: last, cur: cur, hi: hi, lo: lo };
    }

    function size(n) {
      return n ? { W: 440, H: 1110, wx0: 14, wx1: 330, wyt: 190, wyb: 400, wTag: 334, bx0: 14, bx1: 426, by: 436, bh: 44, rows: 2, sy: 590, x0: 14, x1: 330, yt: 680, yb: 1040, xTag: 334, cx: 14, cy: 14 }
               : { W: 1180, H: 620, wx0: 24, wx1: 270, wyt: 232, wyb: 556, wTag: 276, bx0: 380, bx1: 1172, by: 16, bh: 50, rows: 1, sy: 118, x0: 380, x1: 1040, yt: 162, yb: 556, xTag: 1046, cx: 24, cy: 14 };
    }
    var WMIN = 282.5, WMAX = 320.5, PMIN = 283.2, PMAX = 306.4;

    function frame(T, L) {
      var s = "", k, i;
      var P = now(T);
      /* ---- the weekly panel ---- */
      var nwk = NW + 1, wdx = (L.wx1 - L.wx0) / (nwk + 0.4), wwB = Math.max(4, wdx * 0.56);
      function wx(i) { return L.wx0 + wdx * (i + 0.5); }
      function wy(p) { return L.wyb - (p - WMIN) / (WMAX - WMIN) * (L.wyb - L.wyt); }
      s += txt(L.wx0, L.wyt - 30 * FS, "Weekly · a sector ETF", C.faint, 12);
      for (i = 0; i < NW; i++) {
        var pw = clamp01((T - TW[i][0]) / (TW[i][1] - TW[i][0]));
        if (pw <= 0) continue;
        s += candle(wx(i), wy, WEEKS[i], pw, wwB);
        if (i > 0 && pw >= 1) {
          var sc = scen(WEEKS[i - 1], WEEKS[i]);
          var yl = sc === "2D" ? wy(WEEKS[i][2]) + 16 * FS : wy(WEEKS[i][1]) - 8;
          s += txt(wx(i), yl, scenTxt(sc), scenCol(sc), 11.5, "middle", 700, fade(T, TW[i][1], 0.25) * (T > 3.8 && i !== NW - 1 && i !== 9 ? 0.55 : 1));
        }
      }
      /* this week's weekly candle grows with the hourly bars */
      if (P) {
        var cw = [BARS[0][0], P.hi, P.lo, P.cur];
        s += candle(wx(NW), wy, cw, 1, wwB);
        var scw = scen(WEEKS[NW - 1], cw);
        if (P.lo < LWL) s += txt(wx(NW), wy(P.lo) + 16 * FS, scenTxt(scw), scenCol(scw), 11.5, "middle", 700);
        else s += txt(wx(NW), wy(P.hi) - 8, "?", C.faint, 11.5, "middle", 700);
      }
      /* the red 2 up */
      s += ring(wx(9), wy(WEEKS[9][1]) - 13 * FS, 13 * FS, C.up, 1.6, fade(T, 2.6, 0.3) * (1 - fade(T, 3.8, 0.3)));
      /* the formation */
      var fo = fade(T, 4.0, 0.6);
      if (fo > 0) {
        var ux0 = wx(UP[0]), uy0 = wy(WEEKS[UP[0]][1]), ux1 = wx(UP[1]), uy1 = wy(WEEKS[UP[1]][1]);
        var lx0 = wx(LO[0]), ly0 = wy(WEEKS[LO[0]][2]), lx1 = wx(LO[1]), ly1 = wy(WEEKS[LO[1]][2]);
        var xe = wx(NW) + wdx * 0.4;
        function ext(x0, y0, x1, y1, xx) { return y0 + (y1 - y0) * (xx - x0) / (x1 - x0); }
        var xs = wx(1);
        s += seg(xs, Math.max(L.wyt - 6, ext(ux0, uy0, ux1, uy1, xs)), xe, Math.max(L.wyt - 6, ext(ux0, uy0, ux1, uy1, xe)), C.gold, 2, fo, "6 4");
        s += seg(xs, Math.min(L.wyb, ext(lx0, ly0, lx1, ly1, xs)), xe, Math.min(L.wyb, ext(lx0, ly0, lx1, ly1, xe)), C.gold, 2, fo, "6 4");
        s += dot(ux0, uy0, 3.5, C.gold, fo) + dot(ux1, uy1, 3.5, C.gold, fo) + dot(lx0, ly0, 3.5, C.gold, fo) + dot(lx1, ly1, 3.5, C.gold, fo);
        s += txt(wx(5), wy(WEEKS[9][1]) - 2, L.narrow ? "broadening" : "broadening formation", C.gold, 11.5, "middle", 600, fo);
      }
      var to = fade(T, 4.8, 0.5);
      s += hl(wx(LO[1]), L.wx1 + 2, wy(TARGET), C.cyan, "3 4", 1.6, to);
      s += tag(L.wTag, wy(TARGET), f2(TARGET), C.cyan, to);
      s += txt(L.wTag, wy(TARGET) + 26 * FS, "the other side", C.cyan, 11.5, "start", 600, to);
      s += hl(wx(NW - 1) - wdx * 0.5, L.wx1 + 2, wy(LWL), C.ink, "2 3", 1.2, fade(T, 6.8, 0.4) * 0.8);

      /* ---- the holdings board ---- */
      var bo = fade(T, 7.2, 0.5);
      if (bo > 0) {
        var per = 8 / L.rows, gap = 6, tw = (L.bx1 - L.bx0 - gap * (per - 1)) / per;
        TILES.forEach(function (t, j) {
          var r = Math.floor(j / per), c = j % per, x = L.bx0 + c * (tw + gap), y = L.by + r * (L.bh + gap);
          var on = T >= t.at, fl = on ? fade(T, t.at, 0.25) : 0;
          var stroke = on ? C.dn : (j === 7 && T >= 12.6 ? C.faint : "#3a3a3c");
          s += rect(x, y, tw, L.bh, on ? "#3a1a1c" : "#262628", bo, stroke, 8);
          s += txt(x + 10, y + 19 * FS, t.n, on ? C.ink : C.dim, 12.5, "start", 600, bo);
          var sub = on ? "broke " + t.t : (T >= 12.6 && j === 7 ? "held" : (T >= 9.0 ? "watching" : "inside week"));
          s += txt(x + 10, y + 36 * FS, sub, on ? C.dn : C.faint, 11, "start", on ? 700 : null, bo);
          if (fl > 0 && fl < 1) s += rect(x - 3, y - 3, tw + 6, L.bh + 6, "none", 1 - fl, C.dn, 10);
        });
        var nb = TILES.filter(function (t) { return T >= t.at; }).length;
        if (T >= 9.0) {
          var lbl = nb + " of 8 broke last week's low" + (nb >= NBROKE ? " · first hour" : "");
          s += txt(L.narrow ? L.bx0 : L.bx1, L.by + L.rows * (L.bh + gap) + 14 * FS, lbl, nb ? C.dn : C.faint, 12, L.narrow ? "start" : "end", 700, bo);
        } else {
          s += txt(L.narrow ? L.bx0 : L.bx1, L.by + L.rows * (L.bh + gap) + 14 * FS, "Eight big holdings · Sunday night", C.faint, 12, L.narrow ? "start" : "end", null, bo);
        }
      }

      /* ---- time frame continuity strip ---- */
      var so = fade(T, 12.9, 0.5);
      if (so > 0 && P) {
        var dOpen = BARS[dayOf(P.i) * PER][0];
        var opens = [["Quarter", OPENS.Q], ["Month", OPENS.M], ["Week", OPENS.W], ["Day", dOpen]];
        var all = opens.every(function (o) { return P.cur < o[1]; }), allUp = opens.every(function (o) { return P.cur > o[1]; });
        var sx = L.narrow ? L.bx0 : L.x0, sw = (L.narrow ? 300 : 470);
        opens.forEach(function (o, j) {
          var below = P.cur < o[1], x = sx + j * (sw / 4);
          s += dot(x + 7, L.sy, 6.5, below ? C.dn : C.up, so);
          s += txt(x + 19, L.sy + 4.5 * FS, o[0] + (L.narrow ? "" : " " + f2(o[1])), C.dim, 11.5, "start", null, so);
        });
        s += txt(L.narrow ? L.bx0 : L.bx1, L.sy + (L.narrow ? 26 * FS : 4.5 * FS), all ? "Full time frame continuity: down" : allUp ? "Full time frame continuity: up" : "Mixed: the day group is buying",
                 all ? C.dn : C.gold, 12.5, L.narrow ? "start" : "end", 700, so);
      }

      /* ---- the 60-minute chart ---- */
      var dx = (L.x1 - L.x0) / N, wB = Math.max(3, dx * 0.58);
      function x(i) { return L.x0 + dx * (i + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      s += txt(L.x0, L.yt - 14 * FS, "60-minute · this week", C.faint, 12);
      for (var dd = 0; dd < 5; dd++) {
        var xd = L.x0 + dx * dd * PER;
        if (dd > 0) s += vl(xd, L.yt, L.yb + 6, "#2c2c2e");
        s += txt(xd + dx * PER / 2, L.yb + 22 * FS, DAYS[dd], C.faint, 11.5, "middle");
      }
      /* last week's levels and the target */
      var lo2 = fade(T, 6.8, 0.4);
      s += hl(L.x0, L.x1, y(LWL), C.ink, "5 4", 1.4, lo2 * (T >= 15.4 ? 0.5 : 1));
      s += tag(L.xTag, y(LWL), (L.narrow ? "" : "last wk low ") + f2(LWL), C.ink, lo2 * (1 - fade(T, 15.4, 0.3)));
      s += txt(L.x1, L.yt + 4, "last week's high " + f2(LWH) + " &#8593;", C.faint, 11, "end", null, lo2);
      s += hl(L.x0, L.x1, y(TARGET), C.cyan, "3 4", 1.6, fade(T, 6.8, 0.4));
      s += tag(L.xTag, y(TARGET), (L.narrow ? "" : "target ") + f2(TARGET), C.cyan, fade(T, 6.8, 0.4));
      /* candles */
      for (i = 0; i < N; i++) {
        var pr = prog(i, T);
        if (pr <= 0) continue;
        s += candle(x(i), y, BARS[i], pr, wB);
      }
      /* the break */
      if (T >= 11.0) {
        var bo2 = fade(T, 11.0, 0.3) * (1 - fade(T, 15.4, 0.4));
        s += ring(x(0), y(LWL), 12, C.dn, 2.2, bo2);
      }
      /* in force: the retest from below fails */
      s += ring(x(2), y(BARS[2][1]), 9, C.gold, 2, fade(T, 13.8, 0.3) * (1 - fade(T, 15.4, 0.3)));
      s += txt(x(2) + 14, y(BARS[2][1]) - 12 * FS, "retest fails", C.gold, 11.5, "start", 700, fade(T, 13.8, 0.3) * (1 - fade(T, 15.4, 0.3)));
      /* entry and the walking stop */
      var eo = fade(T, 15.6, 0.4);
      if (eo > 0) {
        s += hl(x(0) - dx * 0.5, L.x1, y(ENTRY), C.ink, null, 1.6, eo);
        s += tag(L.xTag, y(ENTRY), (L.narrow ? "short " : "short ") + f2(ENTRY), C.ink, eo);
        var pts = [], cur = STOP, last = P ? P.i : 0;
        for (var b = 0; b <= Math.max(last, PER - 1); b++) {
          var stp = STOPS[Math.max(0, dayOf(b) - 1)];
          pts.push((x(b) - dx * 0.5).toFixed(1) + "," + y(stp).toFixed(1), (x(b) + dx * 0.5).toFixed(1) + "," + y(stp).toFixed(1));
          cur = stp;
        }
        s += poly(pts, C.dn, 2.2, eo);
        s += tag(L.xTag, y(cur), "stop " + f2(cur), C.dn, eo);
      }
      /* the hit */
      var ho = T >= TB[HIT][0] + (TB[HIT][1] - TB[HIT][0]) * 0.67 ? fade(T, TB[HIT][1] - 0.1, 0.3) : 0;
      s += ring(x(HIT), y(TARGET), 11, C.cyan, 2.2, ho);

      /* ---- the callouts ---- */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["Only three things", "1 · inside the last bar", "2&#8593; or 2&#8595; · takes one side", "3 · takes both sides"], C.ink, fade(T, 0.4, 0.3) * (1 - fade(T, 3.8, 0.3)));
      s += callout(cx, cy, ["The broadening formation", "Higher highs, lower lows", "At the top: a crowded trade", "Target: the other side, " + f2(TARGET)], C.gold, fade(T, 4.0, 0.3) * (1 - fade(T, 6.6, 0.3)));
      s += callout(cx, cy, ["Sunday night: a 2-1 at the top", "Last week: an inside bar (a 1)", "Its low: " + f2(LWL), "A setup, not evidence yet"], C.dim, fade(T, 6.8, 0.3) * (1 - fade(T, 9.0, 0.3)));
      s += callout(cx, cy, ["Monday: simultaneous break", "The ETF and " + NBROKE + " of 8 holdings", "take last week's low together:", "the algorithms turned on"], C.dn, fade(T, 11.2, 0.3) * (1 - fade(T, 12.8, 0.3)));
      s += callout(cx, cy, ["In force, every group selling", "Stays under " + f2(LWL), "Under all four opens:", "full time frame continuity down"], C.dn, fade(T, 13.0, 0.3) * (1 - fade(T, 15.4, 0.3)));
      s += callout(cx, cy, ["Short " + f2(ENTRY), "Stop just above this week's high:", f2(STOP) + " · risk " + f2(RISK), "It should go right away"], C.ink, fade(T, 15.6, 0.3) * (1 - fade(T, 17.8, 0.3)));
      s += callout(cx, cy, ["Walk the stop down", "Tuesday: a green 2&#8595; (profit taking)", "Each lower daily high: stop above it", "Wed 2&#8595; · Thu 2&#8595; · still selling"], C.orange, fade(T, 18.0, 0.3) * (1 - fade(T, 24.2, 0.3)));
      s += callout(cx, cy, ["The other side: " + f2(TARGET), "+" + f2(WIN) + " a share · about " + RMULT.toFixed(1) + "R", "The week closes a 2&#8595;:", "the 2-1-2 down reversal"], C.cyan, fade(T, 24.4, 0.3));
      s += txt(L.W - 8, L.H - 6, "Illustrative · made-up bars", C.faint, 11, "end");
      return s;
    }
    var svg = root.querySelector("svg");
    var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
    var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay"), chips = root.querySelector(".anim-chips");
    var box = root.querySelector(".anim-scroll") || svg.parentNode;
    var T = END, playing = false, lastNow = 0, raf = 0, shown = -1, L = null;
    function layout() {
      var narrow = box.clientWidth > 0 && box.clientWidth < NARROW_BELOW;
      if (L && L.narrow === narrow) return false;
      L = size(narrow); L.narrow = narrow;
      svg.setAttribute("viewBox", "0 0 " + L.W + " " + L.H);
      root.classList.toggle("is-narrow", narrow);
      return true;
    }
    function stageAt(t) { var k = 0; STAGES.forEach(function (s, i) { if (t >= s.at) k = i; }); return k; }
    function caption() {
      var k = stageAt(T);
      if (k === shown) return;
      shown = k;
      cap.n.textContent = (k + 1) + " / " + STAGES.length;
      cap.t.textContent = STAGES[k].title;
      cap.b.textContent = STAGES[k].text;
      chips.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-current", i === k ? "step" : "false"); });
    }
    function draw() { FS = L.narrow ? 1.18 : 1; svg.innerHTML = '<rect width="' + L.W + '" height="' + L.H + '" fill="' + C.bg + '"/>' + frame(T, L); caption(); }
    function tick(t) {
      if (!playing) return;
      T += Math.min(0.1, (t - lastNow) / 1000); lastNow = t;
      if (T >= END) { T = END; setPlaying(false); }
      draw();
      if (playing) raf = requestAnimationFrame(tick);
    }
    function setPlaying(on) {
      playing = on;
      btnPlay.textContent = on ? "Pause" : (T >= END ? "Play" : "Resume");
      btnPlay.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) { lastNow = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    }
    chips.innerHTML = STAGES.map(function (s, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + ". " + s.title + "</button>"; }).join("");
    btnPlay.addEventListener("click", function () { if (playing) { setPlaying(false); return; } if (T >= END) T = 0; setPlaying(true); });
    btnReplay.addEventListener("click", function () { T = 0; draw(); setPlaying(true); });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var k = +b.getAttribute("data-i");
      if (REDUCED) { T = k + 1 < STAGES.length ? STAGES[k + 1].at - 0.01 : END; draw(); return; }
      T = STAGES[k].at; draw(); setPlaying(true);
    });
    layout(); draw();
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (layout()) draw(); }, 120); });
    if (!REDUCED && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); T = 0; draw(); setPlaying(true); }
      }, { threshold: 0.4 });
      io.observe(svg.parentNode || svg);
    }
    window.TSAnim = { seek: function (t) { setPlaying(false); T = t; draw(); }, END: END,
                      _levels: { LWL: LWL, ENTRY: ENTRY, STOP: STOP, RISK: RISK, TARGET: TARGET, WIN: WIN, RMULT: RMULT, STOPS: STOPS, HIT: HIT, DAYBAR: DAYBAR, THIS_WEEK: THIS_WEEK,
                                 labels: WEEKS.map(function (w, i) { return i ? scen(WEEKS[i - 1], w) : ""; }).concat([scen(WEEKS[NW - 1], THIS_WEEK)]),
                                 days: DAYBAR.map(function (b, i) { return i ? scen(DAYBAR[i - 1], b) : ""; }) } };   // exposed for testing
  })();

  /* =====================================================================
     2. Name the bar
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ts-quiz]");
    if (!root) return;
    var svg = root.querySelector("svg"), out = root.querySelector(".ts-qout"), score = root.querySelector(".ts-qscore");
    var btns = root.querySelectorAll("[data-a]"), nextB = root.querySelector(".ts-qnext");
    var right = 0, tries = 0, cur = null, answered = false;
    /* a few fixed ones first (the red 2 up, the green 2 down, a 3, a 1), then random */
    var FIXED = [
      { p: [100, 104, 96, 102], b: [104.6, 105.2, 99.4, 99.8] },   // red 2 up
      { p: [100, 104, 96, 98],  b: [96.4, 99.6, 95.2, 99.2] },     // green 2 down
      { p: [100, 103, 97, 101], b: [101, 104.2, 95.8, 97] },       // 3
      { p: [100, 104.5, 95.5, 98], b: [98.2, 102.6, 97.1, 101.8] } // 1
    ];
    var n = 0;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function make() {
      if (n < FIXED.length) return FIXED[n++];
      n++;
      var p = [100, 100 + rnd(2.5, 5), 100 - rnd(2.5, 5), 0]; p[3] = rnd(p[2] + 0.5, p[1] - 0.5);
      var k = ["1", "2U", "2D", "3"][Math.floor(Math.random() * 4)];
      var h = k === "2U" || k === "3" ? p[1] + rnd(0.4, 2.5) : p[1] - rnd(0.4, 1.6);
      var l = k === "2D" || k === "3" ? p[2] - rnd(0.4, 2.5) : p[2] + rnd(0.4, 1.6);
      var o = rnd(l + 0.3, h - 0.3), c = rnd(l + 0.2, h - 0.2);
      if (Math.random() < 0.5) { if (k === "2U" && c > o) { var t = o; o = c; c = t; } if (k === "2D" && c < o) { var t2 = o; o = c; c = t2; } }
      return { p: p, b: [o, h, l, c] };
    }
    function draw(reveal) {
      var p = cur.p, b = cur.b, mn = Math.min(p[2], b[2]) - 1.5, mx = Math.max(p[1], b[1]) + 1.5;
      function y(v) { return 196 - (v - mn) / (mx - mn) * 172; }
      var s = '<rect width="360" height="220" rx="14" fill="#141416"/>';
      s += hl(40, 330, y(p[1]), "#636366", "4 4", 1.2) + hl(40, 330, y(p[2]), "#636366", "4 4", 1.2);
      s += '<text x="330" y="' + (y(p[1]) - 6).toFixed(1) + '" fill="#86868b" font-size="11" text-anchor="end">last bar\'s high</text>';
      s += '<text x="330" y="' + (y(p[2]) + 15).toFixed(1) + '" fill="#86868b" font-size="11" text-anchor="end">last bar\'s low</text>';
      s += candle(120, y, p, 1, 34, 0.55);
      s += candle(220, y, b, 1, 34);
      s += '<text x="120" y="214" fill="#86868b" font-size="12" text-anchor="middle">last bar</text><text x="220" y="214" fill="#f5f5f7" font-size="12" text-anchor="middle" font-weight="600">this bar</text>';
      if (reveal) {
        var k = scen(p, b);
        if (b[1] > p[1]) s += ring(220, y(b[1]), 8, C.up, 2);
        if (b[2] < p[2]) s += ring(220, y(b[2]), 8, C.dn, 2);
        s += '<text x="290" y="' + (y((b[1] + b[2]) / 2) + 8).toFixed(1) + '" fill="' + scenCol(k) + '" font-size="26" font-weight="800" text-anchor="middle">' + scenTxt(k) + "</text>";
      }
      svg.innerHTML = s;
    }
    var NAME = { "1": "a 1, an inside bar", "2U": "a 2 up", "2D": "a 2 down", "3": "a 3, an outside bar" };
    function why(k, b) {
      var col = b[3] >= b[0] ? "green" : "red";
      if (k === "2U") return "It took out the last bar's high and not the low. It closed " + col + (col === "red" ? ", and it's still a 2 up: color doesn't decide it, the break does. A red 2 up has until its close to become a 3 down." : ".");
      if (k === "2D") return "It took out the last bar's low and not the high. It closed " + col + (col === "green" ? ", and it's still a 2 down: the break decides it, not the color." : ".");
      if (k === "3") return "It took out both the high and the low: a higher high and a lower low in one bar. Every 3 is a broadening formation.";
      return "It stayed inside the last bar's range, neither side taken. Inside bars are where 2-1-2 reversals and continuations start.";
    }
    function next() {
      cur = make(); answered = false; draw(false);
      out.className = "chk-out ts-qout"; out.innerHTML = "<b>Is it a 1, a 2 up, a 2 down or a 3?</b><p>Look at the break, not the color.</p>";
      btns.forEach(function (b) { b.disabled = false; b.classList.remove("is-right", "is-wrong"); });
      nextB.hidden = true;
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        if (answered) return;
        answered = true; tries++;
        var k = scen(cur.p, cur.b), ok = b.getAttribute("data-a") === k;
        if (ok) right++;
        b.classList.add(ok ? "is-right" : "is-wrong");
        btns.forEach(function (x) { if (x.getAttribute("data-a") === k) x.classList.add("is-right"); x.disabled = true; });
        out.className = "chk-out ts-qout " + (ok ? "is-a" : "is-no");
        out.innerHTML = "<b>" + (ok ? "Right: " : "Not quite: it's ") + NAME[k] + "</b><p>" + why(k, cur.b) + "</p>";
        score.textContent = right + " of " + tries;
        draw(true);
        nextB.hidden = false;
        nextB.focus();
      });
    });
    nextB.addEventListener("click", next);
    next();
  })();

  /* =====================================================================
     3. Time frame continuity from the four opens
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ts-tfc]");
    if (!root) return;
    var ins = {}, out = root.querySelector(".ts-tout"), rows = root.querySelector(".ts-trows");
    root.querySelectorAll("input").forEach(function (el) { ins[el.name] = el; });
    var NAMES = [["q", "Quarter"], ["m", "Month"], ["w", "Week"], ["d", "Day"]];
    function run() {
      var p = parseFloat(ins.price.value);
      if (!isFinite(p)) { out.className = "chk-out ts-tout"; out.innerHTML = "<b>&mdash;</b><p>Type the last price and the four opens.</p>"; rows.innerHTML = ""; return; }
      var up = 0, dn = 0, html = "";
      NAMES.forEach(function (n) {
        var o = parseFloat(ins[n[0]].value), st = !isFinite(o) ? "" : p > o ? "up" : p < o ? "dn" : "eq";
        if (st === "up") up++; if (st === "dn") dn++;
        html += '<div class="ts-trow is-' + (st || "na") + '"><i></i><span>' + n[1] + " open</span><b>" + (st === "up" ? "above &middot; buyers" : st === "dn" ? "below &middot; sellers" : st === "eq" ? "right at it" : "&mdash;") + "</b></div>";
      });
      rows.innerHTML = html;
      if (dn === 4) { out.className = "chk-out ts-tout is-no"; out.innerHTML = "<b>Full continuity down</b><p>Below all four opens: the sellers in every group are more aggressive, from the quarter down to today. Look for shorts, and give a simultaneous break to the downside your attention.</p>"; }
      else if (up === 4) { out.className = "chk-out ts-tout is-a"; out.innerHTML = "<b>Full continuity up</b><p>Above all four opens: the buyers in every group are paying higher prices. Look for longs, and give a simultaneous break to the upside your attention.</p>"; }
      else { out.className = "chk-out ts-tout is-b"; out.innerHTML = "<b>Mixed: " + up + " up, " + dn + " down</b><p>The groups disagree, so nobody has control of the direction across time frames. Wait, or trade the lower time frame back toward the higher one when it flips.</p>"; }
    }
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     4. Size it: the break, the stop past this week's extreme, the R
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ts-calc]");
    if (!root) return;
    var ins = {}, out = root.querySelector(".ts-cout");
    root.querySelectorAll("input").forEach(function (el) { ins[el.name] = el; });
    function num(k) { var v = parseFloat(ins[k].value); return isFinite(v) ? v : NaN; }
    function row(k, v, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + k + "</span><b>" + v + "</b></div>"; }
    function run() {
      var lvl = num("level"), ext = num("ext"), tgt = num("target"), risk = num("risk");
      if (![lvl, ext, tgt, risk].every(isFinite) || lvl === ext) { out.innerHTML = row("Type the four numbers", "&mdash;"); return; }
      var shortT = ext > lvl, entry = shortT ? lvl - 0.01 : lvl + 0.01, stop = shortT ? ext + 0.01 : ext - 0.01;
      var r = Math.abs(stop - entry), sh = Math.floor(risk / r), rew = shortT ? entry - tgt : tgt - entry;
      var html = row("Side", shortT ? "short" : "long");
      html += row("Entry", f2(entry));
      html += row("Stop, past the week's " + (shortT ? "high" : "low"), f2(stop));
      html += row("Risk a share", f2(r));
      html += row("Shares", sh > 0 ? sh.toLocaleString("en-US") : "0, the stop is too wide for the risk");
      if (rew > 0) html += row("Target", "+" + f2(rew) + " &middot; " + (rew / r).toFixed(1) + "R &middot; $" + Math.round(rew * sh).toLocaleString("en-US"), "tot");
      else html += row("Target", "on the wrong side of the entry", "tot");
      out.innerHTML = html;
    }
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     5. The six steps as a stepper: one step at a time, with a small chart
        of the walkthrough (the weekly bars on the left, this week's
        60-minute closes on the right). Without the script the six steps
        simply show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ts-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "The numbers", c: C.ink,    tag: "Read · 1, 2 or 3, never the color" },
      { k: "The map",     c: C.gold,   tag: "Read · the broadening formation" },
      { k: "The groups",  c: C.purple, tag: "Read · time frame continuity" },
      { k: "The evidence", c: C.dn,    tag: "Wait · the simultaneous break" },
      { k: "The entry",   c: C.cyan,   tag: "Execute · in force, stop above the bar" },
      { k: "The management", c: C.orange, tag: "Manage · tighten, re-enter, hold winners" }
    ];
    var cur = 0;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "The six steps");
    bar.innerHTML = '<span class="gs-line"><i></i></span>' + INFO.map(function (s, i) {
      return '<button type="button" role="tab" class="gs-step" data-i="' + i + '"><b>' + (i + 1) + "</b><span>" + s.k + "</span></button>";
    }).join("");
    var body = document.createElement("div"); body.className = "gs-body";
    var left = document.createElement("div"); left.className = "gs-left";
    var tg = document.createElement("p"); tg.className = "gs-tag";
    var nav = document.createElement("div"); nav.className = "gs-nav";
    nav.innerHTML = '<button type="button" class="pill gs-prev">&lsaquo; Back</button><button type="button" class="pill pill-buy gs-next"></button>';
    var fig = document.createElement("div"); fig.className = "gs-chart";
    fig.innerHTML = '<svg viewBox="0 0 560 300" role="img" aria-label="The walkthrough: the weekly bars and this week\'s 60-minute chart, with the current step highlighted"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    var H = 300, wxa = 26, wxb = 176, mxa = 214, mxb = 500, PMN = 282, PMX = 320;
    var ALLW = WEEKS.concat([THIS_WEEK]);
    function wX(i) { return wxa + i * (wxb - wxa) / (ALLW.length - 1); }
    function mX(i) { return mxa + i * (mxb - mxa) / (N - 1); }
    function Y(p) { return 262 - (p - PMN) / (PMX - PMN) * 214; }
    var SF = 1;
    function t(x, y, s, col, anchor, w) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (13 * SF).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' + (w ? ' font-weight="' + w + '"' : "") + ">" + s + "</text>"; }

    function chart(k) {
      var c = INFO[k].c, s = "";
      s += t(wxa - 8, 22, "Weekly", C.faint) + t(mxa, 22, "60-minute · this week", C.faint);
      s += '<line x1="196" x2="196" y1="34" y2="' + (H - 26) + '" stroke="#2c2c2e"/>';
      ALLW.forEach(function (w, i) { s += candle(wX(i), Y, w, 1, 7, k === 0 ? 1 : 0.55); });
      if (k === 0) ALLW.forEach(function (w, i) {
        if (!i) return; var sc = scen(ALLW[i - 1], w);
        s += '<text x="' + wX(i).toFixed(1) + '" y="' + (sc === "2D" ? Y(w[2]) + 14 : Y(w[1]) - 6).toFixed(1) + '" fill="' + scenCol(sc) + '" font-size="' + (10 * SF).toFixed(1) + '" text-anchor="middle" font-weight="700">' + scenTxt(sc) + "</text>";
      });
      var closes = BARS.map(function (b, i) { return mX(i).toFixed(1) + "," + Y(b[3]).toFixed(1); });
      s += poly(closes, k === 0 ? "#48484a" : "#8e8e93", 2.4);
      if (k === 0) s += t((mxa + mxb) / 2, 120, "price can only do three things", c, "middle", 700) + t((mxa + mxb) / 2, 142, "1 · 2 up · 2 down · 3", C.dim, "middle");
      if (k === 1) {
        s += seg(wX(UP[0]), Y(WEEKS[UP[0]][1]), wX(NW) + 4, Y(WEEKS[UP[0]][1]) + (Y(WEEKS[UP[1]][1]) - Y(WEEKS[UP[0]][1])) * (wX(NW) + 4 - wX(UP[0])) / (wX(UP[1]) - wX(UP[0])), c, 2, 1, "5 4");
        s += seg(wX(LO[0]), Y(WEEKS[LO[0]][2]), wX(NW) + 4, Y(WEEKS[LO[0]][2]) + (Y(WEEKS[LO[1]][2]) - Y(WEEKS[LO[0]][2])) * (wX(NW) + 4 - wX(LO[0])) / (wX(LO[1]) - wX(LO[0])), c, 2, 1, "5 4");
        s += hl(wX(LO[1]), mxb + 6, Y(TARGET), C.cyan, "3 4", 1.8);
        s += t(mxb + 6, Y(TARGET) - 8, "the other side " + f2(TARGET), C.cyan, "end", 700);
        s += t(wX(5), Y(WEEKS[9][1]) - 4, "draw it right to left", c, "middle", 600);
      }
      if (k === 2) {
        [["Q", OPENS.Q], ["M", OPENS.M], ["W", OPENS.W]].forEach(function (o, j) {
          s += hl(mxa, mxb, Y(o[1]), c, "4 4", 1.4, 0.9);
          s += t(mxb + 6, Y(o[1]) + 4 + (j - 1) * 9, o[0], c, "start", 700);
        });
        s += t((mxa + mxb) / 2, Y(OPENS.Q) - 16, "under all four opens: everyone sells", c, "middle", 700);
      }
      if (k === 3) {
        s += hl(mxa, mxb, Y(LWL), C.ink, "4 4", 1.3);
        s += ring(mX(0), Y(LWL), 9, c, 2.4);
        for (var j = 0; j < 8; j++) s += dot(mxa + 40 + j * 18, 52, 6, j < NBROKE ? c : "#48484a");
        s += t(mxa + 40 + 8 * 18 + 6, 56, NBROKE + " of 8 at once", c, "start", 700);
        s += t(mX(0) + 14, Y(LWL) + 26, "break of last week's low", c, "start", 600);
      }
      if (k === 4) {
        s += hl(mX(0), mxb, Y(ENTRY), C.ink, null, 1.8) + hl(mX(0), mxb, Y(STOP), C.dn, null, 2.2);
        s += t(mxb, Y(STOP) - 8, "stop " + f2(STOP) + " · above the week's high", C.dn, "end", 700);
        s += t(mxb, Y(ENTRY) + 18, "short " + f2(ENTRY) + " · in force", c, "end", 700);
      }
      if (k === 5) {
        var pts = [];
        for (var b = 0; b < N; b++) pts.push(mX(b).toFixed(1) + "," + Y(STOPS[Math.max(0, dayOf(b) - 1)]).toFixed(1));
        s += poly(pts, C.dn, 2.2);
        s += hl(mxa, mxb + 6, Y(TARGET), C.cyan, "3 4", 1.8);
        s += ring(mX(HIT), Y(TARGET), 8, C.cyan, 2.2);
        s += t(mxb, Y(STOP) - 8, "walk the stop down above lower highs", c, "end", 700);
        s += t(mX(HIT) - 12, Y(TARGET) + 22, "+" + RMULT.toFixed(1) + "R at the other side", C.cyan, "end", 700);
      }
      s += t(wxa - 8, H - 8, "Illustrative · the walkthrough above", C.faint);
      return s;
    }
    function show(k, focus) {
      cur = k;
      steps.forEach(function (st, i) { st.hidden = i !== k; });
      bar.querySelectorAll(".gs-step").forEach(function (b, i) {
        b.classList.toggle("is-done", i < k); b.classList.toggle("is-on", i === k);
        b.setAttribute("aria-selected", i === k ? "true" : "false");
        b.querySelector("b").textContent = i < k ? "✓" : String(i + 1);
      });
      bar.querySelector(".gs-line i").style.width = (k / (NS - 1) * 100) + "%";
      root.style.setProperty("--gs", INFO[k].c);
      tg.textContent = "Step " + (k + 1) + " of " + NS + " · " + INFO[k].tag;
      nav.querySelector(".gs-prev").disabled = k === 0;
      nav.querySelector(".gs-next").innerHTML = k < NS - 1 ? "Next: " + INFO[k + 1].k + " &rsaquo;" : "Start over &rsaquo;";
      FS = 1; SF = svg.clientWidth > 0 && svg.clientWidth < 440 ? 1.3 : 1;
      svg.innerHTML = chart(k);
      if (focus) bar.querySelectorAll(".gs-step")[k].focus();
    }
    bar.addEventListener("click", function (e) { var b = e.target.closest(".gs-step"); if (b) show(+b.getAttribute("data-i")); });
    bar.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" && cur < NS - 1) { e.preventDefault(); show(cur + 1, true); }
      if (e.key === "ArrowLeft" && cur > 0) { e.preventDefault(); show(cur - 1, true); }
    });
    nav.querySelector(".gs-prev").addEventListener("click", function () { if (cur > 0) show(cur - 1); });
    nav.querySelector(".gs-next").addEventListener("click", function () { show(cur < NS - 1 ? cur + 1 : 0); });
    show(0);
  })();
})();
