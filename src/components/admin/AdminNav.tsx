"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { logoutAction } from "@/app/admin/actions";
import type { SessionUser } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  STAFF: "Staff",
  VIEWER: "Read only",
};

type Item = { href: string; label: string; ownerOnly?: boolean; exact?: boolean };

const ITEMS: Item[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/content", label: "Text" },
  { href: "/admin/subscribers", label: "Mailing list" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/users", label: "Users", ownerOnly: true },
];

export function AdminNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const visible = ITEMS.filter((i) => !i.ownerOnly || user.role === "OWNER");

  const isActive = (item: Item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <nav
      aria-label="Admin"
      className="shrink-0 border-b border-line bg-surface lg:min-h-screen lg:w-60 lg:border-r lg:border-b-0"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
        <Link href="/admin" className="focus-ring block rounded">
          <span className="display text-base">
            Chance<span className="text-muted">Built</span>
          </span>
          <span className="eyebrow mt-0.5 block text-[0.55rem] text-muted">Shop admin</span>
        </Link>
        <Link
          href="/"
          className="focus-ring rounded text-xs text-muted hover:text-text lg:mt-3 lg:inline-block"
        >
          View site ↗
        </Link>
      </div>

      <ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-2 lg:flex-col lg:overflow-visible lg:px-3">
        {visible.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`focus-ring block rounded px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-accent text-accent-fg"
                    : "text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line px-5 py-4 lg:mt-auto">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
        <p className="mt-1 inline-block rounded border border-line-hi px-1.5 py-0.5 text-[0.6rem] font-bold tracking-widest text-muted uppercase">
          {ROLE_LABEL[user.role] ?? user.role}
        </p>

        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <Link href="/admin/account" className="focus-ring rounded text-muted hover:text-text">
            Change password
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => void logoutAction())}
            className="focus-ring rounded text-muted hover:text-bad disabled:opacity-50"
          >
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </nav>
  );
}
