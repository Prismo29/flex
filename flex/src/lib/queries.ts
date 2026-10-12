import "server-only";
import { getDb, type PublicUser } from "./db";

export type Period = "all" | "week";

export type LeaderboardEntry = {
  rank: number;
  user: PublicUser;
  cents: number;
};

export type PostRow = {
  id: number;
  user_id: number;
  kind: "post" | "purchase";
  body: string;
  amount_cents: number | null;
  created_at: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const PUBLIC_COLS = `u.id, u.username, u.display_name, u.bio, u.avatar_color, u.total_spent_cents, u.created_at`;

type UserWithCents = PublicUser & { cents: number };

function toEntries(rows: UserWithCents[]): LeaderboardEntry[] {
  return rows.map(({ cents, ...user }, i) => ({ rank: i + 1, user, cents: Number(cents) }));
}

/** Leaderboard: all-time (users.total_spent_cents) or last 7 days (sum of purchases). */
export function getLeaderboard(period: Period, limit = 100): LeaderboardEntry[] {
  const db = getDb();
  if (period === "week") {
    const rows = db
      .prepare(
        `SELECT ${PUBLIC_COLS}, SUM(p.amount_cents) AS cents
         FROM purchases p JOIN users u ON u.id = p.user_id
         WHERE p.created_at >= ?
         GROUP BY u.id
         HAVING cents > 0
         ORDER BY cents DESC, MIN(p.created_at) ASC
         LIMIT ?`,
      )
      .all(Date.now() - WEEK_MS, limit) as unknown as UserWithCents[];
    return toEntries(rows);
  }
  const rows = db
    .prepare(
      `SELECT ${PUBLIC_COLS}, u.total_spent_cents AS cents
       FROM users u
       WHERE u.total_spent_cents > 0
       ORDER BY u.total_spent_cents DESC, u.created_at ASC
       LIMIT ?`,
    )
    .all(limit) as unknown as UserWithCents[];
  return toEntries(rows);
}

/** Case-insensitive lookup (username column is COLLATE NOCASE). */
export function getUserByUsername(username: string): PublicUser | null {
  const row = getDb()
    .prepare(`SELECT ${PUBLIC_COLS} FROM users u WHERE u.username = ?`)
    .get(username) as unknown as PublicUser | undefined;
  return row ?? null;
}

/** All-time position (1-based), or null if the user hasn't spent anything. Ties broken by signup order. */
export function getUserRank(userId: number): number | null {
  const db = getDb();
  const me = db
    .prepare("SELECT total_spent_cents, created_at FROM users WHERE id = ?")
    .get(userId) as { total_spent_cents: number; created_at: number } | undefined;
  if (!me || me.total_spent_cents <= 0) return null;
  const { n } = db
    .prepare(
      `SELECT COUNT(*) AS n FROM users
       WHERE total_spent_cents > ?
          OR (total_spent_cents = ? AND created_at < ?)`,
    )
    .get(me.total_spent_cents, me.total_spent_cents, me.created_at) as { n: number };
  return Number(n) + 1;
}

/** The user ranked directly above the given all-time rank (rank - 1), or null. */
export function getUserAtRank(rank: number): LeaderboardEntry | null {
  if (rank < 1) return null;
  const row = getDb()
    .prepare(
      `SELECT ${PUBLIC_COLS}, u.total_spent_cents AS cents
       FROM users u
       WHERE u.total_spent_cents > 0
       ORDER BY u.total_spent_cents DESC, u.created_at ASC
       LIMIT 1 OFFSET ?`,
    )
    .get(rank - 1) as unknown as UserWithCents | undefined;
  if (!row) return null;
  const { cents, ...user } = row;
  return { rank, user, cents: Number(cents) };
}

export function getUserPurchaseStats(userId: number): { count: number; biggestCents: number } {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(MAX(amount_cents), 0) AS biggest
       FROM purchases WHERE user_id = ?`,
    )
    .get(userId) as { count: number; biggest: number };
  return { count: Number(row.count), biggestCents: Number(row.biggest) };
}

/** Sum of all-time spend across every user. */
export function getTotalFlexedCents(): number {
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(total_spent_cents), 0) AS total FROM users")
    .get() as { total: number };
  return Number(row.total);
}

export function getUserPosts(userId: number, limit = 30): PostRow[] {
  return getDb()
    .prepare(
      `SELECT id, user_id, kind, body, amount_cents, created_at
       FROM posts WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
    )
    .all(userId, limit) as unknown as PostRow[];
}
