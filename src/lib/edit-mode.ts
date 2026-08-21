import "server-only";
import { cookies } from "next/headers";
import { getSessionUser, canWrite } from "./auth";

/**
 * In-place editing of site copy.
 *
 * Nothing here is specific to this shop. It works off the keyed content
 * registry, so dropping these files into another site gives that site inline
 * editing for whatever keys it declares.
 *
 * Two conditions must both hold for anything editable to render:
 *
 *   1. a staff session with write permission, checked server side
 *   2. the edit-mode cookie
 *
 * The permission check is the one that matters. The cookie is only a toggle so
 * staff can browse their own site normally without every heading sprouting an
 * outline, and it is worthless on its own: a visitor who sets it by hand still
 * fails the session check and gets the ordinary page.
 */

export const EDIT_MODE_COOKIE = "cb_edit";

export type EditContext = {
  /** Render editable affordances? */
  editing: boolean;
  /** Signed in with write access, whether or not edit mode is on. */
  canEdit: boolean;
};

/**
 * Whether this request should render editable copy.
 *
 * Deliberately not cached across requests: it depends on the session cookie,
 * and a cached "yes" leaking into an anonymous render would put edit handles on
 * the public site.
 */
export async function getEditContext(): Promise<EditContext> {
  const user = await getSessionUser();
  const canEdit = !!user && canWrite(user.role);
  if (!canEdit) return { editing: false, canEdit: false };

  const on = (await cookies()).get(EDIT_MODE_COOKIE)?.value === "1";
  return { editing: on, canEdit: true };
}
