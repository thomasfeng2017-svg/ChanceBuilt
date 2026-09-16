import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Every model year we carry a vehicle for, newest first.
 *
 * Cached at the edge for a day. The vehicle picker asks for this on every
 * page where it is shown, and the answer changes only when vehicles are
 * imported, which is rare. Without the cache, a crawler that runs JavaScript
 * turned every page view into a database query through this route, on top
 * of the page itself.
 */
export const revalidate = 86400;

export async function GET() {
  const range = await prisma.model.aggregate({
    _min: { yearStart: true },
    _max: { yearEnd: true },
  });

  const min = range._min.yearStart ?? 1990;
  const max = range._max.yearEnd ?? new Date().getFullYear();

  const years: number[] = [];
  for (let y = max; y >= min; y--) years.push(y);

  return NextResponse.json(
    { years },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
