import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionCustomer } from "@/lib/customer-auth";
import { LoginForm } from "@/components/account/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getSessionCustomer()) redirect("/account");
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="eyebrow mb-2 text-[0.65rem] text-muted">Your garage</p>
      <h1 className="display mb-2 text-2xl sm:text-3xl">Sign in</h1>
      <p className="mb-8 text-sm text-muted">
        Keep your cars, your build sheets and your order history in one place.
      </p>
      <LoginForm next={next} />
    </div>
  );
}
