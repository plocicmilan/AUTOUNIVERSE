/* ============================================================
   AUTO UNIVERSE — CORE / STORE.NATIVE  (Nivo 0)
   Capacitor Preferences + JSON fajl po kolekciji (SQLite kasnije ako treba).
   STUB u Paketu A — puna implementacija stize u Paketu B (Capacitor setup).

   Kada se aktivira: Store fasada bira NativeImpl kada Platform.isNative() === true.
   Do tada: ovaj fajl NIKAD nece biti pozvan sa GitHub Pages hostinga.
   ============================================================ */
(function (global) {
  "use strict";

  function notReady() {
    return Promise.reject(new Error(
      "StoreNative nije jos implementiran (Paket B — Capacitor integracija)"
    ));
  }

  global.StoreNative = {
    init:    function () { return notReady(); },
    put:     function () { return notReady(); },
    get:     function () { return notReady(); },
    all:     function () { return notReady(); },
    remove:  function () { return notReady(); },
    byIndex: function () { return notReady(); }
  };
})(typeof window !== "undefined" ? window : globalThis);
