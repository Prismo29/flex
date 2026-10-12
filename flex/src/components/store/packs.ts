import { PACKS_CENTS } from "@/lib/tiers";

export type Pack = { cents: number; name: string; emoji: string; tagline: string };

const META: { name: string; emoji: string; tagline: string }[] = [
  { name: "Pocket Change", emoji: "🪙", tagline: "A humble start." },
  { name: "Lunch Money", emoji: "🥪", tagline: "Skip a sandwich, gain respect." },
  { name: "Big Spender", emoji: "💵", tagline: "People are noticing." },
  { name: "High Roller", emoji: "🎰", tagline: "The velvet rope lifts." },
  { name: "Whale", emoji: "🐋", tagline: "The ocean parts for you." },
  { name: "Oil Baron", emoji: "🛢️", tagline: "Generational flex." },
];

export const PACKS: Pack[] = PACKS_CENTS.map((cents, i) => ({
  cents,
  ...(META[i] ?? { name: "Mystery Pack", emoji: "✨", tagline: "Pure flex." }),
}));
