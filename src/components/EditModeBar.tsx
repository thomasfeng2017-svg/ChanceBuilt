"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { EDIT_PARAM } from "@/lib/edit-mode-shared";

/**
 * The bar shown while editing copy in place.
 *
 * There is deliberately no floating "Edit page" button during normal browsing.
 * Staff need to look at their own site the way a customer does, and a control
 * following them around every page is what made that annoying. Editing is
 * entered from the admin, on purpose, one page at a time.
 *
 * A client component, which it would not otherwise need to be, because it is
 * rendered by the storefront layout and layouts are not re-rendered when only
 * the query string changes. The server had already stopped marking text as
 * editable, but this bar sat there claiming the page was in edit mode until a
 * full reload. Reading the live URL here means it disappears the moment editing
 * does, whether that came from "Done" or from clicking any link on the site.
 *
 * The server still decides whether this renders at all. Hiding is a display
 * concern; permission is checked before the component is ever reached, and
 * again inside the save.
 */
export function EditModeBar() {
  const pathname = usePathname();
  const params = useSearchParams();

  if (params.get(EDIT_PARAM) !== "1") return null;

  const rest = new URLSearchParams(params);
  rest.delete(EDIT_PARAM);
  const query = rest.toString();
  const exitHref = query ? `${pathname}?${query}` : pathname;

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
          <Link
            href={exitHref}
            className="focus-ring rounded bg-accent px-4 py-1.5 text-xs font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
          >
            Done
          </Link>
        </div>
      </div>
    </div>
  );
}
