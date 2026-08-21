import "server-only";
import { headers } from "next/headers";
import { getSessionUser, canWrite } from "./auth";
import { EDIT_PARAM } from "./edit-mode-shared";

/**
 * In-place editing of site copy.
 *
 * Nothing here is specific to this shop. It works off the keyed content
 * registry, so dropping these files into another site gives that site inline
 * editing for whatever keys it declares.
 *
 * Two conditions must both hold before anything editable renders:
 *
 *   1. a staff session with write permission, checked server side
 *   2. ?edit=1 on the current URL
 *
 * The permission check is the one that matters. A visitor who adds ?edit=1 by
 * hand still fails it and gets the ordinary page.
 *
 * The URL, deliberately, and not a cookie. A cookie survived the whole browser
 * session, so once staff clicked into editing every page in every tab stayed
 * outlined until they remembered to turn it off, and browsing your own shop as
 * a customer became impossible. Keying off the URL makes normal browsing the
 * default and editing the thing you opt into, one page at a time.
 */

export { EDIT_PARAM };

export type EditContext = {
  /** Render editable affordances on this request? */
  editing: boolean;
};

/**
 * Whether this request should render editable copy.
 *
 * Never cached: it depends on the session and on the URL, and a cached "yes"
 * leaking into an anonymous render would put edit handles on the public site.
 */
export async function getEditContext(): Promise<EditContext> {
  const raw = (await headers()).get("x-url");
  const url = raw ? new URL(raw) : null;

  const asked = url?.searchParams.get(EDIT_PARAM) === "1";
  if (!asked) return { editing: false };

  const user = await getSessionUser();
  return { editing: !!user && canWrite(user.role) };
}
