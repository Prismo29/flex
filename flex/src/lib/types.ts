// Shapes shared by server queries and client components (no server-only imports here).

export type Author = {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_media_id: number | null;
  total_spent_cents: number;
};

export type FeedPost = {
  id: number;
  kind: "post" | "purchase";
  body: string;
  amount_cents: number | null;
  created_at: number;
  media_id: number | null;
  author: Author;
  like_count: number;
  comment_count: number;
  liked: boolean;
};

export type CommentItem = {
  id: number;
  post_id: number;
  body: string;
  created_at: number;
  author: Author;
};

/** Which posts a feed list shows. */
export type FeedScope =
  | { kind: "all" }
  | { kind: "following" }
  | { kind: "user"; userId: number; only?: "post" | "purchase" };

export type FeedPage = { posts: FeedPost[]; nextCursor: string | null };

export type UserCard = Author & {
  bio: string;
  is_following: boolean;
  follower_count: number;
};

export type NotificationType = "like" | "comment" | "follow" | "mention" | "overtaken" | "flex";

export type NotificationItem = {
  id: number;
  type: NotificationType;
  created_at: number;
  read: boolean;
  amount_cents: number | null;
  actor: Author;
  post: { id: number; kind: "post" | "purchase"; body: string; amount_cents: number | null } | null;
};
