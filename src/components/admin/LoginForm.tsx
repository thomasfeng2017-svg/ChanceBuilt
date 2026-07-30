"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/admin/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring w-full rounded bg-accent px-6 py-3.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, null);

  const inputClass =
    "focus-ring w-full rounded border border-line bg-surface-2 px-3.5 py-3 text-sm transition-colors placeholder:text-muted/60 hover:border-line-hi";

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className={inputClass}
          placeholder="you@chancebuilt.com"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
          placeholder="••••••••••"
        />
      </label>

      {state && !state.ok && (
        <p
          role="alert"
          className="rounded border border-bad/30 bg-bad/10 px-3.5 py-2.5 text-sm font-medium text-bad"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
