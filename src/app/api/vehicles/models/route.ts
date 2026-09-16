import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Models for a make that were sold in the given year. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const makeId = params.get("makeId");
  const yearParam = params.get("year");
  const year = yearParam ? Number(yearParam) : NaN;

  if (!makeId) {
    return NextResponse.json({ error: "makeId is required" }, { status: 400 });
  }

  const rows = await prisma.model.findMany({
    where: {
      makeId,
      ...(Number.isInteger(year) ? { yearStart: { lte: year }, yearEnd: { gte: year } } : {}),
    },
    select: { id: true, name: true, chassis: true, engineCodes: true, yearStart: true, yearEnd: true },
    orderBy: [{ name: "asc" }, { yearStart: "asc" }],
  });

  // BMW owners identify cars by chassis code, so the picker label carries it:
  // "M3 (F80)" rather than three indistinguishable "M3" entries.
  const models = rows.map((m) => ({
    ...m,
    label: m.chassis ? `${m.name} (${m.chassis})` : m.name,
  }));

  // Same reasoning as the makes route: reference data, cached per make and
  // year at the edge for a day.
  return NextResponse.json(
    { models },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
