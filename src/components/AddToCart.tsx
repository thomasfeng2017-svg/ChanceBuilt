"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/app/actions";

export function AddToCart({
  productId,
  stock,
  /** False when a vehicle is selected and this part does not fit it. */
  fits = true,
}: {
  productId: string;
  stock: number;
  fits?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmedMisfit, setConfirmedMisfit] = useState(false);

  const outOfStock = stock < 1;
  const blocked = !fits && !confirmedMisfit;

  function add() {
    setMessage(null);
    startTransition(async () => {
      const result = await addToCartAction(productId, quantity);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(
        result.cappedByStock
          ? `Only ${result.quantity} left, so we added that many to your cart.`
          : "Added to cart.",
      );
      router.refresh();
    });
  }

  if (outOfStock) {
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-lg border border-field bg-surface-2 px-6 py-3.5 text-sm font-bold tracking-wide text-muted uppercase"
      >
        Out of stock
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex items-center rounded-lg border border-field bg-surface-2">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="focus-ring rounded-l-lg px-3.5 py-3.5 text-muted transition-colors hover:text-text"
          >
            −
          </button>
          <span aria-live="polite" className="w-9 text-center text-sm font-bold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
            className="focus-ring rounded-r-lg px-3.5 py-3.5 text-muted transition-colors hover:text-text"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={add}
          disabled={pending || blocked}
          className="focus-ring flex-1 rounded-lg bg-accent px-6 py-3.5 text-sm font-bold tracking-wide text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Adding…" : "Add to cart"}
        </button>
      </div>

      {blocked && (
        <div className="rounded-lg border border-warn/35 bg-warn/10 p-3 text-sm">
          <p className="font-semibold text-warn">This part does not fit your vehicle.</p>
          <button
            type="button"
            onClick={() => setConfirmedMisfit(true)}
            className="focus-ring mt-1.5 rounded text-xs font-medium text-muted underline underline-offset-2 hover:text-text"
          >
            Add it anyway, I know what I&apos;m doing
          </button>
        </div>
      )}

      {message && (
        <p aria-live="polite" className="text-sm font-medium text-good">
          {message}
        </p>
      )}
    </div>
  );
}
