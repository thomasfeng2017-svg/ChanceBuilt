"use client";

import Link from "next/link";
import { useChrome } from "./HeaderChrome";
import { YmmSelector } from "./YmmSelector";
import { VehicleQuickPick } from "./VehicleQuickPick";
import { vehicleLabel } from "@/lib/vehicle";

export type QuickPick = {
  id: string;
  year: number;
  makeId: string;
  modelId: string;
  label: string;
};

/**
 * The vehicle box in the home page hero.
 *
 * The home page is cached, so the server always renders the "pick your car"
 * version. In the browser, once cookies have been read, someone who already
 * has a car set sees it named here instead. That is a small swap after paint
 * for returning customers, traded for the home page no longer running a
 * database query for every bot that fetches it.
 *
 * The old server version also showed "N parts confirmed to fit". That number
 * needed the catalog query run per vehicle per request. The parts page still
 * says it; here the car and a way in are enough.
 */
export function HeroVehiclePanel({ quickPicks }: { quickPicks: QuickPick[] }) {
  const { vehicle, ready } = useChrome();

  if (ready && vehicle) {
    return (
      <div className="mt-14 max-w-3xl rounded-card border border-line bg-surface/95 p-5 backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow text-[0.65rem] text-muted">Shopping for</p>
            <p className="display mt-1.5 text-2xl">{vehicleLabel(vehicle)}</p>
            <p className="mt-1 text-sm text-muted">The catalog is filtered to what fits it.</p>
          </div>
          <Link
            href="/parts"
            className="focus-ring shrink-0 rounded bg-accent px-7 py-3.5 text-center text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
          >
            Browse parts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-14 max-w-3xl rounded-card border border-line bg-surface/95 p-5 backdrop-blur sm:p-6">
        <p className="eyebrow mb-3 text-[0.65rem] text-muted">Find parts that fit your car</p>
        <YmmSelector redirectTo="/parts" />
      </div>

      {quickPicks.length > 0 && (
        <div className="mt-6 max-w-3xl">
          <p className="mb-3 text-xs text-muted">Or jump straight to a chassis</p>
          <div className="flex flex-wrap gap-2">
            {quickPicks.map((m) => (
              <VehicleQuickPick
                key={m.id}
                year={m.year}
                makeId={m.makeId}
                modelId={m.modelId}
                label={m.label}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
