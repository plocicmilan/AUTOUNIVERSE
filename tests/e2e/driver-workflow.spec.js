/* Driver PWA — workflow testovi (Todo #152)
   Pokriva:
   - Dodaj vozilo
   - Dodaj event (servis, trošak)
   - Trust card score se azurira posle event-a
   - Retroaktivni unos (FEEDBACK #1)
*/
const { test, expect } = require('@playwright/test');

const DRIVER = '/driver/';

test.beforeEach(async ({ page }) => {
  await page.goto(DRIVER);
  await page.evaluate(async () => {
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      for (const db of dbs) indexedDB.deleteDatabase(db.name);
    }
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('au_driver_')) localStorage.removeItem(key);
    }
  });
  await page.reload();
  await page.waitForFunction(() => !!window.Store && !!window.Models);
});

// ─── Vozilo ───────────────────────────────────────────────

test('dodaj vozilo i ucitaj ga iz Store-a', async ({ page }) => {
  const v = await page.evaluate(async () => {
    const veh = window.Models.createVehicle({
      make: 'Toyota', model: 'Yaris', year: 2019, plate: 'KR-456-CD',
      vin: 'JTDBT923491234567',
    });
    await window.Store.put('vehicles', veh);
    const all = await window.Store.all('vehicles');
    return all[0];
  });
  expect(v.make).toBe('Toyota');
  expect(v.year).toBe(2019);
  expect(v.vin).toBe('JTDBT923491234567');
  expect(v.status).toBe('active');
});

test('vehicle status flow: active → for_sale → sold', async ({ page }) => {
  const statuses = await page.evaluate(async () => {
    const v = window.Models.createVehicle({ make: 'Dacia', model: 'Duster', year: 2017 });
    await window.Store.put('vehicles', v);

    v.status = 'for_sale';
    await window.Store.put('vehicles', v);
    const mid = (await window.Store.all('vehicles'))[0].status;

    v.status = 'sold';
    v.trade_mode = true;
    await window.Store.put('vehicles', v);
    const final = (await window.Store.all('vehicles'))[0].status;

    return { mid, final };
  });
  expect(statuses.mid).toBe('for_sale');
  expect(statuses.final).toBe('sold');
});

test('registered_owner polje (vlasnik != vozac)', async ({ page }) => {
  const v = await page.evaluate(async () => {
    const veh = window.Models.createVehicle({
      make: 'Renault', model: 'Clio', year: 2015,
      registered_owner: 'Mileva Plocic',
    });
    await window.Store.put('vehicles', veh);
    return (await window.Store.all('vehicles'))[0];
  });
  expect(v.registered_owner).toBe('Mileva Plocic');
});

// ─── Event / Expense ──────────────────────────────────────

test('dodaj service event sa source:mechanic', async ({ page }) => {
  const evt = await page.evaluate(async () => {
    const v = window.Models.createVehicle({ make: 'Peugeot', model: '308', year: 2016 });
    await window.Store.put('vehicles', v);
    const e = window.Models.createEvent({
      vehicle_id: v.id,
      type: 'service',
      subtype: 'mali_servis',
      source: 'mechanic',
      mileage_km: 95000,
      description: 'Ulje + filteri',
      mechanic_name: 'Marko Servis',
      public_on_marketplace: true,
    });
    await window.Store.put('events', e);
    return (await window.Store.all('events'))[0];
  });
  expect(evt.source).toBe('mechanic');
  expect(evt.mechanic_name).toBe('Marko Servis');
  expect(evt.public_on_marketplace).toBe(true);
});

test('expense event sa cost blokom', async ({ page }) => {
  const evt = await page.evaluate(async () => {
    const v = window.Models.createVehicle({ make: 'Hyundai', model: 'i30', year: 2018 });
    await window.Store.put('vehicles', v);
    const e = window.Models.createEvent({
      vehicle_id: v.id,
      type: 'expense_fuel',
      source: 'owner',
      cost: { total: 7500, currency: 'RSD', informal: false },
    });
    await window.Store.put('events', e);
    return (await window.Store.all('events'))[0];
  });
  expect(evt.type).toBe('expense_fuel');
  expect(evt.cost.total).toBe(7500);
  expect(evt.cost.currency).toBe('RSD');
  expect(evt.cost.informal).toBe(false);
});

test('retroaktivni event (iskopaj fioku)', async ({ page }) => {
  const evt = await page.evaluate(async () => {
    const v = window.Models.createVehicle({ make: 'Skoda', model: 'Octavia', year: 2013 });
    await window.Store.put('vehicles', v);
    const e = window.Models.createEvent({
      vehicle_id: v.id,
      type: 'service',
      source: 'initial',
      retroactive: true,
      date: '2022-05-10',
      date_precision: 'month',
      mileage_km: 80000,
      km_precision: 'approx',
    });
    await window.Store.put('events', e);
    return (await window.Store.all('events'))[0];
  });
  expect(evt.retroactive).toBe(true);
  expect(evt.source).toBe('initial');
  expect(evt.date_precision).toBe('month');
  expect(evt.km_precision).toBe('approx');
});

