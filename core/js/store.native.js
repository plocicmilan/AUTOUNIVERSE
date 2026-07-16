/* ============================================================
   AUTO UNIVERSE — CORE / STORE.NATIVE  (Nivo 0)
   Capacitor implementacija store-a.
   - Data (kolekcije): JSON fajlovi po store-u u Data direktorijumu
     Data/AutoUniverse/{app}/data/{store}.json  (array objekata)
   - Model: last-write-wins po zapisu (updated_at).
   - byIndex je linear scan (za nas volumen — do ~10k zapisa — sasvim brzo).

   Ovaj modul se koristi SAMO kada je Platform.isNative() === true.
   Na webu (PWA) uvek se bira StoreWeb (IndexedDB).
   ============================================================ */
(function (global) {
  "use strict";

  var APP_NAME = null;
  var STORE_NAMES = [];
  var _cache = {};        // ime -> array (in-memory cache posle init/write)

  function plugins() {
    var C = global.Capacitor && global.Capacitor.Plugins;
    if (!C || !C.Filesystem) {
      throw new Error("Capacitor Filesystem plugin nije dostupan");
    }
    return { fs: C.Filesystem };
  }

  // Filesystem direktoriji — koristimo Data (privatan, backup-in-cloud ako je Google Drive uključen)
  function DIR() { return "DATA"; } // Directory.Data

  function pathFor(store) {
    return "AutoUniverse/" + APP_NAME + "/data/" + store + ".json";
  }

  function ensureDir() {
    var fs = plugins().fs;
    var dir = "AutoUniverse/" + APP_NAME + "/data";
    return fs.mkdir({ path: dir, directory: DIR(), recursive: true })
      .catch(function (e) {
        // "Directory already exists" nije greska
        if (String(e && e.message).indexOf("exists") !== -1) return;
        throw e;
      });
  }

  function readStore(store) {
    if (_cache[store]) return Promise.resolve(_cache[store]);
    var fs = plugins().fs;
    return fs.readFile({ path: pathFor(store), directory: DIR(), encoding: "utf8" })
      .then(function (r) {
        var arr;
        try { arr = JSON.parse(r.data || "[]"); } catch (e) { arr = []; }
        if (!Array.isArray(arr)) arr = [];
        _cache[store] = arr;
        return arr;
      })
      .catch(function (e) {
        // Fajl ne postoji — inicijalizuj prazan
        if (String(e && e.message).toLowerCase().indexOf("does not exist") !== -1 ||
            String(e && e.message).toLowerCase().indexOf("no such file") !== -1) {
          _cache[store] = [];
          return [];
        }
        throw e;
      });
  }

  function writeStore(store, arr) {
    var fs = plugins().fs;
    _cache[store] = arr;
    return fs.writeFile({
      path: pathFor(store),
      directory: DIR(),
      encoding: "utf8",
      data: JSON.stringify(arr)
    });
  }

  /* ---------- API (isti kao StoreWeb) ---------- */

  function init(appName, storeNames) {
    APP_NAME    = appName;
    STORE_NAMES = storeNames || [];
    _cache      = {};
    return ensureDir().then(function () {
      // Zagrej cache tako sto ucitaj sve store-ove (paralelno)
      return Promise.all(STORE_NAMES.map(readStore));
    }).then(function () { return true; });
  }

  function put(store, obj) {
    obj.updated_at = new Date().toISOString();
    return readStore(store).then(function (arr) {
      var idx = arr.findIndex(function (r) { return r.id === obj.id; });
      if (idx === -1) arr.push(obj);
      else arr[idx] = obj;
      return writeStore(store, arr).then(function () { return obj; });
    });
  }

  function get(store, id) {
    return readStore(store).then(function (arr) {
      return arr.find(function (r) { return r.id === id; }) || undefined;
    });
  }

  function all(store) {
    return readStore(store).then(function (arr) { return arr.slice(); });
  }

  function remove(store, id) {
    return readStore(store).then(function (arr) {
      var next = arr.filter(function (r) { return r.id !== id; });
      return writeStore(store, next);
    });
  }

  function byIndex(store, indexName, value) {
    return readStore(store).then(function (arr) {
      return arr.filter(function (r) { return r[indexName] === value; });
    });
  }

  global.StoreNative = {
    init:    init,
    put:     put,
    get:     get,
    all:     all,
    remove:  remove,
    byIndex: byIndex
  };
})(typeof window !== "undefined" ? window : globalThis);
