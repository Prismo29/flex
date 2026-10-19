import Link from "next/link";
import { notFound } from "next/navigation";
import BackBar from "@/components/BackBar";
import UserList from "@/components/social/UserList";
import { getCurrentUser } from "@/lib/auth";
import { decodeUsername } from "@/lib/format";
import { getUserByUsername } from "@/lib/queries";
import { getFollowList } from "@/lib/social";

/** Shared body for /u/[username]/followers and /u/[username]/following. */
export default async function FollowListPage({
  rawUsername,
  which,
}: {
  rawUsername: string;
  which: "followers" | "following";
}) {
  const user = await getUserByUsername(decodeUsername(rawUsername));
  if (!user) notFound();
  const me = await getCurrentUser();
  const users = await getFollowList(user.id, which, me?.id ?? 0);

  return (
    <div className="space-y-4">
      <BackBar href={`/u/${user.username}`} title={user.display_name} sub={`@${user.username}`} />
      <nav className="grid grid-cols-2 border-b border-border">
        {(["following", "followers"] as const).map((w) => (
          <Link
            key={w}
            href={`/u/${user.username}/${w}`}
            replace
            aria-current={w === which ? "page" : undefined}
            className={`relative py-3 text-center text-sm font-semibold capitalize ${
              w === which ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {w}
            {w === which && (
              <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-gradient-to-r from-gold-bright to-gold" />
            )}
          </Link>
        ))}
      </nav>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <UserList
          users={users}
          viewerId={me?.id ?? null}
          empty={which === "followers" ? "No followers yet." : "Not following anyone yet."}
        />
      </div>
    </div>
  );
}
