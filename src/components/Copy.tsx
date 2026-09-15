import { getCopy } from "@/lib/content";
import { contentBlockDef } from "@/lib/content-blocks";
import { CopyText } from "./CopyText";
import { CopySlot } from "./CopySlot";

/**
 * A block of site copy.
 *
 * The single call site for editable text. Pages write
 *
 *   <Copy k="about.heading" />
 *
 * and get plain rendered copy, which becomes an in-place editor only in a
 * browser that has opened the page from the admin. Nothing at the call site
 * knows which, so adding inline editing to another site is a matter of using
 * this component and declaring keys in the content registry.
 *
 * Reads no cookies and no headers, on purpose. It used to check the edit
 * session here on the server, and that one check made every page that
 * contains any copy at all uncacheable. The check now happens in the browser,
 * after the page has already been served from cache.
 *
 * `links` renders [label](/target) as real links. Turn it off where a link
 * cannot go, such as inside a heading that is already wrapped in one.
 */
export async function Copy({ k, links = true }: { k: string; links?: boolean }) {
  const copy = await getCopy();
  const value = copy(k);

  return (
    <CopySlot k={k} value={value} label={contentBlockDef(k)?.label} links={links}>
      {links ? <CopyText>{value}</CopyText> : value}
    </CopySlot>
  );
}
