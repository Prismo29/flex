"use client";

import { useState, useTransition, type FormEvent } from "react";
import Avatar from "@/components/Avatar";
import { createPostAction } from "./actions";

const MAX = 280;

export default function Composer({ name, color }: { name: string; color: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmed = body.trim();
  const remaining = MAX - body.length;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!trimmed || isPending) return;
    const fd = new FormData();
    fd.set("body", body);
    startTransition(async () => {
      const res = await createPostAction({ ok: false }, fd);
      if (res.ok) {
        setBody("");
        setError(null);
      } else {
        setError(res.error ?? "Could not post.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex gap-3">
        <div className="shrink-0">
          <Avatar name={name} color={color} size={40} />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="composer" className="sr-only">
            New post
          </label>
          <textarea
            id="composer"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
            }}
            maxLength={MAX}
            rows={3}
            placeholder="What are you flexing today?"
            className="w-full resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted/70 focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span
              className={`text-xs tabular-nums ${
                remaining <= 0 ? "text-danger" : remaining <= 20 ? "text-gold" : "text-muted"
              }`}
            >
              {remaining}
            </span>
            <button
              type="submit"
              disabled={!trimmed || isPending}
              className="rounded-full bg-gradient-to-r from-gold to-gold-bright px-5 py-2 text-sm font-bold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Posting…" : "Post"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
