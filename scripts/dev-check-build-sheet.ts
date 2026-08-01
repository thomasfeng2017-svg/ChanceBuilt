/**
 * Development check for the "a paid order becomes build-sheet entries" path.
 *
 * Goes through markOrderPaid rather than reimplementing it, because the whole
 * point is to confirm the real webhook path writes the mods. Run with
 * RESEND_API_KEY unset so no mail is attempted.
 *
 *   npx tsx scripts/dev-check-build-sheet.ts <customer-email>
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { markOrderPaid } from "../src/lib/orders";

async function main() {

const email = process.argv[2] ?? "tester@example.com";

const customer = await prisma.customer.findUnique({
  where: { email },
  include: { vehicles: true },
});
if (!customer) throw new Error(`no customer ${email}`);
const vehicle = customer.vehicles[0];
if (!vehicle) throw new Error("customer has no cars");

const parts = await prisma.product.findMany({
  where: { category: { kind: "PART" } },
  take: 2,
  include: { category: true },
});
const merch = await prisma.product.findFirst({ where: { category: { kind: "MERCH" } } });

const number = `DEV${Date.now().toString(36).toUpperCase()}`;
const order = await prisma.order.create({
  data: {
    number,
    email,
    customerId: customer.id,
    garageVehicleId: vehicle.id,
    subtotalCents: 1000,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 1000,
    items: {
      create: [
        ...parts.map((p) => ({
          productId: p.id,
          name: p.name,
          sku: p.sku,
          unitPriceCents: p.priceCents,
          quantity: 1,
        })),
        ...(merch
          ? [
              {
                productId: merch.id,
                name: merch.name,
                sku: merch.sku,
                unitPriceCents: merch.priceCents,
                quantity: 1,
              },
            ]
          : []),
      ],
    },
  },
});

console.log(`order ${number} with ${parts.length} parts + ${merch ? 1 : 0} merch`);

const first = await markOrderPaid({ orderId: order.id });
console.log("markOrderPaid:", first);

// Replayed, the way Stripe retries. Must not duplicate anything.
const second = await markOrderPaid({ orderId: order.id });
console.log("replayed:", second);

const mods = await prisma.mod.findMany({
  where: { vehicleId: vehicle.id },
  orderBy: { createdAt: "asc" },
  select: { name: true, category: true, source: true, productId: true },
});
console.log(`\nbuild sheet for ${vehicle.year} ${vehicle.makeName} ${vehicle.modelName}:`);
for (const m of mods) console.log(` - [${m.source}] ${m.name} (${m.category ?? "no category"})`);

console.log(`\nexpected: the ${parts.length} parts as PURCHASED, the merch NOT present, no duplicates`);
await prisma.$disconnect();
}

main();
