import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { paymentMode } from "@/lib/stripe";
import { formatMoney, nextTier, tierFor } from "@/lib/tiers";
import TierBadge from "@/components/TierBadge";
import StoreClient from "@/components/store/StoreClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Store · FLEX",
};

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const canceled = params.canceled === "1";
  const mode = paymentMode();
  const user = await getCurrentUser();
  const total = user?.total_spent_cents ?? 0;
  const tier = tierFor(total);
  const next = nextTier(total);
  const pct = next
    ? Math.min(100, Math.max(0, ((total - tier.minCents) / (next.minCents - tier.minCents)) * 100))
    : 100;

  return (
    <div className="space-y-6 pb-16">
      {canceled && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 py-2.5 pr-2 pl-4 text-sm text-foreground"
        >
          <span>Checkout canceled — you weren&apos;t charged.</span>
          <Link
            href="/store"
            replace
            scroll={false}
            aria-label="Dismiss notice"
            className="shrink-0 rounded-full p-2 text-muted hover:bg-surface hover:text-foreground"
          >
            ✕
          </Link>
        </div>
      )}

      <header className="pt-2">
        <p className="text-xs font-semibold tracking-[0.3em] text-gold uppercase">The Store</p>
        <h1 className="text-gold-gradient mt-1 text-4xl font-black tracking-tight sm:text-5xl">
          Buy your flex.
        </h1>
        <p className="mt-2 text-sm text-muted">
          Every dollar climbs the leaderboard. Nothing else. That&apos;s the point.
        </p>
      </header>

      {user ? (
        <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-surface-2 to-surface p-5 shadow-[0_0_40px_-15px_rgba(212,175,55,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-widest text-muted uppercase">Total flexed</p>
              <p className="text-gold-gradient text-3xl font-black tabular-nums sm:text-4xl">
                {formatMoney(total)}
              </p>
            </div>
            <TierBadge totalCents={total} size="md" />
          </div>
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold to-gold-bright transition-[width] duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {next ? (
                <>
                  <span className="font-semibold text-foreground">
                    {formatMoney(next.minCents - total)}
                  </span>{" "}
                  to {next.emoji} {next.name}
                </>
              ) : (
                <>You&apos;ve reached the top. {tier.emoji} Bow down.</>
              )}
            </p>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-surface p-5 text-sm">
          <p className="text-foreground">
            <Link href="/login?next=/store" className="font-semibold text-gold hover:text-gold-bright">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/signup" className="font-semibold text-gold hover:text-gold-bright">
              sign up
            </Link>{" "}
            to start flexing.
          </p>
        </section>
      )}

      <StoreClient loggedIn={!!user} mode={mode} />
    </div>
  );
}
