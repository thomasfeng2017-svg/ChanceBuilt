import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * The mailing list as a CSV.
 *
 * Fields are quoted and any embedded quote is doubled, per RFC 4180. Email
 * addresses can legitimately contain commas inside a quoted local part, and an
 * unescaped one silently shifts every later column — which in a mailing list
 * export means sending to the wrong addresses.
 */
function csvCell(value: string | null): string {
  const v = value ?? "";
  return `"${v.replace(/"/g, '""')}"`;
}

export async function GET() {
  // Same guard as the page: this is the whole audience in one file.
  await requireUser("VIEWER");

  const rows = await prisma.subscriber.findMany({ orderBy: { createdAt: "desc" } });

  const csv = [
    "email,source,status,signed_up",
    ...rows.map((r) =>
      [
        csvCell(r.email),
        csvCell(r.source),
        csvCell(r.unsubscribedAt ? "unsubscribed" : "subscribed"),
        csvCell(r.createdAt.toISOString().slice(0, 10)),
      ].join(","),
    ),
  ].join("\n");

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="chancebuilt-mailing-list-${stamp}.csv"`,
      // Never let a CDN or browser hold a copy of the customer list.
      "Cache-Control": "no-store",
    },
  });
}
