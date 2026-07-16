/* ============================================================
   AUTO UNIVERSE — CORE / SHARE  (Nivo 0)
   Apstrakcija deljenja fajlova (PDF, slike).
   Web: navigator.share (kad postoji) + fallback na <a download>.
   Native (Capacitor): @capacitor/share plugin — implementacija u Paketu B.
   Isti javni API u oba slucaja.
   ============================================================ */
(function (global) {
  "use strict";

  /**
   * Deli fajl (PDF/slika) prema korisniku.
   * @param {Object} payload
   *   - file:     File objekat (obavezno za web nativni share)
   *   - blob:     Blob (alternativno za download fallback)
   *   - fileName: string
   *   - title:    string (opciono)
   *   - text:     string (opciono)
   * @returns {Promise<{shared: boolean, method: string}>}
   */
  function share(payload) {
    payload = payload || {};

    if (global.Platform && global.Platform.isNative && global.Platform.isNative()) {
      return shareNative(payload);
    }
    return shareWeb(payload);
  }

  /* ---------- Web ---------- */

  function shareWeb(p) {
    return new Promise(function (resolve) {
      var file = p.file;
      if (!file && p.blob && p.fileName) {
        file = new File([p.blob], p.fileName, { type: p.blob.type });
      }

      // Nativni Web Share sa fajlom (Android Chrome, iOS Safari 15+)
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: p.title || p.fileName,
          text:  p.text  || ""
        })
          .then(function () { resolve({ shared: true, method: "web-share" }); })
          .catch(function () { resolve(downloadFallback(p)); });
        return;
      }

      resolve(downloadFallback(p));
    });
  }

  function downloadFallback(p) {
    var blob = p.blob || (p.file ? p.file : null);
    if (!blob) return { shared: false, method: "none" };
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = p.fileName || "download";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return { shared: true, method: "download" };
  }

  /* ---------- Native (Capacitor Share + Filesystem) ---------- */

  function shareNative(p) {
    var C = global.Capacitor && global.Capacitor.Plugins;
    if (!C || !C.Share) return shareWeb(p); // fallback ako plugin nije dostupan

    // Za nativni share fajla treba fizicki fajl na disku.
    // Ako imamo blob, prvo ga upisujemo u Cache direktorijum pa share.
    var blob = p.blob || (p.file ? p.file : null);
    var fileName = p.fileName || ("share-" + Date.now() + ".bin");

    if (blob && C.Filesystem) {
      return blobToBase64(blob).then(function (base64) {
        return C.Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: "CACHE"
        });
      }).then(function (writeRes) {
        return C.Share.share({
          title: p.title || fileName,
          text:  p.text  || "",
          url:   writeRes.uri,
          dialogTitle: p.title || fileName
        });
      }).then(function () {
        return { shared: true, method: "native-share" };
      });
    }

    // Bez fajla — samo tekst / URL
    return C.Share.share({
      title: p.title || "",
      text:  p.text  || "",
      url:   p.url   || "",
      dialogTitle: p.title || "Share"
    }).then(function () {
      return { shared: true, method: "native-share-text" };
    });
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var s = String(reader.result || "");
        // reader.result je "data:mime;base64,XXX" — Filesystem trazi samo XXX
        var comma = s.indexOf(",");
        resolve(comma !== -1 ? s.slice(comma + 1) : s);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  var Share = { share: share };
  if (typeof module !== "undefined" && module.exports) module.exports = Share;
  global.Share = Share;
})(typeof window !== "undefined" ? window : globalThis);
