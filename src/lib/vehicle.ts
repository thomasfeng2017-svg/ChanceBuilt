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
  /**
   * Set when this selection came from a saved car in an account's garage.
   *
   * The cookie stays the single source of "what am I shopping for" for guests
   * and account holders alike, so none of the fitment code had to learn about
   * accounts. This id is what lets an order be stamped with the car it was
   * bought for, which is how a purchase becomes a build-sheet entry.
   */
  savedId?: string | null;
};

export const GARAGE_COOKIE = "garage";
export const GARAGE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Set when the customer has closed the garage bar.
 *
 * A cookie rather than localStorage so the bar can be left out during server
 * rendering. Kept in state the client can read too, hence not httpOnly.
 */
export const GARAGE_BAR_COOKIE = "garage_bar_hidden";

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
    return {
      year: v.year,
      makeId: v.makeId,
      makeName: v.makeName,
      modelId: v.modelId,
      modelName: v.modelName,
      chassis: typeof v.chassis === "string" ? v.chassis : null,
      // Whitelisted rather than spread: this value is read back from a cookie
      // the customer controls and is used to look up a garage row, so it must
      // be a string or absent, never an object someone hand-edited in.
      savedId: typeof v.savedId === "string" ? v.savedId : null,
    };
  } catch {
    return null;
  }
}
