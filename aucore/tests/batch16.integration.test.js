"use strict";
/* Batch 16 Integration Tests
   Testira: GET /vehicles/:id/events ?since + ?app filtere,
            GET /vehicles/:id/reminders ?since filter
   Run: node aucore/tests/batch16.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

const TMP_DB = path.join(os.tmpdir(), `aucore_b16_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

let server;
const PORT = 13412;

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

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

let passed = 0;
let failed = 0;
const results = [];
function test(name, fn) { results.push({ name, fn }); }

async function runTests() {
  await startServer();
  console.log(`\n=== AU Core Batch 16 Integration Tests (port ${PORT}) ===\n`);

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
let vid  = 0;
let sinceTs = ""; // timestamp between batch A and batch B events

// ─── Setup ─────────────────────────────────────────────────────────────────

test("Setup: register + login b16a@test.com", async () => {
  await req("POST", "/auth/register", { email: "b16a@test.com", password: "pass1234", name: "B16A" });
  const r = await req("POST", "/auth/login", { email: "b16a@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok = r.data.session;
});

test("Setup: kreiraj vozilo", async () => {
  const r = await req("POST", "/vehicles", { make: "Honda", model: "Civic", year: 2019 }, tok);
  assert.equal(r.status, 201);
  vid = r.data.id;
});

test("Setup: dodaj 2 eventa PRIJE snimanja timestampa", async () => {
  await req("POST", `/vehicles/${vid}/events`, { type: "service",    event_date: "2023-01-10", data: { description: "Pre-A" } }, tok);
  await req("POST", `/vehicles/${vid}/events`, { type: "oil_change", event_date: "2023-06-01", data: { mileage_km: 50000 } }, tok);
});

test("Setup: snimi ?since timestamp (između A i B grupe)", async () => {
  // SQLite datetime('now') ima sekundarnu preciziju — treba 1100ms razmaka
  await sleep(1100);
  sinceTs = new Date().toISOString();
  await sleep(1100);
});

test("Setup: dodaj 3 eventa POSLE timestampa (app=aucore default)", async () => {
  await req("POST", `/vehicles/${vid}/events`, { type: "repair",     event_date: "2024-03-15", data: { description: "Post-A novi" } }, tok);
  await req("POST", `/vehicles/${vid}/events`, { type: "inspection", event_date: "2024-07-20", data: {} }, tok);
  await req("POST", `/vehicles/${vid}/events`, { type: "service",    event_date: "2024-11-01", data: {} }, tok);
});

test("Setup: dodaj 2 podsetnika POSLE timestampa", async () => {
  // Snimamo novi since za reminders test
  await req("POST", `/vehicles/${vid}/reminders`, { title: "Post rem 1", due_date: "2025-08-01" }, tok);
  await req("POST", `/vehicles/${vid}/reminders`, { title: "Post rem 2", due_mileage_km: 80000 }, tok);
});

// ─── GET /vehicles/:id/events ?since filter ────────────────────────────────

test("Events ?since: vraća samo novije od timestampa", async () => {
  const r = await req("GET", `/vehicles/${vid}/events?since=${encodeURIComponent(sinceTs)}`, null, tok);
  assert.equal(r.status, 200);
  // 3 eventa su kreirana posle sinceTs
  assert.equal(r.data.total, 3, "mora biti 3 eventa posle sinceTs");
  assert.equal(r.data.events.length, 3);
});

test("Events bez ?since: vraća sve (5)", async () => {
  const r = await req("GET", `/vehicles/${vid}/events`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 5, "ukupno mora biti 5 evenata");
});

test("Events ?since + ?type: kombinacija filtera radi", async () => {
  const r = await req("GET", `/vehicles/${vid}/events?since=${encodeURIComponent(sinceTs)}&type=service`, null, tok);
  assert.equal(r.status, 200);
  // Samo 1 'service' event je posle sinceTs (2024-11-01)
  assert.equal(r.data.total, 1, "samo 1 service event posle sinceTs");
  assert.equal(r.data.events[0].type, "service");
});

test("Events ?since futurni timestamp: vraca 0", async () => {
  const futureTs = new Date(Date.now() + 86400000).toISOString(); // sutra
  const r = await req("GET", `/vehicles/${vid}/events?since=${encodeURIComponent(futureTs)}`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 0, "nema evenata posle sutra");
});

test("Events ?since prazan: tretira se kao bez filtera", async () => {
  const r = await req("GET", `/vehicles/${vid}/events?since=`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 5, "prazno since = bez filtera");
});

// ─── GET /vehicles/:id/events ?app filter ─────────────────────────────────

test("Events ?app=aucore: default app — vraća sve (kreirana bez eksplicitnog app)", async () => {
  const r = await req("GET", `/vehicles/${vid}/events?app=aucore`, null, tok);
  assert.equal(r.status, 200);
  // Svi eventi su sa app='aucore' (default)
  assert.equal(r.data.total, 5, "svi eventi imaju app=aucore (default)");
});

test("Events ?app=driver: nema takvih evenata → 0", async () => {
  const r = await req("GET", `/vehicles/${vid}/events?app=driver`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 0, "nema driver evenata");
});

test("Events ?app=aucore + ?since: kombinacija radi", async () => {
  const r = await req("GET", `/vehicles/${vid}/events?app=aucore&since=${encodeURIComponent(sinceTs)}`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 3, "3 aucore eventa posle sinceTs");
});

// ─── GET /vehicles/:id/events — auth checks ───────────────────────────────

test("Events ?since: bez auth → 401", async () => {
  const r = await req("GET", `/vehicles/${vid}/events?since=${encodeURIComponent(sinceTs)}`);
  assert.equal(r.status, 401);
});

// ─── GET /vehicles/:id/reminders ?since filter ────────────────────────────

test("Reminders: ukupno 2 (oba posle sinceTs)", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 2, "ukupno 2 podsetnika");
});

test("Reminders ?since=sinceTs: vraća oba (kreirana posle)", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders?since=${encodeURIComponent(sinceTs)}`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 2, "oba podsetnika su posle sinceTs");
});

test("Reminders ?since futurni: vraća 0", async () => {
  const futureTs = new Date(Date.now() + 86400000).toISOString();
  const r = await req("GET", `/vehicles/${vid}/reminders?since=${encodeURIComponent(futureTs)}`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 0, "nema podsetnika u budućnosti");
});

test("Reminders ?since + ?done=1: kombinacija radi", async () => {
  // done=1 vraća sve (done + active), since filtrira po created_at
  const r = await req("GET", `/vehicles/${vid}/reminders?since=${encodeURIComponent(sinceTs)}&done=1`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 2, "?since + ?done=1 vraća 2");
});

test("Reminders bez ?since: vraća sve (2)", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 2);
});

// ─── Kompatibilnost sa postojećim filterima ────────────────────────────────

test("Events: ?limit + ?since zajedno rade", async () => {
  const r = await req("GET", `/vehicles/${vid}/events?since=${encodeURIComponent(sinceTs)}&limit=2`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.events.length, 2, "limit=2 uz since daje max 2 rezultata");
  assert.equal(r.data.total, 3, "total je bez limita = 3");
  assert.equal(r.data.limit, 2);
});

test("Events: ?offset + ?since zajedno rade", async () => {
  const r = await req("GET", `/vehicles/${vid}/events?since=${encodeURIComponent(sinceTs)}&offset=2`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.events.length, 1, "offset=2 uz 3 posle sinceTs = 1 preostao");
  assert.equal(r.data.total, 3);
});

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
