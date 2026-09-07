import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import initSqlJs from "sql.js";

const databasePath = process.env.AUTH_DB_PATH ?? join(process.cwd(), "data", "auth.db");
const databaseDir = dirname(databasePath);

if (!existsSync(databaseDir)) {
  mkdirSync(databaseDir, { recursive: true });
}

const sqlJsDistPath = join(process.cwd(), "node_modules", "sql.js", "dist");
const SQL = await initSqlJs({
  locateFile: (file) => pathToFileURL(join(sqlJsDistPath, file)).href,
});

let db: any;
let flushTimer: NodeJS.Timeout | null = null;

function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    writeFileSync(databasePath, Buffer.from(data));
  } catch (err) {
    console.error("Failed to save database:", err);
  }
}

function ensureSchemaAndIndexes(database: any) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reset_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires_at ON reset_tokens(expires_at);
  `);
}

function loadDatabase() {
  if (existsSync(databasePath)) {
    const fileBuffer = readFileSync(databasePath);
    const database = new SQL.Database(new Uint8Array(fileBuffer));
    db = database;
    ensureSchemaAndIndexes(database);
    return database;
  }

  const database = new SQL.Database();
  db = database;
  ensureSchemaAndIndexes(database);
  saveDatabase();
  return database;
}

export function cleanupExpiredSessions() {
  if (!db) return;
  try {
    const now = Date.now();
    db.run("DELETE FROM sessions WHERE expires_at <= ?", [now]);
    db.run("DELETE FROM reset_tokens WHERE expires_at <= ?", [now]);
    saveDatabase();
  } catch (err) {
    console.error("Failed to cleanup expired sessions:", err);
  }
}

export function getDatabase() {
  if (!db) {
    db = loadDatabase();
    cleanupExpiredSessions();
  }
  return db;
}

export function flushDatabase() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    saveDatabase();
    flushTimer = null;
  }, 100);
}

export function flushDatabaseSync() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  saveDatabase();
}

