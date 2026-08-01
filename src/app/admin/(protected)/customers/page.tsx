import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  await requireUser();

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      vehicles: { select: { id: true, year: true, makeName: true, modelName: true, chassis: true } },
      _count: { select: { orders: true, appointments: true } },
    },
  });

  return (
    <div>
      <h1 className="display mb-1 text-xl">Customers</h1>
      <p className="mb-6 text-sm text-muted">
        People with an account. Their garage shows what they drive and what&apos;s
        fitted, which is worth reading before a car comes in.
      </p>

      {customers.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          No accounts yet. Customers can create one from the storefront.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/customers/${c.id}`}
                className="focus-ring block px-5 py-4 transition-colors hover:bg-surface-2"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-sm text-muted">{c.email}</span>
                  {!c.active && (
                    <span className="text-xs font-bold tracking-wide text-bad uppercase">
                      Deactivated
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {c.vehicles.length} {c.vehicles.length === 1 ? "car" : "cars"} ·{" "}
                  {c._count.orders} {c._count.orders === 1 ? "order" : "orders"} ·{" "}
                  {c._count.appointments}{" "}
                  {c._count.appointments === 1 ? "appointment" : "appointments"}
                </p>
                {c.vehicles.length > 0 && (
                  <p className="mt-1.5 text-sm">
                    {c.vehicles
                      .map(
                        (v) =>
                          `${v.year} ${v.makeName} ${v.modelName}${v.chassis ? ` (${v.chassis})` : ""}`,
                      )
                      .join(" · ")}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
