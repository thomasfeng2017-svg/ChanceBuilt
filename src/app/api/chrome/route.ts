import { NextResponse } from "next/server";
import { getSessionCustomer } from "@/lib/customer-auth";

/**
 * The one thing the header cannot read from a cookie itself: who is signed in.
 *
 * The customer session cookie is httpOnly, as it should be, so the browser
 * asks here. Called once per page view by real visitors and never by crawlers,
 * which is the whole point: it replaces a session lookup that used to run on
 * every request to every page.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getSessionCustomer();
  return NextResponse.json(
    { customerName: customer?.name ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
