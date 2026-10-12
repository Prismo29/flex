import "server-only";
import Stripe from "stripe";
import { formatMoney } from "./tiers";
import { cleanMessage, rankFor, recordPurchase, reversePurchase, validateAmount, type PurchaseResult } from "./purchases";

// Payments go through Stripe Checkout (Stripe's hosted page), so card details never touch FLEX.
// Without STRIPE_SECRET_KEY the store falls back to fake purchases (local dev / demo).

export type PaymentMode = "fake" | "stripe-test" | "stripe-live";

export function paymentMode(): PaymentMode {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return "fake";
  return key.startsWith("sk_test_") || key.startsWith("rk_test_") ? "stripe-test" : "stripe-live";
}

let client: Stripe | null = null;
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  client ??= new Stripe(key);
  return client;
}

/** Create a Checkout Session for this purchase and return the URL to send the user to. */
export async function createCheckout(opts: {
  userId: number;
  amountCents: number;
  message: string;
  origin: string; // e.g. https://flex-teammang.vercel.app
}): Promise<string> {
  const invalid = validateAmount(opts.amountCents);
  if (invalid) throw new Error(invalid);

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: opts.amountCents,
          product_data: {
            name: `FLEX — ${formatMoney(opts.amountCents)} of flex`,
            description: "Raises your FLEX leaderboard rank. Digital status item with no cash value.",
          },
        },
      },
    ],
    client_reference_id: String(opts.userId),
    metadata: { user_id: String(opts.userId), message: cleanMessage(opts.message) },
    payment_intent_data: { metadata: { user_id: String(opts.userId) } },
    success_url: `${opts.origin}/store/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}/store?canceled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export type FulfillResult =
  | { ok: true; userId: number; amountCents: number; rank: number; purchase: PurchaseResult }
  | { ok: false; reason: "unpaid" | "invalid" };

function intentId(pi: string | Stripe.PaymentIntent | null): string | null {
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

/**
 * Record a paid Checkout Session. Safe to call more than once for the same session
 * (the webhook and the success page both call it; whichever runs first records it).
 */
export async function fulfillSession(session: Stripe.Checkout.Session): Promise<FulfillResult> {
  if (session.payment_status !== "paid") return { ok: false, reason: "unpaid" };
  const userId = Number(session.metadata?.user_id ?? session.client_reference_id);
  const amountCents = session.amount_total ?? 0;
  if (!Number.isInteger(userId) || userId <= 0 || validateAmount(amountCents)) {
    return { ok: false, reason: "invalid" };
  }
  const purchase = await recordPurchase(userId, amountCents, session.metadata?.message, {
    sessionId: session.id,
    paymentIntentId: intentId(session.payment_intent),
  });
  return { ok: true, userId, amountCents, rank: await rankFor(userId), purchase };
}

/** Look up a session by id (from the success page URL) and fulfil it if paid. */
export async function fulfillSessionById(sessionId: string): Promise<FulfillResult> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { ok: false, reason: "invalid" };
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  return fulfillSession(session);
}

/** Handle a verified webhook event. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfillSession(event.data.object);
      break;
    case "charge.refunded": {
      const charge = event.data.object;
      const pi = intentId(charge.payment_intent);
      if (pi) await reversePurchase(pi, charge.amount_refunded);
      break;
    }
    case "charge.dispute.created": {
      // A chargeback: take the full amount back off the leaderboard immediately.
      const dispute = event.data.object;
      const pi = intentId(dispute.payment_intent);
      if (pi) await reversePurchase(pi, Number.MAX_SAFE_INTEGER);
      break;
    }
  }
}
