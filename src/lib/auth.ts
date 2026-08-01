import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./passwords";

/**
 * Session-cookie authentication for the admin.
 *
 * Deliberately small and dependency-light so it ports cleanly to the next
 * project. The shape worth keeping:
 *
 *  - The cookie carries a 256-bit random token. Only its SHA-256 hash is
 *    stored, so a database dump can't be replayed as a login.
 *  - Sessions live in a table, which means revoking access is a row delete
 *    rather than waiting for a JWT to expire.
 *  - Passwords are bcrypt hashed with a per-password salt.
 */

export const SESSION_COOKIE = "cb_session";
const SESSION_DAYS = 14;

// Re-exported so existing callers keep importing these from here.
export { hashPassword, verifyPassword };

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// ---------------------------------------------------------------- sessions --

export async function createSession(userId: string, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, userAgent: userAgent ?? null },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Safe to call from any server component. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.active) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

// ------------------------------------------------------------------- roles --

const RANK: Record<UserRole, number> = { VIEWER: 0, STAFF: 1, OWNER: 2 };

/** Can this role perform actions at `required` level or above? */
export function roleAtLeast(role: UserRole, required: UserRole): boolean {
  return RANK[role] >= RANK[required];
}

/** True when the role may change data at all. */
export const canWrite = (role: UserRole) => roleAtLeast(role, "STAFF");
/** True when the role may manage users. */
export const canManageUsers = (role: UserRole) => roleAtLeast(role, "OWNER");

/**
 * Require a signed-in user of at least `required` role.
 * Redirects to the login page (or an access-denied page) rather than throwing,
 * so it can be called straight from a layout or page.
 */
export async function requireUser(required: UserRole = "VIEWER"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!roleAtLeast(user.role, required)) redirect("/admin?denied=1");
  return user;
}

/**
 * Guard for server actions. Unlike requireUser it throws, because an action
 * that mutates data should fail loudly rather than redirect mid-write.
 */
export async function requireWriter(required: UserRole = "STAFF"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not signed in.");
  if (!roleAtLeast(user.role, required)) {
    throw new Error("You don't have permission to do that.");
  }
  return user;
}

// ------------------------------------------------------------------- login --

/**
 * Verify credentials. Always runs a bcrypt comparison even when the account
 * doesn't exist, so response timing doesn't reveal which emails are registered.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7Q0BAg6a4XmXTgtdBjF/gWFN5oBQzWO";

export async function authenticate(
  email: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const normalised = email.trim().toLowerCase();
  const record = await prisma.user.findUnique({ where: { email: normalised } });

  const valid = await verifyPassword(password, record?.passwordHash ?? DUMMY_HASH);

  if (!record || !valid || !record.active) {
    return { ok: false, error: "Email or password is incorrect." };
  }

  await prisma.user.update({
    where: { id: record.id },
    data: { lastLogin: new Date() },
  });

  return {
    ok: true,
    user: { id: record.id, email: record.email, name: record.name, role: record.role },
  };
}

/** Constant-time string compare, for anything else that needs it. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Housekeeping — drop expired sessions. Call from a cron if you add one. */
export async function pruneSessions(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
