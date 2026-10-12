"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { rankFor, recordPurchase } from "@/lib/purchases";
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

  try {
    // FAKE PAYMENT: no charge happens. See recordPurchase() for where Stripe will plug in.
    const result = recordPurchase(user.id, amountCents, message);
    revalidatePath("/");
    revalidatePath("/feed");
    revalidatePath("/store");
    revalidatePath(`/u/${user.username}`);
    return {
      status: "success",
      id: Date.now(),
      amountCents,
      ...result,
      newTierEmoji: tierFor(result.newTotalCents).emoji,
      rank: rankFor(user.id),
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Purchase failed.",
    };
  }
}
