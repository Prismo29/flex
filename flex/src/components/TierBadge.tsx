import { tierFor } from "@/lib/tiers";

type TierBadgeProps = {
  totalCents: number;
  size?: "sm" | "md";
};

/** Pill showing the tier (emoji + name) for a lifetime spend. Works in server and client components. */
export default function TierBadge({ totalCents, size = "sm" }: TierBadgeProps) {
  const tier = tierFor(totalCents);
  const sizing =
    size === "md" ? "gap-1.5 px-3 py-1 text-sm" : "gap-1 px-2 py-0.5 text-[11px] leading-4";
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border font-semibold tracking-wide ${sizing}`}
      style={{
        color: tier.color,
        borderColor: `${tier.color}66`,
        backgroundColor: `${tier.color}1a`,
      }}
      title={`${tier.name} tier`}
    >
      <span aria-hidden="true">{tier.emoji}</span>
      {tier.name}
    </span>
  );
}
