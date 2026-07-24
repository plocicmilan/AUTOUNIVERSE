"use strict";
/* Batch 18 Integration Tests
   Testira: DELETE /auth/me (samobrisanje naloga sa kaskadama),
            GET /vehicles/:id/export (JSON export podataka vozila)
   Run: node aucore/tests/batch18.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

const TMP_DB = path.join(os.tmpdir(), `aucore_b18_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

let server;
const PORT = 13414;

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
  console.log(`\n=== AU Core Batch 18 Integration Tests (port ${PORT}) ===\n`);

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
let tokOwner = "";    // b18a — prvi korisnik (owner role)
let tokB     = "";    // b18b — korisnik sa vozilom za delete test
let tokC     = "";    // b18c — korisnik za grant test
let vidB     = 0;     // vozilo od b18b
let vidOwner = 0;     // vozilo od b18a (za export test)

// ─── Setup ─────────────────────────────────────────────────────────────────

test("Setup: register + login b18a@test.com (owner)", async () => {
  await req("POST", "/auth/register", { email: "b18a@test.com", password: "pass1234", name: "B18A" });
  const r = await req("POST", "/auth/login", { email: "b18a@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tokOwner = r.data.session;
});

test("Setup: register + approve + login b18b@test.com", async () => {
  const regR = await req("POST", "/auth/register", { email: "b18b@test.com", password: "delete1234", name: "B18B" });
  await req("POST", `/admin/users/${regR.data.id}/approve`, null, tokOwner);
  const r = await req("POST", "/auth/login", { email: "b18b@test.com", password: "delete1234" });
  assert.equal(r.status, 200);
  tokB = r.data.session;
});

test("Setup: register + approve + login b18c@test.com", async () => {
  const regR = await req("POST", "/auth/register", { email: "b18c@test.com", password: "pass1234", name: "B18C" });
  await req("POST", `/admin/users/${regR.data.id}/approve`, null, tokOwner);
  const r = await req("POST", "/auth/login", { email: "b18c@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tokC = r.data.session;
});

test("Setup: kreiraj vozilo za export (b18a)", async () => {
  const r = await req("POST", "/vehicles", { make: "Toyota", model: "Corolla", year: 2018 }, tokOwner);
  assert.equal(r.status, 201);
  vidOwner = r.data.id;
});

test("Setup: kreiraj vozilo za delete test (b18b)", async () => {
  const r = await req("POST", "/vehicles", { make: "Fiat", model: "Punto", year: 2003 }, tokB);
  assert.equal(r.status, 201);
  vidB = r.data.id;
});

test("Setup: popuni vozilo b18b — 2 eventi, 1 reminder, 1 nota, 1 grant", async () => {
  await req("POST", `/vehicles/${vidB}/events`,    { type: "service",    event_date: "2024-01-10", data: {} }, tokB);
  await req("POST", `/vehicles/${vidB}/events`,    { type: "oil_change", event_date: "2024-06-01", data: {} }, tokB);
  await req("POST", `/vehicles/${vidB}/reminders`, { title: "Registracija", due_date: "2025-09-01" }, tokB);
  await req("POST", `/vehicles/${vidB}/notes`,     { content: "Privatna napomena", visibility: "owner" }, tokB);
  await req("POST", "/grants", { grantee_email: "b18c@test.com", vehicle_id: vidB, role: "read" }, tokB);
});

test("Setup: popuni vozilo b18a za export — 3 eventi, 2 remindere, 1 nota", async () => {
  await req("POST", `/vehicles/${vidOwner}/events`,    { type: "service",    event_date: "2023-03-01", data: { mileage_km: 50000 } }, tokOwner);
  await req("POST", `/vehicles/${vidOwner}/events`,    { type: "oil_change", event_date: "2023-09-15", data: { mileage_km: 55000 } }, tokOwner);
  await req("POST", `/vehicles/${vidOwner}/events`,    { type: "inspection", event_date: "2024-01-20", data: {} }, tokOwner);
  await req("POST", `/vehicles/${vidOwner}/reminders`, { title: "Gume", due_date: "2025-11-01" }, tokOwner);
  await req("POST", `/vehicles/${vidOwner}/reminders`, { title: "Servis", due_mileage_km: 70000 }, tokOwner);
  await req("POST", `/vehicles/${vidOwner}/notes`,     { content: "Vlasnikova beleška", visibility: "shared" }, tokOwner);
});

// ─── GET /vehicles/:id/export ──────────────────────────────────────────────

test("Export: bez auth → 401", async () => {
  const r = await req("GET", `/vehicles/${vidOwner}/export`);
  assert.equal(r.status, 401);
});

test("Export: neovlašćen → 403", async () => {
  const r = await req("GET", `/vehicles/${vidOwner}/export`, null, tokB);
  assert.equal(r.status, 403);
});

test("Export: ne postoji vozilo → 403 ili 404", async () => {
  const r = await req("GET", "/vehicles/99999/export", null, tokOwner);
  assert.ok(r.status === 403 || r.status === 404);
});

test("Export: osnovna struktura odgovora", async () => {
  const r = await req("GET", `/vehicles/${vidOwner}/export`, null, tokOwner);
  assert.equal(r.status, 200);
  assert.ok(r.data.exported_at, "mora imati exported_at");
  assert.ok(r.data.vehicle,     "mora imati vehicle");
  assert.ok(Array.isArray(r.data.events),    "events mora biti array");
  assert.ok(Array.isArray(r.data.reminders), "reminders mora biti array");
  assert.ok(Array.isArray(r.data.notes),     "notes mora biti array");
  assert.ok(Array.isArray(r.data.grants),    "grants mora biti array");
  assert.ok(r.data.summary,     "mora imati summary");
});

test("Export: summary.event_count = 3", async () => {
  const r = await req("GET", `/vehicles/${vidOwner}/export`, null, tokOwner);
  assert.equal(r.data.summary.event_count, 3);
  assert.equal(r.data.events.length, 3);
});

test("Export: summary.reminder_count = 2", async () => {
  const r = await req("GET", `/vehicles/${vidOwner}/export`, null, tokOwner);
  assert.equal(r.data.summary.reminder_count, 2);
  assert.equal(r.data.reminders.length, 2);
});

test("Export: summary.note_count = 1", async () => {
  const r = await req("GET", `/vehicles/${vidOwner}/export`, null, tokOwner);
  assert.equal(r.data.summary.note_count, 1);
});

test("Export: vehicle polja su prisutna", async () => {
  const r = await req("GET", `/vehicles/${vidOwner}/export`, null, tokOwner);
  const v = r.data.vehicle;
  assert.equal(v.make,  "Toyota");
  assert.equal(v.model, "Corolla");
  assert.equal(v.year,  2018);
});

test("Export: grantee (read) može exportovati → 200", async () => {
  await req("POST", "/grants", { grantee_email: "b18b@test.com", vehicle_id: vidOwner, role: "read" }, tokOwner);
  const r = await req("GET", `/vehicles/${vidOwner}/export`, null, tokB);
  assert.equal(r.status, 200);
  // Grantee vidi shared notes, ne owner notes
  assert.equal(r.data.summary.note_count, 1, "grantee vidi shared notu");
});

// ─── DELETE /auth/me ───────────────────────────────────────────────────────

test("Delete me: bez auth → 401", async () => {
  const r = await req("DELETE", "/auth/me", { password: "delete1234" });
  assert.equal(r.status, 401);
});

test("Delete me: bez lozinke → 400", async () => {
  const r = await req("DELETE", "/auth/me", {}, tokB);
  assert.equal(r.status, 400);
  assert.ok(r.data.error);
});

test("Delete me: pogrešna lozinka → 401", async () => {
  const r = await req("DELETE", "/auth/me", { password: "pogresna" }, tokB);
  assert.equal(r.status, 401);
});

test("Delete me: owner ne može brisati nalog → 403", async () => {
  const r = await req("DELETE", "/auth/me", { password: "pass1234" }, tokOwner);
  assert.equal(r.status, 403);
  assert.ok(r.data.error.includes("owner") || r.data.error.includes("Owner"));
});

test("Delete me: ispravna lozinka → 200", async () => {
  const r = await req("DELETE", "/auth/me", { password: "delete1234" }, tokB);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test("Delete me: prijava posle brisanja → 401", async () => {
  const r = await req("POST", "/auth/login", { email: "b18b@test.com", password: "delete1234" });
  assert.equal(r.status, 401, "obrisani korisnik ne može da se prijavi");
});

test("Delete me: stara sesija više ne radi → 401", async () => {
  const r = await req("GET", "/auth/me", null, tokB);
  assert.equal(r.status, 401, "stara sesija mora biti nevažeća");
});

test("Delete me: vozilo obrisanog korisnika je kaskadno obrisano", async () => {
  // vidB je bio vlasništvo b18b — mora biti 404/403 za tokOwner
  const r = await req("GET", `/vehicles/${vidB}/events`, null, tokOwner);
  assert.ok(r.status === 403 || r.status === 404, "vozilo obrisanog korisnika ne postoji");
});

test("Delete me: grant b18c je kaskadno poništen", async () => {
  // b18c je imao read grant na vidB — sada ne sme imati pristup
  const r = await req("GET", `/vehicles/${vidB}/events`, null, tokC);
  assert.ok(r.status === 403 || r.status === 404, "grant na obrisano vozilo je poništen");
});

test("Delete me: b18c više nema grant u /grants/mine", async () => {
  const r = await req("GET", "/grants/mine", null, tokC);
  assert.equal(r.status, 200);
  const grant = r.data.grants.find(function (g) { return g.vehicle_id === vidB; });
  assert.ok(!grant, "grant na obrisano vozilo ne sme biti u listi");
});

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
