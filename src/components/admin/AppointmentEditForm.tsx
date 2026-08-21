"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  updateAppointmentAction,
  type AppointmentEditState,
} from "@/app/admin/(protected)/appointments/actions";

export type AppointmentEditValues = {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  notes: string;
  serviceId: string;
  /** Shop-local, so the fields show the time the shop actually means. */
  date: string;
  time: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleChassis: string;
};

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring rounded bg-accent px-6 py-2.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export function AppointmentEditForm({
  initial,
  services,
}: {
  initial: AppointmentEditValues;
  services: Array<{ id: string; name: string; durationMinutes: number }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<AppointmentEditState, FormData>(
    async (prev, data) => {
      const result = await updateAppointmentAction(prev, data);
      if (result?.ok) router.refresh();
      return result;
    },
    null,
  );

  const input =
    "focus-ring w-full rounded border border-line bg-surface-2 px-3 py-2 text-sm transition-colors placeholder:text-muted/50 hover:border-line-hi";
  const label = "mb-1 block text-xs font-semibold text-muted";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring rounded border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-line-hi hover:text-text"
      >
        Edit details
      </button>
    );
  }

  return (
    <form action={action} className="rounded-card border border-accent/40 bg-surface p-5">
      <input type="hidden" name="id" value={initial.id} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="display text-base">Edit appointment</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="focus-ring rounded px-2 py-1 text-xs text-muted hover:text-text"
        >
          Close
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Customer name</span>
          <input name="customerName" required defaultValue={initial.customerName} className={input} />
        </label>

        <label className="block">
          <span className={label}>Service</span>
          <select
            name="serviceId"
            required
            defaultValue={initial.serviceId}
            className={`select-field ${input}`}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes} min)
              </option>
            ))}
          </select>
          {/* Said explicitly: changing service moves the end time, which can
              push the booking into another car's bay. */}
          <span className="mt-1 block text-[0.7rem] text-muted">
            Changing this changes how long the slot blocks.
          </span>
        </label>

        <label className="block">
          <span className={label}>Email</span>
          <input name="email" type="email" required defaultValue={initial.email} className={input} />
        </label>

        <label className="block">
          <span className={label}>Phone</span>
          <input name="phone" type="tel" required defaultValue={initial.phone} className={input} />
        </label>

        <label className="block">
          <span className={label}>Date</span>
          <input name="date" type="date" required defaultValue={initial.date} className={input} />
        </label>

        <label className="block">
          <span className={label}>Time</span>
          <input name="time" type="time" required step={1800} defaultValue={initial.time} className={input} />
          <span className="mt-1 block text-[0.7rem] text-muted">Shop time, Riverside.</span>
        </label>

        <label className="block">
          <span className={label}>Vehicle year</span>
          <input name="vehicleYear" inputMode="numeric" defaultValue={initial.vehicleYear} className={input} />
        </label>

        <label className="block">
          <span className={label}>Make</span>
          <input name="vehicleMake" defaultValue={initial.vehicleMake} className={input} />
        </label>

        <label className="block">
          <span className={label}>Model</span>
          <input name="vehicleModel" defaultValue={initial.vehicleModel} className={input} />
        </label>

        <label className="block">
          <span className={label}>Chassis</span>
          <input name="vehicleChassis" defaultValue={initial.vehicleChassis} className={input} placeholder="F80" />
        </label>

        <label className="block sm:col-span-2">
          <span className={label}>Notes</span>
          <textarea name="notes" rows={3} defaultValue={initial.notes} className={input} />
        </label>
      </div>

      {state && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`mt-3 rounded border px-3 py-2 text-sm font-medium ${
            state.ok
              ? "border-good/30 bg-good/10 text-good"
              : "border-bad/30 bg-bad/10 text-bad"
          }`}
        >
          {state.ok ? state.error ?? "Saved." : state.error}
        </p>
      )}

      <div className="mt-4">
        <Save />
      </div>
    </form>
  );
}
