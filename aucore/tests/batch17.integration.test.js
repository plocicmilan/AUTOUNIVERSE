"use strict";
/* Batch 17 Integration Tests
   Testira: overdue reminder notifikacije (drip), ?upcoming_days filter,
            active_reminders_count u GET /vehicles, /admin/drip/check-reminders
   Run: node aucore/tests/batch17.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

const TMP_DB = path.join(os.tmpdir(), `aucore_b17_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

let server;
const PORT = 13413;

function startServer() {
  return new Promise(resolve => {
    for (const key of Object.keys(require.cache)) {
      if (key.includes("/aucore/") || key.includes("\\aucore\\")) delete require.cache[key];
    }
    process.env.AUCORE_DB_PATH = TMP_DB;
    process.env.PORT = String(PORT);
    server = require("../server");
    server.listen(PORT, resolve);
  });
}

function stopServer() {
  return new Promise(resolve => server.close(resolve));
}

function req(method, path_, body, authToken = "") {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost",
      port: PORT,
      path: "/api" + path_,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        ...(authToken ? { Authorization: "Bearer " + authToken } : {}),
      },
    };
    const r = http.request(options, res => {
      let data = "";
      res.on("data", c => { data += c; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: {} }); }
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

let passed = 0;
let failed = 0;
const results = [];
function test(name, fn) { results.push({ name, fn }); }

async function runTests() {
  await startServer();
  console.log(`\n=== AU Core Batch 17 Integration Tests (port ${PORT}) ===\n`);

  for (const { name, fn } of results) {
    try {
      await fn();
      passed++;
      console.log(`  ok  ${name}`);
    } catch (e) {
      failed++;
      console.error(`  FAIL  ${name}`);
      console.error(`        ${e.message}`);
    }
  }

  await stopServer();
  try { const { getDb } = require("../db"); getDb().close(); } catch (_) {}
  for (const ext of ["", "-shm", "-wal"]) {
    const f = TMP_DB + ext;
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
  }

  console.log(`\n=== ${passed}/${passed + failed} testova prošlo ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

// ─── Shared state ──────────────────────────────────────────────────────────
let tok  = "";
let tok2 = "";
let vid  = 0;

// ─── Setup ─────────────────────────────────────────────────────────────────

test("Setup: register + login b17a@test.com (admin)", async () => {
  await req("POST", "/auth/register", { email: "b17a@test.com", password: "pass1234", name: "B17A" });
  const r = await req("POST", "/auth/login", { email: "b17a@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok = r.data.session;
});

test("Setup: register + approve + login b17b@test.com", async () => {
  const regR = await req("POST", "/auth/register", { email: "b17b@test.com", password: "pass1234", name: "B17B" });
  await req("POST", `/admin/users/${regR.data.id}/approve`, null, tok);
  const r = await req("POST", "/auth/login", { email: "b17b@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok2 = r.data.session;
});

test("Setup: kreiraj vozilo", async () => {
  const r = await req("POST", "/vehicles", { make: "Peugeot", model: "307", year: 2005 }, tok);
  assert.equal(r.status, 201);
  vid = r.data.id;
});

test("Setup: dodaj remindere — 2 overdue, 1 sutra, 1 za 30 dana, 1 samo km", async () => {
  // Overdue (prošlost)
  await req("POST", `/vehicles/${vid}/reminders`, { title: "Registracija", due_date: "2023-01-01" }, tok);
  await req("POST", `/vehicles/${vid}/reminders`, { title: "Zimske gume",  due_date: "2023-11-15" }, tok);
  // Sutra
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  await req("POST", `/vehicles/${vid}/reminders`, { title: "Servis", due_date: tomorrow }, tok);
  // Za 30 dana
  const in30 = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  await req("POST", `/vehicles/${vid}/reminders`, { title: "Osiguranje", due_date: in30 }, tok);
  // Samo km (bez due_date)
  await req("POST", `/vehicles/${vid}/reminders`, { title: "Filter ulja", due_mileage_km: 100000 }, tok);
});

// ─── /admin/drip/check-reminders ──────────────────────────────────────────

test("Admin drip: bez auth → 401", async () => {
  const r = await req("POST", "/admin/drip/check-reminders");
  assert.equal(r.status, 401);
});

test("Admin drip: non-admin → 403", async () => {
  const r = await req("POST", "/admin/drip/check-reminders", null, tok2);
  assert.equal(r.status, 403);
});

test("Admin drip check-reminders: admin može → 200 + notified=2", async () => {
  const r = await req("POST", "/admin/drip/check-reminders", null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.equal(r.data.notified, 2, "mora biti 2 overdue remindere (Registracija + Zimske gume)");
});

test("Admin drip check-reminders: dupli poziv → notified=0 (dedup radi)", async () => {
  const r = await req("POST", "/admin/drip/check-reminders", null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.notified, 0, "drugi poziv ne duplira notifikacije");
});

test("Admin drip overdue: GET pregled zakasnelih → 2 remindere", async () => {
  const r = await req("GET", "/admin/drip/overdue", null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.count, 2, "mora biti 2 overdue remindere");
  assert.ok(Array.isArray(r.data.reminders));
  const titles = r.data.reminders.map(function (x) { return x.title; });
  assert.ok(titles.includes("Registracija"), "mora biti Registracija");
  assert.ok(titles.includes("Zimske gume"), "mora biti Zimske gume");
});

// ─── Notifikacije za vlasnika ──────────────────────────────────────────────

test("Notif: vlasnik dobija 2 'reminder_overdue' notifikacije", async () => {
  const r = await req("GET", "/notifications", null, tok);
  assert.equal(r.status, 200);
  const overdue = r.data.notifications.filter(function (n) { return n.category === "reminder_overdue"; });
  assert.equal(overdue.length, 2, "mora biti tačno 2 overdue notifikacije");
});

test("Notif: overdue notifikacija ima priority='high'", async () => {
  const r = await req("GET", "/notifications", null, tok);
  const overdue = r.data.notifications.filter(function (n) { return n.category === "reminder_overdue"; });
  overdue.forEach(function (n) {
    assert.equal(n.priority, "high", "overdue notifikacija mora biti high priority");
  });
});

test("Notif: overdue notifikacija ima metadata sa reminder_id", async () => {
  const r = await req("GET", "/notifications", null, tok);
  const overdue = r.data.notifications.filter(function (n) { return n.category === "reminder_overdue"; });
  overdue.forEach(function (n) {
    const meta = typeof n.metadata === "string" ? JSON.parse(n.metadata) : n.metadata;
    assert.ok(meta && meta.reminder_id, "mora imati reminder_id u metadata");
    assert.ok(meta.vehicle_id, "mora imati vehicle_id u metadata");
  });
});

test("Notif: b17b ne dobija tuđe overdue notifikacije", async () => {
  const r = await req("GET", "/notifications", null, tok2);
  assert.equal(r.status, 200);
  const overdue = r.data.notifications.filter(function (n) { return n.category === "reminder_overdue"; });
  assert.equal(overdue.length, 0, "b17b nema overdue notifikacije (nema vozilo)");
});

// ─── ?upcoming_days filter ─────────────────────────────────────────────────

test("Reminders ?upcoming_days=1: samo sutrašnji", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders?upcoming_days=1`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 1, "samo 1 reminder due u roku od 1 dan (sutra)");
  assert.equal(r.data.reminders[0].title, "Servis");
});

test("Reminders ?upcoming_days=31: sutra + za 30 dana", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders?upcoming_days=31`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 2, "2 remindere u roku od 31 dan");
});

test("Reminders ?upcoming_days=0: nema (0 dana u budućnost)", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders?upcoming_days=0`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 0, "0 dana = nema zbog_date je > today, a not <=today(0 dana)");
});

test("Reminders ?upcoming_days ne uključuje km-only remindere", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders?upcoming_days=365`, null, tok);
  assert.equal(r.status, 200);
  const kmOnly = r.data.reminders.filter(function (x) { return x.title === "Filter ulja"; });
  assert.equal(kmOnly.length, 0, "km-only reminder nema due_date, ne pojavljuje se u upcoming_days");
});

test("Reminders ?upcoming_days=365 ne uključuje overdue (prošlost)", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders?upcoming_days=365`, null, tok);
  const overdueTitles = r.data.reminders.map(function (x) { return x.title; });
  assert.ok(!overdueTitles.includes("Registracija"), "Registracija (2023) ne sme biti u upcoming");
  assert.ok(!overdueTitles.includes("Zimske gume"), "Zimske gume (2023) ne sme biti u upcoming");
});

// ─── active_reminders_count u GET /vehicles ────────────────────────────────

test("Vehicles: GET /vehicles vraća active_reminders_count", async () => {
  const r = await req("GET", "/vehicles", null, tok);
  assert.equal(r.status, 200);
  const v = r.data.owned.find(function (x) { return x.id === vid; });
  assert.ok(v, "vozilo mora biti u owned");
  assert.ok(typeof v.active_reminders_count === "number", "mora imati active_reminders_count");
  // 5 remindere total, svi su done=0
  assert.equal(v.active_reminders_count, 5, "mora imati 5 aktivnih podsetnika");
});

test("Vehicles: active_reminders_count se smanjuje posle done", async () => {
  // Označi Registracija kao završeno
  const remsR = await req("GET", `/vehicles/${vid}/reminders`, null, tok);
  const reg = remsR.data.reminders.find(function (x) { return x.title === "Registracija"; });
  await req("PUT", `/vehicles/${vid}/reminders/${reg.id}`, { done: true }, tok);

  const r = await req("GET", "/vehicles", null, tok);
  const v = r.data.owned.find(function (x) { return x.id === vid; });
  assert.equal(v.active_reminders_count, 4, "posle done=1, active = 4");
});

test("Vehicles: novo vozilo ima active_reminders_count=0", async () => {
  const newV = await req("POST", "/vehicles", { make: "Skoda", model: "Fabia", year: 2010 }, tok);
  const r = await req("GET", "/vehicles", null, tok);
  const v = r.data.owned.find(function (x) { return x.id === newV.data.id; });
  assert.equal(v.active_reminders_count, 0, "novo vozilo ima 0 aktivnih podsetnika");
});

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
