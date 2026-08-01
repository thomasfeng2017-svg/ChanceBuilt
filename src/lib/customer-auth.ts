import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";
// From ./passwords rather than ./auth so this module never reaches the staff
// auth layer, which imports Next's router.
import { hashPassword, verifyPassword } from "./passwords";

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

/** Misses allowed before an account is briefly locked. */
const MAX_FAILED_LOGINS = 8;
/** How long the lock lasts. Long enough to kill guessing, short enough that a
 *  customer who fat-fingered their password is not phoning the shop. */
const LOCK_MINUTES = 15;

/** Reset links are short lived: long enough to find the email, not to sit in an
 *  inbox for a week waiting to be found by someone else. */
export const RESET_TOKEN_MINUTES = 60;
/** Minimum gap between reset emails, so the form cannot be used to mail-bomb. */
const RESET_THROTTLE_SECONDS = 60;

const MIN_PASSWORD = 8;

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

/** For server actions, which should fail loudly rather than redirect mid-write. */
export async function requireCustomerAction(): Promise<SessionCustomer> {
  const customer = await getSessionCustomer();
  if (!customer) throw new Error("Please sign in.");
  return customer;
}

/*
  The page guard that redirects lives in ./customer-guards, not here.

  `redirect` comes from next/navigation, which drags in the app-router React
  context. Importing it made this module impossible to load outside a rendering
  Next request, which meant the password and token logic could not be exercised
  by a script. Security-critical code that can only be run by clicking around a
  browser is code that does not get checked, so the routing concern was moved
  out and this file kept to crypto and database work.
*/

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

  /*
    bcrypt runs whether or not the account exists, and the locked-out branch is
    checked only after it. Returning early on a locked account before hashing
    would make locked accounts answer measurably faster than live ones, which
    hands an attacker a way to enumerate addresses using the very thing meant to
    protect them.
  */
  const valid = await verifyPassword(password, record?.passwordHash ?? DUMMY_HASH);

  if (record?.lockedUntil && record.lockedUntil > new Date()) {
    return {
      ok: false,
      error: "Too many attempts. Try again in a few minutes, or reset your password.",
    };
  }

  if (!record || !valid || !record.active) {
    if (record) {
      const failed = record.failedLogins + 1;
      await prisma.customer.update({
        where: { id: record.id },
        data: {
          failedLogins: failed,
          lockedUntil:
            failed >= MAX_FAILED_LOGINS
              ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
              : null,
        },
      });
    }
    return { ok: false, error: "Email or password is incorrect." };
  }

  await prisma.customer.update({
    where: { id: record.id },
    data: { lastLogin: new Date(), failedLogins: 0, lockedUntil: null },
  });

  return {
    ok: true,
    customer: { id: record.id, email: record.email, name: record.name },
  };
}

/**
 * Password rules, in one place so registration, reset and change agree.
 *
 * Length is the rule that actually matters, so there are no character-class
 * requirements: those push people towards Password1! and are worse than a
 * longer passphrase. The two extra checks reject the passwords that get owned
 * first, without pretending to be a real breach-corpus check.
 */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < MIN_PASSWORD) {
    return `Use a password of at least ${MIN_PASSWORD} characters.`;
  }
  const lower = password.toLowerCase();
  const OBVIOUS = [
    "password",
    "12345678",
    "123456789",
    "qwertyui",
    "letmein",
    "iloveyou",
    "chancebuilt",
  ];
  if (OBVIOUS.some((bad) => lower.includes(bad))) {
    return "That password is too easy to guess. Please pick another.";
  }
  if (email && lower.includes(email.trim().toLowerCase().split("@")[0])) {
    return "Please don't use your email address as your password.";
  }
  return null;
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
  const weak = passwordProblem(input.password, email);
  if (weak) return { ok: false, error: weak };

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

// ---------------------------------------------------------- password reset --

