import type { Metadata } from "next";
import Link from "next/link";
import { SectionPhoto } from "@/components/SectionPhoto";
import { Copy } from "@/components/Copy";
import { SITE, HOURS_LABEL, directionsUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ChanceBuilt Performance in Riverside, CA. ${SITE.phone}.`,
};

export default async function ContactPage() {

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="m-rule eyebrow text-[0.7rem] text-muted"><Copy k="contact.eyebrow" links={false} /></p>
        <h1 className="display mt-2 text-3xl sm:text-5xl"><Copy k="contact.heading" links={false} /></h1>
        <p className="mt-4 text-sm text-muted sm:text-base">
          <Copy k="contact.intro" />
        </p>
      </header>

      <SectionPhoto
        slot="section:contact-shop"
        alt="ChanceBuilt Performance, Riverside California"
        className="mt-8 aspect-4/3 w-full rounded-card border border-line"
        sizes="(max-width: 896px) 100vw, 56rem"
        priority
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <a
          href={SITE.phoneHref}
          className="focus-ring group rounded-card border border-line bg-surface p-6 transition-colors hover:border-line-hi"
        >
          <p className="eyebrow text-[0.65rem] text-muted">Phone</p>
          <p className="display mt-2 text-2xl transition-colors group-hover:text-muted">
            {SITE.phone}
          </p>
          <p className="mt-1 text-xs text-muted">Best for quotes and quick questions</p>
        </a>

        <a
          href={`mailto:${SITE.email}`}
          className="focus-ring group rounded-card border border-line bg-surface p-6 transition-colors hover:border-line-hi"
        >
          <p className="eyebrow text-[0.65rem] text-muted">Email</p>
          <p className="mt-2 text-base font-bold break-all transition-colors group-hover:text-muted">
            {SITE.email}
          </p>
          <p className="mt-1 text-xs text-muted">Parts enquiries and build planning</p>
        </a>

        <div className="rounded-card border border-line bg-surface p-6">
          <p className="eyebrow text-[0.65rem] text-muted">Shop</p>
          <address className="mt-2 text-sm not-italic">
            {SITE.address.street}
            <br />
            {SITE.address.city}, {SITE.address.state} {SITE.address.zip}
          </address>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring mt-3 inline-block rounded text-sm text-muted underline underline-offset-2 hover:text-text"
          >
            Get directions
          </a>
        </div>

        <div className="rounded-card border border-line bg-surface p-6">
          <p className="eyebrow text-[0.65rem] text-muted">Hours</p>
          {/* Only the time is nowrap here. These cards sit two-up and are about
              240px inside their padding, which fits the time (169px with its
              gap) but not the time and "Monday - Friday" together (294px).
              Pinning both would push the card wider than the grid and scroll the
              whole page sideways. */}
          <dl className="mt-2 space-y-2 text-sm">
            {HOURS_LABEL.map((h) => (
              <div key={h.days} className="flex justify-between gap-4">
                <dt className="text-muted">{h.days}</dt>
                <dd className="whitespace-nowrap">{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {[
          { label: "Instagram", href: SITE.social.instagram },
          { label: "YouTube", href: SITE.social.youtube },
          { label: "TikTok", href: SITE.social.tiktok },
          // Review platforms belong on the contact page more than the footer:
          // this is where someone deciding whether to trust the shop is looking.
          { label: "Reviews on Yelp", href: SITE.social.yelp },
          { label: "Google Business", href: SITE.social.google },
        ]
          // Unset accounts are dropped rather than shown as dead links.
          .filter((s): s is { label: string; href: string } => !!s.href)
          .map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring rounded border border-line px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-line-hi hover:text-text"
          >
            {s.label}
          </a>
        ))}
      </div>

      <div className="mt-12 rounded-card border border-line bg-surface p-6 text-center sm:p-8">
        <h2 className="display text-xl"><Copy k="contact.cta.heading" links={false} /></h2>
        <Link
          href="/book"
          className="focus-ring mt-5 inline-block rounded bg-accent px-8 py-3.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
        >
          Book an appointment
        </Link>
      </div>
    </div>
  );
}
