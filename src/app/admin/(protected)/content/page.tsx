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

      <ContentEditor
        groups={CONTENT_GROUPS}
        values={values}
        customised={[...customised]}
        readOnly={readOnly}
      />
    </div>
  );
}
