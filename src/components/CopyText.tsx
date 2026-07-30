import Link from "next/link";
import { Fragment } from "react";

/**
 * Editable copy, with links written inline.
 *
 * The shop writes a link the same way it would in Markdown:
 *
 *   Book online at [our booking page](/book).
 *   More on [Instagram](https://instagram.com/chancebuiltllc).
 *   Call [(951) 539-2901](tel:+19515392901).
 *
 * This replaced a version where each field had ONE hardcoded phrase pointing
 * at ONE hardcoded destination. That let the shop reword a sentence but not
 * add a link, move one, or point it somewhere else, which is not really a
 * content management system so much as a fill-in-the-blank.
 *
 * Anything that is not a well-formed link renders as ordinary text, so a
 * half-typed bracket shows as a bracket rather than breaking the page.
 */

/** Matches [label](target), non-greedy so two links on a line both match. */
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * Only these can be produced.
 *
 * Without this, `javascript:` in a link target would be an XSS hole reachable
 * by anyone with admin access. The shop is trusted, but "trusted" is not the
 * same as "should be able to run arbitrary script on the storefront", and an
 * admin account is exactly what an attacker would be trying to get.
 */
function safeHref(raw: string): { href: string; external: boolean } | null {
  const href = raw.trim();

  // Internal path.
  if (href.startsWith("/")) return { href, external: false };

  if (/^https?:\/\//i.test(href)) return { href, external: true };
  if (/^(mailto:|tel:)/i.test(href)) return { href, external: true };

  return null;
}

/** One line of copy, with any inline links resolved. */
function renderLine(line: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  LINK.lastIndex = 0;
  while ((match = LINK.exec(line)) !== null) {
    const [full, label, target] = match;
    const safe = safeHref(target);

    if (match.index > last) parts.push(line.slice(last, match.index));

    if (!safe) {
      // Unusable target: show the author's text rather than silently dropping
      // it, so a mistake is visible and fixable instead of invisible.
      parts.push(full);
    } else {
      const className = "focus-ring rounded text-text underline underline-offset-2";
      parts.push(
        safe.external ? (
          <a
            key={`${keyPrefix}-${match.index}`}
            href={safe.href}
            target={safe.href.startsWith("http") ? "_blank" : undefined}
            rel={safe.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className={className}
          >
            {label}
          </a>
        ) : (
          <Link key={`${keyPrefix}-${match.index}`} href={safe.href} className={className}>
            {label}
          </Link>
        ),
      );
    }

    last = match.index + full.length;
  }

  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

/**
 * Renders editable copy: newlines become line breaks, [text](/target) becomes
 * a link.
 *
 * Headlines are written across two lines on purpose ("BMW Performance" /
 * "Specialists") and the admin exposes that as a textarea, so the newline has
 * to survive or the shop loses control of where a large headline wraps.
 */
export function CopyText({ children }: { children: string }) {
  const lines = children.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderLine(line, String(i))}
        </Fragment>
      ))}
    </>
  );
}
