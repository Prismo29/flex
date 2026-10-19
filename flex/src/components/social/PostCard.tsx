"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent } from "react";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import TierBadge from "@/components/TierBadge";
import { compactNumber, timeAgo } from "@/lib/format";
import { deletePostAction, toggleLikeAction } from "@/lib/social-actions";
import { formatMoney } from "@/lib/tiers";
import type { FeedPost } from "@/lib/types";
import RichText from "./RichText";

type Props = {
  post: FeedPost;
  now: number;
  viewerId: number | null;
  /** On the post's own page: bigger text, no click-through. */
  detail?: boolean;
  onDeleted?: (id: number) => void;
};

export default function PostCard({ post, now, viewerId, detail = false, onDeleted }: Props) {
  const router = useRouter();
  const isFlex = post.kind === "purchase";
  const href = `/p/${post.id}`;
  const mine = viewerId === post.author.id;

  // Click anywhere on the card (except links/buttons) to open the post.
  function openPost(e: MouseEvent<HTMLElement>) {
    if (detail) return;
    if ((e.target as HTMLElement).closest("a,button,input,textarea,label")) return;
    if (window.getSelection()?.toString()) return;
    router.push(href);
  }

  return (
    <article
      onClick={openPost}
      className={`relative rounded-2xl border p-4 transition ${detail ? "" : "cursor-pointer"} ${
        isFlex
          ? "border-gold/50 bg-gradient-to-br from-[#221c0b] via-surface to-surface shadow-[0_0_35px_-14px_rgba(212,175,55,0.7)] hover:border-gold/80"
          : "border-border bg-surface hover:border-[#3a3a43]"
      }`}
    >
      <div className="flex gap-3">
        <Link href={`/u/${post.author.username}`} className="shrink-0" aria-label={post.author.display_name}>
          <Avatar
            name={post.author.display_name}
            color={post.author.avatar_color}
            mediaId={post.author.avatar_media_id}
            size={44}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
              <Link
                href={`/u/${post.author.username}`}
                className="truncate font-semibold text-foreground hover:text-gold-bright"
              >
                {post.author.display_name}
              </Link>
              <TierBadge totalCents={post.author.total_spent_cents} size="sm" />
              <span className="truncate text-xs text-muted">
                @{post.author.username} ·{" "}
                <Link href={href} className="hover:underline">
                  <time dateTime={new Date(post.created_at).toISOString()} title={new Date(post.created_at).toLocaleString()}>
                    {timeAgo(post.created_at, now)}
                  </time>
                </Link>
              </span>
            </div>
            {mine && !isFlex && <PostMenu postId={post.id} onDeleted={onDeleted} detail={detail} />}
          </div>

          {isFlex && post.amount_cents != null && (
            <p className={`mt-2 font-black tracking-tight ${detail ? "text-4xl" : "text-2xl sm:text-3xl"}`}>
              <span aria-hidden>💸 </span>
              <span className="text-foreground">flexed </span>
              <span className="text-gold-gradient tabular-nums">{formatMoney(post.amount_cents)}</span>
            </p>
          )}

          {post.body && (
            <RichText
              text={post.body}
              className={`mt-1 ${detail ? "text-lg" : "text-[15px]"} ${
                isFlex ? "text-gold-bright/90 italic" : "text-foreground"
              }`}
            />
          )}

          {post.media_id != null && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/m/${post.media_id}`}
              alt=""
              loading="lazy"
              className="mt-3 max-h-[32rem] w-full rounded-xl border border-border bg-surface-2 object-cover"
            />
          )}

          <PostActions post={post} viewerId={viewerId} href={href} />
        </div>
      </div>
    </article>
  );
}

function PostActions({ post, viewerId, href }: { post: FeedPost; viewerId: number | null; href: string }) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked);
  const [count, setCount] = useState(post.like_count);
  const [pop, setPop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  function respect() {
    if (!viewerId) {
      router.push(`/login?next=${encodeURIComponent(href)}`);
      return;
    }
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    if (next) {
      setPop(true);
      setTimeout(() => setPop(false), 450);
    }
    startTransition(async () => {
      const res = await toggleLikeAction(post.id);
      if (res.ok) {
        setLiked(res.liked);
        setCount(res.count);
      } else {
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  async function share() {
    const url = `${window.location.origin}${href}`;
    const text = post.kind === "purchase" && post.amount_cents
      ? `@${post.author.username} flexed ${formatMoney(post.amount_cents)} on FLEX`
      : `@${post.author.username} on FLEX`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "FLEX", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // user cancelled the share sheet
    }
  }

  return (
    <div className="-ml-2 mt-3 flex items-center gap-1 text-sm text-muted">
      <button
        type="button"
        onClick={respect}
        aria-pressed={liked}
        aria-label={liked ? "Take back respect" : "Give respect"}
        title="Respect"
        className={`group flex items-center gap-1.5 rounded-full px-2 py-1.5 transition hover:bg-gold/10 hover:text-gold-bright ${
          liked ? "text-gold-bright" : ""
        }`}
      >
        <span className={`inline-flex transition-transform ${pop ? "scale-125" : "scale-100"}`}>
          <Icon name="coin" filled={liked} className="h-5 w-5" />
        </span>
        <span className="min-w-[1ch] tabular-nums">{count > 0 ? compactNumber(count) : ""}</span>
      </button>
      <Link
        href={`${href}#comments`}
        aria-label={`${post.comment_count} comments`}
        className="flex items-center gap-1.5 rounded-full px-2 py-1.5 transition hover:bg-surface-2 hover:text-foreground"
      >
        <Icon name="comment" className="h-5 w-5" />
        <span className="min-w-[1ch] tabular-nums">{post.comment_count > 0 ? compactNumber(post.comment_count) : ""}</span>
      </Link>
      <button
        type="button"
        onClick={share}
        aria-label="Share"
        className="ml-auto flex items-center gap-1.5 rounded-full px-2 py-1.5 transition hover:bg-surface-2 hover:text-foreground"
      >
        <Icon name="share" className="h-5 w-5" />
        {copied && <span className="text-xs text-gold-bright">Link copied</span>}
      </button>
    </div>
  );
}

function PostMenu({ postId, onDeleted, detail }: { postId: number; onDeleted?: (id: number) => void; detail: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm("Delete this post? This can't be undone.")) return;
    startTransition(async () => {
      const res = await deletePostAction(postId);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      onDeleted?.(postId);
      if (detail) router.replace("/");
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Post options"
        aria-expanded={open}
        className="-mr-1.5 -mt-1 rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-foreground"
      >
        <Icon name="dots" />
      </button>
      {open && (
        <>
          <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-danger hover:bg-surface disabled:opacity-50"
            >
              <Icon name="trash" className="h-4 w-4" />
              {pending ? "Deleting…" : "Delete post"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
