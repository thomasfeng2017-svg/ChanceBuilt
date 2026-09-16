import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Makes that actually produced something in the given year.
 *
 * Filtering the *make* list by year (rather than only the model list) is what
 * stops a customer picking 1994 → Tesla and hitting a dead end.
 */
export async function GET(request: Request) {
  const yearParam = new URL(request.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : NaN;

  const makes = await prisma.make.findMany({
    where: Number.isInteger(year)
      ? { models: { some: { yearStart: { lte: year }, yearEnd: { gte: year } } } }
      : undefined,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Public reference data that changes only on a vehicle import. Cached at
  // the edge per year, so the picker stops costing a database query per
  // page view for every visitor and crawler that runs JavaScript.
  return NextResponse.json(
    { makes },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
