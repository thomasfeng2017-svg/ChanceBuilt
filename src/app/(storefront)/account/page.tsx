import type { Metadata } from "next";
import Link from "next/link";
import { requireCustomer } from "@/lib/customer-guards";
import { getGarage } from "@/lib/customer-garage";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { AddVehicleForm } from "@/components/account/AddVehicleForm";
import { SignOutButton, SelectVehicleButton } from "@/components/account/AccountButtons";
import { ChangePasswordForm } from "@/components/account/PasswordForms";

export const metadata: Metadata = { title: "Your garage" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const customer = await requireCustomer();
  const { welcome } = await searchParams;

  const [garage, orders, appointments] = await Promise.all([
    getGarage(customer.id),
    prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        number: true,
        status: true,
        totalCents: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { customerId: customer.id },
      orderBy: { startsAt: "desc" },
      take: 5,
      include: { service: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2 text-[0.65rem] text-muted">Your garage</p>
          <h1 className="display text-2xl sm:text-3xl">{customer.name}</h1>
          <p className="mt-1 text-sm text-muted">{customer.email}</p>
        </div>
        <SignOutButton />
      </div>

      {welcome && (
        <p className="mb-8 rounded-card border border-good/30 bg-good/10 px-4 py-3 text-sm text-good">
          Account created. Anything you&apos;d already ordered or booked with this
          email is now on your account.
        </p>
      )}

      {/* ------------------------------------------------------ the garage -- */}
      <section className="mb-12">
        <h2 className="display mb-1 text-lg">Your cars</h2>
        <p className="mb-4 text-sm text-muted">
          Keep a build sheet for each one. Selecting a car filters the catalog to
          parts that fit it.
        </p>

        {garage.length === 0 ? (
          <p className="mb-5 rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            No cars yet. Add one below and start your build sheet.
          </p>
        ) : (
          <ul className="mb-6 grid gap-3 sm:grid-cols-2">
            {garage.map((v) => (
              <li
                key={v.id}
                className="rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-hi"
              >
                <Link
                  href={`/account/garage/${v.id}`}
                  className="focus-ring block rounded"
                >
                  {v.nickname && (
                    <p className="text-xs font-bold tracking-widest text-accent-text uppercase">
                      {v.nickname}
                    </p>
                  )}
                  <p className="mt-1 text-base font-bold">
                    {v.year} {v.makeName} {v.modelName}
                    {v.chassis && <span className="ml-1.5 text-muted">({v.chassis})</span>}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {v._count.mods} {v._count.mods === 1 ? "mod" : "mods"} on the build sheet
                  </p>
                </Link>
                <div className="mt-3 border-t border-line pt-3">
                  <SelectVehicleButton vehicleId={v.id} canFilter={!!v.modelId} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-card border border-line bg-surface p-5">
          <p className="mb-3 text-sm font-semibold">Add a car</p>
          <AddVehicleForm />
        </div>
      </section>

      {/* ---------------------------------------------------------- orders -- */}
      <section className="mb-12">
        <h2 className="display mb-4 text-lg">Recent orders</h2>
        {orders.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            Nothing yet.{" "}
            <Link href="/parts" className="focus-ring rounded underline underline-offset-2 hover:text-text">
              Browse parts
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/order/${o.number}`}
                  className="focus-ring flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-surface-2"
                >
                  <span className="font-mono text-sm font-bold">{o.number}</span>
                  <span className="text-xs tracking-widest text-muted uppercase">{o.status}</span>
                  <span className="text-sm text-muted">
                    {o._count.items} {o._count.items === 1 ? "item" : "items"}
                  </span>
                  <span className="ml-auto text-sm font-semibold">
                    {formatCents(o.totalCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------------- security -- */}
      <section className="mb-12">
        <h2 className="display mb-4 text-lg">Password</h2>
        <div className="rounded-card border border-line bg-surface p-5">
          <ChangePasswordForm />
        </div>
      </section>

      {/* ---------------------------------------------------- appointments -- */}
      <section>
        <h2 className="display mb-4 text-lg">Appointments</h2>
        {appointments.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            None booked.{" "}
            <Link href="/book" className="focus-ring rounded underline underline-offset-2 hover:text-text">
              Book a service
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {appointments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/book/${a.reference}`}
                  className="focus-ring flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-surface-2"
                >
                  <span className="text-sm font-semibold">{a.service.name}</span>
                  <span className="text-xs tracking-widest text-muted uppercase">{a.status}</span>
                  <span className="ml-auto text-sm text-muted">
                    {a.startsAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
