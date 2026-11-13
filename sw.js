/* =====================================================================
   sw.js — makes thetrademethod.com installable and lets pages you've
   already opened load with no connection.

   Bump CACHE_VERSION on any upload that changes a file WITHOUT a ?v=
   bump (offline.html, images, this file's rules). Bumping it throws away
   every saved copy on visitors' devices the next time they load a page.

     pages (HTML)              network first, saved copy when offline
     ?v= CSS / JS / images     cache first (a new ?v= is a new file)
     unversioned static files  saved copy now, refreshed in background
     /api/  and other sites    never touched, always the network

   Emergency off switch: _docs/sw-kill.js (see the note at its top).
   ===================================================================== */

const CACHE_VERSION = "2026-10-29-1";
const CACHE = "ttm-" + CACHE_VERSION;
const OFFLINE_URL = "/offline.html";
const MAX_ENTRIES = 250;
const STATIC_EXT = /\.(?:css|js|png|jpe?g|gif|webp|svg|ico|woff2?)$/i;

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll([OFFLINE_URL, "/assets/icon-192.png"]).then(function () {
        return cache.add("/").catch(function () {});   // nice to have, not required
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf("ttm-") === 0 && k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // fonts, analytics, CDNs
  if (url.pathname.indexOf("/api/") === 0) return;            // live data: never cache
  if (url.pathname.indexOf("/_docs/") === 0) return;
  if (url.pathname === "/sw.js") return;

  if (req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1) {
    event.respondWith(networkFirst(req));
  } else if (STATIC_EXT.test(url.pathname)) {
    event.respondWith(url.searchParams.has("v") ? cacheFirst(req) : staleWhileRevalidate(event, req));
  }
});

function save(req, res) {
  if (!res || !res.ok || res.type !== "basic") return Promise.resolve();
  var copy = res.clone();
  return caches.open(CACHE).then(function (cache) {
    return cache.put(req, copy).then(function () { return trim(cache); });
  });
}

function trim(cache) {
  return cache.keys().then(function (keys) {
    var extra = keys.length - MAX_ENTRIES;
    if (extra <= 0) return;
    // oldest first; never drop the offline page
    var drop = keys.filter(function (k) { return new URL(k.url).pathname !== OFFLINE_URL; }).slice(0, extra);
    return Promise.all(drop.map(function (k) { return cache.delete(k); }));
  });
}

function networkFirst(req) {
  return fetch(req).then(function (res) {
    save(req, res);
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || caches.match(OFFLINE_URL);
    });
  });
}

function cacheFirst(req) {
  return caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) { save(req, res); return res; });
  });
}

function staleWhileRevalidate(event, req) {
  return caches.match(req).then(function (hit) {
    var fresh = fetch(req).then(function (res) { return save(req, res).then(function () { return res; }); });
    if (hit) {
      event.waitUntil(fresh.catch(function () {}));
      return hit;
    }
    return fresh;
  });
}
