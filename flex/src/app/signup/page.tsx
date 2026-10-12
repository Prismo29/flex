import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Sign up — FLEX" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="mx-auto max-w-sm pt-6 md:pt-12">
      <div className="mb-8 text-center">
        <h1 className="text-gold-gradient text-4xl font-black tracking-tight">Join FLEX</h1>
        <p className="mt-2 text-sm text-muted">Put your money where your rank is.</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[0_0_60px_-20px_rgba(212,175,55,0.25)] sm:p-6">
        <SignupForm />
      </div>
    </div>
  );
}
