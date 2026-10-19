import "server-only";
import type { InValue, Transaction } from "@libsql/client";
import { all, get, run } from "./db";
import { extractMentions } from "./format";
import type {
  Author,
  CommentItem,
  FeedPage,
  FeedPost,
  FeedScope,
  NotificationItem,
  NotificationType,
  UserCard,
} from "./types";

type Executor = Transaction | undefined;

export const PAGE_SIZE = 20;

const AUTHOR_COLS = `u.id AS a_id, u.username AS a_username, u.display_name AS a_display_name,
  u.avatar_color AS a_avatar_color, u.avatar_media_id AS a_avatar_media_id,
  u.total_spent_cents AS a_total_spent_cents`;

type AuthorRow = {
  a_id: number;
  a_username: string;
  a_display_name: string;
  a_avatar_color: string;
  a_avatar_media_id: number | null;
  a_total_spent_cents: number;
};

function toAuthor(r: AuthorRow): Author {
  return {
    id: Number(r.a_id),
    username: r.a_username,
    display_name: r.a_display_name,
    avatar_color: r.a_avatar_color,
    avatar_media_id: r.a_avatar_media_id == null ? null : Number(r.a_avatar_media_id),
    total_spent_cents: Number(r.a_total_spent_cents),
  };
}

// ---------------------------------------------------------------- posts

type PostRowFull = AuthorRow & {
  id: number;
  kind: "post" | "purchase";
  body: string;
  amount_cents: number | null;
  created_at: number;
  media_id: number | null;
  like_count: number;
  comment_count: number;
  liked: number;
};

function toPost(r: PostRowFull): FeedPost {
  return {
    id: Number(r.id),
    kind: r.kind,
    body: r.body,
    amount_cents: r.amount_cents == null ? null : Number(r.amount_cents),
    created_at: Number(r.created_at),
    media_id: r.media_id == null ? null : Number(r.media_id),
    author: toAuthor(r),
    like_count: Number(r.like_count),
    comment_count: Number(r.comment_count),
    liked: Boolean(Number(r.liked)),
  };
}

/** Shared SELECT for posts. `where`/`order` are trusted SQL fragments built in this file. */
async function selectPosts(
  viewerId: number,
  where: string,
  args: InValue[],
  order = "p.created_at DESC, p.id DESC",
  limit = PAGE_SIZE,
): Promise<FeedPost[]> {
  const rows = await all<PostRowFull>(
    `SELECT p.id, p.kind, p.body, p.amount_cents, p.created_at, p.media_id, ${AUTHOR_COLS},
       (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
       EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked
     FROM posts p JOIN users u ON u.id = p.user_id
     WHERE ${where}
     ORDER BY ${order}
     LIMIT ?`,
    [viewerId, ...args, limit],
  );
  return rows.map(toPost);
}

function parseCursor(cursor: string | null | undefined): [number, number] | null {
  if (!cursor) return null;
  const [t, id] = cursor.split(":").map(Number);
  return Number.isFinite(t) && Number.isFinite(id) ? [t, id] : null;
}

/** A page of posts for a feed, newest first. Cursor is "created_at:id" of the last post seen. */
export async function getFeedPage(
  scope: FeedScope,
  viewerId: number,
  cursor?: string | null,
): Promise<FeedPage> {
  const where: string[] = [];
  const args: InValue[] = [];

  if (scope.kind === "following") {
    where.push("(p.user_id = ? OR p.user_id IN (SELECT followee_id FROM follows WHERE follower_id = ?))");
    args.push(viewerId, viewerId);
  } else if (scope.kind === "user") {
    where.push("p.user_id = ?");
    args.push(scope.userId);
    if (scope.only) {
      where.push("p.kind = ?");
      args.push(scope.only);
    }
  }

  const c = parseCursor(cursor);
  if (c) {
    where.push("(p.created_at < ? OR (p.created_at = ? AND p.id < ?))");
    args.push(c[0], c[0], c[1]);
  }

  const posts = await selectPosts(viewerId, where.join(" AND ") || "1", args, undefined, PAGE_SIZE + 1);
  const more = posts.length > PAGE_SIZE;
  const page = posts.slice(0, PAGE_SIZE);
  const last = page[page.length - 1];
  return { posts: page, nextCursor: more && last ? `${last.created_at}:${last.id}` : null };
}

