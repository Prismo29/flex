"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

type Item = { href: string; label: string; icon: IconName; badge?: number };

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  const p = pathname.toLowerCase();
  const h = href.toLowerCase();
  return p === h || p.startsWith(h + "/");
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1 min-w-[18px] rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-background">
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Left sidebar navigation (lg and up). */
export function SideNav({ username, unread }: { username: string | null; unread: number }) {
  const pathname = usePathname();
  const items: Item[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/explore", label: "Explore", icon: "search" },
    { href: "/leaderboard", label: "Leaderboard", icon: "trophy" },
    ...(username
      ? [
          { href: "/notifications", label: "Notifications", icon: "bell" as const, badge: unread },
          { href: `/u/${username}`, label: "Profile", icon: "user" as const },
        ]
      : []),
    { href: "/store", label: "Store", icon: "store" },
  ];

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-4 rounded-full px-4 py-3 text-[17px] transition hover:bg-surface-2 ${
              active ? "font-bold text-gold-bright" : "font-medium text-foreground"
            }`}
          >
            <span className="relative">
              <Icon name={item.icon} filled={active} className="h-6 w-6" />
              {item.badge != null && <Badge n={item.badge} />}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bell icon with unread count, for the mobile top bar. */
export function BellLink({ unread }: { unread: number }) {
  const pathname = usePathname();
  const active = isActive(pathname, "/notifications");
  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
      className={`relative rounded-full p-2 transition hover:bg-surface-2 ${active ? "text-gold-bright" : "text-foreground"}`}
    >
      <Icon name="bell" filled={active} className="h-6 w-6" />
      <Badge n={unread} />
    </Link>
  );
}

/** Fixed bottom tab bar for mobile (hidden at lg and up). */
export function MobileTabBar({ username }: { username: string | null }) {
  const pathname = usePathname();
  const left: Item[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/explore", label: "Explore", icon: "search" },
  ];
  const right: Item[] = [
    { href: "/leaderboard", label: "Ranks", icon: "trophy" },
    username
      ? { href: `/u/${username}`, label: "Profile", icon: "user" }
      : { href: "/login", label: "Log in", icon: "user" },
  ];

  const tab = (item: Item) => {
    const active = isActive(pathname, item.href);
    return (
      <li key={item.label}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
            active ? "text-gold-bright" : "text-muted active:text-foreground"
          }`}
        >
          <Icon name={item.icon} filled={active} className="h-6 w-6" />
          {item.label}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {left.map(tab)}
        <li className="flex items-center justify-center">
          <Link
            href="/store"
            aria-label="Flex money"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold-bright via-gold to-[#a8841f] text-2xl shadow-[0_4px_24px_rgba(212,175,55,0.55)] ring-4 ring-background transition active:scale-95"
          >
            <span aria-hidden>💸</span>
          </Link>
        </li>
        {right.map(tab)}
      </ul>
    </nav>
  );
}
