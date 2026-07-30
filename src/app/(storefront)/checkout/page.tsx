import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDetailedCart } from "@/lib/cart";
import { formatCents } from "@/lib/money";
import { CheckoutForm } from "@/components/CheckoutForm";
import { stripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const cart = await getDetailedCart();
  if (cart.lines.length === 0) redirect("/cart");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-extrabold tracking-tight sm:text-3xl">Checkout</h1>

      <div className="grid gap-8 md:grid-cols-[1fr_18rem]">
        <div className="rounded-card border border-line bg-surface p-6">
          <CheckoutForm paymentsLive={stripeConfigured()} />
        </div>

        <aside>
          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-4 text-sm font-bold tracking-widest text-muted uppercase">
              {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"}
            </h2>
            <ul className="mb-4 space-y-3 border-b border-line pb-4 text-sm">
              {cart.lines.map((l) => (
                <li key={l.productId} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="line-clamp-2 font-medium">{l.name}</span>
                    <span className="text-xs text-muted">Qty {l.quantity}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatCents(l.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatCents(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="tabular-nums">
                  {cart.shippingCents === 0 ? "Free" : formatCents(cart.shippingCents)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Tax</dt>
                <dd className="tabular-nums">{formatCents(cart.taxCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5 text-base font-extrabold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCents(cart.totalCents)}</dd>
              </div>
            </dl>
          </div>
          <Link
            href="/cart"
            className="focus-ring mt-3 block rounded-lg px-4 py-2 text-center text-sm text-muted hover:text-text"
          >
            ← Back to cart
          </Link>
        </aside>
      </div>
    </div>
  );
}
