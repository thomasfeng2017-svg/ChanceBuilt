import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSlotsForDay } from "@/lib/booking";

/** Availability for one service on one shop-local calendar date. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const serviceId = params.get("serviceId");
  const date = params.get("date");

  if (!serviceId || !date) {
    return NextResponse.json({ error: "serviceId and date are required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { durationMinutes: true, active: true },
  });
  if (!service || !service.active) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  const slots = await getSlotsForDay(date, service.durationMinutes);
  return NextResponse.json({ slots });
}
