import { cookies } from "next/headers";
import { prisma } from "./db";
import { productHref } from "./catalog";
import type { Vehicle } from "./garage";

/**
 * Cookie-backed cart. Good enough up to checkout; swap the storage for a
 * database-backed cart keyed by session when you add accounts.
 *
 * Only productId + quantity are stored. Prices are always re-read from the
 * database so a stale cookie can never set the price.
 */
export const CART_COOKIE = "cart";
export const CART_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const MAX_QTY_PER_LINE = 99;

export type CartLine = { productId: string; quantity: number; vehicleLabel?: string };

export function parseCart(raw: string | undefined): CartLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (l): l is CartLine =>
          l &&
          typeof l.productId === "string" &&
          typeof l.quantity === "number" &&
          Number.isInteger(l.quantity) &&
          l.quantity > 0,
      )
      .map((l) => ({
        productId: l.productId,
        quantity: Math.min(l.quantity, MAX_QTY_PER_LINE),
        vehicleLabel: typeof l.vehicleLabel === "string" ? l.vehicleLabel : undefined,
      }));
  } catch {
    return [];
  }
}

export async function getCartLines(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function getCartCount(): Promise<number> {
  return (await getCartLines()).reduce((sum, l) => sum + l.quantity, 0);
}

export type DetailedCartLine = {
  productId: string;
  quantity: number;
  vehicleLabel?: string;
  name: string;
  slug: string;
  /** Resolved link, since parts and merch live on different routes. */
  href: string;
  sku: string;
  brandName: string;
  priceCents: number;
  stock: number;
  lineTotalCents: number;
};

export type DetailedCart = {
  lines: DetailedCartLine[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  itemCount: number;
};

const FREE_SHIPPING_THRESHOLD_CENTS = 9900;
const FLAT_SHIPPING_CENTS = 1295;
const TAX_RATE = 0.0875;

/** Hydrate the cookie cart with live product data and compute totals. */
export async function getDetailedCart(): Promise<DetailedCart> {
  const lines = await getCartLines();
  if (lines.length === 0) {
    return { lines: [], subtotalCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0, itemCount: 0 };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) } },
    include: { brand: true, category: { select: { kind: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const detailed: DetailedCartLine[] = [];
  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) continue; // product was deleted — silently drop it
    detailed.push({
      productId: p.id,
      quantity: line.quantity,
      vehicleLabel: line.vehicleLabel,
      name: p.name,
      slug: p.slug,
      href: productHref(p),
      sku: p.sku,
      brandName: p.brand.name,
      priceCents: p.priceCents,
      stock: p.stock,
      lineTotalCents: p.priceCents * line.quantity,
    });
  }

  const subtotalCents = detailed.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const shippingCents =
    subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
  const taxCents = Math.round(subtotalCents * TAX_RATE);

  return {
    lines: detailed,
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents,
    itemCount: detailed.reduce((sum, l) => sum + l.quantity, 0),
  };
}

export function freeShippingRemainingCents(subtotalCents: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents);
}

export { FREE_SHIPPING_THRESHOLD_CENTS };

export type { Vehicle };
