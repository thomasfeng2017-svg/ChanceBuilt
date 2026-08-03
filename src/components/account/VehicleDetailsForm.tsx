"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateVehicleAction, type AuthState } from "@/app/account/actions";

export function VehicleDetailsForm({
  id,
  nickname,
  notes,
}: {
  id: string;
  nickname: string;
  notes: string;
}) {
  const [state, action] = useActionState<AuthState, FormData>(updateVehicleAction, null);

  const input =
    "focus-ring w-full rounded border border-line bg-surface-2 px-3.5 py-2.5 text-sm transition-colors placeholder:text-muted/50 hover:border-line-hi";

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Nickname</span>
        <input
          name="nickname"
          defaultValue={nickname}
          placeholder="The daily, track car…"
          className={input}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={notes}
          placeholder="Anything worth remembering: plate, color, what it's built for."
          className={input}
        />
      </label>

      {state && !state.ok && (
        <p role="alert" className="text-sm font-medium text-bad">
          {state.error}
        </p>
      )}

      <Save />
    </form>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring rounded border border-line-hi px-5 py-2.5 text-sm font-bold tracking-widest uppercase transition-colors hover:bg-surface-2 disabled:opacity-40"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}
