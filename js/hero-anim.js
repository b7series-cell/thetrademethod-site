/* hero-anim.js — homepage hero: a camera glides beside a 3D candle chart that prints live,
   and the premarket high flashes green when price breaks it. Styles in css/hero.css. */
(function () {
  var hero = document.getElementById("hero"), cv = hero.querySelector("canvas"), ctx = cv.getContext("2d");
  var tag = hero.querySelector(".tag"), tagT = hero.querySelector(".tag-t"), flash = hero.querySelector(".flash");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, DPR = 1, narrow = false;

  /* ---- price story: base under a level, break it, run, pull back, repeat ---- */
  var S = 34, BODY = 18, PSCALE = 9;          // world spacing, candle width, price → world units
  var candles = [], price = 100, level = 104, phase = "base", left = 22, broke = false;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function nextCandle() {
    var o = price, c, vol;
    if (phase === "base")  { c = Math.min(level - rnd(0.2, 1.4), o + rnd(-1.6, 1.6)); vol = rnd(.25, .5); }
    else if (phase === "break") { c = o + rnd(2.2, 4.2); vol = rnd(.85, 1); }
    else if (phase === "run")   { c = o + rnd(-0.9, 2.1); vol = rnd(.45, .75); }
    else                         { c = o + rnd(-2.0, 0.7); vol = rnd(.3, .55); }
    var hi = Math.max(o, c) + rnd(0.2, 1.3), lo = Math.min(o, c) - rnd(0.2, 1.3);
    if (phase === "base") hi = Math.min(hi, level + rnd(-0.1, 0.25));
    var k = { o:o, c:c, h:hi, l:lo, v:vol, lvl:level, crossed:false, born:0 };
    if (phase === "break" && o <= level && c > level) k.crossed = true;
    price = c;
    if (--left <= 0) {
      if (phase === "base") { phase = "break"; left = 3; }
      else if (phase === "break") { phase = "run"; left = Math.round(rnd(14, 22)); }
      else if (phase === "run") { phase = "pull"; left = Math.round(rnd(6, 10)); }
      else {
        var hh = -1e9; candles.slice(-30).forEach(function (q) { hh = Math.max(hh, q.h); });
        level = Math.max(hh, price + 3); phase = "base"; left = Math.round(rnd(14, 22));
      }
    }
    return k;
  }
  for (var i = 0; i < 160; i++) { var k0 = nextCandle(); k0.born = -1; candles.push(k0); }

  /* ---- camera ---- */
  var cam = { x:0, y:0, z:-300, yaw:-0.72, f:900 };
  var smoothY = price * PSCALE;
  function setCam(t) {
    var n = candles.length - 1 + progress;
    cam.x = n * S + (narrow ? 70 : 120);
    var recent = candles.slice(-12), avg = 0; recent.forEach(function (q) { avg += (q.h + q.l) / 2; }); avg /= recent.length;
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
    var cx = narrow ? W * 0.5 : W * 0.64, cy = narrow ? H * 0.36 : H * 0.36;
    return { x: cx + xr * cam.f / zr, y: cy - dy * cam.f / zr, k: cam.f / zr, z: zr };
  }
  function fog(z) { return Math.max(0, Math.min(1, 1.15 - z / 3600)); }

  /* ---- drawing ---- */
  var progress = 0;            // 0..1, how far the newest candle has formed
  function drawFloor(floorY) {
    ctx.lineWidth = 1;
    for (var zz = -120; zz <= 360; zz += 60) {                 // rails along time
      var a = proj(cam.x - 6000, floorY, zz), b = proj(cam.x + 60, floorY, zz);
      if (!a || !b) continue;
      var g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, "rgba(41,151,255,0)"); g.addColorStop(1, "rgba(41,151,255,.16)");
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    var first = Math.floor((cam.x - 6000) / (S * 5)) * 5;
    for (var i = first; i * S < cam.x; i += 5) {              // ticks across
      var p = proj(i * S, floorY, -120), q = proj(i * S, floorY, 360);
      if (!p || !q) continue;
      ctx.strokeStyle = "rgba(41,151,255," + (0.12 * fog(p.z)) + ")";
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
  }
  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var bg = ctx.createRadialGradient(W * 0.62, H * 0.42, 0, W * 0.62, H * 0.42, Math.max(W, H) * 0.7);
    bg.addColorStop(0, "#0b1424"); bg.addColorStop(0.5, "#05080f"); bg.addColorStop(1, "#000");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    var lowest = 1e9; candles.slice(-60).forEach(function (q) { lowest = Math.min(lowest, q.l); });
    var floorY = lowest * PSCALE - 40;
    drawFloor(floorY);

    var n = candles.length;
    // the active level, drawn as a glowing rail through the candles
    var last = candles[n - 1], lvlY = last.lvl * PSCALE;
    var la = proj(cam.x - 5000, lvlY, 0), lb = proj(cam.x + 40, lvlY, 0);
    if (la && lb) {
      var lg = ctx.createLinearGradient(la.x, la.y, lb.x, lb.y);
      var lc = broke ? "48,209,88" : "41,151,255";
      lg.addColorStop(0, "rgba(" + lc + ",0)"); lg.addColorStop(1, "rgba(" + lc + ",.9)");
      ctx.save(); ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.shadowColor = "rgba(" + lc + ",1)"; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(la.x, la.y); ctx.lineTo(lb.x, lb.y); ctx.stroke(); ctx.restore();
      var tp = proj(cam.x - (narrow ? 260 : 420), lvlY, 0);
      if (tp) { tag.style.transform = "translate(" + Math.round(tp.x - 60) + "px," + Math.round(tp.y - 40) + "px)"; tag.style.opacity = 1; }
    }

    for (var i = Math.max(0, n - 150); i < n; i++) {
      var k = candles[i], X = i * S, isLast = i === n - 1;
      var c = isLast ? k.o + (k.c - k.o) * ease(progress) + Math.sin(t * 0.02) * 0.25 * (1 - progress) : k.c;
      var h = isLast ? Math.max(k.o, c) + (k.h - Math.max(k.o, k.c)) * progress : k.h;
      var l = isLast ? Math.min(k.o, c) - (Math.min(k.o, k.c) - k.l) * progress : k.l;
      var up = c >= k.o;
      var pT = proj(X, h * PSCALE, 0), pB = proj(X, l * PSCALE, 0);
      var pO = proj(X, k.o * PSCALE, 0), pC = proj(X, c * PSCALE, 0);
      if (!pT || !pB || !pO || !pC) continue;
      var a = fog(pO.z), w = Math.max(1, BODY * pO.k);
      // volume bar on the floor
      var v0 = proj(X, floorY, 0), v1 = proj(X, floorY + k.v * 34, 0);
      if (v0 && v1) { ctx.fillStyle = "rgba(41,151,255," + (0.28 * a) + ")"; ctx.fillRect(v0.x - w / 2, v1.y, w, v0.y - v1.y); }
      // reflection
      if (v0) { ctx.fillStyle = "rgba(" + (up ? "48,209,88" : "120,120,128") + "," + (0.06 * a) + ")"; ctx.fillRect(pO.x - w / 2, v0.y + 2, w, Math.min(60 * pO.k, (v0.y - Math.max(pO.y, pC.y)) * 0.25)); }
      // wick + body
      ctx.strokeStyle = up ? "rgba(134,134,139," + a + ")" : "rgba(66,66,69," + a + ")";
      ctx.lineWidth = Math.max(1, 2 * pO.k);
      ctx.beginPath(); ctx.moveTo(pT.x, pT.y); ctx.lineTo(pB.x, pB.y); ctx.stroke();
      var top = Math.min(pO.y, pC.y), ht = Math.max(Math.abs(pO.y - pC.y), 2);
      if (up) {
        var g = ctx.createLinearGradient(pO.x - w / 2, 0, pO.x + w / 2, 0);
        var hot = k.crossed || (isLast && phase !== "base");
        g.addColorStop(0, "rgba(20,60,32," + a + ")"); g.addColorStop(0.5, hot ? "rgba(120,255,160," + a + ")" : "rgba(48,209,88," + a + ")"); g.addColorStop(1, "rgba(16,40,24," + a + ")");
        ctx.fillStyle = g;
        if (hot || i > n - 4) { ctx.save(); ctx.shadowColor = "rgba(48,209,88,.9)"; ctx.shadowBlur = 24 * Math.min(1, pO.k * 1.5); roundRect(pO.x - w / 2, top, w, ht, Math.min(4, w / 3)); ctx.fill(); ctx.restore(); }
        else { roundRect(pO.x - w / 2, top, w, ht, Math.min(4, w / 3)); ctx.fill(); }
      } else {
        var g2 = ctx.createLinearGradient(pO.x - w / 2, 0, pO.x + w / 2, 0);
        g2.addColorStop(0, "rgba(24,24,26," + a + ")"); g2.addColorStop(0.5, "rgba(110,110,115," + a + ")"); g2.addColorStop(1, "rgba(29,29,31," + a + ")");
        ctx.fillStyle = g2; roundRect(pO.x - w / 2, top, w, ht, Math.min(4, w / 3)); ctx.fill();
      }
    }
    // light sweep: a slow anamorphic streak through the newest candle
    var nl = proj((n - 1) * S, candles[n - 1].c * PSCALE, 0);
    if (nl) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      var sg = ctx.createLinearGradient(0, nl.y, W, nl.y);
      var pulse = 0.10 + 0.06 * Math.sin(t * 0.003);
      sg.addColorStop(0, "rgba(41,151,255,0)"); sg.addColorStop(Math.min(0.999, Math.max(0.001, nl.x / W)), "rgba(120,190,255," + pulse + ")"); sg.addColorStop(1, "rgba(41,151,255,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, nl.y - 1.5, W, 3); ctx.restore();
    }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function ease(p) { return 1 - Math.pow(1 - p, 3); }

  function resize() {
    var r = cv.getBoundingClientRect(); DPR = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height; narrow = W < 640;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  addEventListener("resize", resize); resize();

  var PER = 620, lastT = 0, running = true;
  function frame(t) {
    if (!running) return;
    var dt = Math.min(64, t - (lastT || t)); lastT = t;
    progress += dt / PER;
    if (progress >= 1) {
      progress = 0;
      var k = nextCandle(); candles.push(k);
      if (candles.length > 400) candles.splice(0, candles.length - 400);
      if (k.crossed) { broke = true; flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go"); tag.classList.add("broke"); tagT.textContent = "Premarket high, broken"; }
      if (phase === "base" && broke && k.lvl !== candles[candles.length - 2].lvl) { broke = false; tag.classList.remove("broke"); tagT.textContent = "New high to beat"; }
    }
    setCam(t); draw(t);
    requestAnimationFrame(frame);
  }
  if (reduce) { setCam(0); progress = 1; draw(0); hero.classList.add("open", "on"); return; }
  new IntersectionObserver(function (e) {
    var vis = e[0].isIntersecting;
    if (vis && !running) { running = true; lastT = 0; requestAnimationFrame(frame); }
    running = vis;
  }).observe(hero);
  requestAnimationFrame(frame);
  setTimeout(function () { hero.classList.add("open"); }, 500);
  setTimeout(function () { hero.classList.add("on"); }, 1400);
})();
