"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setImageFramingAction } from "@/app/admin/(protected)/photos/actions";

type Fit = "COVER" | "CONTAIN";
type BandHeight = "SHORT" | "MEDIUM" | "TALL";

/**
 * How a photo sits in its slot.
 *
 * The focal picker could only ever slide a fixed-size window around the photo.
 * It could not make that window show MORE, which is the thing that actually
 * fixes a car being cut off. These three controls cover the rest of it:
 *
 *   Fill / Whole photo  the coarse choice, and usually the only one needed
 *   Zoom                crop in tighter around the focal point
 *   Height              give a banner more vertical room to work with
 *
 * Zoom only applies to Fill, because zooming a photo that is already fully
 * visible just crops it, which is what Fill is for. The control is hidden
 * rather than disabled in that state, so there is nothing dead on screen.
 */
export function FramingControls({
  id,
  fit: initialFit,
  zoom: initialZoom,
  bandHeight: initialHeight,
  showHeight = false,
}: {
  id: string;
  fit: Fit;
  zoom: number;
  bandHeight: BandHeight;
  /** Only banner slots have a height worth changing. */
  showHeight?: boolean;
}) {
  const router = useRouter();
  const [fit, setFit] = useState<Fit>(initialFit);
  const [zoom, setZoom] = useState(initialZoom);
  const [height, setHeight] = useState<BandHeight>(initialHeight);
  const [pending, startTransition] = useTransition();

  const save = (next: Parameters<typeof setImageFramingAction>[1]) =>
    startTransition(async () => {
      await setImageFramingAction(id, next);
      router.refresh();
    });

  const chip = (active: boolean) =>
    `focus-ring rounded border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${
      active
        ? "border-accent bg-accent text-accent-fg"
        : "border-line text-muted hover:border-line-hi hover:text-text"
    }`;

  return (
    <div className="mt-3 space-y-2.5 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[0.7rem] text-muted">Photo</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setFit("COVER");
            save({ fit: "COVER" });
          }}
          className={chip(fit === "COVER")}
        >
          Fill the space
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setFit("CONTAIN");
            // Zoom is meaningless once the whole photo is showing, so it is
            // reset rather than left as an invisible setting that surprises
            // someone when they switch back.
            setZoom(100);
            save({ fit: "CONTAIN", zoom: 100 });
          }}
          className={chip(fit === "CONTAIN")}
        >
          Show whole photo
        </button>
      </div>

      {fit === "COVER" && (
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-[0.7rem] text-muted">
            <span>Zoom</span>
            <span className="font-mono">{zoom}%</span>
          </span>
          <input
            type="range"
            min={100}
            max={250}
            step={5}
            value={zoom}
            disabled={pending}
            onChange={(e) => setZoom(Number(e.target.value))}
            /* Saved on release, not on every pixel of travel: dragging the
               slider would otherwise fire a write per step. */
            onPointerUp={() => save({ zoom })}
            onKeyUp={() => save({ zoom })}
            className="focus-ring w-full accent-[var(--color-accent)]"
          />
        </label>
      )}

      {showHeight && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.7rem] text-muted">Height</span>
          {(["SHORT", "MEDIUM", "TALL"] as const).map((h) => (
            <button
              key={h}
              type="button"
              disabled={pending}
              onClick={() => {
                setHeight(h);
                save({ bandHeight: h });
              }}
              className={chip(height === h)}
            >
              {h === "SHORT" ? "Short" : h === "MEDIUM" ? "Medium" : "Tall"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
