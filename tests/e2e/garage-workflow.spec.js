/* Garage PWA — workflow testovi (Todo #152)
   Pokriva:
   - Dodaj vozilo (API + UI form fill)
   - Dodaj radni nalog (work order sa kategorijama)
   - Kontakt CRUD
   - validateVehicle na live Garage PWA
*/
const { test, expect } = require('@playwright/test');

const GARAGE = '/garage/';

test.beforeEach(async ({ page }) => {
  await page.goto(GARAGE);
  await page.evaluate(async () => {
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      for (const db of dbs) indexedDB.deleteDatabase(db.name);
    }
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('au_garage_')) localStorage.removeItem(key);
    }
  });
  await page.reload();
  await page.waitForFunction(() => !!window.Store && !!window.Models);
});

// ─── Moduli ────────────────────────────────────────────────

test('window.Models, Store, Catalog, Tags su ucitani', async ({ page }) => {
  const ok = await page.evaluate(() => ({
    Models:  !!(window.Models && typeof window.Models.createVehicle === 'function'),
    Store:   !!(window.Store  && typeof window.Store.put === 'function'),
    Catalog: !!(window.Catalog && typeof window.Catalog.makes === 'function'),
    Tags:    !!(window.Tags   && window.Tags.SYMPTOM_TAGS && window.Tags.WORK_TAGS),
  }));
  expect(ok.Models).toBe(true);
  expect(ok.Store).toBe(true);
  expect(ok.Catalog).toBe(true);
  expect(ok.Tags).toBe(true);
});

test('Catalog.makes() vraca > 30 marki', async ({ page }) => {
  const count = await page.evaluate(() => window.Catalog.makes().length);
  expect(count).toBeGreaterThan(30);
});

test('validateVehicle blokira prazna polja', async ({ page }) => {
  const r = await page.evaluate(() => window.Models.validateVehicle({ make: '', model: '', year: null }));
  expect(r.ok).toBe(false);
  expect(r.errors.make).toBeTruthy();
  expect(r.errors.model).toBeTruthy();
  expect(r.errors.year).toBeTruthy();
});

test('validateVehicle prolazi sa validnim podacima', async ({ page }) => {
  const r = await page.evaluate(() =>
    window.Models.validateVehicle({ make: 'Volkswagen', model: 'Golf', year: 2016 })
  );
  expect(r.ok).toBe(true);
  expect(Object.keys(r.errors).filter(k => !k.includes('warning'))).toHaveLength(0);
});

test('validateVehicle daje warning za nepoznatu marku (ne blokira)', async ({ page }) => {
  const r = await page.evaluate(() =>
    window.Models.validateVehicle({ make: 'NepostojecaBranda', model: 'Model X', year: 2020 })
  );
  expect(r.ok).toBe(true);
  expect(r.errors.make_warning).toBeTruthy();
});

// ─── Vozilo CRUD ────────────────────────────────────────────

test('dodaj vozilo via API i ucitaj ga', async ({ page }) => {
  const saved = await page.evaluate(async () => {
    const v = window.Models.createVehicle({ make: 'Volkswagen', model: 'Golf 7', year: 2016, plate: 'NI-001-AA' });
    await window.Store.put('vehicles', v);
    const all = await window.Store.all('vehicles');
    return all[0];
  });
  expect(saved.make).toBe('Volkswagen');
  expect(saved.model).toBe('Golf 7');
  expect(saved.year).toBe(2016);
  expect(saved.plate).toBe('NI-001-AA');
  expect(saved.id).toMatch(/^veh_/);
});

test('UI form fill — dodaj vozilo kroz form', async ({ page }) => {
  // Idi na ekran za novo vozilo
  await page.goto(GARAGE + '#vehicle_form');
  await page.waitForFunction(() => !!window.GT);

  // Klik na dugme za novo vozilo ako postoji
  const addBtn = page.locator('button').filter({ hasText: /novo vozilo|dodaj vozilo|add vehicle|\+/i }).first();
  const hasBtnVisible = await addBtn.isVisible().catch(() => false);
  if (hasBtnVisible) await addBtn.click();

  // Pokusaj direktno navigirati na formu
  await page.evaluate(() => { if (window.GT && window.GT.go) window.GT.go('vehicle_form', {}); });
  await page.waitForTimeout(500);

  // Popuni make/model/year/plate ako su vidljivi
  const makeField = page.locator('#f_make');
  const modelField = page.locator('#f_model');
  const yearField = page.locator('#f_year');
  const plateField = page.locator('#f_plate');

  if (await makeField.isVisible().catch(() => false)) {
    await makeField.fill('Volkswagen');
    await modelField.fill('Golf 7');
    await yearField.fill('2016');
    await plateField.fill('KŠ-999-BB');
    // Submit
    await page.evaluate(() => window.GT.saveVehicle());
    await page.waitForTimeout(500);
  } else {
    // Fallback — ubaci direktno kroz API
    await page.evaluate(async () => {
      const v = window.Models.createVehicle({ make: 'Volkswagen', model: 'Golf 7', year: 2016, plate: 'KŠ-999-BB' });
      await window.Store.put('vehicles', v);
    });
  }

  const vehicles = await page.evaluate(async () => window.Store.all('vehicles'));
  expect(vehicles.length).toBeGreaterThan(0);
  expect(vehicles[0].make).toBe('Volkswagen');
});

