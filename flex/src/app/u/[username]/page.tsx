import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import TierBadge from "@/components/TierBadge";
import { getCurrentUser } from "@/lib/auth";
import { getUserByUsername, getUserPosts, getUserPurchaseStats, getUserRank, type PostRow } from "@/lib/queries";
import { formatMoney, nextTier, tierFor } from "@/lib/tiers";
import { updateProfile } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

const AVATAR_COLORS = [
  "#d4af37",
  "#f5d77a",
  "#cd7f32",
  "#c0c0c0",
  "#9fd8e8",
  "#7df9ff",
  "#b57edc",
  "#ef5350",
  "#4caf50",
  "#ff8a3d",
];

function decode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = getUserByUsername(decode(username));
  if (!user) return { title: "User not found — FLEX" };
  return {
    title: `${user.display_name} (@${user.username}) — FLEX`,
    description: `${user.display_name} has flexed ${formatMoney(user.total_spent_cents)} on FLEX.`,
  };
}

function timeAgo(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const user = getUserByUsername(decode(username));
  if (!user) notFound();

  const me = await getCurrentUser();
  const isMe = me?.id === user.id;

  const rank = getUserRank(user.id);
  const stats = getUserPurchaseStats(user.id);
  const posts = getUserPosts(user.id, 30);

  const total = user.total_spent_cents;
  const tier = tierFor(total);
  const next = nextTier(total);
  const pct = next ? Math.min(100, Math.max(0, ((total - tier.minCents) / (next.minCents - tier.minCents)) * 100)) : 100;
  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header card */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface px-5 pb-6 pt-8 text-center sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-20 mx-auto h-48 w-72 rounded-full blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${user.avatar_color}55, transparent)` }}
        />
        <div className="relative flex flex-col items-center">
          <div className="rounded-full p-[3px]" style={{ background: tier.color, boxShadow: `0 0 30px ${tier.color}55` }}>
            <Avatar name={user.display_name} color={user.avatar_color} size={104} />
          </div>
          <h1 className="mt-4 max-w-full break-words text-2xl font-black tracking-tight sm:text-3xl">{user.display_name}</h1>
          <p className="text-sm text-muted">@{user.username}</p>
          <div className="mt-2">
            <TierBadge totalCents={total} size="md" />
          </div>
          {user.bio && (
            <p className="mt-4 max-w-md whitespace-pre-line break-words text-sm text-foreground/90">{user.bio}</p>
          )}

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-muted">Total spent</p>
          <p className="text-4xl font-black tabular-nums text-gold-gradient sm:text-5xl">{formatMoney(total)}</p>

          {/* Tier progress */}
          <div className="mt-5 w-full max-w-sm text-left">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
              <span>
                {tier.emoji} {tier.name}
              </span>
              {next ? (
                <span>
                  {next.emoji} {next.name} · {formatMoney(next.minCents - total)} to go
                </span>
              ) : (
                <span className="text-gold">Max tier reached</span>
              )}
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg, #a8841f, #d4af37, #f5d77a)" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="All-time rank" value={rank ? `#${rank}` : "—"} gold={rank !== null && rank <= 3} />
        <Stat label="Purchases" value={stats.count.toLocaleString("en-US")} />
        <Stat label="Biggest flex" value={stats.biggestCents ? formatMoney(stats.biggestCents) : "—"} gold={stats.biggestCents > 0} />
        <Stat label="Member since" value={memberSince} small />
      </section>

      {isMe && (
        <>
          <Link
            href="/store"
            className="flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-bold text-black transition hover:bg-gold-bright active:scale-95"
          >
            {rank === 1 ? "Defend your throne" : "Climb the leaderboard"} →
          </Link>
          <EditProfile displayName={user.display_name} bio={user.bio} color={user.avatar_color} />
        </>
      )}

      {/* Posts */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted">Recent activity</h2>
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            {isMe ? "You haven't posted or flexed yet." : `${user.display_name} hasn't posted or flexed yet.`}
          </p>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <PostItem key={p.id} post={p} name={user.display_name} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, gold, small }: { label: string; value: string; gold?: boolean; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p
        className={`mt-1 truncate font-bold tabular-nums ${small ? "text-base" : "text-xl"} ${gold ? "text-gold-gradient" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function PostItem({ post, name }: { post: PostRow; name: string }) {
  if (post.kind === "purchase") {
    return (
      <li
        className="rounded-2xl border border-gold/40 px-4 py-3"
        style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.02))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-sm">
            <span aria-hidden>💸 </span>
            <span className="font-semibold">{name}</span> flexed{" "}
            <span className="font-black text-gold-gradient">{formatMoney(post.amount_cents ?? 0)}</span>
          </p>
          <time className="shrink-0 text-xs text-muted" dateTime={new Date(post.created_at).toISOString()}>
            {timeAgo(post.created_at)}
          </time>
        </div>
        {post.body && <p className="mt-1 whitespace-pre-line break-words text-sm text-foreground/80">{post.body}</p>}
      </li>
    );
  }
  return (
    <li className="rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="whitespace-pre-line break-words text-sm">{post.body}</p>
      <time className="mt-2 block text-xs text-muted" dateTime={new Date(post.created_at).toISOString()}>
        {timeAgo(post.created_at)}
      </time>
    </li>
  );
}

function EditProfile({ displayName, bio, color }: { displayName: string; bio: string; color: string }) {
  const colors = AVATAR_COLORS.includes(color.toLowerCase()) ? AVATAR_COLORS : [color, ...AVATAR_COLORS];
  return (
    <details className="group rounded-2xl border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        Edit profile
        <span className="text-muted transition group-open:rotate-180">▾</span>
      </summary>
      <form action={updateProfile} className="space-y-4 border-t border-border px-4 py-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Display name</span>
          <input
            name="display_name"
            defaultValue={displayName}
            maxLength={40}
            required
            className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base outline-none focus:border-gold"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Bio</span>
          <textarea
            name="bio"
            defaultValue={bio}
            maxLength={160}
            rows={3}
            placeholder="Tell them why you're richer than them."
            className="mt-1 w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base outline-none focus:border-gold"
          />
        </label>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted">Avatar color</legend>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {colors.map((c) => (
              <label key={c} className="cursor-pointer">
                <input
                  type="radio"
                  name="avatar_color"
                  value={c}
                  defaultChecked={c.toLowerCase() === color.toLowerCase()}
                  className="peer sr-only"
                />
                <span
                  className="block h-9 w-9 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-surface transition peer-checked:ring-gold-bright peer-focus-visible:ring-foreground"
                  style={{ background: c }}
                  aria-label={c}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          className="w-full rounded-full bg-gold py-2.5 text-sm font-bold text-black transition hover:bg-gold-bright active:scale-95"
        >
          Save
        </button>
      </form>
    </details>
  );
}
