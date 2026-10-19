"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { rankFor, recordPurchase } from "@/lib/purchases";
import { createCheckout, paymentMode } from "@/lib/stripe";
import { tierFor } from "@/lib/tiers";

export type CheckoutState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | {
      status: "success";
      id: number; // changes every purchase so the client can re-trigger the celebration
      amountCents: number;
      newTotalCents: number;
      tierChanged: boolean;
      newTierName: string;
      newTierEmoji: string;
      rank: number;
    };

export async function checkoutAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", error: "Please log in to flex." };

  const amountCents = Number(formData.get("amount_cents"));
  const message = String(formData.get("message") ?? "");

  if (paymentMode() !== "fake") {
    // Real payment: send the user to Stripe Checkout. The purchase is recorded only after
    // Stripe confirms payment (success page + webhook), never here.
    let url: string;
    try {
      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host");
      const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
      url = await createCheckout({ userId: user.id, amountCents, message, origin: `${proto}://${host}` });
    } catch (err) {
      console.error("Stripe checkout failed", err);
      return { status: "error", error: "Couldn't start checkout. Please try again." };
    }
    redirect(url); // outside try: redirect() works by throwing
  }

  try {
    // FAKE PAYMENT (no STRIPE_SECRET_KEY set): nobody is charged.
    const result = await recordPurchase(user.id, amountCents, message);
    revalidatePath("/");
    revalidatePath("/leaderboard");
    revalidatePath("/store");
    revalidatePath(`/u/${user.username}`);
    return {
      status: "success",
      id: Date.now(),
      amountCents,
      ...result,
      newTierEmoji: tierFor(result.newTotalCents).emoji,
      rank: await rankFor(user.id),
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Purchase failed.",
    };
  }
}
