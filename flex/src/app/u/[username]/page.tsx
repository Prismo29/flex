import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import TierBadge from "@/components/TierBadge";
import FeedList from "@/components/social/FeedList";
import { getCurrentUser } from "@/lib/auth";
import { decodeUsername } from "@/lib/format";
import { getUserByUsername, getUserPurchaseStats, getUserRank } from "@/lib/queries";
import { getFeedPage, getFollowCounts, isFollowing } from "@/lib/social";
import { formatMoney, nextTier, tierFor } from "@/lib/tiers";
import type { FeedScope } from "@/lib/types";
import ProfileActions from "./ProfileActions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserByUsername(decodeUsername(username));
  if (!user) return { title: "User not found — FLEX" };
  return {
    title: `${user.display_name} (@${user.username}) — FLEX`,
    description: `${user.display_name} has flexed ${formatMoney(user.total_spent_cents)} on FLEX.`,
  };
}

const TABS = [
  { key: "all", label: "Posts" },
  { key: "flexes", label: "Flexes" },
] as const;

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const sp = await searchParams;
  const user = await getUserByUsername(decodeUsername(username));
  if (!user) notFound();

  const me = await getCurrentUser();
  const isMe = me?.id === user.id;
  const tab = sp.tab === "flexes" ? "flexes" : "all";
  const scope: FeedScope = { kind: "user", userId: user.id, ...(tab === "flexes" ? { only: "purchase" as const } : {}) };

  const [rank, stats, counts, following, followsYou, page] = await Promise.all([
    getUserRank(user.id),
    getUserPurchaseStats(user.id),
    getFollowCounts(user.id),
    me && !isMe ? isFollowing(me.id, user.id) : false,
    me && !isMe ? isFollowing(user.id, me.id) : false,
    getFeedPage(scope, me?.id ?? 0),
  ]);

  const total = user.total_spent_cents;
  const tier = tierFor(total);
  const next = nextTier(total);
  const pct = next ? Math.min(100, Math.max(0, ((total - tier.minCents) / (next.minCents - tier.minCents)) * 100)) : 100;
  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div className="space-y-5">
      {/* Header card */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface">
        <div
          aria-hidden
          className="h-28 sm:h-36"
          style={{
            background: `radial-gradient(120% 140% at 20% 0%, ${user.avatar_color}88, transparent 60%), radial-gradient(100% 120% at 100% 100%, ${tier.color}55, transparent 60%), #111114`,
          }}
        />
        <div className="relative -mt-14 flex flex-col items-center px-5 pb-6 text-center sm:px-8">
          <div className="rounded-full p-[3px]" style={{ background: tier.color, boxShadow: `0 0 30px ${tier.color}55` }}>
            <div className="rounded-full bg-surface p-[3px]">
              <Avatar name={user.display_name} color={user.avatar_color} mediaId={user.avatar_media_id} size={104} />
            </div>
          </div>
          <h1 className="mt-3 max-w-full break-words text-2xl font-black tracking-tight sm:text-3xl">{user.display_name}</h1>
          <p className="text-sm text-muted">@{user.username}</p>
          <div className="mt-2">
            <TierBadge totalCents={total} size="md" />
          </div>
          {user.bio && <p className="mt-3 max-w-md whitespace-pre-line break-words text-[15px] text-foreground/90">{user.bio}</p>}

          <ProfileActions
            userId={user.id}
            username={user.username}
            isMe={isMe}
            loggedIn={!!me}
            following={following}
            followsYou={followsYou}
            followers={counts.followers}
            followingCount={counts.following}
            profile={{
              displayName: user.display_name,
              bio: user.bio,
              color: user.avatar_color,
              mediaId: user.avatar_media_id,
            }}
          />

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-muted">Total flexed</p>
          <p className="text-4xl font-black tabular-nums text-gold-gradient sm:text-5xl">{formatMoney(total)}</p>

          {/* Tier progress */}
          <div className="mt-4 w-full max-w-sm text-left">
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
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
            >
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
        <Stat label="Flexes" value={stats.count.toLocaleString("en-US")} />
        <Stat label="Biggest flex" value={stats.biggestCents ? formatMoney(stats.biggestCents) : "—"} gold={stats.biggestCents > 0} />
        <Stat label="Joined" value={memberSince} />
      </section>

      {/* Tabs */}
      <nav aria-label="Profile" className="grid grid-cols-2 border-b border-border">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? `/u/${user.username}` : `/u/${user.username}?tab=${t.key}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`relative py-3 text-center text-sm font-semibold transition hover:bg-surface/60 ${
                active ? "text-foreground" : "text-muted"
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-gradient-to-r from-gold-bright to-gold" />
              )}
            </Link>
          );
        })}
      </nav>

      <FeedList
        key={tab}
        scope={scope}
        initial={page}
        now={Date.now()}
        viewerId={me?.id ?? null}
        empty={
          <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            {tab === "flexes"
              ? isMe
                ? "You haven't flexed yet. The store is right there."
                : `${user.display_name} hasn't flexed yet. Broke?`
              : isMe
                ? "You haven't posted yet."
                : `${user.display_name} hasn't posted yet.`}
          </p>
        }
      />
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 truncate text-xl font-bold tabular-nums ${gold ? "text-gold-gradient" : ""}`}>{value}</p>
    </div>
  );
}
