/* ============================================================
   AUTO UNIVERSE — CORE / MODELS  (Nivo 0)
   Model podataka po Mapi sveta v1.0 (Deo II).
   Radi u localStorage/IndexedDB danas, spreman za PostgreSQL sutra.
   Bez framework-a. Radi u browseru (window.Models) i u Node (tests).
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- ID + timestamp ---------- */

  function newId(prefix) {
    // veh_, evt_, con_, doc_, rem_ + vreme + random — bez servera, bez kolizija u praksi
    var t = Date.now().toString(36);
    var r = Math.random().toString(36).slice(2, 8);
    return prefix + "_" + t + r;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function stamp(obj) {
    obj.created_at = obj.created_at || nowISO();
    obj.updated_at = nowISO();
    return obj;
  }

  /* ---------- Šifarnici ---------- */

  // Kategorije vozila — po propisima RS (Mapa sveta, Deo II)
  var VEHICLE_CATEGORIES = {
    M1: "Putničko vozilo",
    M2: "Autobus do 5t",
    M3: "Autobus preko 5t",
    N1: "Teretno do 3,5t",
    N2: "Teretno 3,5–12t",
    N3: "Teretno preko 12t",
    L:  "Moped / motocikl / tricikl / kvad",
    O:  "Prikolica / poluprikolica",
    T:  "Traktor",
    R:  "Priključno vozilo za traktor",
    RM: "Radna mašina",
    SP: "Specijalno vozilo"
  };

  // Tipovi događaja — srce Event Engine-a
  var EVENT_TYPES = [
    "service", "repair", "work_order", "fuel", "expense",
    "inspection", "tires", "document", "reminder_done", "note"
  ];

  // Poreklo zapisa — seme Trust Layer-a (košta nula sada)
  // "initial" = uneto pri onboardingu / naknadno, bez dokaza (nizak nivo poverenja)
  var EVENT_SOURCES = ["mechanic", "owner", "receipt", "imported", "initial"];

  // Preciznost datuma/km za retroaktivne (naknadno unete) događaje
  var DATE_PRECISION = ["exact", "month", "approx"];
  var KM_PRECISION = ["exact", "approx"];

  var ITEM_KINDS = ["part", "labor", "other"];

  var CURRENCIES = ["RSD", "EUR"]; // otvoreno za BAM, USD...

  var CONTACT_ROLES = ["client", "supplier", "service"];

  /* ---------- Fabrike (svaki objekat: id, created_at, updated_at) ---------- */

  function createVehicle(data) {
    data = data || {};
    return stamp({
      id: data.id || newId("veh"),
      category: data.category || "M1",
      type_label: data.type_label || VEHICLE_CATEGORIES[data.category || "M1"] || "",
      make: data.make || "",
      model: data.model || "",
      year: data.year || null,
      vin: data.vin || "",
      plate: data.plate || "",
      engine: Object.assign({
        code: "", displacement_ccm: null, power_kw: null,
        fuel: "", gearbox: ""
      }, data.engine || {}),
      service_data: Object.assign({          // TEHNIČKA KARTICA — piše se JEDNOM
        oil_type: "", oil_qty_l: null,
        oil_filter: "", air_filter: "", fuel_filter: "", cabin_filter: "",
        brake_notes: "", battery: "",
        custom_fields: []                    // traktor/bager imaju svoje stavke
      }, data.service_data || {}),
      tires: Object.assign({
        size_front: "", size_rear: "", current_set: ""
      }, data.tires || {}),
      owner_contact_id: data.owner_contact_id || null,
      photos: data.photos || [],
      notes: data.notes || ""
    });
  }

  function createEvent(data) {
    data = data || {};
    if (data.type && EVENT_TYPES.indexOf(data.type) === -1) {
      throw new Error("Nepoznat tip događaja: " + data.type);
    }
    return stamp({
      id: data.id || newId("evt"),
      vehicle_id: data.vehicle_id || null,
      type: data.type || "note",
      date: data.date || nowISO().slice(0, 10),
      mileage_km: data.mileage_km != null ? data.mileage_km : null,
      title: data.title || "",
      description: data.description || "",
      items: (data.items || []).map(createItem),
      photos: data.photos || [],
      contact_id: data.contact_id || null,
      source: data.source || "mechanic",   // TRUST polje
      app: data.app || "garage",           // ko je kreirao zapis
      // ----- retroaktivni unos (Driver onboarding "Početno stanje" + "iskopaj fioku") -----
      retroactive: data.retroactive === true,               // zapis unet posle događaja
      date_precision: DATE_PRECISION.indexOf(data.date_precision) !== -1
        ? data.date_precision : "exact",                    // exact | month | approx
      km_precision: KM_PRECISION.indexOf(data.km_precision) !== -1
        ? data.km_precision : "exact",                      // exact | approx
      documents: data.documents || []
    });
  }

  function createItem(data) {
    data = data || {};
    return {
      kind: ITEM_KINDS.indexOf(data.kind) !== -1 ? data.kind : "other",
      name: data.name || "",
      qty: data.qty != null ? data.qty : 1,
      unit: data.unit || "kom",
      price: data.price != null ? Number(data.price) : 0,
      currency: CURRENCIES.indexOf(data.currency) !== -1 ? data.currency : "RSD"
    };
  }

  function createContact(data) {
    data = data || {};
    return stamp({
      id: data.id || newId("con"),
      name: data.name || "",
      phone: data.phone || "",
      email: data.email || "",
      roles: data.roles && data.roles.length ? data.roles : ["client"],
      vehicle_ids: data.vehicle_ids || [],
      notes: data.notes || ""
    });
  }

  function createDocument(data) {
    data = data || {};
    return stamp({
      id: data.id || newId("doc"),
      doc_type: data.doc_type || "work_order",  // invoice | work_order | estimate | ...
      number: data.number || "",                // GT-0001
      date: data.date || nowISO().slice(0, 10),
      vehicle_id: data.vehicle_id || null,
      event_id: data.event_id || null,
      file: data.file || null                   // blob ref / dataURL
    });
  }

  function createReminder(data) {
    data = data || {};
    return stamp({
      id: data.id || newId("rem"),
      title: data.title || "",
      vehicle_id: data.vehicle_id || null,
      due_date: data.due_date || null,        // okidač po datumu
      due_mileage_km: data.due_mileage_km || null, // I/ILI po kilometraži — šta pre
      done: false,
      notes: data.notes || ""
    });
  }

  /* ---------- Broj dokumenta: GT-0001 ---------- */

  function nextDocNumber(prefix, lastNumber) {
    // lastNumber: "GT-0007" ili null → "GT-0008" / "GT-0001"
    var n = 0;
    if (lastNumber) {
      var m = String(lastNumber).match(/(\d+)\s*$/);
      if (m) n = parseInt(m[1], 10);
    }
    var next = String(n + 1);
    while (next.length < 4) next = "0" + next;
    return prefix + "-" + next;
  }

  /* ---------- VALUTE — ZBIR PO VALUTI, BEZ KONVERZIJE ----------
     Odluka (10.07.2026): ukupno se prikazuje po valuti u kojoj su
     stavke unete. Nema kursa, nema preračunavanja.
     - sve stavke RSD          → "12.300 RSD"
     - stavke RSD + EUR        → "12.300 RSD + 30 EUR"
  --------------------------------------------------------------- */

  function sumByCurrency(items) {
    var totals = {};
    (items || []).forEach(function (it) {
      var cur = it.currency || "RSD";
      var line = (Number(it.price) || 0) * (it.qty != null ? Number(it.qty) : 1);
      totals[cur] = (totals[cur] || 0) + line;
    });
    // ukloni valute sa nulom ako postoji bar jedna ne-nulta
    var keys = Object.keys(totals);
    var nonZero = keys.filter(function (k) { return totals[k] !== 0; });
    if (nonZero.length > 0) {
      keys.forEach(function (k) { if (totals[k] === 0) delete totals[k]; });
    }
    return totals; // npr. { RSD: 12300, EUR: 30 }
  }

  function formatAmount(value, currency) {
    // RSD bez decimala, EUR do 2 decimale (bez nepotrebnih nula)
    var v;
    if (currency === "RSD") {
      v = Math.round(value).toString();
    } else {
      v = (Math.round(value * 100) / 100).toString();
    }
    // tačka kao separator hiljada (lokalni običaj): 12300 → 12.300
    var parts = v.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    v = parts.length > 1 ? parts[0] + "," + parts[1] : parts[0];
    return v + " " + currency;
  }

  function formatTotals(totals, order) {
    // stabilan redosled: default RSD pa EUR pa ostalo
    order = order || CURRENCIES;
    var keys = Object.keys(totals);
    keys.sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia === -1) ia = 99;
      if (ib === -1) ib = 99;
      return ia - ib;
    });
    return keys.map(function (k) { return formatAmount(totals[k], k); }).join(" + ");
  }

  /* ---------- Export ---------- */

  var Models = {
    newId: newId,
    nowISO: nowISO,
    VEHICLE_CATEGORIES: VEHICLE_CATEGORIES,
    EVENT_TYPES: EVENT_TYPES,
    EVENT_SOURCES: EVENT_SOURCES,
    DATE_PRECISION: DATE_PRECISION,
    KM_PRECISION: KM_PRECISION,
    ITEM_KINDS: ITEM_KINDS,
    CURRENCIES: CURRENCIES,
    CONTACT_ROLES: CONTACT_ROLES,
    createVehicle: createVehicle,
    createEvent: createEvent,
    createItem: createItem,
    createContact: createContact,
    createDocument: createDocument,
    createReminder: createReminder,
    nextDocNumber: nextDocNumber,
    sumByCurrency: sumByCurrency,
    formatAmount: formatAmount,
    formatTotals: formatTotals
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Models;   // Node (testovi)
  }
  global.Models = Models;      // Browser
})(typeof window !== "undefined" ? window : globalThis);