export async function getPost(postId: number, viewerId: number): Promise<FeedPost | null> {
  const [post] = await selectPosts(viewerId, "p.id = ?", [postId], undefined, 1);
  return post ?? null;
}

/** Biggest flexes (purchase posts) in the last `days` days. */
export async function getTopFlexes(viewerId: number, days = 7, limit = 10): Promise<FeedPost[]> {
  return selectPosts(
    viewerId,
    "p.kind = 'purchase' AND p.created_at >= ?",
    [Date.now() - days * 86_400_000],
    "p.amount_cents DESC, p.created_at DESC",
    limit,
  );
}

/** Most-respected posts in the last `days` days. */
export async function getTrendingPosts(viewerId: number, days = 3, limit = 10): Promise<FeedPost[]> {
  return selectPosts(
    viewerId,
    "p.created_at >= ? AND EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id)",
    [Date.now() - days * 86_400_000],
    `(SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) * 2
      + (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) DESC, p.created_at DESC`,
    limit,
  );
}

export async function createPost(
  userId: number,
  body: string,
  mediaId: number | null,
): Promise<number> {
  const { lastInsertRowid } = await run(
    "INSERT INTO posts (user_id, kind, body, amount_cents, media_id, created_at) VALUES (?, 'post', ?, NULL, ?, ?)",
    [userId, body, mediaId, Date.now()],
  );
  await notifyMentions(userId, body, lastInsertRowid);
  return lastInsertRowid;
}

/** Delete a post and everything hanging off it (works whether or not FK cascades are on). */
export async function deletePostCascade(postId: number, tx?: Executor): Promise<void> {
  const media = await get<{ media_id: number | null }>("SELECT media_id FROM posts WHERE id = ?", [postId], tx);
  await run("DELETE FROM likes WHERE post_id = ?", [postId], tx);
  await run("DELETE FROM comments WHERE post_id = ?", [postId], tx);
  await run("DELETE FROM notifications WHERE post_id = ?", [postId], tx);
  await run("DELETE FROM posts WHERE id = ?", [postId], tx);
  if (media?.media_id != null) await run("DELETE FROM media WHERE id = ?", [media.media_id], tx);
}

// ---------------------------------------------------------------- likes

export async function toggleLike(
  userId: number,
  postId: number,
): Promise<{ liked: boolean; count: number } | null> {
  const post = await get<{ user_id: number }>("SELECT user_id FROM posts WHERE id = ?", [postId]);
  if (!post) return null;

  const removed = await run("DELETE FROM likes WHERE user_id = ? AND post_id = ?", [userId, postId]);
  let liked = false;
  if (removed.changes > 0) {
    await run("DELETE FROM notifications WHERE type = 'like' AND actor_id = ? AND post_id = ?", [userId, postId]);
  } else {
    await run("INSERT OR IGNORE INTO likes (user_id, post_id, created_at) VALUES (?, ?, ?)", [
      userId,
      postId,
      Date.now(),
    ]);
    await notify(Number(post.user_id), userId, "like", { postId });
    liked = true;
  }
  const row = await get<{ n: number }>("SELECT COUNT(*) AS n FROM likes WHERE post_id = ?", [postId]);
  return { liked, count: Number(row?.n ?? 0) };
}

// ---------------------------------------------------------------- comments

type CommentRow = AuthorRow & { id: number; post_id: number; body: string; created_at: number };

function toComment(r: CommentRow): CommentItem {
  return {
    id: Number(r.id),
    post_id: Number(r.post_id),
    body: r.body,
    created_at: Number(r.created_at),
    author: toAuthor(r),
  };
}

export async function getComments(postId: number): Promise<CommentItem[]> {
  const rows = await all<CommentRow>(
    `SELECT c.id, c.post_id, c.body, c.created_at, ${AUTHOR_COLS}
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC, c.id ASC
     LIMIT 500`,
    [postId],
  );
  return rows.map(toComment);
}

