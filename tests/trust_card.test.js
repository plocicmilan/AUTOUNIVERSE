/* Trust Card UI komponent sanity — sintaksni + rendering testovi */
const { test } = require('node:test');
const assert = require('node:assert');

// Simulacija window za window.Trust reference
global.window = {};
require('../core/js/trust.js');
const TrustCard = require('../core/js/trust_card.js');

test('TrustCard.html: prazan events → bronze, 0 score', () => {
  const h = TrustCard.html({ id: 'v1' }, [], []);
  assert.ok(h.includes('Bronzani'));
  assert.ok(h.includes('tc-bronze'));
  assert.ok(h.includes('>0<'));
});

test('TrustCard.html: gold nivo za 5 verifikovanih + 6 owner + 5 racuna + km', () => {
  const events = [
    ...Array.from({ length: 5 }, (_, i) => ({
      vehicle_id: 'v1', source: 'mechanic', type: 'service',
      km: 10000 * (i + 1), event_date: `2025-0${i + 1}-15`
    })),
    ...Array.from({ length: 6 }, () => ({
      vehicle_id: 'v1', source: 'owner', type: 'note', event_date: '2025-06-01'
    }))
  ];
  const docs = Array.from({ length: 5 }, () => ({ vehicle_id: 'v1', doc_type: 'invoice' }));
  // Score: 40 (verified) + 24 (5 invoices cap) + 6 (owner) + 10 (km) = 80 → gold
  const h = TrustCard.html({ id: 'v1' }, events, docs);
  assert.ok(h.includes('tc-gold'));
  assert.ok(h.includes('Zlatni'));
});

test('TrustCard.html: opts.compact skriva breakdown', () => {
  const h = TrustCard.html({ id: 'v1' }, [], [], { compact: true });
  assert.ok(h.includes('tc-compact'));
  assert.ok(!h.includes('tc-breakdown'));
});

test('TrustCard.html: opts.showTips prikazuje savete za bronze', () => {
  const h = TrustCard.html({ id: 'v1' }, [], [], { showTips: true });
  assert.ok(h.includes('Kako povećati'));
  assert.ok(h.includes('Iskopaj fioku') || h.includes('mehaničar'));
});

test('TrustCard.html: opts.onclick dodaje click handler', () => {
  const h = TrustCard.html({ id: 'v1' }, [], [], { onclick: 'alert(1)' });
  assert.ok(h.includes('onclick="alert(1)"'));
  assert.ok(h.includes('cursor:pointer'));
});

test('TrustCard.style: vraca <style> string sa CSS klasama', () => {
  const s = TrustCard.style();
  assert.ok(s.startsWith('<style>'));
  assert.ok(s.includes('.tc-gold'));
  assert.ok(s.includes('.tc-silver'));
  assert.ok(s.includes('.tc-bronze'));
});

test('TrustCard.html: XSS zastita u onclick', () => {
  const h = TrustCard.html({ id: 'v1' }, [], [], { onclick: '"><script>alert(1)</script>' });
  assert.ok(!h.includes('<script>'));
  assert.ok(h.includes('&quot;'));
});
