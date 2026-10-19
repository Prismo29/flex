"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import TierBadge from "@/components/TierBadge";
import { MAX_COMMENT_LENGTH, timeAgo } from "@/lib/format";
import { addCommentAction, deleteCommentAction } from "@/lib/social-actions";
import type { Author, CommentItem } from "@/lib/types";
import RichText from "./RichText";

type Props = {
  postId: number;
  initial: CommentItem[];
  now: number;
  me: Author | null;
};

export default function Comments({ postId, initial, now, me }: Props) {
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim() || pending) return;
    startTransition(async () => {
      const res = await addCommentAction(postId, body);
      if (res.ok) {
        setComments((c) => [...c, res.comment]);
        setBody("");
        setError(null);
      } else {
        setError(res.error);
      }
    });
  }

  function remove(id: number) {
    if (!confirm("Delete this comment?")) return;
    setComments((c) => c.filter((x) => x.id !== id));
    startTransition(async () => {
      await deleteCommentAction(id);
    });
  }

  return (
    <section id="comments" className="scroll-mt-20">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted">
        Comments {comments.length > 0 && <span className="text-foreground">{comments.length}</span>}
      </h2>

      {me ? (
        <form onSubmit={submit} className="mb-4 flex gap-3 rounded-2xl border border-border bg-surface p-3">
          <Avatar name={me.display_name} color={me.avatar_color} mediaId={me.avatar_media_id} size={36} />
          <div className="min-w-0 flex-1">
            <label htmlFor="comment" className="sr-only">
              Write a comment
            </label>
            <textarea
              id="comment"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              placeholder="Talk your talk…"
              className="w-full resize-none bg-transparent py-1.5 text-[16px] placeholder:text-muted/70 focus:outline-none"
            />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={!body.trim() || pending}
            className="self-end rounded-full bg-gold px-4 py-1.5 text-sm font-bold text-black transition hover:bg-gold-bright disabled:opacity-40"
          >
            Reply
          </button>
        </form>
      ) : (
        <p className="mb-4 rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
          <Link href={`/login?next=/p/${postId}`} className="font-semibold text-gold hover:text-gold-bright">
            Log in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No comments yet. Say something.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 px-4 py-3">
              <Link href={`/u/${c.author.username}`} className="shrink-0">
                <Avatar name={c.author.display_name} color={c.author.avatar_color} mediaId={c.author.avatar_media_id} size={36} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <Link href={`/u/${c.author.username}`} className="truncate text-sm font-semibold hover:text-gold-bright">
                    {c.author.display_name}
                  </Link>
                  <TierBadge totalCents={c.author.total_spent_cents} size="sm" />
                  <span className="text-xs text-muted">{timeAgo(c.created_at, now)}</span>
                  {me?.id === c.author.id && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      aria-label="Delete comment"
                      className="ml-auto rounded-full p-1 text-muted hover:bg-surface-2 hover:text-danger"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <RichText text={c.body} className="mt-0.5 text-[15px]" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
