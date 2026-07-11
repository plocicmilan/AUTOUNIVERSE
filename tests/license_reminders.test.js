/* GATE B — license + reminders čiste funkcije.
   Pokretanje: node tests/license_reminders.test.js          */
"use strict";
var L = require("../core/js/license.js");
var R = require("../core/js/reminders.js");
var assert = require("assert");
var passed = 0;
function ok(name, fn) { fn(); passed++; console.log("  ✔ " + name); }

console.log("LICENSE + REMINDERS TESTS");

/* ---- License tier gate ---- */

ok("basic modul uvek otključan", function () {
  assert.strictEqual(L.isModuleUnlocked("basic", false, false), true);
  assert.strictEqual(L.isModuleUnlocked("basic", true, false), true);
});

ok("key modul traži licencu", function () {
  assert.strictEqual(L.isModuleUnlocked("key", false, false), false);
  assert.strictEqual(L.isModuleUnlocked("key", true, false), true);
});

ok("platform modul traži da platforma postoji", function () {
  assert.strictEqual(L.isModuleUnlocked("platform", true, false), false);
  assert.strictEqual(L.isModuleUnlocked("platform", true, true), true);
});

ok("TEST-UNLOCK se prepoznaje (case-insensitive, trim)", function () {
  assert.strictEqual(L.isTestKey("TEST-UNLOCK"), true);
  assert.strictEqual(L.isTestKey("  test-unlock  "), true);
  assert.strictEqual(L.isTestKey("nesto"), false);
});

/* mock Store za activate */
function mockStore() {
  var mem = {};
  return { settings: {
    get: function (k, d) { return k in mem ? mem[k] : d; },
    set: function (k, v) { mem[k] = v; return v; }
  }};
}

ok("activate sa TEST-UNLOCK licencira offline", function () {
  var s = mockStore();
  return L.activate(s, "", "TEST-UNLOCK").then(function (res) {
    assert.strictEqual(res.ok, true);
    assert.strictEqual(L.isLicensed(s), true);
    assert.strictEqual(L.getState(s).test, true);
  });
});

ok("activate praznog ključa → ok:false", function () {
  var s = mockStore();
  return L.activate(s, "", "").then(function (res) {
    assert.strictEqual(res.ok, false);
    assert.strictEqual(L.isLicensed(s), false);
  });
});

ok("activate pravog ključa bez product_id → no_product", function () {
  var s = mockStore();
  return L.activate(s, "", "REAL-KEY-1234").then(function (res) {
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.reason, "no_product_configured");
  });
});

ok("deactivate skida licencu", function () {
  var s = mockStore();
  return L.activate(s, "", "TEST-UNLOCK").then(function () {
    L.deactivate(s);
    assert.strictEqual(L.isLicensed(s), false);
  });
});

/* ---- Reminders status ---- */

var TODAY = "2026-07-10";

ok("prošli datum → due (stiglo), reason date", function () {
  var s = R.status({ due_date: "2026-07-01" }, TODAY, null);
  assert.strictEqual(s.state, "due");
  assert.strictEqual(s.reason, "date");
  assert.strictEqual(s.daysLeft, -9);
});

ok("datum za 10 dana → soon (uskoro)", function () {
  var s = R.status({ due_date: "2026-07-20" }, TODAY, null);
  assert.strictEqual(s.state, "soon");
});

ok("datum za 40 dana → upcoming", function () {
  var s = R.status({ due_date: "2026-08-19" }, TODAY, null);
  assert.strictEqual(s.state, "upcoming");
});

ok("km dostignut → due, reason mileage", function () {
  var s = R.status({ due_mileage_km: 190000 }, TODAY, 191000);
  assert.strictEqual(s.state, "due");
  assert.strictEqual(s.reason, "mileage");
});

ok("km za 800 → soon", function () {
  var s = R.status({ due_mileage_km: 190000 }, TODAY, 189200);
  assert.strictEqual(s.state, "soon");
});

ok("'šta pre': datum daleko ali km stigao → due", function () {
  var s = R.status({ due_date: "2027-01-01", due_mileage_km: 190000 }, TODAY, 190500);
  assert.strictEqual(s.state, "due");
  assert.strictEqual(s.reason, "mileage");
});

ok("done ostaje done bez obzira na datum", function () {
  var s = R.status({ due_date: "2020-01-01", done: true }, TODAY, null);
  assert.strictEqual(s.state, "done");
});

ok("sortByUrgency: due pre soon pre upcoming", function () {
  var rem = [
    { id: "a", due_date: "2026-08-30" },       // upcoming
    { id: "b", due_date: "2026-07-01" },       // due
    { id: "c", due_date: "2026-07-18" }        // soon
  ];
  var sorted = R.sortByUrgency(rem, TODAY, {});
  assert.deepStrictEqual(sorted.map(function (r) { return r.id; }), ["b", "c", "a"]);
});

ok("incoming vraća samo due+soon", function () {
  var rem = [
    { id: "a", due_date: "2026-08-30" },       // upcoming
    { id: "b", due_date: "2026-07-01" },       // due
    { id: "c", due_date: "2026-07-18" },       // soon
    { id: "d", due_date: "2026-07-01", done: true } // done
  ];
  var inc = R.incoming(rem, TODAY, {});
  assert.deepStrictEqual(inc.map(function (r) { return r.id; }), ["b", "c"]);
});

console.log("\nSVI TESTOVI PROŠLI: " + passed + "/" + passed);
