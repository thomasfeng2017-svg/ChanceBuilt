"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createUserAction,
  resetUserPasswordAction,
  setUserActiveAction,
  setUserRoleAction,
} from "@/app/admin/actions";

type Row = {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "STAFF" | "VIEWER";
  active: boolean;
  lastLogin: string | null;
  createdAt: string;
};

const ROLES = ["OWNER", "STAFF", "VIEWER"] as const;

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring rounded bg-accent px-6 py-2.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
    >
      {pending ? "Adding…" : "Add user"}
    </button>
  );
}

/**
 * Set a new password for one user.
 *
 * The field is deliberately plain text rather than masked: whoever is doing
 * this has to read the password back out and pass it to the person locked out,
 * and a masked box they cannot check just produces typos and a second lockout.
 * It matches how the temporary password on "Add a user" already works.
 */
function ResetPassword({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(resetUserPasswordAction, null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring rounded border border-line px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-line-hi hover:text-text disabled:opacity-40"
      >
        Reset password
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full border-t border-line pt-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-56 flex-1">
          <span className="mb-1.5 block text-xs font-semibold">
            New password for {name}
          </span>
          <input
            name="password"
            type="text"
            required
            minLength={10}
            autoFocus
            placeholder="At least 10 characters"
            className="focus-ring w-full rounded border border-line bg-surface-2 px-3 py-2 text-sm placeholder:text-muted/50 hover:border-line-hi"
          />
        </label>
        <button
          type="submit"
          className="focus-ring rounded bg-accent px-4 py-2 text-xs font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
        >
          Set
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="focus-ring rounded px-3 py-2 text-xs font-semibold text-muted hover:text-text"
        >
          Cancel
        </button>
      </div>

      <p className="mt-1.5 text-xs text-muted">
        Signs them out everywhere. Give them the password and have them change it under
        Change password.
      </p>

      {state && !state.ok && (
        <p role="alert" className="mt-2 text-xs font-medium text-bad">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="mt-2 text-xs font-medium text-good">
          Password set. They can sign in with it now.
        </p>
      )}
    </form>
  );
}

export function UserAdmin({ actorId, users }: { actorId: string; users: Row[] }) {
  const router = useRouter();
  const [state, formAction] = useActionState(createUserAction, null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const input =
    "focus-ring w-full rounded border border-line bg-surface-2 px-3.5 py-2.5 text-sm placeholder:text-muted/50 hover:border-line-hi";

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Couldn't update that user.");
      router.refresh();
    });

  return (
    <div className="space-y-8">
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-4 p-4">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {u.name}
                {u.id === actorId && <span className="ml-2 text-xs text-muted">(you)</span>}
              </span>
              <span className="block truncate text-xs text-muted">{u.email}</span>
              <span className="block text-xs text-muted">
                {u.lastLogin
                  ? `Last signed in ${new Date(u.lastLogin).toLocaleDateString()}`
                  : "Never signed in"}
              </span>
            </span>

            <select
              aria-label={`Role for ${u.name}`}
              value={u.role}
              disabled={pending || u.id === actorId}
              onChange={(e) =>
                run(() =>
                  setUserRoleAction(u.id, e.target.value as (typeof ROLES)[number]),
                )
              }
              className="select-field focus-ring rounded border border-line bg-surface-2 px-3 py-2 text-sm disabled:opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={pending || u.id === actorId}
              onClick={() => run(() => setUserActiveAction(u.id, !u.active))}
              className={`focus-ring rounded border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                u.active
                  ? "border-line text-muted hover:border-bad/50 hover:text-bad"
                  : "border-good/40 text-good"
              }`}
            >
              {u.active ? "Deactivate" : "Reactivate"}
            </button>

            <ResetPassword userId={u.id} name={u.name} />
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm font-medium text-bad">
          {error}
        </p>
      )}

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="display mb-4 text-base">Add a user</h2>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Name</span>
            <input name="name" required className={input} placeholder="Chance" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Email</span>
            <input
              name="email"
              type="email"
              required
              className={input}
              placeholder="chance@chancebuilt.com"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Temporary password</span>
            <input
              name="password"
              type="text"
              required
              minLength={10}
              className={input}
              placeholder="At least 10 characters"
            />
            <span className="mt-1 block text-xs text-muted">
              Send it to them, and have them change it under Change password.
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Role</span>
            <select name="role" defaultValue="STAFF" className={`select-field ${input}`}>
              <option value="OWNER">Owner: everything, including users</option>
              <option value="STAFF">Staff: catalog, orders, appointments</option>
              <option value="VIEWER">Read only</option>
            </select>
          </label>

          {state && !state.ok && (
            <p
              role="alert"
              className="rounded border border-bad/30 bg-bad/10 px-3.5 py-2.5 text-sm font-medium text-bad sm:col-span-2"
            >
              {state.error}
            </p>
          )}
          {state?.ok && (
            <p className="rounded border border-good/30 bg-good/10 px-3.5 py-2.5 text-sm font-medium text-good sm:col-span-2">
              User added.
            </p>
          )}

          <div className="sm:col-span-2">
            <AddButton />
          </div>
        </form>
      </section>
    </div>
  );
}
