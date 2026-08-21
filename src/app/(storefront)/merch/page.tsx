import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { searchCatalog, getCategoryNav, PAGE_SIZE, type SortKey } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { SortSelect } from "@/components/SortSelect";
import { SectionPhoto } from "@/components/SectionPhoto";
import { bandPadding } from "@/lib/band-height";
import { Copy } from "@/components/Copy";

export const metadata: Metadata = {
  title: "Shop merch",
  description:
    "ChanceBuilt Performance hoodies, tees, hats and stickers. Shop apparel from the Riverside BMW specialists.",
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const VALID_SORTS: SortKey[] = ["relevance", "price-asc", "price-desc", "name-asc", "newest"];

/**
 * The merch storefront.
 *
 * Deliberately simpler than /parts: no vehicle picker, no fitment badges, no
 * brand facets. Nobody needs to know their chassis code to buy a t-shirt, and
 * every control that implies otherwise is friction.
 */
export default async function MerchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const sortParam = first(sp.sort);
  const sort: SortKey = VALID_SORTS.includes(sortParam as SortKey)
    ? (sortParam as SortKey)
    : "newest";

  const category = first(sp.category);
  const q = first(sp.q);
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const [result, categories] = await Promise.all([
    searchCatalog({ vehicle: null, kind: "MERCH", category, q, sort, page }),
    getCategoryNav(null, "MERCH"),
  ]);

  // Flatten the tree: merch is two departments deep at most, so a sidebar
  // would be more chrome than catalog. With a single top-level department the
  // parent chip is just "Everything" under another name, so it is dropped.
  const chips = categories.flatMap((parent) => [
    ...(categories.length > 1
      ? [{ slug: parent.slug, name: parent.name, count: parent.count }]
      : []),
    ...parent.children.map((c) => ({ slug: c.slug, name: c.name, count: c.count })),
  ]);

  const merchBand = await bandPadding("section:merch-banner");

  const pageUrl = (n: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      const v = first(value);
      if (v) next.set(key, v);
    }
    if (n <= 1) next.delete("page");
    else next.set("page", String(n));
    return `/merch${next.toString() ? `?${next}` : ""}`;
  };

  const firstIndex = (result.page - 1) * PAGE_SIZE + 1;
  const lastIndex = Math.min(result.page * PAGE_SIZE, result.total);

  return (
    <>
      <div className="relative border-b border-line">
        <SectionPhoto
          slot="section:merch-banner"
          alt=""
          className="absolute inset-0"
          imageClassName="opacity-40"
          sizes="100vw"
          priority
          scrim
        />
        <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 ${merchBand}`}>
          <p className="m-rule eyebrow text-[0.7rem] text-muted">
            <Copy k="merch.banner.eyebrow" />
          </p>
          <h1 className="display mt-2 text-3xl sm:text-5xl">
            <Copy k="merch.banner.heading" />
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted">
            <Copy k="merch.banner.blurb" />
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {q && (
          <h2 className="display mb-6 text-2xl sm:text-3xl">Results for &ldquo;{q}&rdquo;</h2>
        )}

        {chips.length > 1 && (
          <nav aria-label="Merch categories" className="mb-8 flex flex-wrap gap-2">
            <CategoryChip href="/merch" active={!category}>
              Everything
            </CategoryChip>
            {chips.map((c) => (
              <CategoryChip
                key={c.slug}
                href={`/merch?category=${c.slug}`}
                active={category === c.slug}
              >
                {c.name}{" "}
                <span className="text-muted tabular-nums">{c.count}</span>
              </CategoryChip>
            ))}
          </nav>
        )}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <p className="text-sm text-muted">
            {result.total === 0 ? (
              "Nothing here yet"
            ) : (
              <>
                <span className="font-semibold text-text tabular-nums">
                  {firstIndex}&ndash;{lastIndex}
                </span>{" "}
                of <span className="font-semibold text-text tabular-nums">{result.total}</span>{" "}
                item{result.total === 1 ? "" : "s"}
              </>
            )}
          </p>
          <Suspense fallback={null}>
            <SortSelect defaultSort="newest" />
          </Suspense>
        </div>

        {result.products.length === 0 ? (
          <div className="rounded-card border border-line bg-surface px-6 py-16 text-center">
            <p className="text-base font-bold">No merch matches that</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Try clearing the filter, or have a look at{" "}
              <Link href="/parts" className="focus-ring rounded underline underline-offset-2 hover:text-text">
                the parts catalog
              </Link>
              .
            </p>
            <Link
              href="/merch"
              className="focus-ring mt-6 inline-block rounded-lg border border-line bg-surface-2 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-muted/40"
            >
              Show all merch
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {result.products.map((p, i) => (
                <ProductCard key={p.id} product={p} hasVehicle={false} index={i} />
              ))}
            </div>

            {result.pageCount > 1 && (
              <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
                {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
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
                ))}
              </nav>
            )}
          </>
        )}
      </div>
    </>
  );
}

function CategoryChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`focus-ring rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-line bg-surface text-muted hover:border-line-hi hover:text-text"
      }`}
    >
      {children}
    </Link>
  );
}
