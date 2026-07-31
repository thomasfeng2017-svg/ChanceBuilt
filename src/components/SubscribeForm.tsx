"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { subscribeAction } from "@/app/actions";

function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring shrink-0 rounded bg-accent px-5 py-2.5 text-xs font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
    >
      {pending ? "…" : "Notify me"}
    </button>
  );
}

/**
 * Mailing list signup.
 *
 * The label is about the parts landing rather than "subscribe to our
 * newsletter", because that is the thing people actually want right now and it
 * is a far stronger ask while the catalog is still filling out.
 *
 * The success message is the same whether the address was new or already on
 * the list. Saying "you are already subscribed" turns the form into a way to
 * test whether a given person is on it.
 */
export function SubscribeForm({ source = "footer" }: { source?: string }) {
  const [state, formAction] = useActionState(subscribeAction, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="source" value={source} />

      <div className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Email address</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="focus-ring w-full rounded border border-field bg-surface-2 px-3 py-2.5 text-sm placeholder:text-muted/60"
          />
        </label>
        <Button />
      </div>

      {state?.ok && (
        <p role="status" className="mt-2 text-xs text-good">
          You&apos;re on the list. We&apos;ll email when parts land.
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" className="mt-2 text-xs text-bad">
          {state.error}
        </p>
      )}
    </form>
  );
}
