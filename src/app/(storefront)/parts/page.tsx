import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getVehicle, vehicleLabel } from "@/lib/garage";
import {
  searchCatalog,
  getCategoryNav,
  searchTermWhere,
  PAGE_SIZE,
  type SortKey,
} from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { FilterSidebar } from "@/components/FilterSidebar";
import { SortSelect } from "@/components/SortSelect";
import { YmmSelector } from "@/components/YmmSelector";
import { SectionPhoto } from "@/components/SectionPhoto";
import { SITE } from "@/lib/site";
import { bandPadding } from "@/lib/band-height";
import { Copy } from "@/components/Copy";
import { engineBannerSlot } from "@/lib/image-slots";

export const metadata: Metadata = { title: "Parts catalog" };

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const VALID_SORTS: SortKey[] = ["relevance", "price-asc", "price-desc", "name-asc", "newest"];

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const vehicle = await getVehicle();

  const sortParam = first(sp.sort);
  const sort: SortKey = VALID_SORTS.includes(sortParam as SortKey)
    ? (sortParam as SortKey)
    : "relevance";

  const category = first(sp.category);
  const q = first(sp.q);
  // "S55" or "N54,N55". Matched against the engine codes on each chassis.
  const engines = (first(sp.engine) ?? "")
    .split(",")
    .map((e) => e.trim().toUpperCase())
    .filter(Boolean);
  const enginePlatform = SITE.platforms.find(
    (p) => p.codes.join(",") === engines.join(","),
  );
  const brands = (first(sp.brands) ?? "").split(",").filter(Boolean);
  const min = Number(first(sp.min));
  const max = Number(first(sp.max));
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const inStockOnly = first(sp.inStock) === "1";
  const hideUniversal = first(sp.hideUniversal) === "1";

  const filters = {
    vehicle,
    kind: "PART" as const,
    category,
    brands,
    engines,
    q,
    minCents: Number.isFinite(min) && min > 0 ? min : undefined,
    maxCents: Number.isFinite(max) && max > 0 ? max : undefined,
    inStockOnly,
    hideUniversal,
    sort,
    page,
  };

  const [result, categories, merchHits] = await Promise.all([
    searchCatalog(filters),
    getCategoryNav(vehicle, "PART"),
    // Searching the parts catalog for "hoodie" now finds nothing, which would
    // read as "they don't sell one". Count the merch side so we can point at it.
    q
      ? prisma.product.count({
          where: {
            AND: [{ category: { kind: "MERCH" } }, { archived: false }, searchTermWhere(q)],
          },
        })
      : 0,
  ]);

  const partsBand = await bandPadding("section:parts-banner");

  // Rebuild the query string for filter links (drops nothing, resets page).
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    const v = first(value);
    if (v) params.set(key, v);
  }

  const activeCategoryName =
    categories.find((c) => c.slug === category)?.name ??
    categories.flatMap((c) => c.children).find((c) => c.slug === category)?.name;

  const pageUrl = (n: number) => {
    const next = new URLSearchParams(params.toString());
    if (n <= 1) next.delete("page");
    else next.set("page", String(n));
    return `/parts${next.toString() ? `?${next}` : ""}`;
  };

  const firstIndex = (result.page - 1) * PAGE_SIZE + 1;
  const lastIndex = Math.min(result.page * PAGE_SIZE, result.total);

  return (
    <>
      {/* Engine platform banner, when arriving from one of the platform tiles. */}
      {enginePlatform && (
        <div className="relative border-b border-line">
          <SectionPhoto
            slot={engineBannerSlot(enginePlatform.slot)}
            fallbackSlot={enginePlatform.slot}
            alt=""
            className="absolute inset-0"
            imageClassName="opacity-45"
            sizes="100vw"
            priority
            scrim
          />
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="m-rule eyebrow text-[0.7rem] text-muted">Engine platform</p>
            <h1 className="display mt-2 text-4xl sm:text-6xl">{enginePlatform.code}</h1>
            <p className="mt-3 max-w-lg text-sm text-muted">{enginePlatform.blurb}</p>
            <p className="mt-4 text-sm">
              <span className="font-bold">{result.total}</span> part
              {result.total === 1 ? "" : "s"} for this platform.{" "}
              <Link
                href="/parts"
                className="focus-ring rounded text-muted underline underline-offset-2 hover:text-text"
              >
                Show everything
              </Link>
            </p>
          </div>
        </div>
      )}

      {!q && !category && !enginePlatform && (
        <div className="relative border-b border-line">
          <SectionPhoto
            slot="section:parts-banner"
            alt=""
            className="absolute inset-0"
            imageClassName="opacity-40"
            sizes="100vw"
            scrim
          />
          <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 ${partsBand}`}>
            <p className="m-rule eyebrow text-[0.7rem] text-muted">
              <Copy k="parts.banner.eyebrow" />
            </p>
            <h1 className="display mt-2 text-3xl sm:text-4xl">
              <Copy k="parts.banner.heading" />
            </h1>
            <p className="mt-3 max-w-lg text-sm text-muted">
              <Copy k="parts.banner.blurb" />
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        {(q || category) && (
          <h1 className="display text-2xl sm:text-3xl">
            {q ? `Results for “${q}”` : activeCategoryName}
          </h1>
        )}
        <p className="mt-1.5 text-sm text-muted">
          {enginePlatform ? (
            <>
              Every part we list for the{" "}
              <span className="font-semibold text-text">{enginePlatform.code}</span>.
              Universal items like oil and tools are not included.
            </>
          ) : vehicle ? (
            <>
              Showing parts that fit your{" "}
              <span className="font-semibold text-text">{vehicleLabel(vehicle)}</span>
            </>
          ) : (
            <>Showing the full catalog. Select a vehicle to filter by fitment</>
          )}
        </p>
      </div>

      {merchHits > 0 && (
        <p className="mb-6 rounded-card border border-line bg-surface px-4 py-3 text-sm text-muted">
          {merchHits} match{merchHits === 1 ? "" : "es"} for &ldquo;{q}&rdquo; in{" "}
          <Link
            href={`/merch?q=${encodeURIComponent(q!)}`}
            className="focus-ring rounded font-semibold text-text underline underline-offset-2"
          >
            shop merch
          </Link>
          .
        </p>
      )}

      {!vehicle && (
        <div className="mb-7 rounded-card border border-accent/25 bg-accent/[0.06] p-5">
          <p className="mb-3 text-sm font-semibold">
            Narrow this down to parts that actually fit
          </p>
          <Suspense fallback={null}>
            <YmmSelector redirectTo="/parts" />
          </Suspense>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        {/* Below lg the grid stacks, so the filters are ordered *after* the
            products and collapsed behind a disclosure — otherwise a customer on
            a phone scrolls through 40 filter links before seeing a single part. */}
        <div className="order-2 lg:order-1 lg:sticky lg:top-56 lg:self-start">
          <details className="rounded-card border border-line bg-surface p-4 lg:hidden">
            <summary className="focus-ring cursor-pointer list-none rounded text-sm font-bold tracking-widest text-muted uppercase">
              Filters &amp; categories
            </summary>
            <div className="mt-5">
              <FilterSidebar
                categories={categories}
                brandFacets={result.brandFacets}
                params={params}
                hasVehicle={!!vehicle}
              />
            </div>
          </details>

          <div className="hidden lg:block">
            <FilterSidebar
              categories={categories}
              brandFacets={result.brandFacets}
              params={params}
              hasVehicle={!!vehicle}
            />
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p className="text-sm text-muted">
              {result.total === 0 ? (
                "No parts found"
              ) : (
                <>
                  <span className="font-semibold text-text tabular-nums">
                    {firstIndex}–{lastIndex}
                  </span>{" "}
                  of <span className="font-semibold text-text tabular-nums">{result.total}</span>{" "}
                  part{result.total === 1 ? "" : "s"}
                </>
              )}
            </p>
            <Suspense fallback={null}>
              <SortSelect />
            </Suspense>
          </div>

          {result.products.length === 0 ? (
            <EmptyState hasVehicle={!!vehicle} vehicleName={vehicle ? vehicleLabel(vehicle) : null} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.products.map((p, i) => (
                  <ProductCard key={p.id} product={p} hasVehicle={!!vehicle} index={i} />
                ))}
              </div>

              {result.pageCount > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-10 flex items-center justify-center gap-1.5"
                >
                  <PageLink href={pageUrl(result.page - 1)} disabled={result.page === 1}>
                    ← Prev
                  </PageLink>
                  {Array.from({ length: result.pageCount }, (_, i) => i + 1)
                    .filter(
                      (n) =>
                        n === 1 ||
                        n === result.pageCount ||
                        Math.abs(n - result.page) <= 1,
                    )
                    .map((n, i, arr) => (
                      <span key={n} className="flex items-center gap-1.5">
                        {i > 0 && arr[i - 1] !== n - 1 && (
                          <span className="px-1 text-muted">…</span>
                        )}
                        <Link
                          href={pageUrl(n)}
                          aria-current={n === result.page ? "page" : undefined}
                          className={`focus-ring flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors ${
                            n === result.page
                              ? "border-accent bg-accent text-accent-fg"
                              : "border-line bg-surface text-muted hover:border-muted/40 hover:text-text"
                          }`}
                        >
                          {n}
                        </Link>
                      </span>
                    ))}
                  <PageLink
                    href={pageUrl(result.page + 1)}
                    disabled={result.page === result.pageCount}
                  >
                    Next →
                  </PageLink>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  // Disabled controls are exempt from WCAG 1.4.3, but the previous
  // muted/40 on line/50 measured 1.03:1, which is not "dimmed", it is gone.
  if (disabled) {
    return (
      <span className="flex h-9 items-center rounded-lg border border-line px-3 text-sm font-semibold text-muted/70">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="focus-ring flex h-9 items-center rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-muted transition-colors hover:border-muted/40 hover:text-text"
    >
      {children}
    </Link>
  );
}

function EmptyState({
  hasVehicle,
  vehicleName,
}: {
  hasVehicle: boolean;
  vehicleName: string | null;
}) {
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-16 text-center">
      <svg
        viewBox="0 0 24 24"
        className="mx-auto mb-4 h-11 w-11 text-muted/40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <p className="text-base font-bold">No parts match those filters</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {hasVehicle
          ? `We don't stock anything matching that combination for a ${vehicleName}. Try clearing a filter, or browse a different department.`
          : "Try a different search term, or clear some filters."}
      </p>
      <Link
        href="/parts"
        className="focus-ring mt-6 inline-block rounded-lg border border-line bg-surface-2 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-muted/40"
      >
        Clear all filters
      </Link>
    </div>
  );
}
