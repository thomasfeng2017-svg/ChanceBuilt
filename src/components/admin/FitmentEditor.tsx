"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addFitmentAction,
  addFitmentByEngineAction,
  removeFitmentAction,
  removeFitmentByEngineAction,
} from "@/app/admin/(protected)/products/actions";

type Make = { id: string; name: string };
type Model = {
  id: string;
  name: string;
  label: string;
  chassis: string | null;
  yearStart: number;
  yearEnd: number;
};

export type FitmentRow = {
  id: string;
  makeName: string;
  modelName: string;
  chassis: string | null;
  yearStart: number;
  yearEnd: number;
  submodel: string | null;
  engine: string | null;
  notes: string | null;
};

/**
 * Fitment editing for one product.
 *
 * The generic-CRUD version of this is "pick a model id, type two years, repeat
 * eleven times". The engine presets exist because a turbo kit almost never fits
 * one chassis — it fits an engine family — and clicking "All S55" is the
 * difference between the shop maintaining its own catalog and not.
 */
export function FitmentEditor({
  productId,
  rows,
  makes,
  enginePresets,
  readOnly = false,
}: {
  productId: string;
  rows: FitmentRow[];
  makes: Make[];
  enginePresets: Array<{ code: string; count: number }>;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);

  const [makeId, setMakeId] = useState("");
  const [models, setModels] = useState<{ key: string; items: Model[] } | null>(null);
  const [modelId, setModelId] = useState("");
  // Year inputs default to the chassis's production run but stay editable. The
  // override is keyed by modelId so picking a different chassis re-defaults
  // without needing an effect to sync it.
  const [yearEdit, setYearEdit] = useState<{
    modelId: string;
    start: string;
    end: string;
  } | null>(null);
  const [submodel, setSubmodel] = useState("");
  const [engine, setEngine] = useState("");
  const [notes, setNotes] = useState("");

  // Models for the chosen make (no year filter here — the admin wants the full
  // list so they can set an arbitrary range).
  useEffect(() => {
    if (!makeId) return;
    let cancelled = false;
    fetch(`/api/vehicles/models?makeId=${makeId}`)
      .then((r) => r.json())
      .then((d: { models: Model[] }) => {
        if (!cancelled) setModels({ key: makeId, items: d.models ?? [] });
      })
      .catch(() => {
        if (!cancelled) setModels({ key: makeId, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [makeId]);

  const modelOptions = models && models.key === makeId ? models.items : [];
  const chosen = modelOptions.find((m) => m.id === modelId) ?? null;

  const edited = yearEdit?.modelId === modelId ? yearEdit : null;
  const yearStart = edited?.start ?? (chosen ? String(chosen.yearStart) : "");
  const yearEnd = edited?.end ?? (chosen ? String(chosen.yearEnd) : "");

  const setYearStart = (start: string) => setYearEdit({ modelId, start, end: yearEnd });
  const setYearEnd = (end: string) => setYearEdit({ modelId, start: yearStart, end });

  function add() {
    if (!modelId) return;
    setMessage(null);
    startTransition(async () => {
      const result = await addFitmentAction({
        productId,
        modelId,
        yearStart: Number(yearStart),
        yearEnd: Number(yearEnd),
        submodel,
        engine,
        notes,
      });
      if (!result.ok) {
        setMessage({ tone: "bad", text: result.error });
        return;
      }
      setSubmodel("");
      setEngine("");
      setNotes("");
      setModelId("");
      setMessage({ tone: "good", text: "Fitment added." });
      router.refresh();
    });
  }

  function addPreset(code: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await addFitmentByEngineAction(productId, code);
      if (!result.ok) {
        setMessage({ tone: "bad", text: result.error });
        return;
      }
      setMessage({
        tone: "good",
        text: `Added ${result.added} ${code} chassis.`,
      });
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeFitmentAction(id, productId);
      router.refresh();
    });
  }

  function removePreset(code: string, count: number) {
    // Confirmed, because one click can undo a dozen rows and there is no undo
    // for the undo. The count is in the prompt so it is clear how much goes.
    if (!confirm(`Remove all ${count} ${code} fitment ${count === 1 ? "row" : "rows"}?`)) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await removeFitmentByEngineAction(productId, code);
      if (!result.ok) {
        setMessage({ tone: "bad", text: result.error });
        return;
      }
      setMessage({ tone: "good", text: `Removed ${result.removed} ${code} chassis.` });
      router.refresh();
    });
  }

  const input =
    "focus-ring w-full rounded border border-line bg-surface-2 px-3 py-2 text-sm placeholder:text-muted/50 hover:border-line-hi";

  // Group the table by make for readability.
  const grouped = rows.reduce<Record<string, FitmentRow[]>>((acc, r) => {
    (acc[r.makeName] ??= []).push(r);
    return acc;
  }, {});

  /*
    Engines actually on this product, for the bulk-remove buttons.

    Built from the rows rather than from the preset list, so the buttons only
    offer what is really there and the count is exact. Keyed case-insensitively
    for the same reason the action deletes that way, and the first spelling seen
    is the one shown.
  */
  const engineCounts = rows.reduce<Record<string, { code: string; count: number }>>(
    (acc, r) => {
      const code = r.engine?.trim();
      if (!code) return acc;
      const key = code.toUpperCase();
      acc[key] ??= { code, count: 0 };
      acc[key].count += 1;
      return acc;
    },
    {},
  );
  const engineGroups = Object.values(engineCounts).sort((a, b) => a.code.localeCompare(b.code));

  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <h2 className="display text-base">Fitment</h2>
      <p className="mt-1 mb-4 text-sm text-muted">
        Which vehicles this part fits. Years are inclusive.
      </p>

      {!readOnly && enginePresets.length > 0 && (
        <div className="mb-5 rounded border border-line-hi bg-surface-2 p-4">
          <p className="eyebrow mb-2 text-[0.6rem] text-muted">Quick add by engine</p>
          <div className="flex flex-wrap gap-2">
            {enginePresets.map((p) => (
              <button
                key={p.code}
                type="button"
                disabled={pending}
                onClick={() => addPreset(p.code)}
                className="focus-ring rounded border border-line px-3 py-1.5 text-xs font-bold transition-colors hover:border-accent hover:bg-accent hover:text-accent-fg disabled:opacity-50"
              >
                All {p.code}
                <span className="ml-1.5 font-normal opacity-70">{p.count}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Adds every chassis running that engine, using each one&apos;s production years.
          </p>

        </div>
      )}

      {/* The matching undo, shown only for engines this product actually has.
          Kept out of the quick-add box above so it still appears on a product
          whose fitment was imported rather than added with the presets. */}
      {!readOnly && engineGroups.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="eyebrow text-[0.6rem] text-muted">Remove by engine</span>
          {engineGroups.map((g) => (
            <button
              key={g.code}
              type="button"
              disabled={pending}
              onClick={() => removePreset(g.code, g.count)}
              className="focus-ring rounded border border-line px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-bad hover:bg-bad hover:text-accent-fg disabled:opacity-50"
            >
              Remove {g.code}
              <span className="ml-1.5 font-normal opacity-70">{g.count}</span>
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          No fitment set. This part won&apos;t show for any customer with a vehicle selected.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-surface-2 text-left">
              <tr className="text-[0.65rem] font-bold tracking-widest text-muted uppercase">
                <th scope="col" className="px-3 py-2">Make</th>
                <th scope="col" className="px-3 py-2">Chassis</th>
                <th scope="col" className="px-3 py-2">Years</th>
                <th scope="col" className="px-3 py-2">Notes</th>
                {!readOnly && <th scope="col" className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {Object.entries(grouped).map(([makeName, items]) =>
                items.map((r, i) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-semibold">{i === 0 ? makeName : ""}</td>
                    <td className="px-3 py-2">
                      {r.modelName}
                      {r.chassis && <span className="ml-1.5 text-muted">({r.chassis})</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.yearStart}–{r.yearEnd}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {[r.submodel, r.engine, r.notes].filter(Boolean).join(" · ") || "—"}
                    </td>
                    {!readOnly && (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => remove(r.id)}
                          className="focus-ring rounded text-xs text-muted hover:text-bad disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}

      {!readOnly && (
        <div className="mt-5 border-t border-line pt-5">
          <p className="eyebrow mb-3 text-[0.6rem] text-muted">Add one vehicle</p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              aria-label="Make"
              value={makeId}
              onChange={(e) => {
                setMakeId(e.target.value);
                setModelId("");
              }}
              className={`select-field ${input}`}
            >
              <option value="">Make…</option>
              {makes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Model"
              value={modelId}
              disabled={!makeId}
              onChange={(e) => setModelId(e.target.value)}
              className={`select-field ${input}`}
            >
              <option value="">Chassis…</option>
              {modelOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            <input
              aria-label="Year from"
              value={yearStart}
              onChange={(e) => setYearStart(e.target.value)}
              inputMode="numeric"
              placeholder="From"
              className={input}
            />
            <input
              aria-label="Year to"
              value={yearEnd}
              onChange={(e) => setYearEnd(e.target.value)}
              inputMode="numeric"
              placeholder="To"
              className={input}
            />

            <input
              value={submodel}
              onChange={(e) => setSubmodel(e.target.value)}
              placeholder="Submodel (e.g. Competition)"
              className={input}
            />
            <input
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              placeholder="Engine (e.g. S55)"
              className={input}
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note (e.g. Off-road use only)"
              className={`${input} lg:col-span-2`}
            />
          </div>

          <button
            type="button"
            onClick={add}
            disabled={!modelId || pending}
            className="focus-ring mt-3 rounded border border-line-hi px-5 py-2.5 text-sm font-bold tracking-widest uppercase transition-colors hover:bg-accent hover:text-accent-fg disabled:opacity-40"
          >
            {pending ? "Adding…" : "Add fitment"}
          </button>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm font-medium ${
            message.tone === "good" ? "text-good" : "text-bad"
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
