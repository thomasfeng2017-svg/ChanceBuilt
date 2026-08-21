import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canWrite } from "@/lib/auth";
import { ServiceForm } from "@/components/admin/ServiceForm";

export const metadata = { title: "Edit service" };

export default async function EditServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [user, { id }, { created }] = await Promise.all([
    requireUser("VIEWER"),
    params,
    searchParams,
  ]);

  const service = await prisma.service.findUnique({
    where: { id },
    include: { _count: { select: { appointments: true } } },
  });
  if (!service) notFound();

  return (
    <div>
      <Link
        href="/admin/services"
        className="focus-ring mb-4 inline-block rounded text-sm text-muted hover:text-text"
      >
        ← Services
      </Link>

      <h1 className="display text-xl">{service.name}</h1>
      <p className="mt-1 mb-6 font-mono text-sm text-muted">
        /book?service={service.slug}
      </p>

      {created && (
        <p className="mb-6 rounded border border-good/30 bg-good/10 px-4 py-3 text-sm font-medium text-good">
          Service created. It&apos;s live on the site now.
        </p>
      )}

      {service._count.appointments > 0 && (
        <p className="mb-6 rounded-card border border-line bg-surface px-4 py-3 text-sm text-muted">
          {service._count.appointments} appointment
          {service._count.appointments === 1 ? " has" : "s have"} been booked against
          this service. Changing the length only affects new bookings, not ones
          already in the calendar.
        </p>
      )}

      <ServiceForm
        readOnly={!canWrite(user.role)}
        initial={{
          id: service.id,
          name: service.name,
          blurb: service.blurb,
          description: service.description,
          category: service.category,
          // Cents back to the dollars-and-cents string the form expects.
          priceFrom:
            service.priceFromCents === null
              ? ""
              : (service.priceFromCents / 100).toFixed(2),
          priceNote: service.priceNote ?? "",
          durationMinutes: service.durationMinutes,
          requiresVehicle: service.requiresVehicle,
          active: service.active,
          sortOrder: service.sortOrder,
        }}
      />
    </div>
  );
}
