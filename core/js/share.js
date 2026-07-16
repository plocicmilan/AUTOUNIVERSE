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

  /* ---------- Native (stub — Paket B) ---------- */

  function shareNative(_p) {
    return Promise.reject(new Error(
      "Native Share nije jos implementiran (Paket B — @capacitor/share)"
    ));
  }

  var Share = { share: share };
  if (typeof module !== "undefined" && module.exports) module.exports = Share;
  global.Share = Share;
})(typeof window !== "undefined" ? window : globalThis);
