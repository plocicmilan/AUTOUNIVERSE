/* NHTSA VPIC — VIN decoder helper
   Autopijaca+Autodelovi SPEC v0.2 sekcija 5.2.2

   Real-time poziv na javni API sa lokalnim kesom (VIN je immutable — kesira se zauvek).
   Bez API kljuca. Bez rate-limit-a za normalno koriscenje.

   API:
     const vpic = require('./lib/vpic');
     const info = await vpic.decode('1FA6P8TD5M5100001');
     // -> { vin, make, model, model_year, ..., cached: false }
*/

const VPIC_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';
const USER_AGENT = 'AutoUniverse/0.1 (+https://autouniverse.rs)';

let getDb;
try { ({ getDb } = require('../db.js')); } catch (e) { getDb = null; }

// VIN validation — 17 chars, alphanumeric, bez I/O/Q
function isValidVIN(vin) {
  if (typeof vin !== 'string') return false;
  const v = vin.trim().toUpperCase();
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
}

// Vadi cistu kolonu iz VPIC odgovora
function pick(row, key) {
  const v = row[key];
  if (v == null || v === '' || v === '0' || v === 'null') return null;
  return v;
}

function pickInt(row, key) {
  const v = pick(row, key);
  if (v == null) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

async function fetchFromVpic(vin) {
  const url = `${VPIC_URL}/${encodeURIComponent(vin)}?format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`VPIC HTTP ${res.status}`);
  const data = await res.json();
  if (!data.Results || !data.Results.length) throw new Error('VPIC vratio prazan Results');
  const row = data.Results[0];

  // ErrorCode 0 = success; 1+ = partial ili fail (VPIC dokumentacija)
  const errorCode = pick(row, 'ErrorCode');
  if (errorCode && errorCode.startsWith('7')) {
    // VIN pattern nije prepoznat — vrati minimalni zapis, ne throw
  }

  return {
    vin: vin.toUpperCase(),
    make: pick(row, 'Make'),
    model: pick(row, 'Model'),
    model_year: pickInt(row, 'ModelYear'),
    manufacturer: pick(row, 'Manufacturer'),
    plant_city: pick(row, 'PlantCity'),
    plant_country: pick(row, 'PlantCountry'),
    vehicle_type: pick(row, 'VehicleType'),
    body_class: pick(row, 'BodyClass'),
    engine_cylinders: pickInt(row, 'EngineCylinders'),
    engine_hp: pickInt(row, 'EngineHP'),
    fuel_type: pick(row, 'FuelTypePrimary'),
    transmission: pick(row, 'TransmissionStyle'),
    drive_type: pick(row, 'DriveType'),
    raw_json: JSON.stringify(row),
    source: 'vpic'
  };
}

function readFromCache(db, vin) {
  const row = db.prepare('SELECT * FROM vin_decode_cache WHERE vin = ?').get(vin);
  if (!row) return null;
  return {
    ...row,
    cached: true,
    // raw_json ostaje string; caller moze da parsira po potrebi
  };
}

function writeToCache(db, info) {
  db.prepare(`
    INSERT OR REPLACE INTO vin_decode_cache (
      vin, make, model, model_year, manufacturer, plant_city, plant_country,
      vehicle_type, body_class, engine_cylinders, engine_hp,
      fuel_type, transmission, drive_type, raw_json, source, cached_at
    ) VALUES (
      @vin, @make, @model, @model_year, @manufacturer, @plant_city, @plant_country,
      @vehicle_type, @body_class, @engine_cylinders, @engine_hp,
      @fuel_type, @transmission, @drive_type, @raw_json, @source, datetime('now')
    )
  `).run(info);
}

/**
 * Dekodira VIN. Vraca { vin, make, model, ..., cached: bool }.
 * @param {string} vin
 * @param {object} [opts]
 * @param {boolean} [opts.skipCache=false]
 * @param {import('better-sqlite3').Database} [opts.db]  — override db za testove
 */
async function decode(vin, opts = {}) {
  if (!isValidVIN(vin)) throw new Error('Nevalidan VIN (mora biti 17 chars, bez I/O/Q): ' + vin);
  const V = vin.trim().toUpperCase();
  const db = opts.db || (getDb ? getDb() : null);

  // 1. Kes prvo (ako db postoji i skipCache nije true)
  if (db && !opts.skipCache) {
    const cached = readFromCache(db, V);
    if (cached) return cached;
  }

  // 2. Fetch VPIC
  const info = await fetchFromVpic(V);

  // 3. Sacuvaj u kes
  if (db) writeToCache(db, info);

  return { ...info, cached: false };
}

module.exports = { decode, isValidVIN };
