"use client";

import { useActionState, useRef, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  addShopModAction,
  removeShopModAction,
} from "@/app/admin/(protected)/customers/actions";

type State = { ok: false; error: string } | null;

export function ShopModForm({ vehicleId }: { vehicleId: string }) {
  const [state, action] = useActionState<State, FormData>(addShopModAction, null);
  const ref = useRef<HTMLFormElement>(null);

  const input =
    "focus-ring w-full rounded border border-line bg-surface-2 px-3 py-2 text-sm placeholder:text-muted/50 hover:border-line-hi";

  return (
    <form
      ref={ref}
      action={async (data) => {
        await action(data);
        ref.current?.reset();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />

      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
        <input name="name" required placeholder="What you fitted or did" className={input} />
        <input name="category" placeholder="Category" className={input} />
        <input name="installedAt" type="date" aria-label="Date" className={input} />
      </div>

      <input name="notes" placeholder="Notes (optional)" className={input} />

      {state && !state.ok && (
        <p role="alert" className="text-sm font-medium text-bad">
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring rounded border border-line-hi px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors hover:bg-accent hover:text-accent-fg disabled:opacity-40"
    >
      {pending ? "Adding…" : "Add to build sheet"}
    </button>
  );
}

export function RemoveShopMod({ modId, customerId }: { modId: string; customerId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Remove"
      onClick={() =>
        start(async () => {
          await removeShopModAction(modId, customerId);
          router.refresh();
        })
      }
      className="focus-ring rounded p-1 text-muted transition-colors hover:text-bad disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}
