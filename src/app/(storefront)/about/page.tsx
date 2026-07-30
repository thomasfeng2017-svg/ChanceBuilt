import type { Metadata } from "next";
import Link from "next/link";
import { SectionPhoto } from "@/components/SectionPhoto";
import { SITE, HOURS_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "ChanceBuilt Performance is a BMW-focused performance shop in Riverside, California specialising in turbocharged platforms.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="m-rule eyebrow text-[0.7rem] text-muted">Who we are</p>
        <h1 className="display mt-2 text-3xl sm:text-5xl">
          We only work on
          <br />
          turbo BMWs
        </h1>
      </header>

      <SectionPhoto
        slot="section:about-shop"
        alt="Inside the ChanceBuilt Performance shop in Riverside, California"
        className="mt-8 aspect-16/9 w-full rounded-card border border-line"
        sizes="(max-width: 896px) 100vw, 56rem"
        priority
      />

      <div className="mt-8 max-w-2xl space-y-5 text-sm leading-relaxed text-muted sm:text-base">
        <p>
          ChanceBuilt Performance is a BMW specialist shop in Riverside, California. Not a general
          repair shop that happens to take BMWs, but a shop that works on the same handful of engines
          every single day and knows exactly how they fail, how they respond to boost, and what          they need to survive it.
        </p>
        <p>
          That focus is the whole point. When an S55 comes in with a misfire under load, we are not
          guessing. When someone wants 700 wheel horsepower out of a B58, we can tell them what          that actually costs: in parts, in fuelling, and in how long the car lasts afterwards.
        </p>
        <p>
          We do the tuning in-house. We do the fabrication in-house. And we would rather talk you
          out of a bad idea than take your money for it.
        </p>
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
        className="mt-12 aspect-16/9 w-full rounded-card border border-line"
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
          <dl className="mt-3 space-y-2 text-sm">
            {HOURS_LABEL.map((h) => (
              <div key={h.days} className="flex justify-between gap-4">
                <dt className="text-muted">{h.days}</dt>
                <dd>{h.time}</dd>
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
