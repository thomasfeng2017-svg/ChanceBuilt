import Link from "next/link";
import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, canWrite } from "@/lib/auth";
import { formatCents } from "@/lib/money";

export const metadata = { title: "Products" };

const PAGE_SIZE = 25;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "parts", label: "Parts" },
  { key: "merch", label: "Merch" },
  { key: "no-photo", label: "Missing photos" },
  { key: "no-fitment", label: "No fitment" },
  { key: "out-of-stock", label: "Out of stock" },
  { key: "archived", label: "Archived" },
] as const;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const [{ q, filter = "all", page: pageParam }, user] = await Promise.all([
    searchParams,
    requireUser("VIEWER"),
  ]);
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.ProductWhereInput = { archived: filter === "archived" };
  if (filter === "parts") where.category = { kind: "PART" };
  if (filter === "merch") where.category = { kind: "MERCH" };
  if (filter === "no-photo") where.images = { isEmpty: true };
  if (filter === "no-fitment") {
    // Merch has no fitment by design, so it would sit in this list forever.
    where.category = { kind: "PART" };
    where.isUniversal = false;
    where.fitments = { none: {} };
  }
  if (filter === "out-of-stock") where.stock = { lte: 0 };

  if (q?.trim()) {
    where.OR = [
      { name: { contains: q.trim(), mode: "insensitive" } },
      { sku: { contains: q.trim(), mode: "insensitive" } },
      { partNumber: { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { brand: true, category: true, _count: { select: { fitments: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (filter !== "all") next.set("filter", filter);
    for (const [k, v] of Object.entries(over)) {
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display text-2xl">Products</h1>
          <p className="mt-1 text-sm text-muted">
            {total} {filter === "archived" ? "archived" : "live"} product
            {total === 1 ? "" : "s"}
          </p>
        </div>
        {canWrite(user.role) && (
          <Link
            href="/admin/products/new"
            className="focus-ring rounded bg-accent px-5 py-2.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
          >
            Add product
          </Link>
        )}
      </header>

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, SKU or part number"
          className="focus-ring min-w-0 flex-1 rounded border border-line bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-muted/60"
        />
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <button
          type="submit"
          className="focus-ring rounded border border-line-hi px-5 py-2.5 text-sm font-semibold hover:bg-surface-2"
        >
          Search
        </button>
      </form>

      <nav className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={qs({ filter: f.key === "all" ? undefined : f.key, page: undefined })}
            className={`focus-ring rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.key
                ? "bg-accent text-accent-fg"
                : "border border-line text-muted hover:border-line-hi hover:text-text"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {products.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-14 text-center text-sm text-muted">
          Nothing here.{" "}
          {filter !== "all" && (
            <Link href="/admin/products" className="focus-ring rounded underline">
              Clear the filter
            </Link>
          )}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/products/${p.id}`}
                className="focus-ring flex items-center gap-4 p-3 transition-colors hover:bg-surface-2"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-line bg-surface-2">
                  {p.images[0] ? (
                    <Image src={p.images[0]} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[0.6rem] text-muted">
                      No photo
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="mt-0.5 block truncate font-mono text-xs text-muted">
                    {p.sku} · {p.brand.name} · {p.category.name}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {p.images.length === 0 && <Flag tone="warn">No photo</Flag>}
                    {!p.isUniversal && p._count.fitments === 0 && (
                      <Flag tone="warn">No fitment</Flag>
                    )}
                    {p.isUniversal && <Flag>Universal</Flag>}
                    {!p.isUniversal && p._count.fitments > 0 && (
                      <Flag>{p._count.fitments} fitment rows</Flag>
                    )}
                    {p.archived && <Flag tone="bad">Archived</Flag>}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold">{formatCents(p.priceCents)}</span>
                  <span
                    className={`block text-xs ${p.stock <= 0 ? "text-bad" : "text-muted"}`}
                  >
                    {p.stock <= 0 ? "Out of stock" : `${p.stock} in stock`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={qs({ page: String(page - 1) })}
              className="focus-ring rounded border border-line px-4 py-2 text-sm hover:border-line-hi"
            >
              ← Prev
            </Link>
          )}
          <span className="text-sm text-muted">
            Page {page} of {pageCount}
          </span>
          {page < pageCount && (
            <Link
              href={qs({ page: String(page + 1) })}
              className="focus-ring rounded border border-line px-4 py-2 text-sm hover:border-line-hi"
            >
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function Flag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "bad";
}) {
  const cls =
    tone === "warn"
      ? "border-warn/40 text-warn"
      : tone === "bad"
        ? "border-bad/40 text-bad"
        : "border-line-hi text-muted";
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase ${cls}`}
    >
      {children}
    </span>
  );
}
