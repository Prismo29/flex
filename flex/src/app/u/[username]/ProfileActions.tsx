"use client";

import Link from "next/link";
import { useState } from "react";
import FollowButton from "@/components/social/FollowButton";
import EditProfile from "./EditProfile";

type Props = {
  userId: number;
  username: string;
  isMe: boolean;
  loggedIn: boolean;
  following: boolean;
  followsYou: boolean;
  followers: number;
  followingCount: number;
  profile: { displayName: string; bio: string; color: string; mediaId: number | null };
};

/** Follow/edit buttons plus follower counts (which update when you follow). */
export default function ProfileActions(props: Props) {
  const [followers, setFollowers] = useState(props.followers);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <Link href={`/u/${props.username}/following`} className="hover:underline">
          <span className="font-bold text-foreground">{props.followingCount.toLocaleString("en-US")}</span>{" "}
          <span className="text-muted">Following</span>
        </Link>
        <Link href={`/u/${props.username}/followers`} className="hover:underline">
          <span className="font-bold text-foreground">{followers.toLocaleString("en-US")}</span>{" "}
          <span className="text-muted">{followers === 1 ? "Follower" : "Followers"}</span>
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {props.isMe ? (
          <>
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="rounded-full border border-border px-5 py-2 text-sm font-bold transition hover:border-gold/60"
            >
              Edit profile
            </button>
            <Link
              href="/store"
              className="rounded-full bg-gold px-5 py-2 text-sm font-bold text-black transition hover:bg-gold-bright"
            >
              💸 Flex more
            </Link>
          </>
        ) : (
          <>
            <FollowButton
              userId={props.userId}
              initialFollowing={props.following}
              loggedIn={props.loggedIn}
              size="md"
              onChange={(_, n) => setFollowers(n)}
            />
            {props.followsYou && (
              <span className="rounded-md bg-surface-2 px-2 py-1 text-xs text-muted">Follows you</span>
            )}
          </>
        )}
      </div>

      {editing && (
        <div className="mt-5 w-full text-left">
          <EditProfile {...props.profile} onDone={() => setEditing(false)} />
        </div>
      )}
    </>
  );
}
