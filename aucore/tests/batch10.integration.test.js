"use strict";
/* Batch 10 Integration Tests
   Testira: GET /vehicles/:id/events/summary, shared vehicles u GET /vehicles,
            auto-push scenario (events/batch), summary route ordering
   Run: node aucore/tests/batch10.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

const TMP_DB = path.join(os.tmpdir(), `aucore_b10_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

let server;
const PORT = 13406;

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
  console.log(`\n=== AU Core Batch 10 Integration Tests (port ${PORT}) ===\n`);

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
let vid2 = 0;

// ─── Setup ─────────────────────────────────────────────────────────────────

test("Setup: register + login b10a@test.com", async () => {
  await req("POST", "/auth/register", { email: "b10a@test.com", password: "pass1234", name: "B10A" });
  const r = await req("POST", "/auth/login", { email: "b10a@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok = r.data.session;
});

test("Setup: register + approve + login b10b@test.com", async () => {
  const regR = await req("POST", "/auth/register", { email: "b10b@test.com", password: "pass1234", name: "B10B" });
  await req("POST", `/admin/users/${regR.data.id}/approve`, null, tok);
  const r = await req("POST", "/auth/login", { email: "b10b@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok2 = r.data.session;
});

test("Setup: kreiraj vozilo A10 (b10a)", async () => {
  const r = await req("POST", "/vehicles", { make: "BMW", model: "320d", year: 2020 }, tok);
  assert.equal(r.status, 201);
  vid = r.data.id;
});

test("Setup: kreiraj vozilo B10 (b10b)", async () => {
  const r = await req("POST", "/vehicles", { make: "Audi", model: "A4", year: 2019 }, tok2);
  assert.equal(r.status, 201);
  vid2 = r.data.id;
});

test("Setup: dodaj 3 eventa na vozilo A10", async () => {
  await req("POST", `/vehicles/${vid}/events`, { type: "service",    event_date: "2024-01-15", data: { description: "Mali servis" } }, tok);
  await req("POST", `/vehicles/${vid}/events`, { type: "oil_change", event_date: "2024-03-20", data: { mileage_km: 75000 } }, tok);
  await req("POST", `/vehicles/${vid}/events`, { type: "service",    event_date: "2024-06-10", data: { description: "Veliki servis" } }, tok);
});

test("Setup: dodeli b10a pristup na vozilo B10", async () => {
  const r = await req("POST", "/grants", { grantee_email: "b10a@test.com", vehicle_id: vid2, role: "read" }, tok2);
  assert.equal(r.status, 201);
});

// ─── GET /vehicles/:id/events/summary ──────────────────────────────────────

test("Summary: bez auth → 401", async () => {
  const r = await req("GET", `/vehicles/${vid}/events/summary`);
  assert.equal(r.status, 401);
});

test("Summary: neovlašćen korisnik → 403", async () => {
  const r = await req("GET", `/vehicles/${vid}/events/summary`, null, tok2);
  assert.equal(r.status, 403);
});

test("Summary: vraća strukturu sa by_type, recent, total", async () => {
  const r = await req("GET", `/vehicles/${vid}/events/summary`, null, tok);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.by_type), "by_type mora biti array");
  assert.ok(Array.isArray(r.data.recent),  "recent mora biti array");
  assert.ok(typeof r.data.total === "number", "total mora biti number");
  assert.equal(r.data.total, 3, "mora imati 3 eventa");
});

test("Summary: by_type ima 2 tipa (service + oil_change)", async () => {
  const r = await req("GET", `/vehicles/${vid}/events/summary`, null, tok);
  assert.equal(r.data.by_type.length, 2);
  const types = r.data.by_type.map(t => t.type);
  assert.ok(types.includes("service"),    "mora imati service");
  assert.ok(types.includes("oil_change"), "mora imati oil_change");
});

test("Summary: service count = 2 (2 servisa)", async () => {
  const r = await req("GET", `/vehicles/${vid}/events/summary`, null, tok);
  const svc = r.data.by_type.find(t => t.type === "service");
  assert.ok(svc, "service mora biti u by_type");
  assert.equal(Number(svc.count), 2);
});

test("Summary: recent max 5 elemenata", async () => {
  const r = await req("GET", `/vehicles/${vid}/events/summary`, null, tok);
  assert.ok(r.data.recent.length <= 5);
  assert.equal(r.data.recent.length, 3); // imamo tačno 3
});

test("Summary: summary ruta ne konflikta sa /:eid ruta", async () => {
  // Verifikacija da /:eid ruta i dalje radi
  const r = await req("GET", `/vehicles/${vid}/events`, null, tok);
  assert.equal(r.status, 200);
  const eid = r.data.events[0].id;
  const r2 = await req("GET", `/vehicles/${vid}/events/${eid}`, null, tok);
  assert.equal(r2.status, 200);
  assert.ok(r2.data.id === eid);
});

// ─── GET /vehicles — shared array ──────────────────────────────────────────

test("GET /vehicles: b10a vidi shared vozilo (B10)", async () => {
  const r = await req("GET", "/vehicles", null, tok);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.owned),  "owned mora biti array");
  assert.ok(Array.isArray(r.data.shared), "shared mora biti array");
  assert.equal(r.data.owned.length,  1, "b10a ima 1 owned vozilo (A10)");
  assert.equal(r.data.shared.length, 1, "b10a ima 1 shared vozilo (B10)");
  assert.equal(r.data.shared[0].id,  vid2);
  assert.ok(r.data.shared[0].my_role, "my_role mora biti prisutan");
});

test("GET /vehicles: b10b vidi samo owned (A10 nije shared sa njim)", async () => {
  const r = await req("GET", "/vehicles", null, tok2);
  assert.equal(r.status, 200);
  assert.equal(r.data.owned.length,  1, "b10b ima 1 owned vozilo (B10)");
  assert.equal(r.data.shared.length, 0, "b10b nema shared vozila");
});

// ─── Summary za grantee ────────────────────────────────────────────────────

test("Summary: grantee (b10a) može čitati summary za shared vozilo (B10)", async () => {
  const r = await req("GET", `/vehicles/${vid2}/events/summary`, null, tok);
  assert.equal(r.status, 200);
  assert.ok(typeof r.data.total === "number");
});

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
