// Rank tiers by lifetime spend. Shared by server and client code.

export type Tier = {
  name: string;
  minCents: number;
  color: string; // badge color
  emoji: string;
};

export const TIERS: Tier[] = [
  { name: "Peasant", minCents: 0, color: "#8a8a8a", emoji: "🪙" },
  { name: "Bronze", minCents: 1_000, color: "#cd7f32", emoji: "🥉" },
  { name: "Silver", minCents: 10_000, color: "#c0c0c0", emoji: "🥈" },
  { name: "Gold", minCents: 50_000, color: "#d4af37", emoji: "🥇" },
  { name: "Platinum", minCents: 250_000, color: "#9fd8e8", emoji: "💠" },
  { name: "Diamond", minCents: 1_000_000, color: "#7df9ff", emoji: "💎" },
  { name: "Royalty", minCents: 10_000_000, color: "#b57edc", emoji: "👑" },
];

export function tierFor(totalCents: number): Tier {
  let t = TIERS[0];
  for (const tier of TIERS) if (totalCents >= tier.minCents) t = tier;
  return t;
}

/** Next tier above the current one, or null at the top. */
export function nextTier(totalCents: number): Tier | null {
  return TIERS.find((t) => t.minCents > totalCents) ?? null;
}

/** Packs offered in the store, in cents. */
export const PACKS_CENTS = [100, 500, 2_000, 10_000, 50_000, 100_000];

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}
