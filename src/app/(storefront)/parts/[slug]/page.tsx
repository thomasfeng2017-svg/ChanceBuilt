import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getVehicle, vehicleLabel } from "@/lib/garage";
import { formatCents } from "@/lib/money";
import { departmentOf } from "@/lib/catalog";
import { PartImage } from "@/components/PartImage";
import { AddToCart } from "@/components/AddToCart";
import { YmmSelector } from "@/components/YmmSelector";

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: { include: { parent: true } },
      fitments: {
        include: { make: true, model: true },
        orderBy: [{ make: { name: "asc" } }, { model: { name: "asc" } }, { yearStart: "asc" }],
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Part not found" };
  return {
    title: `${product.brand.name} ${product.name}`,
    description: product.description.slice(0, 155),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, vehicle] = await Promise.all([getProduct(slug), getVehicle()]);

  if (!product || product.archived) notFound();
  // Merch has its own page, without the fitment apparatus.
  if (product.category.kind === "MERCH") redirect(`/merch/${product.slug}`);

  // Fitment check against the garage vehicle.
  const matchingFitment = vehicle
    ? product.fitments.find(
        (f) =>
          f.modelId === vehicle.modelId &&
          f.yearStart <= vehicle.year &&
          f.yearEnd >= vehicle.year,
      )
    : undefined;
  const fits = product.isUniversal || !!matchingFitment;

  // Only block adding to the cart when we KNOW it doesn't fit, which means a
  // vehicle is selected and nothing matched. With no vehicle chosen we have no
  // basis to stop anyone buying, and blocking there would quietly kill sales to
  // every customer who skipped the vehicle picker.
  const knownMisfit = !!vehicle && !fits;

  // Group fitment rows by make for the compatibility table.
  const byMake = new Map<string, typeof product.fitments>();
  for (const f of product.fitments) {
    const list = byMake.get(f.make.name) ?? [];
    list.push(f);
    byMake.set(f.make.name, list);
  }

  const onSale = product.compareAtCents != null && product.compareAtCents > product.priceCents;
  const department = departmentOf(product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <Link href="/parts" className="focus-ring rounded hover:text-text">All parts</Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/parts?category=${product.category.parent?.slug ?? product.category.slug}`}
          className="focus-ring rounded hover:text-text"
        >
          {department}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-text">{product.category.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* ------------------------------------------------------ image -- */}
        <div>
          <PartImage
            department={department}
            src={product.images[0] ?? null}
            alt={`${product.brand.name} ${product.name}`}
            priority
            fit={product.imageFit === "COVER" ? "cover" : "contain"}
            zoom={product.imageZoom}
            className="aspect-4/3 max-h-[24rem] w-full rounded-card border border-line lg:aspect-square lg:max-h-none"
          />

          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((img) => (
                <PartImage
                  key={img}
                  department={department}
                  src={img}
                  alt={product.name}
                  fit={product.imageFit === "COVER" ? "cover" : "contain"}
                  zoom={product.imageZoom}
                  className="aspect-square w-full rounded border border-line"
                />
              ))}
            </div>
          )}
        </div>

        {/* -------------------------------------------------- buy panel -- */}
        <div>
          <p className="text-xs font-bold tracking-widest text-accent-text uppercase">
            {product.brand.name}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>
              SKU <span className="font-mono text-text">{product.sku}</span>
            </span>
            {product.partNumber && (
              <span>
                Part # <span className="font-mono text-text">{product.partNumber}</span>
              </span>
            )}
          </div>

          {/* Fitment verdict — the single most important thing on this page. */}
          <div className="mt-6">
            {!vehicle ? (
              <div className="rounded-card border border-line bg-surface p-4">
                <p className="text-sm font-semibold">
                  Will this fit your vehicle?
                </p>
                <p className="mt-1 mb-3.5 text-sm text-muted">
                  Select your year, make and model and we&apos;ll check instantly.
                </p>
                <YmmSelector layout="stack" redirectTo={`/parts/${product.slug}`} />
              </div>
            ) : fits ? (
              <div className="flex items-start gap-3 rounded-card border border-good/30 bg-good/10 p-4">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-good" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-good">
                    Fits your {vehicleLabel(vehicle)}
                  </p>
                  {product.isUniversal ? (
                    <p className="mt-0.5 text-sm text-muted">
                      This is a universal part. It fits any vehicle.
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted">
                      Verified for {matchingFitment!.yearStart}–{matchingFitment!.yearEnd}{" "}
                      {matchingFitment!.make.name} {matchingFitment!.model.name}
                      {matchingFitment!.submodel ? ` ${matchingFitment!.submodel}` : ""}
                      {matchingFitment!.engine ? `, ${matchingFitment!.engine}` : ""}.
                    </p>
                  )}
                  {matchingFitment?.notes && (
                    <p className="mt-1.5 text-sm font-medium text-warn">
                      Note: {matchingFitment.notes}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-card border border-bad/30 bg-bad/10 p-4">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-bad" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-bad">
                    Does not fit your {vehicleLabel(vehicle)}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    Check the compatibility list below, or{" "}
                    <Link href="/parts" className="focus-ring rounded underline underline-offset-2 hover:text-text">
                      browse parts that do fit
                    </Link>
                    .
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Price + stock */}
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold">{formatCents(product.priceCents)}</span>
            {onSale && (
              <>
                <span className="text-lg text-muted line-through">
                  {formatCents(product.compareAtCents!)}
                </span>
                <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent-text">
                  Save {formatCents(product.compareAtCents! - product.priceCents)}
                </span>
              </>
            )}
          </div>

          <p className="mt-2 text-sm">
            {product.stock > 10 ? (
              <span className="font-medium text-good">In stock, ships today</span>
            ) : product.stock > 0 ? (
              <span className="font-medium text-warn">
                Only {product.stock} left in stock
              </span>
            ) : (
              <span className="font-medium text-bad">Out of stock</span>
            )}
          </p>

          <div className="mt-6">
            <AddToCart productId={product.id} stock={product.stock} fits={!knownMisfit} />
          </div>

          <div className="mt-6 rounded-card border border-line bg-surface p-4 text-sm text-muted">
            <p className="mb-2 font-semibold text-text">Description</p>
            <p className="leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------- fitment table -- */}
      <section className="mt-14">
        <h2 className="text-xl font-extrabold tracking-tight">Vehicle compatibility</h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          {product.isUniversal
            ? "This is a universal part and is not vehicle-specific."
            : `Confirmed fitment across ${product.fitments.length} vehicle range${
                product.fitments.length === 1 ? "" : "s"
              }. Years are inclusive.`}
        </p>

        {product.isUniversal ? (
          <div className="rounded-card border border-line bg-surface px-5 py-8 text-center text-sm text-muted">
            Fits any vehicle. Check the description for size or specification details.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-surface-2 text-left">
                <tr className="text-xs font-bold tracking-widest text-muted uppercase">
                  <th scope="col" className="px-4 py-3">Make</th>
                  <th scope="col" className="px-4 py-3">Model</th>
                  <th scope="col" className="px-4 py-3">Years</th>
                  <th scope="col" className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {[...byMake.entries()].map(([makeName, rows]) =>
                  rows.map((f, i) => {
                    const isMatch =
                      vehicle &&
                      f.modelId === vehicle.modelId &&
                      f.yearStart <= vehicle.year &&
                      f.yearEnd >= vehicle.year;
                    return (
                      <tr
                        key={f.id}
                        className={isMatch ? "bg-good/10" : undefined}
                      >
                        <td className="px-4 py-3 font-semibold">
                          {i === 0 ? makeName : ""}
                        </td>
                        <td className="px-4 py-3">
                          {f.model.name}
                          {isMatch && (
                            <span className="ml-2 rounded bg-good/20 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide text-good uppercase">
                              Your vehicle
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {f.yearStart}–{f.yearEnd}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {[f.submodel, f.engine, f.notes].filter(Boolean).join(" · ") || "-"}
                        </td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-muted">
          Fitment data is provided as a guide. Always confirm against your VIN or the part number
          on the component you are replacing.
        </p>
      </section>
    </div>
  );
}
