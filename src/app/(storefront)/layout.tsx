import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Logo } from "@/components/Logo";
import { SITE, HOURS_LABEL, addressLine } from "@/lib/site";
import { SubscribeForm } from "@/components/SubscribeForm";

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
  // Filtered: an empty string in sameAs is a structured-data error, and an
  // unconfirmed account should not be claimed to search engines at all.
  sameAs: [
    SITE.social.instagram,
    SITE.social.youtube,
    SITE.social.tiktok,
    SITE.social.yelp,
    SITE.social.google,
  ].filter(Boolean),
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
        {/* Two columns before four. Going straight to four at the md
            breakpoint left each one around 150px, which is too narrow for the
            opening hours: both the day range and the time wrapped onto two
            lines each and the block turned to mush. */}
        {/* Mailing list, above the columns so it is not buried. Most of the
            catalog is still waiting on stock, so "tell me when parts land" is
            a far stronger ask right now than a newsletter signup. */}
        <div className="border-b border-line/60">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="display text-lg">Parts landing soon</p>
              <p className="mt-1 max-w-md text-sm text-muted">
                New stock, group buys and build features. No spam, and one click to stop.
              </p>
            </div>
            <div className="w-full lg:max-w-sm">
              <SubscribeForm source="footer" />
            </div>
          </div>
        </div>

        {/* The last column is wider than the other three. It carries the
            address, phone, directions and the opening hours, while the two
            middle columns are short link lists. Four equal columns left it at
            210px on a 1024 screen, which is less than one line of hours needs,
            so the times wrapped no matter what the cap above says. */}
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1fr_1fr_1fr_1.5fr]">
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
              ]
                // Unset accounts are dropped rather than rendered as dead links.
                .filter((s): s is { label: string; short: string; href: string } => !!s.href)
                .map((s) => (
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
              <li><Link href="/parts" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">All Parts</Link></li>
              <li><Link href="/parts?category=tuning" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Tuning</Link></li>
              <li><Link href="/parts?category=turbo" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Turbo</Link></li>
              <li><Link href="/parts?category=exhaust" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Exhaust</Link></li>
              <li><Link href="/merch" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Merch</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3 text-[0.65rem] text-muted">Shop services</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/services" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">All Services</Link></li>
              <li><Link href="/book" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Book an Appointment</Link></li>
              <li><Link href="/gallery" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">Gallery</Link></li>
              <li><Link href="/about" className="focus-ring inline-block rounded py-1.5 text-muted hover:text-text">About the Shop</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3 text-[0.65rem] text-muted">Visit</p>
            <address className="text-sm text-muted not-italic">
              {SITE.address.street}
              <br />
              {SITE.address.city}, {SITE.address.state} {SITE.address.zip}
            </address>
            {/*
              Stacked in a flex column rather than left as two inline-block
              anchors on consecutive lines. JSX drops the whitespace between
              sibling elements that sit on separate lines, so the phone number
              and Directions rendered welded together as
              "(951) 539-2901Directions". A gap here cannot be lost the way a
              literal space can.
            */}
            <div className="mt-2 flex flex-col items-start gap-1">
              <a
                href={SITE.phoneHref}
                className="focus-ring rounded py-0.5 text-sm font-semibold hover:text-muted"
              >
                {SITE.phone}
              </a>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(addressLine)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring rounded py-0.5 text-sm text-muted underline underline-offset-2 hover:text-text"
              >
                Directions
              </a>
            </div>

            {/* Capped width so the closing times sit near the days instead of
                being flung to the far edge of a wide column.

                17rem, not 16. Both halves are nowrap and "Monday - Friday" plus
                "10:00 AM - 6:00 PM" plus the gap measure 259px, so a 256px cap
                missed by three pixels and flex-wrap dropped every weekday time
                onto its own line. Saturday and Sunday are shorter, so they fit
                and the block came out ragged. */}
            <dl className="mt-5 max-w-[17rem] space-y-1.5 text-xs text-muted">
              {HOURS_LABEL.map((h) => (
                <div key={h.days} className="flex flex-wrap justify-between gap-x-4">
                  <dt className="whitespace-nowrap">{h.days}</dt>
                  <dd className="whitespace-nowrap text-text/80">{h.time}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="border-t border-line/60 py-5 text-center text-xs text-muted">
          <p>
            © {new Date().getFullYear()}{" "}
            {SITE.legalName}. Riverside, California.
          </p>
          {/* Policy pages live here and only here. They earn a nav slot the day
              a customer actually asks for them; until then the footer is where
              everyone expects to find the fine print. */}
          <p className="mt-1.5 flex justify-center gap-x-4">
            <Link href="/returns" className="focus-ring rounded hover:text-text">
              Returns &amp; Warranty
            </Link>
            <Link href="/privacy" className="focus-ring rounded hover:text-text">
              Privacy
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
