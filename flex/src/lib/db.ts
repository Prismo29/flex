import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// Single SQLite file, created on first use. Uses Node's built-in sqlite (no native deps).
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "flex.db");

declare global {
  var __flexDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      display_name  TEXT NOT NULL,
      bio           TEXT NOT NULL DEFAULT '',
      avatar_color  TEXT NOT NULL DEFAULT '#d4af37',
      total_spent_cents INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    );

    -- Every purchase of "flex" (fake payments for now; Stripe later).
    CREATE TABLE IF NOT EXISTS purchases (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL,
      created_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at);

    -- Feed posts. kind = 'post' (user text) or 'purchase' (auto-posted when someone buys).
    CREATE TABLE IF NOT EXISTS posts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind         TEXT NOT NULL DEFAULT 'post',
      body         TEXT NOT NULL,
      amount_cents INTEGER,
      created_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
  `);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__flexDb) globalThis.__flexDb = open();
  return globalThis.__flexDb;
}

export type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  bio: string;
  avatar_color: string;
  total_spent_cents: number;
  created_at: number;
};

/** Public shape of a user — never includes password_hash. */
export type PublicUser = Omit<UserRow, "password_hash">;

export function toPublic(u: UserRow): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...rest } = u;
  return rest;
}
