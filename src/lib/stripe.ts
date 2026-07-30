import "server-only";
import Stripe from "stripe";

/**
 * Stripe is optional at build time so the site still runs (and can be
 * demonstrated) before payment keys exist. Every call site checks
 * `stripeConfigured()` first and degrades to a manual, unpaid order.
 */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/**
 * Absolute base URL for Stripe redirect targets.
 * Vercel sets VERCEL_URL without a scheme, hence the prefixing.
 */
export function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
