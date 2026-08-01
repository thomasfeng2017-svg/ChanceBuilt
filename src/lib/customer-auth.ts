import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./auth";

/**
 * Customer accounts.
 *
 * Same scheme as the staff login in `auth.ts` — bcrypt passwords, a random
 * token in the cookie of which only the SHA-256 hash is stored — but a
 * different cookie and a different table.
 *
 * The separation is the point. `User.role` defaults to STAFF, so a customer
 * living in that table would be one defaulting mistake away from the admin.
 * Keeping them apart means no bug in this file can hand out shop access, and
 * signing in here can never satisfy `requireUser`. The password and token
 * helpers are shared, because those are worth being identical in both places.
 *
 * Accounts never gate the shop: browsing, booking and checkout all still work
 * signed out. Nothing here should ever be called from a path that must serve a
 * guest.
 */

export const CUSTOMER_SESSION_COOKIE = "cb_customer";
const SESSION_DAYS = 30;

export type SessionCustomer = {
  id: string;
  email: string;
  name: string;
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// ---------------------------------------------------------------- sessions --

export async function createCustomerSession(
  customerId: string,
  userAgent?: string,
): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.customerSession.create({
    data: { tokenHash: hashToken(token), customerId, expiresAt, userAgent: userAgent ?? null },
  });

  (await cookies()).set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCustomerSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (token) {
    await prisma.customerSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(CUSTOMER_SESSION_COOKIE);
}

/** The signed-in customer, or null. Safe to call from any server component. */
export async function getSessionCustomer(): Promise<SessionCustomer | null> {
  const token = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { customer: true },
  });

  if (!session || session.expiresAt < new Date() || !session.customer.active) return null;

  return {
    id: session.customer.id,
    email: session.customer.email,
    name: session.customer.name,
  };
}

/** For pages under /account. Redirects rather than throwing. */
export async function requireCustomer(): Promise<SessionCustomer> {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/account/login");
  return customer;
}

/** For server actions, which should fail loudly rather than redirect mid-write. */
export async function requireCustomerAction(): Promise<SessionCustomer> {
  const customer = await getSessionCustomer();
  if (!customer) throw new Error("Please sign in.");
  return customer;
}

// -------------------------------------------------------------- login etc. --

/**
 * Same dummy hash trick as the staff login: bcrypt always runs, so response
 * timing does not reveal which email addresses have accounts.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7Q0BAg6a4XmXTgtdBjF/gWFN5oBQzWO";

export async function authenticateCustomer(
  email: string,
  password: string,
): Promise<{ ok: true; customer: SessionCustomer } | { ok: false; error: string }> {
  const normalised = email.trim().toLowerCase();
  const record = await prisma.customer.findUnique({ where: { email: normalised } });

  const valid = await verifyPassword(password, record?.passwordHash ?? DUMMY_HASH);

  if (!record || !valid || !record.active) {
    return { ok: false, error: "Email or password is incorrect." };
  }

  await prisma.customer.update({
    where: { id: record.id },
    data: { lastLogin: new Date() },
  });

  return {
    ok: true,
    customer: { id: record.id, email: record.email, name: record.name },
  };
}

export type RegisterResult =
  | { ok: true; customer: SessionCustomer; claimedOrders: number; claimedAppointments: number }
  | { ok: false; error: string };

/**
 * Create an account, and claim anything already bought or booked with the same
 * address.
 *
 * The claim is what makes an account worth making: someone who has ordered from
 * the shop before signs up and their history is already there, rather than an
 * empty page asking them to type it in.
 *
 * Matching on email alone is deliberate and is safe here only because it grants
 * no new capability: the order confirmation page is already reachable by anyone
 * with the order number, and nothing about claiming reveals a payment method or
 * changes an address. It does NOT auto-create build entries — those need a car
 * to attach to, which the customer picks afterwards.
 */
export async function registerCustomer(input: {
  email: string;
  name: string;
  password: string;
  phone?: string;
}): Promise<RegisterResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  if (!email.includes("@") || email.length < 5) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Use a password of at least 8 characters." };
  }

  const clash = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
  if (clash) {
    return { ok: false, error: "There's already an account with that email. Try signing in." };
  }

  const customer = await prisma.customer.create({
    data: {
      email,
      name,
      phone: input.phone?.trim() || null,
      passwordHash: await hashPassword(input.password),
    },
  });

  const [orders, appointments] = await Promise.all([
    prisma.order.updateMany({
      where: { email, customerId: null },
      data: { customerId: customer.id },
    }),
    prisma.appointment.updateMany({
      where: { email, customerId: null },
      data: { customerId: customer.id },
    }),
  ]);

  return {
    ok: true,
    customer: { id: customer.id, email: customer.email, name: customer.name },
    claimedOrders: orders.count,
    claimedAppointments: appointments.count,
  };
}

/** Housekeeping — drop expired sessions. */
export async function pruneCustomerSessions(): Promise<number> {
  const { count } = await prisma.customerSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
