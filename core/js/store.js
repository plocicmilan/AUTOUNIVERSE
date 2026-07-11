/* ============================================================
   AUTO UNIVERSE — CORE / STORE  (Nivo 0)
   - IndexedDB: vehicles, events, contacts, documents, reminders
   - localStorage: settings (mali podaci, sinhron pristup)
   - Backup/Export: SVI podaci u jedan JSON fajl (kritično za iOS)
   Čiste funkcije (serialize/parse/filter) rade i u Node testovima.
   ============================================================ */
(function (global) {
  "use strict";

  var DB_NAME = "auto_universe";
  var DB_VERSION = 1;
  var STORES = ["vehicles", "events", "contacts", "documents", "reminders"];
  var SETTINGS_PREFIX = "au_";

  var _db = null;
  var _app = "garage";

  /* ---------- Init ---------- */

  function init(appName) {
    _app = appName || "garage";
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        STORES.forEach(function (name) {
          if (!db.objectStoreNames.contains(name)) {
            var os = db.createObjectStore(name, { keyPath: "id" });
            if (name === "events") {
              os.createIndex("vehicle_id", "vehicle_id", { unique: false });
              os.createIndex("contact_id", "contact_id", { unique: false });
            }
            if (name === "reminders") {
              os.createIndex("vehicle_id", "vehicle_id", { unique: false });
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

  /* ---------- CRUD ---------- */

  function put(storeName, obj) {
    obj.updated_at = new Date().toISOString();
    return reqToPromise(tx(storeName, "readwrite").put(obj)).then(function () { return obj; });
  }

  function get(storeName, id) {
    return reqToPromise(tx(storeName).get(id));
  }

  function all(storeName) {
    return reqToPromise(tx(storeName).getAll());
  }

  function remove(storeName, id) {
    return reqToPromise(tx(storeName, "readwrite").delete(id));
  }

  function byIndex(storeName, indexName, value) {
    return reqToPromise(tx(storeName).index(indexName).getAll(value));
  }

  /* ---------- Settings (localStorage, per-app prefix) ---------- */

  var settings = {
    key: function (k) { return SETTINGS_PREFIX + _app + "_" + k; },
    get: function (k, def) {
      try {
        var raw = localStorage.getItem(settings.key(k));
        return raw === null ? def : JSON.parse(raw);
      } catch (e) { return def; }
    },
    set: function (k, v) {
      localStorage.setItem(settings.key(k), JSON.stringify(v));
      return v;
    },
    allRaw: function () {
      var out = {};
      var prefix = SETTINGS_PREFIX + _app + "_";
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.indexOf(prefix) === 0) {
          out[key.slice(prefix.length)] = JSON.parse(localStorage.getItem(key));
        }
      }
      return out;
    },
    restoreRaw: function (obj) {
      Object.keys(obj || {}).forEach(function (k) { settings.set(k, obj[k]); });
    }
  };

  /* ---------- Backup / Export — ČISTE funkcije + IO ---------- */

  function serializeBackup(appName, data, settingsObj) {
    // data: { vehicles: [], events: [], ... }
    return JSON.stringify({
      format: "auto_universe_backup",
      format_version: 1,
      app: appName,
      exported_at: new Date().toISOString(),
      settings: settingsObj || {},
      data: data
    });
  }

  function parseBackup(jsonString) {
    var b = JSON.parse(jsonString);
    if (b.format !== "auto_universe_backup") {
      throw new Error("Fajl nije Auto Universe backup.");
    }
    if (!b.data) throw new Error("Backup nema podatke.");
    STORES.forEach(function (s) { b.data[s] = b.data[s] || []; });
    return b;
  }

  function exportAll() {
    var out = {};
    return Promise.all(STORES.map(function (s) {
      return all(s).then(function (rows) { out[s] = rows; });
    })).then(function () {
      return serializeBackup(_app, out, settings.allRaw());
    });
  }

  function importAll(jsonString) {
    var b = parseBackup(jsonString);
    var total = 0;
    return Promise.all(STORES.map(function (s) {
      return Promise.all(b.data[s].map(function (row) {
        total++;
        return reqToPromise(tx(s, "readwrite").put(row));
      }));
    })).then(function () {
      if (b.settings) settings.restoreRaw(b.settings);
      return { imported: total, exported_at: b.exported_at };
    });
  }

  /* ---------- Pretraga vozila — čista funkcija (testabilna) ---------- */

  function filterVehicles(vehicles, query, contactsById) {
    var q = (query || "").trim().toLowerCase();
    if (!q) return vehicles.slice();
    return vehicles.filter(function (v) {
      var owner = contactsById && v.owner_contact_id && contactsById[v.owner_contact_id];
      var hay = [
        v.plate, v.make, v.model, v.vin,
        owner ? owner.name : "", owner ? owner.phone : ""
      ].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  /* ---------- Export ---------- */

  var Store = {
    STORES: STORES,
    init: init,
    put: put,
    get: get,
    all: all,
    remove: remove,
    byIndex: byIndex,
    settings: settings,
    exportAll: exportAll,
    importAll: importAll,
    serializeBackup: serializeBackup,
    parseBackup: parseBackup,
    filterVehicles: filterVehicles
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Store;   // Node — samo čiste funkcije
  }
  global.Store = Store;       // Browser
})(typeof window !== "undefined" ? window : globalThis);
