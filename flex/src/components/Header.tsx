import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/auth-actions";
import Avatar from "./Avatar";
import TierBadge from "./TierBadge";
import { DesktopNav, MobileTabBar } from "./NavLinks";

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 md:h-16">
          <Link
            href="/"
            className="text-gold-gradient text-2xl font-black tracking-[0.2em] md:text-[26px]"
            aria-label="FLEX home"
          >
            FLEX
          </Link>

          <DesktopNav />

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            {user ? (
              <>
                <Link
                  href={`/u/${user.username}`}
                  className="flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-1 transition hover:bg-surface-2 md:pr-3"
                >
                  <Avatar name={user.display_name} color={user.avatar_color} size={32} />
                  <span className="hidden min-w-0 flex-col leading-tight md:flex">
                    <span className="max-w-[12rem] truncate text-sm font-semibold text-foreground">
                      {user.display_name}
                    </span>
                  </span>
                  <span className="hidden md:inline-flex">
                    <TierBadge totalCents={user.total_spent_cents} />
                  </span>
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    aria-label="Log out"
                    title="Log out"
                    className="flex items-center rounded-lg p-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-foreground md:px-3"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 md:hidden"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
                    </svg>
                    <span className="hidden md:inline">Log out</span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:text-foreground"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-gradient-to-br from-gold-bright via-gold to-[#a8841f] px-3.5 py-2 text-sm font-bold text-black shadow-[0_2px_16px_rgba(212,175,55,0.3)] transition hover:brightness-110"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <MobileTabBar username={user?.username ?? null} />
    </>
  );
}
