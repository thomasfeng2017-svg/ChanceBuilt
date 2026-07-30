import Image from "next/image";
import { getSiteImage } from "@/lib/site-images";

/**
 * A named photo slot used through the site.
 *
 * Renders nothing when the slot is empty, so every page degrades to a clean
 * text layout rather than a broken image box. Photos get the shop's
 * black-and-white treatment, with colour easing back in on hover when the
 * parent is a `group`.
 *
 * The focal point set in the admin is applied as `object-position`, which is
 * what lets one upload work in a wide banner and a square tile without
 * re-cropping the file.
 */
export async function SectionPhoto({
  slot,
  alt,
  className = "",
  imageClassName = "",
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  /** Dim the photo and lay a gradient over it, for text-on-image blocks. */
  scrim = false,
}: {
  slot: string;
  /** Overridden by the alt text set in the admin when one exists. */
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  scrim?: boolean;
}) {
  const image = await getSiteImage(slot);
  if (!image) return null;

  /*
    `next/image` with `fill` needs a positioned ancestor, so this wrapper is
    normally `relative`. But callers that overlay a photo pass `absolute
    inset-0`, and having both utilities present is a coin flip decided by the
    order Tailwind emits them: when `relative` wins, the wrapper leaves the flow
    of its absolutely-positioned slot, collapses to zero height, and the image
    silently disappears while the element still measures as present.

    So only add `relative` when the caller has not positioned it themselves.
  */
  const positioned = /\b(absolute|fixed|sticky)\b/.test(className);

  return (
    <div
      className={`${positioned ? "" : "relative"} overflow-hidden bg-surface-2 ${className}`}
    >
      <Image
        src={image.url}
        alt={image.alt || alt}
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectPosition: image.objectPosition }}
        className={`photo-bw object-cover ${imageClassName}`}
      />
      {scrim && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30"
        />
      )}
    </div>
  );
}
