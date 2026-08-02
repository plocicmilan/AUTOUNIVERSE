/* Task 1 + Task 2 iz BRIEFING_2026_07_21_schema_agregacija.md */
const { test } = require('node:test');
const assert = require('node:assert');

// Task 1 zahteva window.Catalog za autocomplete provera; simulacija u Node.
global.window = { Catalog: { makes: () => ['Volkswagen', 'Audi', 'BMW'] } };
const Models = require('../core/js/models.js');
const Tags = require('../core/js/tags.js');
// Refresh window.Tags reference posle require-a (models.js caching-a u zavisnosti od redosleda)
global.window.Tags = Tags;

test('validateVehicle: prazno make/model/year -> greske', () => {
  const r = Models.validateVehicle({});
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.make);
  assert.ok(r.errors.model);
  assert.ok(r.errors.year);
});

test('validateVehicle: valjan unos -> ok', () => {
  const r = Models.validateVehicle({ make: 'Volkswagen', model: 'Golf', year: 2016 });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(Object.keys(r.errors).length, 0);
});

test('validateVehicle: nepoznata marka -> ok=true ali sa warning-om', () => {
  const r = Models.validateVehicle({ make: 'Zastava', model: '128', year: 1988 });
  assert.strictEqual(r.ok, true); // hard-error nema
  assert.ok(r.errors.make_warning, 'ocekivan make_warning');
});

test('validateVehicle: godiste van opsega -> greska', () => {
  const r1 = Models.validateVehicle({ make: 'BMW', model: 'X5', year: 1950 });
  assert.strictEqual(r1.ok, false);
  const r2 = Models.validateVehicle({ make: 'BMW', model: 'X5', year: 2050 });
  assert.strictEqual(r2.ok, false);
});

test('Tags: SYMPTOM_TAGS ima 10, WORK_TAGS ima 9', () => {
  assert.strictEqual(Tags.SYMPTOM_TAGS.length, 10);
  assert.strictEqual(Tags.WORK_TAGS.length, 9);
});

test('Tags: sanitize dropuje nepoznate tagove + duplicate', () => {
  const r = Tags.sanitizeSymptoms(['buka', 'buka', 'izmisljen_tag', 'dim']);
  assert.deepStrictEqual(r, ['buka', 'dim']);
});

test('createEvent: symptom_categories + work_categories persistuju', () => {
  const e = Models.createEvent({
    type: 'service',
    vehicle_id: 'v1',
    symptom_categories: ['buka', 'vibracija', 'nepoznato'],
    work_categories: ['zamena_dela', 'dijagnostika']
  });
  assert.deepStrictEqual(e.symptom_categories, ['buka', 'vibracija']);
  assert.deepStrictEqual(e.work_categories, ['zamena_dela', 'dijagnostika']);
});

test('createEvent: bez tagova -> prazan array (backward compat)', () => {
  const e = Models.createEvent({ type: 'service', vehicle_id: 'v1' });
  assert.deepStrictEqual(e.symptom_categories, []);
  assert.deepStrictEqual(e.work_categories, []);
});
