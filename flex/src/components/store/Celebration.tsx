"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/tiers";

type Props = {
  amountCents: number;
  newTotalCents: number;
  rank: number;
  tierChanged: boolean;
  newTierName: string;
  newTierEmoji: string;
  onClose: () => void;
};

const COLORS = ["#d4af37", "#f5d77a", "#fff4c2", "#a8841f", "#ffffff"];

// Deterministic "random" confetti so render stays pure.
const PIECES = Array.from({ length: 60 }, (_, i) => {
  const r = (n: number) => ((i * 9301 + n * 49297) % 233280) / 233280;
  return {
    left: r(1) * 100,
    delay: r(2) * 0.8,
    duration: 2.2 + r(3) * 1.8,
    size: 6 + r(4) * 8,
    drift: (r(5) - 0.5) * 160,
    spin: 360 + r(6) * 720,
    color: COLORS[i % COLORS.length],
    round: i % 3 === 0,
  };
});

export default function Celebration({
  amountCents,
  newTotalCents,
  rank,
  tierChanged,
  newTierName,
  newTierEmoji,
  onClose,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Purchase complete"
      onClick={onClose}
    >
      <style>{`
        @keyframes flex-confetti {
          0% { transform: translate3d(0,-10vh,0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(var(--drift),110vh,0) rotate(var(--spin)); opacity: 0.9; }
        }
        @keyframes flex-burst {
          0% { transform: scale(0.2); opacity: 0.9; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes flex-pop {
          0% { transform: scale(0.6) translateY(20px); opacity: 0; }
          60% { transform: scale(1.05) translateY(0); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes flex-shine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .flex-anim { animation: none !important; }
          .flex-confetti-piece { display: none; }
        }
      `}</style>

      {PIECES.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="flex-anim flex-confetti-piece pointer-events-none absolute top-0"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              background: p.color,
              borderRadius: p.round ? "9999px" : "2px",
              animation: `flex-confetti ${p.duration}s cubic-bezier(.2,.6,.4,1) ${p.delay}s forwards`,
              transform: "translate3d(0,-10vh,0)",
              "--drift": `${p.drift}px`,
              "--spin": `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}

      <div
        aria-hidden
        className="flex-anim pointer-events-none absolute h-64 w-64 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(245,215,122,0.75), rgba(212,175,55,0.25) 45%, transparent 70%)",
          animation: "flex-burst 1.2s ease-out forwards",
        }}
      />

      <div
        className="flex-anim relative w-full max-w-sm rounded-3xl border border-gold/50 bg-surface p-6 text-center shadow-[0_0_80px_-10px_rgba(212,175,55,0.6)]"
        style={{ animation: "flex-pop 0.5s ease-out both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl">💸</div>
        <p className="mt-3 text-xs font-semibold tracking-[0.3em] text-gold uppercase">Flex secured</p>
        <p className="text-gold-gradient mt-1 text-4xl font-black tabular-nums">
          {formatMoney(amountCents)}
        </p>
        <p className="mt-1 text-sm text-muted">
          Lifetime total: <span className="text-foreground">{formatMoney(newTotalCents)}</span>
        </p>

        <p className="mt-5 text-2xl font-black text-foreground">
          You&apos;re now <span className="text-gold-gradient">#{rank}</span>
        </p>

        {tierChanged && (
          <p
            className="flex-anim mt-3 inline-block rounded-full border border-gold/60 px-4 py-1.5 text-sm font-bold text-background"
            style={{
              backgroundImage: "linear-gradient(90deg, #a8841f, #f5d77a, #d4af37, #f5d77a, #a8841f)",
              backgroundSize: "200% 100%",
              animation: "flex-shine 2.5s linear infinite",
            }}
          >
            Tier up! {newTierEmoji} {newTierName}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-semibold text-foreground hover:border-gold/50"
          >
            Flex again
          </button>
          <Link
            href="/feed"
            className="rounded-xl bg-gradient-to-r from-gold to-gold-bright px-4 py-3 text-sm font-bold text-background hover:brightness-110"
          >
            See the feed
          </Link>
        </div>
      </div>
    </div>
  );
}
