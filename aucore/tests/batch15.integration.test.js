"use strict";
/* Batch 15 Integration Tests
   Testira: GET /vehicles/:id/timeline, GET /vehicles enrichment (event_count, last_event_date)
   Run: node aucore/tests/batch15.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

const TMP_DB = path.join(os.tmpdir(), `aucore_b15_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

let server;
const PORT = 13411;

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
  console.log(`\n=== AU Core Batch 15 Integration Tests (port ${PORT}) ===\n`);

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

test("Setup: register + login b15a@test.com", async () => {
  await req("POST", "/auth/register", { email: "b15a@test.com", password: "pass1234", name: "B15A" });
  const r = await req("POST", "/auth/login", { email: "b15a@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok = r.data.session;
});

test("Setup: register + approve + login b15b@test.com", async () => {
  const regR = await req("POST", "/auth/register", { email: "b15b@test.com", password: "pass1234", name: "B15B" });
  await req("POST", `/admin/users/${regR.data.id}/approve`, null, tok);
  const r = await req("POST", "/auth/login", { email: "b15b@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok2 = r.data.session;
});

test("Setup: kreiraj vozilo", async () => {
  const r = await req("POST", "/vehicles", { make: "Seat", model: "Ibiza", year: 2017 }, tok);
  assert.equal(r.status, 201);
  vid = r.data.id;
});

test("Setup: dodaj 4 eventi na različite datume", async () => {
  await req("POST", `/vehicles/${vid}/events`, { type: "service",    event_date: "2023-03-01", data: { description: "Mali servis" } }, tok);
  await req("POST", `/vehicles/${vid}/events`, { type: "oil_change", event_date: "2023-09-15", data: { mileage_km: 60000 } }, tok);
  await req("POST", `/vehicles/${vid}/events`, { type: "repair",     event_date: "2024-02-20", data: { description: "Kočnice" } }, tok);
  await req("POST", `/vehicles/${vid}/events`, { type: "inspection", event_date: "2024-07-01", data: {} }, tok);
});

test("Setup: dodaj 2 podsetnika (1 sa due_date, 1 samo km)", async () => {
  await req("POST", `/vehicles/${vid}/reminders`, { title: "Registracija", due_date: "2025-09-01" }, tok);
  await req("POST", `/vehicles/${vid}/reminders`, { title: "Filter ulja",  due_mileage_km: 90000 }, tok);
});

test("Setup: grant b15b read pristup", async () => {
  const r = await req("POST", "/grants", { grantee_email: "b15b@test.com", vehicle_id: vid, role: "read" }, tok);
  assert.equal(r.status, 201);
});

// ─── GET /vehicles/:id/timeline ────────────────────────────────────────────

test("Timeline: bez auth → 401", async () => {
  const r = await req("GET", `/vehicles/${vid}/timeline`);
  assert.equal(r.status, 401);
});

test("Timeline: neovlašćen → 403", async () => {
  const regR = await req("POST", "/auth/register", { email: "b15c@test.com", password: "pass1234", name: "B15C" });
  await req("POST", `/admin/users/${regR.data.id}/approve`, null, tok);
  const rLog = await req("POST", "/auth/login", { email: "b15c@test.com", password: "pass1234" });
  const r = await req("GET", `/vehicles/${vid}/timeline`, null, rLog.data.session);
  assert.equal(r.status, 403);
});

test("Timeline: osnovna struktura", async () => {
  const r = await req("GET", `/vehicles/${vid}/timeline`, null, tok);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.timeline), "mora biti array");
  assert.ok(typeof r.data.total === "number", "total mora biti number");
  assert.ok(typeof r.data.limit === "number", "limit mora biti number");
});

test("Timeline: sadrži i evente i remindere (sa due_date)", async () => {
  const r = await req("GET", `/vehicles/${vid}/timeline`, null, tok);
  const types = r.data.timeline.map(function (i) { return i.item_type; });
  assert.ok(types.includes("event"),    "mora imati event");
  assert.ok(types.includes("reminder"), "mora imati reminder");
});

test("Timeline: sortirano DESC po datumu", async () => {
  const r = await req("GET", `/vehicles/${vid}/timeline`, null, tok);
  const dates = r.data.timeline.map(function (i) { return i.item_date || ""; }).filter(Boolean);
  for (var i = 0; i < dates.length - 1; i++) {
    assert.ok(dates[i] >= dates[i + 1], "mora biti DESC redosled na indeksu " + i);
  }
});

test("Timeline: total = 4 eventi + 1 reminder sa due_date = 5", async () => {
  const r = await req("GET", `/vehicles/${vid}/timeline`, null, tok);
  // 4 eventi + 1 reminder (drugi nema due_date pa nije u timeline)
  assert.equal(r.data.total, 5);
});

test("Timeline: ?reminders=0 isključuje remindere", async () => {
  const r = await req("GET", `/vehicles/${vid}/timeline?reminders=0`, null, tok);
  assert.equal(r.status, 200);
  const types = r.data.timeline.map(function (i) { return i.item_type; });
  assert.ok(!types.includes("reminder"), "bez reminder-a uz ?reminders=0");
  assert.equal(r.data.total, 4);
});

test("Timeline: ?from filter isključuje starije stavke", async () => {
  const r = await req("GET", `/vehicles/${vid}/timeline?from=2024-01-01`, null, tok);
  assert.equal(r.status, 200);
  const events = r.data.timeline.filter(function (i) { return i.item_type === "event"; });
  // Samo 2024-02-20 i 2024-07-01 (2 od 4 evenata)
  assert.equal(events.length, 2);
});

test("Timeline: ?to filter isključuje novije stavke", async () => {
  const r = await req("GET", `/vehicles/${vid}/timeline?to=2023-12-31&reminders=0`, null, tok);
  assert.equal(r.status, 200);
  // Samo 2023-03-01 i 2023-09-15
  assert.equal(r.data.total, 2);
});

test("Timeline: ?limit ograničava rezultate", async () => {
  const r = await req("GET", `/vehicles/${vid}/timeline?limit=2`, null, tok);
  assert.equal(r.status, 200);
  assert.ok(r.data.timeline.length <= 2, "limit=2 mora dati max 2 stavke");
  assert.equal(r.data.limit, 2);
  assert.ok(r.data.total >= 2, "total je ukupan bez limita");
});

test("Timeline: grantee može čitati → 200", async () => {
  const r = await req("GET", `/vehicles/${vid}/timeline`, null, tok2);
  assert.equal(r.status, 200);
  assert.ok(r.data.total >= 1);
});

test("Timeline: ne konflikta sa /events, /events/summary, /mileage", async () => {
  const [rt, rs, rm] = await Promise.all([
    req("GET", `/vehicles/${vid}/timeline`, null, tok),
    req("GET", `/vehicles/${vid}/events/summary`, null, tok),
    req("GET", `/vehicles/${vid}/mileage`, null, tok),
  ]);
  assert.equal(rt.status, 200, "/timeline mora biti 200");
  assert.equal(rs.status, 200, "/events/summary mora biti 200");
  assert.equal(rm.status, 200, "/mileage mora biti 200");
});

// ─── GET /vehicles enrichment ──────────────────────────────────────────────

test("Vehicles enrichment: GET /vehicles vraća event_count i last_event_date za owned", async () => {
  const r = await req("GET", "/vehicles", null, tok);
  assert.equal(r.status, 200);
  const v = r.data.owned.find(function (x) { return x.id === vid; });
  assert.ok(v, "vozilo mora biti u owned listi");
  assert.ok(typeof v.event_count === "number", "mora imati event_count");
  assert.equal(v.event_count, 4, "mora imati 4 eventa");
  assert.ok(v.last_event_date, "mora imati last_event_date");
  assert.ok(v.last_event_date.startsWith("2024-07-01"), "last_event_date mora biti 2024-07-01");
});

test("Vehicles enrichment: shared vozila takođe imaju event_count", async () => {
  const r = await req("GET", "/vehicles", null, tok2);
  assert.equal(r.status, 200);
  const shared = r.data.shared.find(function (x) { return x.id === vid; });
  assert.ok(shared, "vozilo mora biti u shared listi");
  assert.ok(typeof shared.event_count === "number");
  assert.equal(shared.event_count, 4);
});

test("Vehicles enrichment: novo vozilo bez evenata ima event_count=0 i last_event_date=null", async () => {
  const newV = await req("POST", "/vehicles", { make: "Dacia", model: "Sandero", year: 2020 }, tok);
  const newId = newV.data.id;
  const r = await req("GET", "/vehicles", null, tok);
  const v = r.data.owned.find(function (x) { return x.id === newId; });
  assert.ok(v, "novo vozilo mora biti u owned");
  assert.equal(v.event_count, 0);
  assert.equal(v.last_event_date, null);
});

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
