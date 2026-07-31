import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, canWrite } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { DispatchForm } from "@/components/admin/DispatchForm";
import { setOrderStatusAction } from "../../ops-actions";

export const metadata = { title: "Order" };

const ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "CANCELLED"] as const;

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const [{ number }, user] = await Promise.all([params, requireUser("VIEWER")]);

  const order = await prisma.order.findUnique({
    where: { number },
    include: { items: { include: { product: true } } },
  });
  if (!order) notFound();

  return (
    <div>
      <nav className="mb-4 text-sm text-muted">
        <Link href="/admin/orders" className="focus-ring rounded hover:text-text">
          ← Orders
        </Link>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-2xl">{order.number}</h1>
          <p className="mt-1 text-sm text-muted">
            {new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(order.createdAt)}
          </p>
        </div>
        <StatusSelect
          id={order.id}
          current={order.status}
          options={ORDER_STATUSES}
          action={setOrderStatusAction}
          disabled={!canWrite(user.role)}
        />
      </header>

      {order.status === "PENDING" && (
        <p className="mb-6 rounded border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          No payment has been taken for this order — checkout doesn&apos;t charge yet. Mark it
          paid only once you&apos;ve collected the money another way.
        </p>
      )}

      {/* Dispatch: only meaningful once the money is in. */}
      {canWrite(user.role) && (order.status === "PAID" || order.status === "SHIPPED") && (
        <div className="mb-6">
          <DispatchForm
            orderId={order.id}
            alreadyShipped={order.status === "SHIPPED"}
            carrier={order.carrier}
            trackingNumber={order.trackingNumber}
            shippedAt={
              order.shippedAt
                ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(order.shippedAt)
                : null
            }
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="rounded-card border border-line bg-surface">
          <h2 className="display border-b border-line px-5 py-3 text-base">Items</h2>
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/admin/products/${item.productId}`}
                    className="focus-ring block truncate rounded text-sm font-semibold hover:text-muted"
                  >
                    {item.name}
                  </Link>
                  <span className="block font-mono text-xs text-muted">{item.sku}</span>
                </span>
                <span className="text-sm text-muted">
                  {item.quantity} × {formatCents(item.unitPriceCents)}
                </span>
                <span className="w-24 text-right text-sm font-bold">
                  {formatCents(item.unitPriceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
            <Row label="Subtotal" value={formatCents(order.subtotalCents)} />
            <Row
              label="Shipping"
              value={order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents)}
            />
            <Row label="Tax" value={formatCents(order.taxCents)} />
            <div className="flex justify-between border-t border-line pt-2 text-base font-extrabold">
              <dt>Total</dt>
              <dd>{formatCents(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-4">
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="eyebrow mb-2 text-[0.6rem] text-muted">Customer</h2>
            <a
              href={`mailto:${order.email}`}
              className="focus-ring block rounded text-sm font-semibold break-all hover:text-muted"
            >
              {order.email}
            </a>
          </section>

          {order.vehicleLabel && (
            <section className="rounded-card border border-line bg-surface p-5">
              <h2 className="eyebrow mb-2 text-[0.6rem] text-muted">Ordered for</h2>
              <p className="text-sm font-semibold">{order.vehicleLabel}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
