import type { Metadata } from "next";
import Link from "next/link";
import { SectionPhoto } from "@/components/SectionPhoto";
import { Copy } from "@/components/Copy";
import { SITE, HOURS_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "ChanceBuilt Performance is a BMW-focused performance shop in Riverside, California specializing in turbocharged platforms.",
};

export default async function AboutPage() {

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="m-rule eyebrow text-[0.7rem] text-muted"><Copy k="about.eyebrow" links={false} /></p>
        <h1 className="display mt-2 text-3xl sm:text-5xl">
          <Copy k="about.heading" />
        </h1>
      </header>

      <SectionPhoto
        slot="section:about-shop"
        alt="Inside the ChanceBuilt Performance shop in Riverside, California"
        className="mt-8 aspect-4/3 w-full rounded-card border border-line"
        sizes="(max-width: 896px) 100vw, 56rem"
        priority
      />

      {/* Full column width, matching the photos above and below rather than
          sitting in a narrower measure inside them. */}
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted sm:text-base">
        <p><Copy k="about.para1" /></p>
        <p><Copy k="about.para2" /></p>
        <p><Copy k="about.para3" /></p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SITE.platforms.map((p) => (
          <div key={p.code} className="rounded-card border border-line bg-surface p-5">
            <p className="display text-2xl">{p.code}</p>
            <p className="mt-1.5 text-xs text-muted">{p.blurb}</p>
          </div>
        ))}
      </div>

      <SectionPhoto
        slot="section:about-bays"
        alt="Cars on the lifts at ChanceBuilt Performance"
        className="mt-12 aspect-4/3 w-full rounded-card border border-line"
        sizes="(max-width: 896px) 100vw, 56rem"
      />

      <section className="mt-14 grid gap-8 rounded-card border border-line bg-surface p-6 sm:grid-cols-2 sm:p-8">
        <div>
          <h2 className="display text-lg">Visit the shop</h2>
          <address className="mt-3 text-sm text-muted not-italic">
            {SITE.address.street}
            <br />
            {SITE.address.city}, {SITE.address.state} {SITE.address.zip}
          </address>
          <a
            href={SITE.phoneHref}
            className="focus-ring mt-3 block rounded text-sm font-semibold hover:text-muted"
          >
            {SITE.phone}
          </a>
        </div>
        <div>
          <h2 className="display text-lg">Hours</h2>
          {/* Time nowrap, day label free to wrap. This column is about 247px on
              a small tablet, which holds the time but not the time and
              "Monday - Friday" together. See the contact page for the same
              trade. */}
          <dl className="mt-3 space-y-2 text-sm">
            {HOURS_LABEL.map((h) => (
              <div key={h.days} className="flex justify-between gap-4">
                <dt className="text-muted">{h.days}</dt>
                <dd className="whitespace-nowrap">{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/book"
          className="focus-ring rounded bg-accent px-8 py-3.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
        >
          Book service
        </Link>
        <Link
          href="/parts"
          className="focus-ring rounded border border-line-hi px-8 py-3.5 text-sm font-bold tracking-widest uppercase transition-colors hover:bg-surface-2"
        >
          Shop parts
        </Link>
      </div>
    </div>
  );
}
