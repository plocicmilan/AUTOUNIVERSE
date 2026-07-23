/* AUTODELOVI — service worker (cache-first, offline shell)
   Strategija: shell offline, API uvek sa mreže.            */
"use strict";

var CACHE = "autodelovi-v1.0.0";

var PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;

  var url = e.request.url;

  // API pozivi uvek sa mreže
  if (url.indexOf("/parts") !== -1 || url.indexOf("/messages") !== -1 ||
      url.indexOf("/photos") !== -1 || url.indexOf("/api/") !== -1) {
    e.respondWith(fetch(e.request).catch(function () {
      return new Response(JSON.stringify({ error: "offline" }), {
        headers: { "Content-Type": "application/json" }
      });
    }));
    return;
  }

  // Upload slike — nikad keširaj
  if (url.indexOf("/uploads/") !== -1) return;

  // Shell — cache-first
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.ok && e.request.url.indexOf(self.location.origin) === 0) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});
