/* ============================================================
   AUTO UNIVERSE — CORE / LICENSE  (Nivo 0)
   Gumroad License Key API. Verify jednom → sačuvaj → offline.
   TEST-UNLOCK = razvojni ključ (uvek prolazi, bez mreže).
   Čista logika (tier gate, state) testabilna u Node-u; mrežni
   poziv se izoluje u verifyRemote().

   ⚠️ PAKET B — Google Play distribucija:
   U Play verziji app-e NE sme postojati link ka Gumroad-u (krsi Play politiku).
   Play Billing implementacija dolazi kao alternativa (activate/isUnlocked
   ostaju isti interfejs — implementacija ispod se granata na Platform.isNative()).
   ============================================================ */
(function (global) {
  "use strict";

  var STORAGE_KEY = "license_state"; // ide kroz Store.settings

  /* ---------- Tier gate (čista funkcija) ----------
     Vraća da li je modul dostupan za dati status licence.
     tier: "basic" | "key" | "platform"
     licensed: bool (da li je unet važeći kod)
     platformAvailable: bool (platforma još ne postoji → false)  */

  function isModuleUnlocked(tier, licensed, platformAvailable) {
    if (tier === "basic") return true;
    if (tier === "key") return !!licensed;
    if (tier === "platform") return !!platformAvailable;
    return false;
  }

  /* ---------- Stanje licence ---------- */

  function getState(store) {
    return store.settings.get(STORAGE_KEY, { licensed: false, key: null, verified_at: null });
  }

  function setState(store, state) {
    return store.settings.set(STORAGE_KEY, state);
  }

  function isLicensed(store) {
    return !!getState(store).licensed;
  }

  /* ---------- Verifikacija ---------- */

  // Razvojni ključ — offline, bez mreže
  function isTestKey(key) {
    return String(key || "").trim().toUpperCase() === "TEST-UNLOCK";
  }

  // Mrežni poziv ka Gumroad-u. product_id se konfiguriše po aplikaciji.
  // Vraća Promise<{success, uses}>. Izolovano da test može da ga mock-uje.
  function verifyRemote(productId, key) {
    var body = new URLSearchParams();
    body.set("product_id", productId);
    body.set("license_key", String(key).trim());
    body.set("increment_uses_count", "false");
    return fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }).then(function (r) { return r.json(); });
  }

  // Glavna: proba TEST-UNLOCK, pa Gumroad. Snima stanje ako uspe.
  function activate(store, productId, key) {
    key = String(key || "").trim();
    if (!key) return Promise.resolve({ ok: false, reason: "empty" });

    if (isTestKey(key)) {
      var st = { licensed: true, key: "TEST-UNLOCK", verified_at: new Date().toISOString(), test: true };
      setState(store, st);
      return Promise.resolve({ ok: true, test: true });
    }

    if (!productId) {
      return Promise.resolve({ ok: false, reason: "no_product_configured" });
    }

    return verifyRemote(productId, key).then(function (res) {
      if (res && res.success) {
        setState(store, {
          licensed: true, key: key, verified_at: new Date().toISOString(), test: false
        });
        return { ok: true };
      }
      return { ok: false, reason: "invalid" };
    }).catch(function () {
      // offline ili greška mreže: ne obara postojeću licencu, samo javlja
      return { ok: false, reason: "offline" };
    });
  }

  function deactivate(store) {
    setState(store, { licensed: false, key: null, verified_at: null });
  }

  var License = {
    isModuleUnlocked: isModuleUnlocked,
    isTestKey: isTestKey,
    getState: getState,
    isLicensed: isLicensed,
    activate: activate,
    deactivate: deactivate,
    verifyRemote: verifyRemote,
    STORAGE_KEY: STORAGE_KEY
  };

  if (typeof module !== "undefined" && module.exports) module.exports = License;
  global.License = License;
})(typeof window !== "undefined" ? window : globalThis);
