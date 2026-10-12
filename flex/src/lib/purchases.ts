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

/** Returns an error message if the amount is not purchasable, otherwise null. */
export function validateAmount(amountCents: number): string | null {
  if (!Number.isInteger(amountCents)) return "Amount must be a whole number of cents.";
  if (PACKS_CENTS.includes(amountCents)) return null;
  if (amountCents < MIN_CUSTOM_CENTS || amountCents > MAX_CUSTOM_CENTS) {
    return "Custom amounts must be between $1 and $10,000.";
  }
  return null;
}

/**
 * Record a purchase of flex for a user.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ STRIPE PLUGS IN HERE.                                                   │
 * │ Payments are FAKE right now: this function is called directly by the    │
 * │ store's Server Action and nobody is charged. When Stripe is added, the  │
 * │ Server Action should create a Checkout Session / PaymentIntent instead, │
 * │ and THIS function should be called from the Stripe webhook handler      │
 * │ (e.g. on `checkout.session.completed`) once payment is confirmed. Store │
 * │ the Stripe payment id on the purchase row for idempotency.              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Runs in a single transaction: insert purchase, bump user's total, auto-post to feed.
 */
export async function recordPurchase(
  userId: number,
  amountCents: number,
  message?: string,
): Promise<PurchaseResult> {
  const invalid = validateAmount(amountCents);
  if (invalid) throw new Error(invalid);

  const body =
    (message ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_FLEX_MESSAGE) ||
    DEFAULT_FLEX_MESSAGE;

  const now = Date.now();

  return transaction(async (tx) => {
    const before = await get<{ total_spent_cents: number }>(
      "SELECT total_spent_cents FROM users WHERE id = ?",
      [userId],
      tx,
    );
    if (!before) throw new Error("User not found.");

    await run(
      "INSERT INTO purchases (user_id, amount_cents, created_at) VALUES (?, ?, ?)",
      [userId, amountCents, now],
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

    const newTotalCents = Number(before.total_spent_cents) + amountCents;
    const oldTier = tierFor(Number(before.total_spent_cents));
    const newTier = tierFor(newTotalCents);
    return {
      newTotalCents,
      tierChanged: oldTier.name !== newTier.name,
      newTierName: newTier.name,
    };
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
