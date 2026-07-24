"use strict";
/* Batch 7 Integration Tests
   Testira: PUT /vehicles/:id, PUT /auth/me (profile update)
   Run: node aucore/tests/batch7.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

// ─── Temp DB ───────────────────────────────────────────────────────────────
const TMP_DB = path.join(os.tmpdir(), `aucore_b7_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

// ─── In-process HTTP helpers ────────────────────────────────────────────────
let server;
const PORT = 13403;

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
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: {}, headers: res.headers });
        }
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

// ─── Test suite ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) { results.push({ name, fn }); }

async function runTests() {
  await startServer();
  console.log(`\n=== AU Core Batch 7 Integration Tests (port ${PORT}) ===\n`);

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

// ─── Shared state ─────────────────────────────────────────────────────────
let sessionToken = "";
let vehicleId    = 0;

// ─── Setup ────────────────────────────────────────────────────────────────

test("Setup: registracija i login b7@test.com", async () => {
  const r = await req("POST", "/auth/register", { email: "b7@test.com", password: "pass1234", name: "B7 User" });
  assert.equal(r.status, 201);
  const r2 = await req("POST", "/auth/login", { email: "b7@test.com", password: "pass1234" });
  assert.equal(r2.status, 200);
  assert.ok(r2.data.session);
  sessionToken = r2.data.session;
});

test("Setup: kreiraj vozilo", async () => {
  const r = await req("POST", "/vehicles", { make: "VW", model: "Golf", year: 2018, plate: "NI-100-AA" }, sessionToken);
  assert.equal(r.status, 201);
  assert.ok(r.data.id);
  vehicleId = r.data.id;
});

// ─── PUT /vehicles/:id ───────────────────────────────────────────────────

test("PUT /vehicles/:id: bez auth → 401", async () => {
  const r = await req("PUT", `/vehicles/${vehicleId}`, { make: "BMW" });
  assert.equal(r.status, 401);
});

test("PUT /vehicles/:id: nema polja → 400", async () => {
  const r = await req("PUT", `/vehicles/${vehicleId}`, {}, sessionToken);
  assert.equal(r.status, 400);
  assert.ok(r.data.error);
});

test("PUT /vehicles/:id: update make + plate → 200", async () => {
  const r = await req("PUT", `/vehicles/${vehicleId}`, { make: "Skoda", plate: "NI-200-BB" }, sessionToken);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test("PUT /vehicles/:id: proveri da su izmene sačuvane", async () => {
  const r = await req("GET", `/vehicles/${vehicleId}`, null, sessionToken);
  assert.equal(r.status, 200);
  assert.equal(r.data.vehicle.make, "Skoda");
  assert.equal(r.data.vehicle.plate, "NI-200-BB");
  assert.equal(r.data.vehicle.model, "Golf", "model mora ostati nepromenjen");
});

test("PUT /vehicles/:id: update year + vin → 200", async () => {
  const r = await req("PUT", `/vehicles/${vehicleId}`, { year: 2019, vin: "WVWZZZ1KZAW123456" }, sessionToken);
  assert.equal(r.status, 200);
});

test("PUT /vehicles/:id: nepostojeće vozilo → 404", async () => {
  const r = await req("PUT", "/vehicles/99999", { make: "Toyota" }, sessionToken);
  assert.equal(r.status, 404);
});

// ─── PUT /auth/me ────────────────────────────────────────────────────────

test("PUT /auth/me: bez auth → 401", async () => {
  const r = await req("PUT", "/auth/me", { name: "Novo Ime" });
  assert.equal(r.status, 401);
});

test("PUT /auth/me: prazno telo → 400", async () => {
  const r = await req("PUT", "/auth/me", {}, sessionToken);
  assert.equal(r.status, 400);
});

test("PUT /auth/me: update name → 200 + /auth/me vraća novo ime", async () => {
  const r = await req("PUT", "/auth/me", { name: "B7 Ažurirani" }, sessionToken);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  const r2 = await req("GET", "/auth/me", null, sessionToken);
  assert.equal(r2.status, 200);
  assert.equal(r2.data.name, "B7 Ažurirani");
});

test("PUT /auth/me: update phone → 200", async () => {
  const r = await req("PUT", "/auth/me", { phone: "+381601234567" }, sessionToken);
  assert.equal(r.status, 200);
});

// ─── Start ─────────────────────────────────────────────────────────────────

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
