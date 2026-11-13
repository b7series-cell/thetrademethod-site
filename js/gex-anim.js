/* =====================================================================
   gex-anim.js — animated walkthrough of the GEX Levels setup.

   Six stages, following the page: gamma exposure by strike from the 9:30
   snapshot → the call wall, put wall and gamma flip it produces → above
   the flip (positive gamma) the call wall rejects → price loses the flip
   and the regime turns negative → the flip retest fails from below →
   the put wall holds, with the caveat that walls are weaker in negative
   gamma.

   The prices and dollar figures are scripted and labelled "Illustrative".
   No market or options data. Mount: <section data-gex-anim>…</section>
   ===================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-gex-anim]");
  if (!root) return;
  var svg = root.querySelector("svg");
  var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
  var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay");
  var chips = root.querySelector(".anim-chips");
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- the example ---------- */
  var CW = 775, GF = 770, PW = 765, ZONE = 0.15;
  var COL = { cw: "#ff5252", gf: "#ffd600", pw: "#00e676", calls: "#ff8a80", puts: "#69f0ae", up: "rgba(0,230,118,0.09)", dn: "rgba(255,82,82,0.10)" };
  var GEX = { 764: -1.1, 765: -2.4, 766: -1.2, 767: -1.5, 768: -0.9, 769: -0.6, 770: 0.1, 771: 0.5, 772: 0.7, 773: 0.9, 774: 1.0, 775: 2.1, 776: 0.8, 777: 0.6 };

  /* 2-minute closes (scripted) */
  var path = [];
  function seg(a, b, n, curve) { for (var i = 1; i <= n; i++) { var f = i / n; path.push(a + (b - a) * (curve === "out" ? 1 - Math.pow(1 - f, 2) : curve === "in" ? f * f : f)); } }
  path.push(771.4);
  seg(771.4, 774.55, 15);                         // 1-15 the grind up into the call wall
  var REJ = path.length; path.push(774.3);        // 16 the rejection bar
  seg(774.3, 770.9, 9, "out");                    // 17-25 the fade
  path.push(770.4);                               // 26
  var LOSS = path.length; path.push(769.6);       // 27 closes under the flip
  seg(769.6, 769.2, 2);                           // 28-29
  path.push(769.75);                              // 30
  var RETEST = path.length; path.push(769.5);     // 31 the retest from below fails
  seg(769.5, 765.4, 12, "in");                    // 32-43 negative gamma: the expansion
  path.push(765.2);                               // 44
  var HOLD = path.length; path.push(765.7);       // 45 the put wall holds
  seg(765.7, 767.4, 8, "out");                    // 46-53
  var N = path.length;
  var rng = (function () { var s = 29; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  var prev = path[0] - 0.1, BARS = path.map(function (c) {
    var o = prev + (rng() - 0.5) * 0.08, b = [o, Math.max(o, c) + 0.03 + rng() * 0.1, Math.min(o, c) - 0.03 - rng() * 0.1, c]; prev = c; return b;
  });
  for (var q = 0; q < REJ; q++) BARS[q][1] = Math.min(BARS[q][1], CW - ZONE - 0.04);
  BARS[REJ] = [774.62, 775.08, 774.22, 774.3];                       // tags the call wall zone, red close back under
  BARS[LOSS] = [770.35, 770.42, 769.5, 769.6];                       // closes under the flip
  for (q = LOSS + 1; q < RETEST; q++) BARS[q][1] = Math.min(BARS[q][1], GF - ZONE - 0.03);
  BARS[RETEST] = [769.78, 770.02, 769.42, 769.5];                    // retest from below, red close
  for (q = RETEST + 1; q < HOLD - 1; q++) BARS[q][2] = Math.max(BARS[q][2], PW + ZONE + 0.05);
  BARS[HOLD - 1] = [765.5, 765.6, 765.12, 765.2];
  BARS[HOLD] = [765.18, 765.78, 764.93, 765.7];                      // tags the put wall zone, green close back over

  /* ---------- timeline ---------- */
  var STAGES = [
    { at: 0,    title: "Gamma exposure by strike, at the 9:30 snapshot", text: "For each strike: gamma × open interest × 100 × spot² × 1%, calls positive and puts negative, using expirations out to 30 days. The bars are dollars of hedging per 1% move." },
    { at: 3.8,  title: "The call wall, the put wall and the flip", text: "The call wall is the biggest call exposure above price, " + CW + ". The put wall is the biggest put exposure below it, " + PW + ". The gamma flip, " + GF + ", is where total gamma crosses from positive to negative." },
    { at: 6.6,  title: "Above the flip: fade the walls", text: "Over " + GF + " dealers are long gamma. They sell rips and buy dips, which dampens moves. Price grinds into the call wall, tags the zone and closes red back under it: the call wall rejection." },
    { at: 13.8, title: "Lose the flip, lose the cushion", text: "A close under " + GF + " flips the regime. Below the flip dealers are short gamma and hedge in the same direction as the move, so moves stretch instead of stalling." },
    { at: 16.0, title: "The flip retest fails from below", text: "Price comes back up to the flip, can't close over it, and a red bar closes back under: the retest fails. In negative gamma that's the short, with room to the put wall." },
    { at: 20.8, title: "The put wall: hold or break", text: "Price stretches into the put wall and a green bar closes back over it: the hold. In negative gamma walls give way more often, so the confidence grade and the wall's dollar size decide how much to trust it." }
  ];
  var TB = [];
  for (q = 0; q < N; q++) {
    if (q <= REJ) TB[q] = [6.8 + q * 0.28, 6.8 + q * 0.28 + 0.24];
    else if (q < LOSS) TB[q] = [11.8 + (q - REJ - 1) * 0.2, 11.8 + (q - REJ - 1) * 0.2 + 0.18];
    else if (q === LOSS) TB[q] = [14.0, 15.0];
    else if (q <= RETEST) TB[q] = [16.2 + (q - LOSS - 1) * 0.36, 16.2 + (q - LOSS - 1) * 0.36 + 0.3];
    else if (q < HOLD) TB[q] = [17.8 + (q - RETEST - 1) * 0.22, 17.8 + (q - RETEST - 1) * 0.22 + 0.2];
    else TB[q] = [21.0 + (q - HOLD) * 0.3, 21.0 + (q - HOLD) * 0.3 + 0.26];
  }
  var END = TB[N - 1][1] + 1.6;

  /* ---------- geometry ---------- */
  var W = 1180, H = 500, YT = 40, YB = 440, PMIN = 763.4, PMAX = 777.4, XTAG = 1012, XAX = 1172, XC = 760, XH0 = 790, XH1 = 990, XAXIS = 890;
  function y(p) { return YB - (p - PMIN) / (PMAX - PMIN) * (YB - YT); }
  function x(i) { return 70 + i * 12.6; }

  /* ---------- helpers ---------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function txt(xx, yy, s, col, size, anchor, weight, op) {
    return '<text x="' + xx + '" y="' + yy + '" fill="' + col + '" font-size="' + (size || 13) + '" text-anchor="' + (anchor || "start") + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  function hline(x1, x2, p, col, dash, w, op) {
    return '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + y(p).toFixed(1) + '" y2="' + y(p).toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function tag(p, label, col, op, ink) {
    if (op <= 0) return "";
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + XTAG + '" y="' + (y(p) - 10) + '" width="122" height="20" rx="5" fill="' + col + '"/>' +
      txt(XTAG + 8, y(p) + 4.5, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function candle(xx, b, prog, wBody, op) {
    if (prog <= 0) return "";
    var o = b[0], h = b[1], l = b[2], c = b[3], up = c >= o;
    var pth = up ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = prog >= 1 ? c : pth[idx] + (pth[idx + 1] - pth[idx]) * f;
    var hi = o, lo = o;
    for (var j = 0; j <= idx; j++) { hi = Math.max(hi, pth[j]); lo = Math.min(lo, pth[j]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var col = cur >= o ? "#30d158" : "#ff453a", top = y(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(y(o) - y(cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + xx + '" x2="' + xx + '" y1="' + y(hi).toFixed(1) + '" y2="' + y(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.2"/>' +
      '<rect x="' + (xx - wBody / 2) + '" y="' + top.toFixed(1) + '" width="' + wBody + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  function callout(xx, yy, lines, col, op, anchorRight) {
    if (op <= 0) return "";
    var w = 14 + Math.max.apply(null, lines.map(function (s) { return s.length; })) * 7.1, h = 10 + lines.length * 17;
    var x0 = anchorRight ? xx - w : xx;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + yy.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h + '" rx="8" fill="#2c2c2e" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, j) { s += txt((x0 + 10).toFixed(0), (yy + 20 + j * 17).toFixed(0), ln, j === 0 ? col : "#d1d1d6", 13, "start", j === 0 ? 600 : null); });
    return s + "</g>";
  }
  function marker(xx, yy, up, col, label, op) {
    if (op <= 0) return "";
    var p = up ? "M" + xx + " " + yy + " l-6 10 h12 z" : "M" + xx + " " + yy + " l-6 -10 h12 z";
    return '<g opacity="' + op.toFixed(3) + '"><path d="' + p + '" fill="' + col + '"/>' + txt(xx, up ? yy + 24 : yy - 16, label, col, 12, "middle", 700) + "</g>";
  }

  /* ---------- one frame ---------- */
  function frame(T) {
    var s = '<rect width="' + W + '" height="' + H + '" fill="#1d1d1f"/>';
    for (var p = 764; p <= 777; p += 1) s += hline(56, XC, p, "rgba(255,255,255,0.04)", null, 1) + txt(XAX, y(p) + 4, p.toFixed(2), "#6e6e73", 11, "end");
    s += txt(60, 26, "2-minute bars", "#86868b", 12) + txt(XAXIS, 26, "Net GEX by strike, $B per 1% move", "#86868b", 12, "middle");
    s += txt(XAX, 488, "Illustrative", "#6e6e73", 11, "end");

    /* the regime tint: green above the flip, red below, bar by bar */
    var aReg = fade(T, 6.6, 0.5);
    if (aReg > 0) {
      var lastB = -1; for (q = 0; q < N; q++) if (T >= TB[q][1]) lastB = q;
      for (q = 0; q <= lastB; q++) s += '<rect x="' + (x(q) - 6.3) + '" y="' + YT + '" width="12.6" height="' + (YB - YT) + '" fill="' + (BARS[q][3] > GF ? COL.up : COL.dn) + '" opacity="' + aReg.toFixed(3) + '"/>';
    }

    /* the histogram */
    var hp = clamp01((T - 0.3) / 2.6), mx = 2.4, half = (XH1 - XAXIS) - 6;
    s += '<line x1="' + XAXIS + '" x2="' + XAXIS + '" y1="' + (YT + 6) + '" y2="' + (YB - 4) + '" stroke="#48484a"/>';
    s += txt(XAXIS - 8, YB + 18, "puts", COL.puts, 12, "end", 600, fade(T, 0.4)) + txt(XAXIS + 8, YB + 18, "calls", COL.calls, 12, "start", 600, fade(T, 0.4));
    Object.keys(GEX).forEach(function (k) {
      var st = +k, v = GEX[k], w = Math.abs(v) / mx * half * hp, yy = y(st) - 10, big = st === CW || st === PW;
      var hl = big ? fade(T, 4.0, 0.4) : 0;
      s += '<rect x="' + (v >= 0 ? XAXIS : XAXIS - w).toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + w.toFixed(1) + '" height="20" rx="3" fill="' + (v >= 0 ? COL.calls : COL.puts) + '" opacity="' + (0.45 + 0.5 * hl).toFixed(3) + '"/>';
      if (hp >= 1) s += txt(v >= 0 ? XAXIS + w + 6 : XAXIS - w - 6, yy + 14, (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1), "#a1a1a6", 10.5, v >= 0 ? "start" : "end", null, fade(T, 2.9, 0.4));
    });
    s += callout(70, y(776.6), ["Gamma × open interest × 100 × spot² × 1%", "Calls +, puts −, expirations out to 30 days"], "#f5f5f7", fade(T, 1.0, 0.4) * (1 - fade(T, 6.4, 0.5)));

    /* the three levels */
    var aL = fade(T, 4.0, 0.4), ext = clamp01((T - 4.2) / 1.0), xl = XH0 - (XH0 - 56) * ext;
    [[CW, COL.cw, null, "Call wall " + CW], [GF, COL.gf, "7 5", "Gamma flip " + GF], [PW, COL.pw, null, "Put wall " + PW]].forEach(function (d) {
      s += hline(xl, XH1, d[0], d[1], d[2], 2, aL) + tag(d[0], d[3], d[1], aL);
      s += '<rect x="56" y="' + y(d[0] + ZONE).toFixed(1) + '" width="' + (XC - 56) + '" height="' + (y(d[0] - ZONE) - y(d[0] + ZONE)).toFixed(1) + '" fill="' + d[1] + '" opacity="' + (0.10 * fade(T, 6.6, 0.5)).toFixed(3) + '"/>';
    });
    s += txt(XAXIS + 18, y(GF) - 8, "total gamma crosses zero", COL.gf, 11, "start", 600, aL * (1 - fade(T, 6.6, 0.5)));
    var aRg = fade(T, 6.8, 0.4) * (1 - fade(T, 13.8, 0.4));
    s += callout(70, y(769.35), ["Above the flip: positive gamma", "Dealers dampen moves · fade the walls"], "#30d158", aRg);

    /* bars */
    BARS.forEach(function (b, j) { var pr = clamp01((T - TB[j][0]) / (TB[j][1] - TB[j][0])); if (pr > 0) s += candle(x(j), b, pr, 8); });

    /* signals */
    var a1 = fade(T, TB[REJ][1], 0.3);
    s += marker(x(REJ), y(BARS[REJ][1]) - 10, false, COL.cw, "CW", a1);
    s += callout(x(REJ) + 18, y(776.75), ["Call wall rejection", "Tagged the zone, red close back under"], COL.cw, a1 * (1 - fade(T, 13.8, 0.4)));
    var a2 = fade(T, TB[LOSS][1], 0.3);
    s += marker(x(LOSS), y(BARS[LOSS][1]) - 10, false, "#ff9800", "GF↓", a2);
    s += callout(x(LOSS) + 16, y(772.9), ["Below the flip: negative gamma", "Dealers chase · moves stretch"], "#ff6961", a2 * (1 - fade(T, 16.0, 0.4)));
    var a3 = fade(T, TB[RETEST][1], 0.3);
    s += marker(x(RETEST), y(BARS[RETEST][1]) - 10, false, COL.gf, "RT↓", a3);
    s += callout(x(RETEST) + 16, y(772.9), ["Flip retest failed", "Short, room to the put wall"], COL.gf, a3 * (1 - fade(T, 20.8, 0.4)));
    var a4 = fade(T, TB[HOLD][1], 0.3);
    s += marker(x(HOLD), y(BARS[HOLD][2]) + 12, true, COL.pw, "PW", a4);
    s += callout(x(HOLD) - 20, y(768.9), ["Put wall hold", "Weaker below the flip: check", "the confidence and the $ size"], COL.pw, a4, true);
    svg.innerHTML = s;
  }

  /* ---------- captions + controls ---------- */
  function stageAt(T) { var j = 0; STAGES.forEach(function (st, i) { if (T >= st.at) j = i; }); return j; }
  var shown = -1;
  function caption(T) {
    var j = stageAt(T);
    if (j === shown) return;
    shown = j;
    cap.n.textContent = (j + 1) + " / " + STAGES.length;
    cap.t.textContent = STAGES[j].title;
    cap.b.textContent = STAGES[j].text;
    chips.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-current", i === j ? "step" : "false"); });
  }
  chips.innerHTML = STAGES.map(function (st, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + ". " + st.title + "</button>"; }).join("");

  var T = END, playing = false, lastNow = 0, raf = 0;
  var scroller = root.querySelector(".anim-scroll");
  function follow() {
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 2) return;
    var sw = scroller.scrollWidth, cw = scroller.clientWidth, fx;
    if (T < 6.6) { scroller.scrollLeft = sw - cw; return; }
    var last = 0; for (var j = 0; j < N; j++) if (T >= TB[j][0]) last = j;
    if (T >= END - 0.01) { scroller.scrollLeft = Math.max(0, (x(RETEST) - 140) / W * sw); return; }
    fx = x(last) + 150;
    scroller.scrollLeft = Math.max(0, fx / W * sw - cw * 0.8);
  }
  function draw() { frame(T); caption(T); follow(); }
  function tick(now) {
    if (!playing) return;
    var dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
    T += dt;
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
  btnPlay.addEventListener("click", function () { if (playing) { setPlaying(false); return; } if (T >= END) T = 0; setPlaying(true); });
  btnReplay.addEventListener("click", function () { T = 0; draw(); setPlaying(true); });
  chips.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var j = +b.getAttribute("data-i");
    if (REDUCED) { T = j + 1 < STAGES.length ? STAGES[j + 1].at - 0.01 : END; draw(); return; }
    T = STAGES[j].at; draw(); setPlaying(true);
  });

  draw();
  if (!REDUCED && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); T = 0; draw(); setPlaying(true); }
    }, { threshold: 0.5 });
    io.observe(svg.parentNode || svg);
  }
})();
