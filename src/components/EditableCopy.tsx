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
 * With children, React owns the element's content and rebuilds it constantly. A
 * contentEditable re-rendered mid-typing loses what was typed and drops focus,
 * which is exactly what happened here: the first keystroke reverted the
 * heading. With dangerouslySetInnerHTML the browser keeps ownership of the text
 * while someone is typing into it.
 *
 * That protection only holds for as long as nothing re-renders. A re-render
 * DOES put the element back to what React last rendered, so any change written
 * straight into the DOM is lost the moment some other state changes: the link
 * form cost an afternoon to exactly this, the link appearing and then silently
 * vanishing when the form closed. Hence `text` below. Typing stays out of React
 * so the caret survives, and anything programmatic goes through `write`, which
 * updates React and the DOM together.
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

/**
 * HTML back to text, the inverse of toHtml.
 *
 * Deliberately not innerText, which returns the *rendered* text and so applies
 * CSS text-transform. Most headings on this site are styled uppercase, so
 * reading innerText and saving it wrote "PLATFORMS WE KNOW INSIDE OUT" into the
 * database the first time anyone edited a heading, permanently replacing the
 * real wording with shouting. textContent is untransformed but drops the breaks
 * that separate paragraphs, so walk the nodes and keep both.
 */
function readText(root: HTMLElement): string {
  let out = "";

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.nodeValue ?? "";
        continue;
      }
      if (child.nodeName === "BR") {
        out += "\n";
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      // Browsers sometimes wrap a new line in a block element instead of
      // inserting a break, so treat that boundary as a line break too.
      const display = window.getComputedStyle(child as HTMLElement).display;
      const block = display !== "inline" && display !== "inline-block" && display !== "contents";

      if (block && out && !out.endsWith("\n")) out += "\n";
      walk(child);
      if (block && out && !out.endsWith("\n")) out += "\n";
    }
  };

  walk(root);
  return out;
}

/** Text to HTML. Newlines become breaks so multi-line blocks stay readable. */
function toHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

/**
 * Where a selection sits, as character offsets into the block's text.
 *
 * Offsets rather than a saved Range because the Range has to survive the user
 * clicking into the link form, which blurs the editor and re-renders the
 * component. A Range holds direct references to text nodes, and a link built
 * from a stale one silently lands at the start of the paragraph instead of
 * around the selected words. Offsets are rebuilt against whatever nodes exist
 * at the moment of insertion, so there is nothing to go stale.
 *
 * A <br> counts as one character, matching readText, so the two agree on what
 * position means.
 */
type Offsets = { start: number; end: number };

function textNodesOf(root: HTMLElement): Node[] {
  const nodes: Node[] = [];
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE || child.nodeName === "BR") nodes.push(child);
      else if (child.nodeType === Node.ELEMENT_NODE) walk(child);
    }
  };
  walk(root);
  return nodes;
}

const lengthOf = (node: Node) => (node.nodeName === "BR" ? 1 : (node.nodeValue ?? "").length);

function offsetsOf(root: HTMLElement, range: Range): Offsets | null {
  let start: number | null = null;
  let end: number | null = null;
  let seen = 0;

  for (const node of textNodesOf(root)) {
    if (node === range.startContainer) start = seen + range.startOffset;
    if (node === range.endContainer) end = seen + range.endOffset;
    seen += lengthOf(node);
  }

  // A selection anchored on the element itself rather than on a text node,
  // which happens for an empty block or a select-all.
  if (start === null && range.startContainer === root) start = 0;
  if (end === null && range.endContainer === root) end = seen;

  return start === null || end === null ? null : { start, end };
}

function rangeFromOffsets(root: HTMLElement, { start, end }: Offsets): Range {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(true);

  /*
    A <br> has no interior, so a boundary that falls "inside" it has to be
    expressed as a position in its parent: before it for offset 0, after it for
    offset 1. Getting that backwards puts the start of the selection on the
    wrong side of a line break, which silently swallows the break when the
    selection is replaced.
  */
  const place = (which: "start" | "end", node: Node, offset: number) => {
    if (node.nodeName === "BR") {
      const parent = node.parentNode as Node;
      const index =
        Array.from(parent.childNodes).indexOf(node as ChildNode) + (offset > 0 ? 1 : 0);
      if (which === "start") range.setStart(parent, index);
      else range.setEnd(parent, index);
      return;
    }
    if (which === "start") range.setStart(node, offset);
    else range.setEnd(node, offset);
  };

  let seen = 0;
  let placedStart = false;

  for (const node of textNodesOf(root)) {
    const len = lengthOf(node);
    if (!placedStart && start <= seen + len) {
      place("start", node, start - seen);
      placedStart = true;
    }
    if (placedStart && end <= seen + len) {
      place("end", node, end - seen);
      return range;
    }
    seen += len;
  }

  if (!placedStart) range.selectNodeContents(root);
  return range;
}

