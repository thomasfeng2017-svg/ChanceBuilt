"use client";

import type { ReactNode } from "react";
import { useEditing } from "./EditProvider";
import { EditableCopy } from "./EditableCopy";

/**
 * Swaps rendered copy for an editor when the page is in edit mode.
 *
 * The rendered copy arrives as children, already produced on the server with
 * links resolved, so for a visitor this component adds nothing but a pass
 * through. Only when EditProvider has confirmed a staff session does it mount
 * the editor instead, using the raw value the server also passed down.
 */
export function CopySlot({
  k,
  value,
  label,
  links,
  children,
}: {
  k: string;
  value: string;
  label?: string;
  links: boolean;
  children: ReactNode;
}) {
  const editing = useEditing();
  if (!editing) return <>{children}</>;
  return <EditableCopy blockKey={k} value={value} label={label} links={links} />;
}
