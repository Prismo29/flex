"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { checkoutAction, type CheckoutState } from "@/app/store/actions";
import type { PaymentMode } from "@/lib/stripe";
import { formatMoney } from "@/lib/tiers";
import { PACKS } from "./packs";
import CheckoutSheet from "./CheckoutSheet";
import Celebration from "./Celebration";

const MAX_MESSAGE = 140;
const MIN_CUSTOM = 1;
const MAX_CUSTOM = 10_000;

const INITIAL: CheckoutState = { status: "idle" };

export default function StoreClient({ loggedIn, mode }: { loggedIn: boolean; mode: PaymentMode }) {
  const [state, formAction, isPending] = useActionState(checkoutAction, INITIAL);
  const [selected, setSelected] = useState<{ cents: number; label: string } | null>(null);
  const [message, setMessage] = useState("");
  const [custom, setCustom] = useState("");
  const [seenSuccessId, setSeenSuccessId] = useState<number | null>(null);
  // Error from the action is only shown for the checkout attempt that produced it.
  const [attempted, setAttempted] = useState(false);

  const celebrating = state.status === "success" && state.id !== seenSuccessId;
  const sheetOpen = selected !== null && !celebrating;

  const customDollars = Number(custom);
  const customCents = Math.round(customDollars * 100);
  const customValid =
    custom.trim() !== "" &&
    Number.isFinite(customDollars) &&
    customDollars >= MIN_CUSTOM &&
    customDollars <= MAX_CUSTOM;

  function open(cents: number, label: string) {
    setAttempted(false);
    setSelected({ cents, label });
  }

  function closeCelebration() {
    if (state.status === "success") setSeenSuccessId(state.id);
    setSelected(null);
    setMessage("");
    setCustom("");
    setAttempted(false);
  }

  return (
    <>
      {/* Flex message */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <label htmlFor="flex-message" className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">
            Flex message <span className="font-normal text-muted">(optional)</span>
          </span>
          <span
            className={`text-xs tabular-nums ${message.length >= MAX_MESSAGE ? "text-danger" : "text-muted"}`}
          >
            {message.length}/{MAX_MESSAGE}
          </span>
        </label>
        <textarea
          id="flex-message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
          maxLength={MAX_MESSAGE}
          rows={2}
          disabled={!loggedIn}
          placeholder={loggedIn ? "Say something to the peasants…" : "Log in to add a message"}
          className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:border-gold/60 focus:outline-none disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-muted">Shown with your purchase in the feed.</p>
      </section>

      {/* Packs */}
      <section aria-labelledby="packs-heading">
        <h2 id="packs-heading" className="mb-3 text-sm font-semibold tracking-widest text-muted uppercase">
          Packs
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PACKS.map((pack, i) => {
            const premium = i >= PACKS.length - 2;
            const cls = `group relative flex flex-col items-start overflow-hidden rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gold ${
              premium
                ? "border-gold/50 bg-gradient-to-br from-[#2a2310] via-surface-2 to-surface shadow-[0_0_30px_-12px_rgba(212,175,55,0.6)] hover:shadow-[0_0_40px_-8px_rgba(212,175,55,0.8)]"
                : "border-border bg-surface hover:border-gold/50"
            }`;
            const inner = (
              <>
                <span className="text-3xl" aria-hidden>
                  {pack.emoji}
                </span>
                <span className="mt-2 text-sm font-semibold text-foreground">{pack.name}</span>
                <span className="text-gold-gradient text-2xl font-black tabular-nums">
                  {formatMoney(pack.cents)}
                </span>
                <span className="mt-1 text-xs leading-snug text-muted">{pack.tagline}</span>
                <span className="mt-3 w-full rounded-lg bg-gradient-to-r from-gold to-gold-bright py-1.5 text-center text-xs font-bold text-background opacity-90 group-hover:opacity-100">
                  {loggedIn ? "Flex it" : "Log in to flex"}
                </span>
              </>
            );
            return loggedIn ? (
              <button key={pack.cents} type="button" className={cls} onClick={() => open(pack.cents, pack.name)}>
                {inner}
              </button>
            ) : (
              <Link key={pack.cents} href="/login?next=/store" className={cls}>
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Custom amount */}
      <section className="rounded-2xl border border-dashed border-gold/40 bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Custom amount 🎯</h2>
        <p className="text-xs text-muted">
          Anywhere from {formatMoney(MIN_CUSTOM * 100)} to {formatMoney(MAX_CUSTOM * 100)}.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (loggedIn && customValid) open(customCents, "Custom Flex");
          }}
        >
          <div className="relative flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">$</span>
            <input
              type="number"
              inputMode="decimal"
              min={MIN_CUSTOM}
              max={MAX_CUSTOM}
              step="0.01"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              disabled={!loggedIn}
              placeholder="250"
              aria-label="Custom amount in dollars"
              className="w-full rounded-xl border border-border bg-background py-2.5 pr-3 pl-7 text-foreground tabular-nums placeholder:text-muted/60 focus:border-gold/60 focus:outline-none disabled:opacity-60"
            />
          </div>
          {loggedIn ? (
            <button
              type="submit"
              disabled={!customValid}
              className="shrink-0 rounded-xl bg-gradient-to-r from-gold to-gold-bright px-5 text-sm font-bold text-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              Flex it
            </button>
          ) : (
            <Link
              href="/login?next=/store"
              className="flex shrink-0 items-center rounded-xl bg-gradient-to-r from-gold to-gold-bright px-5 text-sm font-bold text-background"
            >
              Log in
            </Link>
          )}
        </form>
        {custom.trim() !== "" && !customValid && (
          <p className="mt-2 text-xs text-danger">
            Enter between {formatMoney(MIN_CUSTOM * 100)} and {formatMoney(MAX_CUSTOM * 100)}.
          </p>
        )}
      </section>

      {mode === "fake" ? (
        <p className="text-center text-xs text-muted">
          🧪 Test mode — payments are simulated and no real money is charged.
        </p>
      ) : (
        <p className="text-center text-xs text-muted">
          🔒 Secure checkout by Stripe.
          {mode === "stripe-test" && " Test mode — no real money is charged."}
        </p>
      )}

      {sheetOpen && selected && (
        <CheckoutSheet
          amountCents={selected.cents}
          label={selected.label}
          message={message}
          mode={mode}
          pending={isPending}
          error={attempted && state.status === "error" ? state.error : null}
          action={formAction}
          onSubmit={() => setAttempted(true)}
          onClose={() => !isPending && setSelected(null)}
        />
      )}

      {celebrating && state.status === "success" && (
        <Celebration
          amountCents={state.amountCents}
          newTotalCents={state.newTotalCents}
          rank={state.rank}
          tierChanged={state.tierChanged}
          newTierName={state.newTierName}
          newTierEmoji={state.newTierEmoji}
          onClose={closeCelebration}
        />
      )}
    </>
  );
}
