"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCartLineAction, removeCartLineAction } from "@/app/actions";

export function CartLineControls({
  productId,
  quantity,
  stock,
}: {
  productId: string;
  quantity: number;
  stock: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const set = (next: number) =>
    startTransition(async () => {
      await updateCartLineAction(productId, next);
      router.refresh();
    });

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center rounded-lg border border-field bg-surface-2 ${
          pending ? "opacity-50" : ""
        }`}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={pending}
          onClick={() => set(quantity - 1)}
          className="focus-ring rounded-l-lg px-3 py-2 text-muted transition-colors hover:text-text"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums">{quantity}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={pending || quantity >= stock}
          onClick={() => set(quantity + 1)}
          className="focus-ring rounded-r-lg px-3 py-2 text-muted transition-colors hover:text-text disabled:opacity-40"
        >
          +
        </button>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await removeCartLineAction(productId);
            router.refresh();
          })
        }
        className="focus-ring rounded text-sm font-medium text-muted underline underline-offset-2 transition-colors hover:text-bad"
      >
        Remove
      </button>
    </div>
  );
}
