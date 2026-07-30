import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canWrite } from "@/lib/auth";
import { productHref } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { FitmentEditor } from "@/components/admin/FitmentEditor";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }, user] = await Promise.all([
    params,
    searchParams,
    requireUser("VIEWER"),
  ]);

  const [product, brands, categories, makes, engineGroups] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { kind: true } },
        fitments: {
          include: { make: true, model: true },
          orderBy: [{ make: { name: "asc" } }, { model: { name: "asc" } }, { yearStart: "asc" }],
        },
      },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      include: { parent: true },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    }),
    prisma.make.findMany({ orderBy: { name: "asc" } }),
    prisma.model.findMany({ select: { engineCodes: true } }),
  ]);

  if (!product) notFound();

  // Build the engine preset list from real vehicle data, commonest first.
  const engineCounts = new Map<string, number>();
  for (const m of engineGroups) {
    for (const code of m.engineCodes) {
      engineCounts.set(code, (engineCounts.get(code) ?? 0) + 1);
    }
  }
  const enginePresets = [...engineCounts.entries()]
    .map(([code, count]) => ({ code, count }))
    .filter((e) => e.count > 1)
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  const readOnly = !canWrite(user.role);
  const isMerch = product.category.kind === "MERCH";

  return (
    <div>
      <nav className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted">
        <Link href="/admin/products" className="focus-ring rounded hover:text-text">
          ← Products
        </Link>
        {!product.archived && (
          <Link
            href={productHref(product)}
            target="_blank"
            className="focus-ring rounded hover:text-text"
          >
            View on site ↗
          </Link>
        )}
      </nav>

      <h1 className="display mb-1 text-2xl">{product.name}</h1>
      <p className="mb-6 font-mono text-sm text-muted">{product.sku}</p>

      {created && (
        <p className="mb-6 rounded border border-good/30 bg-good/10 px-4 py-3 text-sm font-medium text-good">
          {isMerch
            ? "Product created. It is live in the merch shop now."
            : "Product created. Now set its fitment below, or it won't show for customers with a vehicle selected."}
        </p>
      )}

      <div className="space-y-8">
        <ProductForm
          readOnly={readOnly}
          brands={brands}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            group: c.parent?.name ?? null,
            kind: c.kind,
          }))}
          initial={{
            id: product.id,
            name: product.name,
            sku: product.sku,
            partNumber: product.partNumber ?? "",
            description: product.description,
            price: (product.priceCents / 100).toFixed(2),
            compareAt:
              product.compareAtCents != null ? (product.compareAtCents / 100).toFixed(2) : "",
            stock: String(product.stock),
            brandId: product.brandId,
            categoryId: product.categoryId,
            isUniversal: product.isUniversal,
            archived: product.archived,
            images: product.images,
          }}
        />

        {isMerch ? (
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="display text-base">Fitment</h2>
            <p className="mt-1 text-sm text-muted">
              This is a merch product, so it has no fitment. Move it to a parts category if
              that is wrong.
            </p>
          </section>
        ) : product.isUniversal ? (
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="display text-base">Fitment</h2>
            <p className="mt-1 text-sm text-muted">
              This product is marked as fitting any vehicle, so no fitment rows are needed.
            </p>
          </section>
        ) : (
          <FitmentEditor
            productId={product.id}
            readOnly={readOnly}
            makes={makes.map((m) => ({ id: m.id, name: m.name }))}
            enginePresets={enginePresets}
            rows={product.fitments.map((f) => ({
              id: f.id,
              makeName: f.make.name,
              modelName: f.model.name,
              chassis: f.model.chassis,
              yearStart: f.yearStart,
              yearEnd: f.yearEnd,
              submodel: f.submodel,
              engine: f.engine,
              notes: f.notes,
            }))}
          />
        )}
      </div>
    </div>
  );
}
