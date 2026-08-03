"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { addModAction, type AuthState } from "@/app/account/actions";

/** Suggestions, not a fixed list: plenty of mods have no catalog equivalent. */
const CATEGORIES = [
  "Tuning",
  "Turbo",
  "Charge Cooling",
  "Intake",
  "Exhaust",
  "Fueling",
  "Cooling",
  "Drivetrain",
  "Suspension",
  "Brakes",
  "Wheels & Tires",
  "Interior",
  "Exterior",
];

export function ModForm({ vehicleId }: { vehicleId: string }) {
  const [state, action] = useActionState<AuthState, FormData>(addModAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  const input =
    "focus-ring w-full rounded border border-line bg-surface-2 px-3.5 py-2.5 text-sm transition-colors placeholder:text-muted/50 hover:border-line-hi";

  return (
    <form
      ref={formRef}
      action={async (data) => {
        await action(data);
        // Cleared so the next one can be typed straight away. Adding mods is
        // something people do in a burst, not one at a time.
        formRef.current?.reset();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <input
          name="name"
          required
          placeholder="What is it? e.g. Pure Stage 2 turbos"
          className={input}
        />
        <input
          name="category"
          list="mod-categories"
          placeholder="Category"
          className={input}
        />
        <datalist id="mod-categories">
          {CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <input name="notes" placeholder="Notes (optional)" className={input} />
        <label className="block">
          <span className="sr-only">Date fitted</span>
          <input
            name="installedAt"
            type="date"
            aria-label="Date fitted (optional)"
            className={input}
          />
        </label>
      </div>

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
      className="focus-ring rounded border border-line-hi px-5 py-2.5 text-sm font-bold tracking-widest uppercase transition-colors hover:bg-accent hover:text-accent-fg disabled:opacity-40"
    >
      {pending ? "Adding…" : "Add mod"}
    </button>
  );
}