/**
 * Tidy up a typed address into something that will actually resolve.
 *
 * People paste "chancebuiltperformance.com" or type "/parts" or write out an
 * email. Only the second is already a working href, so fill in the rest rather
 * than saving a link that quietly goes nowhere. Anything already carrying a
 * scheme is left exactly as typed.
 */
function normaliseHref(raw: string): string {
  const href = raw.trim();
  if (!href) return "";
  if (href.startsWith("/") || href.startsWith("#")) return href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(href)) return `mailto:${href}`;
  return `https://${href}`;
}

export function EditableCopy({
  blockKey,
  value,
  label,
  links = true,
}: {
  blockKey: string;
  value: string;
  /** Human name for the block, shown on hover so it is obvious what is what. */
  label?: string;
  /** Whether this block renders links, and so whether Ctrl+K does anything. */
  links?: boolean;
}) {
  const router = useRouter();
  const ref = useRef<HTMLSpanElement>(null);
  const [pending, start] = useTransition();

  /*
    What React believes the block says.

    Typing does not go through here, on purpose: keystrokes must not re-render
    the element, or the caret jumps. This exists so that a re-render caused by
    something else, such as opening the link form, restores the current text
    rather than the text the page was first loaded with.
  */
  const [text, setText] = useState(value);
  // Adjust to a new server value during render rather than in an effect, so a
  // save that changes the wording does not paint the old text first.
  const [rendered, setRendered] = useState(value);
  if (rendered !== value) {
    setRendered(value);
    setText(value);
  }

  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  /*
    Link insertion state.

    `linking` is held in a ref as well as in state because blur has to read it
    synchronously. Clicking into the link form blurs the editable, which would
    otherwise save a half-finished edit and re-render the element out from under
    the selection we are about to restore.
  */
  const [linking, setLinking] = useState(false);
  const linkingRef = useRef(false);
  const savedOffsets = useRef<Offsets | null>(null);
  const [linkText, setLinkText] = useState("");
  const [linkHref, setLinkHref] = useState("");
  /** Open upwards when there is no room below, so the bottom bar cannot hide it. */
  const [linkAbove, setLinkAbove] = useState(false);
  const hrefInput = useRef<HTMLInputElement>(null);

  /*
    Set the block's content to a known value.

    Both halves are needed. The state update is what survives the next
    re-render; the direct DOM write is what makes it visible now, because when
    the new text equals what React already holds there is no re-render at all
    and the DOM would keep whatever was typed into it.
  */
  const write = (next: string) => {
    setText(next);
    if (ref.current) ref.current.innerHTML = toHtml(next);
  };

  const openLinkForm = () => {
    const root = ref.current;
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    // Only a selection inside this block is ours to wrap.
    if (!root || !range || !root.contains(range.commonAncestorContainer)) return;

    savedOffsets.current = offsetsOf(root, range);
    setLinkText(range.toString());
    setLinkHref("");

    // Opening the form re-renders, and a re-render restores what React holds.
    // Anything typed since the last save lives only in the DOM until now, so
    // hand it over before that happens or it is lost.
    setText(readText(root));

    // The editing bar is pinned to the bottom of the window, so a form opening
    // downwards from a block low on the page lands underneath it.
    const rect = root.getBoundingClientRect();
    setLinkAbove(rect.bottom + 210 > window.innerHeight - 64);

    linkingRef.current = true;
    setLinking(true);
  };

  const closeLinkForm = (refocus: boolean) => {
    linkingRef.current = false;
    setLinking(false);
    savedOffsets.current = null;
    if (refocus) ref.current?.focus();
  };

  const insertLink = () => {
    // Guards against a second call from the same activation, which would insert
    // the link twice, the caret having moved on.
    if (!linkingRef.current) return;

    const href = normaliseHref(linkHref);
    if (!href) return;

    /*
      Keep any space the selection picked up outside the link.

      Double-clicking a word selects its trailing space, so wrapping the
      selection verbatim produced "[turbo](/parts)BMWs" with the words run
      together. The space belongs to the sentence, not to the link.
    */
    const lead = linkText.match(/^\s*/)?.[0] ?? "";
    const trail = linkText.trim() ? (linkText.match(/\s*$/)?.[0] ?? "") : "";
    const label = linkText.trim() || href;

    const offsets = savedOffsets.current;
    const root = ref.current;
    linkingRef.current = false;
    setLinking(false);
    savedOffsets.current = null;
    if (!root || !offsets) return;

    /*
      Rebuild the whole text rather than inserting into the live selection.

      Closing this form is a state change, and a state change re-renders the
      editable, which puts its content back to whatever React last rendered.
      An insertion written straight into the DOM was therefore wiped a moment
      later, silently: the link appeared, then the block reverted, with no
      error anywhere. Going through React means the re-render is what applies
      the change instead of what undoes it.
    */
    const current = readText(root);
    const inserted = `${lead}[${label}](${href})${trail}`;
    write(current.slice(0, offsets.start) + inserted + current.slice(offsets.end));

    // Leave the caret after the link, where someone would carry on typing.
    const caret = offsets.start + inserted.length;
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(rangeFromOffsets(el, { start: caret, end: caret }));
    });
  };

  const commit = () => {
    // Mid-link. The click that blurred us was into the link form.
    if (linkingRef.current) return;

    const next = ref.current ? readText(ref.current) : "";
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
        onPaste={(e) => {
          /*
            Paste as plain text.

            A contentEditable accepts whatever the clipboard holds, so pasting
            from Word or a web page drops spans, styles and sometimes images
            straight into the element. The save reads innerText and would throw
            the markup away, but only after the editor has spent a while
            looking wrong, and an image pasted mid-sentence is worse than that.

            execCommand is deprecated and used deliberately: it is still the
            only insertion that participates in the browser native undo stack,
            so Ctrl+Z steps back through pastes like it does through typing.
            Rebuilding the selection by hand would break undo entirely.
          */
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        onKeyDown={(e) => {
          // Ctrl+K / Cmd+K inserts a link, the shortcut Docs, Slack and Notion
          // all use. Links are written as markdown source in the text, so this
          // is a shortcut for typing the brackets, not a rich-text editor.
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            if (!links) return; // block cannot render links, so leave Ctrl+K alone
            e.preventDefault();
            openLinkForm();
            return;
          }
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
        dangerouslySetInnerHTML={{ __html: toHtml(text) }}
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

      {linking && (
        /*
          Deliberately not window.prompt, which blurs the editable and would
          save a half-finished edit before the link ever went in. Rendering the
          form here keeps the page in one piece; commit() ignores the blur that
          moving into these fields causes.
        */
        <span
          className={`absolute left-0 z-50 flex w-72 flex-col gap-2 rounded border border-line-hi bg-ink p-3 text-left shadow-lg ${
            linkAbove ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              closeLinkForm(true);
            }
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              insertLink();
            }
          }}
        >
          <label className="flex flex-col gap-1 text-[0.7rem] tracking-widest text-muted uppercase">
            Text
            <input
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="focus-ring rounded border border-line bg-surface-2 px-2 py-1.5 text-sm normal-case tracking-normal text-text"
            />
          </label>

          <label className="flex flex-col gap-1 text-[0.7rem] tracking-widest text-muted uppercase">
            Link
            <input
              ref={hrefInput}
              autoFocus
              value={linkHref}
              onChange={(e) => setLinkHref(e.target.value)}
              placeholder="/parts or example.com"
              className="focus-ring rounded border border-line bg-surface-2 px-2 py-1.5 text-sm normal-case tracking-normal text-text"
            />
          </label>

          <span
            className="flex items-center gap-2"
            /*
              Pressing the mouse down on a button moves focus, and that focus
              change resets the selection we are about to write the link into.
              The click handler then ran against a caret that had already moved,
              so nothing was inserted. Cancelling the default keeps focus where
              it is until the handler has done its work. This is why the buttons
              worked when driven from script and not when actually clicked.
            */
            onMouseDown={(e) => e.preventDefault()}
          >
            <button
              type="button"
              onClick={insertLink}
              className="focus-ring rounded bg-accent px-3 py-1.5 text-xs font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
            >
              Add link
            </button>
            <button
              type="button"
              onClick={() => closeLinkForm(true)}
              className="focus-ring rounded px-2 py-1.5 text-xs text-muted hover:text-text"
            >
              Cancel
            </button>
          </span>
        </span>
      )}

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