// ─── Trust Card score ────────────────────────────────────

test('Trust Score je 0 bez event-a', async ({ page }) => {
  const score = await page.evaluate(() => {
    const result = window.Trust.compute({ id: 'v1' }, [], []);
    return result.score;
  });
  expect(score).toBe(0);
});

test('Trust Score raste sa mechanic event-ima', async ({ page }) => {
  const scores = await page.evaluate(() => {
    const v = { id: 'v1' };
    const oneEvent = [{ vehicle_id: 'v1', source: 'mechanic', type: 'service', mileage_km: 10000, event_date: '2025-01-01' }];
    const threeEvents = [
      { vehicle_id: 'v1', source: 'mechanic', type: 'service', mileage_km: 10000, event_date: '2025-01-01' },
      { vehicle_id: 'v1', source: 'mechanic', type: 'service', mileage_km: 15000, event_date: '2025-03-01' },
      { vehicle_id: 'v1', source: 'mechanic', type: 'service', mileage_km: 20000, event_date: '2025-06-01' },
    ];
    return {
      withOne:   window.Trust.compute(v, oneEvent, []).score,
      withThree: window.Trust.compute(v, threeEvents, []).score,
    };
  });
  expect(scores.withOne).toBeGreaterThan(0);
  expect(scores.withThree).toBeGreaterThan(scores.withOne);
});

test('Trust Card level: Bronzani / Srebrni / Zlatni', async ({ page }) => {
  const levels = await page.evaluate(() => {
    const v = { id: 'vx' };

    // Bronze: 1 mechanic event → 8 pts (< 40 = bronze)
    const bronze = window.Trust.compute(v, [
      { vehicle_id: 'vx', source: 'mechanic', type: 'service', event_date: '2025-01-01' },
    ], []).level;

    // Silver: 5 mechanic events → 40 pts (≥ 40, < 80 = silver)
    const silverEvts = Array.from({ length: 5 }, (_, i) => ({
      vehicle_id: 'vx', source: 'mechanic', type: 'service',
      event_date: '2025-0' + (i + 1) + '-01',
    }));
    const silver = window.Trust.compute(v, silverEvts, []).level;

    // Gold: 5 mechanic (40) + km consistency (10) + 4 invoice docs (24) + 10 owner events (10) = 84
    const mechanic = Array.from({ length: 5 }, (_, i) => ({
      vehicle_id: 'vx', source: 'mechanic', type: 'service',
      km: 10000 + i * 5000, event_date: '2025-0' + (i + 1) + '-01',
    }));
    const owner = Array.from({ length: 10 }, () => ({
      vehicle_id: 'vx', source: 'owner', type: 'service', event_date: '2025-01-01',
    }));
    const invoices = [
      { type: 'invoice' }, { type: 'invoice' }, { type: 'invoice' }, { type: 'invoice' },
    ];
    const gold = window.Trust.compute(v, [...mechanic, ...owner], invoices).level;

    return { bronze, silver, gold };
  });
  expect(levels.bronze).toBe('bronze');
  expect(['silver', 'gold']).toContain(levels.silver);
  expect(levels.gold).toBe('gold');
});

test('Trust Card html se renderuje posle dodavanja eventa u Store', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const v = window.Models.createVehicle({ make: 'Kia', model: 'Sportage', year: 2020 });
    await window.Store.put('vehicles', v);

    for (let i = 0; i < 3; i++) {
      const e = window.Models.createEvent({
        vehicle_id: v.id, source: 'mechanic', type: 'service',
        mileage_km: 20000 + i * 10000,
      });
      await window.Store.put('events', e);
    }

    const evts = await window.Store.all('events');
    const html = window.TrustCard.html(v, evts, [], { showTips: false });
    return { hasScore: html.includes('Trust Score'), hasLevel: html.includes('tc-') };
  });
  expect(result.hasScore).toBe(true);
  expect(result.hasLevel).toBe(true);
});

// ─── Trade mode ───────────────────────────────────────────

test('trade_mode polja su izolovana od regularnih polja', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const regular = window.Models.createVehicle({ make: 'Ford', model: 'Focus', year: 2017 });
    const trader  = window.Models.createVehicle({
      make: 'Mercedes', model: 'C 200', year: 2019,
      trade_mode: true,
      trade: {
        purchase: { date: '2026-05-01', price: 15000, currency: 'EUR', source: 'auction' },
        sale: { date: null, price: null, currency: 'EUR' },
      },
    });
    await window.Store.put('vehicles', regular);
    await window.Store.put('vehicles', trader);

    const all = await window.Store.all('vehicles');
    const reg = all.find(v => v.make === 'Ford');
    const trd = all.find(v => v.make === 'Mercedes');
    return {
      regularTradeMode: reg.trade_mode,
      traderMode:       trd.trade_mode,
      purchasePrice:    trd.trade && trd.trade.purchase ? trd.trade.purchase.price : null,
    };
  });
  expect(r.regularTradeMode).toBe(false);
  expect(r.traderMode).toBe(true);
  expect(r.purchasePrice).toBe(15000);
});
