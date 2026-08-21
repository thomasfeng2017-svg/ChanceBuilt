import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSiteImages } from "@/lib/site-images";
import { GalleryVideo } from "@/components/GalleryVideo";
import { GALLERY_SLOT } from "@/lib/image-slots";
import { Copy } from "@/components/Copy";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Builds, installs and race cars out of ChanceBuilt Performance in Riverside, California.",
};

export default async function GalleryPage() {
  const images = await getSiteImages(GALLERY_SLOT);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="m-rule eyebrow text-[0.7rem] text-muted"><Copy k="gallery.eyebrow" links={false} /></p>
        <h1 className="display mt-2 text-3xl sm:text-5xl"><Copy k="gallery.heading" links={false} /></h1>
        <p className="mt-4 text-sm text-muted sm:text-base">
          <Copy k="gallery.intro" />
        </p>
      </header>

      {images.length === 0 ? (
        <div className="mt-12 rounded-card border border-dashed border-line-hi bg-surface px-6 py-16 text-center">
          <p className="display text-lg">No photos yet</p>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            Add them under Photos in the admin and they will appear here, in the order
            you set.
          </p>
        </div>
      ) : (
        /*
          Masonry columns rather than a uniform grid.

          Almost every photo the shop takes is vertical. Forcing those into 4:3
          tiles cropped away 44% of each frame and routinely put the car outside
          the crop, which defeats the point of a gallery. Columns let each photo
          keep its own shape, so nothing is cut at all.

          Rows without recorded dimensions fall back to a fixed tile, which is
          what the filesystem fallback and any pre-existing upload will hit.
        */
        <div className="mt-10 columns-1 gap-3 sm:columns-2 lg:columns-3">
          {images.map((image, i) => (
            <figure
              key={image.url}
              className={`group relative mb-3 block break-inside-avoid overflow-hidden rounded-card border border-line bg-surface ${
                image.width && image.height ? "" : "aspect-4/3"
              }`}
            >
              {image.isVideo ? (
                <GalleryVideo
                  src={image.url}
                  poster={image.posterUrl}
                  objectPosition={image.objectPosition}
                  width={image.width}
                  height={image.height}
                  className={
                    image.width && image.height
                      ? "photo-bw h-auto w-full transition-transform duration-500 group-hover:scale-105"
                      : "photo-bw absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  }
                />
              ) : image.width && image.height ? (
                <Image
                  src={image.url}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority={i < 3}
                  className="photo-bw h-auto w-full transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority={i < 3}
                  style={{ objectPosition: image.objectPosition }}
                  className="photo-bw object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}

              {image.isVideo && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-2.5 left-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/80"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 translate-x-px" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-4 pt-10 text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100">
                {image.caption ?? image.alt}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="mt-14 rounded-card border border-line bg-surface p-6 text-center sm:p-8">
        <h2 className="display text-xl"><Copy k="gallery.cta.heading" links={false} /></h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted"><Copy k="gallery.cta.body" /></p>
        <Link
          href="/book"
          className="focus-ring mt-5 inline-block rounded bg-accent px-8 py-3.5 text-sm font-bold tracking-widest text-accent-fg uppercase transition-colors hover:bg-accent-hi"
        >
          Book service
        </Link>
      </div>
    </div>
  );
}