/**
 * Start a reset.
 *
 * Returns nothing about whether the address exists, and the caller shows the
 * same message either way. A reset form that says "no such account" is a free
 * tool for working out who shops here.
 *
 * Requesting again within the throttle window is a silent no-op rather than an
 * error, for the same reason: an error would confirm the address is real.
 */
export async function requestPasswordReset(
  email: string,
  sendLink: (to: string, name: string, url: string) => Promise<unknown>,
  baseUrl: string,
): Promise<void> {
  const normalised = email.trim().toLowerCase();
  const customer = await prisma.customer.findUnique({ where: { email: normalised } });
  if (!customer || !customer.active) return;

  const recent = await prisma.customerPasswordReset.findFirst({
    where: {
      customerId: customer.id,
      createdAt: { gt: new Date(Date.now() - RESET_THROTTLE_SECONDS * 1000) },
    },
    select: { id: true },
  });
  if (recent) return;

  // Any older link stops working the moment a new one is issued, so a forwarded
  // or shoulder-surfed email cannot be used after the real owner asks again.
  await prisma.customerPasswordReset.deleteMany({
    where: { customerId: customer.id, usedAt: null },
  });

  const token = randomBytes(32).toString("hex");
  await prisma.customerPasswordReset.create({
    data: {
      tokenHash: hashToken(token),
      customerId: customer.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000),
    },
  });

  // The raw token exists only in this URL and in the customer's inbox. It is
  // never logged and never stored.
  await sendLink(customer.email, customer.name, `${baseUrl}/account/reset/${token}`);
}

export type ResetResult = { ok: true } | { ok: false; error: string };

/**
 * Finish a reset.
 *
 * Every session is destroyed on success, not just the current one. If the
 * account was taken over, the reset has to be what removes the intruder, and
 * leaving their session alive would make the reset theatre.
 */
export async function resetPassword(token: string, password: string): Promise<ResetResult> {
  const record = await prisma.customerPasswordReset.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { customer: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date() || !record.customer.active) {
    return { ok: false, error: "That reset link has expired or already been used." };
  }

  const weak = passwordProblem(password, record.customer.email);
  if (weak) return { ok: false, error: weak };

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: record.customerId },
      // The lock is cleared too: someone who has proved control of the inbox
      // should not stay locked out by whoever was guessing at their password.
      data: { passwordHash, failedLogins: 0, lockedUntil: null },
    }),
    prisma.customerPasswordReset.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.customerPasswordReset.deleteMany({
      where: { customerId: record.customerId, usedAt: null },
    }),
    prisma.customerSession.deleteMany({ where: { customerId: record.customerId } }),
  ]);

  return { ok: true };
}

/** Is this reset link still good? Used to show the form or an error, not to authorise. */
export async function resetTokenValid(token: string): Promise<boolean> {
  const record = await prisma.customerPasswordReset.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { usedAt: true, expiresAt: true },
  });
  return !!record && !record.usedAt && record.expiresAt > new Date();
}

/**
 * Change a password while signed in.
 *
 * The current password is required, so someone who walks up to an unlocked
 * laptop cannot lock the owner out of their own account. Other sessions are
 * dropped, the current one is reissued.
 */
export async function changePassword(
  customerId: string,
  current: string,
  next: string,
): Promise<ResetResult> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { ok: false, error: "Please sign in again." };

  if (!(await verifyPassword(current, customer.passwordHash))) {
    return { ok: false, error: "Your current password isn't right." };
  }

  const weak = passwordProblem(next, customer.email);
  if (weak) return { ok: false, error: weak };

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash: await hashPassword(next) },
    }),
    prisma.customerSession.deleteMany({ where: { customerId } }),
  ]);

  return { ok: true };
}

// ------------------------------------------------------------ housekeeping --

/** Drop expired sessions and spent reset tokens. */
export async function pruneCustomerSessions(): Promise<number> {
  const now = new Date();
  const [sessions] = await Promise.all([
    prisma.customerSession.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.customerPasswordReset.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return sessions.count;
}
