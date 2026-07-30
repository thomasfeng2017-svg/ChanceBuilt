"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { saveContentAction } from "@/app/admin/(protected)/content/actions";
import type { ContentGroup } from "@/lib/content-blocks";

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="focus-ring rounded bg-accent px-7 py-3 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

/**
 * Editor for the site's marketing copy.
 *
 * One form for everything rather than a save button per field: the shop tends
 * to reword several related lines in one sitting, and a per-field save turns
 * that into a dozen round trips.
 *
 * Fields are uncontrolled (defaultValue) so typing stays snappy across ~25
 * textareas. The only state tracked is whether anything has been touched at
 * all, which is enough to keep Save disabled until there is something to save.
 */
export function ContentEditor({
  groups,
  values,
  customised,
  readOnly = false,
}: {
  groups: ContentGroup[];
  values: Record<string, string>;
  customised: string[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveContentAction, null);
  const [dirty, setDirty] = useState(false);
  const edited = new Set(customised);

  const field =
    "focus-ring w-full rounded border border-line bg-surface-2 px-3.5 py-2.5 text-sm leading-relaxed transition-colors placeholder:text-muted/50 hover:border-line-hi disabled:opacity-60";

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        setDirty(false);
        router.refresh();
      }}
      onChange={() => setDirty(true)}
    >
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.title} className="rounded-card border border-line bg-surface p-5">
            <h2 className="display text-base">{group.title}</h2>
            <p className="mt-1 mb-5 text-sm text-muted">{group.blurb}</p>

            <div className="space-y-5">
              {group.blocks.map((block) => (
                <label key={block.key} className="block">
                  <span className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{block.label}</span>
                    {edited.has(block.key) && (
                      <span className="rounded border border-accent/40 px-1.5 text-[0.6rem] font-bold tracking-wide text-accent-text uppercase">
                        Edited
                      </span>
                    )}
                  </span>

                  {block.hint && (
                    <span className="mb-1.5 block text-xs text-muted">{block.hint}</span>
                  )}

                  {block.multiline ? (
                    <textarea
                      name={block.key}
                      rows={block.text.length > 160 ? 4 : 2}
                      disabled={readOnly}
                      defaultValue={values[block.key]}
                      className={field}
                    />
                  ) : (
                    <input
                      name={block.key}
                      type="text"
                      disabled={readOnly}
                      defaultValue={values[block.key]}
                      className={field}
                    />
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      {!readOnly && (
        <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-4 border-t border-line bg-ink/95 py-4 backdrop-blur">
          <SaveButton disabled={!dirty} />

          {state?.ok && !dirty && (
            <p role="status" className="text-sm font-medium text-good">
              Saved.
              {state.changed > 0 && ` ${state.changed} updated.`}
              {state.reset > 0 && ` ${state.reset} put back to the original.`}
              {state.changed === 0 && state.reset === 0 && " Nothing had changed."}
            </p>
          )}
          {dirty && <p className="text-sm text-muted">Unsaved changes.</p>}
        </div>
      )}
    </form>
  );
}
