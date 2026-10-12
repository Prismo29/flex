import Link from "next/link";
import Avatar from "@/components/Avatar";
import TierBadge from "@/components/TierBadge";
import { getCurrentUser } from "@/lib/auth";
import {
  getLeaderboard,
  getTotalFlexedCents,
  getUserAtRank,
  getUserRank,
  type LeaderboardEntry,
  type Period,
} from "@/lib/queries";
import { formatMoney } from "@/lib/tiers";

export const dynamic = "force-dynamic";

const MEDALS = {
  1: { label: "Gold", color: "#d4af37", glow: "rgba(212,175,55,0.35)", height: "h-28 sm:h-32" },
  2: { label: "Silver", color: "#c0c0c0", glow: "rgba(192,192,192,0.25)", height: "h-20 sm:h-24" },
  3: { label: "Bronze", color: "#cd7f32", glow: "rgba(205,127,50,0.25)", height: "h-14 sm:h-16" },
} as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const period: Period = sp.period === "week" ? "week" : "all";

  const [me, entries, totalCents] = await Promise.all([
    getCurrentUser(),
    Promise.resolve(getLeaderboard(period, 100)),
    Promise.resolve(getTotalFlexedCents()),
  ]);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-6">
      <Hero totalCents={totalCents} />

      <PeriodTabs period={period} />

      {entries.length === 0 ? (
        <EmptyState period={period} />
      ) : (
        <>
          <Podium entries={podium} myId={me?.id} />
          {rest.length > 0 && (
            <ol className="overflow-hidden rounded-2xl border border-border bg-surface">
              {rest.map((e) => (
                <Row key={e.user.id} entry={e} isMe={e.user.id === me?.id} />
              ))}
            </ol>
          )}
        </>
      )}

      {me && <MyRankCard userId={me.id} totalCents={me.total_spent_cents} />}
    </div>
  );
}

function Hero({ totalCents }: { totalCents: number }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-surface px-5 py-8 text-center sm:px-8 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-72 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(212,175,55,0.35), transparent)" }}
      />
      <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-muted">The leaderboard</p>
      <h1 className="relative mt-2 text-4xl font-black tracking-tight sm:text-5xl">
        Who&apos;s the <span className="text-gold-gradient">richest?</span>
      </h1>
      <p className="relative mt-4 text-sm text-muted">Total money flexed</p>
      <p className="relative text-3xl font-black tabular-nums text-gold-gradient sm:text-4xl">
        {formatMoney(totalCents)}
      </p>
      <Link
        href="/store"
        className="relative mt-6 inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-bold text-black shadow-[0_0_30px_rgba(212,175,55,0.35)] transition hover:bg-gold-bright active:scale-95"
      >
        Buy your way up →
      </Link>
    </section>
  );
}

