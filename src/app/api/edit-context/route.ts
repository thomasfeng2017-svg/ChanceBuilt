import { NextResponse } from "next/server";
import { getSessionUser, canWrite } from "@/lib/auth";

/**
 * May this browser edit copy in place?
 *
 * This check used to run on the server for every storefront request, by way
 * of middleware that copied the URL into a header so the layout could look for
 * ?edit=1. That made every page dynamic and doubled the function invocations
 * per request. Now the page ships static, and only a browser that actually has
 * ?edit=1 in its address bar asks this question.
 *
 * The answer is still decided here, server side, from the staff session. A
 * visitor who types ?edit=1 gets `false` and the ordinary page.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json(
    { editing: !!user && canWrite(user.role) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
