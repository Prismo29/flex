import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/auth-actions";
import { getLeaderboard } from "@/lib/queries";
import { getSuggestedUsers, getUnreadCount } from "@/lib/social";
import { formatMoney } from "@/lib/tiers";
import Avatar from "./Avatar";
import Icon from "./Icon";
import TierBadge from "./TierBadge";
import { BellLink, MobileTabBar, SideNav } from "./NavLinks";
import UserList from "./social/UserList";

/**
 * The app frame: top bar + bottom tabs on mobile; left nav, center column and right rail on desktop.
 */
export default async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const [unread, weekly, suggested] = await Promise.all([
    user ? getUnreadCount(user.id) : 0,
    getLeaderboard("week", 5),
    getSuggestedUsers(user?.id ?? 0, 4),
  ]);

  return (
    <>
      {/* Mobile / tablet top bar */}
      <header
        className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          <Logo />
          <div className="ml-auto flex items-center gap-1">
            {user ? (
              <>
                <BellLink unread={unread} />
                <Link href={`/u/${user.username}`} className="rounded-full p-1" aria-label="Your profile">
                  <Avatar name={user.display_name} color={user.avatar_color} mediaId={user.avatar_media_id} size={32} />
                </Link>
              </>
            ) : (
              <AuthButtons />
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl justify-center gap-6 lg:px-4">
        {/* Desktop left sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col py-4 lg:flex">
          <div className="px-4 pb-4">
            <Logo />
          </div>
          <SideNav username={user?.username ?? null} unread={unread} />
          <Link
            href="/store"
            className="mx-2 mt-5 rounded-full bg-gradient-to-br from-gold-bright via-gold to-[#a8841f] py-3.5 text-center text-base font-black text-black shadow-[0_4px_24px_rgba(212,175,55,0.35)] transition hover:brightness-110 active:scale-[0.98]"
          >
            💸 Flex
          </Link>
          <div className="mt-auto">
            {user ? (
              <div className="flex items-center gap-2 rounded-full p-2 transition hover:bg-surface-2">
                <Link href={`/u/${user.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar name={user.display_name} color={user.avatar_color} mediaId={user.avatar_media_id} size={40} />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-semibold">{user.display_name}</span>
                    <span className="block truncate text-xs text-muted">@{user.username}</span>
                  </span>
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    aria-label="Log out"
                    title="Log out"
                    className="rounded-full p-2 text-muted transition hover:bg-surface hover:text-foreground"
                  >
                    <Icon name="logout" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-2">
                <AuthButtons stacked />
              </div>
            )}
          </div>
        </aside>

        {/* Center column. pb leaves room for the mobile bottom nav. */}
        <main className="w-full min-w-0 max-w-2xl px-4 pb-28 pt-4 lg:max-w-[640px] lg:px-0 lg:pb-12">{children}</main>

        {/* Desktop right rail */}
        <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 space-y-4 overflow-y-auto py-4 xl:block">
          <form action="/explore" role="search">
            <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-muted focus-within:border-gold">
              <Icon name="search" className="h-4 w-4" />
              <input
                name="q"
                placeholder="Search FLEX"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
              />
            </label>
          </form>

          <RailCard title="Top flexers this week" href="/leaderboard?period=week">
            {weekly.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted">Nobody yet. The crown is up for grabs.</p>
            ) : (
              <ol className="pb-2">
                {weekly.map((e) => (
                  <li key={e.user.id}>
                    <Link
                      href={`/u/${e.user.username}`}
                      className="flex items-center gap-3 px-4 py-2 transition hover:bg-surface-2"
                    >
                      <span className="w-4 text-center text-sm font-bold text-muted">{e.rank}</span>
                      <Avatar name={e.user.display_name} color={e.user.avatar_color} mediaId={e.user.avatar_media_id} size={32} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{e.user.display_name}</span>
                      <span className="text-sm font-bold tabular-nums text-gold">{formatMoney(e.cents)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </RailCard>

          {suggested.length > 0 && (
            <RailCard title="Who to follow" href="/explore">
              <UserList users={suggested} viewerId={user?.id ?? null} compact />
            </RailCard>
          )}

          {user && (
            <div className="px-4 text-xs text-muted">
              You&apos;re <TierBadge totalCents={user.total_spent_cents} /> with {formatMoney(user.total_spent_cents)} flexed.
            </div>
          )}
        </aside>
      </div>

      <MobileTabBar username={user?.username ?? null} />
    </>
  );
}

function Logo() {
  return (
    <Link href="/" className="text-gold-gradient text-2xl font-black tracking-[0.2em] md:text-[26px]" aria-label="FLEX home">
      FLEX
    </Link>
  );
}

function AuthButtons({ stacked = false }: { stacked?: boolean }) {
  return (
    <>
      <Link
        href="/login"
        className={`rounded-full px-3 py-2 text-sm font-semibold text-muted transition hover:text-foreground ${
          stacked ? "border border-border text-center" : ""
        }`}
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="rounded-full bg-gradient-to-br from-gold-bright via-gold to-[#a8841f] px-4 py-2 text-center text-sm font-bold text-black transition hover:brightness-110"
      >
        Sign up
      </Link>
    </>
  );
}

function RailCard({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <h2 className="text-base font-bold">{title}</h2>
        <Link href={href} className="text-xs font-semibold text-gold hover:text-gold-bright">
          See all
        </Link>
      </div>
      {children}
    </section>
  );
}
