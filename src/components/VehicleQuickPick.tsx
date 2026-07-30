"use client";

import { useTransition } from "react";
import { setVehicleAction } from "@/app/actions";

/**
 * One-click vehicle shortcut. Cookies can only be written from a server action
 * or route handler — never during a server render — so these are buttons that
 * invoke the action rather than plain links.
 */
export function VehicleQuickPick({
  year,
  makeId,
  modelId,
  label,
}: {
  year: number;
  makeId: string;
  modelId: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setVehicleAction({ year, makeId, modelId, redirectTo: "/parts" });
        })
      }
      className="focus-ring flex min-h-11 items-center rounded-full border border-field bg-surface px-4 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-text disabled:opacity-50"
    >
      {pending ? "Loading…" : label}
    </button>
  );
}
