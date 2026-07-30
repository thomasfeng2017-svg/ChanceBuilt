import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Every model year we carry a vehicle for, newest first. */
export async function GET() {
  const range = await prisma.model.aggregate({
    _min: { yearStart: true },
    _max: { yearEnd: true },
  });

  const min = range._min.yearStart ?? 1990;
  const max = range._max.yearEnd ?? new Date().getFullYear();

  const years: number[] = [];
  for (let y = max; y >= min; y--) years.push(y);

  return NextResponse.json({ years });
}
