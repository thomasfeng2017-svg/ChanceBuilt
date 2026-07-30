"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { clearVehicleAction } from "@/app/actions";
import { YmmSelector } from "./YmmSelector";
import { vehicleLabel, type Vehicle } from "@/lib/vehicle";

/**
 * The persistent "you are shopping for X" bar.
 *
 * Visible on every page. When no vehicle is set it nags (politely) with the
 * selector inline, because an un-filtered auto parts catalog is close to
 * useless to a customer.
 */
export function GarageBar({ vehicle }: { vehicle: Vehicle | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  // Merch is not filtered by vehicle, so claiming a fitment filter is on would
  // be a lie, and nagging someone to pick a car before buying a hat is worse.
  const fitmentApplies = !pathname.startsWith("/merch");

  // The homepage hero already carries a full-size vehicle picker; showing the
  // prompt here as well means two identical selectors stacked on top of each
  // other. Once a vehicle is chosen the compact bar is useful everywhere.
  if (!vehicle && (pathname === "/" || !fitmentApplies)) return null;

  if (!vehicle || editing) {
    return (
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <p className="shrink-0 text-sm font-semibold text-text">
              {vehicle ? "Change vehicle" : "Select your vehicle"}
              <span className="ml-2 font-normal text-muted">
                so we only show parts that fit
              </span>
            </p>
            <div className="flex-1 lg:max-w-2xl">
              <YmmSelector
                initial={vehicle}
                redirectTo="/parts"
              />
            </div>
            {vehicle && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="focus-ring shrink-0 self-start rounded-lg px-3 py-2 text-sm text-muted hover:text-text lg:self-auto"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <span className="flex items-center gap-2 text-xs font-bold tracking-widest text-muted uppercase">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent-text" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17h14M5 17a2 2 0 0 1-2-2v-3l2.5-5.5A2 2 0 0 1 7.3 5h9.4a2 2 0 0 1 1.8 1.5L21 12v3a2 2 0 0 1-2 2M7 17v2M17 17v2" />
          </svg>
          My garage
        </span>

        <span className="text-sm font-bold text-text">{vehicleLabel(vehicle)}</span>

        {fitmentApplies && (
          <span className="hidden items-center gap-1.5 text-xs font-medium text-good sm:flex">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Fitment filter on
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="focus-ring rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            Change
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await clearVehicleAction();
                router.refresh();
              })
            }
            className="focus-ring rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
