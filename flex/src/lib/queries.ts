import "server-only";
import { all, get, type PublicUser } from "./db";

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

const PUBLIC_COLS = `u.id, u.username, u.display_name, u.bio, u.avatar_color, u.total_spent_cents, u.created_at, u.avatar_media_id`;

type UserWithCents = PublicUser & { cents: number };

function toEntries(rows: UserWithCents[]): LeaderboardEntry[] {
  return rows.map(({ cents, ...user }, i) => ({ rank: i + 1, user, cents: Number(cents) }));
}

/** Leaderboard: all-time (users.total_spent_cents) or last 7 days (sum of purchases). */
export async function getLeaderboard(period: Period, limit = 100): Promise<LeaderboardEntry[]> {
  if (period === "week") {
    const rows = await all<UserWithCents>(
      `SELECT ${PUBLIC_COLS}, SUM(p.amount_cents - p.refunded_cents) AS cents
       FROM purchases p JOIN users u ON u.id = p.user_id
       WHERE p.created_at >= ?
       GROUP BY u.id
       HAVING cents > 0
       ORDER BY cents DESC, MIN(p.created_at) ASC
       LIMIT ?`,
      [Date.now() - WEEK_MS, limit],
    );
    return toEntries(rows);
  }
  const rows = await all<UserWithCents>(
    `SELECT ${PUBLIC_COLS}, u.total_spent_cents AS cents
     FROM users u
     WHERE u.total_spent_cents > 0
     ORDER BY u.total_spent_cents DESC, u.created_at ASC
     LIMIT ?`,
    [limit],
  );
  return toEntries(rows);
}

/** Case-insensitive lookup (username column is COLLATE NOCASE). */
export async function getUserByUsername(username: string): Promise<PublicUser | null> {
  const row = await get<PublicUser>(`SELECT ${PUBLIC_COLS} FROM users u WHERE u.username = ?`, [
    username,
  ]);
  return row ?? null;
}

/** All-time position (1-based), or null if the user hasn't spent anything. Ties broken by signup order. */
export async function getUserRank(userId: number): Promise<number | null> {
  const me = await get<{ total_spent_cents: number; created_at: number }>(
    "SELECT total_spent_cents, created_at FROM users WHERE id = ?",
    [userId],
  );
  if (!me || me.total_spent_cents <= 0) return null;
  const row = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM users
     WHERE total_spent_cents > ?
        OR (total_spent_cents = ? AND created_at < ?)`,
    [me.total_spent_cents, me.total_spent_cents, me.created_at],
  );
  return Number(row?.n ?? 0) + 1;
}

/** The user at the given all-time rank, or null. */
export async function getUserAtRank(rank: number): Promise<LeaderboardEntry | null> {
  if (rank < 1) return null;
  const row = await get<UserWithCents>(
    `SELECT ${PUBLIC_COLS}, u.total_spent_cents AS cents
     FROM users u
     WHERE u.total_spent_cents > 0
     ORDER BY u.total_spent_cents DESC, u.created_at ASC
     LIMIT 1 OFFSET ?`,
    [rank - 1],
  );
  if (!row) return null;
  const { cents, ...user } = row;
  return { rank, user, cents: Number(cents) };
}

export async function getUserPurchaseStats(
  userId: number,
): Promise<{ count: number; biggestCents: number }> {
  const row = await get<{ count: number; biggest: number }>(
    `SELECT COUNT(*) AS count, COALESCE(MAX(amount_cents - refunded_cents), 0) AS biggest
     FROM purchases WHERE user_id = ? AND refunded_cents < amount_cents`,
    [userId],
  );
  return { count: Number(row?.count ?? 0), biggestCents: Number(row?.biggest ?? 0) };
}

/** Sum of all-time spend across every user. */
export async function getTotalFlexedCents(): Promise<number> {
  const row = await get<{ total: number }>(
    "SELECT COALESCE(SUM(total_spent_cents), 0) AS total FROM users",
  );
  return Number(row?.total ?? 0);
}

export async function getUserPosts(userId: number, limit = 30): Promise<PostRow[]> {
  return all<PostRow>(
    `SELECT id, user_id, kind, body, amount_cents, created_at
     FROM posts WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [userId, limit],
  );
}
