import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const order = await prisma.order.findUnique({
    where: { number },
    include: { items: true },
  });

  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-good/15 text-good">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h1 className="display text-2xl sm:text-3xl">
          {order.status === "PAID" ? "Order confirmed" : "Order placed"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Confirmation sent to <span className="font-medium text-text">{order.email}</span>
        </p>
        <p className="mt-1 font-mono text-sm text-muted">
          Order <span className="font-bold text-accent-text">{order.number}</span>
        </p>
      </div>

      <div className="mt-9 rounded-card border border-line bg-surface p-5">
        {order.vehicleLabel && (
          <p className="mb-4 border-b border-line pb-4 text-sm">
            <span className="text-muted">Ordered for </span>
            <span className="font-semibold">{order.vehicleLabel}</span>
          </p>
        )}

        <ul className="space-y-3 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span className="min-w-0">
                <span className="block font-medium">{item.name}</span>
                <span className="font-mono text-xs text-muted">
                  {item.sku} · Qty {item.quantity}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatCents(item.unitPriceCents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatCents(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Shipping</dt>
            <dd className="tabular-nums">
              {order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Tax</dt>
            <dd className="tabular-nums">{formatCents(order.taxCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2.5 text-base font-extrabold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatCents(order.totalCents)}</dd>
          </div>
        </dl>

        {order.status === "PAID" ? (
          <p className="mt-5 rounded border border-good/25 bg-good/10 px-3.5 py-2.5 text-xs text-good">
            Payment received. We&apos;ll email you tracking as soon as it ships.
          </p>
        ) : (
          <p className="mt-5 rounded border border-warn/25 bg-warn/10 px-3.5 py-2.5 text-xs text-warn">
            Status: {order.status}. We&apos;ll be in touch to arrange payment before this ships.
          </p>
        )}
      </div>

      <Link
        href="/parts"
        className="focus-ring mt-7 block rounded-lg border border-line bg-surface px-6 py-3 text-center text-sm font-semibold transition-colors hover:border-muted/40"
      >
        Continue shopping
      </Link>
    </div>
  );
}
