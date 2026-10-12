"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

// Note: "use server" files may only export async functions (types are fine).
const MAX_POST_LENGTH = 280;

export type PostState = { ok: boolean; error?: string; id?: number };

export async function createPostAction(_prev: PostState, formData: FormData): Promise<PostState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to post." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Say something first." };
  if (body.length > MAX_POST_LENGTH) {
    return { ok: false, error: `Keep it under ${MAX_POST_LENGTH} characters.` };
  }

  getDb()
    .prepare("INSERT INTO posts (user_id, kind, body, amount_cents, created_at) VALUES (?, 'post', ?, NULL, ?)")
    .run(user.id, body, Date.now());

  revalidatePath("/feed");
  revalidatePath("/");
  revalidatePath(`/u/${user.username}`);
  return { ok: true, id: Date.now() };
}
