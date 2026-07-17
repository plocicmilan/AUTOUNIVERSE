/* GATE B — assertion testovi za core/js/models.js
   Pokretanje:  node tests/models.test.js                       */
"use strict";
var M = require("../core/js/models.js");
var assert = require("assert");
var passed = 0;

function ok(name, fn) {
  fn();
  passed++;
  console.log("  ✔ " + name);
}

console.log("MODELS TESTS");

/* ---- Zbir po valutama — bez konverzije (odluka 10.07.2026) ---- */

ok("sve stavke RSD → jedan zbir samo u RSD", function () {
  var t = M.sumByCurrency([
    { kind: "part", name: "Ulje", qty: 4.3, price: 1000, currency: "RSD" },
    { kind: "labor", name: "Rad", qty: 1, price: 3000, currency: "RSD" }
  ]);
  assert.deepStrictEqual(t, { RSD: 7300 });
});

ok("RSD + EUR → dva odvojena zbira, nikakav kurs", function () {
  var t = M.sumByCurrency([
    { kind: "part", name: "Ulje 5W-30", qty: 4.3, price: 4800 / 4.3, currency: "RSD" },
    { kind: "labor", name: "Zamena ulja i filtera", qty: 1, price: 30, currency: "EUR" }
  ]);
  assert.strictEqual(Math.round(t.RSD), 4800);
  assert.strictEqual(t.EUR, 30);
  assert.strictEqual(Object.keys(t).length, 2);
});

ok("qty množi cenu (4.3 l × 1.200 RSD)", function () {
  var t = M.sumByCurrency([{ qty: 4.3, price: 1200, currency: "RSD" }]);
  assert.strictEqual(t.RSD, 5160);
});

ok("prazna lista stavki → prazan zbir (PDF tada ne štampa UKUPNO)", function () {
  assert.deepStrictEqual(M.sumByCurrency([]), {});
});

ok("formatTotals: RSD pre EUR, ' + ' između", function () {
  var s = M.formatTotals({ EUR: 30, RSD: 12300 });
  assert.strictEqual(s, "12.300 RSD + 30 EUR");
});

ok("formatAmount: RSD bez decimala i sa tačkom hiljada", function () {
  assert.strictEqual(M.formatAmount(12345.6, "RSD"), "12.346 RSD");
});

ok("formatAmount: EUR sa zarezom za decimale", function () {
  assert.strictEqual(M.formatAmount(30.5, "EUR"), "30,5 EUR");
});

/* ---- Brojevi dokumenata ---- */

ok("prvi dokument: GT-0001", function () {
  assert.strictEqual(M.nextDocNumber("GT", null), "GT-0001");
});

ok("sledeći posle GT-0007 je GT-0008", function () {
  assert.strictEqual(M.nextDocNumber("GT", "GT-0007"), "GT-0008");
});

ok("preko 9999 ne puca: GT-10000", function () {
  assert.strictEqual(M.nextDocNumber("GT", "GT-9999"), "GT-10000");
});

/* ---- Fabrike ---- */

ok("createVehicle: default M1 + tehnička kartica postoji", function () {
  var v = M.createVehicle({ make: "VW", model: "Golf 7" });
  assert.strictEqual(v.category, "M1");
  assert.ok(v.id.indexOf("veh_") === 0);
  assert.ok(v.service_data && Array.isArray(v.service_data.custom_fields));
  assert.ok(v.created_at && v.updated_at);
});

ok("createVehicle: traktor (kategorija T) je regularan slučaj", function () {
  var v = M.createVehicle({ category: "T", make: "IMT", model: "539" });
  assert.strictEqual(v.type_label, "Traktor");
});

ok("createEvent: source i app polja (seme Trust Layer-a)", function () {
  var e = M.createEvent({ vehicle_id: "veh_x", type: "service", title: "Mali servis" });
  assert.strictEqual(e.source, "mechanic");
  assert.strictEqual(e.app, "garage");
  assert.ok(e.id.indexOf("evt_") === 0);
});

ok("createEvent: podrazumevano nije retroaktivan, preciznost exact", function () {
  var e = M.createEvent({ vehicle_id: "veh_x", type: "service" });
  assert.strictEqual(e.retroactive, false);
  assert.strictEqual(e.date_precision, "exact");
  assert.strictEqual(e.km_precision, "exact");
});

ok("createEvent: retroaktivni 'initial' unos čuva poreklo i preciznost", function () {
  var e = M.createEvent({
    vehicle_id: "veh_x", type: "service", source: "initial",
    retroactive: true, date_precision: "month", km_precision: "approx"
  });
  assert.strictEqual(e.source, "initial");
  assert.strictEqual(e.retroactive, true);
  assert.strictEqual(e.date_precision, "month");
  assert.strictEqual(e.km_precision, "approx");
  assert.ok(M.EVENT_SOURCES.indexOf("initial") !== -1);
});

ok("createEvent: nevažeća preciznost pada na exact", function () {
  var e = M.createEvent({ type: "service", date_precision: "juče", km_precision: "možda" });
  assert.strictEqual(e.date_precision, "exact");
  assert.strictEqual(e.km_precision, "exact");
});

