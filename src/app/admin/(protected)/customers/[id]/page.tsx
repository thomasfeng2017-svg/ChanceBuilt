import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, canWrite } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { ShopModForm, RemoveShopMod } from "@/components/admin/ShopModForm";

export const metadata = { title: "Customer" };

const SOURCE_LABEL = {
  PURCHASED: { text: "Bought here", className: "text-accent-text" },
  INSTALLED_BY_SHOP: { text: "Fitted by us", className: "text-good" },
  OWNER: { text: "Owner says", className: "text-muted" },
} as const;

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const writable = canWrite(user.role);

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      vehicles: {
        include: { mods: { orderBy: [{ installedAt: "desc" }, { createdAt: "desc" }] } },
        orderBy: { createdAt: "asc" },
      },
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
      appointments: {
        orderBy: { startsAt: "desc" },
        take: 20,
        include: { service: { select: { name: true } } },
      },
    },
  });
  if (!customer) notFound();

  return (
    <div>
      <Link
        href="/admin/customers"
        className="focus-ring mb-4 inline-block rounded text-sm text-muted hover:text-text"
      >
        ← Customers
      </Link>

      <h1 className="display text-xl">{customer.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {customer.email}
        {customer.phone && ` · ${customer.phone}`}
      </p>

      {/* ----------------------------------------------------- the garage -- */}
      <h2 className="display mt-8 mb-3 text-base">Garage</h2>
      {customer.vehicles.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          No cars saved.
        </p>
      ) : (
        <div className="space-y-5">
          {customer.vehicles.map((v) => (
            <section key={v.id} className="rounded-card border border-line bg-surface p-5">
              <div className="mb-3">
                {v.nickname && (
                  <p className="eyebrow text-[0.6rem] text-accent-text">{v.nickname}</p>
                )}
                <h3 className="text-base font-bold">
                  {v.year} {v.makeName} {v.modelName}
                  {v.chassis && <span className="ml-1.5 text-muted">({v.chassis})</span>}
                </h3>
                {v.notes && <p className="mt-1 text-sm text-muted">{v.notes}</p>}
              </div>

              {v.mods.length === 0 ? (
                <p className="text-sm text-muted">Nothing on the build sheet yet.</p>
              ) : (
                <ul className="divide-y divide-line rounded border border-line">
                  {v.mods.map((mod) => {
                    const source = SOURCE_LABEL[mod.source];
                    return (
                      <li key={mod.id} className="flex items-start gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <span className="text-sm font-semibold">{mod.name}</span>
                            {mod.category && (
                              <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide text-muted uppercase">
                                {mod.category}
                              </span>
                            )}
                            <span
                              className={`text-[0.6rem] font-bold tracking-wide uppercase ${source.className}`}
                            >
                              {source.text}
                            </span>
                          </div>
                          {mod.notes && <p className="mt-0.5 text-xs text-muted">{mod.notes}</p>}
                          {mod.installedAt && (
                            <p className="mt-0.5 text-xs text-muted">
                              {mod.installedAt.toLocaleDateString("en-US", {
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                        {writable && mod.source === "INSTALLED_BY_SHOP" && (
                          <RemoveShopMod modId={mod.id} customerId={customer.id} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {writable && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="mb-2 text-xs font-semibold">Log work you did</p>
                  <ShopModForm vehicleId={v.id} />
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------- orders -- */}
      <h2 className="display mt-8 mb-3 text-base">Orders</h2>
      {customer.orders.length === 0 ? (
        <p className="text-sm text-muted">None.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {customer.orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="focus-ring flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-surface-2"
              >
                <span className="font-mono text-sm font-bold">{o.number}</span>
                <span className="text-xs tracking-widest text-muted uppercase">{o.status}</span>
                <span className="ml-auto text-sm font-semibold">
                  {formatCents(o.totalCents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* ---------------------------------------------------- appointments -- */}
      <h2 className="display mt-8 mb-3 text-base">Appointments</h2>
      {customer.appointments.length === 0 ? (
        <p className="text-sm text-muted">None.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {customer.appointments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
              <span className="text-sm font-semibold">{a.service.name}</span>
              <span className="text-xs tracking-widest text-muted uppercase">{a.status}</span>
              <span className="ml-auto text-sm text-muted">
                {a.startsAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
