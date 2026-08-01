"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFocalPointAction } from "@/app/admin/(protected)/photos/actions";

/**
 * Drag the part of the photo that must stay visible.
 *
 * The whole photo is shown, letterboxed, with a bright rectangle over the part
 * that will actually appear in that slot. An earlier version previewed the
 * photo already cropped, which meant anything outside the crop was invisible
 * and therefore impossible to drag to: you could not recover a subject that had
 * been cut off. Showing the full frame and moving the window over it is the
 * only version of this that works.
 *
 * The point is saved as CSS `object-position`, so one upload survives being a
 * wide banner on desktop, a square tile in a grid, and a tall crop on a phone.
 */
export function FocalPicker({
  id,
  url,
  focalX,
  focalY,
  targetAspect,
  poster,
  isVideo = false,
  zoom = 100,
  onPointChange,
}: {
  id: string;
  url: string;
  focalX: number;
  focalY: number;
  /** Width / height of the slot this photo renders into. */
  targetAspect: number;
  poster?: string | null;
  isVideo?: boolean;
  /**
   * Zoom percentage applied on top of the crop, 100 being none. Without this
   * the box would claim to be what visitors see while a zoomed photo actually
   * showed a good deal less.
   */
  zoom?: number;
  /**
   * Controlled mode. When supplied, the point is reported here instead of
   * being written straight to the database.
   *
   * Product photos need this: they are edited inside the product form, which
   * saves as a whole, and on a new product there is no row to write to yet.
   * Site photos have no form around them, so they keep saving on release.
   */
  onPointChange?: (x: number, y: number) => void;
}) {
  const router = useRouter();
  const frameRef = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState({ x: focalX, y: focalY });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  /*
    The drag flag and the live point are held in refs as well as state.
    React state is asynchronous, so on a fast click the pointerup handler can
    run before the pointerdown's setState has committed: gating the save on
    state alone silently drops the change. State drives the visuals, refs drive
    the logic.
  */
  const draggingRef = useRef(false);
  const pointRef = useRef({ x: focalX, y: focalY });

  /**
   * The visible window, as fractions of the full image.
   * `object-fit: cover` scales to fill, so the longer axis gets clipped.
   */
  const imageAspect = natural ? natural.w / natural.h : targetAspect;
  /*
    Zoom shrinks the window by the same factor on both axes, and around the
    focal point rather than the middle: the CSS is `transform: scale()` with
    `transform-origin` pinned to the same point as `object-position`, which
    leaves the focal point exactly where it was and takes the crop out of the
    edges. That is why the position maths below is unchanged by zoom.
  */
  const scale = Math.min(3, Math.max(1, zoom / 100));
  const windowW = (imageAspect > targetAspect ? targetAspect / imageAspect : 1) / scale;
  const windowH = (imageAspect > targetAspect ? 1 : imageAspect / targetAspect) / scale;

  // object-position places the window proportionally within the leftover space.
  const windowLeft = (1 - windowW) * (point.x / 100);
  const windowTop = (1 - windowH) * (point.y / 100);

  const pointFromEvent = useCallback((clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100))),
      y: Math.max(0, Math.min(100, Math.round(((clientY - rect.top) / rect.height) * 100))),
    };
  }, []);

  const save = useCallback(
    (next: { x: number; y: number }) => {
      // Controlled: hand the point upwards and let the form own persistence.
      if (onPointChange) {
        onPointChange(next.x, next.y);
        return;
      }
      startTransition(async () => {
        await setFocalPointAction(id, next.x, next.y);
        setSaved(true);
        router.refresh();
      });
    },
    [id, router, onPointChange],
  );

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const next = pointFromEvent(e.clientX, e.clientY);
    if (!next) return;
    // Capture so the drag keeps tracking even if the cursor leaves the frame.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    pointRef.current = next;
    setDragging(true);
    setSaved(false);
    setPoint(next);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const next = pointFromEvent(e.clientX, e.clientY);
    if (!next) return;
    pointRef.current = next;
    setPoint(next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    draggingRef.current = false;
    setDragging(false);
    // One write per drag, not one per pixel of movement.
    save(pointRef.current);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 10 : 2;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (!move) return;

    e.preventDefault();
    const next = {
      x: Math.max(0, Math.min(100, pointRef.current.x + move[0])),
      y: Math.max(0, Math.min(100, pointRef.current.y + move[1])),
    };
    pointRef.current = next;
    setPoint(next);
    setSaved(false);
    save(next);
  }

  /** True when nothing is being cropped, so the overlay would be noise. */
  const fullyVisible = windowW > 0.995 && windowH > 0.995;
  const previewSrc = isVideo ? (poster ?? undefined) : url;

  return (
    <div>
      <div
        ref={frameRef}
        role="slider"
        tabIndex={0}
        aria-label="Focal point. Drag the highlighted area, or use the arrow keys."
        aria-valuetext={`Horizontal ${point.x} percent, vertical ${point.y} percent`}
        aria-valuenow={point.x}
        aria-valuemin={0}
        aria-valuemax={100}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        /*
          The frame takes the PHOTO's shape, not the slot's.

          It used to be a fixed 4:3 box with the photo letterboxed inside. Two
          things went wrong with that. Visually, a vertical phone photo (which
          is nearly all of them here) shrank to a narrow strip stranded in a
          wide black box. Worse, the crop rectangle below is positioned as a
          percentage of THIS element, so whenever the photo did not fill it the
          highlighted area no longer sat over the part it claimed to represent.

          Matching the frame to the image makes the two coincide exactly, so
          the overlay is honest and the photo is shown as large as it can be.
        */
        style={{ aspectRatio: natural ? `${natural.w} / ${natural.h}` : "4 / 3" }}
        className={`focus-ring relative mx-auto block w-full touch-none select-none overflow-hidden border border-field bg-black ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* The complete photo, letterboxed. Nothing is hidden from the shop. */}
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt=""
            draggable={false}
            /*
              A ref callback rather than onLoad alone: an image already in the
              browser cache is `complete` before React hydrates, so its load
              event never fires and the natural size would stay unknown. Without
              it the crop overlay silently falls back to "nothing is cropped".
            */
            ref={(el) => {
              if (!el?.complete || !el.naturalWidth) return;
              // Returning the identical object when nothing changed makes React
              // bail out. Without that guard this ref fires on every render,
              // sets state, and re-renders forever.
              setNatural((prev) =>
                prev && prev.w === el.naturalWidth && prev.h === el.naturalHeight
                  ? prev
                  : { w: el.naturalWidth, h: el.naturalHeight },
              );
            }}
            onLoad={(e) =>
              setNatural({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
            className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-50"
          />
        ) : (
          <video
            src={url}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) =>
              setNatural({
                w: e.currentTarget.videoWidth,
                h: e.currentTarget.videoHeight,
              })
            }
            className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-50"
          />
        )}

        {/* The crop window: full brightness inside, dimmed outside. */}
        {!fullyVisible && (
          <span
            aria-hidden="true"
            /*
              The outline is an inset shadow rather than a border. A border
              shrinks the padding box, and the bright copy inside is positioned
              in percentages of that box, so two pixels of border threw the
              alignment off by two pixels at every edge.
            */
            className="pointer-events-none absolute overflow-hidden shadow-[inset_0_0_0_2px_var(--color-accent)]"
            style={{
              left: `${windowLeft * 100}%`,
              top: `${windowTop * 100}%`,
              width: `${windowW * 100}%`,
              height: `${windowH * 100}%`,
            }}
          >
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt=""
                draggable={false}
                /*
                  Scaled and offset so this copy lines up exactly with the
                  dimmed one underneath, making the window look like a hole
                  punched through it rather than a second picture.

                  Positioned with top/left rather than margins. A percentage
                  MARGIN resolves against the container's WIDTH even when it is
                  margin-top, so the vertical offset was being computed from the
                  wrong dimension and the bright copy sat hundreds of pixels off.
                  For an absolutely positioned element, `top` correctly resolves
                  against the container's height.
                */
                style={{
                  position: "absolute",
                  width: `${100 / windowW}%`,
                  height: `${100 / windowH}%`,
                  left: `${(-windowLeft * 100) / windowW}%`,
                  top: `${(-windowTop * 100) / windowH}%`,
                }}
                className="max-w-none object-contain"
              />
            ) : null}
          </span>
        )}

        {/* Rule-of-thirds guides while dragging. */}
        {dragging && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0">
            {[33.33, 66.66].map((p) => (
              <span key={`v${p}`} className="absolute top-0 bottom-0 w-px bg-white/25" style={{ left: `${p}%` }} />
            ))}
            {[33.33, 66.66].map((p) => (
              <span key={`h${p}`} className="absolute right-0 left-0 h-px bg-white/25" style={{ top: `${p}%` }} />
            ))}
          </span>
        )}

        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent shadow-[0_0_0_2px_rgba(0,0,0,0.65)] transition-[width,height] ${
            dragging ? "h-8 w-8" : "h-6 w-6"
          }`}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        />

        {isVideo && (
          <span className="pointer-events-none absolute top-1.5 left-1.5 rounded bg-ink/85 px-1.5 py-0.5 font-mono text-[0.6rem] tracking-widest text-text uppercase">
            Video
          </span>
        )}
      </div>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.7rem] text-muted">
        <span>
          Focus {point.x}% / {point.y}%
        </span>
        {pending && <span>saving…</span>}
        {!pending && saved && <span className="text-good">saved</span>}
        <span className="ml-auto">
          {fullyVisible ? "Whole photo fits, nothing cropped" : "Box = what visitors see"}
        </span>
      </p>
    </div>
  );
}
