"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  requestResetAction,
  resetPasswordAction,
  changePasswordAction,
  type NoticeState,
} from "@/app/account/actions";

const input =
  "focus-ring w-full rounded border border-line bg-surface-2 px-3.5 py-3 text-sm transition-colors placeholder:text-muted/50 hover:border-line-hi";
const label = "mb-1.5 block text-sm font-semibold";

function Submit({ label: text, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring w-full rounded bg-accent px-7 py-3.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
    >
      {pending ? busy : text}
    </button>
  );
}

function Notice({ state }: { state: NoticeState }) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`rounded border px-4 py-3 text-sm font-medium ${
        state.ok
          ? "border-good/30 bg-good/10 text-good"
          : "border-bad/30 bg-bad/10 text-bad"
      }`}
    >
      {state.message}
    </p>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState<NoticeState, FormData>(requestResetAction, null);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className={label}>Email</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>

      <Notice state={state} />
      <Submit label="Send reset link" busy="Sending…" />

      <p className="text-center text-sm text-muted">
        <Link
          href="/account/login"
          className="focus-ring rounded font-semibold text-text underline underline-offset-2"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<NoticeState, FormData>(resetPasswordAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <label className="block">
        <span className={label}>New password</span>
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

      <label className="block">
        <span className={label}>Confirm new password</span>
        <input
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className={input}
        />
      </label>

      <Notice state={state} />
      <Submit label="Set new password" busy="Saving…" />

      <p className="text-center text-xs text-muted">
        Setting a new password signs you out everywhere else.
      </p>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState<NoticeState, FormData>(changePasswordAction, null);

  return (
    <form action={action} className="max-w-sm space-y-3">
      <label className="block">
        <span className={label}>Current password</span>
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          className={input}
        />
      </label>

      <label className="block">
        <span className={label}>New password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
        />
      </label>

      <label className="block">
        <span className={label}>Confirm new password</span>
        <input
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className={input}
        />
      </label>

      <Notice state={state} />

      <button
        type="submit"
        className="focus-ring rounded border border-line-hi px-5 py-2.5 text-sm font-bold tracking-widest uppercase transition-colors hover:bg-surface-2"
      >
        Change password
      </button>
      <p className="text-xs text-muted">
        You&apos;ll be signed out and asked to sign in with the new one.
      </p>
    </form>
  );
}
