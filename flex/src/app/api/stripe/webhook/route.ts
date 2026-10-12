import { revalidatePath } from "next/cache";
import { getStripe, handleStripeEvent } from "@/lib/stripe";

// Stripe calls this after payments, refunds and disputes.
// Configure it in Stripe: Developers → Webhooks → endpoint https://<your-site>/api/stripe/webhook
// with events checkout.session.completed, checkout.session.async_payment_succeeded,
// charge.refunded, charge.dispute.created. Put the signing secret in STRIPE_WEBHOOK_SECRET.

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook not configured", { status: 400 });

  let event;
  try {
    // Must verify against the raw body, before any JSON parsing.
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error("Stripe webhook failed", event.type, err);
    return new Response("Handler error", { status: 500 }); // Stripe will retry
  }

  revalidatePath("/", "layout");
  return Response.json({ received: true });
}
