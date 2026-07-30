import Link from "next/link";
import { getVehicle, vehicleLabel } from "@/lib/garage";
import { searchCatalog, getCategoryNav } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { YmmSelector } from "@/components/YmmSelector";
import { ProductCard } from "@/components/ProductCard";
import { PartImage } from "@/components/PartImage";
import { VehicleQuickPick } from "@/components/VehicleQuickPick";
import { HeroMedia } from "@/components/HeroMedia";
import { SectionPhoto } from "@/components/SectionPhoto";
import { EngineGlyph } from "@/components/EngineGlyph";
import { formatCents } from "@/lib/money";
import { getSiteImages } from "@/lib/site-images";
import { GALLERY_SLOT } from "@/lib/image-slots";
import { SITE, HOURS_LABEL } from "@/lib/site";
import { getCopy } from "@/lib/content";
import { CopyText } from "@/components/CopyText";
import Image from "next/image";

export default async function HomePage() {
  const vehicle = await getVehicle();
  const copy = await getCopy();

  const [featured, departments, quickPicks, services, recentWork, merch] = await Promise.all([
    // "In stock now" and the fitment count are about parts. Merch has its own
    // strip further down the page.
    searchCatalog({ vehicle, kind: "PART", sort: "relevance", page: 1 }),
    getCategoryNav(vehicle, "PART"),
    // The chassis most likely to be on the lift.
    prisma.model.findMany({
      where: { chassis: { in: ["F80", "F82", "G80", "G82", "F87", "G20"] } },
      include: { make: true },
      orderBy: { yearStart: "desc" },
    }),
    prisma.service.findMany({
      where: { active: true, category: { in: ["TUNING", "PERFORMANCE"] } },
      orderBy: { sortOrder: "asc" },
      take: 4,
    }),
    getSiteImages(GALLERY_SLOT),
    searchCatalog({ vehicle: null, kind: "MERCH", sort: "newest", page: 1 }),
  ]);

  return (
    <>
      {/* ---------------------------------------------------------- hero -- */}
      <section className="relative border-b border-line">
        <HeroMedia />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-3xl">
            <p className="m-rule eyebrow text-[0.7rem] text-muted">
              {copy("home.hero.eyebrow")}
            </p>
            <h1 className="display mt-4 text-4xl leading-[0.95] text-balance sm:text-7xl">
              <CopyText>{copy("home.hero.headline")}</CopyText>
            </h1>
            <p className="mt-6 max-w-xl text-base text-pretty text-muted sm:text-lg">
              {copy("home.hero.subhead")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/book"
                className="focus-ring rounded bg-accent px-8 py-4 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
              >
                Book service
              </Link>
              <Link
                href="/parts"
                className="focus-ring rounded border border-line-hi px-8 py-4 text-sm font-bold tracking-widest uppercase transition-colors hover:bg-surface-2"
              >
                Shop parts
              </Link>
            </div>
          </div>

          {/* ---- YMM: the entry point to the whole store ---- */}
          <div className="mt-14 max-w-3xl rounded-card border border-line bg-surface/95 p-5 backdrop-blur sm:p-6">
            {vehicle ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="eyebrow text-[0.65rem] text-muted">Shopping for</p>
                  <p className="display mt-1.5 text-2xl">{vehicleLabel(vehicle)}</p>
                  <p className="mt-1 text-sm text-muted">
                    {featured.total} part{featured.total === 1 ? "" : "s"} confirmed to fit
                  </p>
                </div>
                <Link
                  href="/parts"
                  className="focus-ring shrink-0 rounded bg-accent px-7 py-3.5 text-center text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
                >
                  Browse parts
                </Link>
              </div>
            ) : (
              <>
                <p className="eyebrow mb-3 text-[0.65rem] text-muted">
                  Find parts that fit your car
                </p>
                <YmmSelector redirectTo="/parts" />
              </>
            )}
          </div>

          {!vehicle && quickPicks.length > 0 && (
            <div className="mt-6 max-w-3xl">
              <p className="mb-3 text-xs text-muted">Or jump straight to a chassis</p>
              <div className="flex flex-wrap gap-2">
                {quickPicks.map((m) => (
                  <VehicleQuickPick
                    key={m.id}
                    year={m.yearEnd}
                    makeId={m.makeId}
                    modelId={m.id}
                    label={m.chassis ? `${m.chassis} ${m.name}` : m.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------- platforms -- */}
      {/* Each tile is a shortcut into the catalog filtered to that engine. A
          tuner usually knows their platform before they know the part. */}
      <section className="border-b border-line bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className="rule-heading eyebrow mb-6 text-[0.7rem] text-muted">
            <span className="section-index">00</span>Shop by engine
          </p>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {SITE.platforms.map((p) => (
              <Link
                key={p.code}
                href={`/parts?engine=${p.codes.join(",")}`}
                /* 4:3 to match the engine photos rather than a fixed height,
                   which squashed them into a 2:1 slot and cut a third away. */
                className="focus-ring m-edge group relative flex aspect-4/3 flex-col justify-end overflow-hidden border border-line bg-surface transition-colors hover:border-field sm:aspect-[3/2]"
              >
                {/* Schematic underneath, photo on top when one exists.
                    SectionPhoto renders nothing for an empty slot, so a
                    platform without photography still gets a real drawing
                    rather than an empty black box. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 10px)",
                  }}
                />
                <EngineGlyph
                  turbos={p.turbos}
                  className="absolute top-1/2 right-3 w-[62%] max-w-56 -translate-y-[58%] text-muted/40 transition-transform duration-500 group-hover:scale-105"
                />
                <SectionPhoto
                  slot={p.slot}
                  alt=""
                  className="absolute inset-0"
                  imageClassName="opacity-80 transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-ink from-25% via-ink/45 to-transparent"
                />
                <span className="relative p-4">
                  <span className="display block text-3xl">{p.code}</span>
                  <span className="mt-1 block text-[0.7rem] leading-snug text-muted">
                    {p.blurb}
                  </span>
                  <span className="mt-2.5 block font-mono text-[0.65rem] tracking-widest text-muted uppercase transition-colors group-hover:text-text">
                    Shop {p.code} →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------- tuning split feature -- */}
      {/* First inversion. Coming straight off a black hero and a grid of dark
          engine tiles, this is the point the page needs to breathe, and a light
          band does more for that than any amount of extra padding. */}
      <section className="section-paper border-y border-line">
        <div className="mx-auto grid max-w-7xl items-stretch gap-0 lg:grid-cols-2">
          {/* 4:3 below the split, matching the photo's own shape, so a phone
              sees the whole frame. A fixed 18rem height at full width was a
              3.3:1 letterbox that threw away 59% of the picture. */}
          <SectionPhoto
            slot="section:service-tuning"
            alt="Custom tuning session in progress at ChanceBuilt Performance"
            className="aspect-4/3 sm:aspect-16/9 lg:aspect-auto lg:min-h-[30rem]"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="flex flex-col justify-center px-4 py-14 sm:px-8 lg:px-14">
            <p className="rule-heading eyebrow text-[0.7rem] text-muted"><span className="section-index">01</span>Tuning, in-house</p>
            <h2 className="display mt-3 text-2xl sm:text-4xl">
              <CopyText>{copy("home.tuning.heading")}</CopyText>
            </h2>
            <p className="mt-5 max-w-md text-sm text-pretty text-muted sm:text-base">
              {copy("home.tuning.body")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/book?service=custom-dyno-tune"
                className="focus-ring rounded bg-accent px-7 py-3.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
              >
                Book a tune
              </Link>
              <Link
                href="/services"
                className="focus-ring rounded border border-line-hi px-7 py-3.5 text-sm font-bold tracking-widest text-text uppercase transition-colors hover:bg-surface-2"
              >
                All services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ services -- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="rule-heading eyebrow text-[0.7rem] text-muted"><span className="section-index">02</span>In the shop</p>
            <h2 className="display mt-2 text-2xl sm:text-3xl">{copy("home.services.heading")}</h2>
          </div>
          <Link
            href="/services"
            className="focus-ring inline-block rounded py-2 text-sm font-semibold underline underline-offset-4 hover:text-muted"
          >
            All services →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <Link
              key={s.id}
              href={`/book?service=${s.slug}`}
              className="focus-ring group flex flex-col rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-hi"
            >
              <h3 className="text-sm font-bold">{s.name}</h3>
              <p className="mt-2 flex-1 text-sm text-muted">{s.blurb}</p>
              <p className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
                <span className="font-bold">
                  {s.priceFromCents != null ? `From ${formatCents(s.priceFromCents)}` : "Quote"}
                </span>
                <span className="text-muted transition-colors group-hover:text-text">Book →</span>
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- departments -- */}
      {/* Second inversion. The department marks are line drawings, and they
          read far better as ink on paper than as grey on black. */}
      <section className="section-paper border-y border-line">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 border-b border-line pb-5">
            <p className="rule-heading eyebrow text-[0.7rem] text-muted"><span className="section-index">03</span>Parts</p>
            <h2 className="display mt-2 text-2xl sm:text-3xl">{copy("home.departments.heading")}</h2>
            {vehicle && (
              <p className="mt-2 text-sm text-muted">
                Counts are what fits your {vehicleLabel(vehicle)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {departments.map((d) => (
              <Link
                key={d.id}
                href={`/parts?category=${d.slug}`}
                className="focus-ring group flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-5 text-center transition-colors hover:border-line-hi"
              >
                <PartImage
                  department={d.name}
                  className="h-14 w-14 rounded transition-transform group-hover:scale-110"
                />
                <div>
                  <p className="text-sm font-bold">{d.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{d.count}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ featured -- */}
      {featured.products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="rule-heading eyebrow text-[0.7rem] text-muted"><span className="section-index">04</span>Catalog</p>
              <h2 className="display mt-2 text-2xl sm:text-3xl">
                {vehicle ? `Fits your ${vehicle.chassis ?? vehicle.modelName}` : "In stock now"}
              </h2>
            </div>
            <Link
              href="/parts"
              className="focus-ring inline-block rounded py-2 text-sm font-semibold underline underline-offset-4 hover:text-muted"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.products.slice(0, 8).map((p, i) => (
              <ProductCard key={p.id} product={p} hasVehicle={!!vehicle} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- merch -- */}
      {merch.products.length > 0 && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
              <div>
                <p className="rule-heading eyebrow text-[0.7rem] text-muted">
                  <span className="section-index">05</span>Merch
                </p>
                <h2 className="display mt-2 text-2xl sm:text-3xl">{copy("home.merch.heading")}</h2>
                <p className="mt-2 text-sm text-muted">
                  {copy("home.merch.blurb")}
                </p>
              </div>
              <Link
                href="/merch"
                className="focus-ring inline-block rounded py-2 text-sm font-semibold underline underline-offset-4 hover:text-muted"
              >
                Shop merch →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {merch.products.slice(0, 4).map((p, i) => (
                <ProductCard key={p.id} product={p} hasVehicle={false} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --------------------------------------------------- recent work -- */}
      {recentWork.length > 0 && (
        <section className="border-t border-line bg-surface/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
              <div>
                <p className="rule-heading eyebrow text-[0.7rem] text-muted"><span className="section-index">06</span>Out of the shop</p>
                <h2 className="display mt-2 text-2xl sm:text-3xl">Recent work</h2>
              </div>
              <Link
                href="/gallery"
                className="focus-ring inline-block rounded py-2 text-sm font-semibold underline underline-offset-4 hover:text-muted"
              >
                Full gallery →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {recentWork.slice(0, 4).map((image) => (
                <Link
                  key={image.url}
                  href="/gallery"
                  className="focus-ring group relative aspect-4/3 overflow-hidden rounded-card border border-line"
                >
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    style={{ objectPosition: image.objectPosition }}
                    className="photo-bw object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/60 to-transparent p-3 pt-8 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100">
                    {image.caption ?? image.alt}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- CTA -- */}
      <section className="relative border-t border-line">
        <SectionPhoto
          slot="section:home-cta"
          alt=""
          className="absolute inset-0"
          imageClassName="opacity-45"
          sizes="100vw"
          scrim
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="display text-2xl sm:text-3xl">{copy("home.cta.heading")}</h2>
            <p className="mt-3 max-w-md text-sm text-muted">{copy("home.cta.body")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/book"
                className="focus-ring rounded bg-accent px-7 py-3.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
              >
                Book an appointment
              </Link>
              <a
                href={SITE.phoneHref}
                className="focus-ring rounded border border-line-hi px-7 py-3.5 text-sm font-bold tracking-widest uppercase transition-colors hover:bg-surface-2"
              >
                {SITE.phone}
              </a>
            </div>
          </div>

          <div className="rounded-card border border-line bg-surface/90 p-6 backdrop-blur">
            <p className="eyebrow mb-3 text-[0.65rem] text-muted">Hours</p>
            <dl className="space-y-2 text-sm">
              {HOURS_LABEL.map((h) => (
                <div key={h.days} className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
                  <dt className="text-muted">{h.days}</dt>
                  <dd className="font-medium">{h.time}</dd>
                </div>
              ))}
            </dl>
            <address className="mt-5 text-sm text-muted not-italic">
              {SITE.address.street}
              <br />
              {SITE.address.city}, {SITE.address.state} {SITE.address.zip}
            </address>
          </div>
        </div>
      </section>
    </>
  );
}
