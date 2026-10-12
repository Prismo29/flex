"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "trophy" | "feed" | "store" | "user";

function Icon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "trophy":
      return (
        <svg {...common}>
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M17 6h2.5a1.5 1.5 0 0 1 1.5 1.5V8a4 4 0 0 1-4 4M7 6H4.5A1.5 1.5 0 0 0 3 7.5V8a4 4 0 0 0 4 4" />
        </svg>
      );
    case "feed":
      return (
        <svg {...common}>
          <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
          <path d="M7.5 9h9M7.5 12.5h9M7.5 16h5" />
        </svg>
      );
    case "store":
      return (
        <svg {...common}>
          <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" />
          <path d="M9 10V7a3 3 0 0 1 6 0v3" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="4" />
          <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        </svg>
      );
  }
}

const MAIN = [
  { href: "/", label: "Leaderboard", icon: "trophy" },
  { href: "/feed", label: "Feed", icon: "feed" },
  { href: "/store", label: "Store", icon: "store" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  const p = pathname.toLowerCase();
  const h = href.toLowerCase();
  return p === h || p.startsWith(h + "/");
}

/** Desktop inline nav links (hidden below md). */
export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {MAIN.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "text-gold-bright" : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
            {active && (
              <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-gradient-to-r from-gold-bright to-gold" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Fixed bottom tab bar for mobile (hidden at md and up). */
export function MobileTabBar({ username }: { username: string | null }) {
  const pathname = usePathname();
  const profile = username
    ? { href: `/u/${username}`, label: "Profile", icon: "user" as const }
    : { href: "/login", label: "Log in", icon: "user" as const };
  const items = [...MAIN, profile];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const active =
            isActive(pathname, item.href) ||
            (!username && item.href === "/login" && pathname === "/signup");
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                  active ? "text-gold-bright" : "text-muted active:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-gradient-to-r from-gold-bright to-gold shadow-[0_0_12px_rgba(245,215,122,0.8)]" />
                )}
                <Icon name={item.icon} className="h-6 w-6" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
