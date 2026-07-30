"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Inline status changer used by the order and appointment screens.
 * Optimistically shows the new value, reverts and explains if the action fails.
 */
export function StatusSelect({
  id,
  current,
  options,
  action,
  disabled = false,
}: {
  id: string;
  current: string;
  options: readonly string[];
  action: (id: string, status: string) => Promise<{ ok: boolean; error?: string }>;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <select
        aria-label="Status"
        value={value}
        disabled={disabled || pending}
        onChange={(e) => {
          const next = e.target.value;
          const previous = value;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await action(id, next);
            if (!result.ok) {
              setValue(previous);
              setError(result.error ?? "Couldn't update.");
              return;
            }
            router.refresh();
          });
        }}
        className="select-field focus-ring rounded border border-line bg-surface-2 px-3 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1 text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
