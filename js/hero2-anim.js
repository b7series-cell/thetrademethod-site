/* hero2-anim.js — draws the "Opening bell" homepage hero (see css/hero2.css). */
(function () {
  var hero = document.getElementById("hero"), cv = hero.querySelector("canvas"), ctx = cv.getContext("2d");
  var clockT = hero.querySelector(".cl-t"), card = hero.querySelector(".card"), skip = hero.querySelector(".skip");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, DPR = 1, narrow = false;

  /* price path: a quiet premarket, then the opening drive */
  var pts = [], N = 260, p = 0;
  function seed() {
    pts = []; p = 0;
    for (var i = 0; i < N; i++) {
      var drive = i < 30 ? 0 : (i < 110 ? 0.55 : (i < 150 ? -0.25 : 0.32));
      p += drive + (Math.random() - 0.5) * 2.2;
      pts.push(p);
    }
  }
  seed();
  function addPoint() { var last = pts[pts.length - 1]; pts.push(last + 0.12 + (Math.random() - 0.5) * 2.4); pts.shift(); }

  var T0 = 0, STATE = "clock", drawn = 0, dim = 0, shake = 0, phaseT = 0;
  var CARDS = ["Find the idea.", "Write the rules.", "Learn the edge."];

  function resize() {
    var r = cv.getBoundingClientRect(); DPR = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height; narrow = W < 640;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  addEventListener("resize", resize); resize();

  function y(v, lo, hi) { var top = narrow ? H * 0.12 : H * 0.14, bot = narrow ? H * 0.52 : H * 0.84; return bot - (v - lo) / (hi - lo || 1) * (bot - top); }

  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    bg.addColorStop(0, "#07101d"); bg.addColorStop(1, "#000");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // price ladder
    ctx.strokeStyle = "rgba(41,151,255,.07)"; ctx.lineWidth = 1;
    for (var gy = 0; gy < H; gy += narrow ? 44 : 64) { ctx.beginPath(); ctx.moveTo(0, gy + .5); ctx.lineTo(W, gy + .5); ctx.stroke(); }

    if (STATE === "clock") {           // the heartbeat under the clock
      var mid = narrow ? H * 0.62 : H * 0.68;
      ctx.strokeStyle = "rgba(41,151,255,.55)"; ctx.lineWidth = 1.5; ctx.beginPath();
      for (var x = 0; x <= W; x += 3) {
        var ph = ((x / W) * 3 - t * 0.0011) % 1; if (ph < 0) ph += 1;
        var blip = ph > 0.48 && ph < 0.52 ? Math.sin((ph - 0.48) / 0.04 * Math.PI) * 26 : 0;
        ctx.lineTo(x, mid - blip + Math.sin(x * 0.05 + t * 0.004) * 1.2);
      }
      ctx.stroke(); return;
    }

    var lo = Infinity, hi = -Infinity; pts.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    var pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    var count = Math.max(2, Math.floor(drawn * pts.length));
    var step = W / (pts.length - 1);
    var alpha = 1 - dim * 0.6;

    // area under the line
    var ag = ctx.createLinearGradient(0, H * 0.1, 0, H);
    ag.addColorStop(0, "rgba(48,209,88," + 0.22 * alpha + ")"); ag.addColorStop(1, "rgba(48,209,88,0)");
    ctx.beginPath(); ctx.moveTo(0, H);
    for (var i = 0; i < count; i++) ctx.lineTo(i * step, y(pts[i], lo, hi));
    ctx.lineTo((count - 1) * step, H); ctx.closePath(); ctx.fillStyle = ag; ctx.fill();

    // the line, with glow
    var lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, "rgba(41,151,255," + alpha + ")"); lg.addColorStop(1, "rgba(48,209,88," + alpha + ")");
    ctx.save(); ctx.strokeStyle = lg; ctx.lineWidth = narrow ? 2.5 : 3; ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(48,209,88," + 0.9 * alpha + ")"; ctx.shadowBlur = 18;
    ctx.beginPath(); for (i = 0; i < count; i++) ctx.lineTo(i * step, y(pts[i], lo, hi)); ctx.stroke(); ctx.restore();

    // the tip: a spark with trailing particles
    var tx = (count - 1) * step, ty = y(pts[count - 1], lo, hi);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    var tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 60);
    tg.addColorStop(0, "rgba(180,255,200," + 0.9 * alpha + ")"); tg.addColorStop(0.2, "rgba(48,209,88," + 0.5 * alpha + ")"); tg.addColorStop(1, "rgba(48,209,88,0)");
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty, 60, 0, 6.3); ctx.fill();
    sparks.forEach(function (s) { ctx.fillStyle = "rgba(120,255,170," + s.a * alpha + ")"; ctx.fillRect(s.x, s.y, 2, 2); });
    ctx.restore();
    if (Math.random() < 0.7) sparks.push({ x: tx, y: ty, vx: -1 - Math.random() * 2, vy: (Math.random() - 0.5) * 1.6, a: 1 });
    sparks.forEach(function (s) { s.x += s.vx; s.y += s.vy; s.a -= 0.02; });
    sparks = sparks.filter(function (s) { return s.a > 0; });
  }
  var sparks = [];

  function showCard(i) {
    card.innerHTML = "<span>" + CARDS[i] + "</span>";
    requestAnimationFrame(function () { card.firstChild.classList.add("go"); });
  }
  function settle() {
    STATE = "live"; drawn = 1; card.innerHTML = ""; hero.classList.add("bell", "on"); skip.hidden = true;
  }

  var lastAdd = 0, running = true;
  function frame(t) {
    if (!running) return;
    if (!T0) T0 = t;
    var e = (t - T0) / 1000;
    if (STATE === "clock") {
      var sec = Math.min(60, 57 + Math.floor(e / 0.8));
      clockT.textContent = sec >= 60 ? "9:30:00" : "9:29:" + sec;
      if (e >= 2.5) { STATE = "draw"; phaseT = t; hero.classList.add("bell"); hero.classList.remove("shake"); void hero.offsetWidth; hero.classList.add("shake"); }
    } else if (STATE === "draw") {
      var d = (t - phaseT) / 1000;
      drawn = Math.min(1, d / 3.6);
      var ci = Math.floor((d - 0.4) / 1.15);
      if (ci >= 0 && ci < CARDS.length && card.dataset.i !== String(ci)) { card.dataset.i = ci; showCard(ci); }
      if (d > 4.0) { dim = Math.min(1, (d - 4.0) / 1.2); }
      if (d > 4.0 && !hero.classList.contains("on")) { hero.classList.add("on"); skip.hidden = true; }
      if (d > 5.2) STATE = "live";
    } else {
      dim = 1;
      if (t - lastAdd > 450) { addPoint(); lastAdd = t; }
    }
    draw(t);
    requestAnimationFrame(frame);
  }
  skip.addEventListener("click", function () { settle(); dim = 1; });
  if (reduce) { STATE = "live"; drawn = 1; dim = 1; hero.classList.add("bell", "on"); skip.hidden = true; draw(0); return; }
  new IntersectionObserver(function (en) {
    var vis = en[0].isIntersecting;
    if (vis && !running) { running = true; requestAnimationFrame(frame); }
    running = vis;
  }).observe(hero);
  requestAnimationFrame(frame);
})();
