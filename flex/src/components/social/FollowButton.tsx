"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/lib/social-actions";

type Props = {
  userId: number;
  initialFollowing: boolean;
  loggedIn: boolean;
  size?: "sm" | "md";
  onChange?: (following: boolean, followers: number) => void;
};

export default function FollowButton({ userId, initialFollowing, loggedIn, size = "sm", onChange }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [hover, setHover] = useState(false);
  const [pending, startTransition] = useTransition();

  function click() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      const res = await toggleFollowAction(userId);
      if (res.ok) {
        setFollowing(res.following);
        onChange?.(res.following, res.followers);
      } else {
        setFollowing(!next);
      }
    });
  }

  const sizing = size === "md" ? "px-5 py-2 text-sm" : "px-3.5 py-1.5 text-xs";
  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-pressed={following}
      className={`shrink-0 rounded-full font-bold transition disabled:opacity-70 ${sizing} ${
        following
          ? "border border-border bg-transparent text-foreground hover:border-danger/60 hover:text-danger"
          : "bg-foreground text-background hover:bg-gold-bright"
      }`}
    >
      {following ? (hover ? "Unfollow" : "Following") : "Follow"}
    </button>
  );
}