export async function addComment(userId: number, postId: number, body: string): Promise<CommentItem | null> {
  const post = await get<{ user_id: number }>("SELECT user_id FROM posts WHERE id = ?", [postId]);
  if (!post) return null;
  const now = Date.now();
  const { lastInsertRowid } = await run(
    "INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)",
    [postId, userId, body, now],
  );
  await notify(Number(post.user_id), userId, "comment", { postId });
  await notifyMentions(userId, body, postId, [Number(post.user_id)]);
  const row = await get<CommentRow>(
    `SELECT c.id, c.post_id, c.body, c.created_at, ${AUTHOR_COLS}
     FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
    [lastInsertRowid],
  );
  return row ? toComment(row) : null;
}

// ---------------------------------------------------------------- follows

export async function isFollowing(followerId: number, followeeId: number): Promise<boolean> {
  return Boolean(
    await get("SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?", [followerId, followeeId]),
  );
}

export async function getFollowCounts(userId: number): Promise<{ followers: number; following: number }> {
  const row = await get<{ followers: number; following: number }>(
    `SELECT (SELECT COUNT(*) FROM follows WHERE followee_id = ?) AS followers,
            (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS following`,
    [userId, userId],
  );
  return { followers: Number(row?.followers ?? 0), following: Number(row?.following ?? 0) };
}

export async function toggleFollow(
  followerId: number,
  followeeId: number,
): Promise<{ following: boolean; followers: number } | null> {
  if (followerId === followeeId) return null;
  const target = await get("SELECT 1 FROM users WHERE id = ?", [followeeId]);
  if (!target) return null;

  const removed = await run("DELETE FROM follows WHERE follower_id = ? AND followee_id = ?", [
    followerId,
    followeeId,
  ]);
  let following = false;
  if (removed.changes > 0) {
    await run("DELETE FROM notifications WHERE type = 'follow' AND actor_id = ? AND user_id = ?", [
      followerId,
      followeeId,
    ]);
  } else {
    await run("INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)", [
      followerId,
      followeeId,
      Date.now(),
    ]);
    await notify(followeeId, followerId, "follow");
    following = true;
  }
  return { following, followers: (await getFollowCounts(followeeId)).followers };
}

type UserCardRow = AuthorRow & { bio: string; is_following: number; follower_count: number };

const USER_CARD_COLS = `${AUTHOR_COLS}, u.bio,
  EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id) AS is_following,
  (SELECT COUNT(*) FROM follows f WHERE f.followee_id = u.id) AS follower_count`;

function toUserCard(r: UserCardRow): UserCard {
  return {
    ...toAuthor(r),
    bio: r.bio,
    is_following: Boolean(Number(r.is_following)),
    follower_count: Number(r.follower_count),
  };
}

export async function getFollowList(
  userId: number,
  which: "followers" | "following",
  viewerId: number,
): Promise<UserCard[]> {
  const join = which === "followers" ? "fl.follower_id = u.id AND fl.followee_id = ?" : "fl.followee_id = u.id AND fl.follower_id = ?";
  const rows = await all<UserCardRow>(
    `SELECT ${USER_CARD_COLS}
     FROM follows fl JOIN users u ON ${join}
     ORDER BY fl.created_at DESC
     LIMIT 200`,
    [viewerId, userId],
  );
  return rows.map(toUserCard);
}

/** Big spenders the viewer doesn't follow yet. */
export async function getSuggestedUsers(viewerId: number, limit = 5): Promise<UserCard[]> {
  const rows = await all<UserCardRow>(
    `SELECT ${USER_CARD_COLS}
     FROM users u
     WHERE u.id != ?
       AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id)
     ORDER BY u.total_spent_cents DESC, u.created_at ASC
     LIMIT ?`,
    [viewerId, viewerId, viewerId, limit],
  );
  return rows.map(toUserCard);
}

export async function searchUsers(query: string, viewerId: number, limit = 30): Promise<UserCard[]> {
  const q = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await all<UserCardRow>(
    `SELECT ${USER_CARD_COLS}
     FROM users u
     WHERE u.username LIKE ? ESCAPE '\\' OR u.display_name LIKE ? ESCAPE '\\'
     ORDER BY u.total_spent_cents DESC
     LIMIT ?`,
    [viewerId, q, q, limit],
  );
  return rows.map(toUserCard);
}

// ---------------------------------------------------------------- notifications

export async function notify(
  userId: number,
  actorId: number,
  type: NotificationType,
  opts: { postId?: number; amountCents?: number } = {},
  tx?: Executor,
): Promise<void> {
  if (userId === actorId) return;
  await run(
    `INSERT INTO notifications (user_id, actor_id, type, post_id, amount_cents, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, actorId, type, opts.postId ?? null, opts.amountCents ?? null, Date.now()],
    tx,
  );
}

