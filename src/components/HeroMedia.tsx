import Image from "next/image";
import { getSiteImage } from "@/lib/site-images";

/**
 * Hero backdrop: photo or video.
 *
 * A video is muted, looped and `playsInline`, which is the only combination
 * browsers will autoplay. The poster still shows first, so anyone on a slow
 * connection, with data saver on, or with autoplay blocked sees a sensible
 * frame instead of a black rectangle.
 *
 * `prefers-reduced-motion` is honoured by not autoplaying: a full-bleed moving
 * background is exactly the kind of thing that setting exists for. Those
 * visitors get the poster frame.
 */
export async function HeroMedia() {
  const hero = await getSiteImage("hero");

  if (!hero) {
    return <div aria-hidden="true" className="shop-grid absolute inset-0" />;
  }

  /*
    Zoom, applied around the same point as the focal position so closing in
    tightens on the chosen subject rather than drifting to the middle.

    The forced `grayscale` that used to sit alongside these has gone. It was a
    leftover from the monochrome palette, and once the rest of the site started
    showing photographs in colour the hero was the only thing still draining
    them. It already sits at 45% opacity under two gradients, so the colour
    that comes through is a hint of the shop rather than a distraction.
  */
  const heroZoom =
    hero.scale !== 1
      ? { transform: `scale(${hero.scale})`, transformOrigin: hero.objectPosition }
      : {};

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {hero.isVideo ? (
        <>
          {/* Poster underneath, so reduced-motion visitors still see the shop. */}
          {hero.posterUrl && (
            <Image
              src={hero.posterUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              style={{ objectFit: hero.objectFit, objectPosition: hero.objectPosition, ...heroZoom }}
              className="opacity-45"
            />
          )}
          <video
            src={hero.url}
            poster={hero.posterUrl ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            style={{ objectFit: hero.objectFit, objectPosition: hero.objectPosition, ...heroZoom }}
            className="hero-video absolute inset-0 h-full w-full opacity-45"
          />
        </>
      ) : (
        <Image
          src={hero.url}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: hero.objectFit, objectPosition: hero.objectPosition, ...heroZoom }}
          className="opacity-45"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" />
    </div>
  );
}
