// Small formatting helpers shared by server and client code.

/** "now", "3m", "5h", "2d", then a short date. Pass `now` from the server to avoid hydration drift. */
export function timeAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 45) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const date = new Date(ms);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** 999, 1.2K, 3.4M */
export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  return n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

export const MENTION_RE = /@([A-Za-z0-9_]{3,20})\b/g;

/** Unique, lower-cased usernames mentioned in text. */
export function extractMentions(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) out.add(m[1].toLowerCase());
  return [...out].slice(0, 10);
}

export const MAX_POST_LENGTH = 280;
export const MAX_COMMENT_LENGTH = 280;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Route param -> username (tolerates bad percent-encoding). */
export function decodeUsername(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
