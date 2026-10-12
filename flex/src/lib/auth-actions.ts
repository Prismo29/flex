"use server";

import { redirect } from "next/navigation";
import { getDb } from "./db";
import { endSession, hashPassword, startSession, verifyPassword } from "./auth";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"username" | "displayName" | "password", string>>;
  values?: { username?: string; displayName?: string };
};

const AVATAR_COLORS = [
  "#d4af37", // gold
  "#f5d77a", // champagne
  "#c9a227", // antique gold
  "#e0115f", // ruby
  "#0f9d58", // emerald
  "#2962ff", // sapphire
  "#9966cc", // amethyst
  "#40e0d0", // turquoise
  "#ff8c42", // topaz
  "#b76e79", // rose gold
];

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

/** Only allow same-origin relative paths like "/store" (not "//evil.com" or "/\evil.com"). */
function safeNext(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const values = { username, displayName };

  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (!USERNAME_RE.test(username)) {
    fieldErrors.username = "3–20 characters: letters, numbers or underscores.";
  }
  if (displayName.length < 1 || displayName.length > 40) {
    fieldErrors.displayName = "Display name must be 1–40 characters.";
  }
  if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const db = getDb();
  const taken = db.prepare("SELECT 1 FROM users WHERE username = ? COLLATE NOCASE").get(username);
  if (taken) return { fieldErrors: { username: "That username is taken." }, values };

  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  let userId: number;
  try {
    const result = db
      .prepare(
        `INSERT INTO users (username, password_hash, display_name, avatar_color, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(username, hashPassword(password), displayName, color, Date.now());
    userId = Number(result.lastInsertRowid);
  } catch {
    // Most likely a race on the UNIQUE username constraint.
    return { fieldErrors: { username: "That username is taken." }, values };
  }

  await startSession(userId);
  redirect("/");
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  const values = { username };

  if (!username || !password) {
    return { error: "Enter your username and password.", values };
  }

  const row = getDb()
    .prepare("SELECT id, password_hash FROM users WHERE username = ? COLLATE NOCASE")
    .get(username) as { id: number; password_hash: string } | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    return { error: "Wrong username or password.", values };
  }

  await startSession(row.id);
  redirect(next);
}

/** Use as `<form action={logout}>`. */
export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}
