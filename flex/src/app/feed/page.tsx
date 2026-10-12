import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/tiers";
import Avatar from "@/components/Avatar";
import TierBadge from "@/components/TierBadge";
import Composer from "./Composer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feed · FLEX",
};

type FeedRow = {
  id: number;
  kind: "post" | "purchase";
  body: string;
  amount_cents: number | null;
  created_at: number;
  username: string;
  display_name: string;
  avatar_color: string;
  total_spent_cents: number;
};

function getFeed(limit = 50): FeedRow[] {
  return getDb()
    .prepare(
      `SELECT p.id, p.kind, p.body, p.amount_cents, p.created_at,
              u.username, u.display_name, u.avatar_color, u.total_spent_cents
       FROM posts p JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
    )
    .all(limit) as unknown as FeedRow[];
}

/** "just now", "3m ago", "5h ago", "2d ago", then a short date. */
function timeAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PostCard({ post, now }: { post: FeedRow; now: number }) {
  const isPurchase = post.kind === "purchase";
  return (
    <article
      className={`rounded-2xl border p-4 ${
        isPurchase
          ? "border-gold/60 bg-gradient-to-br from-[#221c0b] via-surface to-surface shadow-[0_0_35px_-12px_rgba(212,175,55,0.7)]"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex gap-3">
        <Link href={`/u/${post.username}`} className="shrink-0" aria-label={post.display_name}>
          <Avatar name={post.display_name} color={post.avatar_color} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/u/${post.username}`}
              className="truncate font-semibold text-foreground hover:text-gold-bright"
            >
              {post.display_name}
            </Link>
            <TierBadge totalCents={post.total_spent_cents} size="sm" />
            <span className="text-xs text-muted">
              <span className="hidden sm:inline">@{post.username} · </span>
              <time dateTime={new Date(post.created_at).toISOString()}>
                {timeAgo(post.created_at, now)}
              </time>
            </span>
          </div>

          {isPurchase && post.amount_cents != null && (
            <p className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              <span aria-hidden>💸 </span>
              <span className="text-foreground">flexed </span>
              <span className="text-gold-gradient tabular-nums">{formatMoney(post.amount_cents)}</span>
            </p>
          )}

          <p
            className={`mt-1 text-[15px] break-words whitespace-pre-wrap ${
              isPurchase ? "text-gold-bright/90 italic" : "text-foreground"
            }`}
          >
            {post.body}
          </p>
        </div>
      </div>
    </article>
  );
}

export default async function FeedPage() {
  const user = await getCurrentUser();
  const posts = getFeed();
  const now = Date.now();

  return (
    <div className="space-y-4 pb-16">
      <header className="flex items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-gold uppercase">The Feed</p>
          <h1 className="text-gold-gradient mt-1 text-4xl font-black tracking-tight">Who&apos;s flexing</h1>
        </div>
        <Link
          href="/store"
          className="shrink-0 rounded-full bg-gradient-to-r from-gold to-gold-bright px-4 py-2 text-sm font-bold text-background hover:brightness-110"
        >
          💸 Flex
        </Link>
      </header>

      {user ? (
        <Composer name={user.display_name} color={user.avatar_color} />
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
          <Link href="/login?next=/feed" className="font-semibold text-gold hover:text-gold-bright">
            Log in
          </Link>{" "}
          to post and flex with the rest of them.
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
          <div className="text-4xl" aria-hidden>
            🦗
          </div>
          <p className="mt-3 font-semibold text-foreground">It&apos;s quiet. Too quiet.</p>
          <p className="mt-1 text-sm text-muted">Nobody has flexed yet. Be the first.</p>
          <Link
            href="/store"
            className="mt-5 inline-block rounded-full bg-gradient-to-r from-gold to-gold-bright px-5 py-2 text-sm font-bold text-background"
          >
            Make it rain
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
