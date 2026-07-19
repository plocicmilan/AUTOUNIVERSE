/* ============================================================
   AUTO UNIVERSE — CORE / STORE.WEB  (Nivo 0)
   IndexedDB implementacija store-a. Radi u browseru (PWA) i u
   Capacitor WebView-u (fallback ako native impl nije zeljen).
   Aplikacije NE zovu ovaj modul direktno — koriste Store fasadu.
   ============================================================ */
(function (global) {
  "use strict";

  var DB_VERSION = 2;
  var _db = null;

  function init(appName, storeNames) {
    var DB_NAME = "au_" + (appName || "garage");
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        storeNames.forEach(function (name) {
          if (!db.objectStoreNames.contains(name)) {
            var os = db.createObjectStore(name, { keyPath: "id" });
            if (name === "events") {
              os.createIndex("vehicle_id", "vehicle_id", { unique: false });
              os.createIndex("contact_id", "contact_id", { unique: false });
            }
            if (name === "reminders") {
              os.createIndex("vehicle_id", "vehicle_id", { unique: false });
            }
            if (name === "appointments") {
              os.createIndex("scheduled_at", "scheduled_at", { unique: false });
              os.createIndex("status", "status", { unique: false });
            }
          }
        });
      };
      req.onsuccess = function (e) { _db = e.target.result; resolve(_db); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  }

  function tx(storeName, mode) {
    return _db.transaction(storeName, mode || "readonly").objectStore(storeName);
  }

  function reqToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function put(storeName, obj) {
    obj.updated_at = new Date().toISOString();
    return reqToPromise(tx(storeName, "readwrite").put(obj)).then(function () { return obj; });
  }

  function get(storeName, id)     { return reqToPromise(tx(storeName).get(id)); }
  function all(storeName)         { return reqToPromise(tx(storeName).getAll()); }
  function remove(storeName, id)  { return reqToPromise(tx(storeName, "readwrite").delete(id)); }
  function byIndex(storeName, indexName, value) {
    return reqToPromise(tx(storeName).index(indexName).getAll(value));
  }

  global.StoreWeb = {
    init: init, put: put, get: get, all: all, remove: remove, byIndex: byIndex
  };
})(typeof window !== "undefined" ? window : globalThis);
