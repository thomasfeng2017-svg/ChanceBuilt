"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, registerAction, type AuthState } from "@/app/account/actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring w-full rounded bg-accent px-7 py-3.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
    >
      {pending ? "One moment…" : label}
    </button>
  );
}

const input =
  "focus-ring w-full rounded border border-line bg-surface-2 px-3.5 py-3 text-sm transition-colors placeholder:text-muted/50 hover:border-line-hi";
const label = "mb-1.5 block text-sm font-semibold";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(loginAction, null);

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <label className="block">
        <span className={label}>Email</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>

      <label className="block">
        <span className={label}>Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={input}
        />
      </label>

      {state && !state.ok && (
        <p role="alert" className="rounded border border-bad/30 bg-bad/10 px-4 py-3 text-sm font-medium text-bad">
          {state.error}
        </p>
      )}

      <Submit label="Sign in" />

      <p className="text-center text-sm text-muted">
        No account yet?{" "}
        <Link href="/account/register" className="focus-ring rounded font-semibold text-text underline underline-offset-2">
          Create one
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<AuthState, FormData>(registerAction, null);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className={label}>Name</span>
        <input name="name" required autoComplete="name" className={input} />
      </label>

      <label className="block">
        <span className={label}>Email</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
        <span className="mt-1 block text-xs text-muted">
          Use the address you order with and anything you&apos;ve already bought or
          booked shows up in your account.
        </span>
      </label>

      <label className="block">
        <span className={label}>
          Phone <span className="font-normal text-muted">(optional)</span>
        </span>
        <input name="phone" type="tel" autoComplete="tel" className={input} />
      </label>

      <label className="block">
        <span className={label}>Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
        />
        <span className="mt-1 block text-xs text-muted">At least 8 characters.</span>
      </label>

      {state && !state.ok && (
        <p role="alert" className="rounded border border-bad/30 bg-bad/10 px-4 py-3 text-sm font-medium text-bad">
          {state.error}
        </p>
      )}

      <Submit label="Create account" />

      <p className="text-center text-sm text-muted">
        Already have one?{" "}
        <Link href="/account/login" className="focus-ring rounded font-semibold text-text underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
