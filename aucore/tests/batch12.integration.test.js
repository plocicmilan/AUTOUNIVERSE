"use strict";
/* Batch 12 Integration Tests
   Testira: POST /vehicles/:vid/reminders/batch, GET /grants/mine,
            PUT /vehicles/:vid/reminders/:rid (done flow), reminder batch ordering
   Run: node aucore/tests/batch12.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

const TMP_DB = path.join(os.tmpdir(), `aucore_b12_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

let server;
const PORT = 13408;

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
  console.log(`\n=== AU Core Batch 12 Integration Tests (port ${PORT}) ===\n`);

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
let rid  = 0;

// ─── Setup ─────────────────────────────────────────────────────────────────

test("Setup: register + login b12a@test.com", async () => {
  await req("POST", "/auth/register", { email: "b12a@test.com", password: "pass1234", name: "B12A" });
  const r = await req("POST", "/auth/login", { email: "b12a@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok = r.data.session;
});

test("Setup: register + approve + login b12b@test.com", async () => {
  const regR = await req("POST", "/auth/register", { email: "b12b@test.com", password: "pass1234", name: "B12B" });
  await req("POST", `/admin/users/${regR.data.id}/approve`, null, tok);
  const r = await req("POST", "/auth/login", { email: "b12b@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok2 = r.data.session;
});

test("Setup: kreiraj vozilo A12 (b12a)", async () => {
  const r = await req("POST", "/vehicles", { make: "VW", model: "Golf", year: 2018 }, tok);
  assert.equal(r.status, 201);
  vid = r.data.id;
});

test("Setup: kreiraj vozilo B12 (b12b)", async () => {
  const r = await req("POST", "/vehicles", { make: "Peugeot", model: "308", year: 2017 }, tok2);
  assert.equal(r.status, 201);
  vid2 = r.data.id;
});

test("Setup: dodeli b12b write pristup na vozilo A12", async () => {
  const r = await req("POST", "/grants", { grantee_email: "b12b@test.com", vehicle_id: vid, role: "write" }, tok);
  assert.equal(r.status, 201);
});

// ─── POST /vehicles/:vid/reminders/batch ────────────────────────────────────

test("Batch: bez auth → 401", async () => {
  const r = await req("POST", `/vehicles/${vid}/reminders/batch`, { reminders: [{ title: "T", due_date: "2025-01-01" }] });
  assert.equal(r.status, 401);
});

test("Batch: prazan niz → 400", async () => {
  const r = await req("POST", `/vehicles/${vid}/reminders/batch`, { reminders: [] }, tok);
  assert.equal(r.status, 400);
});

test("Batch: neovlašćen (read-only nema write) → OK sa write grantom", async () => {
  // b12b ima write na vid — mora da prođe
  const r = await req("POST", `/vehicles/${vid}/reminders/batch`, {
    reminders: [
      { title: "Ulje", due_date: "2025-03-01", local_id: "loc_1" },
      { title: "Guma", due_mileage_km: 80000, local_id: "loc_2" },
      { title: "Filteri", due_date: "2025-06-01", due_mileage_km: 85000, local_id: "loc_3" },
    ]
  }, tok2);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.synced));
  assert.equal(r.data.synced.length, 3);
  assert.ok(r.data.synced[0].id, "mora imati server id");
  assert.equal(r.data.synced[0].local_id, "loc_1");
  rid = r.data.synced[0].id;
});

test("Batch: bez pristupa → 403", async () => {
  const r = await req("POST", `/vehicles/${vid2}/reminders/batch`, {
    reminders: [{ title: "X", due_date: "2025-01-01" }]
  }, tok);
  assert.equal(r.status, 403);
});

test("Batch: item bez title → error u synced nizu", async () => {
  const r = await req("POST", `/vehicles/${vid}/reminders/batch`, {
    reminders: [
      { due_date: "2025-01-01", local_id: "err_1" },  // nema title
      { title: "OK item", due_date: "2025-02-01", local_id: "ok_1" },
    ]
  }, tok);
  assert.equal(r.status, 200);
  const synced = r.data.synced;
  assert.equal(synced.length, 2);
  assert.ok(synced[0].error, "item bez title mora imati error");
  assert.equal(synced[0].local_id, "err_1");
  assert.ok(synced[1].id, "validan item mora imati id");
});

test("Batch: podsetnici su dostupni u GET", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders?done=1`, null, tok);
  assert.equal(r.status, 200);
  // 3 iz prvog batch + 1 validan iz drugog = 4
  assert.ok(r.data.reminders.length >= 4, "mora imati barem 4 podsetnika");
});

test("Batch: done=true u batch → podsetnik je odmah završen", async () => {
  const r = await req("POST", `/vehicles/${vid}/reminders/batch`, {
    reminders: [{ title: "Već završen", due_date: "2024-01-01", done: true, local_id: "done_1" }]
  }, tok);
  assert.equal(r.status, 200);
  const newId = r.data.synced[0].id;

  const r2 = await req("GET", `/vehicles/${vid}/reminders?done=1`, null, tok);
  const doneRem = r2.data.reminders.find(function (x) { return x.id === newId; });
  assert.ok(doneRem, "mora biti u bazi");
  assert.equal(doneRem.done, 1);
});

// ─── GET /grants/mine ───────────────────────────────────────────────────────

test("Grants mine: bez auth → 401", async () => {
  const r = await req("GET", "/grants/mine");
  assert.equal(r.status, 401);
});

test("Grants mine: b12b vidi grant za vozilo A12", async () => {
  const r = await req("GET", "/grants/mine", null, tok2);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.grants));
  assert.equal(r.data.grants.length, 1);
  const g = r.data.grants[0];
  assert.equal(g.vehicle_id, vid);
  assert.equal(g.role, "write");
  assert.ok(g.make, "mora imati make vozila");
  assert.ok(g.grantor_name, "mora imati ime vlasnika");
  assert.ok(g.grantor_email, "mora imati email vlasnika");
});

test("Grants mine: b12a nema primljenih grantova → prazna lista", async () => {
  const r = await req("GET", "/grants/mine", null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.grants.length, 0);
});

test("Grants mine: posle revoke — ne pojavljuje se više", async () => {
  // Opozovi grant
  await req("DELETE", "/grants", { grantee_email: "b12b@test.com", vehicle_id: vid }, tok);
  const r = await req("GET", "/grants/mine", null, tok2);
  assert.equal(r.status, 200);
  assert.equal(r.data.grants.length, 0, "posle revoke ne sme biti grantova");
});

// ─── Batch route ne konflikta sa single ─────────────────────────────────────

test("Route: /batch ne konflikta sa /:rid (PUT/DELETE na :rid i dalje radi)", async () => {
  // PUT na rid koji postoji (kreiran u batch testu)
  const r = await req("PUT", `/vehicles/${vid}/reminders/${rid}`, { done: false }, tok);
  assert.equal(r.status, 200, "PUT /:rid mora raditi posle registracije /batch route");
});

test("Route: GET /reminders i dalje radi (batch nije pokrio GET)", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders`, null, tok);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.reminders));
});

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
