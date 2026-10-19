import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getFeedPage, getSuggestedUsers } from "@/lib/social";
import { getTotalFlexedCents } from "@/lib/queries";
import { formatMoney } from "@/lib/tiers";
import type { FeedScope } from "@/lib/types";
import Composer from "@/components/social/Composer";
import FeedList from "@/components/social/FeedList";
import UserList from "@/components/social/UserList";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const me = await getCurrentUser();
  const tab = sp.tab === "following" && me ? "following" : "foryou";
  const scope: FeedScope = tab === "following" ? { kind: "following" } : { kind: "all" };
  const viewerId = me?.id ?? 0;

  const [page, suggested, totalCents] = await Promise.all([
    getFeedPage(scope, viewerId),
    tab === "following" ? getSuggestedUsers(viewerId, 6) : Promise.resolve([]),
    me ? Promise.resolve(0) : getTotalFlexedCents(),
  ]);
  const now = Date.now();

  return (
    <div className="space-y-4">
      {!me && <Welcome totalCents={totalCents} />}

      {me && (
        <nav
          aria-label="Feed"
          className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 grid grid-cols-2 border-b border-border bg-background/85 backdrop-blur-xl lg:top-0 lg:mx-0"
        >
          <FeedTab href="/" label="For you" active={tab === "foryou"} />
          <FeedTab href="/?tab=following" label="Following" active={tab === "following"} />
        </nav>
      )}

      {me && <Composer name={me.display_name} color={me.avatar_color} mediaId={me.avatar_media_id} />}

      <FeedList
        key={tab}
        scope={scope}
        initial={page}
        now={now}
        viewerId={me?.id ?? null}
        empty={
          tab === "following" ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="px-5 pb-3 pt-6 text-center">
                <p className="text-3xl" aria-hidden>
                  👀
                </p>
                <p className="mt-2 font-semibold">Your following feed is empty</p>
                <p className="mt-1 text-sm text-muted">Follow the big spenders to see every flex they make.</p>
              </div>
              <UserList users={suggested} viewerId={me?.id ?? null} />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
              <div className="text-4xl" aria-hidden>
                🦗
              </div>
              <p className="mt-3 font-semibold text-foreground">It&apos;s quiet. Too quiet.</p>
              <p className="mt-1 text-sm text-muted">Nobody has posted yet. Be the first.</p>
              <Link
                href="/store"
                className="mt-5 inline-block rounded-full bg-gradient-to-r from-gold to-gold-bright px-5 py-2 text-sm font-bold text-background"
              >
                Make it rain
              </Link>
            </div>
          )
        }
      />
    </div>
  );
}

function FeedTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative py-3.5 text-center text-sm font-semibold transition hover:bg-surface/60 ${
        active ? "text-foreground" : "text-muted"
      }`}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-gradient-to-r from-gold-bright to-gold" />
      )}
    </Link>
  );
}

function Welcome({ totalCents }: { totalCents: number }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-surface px-5 py-8 text-center sm:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-72 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(212,175,55,0.35), transparent)" }}
      />
      <h1 className="relative text-3xl font-black tracking-tight sm:text-4xl">
        The social network for <span className="text-gold-gradient">flexing.</span>
      </h1>
      <p className="relative mx-auto mt-3 max-w-md text-sm text-muted">
        Post, follow and comment like anywhere else. The difference: your rank is how much you&apos;ve spent.{" "}
        <span className="font-semibold text-gold">{formatMoney(totalCents)}</span> flexed so far.
      </p>
      <div className="relative mt-6 flex justify-center gap-3">
        <Link
          href="/signup"
          className="rounded-full bg-gold px-6 py-3 text-sm font-bold text-black shadow-[0_0_30px_rgba(212,175,55,0.35)] transition hover:bg-gold-bright active:scale-95"
        >
          Join FLEX
        </Link>
        <Link
          href="/leaderboard"
          className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition hover:border-gold/60"
        >
          See who&apos;s richest
        </Link>
      </div>
    </section>
  );
}
