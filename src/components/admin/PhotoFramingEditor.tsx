"use client";

import { FocalPicker } from "./FocalPicker";
import type { PhotoFraming } from "@/lib/product-images";

/**
 * Crop, zoom and fit for one product photo.
 *
 * Opened from a photo in the uploader rather than shown for every image at
 * once: a product with five photos would otherwise be five pickers deep before
 * you reached the price field.
 *
 * Nothing here writes to the database. The values go back to the product form,
 * which saves them with everything else — necessary because photos can be
 * framed on a product that has not been created yet.
 */
export function PhotoFramingEditor({
  url,
  framing,
  onChange,
  onReset,
  onDone,
}: {
  url: string;
  framing: PhotoFraming;
  onChange: (next: PhotoFraming) => void;
  /** Absent when this photo is still on the product default. */
  onReset?: () => void;
  onDone: () => void;
}) {
  const set = (patch: Partial<PhotoFraming>) => onChange({ ...framing, ...patch });

  const chip = (active: boolean) =>
    `focus-ring rounded border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors ${
      active
        ? "border-accent bg-accent text-accent-fg"
        : "border-line text-muted hover:border-line-hi hover:text-text"
    }`;

  return (
    <div className="rounded-card border border-accent/40 bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Framing this photo</p>
        <div className="flex items-center gap-1">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="focus-ring rounded px-2 py-1 text-xs text-muted hover:text-text"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={onDone}
            className="focus-ring rounded px-2 py-1 text-xs font-semibold hover:text-muted"
          >
            Done
          </button>
        </div>
      </div>

      {/* Fit first, because it decides whether there is anything to crop at
          all. On "Show whole photo" nothing is cut off, so a crop box would be
          drawing a boundary that does not exist. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => set({ fit: "CONTAIN", zoom: 100 })}
          className={chip(framing.fit === "CONTAIN")}
        >
          Show whole photo
        </button>
        <button
          type="button"
          onClick={() => set({ fit: "COVER" })}
          className={chip(framing.fit === "COVER")}
        >
          Fill the box
        </button>
      </div>

      {/* Capped, because the frame takes the photo's own shape and a phone shot
          is taller than it is wide: left to fill the form it ran well past a
          screen height and the controls below it fell out of view. */}
      <div className="mx-auto mt-3 max-w-xs">
        {framing.fit === "COVER" ? (
          /*
            Square target: that is the shape a product photo renders into on the
            product page, and the card is 4:3, so the square is the tighter of
            the two. Anything kept in frame here survives both.
          */
          <FocalPicker
            id={url}
            url={url}
            focalX={framing.x}
            focalY={framing.y}
            targetAspect={1}
            zoom={framing.zoom}
            onPointChange={(x, y) => set({ x, y })}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="mx-auto max-h-64 w-auto border border-field bg-black"
          />
        )}
      </div>

      {framing.fit === "COVER" && (
        <label className="mx-auto mt-3 block max-w-xs">
          <span className="mb-1 flex items-center justify-between text-[0.7rem] text-muted">
            <span>Zoom</span>
            <span className="font-mono">{framing.zoom}%</span>
          </span>
          <input
            type="range"
            min={100}
            max={250}
            step={5}
            value={framing.zoom}
            onChange={(e) => set({ zoom: Number(e.target.value) })}
            className="focus-ring w-full accent-[var(--color-accent)]"
          />
        </label>
      )}

      <p className="mt-3 text-[0.7rem] text-muted">
        {framing.fit === "COVER"
          ? "Drag the bright box to choose what stays in frame. Zoom crops in tighter around the same point. Applies to this photo only."
          : "The whole photo is shown, with space around it if its shape does not match. Choose Fill the box to crop and zoom instead."}
      </p>
    </div>
  );
}
