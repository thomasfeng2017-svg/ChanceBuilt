/**
 * The one piece of edit mode that both sides need to agree on.
 *
 * Separate from edit-mode.ts because that module is server-only (it reads the
 * session), and the bar that shows while editing is a client component. A
 * shared constant beats each side hardcoding "edit" and drifting.
 */
export const EDIT_PARAM = "edit";
