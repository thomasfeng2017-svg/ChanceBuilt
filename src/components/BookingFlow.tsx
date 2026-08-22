"use client";

import { useEffect, useState, useTransition } from "react";
import { bookAppointmentAction } from "@/app/actions";
import { formatCents } from "@/lib/money";
import { YmmSelector } from "./YmmSelector";
import { SITE } from "@/lib/site";
import type { Vehicle } from "@/lib/vehicle";
import { SERVICE_CATEGORIES } from "@/lib/service-categories";

type Service = {
  id: string;
  name: string;
  slug: string;
  blurb: string;
  description: string;
  category: string;
  priceFromCents: number | null;
  priceNote: string | null;
  durationMinutes: number;
  /** How long the car is with the shop, when that outlasts the appointment. */
  turnaround: string | null;
  requiresVehicle: boolean;
};

type Slot = { startsAt: string; label: string; available: boolean; reason?: string };
type Day = { date: string; label: string; open: boolean };

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  SERVICE_CATEGORIES.map((c) => [c.value, c.short]),
);

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr${h === 1 ? "" : "s"}`;
}

/**
 * Three-step booking: what → when → who.
 *
 * The vehicle comes from the garage cookie if one is set, so a customer who has
 * been shopping for parts doesn't retype their car. If not, they can pick one
 * with the same YMM control used across the store.
 */
export function BookingFlow({
  services,
  days,
  vehicle,
  vehicleLabel,
  initialServiceId,
}: {
  services: Service[];
  days: Day[];
  vehicle: Vehicle | null;
  vehicleLabel: string | null;
  initialServiceId?: string;
}) {
  const [serviceId, setServiceId] = useState<string>(initialServiceId ?? "");
  const [date, setDate] = useState<string>(days.find((d) => d.open)?.date ?? "");
  const [startsAt, setStartsAt] = useState<string>("");

  const [slots, setSlots] = useState<{ key: string; items: Slot[] } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicleFreeText, setVehicleFreeText] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const service = services.find((s) => s.id === serviceId) ?? null;
  const slotsKey = service && date ? `${service.id}:${date}` : null;

  useEffect(() => {
    if (slotsKey === null) return;
    const [sid, d] = slotsKey.split(":");
    let cancelled = false;
    fetch(`/api/booking/slots?serviceId=${sid}&date=${d}`)
      .then((r) => r.json())
      .then((data: { slots?: Slot[] }) => {
        if (!cancelled) setSlots({ key: slotsKey, items: data.slots ?? [] });
      })
      .catch(() => {
        if (!cancelled) setSlots({ key: slotsKey, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [slotsKey]);

  const slotItems = slots && slots.key === slotsKey ? slots.items : [];
  const loadingSlots = slotsKey !== null && (slots === null || slots.key !== slotsKey);

  // Chosen slot must still be in the current day's list.
  const effectiveStartsAt = slotItems.some((s) => s.startsAt === startsAt && s.available)
    ? startsAt
    : "";

  const needsVehicle = service?.requiresVehicle ?? false;
  const vehicleSatisfied = !needsVehicle || !!vehicle || vehicleFreeText.trim().length > 2;
  const canSubmit =
    !!service && !!effectiveStartsAt && !!name && !!email && !!phone && vehicleSatisfied;

  function submit() {
    if (!service || !effectiveStartsAt) return;
    setError(null);
    startTransition(async () => {
      const result = await bookAppointmentAction({
        serviceId: service.id,
        startsAt: effectiveStartsAt,
        customerName: name,
        email,
        phone,
        notes,
        vehicleFreeText,
      });
      if (result && !result.ok) setError(result.error);
    });
  }

  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  const inputClass =
    "focus-ring w-full rounded border border-field bg-surface-2 px-3.5 py-3 text-sm transition-colors placeholder:text-muted/60 hover:border-line-hi";

  return (
    <div className="space-y-12">
      {/* ---------------------------------------------------- 1. service -- */}
      <section>
        <StepHeading n={1} title="Choose a service" />

        <div className="mt-5 space-y-7">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="eyebrow mb-3 text-[0.65rem] text-muted">
                {CATEGORY_LABEL[category] ?? category}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((s) => {
                  const selected = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setServiceId(s.id);
                        setStartsAt("");
                      }}
                      aria-pressed={selected}
                      className={`focus-ring rounded-card border p-4 text-left transition-colors ${
                        selected
                          ? "border-accent bg-surface-2"
                          : "border-line bg-surface hover:border-line-hi"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold">{s.name}</h3>
                        {selected && (
                          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-muted">{s.blurb}</p>
                      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="font-bold">
                          {s.priceFromCents != null
                            ? `${formatCents(s.priceFromCents)}${s.priceNote ? "" : "+"}`
                            : "Quote"}
                        </span>
                        <span className="text-muted">{s.turnaround ?? durationLabel(s.durationMinutes)}</span>
                        {s.priceNote && <span className="text-muted">{s.priceNote}</span>}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- 2. when -- */}
      {/* `inert` removes the step from focus order and the a11y tree until the
          previous step is complete — better than pointer-events alone. */}
      <section inert={!service} className={service ? "" : "opacity-40"}>
        <StepHeading n={2} title="Pick a time" />

        {service && (
          <p className="mt-2 text-sm text-muted">
            {service.name} ·{" "}
            {service.turnaround
              ? `${durationLabel(service.durationMinutes)} drop-off, ${service.turnaround} in the shop`
              : `${durationLabel(service.durationMinutes)} in the shop`}
          </p>
        )}

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => {
            const selected = d.date === date;
            return (
              <button
                key={d.date}
                type="button"
                disabled={!d.open}
                onClick={() => {
                  setDate(d.date);
                  setStartsAt("");
                }}
                className={`focus-ring shrink-0 rounded border px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  selected
                    ? "border-accent bg-accent text-accent-fg"
                    : d.open
                      ? "border-field bg-surface text-muted hover:border-line-hi hover:text-text"
                      : "cursor-not-allowed border-line/50 bg-surface/50 text-muted/35"
                }`}
              >
                {d.label}
                {!d.open && <span className="ml-1.5 text-[0.65rem]">closed</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {loadingSlots ? (
            <p className="text-sm text-muted">Checking availability…</p>
          ) : slotItems.length === 0 ? (
            <p className="rounded-card border border-line bg-surface px-4 py-6 text-center text-sm text-muted">
              No appointments available that day. Try another date, or call us on{" "}
              <a href={SITE.phoneHref} className="focus-ring rounded text-text underline underline-offset-2">
                {SITE.phone}
              </a>
              .
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {slotItems.map((s) => {
                const selected = s.startsAt === effectiveStartsAt;
                return (
                  <button
                    key={s.startsAt}
                    type="button"
                    disabled={!s.available}
                    title={
                      s.reason === "booked"
                        ? "Fully booked"
                        : s.reason === "past"
                          ? "Too soon to book"
                          : undefined
                    }
                    onClick={() => setStartsAt(s.startsAt)}
                    className={`focus-ring rounded border px-2 py-2.5 text-sm font-medium transition-colors ${
                      selected
                        ? "border-accent bg-accent text-accent-fg"
                        : s.available
                          ? "border-field bg-surface text-text hover:border-line-hi"
                          : "cursor-not-allowed border-line/40 bg-surface/40 text-muted/30 line-through"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- 3. details -- */}
      <section
        inert={!effectiveStartsAt}
        className={effectiveStartsAt ? "" : "opacity-40"}
      >
        <StepHeading n={3} title="Your details" />

        {needsVehicle && (
          <div className="mt-5 rounded-card border border-line bg-surface p-4">
            <p className="eyebrow mb-2 text-[0.65rem] text-muted">Vehicle</p>
            {vehicle ? (
              <p className="text-sm">
                <span className="font-bold">{vehicleLabel}</span>
                <span className="ml-2 text-muted">(from your garage)</span>
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted">
                  Pick your car so we know what we&apos;re working on.
                </p>
                <YmmSelector redirectTo="/book" />
                <p className="mt-3 text-xs text-muted">
                  Not listed? Type it here instead.
                </p>
                <input
                  className={`${inputClass} mt-2`}
                  placeholder="e.g. 2013 BMW 335is (E92)"
                  value={vehicleFreeText}
                  onChange={(e) => setVehicleFreeText(e.target.value)}
                />
              </>
            )}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Name</span>
            <input
              className={inputClass}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Phone</span>
            <input
              className={inputClass}
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(951) 555-0123"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold">Email</span>
            <input
              className={inputClass}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold">
              Anything we should know? <span className="font-normal text-muted">(optional)</span>
            </span>
            <textarea
              className={inputClass}
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Current mods, symptoms, power goals, parts you're supplying…"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded border border-bad/30 bg-bad/10 px-3.5 py-2.5 text-sm font-medium text-bad">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || pending}
          className="focus-ring mt-6 w-full rounded bg-accent px-6 py-4 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-12"
        >
          {pending ? "Requesting…" : "Request appointment"}
        </button>

        <p className="mt-3 text-xs text-muted">
          We&apos;ll confirm by phone or email before your slot. Nothing is charged now.
        </p>
      </section>
    </div>
  );
}

function StepHeading({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line pb-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line-hi text-xs font-bold">
        {n}
      </span>
      <h2 className="display text-lg">{title}</h2>
    </div>
  );
}
