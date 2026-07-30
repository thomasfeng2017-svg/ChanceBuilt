import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatCents } from "@/lib/money";

export const metadata = { title: "Orders" };

const STATUSES = ["ALL", "PENDING", "PAID", "SHIPPED", "CANCELLED"] as const;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ status = "ALL" }] = await Promise.all([searchParams, requireUser("VIEWER")]);

  const where: Prisma.OrderWhereInput =
    status !== "ALL" && STATUSES.includes(status as (typeof STATUSES)[number])
      ? { status: status as "PENDING" | "PAID" | "SHIPPED" | "CANCELLED" }
      : {};

  const orders = await prisma.order.findMany({
    where,
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="display text-2xl">Orders</h1>
        <p className="mt-1 text-sm text-muted">
          {orders.length} order{orders.length === 1 ? "" : "s"}
        </p>
      </header>

      <nav className="mb-5 flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/admin/orders" : `/admin/orders?status=${s}`}
            className={`focus-ring rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
              status === s
                ? "bg-accent text-accent-fg"
                : "border border-line text-muted hover:border-line-hi hover:text-text"
            }`}
          >
            {s === "ALL" ? "All" : s}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-14 text-center text-sm text-muted">
          No orders yet.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.number}`}
                className="focus-ring flex flex-wrap items-center gap-x-4 gap-y-1 p-4 transition-colors hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-xs text-muted">{o.number}</span>
                  <span className="block truncate text-sm font-semibold">{o.email}</span>
                  {o.vehicleLabel && (
                    <span className="block truncate text-xs text-muted">{o.vehicleLabel}</span>
                  )}
                </span>
                <span className="text-xs text-muted">
                  {o._count.items} item{o._count.items === 1 ? "" : "s"}
                </span>
                <span className="text-right">
                  <span className="block text-sm font-bold">{formatCents(o.totalCents)}</span>
                  <span className="block text-[0.65rem] font-bold tracking-widest text-muted uppercase">
                    {o.status}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
