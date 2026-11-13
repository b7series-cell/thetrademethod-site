/* =====================================================================
   gex-live.js — live GEX Levels chart.

   The levels come from the morning paste string (the same text that goes
   into the TradingView indicator), saved on the server by date through
   /api/gex-levels.php. Bars come from /api/bars.php (the API key stays
   on the server). On top of them this runs the signal logic of
   pine/gex-levels.pine at its default settings:
     · touch zone 0.25 × ATR(14); 6-bar cooldown per signal; 9:30–16:00;
       signals only on the session the levels are for
     · CW   call wall rejection: high reaches the zone, red close back under
     · PW   put wall hold: low reaches the zone, green close back over
     · GF↓ / GF↑   the close crosses the gamma flip
     · RT↓ / RT↑   flip retest that fails from below / holds from above
     · CW⇧ / PW⇩   the close crosses through a wall
     · optional volume signals: dry-up into a level then a high-volume
       turn away (VR), or a solid close through it on 1.5× volume (VB)
   Signals use closed bars only.

   Mount: <section data-gex-live data-symbol="SPY">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { zoneMult: 0.25, cool: 6, win: [570, 960], volLen: 20, touchBars: 5, dryBars: 3, dryMult: 0.8, revMult: 1.3, brkMult: 1.5, brkBody: 0.5 };
  var POLL_MS = 60000, RTH_OPEN = 570, RTH_CLOSE = 960;
  var COL = { CW: "#ff5252", CW2: "#ef9a9a", GF: "#ffd600", PW: "#00e676", PW2: "#a5d6a7", CW0: "#ff8a80", PW0: "#69f0ae" };
  var NAMES = { CW: "CALL WALL", CW2: "CALL WALL 2", GF: "GAMMA FLIP", PW: "PUT WALL", PW2: "PUT WALL 2", CW0: "0DTE CW", PW0: "0DTE PW" };
  var STYLE = { CW: 0, CW2: 1, GF: 2, PW: 0, PW2: 1, CW0: 2, PW0: 2 };          // solid · dotted · dashed
  var ORDER = ["CW", "CW2", "GF", "PW", "PW2", "CW0", "PW0"];
  var FAMILY = { ES: "SPX", MES: "SPX", SPY: "SPX", XSP: "SPX", NQ: "NDX", MNQ: "NDX", QQQ: "NDX" };

  var root = document.querySelector("[data-gex-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"), status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate"),
    date: root.querySelector(".gex-date"), text: root.querySelector(".gex-text"), save: root.querySelector(".gex-save"), apply: root.querySelector(".gex-apply"),
    ratio: root.querySelector(".gex-ratio"), saved: root.querySelector(".gex-saved"), vol: root.querySelector(".gex-vol")
  };
  var MULT = 2;
  var KIT = LiveKit.controls(root, { key: "gex", symbol: (root.getAttribute("data-symbol") || "SPY").toUpperCase(), tf: 2, extraTag: "levels",
    onChange: function (sym, tf) { SYMBOL = sym; MULT = tf; render.fitted = false; load(); } });
  var SYMBOL = KIT.symbol; MULT = KIT.tf;
  var LV = { date: null, today: null, text: "", dates: [] };          // the saved levels
  var VOL = false;
  try { VOL = localStorage.getItem("gex_vol") === "1"; var rt = localStorage.getItem("gex_ratio"); if (rt && els.ratio) els.ratio.value = rt; } catch (e) {}
  if (els.vol) els.vol.checked = VOL;

  function token() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }
  var fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  function etParts(ms) {
    var p = {};
    fmt.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    var h = (+p.hour) % 24;
    return { date: p.year + "-" + p.month + "-" + p.day, min: h * 60 + (+p.minute), wall: Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute) / 1000 };
  }
  function money(x) { return x == null || isNaN(x) ? "—" : x.toFixed(2); }
  function clock(min) { var h = Math.floor(min / 60), m = min % 60; return (h > 12 ? h - 12 : h) + ":" + (m < 10 ? "0" : "") + m; }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function day(d) { if (!d) return "—"; var p = d.split("-"); return MON[+p[1] - 1] + " " + (+p[2]); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- the paste string: the same rules as the indicator ---------- */
  function confName(s) { return { H: "HIGH", HIGH: "HIGH", G: "GOOD", GOOD: "GOOD", M: "MED", MED: "MED", MEDIUM: "MED", L: "LOW", LOW: "LOW" }[s] || s; }
  /* keep only level lines: drop "# …" header/comment lines and anything without a ':' or '=' */
  function cleanPaste(text) {
    return String(text || "").replace(/\r/g, "").split(/[\n|]/).map(function (l) { return l.trim(); })
      .filter(function (l) { return l && l.charAt(0) !== "#"; })
      .map(function (l) { return l.replace(/[^A-Za-z0-9.:;=,\-_ ]/g, "").trim(); })
      .filter(function (l) { return /[:=]/.test(l); }).join("\n");
  }
  var TICKER = /^[A-Z][A-Z0-9._-]{0,9}$/;
  function parseAll(text) {
    var out = { lines: {}, generic: null, order: [] };
    String(text || "").replace(/\r/g, "").split(/[\n|]/).forEach(function (raw) {
      if (/^\s*#/.test(raw)) return;                                   // header / comment line
      var b = raw.replace(/ /g, "").replace(/,/g, ";");
      if (!b) return;
      var colon = b.indexOf(":"), eq = b.indexOf("=");
      if (colon >= 0 && (eq < 0 || colon < eq)) {
        var nm = b.slice(0, colon).toUpperCase();
        if (!TICKER.test(nm)) return;                                   // e.g. a header that lost its '#'
        if (!out.lines[nm]) { out.lines[nm] = b.slice(colon + 1); out.order.push(nm); }
      } else if (out.generic === null && /^(CW|PW|GF|CONF)\d*M?=/i.test(b)) out.generic = b;
    });
    return out;
  }
  function parseBody(body) {
    var o = { conf: "" };
    String(body || "").split(";").forEach(function (kv) {
      var p = kv.split("=");
      if (p.length !== 2) return;
      var k = p[0].toUpperCase();
      if (k === "CONF") o.conf = confName(p[1].toUpperCase());
      else { var v = parseFloat(p[1]); if (!isNaN(v)) o[k] = v; }
    });
    return o;
  }
  /* which line this chart uses: its own ticker, then its family (SPX for SPY, NDX for QQQ), then a line with no ticker */
  function pickLevels(sym) {
    var all = parseAll(LV.text), fam = FAMILY[sym];
    if (all.lines[sym]) return { name: sym, lv: parseBody(all.lines[sym]), conv: false };
    if (fam && all.lines[fam]) return { name: fam, lv: parseBody(all.lines[fam]), conv: true };
    if (all.generic) return { name: "(generic)", lv: parseBody(all.generic), conv: false };
    return null;
  }
  function ratio() { var r = els.ratio ? parseFloat(els.ratio.value) : NaN; return r > 0 ? r : null; }

  /* ---------- the signals, bar by bar ---------- */
  function run(B, nClosed, L, onDate) {
    var n = B.length, i, k;
    var atr = new Array(n).fill(null), trSum = 0;
    for (i = 0; i < n; i++) {
      var tr = i === 0 ? B[i].h - B[i].l : Math.max(B[i].h - B[i].l, Math.abs(B[i].h - B[i - 1].c), Math.abs(B[i].l - B[i - 1].c));
      if (i < 14) { trSum += tr; if (i === 13) atr[i] = trSum / 14; }
      else atr[i] = (atr[i - 1] * 13 + tr) / 14;
    }
    function sma(len, at) { if (at < len - 1) return null; var s = 0; for (var q = at - len + 1; q <= at; q++) s += B[q].v; return s / len; }
    var cw = L.CW, pw = L.PW, gf = L.GF, last = {}, sig = [], gfSide = 0;
    function cd(key, c, t) {
      var lt = last[key], ok = c && (lt == null || (t - 1) - lt >= OPT.cool);
      if (c) last[key] = t;
      return ok;
    }
    function crossUp(t, lvl) { return lvl != null && t > 0 && B[t].c > lvl && B[t - 1].c <= lvl; }
    function crossDn(t, lvl) { return lvl != null && t > 0 && B[t].c < lvl && B[t - 1].c >= lvl; }
    var VS = ["CW", "PW", "GF"];
    for (var t = 0; t < nClosed; t++) {
      var b = B[t], zone = atr[t] == null ? 0 : atr[t] * OPT.zoneMult;
      var active = b.date === onDate && b.min >= OPT.win[0] && b.min < OPT.win[1];
      var prevSide = gfSide;
      if (gf != null) gfSide = b.c > gf ? 1 : -1;
      var red = b.c < b.o, green = b.c > b.o, add = function (key, side, text, lvl) { sig.push({ t: t, key: key, side: side, text: text, lvl: lvl }); };
      if (cd("CWR", active && cw != null && b.h >= cw - zone && b.c < cw && red, t)) add("CWR", "S", "CW", cw);
      if (cd("PWH", active && pw != null && b.l <= pw + zone && b.c > pw && green, t)) add("PWH", "L", "PW", pw);
      if (cd("GFL", active && crossDn(t, gf), t)) add("GFL", "S", "GF↓", gf);
      if (cd("GFR", active && crossUp(t, gf), t)) add("GFR", "L", "GF↑", gf);
      if (cd("RTF", active && gf != null && prevSide === -1 && b.h >= gf - zone && b.c < gf && red, t)) add("RTF", "S", "RT↓", gf);
      if (cd("RTH", active && gf != null && prevSide === 1 && b.l <= gf + zone && b.c > gf && green, t)) add("RTH", "L", "RT↑", gf);
      if (cd("CWB", active && crossUp(t, cw), t)) add("CWB", "L", "CW⇧", cw);
      if (cd("PWB", active && crossDn(t, pw), t)) add("PWB", "S", "PW⇩", pw);
      /* volume-confirmed */
      var vAvg = sma(OPT.volLen, t), vAvgP = sma(OPT.volLen, t - 1), vShortP = sma(OPT.dryBars, t - 1);
      var volOk = vAvg != null && vAvg > 0;
      var dryUp = volOk && vAvgP != null && vShortP != null && vShortP < vAvgP * OPT.dryMult;
      var expand = volOk && t > 0 && b.v > vAvg * OPT.revMult && b.v > B[t - 1].v;
      var rng = b.h - b.l, solid = rng > 0 && Math.abs(b.c - b.o) / rng >= OPT.brkBody;
      var hh = -Infinity, ll = Infinity, hc = -Infinity, lc = Infinity;
      for (k = Math.max(0, t - OPT.touchBars + 1); k <= t; k++) { hh = Math.max(hh, B[k].h); ll = Math.min(ll, B[k].l); hc = Math.max(hc, B[k].c); lc = Math.min(lc, B[k].c); }
      var hit = { RU: "", RD: "", BU: "", BD: "" };
      VS.forEach(function (key) {
        var lvl = L[key];
        if (lvl == null || !volOk || t === 0) return;
        var bUp = b.c > lvl && B[t - 1].c <= lvl && green && solid && b.v >= vAvg * OPT.brkMult;
        var bDn = b.c < lvl && B[t - 1].c >= lvl && red && solid && b.v >= vAvg * OPT.brkMult;
        var rDn = hh >= lvl - zone && hc <= lvl + zone && b.c < lvl && red && dryUp && expand && !bDn;
        var rUp = ll <= lvl + zone && lc >= lvl - zone && b.c > lvl && green && dryUp && expand && !bUp;
        if (rUp && !hit.RU) hit.RU = key; if (rDn && !hit.RD) hit.RD = key; if (bUp && !hit.BU) hit.BU = key; if (bDn && !hit.BD) hit.BD = key;
      });
      var on = VOL && active;
      if (cd("VRU", on && !!hit.RU, t)) add("VRU", "L", "VR↑", L[hit.RU]);
      if (cd("VRD", on && !!hit.RD, t)) add("VRD", "S", "VR↓", L[hit.RD]);
      if (cd("VBU", on && !!hit.BU, t)) add("VBU", "L", "VB↑", L[hit.BU]);
      if (cd("VBD", on && !!hit.BD, t)) add("VBD", "S", "VB↓", L[hit.BD]);
    }
    return { sig: sig, atr: atr[nClosed - 1], side: gfSide };
  }

  /* ---------- chart ---------- */
  var chart = null, candles, shade, lines = [], RUNS = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "rgba(0,0,0,0)" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 10 },
      crosshair: { mode: 0 }
    });
    els.chart.style.background = "#1d1d1f"; els.chart.style.zIndex = "0";
    shade = document.createElement("canvas");
    shade.setAttribute("aria-hidden", "true");
    shade.style.cssText = "position:absolute;left:0;top:0;z-index:-1;pointer-events:none";
    els.chart.appendChild(shade);
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
    var pending = false;
    function soon() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; drawShade(); }); }
    chart.timeScale().subscribeVisibleLogicalRangeChange(soon);
    window.addEventListener("resize", soon);
  }
  /* the regime tint: green above the flip, red below, bar by bar on the levels' session */
  function drawShade() {
    if (!shade) return;
    var ts = chart.timeScale(), paneW = els.chart.clientWidth - chart.priceScale("right").width();
    var H = els.chart.clientHeight - ts.height(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    shade.style.width = paneW + "px"; shade.style.height = H + "px";
    shade.width = Math.max(1, paneW * dpr); shade.height = Math.max(1, H * dpr);
    var ctx = shade.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, paneW, H);
    var half = (ts.options().barSpacing || 6) / 2;
    RUNS.forEach(function (r) {
      var a = ts.logicalToCoordinate(r.i0), b = ts.logicalToCoordinate(r.i1);
      if (a == null || b == null) return;
      ctx.fillStyle = r.up ? "rgba(0,230,118,0.10)" : "rgba(255,82,82,0.12)";
      ctx.fillRect(a - half, 0, b - a + 2 * half, H);
    });
  }

  /* ---------- side panel ---------- */
  var SIGNAME = { CWR: "Call wall rejection", PWH: "Put wall hold", GFL: "Lost the flip", GFR: "Reclaimed the flip", RTF: "Flip retest failed", RTH: "Flip retest held",
                  CWB: "Broke above the call wall", PWB: "Broke below the put wall", VRU: "Volume reversal up", VRD: "Volume reversal down", VBU: "Volume break up", VBD: "Volume break down" };
  function renderSide(P, L, r, B, nClosed) {
    var last = B[nClosed - 1], cf = L.conf || "";
    var cfCol = { HIGH: "#30d158", GOOD: "#64d2ff", MED: "#ffd60a", LOW: "#ff6961" }[cf] || "#8e8e93";
    var reg = L.GF == null ? "No flip in the levels" : last.c > L.GF ? "Above the flip · positive gamma" : "Below the flip · negative gamma";
    var play = L.GF == null ? "" : last.c > L.GF ? "Dealers dampen moves here: fade the walls, the call wall as resistance and the put wall as support."
      : "Dealers add to moves here: expect trend and expansion; flip retests that fail and wall breaks carry more weight.";
    var rows = ORDER.filter(function (k) { return L[k] != null; }).map(function (k) {
      var y = L[k], d = y - last.c, m = L[k + "M"];
      return '<li><span style="color:' + COL[k] + '">' + NAMES[k] + "</span><span>" + money(y) + (P.conv ? ' <small>(' + money(L["_" + k]) + ")</small>" : "") +
        '<small class="gex-dist">' + (d >= 0 ? "+" : "") + d.toFixed(2) + " · " + (d / last.c * 100).toFixed(2) + "%" + (m != null ? " · $" + Math.abs(m).toLocaleString() + "M" : "") + "</small></span></li>";
    }).join("");
    var sd = r.sig.filter(function (s) { return B[s.t].date === LV.date; }).slice(-8).reverse();
    els.side.innerHTML =
      '<p class="k">GEX · ' + esc(P.name) + " · levels for " + day(LV.date) + (P.conv ? " · ratio " + ratio() : "") + "</p>" +
      '<p class="v" style="color:' + (L.GF == null ? "inherit" : last.c > L.GF ? "#30d158" : "#ff6961") + '">' + reg + "</p>" +
      (play ? '<p class="play">' + play + "</p>" : "") +
      (cf ? '<p class="k">Confidence <b style="color:' + cfCol + '">' + esc(cf) + "</b>" + (cf === "LOW" ? " · thin positioning, treat the levels lightly" : "") + "</p>" : "") +
      '<ul class="gex-rows">' + rows + "</ul>" +
      '<p class="k">Signals ' + (LV.date === LV.today ? "today" : "on " + day(LV.date)) + " · zone " + money(r.atr * OPT.zoneMult) + "</p>" +
      (sd.length ? '<ul class="trades">' + sd.map(function (s) {
        return "<li><span>" + clock(B[s.t].min) + " · " + SIGNAME[s.key] + '</span><span class="' + (s.side === "L" ? "pos" : "neg") + '">' + s.text + "</span></li>";
      }).join("") + "</ul>" : '<p class="quiet">None yet.</p>');
  }

  /* ---------- data ---------- */
  function setGate(msg) {
    root.classList.add("gated"); els.gate.hidden = false;
    els.status.textContent = SYMBOL + " · " + LiveKit.tfLabel(MULT) + " · not loaded";
    els.gate.innerHTML = msg.replace(/<\/b>\s*([\s\S]+)$/, "</b><span>$1</span>");
  }
  function api(qs, body) {
    var tok = token();
    var url = "/api/gex-levels.php?" + qs + (tok ? "&preview=" + encodeURIComponent(tok) : "");
    var o = body ? { method: "POST", cache: "no-store", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Preview-Token": tok }, body: body + (tok ? "&preview=" + encodeURIComponent(tok) : "") } : { cache: "no-store" };
    return fetch(url, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); });
  }
  function fillDates() {
    if (!els.date) return;
    var list = LV.dates.slice();
    if (LV.today && list.indexOf(LV.today) < 0) list.unshift(LV.today);
    els.date.innerHTML = list.map(function (d) { return '<option value="' + d + '"' + (d === LV.date ? " selected" : "") + ">" + day(d) + (d === LV.today ? " (today)" : "") + (LV.dates.indexOf(d) < 0 ? " · none saved" : "") + "</option>"; }).join("");
    if (els.save) els.save.textContent = "Save for " + day(LV.date);
  }
  function loadLevels(date) {
    return api("v=1" + (date ? "&date=" + date : "")).then(function (res) {
      if (!res.ok) return res;
      LV = { date: res.body.date, today: res.body.today, text: res.body.text || "", dates: res.body.dates || [] };
      if (els.text) els.text.value = LV.text;
      els.saved.textContent = res.body.updated ? "Saved " + new Date(res.body.updated * 1000).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " ET" : "Nothing saved for this day yet.";
      fillDates();
      KIT.setList(parseAll(LV.text).order.filter(function (s) { return !/^(SPX|NDX|RUT|VIX)$/.test(s); }));
      return res;
    });
  }
  function loadBars() {
    var tok = token(), replay = LV.date && LV.today && LV.date !== LV.today;
    var url = "/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&mult=" + MULT + "&rth=1" + (replay ? "&date=" + LV.date : "") + (tok ? "&preview=" + encodeURIComponent(tok) : "");
    return fetch(url, { cache: "no-store" }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); });
  }
  function load() {
    return loadBars().then(function (res) {
      if (!res.ok) {
        var e = res.body && res.body.error;
        if (e === "private") setGate("<b>Live chart in private preview.</b> Open this page once with your preview link to unlock it in this browser.");
        else if (e === "not_configured") setGate("<b>Live chart not configured yet.</b> Add <code>api/config.php</code> on the server.");
        else if (e === "symbol_not_allowed") setGate("<b>" + SYMBOL + " isn't on the allowed list.</b> Add it to <code>symbols</code> in <code>api/config.php</code>, or use <code>'*'</code> to allow any ticker.");
        else if (e === "bad_symbol") setGate("<b>That doesn't look like a ticker.</b>");
        else setGate("<b>Live data unavailable right now.</b> Try again in a minute.");
        return false;
      }
      render(res.body); return true;
    }).catch(function () { setGate("<b>Live data unavailable right now.</b> Try again in a minute."); return false; });
  }

  function render(data) {
    var B = [];
    data.bars.forEach(function (a) {
      var t = etParts(a[0]);
      if (t.min >= RTH_OPEN && t.min < RTH_CLOSE) B.push({ date: t.date, min: t.min, time: t.wall, ms: a[0], o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] || 0 });
    });
    if (B.length < 20) { setGate("<b>Not enough data yet for " + SYMBOL + ".</b>"); return; }
    var asOf = (data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900);
    var forming = !data.date && B[B.length - 1].ms / 1000 + MULT * 60 > asOf;
    var nClosed = forming ? B.length - 1 : B.length;

    var P = pickLevels(SYMBOL), L = {};
    if (!P) {
      setGate("<b>No GEX levels for " + SYMBOL + " on " + day(LV.date) + ".</b> Paste the morning levels below (one line per ticker, like <code>" + SYMBOL + ":CW=…;PW=…;GF=…</code>) and save, or pick a ticker that has a line.");
      return;
    }
    var r0 = P.conv ? ratio() : 1;
    if (P.conv && !r0) {
      setGate("<b>" + SYMBOL + " is using the " + P.name + " line.</b> Its strikes are in " + P.name + " points. Enter the " + P.name + "→" + SYMBOL + " ratio below the chart (" + SYMBOL + "'s price ÷ " + P.name + "'s, e.g. about 0.1 for SPY from SPX), or add a " + SYMBOL + ": line of its own.");
      return;
    }
    ORDER.forEach(function (k) { if (P.lv[k] != null) { L[k] = P.lv[k] * r0; L["_" + k] = P.lv[k]; } if (P.lv[k + "M"] != null) L[k + "M"] = P.lv[k + "M"]; });
    L.conf = P.lv.conf;
    var r = run(B, nClosed, L, LV.date);

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(B.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    lines.forEach(function (pl) { candles.removePriceLine(pl); }); lines = [];
    var faded = L.conf === "LOW", narrow = els.chart.clientWidth < 560;
    ORDER.forEach(function (k) {
      if (L[k] == null) return;
      var m = L[k + "M"], col = COL[k] + (faded ? "88" : "");
      lines.push(candles.createPriceLine({ price: L[k], color: col, lineWidth: k === "CW" || k === "PW" || k === "GF" ? 2 : 1, lineStyle: STYLE[k], axisLabelVisible: true,
        title: narrow ? k : NAMES[k] + " " + (P.conv ? L["_" + k] : L[k]) + (L.conf ? " · " + L.conf : "") + (m != null ? " · $" + Math.abs(m).toLocaleString() + "M" : "") }));
    });
    var MK = { CWR: ["aboveBar", "arrowDown", "#ff5252"], PWH: ["belowBar", "arrowUp", "#00e676"], GFL: ["aboveBar", "circle", "#ff9800"], GFR: ["belowBar", "circle", "#00bcd4"],
               RTF: ["aboveBar", "arrowDown", "#ffd600"], RTH: ["belowBar", "arrowUp", "#ffd600"], CWB: ["belowBar", "square", "#e040fb"], PWB: ["aboveBar", "square", "#e040fb"],
               VRU: ["belowBar", "arrowUp", "#00e676"], VRD: ["aboveBar", "arrowDown", "#ff5252"], VBU: ["belowBar", "square", "#2962ff"], VBD: ["aboveBar", "square", "#ff9800"] };
    candles.setMarkers(r.sig.map(function (s) { var m = MK[s.key]; return { time: B[s.t].time, position: m[0], shape: m[1], color: m[2], text: s.text }; }));
    RUNS = [];
    if (L.GF != null) B.forEach(function (b, i) {
      if (b.date !== LV.date) return;
      var up = b.c > L.GF, last = RUNS[RUNS.length - 1];
      if (last && last.up === up && last.i1 === i - 1) last.i1 = i; else RUNS.push({ up: up, i0: i, i1: i });
    });
    requestAnimationFrame(drawShade);
    if (!render.fitted) {
      var i0 = 0; for (var q = 0; q < B.length; q++) if (B[q].date === LV.date) { i0 = q; break; }
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, i0 - 30), to: B.length - 1 + 10 });
      render.fitted = true;
    }
    renderSide(P, L, r, B, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · regular session · GEX levels for " + day(LV.date) + " (" + P.name + ")" + (P.conv ? " × " + r0 : "") +
      (data.date ? " · Replay of " + data.date : (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET") + (data.stale ? " (last good copy)" : "");
  }

  /* ---------- the paste box ---------- */
  function saveError(res) {
    var e = res.body && res.body.error;
    if (e === "private") return token() ? "Not saved: the server didn't accept this browser's preview code." : "Not saved: this browser doesn't have your preview code yet.";
    if (e === "not_writable" || e === "not_saved") return "Not saved: the server can't write to api/cache/gex. In Site Tools → File Manager, set api/cache (and api/cache/gex) to permission 755.";
    if (e === "bad_text") return "Not saved: no level lines found (lines like SPY:CW=785;PW=775;GF=773.36).";
    if (e === "too_long") return "Not saved: the paste is too long.";
    if (e === "bad_date") return "Not saved: that date isn't valid.";
    if (e === "not_configured") return "Not saved: api/config.php is missing on the server.";
    return "Not saved: the server answered HTTP " + res.status + (e ? " (" + e + ")." : " before the page's code ran, most likely the host's firewall.");
  }
  if (els.date) els.date.addEventListener("change", function () { render.fitted = false; loadLevels(els.date.value).then(load); });
  if (els.apply) els.apply.addEventListener("click", function () { LV.text = cleanPaste(els.text.value); KIT.setList(parseAll(LV.text).order.filter(function (s) { return !/^(SPX|NDX|RUT|VIX)$/.test(s); })); render.fitted = false; load(); });
  function doSave() {
    var text = cleanPaste(els.text.value);
    if (!parseAll(text).order.length && !parseAll(text).generic) { els.saved.textContent = "Nothing to save: paste lines like SPY:CW=785;PW=775;GF=773.36"; return; }
    els.save.disabled = true; els.saved.textContent = "Saving…";
    var b64 = btoa(text);                                              // the cleaned text is plain ASCII
    var d = LV.date || LV.today;                                       // none yet when the page loaded without a code: the server uses today
    api("v=1", "b64=" + encodeURIComponent(b64) + (d ? "&date=" + encodeURIComponent(d) : "")).then(function (res) {
      els.save.disabled = false;
      if (!res.ok) {
        els.saved.textContent = saveError(res);
        if (res.body && res.body.error === "private") unlock();
        return;
      }
      unlock(true);
      return loadLevels(res.body.date).then(function () {
        els.saved.textContent += " · " + parseAll(LV.text).order.length + " tickers";
        render.fitted = false; load();
      });
    }).catch(function () { els.save.disabled = false; els.saved.textContent = "Couldn't reach the server. Check your connection and try again."; });
  }
  /* a row to enter the preview code right here (kept only in this browser), then save again */
  var UNLOCK = null;
  function unlock(hide) {
    if (hide) { if (UNLOCK) UNLOCK.hidden = true; return; }
    if (!UNLOCK) {
      UNLOCK = document.createElement("form");
      UNLOCK.className = "gex-actions gex-unlock";
      UNLOCK.innerHTML = '<label>Preview code <input type="password" class="gex-code" autocomplete="off" spellcheck="false" ' +
        'style="width:200px;background:var(--raised);color:var(--silk);border:0;border-radius:9999px;padding:6px 14px;font:inherit;font-size:13px"></label>' +
        '<button type="submit" class="pill pill-buy">Unlock and save</button><span>Stored in this browser only, like opening the page with your preview link.</span>';
      els.save.parentNode.parentNode.appendChild(UNLOCK);
      UNLOCK.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = UNLOCK.querySelector(".gex-code").value.trim();
        if (!v) return;
        try { localStorage.setItem("vp_preview", v); } catch (x) {}
        if (new URLSearchParams(location.search).get("preview")) {           // a code in the address bar would win: drop it
          try { history.replaceState(null, "", location.pathname + location.hash); } catch (x) {}
        }
        UNLOCK.querySelector(".gex-code").value = "";
        doSave();
      });
    }
    UNLOCK.hidden = false;
    var had = token();
    UNLOCK.querySelector("span").textContent = had ? "The code this browser has didn't match the server's. Enter the current one." : "Stored in this browser only, like opening the page with your preview link.";
    UNLOCK.querySelector(".gex-code").focus();
  }
  if (els.save) els.save.addEventListener("click", doSave);
  if (els.ratio) els.ratio.addEventListener("change", function () { try { localStorage.setItem("gex_ratio", els.ratio.value); } catch (e) {} load(); });
  if (els.vol) els.vol.addEventListener("change", function () { VOL = els.vol.checked; try { localStorage.setItem("gex_vol", VOL ? "1" : "0"); } catch (e) {} load(); });

  window.GEXLive = { _run: run, _parse: parseAll, _body: parseBody, _clean: cleanPaste };
  loadLevels().then(function (res) {
    if (res && !res.ok) {
      var e = res.body && res.body.error;
      setGate(e === "private" ? "<b>Live chart in private preview.</b> Open this page once with your preview link to unlock it in this browser." : "<b>Levels unavailable right now.</b> Try again in a minute.");
      return;
    }
    return load();
  }).then(function () { setInterval(function () { if (!document.hidden && LV.date === LV.today) load(); }, POLL_MS); });
})();
