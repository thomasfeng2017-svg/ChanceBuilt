import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { CONTENT_DEFAULTS } from "./content-blocks";

/**
 * Reading editable copy.
 *
 * One query per request (React `cache` dedupes it), merged over the defaults in
 * content-blocks.ts. A missing row, an empty string, or a database that is
 * unreachable all fall back to the wording in code, so the worst case is the
 * site reads exactly as it was written rather than rendering blanks.
 *
 * Usage in a server component:
 *
 *   const copy = await getCopy();
 *   <h1>{copy("home.hero.headline")}</h1>
 */
export const getCopy = cache(async (): Promise<(key: string) => string> => {
  const rows = await prisma.contentBlock.findMany().catch(() => []);

  const overrides = new Map(
    rows
      // An edit cleared back to empty means "use the original", not "show nothing".
      .filter((r) => r.value.trim().length > 0)
      .map((r) => [r.key, r.value]),
  );

  return (key: string) => overrides.get(key) ?? CONTENT_DEFAULTS[key] ?? "";
});

/** Every block with its current value, for the admin screen. */
export const getCopyRows = cache(async (): Promise<Record<string, string>> => {
  const rows = await prisma.contentBlock.findMany().catch(() => []);
  const out: Record<string, string> = { ...CONTENT_DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  return out;
});

/**
 * Which keys the shop has actually changed.
 *
 * Used to show a "customised" marker in the admin, so it is obvious at a glance
 * what has been edited away from the original wording and what has not.
 */
export const getCustomisedKeys = cache(async (): Promise<Set<string>> => {
  const rows = await prisma.contentBlock.findMany({ select: { key: true, value: true } }).catch(() => []);
  return new Set(
    rows.filter((r) => r.value.trim() && r.value !== CONTENT_DEFAULTS[r.key]).map((r) => r.key),
  );
});
