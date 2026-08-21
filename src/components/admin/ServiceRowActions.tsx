"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setServiceActiveAction,
  moveServiceAction,
} from "@/app/admin/(protected)/services/actions";

/**
 * Reorder and show/hide, inline on the services list.
 *
 * There is no delete. Appointments hold a required reference to their service,
 * so removing one would orphan every booking taken against it. Hiding is
 * reversible and keeps the history readable, which is what a shop pausing a
 * seasonal service actually wants.
 */
export function ServiceRowActions({
  serviceId,
  active,
  isFirst,
  isLast,
}: {
  serviceId: string;
  active: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const iconBtn =
    "focus-ring rounded p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-30";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={pending || isFirst}
        onClick={() => run(() => moveServiceAction(serviceId, "up"))}
        aria-label="Move up"
        title="Move up"
        className={iconBtn}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>

      <button
        type="button"
        disabled={pending || isLast}
        onClick={() => run(() => moveServiceAction(serviceId, "down"))}
        aria-label="Move down"
        title="Move down"
        className={iconBtn}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setServiceActiveAction(serviceId, !active))}
        className={`focus-ring ml-1 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
          active
            ? "text-muted hover:text-bad"
            : "text-accent-text hover:text-text"
        }`}
      >
        {pending ? "…" : active ? "Hide" : "Show"}
      </button>
    </div>
  );
}
