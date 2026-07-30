import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Logo } from "@/components/Logo";
import { SITE, HOURS_LABEL, addressLine } from "@/lib/site";

/**
 * Public storefront chrome.
 *
 * Lives in a route group so the admin (which shares the root layout's fonts and
 * stylesheet) doesn't inherit the shop header, footer or local-business
 * structured data.
 */

/** Local-business structured data so the shop shows up properly in search. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  name: SITE.legalName,
  description: SITE.description,
  telephone: SITE.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.city,
    addressRegion: SITE.address.state,
    postalCode: SITE.address.zip,
    addressCountry: "US",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "10:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "11:00",
      closes: "18:00",
    },
  ],
  sameAs: [SITE.social.instagram, SITE.social.youtube, SITE.social.tiktok],
};

export default function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      {/* Header reads cookies, so it opts out of static rendering. */}
      <Suspense fallback={<div className="h-40 border-b border-line bg-ink" />}>
        <Header />
      </Suspense>

      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>

      <footer className="mt-20 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo height={44} />
            <p className="eyebrow mt-3 text-[0.6rem] text-muted">{SITE.tagline}</p>
            <p className="mt-4 text-sm text-muted">
              Turbo BMW specialists in Riverside. Tuning, performance, maintenance and full race
              car builds.
            </p>
            <div className="mt-5 flex gap-2">
              {[
                { label: "Instagram", short: "IG", href: SITE.social.instagram },
                { label: "YouTube", short: "YT", href: SITE.social.youtube },
                { label: "TikTok", short: "TT", href: SITE.social.tiktok },
              ].map((s) => (
                <a
                  key={s.short}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-field text-xs font-bold text-muted transition-colors hover:border-accent hover:text-text"
                >
                  {s.short}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3 text-[0.65rem] text-muted">Shop</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/parts" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">All parts</Link></li>
              <li><Link href="/parts?category=tuning" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Tuning</Link></li>
              <li><Link href="/parts?category=turbo" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Turbo</Link></li>
              <li><Link href="/parts?category=exhaust" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Exhaust</Link></li>
              <li><Link href="/merch" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Merch</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3 text-[0.65rem] text-muted">Shop services</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/services" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">All services</Link></li>
              <li><Link href="/book" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Book an appointment</Link></li>
              <li><Link href="/gallery" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Gallery</Link></li>
              <li><Link href="/about" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">About the shop</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3 text-[0.65rem] text-muted">Visit</p>
            <address className="text-sm text-muted not-italic">
              {SITE.address.street}
              <br />
              {SITE.address.city}, {SITE.address.state} {SITE.address.zip}
            </address>
            <a
              href={SITE.phoneHref}
              className="focus-ring mt-1 inline-block rounded py-1.5 text-sm font-semibold hover:text-muted"
            >
              {SITE.phone}
            </a>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(addressLine)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-block rounded py-1.5 text-sm text-muted underline underline-offset-2 hover:text-text"
            >
              Directions
            </a>
            <dl className="mt-4 space-y-1 text-xs text-muted">
              {HOURS_LABEL.map((h) => (
                <div key={h.days} className="flex justify-between gap-3">
                  <dt>{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="border-t border-line/60 py-5 text-center text-xs text-muted">
          © {new Date().getFullYear()}{" "}
          {SITE.legalName}. Riverside, California.
        </div>
      </footer>
    </>
  );
}
