"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { loadFeedAction } from "@/lib/social-actions";
import type { FeedPage, FeedPost, FeedScope } from "@/lib/types";
import PostCard from "./PostCard";

type Props = {
  scope: FeedScope;
  initial: FeedPage;
  now: number;
  viewerId: number | null;
  empty: ReactNode;
};

/** A feed with infinite scroll. The first page comes from the server; later pages load on scroll. */
export default function FeedList({ scope, initial, now, viewerId, empty }: Props) {
  const [extra, setExtra] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [deleted, setDeleted] = useState<Set<number>>(() => new Set());
  const sentinel = useRef<HTMLDivElement>(null);

  // When the server re-renders (new post, refresh), start over from the fresh first page.
  const [firstPage, setFirstPage] = useState(initial);
  if (firstPage !== initial) {
    setFirstPage(initial);
    setExtra([]);
    setCursor(initial.nextCursor);
  }

  const seen = new Set(initial.posts.map((p) => p.id));
  const posts = [...initial.posts, ...extra.filter((p) => !seen.has(p.id))].filter((p) => !deleted.has(p.id));

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || loading || failed) return;
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setLoading(true);
        try {
          const page = await loadFeedAction(scope, cursor);
          setExtra((prev) => [...prev, ...page.posts]);
          setCursor(page.nextCursor);
        } catch {
          setFailed(true);
        } finally {
          setLoading(false);
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loading, failed, scope]);

  if (posts.length === 0) return <>{empty}</>;

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          now={now}
          viewerId={viewerId}
          onDeleted={(id) => setDeleted((s) => new Set(s).add(id))}
        />
      ))}
      <div ref={sentinel} className="flex h-16 items-center justify-center text-sm text-muted">
        {loading && <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />}
        {failed && (
          <button type="button" onClick={() => setFailed(false)} className="font-semibold text-gold hover:text-gold-bright">
            Couldn&apos;t load more. Retry
          </button>
        )}
        {!cursor && !loading && posts.length > 5 && <span>You&apos;re all caught up 👑</span>}
      </div>
    </div>
  );
}
