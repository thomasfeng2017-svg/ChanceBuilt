"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { placeOrderAction } from "@/app/actions";

function SubmitButton({ paymentsLive }: { paymentsLive: boolean }) {
  const { pending } = useFormStatus();
  const label = paymentsLive
    ? pending
      ? "Redirecting to payment…"
      : "Continue to payment"
    : pending
      ? "Placing order…"
      : "Place order";

  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring w-full rounded bg-accent px-6 py-3.5 text-sm font-bold tracking-wide text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export function CheckoutForm({ paymentsLive }: { paymentsLive: boolean }) {
  const [state, formAction] = useActionState(placeOrderAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="focus-ring w-full rounded-lg border border-field bg-surface-2 px-3.5 py-3 text-sm transition-colors placeholder:text-muted/60 hover:border-muted/40"
        />
        <p className="mt-1.5 text-xs text-muted">
          We&apos;ll send your order confirmation and tracking here.
        </p>
      </div>

      {state && !state.ok && (
        <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3.5 py-2.5 text-sm font-medium text-bad">
          {state.error}
        </p>
      )}

      <SubmitButton paymentsLive={paymentsLive} />

      {paymentsLive ? (
        <p className="text-center text-xs text-muted">
          You&apos;ll enter card details on Stripe&apos;s secure checkout. We never see your
          card number.
        </p>
      ) : (
        <p className="rounded border border-warn/25 bg-warn/10 px-3.5 py-2.5 text-center text-xs text-warn">
          Card payments are not switched on yet. This records your order and we&apos;ll contact
          you to take payment.
        </p>
      )}
    </form>
  );
}
