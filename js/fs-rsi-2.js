/* =====================================================================
   fs-rsi-2.js — walkthroughs on famous-strategies/rsi-2.html
   (Connors & Alvarez 2008).

     rsi     what a 2-period RSI looks like next to price
     trade   one made-up trade: above the 200-day, RSI(2) under 5, out
             on a close above the 5-day average
     filter  why the 200-day matters: a dip in a downtrend keeps going
     odds    a made-up run of trades: many small wins, rare big losses
   Uses js/fs-kit.js. Every bar is made up.
   ===================================================================== */
(function () {
  "use strict";
  var K = window.FSKIT; if (!K) return;
  var C = K.C, txt = K.txt, line = K.line, rect = K.rect, tag = K.tag, poly = K.poly, dot = K.dot, fade = K.fade, win = K.win,
      track = K.track, geo = K.geo, note2 = K.note2, stamp = K.stamp, rng = K.rng, sizeStd = K.sizeStd, mkBars = K.mkBars, drawBars = K.drawBars;

  function rsi(cl, n) {
    var out = [null], ag = 0, al = 0;
    for (var i = 1; i < cl.length; i++) {
      var ch = cl[i] - cl[i - 1], g = Math.max(ch, 0), l = Math.max(-ch, 0);
      if (i <= n) { ag += g / n; al += l / n; out.push(i < n ? null : (al === 0 ? 100 : 100 - 100 / (1 + ag / al))); continue; }
      ag = (ag * (n - 1) + g) / n; al = (al * (n - 1) + l) / n;
      out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
    }
    return out;
  }
  function sma(a, n) { return a.map(function (_, i) { if (i < n - 1) return null; var s = 0; for (var k = i - n + 1; k <= i; k++) s += a[k]; return s / n; }); }
  function closes(path, N, seed, noise) { var r = rng(seed), out = []; for (var i = 0; i < N; i++) out.push(track(path, i) + (r() - 0.5) * noise); return out; }

  /* shared layout: price on top, RSI pane below */
  function panes(g, n) {
    var split = g.y0 + (g.y1 - g.y0) * 0.64;
    return { py0: g.y0, py1: split - 14, ry0: split + 14, ry1: g.y1 };
  }
  function rsiPane(s, P, X, R, cnt, lv, op) {
    var Yr = function (v) { return P.ry1 - v / 100 * (P.ry1 - P.ry0); };
    s.s += rect(X(0) - 6, P.ry0, X(R.length - 1) - X(0) + 12, P.ry1 - P.ry0, "#141416", 6, 1);
    s.s += line(X(0), Yr(lv), X(R.length - 1), Yr(lv), C.blue, 1.2, "4 3", op);
    s.s += line(X(0), Yr(50), X(R.length - 1), Yr(50), C.faint, 1, "2 4");
    var pts = []; for (var i = 0; i <= cnt; i++) if (R[i] != null) pts.push([X(i), Yr(R[i])]);
    s.s += poly(pts, C.ink, 1.6);
    s.post += txt(X(0), P.ry0 - 4, "RSI(2)", C.dim, 11, "start", 700);
    return Yr;
  }

  /* 1 · what RSI(2) is */
  function rsiSpec() {
    var N = 60, CL = closes([[0, 100], [10, 104], [16, 101], [24, 106], [30, 103.5], [38, 108], [44, 105.6], [52, 110], [59, 112]], N, 3, 1.1);
    var B = mkBars(CL, 99.6, 5, 0.5), R = rsi(CL, 2), R14 = rsi(CL, 14);
    var ST = [
      { at: 0, title: "A made-up index ETF", text: "Daily bars of a made-up index fund in an uptrend, with the usual small pullbacks along the way." },
      { at: 3, title: "A 2-period RSI", text: "RSI measures recent ups against recent downs on a 0 to 100 scale. Most traders use 14 days. Connors used 2, which makes it swing from one extreme to the other in a few days." },
      { at: 6.4, title: "Extremes every few weeks", text: "Two or three down closes in a row push RSI(2) under 10, sometimes under 5. In an uptrend those readings mark short, sharp pullbacks." },
      { at: 9.6, title: "Compared with RSI(14)", text: "The usual 14-day RSI, in grey, barely moves on the same bars. The 2-day version is built to catch dips that last two or three days." }
    ];
    return {
      stages: ST, end: 12.8, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), P = panes(g, n), o = { s: "", post: "" };
        var lo = 96, hi = 116, X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return P.py1 - (v - lo) / (hi - lo) * (P.py1 - P.py0); };
        var cnt = Math.floor(track([[0, 6], [2.8, N - 1]], T)), bw = (g.x1 - g.x0) / N * 0.62;
        o.s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up index ETF · daily" : "A made-up index ETF · daily bars", C.faint, 12, "start", 600);
        o.s += drawBars(B, X, Y, cnt, bw);
        var ro = fade(T, 3.2, 0.4);
        if (ro > 0) {
          var Yr = rsiPane(o, P, X, R, cnt, 10, fade(T, 6.6, 0.4));
          if (fade(T, 6.6, 0.4) > 0) {
            o.post += tag(g.x1, Yr(10) + 2, "10", C.blue, 1, "start");
            for (var i = 2; i < N; i++) if (R[i] != null && R[i] < 10) o.s += dot(X(i), Yr(R[i]), 4, C.blue, fade(T, 6.8, 0.3));
          }
          var r14 = fade(T, 9.8, 0.4);
          if (r14 > 0) { var p14 = []; for (var k = 0; k < N; k++) if (R14[k] != null) p14.push([X(k), Yr(R14[k])]); o.s += poly(p14, C.grey, 2, null, r14); o.post += tag(g.x0 + 4, P.ry0 + 12, "grey: RSI(14)", C.grey, r14, "start"); }
        }
        var s = o.s + o.post;
        s += note2(g, ["Uptrend", "Small pullbacks", "along the way."], C.ink, win(T, 0.3, 3));
        s += note2(g, ["RSI(2)", "Two days of ups", "vs downs, 0 to 100."], C.ink, win(T, 3.2, 6.4));
        s += note2(g, ["Under 10", "Two or three down", "days in a row."], C.blue, win(T, 6.6, 9.6));
        s += note2(g, ["vs RSI(14)", "The usual RSI", "barely moves."], C.grey, fade(T, 9.8, 0.4));
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
  }

  /* 2 · one trade */
  function tradeSpec() {
    var N = 50, CL = closes([[0, 104], [12, 108], [20, 110], [24, 108.8], [27, 106.4], [29, 105.6], [33, 108.4], [40, 110.5], [49, 112]], N, 8, 0.6);
    CL[26] = 107.0; CL[27] = 106.0; CL[28] = 105.3; CL[29] = 105.9; CL[30] = 107.2; CL[31] = 108.4;
    var B = mkBars(CL, 103.8, 6, 0.45), R = rsi(CL, 2), M5 = sma(CL, 5);
    var ent = 28, ex = -1; for (var i = ent + 1; i < N; i++) if (CL[i] > M5[i]) { ex = i; break; }
    var gain = (CL[ex] / CL[ent] - 1) * 100;
    var ST = [
      { at: 0, title: "Above the 200-day", text: "A made-up index ETF is above its 200-day moving average: the long-term trend is up. That's the only condition under which Connors buys." },
      { at: 3.2, title: "RSI(2) drops under 5", text: "Three down closes push RSI(2) to " + R[ent].toFixed(1) + ". Buy near the close of that day: Connors entered just before the close, not the next morning." },
      { at: 6.6, title: "Out above the 5-day average", text: "Hold until the price closes above its 5-day moving average. Here it takes " + (ex - ent) + " days, for a gain of " + gain.toFixed(1) + "%." },
      { at: 10, title: "No stop", text: "There's no stop loss in Connors' rules: his tests found stops hurt results on index funds. The exit is the 5-day average, whenever price gets there." }
    ];
    return {
      stages: ST, end: 13.2, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), P = panes(g, n), o = { s: "", post: "" };
        var lo = 101, hi = 114, X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return P.py1 - (v - lo) / (hi - lo) * (P.py1 - P.py0); };
        var cnt = Math.floor(track([[0, 20], [3, 26], [3.4, ent], [6.4, ent], [6.8, ex], [9.8, ex], [10.2, ex + 2], [12.6, N - 1]], T)), bw = (g.x1 - g.x0) / N * 0.62;
        o.s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up index ETF · daily" : "A made-up index ETF · daily bars", C.faint, 12, "start", 600);
        o.s += line(g.x0, Y(102.4), g.x1, Y(103.6), C.gold, 2, null, 0.9);
        o.post += tag(g.x0 + 4, Y(102.6) - 14, "200-day average", C.gold, 1, "start");
        var m5 = fade(T, 6.8, 0.4);
        if (m5 > 0) { var pm = []; for (var k = 4; k <= cnt; k++) pm.push([X(k), Y(M5[k])]); o.s += poly(pm, C.grey, 1.6, null, m5); }
        o.s += drawBars(B, X, Y, cnt, bw);
        var Yr = rsiPane(o, P, X, R, cnt, 5, 1);
        o.post += tag(g.x1, Yr(5), "5", C.blue, 1, "start");
        if (cnt >= ent) {
          var eo = fade(T, 3.4, 0.3);
          o.s += dot(X(ent), Y(CL[ent]), 6, C.blue, eo) + dot(X(ent), Yr(R[ent]), 5, C.blue, eo);
          o.post += tag(X(ent), Y(CL[ent]) + 26, n ? "buy: RSI(2) " + R[ent].toFixed(1) : "buy at the close: RSI(2) " + R[ent].toFixed(1), C.blue, eo, "middle");
        }
        if (cnt >= ex) {
          var xo = fade(T, 6.8, 0.3);
          o.s += dot(X(ex), Y(CL[ex]), 6, C.up, xo);
          o.post += tag(X(ex) + 8, Y(CL[ex]) - 24, (n ? "out " : "closed above the 5-day: out ") + (gain >= 0 ? "+" : "") + gain.toFixed(1) + "%", C.up, xo, "start");
        }
        var s = o.s + o.post;
        s += note2(g, ["Trend", "Above the 200-day:", "buys only."], C.gold, win(T, 0.3, 3.2));
        s += note2(g, ["Entry", "RSI(2) at or under 5,", "buy near the close."], C.blue, win(T, 3.4, 6.6));
        s += note2(g, ["Exit", "First close above", "the 5-day average."], C.up, win(T, 6.8, 10));
        s += note2(g, ["No stop", "Connors found stops", "hurt on index funds."], C.dn, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
  }

  /* 3 · why the 200-day */
  function filterSpec() {
    var N = 50, CL = closes([[0, 112], [8, 109], [14, 110], [20, 105], [24, 106.4], [30, 101], [34, 102], [40, 97], [49, 95]], N, 12, 0.7);
    var B = mkBars(CL, 112.3, 9, 0.5), R = rsi(CL, 2);
    var sigs = []; for (var i = 3; i < N; i++) if (R[i] != null && R[i] <= 5 && !(R[i - 1] != null && R[i - 1] <= 5)) sigs.push(i);
    var ST = [
      { at: 0, title: "Below the 200-day", text: "Now a made-up index ETF in a downtrend, under its 200-day average. RSI(2) still drops under 5 on every leg down." },
      { at: 3.4, title: "Oversold keeps getting more oversold", text: "In a downtrend, a 'cheap' reading is often just the next step lower. Buying these dips means catching falling prices with no stop." },
      { at: 6.8, title: "The filter says no", text: "The 200-day rule skips all of them. Connors bought pullbacks only when the long-term trend was up, and the optional shorts only when it was down." },
      { at: 10, title: "Fewer trades, better ones", text: "The filter costs some signals in choppy markets, but it keeps the strategy out of the long declines where a no-stop dip buyer gets hurt most." }
    ];
    return {
      stages: ST, end: 13.2, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), P = panes(g, n), o = { s: "", post: "" };
        var lo = 92, hi = 118, X = function (i) { return g.x0 + (i + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return P.py1 - (v - lo) / (hi - lo) * (P.py1 - P.py0); };
        var cnt = Math.floor(track([[0, 6], [3, N - 1]], T)), bw = (g.x1 - g.x0) / N * 0.62;
        o.s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "Made-up downtrend · daily" : "A made-up index ETF in a downtrend · daily bars", C.faint, 12, "start", 600);
        o.s += line(g.x0, Y(115.5), g.x1, Y(110.5), C.gold, 2, null, 0.9);
        o.post += tag(g.x1, Y(110.5) - 14, "200-day average", C.gold, 1, "end");
        o.s += drawBars(B, X, Y, cnt, bw);
        var Yr = rsiPane(o, P, X, R, cnt, 5, 1);
        var no = fade(T, 6.8, 0.4);
        sigs.forEach(function (i) {
          if (i > cnt) return;
          var op = fade(T, 3.4, 0.3);
          o.s += dot(X(i), Yr(R[i]), 4.5, C.blue, op);
          o.s += dot(X(i), Y(CL[i]), 5, no > 0 ? C.dn : C.blue, op);
          if (no > 0) o.s += K.cross(X(i), Y(CL[i]) + 14, C.dn, no);
        });
        if (no > 0) o.post += tag(g.x0 + 4, P.py0 + 12, n ? "below the 200-day: skip" : "below the 200-day: every signal skipped", C.dn, no, "start");
        var s = o.s + o.post;
        s += note2(g, ["Downtrend", "Under the 200-day,", "RSI(2) still dips."], C.gold, win(T, 0.3, 3.4));
        s += note2(g, ["Falling knives", "Oversold gets", "more oversold."], C.dn, win(T, 3.6, 6.8));
        s += note2(g, ["Filtered", "No buys below", "the 200-day."], C.dn, win(T, 7, 10));
        s += note2(g, ["The point", "Buy dips only in", "an uptrend."], C.up, fade(T, 10.2, 0.4));
        return s + stamp(L, "Illustrative · made-up bars");
      }
    };
  }

  /* 4 · the odds */
  function oddsSpec() {
    var Rr = [0.9, 1.2, 0.6, -0.4, 1.1, 0.8, 0.5, 1.4, 0.7, -0.8, 1.0, 0.9, 0.4, 1.3, 0.6, -5.2, 0.8, 1.1, 0.7, 0.9];
    var tot = Rr.reduce(function (a, b) { return a + b; }, 0), wins = Rr.filter(function (v) { return v > 0; }).length;
    var ST = [
      { at: 0, title: "Mostly small wins", text: "A made-up run of 20 RSI(2) trades. Most last a few days and gain a little: the dip bounces, and price closes above the 5-day average." },
      { at: 3.6, title: "A high hit rate", text: wins + " of these 20 made-up trades win. On SPY daily bars over about the last 12 years, our own run of this page's indicator won 80% of 127 trades, averaging +0.77% each, before costs." },
      { at: 7, title: "The rare big loss", text: "With no stop, the losers are the dips that keep going. One of them here gives back about five winners' worth. That's the shape: small and frequent gains, rare and larger losses." },
      { at: 10.2, title: "Size for the bad one", text: "The made-up run still ends at +" + tot.toFixed(1) + "%. The plan has to survive the big loss: small enough positions, or a time limit on trades that go nowhere." }
    ];
    return {
      stages: ST, end: 13.6, size: sizeStd,
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "", post = "";
        var N = Rr.length, X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, z = g.y0 + (g.y1 - g.y0) * 0.36, sc = (z - g.y0 - 24) / 1.5, CL = -1.8;
        var Y = function (v) { return z - v * sc; };
        s += txt(g.x0, g.y0 - (n ? 4 : 14), n ? "20 made-up trades, % each" : "20 made-up RSI(2) trades, % gain or loss each", C.faint, 12, "start", 600);
        s += line(g.x0, z, g.x1, z, C.dim, 1.2);
        var cnt = Math.floor(track([[0.3, 0], [3.4, 15], [6.8, 15], [7.2, 16], [9.8, N], [13, N]], T)), bw = (g.x1 - g.x0) / N * 0.62;
        for (var k = 0; k < Math.min(cnt, N); k++) {
          var v = Rr[k], h = Math.max(CL, v);
          s += rect(X(k) - bw / 2, v > 0 ? Y(v) : z, bw, Math.abs(Y(h) - z), v > 0 ? C.up : C.dn, 2, 0.85);
          if (v < CL) { s += rect(X(k) - bw / 2 - 1, Y(CL) - 14, bw + 2, 5, "#1c1c1e", 0, 1); post += txt(X(k), Y(CL) + 18, v.toFixed(1) + "%", C.dn, 12, "middle", 800); }
        }
        var wr = fade(T, 3.8, 0.4);
        if (wr > 0) post += tag(g.x0 + 4, g.y0 + 12, wins + " of " + N + " win", C.up, wr, "start");
        var big = fade(T, 7.4, 0.4);
        if (big > 0 && cnt > 15) post += tag(X(15), z + 22, n ? "no stop: the big one" : "no stop: the dip that kept going", C.dn, big, "middle");
        var eo = fade(T, 10.4, 0.4);
        if (eo > 0) {
          var e = 0, pts = [[g.x0, g.y1 - 6]], eb = g.y1 - 6, es = (g.y1 - g.y0) * 0.16 / 9;
          for (var j = 0; j < N; j++) { e += Rr[j]; pts.push([g.x0 + (j + 1) * (g.x1 - g.x0) / N, eb - e * es]); }
          s += poly(pts, C.gold, 2.4, null, eo);
          post += tag(g.x1, pts[N][1] - 16, "running total: +" + tot.toFixed(1) + "%", C.gold, eo, "end");
        }
        s += post;
        s += note2(g, ["Small wins", "A few days,", "a little each."], C.up, win(T, 0.3, 3.6));
        s += note2(g, ["Hit rate", "Our SPY run: 80% of", "127 trades, before costs."], C.up, win(T, 3.8, 7));
        s += note2(g, ["The big loss", "No stop: the dip", "that kept going."], C.dn, win(T, 7.2, 10.2));
        s += note2(g, ["Sizing", "Survive the", "bad one."], C.gold, fade(T, 10.4, 0.4));
        return s + stamp(L, "Illustrative · made-up trades");
      }
    };
  }

  K.run({
    specs: { rsi: rsiSpec, trade: tradeSpec, filter: filterSpec, odds: oddsSpec },
    steps: [
      { k: "Trend", c: C.gold, tag: "Above the 200-day average" },
      { k: "Dip", c: C.blue, tag: "RSI(2) at or below 5" },
      { k: "Buy", c: C.up, tag: "Near the close" },
      { k: "Exit", c: C.grey, tag: "A close above the 5-day average" },
      { k: "Size", c: C.dn, tag: "No stop: keep positions small" }
    ],
    stepDraw: function (k, d) {
      var s = "", C2 = d.C, top = d.top, bot = d.bot, W = d.W, mid = d.mid;
      var pts = [[40, mid - 10], [120, mid - 40], [200, mid - 60], [250, mid - 20], [290, mid + 20], [330, mid + 40], [380, mid], [440, mid - 50], [520, mid - 80]];
      s += d.ln(30, mid + 80, W - 30, mid + 30, C2.gold, 2) + d.t(W - 30, mid + 22, "200-day", C2.gold, 12, "end", 700);
      s += d.pl(pts, C2.ink, 2.2);
      if (k >= 1) s += d.dt(330, mid + 40, C2.blue) + d.t(330, mid + 64, "RSI(2) < 5", C2.blue, 12, "middle", 700);
      if (k >= 2) s += d.t(330, mid + 82, "buy near the close", C2.up, 12, "middle", 700);
      if (k >= 3) s += d.dt(380, mid, C2.up) + d.t(392, mid - 10, "close > 5-day: out", C2.up, 12, "start", 700);
      var t = ["Only buy when price is above its 200-day average.", "Wait for two or three down days: RSI(2) at or below 5.", "Connors entered just before the close.", "Exit on the first close above the 5-day average.", "No stop in the rules, so size small enough to survive a bad one."][k];
      s += d.t(30, bot + 32, t, C2.dim, 12.5, "start", 500);
      return s;
    }
  });
})();
