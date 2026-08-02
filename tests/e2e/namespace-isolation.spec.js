/* Namespace izolacija — Garage i Driver na istom origin-u
   Todo #150 iz FEEDBACK #2 (odluceno 2026-07-19).

   Pravilo: DB_NAME = "au_" + appName -> au_garage odvojen od au_driver.
   localStorage prefix: au_garage_ / au_driver_
*/
const { test, expect } = require('@playwright/test');

test.describe('Namespace izolacija Garage vs Driver', () => {

  test.beforeEach(async ({ page }) => {
    // Cist state
    await page.goto('/');
    await page.evaluate(async () => {
      if (typeof indexedDB.databases === 'function') {
        const dbs = await indexedDB.databases();
        for (const db of dbs) { indexedDB.deleteDatabase(db.name); }
      }
      localStorage.clear();
    });
  });

  test('Garage stvara au_garage_* IndexedDB', async ({ page }) => {
    await page.goto('/garage/');
    await page.waitForFunction(() => !!window.Store);
    // Prisili inicijalizaciju IndexedDB (put ce automatski kreirati bazu ako ne postoji)
    await page.evaluate(async () => {
      // Store.all trigger-uje open()
      await window.Store.all('vehicles');
    });
    const dbNames = await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      return dbs.map(d => d.name);
    });
    const hasGarage = dbNames.some(n => n && n.startsWith('au_garage'));
    expect(hasGarage).toBe(true);
  });

  test('Driver stvara au_driver_* IndexedDB', async ({ page }) => {
    await page.goto('/driver/');
    await page.waitForFunction(() => !!window.Store);
    await page.evaluate(async () => { await window.Store.all('vehicles'); });
    const dbNames = await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      return dbs.map(d => d.name);
    });
    const hasDriver = dbNames.some(n => n && n.startsWith('au_driver'));
    expect(hasDriver).toBe(true);
  });

  test('Garage vozilo NE vidi se u Driver-u (namespace izolacija)', async ({ page }) => {
    // Korak 1: kreiraj vozilo u Garage-u
    await page.goto('/garage/');
    await page.waitForFunction(() => !!window.Store && !!window.Models);
    await page.evaluate(async () => {
      const v = window.Models.createVehicle({
        make: 'Volkswagen', model: 'Golf 7', year: 2016, plate: 'TEST-01'
      });
      await window.Store.put('vehicles', v);
    });
    const garageCount = await page.evaluate(async () => (await window.Store.all('vehicles')).length);
    expect(garageCount).toBe(1);

    // Korak 2: otvori Driver na istom origin-u — mora biti prazan
    await page.goto('/driver/');
    await page.waitForFunction(() => !!window.Store);
    const driverCount = await page.evaluate(async () => (await window.Store.all('vehicles')).length);
    expect(driverCount).toBe(0);

    // Korak 3: kreiraj vozilo u Driver-u — Garage se ne menja
    await page.evaluate(async () => {
      const v = window.Models.createVehicle({
        make: 'Ford', model: 'Focus', year: 2018, plate: 'TEST-02'
      });
      await window.Store.put('vehicles', v);
    });
    const driverCount2 = await page.evaluate(async () => (await window.Store.all('vehicles')).length);
    expect(driverCount2).toBe(1);

    // Korak 4: vrati se u Garage — mora biti samo Golf, ne Focus
    await page.goto('/garage/');
    await page.waitForFunction(() => !!window.Store);
    const garageAgain = await page.evaluate(async () => {
      const list = await window.Store.all('vehicles');
      return list.map(v => v.make + ' ' + v.model);
    });
    expect(garageAgain).toEqual(['Volkswagen Golf 7']);
  });

  test('localStorage koristi au_garage_ / au_driver_ prefixe', async ({ page }) => {
    await page.goto('/garage/');
    await page.waitForFunction(() => !!window.Store);
    // Postavi neku settings vrednost i proveri da ide sa prefixom
    await page.evaluate(() => {
      localStorage.setItem('au_garage_test_key', 'garage_value');
    });

    await page.goto('/driver/');
    await page.waitForFunction(() => !!window.Store);
    await page.evaluate(() => {
      localStorage.setItem('au_driver_test_key', 'driver_value');
    });

    const keys = await page.evaluate(() => {
      const out = { garage: [], driver: [], neutral: [] };
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('au_garage_'))       out.garage.push(k);
        else if (k.startsWith('au_driver_'))  out.driver.push(k);
        else                                   out.neutral.push(k);
      }
      return out;
    });
    expect(keys.garage.length).toBeGreaterThan(0);
    expect(keys.driver.length).toBeGreaterThan(0);
    // Vrednosti se ne mesaju
    const garageVal = await page.evaluate(() => localStorage.getItem('au_garage_test_key'));
    const driverVal = await page.evaluate(() => localStorage.getItem('au_driver_test_key'));
    expect(garageVal).toBe('garage_value');
    expect(driverVal).toBe('driver_value');
  });
});
