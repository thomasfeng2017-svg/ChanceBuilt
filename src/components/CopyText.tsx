import Link from "next/link";
import { Fragment } from "react";

/**
 * Renders editable copy, turning newlines into line breaks.
 *
 * Headlines are written across two lines on purpose ("BMW Performance" /
 * "Specialists"), and the admin exposes that as a textarea. Without this the
 * newline would collapse and the break would be lost, so the shop would have
 * no way to control where a large headline wraps.
 */
/**
 * Editable copy with one phrase turned into a link.
 *
 * Some sentences have to contain a link ("book online", "Instagram"). Splitting
 * those into three separate fields would make the admin baffling, and hiding
 * the sentence from the admin entirely would leave holes in what the shop can
 * edit. So the whole sentence stays one editable field, and whichever phrase
 * matches becomes the link.
 *
 * If the phrase is edited out, the text still renders in full, just without a
 * link. That is the right failure: the words the shop wrote always win.
 */
export function CopyWithLink({
  text,
  phrase,
  href,
  external = false,
}: {
  text: string;
  phrase: string;
  href: string;
  external?: boolean;
}) {
  const at = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (at === -1) return <>{text}</>;

  const before = text.slice(0, at);
  const match = text.slice(at, at + phrase.length);
  const after = text.slice(at + phrase.length);
  const className = "focus-ring rounded text-text underline underline-offset-2";

  return (
    <>
      {before}
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {match}
        </a>
      ) : (
        <Link href={href} className={className}>
          {match}
        </Link>
      )}
      {after}
    </>
  );
}

export function CopyText({ children }: { children: string }) {
  const lines = children.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}
