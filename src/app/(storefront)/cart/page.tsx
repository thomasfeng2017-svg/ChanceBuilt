import type { Metadata } from "next";
import Link from "next/link";
import { getDetailedCart, freeShippingRemainingCents } from "@/lib/cart";
import { formatCents } from "@/lib/money";
import { CartLineControls } from "@/components/CartLineControls";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const cart = await getDetailedCart();
  const remaining = freeShippingRemainingCents(cart.subtotalCents);

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <svg viewBox="0 0 24 24" className="mx-auto mb-5 h-12 w-12 text-muted/40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4h2l2.6 12.4A2 2 0 0 0 9.6 18h8.2a2 2 0 0 0 2-1.6L21.5 8H6" />
          <circle cx="10" cy="21" r="1" />
          <circle cx="18" cy="21" r="1" />
        </svg>
        <h1 className="text-2xl font-extrabold tracking-tight">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted">
          Select your vehicle and we&apos;ll show you parts guaranteed to fit it.
        </p>
        <Link
          href="/parts"
          className="focus-ring mt-7 inline-block rounded-lg bg-accent px-7 py-3.5 text-sm font-bold tracking-wide text-accent-fg uppercase transition-colors hover:bg-accent-hi"
        >
          Shop parts
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
        Your cart
        <span className="ml-2.5 text-base font-medium text-muted">
          ({cart.itemCount} item{cart.itemCount === 1 ? "" : "s"})
        </span>
      </h1>

      {remaining > 0 && (
        <p className="mb-5 rounded-lg border border-accent/25 bg-accent/[0.07] px-4 py-3 text-sm">
          Add <span className="font-bold text-accent-text">{formatCents(remaining)}</span> more for free
          shipping.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {cart.lines.map((line) => (
            <li key={line.productId} className="flex flex-wrap gap-4 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="text-[0.7rem] font-bold tracking-widest text-muted uppercase">
                  {line.brandName}
                </p>
                <Link
                  href={line.href}
                  className="focus-ring mt-0.5 block rounded text-sm font-semibold hover:text-accent-text"
                >
                  {line.name}
                </Link>
                <p className="mt-1 font-mono text-xs text-muted">{line.sku}</p>
                {line.vehicleLabel && (
                  <p className="mt-1.5 text-xs text-muted">
                    Added for <span className="font-medium text-text">{line.vehicleLabel}</span>
                  </p>
                )}
                <div className="mt-3">
                  <CartLineControls
                    productId={line.productId}
                    quantity={line.quantity}
                    stock={line.stock}
                  />
                </div>
              </div>

              <div className="text-right">
                <p className="text-base font-extrabold">{formatCents(line.lineTotalCents)}</p>
                {line.quantity > 1 && (
                  <p className="mt-0.5 text-xs text-muted">
                    {formatCents(line.priceCents)} each
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-56 lg:self-start">
          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-4 text-sm font-bold tracking-widest text-muted uppercase">
              Order summary
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-semibold tabular-nums">{formatCents(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="font-semibold tabular-nums">
                  {cart.shippingCents === 0 ? (
                    <span className="text-good">Free</span>
                  ) : (
                    formatCents(cart.shippingCents)
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Estimated tax</dt>
                <dd className="font-semibold tabular-nums">{formatCents(cart.taxCents)}</dd>
              </div>
              <div className="mt-3 flex justify-between border-t border-line pt-3 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-extrabold tabular-nums">{formatCents(cart.totalCents)}</dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="focus-ring mt-5 block rounded-lg bg-accent px-6 py-3.5 text-center text-sm font-bold tracking-wide text-accent-fg uppercase transition-colors hover:bg-accent-hi"
            >
              Checkout
            </Link>
            <Link
              href="/parts"
              className="focus-ring mt-2.5 block rounded-lg px-6 py-2.5 text-center text-sm font-medium text-muted transition-colors hover:text-text"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
