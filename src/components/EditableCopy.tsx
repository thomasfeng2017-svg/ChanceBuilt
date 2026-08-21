"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCopyBlockAction } from "@/app/admin/(protected)/content/actions";

/**
 * One block of site copy, edited where it sits.
 *
 * Only ever rendered when the server has already confirmed a staff session with
 * write access AND that edit mode is on. Nothing here re-checks that, because a
 * client-side check would be decoration; the server action behind the save does
 * the real enforcement.
 *
 * The text is injected with dangerouslySetInnerHTML rather than passed as
 * children, which looks alarming and is the thing that makes this work.
 *
 * With children, React owns the element's content and restores it on every
 * re-render. A contentEditable element re-rendered mid-typing loses whatever was
 * typed and drops focus, which is exactly what happened here: the first
 * keystroke reverted the heading. With dangerouslySetInnerHTML React compares
 * the html string, sees it unchanged, and leaves the DOM alone, so the browser
 * keeps ownership of the text while someone is editing it.
 *
 * The value is HTML-escaped on the way in. It comes from the database and is
 * written by staff, but "written by staff" is not a reason to let a stray
 * angle bracket become markup on the storefront.
 *
 * Editing shows the RAW value, links written as [label](/target), rather than
 * the rendered version. Editing rendered links in place means either building a
 * rich-text editor or silently discarding links whenever someone retypes a
 * sentence. Showing the source is honest and matches the admin form.
 */

/** Text to HTML. Newlines become breaks so multi-line blocks stay readable. */
function toHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

export function EditableCopy({
  blockKey,
  value,
  label,
}: {
  blockKey: string;
  value: string;
  /** Human name for the block, shown on hover so it is obvious what is what. */
  label?: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLSpanElement>(null);
  const [pending, start] = useTransition();
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  /** Put the DOM back to a known value without going through React. */
  const write = (text: string) => {
    if (ref.current) ref.current.innerHTML = toHtml(text);
  };

  const commit = () => {
    const next = ref.current?.innerText ?? "";
    if (next.trim() === value.trim()) {
      setState("idle");
      return;
    }

    start(async () => {
      const result = await saveCopyBlockAction(blockKey, next);
      if (!result.ok) {
        setState("error");
        setMessage(result.error);
        write(value); // never leave a failed change on screen
        return;
      }
      // Clearing a block reverts it to the wording in code rather than leaving
      // it blank, so show whatever actually took effect.
      if (result.value !== next.trim()) write(result.value);
      setState("saved");
      setMessage(null);
      router.refresh();
    });
  };

  return (
    <span className="relative inline">
      <span
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={label ? `Edit ${label}` : `Edit ${blockKey}`}
        title={label ?? blockKey}
        spellCheck
        onBlur={commit}
        onKeyDown={(e) => {
          // Escape abandons the edit. Without it the only way out is to blur,
          // which saves, so a mistyped heading would have no undo.
          if (e.key === "Escape") {
            e.preventDefault();
            write(value);
            ref.current?.blur();
          }
          // Enter commits on single-line blocks. Shift+Enter still breaks a
          // line, which multi-line blocks need.
          if (e.key === "Enter" && !e.shiftKey && !value.includes("\n")) {
            e.preventDefault();
            ref.current?.blur();
          }
        }}
        // See the note above: this is what stops React clobbering the text
        // while it is being typed.
        dangerouslySetInnerHTML={{ __html: toHtml(value) }}
        className={`-mx-1 rounded px-1 outline-none transition-colors ${
          pending ? "opacity-60" : ""
        } ${
          state === "error"
            ? "bg-bad/15 ring-1 ring-bad/50"
            : state === "saved"
              ? "bg-good/10 ring-1 ring-good/40"
              : "ring-1 ring-accent/30 hover:bg-accent/10 focus:bg-accent/10 focus:ring-accent"
        }`}
      />

      {state === "error" && message && (
        <span
          role="alert"
          className="absolute top-full left-0 z-50 mt-1 rounded bg-bad px-2 py-1 text-xs font-semibold whitespace-nowrap text-white"
        >
          {message}
        </span>
      )}
    </span>
  );
}
