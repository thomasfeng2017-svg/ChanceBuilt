"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload-client";
import { PhotoFramingEditor } from "./PhotoFramingEditor";
import {
  framingFor,
  framingStyle,
  type PhotoFraming,
  type PhotoSettings,
} from "@/lib/product-images";

/**
 * Multi-image uploader with reordering.
 *
 * Order is meaning here, not decoration: position one is the main photo, shown
 * on the catalog tile and at the top of the product page, and position two is
 * what cross-fades in on hover. Labelling the first slot explains *why* the
 * order matters rather than just letting it be changed.
 *
 * Reordering is offered two ways on purpose. Dragging is what everyone reaches
 * for at a desk, but it is awkward on a touchscreen and impossible with a
 * keyboard, and the shop will be doing this from a phone in the workshop as
 * often as at a computer. The arrows are not a fallback for old browsers, they
 * are the primary control on a phone and the only one a keyboard user has.
 */
export function ImageUploader({
  value,
  onChange,
  folder = "products",
  settings,
  onSettingsChange,
  productDefault,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  folder?: "products" | "gallery" | "hero" | "brand" | "sections";
  /**
   * Per-photo crop and zoom, keyed by URL. Optional: the gallery and hero
   * uploaders have their own framing tools and pass none of this.
   */
  settings?: PhotoSettings;
  onSettingsChange?: (next: PhotoSettings) => void;
  productDefault?: { fit: "COVER" | "CONTAIN"; zoom: number };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  /** URL of the photo currently being framed, if any. One at a time. */
  const [editing, setEditing] = useState<string | null>(null);

  const framingEnabled = !!settings && !!onSettingsChange && !!productDefault;

  function setFraming(url: string, next: PhotoFraming) {
    onSettingsChange?.({ ...settings, [url]: next });
  }

  /** Back to the product-level default: drop the entry rather than store a copy. */
  function resetFraming(url: string) {
    if (!settings) return;
    const next = { ...settings };
    delete next[url];
    onSettingsChange?.(next);
  }

  /** Index being dragged, and the slot it is hovering over. */
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(files.length);

    const uploaded: string[] = [];
    const failures: string[] = [];

    for (const file of Array.from(files)) {
      const result = await uploadFile(file, folder);
      if (result.ok) uploaded.push(result.url);
      else failures.push(result.error);
      setUploading((n) => n - 1);
    }

    if (failures.length) setError(failures.join(" "));
    if (uploaded.length) onChange([...value, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(url: string) {
    onChange(value.filter((v) => v !== url));
    // Otherwise the framing lingers in the JSON forever, and comes back to life
    // if the same photo is ever uploaded to the same URL again.
    if (settings?.[url]) resetFraming(url);
    if (editing === url) setEditing(null);
  }

  /** Move the photo at `from` so it sits at `to`, keeping the rest in order. */
  function moveTo(from: number, to: number) {
    if (from === to || to < 0 || to >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          // Only treat this as a file drop; a photo being reordered is handled
          // on the tiles themselves and must not be read as an upload.
          if (dragIndex !== null) return;
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
        className="rounded-card border border-dashed border-line-hi bg-surface-2 p-5 text-center"
      >
        <p className="text-sm text-muted">
          Drop photos here, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="focus-ring rounded font-semibold text-text underline underline-offset-2"
          >
            choose files
          </button>
        </p>
        <p className="mt-1 text-xs text-muted">
          JPEG, PNG or WebP. Large photos are shrunk in your browser before
          uploading, so straight off a phone is fine.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        {uploading > 0 && (
          <p aria-live="polite" className="mt-2 text-xs font-semibold">
            Uploading {uploading} image{uploading === 1 ? "" : "s"}…
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {error}
        </p>
      )}

      {value.length > 0 && (
        <>
          <p className="mt-4 text-xs text-muted">
            First photo is the main one. Drag to reorder, or use the arrows.
            {framingEnabled && " Crop lets you zoom and choose what stays in frame."}
          </p>

          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {value.map((url, i) => (
              <li
                key={url}
                draggable
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setOverIndex(i);
                }}
                onDrop={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                  moveTo(dragIndex, i);
                  endDrag();
                }}
                onDragEnd={endDrag}
                className={`group relative overflow-hidden rounded border bg-surface-2 transition-opacity ${
                  dragIndex === i ? "opacity-40" : ""
                } ${
                  editing === url
                    ? "border-accent"
                    : overIndex === i && dragIndex !== null && dragIndex !== i
                      ? "border-accent"
                      : "border-line"
                }`}
              >
                {/* The tile is a live preview of the crop, not just a thumbnail:
                    it is the only place the shop can see what a change did
                    without saving and loading the storefront. */}
                <div className="relative aspect-square cursor-grab bg-ink active:cursor-grabbing">
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="150px"
                    style={
                      framingEnabled
                        ? framingStyle(framingFor(url, settings, productDefault))
                        : undefined
                    }
                    className={framingEnabled ? "" : "object-cover"}
                  />
                </div>

                <span
                  className={`absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide uppercase ${
                    i === 0 ? "bg-accent text-accent-fg" : "bg-ink/80 text-muted"
                  }`}
                >
                  {i === 0 ? "Main" : i + 1}
                </span>

                <div className="flex divide-x divide-line border-t border-line text-[0.7rem]">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moveTo(i, i - 1)}
                    aria-label="Move earlier"
                    className="focus-ring flex-1 py-1.5 text-muted hover:text-text disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={i === value.length - 1}
                    onClick={() => moveTo(i, i + 1)}
                    aria-label="Move later"
                    className="focus-ring flex-1 py-1.5 text-muted hover:text-text disabled:opacity-30"
                  >
                    →
                  </button>
                  {framingEnabled && (
                    <button
                      type="button"
                      onClick={() => setEditing(editing === url ? null : url)}
                      aria-expanded={editing === url}
                      className={`focus-ring flex-1 py-1.5 font-semibold ${
                        editing === url ? "text-accent-text" : "text-muted hover:text-text"
                      }`}
                    >
                      Crop
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(url)}
                    aria-label="Remove photo"
                    className="focus-ring flex-1 py-1.5 text-muted hover:text-bad"
                  >
                    ✕
                  </button>
                </div>

                {/* Marks the photos that have been framed by hand, so the shop
                    can tell at a glance which ones are still on the default. */}
                {framingEnabled && settings[url] && (
                  <span className="absolute top-1.5 right-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide text-accent-text uppercase">
                    Cropped
                  </span>
                )}
              </li>
            ))}
          </ul>

          {framingEnabled && editing && value.includes(editing) && (
            <div className="mt-4">
              <PhotoFramingEditor
                url={editing}
                framing={framingFor(editing, settings, productDefault)}
                onChange={(next) => setFraming(editing, next)}
                onReset={settings[editing] ? () => resetFraming(editing) : undefined}
                onDone={() => setEditing(null)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
