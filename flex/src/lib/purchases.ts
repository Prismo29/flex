import "server-only";
import { get, run, transaction } from "./db";
import { PACKS_CENTS, tierFor } from "./tiers";

export const MIN_CUSTOM_CENTS = 100;
export const MAX_CUSTOM_CENTS = 1_000_000;
export const MAX_FLEX_MESSAGE = 140;
export const DEFAULT_FLEX_MESSAGE = "just flexed";

export type PurchaseResult = {
  newTotalCents: number;
  tierChanged: boolean;
  newTierName: string;
};

/** Stripe ids stored with a real payment, so it is recorded once and refunds can find it. */
export type StripeRef = { sessionId: string; paymentIntentId: string | null };

/** Returns an error message if the amount is not purchasable, otherwise null. */
export function validateAmount(amountCents: number): string | null {
  if (!Number.isInteger(amountCents)) return "Amount must be a whole number of cents.";
  if (PACKS_CENTS.includes(amountCents)) return null;
  if (amountCents < MIN_CUSTOM_CENTS || amountCents > MAX_CUSTOM_CENTS) {
    return "Custom amounts must be between $1 and $10,000.";
  }
  return null;
}

export function cleanMessage(message?: string | null): string {
  return (
    (message ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_FLEX_MESSAGE) || DEFAULT_FLEX_MESSAGE
  );
}

/**
 * Record a purchase of flex for a user: insert purchase, bump user's total, auto-post to feed,
 * all in one transaction.
 *
 * With Stripe configured this is only called once a payment is confirmed (see lib/stripe.ts),
 * from both the webhook and the success page. Passing `stripe` makes it idempotent: a session
 * that was already recorded is not counted twice.
 * Without Stripe (local dev / demo) the store calls it directly and nobody is charged.
 */
export async function recordPurchase(
  userId: number,
  amountCents: number,
  message?: string | null,
  stripe?: StripeRef,
): Promise<PurchaseResult> {
  const invalid = validateAmount(amountCents);
  if (invalid) throw new Error(invalid);

  const body = cleanMessage(message);
  const now = Date.now();

  return transaction(async (tx) => {
    const before = await get<{ total_spent_cents: number }>(
      "SELECT total_spent_cents FROM users WHERE id = ?",
      [userId],
      tx,
    );
    if (!before) throw new Error("User not found.");
    const beforeCents = Number(before.total_spent_cents);

    if (stripe) {
      const existing = await get("SELECT 1 FROM purchases WHERE stripe_session_id = ?", [stripe.sessionId], tx);
      if (existing) {
        // Already recorded (webhook and success page both fulfil). Report the current state.
        return {
          newTotalCents: beforeCents,
          tierChanged: tierFor(beforeCents - amountCents).name !== tierFor(beforeCents).name,
          newTierName: tierFor(beforeCents).name,
        };
      }
    }

    await run(
      `INSERT INTO purchases (user_id, amount_cents, created_at, stripe_session_id, stripe_payment_intent)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, amountCents, now, stripe?.sessionId ?? null, stripe?.paymentIntentId ?? null],
      tx,
    );
    await run(
      "UPDATE users SET total_spent_cents = total_spent_cents + ? WHERE id = ?",
      [amountCents, userId],
      tx,
    );
    await run(
      "INSERT INTO posts (user_id, kind, body, amount_cents, created_at) VALUES (?, 'purchase', ?, ?, ?)",
      [userId, body, amountCents, now],
      tx,
    );

    const newTotalCents = beforeCents + amountCents;
    return {
      newTotalCents,
      tierChanged: tierFor(beforeCents).name !== tierFor(newTotalCents).name,
      newTierName: tierFor(newTotalCents).name,
    };
  });
}

/**
 * Take back money that was refunded or disputed, so nobody keeps rank they didn't pay for.
 * `reversedTotalCents` is the total amount now reversed for that payment (Stripe reports the
 * running total), so calling this again with the same number does nothing.
 */
export async function reversePurchase(paymentIntentId: string, reversedTotalCents: number): Promise<void> {
  await transaction(async (tx) => {
    const p = await get<{
      id: number;
      user_id: number;
      amount_cents: number;
      refunded_cents: number;
      created_at: number;
    }>(
      "SELECT id, user_id, amount_cents, refunded_cents, created_at FROM purchases WHERE stripe_payment_intent = ?",
      [paymentIntentId],
      tx,
    );
    if (!p) return;
    const amount = Number(p.amount_cents);
    const target = Math.min(amount, Math.max(0, reversedTotalCents));
    const delta = target - Number(p.refunded_cents);
    if (delta <= 0) return;

    await run("UPDATE purchases SET refunded_cents = ? WHERE id = ?", [target, p.id], tx);
    await run(
      "UPDATE users SET total_spent_cents = MAX(0, total_spent_cents - ?) WHERE id = ?",
      [delta, p.user_id],
      tx,
    );
    if (target >= amount) {
      // Fully reversed: remove the brag from the feed too.
      await run(
        "DELETE FROM posts WHERE user_id = ? AND kind = 'purchase' AND amount_cents = ? AND created_at = ?",
        [p.user_id, amount, p.created_at],
        tx,
      );
    }
  });
}

/** 1-based leaderboard rank of a user by total spent. */
export async function rankFor(userId: number): Promise<number> {
  const row = await get<{ rank: number }>(
    `SELECT COUNT(*) + 1 AS rank FROM users
     WHERE total_spent_cents > (SELECT total_spent_cents FROM users WHERE id = ?)`,
    [userId],
  );
  return Number(row?.rank ?? 1);
}
