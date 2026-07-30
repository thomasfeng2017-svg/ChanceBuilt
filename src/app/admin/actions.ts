"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  authenticate,
  createSession,
  destroySession,
  hashPassword,
  requireWriter,
  canManageUsers,
} from "@/lib/auth";

// ------------------------------------------------------------------- login --

export async function loginAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false as const, error: "Enter your email and password." };
  }

  const result = await authenticate(email, password);
  if (!result.ok) return { ok: false as const, error: result.error };

  const ua = (await headers()).get("user-agent") ?? undefined;
  await createSession(result.user.id, ua);

  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

// ------------------------------------------------------------------- users --

export async function createUserAction(_prev: unknown, formData: FormData) {
  const actor = await requireWriter("OWNER");
  if (!canManageUsers(actor.role)) {
    return { ok: false as const, error: "Only an owner can add users." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "STAFF");

  if (!email.includes("@")) return { ok: false as const, error: "Enter a valid email." };
  if (name.length < 2) return { ok: false as const, error: "Enter a name." };
  if (password.length < 10) {
    return { ok: false as const, error: "Password must be at least 10 characters." };
  }
  if (!["OWNER", "STAFF", "VIEWER"].includes(role)) {
    return { ok: false as const, error: "Pick a valid role." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false as const, error: "That email is already in use." };

  await prisma.user.create({
    data: {
      email,
      name,
      role: role as "OWNER" | "STAFF" | "VIEWER",
      passwordHash: await hashPassword(password),
    },
  });

  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function setUserActiveAction(userId: string, active: boolean) {
  const actor = await requireWriter("OWNER");

  // Don't let an owner lock themselves out.
  if (userId === actor.id && !active) {
    return { ok: false as const, error: "You can't deactivate your own account." };
  }

  await prisma.user.update({ where: { id: userId }, data: { active } });
  if (!active) {
    // Kill any live sessions immediately.
    await prisma.session.deleteMany({ where: { userId } });
  }

  revalidatePath("/admin/users");
  return { ok: true as const };
}

export async function setUserRoleAction(userId: string, role: "OWNER" | "STAFF" | "VIEWER") {
  const actor = await requireWriter("OWNER");

  if (userId === actor.id && role !== "OWNER") {
    return { ok: false as const, error: "You can't remove your own owner access." };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  return { ok: true as const };
}

/**
 * Set another user's password.
 *
 * The only way back in for someone who is locked out. Without it, a forgotten
 * password means a developer with shell access has to run a script, which is
 * not a workable answer for a shop that has been handed the keys to its own
 * site.
 *
 * Owner-only, and deliberately does NOT require the target's current password,
 * because the whole point is that nobody knows it. Every session for that user
 * is revoked, so if the account was compromised the reset ends it.
 */
export async function resetUserPasswordAction(_prev: unknown, formData: FormData) {
  const actor = await requireWriter("OWNER");
  if (!canManageUsers(actor.role)) {
    return { ok: false as const, error: "Only an owner can reset passwords." };
  }

  const userId = String(formData.get("userId") ?? "");
  const next = String(formData.get("password") ?? "");

  if (next.length < 10) {
    return { ok: false as const, error: "Password must be at least 10 characters." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false as const, error: "That account no longer exists." };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(next) },
  });
  await prisma.session.deleteMany({ where: { userId } });

  // Resetting your own password this way would sign you out mid-action, so
  // re-issue the session rather than bouncing to the login screen.
  if (userId === actor.id) await createSession(actor.id);

  revalidatePath("/admin/users");
  return { ok: true as const, email: target.email };
}

export async function changeOwnPasswordAction(_prev: unknown, formData: FormData) {
  const actor = await requireWriter("VIEWER");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  if (next.length < 10) {
    return { ok: false as const, error: "New password must be at least 10 characters." };
  }

  const result = await authenticate(actor.email, current);
  if (!result.ok) return { ok: false as const, error: "Current password is incorrect." };

  await prisma.user.update({
    where: { id: actor.id },
    data: { passwordHash: await hashPassword(next) },
  });

  // Sign out everywhere else.
  await prisma.session.deleteMany({ where: { userId: actor.id } });
  await createSession(actor.id);

  return { ok: true as const };
}
