/* =====================================================================
   contact.js — sends the contact form (/contact.html) to
   /api/contact.php without leaving the page, checks the fields first,
   and shows the result. Without JavaScript the form still posts
   normally and the server sends the visitor back to the page.
   ===================================================================== */
(function () {
  "use strict";
  var form = document.getElementById("contact-form");
  if (!form) return;

  var $ = function (id) { return document.getElementById(id); };
  var status = $("cf-status"), send = $("cf-send"), msg = $("cf-message"), count = $("cf-count");
  var MAX = 5000;

  /* when the page opened (the server drops forms sent faster than a person can type)
     and which page sent the visitor here */
  $("cf-t").value = String(Date.now());
  try {
    var ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === location.origin && ref.pathname !== location.pathname) $("cf-page").value = ref.pathname;
  } catch (e) {}

  /* ?topic=correction&page=/setups/x.html pre-fills the form, for "report a problem" links */
  var qs = new URLSearchParams(location.search);
  var topic = qs.get("topic");
  if (topic && form.topic.querySelector('option[value="' + topic.replace(/[^a-z]/g, "") + '"]')) form.topic.value = topic;
  var qpage = qs.get("page");
  if (qpage && /^\/[\w\-\/.]*$/.test(qpage)) $("cf-page").value = qpage;

  /* sent without JavaScript: the server redirects back with ?sent=1 or ?error=… */
  if (qs.get("sent") === "1") done();
  else if (qs.get("error")) show(errText(qs.get("error")), "bad");

  function show(text, kind) {
    status.textContent = text;
    status.className = "cf-status" + (kind ? " " + kind : "");
    status.hidden = false;
  }
  function done() {
    form.classList.add("sent");
    show("Thanks, your message is on its way. If you asked a question, the reply will come to the email you gave.", "ok");
  }
  function errText(code) {
    return ({
      missing: "Please fill in your name, email and message.",
      email: "That email address doesn't look right.",
      too_long: "That message is too long. Please keep it under 5,000 characters.",
      rate: "You've sent a few messages in a row. Please wait a little while and try again.",
      not_configured: "The form isn't switched on yet. Please try again later.",
      not_sent: "Something went wrong sending that. Please try again in a minute."
    })[code] || "Something went wrong sending that. Please try again in a minute.";
  }

  function updateCount() {
    var n = msg.value.length;
    count.textContent = n > MAX - 500 ? (MAX - n) + " left" : "";
  }
  msg.addEventListener("input", updateCount);

  function fieldError(el, text) {
    var box = el.closest(".cf-field");
    var old = box.querySelector(".cf-err");
    if (old) old.remove();
    el.removeAttribute("aria-invalid");
    el.removeAttribute("aria-describedby");
    if (!text) return;
    var p = document.createElement("small");
    p.className = "cf-err";
    p.id = el.id + "-err";
    p.textContent = text;
    box.appendChild(p);
    el.setAttribute("aria-invalid", "true");
    el.setAttribute("aria-describedby", p.id);
  }
  function check() {
    var first = null;
    var rules = [
      [form.name, form.name.value.trim() ? "" : "Please add your name."],
      [form.email, !form.email.value.trim() ? "Please add your email." :
        (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim()) ? "" : "That email address doesn't look right.")],
      [form.message, form.message.value.trim().length < 2 ? "Please write a message." : ""]
    ];
    rules.forEach(function (r) { fieldError(r[0], r[1]); if (r[1] && !first) first = r[0]; });
    if (first) first.focus();
    return !first;
  }
  [form.name, form.email, form.message].forEach(function (el) {
    el.addEventListener("input", function () { if (el.getAttribute("aria-invalid")) fieldError(el, ""); });
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!check()) return;
    send.disabled = true;
    send.textContent = "Sending…";
    status.hidden = true;
    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { "Accept": "application/json" },
      credentials: "same-origin"
    }).then(function (r) {
      return r.json().catch(function () { return { error: "not_sent" }; });
    }).then(function (j) {
      if (j && j.sent) { done(); try { if (window.gtag) gtag("event", "contact_sent", { topic: form.topic.value }); } catch (e) {} }
      else show(errText(j && j.error), "bad");
    }).catch(function () {
      show("Couldn't reach the server. Check your connection and try again.", "bad");
    }).then(function () {
      send.disabled = false;
      send.textContent = "Send message";
    });
  });
})();