ok("createEvent: nepoznat tip baca grešku", function () {
  assert.throws(function () { M.createEvent({ type: "teleport" }); });
});

ok("createItem: nepoznata valuta pada na RSD", function () {
  var it = M.createItem({ name: "Deo", price: 100, currency: "XYZ" });
  assert.strictEqual(it.currency, "RSD");
});

ok("id-jevi su jedinstveni (1000 komada)", function () {
  var seen = {};
  for (var i = 0; i < 1000; i++) {
    var id = M.newId("evt");
    assert.ok(!seen[id], "duplikat: " + id);
    seen[id] = true;
  }
});

/* ---- Vehicle v1.1 — nova polja ---- */

ok("createVehicle: default status je 'active'", function () {
  var v = M.createVehicle({ make: "VW", model: "Golf 7" });
  assert.strictEqual(v.status, "active");
  assert.strictEqual(v.trade_mode, false);
  assert.strictEqual(v.trade, null);
  assert.strictEqual(v.registered_owner, "");
});

ok("createVehicle: trade_mode true + trade polja", function () {
  var v = M.createVehicle({
    make: "VW", model: "Golf 7",
    trade_mode: true,
    trade: { purchase: { date: "2026-05-10", price: 4500, currency: "EUR", source: "individual" } }
  });
  assert.strictEqual(v.trade_mode, true);
  assert.strictEqual(v.trade.purchase.price, 4500);
  assert.strictEqual(v.trade.purchase.currency, "EUR");
  assert.strictEqual(v.trade.sale.price, null);
});

ok("createVehicle: status 'for_sale' je validan", function () {
  var v = M.createVehicle({ make: "VW", model: "Golf 7", status: "for_sale" });
  assert.strictEqual(v.status, "for_sale");
});

ok("createVehicle: nevalidan status pada na 'active'", function () {
  var v = M.createVehicle({ make: "VW", model: "Golf 7", status: "nesto_nepostojeце" });
  assert.strictEqual(v.status, "active");
});

ok("createVehicle: registered_owner čuva se kao string", function () {
  var v = M.createVehicle({ make: "VW", model: "Golf 7", registered_owner: "Dejan Perić" });
  assert.strictEqual(v.registered_owner, "Dejan Perić");
});

/* ---- Event v1.1 — expense modul + nova polja ---- */

ok("createEvent: expense_fuel je validan tip", function () {
  var e = M.createEvent({ vehicle_id: "veh_x", type: "expense_fuel" });
  assert.strictEqual(e.type, "expense_fuel");
});

ok("createEvent: svi expense_ tipovi su validni", function () {
  var expenseTypes = [
    "expense_fuel", "expense_tires", "expense_bodywork",
    "expense_registration", "expense_insurance",
    "expense_decorative", "expense_other"
  ];
  expenseTypes.forEach(function (t) {
    assert.doesNotThrow(function () { M.createEvent({ type: t }); }, t);
  });
});

ok("createEvent: cost polje se kreira ako je prosleđeno", function () {
  var e = M.createEvent({
    vehicle_id: "veh_x", type: "expense_fuel",
    cost: { total: 5000, currency: "RSD", informal: false }
  });
  assert.ok(e.cost !== null);
  assert.strictEqual(e.cost.total, 5000);
  assert.strictEqual(e.cost.currency, "RSD");
  assert.strictEqual(e.cost.informal, false);
  assert.strictEqual(e.cost.entered_by, "owner");
});

ok("createEvent: cost je null ako nije prosleđen", function () {
  var e = M.createEvent({ vehicle_id: "veh_x", type: "service" });
  assert.strictEqual(e.cost, null);
});

ok("createEvent: informal:true se čuva (sitnice/drugari/keš)", function () {
  var e = M.createEvent({
    type: "expense_other",
    cost: { total: 200, currency: "RSD", informal: true }
  });
  assert.strictEqual(e.cost.informal, true);
});

ok("createEvent: subtype polje se čuva", function () {
  var e = M.createEvent({ type: "service", subtype: "mali_servis" });
  assert.strictEqual(e.subtype, "mali_servis");
});

ok("createEvent: next_service polje se čuva", function () {
  var e = M.createEvent({
    type: "service",
    next_service: { km: 197500, date: "2027-07-17" }
  });
  assert.ok(e.next_service);
  assert.strictEqual(e.next_service.km, 197500);
});

ok("createEvent: public_on_marketplace je true po defaultu", function () {
  var e = M.createEvent({ type: "service" });
  assert.strictEqual(e.public_on_marketplace, true);
});

ok("createEvent: public_on_marketplace može biti false (opt-out)", function () {
  var e = M.createEvent({ type: "service", public_on_marketplace: false });
  assert.strictEqual(e.public_on_marketplace, false);
});

/* ---- createCost ---- */

ok("createCost: nevalidan currency pada na RSD", function () {
  var c = M.createCost({ total: 100, currency: "XYZ" });
  assert.strictEqual(c.currency, "RSD");
});

ok("createCost: receipt_document_id opciono", function () {
  var c = M.createCost({ total: 500 });
  assert.strictEqual(c.receipt_document_id, null);
});

console.log("\nSVI TESTOVI PROŠLI: " + passed + "/" + passed);
