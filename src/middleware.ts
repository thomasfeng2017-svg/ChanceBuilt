import { NextResponse, type NextRequest } from "next/server";

/**
 * Expose the request URL to server components.
 *
 * Exists for one reason: edit mode is driven by ?edit=1 on the URL rather than
 * by a stored flag, and the component that decides whether to render editable
 * copy sits in a layout. Layouts do not receive searchParams in the App Router,
 * so without this there is no way for it to see the query string.
 *
 * The earlier version used a cookie, which was worse in the way that matters:
 * it persisted for the whole browser session, so once staff entered edit mode
 * every page in every tab stayed outlined until they remembered to switch it
 * off. Reading it off the URL means browsing the site normally is the default
 * and editing is the deliberate exception, which is the right way round.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-url", request.nextUrl.toString());

  return NextResponse.next({ request: { headers } });
}

export const config = {
  /*
    Skip anything that cannot render a React tree. Running on static assets and
    image optimisation is pure overhead on every request for no benefit.
  */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|avif|svg|mp4|webm|ico)$).*)"],
};
