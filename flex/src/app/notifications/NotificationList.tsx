"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { timeAgo } from "@/lib/format";
import { markNotificationsReadAction } from "@/lib/social-actions";
import { formatMoney } from "@/lib/tiers";
import type { NotificationItem } from "@/lib/types";

const ICON: Record<NotificationItem["type"], string> = {
  like: "🪙",
  comment: "💬",
  follow: "👤",
  mention: "📣",
  overtaken: "⚔️",
  flex: "💸",
};

function describe(n: NotificationItem) {
  const money = n.amount_cents != null ? formatMoney(n.amount_cents) : "";
  switch (n.type) {
    case "like":
      return n.post?.kind === "purchase" ? "respected your flex" : "respected your post";
    case "comment":
      return "commented on your post";
    case "follow":
      return "followed you";
    case "mention":
      return "mentioned you";
    case "overtaken":
      return (
        <>
          just passed you on the leaderboard with a <span className="font-bold text-gold-bright">{money}</span> flex.{" "}
          <span className="font-semibold text-foreground">Take it back?</span>
        </>
      );
    case "flex":
      return (
        <>
          just flexed <span className="font-bold text-gold-bright">{money}</span>
        </>
      );
  }
}

function hrefFor(n: NotificationItem): string {
  if (n.type === "overtaken") return "/store";
  if (n.post) return `/p/${n.post.id}`;
  return `/u/${n.actor.username}`;
}

export default function NotificationList({ items, now }: { items: NotificationItem[]; now: number }) {
  // Remember what was unread when the page opened, so highlights survive marking them read.
  const [unread] = useState(() => new Set(items.filter((n) => !n.read).map((n) => n.id)));

  useEffect(() => {
    if (unread.size > 0) void markNotificationsReadAction();
  }, [unread]);

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map((n) => {
        const isNew = unread.has(n.id);
        return (
          <li key={n.id}>
            <Link
              href={hrefFor(n)}
              className={`flex gap-3 px-4 py-3.5 transition hover:bg-surface-2 ${
                isNew ? "bg-gold/[0.06]" : ""
              } ${n.type === "overtaken" ? "border-l-2 border-danger" : ""}`}
            >
              <span className="relative shrink-0">
                <Avatar name={n.actor.display_name} color={n.actor.avatar_color} mediaId={n.actor.avatar_media_id} size={40} />
                <span aria-hidden className="absolute -bottom-1 -right-1 text-base drop-shadow">
                  {ICON[n.type]}
                </span>
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="text-muted">
                  <span className="font-semibold text-foreground">{n.actor.display_name}</span> {describe(n)}
                  {" · "}
                  {timeAgo(n.created_at, now)}
                </span>
                {n.post?.body && n.type !== "overtaken" && n.type !== "flex" && (
                  <span className="mt-1 line-clamp-2 block text-foreground/80">{n.post.body}</span>
                )}
              </span>
              {isNew && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="New" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
