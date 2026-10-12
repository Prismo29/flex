"use client";

import { useEffect } from "react";
import { formatMoney } from "@/lib/tiers";

type Props = {
  amountCents: number;
  label: string;
  message: string;
  pending: boolean;
  error: string | null;
  action: (formData: FormData) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export default function CheckoutSheet({
  amountCents,
  label,
  message,
  pending,
  error,
  action,
  onSubmit,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />

        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-center text-xs font-bold tracking-wider text-amber-300 uppercase">
          🧪 Test mode — no real money is charged
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-widest text-muted uppercase">Checkout</p>
            <h2 id="checkout-title" className="text-lg font-bold text-foreground">
              {label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close checkout"
            className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <p className="text-gold-gradient mt-2 text-5xl font-black tabular-nums">{formatMoney(amountCents)}</p>

        <div className="mt-3 rounded-xl bg-background/60 px-3 py-2 text-sm">
          <span className="text-muted">Feed message: </span>
          <span className="text-foreground">{message.trim() || "just flexed"}</span>
        </div>

        <form action={action} onSubmit={onSubmit} className="mt-5">
          <input type="hidden" name="amount_cents" value={amountCents} />
          <input type="hidden" name="message" value={message} />

          {/* A fake card that IS the confirm button. No card details are collected. */}
          <button
            type="submit"
            disabled={pending}
            className="group relative block aspect-[1.75/1] w-full overflow-hidden rounded-2xl border border-gold/50 p-5 text-left shadow-[0_10px_40px_-10px_rgba(212,175,55,0.6)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_50px_-8px_rgba(212,175,55,0.8)] active:translate-y-0 disabled:cursor-wait disabled:opacity-80"
            style={{
              background:
                "linear-gradient(135deg, #1a1608 0%, #3a2f0e 35%, #8a6d1c 70%, #d4af37 100%)",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            <span className="flex items-center justify-between">
              <span className="text-sm font-black tracking-[0.35em] text-gold-bright">FLEX</span>
              <span className="text-[10px] font-semibold tracking-widest text-gold-bright/70 uppercase">
                Test card
              </span>
            </span>
            <span
              aria-hidden
              className="mt-4 block h-7 w-10 rounded-md bg-gradient-to-br from-gold-bright to-[#a8841f] opacity-90"
            />
            <span className="mt-3 block font-mono text-sm tracking-[0.2em] text-foreground/70">
              •••• •••• •••• FLEX
            </span>
            <span className="absolute right-5 bottom-4 left-5 flex items-end justify-between">
              <span className="text-[10px] tracking-widest text-foreground/60 uppercase">Simulated payment</span>
              <span className="rounded-lg bg-background/70 px-3 py-1.5 text-sm font-bold text-gold-bright">
                {pending ? "Flexing…" : `Tap to pay ${formatMoney(amountCents)}`}
              </span>
            </span>
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 text-center text-sm text-danger">
            {error}
          </p>
        )}

        <p className="mt-3 text-center text-[11px] text-muted">
          This is a demo. No card details are collected and nothing is charged.
        </p>
      </div>
    </div>
  );
}
