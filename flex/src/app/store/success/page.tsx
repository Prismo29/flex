import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { fulfillSessionById, type FulfillResult } from "@/lib/stripe";
import { formatMoney, tierFor } from "@/lib/tiers";
import SuccessCelebration from "@/components/store/SuccessCelebration";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Flex secured — FLEX",
};

const primaryBtn =
  "rounded-xl bg-gradient-to-r from-gold to-gold-bright px-4 py-3 text-center text-sm font-bold text-background hover:brightness-110";
const secondaryBtn =
  "rounded-xl border border-border bg-surface-2 px-4 py-3 text-center text-sm font-semibold text-foreground hover:border-gold/50";

function Card({
  emoji,
  eyebrow,
  title,
  children,
  actions,
}: {
  emoji: string;
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-sm pt-6 pb-16">
      <section className="rounded-3xl border border-gold/40 bg-gradient-to-br from-surface-2 to-surface p-6 text-center shadow-[0_0_60px_-15px_rgba(212,175,55,0.5)]">
        <div className="text-5xl" aria-hidden>
          {emoji}
        </div>
        <p className="mt-3 text-xs font-semibold tracking-[0.3em] text-gold uppercase">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-black text-foreground">{title}</h1>
        {children}
        <div className="mt-6 grid grid-cols-2 gap-2">{actions}</div>
      </section>
    </div>
  );
}

const defaultActions = (
  <>
    <Link href="/store" className={secondaryBtn}>
      Flex again
    </Link>
    <Link href="/leaderboard" className={primaryBtn}>
      See the leaderboard
    </Link>
  </>
);

export default async function StoreSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";
  if (!sessionId) redirect("/store");

  let result: FulfillResult | null = null;
  try {
    result = await fulfillSessionById(sessionId);
  } catch (err) {
    console.error("Stripe session lookup failed", err);
  }

  if (!result || (!result.ok && result.reason === "invalid")) {
    return (
      <Card
        emoji="⚠️"
        eyebrow="Something went wrong"
        title="We couldn't confirm this checkout."
        actions={
          <Link href="/store" className={`${primaryBtn} col-span-2`}>
            Back to the store
          </Link>
        }
      >
        <p className="mt-2 text-sm text-muted">
          If you were charged, your rank will update automatically once Stripe confirms the payment.
        </p>
      </Card>
    );
  }

  if (!result.ok) {
    return (
      <Card
        emoji="⏳"
        eyebrow="Almost there"
        title="Payment is still processing."
        actions={
          <Link href="/leaderboard" className={`${primaryBtn} col-span-2`}>
            See the leaderboard
          </Link>
        }
      >
        <p className="mt-2 text-sm text-muted">Your rank will update as soon as Stripe confirms it.</p>
      </Card>
    );
  }

  const user = await getCurrentUser();
  if (user?.id !== result.userId) {
    return (
      <Card emoji="✅" eyebrow="Thank you" title="Payment received" actions={defaultActions}>
        <p className="mt-2 text-sm text-muted">The flex has been added to the leaderboard.</p>
      </Card>
    );
  }

  const { amountCents, rank, purchase } = result;
  const newTier = tierFor(purchase.newTotalCents);

  return (
    <>
      <SuccessCelebration
        amountCents={amountCents}
        newTotalCents={purchase.newTotalCents}
        rank={rank}
        tierChanged={purchase.tierChanged}
        newTierName={purchase.newTierName}
        newTierEmoji={newTier.emoji}
      />
      <Card
        emoji="💸"
        eyebrow="Flex secured"
        title={<span className="text-gold-gradient text-4xl tabular-nums">{formatMoney(amountCents)}</span>}
        actions={defaultActions}
      >
        <p className="mt-1 text-sm text-muted">
          Lifetime total: <span className="text-foreground">{formatMoney(purchase.newTotalCents)}</span>
        </p>
        <p className="mt-5 text-2xl font-black text-foreground">
          You&apos;re now <span className="text-gold-gradient">#{rank}</span>
        </p>
        {purchase.tierChanged && (
          <p className="mt-3 inline-block rounded-full border border-gold/60 bg-gradient-to-r from-[#a8841f] via-gold-bright to-gold px-4 py-1.5 text-sm font-bold text-background">
            Tier up! {newTier.emoji} {purchase.newTierName}
          </p>
        )}
      </Card>
    </>
  );
}
