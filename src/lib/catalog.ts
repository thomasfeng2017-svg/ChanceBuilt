import type { CatalogKind, Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { Vehicle } from "./garage";

export const PAGE_SIZE = 12;

/**
 * Where a product lives on the storefront.
 *
 * Parts and merch are genuinely different products that happen to share a
 * checkout: one is bought for a specific car and the other is bought because
 * you like the shop. Mixing them meant a customer filtering for their F80
 * had hoodies padding the results, and every sticker had to claim it "fits
 * any vehicle" to show up at all.
 */
export function productHref(product: {
  slug: string;
  category: { kind: CatalogKind };
}): string {
  return product.category.kind === "MERCH"
    ? `/merch/${product.slug}`
    : `/parts/${product.slug}`;
}

export type CatalogFilters = {
  vehicle: Vehicle | null;
  /** Restricts to one side of the shop. Callers should always set this. */
  kind?: CatalogKind;
  /** Category slug — matches the category itself or any of its children. */
  category?: string;
  /** Brand slugs; empty means "any brand". */
  brands?: string[];
  /**
   * Engine codes, e.g. ["S55"] or ["N54", "N55"]. Shows every part that fits
   * any chassis running one of those engines, which is how a tuner shops when
   * they know their platform but not the exact model year.
   */
  engines?: string[];
  /** Free-text search across name, SKU and part number. */
  q?: string;
  minCents?: number;
  maxCents?: number;
  /** When true, universal parts are excluded from vehicle-filtered results. */
  hideUniversal?: boolean;
  inStockOnly?: boolean;
  sort?: SortKey;
  page?: number;
};

export type SortKey = "relevance" | "price-asc" | "price-desc" | "name-asc" | "newest";

const ORDER_BY: Record<SortKey, Prisma.ProductOrderByWithRelationInput[]> = {
  relevance: [{ isUniversal: "asc" }, { name: "asc" }],
  "price-asc": [{ priceCents: "asc" }],
  "price-desc": [{ priceCents: "desc" }],
  "name-asc": [{ name: "asc" }],
  newest: [{ createdAt: "desc" }],
};

/**
 * The fitment predicate — the one query that matters.
 *
 * A product is shown for a given Year/Make/Model when either:
 *   a) it is flagged universal (oil, tools, cleaners — fits anything), or
 *   b) it has at least one Fitment row for that exact model whose year range
 *      brackets the selected year.
 *
 * Matching on modelId alone is sufficient because a model already belongs to
 * exactly one make; the makeId column on Fitment exists for reporting and for
 * "all parts for Honda" style browsing, not for this lookup.
 */
export function fitmentWhere(vehicle: Vehicle, hideUniversal = false): Prisma.ProductWhereInput {
  const fitsExactly: Prisma.ProductWhereInput = {
    fitments: {
      some: {
        modelId: vehicle.modelId,
        yearStart: { lte: vehicle.year },
        yearEnd: { gte: vehicle.year },
      },
    },
  };

  if (hideUniversal) return fitsExactly;
  return { OR: [{ isUniversal: true }, fitsExactly] };
}

/** Free-text match across the fields a customer might type. */
export function searchTermWhere(term: string): Prisma.ProductWhereInput {
  const q = term.trim();
  if (!q) return {};
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { partNumber: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
    ],
  };
}

function buildWhere(filters: CatalogFilters): Prisma.ProductWhereInput {
  // Archiving is how the shop retires a product it has already sold, so the
  // order history keeps working. It must never come back on the storefront.
  const and: Prisma.ProductWhereInput[] = [{ archived: false }];

  // Kept as its own AND clause rather than merged into the category filter
  // below, so "Merch > Hats" can't be requested from the parts catalog.
  if (filters.kind) {
    and.push({ category: { kind: filters.kind } });
  }

  if (filters.vehicle) {
    and.push(fitmentWhere(filters.vehicle, filters.hideUniversal));
  }

  if (filters.category) {
    // Match the category itself or any direct child, so clicking a top-level
    // department ("Brakes") returns everything beneath it.
    and.push({
      category: {
        OR: [{ slug: filters.category }, { parent: { slug: filters.category } }],
      },
    });
  }

  if (filters.brands?.length) {
    and.push({ brand: { slug: { in: filters.brands } } });
  }

  if (filters.engines?.length) {
    // Deliberately excludes universal parts. Someone browsing "S55" wants the
    // S55-specific catalog, not motor oil and hoodies padding the results.
    and.push({
      fitments: { some: { model: { engineCodes: { hasSome: filters.engines } } } },
    });
  }

  if (filters.q?.trim()) {
    and.push(searchTermWhere(filters.q));
  }

  if (filters.minCents != null || filters.maxCents != null) {
    and.push({
      priceCents: {
        ...(filters.minCents != null ? { gte: filters.minCents } : {}),
        ...(filters.maxCents != null ? { lte: filters.maxCents } : {}),
      },
    });
  }

  if (filters.inStockOnly) {
    and.push({ stock: { gt: 0 } });
  }

  return and.length ? { AND: and } : {};
}

