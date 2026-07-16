/* ============================================================
   AUTO UNIVERSE — CORE / STORE  (Nivo 0 — FASADA)
   Isti javni API kao ranije. Iznutra: bira Web ili Native impl
   preko Platform.isNative(). Aplikacije NE menjaju pozive.

   Ucitavanje u index.html mora biti ovim redosledom:
     platform.js  -> store.web.js  -> store.native.js  -> store.js
   ============================================================ */
(function (global) {
  "use strict";

  var STORES = ["vehicles", "events", "contacts", "documents", "reminders", "appointments"];
  var SETTINGS_PREFIX = "au_";

  var _app  = "garage";
  var _impl = null;

  function chooseImpl() {
    var isNative = global.Platform && global.Platform.isNative && global.Platform.isNative();
    var impl = isNative ? global.StoreNative : global.StoreWeb;
    if (!impl) throw new Error("Store impl nije ucitan (StoreWeb/StoreNative)");
    return impl;
  }

  /* ---------- Init ---------- */

  function init(appName) {
    _app  = appName || "garage";
    _impl = chooseImpl();
    return _impl.init(_app, STORES);
  }

  /* ---------- Delegated CRUD ---------- */

  function put(s, o)             { return _impl.put(s, o); }
  function get(s, id)            { return _impl.get(s, id); }
  function all(s)                { return _impl.all(s); }
  function remove(s, id)         { return _impl.remove(s, id); }
  function byIndex(s, idx, val)  { return _impl.byIndex(s, idx, val); }

  /* ---------- Settings (localStorage, per-app prefix) ----------
     Napomena: localStorage postoji i u browseru i u Capacitor WebView-u.
     Ako se u Paketu B pokaze da Android eviction i localStorage brise,
     zamenice se Capacitor Preferences plugin-om, transparentno ovde. */

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

  /* ---------- Pure functions (nezavisne od impl-a) ---------- */

  function serializeBackup(appName, data, settingsObj) {
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
    if (b.format !== "auto_universe_backup") throw new Error("Fajl nije Auto Universe backup.");
    if (!b.data) throw new Error("Backup nema podatke.");
    STORES.forEach(function (s) { b.data[s] = b.data[s] || []; });
    return b;
  }

  /* ---------- Orkestrirane operacije (koriste delegated CRUD) ---------- */

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
        return put(s, row);
      }));
    })).then(function () {
      if (b.settings) settings.restoreRaw(b.settings);
      return { imported: total, exported_at: b.exported_at };
    });
  }

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

  if (typeof module !== "undefined" && module.exports) module.exports = Store;
  global.Store = Store;
})(typeof window !== "undefined" ? window : globalThis);
