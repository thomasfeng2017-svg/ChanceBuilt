"use client";

import { notifyChrome } from "@/lib/chrome-events";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVehicleAction } from "@/app/actions";
import type { Vehicle } from "@/lib/vehicle";

/** `label` carries the chassis code for BMW models ("M3 (F80)"). */
type Option = { id: string; name: string; label?: string };

/**
 * Cascading Year → Make → Model picker.
 *
 * Each step narrows the next one against real data, so every combination the
 * customer can assemble is a vehicle we actually carry. Choosing a new Year
 * re-checks the Make and Model rather than blindly clearing them — losing a
 * selection you already made is the single most annoying thing a YMM widget
 * can do.
 *
 * Implementation note: nothing here calls setState synchronously inside an
 * effect. The lists are keyed by the request that produced them (`makesFor`,
 * `modelsFor`), which lets both the loading flags and the "is this list still
 * valid?" question be derived at render time instead of synchronised by hand.
 */
export function YmmSelector({
  initial,
  layout = "row",
  redirectTo = "/parts",
  autoSubmit = false,
}: {
  initial?: Vehicle | null;
  layout?: "row" | "stack";
  redirectTo?: string;
  autoSubmit?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [years, setYears] = useState<number[]>([]);

  const [year, setYear] = useState<number | "">(initial?.year ?? "");
  const [makeId, setMakeId] = useState<string>(initial?.makeId ?? "");
  const [modelId, setModelId] = useState<string>(initial?.modelId ?? "");

  // Each list is stamped with the query it answers, so a stale response for a
  // year the customer has already moved on from is simply never rendered.
  const [makes, setMakes] = useState<{ key: number; items: Option[] } | null>(null);
  const [models, setModels] = useState<{ key: string; items: Option[] } | null>(null);

  const [error, setError] = useState<string | null>(null);

  const makesKey = year === "" ? null : year;
  const modelsKey = year === "" || !makeId ? null : `${year}:${makeId}`;

  // Years — fetched once.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/vehicles/years")
      .then((r) => r.json())
      .then((d: { years: number[] }) => {
        if (!cancelled) setYears(d.years ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load model years.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Makes — depend on year.
  useEffect(() => {
    if (makesKey === null) return;
    let cancelled = false;
    fetch(`/api/vehicles/makes?year=${makesKey}`)
      .then((r) => r.json())
      .then((d: { makes: Option[] }) => {
        if (!cancelled) setMakes({ key: makesKey, items: d.makes ?? [] });
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load makes.");
        setMakes({ key: makesKey, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [makesKey]);

  // Models — depend on year + make.
  useEffect(() => {
    if (modelsKey === null) return;
    const [y, m] = modelsKey.split(":");
    let cancelled = false;
    fetch(`/api/vehicles/models?year=${y}&makeId=${m}`)
      .then((r) => r.json())
      .then((d: { models: Option[] }) => {
        if (!cancelled) setModels({ key: modelsKey, items: d.models ?? [] });
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load models.");
        setModels({ key: modelsKey, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [modelsKey]);

  // ---- derived state: no effect needs to clear anything ----
  const makeOptions = makes && makes.key === makesKey ? makes.items : [];
  const modelOptions = models && models.key === modelsKey ? models.items : [];

  const loadingMakes = makesKey !== null && (makes === null || makes.key !== makesKey);
  const loadingModels = modelsKey !== null && (models === null || models.key !== modelsKey);

  // A selection only counts once it appears in the current list — this is what
  // preserves "2018 Honda Civic" when the year changes to 2019, and drops it
  // when the year changes to 1995.
  const effectiveMakeId = makeOptions.some((m) => m.id === makeId) ? makeId : "";
  const effectiveModelId = modelOptions.some((m) => m.id === modelId) ? modelId : "";

  const complete = year !== "" && !!effectiveMakeId && !!effectiveModelId;

  function submit(nextModelId = effectiveModelId) {
    if (year === "" || !effectiveMakeId || !nextModelId) return;
    setError(null);
    startTransition(async () => {
      const result = await setVehicleAction({
        year: Number(year),
        makeId: effectiveMakeId,
        modelId: nextModelId,
        redirectTo,
      });
      if (result && !result.ok) {
        setError(result.error);
      } else {
        // The header reads the garage cookie in the browser now. When the
        // selector is used on the page it redirects to, the URL does not
        // change, so nothing else would prompt it to look again.
        notifyChrome();
        router.refresh();
      }
    });
  }

  const fieldClass =
    "select-field focus-ring w-full rounded-lg border border-field bg-surface-2 px-3.5 py-3 text-sm font-medium text-text transition-colors hover:border-muted/50";

  const wrapperClass =
    layout === "row" ? "grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" : "grid gap-3";

  return (
    <div>
      <div className={wrapperClass}>
        <label className="sr-only" htmlFor="ymm-year">
          Year
        </label>
        <select
          id="ymm-year"
          className={fieldClass}
          value={year}
          disabled={years.length === 0}
          onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="ymm-make">
          Make
        </label>
        <select
          id="ymm-make"
          className={fieldClass}
          value={effectiveMakeId}
          disabled={year === "" || loadingMakes}
          onChange={(e) => setMakeId(e.target.value)}
        >
          <option value="">{loadingMakes ? "Loading…" : "Make"}</option>
          {makeOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="ymm-model">
          Model
        </label>
        <select
          id="ymm-model"
          className={fieldClass}
          value={effectiveModelId}
          disabled={!effectiveMakeId || loadingModels}
          onChange={(e) => {
            setModelId(e.target.value);
            if (autoSubmit && e.target.value) submit(e.target.value);
          }}
        >
          <option value="">{loadingModels ? "Loading…" : "Model"}</option>
          {modelOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label ?? m.name}
            </option>
          ))}
        </select>

        {!autoSubmit && (
          <button
            type="button"
            onClick={() => submit()}
            disabled={!complete || pending}
            className="focus-ring rounded-lg bg-accent px-6 py-3 text-sm font-bold tracking-wide text-accent-fg uppercase transition-all hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Finding…" : "Find parts"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
