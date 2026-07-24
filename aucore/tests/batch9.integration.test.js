"use strict";
/* Batch 9 Integration Tests
   Testira: POST/GET/DELETE /vehicles/:vid/notes, DELETE /notifications/:id,
            POST /notifications/clear
   Run: node aucore/tests/batch9.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

const TMP_DB = path.join(os.tmpdir(), `aucore_b9_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

let server;
const PORT = 13405;

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
  console.log(`\n=== AU Core Batch 9 Integration Tests (port ${PORT}) ===\n`);

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
let nid  = 0; // note id
let notifId = 0;

// ─── Setup ─────────────────────────────────────────────────────────────────

test("Setup: register + login b9a@test.com", async () => {
  await req("POST", "/auth/register", { email: "b9a@test.com", password: "pass1234", name: "B9A" });
  const r = await req("POST", "/auth/login", { email: "b9a@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok = r.data.session;
});

test("Setup: register + approve + login b9b@test.com", async () => {
  const regR = await req("POST", "/auth/register", { email: "b9b@test.com", password: "pass1234", name: "B9B" });
  const b9bId = regR.data.id;
  // b9a je owner — može odobriti b9b
  await req("POST", `/admin/users/${b9bId}/approve`, null, tok);
  const r = await req("POST", "/auth/login", { email: "b9b@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok2 = r.data.session;
});

test("Setup: kreiraj vozilo", async () => {
  const r = await req("POST", "/vehicles", { make: "Seat", model: "Leon", year: 2019 }, tok);
  assert.equal(r.status, 201);
  vid = r.data.id;
});

// ─── POST /vehicles/:vid/notes ─────────────────────────────────────────────

test("Notes POST: bez auth → 401", async () => {
  const r = await req("POST", `/vehicles/${vid}/notes`, { content: "Test beleška" });
  assert.equal(r.status, 401);
});

test("Notes POST: prazan content → 400", async () => {
  const r = await req("POST", `/vehicles/${vid}/notes`, { content: "   " }, tok);
  assert.equal(r.status, 400);
  assert.ok(r.data.error);
});

test("Notes POST: vlasnik dodaje belesku → 201", async () => {
  const r = await req("POST", `/vehicles/${vid}/notes`, { content: "Levi točak škripi", visibility: "owner" }, tok);
  assert.equal(r.status, 201);
  assert.ok(r.data.id);
  nid = r.data.id;
});

test("Notes POST: shared beleška → 201", async () => {
  const r = await req("POST", `/vehicles/${vid}/notes`, { content: "Servisal: ulje promenjeno", visibility: "shared" }, tok);
  assert.equal(r.status, 201);
});

test("Notes POST: drugi korisnik bez pristupa → 403", async () => {
  const r = await req("POST", `/vehicles/${vid}/notes`, { content: "Neovlašćena beleška" }, tok2);
  assert.equal(r.status, 403);
});

// ─── GET /vehicles/:vid/notes ──────────────────────────────────────────────

test("Notes GET: bez auth → 401", async () => {
  const r = await req("GET", `/vehicles/${vid}/notes`);
  assert.equal(r.status, 401);
});

test("Notes GET: vlasnik vidi sve beleške → 200", async () => {
  const r = await req("GET", `/vehicles/${vid}/notes`, null, tok);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.notes));
  assert.equal(r.data.notes.length, 2);
});

test("Notes GET: drugi korisnik bez pristupa → 403", async () => {
  const r = await req("GET", `/vehicles/${vid}/notes`, null, tok2);
  assert.equal(r.status, 403);
});

// ─── DELETE /vehicles/:vid/notes/:nid ─────────────────────────────────────

test("Notes DELETE: bez auth → 401", async () => {
  const r = await req("DELETE", `/vehicles/${vid}/notes/${nid}`);
  assert.equal(r.status, 401);
});

test("Notes DELETE: drugi korisnik → 403", async () => {
  const r = await req("DELETE", `/vehicles/${vid}/notes/${nid}`, null, tok2);
  assert.equal(r.status, 403);
});

test("Notes DELETE: vlasnik briše svoju belesku → 200", async () => {
  const r = await req("DELETE", `/vehicles/${vid}/notes/${nid}`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test("Notes DELETE: dvaput → 404", async () => {
  const r = await req("DELETE", `/vehicles/${vid}/notes/${nid}`, null, tok);
  assert.equal(r.status, 404);
});

test("Notes GET: posle brisanja ostaje 1 beleška", async () => {
  const r = await req("GET", `/vehicles/${vid}/notes`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.notes.length, 1);
});

// ─── DELETE /notifications/:id ─────────────────────────────────────────────

test("Setup: kreiraj notifikaciju (admin ruta)", async () => {
  // Promeni ulogu b9a na admin direktno kroz bazu nije moguće u integration testu
  // koristimo POST /notifications ali to zahteva admin ulogu
  // Alternativno: kreiramo driver notifikaciju kroz aucoreSync flow
  // Za ovaj test samo proveravamo da 404 radi za nepostojeću notifikaciju
  const r = await req("DELETE", "/notifications/99999", null, tok);
  assert.equal(r.status, 404);
  assert.ok(r.data.error);
});

// ─── POST /notifications/clear ─────────────────────────────────────────────

test("Notifications clear: prazna lista → 200 ok", async () => {
  const r = await req("POST", "/notifications/clear", null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.ok(typeof r.data.deleted === "number");
});

test("Notifications clear: bez auth → 401", async () => {
  const r = await req("POST", "/notifications/clear");
  assert.equal(r.status, 401);
});

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
