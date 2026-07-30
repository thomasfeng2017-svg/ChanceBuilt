import { cookies } from "next/headers";
import { GARAGE_COOKIE, parseVehicle, type Vehicle } from "./vehicle";

/**
 * Server-side access to the garage cookie.
 *
 * Reading the selected vehicle during server rendering is what lets the catalog
 * arrive already filtered, instead of flashing the unfiltered list and then
 * narrowing it on the client.
 *
 * Client components should import from `./vehicle` — this module pulls in
 * `next/headers` and is server-only.
 */
export async function getVehicle(): Promise<Vehicle | null> {
  const raw = (await cookies()).get(GARAGE_COOKIE)?.value;
  if (!raw) return null;
  return parseVehicle(raw);
}

export { GARAGE_COOKIE, GARAGE_MAX_AGE, vehicleLabel, parseVehicle } from "./vehicle";
export type { Vehicle } from "./vehicle";
