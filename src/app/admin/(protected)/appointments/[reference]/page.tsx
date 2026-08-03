import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canWrite } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { formatShopDateTime } from "@/lib/booking";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { setAppointmentStatusAction } from "../../ops-actions";

export const metadata = { title: "Appointment" };

const STATUSES = ["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const [{ reference }, user] = await Promise.all([params, requireUser("VIEWER")]);

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
    <div>
      <nav className="mb-4 text-sm text-muted">
        <Link href="/admin/appointments" className="focus-ring rounded hover:text-text">
          ← Appointments
        </Link>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-2xl">{appointment.customerName}</h1>
          <p className="mt-1 font-mono text-sm text-muted">{appointment.reference}</p>
        </div>
        <StatusSelect
          id={appointment.id}
          current={appointment.status}
          options={STATUSES}
          action={setAppointmentStatusAction}
          disabled={!canWrite(user.role)}
        />
      </header>

      {appointment.status === "REQUESTED" && (
        <p className="mb-6 rounded border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          Not confirmed yet. The customer is expecting a call or email back.
        </p>
      )}

      <dl className="divide-y divide-line rounded-card border border-line bg-surface text-sm">
        <Row label="Service" value={appointment.service.name} />
        <Row label="When" value={formatShopDateTime(appointment.startsAt)} />
        <Row
          label="Time needed"
          value={`${appointment.service.durationMinutes} minutes`}
        />
        <Row
          label="Price"
          value={
            appointment.service.priceFromCents != null
              ? `From ${formatCents(appointment.service.priceFromCents)}`
              : (appointment.service.priceNote ?? "Quote")
          }
        />
        {vehicle && <Row label="Vehicle" value={vehicle} />}
        <Row label="Phone" value={appointment.phone} href={`tel:${appointment.phone}`} />
        <Row label="Email" value={appointment.email} href={`mailto:${appointment.email}`} />
        {appointment.notes && <Row label="Notes" value={appointment.notes} />}
        <Row
          label="Booked"
          value={new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(appointment.createdAt)}
        />
      </dl>
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:gap-6">
      <dt className="w-32 shrink-0 text-muted">{label}</dt>
      <dd className="font-medium whitespace-pre-line">
        {href ? (
          <a href={href} className="focus-ring rounded hover:text-muted">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
