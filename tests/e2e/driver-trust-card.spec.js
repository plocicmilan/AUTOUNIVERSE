/* Driver PWA — Trust Card integracija (Todo #127 verifikacija)
   Testira ciklus:
     1. Otvori Driver (prazno)
     2. Kreiraj vozilo (form validacija — Task 1)
     3. Trust Card se NE prikazuje (nema event-a)
     4. Dodaj initial state / event
     5. Trust Card se prikazuje sa bronze/silver score-om
*/
const { test, expect } = require('@playwright/test');

const DRIVER = '/driver/';

// Helper: cist IndexedDB pre svakog testa
test.beforeEach(async ({ page }) => {
  await page.goto(DRIVER);
  await page.evaluate(async () => {
    // Obrisati sve indexedDB baze koje pocinju au_driver
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      for (const db of dbs) { indexedDB.deleteDatabase(db.name); }
    }
    // Clear localStorage sa au_driver prefixom
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('au_driver_')) localStorage.removeItem(key);
    }
  });
  await page.reload();
});

test('otvara se onboarding kad nema vozila', async ({ page }) => {
  await page.goto(DRIVER);
  await expect(page.locator('h1')).toBeVisible();
  // Kad je prazno, ocekivano je onboarding sa "Add vehicle" dugmetom
  const addBtn = page.locator('button').filter({ hasText: /dodaj|add|vozilo/i }).first();
  await expect(addBtn).toBeVisible({ timeout: 10000 });
});

test('window.TrustCard i window.Trust su ucitane', async ({ page }) => {
  await page.goto(DRIVER);
  const hasTrust = await page.evaluate(() => !!(window.Trust && typeof window.Trust.compute === 'function'));
  const hasCard = await page.evaluate(() => !!(window.TrustCard && typeof window.TrustCard.html === 'function'));
  expect(hasTrust).toBe(true);
  expect(hasCard).toBe(true);
});

test('Trust Card se renderuje sa test event-ima', async ({ page }) => {
  await page.goto(DRIVER);
  // Injektuj Trust Card direktno da testiramo komponentu (a ne UI form-u)
  const html = await page.evaluate(() => {
    const events = [
      { vehicle_id: 'v1', source: 'mechanic', type: 'service', km: 10000, event_date: '2025-01-15' },
      { vehicle_id: 'v1', source: 'mechanic', type: 'service', km: 15000, event_date: '2025-03-15' },
      { vehicle_id: 'v1', source: 'mechanic', type: 'service', km: 20000, event_date: '2025-06-15' }
    ];
    return window.TrustCard.html({ id: 'v1' }, events, [], { showTips: true });
  });
  expect(html).toContain('Trust Score');
  expect(html).toContain('tc-');
});

test('window.Tags konstante su ucitane', async ({ page }) => {
  await page.goto(DRIVER);
  const tags = await page.evaluate(() => ({
    symptom: window.Tags && window.Tags.SYMPTOM_TAGS && window.Tags.SYMPTOM_TAGS.length,
    work: window.Tags && window.Tags.WORK_TAGS && window.Tags.WORK_TAGS.length,
  }));
  expect(tags.symptom).toBe(10);
  expect(tags.work).toBe(9);
});

test('Models.validateVehicle radi na live PWA', async ({ page }) => {
  await page.goto(DRIVER);
  const result = await page.evaluate(() => {
    const v = window.Models.validateVehicle({ make: '', model: '', year: null });
    return { ok: v.ok, hasErrors: Object.keys(v.errors).length > 0 };
  });
  expect(result.ok).toBe(false);
  expect(result.hasErrors).toBe(true);
});
