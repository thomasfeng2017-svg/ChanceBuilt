"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { addVehicleAction, type AuthState } from "@/app/account/actions";

type Option = { id: string; name: string; label?: string };

/**
 * Add a car to the garage.
 *
 * Cascading Year → Make → Model against the same endpoints the storefront
 * picker uses, so the only cars that can be saved are ones the shop actually
 * carries parts for. Deliberately not the shared YmmSelector: that one's job is
 * to set the browsing cookie, this one creates a durable record and takes a
 * nickname with it.
 */
export function AddVehicleForm() {
  const [state, action] = useActionState<AuthState, FormData>(addVehicleAction, null);

  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | "">("");
  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");

  const [makes, setMakes] = useState<{ key: number; items: Option[] } | null>(null);
  const [models, setModels] = useState<{ key: string; items: Option[] } | null>(null);

  useEffect(() => {
    let off = false;
    fetch("/api/vehicles/years")
      .then((r) => r.json())
      .then((d: { years: number[] }) => !off && setYears(d.years ?? []))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);

  useEffect(() => {
    if (year === "") return;
    let off = false;
    fetch(`/api/vehicles/makes?year=${year}`)
      .then((r) => r.json())
      .then((d: { makes: Option[] }) => !off && setMakes({ key: year, items: d.makes ?? [] }))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [year]);

  useEffect(() => {
    if (year === "" || !makeId) return;
    const key = `${year}:${makeId}`;
    let off = false;
    fetch(`/api/vehicles/models?year=${year}&makeId=${makeId}`)
      .then((r) => r.json())
      .then((d: { models: Option[] }) => !off && setModels({ key, items: d.models ?? [] }))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [year, makeId]);

  // Same trick as the storefront picker: a selection only counts once it is in
  // the current list, so changing the year cannot leave a stale model attached.
  const makeOptions = makes && makes.key === year ? makes.items : [];
  const modelOptions = models && models.key === `${year}:${makeId}` ? models.items : [];
  const effectiveMakeId = makeOptions.some((m) => m.id === makeId) ? makeId : "";
  const effectiveModelId = modelOptions.some((m) => m.id === modelId) ? modelId : "";

  const field =
    "select-field focus-ring w-full rounded border border-field bg-surface-2 px-3.5 py-3 text-sm font-medium transition-colors hover:border-muted/50 disabled:opacity-50";

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="modelId" value={effectiveModelId} />

      <div className="grid gap-3 sm:grid-cols-3">
        <select
          aria-label="Year"
          name="year"
          value={year}
          disabled={years.length === 0}
          onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
          className={field}
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          aria-label="Make"
          value={effectiveMakeId}
          disabled={year === ""}
          onChange={(e) => setMakeId(e.target.value)}
          className={field}
        >
          <option value="">Make</option>
          {makeOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Model"
          value={effectiveModelId}
          disabled={!effectiveMakeId}
          onChange={(e) => setModelId(e.target.value)}
          className={field}
        >
          <option value="">Model</option>
          {modelOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label ?? m.name}
            </option>
          ))}
        </select>
      </div>

      <input
        name="nickname"
        placeholder="Nickname (optional) — the daily, track car…"
        className="focus-ring w-full rounded border border-line bg-surface-2 px-3.5 py-3 text-sm placeholder:text-muted/50 hover:border-line-hi"
      />

      {state && !state.ok && (
        <p role="alert" className="text-sm font-medium text-bad">
          {state.error}
        </p>
      )}

      <AddButton disabled={!effectiveModelId} />
    </form>
  );
}

function AddButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="focus-ring rounded bg-accent px-6 py-3 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Adding…" : "Add to garage"}
    </button>
  );
}
