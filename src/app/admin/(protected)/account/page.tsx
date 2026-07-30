import { requireUser } from "@/lib/auth";
import { PasswordForm } from "@/components/admin/PasswordForm";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireUser("VIEWER");

  return (
    <div className="max-w-lg">
      <header className="mb-6">
        <h1 className="display text-2xl">Your account</h1>
        <p className="mt-1 text-sm text-muted">
          {user.name} · {user.email}
        </p>
      </header>

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="display mb-1 text-base">Change password</h2>
        <p className="mb-4 text-sm text-muted">
          Changing this signs you out of every other device.
        </p>
        <PasswordForm />
      </section>
    </div>
  );
}
