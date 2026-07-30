import { prisma } from "@/lib/db";
import { requireUser, canWrite } from "@/lib/auth";
import { listImages } from "@/lib/media";
import { SLOT_GROUPS, GALLERY_SLOT, ASPECT_CLASS, ASPECT_RATIO } from "@/lib/image-slots";
import { SlotEditor } from "@/components/admin/SlotEditor";
import { GalleryManager } from "@/components/admin/GalleryManager";
import { uploadDriver, uploadsMisconfigured } from "@/lib/uploads";

export const metadata = { title: "Photos" };

export default async function PhotosPage() {
  const user = await requireUser("VIEWER");
  const readOnly = !canWrite(user.role);

  const [rows, heroFiles, engineFiles, sectionFiles] = await Promise.all([
    prisma.siteImage.findMany({ orderBy: { sortOrder: "asc" } }),
    listImages("hero"),
    listImages("engines"),
    listImages("sections"),
  ]);

  const bySlot = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = bySlot.get(row.slot) ?? [];
    list.push(row);
    bySlot.set(row.slot, list);
  }

  /** A file still in public/ that the site would fall back to for this slot. */
  function fallbackFor(slot: string): string | null {
    if (slot === "hero") return heroFiles[0] ?? null;
    const [kind, stem] = slot.split(":");
    const files = kind === "engine" ? engineFiles : kind === "section" ? sectionFiles : [];
    return (
      files.find((f) => (f.split("/").pop() ?? "").replace(/\.[^.]+$/, "") === stem) ?? null
    );
  }

  const gallery = bySlot.get(GALLERY_SLOT) ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="display text-2xl">Photos</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Every photo on the public site except product shots, which live on each product.
          Click a photo to set which part of it must stay visible when it gets cropped.
        </p>
      </header>

      {uploadsMisconfigured() && (
        <p
          role="alert"
          className="mb-6 rounded border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad"
        >
          <strong>Uploads will not survive a deploy.</strong> No Cloudinary credentials are
          set, so files are being written to this server&apos;s disk, which is wiped on every
          release. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.
        </p>
      )}

      {uploadDriver() === "local" && !uploadsMisconfigured() && (
        <p className="mb-6 rounded border border-line bg-surface px-4 py-2.5 text-xs text-muted">
          Uploads are going to local disk (development). In production they go to Cloudinary.
        </p>
      )}

      {readOnly && (
        <p className="mb-6 rounded border border-line bg-surface px-4 py-2.5 text-sm text-muted">
          You have read-only access, so photos can be viewed but not changed.
        </p>
      )}

      <div className="space-y-12">
        {SLOT_GROUPS.map((group) => (
          <section key={group.title}>
            <div className="mb-4 border-b border-line pb-3">
              <h2 className="display text-lg">{group.title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">{group.blurb}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.slots.map((def) => {
                const row = (bySlot.get(def.slot) ?? [])[0] ?? null;
                return (
                  <SlotEditor
                    key={def.slot}
                    slot={def.slot}
                    label={def.label}
                    hint={def.hint}
                    aspectClass={ASPECT_CLASS[def.aspect]}
                    targetAspect={ASPECT_RATIO[def.aspect]}
                    readOnly={readOnly}
                    fallbackUrl={fallbackFor(def.slot)}
                    row={
                      row
                        ? {
                            id: row.id,
                            url: row.url,
                            alt: row.alt,
                            focalX: row.focalX,
                            focalY: row.focalY,
                            isVideo: row.kind === "VIDEO",
                            posterUrl: row.posterUrl,
                            fit: row.fit,
                            zoom: row.zoom,
                            bandHeight: row.bandHeight,
                          }
                        : null
                    }
                  />
                );
              })}
            </div>
          </section>
        ))}

        <section>
          <div className="mb-4 border-b border-line pb-3">
            <h2 className="display text-lg">Gallery</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              The /gallery page, in this order. The first four also appear as Recent work on
              the homepage, so put your best builds first.
            </p>
          </div>

          <GalleryManager
            readOnly={readOnly}
            rows={gallery.map((r) => ({
              id: r.id,
              url: r.url,
              alt: r.alt,
              caption: r.caption,
              focalX: r.focalX,
              focalY: r.focalY,
              active: r.active,
              isVideo: r.kind === "VIDEO",
              posterUrl: r.posterUrl,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
