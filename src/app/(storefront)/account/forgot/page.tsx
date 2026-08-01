import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/account/PasswordForms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="eyebrow mb-2 text-[0.65rem] text-muted">Your garage</p>
      <h1 className="display mb-2 text-2xl sm:text-3xl">Reset your password</h1>
      <p className="mb-8 text-sm text-muted">
        Enter the email you signed up with and we&apos;ll send you a link.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
