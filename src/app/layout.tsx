import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

/**
 * Barlow Condensed for display type.
 *
 * Condensed grotesques are the motorsport idiom (race numbers, technical
 * plates), and it holds up far better than a neutral grotesque at the sizes the
 * hero uses. Body stays on Inter rather than Barlow: Inter is the stronger
 * interface face at 14-16px, and the contrast between condensed headings and a
 * neutral body is the point.
 */
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} · ${SITE.tagline} | Riverside, CA`,
    template: `%s · ${SITE.shortName}`,
  },
  description: SITE.description,
  openGraph: {
    title: `${SITE.name} · ${SITE.tagline}`,
    description: SITE.description,
    type: "website",
    locale: "en_US",
  },
  // Google Search Console ownership for https://www.chancebuiltperformance.com/.
  // A public token, not a secret. Removing it un-verifies the property, so it
  // stays even though verification only has to succeed once.
  verification: {
    google: "a0RzcjvFa84SFfOUr1YROzmuX-arPLV9iGuMH-hT_Wo",
  },
};

/**
 * Root layout — document shell only.
 *
 * The public site's header and footer live in `(storefront)/layout.tsx`, and
 * the admin has its own chrome, so neither leaks into the other.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
