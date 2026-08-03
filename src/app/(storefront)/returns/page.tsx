import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Returns & Warranty",
  description:
    "Return windows, restocking terms and warranty handling for parts and merch bought from ChanceBuilt Performance.",
};

/**
 * Static rather than CMS-backed on purpose. Policy text is the one kind of copy
 * where a quick edit can quietly change what the shop has legally promised, so
 * changes should go through a deliberate code review, not a textarea.
 */

const UPDATED = "August 2, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="display text-lg">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted sm:text-base">
        {children}
      </div>
    </section>
  );
}

export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header>
        <p className="m-rule eyebrow text-[0.7rem] text-muted">The fine print</p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">Returns &amp; Warranty</h1>
        <p className="mt-3 text-sm text-muted">
          The short version: unused parts come back within 30 days, software and
          special orders don&apos;t, and if we got it wrong we make it right at our
          cost. Last updated {UPDATED}.
        </p>
      </header>

      <Section title="Returns">
        <p>
          Parts can be returned within <strong className="text-text">30 days of delivery</strong>{" "}
          as long as they are unused, uninstalled and in their original packaging with
          all hardware and documentation. Merch comes back in the same window unworn
          and unwashed.
        </p>
        <p>
          Start every return by emailing{" "}
          <a href={`mailto:${SITE.email}`} className="focus-ring rounded text-text underline underline-offset-2">
            {SITE.email}
          </a>{" "}
          with your order number so we can authorize it and give you the return
          address. Returns that arrive without authorization may be refused.
        </p>
        <p>
          Refunds go back to the original payment method within 10 business days of
          the part passing inspection. Opened but unused parts may carry a 15%
          restocking fee. Return shipping is on you unless the return is our fault,
          in which case it is on us.
        </p>
      </Section>

      <Section title="What can't come back">
        <p>
          Some things can&apos;t be undone once they leave, so these are final sale:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Software and tuning licenses (bootmod3, MHD and similar) once the license
            has been issued or bound to a vehicle.
          </li>
          <li>Custom and special-order items ordered specifically for your build.</li>
          <li>Anything that has been installed, fitted, modified or run on a vehicle.</li>
          <li>Gift cards.</li>
        </ul>
      </Section>

      <Section title="Wrong, damaged or missing items">
        <p>
          Check your parts when they arrive. If something shows up damaged, isn&apos;t
          what you ordered, or is missing, tell us within{" "}
          <strong className="text-text">48 hours of delivery</strong> with photos of
          the part and the packaging. We&apos;ll sort a replacement or a refund,
          shipping on us, and we&apos;ll deal with the carrier so you don&apos;t have to.
        </p>
      </Section>

      <Section title="Warranty">
        <p>
          New parts carry their manufacturer&apos;s warranty, and the manufacturer&apos;s
          terms control what is and isn&apos;t covered. If a part fails inside its
          warranty period, contact us first: we deal with these brands every week and
          will run the claim with you.
        </p>
        <p>
          Work performed by the shop is guaranteed against defects in workmanship. If
          something we installed or tuned isn&apos;t right, bring the car back and we
          will make it right.
        </p>
      </Section>

      <Section title="Off-road and competition parts">
        <p>
          Some parts we sell are intended solely for off-road and competition use and
          are marked as such. It is the buyer&apos;s responsibility to know whether a
          part is legal for street use where the vehicle is registered. Returns of
          these parts follow the same rules as everything else above.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          Not sure whether something qualifies? Ask before you buy or before you open
          the box:{" "}
          <a href={`mailto:${SITE.email}`} className="focus-ring rounded text-text underline underline-offset-2">
            {SITE.email}
          </a>{" "}
          or{" "}
          <a href={SITE.phoneHref} className="focus-ring rounded text-text underline underline-offset-2">
            {SITE.phone}
          </a>
          . A two-minute call beats a return every time.
        </p>
      </Section>
    </div>
  );
}
