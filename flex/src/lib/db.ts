import "server-only";
import fs from "node:fs";
import { createClient, type Client, type InValue, type Transaction } from "@libsql/client";

// SQLite via libSQL. Locally this is a plain file (data/flex.db).
// Online, set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN to use a hosted Turso database.
const LOCAL_URL = "file:data/flex.db";

export const SCHEMA = `
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
`;

declare global {
  var __flexDb: Promise<Client> | undefined;
}

async function open(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL || LOCAL_URL;
  if (url === LOCAL_URL) fs.mkdirSync("data", { recursive: true });
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  await client.executeMultiple(SCHEMA);
  await migrate(client);
  return client;
}

/** Add columns introduced after the first release (CREATE TABLE IF NOT EXISTS won't add them). */
async function migrate(client: Client): Promise<void> {
  const cols = new Set(
    (await client.execute("PRAGMA table_info(purchases)")).rows.map((r) => String(r.name)),
  );
  const add: [string, string][] = [
    ["stripe_session_id", "TEXT"], // Stripe Checkout Session id; NULL for fake/test-mode purchases
    ["stripe_payment_intent", "TEXT"], // used to match refunds and disputes
    ["refunded_cents", "INTEGER NOT NULL DEFAULT 0"], // amount taken back via refund/dispute
  ];
  for (const [name, type] of add) {
    if (!cols.has(name)) await client.execute(`ALTER TABLE purchases ADD COLUMN ${name} ${type}`);
  }
  await client.executeMultiple(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_session ON purchases(stripe_session_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_intent ON purchases(stripe_payment_intent);
  `);
}

export function getDb(): Promise<Client> {
  if (!globalThis.__flexDb) {
    globalThis.__flexDb = open().catch((err) => {
      globalThis.__flexDb = undefined; // allow a retry on the next request
      throw err;
    });
  }
  return globalThis.__flexDb;
}

type Executor = Client | Transaction;

/** libSQL rows are array-like; turn them into plain objects keyed by column name. */
function toObjects<T>(rs: { columns: string[]; rows: ArrayLike<unknown>[] }): T[] {
  return rs.rows.map((row) => Object.fromEntries(rs.columns.map((c, i) => [c, row[i]])) as T);
}

/** All matching rows. Pass `tx` to run inside a transaction. */
export async function all<T>(sql: string, args: InValue[] = [], tx?: Executor): Promise<T[]> {
  const rs = await (tx ?? (await getDb())).execute({ sql, args });
  return toObjects<T>(rs);
}

/** First matching row, or undefined. */
export async function get<T>(sql: string, args: InValue[] = [], tx?: Executor): Promise<T | undefined> {
  return (await all<T>(sql, args, tx))[0];
}

/** INSERT/UPDATE/DELETE. Returns the new row id (for inserts) and rows changed. */
export async function run(
  sql: string,
  args: InValue[] = [],
  tx?: Executor,
): Promise<{ lastInsertRowid: number; changes: number }> {
  const rs = await (tx ?? (await getDb())).execute({ sql, args });
  return { lastInsertRowid: Number(rs.lastInsertRowid ?? 0), changes: rs.rowsAffected };
}

/** Run fn in a write transaction; commits on success, rolls back on error. */
export async function transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const tx = await (await getDb()).transaction("write");
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }
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
