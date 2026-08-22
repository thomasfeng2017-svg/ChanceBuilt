"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importChancebuiltServicesAction } from "@/app/admin/(protected)/services/actions";

/**
 * One-time load of the shop's real service list.
 *
 * Only rendered while none of that list is in the database, so once it has been
 * used it disappears and cannot later wipe services the shop has added itself.
 *
 * Asks before running because it deletes. The confirmation says what will
 * happen in plain terms rather than "are you sure", which nobody reads.
 */
export function ImportServicesPanel({ replacing }: { replacing: number }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    start(async () => {
      try {
        await importChancebuiltServicesAction();
        setAsking(false);
        router.refresh();
      } catch {
        setError("Could not load the list. Nothing was changed.");
      }
    });
  };

  return (
    <div className="mb-6 rounded-card border border-accent/40 bg-accent/5 px-5 py-4">
      <p className="text-sm font-bold">
        The shop&rsquo;s service list has not been loaded yet
      </p>
      <p className="mt-1 text-sm text-muted">
        Loads the 36 services ChanceBuilt offers, across tuning, performance, suspension, brakes
        and maintenance. Every one comes in priced as &ldquo;Quote, after review&rdquo; for you to
        price, with an estimated appointment length to correct.
        {replacing > 0 && (
          <>
            {" "}
            This replaces the {replacing} placeholder{replacing === 1 ? "" : " services"} currently
            listed. Anything with a booking against it is switched off rather than deleted, so
            existing appointments keep working.
          </>
        )}
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-bad">
          {error}
        </p>
      )}

      {asking ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="focus-ring rounded bg-accent px-5 py-2.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-60"
          >
            {pending ? "Loading..." : "Yes, load the list"}
          </button>
          <button
            type="button"
            onClick={() => setAsking(false)}
            disabled={pending}
            className="focus-ring rounded px-4 py-2.5 text-sm text-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="focus-ring mt-4 rounded bg-accent px-5 py-2.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
        >
          Load service list
        </button>
      )}
    </div>
  );
}
