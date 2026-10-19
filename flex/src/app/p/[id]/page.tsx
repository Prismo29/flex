import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BackBar from "@/components/BackBar";
import Comments from "@/components/social/Comments";
import PostCard from "@/components/social/PostCard";
import { getCurrentUser } from "@/lib/auth";
import { getComments, getPost } from "@/lib/social";
import { formatMoney } from "@/lib/tiers";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const post = id ? await getPost(id, 0) : null;
  if (!post) return { title: "Post not found — FLEX" };
  const who = `${post.author.display_name} (@${post.author.username})`;
  const title =
    post.kind === "purchase" && post.amount_cents
      ? `${who} flexed ${formatMoney(post.amount_cents)}`
      : `${who} on FLEX`;
  return { title: `${title} — FLEX`, description: post.body.slice(0, 160) };
}

export default async function PostPage({ params }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const me = await getCurrentUser();
  const [post, comments] = await Promise.all([getPost(id, me?.id ?? 0), getComments(id)]);
  if (!post) notFound();
  const now = Date.now();

  return (
    <div className="space-y-5">
      <BackBar title={post.kind === "purchase" ? "Flex" : "Post"} />
      <PostCard post={post} now={now} viewerId={me?.id ?? null} detail />
      <Comments
        postId={post.id}
        initial={comments}
        now={now}
        me={
          me && {
            id: me.id,
            username: me.username,
            display_name: me.display_name,
            avatar_color: me.avatar_color,
            avatar_media_id: me.avatar_media_id,
            total_spent_cents: me.total_spent_cents,
          }
        }
      />
    </div>
  );
}
