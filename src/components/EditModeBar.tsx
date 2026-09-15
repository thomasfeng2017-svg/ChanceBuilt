"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EDIT_PARAM } from "@/lib/edit-mode-shared";
import { useEditing } from "./EditProvider";

/** Links that should drop out of editing rather than carry it along. */
function leavesEditMode(url: URL, origin: string): boolean {
  return (
    url.origin !== origin ||
    // The admin has its own editing UI and no storefront layout, so carrying
    // the parameter in there would do nothing but sit in the address bar.
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api")
  );
}

/**
 * The bar shown while editing copy in place, plus the rule that keeps editing
 * switched on as you move around the site.
 *
 * There is deliberately no floating "Edit page" button during normal browsing.
 * Staff need to look at their own site the way a customer does, and a control
 * following them around every page is what made that annoying. Editing is
 * entered from the admin, on purpose.
 *
 * A client component, which it would not otherwise need to be, for two reasons.
 *
 * First, it is rendered by the storefront layout, and layouts are not
 * re-rendered when only the query string changes. The server had already
 * stopped marking text as editable after "Done", but this bar sat there
 * claiming the page was still in edit mode until a full reload.
 *
 * Second, editing has to survive ordinary navigation. Admin drops you on the
 * home page, so if clicking a link ended editing then the home page was the
 * only page anyone could ever edit. Internal links carry the parameter forward;
 * "Done" and anything leaving the storefront do not.
 *
 * The server still decides whether any of this renders. Hiding is a display
 * concern; permission is checked before the component is reached, and again
 * inside the save.
 */
export function EditModeBar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();

  // From the provider, not the URL: the URL says "asked", the provider says
  // "asked and the server agreed". An anonymous ?edit=1 gets no bar.
  const editing = useEditing();

  useEffect(() => {
    if (!editing) return;

    const onClick = (event: MouseEvent) => {
      // Let the browser handle anything that is not a plain left click:
      // ctrl/cmd-click opens a new tab, and that tab should be the ordinary
      // site rather than another editing session.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (event.defaultPrevented) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href) return;
      if (anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      // mailto:, tel: and #anchors are not navigations we can annotate.
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https?:/i.test(href)) return;
      if (href.startsWith("#")) return;

      const url = new URL(href, window.location.href);
      if (leavesEditMode(url, window.location.origin)) return;
      // The "Done" link is the way out, and it is the one internal link that
      // has deliberately had the parameter removed. Respect that.
      if (anchor.dataset.editExit === "1") return;
      if (url.searchParams.get(EDIT_PARAM) === "1") return;

      url.searchParams.set(EDIT_PARAM, "1");

      /*
        Capture phase, and stop the event here.

        React attaches its listeners to the root container, so this runs first.
        Preventing the default alone is not enough: Next's own Link handler
        would still fire on the way back up and push the un-annotated URL,
        dropping edit mode the moment you clicked anything.
      */
      event.preventDefault();
      event.stopPropagation();
      router.push(`${url.pathname}${url.search}${url.hash}`);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [editing, router]);

  if (!editing) return null;

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
          Use the menu to edit another page.
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
          {/*
            A plain anchor, not a Link, on purpose.

            Editing is entered by a redirect to ?edit=1, which is a hard load of
            a page that is prerendered without any query string. After that load
            the client router's idea of "where am I" is the prerendered URL, so
            asking it to go to the same path minus the parameter is, to it, a
            navigation to where it already is, and it does nothing. Done sat
            there doing nothing on the home page for exactly this reason. A
            full navigation sidesteps the router and lands on the clean page.
          */}
          <a
            href={exitHref}
            data-edit-exit="1"
            className="focus-ring rounded bg-accent px-4 py-1.5 text-xs font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
          >
            Done
          </a>
        </div>
      </div>
    </div>
  );
}
