/* =====================================================================
   em-calc.js — the interactive parts of expected-move-v2.html.

     [data-em-calc]        expected move calculator: chain prices (ask or mid)
                           or implied volatility + days to expiration, with a
                           bell curve of the ±1σ and ±2σ range
     [data-em-tabs]        step switcher for the methods at a glance
     [data-yt]             video facade: a thumbnail until clicked, then the
                           YouTube player (timestamp buttons start it there)
     [data-print-cheat]    prints only the cheat sheet section

   Everything runs in the browser. Nothing typed into the calculator is
   sent anywhere. Probabilities use Black-Scholes with zero rates and no
   dividends, so they are risk-neutral odds, not a forecast.
   ===================================================================== */

(function () {
  "use strict";

  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#64d2ff", gold: "#f4b942", orange: "#ff9f0a",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e" };
  var BELL_NARROW = 460;                      // px of drawing width under which the bell uses the phone layout
  var Z16 = 0.994458;                         // N(−0.9945) ≈ 0.16, the 16 delta z-score

  /* ---------- math ---------- */
  function ncdf(x) {                          // standard normal CDF (Abramowitz-Stegun 7.1.26 via erf)
    var s = x < 0 ? -1 : 1, z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
    return 0.5 * (1 + s * y);
  }
  function num(el) { if (!el) return NaN; var v = parseFloat(String(el.value).replace(/[$,%\s]/g, "")); return isFinite(v) ? v : NaN; }
  function usd(v) { return "$" + v.toFixed(2); }
  function pct(v, d) { return (v * 100).toFixed(d == null ? 1 : d) + "%"; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- bell curve ---------- */
  function bell(svg, box, S, em, opts) {
    var narrow = box.clientWidth > 0 && box.clientWidth < BELL_NARROW;
    var W = narrow ? 380 : 700, H = narrow ? 320 : 290, FS = narrow ? 1.2 : 1.3;
    var x0 = narrow ? 14 : 30, x1 = W - (narrow ? 14 : 30), base = H - (narrow ? 80 : 56), top = narrow ? 34 : 30;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    if (!(S > 0) || !(em > 0)) {
      svg.innerHTML = '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '" rx="0"/>' +
        '<text x="' + W / 2 + '" y="' + H / 2 + '" fill="' + C.faint + '" font-size="' + 14 * FS + '" text-anchor="middle">Enter a price and option prices to draw the range</text>';
      return;
    }
    var span = 3.2;                          // draw ±3.2σ
    function X(z) { return x0 + (z + span) / (2 * span) * (x1 - x0); }
    function Y(z) { return base - Math.exp(-z * z / 2) * (base - top); }
    function area(a, b) {
      var p = "M" + X(a).toFixed(1) + "," + base, k;
      for (k = 0; k <= 60; k++) { var z = a + (b - a) * k / 60; p += " L" + X(z).toFixed(1) + "," + Y(z).toFixed(1); }
      return p + " L" + X(b).toFixed(1) + "," + base + " Z";
    }
    function t(x, y, s, col, size, anchor, weight) {
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (size * FS).toFixed(1) + '" text-anchor="' + (anchor || "middle") + '"' + (weight ? ' font-weight="' + weight + '"' : "") + ">" + s + "</text>";
    }
    var s = '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
    s += '<path d="' + area(-2, 2) + '" fill="' + C.blue + '" opacity="0.16"/>';
    s += '<path d="' + area(-1, 1) + '" fill="' + C.up + '" opacity="0.30"/>';
    var curve = "", k;
    for (k = 0; k <= 160; k++) { var z = -span + 2 * span * k / 160; curve += (k ? " L" : "M") + X(z).toFixed(1) + "," + Y(z).toFixed(1); }
    s += '<path d="' + curve + '" fill="none" stroke="' + C.ink + '" stroke-width="2"/>';
    s += '<line x1="' + x0 + '" y1="' + base + '" x2="' + x1 + '" y2="' + base + '" stroke="#3a3a3c"/>';
    [-2, -1, 0, 1, 2].forEach(function (z) {
      var col = z === 0 ? C.dim : Math.abs(z) === 1 ? C.up : C.blue;
      s += '<line x1="' + X(z).toFixed(1) + '" y1="' + Y(z).toFixed(1) + '" x2="' + X(z).toFixed(1) + '" y2="' + (base + 6) + '" stroke="' + col + '" stroke-width="1.4"' + (z ? ' stroke-dasharray="4 4"' : "") + "/>";
      var p = S + z * em;
      s += t(X(z), base + 20 * FS, z === 0 ? "now" : (z < 0 ? "−" : "+") + Math.abs(z) + "σ", col, 12, "middle", 600);
      if (!narrow) s += t(X(z), base + 37 * FS, usd(p), col, 12);
      else if (z !== 0) s += t(X(z), base + (Math.abs(z) === 1 ? 37 : 54) * FS, usd(p), col, 11.5);   // stagger so prices never touch
    });
    s += t(X(0), Y(0.2) + (narrow ? 64 : 70), "68%", C.ink, narrow ? 18 : 22, "middle", 700);
    s += t(X(0), Y(0.2) + (narrow ? 64 : 70) + 20 * FS, "inside ±1σ", C.dim, 12);
    s += t(X(-1.5), base - 10, "13.5%", C.blue, 11, "middle", 600);
    s += t(X(1.5), base - 10, "13.5%", C.blue, 11, "middle", 600);
    if (!narrow) {
      s += t(X(-2.6), base - 14, "2.5%", C.faint, 12);
      s += t(X(2.6), base - 14, "2.5%", C.faint, 12);
    }
    s += t(x0, 18 * FS, ((opts && opts.title) || "") + (narrow ? " · now " + usd(S) : ""), C.faint, 11.5, "start");
    svg.innerHTML = s;
  }

  /* ---------- calculator ---------- */
  var PRESETS = {
    spy: { S: 410.54, dte: 6, ac: [4.71, 4.73], ap: [5.16, 5.18], ic: [5.27, 5.29], ip: [5.16, 5.18] },
    wide: { S: 52.30, dte: 6, ac: [1.45, 1.75], ap: [1.55, 1.90], ic: [1.70, 2.05], ip: [1.55, 1.90] }
  };

  function initCalc(root) {
    var q = function (sel) { return root.querySelector(sel); };
    var f = function (name) { return root.querySelector('[name="' + name + '"]'); };
    var out = q(".calc-out"), svg = q(".calc-bell svg"), box = q(".calc-bell");
    var mode = "chain", price = "ask";

    function setSeg(group, val) {
      root.querySelectorAll('[data-seg="' + group + '"] button').forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-v") === val ? "true" : "false");
      });
    }
    function leg(prefix) {
      var b = num(f(prefix + "_bid")), a = num(f(prefix + "_ask"));
      if (!(a > 0)) return { ok: false };
      var mid = b >= 0 && b <= a ? (a + b) / 2 : a;
      return { ok: true, ask: a, mid: mid, bad: b > a };
    }
    function row(label, val, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + label + "</span><b>" + val + "</b></div>"; }

    function computeChain() {
      var S = num(f("price")), ac = leg("ac"), ap = leg("ap"), ic = leg("ic"), ip = leg("ip");
      if (!(S > 0) || !ac.ok || !ap.ok) return { html: '<p class="calc-msg">Enter the price and the at-the-money call and put to see the move.</p>' };
      var key = price;
      var strad = ac[key] + ap[key], stradAsk = ac.ask + ap.ask, stradMid = ac.mid + ap.mid;
      var has2 = ic.ok && ip.ok, em = strad, m2, m2Ask, m2Mid;
      var h = row("Method 1 · ATM straddle (" + key + ")", "&plusmn;" + usd(strad));
      if (has2) {
        var strg = ic[key] + ip[key];
        m2 = (strad + strg) / 2; m2Ask = (stradAsk + ic.ask + ip.ask) / 2; m2Mid = (stradMid + ic.mid + ip.mid) / 2;
        h += row("First ITM strangle (" + key + ")", usd(strg));
        h += row("Method 2 · (straddle + strangle) &divide; 2", "&plusmn;" + usd(m2), "tot");
        em = m2;
      } else {
        h += row("Method 2", "add the ITM legs below");
      }
      h += row("Top of the range", usd(S + em));
      h += row("Bottom of the range", usd(S - em));
      h += row("Move as a share of price", pct(em / S, 2));
      var askEm = has2 ? m2Ask : stradAsk, midEm = has2 ? m2Mid : stradMid, diff = askEm - midEm;
      var note = '<p class="calc-note">On the ask the move is <b>&plusmn;' + usd(askEm) + "</b>; on the mid it's <b>&plusmn;" + usd(midEm) + "</b>. " +
        (diff < 0.005 ? "No spread entered, so the two match." :
          "The bid-ask spread adds " + usd(diff) + " (" + pct(diff / midEm, 1) + ") to the ask figure. " +
          (diff / midEm < 0.02 ? "Small enough to ignore on a chain this tight." : "On a chain this wide, the mid is the fairer read."));
      if ([ac, ap, ic, ip].some(function (l) { return l.bad; })) note += ' <span class="warn">A bid is above its ask, so that leg uses the ask.</span>';
      note += "</p>";
      return { html: h + note, S: S, em: em, title: "Bell curve on " + (has2 ? "method 2" : "method 1") + ", priced on the " + key };
    }

    function computeIV() {
      var S = num(f("iv_price")), iv = num(f("iv")) / 100, dte = num(f("dte"));
      if (!(S > 0) || !(iv > 0) || !(dte > 0)) return { html: '<p class="calc-msg">Enter the price, implied volatility and days to expiration.</p>' };
      var T = dte / 365, sd = iv * Math.sqrt(T), em = S * sd;
      var kc = S * Math.exp(Z16 * sd + sd * sd / 2), kp = S * Math.exp(-Z16 * sd + sd * sd / 2);
      var pc = ncdf(-Z16 - sd), pp = ncdf(-(Z16 - sd));     // N(d2) for the 16Δ call, N(−d2) for the 16Δ put
      var h = row("1σ expected move, S &times; IV &times; &radic;(DTE/365)", "&plusmn;" + usd(em), "tot");
      h += row("Range, about 68%", usd(S - em) + " &ndash; " + usd(S + em));
      h += row("2σ range, about 95%", usd(S - 2 * em) + " &ndash; " + usd(S + 2 * em));
      h += row("One trading day, Rule of 16 (IV &divide; 16)", "&plusmn;" + usd(S * iv / 16) + " (" + pct(iv / 16, 2) + ")");
      h += row("Approx. 16 delta strikes", usd(kp) + " / " + usd(kc));
      h += row("Odds those finish in the money", "put " + pct(pp, 1) + " &middot; call " + pct(pc, 1));
      var note = '<p class="calc-note">Delta says 16% for both. The model\'s odds of finishing in the money are ' + pct(pc, 1) + " for the call and " + pct(pp, 1) +
        " for the put, and the gap widens with higher IV and more days to expiration. Black-Scholes with no rates or dividends; risk-neutral odds, not a forecast.</p>";
      return { html: h + note, S: S, em: em, title: "Bell curve on the IV formula" };
    }

    function render() {
      var r = mode === "chain" ? computeChain() : computeIV();
      out.innerHTML = r.html;
      bell(svg, box, r.S, r.em, { title: r.title });
    }
    function fill(p) {
      var P = PRESETS[p]; if (!P) return;
      f("price").value = P.S.toFixed(2);
      ["ac", "ap", "ic", "ip"].forEach(function (k) { f(k + "_bid").value = P[k][0].toFixed(2); f(k + "_ask").value = P[k][1].toFixed(2); });
      render();
    }

    root.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || !root.contains(b)) return;
      var seg = b.closest("[data-seg]");
      if (seg) {
        var g = seg.getAttribute("data-seg"), v = b.getAttribute("data-v");
        if (g === "mode") { mode = v; root.querySelectorAll("[data-mode]").forEach(function (p) { p.hidden = p.getAttribute("data-mode") !== mode; }); }
        if (g === "price") price = v;
        setSeg(g, v); render(); return;
      }
      if (b.hasAttribute("data-preset")) fill(b.getAttribute("data-preset"));
      if (b.hasAttribute("data-clear")) { root.querySelectorAll('[data-mode="chain"] input').forEach(function (i) { i.value = ""; }); render(); }
    });
    root.addEventListener("input", render);
    var rt = 0, wasNarrow = null;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var n = box.clientWidth < BELL_NARROW; if (n !== wasNarrow) { wasNarrow = n; render(); } }, 120);
    });
    wasNarrow = box.clientWidth < BELL_NARROW;
    fill("spy");
  }

  /* ---------- step switcher ---------- */
  function initTabs(root) {
    var tabs = root.querySelectorAll('[role="tab"]'), panes = root.querySelectorAll('[role="tabpanel"]');
    function show(i, focus) {
      tabs.forEach(function (t, k) { t.setAttribute("aria-selected", k === i ? "true" : "false"); t.tabIndex = k === i ? 0 : -1; });
      panes.forEach(function (p, k) { p.hidden = k !== i; });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(i); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); show((i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length, true); }
      });
    });
    root.querySelectorAll("[data-step]").forEach(function (b) {
      b.addEventListener("click", function () {
        var cur = 0; tabs.forEach(function (t, k) { if (t.getAttribute("aria-selected") === "true") cur = k; });
        show((cur + (+b.getAttribute("data-step")) + tabs.length) % tabs.length, true);
      });
    });
    show(0);
  }

  /* ---------- video facade ---------- */
  function initVideo(root) {
    var id = root.getAttribute("data-yt"), frame = root.querySelector(".video-frame"), title = root.getAttribute("data-yt-title") || "Video";
    function load(start) {
      frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + "?autoplay=1&rel=0" + (start ? "&start=" + start : "") +
        '" title="' + esc(title) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
      if (start && frame.getBoundingClientRect().top < 0) frame.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-start], .yt-play"); if (!b) return;
      load(+(b.getAttribute("data-start") || 0));
    });
  }

  /* ---------- print the cheat sheet only ---------- */
  function initPrint(btn) {
    btn.addEventListener("click", function () {
      document.documentElement.classList.add("print-cheat");
      var done = function () { document.documentElement.classList.remove("print-cheat"); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print();
    });
  }

  document.querySelectorAll("[data-em-calc]").forEach(initCalc);
  document.querySelectorAll("[data-em-tabs]").forEach(initTabs);
  document.querySelectorAll("[data-yt]").forEach(initVideo);
  document.querySelectorAll("[data-print-cheat]").forEach(initPrint);
  window.EMCalc = { ncdf: ncdf };            // exposed for checks in testing
})();
