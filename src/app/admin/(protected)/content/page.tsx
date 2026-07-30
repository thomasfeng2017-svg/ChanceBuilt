import { requireUser, canWrite } from "@/lib/auth";
import { CONTENT_GROUPS } from "@/lib/content-blocks";
import { getCopyRows, getCustomisedKeys } from "@/lib/content";
import { ContentEditor } from "@/components/admin/ContentEditor";

export const metadata = { title: "Text" };

export default async function ContentPage() {
  const user = await requireUser("VIEWER");
  const readOnly = !canWrite(user.role);

  const [values, customised] = await Promise.all([getCopyRows(), getCustomisedKeys()]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="display text-2xl">Text</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The wording customers read. Changes go live as soon as you save, no developer
          needed. Clear a box and save to put it back the way it was written.
        </p>
      </header>

      {/*
        Instructions live here rather than in a README. Whoever is running the
        shop will never open a file in the repository, and a link syntax nobody
        can find is the same as not having one.
      */}
      <details className="mb-8 rounded-card border border-line bg-surface" open>
        <summary className="focus-ring cursor-pointer list-none rounded px-5 py-4 text-sm font-bold">
          How to add a link, and other bits
          <span className="ml-2 font-normal text-muted">(click to hide)</span>
        </summary>

        <div className="space-y-5 border-t border-line px-5 py-5 text-sm">
          <div>
            <p className="font-semibold">Links</p>
            <p className="mt-1 text-muted">
              Put the words in square brackets and where it goes in round brackets, right
              inside the sentence. You can add as many as you like.
            </p>
            <pre className="mt-2.5 overflow-x-auto rounded border border-line bg-surface-2 px-3.5 py-2.5 font-mono text-xs text-text">
{`The fastest way in is to [book online](/book).

More on [Instagram](https://instagram.com/chancebuiltllc).

Call [(951) 539-2901](tel:+19515392901).`}
            </pre>
          </div>

          <div>
            <p className="font-semibold">Pages you can link to</p>
            <p className="mt-1 text-muted">
              Start with a slash. These are the addresses of your own pages.
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted">
              {[
                "/",
                "/parts",
                "/merch",
                "/services",
                "/gallery",
                "/about",
                "/contact",
                "/book",
              ].map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
            <p className="mt-2 text-muted">
              For anything outside the site, paste the full address starting with
              <span className="font-mono"> https://</span>.
            </p>
          </div>

          <div>
            <p className="font-semibold">Line breaks</p>
            <p className="mt-1 text-muted">
              In the bigger boxes, pressing Enter starts a new line. That is how the large
              headings are split across two lines.
            </p>
          </div>

          <div>
            <p className="font-semibold">If something looks wrong</p>
            <p className="mt-1 text-muted">
              A link that does not work will just show as plain text with the brackets
              still in it, which usually means a bracket is missing. Nothing you type here
              can break the site, and clearing a box and saving always puts the original
              wording back.
            </p>
          </div>
        </div>
      </details>

      <ContentEditor
        groups={CONTENT_GROUPS}
        values={values}
        customised={[...customised]}
        readOnly={readOnly}
      />
    </div>
  );
}
