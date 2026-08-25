import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/stripe";

/**
 * What search engines may crawl.
 *
 * Without this the site served a 404 for /robots.txt, which most crawlers treat
 * as "no restrictions" but which also means no pointer to the sitemap, so pages
 * are found only by following links.
 *
 * The blocked paths are not secrets, they are just noise: the admin needs a
 * login anyway, and account, cart and checkout pages are per-visitor and have
 * nothing to rank for. Keeping them out stops Google reporting a pile of
 * soft-404s and redirects for a small shop's site.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/account", "/cart", "/checkout", "/order"],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
