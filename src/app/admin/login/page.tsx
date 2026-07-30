import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * Sits outside the (protected) route group so the auth guard doesn't send an
 * unauthenticated visitor into a redirect loop.
 */
export default async function LoginPage() {
  if (await getSessionUser()) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="display text-2xl">
            Chance<span className="text-muted">Built</span>
          </p>
          <p className="eyebrow mt-1 text-[0.6rem] text-muted">Shop admin</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-6">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Trouble signing in? Call the shop on{" "}
          <a href={SITE.phoneHref} className="focus-ring rounded text-text">
            {SITE.phone}
          </a>
        </p>
      </div>
    </div>
  );
}
