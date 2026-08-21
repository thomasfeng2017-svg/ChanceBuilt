import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser, canWrite } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { ServiceRowActions } from "@/components/admin/ServiceRowActions";

export const metadata = { title: "Services" };

const CATEGORY_LABEL: Record<string, string> = {
  TUNING: "Tuning & ECU",
  PERFORMANCE: "Performance install",
  MAINTENANCE: "Maintenance",
  FABRICATION: "Fabrication & builds",
  DIAGNOSTIC: "Diagnostics",
};

function durationLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr${h === 1 ? "" : "s"}`;
}

export default async function ServicesAdminPage() {
  const user = await requireUser("VIEWER");
  const writable = canWrite(user.role);

  const services = await prisma.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { appointments: true } } },
  });

  const live = services.filter((s) => s.active);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display mb-1 text-xl">Services</h1>
          <p className="text-sm text-muted">
            What customers can book, what it costs and how long it takes.{" "}
            {live.length} of {services.length} bookable.
          </p>
        </div>
        {writable && (
          <Link
            href="/admin/services/new"
            className="focus-ring rounded bg-accent px-5 py-2.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
          >
            Add service
          </Link>
        )}
      </div>

      {/* Said once, at the top, because it is the thing most likely to be
          changed without realising the consequence. */}
      <p className="mb-6 rounded-card border border-line bg-surface px-4 py-3 text-sm text-muted">
        Appointment length controls which time slots customers are offered.
        Changing it changes the booking calendar.
      </p>

      {services.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          No services yet.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {services.map((s, i) => (
            <li
              key={s.id}
              className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 ${
                s.active ? "" : "opacity-55"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <Link
                    href={`/admin/services/${s.id}`}
                    className="focus-ring rounded font-semibold hover:text-accent-text"
                  >
                    {s.name}
                  </Link>
                  {!s.active && (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide text-muted uppercase">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {CATEGORY_LABEL[s.category] ?? s.category} · {durationLabel(s.durationMinutes)}
                  {s._count.appointments > 0 &&
                    ` · ${s._count.appointments} booking${s._count.appointments === 1 ? "" : "s"}`}
                </p>
              </div>

              <span className="text-sm font-semibold whitespace-nowrap">
                {s.priceFromCents === null ? (
                  <span className="text-muted">Quote only</span>
                ) : (
                  formatCents(s.priceFromCents)
                )}
              </span>

              {writable && (
                <ServiceRowActions
                  serviceId={s.id}
                  active={s.active}
                  isFirst={i === 0}
                  isLast={i === services.length - 1}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
