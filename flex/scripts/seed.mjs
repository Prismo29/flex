// Seeds the database with demo users, purchases and posts.
//   node scripts/seed.mjs          -> seeds only if "goldfinger" doesn't exist yet
//   node scripts/seed.mjs --reset  -> wipes all tables first, then seeds
// Uses data/flex.db locally, or the Turso database in TURSO_DATABASE_URL / TURSO_AUTH_TOKEN if set.
// All demo users have the password "password123".
import { createClient } from "@libsql/client";
import crypto from "node:crypto";
import fs from "node:fs";

const RESET = process.argv.includes("--reset");
const PASSWORD = "password123";

// Keep in sync with src/lib/db.ts
const SCHEMA = `
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

  CREATE TABLE IF NOT EXISTS purchases (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    created_at   INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at);

  CREATE TABLE IF NOT EXISTS posts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind         TEXT NOT NULL DEFAULT 'post',
    body         TEXT NOT NULL,
    amount_cents INTEGER,
    created_at   INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);

  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (follower_id, followee_id)
  );
  CREATE TABLE IF NOT EXISTS likes (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, post_id)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
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

// Same format as hashPassword() in src/lib/auth.ts
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Deterministic PRNG so the demo data looks the same every reset.
let seed = 1337;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

// total in dollars; purchases = how many separate buys
const USERS = [
  { username: "goldfinger", display: "Goldfinger", color: "#d4af37", total: 150_000, purchases: 9, bio: "Everything I touch turns to rank #1." },
  { username: "yacht_daddy", display: "Yacht Daddy", color: "#3b82f6", total: 87_500, purchases: 7, bio: "Docked at the top of the leaderboard. Permanently." },
  { username: "crypto_carl", display: "Crypto Carl", color: "#f59e0b", total: 52_340, purchases: 8, bio: "Bought the dip. Then bought the leaderboard." },
  { username: "lambo_lisa", display: "Lambo Lisa", color: "#ef4444", total: 31_200, purchases: 6, bio: "0 to #4 in 3.2 seconds." },
  { username: "champagne_chad", display: "Champagne Chad", color: "#fde68a", total: 18_750, purchases: 6, bio: "Bottle service for my ego." },
  { username: "diamond_dana", display: "Diamond Dana", color: "#67e8f9", total: 12_000, purchases: 5, bio: "Pressure makes diamonds. So does money." },
  { username: "rolex_rick", display: "Rolex Rick", color: "#10b981", total: 7_450, purchases: 5, bio: "It's always flex o'clock." },
  { username: "penthouse_pam", display: "Penthouse Pam", color: "#a855f7", total: 4_200, purchases: 4, bio: "Living above it all." },
  { username: "caviar_kev", display: "Caviar Kev", color: "#64748b", total: 2_150, purchases: 4, bio: "Fish eggs for breakfast. Every day." },
  { username: "jetset_jess", display: "Jetset Jess", color: "#ec4899", total: 980, purchases: 4, bio: "Private jets, public flexes." },
  { username: "trustfund_tim", display: "Trustfund Tim", color: "#84cc16", total: 420, purchases: 3, bio: "Dad said I could have one more." },
  { username: "hustle_hannah", display: "Hustle Hannah", color: "#f97316", total: 135, purchases: 3, bio: "Side hustle money goes straight to the board." },
  { username: "couponcathy", display: "Coupon Cathy", color: "#14b8a6", total: 42, purchases: 2, bio: "Saved on groceries, splurged on flex." },
  { username: "broke_bobby", display: "Broke Bobby", color: "#94a3b8", total: 12.5, purchases: 2, bio: "It's not about the money. (It is.)" },
  { username: "ramen_rachel", display: "Ramen Rachel", color: "#e879f9", total: 5, purchases: 1, bio: "Skipped lunch for this. Worth it." },
];

const BRAGS = [
  "Pocket change.",
  "Another day, another flex.",
  "Don't worry, I've got more.",
  "Making it rain on the leaderboard.",
  "That's just my tip budget.",
  "Catch me if you can.",
  "Bought a little something for my rank.",
  "Moving up. Try to keep up.",
  "Stay humble. (I won't.)",
  "Cash rules everything around me.",
  "Treat yourself, they said.",
  "My accountant is crying.",
];

const TEXT_POSTS = [
  "Who's coming for the #1 spot? Asking for a friend.",
  "Woke up feeling rich. Might flex later.",
  "Leaderboard looking a little crowded up here.",
  "Just remembered I left my other wallet on the yacht.",
  "Weekly board reset? Bring it.",
  "If you're reading this, you're below me.",
  "Money talks. Mine doesn't stop talking.",
  "Gold is my favorite color for a reason.",
  "Rate my flex 1-10. Wrong answers only.",
  "Some people buy coffee. I buy rank.",
];

/** Split totalCents into n positive integer chunks with random weights. */
function split(totalCents, n) {
  if (n <= 1 || totalCents < n * 100) return [totalCents];
  const weights = Array.from({ length: n }, () => 0.3 + rand());
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.max(100, Math.round(((totalCents * w) / sum) / 100) * 100));
  const diff = totalCents - parts.reduce((a, b) => a + b, 0);
  parts[parts.length - 1] += diff;
  if (parts[parts.length - 1] <= 0) return [totalCents];
  return parts;
}

const url = process.env.TURSO_DATABASE_URL || "file:data/flex.db";
if (!process.env.TURSO_DATABASE_URL) fs.mkdirSync("data", { recursive: true });
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
console.log(`Database: ${process.env.TURSO_DATABASE_URL ? url : "local file data/flex.db"}`);
await db.executeMultiple(SCHEMA);

if (RESET) {
  await db.executeMultiple(
    "DELETE FROM notifications; DELETE FROM comments; DELETE FROM likes; DELETE FROM follows; DELETE FROM media; DELETE FROM posts; DELETE FROM purchases; DELETE FROM sessions; DELETE FROM users; DELETE FROM sqlite_sequence;",
  );
  console.log("Reset: wiped all tables.");
} else {
  const { rows } = await db.execute({ sql: "SELECT 1 FROM users WHERE username = ?", args: ["goldfinger"] });
  if (rows.length) {
    console.log('Seed data already present (user "goldfinger" exists). Use `npm run seed:reset` to reseed.');
    db.close();
    process.exit(0);
  }
}

// Build every insert up front and send them as one atomic batch (one round trip to Turso).
const stmts = [];
const userId = "(SELECT id FROM users WHERE username = ?)";
const post = (username, kind, body, cents, at) =>
  stmts.push({
    sql: `INSERT INTO posts (user_id, kind, body, amount_cents, created_at) VALUES (${userId}, ?, ?, ?, ?)`,
    args: [username, kind, body, cents, at],
  });

for (const [i, u] of USERS.entries()) {
  const totalCents = Math.round(u.total * 100);
  const amounts = split(totalCents, u.purchases);
  // Timestamps over the last 30 days; most users get at least one buy in the last 7 days.
  const times = amounts
    .map((_, k) => {
      const recent = k === 0 && i % 4 !== 3; // 3 of every 4 users flexed this week
      const ageDays = recent ? rand() * 6.5 : 0.5 + rand() * 29;
      return Math.round(NOW - ageDays * DAY);
    })
    .sort((a, b) => a - b);
  const createdAt = times[0] - Math.round((1 + rand() * 5) * DAY);

  stmts.push({
    sql: `INSERT INTO users (username, password_hash, display_name, bio, avatar_color, total_spent_cents, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [u.username, hashPassword(PASSWORD), u.display, u.bio, u.color, totalCents, createdAt],
  });

  amounts.forEach((cents, k) => {
    stmts.push({
      sql: `INSERT INTO purchases (user_id, amount_cents, created_at) VALUES (${userId}, ?, ?)`,
      args: [u.username, cents, times[k]],
    });
    post(u.username, "purchase", pick(BRAGS), cents, times[k]);
  });

  // 1-2 text posts for most users
  const textCount = i % 3 === 2 ? 1 : 2;
  for (let k = 0; k < textCount; k++) {
    const at = Math.round(NOW - rand() * 20 * DAY);
    post(u.username, "post", pick(TEXT_POSTS), null, Math.max(at, createdAt + DAY));
  }
}
await db.batch(stmts, "write");

