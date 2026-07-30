"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload-client";

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
}: {
  value: string[];
  onChange: (next: string[]) => void;
  folder?: "products" | "gallery" | "hero" | "brand" | "sections";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

  const remove = (url: string) => onChange(value.filter((v) => v !== url));

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
                  overIndex === i && dragIndex !== null && dragIndex !== i
                    ? "border-accent"
                    : "border-line"
                }`}
              >
                <div className="relative aspect-square cursor-grab active:cursor-grabbing">
                  <Image src={url} alt="" fill sizes="150px" className="object-cover" />
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
                  <button
                    type="button"
                    onClick={() => remove(url)}
                    aria-label="Remove photo"
                    className="focus-ring flex-1 py-1.5 text-muted hover:text-bad"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
