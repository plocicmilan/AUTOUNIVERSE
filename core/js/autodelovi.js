/* ============================================================
   AUTO UNIVERSE — CORE / AUTODELOVI CLIENT  (Nivo 0)
   - Čita platform-url.json → zna gde je Autodelovi server
   - Garage koristi za objavljivanje auto delova
   - seller_token se čuva lokalno u listi svih delova
   ============================================================ */
(function (global) {
  "use strict";

const PLATFORM_URL_PATH = '/AUTOUNIVERSE/platform-url.json';
const STORAGE_KEY       = 'autodelovi_url';
const PARTS_KEY         = 'ad_parts'; // [{part_id, seller_token, url, title, created_at}]

let _baseUrl = null;

async function getPlatformUrl() {
  if (_baseUrl) return _baseUrl;
  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (cached) { _baseUrl = cached; return _baseUrl; }
  try {
    const res = await fetch(PLATFORM_URL_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const url = data.autodelovi || null;
    if (url) { _baseUrl = url; sessionStorage.setItem(STORAGE_KEY, url); return url; }
  } catch { /* server nedostupan */ }
  return null;
}

async function apiCall(method, path, body, headers) {
  const base = await getPlatformUrl();
  if (!base) throw new Error('Autodelovi server nije dostupan');
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Greška'), { status: res.status });
  return data;
}

function getPartsMap() {
  try { return JSON.parse(localStorage.getItem(PARTS_KEY) || '[]'); } catch { return []; }
}

function savePartLocal(part_id, seller_token, url, title) {
  const list = getPartsMap();
  list.unshift({ part_id, seller_token, url, title, created_at: new Date().toISOString() });
  localStorage.setItem(PARTS_KEY, JSON.stringify(list));
}

function removePartLocal(part_id) {
  const list = getPartsMap().filter(p => p.part_id !== part_id);
  localStorage.setItem(PARTS_KEY, JSON.stringify(list));
}

// POST /photos — upload jedne base64 slike, vraća {url}
async function uploadPhoto(dataUrl) {
  return apiCall('POST', '/photos', { data: dataUrl });
}

// POST /parts — Garage objavljuje deo
async function publishPart(payload) {
  const data = await apiCall('POST', '/parts', payload);
  savePartLocal(data.id, data.seller_token, data.url, payload.title);
  return data;
}

// Lokalna lista oglasa
function getMyParts() {
  return getPartsMap();
}

// GET /parts/:id/seller — detalji sa porukama
async function getMyPartDetail(part_id, seller_token) {
  return apiCall('GET', `/parts/${part_id}/seller`, null, { 'X-Seller-Token': seller_token });
}

// DELETE /parts/:id
async function deletePart(part_id, seller_token) {
  const result = await apiCall('DELETE', `/parts/${part_id}`, null, { 'X-Seller-Token': seller_token });
  removePartLocal(part_id);
  return result;
}

async function isAvailable() {
  try { return !!(await getPlatformUrl()); } catch { return false; }
}

global.Autodelovi = {
  isAvailable,
  uploadPhoto,
  publishPart,
  getMyParts,
  getMyPartDetail,
  deletePart,
};

}(window));
