import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { baseUrl } from "@/lib/stripe";

/**
 * The map handed to search engines.
 *
 * A local shop lives or dies on being found, and until now there was nothing
 * telling Google what pages exist. Product pages in particular are only
 * reachable through filtered listings, which crawlers are poor at exhausting.
 *
 * Built from the database on request rather than at build time, so a part added
 * in the admin is listed without a redeploy. Inactive products are left out,
 * since they 404.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();

  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/parts`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/services`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/book`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/merch`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/gallery`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/returns`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  /*
    An empty database should not take the sitemap down with it. A crawler that
    gets a 500 here may back off the whole site, which is a worse outcome than
    serving the static pages alone.
  */
  try {
    const products = await prisma.product.findMany({
      where: { archived: false },
      // Which side of the shop a product is on follows from its category, so
      // that is where the merch/part split has to be read from.
      select: { slug: true, updatedAt: true, category: { select: { kind: true } } },
    });

    for (const p of products) {
      pages.push({
        url: `${base}/${p.category.kind === "MERCH" ? "merch" : "parts"}/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // Static pages only. Better a short sitemap than no sitemap.
  }

  return pages;
}
