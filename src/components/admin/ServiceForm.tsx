"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  saveServiceAction,
  type ServiceFormState,
} from "@/app/admin/(protected)/services/actions";

export type ServiceFormValues = {
  id?: string;
  name: string;
  blurb: string;
  description: string;
  category: string;
  priceFrom: string;
  priceNote: string;
  durationMinutes: number;
  requiresVehicle: boolean;
  active: boolean;
  sortOrder: number;
};

const CATEGORIES = [
  { value: "TUNING", label: "Tuning & ECU" },
  { value: "PERFORMANCE", label: "Performance install" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "FABRICATION", label: "Fabrication & builds" },
  { value: "DIAGNOSTIC", label: "Diagnostics" },
];

/** The grid the booking calendar works on, so only offer real slot lengths. */
const DURATIONS = [30, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480];

function durationLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr${h === 1 ? "" : "s"}`;
}

function SubmitButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring rounded bg-accent px-7 py-3 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
    >
      {pending ? "Saving…" : isNew ? "Create service" : "Save changes"}
    </button>
  );
}

export function ServiceForm({
  initial,
  readOnly = false,
}: {
  initial: ServiceFormValues;
  readOnly?: boolean;
}) {
  const [state, formAction] = useActionState<ServiceFormState, FormData>(
    saveServiceAction,
    null,
  );
  const [duration, setDuration] = useState(initial.durationMinutes);
  const [priceFrom, setPriceFrom] = useState(initial.priceFrom);
  const isNew = !initial.id;

  const input =
    "focus-ring w-full rounded border border-line bg-surface-2 px-3.5 py-2.5 text-sm transition-colors placeholder:text-muted/50 hover:border-line-hi disabled:opacity-60";
  const label = "mb-1.5 block text-sm font-semibold";

  return (
    <form action={formAction} className="space-y-8">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="display mb-4 text-base">Details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={label}>Service name</span>
            <input
              name="name"
              required
              disabled={readOnly}
              defaultValue={initial.name}
              className={input}
              placeholder="Custom Dyno Tune"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className={label}>One-line summary</span>
            <input
              name="blurb"
              required
              disabled={readOnly}
              defaultValue={initial.blurb}
              className={input}
              placeholder="In-house tuning on our dyno, dialed in for your setup and fuel."
            />
            <span className="mt-1 block text-xs text-muted">
              Shows on the service cards and in the booking picker.
            </span>
          </label>

          <label className="block">
            <span className={label}>Category</span>
            <select
              name="category"
              required
              disabled={readOnly}
              defaultValue={initial.category}
              className={`select-field ${input}`}
            >
              <option value="">Choose a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={label}>Order in the list</span>
            <input
              name="sortOrder"
              disabled={readOnly}
              defaultValue={initial.sortOrder}
              className={input}
              inputMode="numeric"
            />
            <span className="mt-1 block text-xs text-muted">
              Lower numbers come first. Or use the arrows on the services list.
            </span>
          </label>

          <label className="block sm:col-span-2">
            <span className={label}>Full description</span>
            <textarea
              name="description"
              rows={5}
              disabled={readOnly}
              defaultValue={initial.description}
              className={input}
              placeholder="What's included, what the customer should bring, and anything worth knowing before they book."
            />
          </label>
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="display mb-1 text-base">Price &amp; time</h2>
        <p className="mb-4 text-sm text-muted">
          Duration decides which appointment slots customers can book, so it
          matters more than it looks.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>
              Price from <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              name="priceFrom"
              disabled={readOnly}
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              className={input}
              inputMode="decimal"
              placeholder="899.00"
            />
            <span className="mt-1 block text-xs text-muted">
              {priceFrom.trim()
                ? "Shown as a starting price."
                : "Blank means quote only, which is right for custom work."}
            </span>
          </label>

          <label className="block">
            <span className={label}>
              Price note <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              name="priceNote"
              disabled={readOnly}
              defaultValue={initial.priceNote}
              className={input}
              placeholder="from, depending on platform"
            />
          </label>

          <label className="block">
            <span className={label}>Appointment length</span>
            <select
              name="durationMinutes"
              required
              disabled={readOnly}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={`select-field ${input}`}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {durationLabel(d)}
                </option>
              ))}
            </select>
            {/* Said plainly, because the consequence is not obvious from a
                number: a long slot quietly eats the day's remaining capacity. */}
            <span className="mt-1 block text-xs text-muted">
              Blocks {durationLabel(duration)} of one bay. For jobs that keep the
              car for days, book a short intake slot instead.
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="display mb-4 text-base">Visibility</h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="active"
              disabled={readOnly}
              defaultChecked={initial.active}
              className="mt-1 h-4 w-4 accent-white"
            />
            <span>
              <span className="block text-sm font-semibold">Bookable</span>
              <span className="block text-xs text-muted">
                Unticked, it disappears from the site and the booking form. Past
                appointments keep it.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="requiresVehicle"
              disabled={readOnly}
              defaultChecked={initial.requiresVehicle}
              className="mt-1 h-4 w-4 accent-white"
            />
            <span>
              <span className="block text-sm font-semibold">Needs vehicle details</span>
              <span className="block text-xs text-muted">
                Almost everything does. Untick for something like a consultation.
              </span>
            </span>
          </label>
        </div>
      </section>

      {state && !state.ok && (
        <p
          role="alert"
          className="rounded border border-bad/30 bg-bad/10 px-4 py-3 text-sm font-medium text-bad"
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded border border-good/30 bg-good/10 px-4 py-3 text-sm font-medium text-good">
          Saved.
        </p>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton isNew={isNew} />
          <Link
            href="/admin/services"
            className="focus-ring rounded px-4 py-3 text-sm text-muted hover:text-text"
          >
            Cancel
          </Link>
        </div>
      )}
    </form>
  );
}
