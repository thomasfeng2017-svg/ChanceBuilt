/**
 * Vehicle types and pure helpers.
 *
 * Deliberately free of `next/headers` so client components can import it.
 * The server-only cookie reader lives in `garage.ts`, which re-exports
 * everything here.
 */

/** "The garage" — the vehicle the customer is currently shopping for. */
export type Vehicle = {
  year: number;
  makeId: string;
  makeName: string;
  modelId: string;
  modelName: string;
  /** BMW chassis code, when the model has one (F80, G80, ...). */
  chassis?: string | null;
};

export const GARAGE_COOKIE = "garage";
export const GARAGE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function vehicleLabel(v: Vehicle): string {
  return `${v.year} ${v.makeName} ${v.modelName}${v.chassis ? ` (${v.chassis})` : ""}`;
}

/** Parse and validate a garage cookie value. Returns null if unset or malformed. */
export function parseVehicle(raw: string): Vehicle | null {
  try {
    const v = JSON.parse(raw) as Partial<Vehicle>;
    if (
      typeof v.year !== "number" ||
      !Number.isInteger(v.year) ||
      typeof v.makeId !== "string" ||
      typeof v.makeName !== "string" ||
      typeof v.modelId !== "string" ||
      typeof v.modelName !== "string"
    ) {
      return null;
    }
    return v as Vehicle;
  } catch {
    return null;
  }
}
