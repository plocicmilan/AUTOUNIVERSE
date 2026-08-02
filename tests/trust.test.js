/* Trust Score unit testovi
   Run: node autouniverse/tests/trust.test.js
*/
const { test } = require('node:test');
const assert = require('node:assert');
const Trust = require('../core/js/trust.js');

test('prazno vozilo -> score 0, bronze', () => {
  const r = Trust.compute({ id: 'v1' }, [], []);
  assert.strictEqual(r.score, 0);
  assert.strictEqual(r.level, 'bronze');
});

test('5 verifikovanih servisa (mechanic + service) -> 40 poena za servise', () => {
  const events = Array.from({ length: 5 }, (_, i) => ({
    vehicle_id: 'v1', source: 'mechanic', type: 'service',
    km: 10000 * (i + 1), event_date: `2025-0${i + 1}-15`
  }));
  const r = Trust.compute({ id: 'v1' }, events, []);
  assert.strictEqual(r.breakdown.verified_pts, 40);
  assert.strictEqual(r.breakdown.km_consistent, true);
  assert.strictEqual(r.breakdown.km_pts, 10);
  // 5x8 + 10 (km) - 0 (nema gap-ova) = 50
  assert.ok(r.score >= 45 && r.score <= 55, `score=${r.score}`);
  assert.strictEqual(r.level, 'silver');
});

test('10 verifikovanih servisa -> cap na 40 poena', () => {
  const events = Array.from({ length: 10 }, (_, i) => ({
    vehicle_id: 'v1', source: 'mechanic', type: 'service',
    km: 10000 * (i + 1), event_date: `2025-01-${(i % 28) + 1}`
  }));
  const r = Trust.compute({ id: 'v1' }, events, []);
  assert.strictEqual(r.breakdown.verified_pts, 40); // ne 80
});

test('invoice documents broje 6 poena po komadu, cap 24', () => {
  const docs = Array.from({ length: 5 }, () => ({ vehicle_id: 'v1', doc_type: 'invoice' }));
  const r = Trust.compute({ id: 'v1' }, [], docs);
  assert.strictEqual(r.breakdown.invoices, 5);
  assert.strictEqual(r.breakdown.invoice_pts, 24); // cap
});

test('gap penalizacija: 2 gap-a > 18 meseci = -10', () => {
  const events = [
    { vehicle_id: 'v1', source: 'mechanic', type: 'service', km: 10000, event_date: '2022-01-01' },
    { vehicle_id: 'v1', source: 'mechanic', type: 'service', km: 20000, event_date: '2024-01-01' }, // gap 24 mes
    { vehicle_id: 'v1', source: 'mechanic', type: 'service', km: 30000, event_date: '2026-06-01' }  // gap 29 mes
  ];
  const r = Trust.compute({ id: 'v1' }, events, []);
  assert.strictEqual(r.breakdown.gaps_over_18mo, 2);
  assert.strictEqual(r.breakdown.gap_penalty, 10);
});

test('retroactive-only cap na 15 poena', () => {
  const events = Array.from({ length: 5 }, (_, i) => ({
    vehicle_id: 'v1', source: 'mechanic', type: 'service',
    km: 10000 * (i + 1), event_date: `2025-0${i + 1}-15`,
    retroactive: true
  }));
  const r = Trust.compute({ id: 'v1' }, events, []);
  assert.ok(r.score <= 15, `score=${r.score} treba <=15 (all retroactive)`);
  assert.strictEqual(r.breakdown.all_retroactive, true);
});

test('gold nivo (80+)', () => {
  const events = [
    ...Array.from({ length: 5 }, (_, i) => ({
      vehicle_id: 'v1', source: 'mechanic', type: 'service',
      km: 10000 * (i + 1), event_date: `2025-0${i + 1}-15`
    })), // 40 verified + 10 km = 50
    ...Array.from({ length: 6 }, () => ({
      vehicle_id: 'v1', source: 'owner', type: 'note',
      event_date: '2025-06-01'
    })) // +6 owner = +6
  ];
  const docs = Array.from({ length: 5 }, () => ({ vehicle_id: 'v1', doc_type: 'invoice' }));
  // 40 + 24 (5x6 cap) + 6 (owner) + 10 (km) = 80 -> gold
  const r = Trust.compute({ id: 'v1' }, events, docs);
  assert.strictEqual(r.level, 'gold', `score=${r.score}, breakdown=${JSON.stringify(r.breakdown)}`);
});

test('filter po vehicle_id: ne racuna tudje event-e', () => {
  const events = [
    { vehicle_id: 'v1', source: 'mechanic', type: 'service', km: 100, event_date: '2025-01-01' },
    { vehicle_id: 'v2', source: 'mechanic', type: 'service', km: 200, event_date: '2025-01-01' },
    { vehicle_id: 'v2', source: 'mechanic', type: 'service', km: 300, event_date: '2025-02-01' }
  ];
  const r = Trust.compute({ id: 'v1' }, events, []);
  assert.strictEqual(r.breakdown.verified_services, 1);
});

test('LEVELS export je stabilan API', () => {
  assert.strictEqual(Trust.LEVELS.length, 3);
  assert.strictEqual(Trust.LEVELS[0].name, 'gold');
  assert.strictEqual(Trust.LEVELS[0].color, '#1D9E75');
});
