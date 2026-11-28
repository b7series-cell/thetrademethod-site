/* =====================================================================
   ote-anim.js — the animations on the Fibonacci OTE page.

   1. [data-ote-anim]   strategy one, start to finish, on 1-hour bars of
      a made-up gold chart, in eight stages: the downtrend fails to make
      a lower low → the impulse breaks structure (A to B) → draw the fib
      (1 on A, 0 on B, premium and discount) → check the room on the
      higher time frame, set the buy limit at 0.702 → the pullback fills
      it → half off at the first target, stop to entry → the rest at the
      next level → the next impulse, a new fib, and no fill.
   2. [data-ote-steps]  the six steps as a click-through stepper with a
      small chart per step.
   3. [data-ote-depth]  how deep to buy: a slider over the retracement,
      premium and discount, bull or bear, and the reward to risk at the
      old high from each depth.
   4. [data-ote-two]    strategy two: a major level on the 1-hour, a
      double top on the 5-minute, the neckline break, then a sell limit
      at 0.618 of the break.
   5. [data-ote-calc]   the fib and trade calculator.

   Every fib number the page prints is computed here from the same swing
   points the bars are drawn from. Everything is scripted and labelled
   "Illustrative". No market data.
   ===================================================================== */


(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#22d3ee", gold: "#f4b942", orange: "#ff9f0a", purple: "#bf5af2", teal: "#64d2ff",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e" };
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
  function ln(x1, y1, x2, y2, col, dash, w, op) {
    if (op != null && op <= 0) return "";
    return '<line x1="' + x1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y1="' + y1.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ' stroke-linecap="round"/>';
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
  function tri(x, y, up, col, sz, op) {
    if (op != null && op <= 0) return "";
    var h = sz * 1.15, p = up ? [x, y - h / 2, x - sz / 2, y + h / 2, x + sz / 2, y + h / 2] : [x, y + h / 2, x - sz / 2, y - h / 2, x + sz / 2, y - h / 2];
    return '<polygon points="' + p.map(function (v) { return v.toFixed(1); }).join(" ") + '" fill="' + col + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function callout(x, y, lines, col, op) {
    if (op <= 0) return "";
    var w = 18 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z#0-9]+;/g, "x").length; })) * 7.2 * FS, h = 10 + lines.length * 18 * FS;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (l, k) { s += txt(x + 10, y + 21 * FS + k * 18 * FS, l, k === 0 ? col : C.dim, 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  function tag(xTag, y, label, col, op, ink) {
    if (op <= 0) return "";
    var w = (label.length * 7 + 16) * FS, h = 20 * FS;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xTag.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="' + col + '"/>' +
      txt(xTag + 8 * FS, y + 4.5 * FS, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function partial(b, prog) {
    var o = b[0], h = b[1], l = b[2], c = b[3];
    if (prog >= 1) return { hi: h, lo: l, cur: c };
    var pth = c >= o ? [[0, o], [1 / 3, l], [2 / 3, h], [1, c]] : [[0, o], [1 / 3, h], [2 / 3, l], [1, c]];
    var p = clamp01(prog), hi = o, lo = o, cur = o;
    for (var k = 1; k < pth.length; k++) {
      var a = pth[k - 1], z = pth[k];
      if (p >= z[0]) { hi = Math.max(hi, z[1]); lo = Math.min(lo, z[1]); cur = z[1]; continue; }
      cur = a[1] + (z[1] - a[1]) * (p - a[0]) / (z[0] - a[0]);
      break;
    }
    return { hi: Math.max(hi, cur), lo: Math.min(lo, cur), cur: cur };
  }
  function candle(x, yf, b, prog, wBody, op, paint) {
    if (prog <= 0) return "";
    var o = b[0], p = partial(b, prog);
    var col = paint || (p.cur >= o ? C.up : C.dn), top = yf(Math.max(o, p.cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(p.cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + yf(p.hi).toFixed(1) + '" y2="' + yf(p.lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.4"/>' +
      '<rect x="' + (x - wBody / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wBody.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  function f2(v) { return v.toFixed(2); }
  function px(v) { return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function isNarrow(el, below) { return el.clientWidth > 0 && el.clientWidth < (below || 560); }

  /* ---------------------------------------------------------------------
     The fib. Bullish: 1 on the swing low (A), 0 on the swing high (B),
     so a level r sits at B − r × (B − A). Bearish is the mirror.
     --------------------------------------------------------------------- */
  var RATIOS = [0, 0.382, 0.5, 0.618, 0.702, 0.786, 1];
  function fibAt(a, b, r) { return b - r * (b - a); }   // a = the 1 (start of the impulse), b = the 0 (end)

  /* ---------------------------------------------------------------------
     The bars: a made-up gold chart on 1-hour bars. [o, h, l, c].
     0–4 the downtrend, a low at 4,006 · 5–7 a lower high at 4,036 ·
     8–10 the drop that fails: A, a higher low at 4,010 · 11–16 the
     impulse breaks 4,036 and runs to B, 4,060 · 17–21 the pullback into
     the OTE, low 4,022.40 · 22–26 back to the first target · 27–34 the
     run through the 4,090–4,096 zone to B2, 4,104 · 35–38 a shallow
     pullback to 4,072.50 (never reaches 0.618) · 39–43 on without us.
     --------------------------------------------------------------------- */
  var BARS = [
    [4049, 4052, 4041, 4043], [4043, 4046, 4030, 4033], [4033, 4037, 4021, 4024], [4024, 4027, 4012, 4015], [4015, 4019, 4006, 4012],
    [4012, 4024, 4010.5, 4022], [4022, 4031, 4019, 4029], [4029, 4036, 4025, 4027], [4027, 4029, 4017, 4019], [4019, 4022, 4012, 4014],
    [4014, 4019, 4010, 4018],
    [4018, 4027, 4016, 4026], [4026, 4034, 4024, 4033], [4033, 4043, 4031, 4041], [4041, 4049, 4039, 4047], [4047, 4055, 4045, 4053], [4053, 4060, 4050, 4057],
    [4057, 4058, 4047, 4049], [4049, 4052, 4040, 4043], [4043, 4046, 4034, 4036], [4036, 4039, 4027, 4030], [4030, 4032, 4022.4, 4029],
    [4029, 4038, 4027, 4036], [4036, 4044, 4034, 4042], [4042, 4049, 4039, 4047], [4047, 4053, 4044, 4051], [4051, 4057.6, 4048, 4055],
    [4055, 4064, 4053, 4062], [4062, 4070, 4059, 4068], [4068, 4075, 4065, 4072], [4072, 4081, 4070, 4079], [4079, 4087, 4076, 4085],
    [4085, 4092, 4082, 4090], [4090, 4098, 4087, 4096], [4096, 4104, 4094, 4102],
    [4102, 4103, 4092, 4094], [4094, 4096, 4084, 4087], [4087, 4090, 4077, 4080], [4080, 4083, 4072.5, 4081],
    [4081, 4090, 4079, 4088], [4088, 4097, 4086, 4095], [4095, 4105, 4093, 4103], [4103, 4112, 4100, 4109], [4109, 4118, 4106, 4115]
  ];
  var N = BARS.length;
  var LL = 4, LH = 7, IA = 10, BOS = 13, IB = 16, FILL = 21, TP1B = 26, TP2B = 32, IB2 = 34, PB2 = 38;
  var A = BARS[IA][2], B = BARS[IB][1], LH_P = BARS[LH][1], LL_P = BARS[LL][2];
  var ENTRY = fibAt(A, B, 0.702), STOP = A - 2, RISK = ENTRY - STOP;
  var TP1 = B - 3, TP2 = 4090, ZONE_LO = 4090, ZONE_HI = 4096;
  var R1 = (TP1 - ENTRY) / RISK, R2 = (TP2 - ENTRY) / RISK, RB = (R1 + R2) / 2;
  var A2 = BARS[FILL][2], B2 = BARS[IB2][1], PB2_LOW = BARS[PB2][2];
  var E2 = fibAt(A2, B2, 0.702), F2_618 = fibAt(A2, B2, 0.618), F2_382 = fibAt(A2, B2, 0.382);
  var DEPTH2 = (B2 - PB2_LOW) / (B2 - A2);
  var RLAB = { 0: "0", 0.382: "0.382", 0.5: "0.5", 0.618: "0.618", 0.702: "0.702", 0.786: "0.786", 1: "1" };

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ote-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;

    var STAGES = [
      { at: 0,    title: "A downtrend fails to make a lower low", text: "Gold has been falling: lower highs, lower lows, a low at " + px(LL_P) + ". The last drop stalls at " + px(A) + " and never makes a new low. That's the first sign the sellers are tiring. Still no trade." },
      { at: 3.6,  title: "The impulse breaks structure: A to B", text: "Big green candles of the same colour push through the last lower high at " + px(LH_P) + ". Structure has shifted bullish, so from here we only look to buy. The impulse runs from A, " + px(A) + ", to B, " + px(B) + "." },
      { at: 6.4,  title: "Draw the fib: 1 on A, 0 on B", text: "The retracement tool goes on the latest impulse: 1 on the swing low, 0 on the swing high. Above 0.5 is premium, below it is discount. The OTE is 0.618 to 0.786 (" + px(fibAt(A, B, 0.786)) + " to " + px(fibAt(A, B, 0.618)) + "), with 0.702 in the middle." },
      { at: 9.0,  title: "Check the room, then set the order", text: "On the 4-hour, the nearest supply is " + px(ZONE_LO) + " to " + px(ZONE_HI) + ", 30 points above B: room to move. Buy limit at 0.702, " + px(ENTRY) + ". Stop " + px(STOP) + ", under the swing low: if that breaks, the uptrend is wrong. Risk " + f2(RISK) + "." },
      { at: 11.4, title: "The pullback comes to you", text: "Mixed candles, smaller bodies, wicks: a correction, not a reversal. It slides through 0.382 and the Golden Zone and fills the order at " + px(ENTRY) + ". The low is " + px(A2) + ", still above 0.786. No chasing, no extra confirmation." },
      { at: 13.8, title: "First target: half off, stop to entry", text: "The first target sits a few points under the old high: " + px(TP1) + ", +" + f2(TP1 - ENTRY) + ", " + R1.toFixed(1) + "R. Close half and move the stop to " + px(ENTRY) + ". What's left is a free trade." },
      { at: 16.2, title: "The rest at the next level", text: "Price breaks the old high and runs into the 4-hour level. The second half goes at " + px(TP2) + ": +" + f2(TP2 - ENTRY) + ", " + R2.toFixed(1) + "R. Half at each target is " + RB.toFixed(2) + "R on the whole position." },
      { at: 19.4, title: "A new impulse, and no fill", text: "A new impulse from " + px(A2) + " to " + px(B2) + ", so the fib moves with it and a new buy limit goes at 0.702, " + px(E2) + ". The pullback stops at " + px(PB2_LOW) + ", past 0.382 but nowhere near 0.618 (" + px(F2_618) + "). Not filled, and that's fine: not every setup becomes a trade." }
    ];
    var TB = [];
    function segT(a, b, t0, step, dur) { for (var i = a; i <= b; i++) TB[i] = [t0 + (i - a) * step, t0 + (i - a) * step + dur]; }
    segT(0, 10, 0.3, 0.29, 0.23);
    segT(11, 16, 3.8, 0.38, 0.3);
    segT(17, 21, 11.6, 0.4, 0.32);
    segT(22, 26, 14.0, 0.36, 0.28);
    segT(27, 34, 16.4, 0.33, 0.26);
    segT(35, 43, 19.7, 0.34, 0.26);
    var END = 24.4;
    var T_F = TB[FILL][0] + 0.55 * (TB[FILL][1] - TB[FILL][0]);
    var T_1 = TB[TP1B][0] + 0.66 * (TB[TP1B][1] - TB[TP1B][0]);
    var T_2 = TB[TP2B][0] + 0.6 * (TB[TP2B][1] - TB[TP2B][0]);
    function prog(i, T) { return clamp01((T - TB[i][0]) / (TB[i][1] - TB[i][0])); }

    function size(n) {
      return n ? { W: 440, H: 840, x0: 10, x1: 318, xTag: 322, yt: 196, yb: 760, cx: 12, cy: 14 }
               : { W: 1180, H: 640, x0: 24, x1: 930, xTag: 944, yt: 140, yb: 590, cx: 24, cy: 14 };
    }
    var PMIN = 3998, PMAX = 4122;

    function frame(T, L) {
      var s = "", i;
      var dx = (L.x1 - L.x0) / N, wB = Math.max(3.5, dx * 0.58);
      function x(i) { return L.x0 + dx * (i + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      s += txt(L.x0, L.yt - 14 * FS, "1-hour · a made-up gold chart", C.faint, 12);

      /* stage 0: the downtrend structure */
      var so = fade(T, 1.2, 0.3) * (1 - fade(T, 9.0, 0.4) * 0.7);
      if (so > 0) {
        s += txt(x(LL), y(LL_P) + 20 * FS, "low " + px(LL_P), C.dn, 11.5, "middle", 600, so);
        s += txt(x(LH), y(LH_P) - 10 * FS, "lower high", C.dn, 11.5, "middle", 600, fade(T, 2.3, 0.3) * so);
      }
      var ao = fade(T, 3.3, 0.3);
      s += txt(x(IA), y(A) + 20 * FS, L.narrow ? "A · higher low" : "A · no lower low", C.up, 12, "middle", 700, ao * (1 - fade(T, 19.4, 0.4) * 0.6));
      /* the break of structure */
      var bo = fade(T, TB[BOS][1], 0.3);
      if (bo > 0) {
        s += hl(x(LH), x(BOS) + dx * 0.6, y(LH_P), C.up, "4 4", 1.4, bo * (1 - fade(T, 9.0, 0.4) * 0.8));
        s += txt(x(BOS) + dx * 0.9, y(LH_P) + 4, "break of structure", C.up, 11.5, "start", 700, bo * (1 - fade(T, 6.4, 0.4)));
      }
      var bbo = fade(T, TB[IB][1], 0.3);
      s += txt(x(IB), y(B) - 10 * FS, "B", C.up, 12.5, "middle", 700, bbo * (1 - fade(T, 19.4, 0.4) * 0.6));

      /* the higher time frame zone */
      var zo = fade(T, 9.2, 0.4);
      if (zo > 0) {
        s += rect(L.x0, y(ZONE_HI), L.x1 - L.x0, y(ZONE_LO) - y(ZONE_HI), C.dn, 0.14 * zo * (T > 19.4 ? 0.5 : 1));
        s += txt(L.x0 + 6, y(ZONE_HI) - 6, L.narrow ? "4-hour supply" : "4-hour supply · the next level", C.dn, 11.5, "start", 600, zo * (T > 19.4 ? 0.5 : 1));
        var ro = zo * (1 - fade(T, 11.4, 0.4));
        if (ro > 0) {
          s += ln(x(IB) + dx, y(B), x(IB) + dx, y(ZONE_LO) + 2, C.ink, "3 3", 1.4, ro);
          s += txt(x(IB) + dx * 1.6, (y(B) + y(ZONE_LO)) / 2 + 4, "room: " + (ZONE_LO - B) + " pts", C.ink, 12, "start", 700, ro);
        }
      }

      /* the first fib */
      var fo = fade(T, 6.6, 0.5), fdim = T >= 19.4 ? 0.3 : 1;
      if (fo > 0) {
        var fx0 = x(IA) - dx * 0.4, mid = fibAt(A, B, 0.5);
        s += ln(x(IA), y(A), x(IB), y(B), C.ink, "2 4", 1.2, fo * 0.6 * fdim);
        s += rect(fx0, y(B), L.x1 - fx0, y(mid) - y(B), C.dn, 0.06 * fo * fdim);
        s += rect(fx0, y(mid), L.x1 - fx0, y(A) - y(mid), C.up, 0.06 * fo * fdim);
        s += rect(fx0, y(fibAt(A, B, 0.618)), L.x1 - fx0, y(fibAt(A, B, 0.786)) - y(fibAt(A, B, 0.618)), C.gold, 0.17 * fo * fdim);
        if (!L.narrow) {
          s += txt(L.x1 - 6, y(B) + 16, "premium", C.dn, 11.5, "end", 600, fo * fdim * (1 - fade(T, 11.4, 0.4)));
          s += txt(L.x1 - 6, y(A) - 8, "discount", C.up, 11.5, "end", 600, fo * fdim * (1 - fade(T, 11.4, 0.4)));
        }
        RATIOS.forEach(function (r) {
          var p = fibAt(A, B, r), col = r === 0.702 ? C.gold : (r === 0.618 || r === 0.786) ? C.gold : r === 0.5 ? C.ink : C.faint;
          s += hl(fx0, L.x1, y(p), col, r === 0.702 ? null : "5 4", r === 0.702 ? 1.6 : 1.1, fo * fdim * (r === 0.382 || r === 0 || r === 1 ? 0.7 : 0.9));
          if (T < 19.4 && r > 0 && r < 1 && (r !== 0.702 || T < 9.6)) {
            var lab = L.narrow ? RLAB[r] : RLAB[r] + " · " + px(p);
            if (!L.narrow || (r !== 0.5 && r !== 0.382)) s += tag(L.xTag, y(p), lab, r === 0.702 ? C.gold : C.box, fo, r === 0.702 ? "#000" : C.dim);
          }
        });
        s += txt(L.x1 - 6, y(fibAt(A, B, 0.382)) - 5, L.narrow ? "0.382 · less is noise" : "0.382 · a pullback that never gets here is noise", C.faint, 11, "end", null, fo * fdim * (1 - fade(T, 11.4, 0.4)));
        s += txt(x(IB) - dx * 0.4, y(B) - 10 * FS, "0", C.faint, 11, "end", null, fo * fdim * (L.narrow ? 0 : 1));
        s += txt(x(IA) - dx * 0.4, y(A) + 4 * FS, "1", C.faint, 11, "end", null, fo * fdim * (L.narrow ? 0 : 1));
      }

      /* the order, the stop, the targets */
      var oo = fade(T, 9.6, 0.4);
      if (oo > 0) {
        var stopNow = T < T_1 ? STOP : ENTRY, live = T < T_2;
        s += tri(x(IB) + dx * 0.9, y(ENTRY), true, C.gold, 10 * FS, oo * (T < T_F ? 1 : 0));
        s += hl(x(IB) + dx * 0.5, T >= T_2 ? x(TP2B) : L.x1, y(ENTRY), C.gold, null, 1.8, oo * (T >= 19.4 ? 0.3 : 1));
        s += tag(L.xTag, y(ENTRY), (L.narrow ? "buy " : "buy limit ") + px(ENTRY), C.gold, oo * (T < 19.4 ? 1 : 0));
        if (live) {
          s += hl(x(IA), L.x1, y(stopNow), C.dn, "5 4", 1.6, oo);
          s += tag(L.xTag, y(STOP) + 4 * FS, (T < T_1 ? "stop " : "was ") + px(STOP), C.dn, oo * (T < T_1 ? 1 : 0.4), T < T_1 ? "#000" : C.ink);
          s += hl(x(IB) + dx * 0.5, L.x1, y(TP1), C.cyan, "2 4", 1.4, oo * (T < T_1 ? 1 : 0.4));
          s += tag(L.xTag, y(TP1) - 14 * FS, "TP1 " + px(TP1), C.cyan, oo * (1 - fade(T, T_1 + 1.0, 0.4) * 0.6));
          s += tag(L.xTag, y(TP2) - 2 * FS, "TP2 " + px(TP2), C.cyan, oo * (T < 19.4 ? 1 : 0));
        }
        if (T >= T_1 && T < T_2) s += txt(x(TP1B) + dx * 0.8, y(ENTRY) - 8, L.narrow ? "stop at entry" : "stop at entry · free trade", C.gold, 11.5, "start", 700, fade(T, T_1, 0.3));
      }
      var fio = fade(T, T_F, 0.25);
      if (fio > 0) { s += ring(x(FILL), y(ENTRY), 11 * FS, C.gold, 2.2, fio * (1 - fade(T, 19.4, 0.4) * 0.7)); if (!L.narrow) s += txt(x(FILL) + dx * 1.2, y(ENTRY) + 22, "filled at 0.702", C.gold, 12, "start", 700, fio * (1 - fade(T, 13.8, 0.4))); }
      var t1o = fade(T, T_1, 0.25);
      if (t1o > 0) s += ring(x(TP1B), y(TP1), 10 * FS, C.cyan, 2.2, t1o * (1 - fade(T, 19.4, 0.4) * 0.7));
      var t2o = fade(T, T_2, 0.25);
      if (t2o > 0) s += ring(x(TP2B), y(TP2), 10 * FS, C.cyan, 2.2, t2o * (1 - fade(T, 19.4, 0.4) * 0.7));

      /* the second fib: no fill */
      var go = fade(T, 19.6, 0.5);
      if (go > 0) {
        var gx0 = x(FILL) - dx * 0.4;
        s += ln(x(FILL), y(A2), x(IB2), y(B2), C.ink, "2 4", 1.2, go * 0.6);
        s += rect(gx0, y(fibAt(A2, B2, 0.618)), L.x1 - gx0, y(fibAt(A2, B2, 0.786)) - y(fibAt(A2, B2, 0.618)), C.gold, 0.16 * go);
        [0, 0.382, 0.5, 0.618, 0.702, 0.786].forEach(function (r) {
          var p = fibAt(A2, B2, r);
          s += hl(gx0, L.x1, y(p), r >= 0.618 ? C.gold : r === 0.5 ? C.ink : C.faint, r === 0.702 ? null : "5 4", r === 0.702 ? 1.6 : 1.1, go * 0.9);
          if (r === 0.382 || r === 0.618) s += tag(L.xTag, y(p), L.narrow ? RLAB[r] : RLAB[r] + " · " + px(p), C.box, go, C.dim);
        });
        s += tag(L.xTag, y(E2), (L.narrow ? "buy " : "buy limit ") + px(E2), C.gold, go);
        var no = fade(T, TB[PB2][1], 0.3);
        if (no > 0) {
          s += ring(x(PB2), y(PB2_LOW), 10 * FS, C.ink, 2, no);
          s += txt(x(PB2), y(PB2_LOW) + 26 * FS, L.narrow ? "no fill" : "stops at " + px(PB2_LOW) + " · no fill", C.ink, 12, "middle", 700, no);
        }
      }

      /* candles */
      for (i = 0; i < N; i++) {
        var p = prog(i, T);
        if (p <= 0) continue;
        s += candle(x(i), y, BARS[i], p, wB, T >= 19.4 && i < FILL ? 0.45 : 1);
      }
      if (T >= 22.9) s += txt(L.x0, L.yt + 22 * FS, "Trade 1: half +" + f2(TP1 - ENTRY) + ", half +" + f2(TP2 - ENTRY) + " = " + RB.toFixed(2) + "R · Trade 2: no fill", C.cyan, 13, "start", 700, fade(T, 22.9, 0.3));

      /* callouts */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["The trend", "Lower highs, lower lows", "Then a drop that can't make", "a new low: watch, don't trade"], C.dn, fade(T, 0.4, 0.3) * (1 - fade(T, 3.6, 0.3)));
      s += callout(cx, cy, ["The impulse · A to B", "Big candles, one colour", "Breaks the last lower high", "Bullish now: buys only"], C.up, fade(T, 3.8, 0.3) * (1 - fade(T, 6.4, 0.3)));
      s += callout(cx, cy, ["The fib · 1 on A, 0 on B", "Premium above 0.5", "Discount below it", "OTE: 0.618 to 0.786"], C.gold, fade(T, 6.6, 0.3) * (1 - fade(T, 9.0, 0.3)));
      s += callout(cx, cy, ["Buy limit " + px(ENTRY), "0.702, the middle of the OTE", "Stop " + px(STOP) + " under A", "Room to the 4-hour zone"], C.gold, fade(T, 9.2, 0.3) * (1 - fade(T, 11.4, 0.3)));
      s += callout(cx, cy, ["Filled · " + px(ENTRY), "Mixed candles, small bodies", "A correction, not a reversal", "Risk " + f2(RISK) + " points"], C.gold, fade(T, 11.6, 0.3) * (1 - fade(T, 13.8, 0.3)));
      s += callout(cx, cy, ["TP1 " + px(TP1) + " · " + R1.toFixed(1) + "R", "A few points under the high", "Close half", "Stop to entry"], C.cyan, fade(T, 14.0, 0.3) * (1 - fade(T, 16.2, 0.3)));
      s += callout(cx, cy, ["TP2 " + px(TP2) + " · " + R2.toFixed(1) + "R", "The next 4-hour level", "Half and half:", RB.toFixed(2) + "R on the trade"], C.cyan, fade(T, 16.4, 0.3) * (1 - fade(T, 19.4, 0.3)));
      s += callout(cx, cy, ["New impulse, new fib", "Limit at 0.702: " + px(E2), "Pullback only " + DEPTH2.toFixed(2) + " deep", "No fill. Wait for the next"], C.ink, fade(T, 19.6, 0.3));
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
    function draw() { FS = L.narrow ? 1.18 : 1; svg.innerHTML = '<rect width="' + L.W + '" height="' + L.H + '" fill="' + C.bg + '"/>' + frame(T, L); caption(); FS = 1; }
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
    window.OTEAnim = { seek: function (t) { setPlaying(false); T = t; draw(); }, END: END, STAGES: STAGES,
      _levels: { A: A, B: B, ENTRY: ENTRY, STOP: STOP, RISK: RISK, TP1: TP1, TP2: TP2, R1: R1, R2: R2, RB: RB, A2: A2, B2: B2, E2: E2, F2_618: F2_618, F2_382: F2_382, PB2_LOW: PB2_LOW, DEPTH2: DEPTH2 } };
  })();

  /* =====================================================================
     2. The six steps as a stepper, with a small chart per step
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ote-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "Trend",  c: C.up,   tag: "Map · a clean trend, or close the chart" },
      { k: "Fib",    c: C.ink,  tag: "Measure · the latest impulse, start to end" },
      { k: "Room",   c: C.dn,   tag: "Filter · distance to the higher time frame zone" },
      { k: "Order",  c: C.gold, tag: "Execute · a limit at 0.702, the middle of the OTE" },
      { k: "Stop",   c: C.dn,   tag: "Protect · past the swing that started the impulse" },
      { k: "Manage", c: C.cyan, tag: "Manage · half at the old high, the rest at the next level" }
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
    fig.innerHTML = '<svg viewBox="0 0 560 340" role="img" aria-label="A small chart for the current step"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");
    var SF = 1;
    function t(x, y, s, col, anchor, w, size) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + ((size || 13) * SF).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' + (w ? ' font-weight="' + w + '"' : "") + ">" + s + "</text>"; }

    /* step 1: impulses and pullbacks */
    function trend(c) {
      var s = t(16, 24, "Price moves in waves", C.faint);
      var P = [[30, 290], [130, 160], [175, 215], [280, 100], [330, 175], [420, 70], [490, 150]];
      for (var i = 1; i < P.length; i++) {
        var imp = P[i][1] < P[i - 1][1];
        s += ln(P[i - 1][0], P[i - 1][1], P[i][0], P[i][1], imp ? c : C.dn, imp ? null : "6 5", imp ? 4 : 2);
      }
      s += t(80, 212, "impulse", c, "end", 700, 12);
      s += t(162, 252, "shallow pullback", C.dn, "middle", 600, 12);
      s += t(162, 268, "strong trend", C.faint, "middle", null, 11);
      s += t(458, 196, "deeper pullback", C.dn, "middle", 600, 12);
      s += t(458, 212, "trend tiring", C.faint, "middle", null, 11);
      s += t(280, 330, "Choppy, no clear waves? Close the chart, find another", c, "middle", 600, 12);
      return s;
    }
    /* step 2: the fib on the impulse */
    function fib(c) {
      var s = t(16, 24, "Bullish: 1 on the swing low, 0 on the swing high", C.faint);
      var a = 290, b = 60, xa = 60, xb = 200;
      s += ln(xa, a, xb, b, C.up, null, 4);
      s += t(xa - 6, a + 18, "A", C.up, "middle", 700);
      s += t(xb, b - 10, "B", C.up, "middle", 700);
      var ys = function (r) { return b + r * (a - b); };
      s += rect(xb, ys(0), 330, ys(0.5) - ys(0), C.dn, 0.08);
      s += rect(xb, ys(0.5), 330, ys(1) - ys(0.5), C.up, 0.08);
      s += rect(xb, ys(0.618), 330, ys(0.786) - ys(0.618), C.gold, 0.2);
      RATIOS.forEach(function (r) {
        var col = r >= 0.618 && r <= 0.786 ? C.gold : r === 0.5 ? C.ink : C.faint;
        s += hl(xb, 530, ys(r), col, r === 0.702 ? null : "5 4", r === 0.702 ? 1.8 : 1.1);
        s += t(536, ys(r) + 4, RLAB[r], col, "end", r === 0.702 ? 700 : null, 11);
      });
      s += t(214, ys(0.25) + 4, "premium", C.dn, "start", 600, 12);
      s += t(214, ys(0.9) + 4, "discount", C.up, "start", 600, 12);
      s += t(330, ys(0.382) - 6, "less than this: noise, redraw", C.faint, "start", null, 11);
      s += t(330, ys(0.702) + 4, "OTE", C.gold, "start", 700, 12);
      s += t(280, 330, "If price makes a new high, move the 0 with it", c, "middle", 600, 12);
      return s;
    }
    /* step 3: room to the higher time frame zone */
    function room(c) {
      var s = t(16, 24, "Switch up a time frame before you place it", C.faint);
      function side(ox, zoneY, ok) {
        var r = "";
        r += rect(ox, zoneY - 22, 230, 22, C.dn, 0.25);
        r += t(ox + 115, zoneY - 7, "higher time frame supply", C.dn, "middle", 600, 11);
        r += ln(ox + 20, 290, ox + 120, 170, C.up, null, 3);
        r += ln(ox + 120, 170, ox + 170, 220, C.dn, "5 4", 2);
        r += ln(ox + 190, 170, ox + 190, zoneY + 2, C.ink, "3 3", 1.4);
        r += t(ox + 196, (170 + zoneY) / 2 + 4, ok ? "room" : "", C.ink, "start", 700, 11);
        r += t(ox + 115, 316, ok ? "Room to the target: take it" : "Already at the zone: skip it", ok ? C.up : C.dn, "middle", 700, 12);
        return r;
      }
      s += side(26, 70, true);
      s += side(300, 166, false);
      return s;
    }
    /* steps 4–6: the walkthrough bars */
    var S0 = 6, S1 = 34, xa = 16, xb = 404, yt = 46, yb = 296, PMN = 4000, PMX = 4100;
    var dx = (xb - xa) / (S1 - S0 + 1), wb = Math.max(4, dx * 0.58);
    function X(i) { return xa + dx * (i - S0 + 0.5); }
    function Y(p) { return yb - (p - PMN) / (PMX - PMN) * (yb - yt); }
    function walk(k, c) {
      var s = t(xa, 24, "1-hour · the walkthrough", C.faint);
      var fx = X(IA) - dx * 0.4;
      s += rect(fx, Y(fibAt(A, B, 0.618)), xb - fx, Y(fibAt(A, B, 0.786)) - Y(fibAt(A, B, 0.618)), C.gold, k === 3 ? 0.24 : 0.12);
      [0, 0.5, 0.618, 0.702, 0.786, 1].forEach(function (r) {
        var p = fibAt(A, B, r);
        s += hl(fx, xb, Y(p), r >= 0.618 && r <= 0.786 ? C.gold : C.faint, r === 0.702 ? null : "4 4", r === 0.702 ? 1.6 : 1, 0.8);
        if (k === 3 || r === 0.702) s += t(xb + 6, Y(p) + 4, RLAB[r], r >= 0.618 && r <= 0.786 ? C.gold : C.faint, "start", r === 0.702 ? 700 : null, 11);
      });
      for (var i = S0; i <= S1; i++) {
        var lit = k === 3 ? i >= IA && i <= FILL : k === 4 ? i >= IA && i <= FILL + 1 : i >= FILL;
        s += candle(X(i), Y, BARS[i], 1, wb, lit ? 1 : 0.25);
      }
      if (k === 3) {
        s += tri(X(FILL) - dx * 0.9, Y(ENTRY), true, c, 10);
        s += t(X(FILL) - dx * 1.6, Y(ENTRY) + 4, "buy limit " + px(ENTRY), c, "end", 700, 12);
      }
      if (k === 4) {
        s += hl(X(IA) - dx, xb, Y(STOP), c, "5 4", 1.8);
        s += t(X(IA) + dx, Y(STOP) + 16, "stop " + px(STOP) + " · under A", c, "start", 700, 12);
        s += ring(X(IA), Y(A), 9, c, 2);
        s += t(X(FILL) + dx, Y(ENTRY) + 22, "risk " + f2(RISK), C.gold, "start", 700, 12);
      }
      if (k === 5) {
        s += hl(X(FILL), xb, Y(TP1), c, "2 4", 1.4);
        s += hl(X(FILL), xb, Y(TP2), c, "2 4", 1.4);
        s += ring(X(TP1B), Y(TP1), 8, c, 2); s += ring(X(TP2B), Y(TP2), 8, c, 2);
        s += t(X(TP1B) + dx * 1.2, Y(TP1) + 18, "TP1 · half, stop to entry", c, "start", 700, 12);
        s += t(X(TP2B) - dx * 1.2, Y(TP2) - 8, "TP2 · next level", c, "end", 700, 12);
      }
      return s;
    }
    function chart(k) {
      var c = INFO[k].c, s = "";
      s += k === 0 ? trend(c) : k === 1 ? fib(c) : k === 2 ? room(c) : walk(k, c);
      s += t(552, 334, k > 2 ? "Illustrative · made-up bars" : "", C.faint, "end", null, 11);
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
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { show(cur); }, 150); });
    show(0);
  })();

  /* =====================================================================
     3. How deep to buy: premium, discount, and the reward to risk at the
        old high from each depth (stop 2 under the swing)
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ote-depth]");
    if (!root) return;
    var svg = root.querySelector("svg"), out = root.querySelector(".ote-dout"), slider = root.querySelector('[name="depth"]'), val = root.querySelector(".ote-dval");
    var dirBtns = root.querySelectorAll("[data-dir]"), preBtns = root.querySelectorAll("[data-r]");
    var dir = 1;
    function zone(r) {
      if (r < 0.382) return { k: "no", t: "Noise, not a pullback", p: "Under 0.382 the move is still one leg. Redraw the fib on the latest high and keep waiting." };
      if (r < 0.5) return { k: "no", t: "Shallow: strong trend, poor price", p: "Price is still in premium. The target is the old high, close by, and the stop is far under the swing. Usually not worth the risk." };
      if (r < 0.618) return { k: "b", t: "The Golden Zone", p: "0.5 to 0.618. Price often turns here: you're in discount now, and the reward finally outgrows the risk." };
      if (r <= 0.786) return { k: "a", t: "The OTE: the optimal trade entry", p: "0.618 to 0.786, deep in discount. 0.702, the middle, is where the strategy's limit order sits." };
      if (r < 1) return { k: "b", t: "Past 0.786: best price, fewest fills", p: "The stop is tight and the target the same, so the ratio is the best. But price often turns before it gets this deep: you miss winners." };
      return { k: "no", t: "Through the swing: the idea is wrong", p: "Past the 1, the swing that started the impulse has broken. The trend you were buying is gone." };
    }
    function draw() {
      var r = parseFloat(slider.value), narrow = isNarrow(svg, 600);
      var W = narrow ? 440 : 1180, H = narrow ? 520 : 360;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.25 : 1;
      var top = 50, bot = H - 40, xa = narrow ? 30 : 80, xb = narrow ? 150 : 330, x1 = narrow ? 330 : 900;
      var lo = 4010, hi = 4060, stopP = dir > 0 ? lo - 2 : hi + 2;
      /* price to y: the chart always shows the swing range plus margin */
      var pmn = lo - 8, pmx = hi + 8;
      function y(p) { return bot - (p - pmn) / (pmx - pmn) * (bot - top); }
      var a = dir > 0 ? lo : hi, b = dir > 0 ? hi : lo;     // a = the 1, b = the 0
      function lv(q) { return b - q * (b - a); }
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      s += txt(16, 26 * FS, dir > 0 ? "Bullish: 1 on the swing low, 0 on the swing high" : "Bearish: 1 on the swing high, 0 on the swing low", C.faint, 12);
      var mid = (hi + lo) / 2;
      s += rect(xb, y(hi), x1 - xb, y(mid) - y(hi), C.dn, 0.09);
      s += rect(xb, y(mid), x1 - xb, y(lo) - y(mid), C.up, 0.09);
      s += txt(x1 - 8, y(hi) + 18 * FS, "premium" + (dir > 0 ? "" : " · sell here"), C.dn, 12, "end", 600);
      s += txt(x1 - 8, y(lo) - 8 * FS, "discount" + (dir > 0 ? " · buy here" : ""), C.up, 12, "end", 600);
      s += rect(xb, y(lv(0.618)), x1 - xb, y(lv(0.786)) - y(lv(0.618)), C.gold, 0.16);
      s += ln(xa, y(a), xb, y(b), dir > 0 ? C.up : C.dn, null, 4);
      RATIOS.forEach(function (q) {
        var col = q >= 0.618 && q <= 0.786 ? C.gold : q === 0.5 ? C.ink : C.faint;
        s += hl(xb, x1, y(lv(q)), col, "5 4", 1, 0.85);
        s += txt(x1 + 6, y(lv(q)) + 4 * FS, RLAB[q], col, 11.5, "start", q === 0.702 ? 700 : null);
      });
      /* the entry at depth r */
      var rr = Math.min(Math.max(r, 0), 1.05), e = lv(rr), risk = Math.abs(e - stopP), rew = Math.abs(b - e);
      var xe = narrow ? 240 : 640;
      s += ln(xb, y(b), xe, y(e), dir > 0 ? C.dn : C.up, "6 5", 2);
      s += hl(xe - 40, x1, y(stopP), C.dn, "5 4", 1.6);
      s += txt(xe - 44, y(stopP) + 4 * FS, "stop", C.dn, 11.5, "end", 600);
      s += hl(xe - 40, x1, y(e), C.ink, null, 2);
      s += dot(xe, y(e), 6 * FS, C.ink);
      s += txt(xe + 10, y(e) + (dir > 0 ? 18 : -10) * FS, (dir > 0 ? "buy " : "sell ") + px(e), C.ink, 12.5, "start", 700);
      if (rr < 1) {
        s += rect(xe - 30, Math.min(y(e), y(b)), 18, Math.abs(y(b) - y(e)), C.up, 0.35);
        s += rect(xe - 30, Math.min(y(e), y(stopP)), 18, Math.abs(y(stopP) - y(e)), C.dn, 0.35);
      }
      s += txt(W - 8, H - 8, "Illustrative · target the old " + (dir > 0 ? "high" : "low") + ", stop 2 past the swing", C.faint, 11, "end");
      svg.innerHTML = s; FS = 1;
      val.textContent = r.toFixed(3);
      var z = zone(r), ratio = rr < 1 ? rew / risk : 0;
      out.className = "chk-out ote-dout is-" + z.k;
      out.innerHTML = "<b>" + (rr < 1 ? ratio.toFixed(2) + " : 1" : "no trade") + " &middot; " + z.t + "</b><p>" + (rr < 1 ? "Risk " + f2(risk) + " to make " + f2(rew) + " at the old " + (dir > 0 ? "high" : "low") + ". " : "") + z.p + "</p>";
      preBtns.forEach(function (bt) { bt.setAttribute("aria-pressed", Math.abs(parseFloat(bt.getAttribute("data-r")) - r) < 0.0005 ? "true" : "false"); });
      dirBtns.forEach(function (bt) { bt.setAttribute("aria-pressed", +bt.getAttribute("data-dir") === dir ? "true" : "false"); });
    }
    slider.addEventListener("input", draw);
    preBtns.forEach(function (bt) { bt.addEventListener("click", function () { slider.value = bt.getAttribute("data-r"); draw(); }); });
    dirBtns.forEach(function (bt) { bt.addEventListener("click", function () { dir = +bt.getAttribute("data-dir"); draw(); }); });
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
    draw();
  })();

  /* =====================================================================
     4. Strategy two: the major level on the 1-hour, the double top on the
        5-minute, the neckline break, a sell limit at 0.618 of the break
     ===================================================================== */
  var TWO = (function () {
    var LV_LO = 1.1520, LV_HI = 1.1530;
    var T1 = 1.1528, T2 = 1.1527, NECK = 1.1508, LOWB = 1.1496;
    var SH = 1.1528;                                   // the swing high the impulse starts from
    var SELL = LOWB + 0.618 * (SH - LOWB), SSTOP = 1.1531, TGT = 1.1460;
    return { LV_LO: LV_LO, LV_HI: LV_HI, T1: T1, T2: T2, NECK: NECK, LOWB: LOWB, SH: SH, SELL: SELL, SSTOP: SSTOP, TGT: TGT,
             RISKP: (SSTOP - SELL) * 1e4, REWP: (SELL - TGT) * 1e4 };
  })();
  (function () {
    var root = document.querySelector("[data-ote-two]");
    if (!root) return;
    var svg = root.querySelector("svg"), btn = root.querySelector("[data-play]");
    function p5(v) { return v.toFixed(4); }
    /* 1-hour: the level held as support, as resistance, broke, came back */
    var HB = [[1.1575, 1.1582, 1.1550, 1.1554], [1.1554, 1.1559, 1.1526, 1.1530], [1.1530, 1.1554, 1.1522, 1.1550], [1.1550, 1.1566, 1.1544, 1.1562],
              [1.1562, 1.1564, 1.1538, 1.1542], [1.1542, 1.1546, 1.1521, 1.1536], [1.1536, 1.1540, 1.1505, 1.1510], [1.1510, 1.1518, 1.1492, 1.1498],
              [1.1498, 1.1528, 1.1495, 1.1522], [1.1522, 1.1530, 1.1508, 1.1514], [1.1514, 1.1518, 1.1482, 1.1488], [1.1488, 1.1528, 1.1485, 1.1518],
              [1.1518, 1.1529, 1.1515, 1.1526]];
    /* 5-minute: up into the level, two tops, the neckline, the break, the pullback to 0.618, the fall */
    var M = [[1.1506, 1.1512, 1.1504, 1.1511], [1.1511, 1.1519, 1.1510, 1.1518], [1.1518, 1.1528, 1.1517, 1.1523], [1.1523, 1.1524, 1.1513, 1.1515],
             [1.1515, 1.1516, 1.1508, 1.1511], [1.1511, 1.1521, 1.1509, 1.1520], [1.1520, 1.1527, 1.1518, 1.1519], [1.1519, 1.1520, 1.1510, 1.1511],
             [1.1511, 1.1512, 1.1501, 1.1503], [1.1503, 1.1505, 1.1496, 1.1499], [1.1499, 1.1508, 1.1498, 1.1506], [1.1506, 1.1516, 1.1505, 1.1513],
             [1.1513, 1.1517, 1.1509, 1.1510], [1.1510, 1.1511, 1.1494, 1.1496], [1.1496, 1.1498, 1.1480, 1.1482], [1.1482, 1.1485, 1.1466, 1.1469],
             [1.1469, 1.1472, 1.1458, 1.1461]];
    var T = 0, raf = 0, last = 0, END = 9.5;
    function draw() {
      var narrow = isNarrow(svg, 600);
      var W = narrow ? 440 : 1180, H = narrow ? 860 : 420;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.2 : 1;
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      /* left / top: the 1-hour */
      var a = narrow ? { x0: 16, x1: 340, yt: 70, yb: 360, tx: 346 } : { x0: 24, x1: 380, yt: 80, yb: 380, tx: 386 };
      var b = narrow ? { x0: 16, x1: 300, yt: 470, yb: 800, tx: 306 } : { x0: 520, x1: 1000, yt: 80, yb: 380, tx: 1006 };
      var pmn = 1.1450, pmx = 1.1585;
      function ya(p) { return a.yb - (p - pmn) / (pmx - pmn) * (a.yb - a.yt); }
      var dxa = (a.x1 - a.x0) / HB.length, sh = clamp01(T / 2.4) * HB.length;
      s += txt(a.x0, a.yt - 40 * FS, "1-hour · the major level", C.ink, 14, "start", 700);
      s += txt(a.x0, a.yt - 20 * FS, "support, resistance, broken, retested", C.faint, 12);
      s += rect(a.x0, ya(TWO.LV_HI), a.x1 - a.x0, ya(TWO.LV_LO) - ya(TWO.LV_HI), C.purple, 0.22);
      s += tag(a.tx, ya((TWO.LV_HI + TWO.LV_LO) / 2), narrow ? "level" : "1.1520–30", C.purple, 1, C.ink);
      HB.forEach(function (q, i) { s += candle(a.x0 + dxa * (i + 0.5), ya, q, clamp01(sh - i), Math.max(4, dxa * 0.55), 1); });
      [1, 5, 8, 11].forEach(function (i, k) { s += ring(a.x0 + dxa * (i + 0.5), ya(i === 1 || i === 5 ? HB[i][2] : HB[i][1]), 9 * FS, C.purple, 2, fade(T, 0.4 + k * 0.5, 0.3)); });
      s += txt(a.x0 + dxa * 11.5, ya(TWO.LV_HI) - 26 * FS, narrow ? "back into it" : "broke, now back into it", C.purple, 12, "middle", 700, fade(T, 2.4, 0.3));
      s += txt(a.x0, a.yb + 26 * FS, "Zoom in one time frame →", C.faint, 12, "start", 600, fade(T, 2.6, 0.3));

      /* right / bottom: the 5-minute */
      var pm2 = 1.1452, px2 = 1.1536;
      function yb(p) { return b.yb - (p - pm2) / (px2 - pm2) * (b.yb - b.yt); }
      var dxb = (b.x1 - b.x0) / M.length, t0 = 2.8, sh2 = clamp01((T - t0) / 5.6) * M.length;
      s += txt(b.x0, b.yt - 40 * FS, "5-minute · the confirmation and the entry", C.ink, 14, "start", 700, fade(T, t0, 0.3));
      s += txt(b.x0, b.yt - 20 * FS, "double top, neckline break, fib on the break", C.faint, 12, "start", null, fade(T, t0, 0.3));
      s += rect(b.x0, yb(TWO.LV_HI), b.x1 - b.x0, yb(TWO.LV_LO) - yb(TWO.LV_HI), C.purple, 0.16 * fade(T, t0, 0.3));
      function bx(i) { return b.x0 + dxb * (i + 0.5); }
      /* the tops */
      var to = fade(T, t0 + 2.2, 0.3);
      s += ring(bx(2), yb(TWO.T1), 9 * FS, C.dn, 2, to); s += ring(bx(6), yb(TWO.T2), 9 * FS, C.dn, 2, to);
      s += txt(bx(4), yb(TWO.T1) - 16 * FS, "double top", C.dn, 12, "middle", 700, to);
      /* the neckline */
      var no = fade(T, t0 + 2.6, 0.3);
      s += hl(bx(3), b.x1, yb(TWO.NECK), C.orange, "5 4", 1.6, no);
      s += tag(b.tx, yb(TWO.NECK), narrow ? "neck" : "neckline " + p5(TWO.NECK), C.orange, no);
      var bo = fade(T, t0 + 3.0, 0.3);
      s += txt(bx(8) + dxb, yb(TWO.LOWB) + 22 * FS, "break: confirmed", C.orange, 12, "start", 700, bo * (1 - fade(T, t0 + 4.2, 0.3)));
      /* the fib on the bearish impulse: 1 on the swing high, 0 on the low */
      var fo = fade(T, t0 + 3.6, 0.4);
      if (fo > 0) {
        [0, 0.5, 0.618, 0.786, 1].forEach(function (q) {
          var p = TWO.LOWB + q * (TWO.SH - TWO.LOWB), col = q === 0.618 ? C.gold : q === 0.786 ? C.gold : C.faint;
          s += hl(bx(6), b.x1, yb(p), col, q === 0.618 ? null : "4 4", q === 0.618 ? 1.8 : 1, fo * 0.9);
          if (!narrow || q === 0.618) s += txt(b.x1 - 4, yb(p) - 4, RLAB[q], col, 11, "end", q === 0.618 ? 700 : null, fo);
        });
        s += tag(b.tx, yb(TWO.SELL), narrow ? "sell" : "sell limit " + p5(TWO.SELL), C.gold, fo);
        s += hl(bx(6), b.x1, yb(TWO.SSTOP), C.dn, "5 4", 1.6, fo);
        s += tag(b.tx, yb(TWO.SSTOP) - 16 * FS, narrow ? "stop" : "stop " + p5(TWO.SSTOP), C.dn, fo);
        s += hl(bx(9), b.x1, yb(TWO.TGT), C.cyan, "2 4", 1.6, fo);
        s += tag(b.tx, yb(TWO.TGT), narrow ? "target" : "target " + p5(TWO.TGT), C.cyan, fo);
        s += txt(bx(9), yb(TWO.LOWB) - 8, narrow ? "" : "too late to sell here: wait", C.dim, 11.5, "middle", 600, fo * (1 - fade(T, t0 + 4.6, 0.3)));
      }
      M.forEach(function (q, i) { s += candle(bx(i), yb, q, clamp01(sh2 - i), Math.max(4, dxb * 0.55), 1); });
      var fi = fade(T, t0 + 4.3, 0.3);
      s += ring(bx(11), yb(TWO.SELL), 10 * FS, C.gold, 2.2, fi);
      s += txt(bx(11), yb(TWO.SELL) - 16 * FS, "filled", C.gold, 12, "middle", 700, fi);
      var go = fade(T, t0 + 5.6, 0.3);
      s += ring(bx(16), yb(TWO.TGT), 10 * FS, C.cyan, 2.2, go);
      s += txt(b.x0, b.yb + 26 * FS, "Risk " + TWO.RISKP.toFixed(1) + " pips, reward " + TWO.REWP.toFixed(1) + " · " + (TWO.REWP / TWO.RISKP).toFixed(1) + "R", C.cyan, 13, "start", 700, go);
      s += txt(W - 8, H - 8, "Illustrative · made-up bars", C.faint, 11, "end");
      svg.innerHTML = s; FS = 1;
    }
    function tick(t) { T += Math.min(0.1, (t - last) / 1000); last = t; if (T >= END) T = END; draw(); if (T < END) raf = requestAnimationFrame(tick); }
    function play() { cancelAnimationFrame(raf); T = 0; last = performance.now(); if (REDUCED) { T = END; draw(); return; } raf = requestAnimationFrame(tick); }
    btn.addEventListener("click", play);
    T = END; draw();
    if (!REDUCED && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); play(); } }, { threshold: 0.35 });
      io.observe(svg);
    }
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
    window.OTETwo = TWO;   // exposed for testing
  })();

  /* =====================================================================
     5. The calculator
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ote-calc]");
    if (!root) return;
    var out = root.querySelector(".ote-cout"), calc = root.querySelector(".ote-ccalc");
    function v(n) { var e = root.querySelector('[name="' + n + '"]'); return e.tagName === "SELECT" ? e.value : parseFloat(e.value); }
    function money(x) { return "$" + Math.round(x).toLocaleString("en-US"); }
    function row(a, b, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + a + "</span><b>" + b + "</b></div>"; }
    function run() {
      var side = v("side"), st = v("start"), en = v("end"), lvl = parseFloat(v("lvl")), buf = v("buf"), t1 = v("tp1"), t2 = v("tp2"), risk = v("risk"), pv = v("pv");
      var long = side === "long";
      if ([st, en, buf, t1, t2, risk, pv].some(function (q) { return !isFinite(q); })) { out.className = "chk-out ote-cout is-no"; out.innerHTML = "<b>Fill in every box</b><p>Numbers only.</p>"; calc.innerHTML = ""; return; }
      if (long ? en <= st : en >= st) {
        out.className = "chk-out ote-cout is-no";
        out.innerHTML = "<b>Check the swing</b><p>" + (long ? "For a long the impulse runs up: the end (the swing high) has to be above the start (the swing low)." : "For a short the impulse runs down: the end (the swing low) has to be below the start (the swing high).") + "</p>";
        calc.innerHTML = ""; return;
      }
      var e = fibAt(st, en, lvl), stop = long ? st - buf : st + buf, rk = Math.abs(e - stop);
      var g1 = long ? t1 - e : e - t1, g2 = long ? t2 - e : e - t2;
      var r1 = g1 / rk, r2 = g2 / rk, rb = (r1 + r2) / 2;
      var units = pv > 0 && rk > 0 ? Math.floor(risk / (rk * pv)) : 0;
      var bad = g1 <= 0 || g2 <= 0;
      out.className = "chk-out ote-cout " + (bad ? "is-no" : r1 >= 1 ? "is-a" : "is-b");
      out.innerHTML = "<b>" + (long ? "Buy" : "Sell") + " limit " + px(e) + " &middot; " + (bad ? "check the targets" : rb.toFixed(2) + "R") + "</b><p>" +
        (bad ? "A target is on the wrong side of the entry." : "Half off at TP1 (" + r1.toFixed(2) + "R), stop to entry, the rest at TP2 (" + r2.toFixed(2) + "R). If TP1 never comes, the loss is 1R.") + "</p>";
      var h = "";
      [0, 0.382, 0.5, 0.618, 0.702, 0.786, 1].forEach(function (q) { h += row(RLAB[q] + (q === 0.5 ? " &middot; premium / discount" : q === lvl ? " &middot; your entry" : ""), px(fibAt(st, en, q))); });
      h += row("Stop (" + f2(buf) + " past the swing)", px(stop));
      h += row("Risk per unit", f2(rk));
      h += row("Size for " + money(risk), units > 0 ? units.toLocaleString("en-US") + (units === 1 ? " unit" : " units") + " &middot; " + money(units * rk * pv) + " at risk" : "under 1 unit: risk less or skip");
      h += row("Half at TP1, half at TP2", rb.toFixed(2) + "R" + (units > 0 ? " &middot; +" + money(rb * units * rk * pv) : ""), "tot");
      calc.innerHTML = h;
    }
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    root.querySelector("select[name=side]").addEventListener("change", function (ev) {
      var long = ev.target.value === "long";
      var set = function (n, x) { root.querySelector('[name="' + n + '"]').value = x; };
      if (long) { set("start", 4010); set("end", 4060); set("tp1", 4057); set("tp2", 4090); }
      else { set("start", 4060); set("end", 4010); set("tp1", 4013); set("tp2", 3980); }
      run();
    });
    run();
  })();
})();
