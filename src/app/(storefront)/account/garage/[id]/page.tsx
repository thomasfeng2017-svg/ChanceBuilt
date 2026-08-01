import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/customer-auth";
import {
  getGarageVehicle,
  getClaimableOrders,
  partItems,
} from "@/lib/customer-garage";
import { ModForm } from "@/components/account/ModForm";
import { VehicleDetailsForm } from "@/components/account/VehicleDetailsForm";
import {
  RemoveVehicleButton,
  RemoveModButton,
  AddPurchasedModButton,
  SelectVehicleButton,
} from "@/components/account/AccountButtons";

export const metadata: Metadata = { title: "Build sheet" };

/** How a mod got here, said plainly. Provenance is the point of the badge. */
const SOURCE_LABEL = {
  PURCHASED: { text: "Bought here", className: "text-accent-text" },
  INSTALLED_BY_SHOP: { text: "Fitted by us", className: "text-good" },
  OWNER: { text: "Owner added", className: "text-muted" },
} as const;

export default async function BuildSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const customer = await requireCustomer();
  const { id } = await params;

  const vehicle = await getGarageVehicle(customer.id, id);
  if (!vehicle) notFound();

  // Parts already bought that aren't yet on this car's sheet. Anything already
  // added is filtered out so the list is only ever things left to do.
  const onSheet = new Set(vehicle.mods.map((m) => m.productId).filter(Boolean));
  const orders = await getClaimableOrders(customer.id);
  const suggestions = orders
    .map((o) => ({
      order: o,
      items: partItems(o.items).filter((i) => i.productId && !onSheet.has(i.productId)),
    }))
    .filter((o) => o.items.length > 0);

  const title = `${vehicle.year} ${vehicle.makeName} ${vehicle.modelName}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/account" className="focus-ring rounded hover:text-text">
          Your garage
        </Link>
        <span aria-hidden="true" className="mx-1.5">
          /
        </span>
        <span className="text-text">{title}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          {vehicle.nickname && (
            <p className="eyebrow mb-1 text-[0.65rem] text-accent-text">{vehicle.nickname}</p>
          )}
          <h1 className="display text-2xl sm:text-3xl">
            {title}
            {vehicle.chassis && <span className="ml-2 text-muted">({vehicle.chassis})</span>}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {vehicle.mods.length} {vehicle.mods.length === 1 ? "mod" : "mods"} on the
            build sheet
          </p>
        </div>
        <SelectVehicleButton vehicleId={vehicle.id} canFilter={!!vehicle.modelId} />
      </div>

      {/* ----------------------------------------------------- build sheet -- */}
      <section className="mb-10">
        <h2 className="display mb-4 text-lg">Build sheet</h2>

        {vehicle.mods.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            Nothing on the sheet yet. Add what&apos;s fitted below.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {vehicle.mods.map((mod) => {
              const source = SOURCE_LABEL[mod.source];
              return (
                <li key={mod.id} className="flex items-start gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="font-semibold">{mod.name}</span>
                      {mod.category && (
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide text-muted uppercase">
                          {mod.category}
                        </span>
                      )}
                      <span className={`text-[0.65rem] font-bold tracking-wide uppercase ${source.className}`}>
                        {source.text}
                      </span>
                    </div>
                    {mod.notes && <p className="mt-1 text-sm text-muted">{mod.notes}</p>}
                    {mod.installedAt && (
                      <p className="mt-1 text-xs text-muted">
                        Fitted{" "}
                        {mod.installedAt.toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <RemoveModButton modId={mod.id} vehicleId={vehicle.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* --------------------------------------------- from past purchases -- */}
      {suggestions.length > 0 && (
        <section className="mb-10">
          <h2 className="display mb-1 text-lg">Parts you&apos;ve bought</h2>
          <p className="mb-4 text-sm text-muted">
            Bought from us but not on this car&apos;s sheet yet. One click adds it,
            with the date you bought it.
          </p>
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {suggestions.flatMap(({ order, items }) =>
              items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted">
                      Order {order.number} ·{" "}
                      {order.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <AddPurchasedModButton
                    vehicleId={vehicle.id}
                    orderId={order.id}
                    productId={item.productId!}
                  />
                </li>
              )),
            )}
          </ul>
        </section>
      )}

      {/* -------------------------------------------------------- add mod -- */}
      <section className="mb-10 rounded-card border border-line bg-surface p-5">
        <h2 className="display mb-1 text-base">Add a mod</h2>
        <p className="mb-4 text-sm text-muted">
          Anything fitted, wherever it came from.
        </p>
        <ModForm vehicleId={vehicle.id} />
      </section>

      {/* --------------------------------------------------- car details -- */}
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="display mb-4 text-base">Car details</h2>
        <VehicleDetailsForm
          id={vehicle.id}
          nickname={vehicle.nickname ?? ""}
          notes={vehicle.notes ?? ""}
        />
        <div className="mt-4 border-t border-line pt-3">
          <RemoveVehicleButton vehicleId={vehicle.id} />
        </div>
      </section>
    </div>
  );
}
