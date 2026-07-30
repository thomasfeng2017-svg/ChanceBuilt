import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { markOrderPaid } from "@/lib/orders";
import { CART_COOKIE } from "@/lib/cart";

/**
 * Where Stripe sends the customer after paying.
 *
 * This clears the cart and forwards to the receipt. It does NOT treat arriving
 * here as proof of payment on its own: it re-reads the session from Stripe's
 * API before marking anything paid. That call is a belt-and-braces fallback for
 * a delayed webhook, and it's safe because markOrderPaid is idempotent, so
 * whichever path gets there first wins and the other is a no-op.
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  const origin = new URL(request.url).origin;

  if (!sessionId || !stripeConfigured()) {
    return NextResponse.redirect(`${origin}/cart`);
  }

  const order = await prisma.order.findUnique({ where: { stripeSessionId: sessionId } });
  if (!order) {
    return NextResponse.redirect(`${origin}/cart`);
  }

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      const address = session.collected_information?.shipping_details?.address;
      await markOrderPaid({
        orderId: order.id,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        email: session.customer_details?.email ?? null,
        shipping: address
          ? {
              name: session.collected_information?.shipping_details?.name ?? null,
              line1: address.line1,
              line2: address.line2,
              city: address.city,
              state: address.state,
              postal: address.postal_code,
              country: address.country,
            }
          : null,
      });
    }
  } catch (e) {
    // The webhook is the source of truth; if this lookup fails the customer
    // still gets their receipt page and the order still gets marked paid.
    console.error("[stripe] post-checkout lookup failed:", e);
  }

  const jar = await cookies();
  jar.delete(CART_COOKIE);

  return NextResponse.redirect(`${origin}/order/${order.number}`);
}
