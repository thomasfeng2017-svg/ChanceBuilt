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

/**
 * AI training crawlers, told to go away entirely.
 *
 * In September 2026 one of these, Meta's, made 813,000 requests to this site
 * in a day and was the bulk of a bill that got the project paused. None of
 * them send a customer: they read the catalog to train models and give
 * nothing back, and the shop pays per request once past the hosting plan's
 * allowance.
 *
 * This is the polite layer. The publishers of these crawlers say they honour
 * robots.txt, but they re-read it on their own schedule, so the firewall deny
 * rule in Vercel is what actually stops them today. Search and answer-engine
 * crawlers that can send someone to the shop (Googlebot, Bingbot, OpenAI's
 * search bot) are deliberately not on this list.
 */
const AI_TRAINING_CRAWLERS = [
  "meta-externalagent",
  "GPTBot",
  "ClaudeBot",
  "Amazonbot",
  "CCBot",
  "Bytespider",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/account", "/cart", "/checkout", "/order"],
      },
      {
        userAgent: AI_TRAINING_CRAWLERS,
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
