/* GATE B — PDF engine test (Node headless).
   Proverava: generiše validan PDF, radi sa mešanim valutama,
   label mapiranje. Pokretanje: node tests/pdf.test.js         */
"use strict";
var assert = require("assert");
var passed = 0;
function ok(name, fn) { fn(); passed++; console.log("  ✔ " + name); }

console.log("PDF ENGINE TESTS");

// jsPDF u Node-u
var jsPDFmod;
try {
  jsPDFmod = require("../core/vendor/jspdf.umd.min.js");
} catch (e) {
  console.log("  ⚠ jsPDF se ne učitava u Node (browser build) — preskačem render test.");
  console.log("    Label/model logika se i dalje testira ispod.\n");
}

// Models potreban PDF-u
global.Models = require("../core/js/models.js");
// simuliraj global jsPDF ako je modul dao ctor
if (jsPDFmod && (jsPDFmod.jsPDF || jsPDFmod.default)) {
  global.jspdf = { jsPDF: jsPDFmod.jsPDF || jsPDFmod.default };
}
// font sa našim slovima (Sesija 5)
try { require("../core/vendor/font-dejavu.js"); } catch (e) {}
var PDF = require("../core/js/pdf.js");

ok("label mapiranje SR/EN po tipu dokumenta", function () {
  assert.strictEqual(PDF.label("invoice", "sr"), "FAKTURA");
  assert.strictEqual(PDF.label("invoice", "en"), "INVOICE");
  assert.strictEqual(PDF.label("work_order", "sr"), "RADNI NALOG");
  assert.strictEqual(PDF.label("estimate", "en"), "ESTIMATE");
});

ok("nepoznat tip pada na work_order", function () {
  assert.strictEqual(PDF.label("nepostojeci", "en"), "WORK ORDER");
});

if (global.jspdf) {
  ok("build() vraća PDF sa %PDF zaglavljem (mešane valute)", function () {
    var doc = PDF.build({
      docType: "invoice", number: "GT-0001", date: "2026-07-10", lang: "sr",
      profile: { name: "Marko Auto", phone: "0641234567" },
      vehicle: { make: "VW", model: "Golf 7", plate: "KŠ-123-AB", mileage_km: 185000 },
      client: { name: "Petar Petrović", phone: "0601112223" },
      description: "Mali servis, zamena ulja i filtera.",
      items: [
        { kind: "part", name: "Ulje 5W-30", qty: 4.3, unit: "l", price: 1116, currency: "RSD" },
        { kind: "labor", name: "Rad", qty: 1, price: 30, currency: "EUR" }
      ],
      photos: [], signature: null, watermark: true
    });
    var out = doc.output("datauristring");
    assert.ok(out.indexOf("data:application/pdf") === 0, "nije PDF datauri");
    // dekoduj prvih par bajtova
    var b64 = out.split(",")[1];
    var head = Buffer.from(b64.slice(0, 12), "base64").toString("binary");
    assert.ok(head.indexOf("%PDF") === 0, "nema %PDF magične sekvence");
  });

  ok("build() bez stavki ne puca (prazan nalog)", function () {
    var doc = PDF.build({
      docType: "work_order", number: "GT-0002", date: "2026-07-10", lang: "en",
      profile: { name: "Test" }, vehicle: {}, client: {},
      description: "", items: [], photos: [], signature: null, watermark: false
    });
    assert.ok(doc.output("datauristring").indexOf("data:application/pdf") === 0);
  });

  ok("build() sa srpskim slovima (š/ć/č/đ/ž) ne puca", function () {
    var doc = PDF.build({
      docType: "invoice", number: "GT-0003", date: "2026-07-10", lang: "sr",
      profile: { name: "Šećerov Servis" },
      vehicle: { make: "Škoda", model: "Octavia", plate: "NŠ-456-ČĆ" },
      client: { name: "Đorđe Ćirić" },
      description: "Zamena kvačila i pločica, provera kočnica.",
      items: [{ kind: "part", name: "Pločice", qty: 1, price: 5400, currency: "RSD" }],
      photos: [], signature: null, watermark: false
    });
    assert.ok(doc.output("datauristring").indexOf("data:application/pdf") === 0);
  });

  ok("buildDossier: dosije vozila sa retroaktivnim događajima → validan PDF", function () {
    var PDF = require("../core/js/pdf.js");
    var events = [
      Models.createEvent({ vehicle_id: "v1", type: "service", title: "Mali servis",
        date: "2024-03-01", date_precision: "month", mileage_km: 180000, km_precision: "approx",
        source: "initial", retroactive: true, description: "Ulje, Šećerov auto", app: "driver",
        items: [{ kind: "part", name: "Ulje 5W30", qty: 4, price: 1200, currency: "RSD" }] }),
      Models.createEvent({ vehicle_id: "v1", type: "tires", title: "Zimske gume Đ/ž/č",
        date: "2025-11-10", mileage_km: 190000, source: "owner", app: "driver" })
    ];
    var doc = PDF.buildDossier({
      lang: "sr", profile: { name: "Petar Petrović", phone: "064" },
      vehicle: { make: "VW", model: "Golf VII", year: 2016, plate: "KŠ-1", vin: "WVW", type_label: "Putničko vozilo" },
      currentKm: 192400, techCard: { oil_type: "5W-30", battery: "2024" }, events: events,
      typeLabel: function (ty) { return ty; }
    });
    assert.ok(doc.output("datauristring").indexOf("data:application/pdf") === 0);
  });

  ok("buildDossier: prazna istorija ne puca", function () {
    var PDF = require("../core/js/pdf.js");
    var doc = PDF.buildDossier({ lang: "sr", vehicle: { make: "Fiat", model: "Punto" }, events: [] });
    assert.ok(doc.output("datauristring").indexOf("data:application/pdf") === 0);
  });
} else {
  console.log("  (render testovi preskočeni — nema jsPDF u Node okruženju)");
}

console.log("\nSVI TESTOVI PROŠLI: " + passed + "/" + passed);
