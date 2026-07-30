import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatShopDateTime } from "@/lib/booking";

export const metadata = { title: "Appointments" };

const VIEWS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "requested", label: "Needs confirming" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
] as const;

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ view = "upcoming" }] = await Promise.all([searchParams, requireUser("VIEWER")]);

  const now = new Date();
  const where: Prisma.AppointmentWhereInput =
    view === "requested"
      ? { status: "REQUESTED" }
      : view === "past"
        ? { startsAt: { lt: now } }
        : view === "all"
          ? {}
          : { startsAt: { gte: now }, status: { in: ["REQUESTED", "CONFIRMED"] } };

  const appointments = await prisma.appointment.findMany({
    where,
    include: { service: true },
    orderBy: { startsAt: view === "past" ? "desc" : "asc" },
    take: 100,
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="display text-2xl">Appointments</h1>
        <p className="mt-1 text-sm text-muted">
          {appointments.length} appointment{appointments.length === 1 ? "" : "s"}
        </p>
      </header>

      <nav className="mb-5 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "upcoming" ? "/admin/appointments" : `/admin/appointments?view=${v.key}`}
            className={`focus-ring rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === v.key
                ? "bg-accent text-accent-fg"
                : "border border-line text-muted hover:border-line-hi hover:text-text"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {appointments.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-14 text-center text-sm text-muted">
          Nothing here.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {appointments.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/appointments/${a.reference}`}
                className="focus-ring flex flex-wrap items-center gap-x-4 gap-y-1 p-4 transition-colors hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{a.customerName}</span>
                  <span className="block text-xs text-muted">
                    {a.service.name}
                    {a.vehicleModel &&
                      ` · ${[a.vehicleYear, a.vehicleMake, a.vehicleModel, a.vehicleChassis && `(${a.vehicleChassis})`].filter(Boolean).join(" ")}`}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm">{formatShopDateTime(a.startsAt)}</span>
                  <span
                    className={`block text-[0.65rem] font-bold tracking-widest uppercase ${
                      a.status === "REQUESTED"
                        ? "text-warn"
                        : a.status === "CANCELLED"
                          ? "text-bad"
                          : "text-muted"
                    }`}
                  >
                    {a.status}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
