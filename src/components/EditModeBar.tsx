"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setEditModeAction } from "@/app/edit-mode-actions";

/**
 * The floating control for in-place editing.
 *
 * Only rendered for staff with write access. Two states: an unobtrusive prompt
 * while browsing normally, and a persistent bar while editing so it is never
 * ambiguous whether a click will edit the page or follow a link.
 *
 * Fixed to the bottom rather than the top: the top is where the site's own
 * header and the garage bar already live, and a third fixed strip up there
 * pushes the actual page out of view on a phone.
 */
export function EditModeBar({ editing }: { editing: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const toggle = (on: boolean) =>
    start(async () => {
      await setEditModeAction(on);
      router.refresh();
    });

  if (!editing) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => toggle(true)}
        className="focus-ring fixed right-4 bottom-4 z-50 rounded-full border border-line-hi bg-ink/90 px-4 py-2.5 text-xs font-bold tracking-widest text-muted uppercase shadow-lg backdrop-blur transition-colors hover:border-accent hover:text-text disabled:opacity-50"
      >
        {pending ? "…" : "Edit page"}
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-accent bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <span className="flex items-center gap-2 text-xs font-bold tracking-widest text-accent-text uppercase">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Editing
        </span>

        <p className="text-xs text-muted">
          Click any outlined text to change it. Esc undoes, clicking away saves.
        </p>

        <div className="ml-auto flex items-center gap-2">
          {/* Editing happens on the storefront, which has no admin nav, so the
              way back has to live here. */}
          <Link
            href="/admin"
            className="focus-ring rounded px-3 py-1.5 text-xs text-muted hover:text-text"
          >
            Admin
          </Link>
          <Link
            href="/admin/content"
            className="focus-ring rounded px-3 py-1.5 text-xs text-muted hover:text-text"
          >
            All text
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => toggle(false)}
            className="focus-ring rounded bg-accent px-4 py-1.5 text-xs font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
          >
            {pending ? "…" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
