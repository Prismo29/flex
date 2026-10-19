import Link from "next/link";
import Avatar from "@/components/Avatar";
import TierBadge from "@/components/TierBadge";
import { formatMoney } from "@/lib/tiers";
import type { UserCard } from "@/lib/types";
import FollowButton from "./FollowButton";

type Props = {
  users: UserCard[];
  viewerId: number | null;
  compact?: boolean;
  empty?: string;
};

/** Rows of users with a follow button. */
export default function UserList({ users, viewerId, compact = false, empty = "Nobody here yet." }: Props) {
  if (users.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-muted">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {users.map((u) => (
        <li key={u.id} className={`flex items-center gap-3 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
          <Link href={`/u/${u.username}`} className="shrink-0">
            <Avatar name={u.display_name} color={u.avatar_color} mediaId={u.avatar_media_id} size={compact ? 38 : 44} />
          </Link>
          <Link href={`/u/${u.username}`} className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold hover:text-gold-bright">{u.display_name}</span>
              {!compact && <TierBadge totalCents={u.total_spent_cents} size="sm" />}
            </span>
            <span className="block truncate text-xs text-muted">
              @{u.username}
              {u.total_spent_cents > 0 && <> · <span className="text-gold">{formatMoney(u.total_spent_cents)}</span></>}
            </span>
            {!compact && u.bio && <span className="mt-0.5 line-clamp-2 block text-sm text-foreground/80">{u.bio}</span>}
          </Link>
          {viewerId !== u.id && (
            <FollowButton userId={u.id} initialFollowing={u.is_following} loggedIn={viewerId != null} />
          )}
        </li>
      ))}
    </ul>
  );
}