/** Notify everyone @mentioned in `text` (except the author and anyone in `skip`). */
async function notifyMentions(actorId: number, text: string, postId: number, skip: number[] = []): Promise<void> {
  const names = extractMentions(text);
  if (!names.length) return;
  const rows = await all<{ id: number }>(
    `SELECT id FROM users WHERE username IN (${names.map(() => "?").join(",")})`,
    names,
  );
  for (const { id } of rows) {
    if (!skip.includes(Number(id))) await notify(Number(id), actorId, "mention", { postId });
  }
}

/**
 * After a purchase: tell everyone the buyer just passed on the leaderboard, and tell the buyer's
 * followers they flexed. Runs inside the purchase transaction.
 */
export async function notifyPurchase(
  tx: Transaction,
  buyerId: number,
  postId: number,
  amountCents: number,
  beforeCents: number,
  afterCents: number,
): Promise<void> {
  const now = Date.now();
  await run(
    `INSERT INTO notifications (user_id, actor_id, type, post_id, amount_cents, created_at)
     SELECT id, ?, 'overtaken', ?, ?, ? FROM users
     WHERE id != ? AND total_spent_cents > 0 AND total_spent_cents >= ? AND total_spent_cents < ?
     ORDER BY total_spent_cents DESC
     LIMIT 50`,
    [buyerId, postId, amountCents, now, buyerId, beforeCents, afterCents],
    tx,
  );
  await run(
    `INSERT INTO notifications (user_id, actor_id, type, post_id, amount_cents, created_at)
     SELECT f.follower_id, ?, 'flex', ?, ?, ? FROM follows f
     WHERE f.followee_id = ?
       AND NOT EXISTS (SELECT 1 FROM notifications n
                       WHERE n.user_id = f.follower_id AND n.post_id = ? AND n.type = 'overtaken')`,
    [buyerId, postId, amountCents, now, buyerId, postId],
    tx,
  );
}

export async function getUnreadCount(userId: number): Promise<number> {
  const row = await get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL",
    [userId],
  );
  return Number(row?.n ?? 0);
}

type NotificationRow = AuthorRow & {
  id: number;
  type: NotificationType;
  created_at: number;
  read_at: number | null;
  amount_cents: number | null;
  post_id: number | null;
  p_kind: "post" | "purchase" | null;
  p_body: string | null;
  p_amount_cents: number | null;
};

export async function getNotifications(userId: number, limit = 60): Promise<NotificationItem[]> {
  const rows = await all<NotificationRow>(
    `SELECT n.id, n.type, n.created_at, n.read_at, n.amount_cents, n.post_id, ${AUTHOR_COLS},
            p.kind AS p_kind, p.body AS p_body, p.amount_cents AS p_amount_cents
     FROM notifications n
     JOIN users u ON u.id = n.actor_id
     LEFT JOIN posts p ON p.id = n.post_id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT ?`,
    [userId, limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    type: r.type,
    created_at: Number(r.created_at),
    read: r.read_at != null,
    amount_cents: r.amount_cents == null ? null : Number(r.amount_cents),
    actor: toAuthor(r),
    post:
      r.post_id != null && r.p_kind
        ? {
            id: Number(r.post_id),
            kind: r.p_kind,
            body: r.p_body ?? "",
            amount_cents: r.p_amount_cents == null ? null : Number(r.p_amount_cents),
          }
        : null,
  }));
}

export async function markAllRead(userId: number): Promise<void> {
  await run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", [Date.now(), userId]);
}

// ---------------------------------------------------------------- media

const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) =>
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45,
};

/** Store an uploaded image. Returns its id, or an error message. */
export async function saveMedia(
  userId: number,
  file: File,
  maxBytes: number,
  dims: { width: number; height: number },
): Promise<{ id: number } | { error: string }> {
  if (file.size === 0) return { error: "That image is empty." };
  if (file.size > maxBytes) return { error: "That image is too big." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = Object.keys(MAGIC).find((m) => MAGIC[m](bytes));
  if (!mime) return { error: "Only JPEG, PNG or WebP images." };
  const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(10_000, Math.round(n))) : 0);
  const { lastInsertRowid } = await run(
    "INSERT INTO media (user_id, mime, bytes, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, mime, bytes, clamp(dims.width), clamp(dims.height), Date.now()],
  );
  return { id: lastInsertRowid };
}

export async function getMedia(id: number): Promise<{ mime: string; bytes: ArrayBuffer } | null> {
  const row = await get<{ mime: string; bytes: ArrayBuffer }>("SELECT mime, bytes FROM media WHERE id = ?", [id]);
  return row ?? null;
}
