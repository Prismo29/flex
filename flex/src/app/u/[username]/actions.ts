"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { run } from "@/lib/db";

const MAX_NAME = 40;
const MAX_BIO = 160;

/** Update the logged-in user's display name, bio and avatar color. */
export async function updateProfile(formData: FormData): Promise<void> {
  const me = await getCurrentUser();
  if (!me) return;

  const rawName = String(formData.get("display_name") ?? "").trim().replace(/\s+/g, " ");
  const display_name = (rawName || me.username).slice(0, MAX_NAME);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, MAX_BIO);
  const rawColor = String(formData.get("avatar_color") ?? "");
  const avatar_color = /^#[0-9a-fA-F]{6}$/.test(rawColor) ? rawColor.toLowerCase() : me.avatar_color;

  await run("UPDATE users SET display_name = ?, bio = ?, avatar_color = ? WHERE id = ?", [
    display_name,
    bio,
    avatar_color,
    me.id,
  ]);

  revalidatePath(`/u/${me.username}`);
  revalidatePath("/");
}
