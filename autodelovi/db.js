const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'autodelovi.db');

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
    CREATE TABLE IF NOT EXISTS parts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_token   TEXT    NOT NULL,
      title          TEXT    NOT NULL,
      category       TEXT    NOT NULL DEFAULT 'ostalo',
      condition      TEXT    NOT NULL DEFAULT 'polovan',
      part_number    TEXT,
      compatible     TEXT    NOT NULL DEFAULT '[]',
      price          REAL    NOT NULL,
      currency       TEXT    NOT NULL DEFAULT 'EUR',
      description    TEXT,
      city           TEXT,
      contact_name   TEXT    NOT NULL,
      contact_phone  TEXT    NOT NULL,
      contact_method TEXT    NOT NULL DEFAULT 'phone_call',
      status         TEXT    NOT NULL DEFAULT 'active',
      views          INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS part_photos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id    INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
      url        TEXT    NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id      INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
      buyer_name   TEXT    NOT NULL,
      buyer_phone  TEXT,
      content      TEXT    NOT NULL,
      read         INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { getDb };
