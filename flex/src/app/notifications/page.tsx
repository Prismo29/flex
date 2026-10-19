import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications } from "@/lib/social";
import NotificationList from "./NotificationList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Notifications · FLEX" };

export default async function NotificationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/notifications");
  const items = await getNotifications(me.id);

  return (
    <div className="space-y-4">
      <h1 className="pt-1 text-2xl font-black tracking-tight">Notifications</h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-4xl" aria-hidden>
            🔔
          </p>
          <p className="mt-3 font-semibold">Nothing yet</p>
          <p className="mt-1 text-sm text-muted">Post something, follow people, or flex — the attention will come.</p>
          <Link href="/explore" className="mt-5 inline-block text-sm font-semibold text-gold hover:text-gold-bright">
            Find people to follow →
          </Link>
        </div>
      ) : (
        <NotificationList items={items} now={Date.now()} />
      )}
    </div>
  );
}
