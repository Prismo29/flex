import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Log in — FLEX" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/";

  if (await getCurrentUser()) redirect(next);

  return (
    <div className="mx-auto max-w-sm pt-6 md:pt-12">
      <div className="mb-8 text-center">
        <h1 className="text-gold-gradient text-4xl font-black tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Your rank missed you.</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_0_60px_-20px_rgba(212,175,55,0.25)] sm:p-6">
        <LoginForm next={next} />
      </div>
    </div>
  );
}
