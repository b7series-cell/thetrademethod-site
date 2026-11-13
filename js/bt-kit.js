/* =====================================================================
   bt-kit.js — shared backtest options: the bar timeframe (2 / 5 / 15
   minutes, built as separate runs on the server) and the exit options
   (target and time limit), which every trade carries pre-computed in its
   "v" list, so switching them is instant.

     var kit = BTKit.setup(root, { key: "fl", tfs: [2, 5, 15], onChange: fn(what) })
     kit.tf            current timeframe (null when the page has none)
     kit.setExits(d)   fill the exit menus from the loaded results
     kit.view(t, d)    the trade as it plays out under the chosen exit
     kit.isPage()      both exit menus on the page's own rule
   ===================================================================== */

(function () {
  "use strict";

  var CODE = { t: "target", s: "stop", m: "time", r: "replaced", o: "open", p: "pmh", e: "ema", b: "be", "2": "t2" };
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function addDays(d, n) { var p = d.split("-"), t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return t.toISOString().slice(0, 10); }

  function setup(root, opts) {
    var key = opts.key, tfs = opts.tfs || null;
    var bar = root.querySelector(".bt-bar"), before = root.querySelector(".bt-built");
    var api = { tf: null, ex: +(store(key + "_bt_ex") || 0), tm: +(store(key + "_bt_tm") || 0) };

    if (tfs) {
      api.tf = +(store(key + "_bt_tf") || tfs[0]);
      if (tfs.indexOf(api.tf) < 0) api.tf = tfs[0];
      var seg = document.createElement("div");
      seg.className = "bt-seg bt-tf"; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Bar timeframe");
      seg.innerHTML = tfs.map(function (m) { return '<button type="button" data-tf="' + m + '" aria-pressed="' + (m === api.tf) + '">' + m + "-min</button>"; }).join("");
      bar.insertBefore(seg, before);
      seg.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-tf]"); if (!b) return;
        api.tf = +b.getAttribute("data-tf"); store(key + "_bt_tf", String(api.tf));
        Array.prototype.forEach.call(seg.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        opts.onChange("tf");
      });
    }

    var box = document.createElement("div");
    box.className = "bt-exitsel"; box.hidden = true;
    box.innerHTML = '<label><span>Exit</span><select class="bt-ex"></select></label><label><span>Time limit</span><select class="bt-tm"></select></label>';
    bar.insertBefore(box, before);
    var selEx = box.querySelector(".bt-ex"), selTm = box.querySelector(".bt-tm");
    selEx.addEventListener("change", function () { api.ex = +selEx.value; store(key + "_bt_ex", String(api.ex)); opts.onChange("exit"); });
    selTm.addEventListener("change", function () { api.tm = +selTm.value; store(key + "_bt_tm", String(api.tm)); opts.onChange("exit"); });

    var EX = null;
    api.setExits = function (data) {
      EX = data && data.exits && data.trades && (!data.trades.length || data.trades[0].v) ? data.exits : null;
      box.hidden = !EX;
      if (!EX) return;
      if (api.ex >= EX.targets.length) api.ex = 0;
      if (api.tm >= EX.times.length) api.tm = 0;
      function opt(o, i, cur) { return '<option value="' + i + '"' + (i === cur ? " selected" : "") + ">" + (o[0] === "p" ? "Page rule · " : "") + o[1] + "</option>"; }
      selEx.innerHTML = EX.targets.map(function (o, i) { return opt(o, i, api.ex); }).join("");
      selTm.innerHTML = EX.times.map(function (o, i) { return opt(o, i, api.tm); }).join("");
    };
    api.isPage = function () { return !EX || (api.ex === 0 && api.tm === 0); };
    api.target = function () { return EX ? EX.targets[api.ex] : null; };
    api.time = function () { return EX ? EX.times[api.tm] : null; };
    /* the trade under the chosen exit: r, why, x, xm (minute), xd (date) replaced from its v entry */
    api.view = function (t) {
      if (!EX || !t.v || api.isPage()) return t;
      var q = t.v[api.ex * EX.times.length + api.tm];
      if (!q) return t;
      var o = {}; for (var k in t) o[k] = t[k];
      o.r = q[0]; o.why = CODE[q[1]] || q[1]; o.x = q[3]; o.trim = null; o.variant = true;
      if (typeof q[2] === "string") { o.xd = q[2]; }                       // daily: the exit date
      else { o.xm = q[2] % 1440; o.xd = addDays(t.d, Math.floor(q[2] / 1440)); o.on = q[2] >= 1440 ? 1 : 0; }
      return o;
    };
    return api;
  }

  window.BTKit = { setup: setup };
})();