// Social layer: follows, respect (likes) and comments between the demo users.
const COMMENTS = [
  "Is that all? 😂",
  "Respect. Coming for you next week.",
  "My accountant just fainted reading this.",
  "Okay big spender 👀",
  "This is the content I'm here for.",
  "Pocket change for some of us.",
  "Teach me your ways.",
  "The leaderboard is shaking.",
  "Nah this is crazy 💸",
  "W flex",
];
const ids = Object.fromEntries(
  (await db.execute("SELECT id, username FROM users")).rows.map((r) => [r.username, Number(r.id)]),
);
const posts = (await db.execute("SELECT id, user_id, created_at, amount_cents FROM posts")).rows.map((r) => ({
  id: Number(r.id),
  userId: Number(r.user_id),
  at: Number(r.created_at),
  cents: Number(r.amount_cents ?? 0),
}));
const social = [];
const names = USERS.map((u) => u.username);
names.forEach((name, i) => {
  // Everyone follows a few people; the richer you are, the more followers you get.
  for (const [j, other] of names.entries()) {
    if (other === name) continue;
    const chance = j < i ? 0.75 - j * 0.04 : 0.12;
    if (rand() < chance) {
      social.push({
        sql: "INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)",
        args: [ids[name], ids[other], Math.round(NOW - rand() * 20 * DAY)],
      });
    }
  }
});
for (const p of posts) {
  // Bigger flexes earn more respect.
  const heat = Math.min(0.85, 0.15 + Math.log10(1 + p.cents / 100) * 0.18);
  for (const name of names) {
    if (ids[name] === p.userId || rand() > heat) continue;
    social.push({
      sql: "INSERT OR IGNORE INTO likes (user_id, post_id, created_at) VALUES (?, ?, ?)",
      args: [ids[name], p.id, Math.min(NOW, p.at + Math.round(rand() * DAY))],
    });
  }
  const nComments = rand() < heat ? 1 + Math.floor(rand() * 3) : 0;
  for (let k = 0; k < nComments; k++) {
    const by = pick(names);
    if (ids[by] === p.userId) continue;
    social.push({
      sql: "INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)",
      args: [p.id, ids[by], pick(COMMENTS), Math.min(NOW, p.at + Math.round((k + rand()) * 3 * 3600_000))],
    });
  }
}
await db.batch(social, "write");

const count = async (t) => Number((await db.execute(`SELECT COUNT(*) AS n FROM ${t}`)).rows[0].n);
console.log(
  `Seeded: ${await count("users")} users, ${await count("purchases")} purchases, ${await count("posts")} posts, ` +
    `${await count("follows")} follows, ${await count("likes")} likes, ${await count("comments")} comments. Password for all: ${PASSWORD}`,
);
db.close();
