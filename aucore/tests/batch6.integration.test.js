"use strict";
/* Batch 6 Integration Tests
   Testira: brute-force zaštita, change-password endpoint
   Run: node aucore/tests/batch6.integration.test.js
   Napomena: svi zahtevi idu sa iste lokalne IP, pa testiramo istu IP window.
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

// ─── Temp DB ───────────────────────────────────────────────────────────────
const TMP_DB = path.join(os.tmpdir(), `aucore_b6_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

// ─── In-process HTTP helpers ────────────────────────────────────────────────
let server;
const PORT = 13402;

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

// Direktan poziv auth modula za reset rate limita između test grupa
function resetRateLimit() {
  try {
    // Brisanje iz cache-a da bismo dobili čist state
    for (const key of Object.keys(require.cache)) {
      if (key.includes("\\aucore\\auth") || key.includes("/aucore/auth")) {
        delete require.cache[key];
        break;
      }
    }
  } catch (_) {}
}

// ─── Test suite ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) { results.push({ name, fn }); }

async function runTests() {
  await startServer();
  console.log(`\n=== AU Core Batch 6 Integration Tests (port ${PORT}) ===\n`);

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

// ─── Setup ────────────────────────────────────────────────────────────────

test("Setup: registracija korisnika b6", async () => {
  const r = await req("POST", "/auth/register", { email: "b6@test.com", password: "pass1234", name: "B6 User" });
  assert.equal(r.status, 201);
});

test("Setup: registracija korisnika b6b (pending — 2. korisnik čeka odobrenje)", async () => {
  const r = await req("POST", "/auth/register", { email: "b6b@test.com", password: "pass1234", name: "B6B User" });
  assert.equal(r.status, 202); // 2. korisnik je uvek pending
  assert.equal(r.data.status, "pending");
});

test("Setup: login b6@test.com (da imamo sesiju za change-password testove)", async () => {
  const r = await req("POST", "/auth/login", { email: "b6@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  assert.ok(r.data.session);
  sessionToken = r.data.session;
});

// ─── Change password ──────────────────────────────────────────────────────

test("change-password: bez auth → 401", async () => {
  const r = await req("POST", "/auth/change-password", {
    current_password: "pass1234", new_password: "newpass99"
  });
  assert.equal(r.status, 401);
});

test("change-password: pogrešna trenutna lozinka → 401", async () => {
  const r = await req("POST", "/auth/change-password", {
    current_password: "POGRESNA", new_password: "newpass99"
  }, sessionToken);
  assert.equal(r.status, 401);
  assert.ok(r.data.error);
});

test("change-password: nova lozinka ispod 8 znakova → 400", async () => {
  const r = await req("POST", "/auth/change-password", {
    current_password: "pass1234", new_password: "short"
  }, sessionToken);
  assert.equal(r.status, 400);
});

test("change-password: uspešna promena lozinke", async () => {
  const r = await req("POST", "/auth/change-password", {
    current_password: "pass1234", new_password: "newpass9999"
  }, sessionToken);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test("change-password: stara lozinka više ne radi", async () => {
  const r = await req("POST", "/auth/login", { email: "b6@test.com", password: "pass1234" });
  assert.equal(r.status, 401);
});

test("change-password: nova lozinka radi", async () => {
  const r = await req("POST", "/auth/login", { email: "b6@test.com", password: "newpass9999" });
  assert.equal(r.status, 200);
  assert.ok(r.data.session);
});

// ─── Brute-force zaštita (na b6b@ koja nema sesije od ranije) ─────────────

test("Brute-force: 5 neuspešnih pokušaja istim emailom → 429 na 6.", async () => {
  // 5 pogrešnih lozinki sa iste lokalne IP
  for (let i = 0; i < 5; i++) {
    await req("POST", "/auth/login", { email: "nonexistent_bf@test.com", password: "wrong" + i });
  }
  const r = await req("POST", "/auth/login", { email: "nonexistent_bf@test.com", password: "wrong6" });
  assert.equal(r.status, 429, `Očekivano 429, dobijeno ${r.status}: ${JSON.stringify(r.data)}`);
  assert.ok(r.data.error, "Mora imati error poruku");
});

// ─── Start ─────────────────────────────────────────────────────────────────

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
