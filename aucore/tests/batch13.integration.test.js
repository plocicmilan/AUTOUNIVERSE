"use strict";
/* Batch 13 Integration Tests
   Testira: GET /vehicles/:id/mileage, POST /auth/refresh,
            mileage null kad nema evenata sa km, grantee pristup mileage-u
   Run: node aucore/tests/batch13.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

const TMP_DB = path.join(os.tmpdir(), `aucore_b13_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

let server;
const PORT = 13409;

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
  console.log(`\n=== AU Core Batch 13 Integration Tests (port ${PORT}) ===\n`);

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

test("Setup: register + login b13a@test.com", async () => {
  await req("POST", "/auth/register", { email: "b13a@test.com", password: "pass1234", name: "B13A" });
  const r = await req("POST", "/auth/login", { email: "b13a@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok = r.data.session;
});

test("Setup: register + approve + login b13b@test.com", async () => {
  const regR = await req("POST", "/auth/register", { email: "b13b@test.com", password: "pass1234", name: "B13B" });
  await req("POST", `/admin/users/${regR.data.id}/approve`, null, tok);
  const r = await req("POST", "/auth/login", { email: "b13b@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok2 = r.data.session;
});

test("Setup: kreiraj vozilo (b13a)", async () => {
  const r = await req("POST", "/vehicles", { make: "Skoda", model: "Octavia", year: 2019 }, tok);
  assert.equal(r.status, 201);
  vid = r.data.id;
});

test("Setup: dodeli b13b read pristup", async () => {
  const r = await req("POST", "/grants", { grantee_email: "b13b@test.com", vehicle_id: vid, role: "read" }, tok);
  assert.equal(r.status, 201);
});

// ─── GET /vehicles/:id/mileage — prazno vozilo ─────────────────────────────

test("Mileage: bez auth → 401", async () => {
  const r = await req("GET", `/vehicles/${vid}/mileage`);
  assert.equal(r.status, 401);
});

test("Mileage: neovlašćen → 403", async () => {
  const regR = await req("POST", "/auth/register", { email: "b13c@test.com", password: "pass1234", name: "B13C" });
  await req("POST", `/admin/users/${regR.data.id}/approve`, null, tok);
  const rLog = await req("POST", "/auth/login", { email: "b13c@test.com", password: "pass1234" });
  // b13c nema grant na vid
  const r = await req("GET", `/vehicles/${vid}/mileage`, null, rLog.data.session);
  assert.equal(r.status, 403);
});

test("Mileage: novo vozilo — null vrijednosti", async () => {
  const r = await req("GET", `/vehicles/${vid}/mileage`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.mileage_km, null, "mora biti null kad nema evenata");
  assert.equal(r.data.event_date, null);
});

// ─── GET /vehicles/:id/mileage — sa eventima ───────────────────────────────

test("Setup: dodaj event sa mileage_km=75000", async () => {
  const r = await req("POST", `/vehicles/${vid}/events`, {
    type: "oil_change", event_date: "2024-03-01",
    data: { mileage_km: 75000, description: "Ulje" }
  }, tok);
  assert.equal(r.status, 201);
});

test("Setup: dodaj event sa mileage_km=80000 (noviji)", async () => {
  const r = await req("POST", `/vehicles/${vid}/events`, {
    type: "service", event_date: "2024-09-15",
    data: { mileage_km: 80000, description: "Veliki servis" }
  }, tok);
  assert.equal(r.status, 201);
});

test("Setup: dodaj event bez mileage (ne treba da utiče)", async () => {
  const r = await req("POST", `/vehicles/${vid}/events`, {
    type: "note", event_date: "2024-10-01",
    data: { description: "Beleška bez km" }
  }, tok);
  assert.equal(r.status, 201);
});

test("Mileage: vraća poslednju poznatu km = 80000", async () => {
  const r = await req("GET", `/vehicles/${vid}/mileage`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.mileage_km, 80000);
  assert.ok(r.data.event_date, "mora imati event_date");
  assert.ok(r.data.event_id, "mora imati event_id");
  assert.equal(r.data.event_type, "service");
});

test("Mileage: grantee (read) može čitati → 200", async () => {
  const r = await req("GET", `/vehicles/${vid}/mileage`, null, tok2);
  assert.equal(r.status, 200);
  assert.equal(r.data.mileage_km, 80000);
});

test("Mileage: event_date odgovara datumu novijeg eventa", async () => {
  const r = await req("GET", `/vehicles/${vid}/mileage`, null, tok);
  assert.ok(r.data.event_date.startsWith("2024-09-15"), "mora biti datum service eventa");
});

test("Mileage: ne bira stariji event sa višim km ako noviji ima niži km", async () => {
  // Dodaj event sa višim km ali STARIJIM datumom
  await req("POST", `/vehicles/${vid}/events`, {
    type: "mileage", event_date: "2023-01-01",
    data: { mileage_km: 95000 }
  }, tok);
  const r = await req("GET", `/vehicles/${vid}/mileage`, null, tok);
  // Treba da vrati najnoviji po datumu, ne najveći km
  assert.equal(r.data.mileage_km, 80000, "uzima poslednji po datumu, ne max km");
});

// ─── POST /auth/refresh ─────────────────────────────────────────────────────

test("Auth refresh: bez auth → 401", async () => {
  const r = await req("POST", "/auth/refresh");
  assert.equal(r.status, 401);
});

test("Auth refresh: sa validnom sesijom → 200 + novi expires_at", async () => {
  const r = await req("POST", "/auth/refresh", null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.ok(r.data.expires_at, "mora imati novi expires_at");
  const exp = new Date(r.data.expires_at);
  const now = new Date();
  assert.ok(exp > now, "expires_at mora biti u budućnosti");
  // Mora biti ~72h u budućnosti (tolerancija 1 min)
  const diffH = (exp - now) / 3600000;
  assert.ok(diffH > 71 && diffH <= 72.1, "produžava za ~72h, diff=" + diffH.toFixed(2));
});

test("Auth refresh: token ostaje isti (ne menja session id)", async () => {
  const r1 = await req("POST", "/auth/refresh", null, tok);
  // Isti token i dalje radi
  const r2 = await req("GET", "/auth/me", null, tok);
  assert.equal(r2.status, 200);
  assert.ok(r2.data.email, "token ostaje validan posle refresh-a");
});

// ─── Mileage + events/summary koegzistiraju ────────────────────────────────

test("Route: /mileage ne konflikta sa /events i /events/summary", async () => {
  const [rm, rs, re] = await Promise.all([
    req("GET", `/vehicles/${vid}/mileage`, null, tok),
    req("GET", `/vehicles/${vid}/events/summary`, null, tok),
    req("GET", `/vehicles/${vid}/events`, null, tok),
  ]);
  assert.equal(rm.status, 200, "/mileage mora biti 200");
  assert.equal(rs.status, 200, "/events/summary mora biti 200");
  assert.equal(re.status, 200, "/events mora biti 200");
  assert.ok(typeof rm.data.mileage_km !== "undefined", "mileage response ima mileage_km");
  assert.ok(Array.isArray(rs.data.by_type), "summary ima by_type");
  assert.ok(Array.isArray(re.data.events), "events lista ima events");
});

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
