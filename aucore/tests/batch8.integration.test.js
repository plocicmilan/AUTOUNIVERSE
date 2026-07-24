"use strict";
/* Batch 8 Integration Tests
   Testira: PUT /vehicles/:vid/events/:eid (event update), GET /stats endpoints
   Run: node aucore/tests/batch8.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

const TMP_DB = path.join(os.tmpdir(), `aucore_b8_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

let server;
const PORT = 13404;

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
  console.log(`\n=== AU Core Batch 8 Integration Tests (port ${PORT}) ===\n`);

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
let tok = "";
let vid = 0;
let eid = 0;

// ─── Setup ─────────────────────────────────────────────────────────────────

test("Setup: register + login b8@test.com", async () => {
  await req("POST", "/auth/register", { email: "b8@test.com", password: "pass1234", name: "B8" });
  const r = await req("POST", "/auth/login", { email: "b8@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok = r.data.session;
});

test("Setup: kreiraj vozilo", async () => {
  const r = await req("POST", "/vehicles", { make: "Renault", model: "Clio", year: 2017 }, tok);
  assert.equal(r.status, 201);
  vid = r.data.id;
});

test("Setup: kreiraj event", async () => {
  const r = await req("POST", `/vehicles/${vid}/events`, {
    type: "service", event_date: "2024-03-15",
    data: { description: "Mali servis — ulje i filteri" }
  }, tok);
  assert.equal(r.status, 201);
  eid = r.data.id;
});

// ─── PUT /vehicles/:vid/events/:eid ────────────────────────────────────────

test("PUT event: bez auth → 401", async () => {
  const r = await req("PUT", `/vehicles/${vid}/events/${eid}`, { data: { description: "update" } });
  assert.equal(r.status, 401);
});

test("PUT event: prazno telo → 400", async () => {
  const r = await req("PUT", `/vehicles/${vid}/events/${eid}`, {}, tok);
  assert.equal(r.status, 400);
  assert.ok(r.data.error);
});

test("PUT event: update data (opis) → 200", async () => {
  const r = await req("PUT", `/vehicles/${vid}/events/${eid}`, {
    data: { description: "Korigovani opis servisa" }
  }, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test("PUT event: proveri da je opis promenjen", async () => {
  const r = await req("GET", `/vehicles/${vid}/events/${eid}`, null, tok);
  assert.equal(r.status, 200);
  const data = JSON.parse(r.data.data || "{}");
  assert.equal(data.description, "Korigovani opis servisa");
});

test("PUT event: update event_date → 200", async () => {
  const r = await req("PUT", `/vehicles/${vid}/events/${eid}`, { event_date: "2024-04-01" }, tok);
  assert.equal(r.status, 200);
});

test("PUT event: proveri da je datum promenjen", async () => {
  const r = await req("GET", `/vehicles/${vid}/events/${eid}`, null, tok);
  assert.equal(r.status, 200);
  assert.ok(r.data.event_date.startsWith("2024-04-01"));
});

test("PUT event: invalid type → 400", async () => {
  const r = await req("PUT", `/vehicles/${vid}/events/${eid}`, { type: "nepostojeci_tip" }, tok);
  assert.equal(r.status, 400);
});

test("PUT event: change type na oil_change → 200", async () => {
  const r = await req("PUT", `/vehicles/${vid}/events/${eid}`, { type: "oil_change" }, tok);
  assert.equal(r.status, 200);
});

test("PUT event: nepostojeći event → 404", async () => {
  const r = await req("PUT", `/vehicles/${vid}/events/99999`, { data: {} }, tok);
  assert.equal(r.status, 404);
});

// ─── GET /stats (AU Core) ─────────────────────────────────────────────────

test("GET /stats: vraća strukturu sa counts", async () => {
  const r = await req("GET", "/stats", null, "");
  assert.equal(r.status, 200);
  assert.ok(typeof r.data.users === "number", "mora imati users count");
  assert.ok(typeof r.data.vehicles === "number", "mora imati vehicles count");
  assert.ok(typeof r.data.events === "number", "mora imati events count");
  assert.ok(r.data.vehicles >= 1, "trebalo bi imati barem 1 vozilo");
  assert.ok(r.data.events >= 1, "trebalo bi imati barem 1 event");
});

test("GET /health: vraća 200 + status ok", async () => {
  const r = await req("GET", "/health", null, "");
  assert.equal(r.status, 200);
  assert.equal(r.data.status, "ok");
  assert.equal(r.data.db, "ok");
  assert.ok(typeof r.data.version === "string");
});

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
