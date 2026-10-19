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

  -- Social graph: follower follows followee.
  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (follower_id, followee_id)
  );
  CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);

  -- "Respect" (likes) on posts.
  CREATE TABLE IF NOT EXISTS likes (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, post_id)
  );
  CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);

  -- type: like | comment | follow | mention | overtaken. post_id/amount_cents depend on type.
  CREATE TABLE IF NOT EXISTS notifications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         TEXT NOT NULL,
    post_id      INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    amount_cents INTEGER,
    created_at   INTEGER NOT NULL,
    read_at      INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

  -- Uploaded images (post photos, avatars). Small, resized client-side before upload.
  CREATE TABLE IF NOT EXISTS media (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mime       TEXT NOT NULL,
    bytes      BLOB NOT NULL,
    width      INTEGER NOT NULL DEFAULT 0,
    height     INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
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

  await addColumns(client, "posts", [["media_id", "INTEGER"]]); // optional photo
  await addColumns(client, "users", [["avatar_media_id", "INTEGER"]]); // optional profile picture
  await client.executeMultiple(`
    CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id, created_at);
  `);
}

async function addColumns(client: Client, table: string, add: [string, string][]): Promise<void> {
  const cols = new Set((await client.execute(`PRAGMA table_info(${table})`)).rows.map((r) => String(r.name)));
  for (const [name, type] of add) {
    if (!cols.has(name)) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
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
  avatar_media_id: number | null;
};

/** Public shape of a user — never includes password_hash. */
export type PublicUser = Omit<UserRow, "password_hash">;

export function toPublic(u: UserRow): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...rest } = u;
  return rest;
}