export type CatalogProduct = Prisma.ProductGetPayload<{
  include: { brand: true; category: { include: { parent: true } } };
}>;

/** Top-level department name for a product, used to pick placeholder artwork. */
export function departmentOf(product: {
  category: { name: string; parent: { name: string } | null };
}): string {
  return product.category.parent?.name ?? product.category.name;
}

export type CatalogResult = {
  products: CatalogProduct[];
  total: number;
  page: number;
  pageCount: number;
  /** Brand facet counts for the current filter set (excluding the brand filter itself). */
  brandFacets: Array<{ slug: string; name: string; count: number }>;
};

export async function searchCatalog(filters: CatalogFilters): Promise<CatalogResult> {
  const page = Math.max(1, filters.page ?? 1);
  const where = buildWhere(filters);
  const sort = filters.sort ?? "relevance";

  // Brand facets are computed against the same filters *minus* the brand
  // selection, so the sidebar keeps showing the other brands you could pick.
  const facetWhere = buildWhere({ ...filters, brands: undefined });

  const [products, total, grouped, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { brand: true, category: { include: { parent: true } } },
      orderBy: ORDER_BY[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.product.groupBy({
      by: ["brandId"],
      where: facetWhere,
      _count: { _all: true },
    }),
    prisma.brand.findMany(),
  ]);

  const brandById = new Map(brands.map((b) => [b.id, b]));
  const brandFacets = grouped
    .map((g) => {
      const b = brandById.get(g.brandId);
      return b ? { slug: b.slug, name: b.name, count: g._count._all } : null;
    })
    .filter((x): x is { slug: string; name: string; count: number } => x !== null)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    products,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    brandFacets,
  };
}

/**
 * Category tree with product counts for the current vehicle. Categories that
 * have nothing for the selected vehicle are dropped, which is the whole point
 * of a YMM store — you should never click into an empty department.
 */
export async function getCategoryNav(
  vehicle: Vehicle | null,
  kind: CatalogKind = "PART",
) {
  const parents = await prisma.category.findMany({
    where: { parentId: null, kind },
    include: { children: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  const productWhere: Prisma.ProductWhereInput = {
    AND: [{ archived: false }, vehicle ? fitmentWhere(vehicle) : {}],
  };

  const counts = await prisma.product.groupBy({
    by: ["categoryId"],
    where: productWhere,
    _count: { _all: true },
  });
  const countByCategory = new Map(counts.map((c) => [c.categoryId, c._count._all]));

  return parents
    .map((parent) => {
      const children = parent.children
        .map((child) => ({
          ...child,
          count: countByCategory.get(child.id) ?? 0,
        }))
        .filter((c) => c.count > 0);

      const count =
        (countByCategory.get(parent.id) ?? 0) + children.reduce((sum, c) => sum + c.count, 0);

      return { ...parent, children, count };
    })
    .filter((p) => p.count > 0);
}

/** Does this specific product fit this specific vehicle? Used for the badge on the product page. */
export async function productFitsVehicle(productId: string, vehicle: Vehicle): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { isUniversal: true },
  });
  if (!product) return false;
  if (product.isUniversal) return true;

  const match = await prisma.fitment.findFirst({
    where: {
      productId,
      modelId: vehicle.modelId,
      yearStart: { lte: vehicle.year },
      yearEnd: { gte: vehicle.year },
    },
    select: { id: true },
  });
  return match !== null;
}
