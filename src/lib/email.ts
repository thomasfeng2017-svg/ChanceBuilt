import "server-only";
import { Resend } from "resend";
import { SITE, addressLine } from "./site";
import { formatCents } from "./money";
import { formatShopDateTime } from "./booking";

/**
 * Transactional email.
 *
 * Every send is best-effort and never throws into the caller. An order must not
 * fail because an email provider had a bad minute, and a webhook that throws
 * gets retried by Stripe, which would double-process the payment.
 *
 * With RESEND_API_KEY unset (local dev), messages are logged to the console
 * instead of sent, so the flow is still testable end to end.
 */

function configured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Where shop-facing notifications go. Falls back to the public address. */
function shopInbox(): string {
  return process.env.SHOP_NOTIFICATION_EMAIL || SITE.email;
}

let client: Resend | null = null;

type Message = { to: string; subject: string; html: string; replyTo?: string };

async function send(message: Message): Promise<boolean> {
  if (!configured()) {
    console.info(
      `[email] not configured, would have sent to ${message.to}: ${message.subject}`,
    );
    return false;
  }

  try {
    client ??= new Resend(process.env.RESEND_API_KEY);
    const result = await client.emails.send({
      from: process.env.EMAIL_FROM!,
      to: message.to,
      subject: message.subject,
      html: message.html,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    });
    if (result.error) {
      console.error("[email] send failed:", result.error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send threw:", e);
    return false;
  }
}

// ------------------------------------------------------------- templates ---

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/**
 * Plain, table-based HTML. Deliberately boring: email clients are hostile to
 * modern CSS, and a receipt that renders everywhere beats one that looks good
 * in three clients and broken in Outlook.
 */
function shell(heading: string, body: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:6px;">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e4e4e7;">
      <div style="font-size:18px;font-weight:800;letter-spacing:-0.02em;">CHANCEBUILT PERFORMANCE</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;margin-top:2px;">${escapeHtml(SITE.tagline)}</div>
    </td></tr>
    <tr><td style="padding:28px;">
      <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(heading)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:20px 28px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;">
      ${escapeHtml(addressLine)}<br>
      <a href="${SITE.phoneHref}" style="color:#18181b;">${escapeHtml(SITE.phone)}</a>
    </td></tr>
  </table>
</body></html>`;
}

function itemRows(
  items: Array<{ name: string; sku: string; quantity: number; unitPriceCents: number }>,
): string {
  return items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
          <div style="font-weight:600;">${escapeHtml(i.name)}</div>
          <div style="font-size:12px;color:#71717a;">${escapeHtml(i.sku)} &times; ${i.quantity}</div>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;text-align:right;white-space:nowrap;">
          ${formatCents(i.unitPriceCents * i.quantity)}
        </td>
      </tr>`,
    )
    .join("");
}

const totalRow = (label: string, value: string, bold = false) =>
  `<tr>
     <td style="padding:4px 0;${bold ? "font-weight:800;font-size:16px;" : "color:#71717a;"}">${escapeHtml(label)}</td>
     <td style="padding:4px 0;text-align:right;${bold ? "font-weight:800;font-size:16px;" : ""}">${escapeHtml(value)}</td>
   </tr>`;

// ---------------------------------------------------------------- orders ---

export type OrderEmailData = {
  number: string;
  email: string;
  items: Array<{ name: string; sku: string; quantity: number; unitPriceCents: number }>;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  vehicleLabel?: string | null;
  shipping?: {
    name?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal?: string | null;
  } | null;
};

export async function sendOrderConfirmation(order: OrderEmailData): Promise<boolean> {
  const address = order.shipping?.line1
    ? `<p style="margin:16px 0 0;font-size:13px;color:#71717a;">Shipping to<br>
        <span style="color:#18181b;">
          ${[order.shipping.name, order.shipping.line1, order.shipping.line2, `${order.shipping.city ?? ""} ${order.shipping.state ?? ""} ${order.shipping.postal ?? ""}`]
            .filter(Boolean)
            .map((l) => escapeHtml(String(l).trim()))
            .filter(Boolean)
            .join("<br>")}
        </span></p>`
    : "";

  return send({
    to: order.email,
    subject: `Order ${order.number} confirmed`,
    html: shell(
      "Thanks for your order",
      `<p style="margin:0 0 4px;">Order <strong>${escapeHtml(order.number)}</strong> is confirmed and we're getting it ready.</p>
       ${order.vehicleLabel ? `<p style="margin:0 0 16px;font-size:13px;color:#71717a;">For your ${escapeHtml(order.vehicleLabel)}</p>` : ""}
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
         ${itemRows(order.items)}
       </table>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:14px;">
         ${totalRow("Subtotal", formatCents(order.subtotalCents))}
         ${totalRow("Shipping", order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents))}
         ${totalRow("Tax", formatCents(order.taxCents))}
         ${totalRow("Total", formatCents(order.totalCents), true)}
       </table>
       ${address}
       <p style="margin:20px 0 0;font-size:13px;color:#71717a;">
         Wrong part? Reply to this email and we'll sort it. If we said it fits and it doesn't,
         return shipping is on us.
       </p>`,
    ),
    replyTo: shopInbox(),
  });
}

/**
 * Tracking URL for the carriers this shop actually posts with.
 *
 * Matched loosely on the name the shop typed, because they will write "ups",
 * "UPS Ground" or "United Parcel" depending on the day. An unrecognised
 * carrier returns null and the email shows the bare tracking number, which the
 * customer can paste into a search. That is a much better outcome than
 * refusing to accept a carrier that is not on a hardcoded list.
 */
function trackingUrl(carrier: string | null, tracking: string | null): string | null {
  if (!carrier || !tracking) return null;
  const c = carrier.toLowerCase();
  const t = encodeURIComponent(tracking.trim());

  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${t}`;
  if (c.includes("usps") || c.includes("postal")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
  }
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
  if (c.includes("dhl")) return `https://www.dhl.com/en/express/tracking.html?AWB=${t}`;
  return null;
}

export type ShippedEmailData = OrderEmailData & {
  carrier: string | null;
  trackingNumber: string | null;
};

export async function sendOrderShipped(order: ShippedEmailData): Promise<boolean> {
  const url = trackingUrl(order.carrier, order.trackingNumber);

  const tracking = order.trackingNumber
    ? `<p style="margin:16px 0 0;font-size:14px;">
         ${order.carrier ? `${escapeHtml(order.carrier)} &middot; ` : ""}
         ${
           url
             ? `<a href="${url}" style="color:#0066b1;">${escapeHtml(order.trackingNumber)}</a>`
             : `<strong>${escapeHtml(order.trackingNumber)}</strong>`
         }
       </p>`
    : "";

  const address = order.shipping?.line1
    ? `<p style="margin:16px 0 0;font-size:13px;color:#71717a;">On its way to<br>
        <span style="color:#18181b;">
          ${[order.shipping.name, order.shipping.line1, order.shipping.line2, `${order.shipping.city ?? ""} ${order.shipping.state ?? ""} ${order.shipping.postal ?? ""}`]
            .filter(Boolean)
            .map((l) => escapeHtml(String(l).trim()))
            .filter(Boolean)
            .join("<br>")}
        </span></p>`
    : "";

  return send({
    to: order.email,
    subject: `Order ${order.number} has shipped`,
    html: shell(
      "On its way",
      `<p style="margin:0 0 4px;">Order <strong>${escapeHtml(order.number)}</strong> has left the shop.</p>
       ${order.vehicleLabel ? `<p style="margin:0 0 16px;font-size:13px;color:#71717a;">For your ${escapeHtml(order.vehicleLabel)}</p>` : ""}
       ${tracking}
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
         ${itemRows(order.items)}
       </table>
       ${address}
       <p style="margin:20px 0 0;font-size:13px;color:#71717a;">
         Anything not right when it arrives, reply to this email and we'll sort it.
       </p>`,
    ),
    replyTo: shopInbox(),
  });
}

export async function sendOrderAlert(order: OrderEmailData): Promise<boolean> {
  return send({
    to: shopInbox(),
    subject: `New order ${order.number} - ${formatCents(order.totalCents)}`,
    html: shell(
      `New order ${order.number}`,
      `<p style="margin:0 0 4px;">${escapeHtml(order.email)}</p>
       ${order.vehicleLabel ? `<p style="margin:0 0 16px;font-size:13px;color:#71717a;">${escapeHtml(order.vehicleLabel)}</p>` : ""}
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
         ${itemRows(order.items)}
       </table>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:14px;">
         ${totalRow("Total", formatCents(order.totalCents), true)}
       </table>`,
    ),
    replyTo: order.email,
  });
}

// ----------------------------------------------------------- appointments ---

export type AppointmentEmailData = {
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  serviceName: string;
  startsAt: Date;
  vehicle?: string | null;
  notes?: string | null;
};

export async function sendBookingReceived(a: AppointmentEmailData): Promise<boolean> {
  return send({
    to: a.email,
    subject: `Appointment request received (${a.reference})`,
    html: shell(
      "We've got your request",
      `<p style="margin:0 0 16px;">
         Thanks ${escapeHtml(a.customerName.split(" ")[0])}. We'll confirm this before your slot,
         usually the same day.
       </p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
         ${detailRow("Service", a.serviceName)}
         ${detailRow("When", formatShopDateTime(a.startsAt))}
         ${a.vehicle ? detailRow("Vehicle", a.vehicle) : ""}
         ${detailRow("Reference", a.reference)}
       </table>
       <p style="margin:20px 0 0;font-size:13px;color:#71717a;">
         Need to change it? Call us on ${escapeHtml(SITE.phone)}.
       </p>`,
    ),
    replyTo: shopInbox(),
  });
}

export async function sendBookingAlert(a: AppointmentEmailData): Promise<boolean> {
  return send({
    to: shopInbox(),
    subject: `New booking: ${a.serviceName} - ${a.customerName}`,
    html: shell(
      "New appointment request",
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
         ${detailRow("Customer", a.customerName)}
         ${detailRow("Phone", a.phone)}
         ${detailRow("Email", a.email)}
         ${detailRow("Service", a.serviceName)}
         ${detailRow("When", formatShopDateTime(a.startsAt))}
         ${a.vehicle ? detailRow("Vehicle", a.vehicle) : ""}
         ${a.notes ? detailRow("Notes", a.notes) : ""}
       </table>`,
    ),
    replyTo: a.email,
  });
}

export async function sendBookingConfirmed(a: AppointmentEmailData): Promise<boolean> {
  return send({
    to: a.email,
    subject: `Appointment confirmed for ${formatShopDateTime(a.startsAt)}`,
    html: shell(
      "You're booked in",
      `<p style="margin:0 0 16px;">
         Confirmed. See you at the shop.
       </p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
         ${detailRow("Service", a.serviceName)}
         ${detailRow("When", formatShopDateTime(a.startsAt))}
         ${a.vehicle ? detailRow("Vehicle", a.vehicle) : ""}
         ${detailRow("Where", addressLine)}
       </table>`,
    ),
    replyTo: shopInbox(),
  });
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#71717a;width:110px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;">${escapeHtml(value).replace(/\n/g, "<br>")}</td>
  </tr>`;
}
