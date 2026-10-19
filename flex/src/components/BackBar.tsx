import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "./Icon";

/** Page title row with a back arrow. */
export default function BackBar({ href = "/", title, sub }: { href?: string; title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <Link href={href} aria-label="Back" className="-ml-2 rounded-full p-2 transition hover:bg-surface-2">
        <Icon name="back" />
      </Link>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold">{title}</h1>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}
