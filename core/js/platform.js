/* ============================================================
   AUTO UNIVERSE — CORE / PLATFORM  (Nivo 0)
   - Čita platform-url.json sa GitHub Pages → zna gde je AutoHub server
   - Pruža apiCall, syncEvents i session management za Garage/Driver
   ============================================================ */
(function (global) {
  "use strict";

const PLATFORM_URL_PATH = '/AUTOUNIVERSE/platform-url.json';
const STORAGE_KEY = 'autohub_url';
const STORAGE_SESSION_KEY = 'autohub_session';

let _baseUrl = null;

async function getPlatformUrl() {
  if (_baseUrl) return _baseUrl;

  // Keširano u sessionStorage
  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (cached) { _baseUrl = cached; return _baseUrl; }

  try {
    const res = await fetch(PLATFORM_URL_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.url) {
      _baseUrl = data.url;
      sessionStorage.setItem(STORAGE_KEY, _baseUrl);
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
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

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

  global.Platform = { getPlatformUrl, apiCall, isServerAvailable, getSession, setSession, syncEvents };

}(typeof window !== 'undefined' ? window : this));
