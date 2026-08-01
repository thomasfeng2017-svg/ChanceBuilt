import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { departmentOf } from "@/lib/catalog";
import { PartImage } from "@/components/PartImage";
import { productFraming } from "@/lib/product-images";
import { AddToCart } from "@/components/AddToCart";

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { brand: true, category: { include: { parent: true } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 155),
  };
}

/**
 * Merch detail.
 *
 * A part page is mostly a fitment argument: does this bolt to your car. None of
 * that applies to a hoodie, so this page is the same buy panel with the whole
 * compatibility apparatus removed rather than filled with "not applicable".
 */
export default async function MerchProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product || product.archived) notFound();
  // Slugs are unique across the whole catalog, so a part reachable at this URL
  // is a mislink rather than a 404. Send it to the page that can sell it.
  if (product.category.kind !== "MERCH") redirect(`/parts/${product.slug}`);

  const onSale = product.compareAtCents != null && product.compareAtCents > product.priceCents;
  const department = departmentOf(product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted"
      >
        <Link href="/merch" className="focus-ring rounded hover:text-text">
          Merch
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/merch?category=${product.category.slug}`}
          className="focus-ring rounded hover:text-text"
        >
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <PartImage
            department={department}
            src={product.images[0] ?? null}
            alt={product.name}
            priority
            framing={
              product.images[0] ? productFraming(product, product.images[0]) : undefined
            }
            /* Capped on small screens so the buy panel is not a full scroll
               below the photo. Matches the parts page. */
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
                  framing={productFraming(product, img)}
                  className="aspect-square w-full rounded border border-line"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-bold tracking-widest text-accent-text uppercase">
            {product.brand.name}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            {product.name}
          </h1>

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
              <span className="font-medium text-warn">Only {product.stock} left</span>
            ) : (
              <span className="font-medium text-bad">Sold out</span>
            )}
          </p>

          <div className="mt-6">
            <AddToCart productId={product.id} stock={product.stock} fits />
          </div>

          <div className="mt-6 rounded-card border border-line bg-surface p-4 text-sm text-muted">
            <p className="mb-2 font-semibold text-text">Description</p>
            <p className="leading-relaxed">{product.description}</p>
          </div>

          <p className="mt-4 text-xs text-muted">
            SKU <span className="font-mono">{product.sku}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
