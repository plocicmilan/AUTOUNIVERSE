"use strict";
/* Batch 11 Integration Tests
   Testira: POST/GET/PUT/DELETE /vehicles/:vid/reminders
            grantee pristup podsetnicima, PUT done flag
   Run: node aucore/tests/batch11.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

const TMP_DB = path.join(os.tmpdir(), `aucore_b11_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

let server;
const PORT = 13407;

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
  console.log(`\n=== AU Core Batch 11 Integration Tests (port ${PORT}) ===\n`);

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

test("Setup: register + login b11a@test.com", async () => {
  await req("POST", "/auth/register", { email: "b11a@test.com", password: "pass1234", name: "B11A" });
  const r = await req("POST", "/auth/login", { email: "b11a@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok = r.data.session;
});

test("Setup: register + approve + login b11b@test.com", async () => {
  const regR = await req("POST", "/auth/register", { email: "b11b@test.com", password: "pass1234", name: "B11B" });
  await req("POST", `/admin/users/${regR.data.id}/approve`, null, tok);
  const r = await req("POST", "/auth/login", { email: "b11b@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok2 = r.data.session;
});

test("Setup: kreiraj vozilo A11 (b11a)", async () => {
  const r = await req("POST", "/vehicles", { make: "Toyota", model: "Corolla", year: 2021 }, tok);
  assert.equal(r.status, 201);
  vid = r.data.id;
});

test("Setup: kreiraj vozilo B11 (b11b)", async () => {
  const r = await req("POST", "/vehicles", { make: "Honda", model: "Civic", year: 2020 }, tok2);
  assert.equal(r.status, 201);
  vid2 = r.data.id;
});

test("Setup: dodeli b11a pristup na vozilo B11 (read)", async () => {
  const r = await req("POST", "/grants", { grantee_email: "b11a@test.com", vehicle_id: vid2, role: "read" }, tok2);
  assert.equal(r.status, 201);
});

// ─── POST /vehicles/:vid/reminders ─────────────────────────────────────────

test("Reminders POST: bez auth → 401", async () => {
  const r = await req("POST", `/vehicles/${vid}/reminders`, { title: "Test", due_date: "2025-12-01" });
  assert.equal(r.status, 401);
});

test("Reminders POST: bez title → 400", async () => {
  const r = await req("POST", `/vehicles/${vid}/reminders`, { due_date: "2025-12-01" }, tok);
  assert.equal(r.status, 400);
  assert.ok(r.data.error);
});

test("Reminders POST: bez due_date i due_mileage_km → 400", async () => {
  const r = await req("POST", `/vehicles/${vid}/reminders`, { title: "Ulje" }, tok);
  assert.equal(r.status, 400);
  assert.ok(r.data.error);
});

test("Reminders POST: neovlašćen korisnik → 403", async () => {
  const r = await req("POST", `/vehicles/${vid}/reminders`, { title: "Ulje", due_date: "2025-12-01" }, tok2);
  assert.equal(r.status, 403);
});

test("Reminders POST: vlasnik kreira due_date → 201", async () => {
  const r = await req("POST", `/vehicles/${vid}/reminders`, { title: "Servis motora", due_date: "2025-06-15" }, tok);
  assert.equal(r.status, 201);
  assert.ok(r.data.id);
  rid = r.data.id;
});

test("Reminders POST: vlasnik kreira due_km → 201", async () => {
  const r = await req("POST", `/vehicles/${vid}/reminders`, { title: "Menjanje ulja", due_mileage_km: 80000 }, tok);
  assert.equal(r.status, 201);
  assert.ok(r.data.id);
});

test("Reminders POST: vlasnik kreira oba (date + km) → 201", async () => {
  const r = await req("POST", `/vehicles/${vid}/reminders`, { title: "Registracija", due_date: "2025-09-01", due_mileage_km: 90000 }, tok);
  assert.equal(r.status, 201);
});

// ─── GET /vehicles/:vid/reminders ──────────────────────────────────────────

test("Reminders GET: bez auth → 401", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders`);
  assert.equal(r.status, 401);
});

test("Reminders GET: neovlašćen → 403", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders`, null, tok2);
  assert.equal(r.status, 403);
});

test("Reminders GET: vlasnik vidi sve aktivne → 200", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders`, null, tok);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.reminders));
  assert.equal(r.data.reminders.length, 3, "mora imati 3 podsetnika");
});

test("Reminders GET: struktura zapisa", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders`, null, tok);
  const first = r.data.reminders[0];
  assert.ok(first.id, "mora imati id");
  assert.ok(first.title, "mora imati title");
  assert.ok(first.author_name, "mora imati author_name");
  assert.equal(first.done, 0, "done mora biti 0");
});

test("Reminders GET: grantee (read) može čitati podsetnik → 200", async () => {
  await req("POST", `/vehicles/${vid2}/reminders`, { title: "Guma", due_date: "2025-11-01" }, tok2);
  const r = await req("GET", `/vehicles/${vid2}/reminders`, null, tok);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.reminders));
});

// ─── PUT /vehicles/:vid/reminders/:rid ─────────────────────────────────────

test("Reminders PUT: bez auth → 401", async () => {
  const r = await req("PUT", `/vehicles/${vid}/reminders/${rid}`, { title: "Novi naziv" });
  assert.equal(r.status, 401);
});

test("Reminders PUT: neovlašćen → 403", async () => {
  const r = await req("PUT", `/vehicles/${vid}/reminders/${rid}`, { title: "Novi naziv" }, tok2);
  assert.equal(r.status, 403);
});

test("Reminders PUT: ažuriraj title → 200", async () => {
  const r = await req("PUT", `/vehicles/${vid}/reminders/${rid}`, { title: "Servis motor (ažurirano)" }, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test("Reminders PUT: označi done=true → 200", async () => {
  const r = await req("PUT", `/vehicles/${vid}/reminders/${rid}`, { done: true }, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test("Reminders GET: done=0 filter — dovršeni nisu u listi", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders`, null, tok);
  assert.equal(r.status, 200);
  const found = r.data.reminders.find(function (x) { return x.id === rid; });
  assert.ok(!found, "dovršeni podsetnik ne sme biti u default listi");
  assert.equal(r.data.reminders.length, 2);
});

test("Reminders GET: done=1 filter — vidi i dovršene", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders?done=1`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.reminders.length, 3);
  const doneRem = r.data.reminders.find(function (x) { return x.id === rid; });
  assert.ok(doneRem, "dovršeni podsetnik mora biti u done=1 listi");
  assert.equal(doneRem.done, 1);
});

// ─── DELETE /vehicles/:vid/reminders/:rid ──────────────────────────────────

test("Reminders DELETE: bez auth → 401", async () => {
  const r = await req("DELETE", `/vehicles/${vid}/reminders/${rid}`);
  assert.equal(r.status, 401);
});

test("Reminders DELETE: neovlašćen → 403", async () => {
  const r = await req("DELETE", `/vehicles/${vid}/reminders/${rid}`, null, tok2);
  assert.equal(r.status, 403);
});

test("Reminders DELETE: vlasnik briše → 200", async () => {
  const r = await req("DELETE", `/vehicles/${vid}/reminders/${rid}`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test("Reminders DELETE: dvaput → 404", async () => {
  const r = await req("DELETE", `/vehicles/${vid}/reminders/${rid}`, null, tok);
  assert.equal(r.status, 404);
});

test("Reminders GET: posle brisanja ostaju 2", async () => {
  const r = await req("GET", `/vehicles/${vid}/reminders?done=1`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.reminders.length, 2);
});

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
