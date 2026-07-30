import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · ChanceBuilt Admin" },
  robots: { index: false, follow: false },
};

/**
 * Everything in this route group requires a signed-in user.
 *
 * The check lives in a layout rather than middleware because it needs a
 * database lookup, and middleware runs on the edge runtime where that is
 * awkward. A layout runs before any child page renders, so nothing leaks.
 */
export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("VIEWER");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav user={user} />
      <div className="min-w-0 flex-1 bg-ink">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">{children}</div>
      </div>
    </div>
  );
}
