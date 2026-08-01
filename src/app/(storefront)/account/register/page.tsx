import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionCustomer } from "@/lib/customer-auth";
import { RegisterForm } from "@/components/account/AuthForm";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage() {
  if (await getSessionCustomer()) redirect("/account");

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="eyebrow mb-2 text-[0.65rem] text-muted">Your garage</p>
      <h1 className="display mb-2 text-2xl sm:text-3xl">Create an account</h1>
      <p className="mb-8 text-sm text-muted">
        Save your cars, keep a build sheet of everything fitted, and see what
        you&apos;ve ordered. You don&apos;t need one to buy or to book.
      </p>
      <RegisterForm />
    </div>
  );
}
