import Image from "next/image";
import { getSiteImage } from "@/lib/site-images";

/**
 * A named media slot used through the site. Photo or video.
 *
 * Renders nothing when the slot is empty, so every page degrades to a clean
 * text layout rather than a broken image box. Photos get the shop's
 * black-and-white treatment, with colour easing back in on hover when the
 * parent is a `group`.
 *
 * The focal point set in the admin is applied as `object-position`, which is
 * what lets one upload work in a wide banner and a square tile without
 * re-cropping the file.
 *
 * Video matters here because the admin's upload control has always accepted
 * mp4 for every slot, not just the hero. Before this, dropping a video on a
 * section slot handed the .mp4 to next/image and produced a blank panel on the
 * live site, with nothing in the admin hinting at why.
 */
export async function SectionPhoto({
  slot,
  fallbackSlot,
  alt,
  className = "",
  imageClassName = "",
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  /** Dim the photo and lay a gradient over it, for text-on-image blocks. */
  scrim = false,
}: {
  slot: string;
  /** Used when `slot` has no photo, so a slot can be optional without a gap. */
  fallbackSlot?: string;
  /** Overridden by the alt text set in the admin when one exists. */
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  scrim?: boolean;
}) {
  const image =
    (await getSiteImage(slot)) ?? (fallbackSlot ? await getSiteImage(fallbackSlot) : null);
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

  /*
    Zoom is a transform rather than a different crop, so it is applied on top of
    whichever fit was chosen and never touches the stored file.

    transform-origin is pinned to the same point as object-position, so zooming
    in closes in on the part the shop picked instead of drifting away from it
    towards the middle.
  */
  const frame: React.CSSProperties = {
    objectFit: image.objectFit,
    objectPosition: image.objectPosition,
    ...(image.scale !== 1
      ? { transform: `scale(${image.scale})`, transformOrigin: image.objectPosition }
      : {}),
  };

  return (
    <div
      className={`${positioned ? "" : "relative"} overflow-hidden bg-surface-2 ${className}`}
    >
      {image.isVideo ? (
        <>
          {/*
            Poster underneath rather than only as the video's own poster
            attribute. It is what shows for anyone who asked for reduced
            motion, since the CSS hides the video itself for them, and it also
            covers autoplay being blocked or the file still loading.
          */}
          {image.posterUrl && (
            <Image
              src={image.posterUrl}
              alt={image.alt || alt}
              fill
              sizes={sizes}
              priority={priority}
              style={frame}
              className={`photo-bw ${imageClassName}`}
            />
          )}
          <video
            src={image.url}
            poster={image.posterUrl ?? undefined}
            // Muted, looped and inline is the only combination browsers will
            // autoplay. preload="metadata" keeps it off the critical path.
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            style={frame}
            className={`section-video photo-bw absolute inset-0 h-full w-full ${imageClassName}`}
          />
        </>
      ) : (
        <Image
          src={image.url}
          alt={image.alt || alt}
          fill
          sizes={sizes}
          priority={priority}
          style={frame}
          className={`photo-bw ${imageClassName}`}
        />
      )}
      {scrim && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30"
        />
      )}
    </div>
  );
}
