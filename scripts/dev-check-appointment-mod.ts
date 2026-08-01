/**
 * Creates a booking attached to a customer's saved car, so the
 * "mark completed writes it to the build sheet" path can be exercised through
 * the admin UI, which is where that code actually runs.
 *
 *   npx tsx --conditions=react-server scripts/dev-check-appointment-mod.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const email = process.argv[2] ?? "tester@example.com";

  const customer = await prisma.customer.findUnique({
    where: { email },
    include: { vehicles: true },
  });
  if (!customer) throw new Error(`no customer ${email}`);
  const vehicle = customer.vehicles[0];
  if (!vehicle) throw new Error("customer has no cars");

  const service = await prisma.service.findFirst({ where: { active: true } });
  if (!service) throw new Error("no active services");

  const reference = `DEVAPT${Date.now().toString(36).toUpperCase()}`;
  const startsAt = new Date();
  await prisma.appointment.create({
    data: {
      reference,
      serviceId: service.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + service.durationMinutes * 60 * 1000),
      customerName: customer.name,
      email: customer.email,
      phone: "555-0100",
      customerId: customer.id,
      garageVehicleId: vehicle.id,
      status: "CONFIRMED",
    },
  });

  console.log(`reference=${reference}`);
  console.log(`service=${service.name} (${service.category})`);
  console.log(`car=${vehicle.year} ${vehicle.makeName} ${vehicle.modelName}`);
  await prisma.$disconnect();
}

main();
