/* ============================================================
   AUTO UNIVERSE — CORE / AUTOHUB CLIENT  (Nivo 0)
   - Čita platform-url.json sa GitHub Pages → zna gde je AutoHub server
   - Pruža apiCall, syncEvents i session management za Garage/Driver
   Napomena: ovaj modul je odgovoran ZA KOMUNIKACIJU SA SERVEROM.
   Environment detection (web vs native) je u core/js/platform.js.
   ============================================================ */
(function (global) {
  "use strict";

const PLATFORM_URL_PATH = '/AUTOUNIVERSE/platform-url.json';
const STORAGE_KEY = 'autohub_url';
const STORAGE_SESSION_KEY = 'autohub_session';

let _baseUrl = null;

async function getPlatformUrl() {
  // In-memory cache samo za trajanje jedne akcije (nema persist između fetch-ova ako se app osvezi)
  if (_baseUrl) return _baseUrl;

  try {
    // cache-bust param + no-store da SW i browser cache oboje preskoče
    const bust = Date.now();
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(PLATFORM_URL_PATH + '?t=' + bust, {
      cache: 'no-store',
      signal: ctrl.signal,
    }).finally(() => clearTimeout(tid));
    if (!res.ok) return null;
    const data = await res.json();
    if (data.url) {
      _baseUrl = data.url;
      return _baseUrl;
    }
  } catch {
    // Server nije aktivan ili nema interneta
  }
  return null;
}

async function apiCall(method, path, body) {
  const base = await getPlatformUrl();
  if (!base) throw new Error('AutoHub server nije dostupan');

  const session = localStorage.getItem(STORAGE_SESSION_KEY);
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 10000);
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: ctrl.signal,
  }).finally(() => clearTimeout(tid));

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Greška'), { status: res.status });
  return data;
}

async function isServerAvailable() {
  const base = await getPlatformUrl();
  if (!base) return false;
  try {
    const res = await fetch(base + '/auth/me', { method: 'GET' });
    return res.status !== 0;
  } catch {
    return false;
  }
}

function getSession() {
  return localStorage.getItem(STORAGE_SESSION_KEY);
}

function setSession(token) {
  if (token) localStorage.setItem(STORAGE_SESSION_KEY, token);
  else localStorage.removeItem(STORAGE_SESSION_KEY);
  _baseUrl = null; // reset cache
}

async function syncEvents(vehicleId, events) {
  return apiCall('POST', `/vehicles/${vehicleId}/events/batch`, events);
}

// Kreiranje share tokena (Garage → vlasnik). Payload ne sme sadržati cene.
async function createShare(payload) {
  return apiCall('POST', '/public/share', payload);
}

// Dohvatanje share tokena (Driver uvozi zapis od mehaničara).
// hubUrl: baza AutoHub servera (iz ?hub= URL param)
async function fetchShare(hubUrl, token) {
  const url = hubUrl.replace(/\/$/, '') + '/public/share/' + token;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Greška pri dohvatanju');
  return data;
}

  global.AutoHub = { getPlatformUrl, apiCall, isServerAvailable, getSession, setSession, syncEvents, createShare, fetchShare };

}(typeof window !== 'undefined' ? window : this));
