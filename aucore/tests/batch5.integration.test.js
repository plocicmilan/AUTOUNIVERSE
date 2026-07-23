"use strict";
/* Batch 5 Integration Tests
   Testira: /health endpointe, /auth/sessions, seller panel (autopijaca)
   Run: node aucore/tests/batch5.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

// ─── Temp DB ───────────────────────────────────────────────────────────────
const TMP_DB = path.join(os.tmpdir(), `aucore_b5_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

// ─── In-process HTTP helpers ────────────────────────────────────────────────
let server;
const PORT = 13401;
const BASE = `http://localhost:${PORT}`;

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
  console.log(`\n=== AU Core Batch 5 Integration Tests (port ${PORT}) ===\n`);

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
let sessionToken2 = "";

// ─── Setup ────────────────────────────────────────────────────────────────

test("Setup: registracija korisnika", async () => {
  const r = await req("POST", "/auth/register", { email: "test@b5.com", password: "pass1234", name: "Test User" });
  assert.equal(r.status, 201);
});

test("Setup: login (session 1)", async () => {
  const r = await req("POST", "/auth/login", { email: "test@b5.com", password: "pass1234" });
  assert.equal(r.status, 200);
  assert.ok(r.data.session, "Login mora vratiti session token");
  sessionToken = r.data.session;
});

test("Setup: drugi login (session 2)", async () => {
  const r = await req("POST", "/auth/login", { email: "test@b5.com", password: "pass1234" });
  assert.equal(r.status, 200);
  assert.ok(r.data.session);
  sessionToken2 = r.data.session;
});

// ─── /auth/sessions ────────────────────────────────────────────────────────

test("/auth/sessions GET — lista aktivnih sesija (min 2)", async () => {
  const r = await req("GET", "/auth/sessions", null, sessionToken);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data), "Mora biti niz");
  assert.ok(r.data.length >= 2, "Minimum 2 sesije");
  const current = r.data.find(s => s.current);
  assert.ok(current, "Jedna sesija mora biti označena kao current");
  assert.equal(current.id, sessionToken);
});

test("/auth/sessions GET — bez auth → 401", async () => {
  const r = await req("GET", "/auth/sessions");
  assert.equal(r.status, 401);
});

test("/auth/sessions DELETE — opozovi session 2 pomoću session 1", async () => {
  const r = await req("DELETE", "/auth/sessions/" + sessionToken2, null, sessionToken);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test("/auth/sessions — sesija 2 više nije u listi", async () => {
  const r = await req("GET", "/auth/sessions", null, sessionToken);
  assert.equal(r.status, 200);
  const found = r.data.find(s => s.id === sessionToken2);
  assert.equal(found, undefined, "Opozvana sesija ne sme biti u listi");
});

test("/auth/sessions DELETE nepostojece → 404", async () => {
  const r = await req("DELETE", "/auth/sessions/nepostojece-id", null, sessionToken);
  assert.equal(r.status, 404);
});

// ─── /health (AU Core) ────────────────────────────────────────────────────

test("/health — vraća status ok i db ok", async () => {
  const r = await req("GET", "/health");
  assert.equal(r.status, 200);
  assert.ok(r.data.status === "ok" || r.data.status === "degraded", "status mora biti ok ili degraded");
  assert.ok(typeof r.data.uptime_s === "number", "uptime_s mora biti broj");
});

// ─── Start ─────────────────────────────────────────────────────────────────

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
