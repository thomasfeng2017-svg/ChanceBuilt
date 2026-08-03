import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { formatShopDateTime } from "@/lib/booking";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const [{ denied }, user] = await Promise.all([searchParams, requireUser("VIEWER")]);

  const now = new Date();
  const [
    productCount,
    outOfStock,
    missingPhotos,
    noFitment,
    pendingOrders,
    recentOrders,
    upcoming,
  ] = await Promise.all([
    prisma.product.count({ where: { archived: false } }),
    prisma.product.count({ where: { archived: false, stock: { lte: 0 } } }),
    prisma.product.count({ where: { archived: false, images: { isEmpty: true } } }),
    prisma.product.count({
      // Must match the "no-fitment" filter on /admin/products exactly, or this
      // tile sends the shop to an empty list. Merch has no fitment by design.
      where: {
        archived: false,
        category: { kind: "PART" },
        isUniversal: false,
        fitments: { none: {} },
      },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: now }, status: { in: ["REQUESTED", "CONFIRMED"] } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { service: true },
    }),
  ]);

  return (
    <div>
      <header className="mb-8">
        <h1 className="display text-2xl sm:text-3xl">
          Afternoon, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Here&apos;s what needs attention.
        </p>
      </header>

      {denied && (
        <p
          role="alert"
          className="mb-6 rounded border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn"
        >
          You don&apos;t have permission to open that page.
        </p>
      )}

      {/* Things that need doing, not vanity metrics. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Live products" value={productCount} href="/admin/products" />
        <Stat
          label="Orders to fulfil"
          value={pendingOrders}
          href="/admin/orders?status=PENDING"
          warn={pendingOrders > 0}
        />
        <Stat
          label="Missing photos"
          value={missingPhotos}
          href="/admin/products?filter=no-photo"
          warn={missingPhotos > 0}
        />
        <Stat
          label="No fitment set"
          value={noFitment}
          href="/admin/products?filter=no-fitment"
          warn={noFitment > 0}
        />
      </section>

      {outOfStock > 0 && (
        <p className="mt-4 rounded border border-line bg-surface px-4 py-3 text-sm text-muted">
          <Link href="/admin/products?filter=out-of-stock" className="focus-ring rounded font-semibold text-text underline underline-offset-2">
            {outOfStock} product{outOfStock === 1 ? " is" : "s are"} out of stock
          </Link>{" "}
          and customers can still see them but can&apos;t buy.
        </p>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <section>
          <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
            <h2 className="display text-base">Recent orders</h2>
            <Link
              href="/admin/orders"
              className="focus-ring rounded text-xs text-muted hover:text-text"
            >
              All orders →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <Empty>No orders yet.</Empty>
          ) : (
            <ul className="divide-y divide-line rounded-card border border-line bg-surface">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.number}`}
                    className="focus-ring flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-xs text-muted">{o.number}</span>
                      <span className="block truncate text-sm">{o.email}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold">
                        {formatCents(o.totalCents)}
                      </span>
                      <StatusPill status={o.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming appointments */}
        <section>
          <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
            <h2 className="display text-base">Next in the shop</h2>
            <Link
              href="/admin/appointments"
              className="focus-ring rounded text-xs text-muted hover:text-text"
            >
              All appointments →
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <Empty>Nothing booked yet.</Empty>
          ) : (
            <ul className="divide-y divide-line rounded-card border border-line bg-surface">
              {upcoming.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/admin/appointments/${a.reference}`}
                    className="focus-ring block px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{a.customerName}</span>
                      <StatusPill status={a.status} />
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {a.service.name} · {formatShopDateTime(a.startsAt)}
                    </span>
                    {a.vehicleModel && (
                      <span className="mt-0.5 block text-xs text-muted">
                        {[a.vehicleYear, a.vehicleMake, a.vehicleModel, a.vehicleChassis && `(${a.vehicleChassis})`]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  warn = false,
}: {
  label: string;
  value: number;
  href: string;
  warn?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`focus-ring rounded-card border bg-surface p-4 transition-colors hover:border-line-hi ${
        warn && value > 0 ? "border-warn/40" : "border-line"
      }`}
    >
      <p className="eyebrow text-[0.6rem] text-muted">{label}</p>
      <p
        className={`display mt-2 text-3xl ${warn && value > 0 ? "text-warn" : ""}`}
      >
        {value}
      </p>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
      {children}
    </p>
  );
}

const PILL: Record<string, string> = {
  PENDING: "border-warn/40 text-warn",
  REQUESTED: "border-warn/40 text-warn",
  PAID: "border-good/40 text-good",
  CONFIRMED: "border-good/40 text-good",
  SHIPPED: "border-good/40 text-good",
  COMPLETED: "border-line-hi text-muted",
  CANCELLED: "border-bad/40 text-bad",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[0.6rem] font-bold tracking-widest uppercase ${
        PILL[status] ?? "border-line-hi text-muted"
      }`}
    >
      {status}
    </span>
  );
}
