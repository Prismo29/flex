import type { Metadata } from "next";
import Icon from "@/components/Icon";
import PostCard from "@/components/social/PostCard";
import UserList from "@/components/social/UserList";
import { getCurrentUser } from "@/lib/auth";
import { getSuggestedUsers, getTopFlexes, getTrendingPosts, searchUsers } from "@/lib/social";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Explore · FLEX" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 40) ?? "";
  const me = await getCurrentUser();
  const viewerId = me?.id ?? 0;
  const now = Date.now();

  return (
    <div className="space-y-6">
      <form action="/explore" role="search" className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-xl lg:top-0 lg:mx-0 lg:px-0">
        <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-3 text-muted focus-within:border-gold">
          <Icon name="search" className="h-5 w-5" />
          <span className="sr-only">Search people</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search people"
            autoComplete="off"
            className="w-full bg-transparent text-[16px] text-foreground placeholder:text-muted focus:outline-none"
          />
        </label>
      </form>

      {q ? <SearchResults q={q} viewerId={me?.id ?? null} /> : <Discover viewerId={viewerId} loggedIn={!!me} now={now} />}
    </div>
  );
}

async function SearchResults({ q, viewerId }: { q: string; viewerId: number | null }) {
  const users = await searchUsers(q, viewerId ?? 0);
  return (
    <section>
      <h2 className="mb-2 text-sm text-muted">
        People matching <span className="font-semibold text-foreground">&ldquo;{q}&rdquo;</span>
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <UserList users={users} viewerId={viewerId} empty="No one by that name. Yet." />
      </div>
    </section>
  );
}

async function Discover({ viewerId, loggedIn, now }: { viewerId: number; loggedIn: boolean; now: number }) {
  const [flexes, trending, suggested] = await Promise.all([
    getTopFlexes(viewerId, 7, 5),
    getTrendingPosts(viewerId, 3, 5),
    getSuggestedUsers(viewerId, 6),
  ]);
  const me = loggedIn ? viewerId : null;

  return (
    <>
      <Section title="💸 Biggest flexes this week">
        {flexes.length === 0 ? (
          <Empty text="No flexes this week. Somebody has to go first." />
        ) : (
          <div className="space-y-3">
            {flexes.map((p) => (
              <PostCard key={p.id} post={p} now={now} viewerId={me} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Who to follow">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <UserList users={suggested} viewerId={me} empty="You follow everyone. Respect." />
        </div>
      </Section>

      <Section title="🔥 Trending">
        {trending.length === 0 ? (
          <Empty text="Nothing trending yet. Go give some respect." />
        ) : (
          <div className="space-y-3">
            {trending.map((p) => (
              <PostCard key={p.id} post={p} now={now} viewerId={me} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">{text}</p>;
}
