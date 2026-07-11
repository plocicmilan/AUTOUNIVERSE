/* ============================================================
   AUTO UNIVERSE — CORE / PHOTOS  (Nivo 0)
   Kompresija slika pre čuvanja. Telefonske slike su 3–8 MB;
   za karton i PDF dovoljno je ~1280px, JPEG q0.7 (~150–300 KB).
   ============================================================ */
(function (global) {
  "use strict";

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
          else if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
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

  var Photos = { compress: compress, compressMany: compressMany };
  if (typeof module !== "undefined" && module.exports) module.exports = Photos;
  global.Photos = Photos;
})(typeof window !== "undefined" ? window : globalThis);
