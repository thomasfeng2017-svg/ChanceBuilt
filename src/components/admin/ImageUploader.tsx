"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/**
 * Multi-image uploader with drag-to-reorder-free simplicity: the first image is
 * the main one, and you promote another by clicking "Make main". Deliberately
 * no drag-and-drop reordering — it's fiddly on a phone, which is where the shop
 * will actually use this.
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

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(files.length);

    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", folder);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Upload failed.");
        } else {
          uploaded.push(json.url);
        }
      } catch {
        setError("Upload failed — check your connection.");
      }
      setUploading((n) => n - 1);
    }

    if (uploaded.length) onChange([...value, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  }

  const remove = (url: string) => onChange(value.filter((v) => v !== url));
  const makeMain = (url: string) => onChange([url, ...value.filter((v) => v !== url)]);

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
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
          JPEG, PNG or WebP. Resized and converted automatically.
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
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {value.map((url, i) => (
            <li
              key={url}
              className="group relative overflow-hidden rounded border border-line bg-surface-2"
            >
              <div className="relative aspect-square">
                <Image src={url} alt="" fill sizes="150px" className="object-cover" />
              </div>

              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 rounded bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide text-accent-fg uppercase">
                  Main
                </span>
              )}

              <div className="flex divide-x divide-line border-t border-line text-[0.7rem]">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => makeMain(url)}
                    className="focus-ring flex-1 py-1.5 text-muted hover:text-text"
                  >
                    Make main
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(url)}
                  className="focus-ring flex-1 py-1.5 text-muted hover:text-bad"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
