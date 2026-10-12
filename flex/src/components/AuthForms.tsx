"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthFormState } from "@/lib/auth-actions";

const initial: AuthFormState = {};

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  error,
  hint,
  autoComplete,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
  maxLength?: number;
}) {
  const id = `f-${name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-widest text-muted">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        maxLength={maxLength}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`block w-full rounded-xl border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted/60 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30 ${
          error ? "border-danger" : "border-border"
        }`}
      />
      {error ? (
        <p id={`${id}-err`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-gradient-to-br from-gold-bright via-gold to-[#a8841f] px-4 py-3 text-base font-bold text-black shadow-[0_4px_24px_rgba(212,175,55,0.25)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "One moment…" : children}
    </button>
  );
}

function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
      {error}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? "/"} />
      <FormError error={state.error} />
      <Field
        label="Username"
        name="username"
        autoComplete="username"
        maxLength={20}
        defaultValue={state.values?.username}
      />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <SubmitButton pending={pending}>Log in</SubmitButton>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-gold hover:text-gold-bright">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError error={state.error} />
      <Field
        label="Username"
        name="username"
        autoComplete="username"
        maxLength={20}
        defaultValue={state.values?.username}
        error={fe.username}
        hint="3–20 characters: letters, numbers, underscores."
      />
      <Field
        label="Display name"
        name="displayName"
        autoComplete="nickname"
        maxLength={40}
        defaultValue={state.values?.displayName}
        error={fe.displayName}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={fe.password}
        hint="At least 8 characters."
      />
      <SubmitButton pending={pending}>Create account</SubmitButton>
      <p className="text-center text-sm text-muted">
        Already flexing?{" "}
        <Link href="/login" className="font-semibold text-gold hover:text-gold-bright">
          Log in
        </Link>
      </p>
    </form>
  );
}
