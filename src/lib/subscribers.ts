import "server-only";
import { prisma } from "./db";

/**
 * Mailing list signups.
 *
 * Stored here first, then mirrored to Resend if an audience is configured. The
 * order matters: the shop's own copy must not depend on a third party being
 * reachable, so a Resend outage costs a sync, not a subscriber.
 */

/** Deliberately permissive. Rejecting valid-but-unusual addresses loses people. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type SubscribeResult =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; error: string };

export async function subscribe(rawEmail: string, source: string): Promise<SubscribeResult> {
  const email = rawEmail.trim().toLowerCase();

  if (!EMAIL.test(email)) {
    return { ok: false, error: "That doesn't look like an email address." };
  }
  if (email.length > 254) {
    return { ok: false, error: "That address is too long." };
  }

  const existing = await prisma.subscriber.findUnique({ where: { email } });

  // Already on the list and never left: say so rather than pretending it is new.
  if (existing && !existing.unsubscribedAt) {
    return { ok: true, alreadySubscribed: true };
  }

  await prisma.subscriber.upsert({
    where: { email },
    // A previous unsubscribe is cleared, because they have just asked again.
    update: { unsubscribedAt: null, source },
    create: { email, source },
  });

  await syncToResend(email);

  return { ok: true, alreadySubscribed: false };
}

/**
 * Mirror a contact into the Resend audience used for broadcasts.
 *
 * Best effort by design. A failure here must never make the signup look
 * broken to someone standing in the shop's footer: they are on the list
 * either way, and the admin can export and re-import.
 *
 * Needs RESEND_API_KEY and RESEND_AUDIENCE_ID. Without them this is a no-op,
 * which is the correct behaviour in development.
 */
async function syncToResend(email: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const audience = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audience) return;

  try {
    const res = await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, unsubscribed: false }),
    });
    if (!res.ok) {
      console.error("[subscribers] resend sync failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("[subscribers] resend sync threw:", e);
  }
}

export async function unsubscribe(rawEmail: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase();
  const { count } = await prisma.subscriber.updateMany({
    where: { email, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });
  return count > 0;
}