function PeriodTabs({ period }: { period: Period }) {
  const tabs: { key: Period; label: string; href: string }[] = [
    { key: "all", label: "All-time", href: "/" },
    { key: "week", label: "This week", href: "/?period=week" },
  ];
  return (
    <nav aria-label="Leaderboard period" className="grid grid-cols-2 gap-1 rounded-full border border-border bg-surface p-1">
      {tabs.map((t) => {
        const active = t.key === period;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full py-2 text-center text-sm font-semibold transition ${
              active ? "bg-gold text-black" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Podium({ entries, myId }: { entries: LeaderboardEntry[]; myId?: number }) {
  // Visual order: #2, #1, #3
  const order = [entries[1], entries[0], entries[2]];
  return (
    <section aria-label="Top 3" className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {order.map((e, i) =>
        e ? (
          <PodiumSpot key={e.user.id} entry={e} isMe={e.user.id === myId} />
        ) : (
          <div key={`empty-${i}`} />
        ),
      )}
    </section>
  );
}

function PodiumSpot({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const rank = entry.rank as 1 | 2 | 3;
  const medal = MEDALS[rank];
  const first = rank === 1;
  return (
    <Link
      href={`/u/${entry.user.username}`}
      className="group flex min-w-0 flex-col items-center text-center"
    >
      <div className="relative">
        {first && (
          <span aria-hidden className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] sm:text-3xl">
            👑
          </span>
        )}
        <div
          className="rounded-full p-[3px] transition group-hover:scale-105"
          style={{ background: medal.color, boxShadow: `0 0 24px ${medal.glow}` }}
        >
          <Avatar name={entry.user.display_name} color={entry.user.avatar_color} size={first ? 80 : 56} />
        </div>
      </div>
      <p className="mt-2 w-full truncate text-sm font-bold sm:text-base">
        {entry.user.display_name}
        {isMe && <span className="ml-1 text-xs text-gold">(you)</span>}
      </p>
      <p className="w-full truncate text-xs text-muted">@{entry.user.username}</p>
      <div className="mt-1">
        <TierBadge totalCents={entry.user.total_spent_cents} size="sm" />
      </div>
      <p className={`mt-1 font-black tabular-nums text-gold-gradient ${first ? "text-lg sm:text-xl" : "text-sm sm:text-base"}`}>
        {formatMoney(entry.cents)}
      </p>
      <div
        className={`mt-2 flex w-full items-start justify-center rounded-t-xl border border-b-0 pt-2 text-2xl font-black ${medal.height}`}
        style={{
          borderColor: medal.color,
          color: medal.color,
          background: `linear-gradient(to bottom, ${medal.glow}, transparent)`,
        }}
      >
        {rank}
      </div>
    </Link>
  );
}

function Row({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/u/${entry.user.username}`}
        className={`flex items-center gap-3 px-3 py-3 transition hover:bg-surface-2 sm:px-4 ${isMe ? "bg-surface-2" : ""}`}
      >
        <span className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-muted">{entry.rank}</span>
        <Avatar name={entry.user.display_name} color={entry.user.avatar_color} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold">{entry.user.display_name}</span>
            {isMe && <span className="shrink-0 text-xs text-gold">(you)</span>}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs text-muted">@{entry.user.username}</span>
            <span className="hidden shrink-0 sm:inline-flex">
              <TierBadge totalCents={entry.user.total_spent_cents} size="sm" />
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-bold tabular-nums text-gold">{formatMoney(entry.cents)}</span>
          <span className="sm:hidden">
            <TierBadge totalCents={entry.user.total_spent_cents} size="sm" />
          </span>
        </div>
      </Link>
    </li>
  );
}

function EmptyState({ period }: { period: Period }) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <p className="text-4xl" aria-hidden>
        👑
      </p>
      <h2 className="mt-3 text-xl font-bold">The throne is empty</h2>
      <p className="mt-2 text-sm text-muted">
        {period === "week"
          ? "Nobody has flexed this week. Be the first."
          : "Nobody has spent a cent yet. The #1 spot is yours for the taking."}
      </p>
      <Link
        href="/store"
        className="mt-6 inline-flex rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-black transition hover:bg-gold-bright"
      >
        Claim #1
      </Link>
    </section>
  );
}

function MyRankCard({ userId, totalCents }: { userId: number; totalCents: number }) {
  const rank = getUserRank(userId);
  const above = rank && rank > 1 ? getUserAtRank(rank - 1) : null;
  const toPass = above ? Math.max(1, above.cents - totalCents + 1) : 0;

  let headline: React.ReactNode;
  let sub: string;
  if (rank === null) {
    headline = <>You&apos;re unranked</>;
    sub = "Buy your first flex to get on the board.";
  } else if (rank === 1) {
    headline = (
      <>
        Your rank: <span className="text-gold-gradient">#1</span> — {formatMoney(totalCents)} spent
      </>
    );
    sub = "You're on top. Defend the throne.";
  } else {
    headline = (
      <>
        Your rank: <span className="text-gold-gradient">#{rank}</span> — {formatMoney(totalCents)} spent
      </>
    );
    sub = above ? `${formatMoney(toPass)} to pass #${rank - 1} @${above.user.username}` : "Keep climbing.";
  }

  return (
    <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 md:bottom-4">
      <Link
        href="/store"
        className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-surface-2/95 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur transition hover:border-gold"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{headline}</p>
          <p className="truncate text-xs text-muted">{sub}</p>
        </div>
        <span className="shrink-0 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-black">Flex more</span>
      </Link>
    </div>
  );
}
