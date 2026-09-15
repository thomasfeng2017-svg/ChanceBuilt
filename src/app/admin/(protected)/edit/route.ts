import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, canWrite } from "@/lib/auth";
import { EDIT_PARAM } from "@/lib/edit-mode-shared";

/**
 * The "Text" tab: open a page of the site with editing switched on.
 *
 * Exists so there is one obvious way to change wording. Before it, editing
 * lived behind a button on the storefront, which meant finding it required
 * already knowing it was there.
 *
 * Sets nothing and stores nothing. Edit mode is a URL parameter, so leaving the
 * page or opening a new tab returns to the ordinary site. That is deliberate:
 * an earlier version used a session cookie and staff could not browse their own
 * shop as a customer without remembering to switch editing off.
 *
 * `to` picks the landing page. Restricted to same-site paths, since it ends up
 * in a redirect and an open one would let a crafted link bounce a signed-in
 * staff member to another host.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !canWrite(user.role)) {
    return NextResponse.redirect(new URL("/admin/login", request.nextUrl.origin));
  }

  const requested = request.nextUrl.searchParams.get("to") ?? "/";
  const safe = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  const target = new URL(safe, request.nextUrl.origin);
  target.searchParams.set(EDIT_PARAM, "1");
  return NextResponse.redirect(target);
}
