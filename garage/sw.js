/* GARAGE TOOLBOX — service worker (GATE A: airplane mode mora raditi)
   Strategija: cache-first. Sve bundled, nikad CDN.                    */
"use strict";

var CACHE = "garage-toolbox-v1.6.0"; // podigni verziju pri svakom deploy-u

var PRECACHE = [
  "index.html",
  "css/app.css",
  "js/app.js",
  "config/garage_v1.json",
  "manifest.json",
  "../core/css/core.css",
  "../core/js/models.js",
  "../core/js/store.js",
  "../core/js/photos.js",
  "../core/js/pdf.js",
  "../core/js/license.js",
  "../core/js/reminders.js",
  "../core/vendor/jspdf.umd.min.js",
  "../core/vendor/font-dejavu.js",
  "js/workorder.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "../core/i18n/en.json",
  "../core/i18n/sr.json"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
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
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        // keširaj sveže odgovore istog porekla (npr. buduće fajlove)
        if (res && res.ok && e.request.url.indexOf(self.location.origin) === 0) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});
