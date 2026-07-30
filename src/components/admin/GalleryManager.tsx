"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FocalPicker } from "./FocalPicker";
import {
  addGalleryImagesAction,
  deleteImageAction,
  moveGalleryImageAction,
  setImageActiveAction,
  setImageTextAction,
} from "@/app/admin/(protected)/photos/actions";

export type GalleryRow = {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  focalX: number;
  focalY: number;
  active: boolean;
  isVideo: boolean;
  posterUrl: string | null;
};

export function GalleryManager({
  rows,
  readOnly = false,
}: {
  rows: GalleryRow[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function upload(files: FileList) {
    setError(null);
    setUploading(files.length);

    const items: {
      url: string;
      kind: "IMAGE" | "VIDEO";
      posterUrl: string | null;
      width: number | null;
      height: number | null;
    }[] = [];
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "gallery");
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) setError(json.error ?? "Upload failed.");
        else
          items.push({
            url: json.url,
            kind: json.kind ?? "IMAGE",
            posterUrl: json.posterUrl ?? null,
            // Recorded so the gallery can lay this out at its own shape rather
            // than cropping it into a uniform tile.
            width: json.width || null,
            height: json.height || null,
          });
      } catch {
        setError("Upload failed. Check your connection.");
      }
      setUploading((n) => n - 1);
    }

    if (items.length) await addGalleryImagesAction(items);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div>
      {!readOnly && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
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
            They go to the end of the gallery. Reorder below.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
            multiple
            className="sr-only"
            onChange={(e) => e.target.files && void upload(e.target.files)}
          />
          {uploading > 0 && (
            <p aria-live="polite" className="mt-2 text-xs font-semibold">
              Uploading {uploading}…
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          No gallery photos yet.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, i) => (
            <li
              key={row.id}
              className={`rounded-card border bg-surface p-3 ${
                row.active ? "border-line" : "border-line/50 opacity-60"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-mono text-[0.65rem] text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {!row.active && (
                  <span className="rounded border border-warn/40 px-1.5 text-[0.6rem] font-bold tracking-wide text-warn uppercase">
                    Hidden
                  </span>
                )}
              </div>

              {readOnly ? (
                <div className="relative aspect-4/3 overflow-hidden border border-line">
                  <Image src={row.url} alt="" fill sizes="33vw" className="object-cover" />
                </div>
              ) : (
                <FocalPicker
                  id={row.id}
                  url={row.url}
                  focalX={row.focalX}
                  focalY={row.focalY}
                  targetAspect={4 / 3}
                  isVideo={row.isVideo}
                  poster={row.posterUrl}
                />
              )}

              <p className="mt-2 truncate text-xs font-medium">
                {row.caption || row.alt || "No caption"}
              </p>

              {!readOnly && (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-1 text-[0.7rem]">
                    <button
                      type="button"
                      disabled={pending || i === 0}
                      onClick={() => run(() => moveGalleryImageAction(row.id, "up"))}
                      className="focus-ring rounded border border-line px-2 py-1 text-muted hover:text-text disabled:opacity-30"
                      aria-label="Move earlier"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={pending || i === rows.length - 1}
                      onClick={() => run(() => moveGalleryImageAction(row.id, "down"))}
                      className="focus-ring rounded border border-line px-2 py-1 text-muted hover:text-text disabled:opacity-30"
                      aria-label="Move later"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setImageActiveAction(row.id, !row.active))}
                      className="focus-ring rounded border border-line px-2 py-1 text-muted hover:text-text disabled:opacity-50"
                    >
                      {row.active ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(editing === row.id ? null : row.id)}
                      className="focus-ring rounded border border-line px-2 py-1 text-muted hover:text-text"
                    >
                      Caption
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => deleteImageAction(row.id))}
                      className="focus-ring ml-auto rounded px-2 py-1 text-muted hover:text-bad disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>

                  {editing === row.id && (
                    <CaptionForm
                      id={row.id}
                      alt={row.alt}
                      caption={row.caption ?? ""}
                      onDone={() => {
                        setEditing(null);
                        router.refresh();
                      }}
                    />
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CaptionForm({
  id,
  alt,
  caption,
  onDone,
}: {
  id: string;
  alt: string;
  caption: string;
  onDone: () => void;
}) {
  const [a, setA] = useState(alt);
  const [c, setC] = useState(caption);
  const [pending, startTransition] = useTransition();

  const input =
    "focus-ring w-full rounded border border-field bg-surface-2 px-2.5 py-1.5 text-xs placeholder:text-muted/50";

  return (
    <div className="mt-2 space-y-2 border-t border-line pt-2">
      <label className="block">
        <span className="mb-1 block text-[0.65rem] font-semibold text-muted">
          Caption (shown on hover)
        </span>
        <input value={c} onChange={(e) => setC(e.target.value)} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[0.65rem] font-semibold text-muted">
          Alt text (for screen readers)
        </span>
        <input value={a} onChange={(e) => setA(e.target.value)} className={input} />
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await setImageTextAction(id, a, c);
            onDone();
          })
        }
        className="focus-ring rounded border border-line-hi px-3 py-1.5 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
