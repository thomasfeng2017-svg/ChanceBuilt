import "server-only";
import { redirect } from "next/navigation";
import { getSessionCustomer, type SessionCustomer } from "./customer-auth";

/**
 * Routing guards for account pages.
 *
 * Split from customer-auth so that module stays free of next/navigation and can
 * be loaded by a plain script. See the note there.
 */

/** For pages under /account. Redirects rather than throwing. */
export async function requireCustomer(): Promise<SessionCustomer> {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/account/login");
  return customer;
}
