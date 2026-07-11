/* GATE B — testovi za čiste funkcije iz core/js/store.js
   Pokretanje: node tests/store.test.js                     */
"use strict";
var S = require("../core/js/store.js");
var assert = require("assert");
var passed = 0;

function ok(name, fn) { fn(); passed++; console.log("  ✔ " + name); }

console.log("STORE TESTS");

var vehicles = [
  { id: "veh_1", make: "Volkswagen", model: "Golf 7", plate: "KŠ-123-AB", owner_contact_id: "con_1" },
  { id: "veh_2", make: "IMT", model: "539", plate: "", owner_contact_id: "con_2" },
  { id: "veh_3", make: "Zastava", model: "101", plate: "KŠ-999-ZZ", owner_contact_id: null }
];
var contactsById = {
  con_1: { id: "con_1", name: "Marko Marković", phone: "0641234567" },
  con_2: { id: "con_2", name: "Goran Goranović", phone: "0637654321" }
};

ok("prazna pretraga vraća sva vozila", function () {
  assert.strictEqual(S.filterVehicles(vehicles, "", contactsById).length, 3);
});

ok("pretraga po tablici (deo, bez obzira na velika/mala)", function () {
  var r = S.filterVehicles(vehicles, "kš-123", contactsById);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, "veh_1");
});

ok("pretraga po modelu", function () {
  var r = S.filterVehicles(vehicles, "golf", contactsById);
  assert.strictEqual(r.length, 1);
});

ok("pretraga po imenu vlasnika", function () {
  var r = S.filterVehicles(vehicles, "goran", contactsById);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, "veh_2");
});

ok("pretraga po telefonu vlasnika", function () {
  var r = S.filterVehicles(vehicles, "064123", contactsById);
  assert.strictEqual(r.length, 1);
});

ok("traktor se nalazi po marki (regularan slučaj)", function () {
  var r = S.filterVehicles(vehicles, "imt", contactsById);
  assert.strictEqual(r.length, 1);
});

ok("bez pogotka → prazna lista", function () {
  assert.strictEqual(S.filterVehicles(vehicles, "ferrari", contactsById).length, 0);
});

/* ---- Backup serialize/parse ---- */

ok("serialize → parse vraća iste podatke", function () {
  var data = { vehicles: vehicles, events: [], contacts: [], documents: [], reminders: [] };
  var json = S.serializeBackup("garage", data, { currency: "RSD" });
  var b = S.parseBackup(json);
  assert.strictEqual(b.app, "garage");
  assert.strictEqual(b.data.vehicles.length, 3);
  assert.strictEqual(b.settings.currency, "RSD");
  assert.ok(b.exported_at);
});

ok("parse odbija fajl koji nije naš backup", function () {
  assert.throws(function () { S.parseBackup('{"foo": "bar"}'); });
});

ok("parse dopunjava store-ove koji fale u backup-u", function () {
  var json = S.serializeBackup("garage", { vehicles: [] }, {});
  var b = S.parseBackup(json);
  assert.ok(Array.isArray(b.data.reminders));
  assert.ok(Array.isArray(b.data.events));
});

console.log("\nSVI TESTOVI PROŠLI: " + passed + "/" + passed);
