import Link from "next/link";
import type { getCategoryNav } from "@/lib/catalog";

type CategoryNav = Awaited<ReturnType<typeof getCategoryNav>>;

/**
 * URL-driven filters. Every control is a link, so filtering works without
 * JavaScript, is shareable, and gets browser back/forward for free.
 */
export function FilterSidebar({
  categories,
  brandFacets,
  params,
  hasVehicle,
}: {
  categories: CategoryNav;
  brandFacets: Array<{ slug: string; name: string; count: number }>;
  params: URLSearchParams;
  hasVehicle: boolean;
}) {
  /** Build a /parts URL with one param changed, always resetting pagination. */
  const withParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    return `/parts${next.toString() ? `?${next}` : ""}`;
  };

  const activeCategory = params.get("category");
  const activeBrands = (params.get("brands") ?? "").split(",").filter(Boolean);

  const toggleBrand = (slug: string) => {
    const next = activeBrands.includes(slug)
      ? activeBrands.filter((b) => b !== slug)
      : [...activeBrands, slug];
    return withParam("brands", next.length ? next.join(",") : null);
  };

  return (
    <aside className="space-y-7">
      {/* Categories */}
      <section>
        <h2 className="mb-3 text-xs font-bold tracking-widest text-muted uppercase">Category</h2>
        <ul className="space-y-0.5 text-sm">
          <li>
            <Link
              href={withParam("category", null)}
              className={`focus-ring block rounded-md px-2.5 py-1.5 transition-colors ${
                !activeCategory
                  ? "bg-accent/15 font-semibold text-accent-text"
                  : "text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              All categories
            </Link>
          </li>
          {categories.map((parent) => {
            const parentActive = activeCategory === parent.slug;
            const childActive = parent.children.some((c) => c.slug === activeCategory);
            return (
              <li key={parent.id}>
                <Link
                  href={withParam("category", parent.slug)}
                  className={`focus-ring flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 transition-colors ${
                    parentActive
                      ? "bg-accent/15 font-semibold text-accent-text"
                      : "text-text hover:bg-surface-2"
                  }`}
                >
                  <span>{parent.name}</span>
                  <span className="text-xs text-muted tabular-nums">{parent.count}</span>
                </Link>

                {(parentActive || childActive) && parent.children.length > 0 && (
                  <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-line pl-2.5">
                    {parent.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={withParam("category", child.slug)}
                          className={`focus-ring flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[0.8rem] transition-colors ${
                            activeCategory === child.slug
                              ? "font-semibold text-accent-text"
                              : "text-muted hover:text-text"
                          }`}
                        >
                          <span>{child.name}</span>
                          <span className="text-xs tabular-nums">{child.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Brands */}
      {brandFacets.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold tracking-widest text-muted uppercase">Brand</h2>
          <ul className="space-y-0.5 text-sm">
            {brandFacets.map((b) => {
              const checked = activeBrands.includes(b.slug);
              return (
                <li key={b.slug}>
                  <Link
                    href={toggleBrand(b.slug)}
                    className="focus-ring flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-surface-2"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        checked ? "border-accent bg-accent" : "border-field bg-surface-2"
                      }`}
                    >
                      {checked && (
                        <svg viewBox="0 0 24 24" className="h-3 w-3 text-accent-fg" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                    <span className={checked ? "font-semibold text-text" : "text-muted"}>
                      {b.name}
                    </span>
                    <span className="ml-auto text-xs text-muted tabular-nums">{b.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Price */}
      <section>
        <h2 className="mb-3 text-xs font-bold tracking-widest text-muted uppercase">Price</h2>
        <ul className="space-y-0.5 text-sm">
          {[
            { label: "Under $50", min: null, max: "4999" },
            { label: "$50 – $150", min: "5000", max: "15000" },
            { label: "$150 – $400", min: "15000", max: "40000" },
            { label: "$400 and up", min: "40000", max: null },
          ].map((band) => {
            const active = params.get("min") === (band.min ?? "") || params.get("max") === (band.max ?? "");
            const isExact =
              (params.get("min") ?? null) === band.min && (params.get("max") ?? null) === band.max;
            const next = new URLSearchParams(params.toString());
            if (isExact) {
              next.delete("min");
              next.delete("max");
            } else {
              if (band.min) next.set("min", band.min);
              else next.delete("min");
              if (band.max) next.set("max", band.max);
              else next.delete("max");
            }
            next.delete("page");
            return (
              <li key={band.label}>
                <Link
                  href={`/parts${next.toString() ? `?${next}` : ""}`}
                  className={`focus-ring block rounded-md px-2.5 py-1.5 transition-colors ${
                    isExact
                      ? "bg-accent/15 font-semibold text-accent-text"
                      : "text-muted hover:bg-surface-2 hover:text-text"
                  }`}
                  aria-current={active ? "true" : undefined}
                >
                  {band.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Availability + universal toggle */}
      <section>
        <h2 className="mb-3 text-xs font-bold tracking-widest text-muted uppercase">Refine</h2>
        <ul className="space-y-0.5 text-sm">
          <li>
            <Link
              href={withParam("inStock", params.get("inStock") ? null : "1")}
              className="focus-ring flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-surface-2"
            >
              <Checkbox checked={!!params.get("inStock")} />
              <span className={params.get("inStock") ? "font-semibold text-text" : "text-muted"}>
                In stock only
              </span>
            </Link>
          </li>
          {hasVehicle && (
            <li>
              <Link
                href={withParam("hideUniversal", params.get("hideUniversal") ? null : "1")}
                className="focus-ring flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-surface-2"
              >
                <Checkbox checked={!!params.get("hideUniversal")} />
                <span
                  className={params.get("hideUniversal") ? "font-semibold text-text" : "text-muted"}
                >
                  Hide universal parts
                </span>
              </Link>
            </li>
          )}
        </ul>
      </section>
    </aside>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        checked ? "border-accent bg-accent" : "border-field bg-surface-2"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-accent-fg" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}
