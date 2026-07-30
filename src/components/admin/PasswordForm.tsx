"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changeOwnPasswordAction } from "@/app/admin/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring rounded bg-accent px-6 py-2.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
    >
      {pending ? "Saving…" : "Change password"}
    </button>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState(changeOwnPasswordAction, null);

  const input =
    "focus-ring w-full rounded border border-line bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-muted/50 hover:border-line-hi";

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Current password</span>
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          className={input}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">New password</span>
        <input
          name="next"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className={input}
        />
        <span className="mt-1 block text-xs text-muted">At least 10 characters.</span>
      </label>

      {state && !state.ok && (
        <p
          role="alert"
          className="rounded border border-bad/30 bg-bad/10 px-3.5 py-2.5 text-sm font-medium text-bad"
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded border border-good/30 bg-good/10 px-3.5 py-2.5 text-sm font-medium text-good">
          Password changed.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
