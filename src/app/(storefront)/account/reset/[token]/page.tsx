import type { Metadata } from "next";
import Link from "next/link";
import { resetTokenValid } from "@/lib/customer-auth";
import { ResetPasswordForm } from "@/components/account/PasswordForms";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * Reset links must never be cached or indexed. `noindex` keeps them out of
 * search, and the dynamic segment plus this check means the page is rendered
 * per request rather than served from a cached copy with a stale verdict.
 */
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valid = await resetTokenValid(token);

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <meta name="robots" content="noindex, nofollow" />
      <p className="eyebrow mb-2 text-[0.65rem] text-muted">Your garage</p>
      <h1 className="display mb-2 text-2xl sm:text-3xl">Choose a new password</h1>

      {valid ? (
        <>
          <p className="mb-8 text-sm text-muted">
            Pick something you don&apos;t use anywhere else.
          </p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <>
          <p className="mb-6 rounded border border-bad/30 bg-bad/10 px-4 py-3 text-sm font-medium text-bad">
            That link has expired or has already been used. Reset links last an hour
            and work once.
          </p>
          <Link
            href="/account/forgot"
            className="focus-ring inline-block rounded bg-accent px-6 py-3 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
          >
            Send a new link
          </Link>
        </>
      )}
    </div>
  );
}
