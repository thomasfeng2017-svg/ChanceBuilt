"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireWriter } from "@/lib/auth";
import { EDIT_MODE_COOKIE } from "@/lib/edit-mode";

/**
 * Turn in-place editing on or off.
 *
 * Guarded by the same write permission the save itself requires. Setting the
 * cookie by hand achieves nothing, since every render re-checks the session,
 * but there is no reason to let an anonymous request set it at all.
 *
 * A session cookie, not a persistent one: edit mode should end when the browser
 * closes rather than leaving outlines on the site the next time someone opens
 * it on the shop iPad.
 */
export async function setEditModeAction(on: boolean) {
  await requireWriter("STAFF");

  const jar = await cookies();
  if (on) {
    jar.set(EDIT_MODE_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
  } else {
    jar.delete(EDIT_MODE_COOKIE);
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}
