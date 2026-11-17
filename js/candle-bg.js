/* candle-bg.js — animated 3D chart backgrounds behind setup and fundamentals page titles.

   Put data-candle-bg="<scene>" on the page's header.top. The script adds a full-width,
   decorative canvas behind the title: a camera glides beside a candle chart that prints
   live, and each scene scripts the price story and overlays that page is about
   (the opening range box, VWAP bands, GEX walls, a trailing stop…). Styles: css/candle-bg.css.

   Scenes are listed in SCENES below. Each one has:
     init(st)       optional, once
     story(st)      returns the next chapter: [[count, fn(st, k)], …]; fn returns bar(st, {...})
     ind            indicators to compute: ema9, ema21, vwap, bb, atr, zl, chand, sar, macd, ma, qqe, vavg, avwap
                    (avwap: anchored from the bar a story marks with st.anchorNext = true, source low)
     lines, bands   series drawn through the chart
     floor          "vol" (default), "macd", "qqe" or "rvol"
     profile        true draws a volume profile wall behind the candles
*/
(function () {
  "use strict";
  var host = document.querySelector("[data-candle-bg]");
  if (!host) return;

  /* ---------- colors ---------- */
  var BLUE = "41,151,255", GREEN = "48,209,88", RED = "255,69,58", ORANGE = "255,159,10", SILK = "245,245,247", GRAY = "134,134,139", PURPLE = "191,90,242";

  /* ---------- helpers for scenes ---------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function bar(st, o) {
    o = o || {};
    var op = o.open != null ? o.open : st.price, n = o.n != null ? o.n : 1;
    var c = op + (o.d || 0) + rnd(-n, n);
    if (o.to != null) c = op + (o.to - op) * (o.pull || 0.35) + rnd(-n, n) * 0.6;
    if (o.cap != null) c = Math.min(c, o.cap - rnd(0.15, 0.9));
    if (o.flo != null) c = Math.max(c, o.flo + rnd(0.15, 0.9));
    var h = Math.max(op, c) + rnd(0.2, 1.1) * (o.uw || 1), l = Math.min(op, c) - rnd(0.2, 1.1) * (o.lw || 1);
    if (o.cap != null && !o.pierce) h = Math.min(h, o.cap + rnd(-0.1, 0.2));
    if (o.flo != null && !o.pierce) l = Math.max(l, o.flo - rnd(-0.1, 0.2));
    if (o.hi != null) h = Math.max(h, o.hi);
    if (o.lo != null) l = Math.min(l, o.lo);
    return { o: op, c: c, h: h, l: l, v: o.v != null ? o.v : rnd(0.3, 0.55), flash: o.flash, mk: o.mk, fade: o.fade };
  }
  function recentHigh(st, n) { var m = -1e9; st.candles.slice(-n).forEach(function (q) { m = Math.max(m, q.h); }); return m === -1e9 ? st.price + 2 : m; }
  function recentLow(st, n) { var m = 1e9; st.candles.slice(-n).forEach(function (q) { m = Math.min(m, q.l); }); return m === 1e9 ? st.price - 2 : m; }
  function level(st, y, label, col, key) { var L = { y: y, i0: st.candles.length, i1: null, label: label, col: col || BLUE, key: !!key }; st.levels.push(L); return L; }
  function closeLevels(st) { st.levels.forEach(function (L) { if (L.i1 == null) L.i1 = st.candles.length - 1; }); }
  function divider(st) { st.divs.push(st.candles.length); }
  function session(st) { st.sess = st.candles.length; divider(st); }
  function rep(n, f) { return [n, f]; }

  /* ---------- the scenes ---------- */
  var SCENES = {
    /* PMH Break: chop under the premarket high, then the break */
    "pmh-break": {
      story: function (st) {
        var L;
        return [
          rep(1, function (st) { closeLevels(st); session(st); L = level(st, Math.max(recentHigh(st, 25), st.price + 3), "Premarket high", BLUE, true); return bar(st, { cap: L.y }); }),
          rep(15, function (st) { return bar(st, { n: 1.3, cap: L.y }); }),
          rep(1, function (st) { L.col = GREEN; L.label = "Premarket high, broken"; return bar(st, { d: 3.4, n: 0.4, v: 1, flash: GREEN }); }),
          rep(2, function (st) { return bar(st, { d: 2.4, n: 0.6, v: 0.85 }); }),
          rep(14, function (st) { return bar(st, { d: 0.6, n: 1.2 }); }),
          rep(7, function (st) { return bar(st, { d: -0.6, n: 1 }); })
        ];
      }
    },

    /* Opening range break: box the first six bars, wait, break the top */
    "opening-range-break": {
      story: function (st) {
        var hi, lo, L, i0;
        return [
          rep(1, function (st) { closeLevels(st); session(st); i0 = st.candles.length; return bar(st, { n: 2.2, v: 0.8 }); }),
          rep(5, function (st) { return bar(st, { n: 2.2, v: 0.7 }); }),
          rep(1, function (st) {
            var seg = st.candles.slice(i0); hi = -1e9; lo = 1e9;
            seg.forEach(function (q) { hi = Math.max(hi, q.h); lo = Math.min(lo, q.l); });
            st.boxes.push({ i0: i0, i1: i0 + 5, y0: lo, y1: hi, col: BLUE });
            L = level(st, hi, "Opening range high", BLUE, true); L.i0 = i0; level(st, lo, "Range low", GRAY).i0 = i0;
            return bar(st, { n: 1, cap: hi, flo: lo });
          }),
          rep(6, function (st) { return bar(st, { n: 1.1, cap: hi, flo: lo }); }),
          rep(1, function (st) { L.col = GREEN; L.label = "Range high, broken"; return bar(st, { d: 3.2, n: 0.4, v: 1, flash: GREEN }); }),
          rep(12, function (st) { return bar(st, { d: 0.55, n: 1.2 }); }),
          rep(5, function (st) { return bar(st, { d: -0.7, n: 1 }); })
        ];
      }
    },

    /* Market memory: yesterday's box, today's wick at its edge */
    "market-memory": {
      story: function (st) {
        var yH, yL, i0, H, Lw;
        return [
          rep(1, function (st) { closeLevels(st); session(st); i0 = st.candles.length; return bar(st, { d: 1, n: 1.4 }); }),
          rep(9, function (st) { return bar(st, { d: 0.9, n: 1.4 }); }),
          rep(10, function (st) { return bar(st, { d: -1, n: 1.4 }); }),
          rep(1, function (st) {
            var seg = st.candles.slice(i0); yH = -1e9; yL = 1e9;
            seg.forEach(function (q) { yH = Math.max(yH, q.h); yL = Math.min(yL, q.l); });
            st.boxes.push({ i0: i0, i1: st.candles.length - 1, y0: yL, y1: yH, col: PURPLE });
            session(st);
            H = level(st, yH, "Yesterday's high", PURPLE, true); H.i0 = i0; Lw = level(st, yL, "Yesterday's low", PURPLE); Lw.i0 = i0;
            return bar(st, { to: yH - 1.5, n: 1 });
          }),
          rep(7, function (st) { return bar(st, { to: yH - 0.6, n: 0.9, cap: yH }); }),
          rep(1, function (st) { H.col = RED; H.label = "Wick at yesterday's high"; return bar(st, { d: -1.4, n: 0.3, hi: yH + 2.2, pierce: true, cap: yH, v: 0.95, flash: RED, uw: 1 }); }),
          rep(10, function (st) { return bar(st, { to: yL + 1.2, n: 1, flo: yL }); }),
          rep(1, function (st) { Lw.col = GREEN; Lw.label = "Wick at yesterday's low"; return bar(st, { d: 1.4, n: 0.3, lo: yL - 2.2, pierce: true, flo: yL, v: 0.95, flash: GREEN }); }),
          rep(6, function (st) { return bar(st, { d: 0.7, n: 1 }); })
        ];
      }
    },

    /* GEX levels: pinned between call wall and flip, then the flip gives way */
    "gex-levels": {
      story: function (st) {
        var F, CW, PW;
        return [
          rep(1, function (st) {
            closeLevels(st); session(st);
            var f = st.price - 2;
            CW = level(st, f + 9, "Call wall", GREEN); F = level(st, f, "Gamma flip", ORANGE, true); PW = level(st, f - 10, "Put wall", RED);
            return bar(st, { n: 1, cap: CW.y, flo: F.y });
          }),
          rep(13, function (st, k) { return bar(st, { to: k % 6 < 3 ? CW.y - 1 : F.y + 1, pull: 0.45, n: 0.9, cap: CW.y, flo: F.y }); }),
          rep(1, function (st) { F.label = "Below the flip: trend"; return bar(st, { d: -3.2, n: 0.4, v: 1, flash: ORANGE }); }),
          rep(9, function (st) { return bar(st, { d: -0.9, n: 1.1, flo: PW.y }); }),
          rep(4, function (st) { return bar(st, { to: PW.y + 0.6, n: 0.6, flo: PW.y, v: 0.7 }); }),
          rep(7, function (st) { return bar(st, { d: 1, n: 1 }); })
        ];
      }
    },

    /* Volume profile: rotate inside value, then break the value area high */
    "volume-profile-system": {
      profile: true,
      story: function (st) {
        var C, VAH, VAL;
        return [
          rep(1, function (st) {
            closeLevels(st); C = st.price;
            VAH = level(st, C + 4.5, "Value area high", BLUE, true); level(st, C, "POC", GREEN); VAL = level(st, C - 4.5, "Value area low", BLUE);
            return bar(st, { to: C, n: 1.4, v: 0.6 });
          }),
          rep(17, function (st, k) { return bar(st, { to: k % 8 < 4 ? C + 3 : C - 3, pull: 0.3, n: 1.4, cap: VAH.y, flo: VAL.y, v: rnd(0.45, 0.8) }); }),
          rep(1, function (st) { VAH.col = GREEN; VAH.label = "Out of value"; return bar(st, { d: 3.2, n: 0.4, v: 1, flash: GREEN }); }),
          rep(9, function (st) { return bar(st, { d: 0.7, n: 1.2, v: 0.35 }); }),
          rep(6, function (st) { return bar(st, { d: -0.5, n: 1 }); })
        ];
      }
    },

    /* Volume S/R rejection: a heavy-volume level, revisited and rejected */
    "volume-sr-rejection": {
      story: function (st) {
        var L, y;
        return [
          rep(1, function (st) { closeLevels(st); y = st.price + 8; return bar(st, { d: 1, n: 1 }); }),
          rep(6, function (st) { return bar(st, { to: y - 0.3, pull: 0.3, n: 1 }); }),
          rep(1, function (st) { L = level(st, y, "High-volume level", ORANGE, true); return bar(st, { open: st.price, to: y, n: 0.3, v: 1, hi: y + 0.8, lo: y - 0.8, mk: { t: "Heavy volume", col: ORANGE } }); }),
          rep(8, function (st) { return bar(st, { d: -1, n: 1 }); }),
          rep(7, function (st) { return bar(st, { to: y - 0.4, pull: 0.3, n: 0.9, cap: y }); }),
          rep(1, function (st) { L.col = RED; L.label = "Rejected"; return bar(st, { d: -2.4, n: 0.3, hi: y + 1.8, pierce: true, v: 0.95, flash: RED }); }),
          rep(8, function (st) { return bar(st, { d: -0.9, n: 1 }); })
        ];
      }
    },

    /* VWAP reversal: band touch + old level + failure test */
    "vwap-reversal": {
      ind: ["vwap"],
      lines: [{ k: "vwap", col: BLUE, w: 2.5, glow: true, label: "VWAP" }],
      bands: [{ u: "vu", l: "vl", col: BLUE }],
      story: function (st) {
        var L;
        return [
          rep(1, function (st) { closeLevels(st); session(st); L = level(st, st.price + 8, "Old level", SILK, true); return bar(st, { n: 0.8 }); }),
          rep(5, function (st) { return bar(st, { n: 0.8 }); }),
          rep(10, function (st) { return bar(st, { to: L.y - 0.4, pull: 0.22, n: 0.9, cap: L.y }); }),
          rep(1, function (st) { L.col = RED; L.label = "Failure test"; return bar(st, { d: -1.6, n: 0.3, hi: L.y + 1.8, pierce: true, cap: L.y, v: 0.95, flash: RED, mk: { t: "Band + level", col: RED } }); }),
          rep(10, function (st) { return bar(st, { to: st.ser.vwap || st.price - 5, pull: 0.25, n: 0.9 }); })
        ];
      }
    },

    /* Fashionably late: the fast line crosses VWAP after the move has proved itself */
    "fashionably-late": {
      ind: ["vwap", "ema9"],
      lines: [{ k: "vwap", col: BLUE, w: 2.5, glow: true, label: "VWAP" }, { k: "ema", col: ORANGE, w: 2, glow: true, label: "9 EMA" }],
      story: function (st) {
        return [
          rep(1, function (st) { closeLevels(st); session(st); return bar(st, { d: -0.8, n: 1 }); }),
          rep(9, function (st) { return bar(st, { d: -0.8, n: 1 }); }),
          rep(7, function (st) { return bar(st, { d: 0.1, n: 0.9 }); }),
          rep(6, function (st) { return bar(st, { d: 1.1, n: 0.8, v: 0.6 }); }),
          rep(14, function (st) {
            var b = bar(st, { d: 0.6, n: 1 });
            if (!st.crossed && st.ser.ema != null && st.ser.vwap != null && st.ser.ema > st.ser.vwap) { st.crossed = true; b.flash = GREEN; b.mk = { t: "Cross", col: GREEN }; }
            return b;
          }),
          rep(1, function (st) { st.crossed = false; return bar(st, { d: -0.5 }); })
        ];
      }
    },

    /* Three-candle CRT: three higher-timeframe candles drawn as ghosts; candle two sweeps and fails */
    "three-candle-crt": {
      story: function (st) {
        var i0, H, Lo;
        function ghost(st, a) {
          var seg = st.candles.slice(a, a + 5), o = seg[0].o, c = seg[seg.length - 1].c, h = -1e9, l = 1e9;
          seg.forEach(function (q) { h = Math.max(h, q.h); l = Math.min(l, q.l); });
          st.boxes.push({ i0: a, i1: a + 4, y0: l, y1: h, col: c >= o ? GREEN : GRAY, ghost: true, bo: Math.min(o, c), bc: Math.max(o, c) });
          return { h: h, l: l };
        }
        return [
          rep(1, function (st) { closeLevels(st); i0 = st.candles.length; return bar(st, { d: 0.8, n: 1 }); }),
          rep(4, function (st) { return bar(st, { d: 0.8, n: 1 }); }),
          rep(1, function (st) {
            var g = ghost(st, i0); H = level(st, g.h, "CRT high", BLUE, true); H.i0 = i0; Lo = level(st, g.l, "CRT low", GRAY); Lo.i0 = i0;
            i0 = st.candles.length; return bar(st, { d: 1, n: 0.8 });
          }),
          rep(2, function (st) { return bar(st, { d: 1, n: 0.8 }); }),
          rep(1, function (st) { H.col = RED; H.label = "Sweep, back inside"; return bar(st, { d: -2.2, n: 0.3, hi: H.y + 2.4, pierce: true, cap: H.y, v: 1, flash: RED }); }),
          rep(1, function (st) { return bar(st, { d: -0.6, n: 0.6, cap: H.y }); }),
          rep(1, function (st) { ghost(st, i0); i0 = st.candles.length; return bar(st, { d: -1, n: 0.8 }); }),
          rep(4, function (st) { return bar(st, { to: Lo.y + 0.5, pull: 0.35, n: 0.8 }); }),
          rep(1, function (st) { ghost(st, i0); return bar(st, { n: 0.8 }); }),
          rep(4, function (st) { return bar(st, { d: 0.3, n: 1 }); })
        ];
      }
    },

    /* ATR band hybrid: the trend rides its band, dips to the lower band get bought */
    "atr-band-hybrid": {
      ind: ["atr"],
      lines: [{ k: "au", col: BLUE, w: 1.6, label: "Upper band" }, { k: "am", col: GRAY, w: 1, dash: true }, { k: "al", col: GREEN, w: 2, glow: true, label: "Lower ATR band" }],
      bands: [{ u: "au", l: "al", col: BLUE, a: 0.05 }],
      story: function (st) {
        return [
          rep(7, function (st) { return bar(st, { d: 0.7, n: 1 }); }),
          rep(3, function (st) { return bar(st, { d: -1.5, n: 0.8, flo: st.ser.al != null ? st.ser.al : null }); }),
          rep(1, function (st) { return bar(st, { d: 1.2, n: 0.4, lo: st.ser.al != null ? st.ser.al - 0.2 : null, flash: GREEN, mk: { t: "Band touch", col: GREEN } }); })
        ];
      }
    },

    /* Cup and handle: a rounded base, a shallow handle, the break of the rim */
    "cup-and-handle": {
      lines: [{ k: "cup", col: GREEN, w: 3, glow: true }],
      story: function (st) {
        var R, L, depth = 9, i0;
        function cupBar(st, k, n, from, to) {
          var t = (k + 1) / n, y = from + (to - from) * (1 - Math.cos(t * Math.PI)) / 2;
          var b = bar(st, { to: y, pull: 0.85, n: 0.7 }); return b;
        }
        return [
          rep(1, function (st) { closeLevels(st); R = st.price + 0.5; L = level(st, R, "Handle high", BLUE, true); i0 = st.candles.length; return bar(st, { d: -0.3, n: 0.6 }); }),
          rep(9, function (st, k) { var b = cupBar(st, k, 9, R, R - depth); b.cup = Math.min(b.o, b.c) - 0.6; return b; }),
          rep(4, function (st) { var b = bar(st, { to: R - depth, pull: 0.5, n: 0.5 }); b.cup = Math.min(b.o, b.c) - 0.6; return b; }),
          rep(9, function (st, k) { var b = cupBar(st, k, 9, R - depth, R - 0.6); b.cup = Math.min(b.o, b.c) - 0.6; b.c = Math.min(b.c, R - 0.3); b.h = Math.min(b.h, R); return b; }),
          rep(4, function (st) { return bar(st, { d: -0.5, n: 0.5, cap: R }); }),
          rep(1, function (st) { L.col = GREEN; L.label = "Rim broken"; return bar(st, { d: 3, n: 0.4, v: 1, flash: GREEN }); }),
          rep(9, function (st) { return bar(st, { d: 0.7, n: 1 }); })
        ];
      }
    },

    /* Day three breakout: day one runs, day two holds, day three breaks day two's high */
    "day-three-breakout": {
      story: function (st) {
        var d2, i2, L;
        return [
          rep(1, function (st) { closeLevels(st); session(st); return bar(st, { d: 1.2, n: 1, v: 0.9, mk: { t: "Day 1", col: SILK } }); }),
          rep(9, function (st) { return bar(st, { d: 1, n: 1, v: 0.7 }); }),
          rep(1, function (st) { session(st); i2 = st.candles.length; return bar(st, { n: 1, mk: { t: "Day 2", col: SILK } }); }),
          rep(9, function (st) { return bar(st, { n: 1, d: 0.05 }); }),
          rep(1, function (st) {
            d2 = -1e9; st.candles.slice(i2).forEach(function (q) { d2 = Math.max(d2, q.h); });
            session(st); L = level(st, d2, "Day-two high", BLUE, true); L.i0 = i2;
            return bar(st, { n: 0.8, cap: d2, mk: { t: "Day 3", col: SILK } });
          }),
          rep(4, function (st) { return bar(st, { n: 0.9, cap: d2 }); }),
          rep(1, function (st) { L.col = GREEN; L.label = "Day-two high, broken"; return bar(st, { d: 3, n: 0.4, v: 1, flash: GREEN }); }),
          rep(8, function (st) { return bar(st, { d: 0.6, n: 1 }); })
        ];
      }
    },

    /* Energy in the tank: the bands squeeze, then the release */
    "energy-in-the-tank": {
      ind: ["bb"],
      lines: [{ k: "bu", col: PURPLE, w: 1.8, glow: true, label: "Squeeze" }, { k: "bl", col: PURPLE, w: 1.8, glow: true }],
      bands: [{ u: "bu", l: "bl", col: PURPLE, a: 0.08 }],
      story: function (st) {
        return [
          rep(20, function (st, k) { var n = 1.6 - k * 0.065; return bar(st, { n: n, to: st.mid || st.price, pull: 0.15, v: 0.5 - k * 0.012 }); }),
          rep(1, function (st) { return bar(st, { d: 3, n: 0.4, v: 1, flash: PURPLE, mk: { t: "Release", col: PURPLE } }); }),
          rep(2, function (st) { return bar(st, { d: 2.2, n: 0.6, v: 0.85 }); }),
          rep(8, function (st) { return bar(st, { d: 0.4, n: 1.3 }); }),
          rep(1, function (st) { st.mid = st.price; return bar(st, { n: 1 }); })
        ];
      }
    },

    /* MACD continuation: the histogram on the floor resets and turns back up with the trend */
    "macd-continuation-scalp": {
      ind: ["macd"],
      floor: "macd",
      story: function (st) {
        return [
          rep(7, function (st) { return bar(st, { d: 0.8, n: 0.9 }); }),
          rep(4, function (st) { return bar(st, { d: -0.6, n: 0.6 }); }),
          rep(1, function (st) { return bar(st, { d: 1.4, n: 0.4, flash: GREEN, mk: { t: "Back above zero", col: GREEN } }); })
        ];
      }
    },

    /* Nine EMA continuation: breakout, pull back to the 9, reclaim */
    "nine-ema-continuation": {
      ind: ["ema9"],
      lines: [{ k: "ema", col: ORANGE, w: 2.5, glow: true, label: "9 EMA" }],
      story: function (st) {
        var L;
        return [
          rep(1, function (st) { closeLevels(st); L = level(st, recentHigh(st, 8) + 0.5, "Breakout level", BLUE, true); return bar(st, { n: 0.8, cap: L.y }); }),
          rep(4, function (st) { return bar(st, { n: 0.8, cap: L.y }); }),
          rep(3, function (st) { L.col = GREEN; return bar(st, { d: 1.8, n: 0.5, v: 0.95 }); }),
          rep(4, function (st) { return bar(st, { to: st.ser.ema != null ? st.ser.ema : st.price - 2, pull: 0.45, n: 0.4, v: 0.3 }); }),
          rep(1, function (st) { return bar(st, { d: 1.6, n: 0.3, lo: st.ser.ema != null ? st.ser.ema - 0.3 : null, flash: GREEN, mk: { t: "Reclaim", col: GREEN } }); }),
          rep(7, function (st) { return bar(st, { d: 0.8, n: 0.9 }); })
        ];
      }
    },

    /* Zero lag pullback: the zero-lag line flips color with the trend; pullbacks into it are the entries */
    "zero-lag-pullback": {
      ind: ["zl"],
      lines: [{ k: "zl", w: 3, glow: true, slope: true, label: "Zero lag" }],
      story: function (st) {
        var dir = st.dir = -(st.dir || -1);
        return [
          rep(8, function (st) { return bar(st, { d: 1 * dir, n: 0.9 }); }),
          rep(3, function (st) { return bar(st, { d: -0.7 * dir, n: 0.6 }); }),
          rep(1, function (st) { return bar(st, { d: 1.4 * dir, n: 0.3, flash: dir > 0 ? GREEN : RED, mk: { t: "Pullback entry", col: dir > 0 ? GREEN : RED } }); }),
          rep(8, function (st) { return bar(st, { d: 0.9 * dir, n: 0.9 }); })
        ];
      }
    },

    /* Knock Twice: break the old high, stay away, come back and knock on it once, then break the new high */
    "knock-twice": {
      story: function (st) {
        var O, N, top;
        return [
          rep(1, function (st) { closeLevels(st); O = level(st, recentHigh(st, 10) + 0.4, "Old high", SILK, true); return bar(st, { n: 0.9, cap: O.y }); }),
          rep(6, function (st) { return bar(st, { n: 1, cap: O.y }); }),
          rep(1, function (st) { O.label = "Old high, broken"; return bar(st, { open: O.y - 0.6, to: O.y + 2.2, pull: 1, n: 0.2, v: 0.9, flash: GREEN }); }),
          rep(4, function (st) { return bar(st, { d: 1.1, n: 0.5, flo: O.y + 0.8, v: 0.6 }); }),
          rep(1, function (st) { top = recentHigh(st, 5); N = level(st, top, "New high", GREEN, false); return bar(st, { d: -0.5, n: 0.3, cap: top, flo: O.y + 0.8 }); }),
          rep(4, function (st) { return bar(st, { to: O.y + 0.9, pull: 0.4, n: 0.3, cap: top, flo: O.y + 0.6 }); }),
          rep(1, function (st) { O.col = GREEN; O.label = "The knock"; return bar(st, { open: st.price, to: O.y + 0.7, pull: 1, n: 0.1, lo: O.y - 0.25, flo: O.y - 0.3, pierce: true, cap: top, v: 0.75, flash: GREEN, mk: { t: "Knock", col: GREEN, below: true } }); }),
          rep(4, function (st) { return bar(st, { to: top - 0.3, pull: 0.4, n: 0.4, cap: top, flo: O.y + 0.3 }); }),
          rep(1, function (st) { N.label = "New high, broken"; N.key = true; return bar(st, { open: st.price, to: top + 1.6, pull: 1, n: 0.2, v: 1, flash: GREEN, mk: { t: "BOS \u2713", col: GREEN } }); }),
          rep(8, function (st) { return bar(st, { d: 0.6, n: 1 }); }),
          rep(6, function (st) { return bar(st, { d: -0.5, n: 1 }); })
        ];
      }
    },

    /* Silver Bullet: the window opens, a swing low is swept, a displacement candle leaves a gap, the limit fills, the target */
    "silver-bullet": {
      story: function (st) {
        var SL, TG, E, c1;
        return [
          rep(1, function (st) {
            closeLevels(st); session(st);
            SL = level(st, recentLow(st, 10) - 0.6, "Swing low", SILK, true); TG = level(st, recentHigh(st, 10) + 2.4, "Untouched high", GRAY);
            st.boxes.push({ i0: st.candles.length, i1: st.candles.length + 22, y0: SL.y - 4, y1: TG.y + 1.2, col: BLUE });
            return bar(st, { to: SL.y + 2.5, pull: 0.3, n: 0.8, flo: SL.y, cap: TG.y });
          }),
          rep(4, function (st) { return bar(st, { to: SL.y + 0.9, pull: 0.35, n: 0.7, flo: SL.y + 0.2, cap: TG.y }); }),
          rep(1, function (st) { SL.col = ORANGE; SL.label = "Swing low, swept"; return bar(st, { d: 0.3, n: 0.2, lo: SL.y - 1.6, pierce: true, flo: SL.y, v: 0.95, flash: ORANGE, mk: { t: "Sweep", col: ORANGE, below: true } }); }),
          rep(1, function (st) { var q = bar(st, { d: 0.4, n: 0.2, uw: 0.4 }); c1 = q; return q; }),
          rep(1, function (st) { return bar(st, { open: st.price, d: 4.2, n: 0.2, v: 1, lw: 0.3, uw: 0.4, flash: GREEN, mk: { t: "Displacement", col: GREEN } }); }),
          rep(1, function (st) {
            var q = bar(st, { open: st.price, d: -0.5, n: 0.2, flo: c1.h + 1.3, uw: 0.6 });
            var n = st.candles.length;
            st.boxes.push({ i0: n - 2, i1: n + 6, y0: c1.h, y1: q.l, col: GREEN });
            E = level(st, q.l, "Limit at the gap", GREEN); E.i0 = n;
            return q;
          }),
          rep(3, function (st) { return bar(st, { to: E.y + 0.4, pull: 0.45, n: 0.3, flo: E.y + 0.15, cap: TG.y - 0.5 }); }),
          rep(1, function (st) { E.label = "Filled"; return bar(st, { open: st.price, to: E.y + 0.6, pull: 1, n: 0.1, lo: E.y - 0.3, pierce: true, flo: E.y - 0.2, v: 0.7, mk: { t: "Fill", col: SILK, below: true } }); }),
          rep(5, function (st) { return bar(st, { d: 0.9, n: 0.6, flo: E.y + 0.2, cap: TG.y - 0.3 }); }),
          rep(1, function (st) { TG.col = GREEN; TG.label = "Target hit"; TG.key = true; return bar(st, { open: st.price, to: TG.y + 0.5, pull: 1, n: 0.2, hi: TG.y + 0.6, v: 0.85, flash: GREEN, mk: { t: "Target", col: GREEN } }); }),
          rep(8, function (st) { return bar(st, { d: -0.3, n: 1 }); }),
          rep(4, function (st) { return bar(st, { d: 0.2, n: 1 }); })
        ];
      }
    },

    /* Gap Give and Go: a gap up, a fast light-volume give into the key level, a quiet range, then the go */
    "gap-give-and-go": {
      ind: ["vwap"],
      lines: [{ k: "vwap", col: BLUE, w: 2, glow: true, label: "VWAP" }],
      story: function (st) {
        var K, OP, PM;
        return [
          rep(1, function (st) { closeLevels(st); session(st); return bar(st, { d: -0.2, n: 0.6, v: 0.35 }); }),
          rep(7, function (st) { return bar(st, { d: 0.05, n: 0.6, v: 0.35 }); }),
          rep(1, function (st) {
            var base = st.price; closeLevels(st); session(st);
            K = level(st, base + 5, "Key level", SILK, true);
            OP = level(st, base + 8.4, "Open", GRAY);
            PM = level(st, base + 10.2, "Premarket high", GRAY);
            return bar(st, { open: base + 8.4, d: -0.5, n: 0.2, v: 0.9, uw: 0.6, flash: GREEN, mk: { t: "Gap up", col: GREEN } });
          }),
          rep(2, function (st) { return bar(st, { d: -1.2, n: 0.2, v: 0.42, uw: 0.3, flo: K.y + 0.6 }); }),
          rep(1, function (st) { K.col = ORANGE; K.label = "The give"; return bar(st, { open: st.price, to: K.y + 0.5, pull: 1, n: 0.1, lo: K.y + 0.05, flo: K.y, v: 0.48, flash: RED, mk: { t: "Give", col: ORANGE, below: true } }); }),
          rep(6, function (st) { return bar(st, { to: K.y + 1.3, pull: 0.5, n: 0.35, flo: K.y + 0.3, cap: K.y + 2.2, v: 0.22, uw: 0.4, lw: 0.4 }); }),
          rep(1, function (st) { K.col = GREEN; K.label = "Held"; return bar(st, { open: st.price, d: 2.6, n: 0.2, v: 1, lw: 0.3, flash: GREEN, mk: { t: "Go", col: GREEN } }); }),
          rep(3, function (st) { return bar(st, { d: 0.7, n: 0.5, v: 0.62, flo: K.y + 1.5 }); }),
          rep(1, function (st) { OP.col = GREEN; OP.label = "Back through the open"; return bar(st, { open: st.price, to: OP.y + 0.9, pull: 1, n: 0.2, v: 0.8, flash: GREEN }); }),
          rep(3, function (st) { return bar(st, { d: 0.5, n: 0.5, v: 0.55 }); }),
          rep(1, function (st) { PM.col = GREEN; PM.label = "Premarket high, the target"; PM.key = true; return bar(st, { open: st.price, to: PM.y + 0.6, pull: 1, n: 0.2, hi: PM.y + 0.7, v: 0.8, flash: GREEN, mk: { t: "Target", col: GREEN } }); }),
          rep(6, function (st) { return bar(st, { d: 0.1, n: 1, v: 0.45 }); })
        ];
      }
    },

    /* Qullamaggie: a big move, a tight base on the 10 and 20-day, the opening-range-high breakout, sell a third, trail the 10 */
    "qullamaggie": {
      ind: ["ma"],
      lines: [{ k: "m10", col: GREEN, w: 2.2, glow: true, label: "10-day" }, { k: "m20", col: ORANGE, w: 1.8, label: "20-day" }],
      story: function (st) {
        var R, L, lo;
        return [
          rep(1, function (st) { closeLevels(st); return bar(st, { d: 1.6, n: 0.4, v: 0.8, mk: { t: "The move", col: GREEN } }); }),
          rep(11, function (st) { return bar(st, { d: 1.15, n: 0.7, v: 0.7 }); }),
          rep(1, function (st) { R = recentHigh(st, 3) + 0.2; lo = R - 5; L = level(st, R, "Base high", SILK, true); return bar(st, { d: -1.4, n: 0.4, cap: R, v: 0.45 }); }),
          rep(3, function (st) { return bar(st, { d: -1.1, n: 0.5, cap: R, flo: lo, v: 0.4 }); }),
          rep(12, function (st, k) { var f = 1 - k / 12; return bar(st, { to: R - 1.2 - f * 1.6, pull: 0.45, n: 0.25 + f * 0.6, cap: R, flo: Math.max(lo, R - 4.2 + k * 0.28), v: 0.36 - k * 0.018 }); }),
          rep(1, function (st) { L.col = GREEN; L.label = "Base high, broken"; return bar(st, { open: st.price, d: 3.4, n: 0.3, v: 1, lw: 0.6, flash: GREEN, mk: { t: "Buy the ORH", col: GREEN } }); }),
          rep(2, function (st) { return bar(st, { d: 1.8, n: 0.5, v: 0.75 }); }),
          rep(1, function (st) { return bar(st, { d: 1.6, n: 0.4, v: 0.7, mk: { t: "Sell \u2153", col: ORANGE } }); }),
          rep(4, function (st) { return bar(st, { d: 0.3, n: 0.9, v: 0.5 }); }),
          rep(3, function (st) { return bar(st, { to: st.ser.m10 != null ? st.ser.m10 + 0.4 : st.price - 1, pull: 0.5, n: 0.4, v: 0.4 }); }),
          rep(6, function (st) { return bar(st, { d: 0.9, n: 0.8, v: 0.55 }); }),
          rep(1, function (st) { return bar(st, { open: st.price, to: st.ser.m10 != null ? st.ser.m10 - 0.8 : st.price - 2.6, pull: 1, n: 0.1, v: 0.7, flash: RED, mk: { t: "Close under the 10", col: RED, below: true } }); }),
          rep(4, function (st) { return bar(st, { d: -0.3, n: 1, v: 0.45 }); })
        ];
      }
    },

    /* Technical Catalyst Breakout: weeks capped under one level, then the break on a volume spike, shallow dips, an add, and out when the tape turns */
    "technical-catalyst-breakout": {
      story: function (st) {
        var R, L;
        return [
          rep(1, function (st) { closeLevels(st); R = Math.max(recentHigh(st, 20), st.price) + 2.6; L = level(st, R, "Capped for weeks \u00b7 a 9/10 level", SILK, true); return bar(st, { to: R - 2.4, pull: 0.5, n: 0.5, cap: R, v: 0.4 }); }),
          rep(4, function (st) { return bar(st, { to: R - 0.3, pull: 0.5, n: 0.4, cap: R, v: 0.4 }); }),
          rep(1, function (st) { return bar(st, { open: st.price, to: R - 1.4, pull: 0.6, n: 0.2, hi: R - 0.05, cap: R, v: 0.45, mk: { t: "Capped", col: ORANGE } }); }),
          rep(5, function (st) { return bar(st, { to: R - 4, pull: 0.35, n: 0.5, cap: R, v: 0.32 }); }),
          rep(5, function (st) { return bar(st, { to: R - 0.4, pull: 0.4, n: 0.4, cap: R, v: 0.36 }); }),
          rep(1, function (st) { return bar(st, { open: st.price, to: R - 1.5, pull: 0.6, n: 0.2, hi: R - 0.05, cap: R, v: 0.42, mk: { t: "Capped again", col: ORANGE } }); }),
          rep(4, function (st) { return bar(st, { to: R - 3.2, pull: 0.35, n: 0.5, cap: R, v: 0.3 }); }),
          rep(4, function (st) { return bar(st, { to: R - 0.5, pull: 0.45, n: 0.3, cap: R, v: 0.4 }); }),
          rep(1, function (st) { L.col = GREEN; L.label = "Cleared \u00b7 the level is the catalyst"; return bar(st, { open: st.price, d: 3.4, n: 0.3, v: 1, lw: 0.4, flash: GREEN, mk: { t: "Volume spike", col: GREEN } }); }),
          rep(2, function (st) { return bar(st, { d: 1.3, n: 0.4, v: 0.75 }); }),
          rep(3, function (st) { return bar(st, { d: -0.25, n: 0.3, v: 0.24, flo: R + 1.4 }); }),
          rep(1, function (st) { return bar(st, { open: st.price, d: 2, n: 0.3, v: 0.7, flash: GREEN, mk: { t: "Add", col: BLUE } }); }),
          rep(3, function (st) { return bar(st, { d: 1, n: 0.5, v: 0.55 }); }),
          rep(1, function (st) { return bar(st, { open: st.price, d: -1, n: 0.2, uw: 1.4, v: 0.65, flash: ORANGE, mk: { t: "Tape turns \u00b7 out", col: ORANGE } }); }),
          rep(6, function (st) { return bar(st, { d: -0.15, n: 0.8, v: 0.4, flo: R + 1 }); })
        ];
      }
    },

    /* Anchored VWAP: a long base, the earnings gap anchors a VWAP from the lows, a messy day one, the dip and reclaim, pullbacks that hold, then a close below: cut half */
    "anchored-vwap": {
      ind: ["avwap"],
      lines: [{ k: "av", col: "90,200,250", w: 2.6, glow: true, label: "AVWAP \u00b7 from the report", brk: "avStart" }],
      story: function (st) {
        var R, L;
        function av(st) { return st.ser.av != null ? st.ser.av : st.price - 3; }
        return [
          rep(1, function (st) { closeLevels(st); st.anchorOff = true; R = Math.max(recentHigh(st, 20), st.price) + 2.4; L = level(st, R, "A long base", SILK, true); return bar(st, { to: R - 2.6, pull: 0.5, n: 0.5, cap: R, v: 0.35 }); }),
          rep(14, function (st, k) { return bar(st, { to: k % 7 < 4 ? R - 0.5 : R - 4, pull: 0.35, n: 0.5, cap: R, v: 0.3 }); }),
          rep(1, function (st) { st.anchorNext = true; L.col = GREEN; L.label = "Base broken on the report"; return bar(st, { open: Math.max(st.price, R) + 1.6, d: 1.8, n: 0.3, v: 1, lw: 0.5, flash: GREEN, mk: { t: "Earnings \u00b7 anchor here", col: PURPLE } }); }),
          rep(2, function (st) { return bar(st, { d: -0.8, n: 0.4, v: 0.7, flo: av(st) + 0.4 }); }),
          rep(1, function (st) { var a = av(st); return bar(st, { open: st.price - 0.2, d: 1.6, n: 0.2, lo: a + 0.15, flo: a, v: 0.85, flash: GREEN, mk: { t: "Dip & reclaim \u00b7 buy", col: GREEN } }); }),
          rep(6, function (st) { return bar(st, { d: 0.9, n: 0.5, v: 0.5, flo: av(st) + 0.8 }); }),
          rep(3, function (st, k) { var a = av(st); return bar(st, { to: a + 0.6, pull: 0.5, n: 0.3, flo: a + 0.2, lo: k === 2 ? a + 0.1 : null, v: 0.4, mk: k === 2 ? { t: "Holds the line", col: BLUE, below: true } : null }); }),
          rep(6, function (st) { return bar(st, { d: 1, n: 0.5, v: 0.5 }); }),
          rep(4, function (st) { return bar(st, { d: -0.7, n: 0.5, v: 0.45, flo: av(st) + 0.4 }); }),
          rep(1, function (st) { return bar(st, { open: st.price, to: av(st) - 1.3, pull: 1, n: 0.1, v: 0.8, flash: RED, mk: { t: "Daily close below \u00b7 cut half", col: ORANGE, below: true } }); }),
          rep(6, function (st) { return bar(st, { d: -0.3, n: 0.5, v: 0.4, cap: av(st) - 0.3 }); })
        ];
      }
    },

    /* QQE Mod: above the EMA 50 the histogram goes red on the pullback and turns blue on a strong candle; below it, the mirror */
    "qqe-mod": {
      ind: ["qqe"],
      floor: "qqe",
      lines: [{ k: "e50", col: ORANGE, w: 2.4, glow: true, label: "EMA 50" }],
      story: function (st) {
        function e(st) { return st.ser.e50 != null ? st.ser.e50 : st.price - 4; }
        return [
          rep(10, function (st) { return bar(st, { d: 0.9, n: 0.8 }); }),
          rep(6, function (st) { return bar(st, { d: -0.9, n: 0.5, flo: e(st) + 1.2 }); }),
          rep(2, function (st) { return bar(st, { d: 0.3, n: 0.4, flo: e(st) + 1 }); }),
          rep(1, function (st) { return bar(st, { open: st.price, d: 3.2, n: 0.2, v: 1, lw: 0.3, uw: 0.3, flash: GREEN, mk: { t: "QQE blue \u00b7 buy", col: BLUE } }); }),
          rep(9, function (st) { return bar(st, { d: 0.9, n: 0.7 }); }),
          rep(9, function (st) { return bar(st, { d: -1.5, n: 0.6 }); }),
          rep(1, function (st) { return bar(st, { d: -1, n: 0.4, mk: { t: "Below the EMA 50", col: ORANGE, below: true } }); }),
          rep(5, function (st) { return bar(st, { d: 0.8, n: 0.5, cap: e(st) - 1.2 }); }),
          rep(2, function (st) { return bar(st, { d: -0.3, n: 0.4, cap: e(st) - 1 }); }),
          rep(1, function (st) { return bar(st, { open: st.price, d: -3.2, n: 0.2, v: 1, lw: 0.3, uw: 0.3, flash: RED, mk: { t: "QQE red \u00b7 sell", col: RED, below: true } }); }),
          rep(9, function (st) { return bar(st, { d: -0.9, n: 0.7 }); }),
          rep(8, function (st) { return bar(st, { d: 1.5, n: 0.6 }); })
        ];
      }
    },

    /* The Strat: an inside week under the top, a 2 up that gets rejected, then the simultaneous break of last week's low, stops as fuel, and the run to the other side */
    "the-strat": {
      story: function (st) {
        var H, Lo, T;
        return [
          rep(1, function (st) {
            closeLevels(st); var p = st.price;
            T = level(st, p - 10, "The other side \u00b7 magnitude", GRAY);
            H = level(st, p + 4.2, "Last week's high", SILK, true);
            Lo = level(st, p - 2.4, "Last week's low", SILK, true);
            return bar(st, { to: p + 1, pull: 0.5, n: 0.5, cap: H.y, flo: Lo.y, v: 0.35, mk: { t: "1 \u00b7 inside", col: SILK } });
          }),
          rep(7, function (st, k) { return bar(st, { to: k % 4 < 2 ? H.y - 1.2 : Lo.y + 1.4, pull: 0.4, n: 0.5, cap: H.y, flo: Lo.y, v: 0.32 }); }),
          rep(1, function (st) { H.col = ORANGE; H.label = "2 up \u00b7 rejected"; return bar(st, { open: st.price, to: H.y - 1.4, pull: 0.8, n: 0.2, hi: H.y + 1.6, pierce: true, cap: H.y, flo: Lo.y, v: 0.7, flash: ORANGE, mk: { t: "2\u2191 \u00b7 back inside", col: ORANGE } }); }),
          rep(3, function (st) { return bar(st, { to: Lo.y + 0.6, pull: 0.45, n: 0.35, cap: H.y - 0.8, flo: Lo.y + 0.2, v: 0.38 }); }),
          rep(1, function (st) { Lo.col = RED; Lo.label = "Last week's low \u00b7 they all break"; return bar(st, { open: st.price, to: Lo.y - 3.2, pull: 1, n: 0.2, v: 1, uw: 0.3, flash: RED, mk: { t: "2\u2193 \u00b7 simultaneous break", col: RED, below: true } }); }),
          rep(2, function (st) { return bar(st, { d: -1.9, n: 0.3, v: 0.85, uw: 0.4, mk: null }); }),
          rep(1, function (st) { return bar(st, { d: 0.6, n: 0.2, v: 0.5, cap: Lo.y - 1.2, mk: { t: "Green 2\u2193 \u00b7 still selling", col: ORANGE } }); }),
          rep(4, function (st) { return bar(st, { d: -1.1, n: 0.4, v: 0.6, cap: Lo.y - 1.6 }); }),
          rep(1, function (st) { T.col = GREEN; T.key = true; T.label = "The other side \u00b7 target hit"; return bar(st, { open: st.price, to: T.y + 0.4, pull: 1, n: 0.1, lo: T.y - 0.4, pierce: true, v: 0.8, flash: GREEN, mk: { t: "Magnitude", col: GREEN, below: true } }); }),
          rep(6, function (st) { return bar(st, { d: 0.15, n: 0.8, v: 0.4, flo: T.y - 0.6 }); })
        ];
      }
    },

    /* Hitchhiker scalp: an outsized move on volume, the first light-volume pullback to the 9 EMA, the turn, 70% trimmed, the runner trailed */
    "hitchhiker-scalp": {
      ind: ["ema9", "ema21"],
      lines: [{ k: "ema", col: ORANGE, w: 2.5, glow: true, label: "9 EMA" }, { k: "e21", col: PURPLE, w: 2, label: "21 EMA" }],
      story: function (st) {
        var dir = st.dir = -(st.dir || -1), UPC = dir > 0 ? GREEN : RED;
        return [
          rep(5, function (st) { return bar(st, { d: 0, n: 0.6, v: 0.3 }); }),
          rep(6, function (st, k) { return bar(st, { d: 1.7 * dir, n: 0.35, v: 0.95, mk: k === 5 ? { t: "Extended \u00b7 don't chase", col: SILK, below: dir < 0 } : null }); }),
          rep(4, function (st, k) { return bar(st, { to: st.ser.ema != null ? st.ser.ema : st.price - 2 * dir, pull: 0.42, n: 0.2, v: 0.26, mk: k === 1 ? { t: "First pullback \u00b7 light volume", col: ORANGE, below: dir > 0 } : null }); }),
          rep(1, function (st) { var e = st.ser.ema; var o = { d: 1.3 * dir, n: 0.15, v: 0.75, flash: UPC, mk: { t: (dir > 0 ? "Buy" : "Short") + " \u00b7 at the 9 EMA", col: UPC, below: dir > 0 } }; if (e != null) { if (dir > 0) o.lo = e - 0.2; else o.hi = e + 0.2; } return bar(st, o); }),
          rep(5, function (st, k) { return bar(st, { d: 1.25 * dir, n: 0.3, v: 0.9, mk: k === 3 ? { t: "Trim 70% into momentum", col: SILK, below: dir < 0 } : null }); }),
          rep(3, function (st, k) { return bar(st, { d: 0.35 * dir, n: 0.5, v: 0.5, mk: k === 2 ? { t: "Trail 30% \u00b7 prior bar", col: BLUE, below: dir < 0 } : null }); }),
          rep(4, function (st) { return bar(st, { d: -0.3 * dir, n: 0.6, v: 0.35 }); })
        ];
      }
    },

    /* Liquidity refill: compression, a big C1, C2's quick early wick absorbed high in C1, the break of C1's extreme, three or four candles, out */
    "liquidity-refill": {
      story: function (st) {
        var dir = st.dir = -(st.dir || -1), UPC = dir > 0 ? GREEN : RED, L, ext, c1o;
        return [
          rep(1, function (st) { closeLevels(st); return bar(st, { d: 0, n: 0.45, v: 0.25, uw: 0.5, lw: 0.5 }); }),
          rep(7, function (st) { return bar(st, { d: -0.12 * dir, n: 0.45, v: 0.25, uw: 0.5, lw: 0.5 }); }),
          rep(1, function (st) { c1o = st.price; var b = bar(st, { d: 6.2 * dir, n: 0.2, v: 1, uw: 0.25, lw: 0.25, flash: UPC, mk: { t: "C1 \u00b7 imbalance candle", col: UPC, below: dir < 0 } });
            ext = dir > 0 ? b.h : b.l; L = level(st, ext, dir > 0 ? "C1 high" : "C1 low", SILK, true); L.i0 = st.candles.length; return b; }),
          rep(1, function (st) { var w = ext - 0.15 * 6.2 * dir, o = { d: 1.6 * dir, n: 0.15, v: 0.7, mk: { t: "C2 \u00b7 quick wick, absorbed", col: ORANGE, below: dir > 0 } };
            if (dir > 0) o.lo = w; else o.hi = w; var b = bar(st, o); if (dir > 0) { b.h = Math.max(b.h, ext + 1.4); b.c = Math.max(b.c, ext + 0.9); } else { b.l = Math.min(b.l, ext - 1.4); b.c = Math.min(b.c, ext - 0.9); }
            L.col = UPC; L.label = (dir > 0 ? "C1 high" : "C1 low") + ", broken \u00b7 " + (dir > 0 ? "buy" : "short"); b.flash = UPC; return b; }),
          rep(3, function (st, k) { return bar(st, { d: 1.5 * dir, n: 0.25, v: 0.75, uw: 0.5, lw: 0.5, mk: k === 2 ? { t: "3\u20134 candles \u00b7 out", col: BLUE, below: dir < 0 } : null }); }),
          rep(1, function (st) { return bar(st, { d: -1.3 * dir, n: 0.2, v: 0.5, mk: { t: "Opposite candle \u00b7 over", col: SILK, below: dir > 0 } }); }),
          rep(4, function (st) { return bar(st, { d: -0.25 * dir, n: 0.6, v: 0.3 }); })
        ];
      }
    },

    /* ---------- fundamentals ---------- */

    /* Edge: one setup, many reps; small losses, bigger wins, the curve climbs */
    "edge": {
      lines: [{ k: "eq", col: GREEN, w: 2.5, glow: true, label: "Equity" }],
      story: function (st) {
        function lose(st) { var b = bar(st, { d: -1, n: 0.15, uw: 0.3, lw: 0.3, v: 0.3 }); b.eq = b.c; return b; }
        return [
          rep(3, lose),
          rep(1, function (st) { var b = bar(st, { d: 3.2, n: 0.3, v: 0.9, flash: GREEN, mk: { t: "+3R", col: GREEN } }); b.eq = b.c; return b; }),
          rep(2, lose),
          rep(1, function (st) { var b = bar(st, { d: 2.4, n: 0.3, v: 0.8, mk: { t: "+2R", col: GREEN } }); b.eq = b.c; return b; })
        ];
      }
    },

    /* Let winners run: a long trend under a ratcheting stop */
    "let-winners-run": {
      ind: ["chand"],
      lines: [{ k: "stop", col: ORANGE, w: 2.5, glow: true, step: true, label: "Trailing stop" }],
      story: function (st) {
        return [
          rep(1, function (st) { return bar(st, { d: 1, n: 0.7, mk: { t: "Still in", col: GREEN } }); }),
          rep(8, function (st) { return bar(st, { d: 0.9, n: 0.9 }); }),
          rep(3, function (st) { return bar(st, { d: -0.8, n: 0.6, flo: st.ser.stop != null ? st.ser.stop + 0.4 : null }); })
        ];
      }
    },

    /* S/R mistakes: chasing the first poke through resistance */
    "mistakes": {
      story: function (st) {
        var L;
        return [
          rep(1, function (st) { closeLevels(st); L = level(st, st.price + 4, "Resistance", SILK, true); return bar(st, { n: 1, cap: L.y }); }),
          rep(9, function (st, k) { return bar(st, { to: k % 4 < 2 ? L.y - 0.5 : L.y - 4, pull: 0.4, n: 0.8, cap: L.y }); }),
          rep(1, function (st) { L.col = RED; L.label = "Chased the poke"; return bar(st, { d: 2.4, n: 0.3, v: 0.4, flash: RED, mk: { t: "Low volume", col: RED } }); }),
          rep(1, function (st) { return bar(st, { d: -0.3, n: 0.4, v: 0.3 }); }),
          rep(4, function (st) { return bar(st, { d: -1.6, n: 0.6, v: 0.7 }); }),
          rep(6, function (st) { return bar(st, { d: -0.4, n: 1 }); })
        ];
      }
    },

    /* Price action rules: higher highs and higher lows, swing by swing */
    "price-action-rules": {
      lines: [{ k: "zz", col: SILK, w: 1.8, glow: true }],
      story: function (st) {
        function pivot(b, hi) { b.zz = hi ? b.h : b.l; b.mk = { t: hi ? "HH" : "HL", col: hi ? GREEN : BLUE, below: !hi }; return b; }
        return [
          rep(4, function (st) { return bar(st, { d: 1.1, n: 0.6 }); }),
          rep(1, function (st) { return pivot(bar(st, { d: 0.4, n: 0.3, uw: 1.6 }), true); }),
          rep(2, function (st) { return bar(st, { d: -1, n: 0.5 }); }),
          rep(1, function (st) { return pivot(bar(st, { d: 0.6, n: 0.3, lw: 1.6 }), false); })
        ];
      }
    },

    /* Relative volume: quiet tape, then participation shows up */
    "relative-volume": {
      ind: ["vavg"],
      floor: "rvol",
      story: function (st) {
        return [
          rep(13, function (st) { return bar(st, { n: 0.8, v: rnd(0.12, 0.26) }); }),
          rep(1, function (st) { return bar(st, { d: 3.4, n: 0.4, v: 1, flash: GREEN, mk: { t: "4x relative volume", col: GREEN } }); }),
          rep(5, function (st) { return bar(st, { d: 0.9, n: 0.8, v: rnd(0.45, 0.7) }); }),
          rep(4, function (st) { return bar(st, { d: -0.4, n: 0.8, v: rnd(0.15, 0.3) }); })
        ];
      }
    },

    /* Six momentum trades: one tape that cycles breakout, retest, pullback, consolidation and the expansion */
    "six-momentum-trades": {
      ind: ["ema9"],
      lines: [{ k: "ema", col: ORANGE, w: 2, glow: true, label: "9 EMA" }],
      story: function (st) {
        var L, top;
        return [
          rep(1, function (st) { closeLevels(st); L = level(st, recentHigh(st, 8) + 0.6, "Range high", BLUE, true); return bar(st, { n: 0.8, cap: L.y }); }),
          rep(5, function (st) { return bar(st, { n: 0.9, cap: L.y }); }),
          rep(1, function (st) { L.col = GREEN; L.label = "Broken"; return bar(st, { d: 2.6, n: 0.3, v: 1, flash: GREEN, mk: { t: "Breakout", col: GREEN } }); }),
          rep(3, function (st) { return bar(st, { d: 1, n: 0.6, v: 0.7 }); }),
          rep(2, function (st) { return bar(st, { to: L.y + 0.3, pull: 0.5, n: 0.3, flo: L.y, v: 0.35 }); }),
          rep(1, function (st) { L.label = "Now support"; return bar(st, { d: 1.6, n: 0.3, lo: L.y - 0.1, mk: { t: "Retest", col: GREEN } }); }),
          rep(3, function (st) { return bar(st, { d: 1, n: 0.6 }); }),
          rep(3, function (st) { return bar(st, { to: st.ser.ema != null ? st.ser.ema : st.price - 2, pull: 0.45, n: 0.4, v: 0.3 }); }),
          rep(1, function (st) { return bar(st, { d: 1.5, n: 0.3, flash: GREEN, mk: { t: "Pullback", col: GREEN } }); }),
          rep(2, function (st) { return bar(st, { d: 0.9, n: 0.6 }); }),
          rep(1, function (st) { top = st.price + 0.6; return bar(st, { n: 0.4, cap: top, v: 0.25 }); }),
          rep(4, function (st) { return bar(st, { n: 0.4, cap: top, flo: top - 1.6, v: 0.25 }); }),
          rep(1, function (st) { return bar(st, { d: 2, n: 0.3, v: 0.9, flash: GREEN, mk: { t: "Consolidation break", col: GREEN } }); }),
          rep(4, function (st) { return bar(st, { d: 0.7, n: 0.8 }); }),
          rep(4, function (st) { return bar(st, { d: -1.1, n: 0.6 }); })
        ];
      }
    },

    /* Four pillars: a level earns its touches, then holds once more with the trend behind it */
    "four-pillars": {
      ind: ["ema9"],
      lines: [{ k: "ema", col: ORANGE, w: 2, glow: true, label: "Trend" }],
      story: function (st) {
        var L, n = 0;
        function touch(st) { n++; L.label = n > 2 ? "Proven level · " + n + " touches" : "Level · " + n + (n > 1 ? " touches" : " touch"); return bar(st, { d: 1.4, n: 0.3, lo: L.y - 0.2, flo: L.y, pierce: true, v: 0.8, flash: n > 2 ? GREEN : null, mk: { t: "Touch " + n, col: n > 2 ? GREEN : BLUE, below: true } }); }
        return [
          rep(1, function (st) { closeLevels(st); n = 0; L = level(st, st.price - 2.6, "Level", BLUE, true); return bar(st, { d: -0.6, n: 0.5, flo: L.y }); }),
          rep(3, function (st) { return bar(st, { to: L.y + 0.4, pull: 0.5, n: 0.4, flo: L.y }); }),
          rep(1, touch),
          rep(3, function (st) { return bar(st, { d: 0.9, n: 0.6 }); }),
          rep(3, function (st) { return bar(st, { to: L.y + 0.4, pull: 0.5, n: 0.4, flo: L.y }); }),
          rep(1, touch),
          rep(3, function (st) { return bar(st, { d: 1, n: 0.6 }); }),
          rep(3, function (st) { return bar(st, { to: L.y + 0.4, pull: 0.5, n: 0.4, flo: L.y }); }),
          rep(1, function (st) { L.col = GREEN; return touch(st); }),
          rep(7, function (st) { return bar(st, { d: 0.9, n: 0.8 }); }),
          rep(2, function (st) { return bar(st, { d: -0.5, n: 0.6 }); })
        ];
      }
    },

    /* Get better faster: the same setup, rep after rep: see it, trade it, review it; one stops acting right and gets cut early */
    "get-better-faster": {
      story: function (st) {
        var L;
        function one(fail) {
          return [
            rep(1, function (st) { closeLevels(st); divider(st); st.reps = (st.reps || 0) % 999 + 1; L = level(st, recentHigh(st, 4) + 0.5, "Rep " + st.reps + " · see it", BLUE, true); return bar(st, { n: 0.5, cap: L.y }); }),
            rep(4, function (st) { return bar(st, { to: L.y - 0.6, pull: 0.4, n: 0.5, cap: L.y }); }),
            rep(1, function (st) { L.label = "Rep " + st.reps + " · trade it"; L.col = GREEN; return bar(st, { d: 1.8, n: 0.3, v: 0.9, flash: GREEN, mk: { t: "Trade it", col: GREEN } }); }),
            fail ? rep(1, function (st) { return bar(st, { d: 0.1, n: 0.2, v: 0.3 }); })
                 : rep(3, function (st) { return bar(st, { d: 0.9, n: 0.6, v: 0.6 }); }),
            fail ? rep(1, function (st) { L.col = ORANGE; L.label = "Rep " + st.reps + " · stopped acting right"; return bar(st, { to: L.y - 0.7, pull: 0.9, n: 0.2, v: 0.5, flash: ORANGE, mk: { t: "See it · cut early", col: ORANGE } }); })
                 : rep(1, function (st) { L.label = "Rep " + st.reps + " · review it"; return bar(st, { d: -0.4, n: 0.4, mk: { t: "Review it", col: SILK, below: true } }); }),
            rep(2, function (st) { return bar(st, { d: -0.35, n: 0.5 }); })
          ];
        }
        return one(false).concat(one(true), one(false));
      }
    },

    /* Dynamic risk sizing: the same setup graded three ways; the C gets a small size, the B the baseline, the A gets pressed */
    "dynamic-risk-sizing": {
      story: function (st) {
        var L;
        function one(grade, col, label, risk, good) {
          return [
            rep(1, function (st) { closeLevels(st); divider(st); L = level(st, recentHigh(st, 4) + 0.6, grade + " setup · " + label + " · risk " + risk, col, true); return bar(st, { n: good ? 0.4 : 1.1, cap: L.y }); }),
            rep(good ? 5 : 4, function (st) { return bar(st, good ? { to: L.y - 0.5, pull: 0.45, n: 0.35, cap: L.y } : { n: 1.2, cap: L.y }); }),
            rep(1, function (st) { return bar(st, { d: good ? 2.2 : 1.1, n: 0.3, v: good ? 1 : 0.5, pierce: true, flash: good ? GREEN : null, mk: { t: grade + " · " + risk, col: col } }); }),
            good ? rep(4, function (st) { return bar(st, { d: 1, n: 0.6, v: 0.7 }); })
                 : grade === "C" ? rep(2, function (st) { L.label = "C setup · small loss · that's the point"; return bar(st, { to: L.y - 1.6, pull: 0.6, n: 0.3 }); })
                                 : rep(3, function (st) { return bar(st, { d: 0.5, n: 0.6 }); }),
            rep(2, function (st) { return bar(st, { d: -0.4, n: 0.5 }); })
          ];
        }
        return one("C", ORANGE, "coast", "$100", false).concat(one("B", BLUE, "baseline", "$200", false), one("A", GREEN, "press", "$300", true));
      }
    },

    /* Order flow: a heavy-volume rotation marks the point of control; price leaves, pulls back, absorption at the level, buyers defend it */
    "order-flow": {
      profile: true,
      story: function (st) {
        var P;
        return [
          rep(1, function (st) { closeLevels(st); P = level(st, st.price, "Point of control", ORANGE, true); return bar(st, { to: P.y, n: 1.2, v: 0.8 }); }),
          rep(11, function (st, k) { return bar(st, { to: k % 6 < 3 ? P.y + 2.4 : P.y - 2.4, pull: 0.32, n: 1.2, v: rnd(0.6, 0.95) }); }),
          rep(1, function (st) { return bar(st, { d: 3, n: 0.4, v: 0.9, flash: GREEN, mk: { t: "Buyers take over", col: GREEN } }); }),
          rep(6, function (st) { return bar(st, { d: 1.1, n: 0.8, v: 0.45 }); }),
          rep(6, function (st, k) { return bar(st, { to: P.y + 0.5, pull: 0.32, n: 0.5, flo: P.y, v: 0.35, mk: k === 3 ? { t: "Pullback to the level", col: SILK } : null }); }),
          rep(1, function (st) { P.label = "Point of control \u00b7 absorption"; return bar(st, { open: st.price, to: P.y + 0.6, pull: 1, n: 0.1, lo: P.y - 0.9, pierce: true, flo: P.y - 1, v: 1, flash: ORANGE, mk: { t: "Bid & ask both heavy", col: ORANGE, below: true } }); }),
          rep(1, function (st) { P.col = GREEN; P.label = "Defended \u00b7 long confirmed"; return bar(st, { open: st.price, d: 2.4, n: 0.2, v: 0.85, lw: 0.3, flash: GREEN, mk: { t: "Confirmed \u00b7 long", col: GREEN } }); }),
          rep(6, function (st) { return bar(st, { d: 0.9, n: 0.7, v: 0.5 }); }),
          rep(4, function (st) { return bar(st, { d: -0.5, n: 0.8 }); })
        ];
      }
    },

    /* Linda Raschke: a volume spike lands right on the prior swing high, the algo push, then it goes flat */
    "linda-raschke": {
      story: function (st) {
        var L;
        return [
          rep(1, function (st) { closeLevels(st); session(st); return bar(st, { d: 0.8, n: 0.8, v: 0.8 }); }),
          rep(5, function (st) { return bar(st, { d: 0.9, n: 0.9, v: 0.5 }); }),
          rep(1, function (st) { L = level(st, recentHigh(st, 4), "Prior swing high", ORANGE, true); L.i0 = Math.max(0, st.candles.length - 2); return bar(st, { d: -1, n: 0.5, cap: L.y - 0.2 }); }),
          rep(6, function (st) { return bar(st, { d: -0.6, n: 0.8, cap: L.y - 0.3 }); }),
          rep(6, function (st) { return bar(st, { d: 0.75, n: 0.6, cap: L.y - 0.2 }); }),
          rep(1, function (st) { L.label = "Swing high \u00b7 volume spike"; return bar(st, { open: st.price, d: 2.6, n: 0.3, v: 1, flash: ORANGE, mk: { t: "Algos fire on the break", col: ORANGE } }); }),
          rep(2, function (st) { return bar(st, { d: 0.9, n: 0.3, v: 0.6 }); }),
          rep(1, function (st) { return bar(st, { d: -0.5, n: 0.3, mk: { t: "Stalls \u00b7 algo goes flat", col: SILK } }); }),
          rep(6, function (st) { return bar(st, { d: -0.3, n: 0.8, v: 0.35 }); })
        ];
      }
    },

    /* Trading earnings: the headline spike fails, the call changes the story, buyers reclaim the spike high, the long holds the zone */
    "trading-earnings": {
      story: function (st) {
        var S, Z;
        return [
          rep(1, function (st) { closeLevels(st); session(st); return bar(st, { n: 0.5, v: 0.4 }); }),
          rep(4, function (st) { return bar(st, { n: 0.6, v: 0.35 }); }),
          rep(1, function (st) { S = level(st, st.price + 3.4, "Headline spike high", ORANGE, true); return bar(st, { open: st.price, d: 2.6, n: 0.2, hi: S.y, pierce: true, v: 1, flash: ORANGE, mk: { t: "Earnings beat \u00b7 spike", col: ORANGE } }); }),
          rep(1, function (st) { S.label = "Spike faded \u00b7 don't chase"; S.col = RED; return bar(st, { d: -2.4, n: 0.2, cap: S.y - 0.6, v: 0.8, flash: RED }); }),
          rep(2, function (st) { return bar(st, { d: -0.9, n: 0.4, v: 0.5 }); }),
          rep(4, function (st, k) { return bar(st, { n: 0.5, v: 0.35, mk: k === 1 ? { t: "The call \u00b7 contracts, guidance", col: SILK, below: true } : null }); }),
          rep(4, function (st) { return bar(st, { d: 0.8, n: 0.4, v: 0.5, cap: S.y - 0.3 }); }),
          rep(1, function (st) { S.col = GREEN; S.label = "Reclaimed \u00b7 buyers accept higher"; return bar(st, { open: st.price, d: 2.2, n: 0.2, v: 0.95, pierce: true, flash: GREEN, mk: { t: "Price confirms \u00b7 long", col: GREEN } }); }),
          rep(3, function (st) { return bar(st, { d: 0.7, n: 0.4, v: 0.55 }); }),
          rep(1, function (st) { closeLevels(st); Z = level(st, st.price - 1.2, "Plan A zone \u00b7 hold it", BLUE, true); return bar(st, { to: Z.y + 0.4, pull: 0.5, n: 0.3, flo: Z.y }); }),
          rep(4, function (st) { return bar(st, { to: Z.y + 0.5, pull: 0.4, n: 0.4, flo: Z.y, v: 0.4 }); }),
          rep(1, function (st) { Z.col = GREEN; Z.label = "Zone held \u00b7 Plan A"; return bar(st, { d: 1.6, n: 0.3, v: 0.7, flash: GREEN }); }),
          rep(4, function (st) { return bar(st, { d: 0.6, n: 0.6, v: 0.45 }); }),
          rep(3, function (st) { return bar(st, { d: -0.5, n: 0.6 }); })
        ];
      }
    },

    /* Seven trading traps: momentum works while the regime is green, the regime flips (size cut in half), then move-to-move scalps in the chop */
    "seven-trading-traps": {
      story: function (st) {
        var L, hi, lo;
        return [
          rep(1, function (st) { closeLevels(st); session(st); L = level(st, st.price - 1.5, "Regime check \u00b7 all three green", GREEN, true); return bar(st, { d: 0.8, n: 0.6, v: 0.7, mk: { t: "Offense \u00b7 momentum size", col: GREEN, below: true } }); }),
          rep(8, function (st) { return bar(st, { d: 0.85, n: 0.8, v: 0.55 }); }),
          rep(1, function (st) { return bar(st, { d: 0.4, n: 0.4, v: 0.6, mk: { t: "Windfall \u00b7 lock half in", col: SILK } }); }),
          rep(1, function (st) { closeLevels(st); L = level(st, st.price - 0.8, "Regime change \u00b7 cut size 50%", ORANGE, true); return bar(st, { d: -2.4, n: 0.3, v: 0.95, pierce: true, flash: ORANGE, mk: { t: "Not my market? Adapt.", col: ORANGE } }); }),
          rep(4, function (st) { return bar(st, { d: -0.9, n: 0.6, v: 0.6 }); }),
          rep(1, function (st) { closeLevels(st); hi = st.price + 1.8; lo = st.price - 1.8; L = level(st, hi, "Move-to-move scalps", BLUE, true); level(st, lo, "Range low", GRAY); return bar(st, { n: 0.8, cap: hi, flo: lo }); }),
          rep(9, function (st, k) { return bar(st, { to: k % 4 < 2 ? hi - 0.4 : lo + 0.4, pull: 0.5, n: 0.5, cap: hi, flo: lo, mk: k % 4 === 1 ? { t: "scalp", col: GREEN } : null }); }),
          rep(2, function (st) { return bar(st, { n: 0.8 }); })
        ];
      }
    },

    /* Auction market theory: balance between two walls, a transition candle accepts value outside, imbalance runs to the next value, a new balance forms */
    "auction-market-theory": {
      story: function (st) {
        var U, D, top, bot, i0;
        return [
          rep(1, function (st) {
            closeLevels(st); session(st);
            i0 = st.candles.length; top = st.price + 3.6; bot = st.price - 3.6;
            U = level(st, top, "Balance · upper wall", BLUE, true); D = level(st, bot, "Balance · lower wall", BLUE);
            st.boxes.push({ i0: i0, i1: i0 + 15, y0: bot, y1: top, col: BLUE });
            return bar(st, { n: 0.6, cap: top, flo: bot, mk: { t: "Balance · building fuel", col: SILK, below: true } });
          }),
          rep(14, function (st, k) { return bar(st, { to: k % 6 < 3 ? top - 0.8 : bot + 0.8, pull: 0.45, n: 0.6, cap: top, flo: bot }); }),
          rep(1, function (st) { U.col = GREEN; U.label = "Value accepted above"; return bar(st, { d: 3.2, n: 0.3, v: 1, pierce: true, flash: GREEN, mk: { t: "Transition candle", col: GREEN } }); }),
          rep(3, function (st) { return bar(st, { d: 0.3, n: 0.5, flo: top + 0.4 }); }),
          rep(1, function (st) { return bar(st, { d: 1, n: 0.4, v: 0.7, mk: { t: "Imbalance · the band stretches", col: GREEN, below: true } }); }),
          rep(8, function (st) { return bar(st, { d: 0.9, n: 0.7 }); }),
          rep(1, function (st) {
            closeLevels(st);
            var c = st.price; top = c + 2.2; bot = c - 2.2; i0 = st.candles.length;
            level(st, top, "Next balance", PURPLE, true);
            st.boxes.push({ i0: i0, i1: i0 + 12, y0: bot, y1: top, col: PURPLE });
            return bar(st, { n: 0.6, cap: top, flo: bot, mk: { t: "New area of battle", col: PURPLE } });
          }),
          rep(11, function (st, k) { return bar(st, { to: k % 5 < 2 ? top - 0.6 : bot + 0.6, pull: 0.45, n: 0.5, cap: top, flo: bot }); })
        ];
      }
    },

    /* Thesis to trade: slide with no level (sit on hands), a demand zone from the higher time frame,
       a sweep under it, the reclaim and retest (the entry), then intraday structure carries the long */
    "thesis-to-trade": {
      story: function (st) {
        var Z, top, bot, i0;
        return [
          rep(1, function (st) { closeLevels(st); session(st); return bar(st, { d: -0.7, n: 0.4, mk: { t: "No level here · leave it alone", col: GRAY, below: true } }); }),
          rep(6, function (st) { return bar(st, { d: -0.75, n: 0.7 }); }),
          rep(1, function (st) {
            top = st.price - 0.6; bot = top - 2.4; i0 = st.candles.length;
            Z = level(st, top, "Demand zone · from the daily / 4h", BLUE, true); level(st, bot, "Zone low", BLUE);
            st.boxes.push({ i0: i0, i1: i0 + 14, y0: bot, y1: top, col: BLUE });
            return bar(st, { to: top - 0.6, pull: 0.6, n: 0.3, flo: bot });
          }),
          rep(2, function (st) { return bar(st, { to: bot + 0.5, pull: 0.5, n: 0.4, flo: bot }); }),
          rep(1, function (st) { return bar(st, { d: -1.6, n: 0.2, pierce: true, lo: bot - 1.4, flash: ORANGE, mk: { t: "The sweep · a trap", col: ORANGE, below: true } }); }),
          rep(1, function (st) { Z.col = GREEN; Z.label = "Reclaimed · now the retest"; return bar(st, { d: 2.4, n: 0.2, v: 0.8, mk: { t: "Reclaim", col: GREEN } }); }),
          rep(2, function (st) { return bar(st, { to: bot + 0.8, pull: 0.45, n: 0.3, flo: bot + 0.4 }); }),
          rep(1, function (st) { return bar(st, { d: 1.2, n: 0.2, v: 0.8, flash: GREEN, mk: { t: "Higher low holds · long", col: GREEN, below: true } }); }),
          rep(4, function (st, k) { return bar(st, { d: k % 2 ? -0.4 : 1.1, n: 0.4 }); }),
          rep(1, function (st) { return bar(st, { d: 0.9, n: 0.3, mk: { t: "Highs turn into lows · hold it", col: SILK } }); }),
          rep(5, function (st, k) { return bar(st, { d: k % 3 === 2 ? -0.5 : 0.9, n: 0.5 }); })
        ];
      }
    },

    /* Pyramiding: a 1R breakout, then each add smaller (0.5R, 0.25R) off a consolidation,
       with the stop stepping up behind every add */
    /* Cross-sectional momentum: a past winner ranks top decile, a skipped month, then held while it keeps outrunning the pack */
    "cross-sectional-momentum": {
      story: function (st) {
        var R;
        return [
          rep(1, function (st) { closeLevels(st); session(st); R = null; return bar(st, { n: 0.6, mk: { t: "Formation · 12 months of returns", col: SILK, below: true } }); }),
          rep(14, function (st, k) { return bar(st, { d: k % 4 === 3 ? -0.7 : 0.75, n: 0.7 }); }),
          rep(1, function (st) { R = level(st, st.price - 0.4, "Rank: top decile", GREEN, true); return bar(st, { d: 0.6, n: 0.3, v: 0.8, flash: GREEN, mk: { t: "Past winner · top 10%", col: GREEN } }); }),
          rep(3, function (st, k) { return bar(st, { d: rnd(-0.35, 0.2), n: 0.5, mk: k === 1 ? { t: "Skip a month", col: SILK, below: true } : null }); }),
          rep(1, function (st) { divider(st); return bar(st, { d: 0.9, n: 0.3, v: 0.8, flash: GREEN, mk: { t: "Bought · hold 3–12 months", col: GREEN } }); }),
          rep(12, function (st, k) { return bar(st, { d: k % 5 === 4 ? -0.8 : 0.85, n: 0.7 }); }),
          rep(1, function (st) { divider(st); return bar(st, { d: 0.3, n: 0.4, mk: { t: "Rebalance · re-rank everything", col: SILK, below: true } }); }),
          rep(6, function (st) { return bar(st, { d: rnd(-0.6, 0.5), n: 0.8 }); })
        ];
      }
    },

    "post-earnings-drift": {
      story: function (st) {
        return [
          rep(1, function (st) { closeLevels(st); session(st); return bar(st, { n: 0.6, mk: { t: "Into the report · forecast set", col: SILK, below: true } }); }),
          rep(10, function (st) { return bar(st, { d: rnd(-0.35, 0.35), n: 0.6 }); }),
          rep(1, function (st) { level(st, st.price - 0.2, "Report-day low · stop", RED, true); return bar(st, { d: 2.6, n: 0.3, v: 1, flash: GREEN, mk: { t: "Big beat · SUE +3", col: GREEN } }); }),
          rep(1, function (st) { divider(st); return bar(st, { d: 0.5, n: 0.3, v: 0.8, mk: { t: "Bought · gap held", col: GREEN } }); }),
          rep(12, function (st, k) { return bar(st, { d: k % 4 === 3 ? -0.6 : 0.55, n: 0.6 }); }),
          rep(1, function (st) { return bar(st, { d: 1.4, n: 0.3, v: 0.9, flash: GREEN, mk: { t: "Next report · drift jumps", col: GREEN } }); }),
          rep(8, function (st, k) { return bar(st, { d: k % 3 === 2 ? -0.5 : 0.45, n: 0.6 }); }),
          rep(1, function (st) { divider(st); return bar(st, { d: 0.2, n: 0.4, mk: { t: "~60 days · out", col: SILK, below: true } }); }),
          rep(5, function (st) { return bar(st, { d: rnd(-0.5, 0.4), n: 0.8 }); })
        ];
      }
    },

    "pyramiding": {
      story: function (st) {
        var S, hi, lo;
        function base(n, label) {
          return [
            rep(1, function (st) { hi = st.price + 0.6; lo = st.price - 1.6; return bar(st, { n: 0.4, cap: hi, flo: lo }); }),
            rep(n - 1, function (st) { return bar(st, { n: 0.6, cap: hi, flo: lo }); }),
            rep(1, function (st) {
              if (S) S.i1 = st.candles.length - 1;
              S = level(st, lo - 0.3, label, RED, true);
              return bar(st, { d: 1.8, n: 0.2, v: 0.9, pierce: true, flash: GREEN, mk: { t: label === "Stop · under the range" ? "First entry · 1R" : (label === "Stop · moved up" ? "Add · 0.5R" : "Add · 0.25R"), col: GREEN } });
            })
          ];
        }
        return [
          rep(1, function (st) { closeLevels(st); session(st); S = null; return bar(st, { n: 0.5 }); })
        ].concat(base(6, "Stop · under the range"),
          [rep(5, function (st) { return bar(st, { d: 0.8, n: 0.5 }); })],
          base(5, "Stop · moved up"),
          [rep(4, function (st) { return bar(st, { d: 0.8, n: 0.5 }); })],
          base(4, "Stop · moved up again"),
          [rep(1, function (st) { return bar(st, { d: 0.9, n: 0.3, mk: { t: "Most size on · least risk", col: SILK, below: true } }); }),
           rep(6, function (st) { return bar(st, { d: 0.8, n: 0.5 }); })]);
      }
    },

    /* Stacked imbalances: a news bar leaves a buying stack, price comes back to it, holds, and rallies */
    "stacked-imbalances": {
      story: function (st) {
        var Z;
        return [
          rep(1, function (st) { closeLevels(st); session(st); Z = null; return bar(st, { n: 0.6 }); }),
          rep(7, function (st) { return bar(st, { d: rnd(-0.3, 0.3), n: 0.9 }); }),
          rep(1, function (st) { Z = level(st, st.price + 2.4, "Stacked buying imbalance", GREEN, true); return bar(st, { d: 6.2, n: 0.3, v: 1, lw: 0.3, flash: GREEN, mk: { t: "3+ buying imbalances in a row", col: GREEN } }); }),
          rep(4, function (st) { return bar(st, { d: 0.9, n: 0.6 }); }),
          rep(8, function (st, k) { return bar(st, { to: Z.y + 0.4, pull: 0.3, n: 0.6, flo: Z.y, mk: k === 6 ? { t: "Back to the stack", col: SILK } : null }); }),
          rep(3, function (st, k) { return bar(st, { to: Z.y + 0.6, pull: 0.5, n: 0.3, flo: Z.y - 0.2, v: 0.7, mk: k === 1 ? { t: "Holding", col: GREEN, below: true } : null }); }),
          rep(1, function (st) { Z.label = "Stacked buying imbalance \u00b7 held"; return bar(st, { d: 2.4, n: 0.2, v: 0.85, flash: GREEN, mk: { t: "Long \u00b7 stop past the stack", col: GREEN } }); }),
          rep(7, function (st) { return bar(st, { d: 1.1, n: 0.6 }); }),
          rep(4, function (st) { return bar(st, { d: -0.4, n: 0.8 }); })
        ];
      }
    },

    /* Covered calls: a strike caps the upside each cycle, the premium is collected up front either way */
    "covered-calls": {
      story: function (st) {
        var L;
        return [
          rep(1, function (st) { closeLevels(st); divider(st); L = level(st, st.price + 3, "Strike · upside capped here", ORANGE, true); return bar(st, { n: 0.6, cap: L.y, v: 0.7, flash: GREEN, mk: { t: "Premium collected", col: GREEN, below: true } }); }),
          rep(9, function (st) { return bar(st, { to: L.y - 1.2, pull: 0.25, n: 0.9, cap: L.y }); }),
          rep(1, function (st) { L.label = "Expired · keep shares + premium"; L.col = GREEN; return bar(st, { d: -0.4, n: 0.5, cap: L.y }); }),
          rep(1, function (st) { closeLevels(st); divider(st); L = level(st, st.price + 2.6, "Strike · upside capped here", ORANGE, true); return bar(st, { n: 0.6, cap: L.y, v: 0.7, flash: GREEN, mk: { t: "Premium collected", col: GREEN, below: true } }); }),
          rep(4, function (st) { return bar(st, { d: 0.5, n: 0.7, cap: L.y }); }),
          rep(1, function (st) { L.label = "Above the strike · shares called away"; return bar(st, { d: 2.4, n: 0.3, v: 0.9, pierce: true }); }),
          rep(1, function (st) { return bar(st, { d: 0.9, n: 0.5, mk: { t: "This run goes to the buyer", col: ORANGE } }); }),
          rep(3, function (st) { return bar(st, { d: 0.9, n: 0.7 }); }),
          rep(3, function (st) { return bar(st, { d: -0.7, n: 0.7 }); })
        ];
      }
    },

    /* Expected move: Friday's close sets a ±1 standard deviation box for the week; the break above it is the chase, then price slips back inside */
    "expected-move": {
      story: function (st) {
        var U, D, top, bot;
        return [
          rep(1, function (st) {
            closeLevels(st); session(st);
            var i0 = st.candles.length, em = 4.4;
            top = st.price + em; bot = st.price - em;
            U = level(st, top, "Expected move · top", BLUE, true); D = level(st, bot, "Expected move · bottom", BLUE);
            st.boxes.push({ i0: i0, i1: i0 + 22, y0: bot, y1: top, col: BLUE });
            return bar(st, { n: 0.5, cap: top, flo: bot, mk: { t: "Friday close", col: SILK, below: true } });
          }),
          rep(7, function (st) { return bar(st, { to: top - 1, pull: 0.22, n: 0.9, cap: top, flo: bot }); }),
          rep(1, function (st) { U.col = ORANGE; U.label = "Outside the move · don't chase"; return bar(st, { d: 2.2, n: 0.3, v: 0.9, pierce: true, flash: ORANGE, mk: { t: "Chasing up here", col: ORANGE } }); }),
          rep(2, function (st) { return bar(st, { d: 0.5, n: 0.5 }); }),
          rep(4, function (st) { return bar(st, { to: top - 1.4, pull: 0.4, n: 0.4 }); }),
          rep(1, function (st) { U.col = BLUE; U.label = "Back inside · about 68% odds"; return bar(st, { d: -0.7, n: 0.3, cap: top, mk: { t: "Back inside", col: GREEN, below: true } }); }),
          rep(7, function (st) { return bar(st, { n: 0.9, cap: top, flo: bot }); })
        ];
      }
    },

    /* Trailing stops: the stop dots follow price and flip when they're hit */
    "trailing-stops": {
      ind: ["sar"],
      dots: { k: "sar", label: "Stop" },
      story: function (st) {
        return [
          rep(11, function (st) { return bar(st, { d: 0.8, n: 0.9 }); }),
          rep(9, function (st) { return bar(st, { d: -0.8, n: 0.9 }); })
        ];
      }
    }
  };
  var scene = SCENES[host.getAttribute("data-candle-bg")] || SCENES["pmh-break"];

  /* ---------- DOM ---------- */
  var root = document.createElement("div");
  root.className = "cbg"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = '<canvas></canvas><div class="cbg-scrim"></div><div class="cbg-flash"></div>';
  host.insertBefore(root, host.firstChild);
  var cv = root.querySelector("canvas"), ctx = cv.getContext("2d"), flash = root.querySelector(".cbg-flash");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, DPR = 1, narrow = false;

  /* ---------- state + indicators ---------- */
  var st = { candles: [], levels: [], boxes: [], divs: [], price: 100, sess: 0, ser: {}, queue: [], ind: {} };
  var IND = scene.ind || [];
  function ema(prev, v, n) { return prev == null ? v : prev + (v - prev) * 2 / (n + 1); }
  function indicators(q) {
    var I = st.ind, cs = st.candles, n = cs.length;
    var tr = n > 1 ? Math.max(q.h - q.l, Math.abs(q.h - cs[n - 2].c), Math.abs(q.l - cs[n - 2].c)) : q.h - q.l;
    I.atr = I.atr == null ? tr : I.atr + (tr - I.atr) / 14;
    if (IND.indexOf("ema9") >= 0) { I.e9 = ema(I.e9, q.c, 9); q.ema = I.e9; }
    if (IND.indexOf("ema21") >= 0) { I.e21 = ema(I.e21, q.c, 21); q.e21 = I.e21; }
    if (IND.indexOf("vwap") >= 0) {
      if (I.sess !== st.sess) { I.sess = st.sess; I.sv = 0; I.spv = 0; I.sp2v = 0; }
      var tp = (q.h + q.l + q.c) / 3, v = Math.max(0.05, q.v);
      I.sv += v; I.spv += tp * v; I.sp2v += tp * tp * v;
      var vw = I.spv / I.sv, sd = Math.sqrt(Math.max(0, I.sp2v / I.sv - vw * vw));
      q.vwap = vw; q.vu = vw + Math.max(1.2, sd * 2); q.vl = vw - Math.max(1.2, sd * 2);
    }
    if (IND.indexOf("bb") >= 0) {
      var w = cs.slice(-20), m = 0, s = 0; w.forEach(function (x) { m += x.c; }); m /= w.length;
      w.forEach(function (x) { s += (x.c - m) * (x.c - m); }); s = Math.sqrt(s / w.length);
      q.bu = m + Math.max(0.6, 2 * s); q.bl = m - Math.max(0.6, 2 * s);
    }
    if (IND.indexOf("atr") >= 0) { I.e20 = ema(I.e20, q.c, 20); q.am = I.e20; q.au = I.e20 + 2.2 * I.atr; q.al = I.e20 - 2.2 * I.atr; }
    if (IND.indexOf("zl") >= 0) {
      var lag = 6, src = n > lag ? 2 * q.c - cs[n - 1 - lag].c : q.c;
      I.zl = ema(I.zl, src, 14); q.zl = I.zl;
    }
    if (IND.indexOf("chand") >= 0) {
      var hh = -1e9; cs.slice(-14).forEach(function (x) { hh = Math.max(hh, x.h); });
      var cand = hh - 2.6 * I.atr;
      I.stop = I.stop == null || q.c < I.stop ? cand : Math.max(I.stop, cand); q.stop = I.stop;
    }
    if (IND.indexOf("sar") >= 0) {
      if (I.sar == null) { I.up = true; I.sar = q.l - 1; I.ep = q.h; I.af = 0.02; }
      else {
        I.sar = I.sar + I.af * (I.ep - I.sar);
        if (I.up) {
          if (q.l < I.sar) { I.up = false; I.sar = I.ep; I.ep = q.l; I.af = 0.02; }
          else if (q.h > I.ep) { I.ep = q.h; I.af = Math.min(0.2, I.af + 0.02); }
        } else {
          if (q.h > I.sar) { I.up = true; I.sar = I.ep; I.ep = q.h; I.af = 0.02; }
          else if (q.l < I.ep) { I.ep = q.l; I.af = Math.min(0.2, I.af + 0.02); }
        }
      }
      q.sar = I.sar; q.sarUp = I.up;
    }
    if (IND.indexOf("macd") >= 0) {
      I.m12 = ema(I.m12, q.c, 12); I.m26 = ema(I.m26, q.c, 26); var mc = I.m12 - I.m26;
      I.sig = ema(I.sig, mc, 9); q.fv = mc - I.sig;
    }
    if (IND.indexOf("ma") >= 0) {
      var c10 = cs.slice(-10), c20 = cs.slice(-20), a10 = 0, a20 = 0;
      c10.forEach(function (x) { a10 += x.c; }); c20.forEach(function (x) { a20 += x.c; });
      q.m10 = a10 / c10.length; q.m20 = a20 / c20.length;
    }
    if (IND.indexOf("qqe") >= 0) {
      /* the QQE Mod histogram, simplified: RSI 8 smoothed by an EMA 5, blue over +6, red under -6, gray between */
      var ch = n > 1 ? q.c - cs[n - 2].c : 0;
      I.ug = I.ug == null ? Math.max(ch, 0) : (I.ug * 7 + Math.max(ch, 0)) / 8;
      I.dg = I.dg == null ? Math.max(-ch, 0) + 0.01 : (I.dg * 7 + Math.max(-ch, 0)) / 8;
      var rs = 100 - 100 / (1 + I.ug / Math.max(0.01, I.dg));
      I.sr = ema(I.sr, rs, 5); q.fv = I.sr - 50; q.fc = q.fv > 6 ? "0,195,255" : q.fv < -6 ? "255,0,98" : "112,112,112";
      I.e50 = ema(I.e50, q.c, 50); q.e50 = I.e50;
    }
    if (IND.indexOf("avwap") >= 0) {
      if (st.anchorOff) { st.anchorOff = false; I.on = false; }
      if (st.anchorNext) { st.anchorNext = false; I.on = true; I.asv = 0; I.aspv = 0; q.avStart = true; }
      if (I.on) { var av = Math.max(0.05, q.v); I.asv += av; I.aspv += q.l * av; q.av = I.aspv / I.asv; }
    }
    if (IND.indexOf("vavg") >= 0) { var a = 0, ww = cs.slice(-20); ww.forEach(function (x) { a += x.v; }); q.vavg = a / ww.length; }
    st.ser = q;
  }
  function nextCandle() {
    if (!st.queue.length) {
      var steps = scene.story(st), k = 0;
      steps.forEach(function (s) { for (var j = 0; j < s[0]; j++) st.queue.push({ f: s[1], k: j }); });
    }
    var job = st.queue.shift();
    var q = job.f(st, job.k);
    st.candles.push(q); st.price = q.c;
    indicators(q);
    return q;
  }
  if (scene.init) scene.init(st);
  for (var i = 0; i < 150; i++) nextCandle();
  st.candles.forEach(function (q) { q.flash = null; });

  /* ---------- camera ---------- */
  var S = 34, BODY = 18, PSCALE = 9;
  var cam = { x: 0, y: 0, z: -300, yaw: -0.72, f: 900 }, smoothY = null, progress = 0;
  function setCam(t) {
    var n = st.candles.length - 1 + progress;
    cam.x = n * S + (narrow ? 70 : 120);
    var recent = st.candles.slice(-14), avg = 0; recent.forEach(function (q) { avg += (q.h + q.l) / 2; }); avg /= recent.length;
    if (smoothY == null) smoothY = avg * PSCALE;
    smoothY += (avg * PSCALE - smoothY) * 0.04;
    cam.y = smoothY + 10;
    cam.yaw = (narrow ? -0.62 : -0.72) + Math.sin(t * 0.00011) * 0.05;
    cam.z = (narrow ? -250 : -300) + Math.sin(t * 0.00017) * 14;
    cam.f = narrow ? W * 1.2 : Math.max(W, H * 1.4) * 0.6;
  }
  function proj(X, Y, Z) {
    var dx = X - cam.x, dy = Y - cam.y, dz = Z - cam.z;
    var s = Math.sin(cam.yaw), c = Math.cos(cam.yaw);
    var xr = dx * c - dz * s, zr = dx * s + dz * c;
    if (zr < 20) return null;
    var cx = narrow ? W * 0.62 : W * 0.72, cy = narrow ? H * 0.34 : H * 0.42;
    return { x: cx + xr * cam.f / zr, y: cy - dy * cam.f / zr, k: cam.f / zr, z: zr };
  }
  function fog(z) { return Math.max(0, Math.min(1, 1.15 - z / 3600)); }
  function P(i, y) { return proj(i * S, y * PSCALE, 0); }

  /* ---------- drawing ---------- */
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function ease(p) { return 1 - Math.pow(1 - p, 3); }
  function pill(x, y, text, col, a) {
    if (narrow || a <= 0.05) return;
    ctx.save(); ctx.globalAlpha = a; ctx.font = "500 12px -apple-system, Inter, sans-serif";
    var w = ctx.measureText(text).width + 30, h = 24;
    rr(x, y - h / 2, w, h, 12); ctx.fillStyle = "rgba(29,29,31,.78)"; ctx.fill();
    ctx.strokeStyle = "rgba(" + col + ",.55)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "rgb(" + col + ")"; ctx.shadowColor = "rgb(" + col + ")"; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x + 12, y, 3.5, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "#e8e8ed"; ctx.textBaseline = "middle"; ctx.fillText(text, x + 21, y + 0.5);
    ctx.restore();
  }
  function rail(i0, i1, y, col, alpha, width, dash) {
    var a = P(i0, y), b = P(i1, y); if (!a || !b) return null;
    var g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, "rgba(" + col + ",0)"); g.addColorStop(1, "rgba(" + col + "," + alpha + ")");
    ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = width || 2; if (dash) ctx.setLineDash([8, 8]);
    ctx.shadowColor = "rgba(" + col + ",1)"; ctx.shadowBlur = dash ? 0 : 12;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
    return b;
  }
  function seriesPath(k, from, to, step) {
    var pts = [], cs = st.candles, prev = null;
    for (var i = from; i <= to; i++) {
      var v = cs[i][k]; if (v == null) continue;
      if (step && prev != null && v !== prev.v) { var pp = P(i - 0.5, prev.v); if (pp) pts.push(pp); var pq = P(i - 0.5, v); if (pq) pts.push(pq); }
      var p = P(i, v); if (p) { p.i = i; p.v = v; pts.push(p); }
      prev = { v: v };
    }
    return pts;
  }

  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var bg = ctx.createRadialGradient(W * 0.66, H * 0.4, 0, W * 0.66, H * 0.4, Math.max(W, H) * 0.7);
    bg.addColorStop(0, "#0b1424"); bg.addColorStop(0.5, "#05080f"); bg.addColorStop(1, "#000");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    var cs = st.candles, n = cs.length, first = Math.max(0, n - 150), last = n - 1, i, k;
    var lowest = 1e9; cs.slice(-60).forEach(function (q) { lowest = Math.min(lowest, q.l); });
    var floorY = lowest * PSCALE - 40;

    /* floor grid */
    ctx.lineWidth = 1;
    for (var zz = -120; zz <= 360; zz += 60) {
      var fa = proj(cam.x - 6000, floorY, zz), fb = proj(cam.x + 60, floorY, zz); if (!fa || !fb) continue;
      var fg = ctx.createLinearGradient(fa.x, fa.y, fb.x, fb.y); fg.addColorStop(0, "rgba(41,151,255,0)"); fg.addColorStop(1, "rgba(41,151,255,.16)");
      ctx.strokeStyle = fg; ctx.beginPath(); ctx.moveTo(fa.x, fa.y); ctx.lineTo(fb.x, fb.y); ctx.stroke();
    }
    for (i = Math.floor(first / 5) * 5; i <= last; i += 5) {
      var g0 = proj(i * S, floorY, -120), g1 = proj(i * S, floorY, 360); if (!g0 || !g1) continue;
      ctx.strokeStyle = "rgba(41,151,255," + (0.12 * fog(g0.z)) + ")"; ctx.beginPath(); ctx.moveTo(g0.x, g0.y); ctx.lineTo(g1.x, g1.y); ctx.stroke();
    }

    /* volume profile wall */
    if (scene.profile) {
      var buckets = {}, maxB = 0, bs = 1;
      for (i = Math.max(first, n - 120); i < n; i++) { var bk = Math.round(cs[i].c / bs); buckets[bk] = (buckets[bk] || 0) + cs[i].v; maxB = Math.max(maxB, buckets[bk]); }
      var xr = last + 4;
      Object.keys(buckets).forEach(function (bk) {
        bk = +bk;
        var len = buckets[bk] / maxB * 22, y0 = (bk - 0.42) * bs * PSCALE, y1 = (bk + 0.42) * bs * PSCALE;
        var a = proj((xr - len) * S, y0, 60), b = proj(xr * S, y0, 60), c = proj(xr * S, y1, 60), d = proj((xr - len) * S, y1, 60);
        if (!a || !b || !c || !d) return;
        var top = buckets[bk] === maxB, g = ctx.createLinearGradient(a.x, 0, b.x, 0);
        g.addColorStop(0, top ? "rgba(48,209,88,.08)" : "rgba(41,151,255,.04)"); g.addColorStop(1, top ? "rgba(48,209,88,.4)" : "rgba(41,151,255,.22)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
      });
    }

    /* boxes */
    st.boxes.forEach(function (bx) {
      if (bx.i1 < first) return;
      var a = P(bx.i0 - 0.5, bx.y0), b = P(bx.i1 + 0.5, bx.y0), c = P(bx.i1 + 0.5, bx.y1), d = P(bx.i0 - 0.5, bx.y1);
      if (!a || !b || !c || !d) return;
      var al = fog(a.z);
      ctx.fillStyle = "rgba(" + bx.col + "," + (bx.ghost ? 0.06 : 0.1) * al + ")"; ctx.strokeStyle = "rgba(" + bx.col + "," + 0.45 * al + ")"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (bx.ghost) {
        var e = P(bx.i0 - 0.3, bx.bo), f = P(bx.i1 + 0.3, bx.bo), g = P(bx.i1 + 0.3, bx.bc), h = P(bx.i0 - 0.3, bx.bc);
        if (e && f && g && h) { ctx.fillStyle = "rgba(" + bx.col + "," + 0.14 * al + ")"; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(f.x, f.y); ctx.lineTo(g.x, g.y); ctx.lineTo(h.x, h.y); ctx.closePath(); ctx.fill(); }
      }
    });

    /* session dividers */
    st.divs.forEach(function (di) {
      if (di < first) return;
      var a = proj((di - 0.5) * S, floorY, 0), b = proj((di - 0.5) * S, floorY + 260, 0); if (!a || !b) return;
      var g = ctx.createLinearGradient(a.x, a.y, b.x, b.y); g.addColorStop(0, "rgba(161,161,166," + 0.35 * fog(a.z) + ")"); g.addColorStop(1, "rgba(161,161,166,0)");
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    });

    /* bands */
    (scene.bands || []).forEach(function (bd) {
      var up = seriesPath(bd.u, first, last), lo = seriesPath(bd.l, first, last); if (up.length < 2 || lo.length < 2) return;
      var g = ctx.createLinearGradient(up[0].x, 0, up[up.length - 1].x, 0);
      g.addColorStop(0, "rgba(" + bd.col + ",0)"); g.addColorStop(1, "rgba(" + bd.col + "," + (bd.a || 0.08) + ")");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(up[0].x, up[0].y);
      up.forEach(function (p) { ctx.lineTo(p.x, p.y); }); for (var j = lo.length - 1; j >= 0; j--) ctx.lineTo(lo[j].x, lo[j].y);
      ctx.closePath(); ctx.fill();
    });

    /* levels */
    var tags = [];
    st.levels.forEach(function (L) {
      var end = L.i1 == null ? last + 2 : L.i1; if (end < first) return;
      var b = rail(Math.max(L.i0, first - 40), end, L.y, L.col, L.i1 == null ? 0.9 : 0.4, L.key ? 2 : 1.4, !L.key && L.i1 == null ? false : L.i1 != null);
      if (b && L.i1 == null && L.label) tags.push({ i: Math.max(L.i0, last - (narrow ? 8 : 12)), y: L.y, text: L.label, col: L.col });
    });

    /* floor bars: volume, MACD histogram or relative volume */
    var mode = scene.floor || "vol", mx = 0.001;
    if (mode === "macd" || mode === "qqe") for (i = first; i <= last; i++) mx = Math.max(mx, Math.abs(cs[i].fv || 0));
    for (i = first; i <= last; i++) {
      var q = cs[i], X = i * S, base = proj(X, floorY, 0); if (!base) continue;
      var a = fog(base.z), w = Math.max(1, BODY * base.k);
      if (mode === "macd" || mode === "qqe") {
        var mid = floorY + 40, hv = (q.fv || 0) / mx * 36, p0 = proj(X, mid, 0), p1 = proj(X, mid + hv, 0); if (!p0 || !p1) continue;
        ctx.fillStyle = "rgba(" + (mode === "qqe" ? q.fc || "112,112,112" : hv >= 0 ? GREEN : RED) + "," + (mode === "qqe" ? 0.75 : 0.55) * a + ")";
        ctx.fillRect(p0.x - w / 2, Math.min(p0.y, p1.y), w, Math.abs(p1.y - p0.y) + 1);
      } else {
        var vh = mode === "rvol" ? 120 : 34, top = proj(X, floorY + q.v * vh, 0); if (!top) continue;
        var hot = mode === "rvol" && q.vavg && q.v > q.vavg * 2.2;
        ctx.save(); if (hot) { ctx.shadowColor = "rgba(48,209,88,.9)"; ctx.shadowBlur = 18; }
        ctx.fillStyle = hot ? "rgba(48,209,88," + 0.8 * a + ")" : "rgba(41,151,255," + (mode === "rvol" ? 0.4 : 0.28) * a + ")";
        ctx.fillRect(base.x - w / 2, top.y, w, base.y - top.y); ctx.restore();
      }
    }
    if (mode === "rvol") {
      var avgPts = []; for (i = first; i <= last; i++) { if (cs[i].vavg == null) continue; var ap = proj(i * S, floorY + cs[i].vavg * 120, 0); if (ap) avgPts.push(ap); }
      if (avgPts.length > 1) {
        var ag = ctx.createLinearGradient(avgPts[0].x, 0, avgPts[avgPts.length - 1].x, 0); ag.addColorStop(0, "rgba(255,159,10,0)"); ag.addColorStop(1, "rgba(255,159,10,.9)");
        ctx.strokeStyle = ag; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); avgPts.forEach(function (p, j) { j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    /* candles */
    for (i = first; i <= last; i++) {
      q = cs[i]; var isLast = i === last, X2 = i * S;
      var c = isLast ? q.o + (q.c - q.o) * ease(progress) + Math.sin(t * 0.02) * 0.25 * (1 - progress) : q.c;
      var hh = isLast ? Math.max(q.o, c) + (q.h - Math.max(q.o, q.c)) * progress : q.h;
      var ll = isLast ? Math.min(q.o, c) - (Math.min(q.o, q.c) - q.l) * progress : q.l;
      var up = c >= q.o;
      var pT = P(i, hh), pB = P(i, ll), pO = P(i, q.o), pC = P(i, c);
      if (!pT || !pB || !pO || !pC) continue;
      var al = fog(pO.z), bw = Math.max(1, BODY * pO.k);
      ctx.strokeStyle = up ? "rgba(134,134,139," + al + ")" : "rgba(66,66,69," + al + ")";
      ctx.lineWidth = Math.max(1, 2 * pO.k);
      ctx.beginPath(); ctx.moveTo(pT.x, pT.y); ctx.lineTo(pB.x, pB.y); ctx.stroke();
      var tp2 = Math.min(pO.y, pC.y), ht = Math.max(Math.abs(pO.y - pC.y), 2);
      var gr = ctx.createLinearGradient(pO.x - bw / 2, 0, pO.x + bw / 2, 0);
      var hot2 = q.flashed || (isLast && q.flash);
      if (up) { gr.addColorStop(0, "rgba(20,60,32," + al + ")"); gr.addColorStop(0.5, hot2 ? "rgba(120,255,160," + al + ")" : "rgba(48,209,88," + al + ")"); gr.addColorStop(1, "rgba(16,40,24," + al + ")"); }
      else { gr.addColorStop(0, "rgba(24,24,26," + al + ")"); gr.addColorStop(0.5, hot2 ? "rgba(255,120,110," + al + ")" : "rgba(110,110,115," + al + ")"); gr.addColorStop(1, "rgba(29,29,31," + al + ")"); }
      ctx.fillStyle = gr;
      if (hot2 || i > last - 3) { ctx.save(); ctx.shadowColor = up ? "rgba(48,209,88,.9)" : "rgba(255,69,58,.7)"; ctx.shadowBlur = 22 * Math.min(1, pO.k * 1.5); rr(pO.x - bw / 2, tp2, bw, ht, Math.min(4, bw / 3)); ctx.fill(); ctx.restore(); }
      else { rr(pO.x - bw / 2, tp2, bw, ht, Math.min(4, bw / 3)); ctx.fill(); }
    }

    /* lines */
    (scene.lines || []).forEach(function (ln) {
      var pts = seriesPath(ln.k, first, last - 1, ln.step); if (pts.length < 2) return;
      ctx.save(); ctx.lineWidth = ln.w || 2; ctx.lineJoin = "round"; if (ln.dash) ctx.setLineDash([6, 6]);
      if (ln.slope) {
        for (var j = 1; j < pts.length; j++) {
          var colS = pts[j].v >= pts[j - 1].v ? GREEN : RED, aa = fog(pts[j].z);
          ctx.strokeStyle = "rgba(" + colS + "," + aa + ")"; if (ln.glow) { ctx.shadowColor = "rgba(" + colS + ",.8)"; ctx.shadowBlur = 10; }
          ctx.beginPath(); ctx.moveTo(pts[j - 1].x, pts[j - 1].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
        }
      } else {
        var g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
        g.addColorStop(0, "rgba(" + ln.col + ",0)"); g.addColorStop(0.35, "rgba(" + ln.col + ",.45)"); g.addColorStop(1, "rgba(" + ln.col + ",.95)");
        ctx.strokeStyle = g; if (ln.glow) { ctx.shadowColor = "rgba(" + ln.col + ",1)"; ctx.shadowBlur = 12; }
        ctx.beginPath(); pts.forEach(function (p, j2) { (j2 && !(ln.brk && cs[p.i] && cs[p.i][ln.brk])) ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke();
      }
      ctx.restore();
      if (ln.label) { var lp = pts[Math.max(0, pts.length - (narrow ? 6 : 10))]; tags.push({ x: lp.x, y: lp.y + 26, text: ln.label, col: ln.col || (pts[pts.length - 1].v >= pts[pts.length - 2].v ? GREEN : RED) }); }
    });

    /* stop dots */
    if (scene.dots) {
      var dk = scene.dots.k, lastDot = null;
      for (i = first; i < last; i++) {
        q = cs[i]; if (q[dk] == null) continue; var dp = P(i, q[dk]); if (!dp) continue;
        var dc = q.sarUp ? GREEN : RED, da = fog(dp.z);
        ctx.save(); ctx.fillStyle = "rgba(" + dc + "," + da + ")"; ctx.shadowColor = "rgba(" + dc + ",.9)"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(dp.x, dp.y, Math.max(1.5, 3.2 * dp.k), 0, 6.3); ctx.fill(); ctx.restore();
        lastDot = { p: dp, col: dc };
      }
      if (lastDot) tags.push({ x: lastDot.p.x - 40, y: lastDot.p.y + (cs[last - 1].sarUp ? 28 : -28), text: scene.dots.label + (cs[last - 1].sarUp ? " under price" : " above price"), col: lastDot.col });
    }

    /* markers on candles */
    for (i = Math.max(first, last - 40); i <= last; i++) {
      q = cs[i]; if (!q.mk || (i === last && progress < 0.6)) continue;
      var below = q.mk.below || (q.c < q.o && !q.mk.above);
      var mp = P(i, below ? q.l : q.h); if (!mp) continue;
      var ma = fog(mp.z) * Math.min(1, (last - i + progress) / 1.2 + 0.3);
      if (narrow) continue;
      ctx.save(); ctx.globalAlpha = Math.min(1, ma); ctx.font = "600 12px -apple-system, Inter, sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = "rgb(" + q.mk.col + ")"; ctx.shadowColor = "rgba(0,0,0,.9)"; ctx.shadowBlur = 6;
      ctx.fillText(q.mk.t, mp.x, mp.y + (below ? 20 : -12)); ctx.restore();
    }

    /* level and line tags */
    tags.forEach(function (tg) {
      var px = tg.x, py = tg.y;
      if (px == null) { var tp3 = P(tg.i, tg.y); if (!tp3) return; px = tp3.x - 40; py = tp3.y - 18; }
      if (px > W - 60) px = W - 200;
      pill(px, py, tg.text, tg.col, 0.95);
    });

    /* light sweep through the newest candle */
    var nl = P(last, cs[last].c);
    if (nl) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      var sg = ctx.createLinearGradient(0, nl.y, W, nl.y), pulse = 0.1 + 0.06 * Math.sin(t * 0.003);
      sg.addColorStop(0, "rgba(41,151,255,0)"); sg.addColorStop(Math.min(0.999, Math.max(0.001, nl.x / W)), "rgba(120,190,255," + pulse + ")"); sg.addColorStop(1, "rgba(41,151,255,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, nl.y - 1.5, W, 3); ctx.restore();
    }
  }

  function resize() {
    var r = cv.getBoundingClientRect(); DPR = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height; narrow = W < 640;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    if (reduce) { setCam(0); progress = 1; draw(0); }
  }
  addEventListener("resize", resize); resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);

  /* ---------- loop ---------- */
  var PER = 620, lastT = 0, running = true;
  function frame(t) {
    if (!running) return;
    var dt = Math.min(64, t - (lastT || t)); lastT = t;
    progress += dt / PER;
    if (progress >= 1) {
      progress = 0;
      var prev = st.candles[st.candles.length - 1]; if (prev.flash) prev.flashed = true;
      var q = nextCandle();
      if (st.candles.length > 400) {
        var drop = st.candles.length - 400;
        st.candles.splice(0, drop);
        st.levels = st.levels.filter(function (L) { L.i0 -= drop; if (L.i1 != null) L.i1 -= drop; return L.i1 == null || L.i1 > 0; });
        st.boxes = st.boxes.filter(function (b) { b.i0 -= drop; b.i1 -= drop; return b.i1 > 0; });
        st.divs = st.divs.map(function (d) { return d - drop; }).filter(function (d) { return d > 0; });
        st.sess -= drop;
        st.queue.forEach(function () {});
      }
      if (q.flash) {
        flash.style.background = "radial-gradient(ellipse at 72% 45%, rgba(" + q.flash + ",.3), transparent 60%)";
        flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go");
      }
    }
    setCam(t); draw(t);
    requestAnimationFrame(frame);
  }
  if (reduce) return;
  new IntersectionObserver(function (e) {
    var vis = e[0].isIntersecting;
    if (vis && !running) { running = true; lastT = 0; requestAnimationFrame(frame); }
    running = vis;
  }).observe(root);
  requestAnimationFrame(frame);
})();
