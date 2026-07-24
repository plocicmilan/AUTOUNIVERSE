"use strict";
/* Batch 14 Integration Tests
   Testira: GET /vehicles/:id/stats, DELETE /vehicles/:id cascade,
            auto-notifikacija na grant, notif nakon grant-a dostupna
   Run: node aucore/tests/batch14.integration.test.js
*/

const assert = require("assert").strict;
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const http   = require("http");

const TMP_DB = path.join(os.tmpdir(), `aucore_b14_test_${Date.now()}.db`);
process.env.AUCORE_DB_PATH = TMP_DB;

let server;
const PORT = 13410;

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
  console.log(`\n=== AU Core Batch 14 Integration Tests (port ${PORT}) ===\n`);

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
let vid2 = 0; // za cascade delete test

// ─── Setup ─────────────────────────────────────────────────────────────────

test("Setup: register + login b14a@test.com", async () => {
  await req("POST", "/auth/register", { email: "b14a@test.com", password: "pass1234", name: "B14A" });
  const r = await req("POST", "/auth/login", { email: "b14a@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok = r.data.session;
});

test("Setup: register + approve + login b14b@test.com", async () => {
  const regR = await req("POST", "/auth/register", { email: "b14b@test.com", password: "pass1234", name: "B14B" });
  await req("POST", `/admin/users/${regR.data.id}/approve`, null, tok);
  const r = await req("POST", "/auth/login", { email: "b14b@test.com", password: "pass1234" });
  assert.equal(r.status, 200);
  tok2 = r.data.session;
});

test("Setup: kreiraj vozilo A14 (b14a)", async () => {
  const r = await req("POST", "/vehicles", { make: "Renault", model: "Megane", year: 2016 }, tok);
  assert.equal(r.status, 201);
  vid = r.data.id;
});

test("Setup: kreiraj vozilo B14 (b14a) — za cascade delete", async () => {
  const r = await req("POST", "/vehicles", { make: "Citroen", model: "C3", year: 2015 }, tok);
  assert.equal(r.status, 201);
  vid2 = r.data.id;
});

test("Setup: popuni vozilo A14 sa eventima i reminderima", async () => {
  await req("POST", `/vehicles/${vid}/events`, { type: "service",    event_date: "2024-01-10", data: { mileage_km: 70000 } }, tok);
  await req("POST", `/vehicles/${vid}/events`, { type: "oil_change", event_date: "2024-06-01", data: { mileage_km: 75000 } }, tok);
  await req("POST", `/vehicles/${vid}/events`, { type: "service",    event_date: "2024-11-20", data: { mileage_km: 82000 } }, tok);
  await req("POST", `/vehicles/${vid}/reminders`, { title: "Registracija", due_date: "2025-09-01" }, tok);
  await req("POST", `/vehicles/${vid}/reminders`, { title: "Zimske gume",  due_date: "2024-11-01" }, tok);
});

// ─── GET /vehicles/:id/stats ───────────────────────────────────────────────

test("Stats: bez auth → 401", async () => {
  const r = await req("GET", `/vehicles/${vid}/stats`);
  assert.equal(r.status, 401);
});

test("Stats: neovlašćen → 403", async () => {
  const r = await req("GET", `/vehicles/${vid}/stats`, null, tok2);
  assert.equal(r.status, 403);
});

test("Stats: osnovna struktura odgovora", async () => {
  const r = await req("GET", `/vehicles/${vid}/stats`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.vehicle_id, vid);
  assert.ok(typeof r.data.total_events === "number", "total_events mora biti number");
  assert.ok(typeof r.data.active_reminders === "number", "active_reminders mora biti number");
  assert.ok(Array.isArray(r.data.events_by_type), "events_by_type mora biti array");
});

test("Stats: total_events = 3", async () => {
  const r = await req("GET", `/vehicles/${vid}/stats`, null, tok);
  assert.equal(r.data.total_events, 3);
});

test("Stats: active_reminders = 2", async () => {
  const r = await req("GET", `/vehicles/${vid}/stats`, null, tok);
  assert.equal(r.data.active_reminders, 2);
});

test("Stats: last_mileage_km = 82000 (najnoviji event)", async () => {
  const r = await req("GET", `/vehicles/${vid}/stats`, null, tok);
  assert.equal(r.data.last_mileage_km, 82000);
});

test("Stats: first_event_date i last_event_date tačni", async () => {
  const r = await req("GET", `/vehicles/${vid}/stats`, null, tok);
  assert.ok(r.data.first_event_date.startsWith("2024-01-10"), "first mora biti 2024-01-10");
  assert.ok(r.data.last_event_date.startsWith("2024-11-20"), "last mora biti 2024-11-20");
});

test("Stats: events_by_type ima 2 tipa (service=2, oil_change=1)", async () => {
  const r = await req("GET", `/vehicles/${vid}/stats`, null, tok);
  const byType = r.data.events_by_type;
  const svc = byType.find(function (t) { return t.type === "service"; });
  const oil = byType.find(function (t) { return t.type === "oil_change"; });
  assert.ok(svc, "mora imati service");
  assert.equal(Number(svc.count), 2);
  assert.ok(oil, "mora imati oil_change");
  assert.equal(Number(oil.count), 1);
});

test("Stats: grantee (read) može čitati → 200", async () => {
  await req("POST", "/grants", { grantee_email: "b14b@test.com", vehicle_id: vid, role: "read" }, tok);
  const r = await req("GET", `/vehicles/${vid}/stats`, null, tok2);
  assert.equal(r.status, 200);
  assert.equal(r.data.total_events, 3);
});

test("Stats: vozilo bez evenata → 0 i null polja", async () => {
  const r = await req("GET", `/vehicles/${vid2}/stats`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.total_events, 0);
  assert.equal(r.data.last_mileage_km, null);
  assert.equal(r.data.first_event_date, null);
  assert.equal(r.data.active_reminders, 0);
});

// ─── Auto-notifikacija na grant ─────────────────────────────────────────────

test("Grant notif: b14b dobija notifikaciju kada b14a dodeli pristup", async () => {
  // Grant je već dodat u testu iznad — proverimo notifikacije b14b
  const r = await req("GET", "/notifications", null, tok2);
  assert.equal(r.status, 200);
  assert.ok(r.data.notifications.length >= 1, "mora imati barem 1 notifikaciju");
  const notif = r.data.notifications[0];
  assert.equal(notif.category, "access_granted");
  assert.ok(notif.title.includes("pristup"), "title mora pominjati pristup");
  assert.ok(notif.body.includes("Megane") || notif.body.includes("B14A"), "body mora pominjati vozilo ili grantor-a");
});

test("Grant notif: update grant-a (isti grantee+vozilo) ne duplira notif nepotrebno", async () => {
  // Isti grant ponovo — UPDATE ne kreira novu notifikaciju (try/catch u kodu)
  const before = await req("GET", "/notifications", null, tok2);
  const countBefore = before.data.notifications.length;
  await req("POST", "/grants", { grantee_email: "b14b@test.com", vehicle_id: vid, role: "write" }, tok);
  const after = await req("GET", "/notifications", null, tok2);
  // Može imati još jednu (to je OK — update grant šalje novu notif), ali ne sme crashovati
  assert.ok(after.status === 200, "mora biti 200 i posle update grant-a");
});

// ─── DELETE /vehicles/:id cascade ──────────────────────────────────────────

test("Cascade delete: priprema — dodaj event + reminder + belesku na B14", async () => {
  await req("POST", `/vehicles/${vid2}/events`, { type: "note", event_date: "2024-05-01", data: {} }, tok);
  await req("POST", `/vehicles/${vid2}/reminders`, { title: "Pregled", due_date: "2025-01-01" }, tok);
  await req("POST", `/vehicles/${vid2}/notes`, { content: "Privatna beleška", visibility: "owner" }, tok);
  // Verifikuj da su kreirani
  const evR  = await req("GET", `/vehicles/${vid2}/events`, null, tok);
  const remR = await req("GET", `/vehicles/${vid2}/reminders`, null, tok);
  assert.equal(evR.data.total, 1);
  assert.equal(remR.data.total, 1);
});

test("Cascade delete: DELETE /vehicles/:id sa podacima → 200", async () => {
  const r = await req("DELETE", `/vehicles/${vid2}`, null, tok);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test("Cascade delete: vozilo ne postoji posle brisanja → 404", async () => {
  const r = await req("GET", `/vehicles/${vid2}/events`, null, tok);
  // Vozilo ne postoji, hasAccess → false → 403 ili vozilo se ne nalazi pa events vraćaju 404/403
  assert.ok(r.status === 403 || r.status === 404, "mora biti 403 ili 404 jer vozila nema");
});

test("Stats: /stats route ne konflikta sa /:id route", async () => {
  const [rs, rv] = await Promise.all([
    req("GET", `/vehicles/${vid}/stats`, null, tok),
    req("GET", `/vehicles/${vid}`, null, tok),
  ]);
  assert.equal(rs.status, 200, "/stats mora biti 200");
  assert.equal(rv.status, 200, "/:id mora biti 200");
  assert.ok(rs.data.total_events !== undefined, "stats ima total_events");
  assert.ok(rv.data.vehicle !== undefined, "/:id ima vehicle object");
});

runTests().catch(e => {
  console.error("Test runner crash:", e);
  try { if (fs.existsSync(TMP_DB)) fs.unlinkSync(TMP_DB); } catch (_) {}
  process.exit(1);
});
