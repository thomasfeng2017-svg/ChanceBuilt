import Link from "next/link";
import { formatCents } from "@/lib/money";
import { departmentOf, productHref, type CatalogProduct } from "@/lib/catalog";
import { PartImage } from "./PartImage";
import { productFraming } from "@/lib/product-images";

/**
 * Catalog tile.
 *
 * Editorial rather than "SaaS card": square corners, a hairline frame, and the
 * brand set as a small mono kicker above the name. The second photo (when a
 * product has one) cross-fades in on hover, which is worth far more on a parts
 * catalog than a shadow or a tilt, because the second angle is usually what
 * tells you whether it's the right part.
 */
export function ProductCard({
  product,
  hasVehicle,
  /** Position in the grid, used to stagger the reveal. */
  index = 0,
}: {
  product: CatalogProduct;
  /** When a vehicle is selected, every card shown has already passed fitment. */
  hasVehicle: boolean;
  index?: number;
}) {
  const onSale = product.compareAtCents != null && product.compareAtCents > product.priceCents;
  const secondary = product.images[1] ?? null;

  return (
    <Link
      href={productHref(product)}
      style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}
      className="reveal group m-edge flex flex-col border border-line bg-surface transition-colors duration-200 hover:border-field focus-ring"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-surface-2">
        <PartImage
          department={departmentOf(product)}
          src={product.images[0] ?? null}
          alt={`${product.brand.name} ${product.name}`}
          framing={
            product.images[0] ? productFraming(product, product.images[0]) : undefined
          }
          className={`h-full w-full transition-opacity duration-500 ${
            secondary ? "group-hover:opacity-0" : ""
          }`}
        />

        {/* Second angle, revealed on hover. Only rendered when one exists. */}
        {secondary && (
          <PartImage
            department={departmentOf(product)}
            src={secondary}
            alt=""
            framing={productFraming(product, secondary)}
            className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        {onSale && (
          <span className="absolute top-0 left-0 bg-accent px-2 py-1 font-mono text-[0.6rem] font-bold tracking-widest text-accent-fg uppercase">
            Sale
          </span>
        )}
        {product.stock === 0 && (
          <span className="absolute top-0 right-0 bg-ink/90 px-2 py-1 font-mono text-[0.6rem] font-bold tracking-widest text-bad uppercase">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col border-t border-line p-3.5">
        <p className="font-mono text-[0.65rem] tracking-widest text-muted uppercase">
          {product.brand.name}
        </p>

        <h3 className="mt-1.5 line-clamp-2 text-sm leading-snug font-semibold text-balance text-text">
          {product.name}
        </h3>

        <div className="mt-auto pt-3">
          {hasVehicle && (
            <p className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-bold tracking-wide text-good uppercase">
              <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {product.isUniversal ? "Fits anything" : "Fits your car"}
            </p>
          )}

          <div className="flex items-baseline gap-2">
            <span className="display text-xl">{formatCents(product.priceCents)}</span>
            {onSale && (
              <span className="text-xs text-muted line-through">
                {formatCents(product.compareAtCents!)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
