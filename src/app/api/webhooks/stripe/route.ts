import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { markOrderPaid } from "@/lib/orders";
import { prisma } from "@/lib/db";

/**
 * Stripe webhook. This, and only this, marks an order paid.
 *
 * The signature check is the security boundary: without it anyone could POST a
 * fake "payment succeeded" event and get free parts. It needs the raw request
 * body, which is why we read text() rather than json().
 */
export async function POST(request: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (e) {
    console.error("[stripe] signature verification failed:", e);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.payment_status !== "paid") break;

        const orderId = session.metadata?.orderId;
        if (!orderId) {
          console.error("[stripe] session without orderId metadata:", session.id);
          break;
        }

        const address = session.collected_information?.shipping_details?.address;
        await markOrderPaid({
          orderId,
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
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        if (orderId) {
          // Only cancel if it never got paid, so a late success can't be undone.
          await prisma.order.updateMany({
            where: { id: orderId, paidAt: null },
            data: { status: "CANCELLED" },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    // Returning 500 makes Stripe retry, which is what we want for a transient
    // database problem.
    console.error("[stripe] handler failed:", e);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
