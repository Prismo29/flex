"use server";

// Note: "use server" files may only export async functions (types are fine).
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { get, run } from "./db";
import { MAX_COMMENT_LENGTH, MAX_IMAGE_BYTES, MAX_POST_LENGTH } from "./format";
import * as social from "./social";
import type { CommentItem, FeedPage, FeedScope } from "./types";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function clean(text: unknown): string {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function imageFrom(formData: FormData, field: string): File | null {
  const f = formData.get(field);
  return f instanceof File && f.size > 0 ? f : null;
}

export async function createPostAction(formData: FormData): Promise<ActionResult<{ id: number }>> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Log in to post." };

  const body = clean(formData.get("body"));
  const image = imageFrom(formData, "image");
  if (!body && !image) return { ok: false, error: "Say something first." };
  if (body.length > MAX_POST_LENGTH) return { ok: false, error: `Keep it under ${MAX_POST_LENGTH} characters.` };

  let mediaId: number | null = null;
  if (image) {
    const saved = await social.saveMedia(me.id, image, MAX_IMAGE_BYTES, {
      width: Number(formData.get("width")),
      height: Number(formData.get("height")),
    });
    if ("error" in saved) return { ok: false, error: saved.error };
    mediaId = saved.id;
  }

  const id = await social.createPost(me.id, body, mediaId);
  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function deletePostAction(postId: number): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Log in first." };
  const post = await get<{ user_id: number; kind: string }>("SELECT user_id, kind FROM posts WHERE id = ?", [postId]);
  if (!post || Number(post.user_id) !== me.id) return { ok: false, error: "Not your post." };
  // Flexes are receipts: they stay on the record.
  if (post.kind !== "post") return { ok: false, error: "Flexes are forever." };
  await social.deletePostCascade(postId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleLikeAction(postId: number): Promise<ActionResult<{ liked: boolean; count: number }>> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Log in to give respect." };
  const res = await social.toggleLike(me.id, postId);
  return res ? { ok: true, ...res } : { ok: false, error: "Post not found." };
}

export async function toggleFollowAction(
  userId: number,
): Promise<ActionResult<{ following: boolean; followers: number }>> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Log in to follow." };
  const res = await social.toggleFollow(me.id, userId);
  return res ? { ok: true, ...res } : { ok: false, error: "Can't follow that user." };
}

export async function addCommentAction(
  postId: number,
  text: string,
): Promise<ActionResult<{ comment: CommentItem }>> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Log in to comment." };
  const body = clean(text);
  if (!body) return { ok: false, error: "Say something first." };
  if (body.length > MAX_COMMENT_LENGTH) return { ok: false, error: `Keep it under ${MAX_COMMENT_LENGTH} characters.` };
  const comment = await social.addComment(me.id, postId, body);
  return comment ? { ok: true, comment } : { ok: false, error: "Post not found." };
}

export async function deleteCommentAction(commentId: number): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Log in first." };
  const { changes } = await run("DELETE FROM comments WHERE id = ? AND user_id = ?", [commentId, me.id]);
  return changes ? { ok: true } : { ok: false, error: "Not your comment." };
}

export async function loadFeedAction(scope: FeedScope, cursor: string | null): Promise<FeedPage> {
  const me = await getCurrentUser();
  if (scope.kind === "following" && !me) return { posts: [], nextCursor: null };
  return social.getFeedPage(scope, me?.id ?? 0, cursor);
}

export async function markNotificationsReadAction(): Promise<void> {
  const me = await getCurrentUser();
  if (!me) return;
  await social.markAllRead(me.id);
  revalidatePath("/", "layout");
}

const MAX_NAME = 40;
const MAX_BIO = 160;

/** Update the logged-in user's display name, bio, avatar color and (optionally) profile photo. */
export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Log in first." };

  const rawName = String(formData.get("display_name") ?? "").trim().replace(/\s+/g, " ");
  const display_name = (rawName || me.username).slice(0, MAX_NAME);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, MAX_BIO);
  const rawColor = String(formData.get("avatar_color") ?? "");
  const avatar_color = /^#[0-9a-fA-F]{6}$/.test(rawColor) ? rawColor.toLowerCase() : me.avatar_color;

  let avatarMediaId = me.avatar_media_id;
  const photo = imageFrom(formData, "avatar");
  if (photo) {
    const saved = await social.saveMedia(me.id, photo, MAX_IMAGE_BYTES, { width: 0, height: 0 });
    if ("error" in saved) return { ok: false, error: saved.error };
    avatarMediaId = saved.id;
  } else if (formData.get("remove_avatar") === "1") {
    avatarMediaId = null;
  }

  await run(
    "UPDATE users SET display_name = ?, bio = ?, avatar_color = ?, avatar_media_id = ? WHERE id = ?",
    [display_name, bio, avatar_color, avatarMediaId, me.id],
  );
  if (me.avatar_media_id != null && me.avatar_media_id !== avatarMediaId) {
    await run("DELETE FROM media WHERE id = ? AND user_id = ?", [me.avatar_media_id, me.id]);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
