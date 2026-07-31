"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markOrderShippedAction } from "@/app/admin/(protected)/ops-actions";

/**
 * Record dispatch details and tell the customer.
 *
 * Shipping is the one status change that carries information with it, so it
 * gets a form rather than a dropdown entry. Setting the status first and
 * remembering to add tracking afterwards is how a customer ends up with a
 * "your order shipped" email and no way to find the parcel.
 *
 * Carrier is free text on purpose. A shop posts with whoever is cheapest that
 * week, and a fixed list would need a code change the first time they use
 * someone not on it. Known names get a tracking link in the email; unknown
 * ones still send the number.
 *
 * Both fields are required. These are parts costing thousands, and the carrier
 * plus number is what proves delivery if a customer disputes the charge. The
 * server enforces this too: the check here only saves a round trip.
 */
export function DispatchForm({
  orderId,
  alreadyShipped,
  carrier: initialCarrier,
  trackingNumber: initialTracking,
  shippedAt,
}: {
  orderId: string;
  alreadyShipped: boolean;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
}) {
  const router = useRouter();
  const [carrier, setCarrier] = useState(initialCarrier ?? "");
  const [tracking, setTracking] = useState(initialTracking ?? "");
  const [notify, setNotify] = useState(!alreadyShipped);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const input =
    "focus-ring w-full rounded border border-field bg-surface-2 px-3 py-2 text-sm placeholder:text-muted/50";

  // Both are required. These are parts costing thousands: without a carrier
  // and a number there is no proof of delivery, and no way to defend a
  // chargeback if the customer says it never arrived.
  const ready = carrier.trim().length > 0 && tracking.trim().length > 0;

  function submit() {
    setResult(null);
    setError(null);
    startTransition(async () => {
      const r = await markOrderShippedAction(orderId, {
        carrier,
        trackingNumber: tracking,
        notify,
      });

      if (!r.ok) {
        setError(r.error);
        return;
      }

      setResult(
        !r.firstTime
          ? "Tracking updated. No email sent."
          : r.emailed
            ? "Marked shipped and the customer has been emailed."
            : notify
              ? "Marked shipped, but the email did not send. Check that Resend is configured."
              : "Marked shipped. No email sent.",
      );
      router.refresh();
    });
  }

  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <h2 className="display text-base">{alreadyShipped ? "Dispatch" : "Mark as shipped"}</h2>

      {alreadyShipped && shippedAt && (
        <p className="mt-1 text-xs text-muted">Shipped {shippedAt}</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">Carrier</span>
          <input
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="UPS, USPS, FedEx…"
            required
            className={input}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">Tracking number</span>
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Required"
            required
            className={`${input} font-mono`}
          />
        </label>
      </div>

      <p className="mt-2 text-xs text-muted">
        Both are required. On parts at these prices the tracking is your proof of delivery
        if a customer ever disputes the charge.
      </p>

      {!alreadyShipped && (
        <label className="mt-3 flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-white"
          />
          <span className="text-xs text-muted">
            Email the customer that it&apos;s on its way. Known carriers get a tracking link;
            anything else shows the number.
          </span>
        </label>
      )}

      <button
        type="button"
        disabled={pending || !ready}
        onClick={submit}
        className="focus-ring mt-4 rounded bg-accent px-6 py-2.5 text-xs font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-40"
      >
        {pending ? "Saving…" : alreadyShipped ? "Update tracking" : "Mark shipped"}
      </button>

      {!ready && (
        <p className="mt-2 text-xs text-muted">
          Fill in the carrier and tracking number to continue.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-bad">
          {error}
        </p>
      )}

      {result && (
        <p role="status" className="mt-3 text-xs text-muted">
          {result}
        </p>
      )}
    </section>
  );
}
