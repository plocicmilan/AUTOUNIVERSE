/* ============================================================
   AUTO UNIVERSE — CORE / PLATFORM  (Nivo 0)
   Detekcija okruženja: web (browser/PWA) vs native (Capacitor Android/iOS).
   JEDINA tacka u kodu koja sme da zna gde radi.
   Aplikacije NE smeju direktno da zovu window.Capacitor —
   uvek preko Platform.isNative() / Platform.platform().
   ============================================================ */
(function (global) {
  "use strict";

  function isCapacitor() {
    return typeof global.Capacitor !== "undefined"
      && typeof global.Capacitor.isNativePlatform === "function"
      && global.Capacitor.isNativePlatform();
  }

  function isNative() {
    return isCapacitor();
  }

  function isWeb() {
    return !isNative();
  }

  function platform() {
    if (isCapacitor()) {
      return global.Capacitor.getPlatform(); // "android" | "ios" | "web"
    }
    return "web";
  }

  var Platform = {
    isCapacitor: isCapacitor,
    isNative: isNative,
    isWeb: isWeb,
    platform: platform
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Platform;
  global.Platform = Platform;
})(typeof window !== "undefined" ? window : globalThis);
