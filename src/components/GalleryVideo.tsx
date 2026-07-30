"use client";

import { useRef } from "react";

/**
 * A gallery video that plays while you hover or focus it.
 *
 * Not autoplay: a dozen clips running at once in a grid burns bandwidth and
 * gives the eye nowhere to settle. The poster carries the still until someone
 * shows interest, and playback rewinds on exit so the next hover starts from
 * the top.
 *
 * Keyboard users get the same behaviour via focus, and `play()` is guarded
 * because browsers reject it when a data saver or autoplay policy intervenes.
 */
export function GalleryVideo({
  src,
  poster,
  objectPosition,
  className = "",
  width,
  height,
}: {
  src: string;
  poster?: string | null;
  objectPosition: string;
  className?: string;
  /**
   * Intrinsic size. Supplying it reserves the right box before metadata loads,
   * which is what stops the masonry column reflowing as clips arrive. These are
   * vertical phone clips, so guessing 16:9 would be wrong every time.
   */
  width?: number | null;
  height?: number | null;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  const start = () => {
    const el = ref.current;
    if (!el) return;
    // A rejected play() is normal, not an error worth surfacing.
    void el.play().catch(() => {});
  };

  const stop = () => {
    const el = ref.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  };

  return (
    <video
      ref={ref}
      src={src}
      poster={poster ?? undefined}
      muted
      loop
      playsInline
      preload="metadata"
      tabIndex={0}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      width={width ?? undefined}
      height={height ?? undefined}
      style={{ objectPosition }}
      className={className}
    />
  );
}
