/* ============================================================
   AUTO UNIVERSE — CORE / AUTOPIJACA CLIENT  (Nivo 0)
   - Čita platform-url.json sa GitHub Pages → zna gde je Autopijaca server
   - Driver (trade_mode vozila) koristi za objavljivanje oglasa
   - seller_token se čuva lokalno po vehicle_id
   ============================================================ */
(function (global) {
  "use strict";

const PLATFORM_URL_PATH = '/AUTOUNIVERSE/platform-url.json';
const STORAGE_KEY       = 'autopijaca_url';
const LISTINGS_KEY      = 'ap_listings'; // { [vehicleId]: { listing_id, seller_token, url } }

let _baseUrl = null;

async function getPlatformUrl() {
  if (_baseUrl) return _baseUrl;

  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (cached) { _baseUrl = cached; return _baseUrl; }

  try {
    const res = await fetch(PLATFORM_URL_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    // Podrška za novi format ({ autopijaca: "..." }) i fallback na localhost
    const url = data.autopijaca || null;
    if (url) {
      _baseUrl = url;
      sessionStorage.setItem(STORAGE_KEY, _baseUrl);
      return _baseUrl;
    }
  } catch { /* server nedostupan */ }
  return null;
}

async function apiCall(method, path, body, headers) {
  const base = await getPlatformUrl();
  if (!base) throw new Error('Autopijaca server nije dostupan');

  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Greška'), { status: res.status });
  return data;
}

// Čuva oglas za vozilo u localStorage
function saveListingLocal(vehicleId, listing_id, seller_token, url) {
  const map = getListingsMap();
  map[vehicleId] = { listing_id, seller_token, url, created_at: new Date().toISOString() };
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(map));
}

function getListingsMap() {
  try { return JSON.parse(localStorage.getItem(LISTINGS_KEY) || '{}'); } catch { return {}; }
}

function getListingForVehicle(vehicleId) {
  return getListingsMap()[vehicleId] || null;
}

function removeListingLocal(vehicleId) {
  const map = getListingsMap();
  delete map[vehicleId];
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(map));
}

// POST /listings — objavi oglas
async function publish(vehicleId, payload) {
  const data = await apiCall('POST', '/listings', payload);
  saveListingLocal(vehicleId, data.id, data.seller_token, data.url);
  return data;
}

// GET /listings/:id/seller — prodavac vidi oglas + poruke
async function getMyListing(vehicleId) {
  const local = getListingForVehicle(vehicleId);
  if (!local) return null;
  return apiCall('GET', `/listings/${local.listing_id}/seller`, null, {
    'X-Seller-Token': local.seller_token
  });
}

// PUT /listings/:id — menja status/cenu
async function updateListing(vehicleId, changes) {
  const local = getListingForVehicle(vehicleId);
  if (!local) throw new Error('Oglas nije pronađen lokalno');
  return apiCall('PUT', `/listings/${local.listing_id}`, changes, {
    'X-Seller-Token': local.seller_token
  });
}

// DELETE /listings/:id — briše oglas
async function deleteListing(vehicleId) {
  const local = getListingForVehicle(vehicleId);
  if (!local) throw new Error('Oglas nije pronađen lokalno');
  const result = await apiCall('DELETE', `/listings/${local.listing_id}`, null, {
    'X-Seller-Token': local.seller_token
  });
  removeListingLocal(vehicleId);
  return result;
}

async function isAvailable() {
  try { return !!(await getPlatformUrl()); } catch { return false; }
}

global.Autopijaca = {
  isAvailable,
  publish,
  getMyListing,
  updateListing,
  deleteListing,
  getListingForVehicle,
};

}(window));
