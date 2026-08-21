import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, canWrite } from "@/lib/auth";
import { EDIT_MODE_COOKIE } from "@/lib/edit-mode";

/**
 * The "Text" tab: turn on in-place editing and drop the user on the site.
 *
 * A route handler rather than a page because it has to set a cookie, which a
 * server component cannot do during render.
 *
 * This exists so there is one obvious way to change wording. Before it, the
 * admin had a form full of fields at /admin/content while the actual live
 * editing lived behind a button on the storefront, which meant finding it
 * required knowing it was there. The form is still around for the cases live
 * editing cannot cover, but it is now the secondary route rather than the
 * front door.
 *
 * `to` lets a caller choose the landing page, so a future "edit this page"
 * link from anywhere can come through here. Restricted to same-site paths: it
 * ends up in a redirect, and an open one would let a crafted link bounce a
 * signed-in staff member off to another host.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !canWrite(user.role)) {
    return NextResponse.redirect(new URL("/admin/login", request.nextUrl.origin));
  }

  const requested = request.nextUrl.searchParams.get("to") ?? "/";
  const to = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  const response = NextResponse.redirect(new URL(to, request.nextUrl.origin));
  response.cookies.set(EDIT_MODE_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
