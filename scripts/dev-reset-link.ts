/**
 * Print a working password-reset link for local testing.
 *
 * Goes through the real requestPasswordReset so the token, expiry and
 * throttling are the ones the site actually uses. The raw token is printed here
 * and nowhere else: the application never logs it, which is why this script has
 * to exist at all.
 *
 *   npx tsx --conditions=react-server scripts/dev-reset-link.ts <email>
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { requestPasswordReset } from "../src/lib/customer-auth";

async function main() {
  const email = process.argv[2] ?? "tester@example.com";

  // Clear the throttle so repeated runs during a test session still issue one.
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) throw new Error(`no customer ${email}`);
  await prisma.customerPasswordReset.deleteMany({ where: { customerId: customer.id } });

  let link = "";
  await requestPasswordReset(
    email,
    async (_to, _name, url) => {
      link = url;
    },
    "http://localhost:3000",
  );

  console.log(link || "(no link issued)");
  await prisma.$disconnect();
}

main();
