import { getCopy } from "@/lib/content";
import { getEditContext } from "@/lib/edit-mode";
import { contentBlockDef } from "@/lib/content-blocks";
import { CopyText } from "./CopyText";
import { EditableCopy } from "./EditableCopy";

/**
 * A block of site copy.
 *
 * The single call site for editable text. Pages write
 *
 *   <Copy k="about.heading" />
 *
 * and get plain rendered copy for visitors, or an in-place editor for staff who
 * have switched edit mode on. Nothing at the call site knows which, so adding
 * inline editing to another site is a matter of using this component and
 * declaring keys in the content registry.
 *
 * `links` renders [label](/target) as real links. Turn it off where a link
 * cannot go, such as inside a heading that is already wrapped in one.
 */
export async function Copy({
  k,
  links = true,
}: {
  k: string;
  links?: boolean;
}) {
  const [copy, edit] = await Promise.all([getCopy(), getEditContext()]);
  const value = copy(k);

  if (!edit.editing) {
    return links ? <CopyText>{value}</CopyText> : <>{value}</>;
  }

  return (
    <EditableCopy
      blockKey={k}
      value={value}
      label={contentBlockDef(k)?.label}
      links={links}
    />
  );
}
