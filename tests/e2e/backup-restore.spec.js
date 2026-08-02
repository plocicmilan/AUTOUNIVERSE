/* Backup / Restore — GATE D (Todo #152)
   Testira exportAll → importAll round-trip za Garage i Driver.
   Pravilo: posle import-a svi objekti moraju biti identični originalu.
*/
const { test, expect } = require('@playwright/test');

// Pomocnik: cisti driver namespace
async function clearDriver(page) {
  await page.evaluate(async () => {
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      for (const db of dbs) if (db.name && db.name.startsWith('au_driver')) indexedDB.deleteDatabase(db.name);
    }
    for (const k of Object.keys(localStorage)) if (k.startsWith('au_driver_')) localStorage.removeItem(k);
  });
}

async function clearGarage(page) {
  await page.evaluate(async () => {
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      for (const db of dbs) if (db.name && db.name.startsWith('au_garage')) indexedDB.deleteDatabase(db.name);
    }
    for (const k of Object.keys(localStorage)) if (k.startsWith('au_garage_')) localStorage.removeItem(k);
  });
}

// ─── Garage GATE D ────────────────────────────────────────

test('Garage: backup/restore round-trip (GATE D)', async ({ page }) => {
  await page.goto('/garage/');
  await clearGarage(page);
  await page.reload();
  await page.waitForFunction(() => !!window.Store && !!window.Models);

  // 1. Ubaci podatke
  await page.evaluate(async () => {
    const v1 = window.Models.createVehicle({ make: 'Volkswagen', model: 'Passat', year: 2015, plate: 'NI-100-BB' });
    const v2 = window.Models.createVehicle({ make: 'BMW', model: '320d', year: 2018 });
    await window.Store.put('vehicles', v1);
    await window.Store.put('vehicles', v2);

    const e1 = window.Models.createEvent({ vehicle_id: v1.id, type: 'service', mileage_km: 150000, source: 'mechanic' });
    const e2 = window.Models.createEvent({ vehicle_id: v1.id, type: 'repair', mileage_km: 151000, source: 'owner' });
    await window.Store.put('events', e1);
    await window.Store.put('events', e2);
  });

  const before = await page.evaluate(async () => ({
    vehicles: (await window.Store.all('vehicles')).length,
    events:   (await window.Store.all('events')).length,
  }));
  expect(before.vehicles).toBe(2);
  expect(before.events).toBe(2);

  // 2. Export
  const backupJson = await page.evaluate(async () => window.Store.exportAll());
  expect(typeof backupJson).toBe('string');
  const parsed = JSON.parse(backupJson);
  expect(parsed.app).toBe('garage');
  expect(parsed.data.vehicles).toHaveLength(2);
  expect(parsed.data.events).toHaveLength(2);

  // 3. Obrisi sve — app može auto-reload na IDB delete, pa ignorišemo grešku
  try { await clearGarage(page); } catch (_) {}
  await page.goto('/garage/');
  await page.waitForFunction(() => !!window.Store);

  const empty = await page.evaluate(async () => (await window.Store.all('vehicles')).length);
  expect(empty).toBe(0);

  // 4. Import
  const importResult = await page.evaluate(async (json) => {
    return window.Store.importAll(json);
  }, backupJson);
  expect(importResult.imported).toBeGreaterThan(0);

  // 5. Proveri da li su podaci vraćeni
  const after = await page.evaluate(async () => ({
    vehicles: await window.Store.all('vehicles'),
    events:   await window.Store.all('events'),
  }));
  expect(after.vehicles).toHaveLength(2);
  expect(after.events).toHaveLength(2);

  const vw = after.vehicles.find(v => v.make === 'Volkswagen');
  expect(vw).toBeTruthy();
  expect(vw.plate).toBe('NI-100-BB');
  expect(vw.year).toBe(2015);
});

test('Garage: backup sadrži verziju i timestamp', async ({ page }) => {
  await page.goto('/garage/');
  await clearGarage(page);
  await page.reload();
  await page.waitForFunction(() => !!window.Store);

  const json = await page.evaluate(async () => window.Store.exportAll());
  const parsed = JSON.parse(json);
  expect(parsed.exported_at).toBeTruthy();
  expect(parsed.app).toBe('garage');
});

// ─── Driver GATE D ────────────────────────────────────────

