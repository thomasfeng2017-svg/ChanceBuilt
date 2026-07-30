import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getVehicle, vehicleLabel } from "@/lib/garage";
import { upcomingDates, formatShopDate, BOOKING_HORIZON_DAYS } from "@/lib/booking";
import { BookingFlow } from "@/components/BookingFlow";
import { SectionPhoto } from "@/components/SectionPhoto";
import { SITE, HOURS_LABEL, addressLine } from "@/lib/site";
import { getCopy } from "@/lib/content";
import { CopyText } from "@/components/CopyText";

export const metadata: Metadata = {
  title: "Book a service",
  description:
    "Book tuning, performance installation, maintenance or diagnostics at ChanceBuilt Performance in Riverside, CA.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service: serviceSlug } = await searchParams;

  const [services, vehicle] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }],
    }),
    getVehicle(),
  ]);

  const copy = await getCopy();

  const initial = serviceSlug ? services.find((s) => s.slug === serviceSlug) : undefined;

  const days = (
    await upcomingDates(BOOKING_HORIZON_DAYS > 21 ? 21 : BOOKING_HORIZON_DAYS)
  ).map((d) => ({
    date: d.date,
    label: formatShopDate(d.date),
    open: d.open,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-10">
        <p className="m-rule eyebrow text-[0.7rem] text-muted">Riverside, California</p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">{copy("book.heading")}</h1>
        <p className="mt-3 max-w-xl text-sm text-muted">
          <CopyText>{copy("book.intro")}</CopyText>{" "}
          <a href={SITE.phoneHref} className="focus-ring rounded text-text underline underline-offset-2">
            {SITE.phone}
          </a>{" "}
          and we&apos;ll talk it through.
        </p>
      </header>

      <BookingFlow
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          blurb: s.blurb,
          description: s.description,
          category: s.category,
          priceFromCents: s.priceFromCents,
          priceNote: s.priceNote,
          durationMinutes: s.durationMinutes,
          requiresVehicle: s.requiresVehicle,
        }))}
        days={days}
        vehicle={vehicle}
        vehicleLabel={vehicle ? vehicleLabel(vehicle) : null}
        initialServiceId={initial?.id}
      />

      <aside className="mt-14 grid gap-6 overflow-hidden rounded-card border border-line bg-surface sm:grid-cols-[1fr_1fr_14rem]">
        <div className="p-6 sm:pr-0">
          <p className="eyebrow mb-2 text-[0.65rem] text-muted">Where</p>
          <address className="text-sm not-italic">
            {SITE.address.street}
            <br />
            {SITE.address.city}, {SITE.address.state} {SITE.address.zip}
          </address>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(addressLine)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring mt-2 inline-block rounded text-sm text-muted underline underline-offset-2 hover:text-text"
          >
            Open in Maps
          </a>
        </div>
        <div className="p-6 sm:pl-0">
          <p className="eyebrow mb-2 text-[0.65rem] text-muted">Hours</p>
          <dl className="space-y-1 text-sm">
            {HOURS_LABEL.map((h) => (
              <div key={h.days} className="flex justify-between gap-4">
                <dt className="text-muted">{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>

        <SectionPhoto
          slot="section:book-shop"
          alt="A customer car in for service at ChanceBuilt Performance"
          className="hidden min-h-[13rem] sm:block"
          sizes="14rem"
        />
      </aside>
    </div>
  );
}
