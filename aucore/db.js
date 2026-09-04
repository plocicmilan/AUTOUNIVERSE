const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.AUCORE_DB_PATH || process.env.AUTOHUB_DB_PATH || path.join(__dirname, 'data', 'autohub.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      email     TEXT    NOT NULL UNIQUE,
      password  TEXT    NOT NULL,
      name      TEXT    NOT NULL,
      role      TEXT    NOT NULL DEFAULT 'user',
      status    TEXT    NOT NULL DEFAULT 'active',
      created_at TEXT   NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id    INTEGER NOT NULL REFERENCES users(id),
      make        TEXT    NOT NULL,
      model       TEXT    NOT NULL,
      year        INTEGER,
      plate       TEXT,
      vin         TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grants (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      grantor_id  INTEGER NOT NULL REFERENCES users(id),
      grantee_id  INTEGER NOT NULL REFERENCES users(id),
      vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id),
      role        TEXT    NOT NULL,
      expires_at  TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(grantor_id, grantee_id, vehicle_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id),
      author_id   INTEGER NOT NULL REFERENCES users(id),
      source      TEXT    NOT NULL DEFAULT 'user',
      app         TEXT    NOT NULL DEFAULT 'autohub',
      type        TEXT    NOT NULL,
      data        TEXT    NOT NULL DEFAULT '{}',
      retroactive INTEGER NOT NULL DEFAULT 0,
      event_date  TEXT    NOT NULL DEFAULT (datetime('now')),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER REFERENCES users(id),
      action      TEXT    NOT NULL,
      entity      TEXT,
      entity_id   INTEGER,
      detail      TEXT,
      ip          TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS owner_notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id   INTEGER NOT NULL REFERENCES users(id),
      vehicle_id  INTEGER REFERENCES vehicles(id),
      content     TEXT    NOT NULL,
      visibility  TEXT    NOT NULL DEFAULT 'owner',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT    PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      expires_at  TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS share_tokens (
      token         TEXT    PRIMARY KEY,
      payload       TEXT    NOT NULL,
      hub_url       TEXT    NOT NULL DEFAULT '',
      mechanic_name TEXT    NOT NULL DEFAULT '',
      expires_at    TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Anonymized aggregation table (Task 3 iz BRIEFING_2026_07_21_schema_agregacija)
    -- Definisano od dana 1 da buduca populacija bude nusproizvod, ne migracija.
    -- Tabela OSTAJE PRAZNA u v1 AU Core-a: nema INSERT-a, nema extract worker-a, nema opt-in UI.
    -- Populacija dolazi u hipotezi H2 (extract worker + k-anonymity + eksplicitni opt-in).
    CREATE TABLE IF NOT EXISTS anonymized_events (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,

      -- Vehicle context (denormalizovano, bez FK ka vehicles/users)
      vehicle_make         TEXT NOT NULL,
      vehicle_model        TEXT NOT NULL,
      vehicle_year_bucket  TEXT NOT NULL,   -- npr. "2015-2019", ne tacna godina
      engine_code          TEXT,
      mileage_bucket       TEXT,             -- npr. "150k-200k", ne tacna km

      -- Event context
      symptom_categories   TEXT,             -- JSON array of tags
      symptom_free_text    TEXT,             -- opciono, anonimizovano
      work_categories      TEXT,             -- JSON array of tags
      resolution_free_text TEXT,             -- opciono, anonimizovano
      parts_json           TEXT,             -- [{brand, model}] bez cena

      -- Metadata
      region               TEXT,             -- 'RS' ili sire, nikad grad
      event_year           INTEGER,          -- samo godina, ne datum
      event_month          INTEGER,          -- opciono
      source_type          TEXT,             -- 'garage' | 'driver'
      extracted_at         TEXT NOT NULL DEFAULT (datetime('now'))

      -- NAMERNO IZOSTAVLJENO: vehicle_id, user_id, VIN, plate, ime, telefon,
      -- adresa, cena, ime mehanicara, foto path — sve PII/business-sensitive.
    );

    CREATE INDEX IF NOT EXISTS idx_anon_make_model  ON anonymized_events(vehicle_make, vehicle_model);
    CREATE INDEX IF NOT EXISTS idx_anon_year_bucket ON anonymized_events(vehicle_year_bucket);

    CREATE TABLE IF NOT EXISTS reminders (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id       INTEGER NOT NULL REFERENCES vehicles(id),
      author_id        INTEGER NOT NULL REFERENCES users(id),
      title            TEXT    NOT NULL,
      due_date         TEXT,
      due_mileage_km   INTEGER,
      done             INTEGER NOT NULL DEFAULT 0,
      done_at          TEXT,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON reminders(vehicle_id, done);

    -- Magic-link auth tabela (Todo #124 iz AUTOHUB_PLATFORM_SPEC v0.1 sekcija 6)
    -- Token je primary key; jednokratna upotreba, kratki TTL.
    CREATE TABLE IF NOT EXISTS magic_links (
      token       TEXT    PRIMARY KEY,
      email       TEXT    NOT NULL,
      purpose     TEXT    NOT NULL DEFAULT 'login',   -- 'register' | 'login' | 'password_reset' | 'device_link'
      used_at     TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      expires_at  TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_magic_email    ON magic_links(email);
    CREATE INDEX IF NOT EXISTS idx_magic_expires  ON magic_links(expires_at);

    -- Notification queue (SPEC sekcija 8)
    -- Push kanali (in-app feed, push, email) se granaju iz istog zapisa.
    CREATE TABLE IF NOT EXISTS notifications (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_user_id  INTEGER NOT NULL REFERENCES users(id),
      category           TEXT    NOT NULL,           -- 'service_update' | 'part_offer' | 'system' | 'promo' | 'security' | 'lead' | 'partner_deal'
      priority           TEXT    NOT NULL DEFAULT 'normal',  -- 'high' (push+feed) | 'normal' (feed) | 'low' (feed only)
      title              TEXT    NOT NULL,
      body               TEXT    NOT NULL,
      action_url         TEXT,
      metadata           TEXT,                       -- JSON
      read_at            TEXT,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
      expires_at         TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_user_id, read_at, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notif_category  ON notifications(category);

    -- Vehicle catalog iz Wikidata + VPIC (Todo #128 iz SPEC v0.2 sekcija 5.2.1)
    -- Bulk import kvartalno; safe measure: postojeci modeli se ne brisu.
    CREATE TABLE IF NOT EXISTS vehicle_catalog (
      wikidata_id     TEXT    PRIMARY KEY,           -- npr. 'Q148237'
      make            TEXT    NOT NULL,
      model           TEXT    NOT NULL,
      year_start      INTEGER,
      year_end        INTEGER,
      body_style      TEXT,
      engine          TEXT,
      fuel_type       TEXT,
      manufacturer    TEXT,
      source          TEXT    NOT NULL DEFAULT 'wikidata',   -- 'wikidata' | 'vpic' | 'manual'
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_catalog_make       ON vehicle_catalog(make);
    CREATE INDEX IF NOT EXISTS idx_catalog_make_model ON vehicle_catalog(make, model);

    -- VIN decode kes (Todo #129 iz Autopijaca+Autodelovi SPEC v0.2 sekcija 5.2.2)
    -- Real-time poziv na NHTSA VPIC API; rezultat se kesira zauvek (VIN je immutable).
    CREATE TABLE IF NOT EXISTS vin_decode_cache (
      vin              TEXT    PRIMARY KEY,
      make             TEXT,
      model            TEXT,
      model_year       INTEGER,
      manufacturer     TEXT,
      plant_city       TEXT,
      plant_country    TEXT,
      vehicle_type     TEXT,
      body_class       TEXT,
      engine_cylinders INTEGER,
      engine_hp        INTEGER,
      fuel_type        TEXT,
      transmission     TEXT,
      drive_type       TEXT,
      raw_json         TEXT,     -- pun VPIC odgovor za buduce prosirene upite
      source           TEXT    NOT NULL DEFAULT 'vpic',
      cached_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Vehicles — updated_at za last-write-wins sync (Faza 5)
  const vehCols = db.pragma('table_info(vehicles)').map(c => c.name);
  if (!vehCols.includes('updated_at')) {
    db.exec("ALTER TABLE vehicles ADD COLUMN updated_at TEXT");
    db.exec("UPDATE vehicles SET updated_at = created_at WHERE updated_at IS NULL");
  }
  if (!vehCols.includes('status'))                   db.exec("ALTER TABLE vehicles ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  if (!vehCols.includes('sold_at'))                  db.exec("ALTER TABLE vehicles ADD COLUMN sold_at TEXT");
  if (!vehCols.includes('for_sale'))                 db.exec("ALTER TABLE vehicles ADD COLUMN for_sale INTEGER NOT NULL DEFAULT 0");
  if (!vehCols.includes('sale_price'))               db.exec("ALTER TABLE vehicles ADD COLUMN sale_price REAL");
  if (!vehCols.includes('sale_currency'))            db.exec("ALTER TABLE vehicles ADD COLUMN sale_currency TEXT DEFAULT 'EUR'");
  if (!vehCols.includes('autopijaca_listing_id'))    db.exec("ALTER TABLE vehicles ADD COLUMN autopijaca_listing_id INTEGER");
  if (!vehCols.includes('autopijaca_seller_token'))  db.exec("ALTER TABLE vehicles ADD COLUMN autopijaca_seller_token TEXT");

  // Sessions — prosirenje postojece tabele (device tracking + revocation, SPEC 6.3)
  const sesCols = db.pragma('table_info(sessions)').map(c => c.name);
  if (!sesCols.includes('device_id'))    db.exec("ALTER TABLE sessions ADD COLUMN device_id TEXT");
  if (!sesCols.includes('device_name'))  db.exec("ALTER TABLE sessions ADD COLUMN device_name TEXT");
  if (!sesCols.includes('ip_address'))   db.exec("ALTER TABLE sessions ADD COLUMN ip_address TEXT");
  if (!sesCols.includes('user_agent'))   db.exec("ALTER TABLE sessions ADD COLUMN user_agent TEXT");
  if (!sesCols.includes('last_used_at')) db.exec("ALTER TABLE sessions ADD COLUMN last_used_at TEXT");
  if (!sesCols.includes('revoked_at'))   db.exec("ALTER TABLE sessions ADD COLUMN revoked_at TEXT");

  // Grants — prosirenje za generalizovan target (vehicle | workspace | listing) + soft-delete + notes
  const grCols = db.pragma('table_info(grants)').map(c => c.name);
  if (!grCols.includes('target_type')) db.exec("ALTER TABLE grants ADD COLUMN target_type TEXT NOT NULL DEFAULT 'vehicle'");
  if (!grCols.includes('target_id'))   db.exec("ALTER TABLE grants ADD COLUMN target_id TEXT");
  if (!grCols.includes('revoked_at'))  db.exec("ALTER TABLE grants ADD COLUMN revoked_at TEXT");
  if (!grCols.includes('created_by'))  db.exec("ALTER TABLE grants ADD COLUMN created_by TEXT DEFAULT 'user'");
  if (!grCols.includes('notes'))       db.exec("ALTER TABLE grants ADD COLUMN notes TEXT");

  // Users — dodati subscription_tier + subscription_expires_at + last_login_at (SPEC 6.3)
  const usCols = db.pragma('table_info(users)').map(c => c.name);
  if (!usCols.includes('subscription_tier'))       db.exec("ALTER TABLE users ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free'");
  if (!usCols.includes('subscription_expires_at')) db.exec("ALTER TABLE users ADD COLUMN subscription_expires_at TEXT");
  if (!usCols.includes('last_login_at'))           db.exec("ALTER TABLE users ADD COLUMN last_login_at TEXT");

  // Vehicle media & documents (Hub storage feature)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicle_photos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id),
      vehicle_id    INTEGER NOT NULL REFERENCES vehicles(id),
      filename      TEXT    NOT NULL,
      original_name TEXT    NOT NULL DEFAULT '',
      size_bytes    INTEGER NOT NULL DEFAULT 0,
      mime_type     TEXT    NOT NULL DEFAULT 'image/jpeg',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_vphoto_vehicle ON vehicle_photos(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_vphoto_user    ON vehicle_photos(user_id);

    CREATE TABLE IF NOT EXISTS vehicle_documents (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id),
      vehicle_id    INTEGER NOT NULL REFERENCES vehicles(id),
      doc_type      TEXT    NOT NULL DEFAULT 'ostalo',
      filename      TEXT    NOT NULL,
      original_name TEXT    NOT NULL DEFAULT '',
      size_bytes    INTEGER NOT NULL DEFAULT 0,
      mime_type     TEXT    NOT NULL DEFAULT 'application/pdf',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_vdoc_vehicle ON vehicle_documents(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_vdoc_user    ON vehicle_documents(user_id);
  `);

  // Migracije za postojeće baze (legacy user tabela)
  const cols = db.pragma('table_info(users)').map(c => c.name);
  if (!cols.includes('status'))             db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  if (!cols.includes('phone'))              db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
  if (!cols.includes('tier'))               db.exec("ALTER TABLE users ADD COLUMN tier TEXT NOT NULL DEFAULT 'free'");
  if (!cols.includes('email_verified'))     db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0");
  if (!cols.includes('verification_token')) db.exec("ALTER TABLE users ADD COLUMN verification_token TEXT");
  if (!cols.includes('drip_step'))          db.exec("ALTER TABLE users ADD COLUMN drip_step INTEGER NOT NULL DEFAULT 0");
  if (!cols.includes('drip_sent_at'))       db.exec("ALTER TABLE users ADD COLUMN drip_sent_at TEXT");
}

function audit(action, opts = {}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_log (user_id, action, entity, entity_id, detail, ip)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    opts.userId ?? null,
    action,
    opts.entity ?? null,
    opts.entityId ?? null,
    opts.detail ? JSON.stringify(opts.detail) : null,
    opts.ip ?? null
  );
}

const { getTier } = require('./lib/tiers');

function getTierLimits(tier) {
  return getTier(tier);
}

module.exports = { getDb, audit, getTierLimits };
