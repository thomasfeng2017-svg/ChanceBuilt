import { Fragment } from "react";

/**
 * Renders editable copy, turning newlines into line breaks.
 *
 * Headlines are written across two lines on purpose ("BMW Performance" /
 * "Specialists"), and the admin exposes that as a textarea. Without this the
 * newline would collapse and the break would be lost, so the shop would have
 * no way to control where a large headline wraps.
 */
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
