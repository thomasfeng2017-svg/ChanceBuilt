import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What ChanceBuilt Performance collects, why, who touches it, and how to get your data corrected or deleted.",
};

/** Static for the same reason as the returns page: policy edits should be
 *  deliberate code changes, not casual textarea edits. */

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

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header>
        <p className="m-rule eyebrow text-[0.7rem] text-muted">The fine print</p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">Privacy</h1>
        <p className="mt-3 text-sm text-muted">
          The short version: we collect what it takes to sell you parts and work on
          your car, we never see your card number, and we don&apos;t sell your data to
          anyone. Last updated {UPDATED}.
        </p>
      </header>

      <Section title="What we collect">
        <p>Depending on what you do on the site, we hold some of the following:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-text">Orders:</strong> your name, email, shipping
            address and what you bought. This exists whether or not you have an
            account, because we need it to ship parts and handle returns.
          </li>
          <li>
            <strong className="text-text">Appointments:</strong> your name, email,
            phone, the vehicle and the work requested.
          </li>
          <li>
            <strong className="text-text">Accounts:</strong> your name, email, an
            optional phone number, the cars you save and the build sheets you keep on
            them. Passwords are stored only as salted bcrypt hashes; nobody at the
            shop can read them.
          </li>
          <li>
            <strong className="text-text">Mailing list:</strong> your email, only if
            you signed up. Every message includes a way out.
          </li>
        </ul>
      </Section>

      <Section title="What we never see">
        <p>
          Payments are processed by Stripe. Your card number goes to Stripe, not to
          us, and it never touches our servers. We receive only the outcome of the
          payment and the shipping details you enter at checkout. Stripe&apos;s own
          privacy policy governs what they do, at stripe.com/privacy.
        </p>
      </Section>

      <Section title="How we use it">
        <p>
          To fulfill orders, run appointments, keep your garage and build sheets
          working, answer your questions, and send the emails those things require:
          order confirmations, shipping notices, booking confirmations and password
          resets. If you joined the mailing list, occasional shop news too. That is
          the whole list, and we don&apos;t sell or rent your information to anyone.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          The site uses functional cookies only: your cart, your selected vehicle,
          and a session cookie when you sign in. There are no advertising trackers
          and no third-party analytics cookies.
        </p>
      </Section>

      <Section title="Who touches the data">
        <p>
          The site runs on infrastructure that necessarily processes data on our
          behalf: Vercel (hosting), Neon (database), Stripe (payments), Resend
          (transactional email) and Cloudinary (image storage for the shop&apos;s own
          photos). Each is bound by its own privacy terms, and none of them may use
          your data for their own purposes.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Order and appointment records are kept as long as tax and accounting rules
          require. Account data is kept while the account exists. Mailing list
          entries are kept until you unsubscribe.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          Email{" "}
          <a href={`mailto:${SITE.email}`} className="focus-ring rounded text-text underline underline-offset-2">
            {SITE.email}
          </a>{" "}
          from the address on file and we will show you what we hold, correct it, or
          delete it. Deleting an account removes your garage and build sheets;
          records of completed orders are retained where the law requires it.
        </p>
      </Section>

      <Section title="Kids">
        <p>
          The site sells car parts and is not directed at children under 13, and we
          don&apos;t knowingly collect their information.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes, the date at the top changes with it, and anything
          material will be announced on the site rather than slipped in quietly.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          {SITE.legalName}, {SITE.address.street}, {SITE.address.city},{" "}
          {SITE.address.state} {SITE.address.zip}.{" "}
          <a href={`mailto:${SITE.email}`} className="focus-ring rounded text-text underline underline-offset-2">
            {SITE.email}
          </a>
        </p>
      </Section>
    </div>
  );
}
