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

  return NextResponse.json({ makes });
}
