import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { SectionPhoto } from "@/components/SectionPhoto";
import { SITE } from "@/lib/site";
import { bandPadding } from "@/lib/band-height";
import { Copy } from "@/components/Copy";
import { SERVICE_CATEGORIES, serviceCategoryBlurbKey } from "@/lib/service-categories";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Custom tuning, turbo and bolt-on upgrades, brakes, suspension and drivetrain work, and maintenance for turbocharged BMWs in Riverside, CA.",
};

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hrs`;
}

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }],
  });

  const servicesBand = await bandPadding("section:services-header");

  const grouped = services.reduce<Record<string, typeof services>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <>
      {/* Header band — the shop, not a stock photo. */}
      <div className="relative border-b border-line">
        <SectionPhoto
          slot="section:services-header"
          alt=""
          className="absolute inset-0"
          imageClassName="opacity-55"
          sizes="100vw"
          priority
          scrim
        />
        {/* Band height is set per photo in the admin. */}
        <div className={`relative mx-auto max-w-6xl px-4 sm:px-6 ${servicesBand}`}>
          <p className="m-rule eyebrow text-[0.7rem] text-muted">
            <Copy k="services.eyebrow" />
          </p>
          <h1 className="display mt-2 text-3xl sm:text-5xl">
            <Copy k="services.heading" />
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm text-pretty text-muted sm:text-base">
          <Copy k="services.intro" />
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/book"
            className="focus-ring rounded bg-accent px-7 py-3.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
          >
            Book a service
          </Link>
          <a
            href={SITE.phoneHref}
            className="focus-ring rounded border border-line bg-surface px-7 py-3.5 text-sm font-bold tracking-widest uppercase transition-colors hover:border-line-hi"
          >
            {SITE.phone}
          </a>
        </div>
      </header>

      <div className="mt-14 space-y-14">
        {SERVICE_CATEGORIES.filter((c) => grouped[c.value]?.length).map((copy) => {
          const category = copy.value;
          return (
            <section key={category}>
              <div className="mb-5 flex flex-col gap-5 border-b border-line pb-5 sm:flex-row sm:items-center">
                <SectionPhoto
                  slot={copy.slot}
                  alt={copy.title}
                  /* 4:3 at both sizes. A square thumbnail cropped a quarter off
                     every service photo for no reason. */
                  className="aspect-4/3 w-full shrink-0 rounded-card border border-line sm:w-48"
                  sizes="(max-width: 640px) 100vw, 10rem"
                />
                <div>
                  <h2 className="display text-xl sm:text-2xl">{copy.title}</h2>
                  <p className="mt-1.5 max-w-2xl text-sm text-muted">
                    <Copy k={serviceCategoryBlurbKey(category)} />
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {grouped[category].map((s) => (
                  <article
                    key={s.id}
                    className="flex flex-col rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-hi"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-base font-bold">{s.name}</h3>
                      <p className="shrink-0 text-right">
                        <span className="block text-sm font-bold">
                          {s.priceFromCents != null
                            ? formatCents(s.priceFromCents)
                            : "Quote"}
                        </span>
                        <span className="block text-[0.7rem] text-muted">
                          {s.priceFromCents != null ? (s.priceNote ?? "starting") : "after review"}
                        </span>
                      </p>
                    </div>

                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                      {s.description}
                    </p>

                    <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
                      <span className="text-xs text-muted">
                        {durationLabel(s.durationMinutes)} in the shop
                      </span>
                      <Link
                        href={`/book?service=${s.slug}`}
                        className="focus-ring rounded border border-line-hi px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors hover:bg-accent hover:text-accent-fg"
                      >
                        Book
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Platforms. Inverted: five identically-shaped service blocks in a row
          need a hard stop at the end, and a light band does that better than
          another bordered card on the same black. */}
      <section className="section-paper mt-16 border border-line p-6 sm:p-8">
        <p className="m-rule eyebrow text-[0.7rem] text-muted">
          <Copy k="services.platforms.eyebrow" />
        </p>
        <h2 className="display mt-2 text-xl sm:text-2xl">
          <Copy k="services.platforms.heading" />
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          <Copy k="services.platforms.blurb" />
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SITE.platforms.map((p) => (
            <Link
              key={p.code}
              href={`/parts?engine=${p.codes.join(",")}`}
              className="focus-ring m-edge group rounded border border-line bg-surface p-4 transition-colors hover:border-line-hi"
            >
              <p className="display text-2xl">{p.code}</p>
              <p className="mt-1.5 text-xs text-muted">{p.blurb}</p>
              <p className="mt-2.5 font-mono text-[0.65rem] tracking-widest text-muted uppercase transition-colors group-hover:text-text">
                Shop {p.code} →
              </p>
            </Link>
          ))}
        </div>
      </section>
      </div>
    </>
  );
}