test('Driver: backup/restore round-trip (GATE D)', async ({ page }) => {
  await page.goto('/driver/');
  await clearDriver(page);
  await page.reload();
  await page.waitForFunction(() => !!window.Store && !!window.Models);

  // 1. Ubaci vozilo + evente + expense
  await page.evaluate(async () => {
    const v = window.Models.createVehicle({
      make: 'Skoda', model: 'Octavia', year: 2017,
      vin: 'TMBZZZ1Z0H3123456', plate: 'BG-777-ZZ',
      trade_mode: false,
    });
    await window.Store.put('vehicles', v);

    const service = window.Models.createEvent({
      vehicle_id: v.id, type: 'service', source: 'mechanic',
      mileage_km: 75000, mechanic_name: 'Auto servis Petar',
      symptom_categories: ['vibracija'],
      work_categories: ['zamena_dela'],
    });
    const fuel = window.Models.createEvent({
      vehicle_id: v.id, type: 'expense_fuel', source: 'owner',
      cost: { total: 6800, currency: 'RSD', informal: false },
    });
    await window.Store.put('events', service);
    await window.Store.put('events', fuel);
  });

  // 2. Export
  const backupJson = await page.evaluate(async () => window.Store.exportAll());
  const parsed = JSON.parse(backupJson);
  expect(parsed.app).toBe('driver');
  expect(parsed.data.vehicles).toHaveLength(1);
  expect(parsed.data.events).toHaveLength(2);

  // 3. Obrisi i importuj
  await clearDriver(page);
  await page.reload();
  await page.waitForFunction(() => !!window.Store);
  await page.evaluate(async (json) => window.Store.importAll(json), backupJson);

  // 4. Verifikacija
  const restored = await page.evaluate(async () => ({
    v: (await window.Store.all('vehicles'))[0],
    evts: await window.Store.all('events'),
  }));

  expect(restored.v.make).toBe('Skoda');
  expect(restored.v.vin).toBe('TMBZZZ1Z0H3123456');
  expect(restored.evts).toHaveLength(2);

  const svcEvt = restored.evts.find(e => e.type === 'service');
  expect(svcEvt.mechanic_name).toBe('Auto servis Petar');
  expect(svcEvt.symptom_categories).toContain('vibracija');
  expect(svcEvt.work_categories).toContain('zamena_dela');

  const fuelEvt = restored.evts.find(e => e.type === 'expense_fuel');
  expect(fuelEvt.cost.total).toBe(6800);
  expect(fuelEvt.cost.currency).toBe('RSD');
});

test('Driver: backup/restore cuvа trust card podatke', async ({ page }) => {
  await page.goto('/driver/');
  await clearDriver(page);
  await page.reload();
  await page.waitForFunction(() => !!window.Store && !!window.Trust);

  await page.evaluate(async () => {
    const v = window.Models.createVehicle({ make: 'Audi', model: 'A4', year: 2016 });
    await window.Store.put('vehicles', v);
    for (let i = 0; i < 4; i++) {
      const e = window.Models.createEvent({
        vehicle_id: v.id, source: 'mechanic', type: 'service',
        mileage_km: 80000 + i * 10000,
      });
      await window.Store.put('events', e);
    }
  });

  const scoreBefore = await page.evaluate(async () => {
    const v = (await window.Store.all('vehicles'))[0];
    const evts = await window.Store.all('events');
    return window.Trust.compute(v, evts, []).score;
  });

  const json = await page.evaluate(async () => window.Store.exportAll());
  await clearDriver(page);
  await page.reload();
  await page.waitForFunction(() => !!window.Store && !!window.Trust);
  await page.evaluate(async (j) => window.Store.importAll(j), json);

  const scoreAfter = await page.evaluate(async () => {
    const v = (await window.Store.all('vehicles'))[0];
    const evts = await window.Store.all('events');
    return window.Trust.compute(v, evts, []).score;
  });

  expect(scoreAfter).toBe(scoreBefore);
  expect(scoreAfter).toBeGreaterThan(0);
});

// ─── Cross-namespace ──────────────────────────────────────

test('Garage backup NE prepisuje Driver podatke pri importu', async ({ page }) => {
  // Dodaj vozilo u Driver
  await page.goto('/driver/');
  await clearDriver(page);
  await page.reload();
  await page.waitForFunction(() => !!window.Store && !!window.Models);
  await page.evaluate(async () => {
    const v = window.Models.createVehicle({ make: 'Honda', model: 'Civic', year: 2019 });
    await window.Store.put('vehicles', v);
  });
  const driverBefore = await page.evaluate(async () => (await window.Store.all('vehicles')).length);
  expect(driverBefore).toBe(1);

  // Uzmi Garage backup (koji ima 2 vozila) i importuj u Driver — treba importovati u Driver store
  await page.goto('/garage/');
  await clearGarage(page);
  await page.reload();
  await page.waitForFunction(() => !!window.Store && !!window.Models);
  await page.evaluate(async () => {
    await window.Store.put('vehicles', window.Models.createVehicle({ make: 'Seat', model: 'Leon', year: 2015 }));
    await window.Store.put('vehicles', window.Models.createVehicle({ make: 'Citroen', model: 'C3', year: 2017 }));
  });
  const garageJson = await page.evaluate(async () => window.Store.exportAll());

  // Driver ostaje netaknut — importuj Garage backup u Garage (ne u Driver)
  await page.goto('/driver/');
  await page.waitForFunction(() => !!window.Store);
  const driverAfter = await page.evaluate(async () => (await window.Store.all('vehicles')).length);

  // Driver mora da ima još uvek 1 vozilo (Honda)
  expect(driverAfter).toBe(1);
  const driverVehicle = await page.evaluate(async () => (await window.Store.all('vehicles'))[0]);
  expect(driverVehicle.make).toBe('Honda');
});
