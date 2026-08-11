import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatShopDateTime } from "@/lib/booking";
import { formatCents } from "@/lib/money";
import { SITE, directionsUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Appointment requested" };

function durationLabel(minutes: number) {
  if (minutes < 60) return `About ${minutes} minutes in the shop`;
  const h = minutes / 60;
  return `About ${Number.isInteger(h) ? h : h.toFixed(1)} hour${h === 1 ? "" : "s"} in the shop`;
}

export default async function AppointmentPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { reference },
    include: { service: true },
  });

  if (!appointment) notFound();

  const vehicle = [
    appointment.vehicleYear,
    appointment.vehicleMake,
    appointment.vehicleModel,
    appointment.vehicleChassis ? `(${appointment.vehicleChassis})` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-good/40 bg-good/10 text-good">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h1 className="display text-3xl">Appointment requested</h1>
        <p className="mt-3 text-sm text-muted">
          We&apos;ve got it. You&apos;ll hear from us to confirm before your slot, usually the
          same day.
        </p>
        <p className="mt-2 font-mono text-sm">
          Reference <span className="font-bold">{appointment.reference}</span>
        </p>
      </div>

      <dl className="mt-10 divide-y divide-line rounded-card border border-line bg-surface text-sm">
        <Row label="Service" value={appointment.service.name} />
        <Row label="When" value={formatShopDateTime(appointment.startsAt)} />
        <Row label="Estimated time" value={durationLabel(appointment.service.durationMinutes)} />
        {vehicle && <Row label="Vehicle" value={vehicle} />}
        <Row
          label="Price"
          value={
            appointment.service.priceFromCents != null
              ? `From ${formatCents(appointment.service.priceFromCents)}${
                  appointment.service.priceNote ? ` (${appointment.service.priceNote})` : ""
                }`
              : (appointment.service.priceNote ?? "Quote after we look at the car")
          }
        />
        <Row label="Name" value={appointment.customerName} />
        <Row label="Contact" value={`${appointment.phone} · ${appointment.email}`} />
        {appointment.notes && <Row label="Notes" value={appointment.notes} />}
      </dl>

      <div className="mt-6 rounded-card border border-line bg-surface p-5 text-sm">
        <p className="eyebrow mb-2 text-[0.65rem] text-muted">Where to come</p>
        <address className="not-italic">
          {SITE.address.street}
          <br />
          {SITE.address.city}, {SITE.address.state} {SITE.address.zip}
        </address>
        <div className="mt-3 flex flex-wrap gap-4">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring rounded text-muted underline underline-offset-2 hover:text-text"
          >
            Directions
          </a>
          <a
            href={SITE.phoneHref}
            className="focus-ring rounded text-muted underline underline-offset-2 hover:text-text"
          >
            {SITE.phone}
          </a>
        </div>
      </div>

      <p className="mt-6 rounded border border-warn/25 bg-warn/10 px-4 py-3 text-xs text-warn">
        Status: {appointment.status}. This is a request, not a confirmed booking, until we get
        back to you.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/parts"
          className="focus-ring rounded border border-line bg-surface px-6 py-3 text-center text-sm font-semibold transition-colors hover:border-line-hi"
        >
          Shop parts for your car
        </Link>
        <Link
          href="/"
          className="focus-ring rounded border border-line bg-surface px-6 py-3 text-center text-sm font-semibold transition-colors hover:border-line-hi"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-6">
      <dt className="w-36 shrink-0 text-muted">{label}</dt>
      <dd className="font-medium whitespace-pre-line">{value}</dd>
    </div>
  );
}