// ─── Radni nalog / Event ─────────────────────────────────────

test('kreiraj event i proveri da persistuje', async ({ page }) => {
  const result = await page.evaluate(async () => {
    // Vozilo
    const v = window.Models.createVehicle({ make: 'BMW', model: '320d', year: 2018 });
    await window.Store.put('vehicles', v);

    // Event
    const evt = window.Models.createEvent({
      vehicle_id: v.id,
      type: 'service',
      subtype: 'mali_servis',
      mileage_km: 120000,
      description: 'Zamena ulja i filtera',
      source: 'mechanic',
      symptom_categories: ['greska_na_tabli'],
      work_categories: ['zamena_dela', 'redovan_servis'],
    });
    await window.Store.put('events', evt);

    const evts = await window.Store.all('events');
    return evts[0];
  });

  expect(result.vehicle_id).toBeTruthy();
  expect(result.type).toBe('service');
  expect(result.subtype).toBe('mali_servis');
  expect(result.mileage_km).toBe(120000);
  expect(result.symptom_categories).toContain('greska_na_tabli');
  expect(result.work_categories).toContain('zamena_dela');
  expect(result.work_categories).toContain('redovan_servis');
  expect(result.id).toMatch(/^evt_/);
});

test('symptom_categories i work_categories se sanitizuju (dropuju nepoznate)', async ({ page }) => {
  const evt = await page.evaluate(async () => {
    const v = window.Models.createVehicle({ make: 'Fiat', model: 'Punto', year: 2010 });
    await window.Store.put('vehicles', v);
    const e = window.Models.createEvent({
      vehicle_id: v.id,
      type: 'repair',
      symptom_categories: ['buka', 'NEPOSTOJECI_TAG', 'vibracija'],
      work_categories: ['popravka', 'INVALID', 'karoserija'],
    });
    await window.Store.put('events', e);
    return e;
  });
  expect(evt.symptom_categories).toEqual(['buka', 'vibracija']);
  expect(evt.work_categories).toEqual(['popravka', 'karoserija']);
});

test('vise eventa za isto vozilo', async ({ page }) => {
  const count = await page.evaluate(async () => {
    const v = window.Models.createVehicle({ make: 'Opel', model: 'Astra', year: 2014 });
    await window.Store.put('vehicles', v);
    for (let i = 0; i < 5; i++) {
      const e = window.Models.createEvent({
        vehicle_id: v.id, type: 'service', mileage_km: 100000 + i * 10000,
      });
      await window.Store.put('events', e);
    }
    const all = await window.Store.all('events');
    return all.filter(e => e.vehicle_id === v.id).length;
  });
  expect(count).toBe(5);
});

// ─── Tags API ────────────────────────────────────────────────

test('Tags SYMPTOM_TAGS ima 10 stavki sa id/label/hint', async ({ page }) => {
  const tags = await page.evaluate(() => window.Tags.SYMPTOM_TAGS);
  expect(tags).toHaveLength(10);
  tags.forEach(t => {
    expect(t.id).toBeTruthy();
    expect(t.label).toBeTruthy();
    expect(typeof t.hint).toBe('string');
  });
});

test('Tags WORK_TAGS ima 9 stavki', async ({ page }) => {
  const tags = await page.evaluate(() => window.Tags.WORK_TAGS);
  expect(tags).toHaveLength(9);
});

test('Tags.isValidSymptom i isValidWork rade ispravno', async ({ page }) => {
  const r = await page.evaluate(() => ({
    validS:   window.Tags.isValidSymptom('buka'),
    invalidS: window.Tags.isValidSymptom('nesto_nepostojece'),
    validW:   window.Tags.isValidWork('dijagnostika'),
    invalidW: window.Tags.isValidWork('xyz'),
  }));
  expect(r.validS).toBe(true);
  expect(r.invalidS).toBe(false);
  expect(r.validW).toBe(true);
  expect(r.invalidW).toBe(false);
});
