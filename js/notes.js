/* =====================================================================
   notes.js — your own notes on the site, saved through /api/notes.php.

     setup and fundamentals pages (.sheet)
       · a verdict badge under the title: Untested, Promising, Proven,
         Didn't hold up
       · a "My take" box near the end: your words on the idea, edited
         and saved right on the page
     homepage
       · the same badge on each card, plus a one-line scorecard

   Private: notes need the preview code, kept in this browser like the
   live charts ("vp_preview"). Text is shown as plain text, never HTML.
   ===================================================================== */

(function () {
  "use strict";

  var API = "/api/notes.php";
  var V = {
    untested:  { label: "Untested",       hint: "Not judged yet" },
    promising: { label: "Promising",      hint: "Looks good, not proven" },
    proven:    { label: "Proven",         hint: "Live or paper trades back it up" },
    failed:    { label: "Didn't hold up", hint: "Tested, and the edge wasn't there" }
  };
  var ORDER = ["untested", "promising", "proven", "failed"];
  var PROMPT = "What's the edge, in your own words?\nWhere would you doubt it?\nDid your own trades back it up?";

  function token() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }
  function slugOf(href) {
    var p = String(href || "").split("#")[0].split("?")[0], f = p.substring(p.lastIndexOf("/") + 1).replace(/\.html$/, "");
    return /^[a-z0-9-]{1,80}$/.test(f) ? f : "";
  }
  function api(body) {
    var tok = token();
    var o = body ? { method: "POST", cache: "no-store", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Preview-Token": tok }, body: body + (tok ? "&preview=" + encodeURIComponent(tok) : "") }
                 : { cache: "no-store" };
    return fetch(API + "?v=1" + (tok ? "&preview=" + encodeURIComponent(tok) : ""), o)
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function badge(v) { var b = el("span", "vbadge v-" + v, V[v].label); b.title = V[v].hint; return b; }
  function when(ts) {
    return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function b64(text) { return btoa(unescape(encodeURIComponent(text))); }

  /* =================== setup / fundamentals pages =================== */
  function pagePart() {
    var top = document.querySelector(".sheet .top");
    if (!top) return;
    var slug = slugOf(location.pathname);
    if (!slug) return;
    var NOTE = null;

    /* the badge under the title */
    var host = top.querySelector("h1") ? top.querySelector("h1").parentNode : top;
    var bWrap = el("div", "vbadge-wrap");
    host.appendChild(bWrap);

    /* the box */
    var box = el("section", "take");
    box.setAttribute("aria-label", "My take");
    var anchor = document.querySelector(".sheet .rule") || document.querySelector(".sheet .src");
    if (anchor) anchor.parentNode.insertBefore(box, anchor); else document.querySelector(".sheet").appendChild(box);

    function head(right) {
      var h = el("div", "take-head");
      var t = el("div");
      t.appendChild(el("p", "take-kicker", "Your notes · private"));
      t.appendChild(el("h2", null, "My take"));
      h.appendChild(t);
      if (right) h.appendChild(right);
      return h;
    }
    function showBadge() {
      bWrap.innerHTML = "";
      if (NOTE) bWrap.appendChild(badge(NOTE.verdict));
    }
    function view() {
      box.innerHTML = "";
      var v = NOTE ? NOTE.verdict : "untested";
      box.appendChild(head(badge(v)));
      var body = el("div", "take-body");
      if (NOTE && NOTE.text) {
        NOTE.text.split(/\n{2,}/).forEach(function (para) { body.appendChild(el("p", null, para)); });
      } else {
        body.appendChild(el("p", "take-empty", "No take yet. Write a few lines in your own words: what the edge is, where you'd doubt it, and whether your own trades backed it up."));
      }
      box.appendChild(body);
      var act = el("div", "take-actions");
      var edit = el("button", "pill pill-buy", NOTE && NOTE.text ? "Edit my take" : "Write my take");
      edit.type = "button";
      edit.addEventListener("click", editor);
      act.appendChild(edit);
      if (NOTE && NOTE.updated) act.appendChild(el("span", null, "Last updated " + when(NOTE.updated)));
      box.appendChild(act);
      showBadge();
    }
    function editor() {
      box.innerHTML = "";
      box.appendChild(head(null));
      var pick = NOTE ? NOTE.verdict : "untested";
      var vs = el("div", "take-verdicts");
      vs.setAttribute("role", "group");
      vs.setAttribute("aria-label", "Verdict");
      ORDER.forEach(function (k) {
        var b = el("button", "vpick v-" + k, V[k].label);
        b.type = "button"; b.title = V[k].hint;
        b.setAttribute("aria-pressed", String(k === pick));
        b.addEventListener("click", function () {
          pick = k;
          vs.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        });
        vs.appendChild(b);
      });
      box.appendChild(vs);
      var ta = el("textarea");
      ta.value = NOTE ? NOTE.text : "";
      ta.placeholder = PROMPT;
      ta.setAttribute("aria-label", "My take");
      ta.maxLength = 20000;
      box.appendChild(ta);
      var act = el("div", "take-actions");
      var save = el("button", "pill pill-buy", "Save");
      var cancel = el("button", "pill", "Cancel");
      var msg = el("span", "take-msg");
      msg.setAttribute("aria-live", "polite");
      save.type = cancel.type = "button";
      cancel.addEventListener("click", view);
      save.addEventListener("click", function () {
        save.disabled = true; msg.textContent = "Saving…";
        api("slug=" + encodeURIComponent(slug) + "&verdict=" + pick + "&b64=" + encodeURIComponent(b64(ta.value))).then(function (res) {
          save.disabled = false;
          if (res.ok && res.body.note) { NOTE = res.body.note; view(); return; }
          var e = res.body && res.body.error;
          msg.textContent = e === "private" ? "Not saved: this browser doesn't have your preview code." :
            e === "not_writable" || e === "not_saved" ? "Not saved: the server can't write to api/cache/notes. Set api/cache to permission 755." :
            e === "too_long" ? "Not saved: that's over 20,000 characters." :
            "Not saved (HTTP " + res.status + (e ? ", " + e : "") + ").";
          if (e === "private") locked(function () { save.click(); });
        }).catch(function () { save.disabled = false; msg.textContent = "Couldn't reach the server. Try again."; });
      });
      act.appendChild(save); act.appendChild(cancel); act.appendChild(msg);
      box.appendChild(act);
      ta.focus();
    }
    /* no code in this browser (or a wrong one): ask for it here */
    function locked(after) {
      box.innerHTML = "";
      box.appendChild(head(null));
      box.appendChild(el("p", "take-empty", token() ? "The preview code in this browser didn't match. Enter the current one to see and edit your notes." : "Your notes are private. Enter your preview code to see and edit them in this browser."));
      var f = el("form", "take-actions");
      var inp = el("input"); inp.type = "password"; inp.autocomplete = "off"; inp.setAttribute("aria-label", "Preview code");
      var go = el("button", "pill pill-buy", "Unlock"); go.type = "submit";
      f.appendChild(inp); f.appendChild(go);
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = inp.value.trim(); if (!v) return;
        try { localStorage.setItem("vp_preview", v); } catch (x) {}
        load().then(function (ok) { if (ok && after) after(); });
      });
      box.appendChild(f);
    }
    function load() {
      return api(null).then(function (res) {
        if (!res.ok) { locked(null); return false; }
        NOTE = (res.body.notes || {})[slug] || null;
        view(); return true;
      }).catch(function () { box.innerHTML = ""; box.appendChild(head(null)); box.appendChild(el("p", "take-empty", "Notes unavailable right now.")); return false; });
    }
    load();
  }

  /* =================== homepage =================== */
  function homePart() {
    var cards = document.querySelectorAll("a.gcard, a.fcard");
    if (!cards.length) return;
    api(null).then(function (res) {
      if (!res.ok) return;
      var notes = res.body.notes || {}, count = { untested: 0, promising: 0, proven: 0, failed: 0 };
      cards.forEach(function (c) {
        var n = notes[slugOf(c.getAttribute("href"))], v = n ? n.verdict : "untested";
        count[v]++;
        if (v === "untested") return;
        var b = badge(v), first = c.querySelector(".top") || c.querySelector("h3");
        c.insertBefore(b, first);
      });
      var gal = document.getElementById("gallery");
      if (gal && !document.querySelector(".scoreline")) {
        var p = el("p", "scoreline");
        p.appendChild(el("span", "scoreline-k", "Your scorecard"));
        ["proven", "promising", "failed", "untested"].forEach(function (k) {
          var s = badge(k); s.textContent = count[k] + " " + V[k].label.toLowerCase(); p.appendChild(s);
        });
        gal.parentNode.insertBefore(p, gal);
      }
    }).catch(function () {});
  }

  function boot() { pagePart(); homePart(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
