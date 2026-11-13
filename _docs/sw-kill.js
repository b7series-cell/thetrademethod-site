/* =====================================================================
   sw-kill.js — EMERGENCY OFF SWITCH for the service worker.

   Use only if the app/offline layer ever serves broken or stuck pages.
   Upload THIS file's contents to the server as /sw.js (replacing the
   real one), then flush the SiteGround cache. Every visitor's browser
   picks it up on its next page load: it deletes all saved copies,
   unregisters itself and reloads open tabs from the network.

   Pages keep calling navigator.serviceWorker.register("/sw.js"), which
   is fine: this file just removes itself again each time. To turn the
   app back on, upload the real sw.js with a new CACHE_VERSION.

   (This copy lives in _docs/, which is never uploaded, so it does
   nothing until you copy it over sw.js.)
   ===================================================================== */

self.addEventListener("install", function () { self.skipWaiting(); });

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (clients) { clients.forEach(function (c) { c.navigate(c.url); }); })
  );
});
