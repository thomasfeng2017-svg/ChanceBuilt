"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  logoutAction,
  selectVehicleAction,
  removeVehicleAction,
  removeModAction,
  addPurchasedModAction,
} from "@/app/account/actions";

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => void (await logoutAction()))}
      className="focus-ring rounded border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-line-hi hover:text-text disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

/**
 * Make this the car the catalog filters by.
 *
 * Disabled for a car whose catalog model has been retired: the record is still
 * worth keeping and displaying, but fitment is keyed on a real model id, so
 * offering a filter that cannot work would be a lie.
 */
export function SelectVehicleButton({
  vehicleId,
  canFilter,
}: {
  vehicleId: string;
  canFilter: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (!canFilter) {
    return (
      <p className="text-xs text-muted">
        We no longer list this chassis, so it can&apos;t filter the catalog.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await selectVehicleAction(vehicleId);
          router.refresh();
        })
      }
      className="focus-ring rounded text-sm font-semibold text-accent-text transition-colors hover:text-text disabled:opacity-50"
    >
      {pending ? "Selecting…" : "Shop for this car →"}
    </button>
  );
}

export function RemoveVehicleButton({ vehicleId }: { vehicleId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        // Confirmed because it takes the build sheet with it, and there is no
        // undo for a list someone may have spent a while assembling.
        if (!confirm("Remove this car and its build sheet? This can't be undone.")) return;
        start(async () => void (await removeVehicleAction(vehicleId)));
      }}
      className="focus-ring rounded px-3 py-2 text-sm text-muted transition-colors hover:text-bad disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove car"}
    </button>
  );
}

export function RemoveModButton({ modId, vehicleId }: { modId: string; vehicleId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Remove mod"
      onClick={() =>
        start(async () => {
          await removeModAction(modId, vehicleId);
          router.refresh();
        })
      }
      className="focus-ring rounded p-1.5 text-muted transition-colors hover:text-bad disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

export function AddPurchasedModButton({
  vehicleId,
  orderId,
  productId,
}: {
  vehicleId: string;
  orderId: string;
  productId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await addPurchasedModAction({ vehicleId, orderId, productId });
          router.refresh();
        })
      }
      className="focus-ring shrink-0 rounded border border-line px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-fg disabled:opacity-50"
    >
      {pending ? "Adding…" : "Add to build"}
    </button>
  );
}
