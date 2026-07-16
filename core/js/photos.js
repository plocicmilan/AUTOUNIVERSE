/* ============================================================
   AUTO UNIVERSE — CORE / PHOTOS  (Nivo 0)

   Dve grupe funkcija:

   1) compress / compressMany
      Cista canvas kompresija — radi isto na webu i u Capacitor WebView-u.
      Vraca dataURL (image/jpeg, q=0.7, max 1280px).

   2) save / load / remove  (nova API — Paket B)
      Apstrakcija skladistenja slika.
      - WEB: transparentno — dataURL je i "path". Save vraca dataURL kao path,
        load vraca dataURL, remove je no-op. Postojeci kod nastavlja da radi.
      - NATIVE: pravi fajlovi na Capacitor Filesystem-u u
        Data/AutoUniverse/{app}/photos/{scope}/{uuid}.jpg
        Save vraca "photo://{app}/{scope}/{uuid}.jpg" — path se cuva u bazi umesto dataURL-a.

   Aplikacije novo pisane pisu:
     Photos.compress(file).then(function(url){ return Photos.save({vehicleId:v}, url); })
       .then(function(path){ vehicle.photo = path; });
   Za prikaz:
     Photos.load(vehicle.photo).then(function(dataURL){ img.src = dataURL; });

   Stari kod koji direktno stavlja dataURL u zapis nastavlja da radi na webu.
   Migracija u Paketu C.
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- Compression (isto na svim platformama) ---------- */

  function compress(file, maxDim, quality) {
    maxDim = maxDim || 1280;
    quality = quality || 0.7;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height;
          if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
          else if (h > maxDim)     { w = Math.round(w * maxDim / h); h = maxDim; }
          var canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function compressMany(fileList, maxDim, quality) {
    var files = Array.prototype.slice.call(fileList || []);
    return Promise.all(files.map(function (f) { return compress(f, maxDim, quality); }));
  }

  /* ---------- Save / Load / Remove (path apstrakcija) ---------- */

  var PATH_PREFIX = "photo://";
  var _app = "garage";

  function setApp(appName) { _app = appName || "garage"; }

  function isPath(s)    { return typeof s === "string" && s.indexOf(PATH_PREFIX) === 0; }
  function isDataURL(s) { return typeof s === "string" && s.indexOf("data:") === 0; }
  function uuid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function isNative() {
    return global.Platform && global.Platform.isNative && global.Platform.isNative();
  }

  function save(scope, dataURL) {
    scope = scope || {};
    if (!isNative()) {
      // Web: dataURL je path (transparentno)
      return Promise.resolve(dataURL);
    }
    return saveNative(scope, dataURL);
  }

  function load(pathOrDataURL) {
    if (!pathOrDataURL) return Promise.resolve(null);
    if (isDataURL(pathOrDataURL)) return Promise.resolve(pathOrDataURL); // vec je data
    if (isPath(pathOrDataURL) && isNative()) return loadNative(pathOrDataURL);
    // Path bez native runtime-a → nemamo sta da radimo
    return Promise.resolve(null);
  }

  function remove(pathOrDataURL) {
    if (!pathOrDataURL) return Promise.resolve();
    if (isDataURL(pathOrDataURL)) return Promise.resolve(); // web dataURL — nista
    if (isPath(pathOrDataURL) && isNative()) return removeNative(pathOrDataURL);
    return Promise.resolve();
  }

  /* ---------- Native impl (Capacitor Filesystem) ---------- */

  function fsPlugin() {
    var C = global.Capacitor && global.Capacitor.Plugins;
    if (!C || !C.Filesystem) throw new Error("Capacitor Filesystem plugin nije dostupan");
    return C.Filesystem;
  }

  function scopePath(scope) {
    // Podpath po vehicleId (ili "misc" ako nedostaje)
    var vid = scope && scope.vehicleId ? String(scope.vehicleId) : "misc";
    return "AutoUniverse/" + _app + "/photos/" + vid;
  }

  function toBase64(dataURL) {
    var comma = dataURL.indexOf(",");
    return comma !== -1 ? dataURL.slice(comma + 1) : dataURL;
  }

  function saveNative(scope, dataURL) {
    var fs = fsPlugin();
    var dir = scopePath(scope);
    var name = uuid() + ".jpg";
    var full = dir + "/" + name;
    return fs.mkdir({ path: dir, directory: "DATA", recursive: true })
      .catch(function (e) {
        if (String(e && e.message).indexOf("exists") !== -1) return;
        throw e;
      })
      .then(function () {
        return fs.writeFile({
          path: full,
          data: toBase64(dataURL),
          directory: "DATA"
        });
      })
      .then(function () { return PATH_PREFIX + full; });
  }

  function loadNative(path) {
    var fs = fsPlugin();
    var relative = path.slice(PATH_PREFIX.length);
    return fs.readFile({ path: relative, directory: "DATA" })
      .then(function (r) { return "data:image/jpeg;base64," + r.data; });
  }

  function removeNative(path) {
    var fs = fsPlugin();
    var relative = path.slice(PATH_PREFIX.length);
    return fs.deleteFile({ path: relative, directory: "DATA" }).catch(function () {});
  }

  var Photos = {
    compress: compress,
    compressMany: compressMany,
    setApp: setApp,
    save: save,
    load: load,
    remove: remove,
    // helpers (za testove i migraciju)
    isPath: isPath,
    isDataURL: isDataURL
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Photos;
  global.Photos = Photos;
})(typeof window !== "undefined" ? window : globalThis);
