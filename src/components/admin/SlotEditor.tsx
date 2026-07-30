"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FocalPicker } from "./FocalPicker";
import { uploadFile } from "@/lib/upload-client";
import { FramingControls } from "./FramingControls";
import {
  setSlotImageAction,
  clearSlotAction,
  setImageTextAction,
} from "@/app/admin/(protected)/photos/actions";

export type SlotRow = {
  id: string;
  url: string;
  alt: string;
  focalX: number;
  focalY: number;
  isVideo: boolean;
  posterUrl: string | null;
  fit: "COVER" | "CONTAIN";
  zoom: number;
  bandHeight: "SHORT" | "MEDIUM" | "TALL";
};

/** One single-image slot: upload, focal point, alt text. */
export function SlotEditor({
  slot,
  label,
  hint,
  aspectClass,
  targetAspect,
  row,
  fallbackUrl,
  readOnly = false,
}: {
  slot: string;
  label: string;
  hint: string;
  /** Tailwind class, used for the empty and fallback previews. */
  aspectClass: string;
  /** The same ratio as a number, for the focal picker's crop overlay. */
  targetAspect: number;
  row: SlotRow | null;
  /** A file still sitting in public/ that the site is falling back to. */
  fallbackUrl: string | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alt, setAlt] = useState(row?.alt ?? "");
  const [altSaved, setAltSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  async function upload(file: File) {
    setError(null);
    setBusy("Uploading…");

    try {
      const upload = await uploadFile(file, "sections");
      if (!upload.ok) {
        setError(upload.error);
        return;
      }
      const result = await setSlotImageAction(
        slot,
        upload.url,
        upload.kind,
        upload.posterUrl,
        upload.width,
        upload.height,
      );
      if (!result.ok) setError(result.error);
      router.refresh();
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  /** Wide slots are the ones rendered as a full-width band. */
  const isBanner = targetAspect >= 2;

  const preview = row?.url ?? fallbackUrl;

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="mb-3">
        <h3 className="text-sm font-bold">{label}</h3>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
      </div>

      {row ? (
        <>
          <FocalPicker
            id={row.id}
            url={row.url}
            focalX={row.focalX}
            focalY={row.focalY}
            targetAspect={targetAspect}
            isVideo={row.isVideo}
            poster={row.posterUrl}
          />
          <FramingControls
            id={row.id}
            fit={row.fit}
            zoom={row.zoom}
            bandHeight={row.bandHeight}
            /* Only the wide banner slots render as a band with height worth
               changing; a square engine tile has none to give. */
            showHeight={isBanner}
          />
        </>
      ) : preview ? (
        <div className={`relative overflow-hidden border border-line bg-surface-2 ${aspectClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 bg-ink/85 px-2 py-1 text-[0.65rem] text-warn">
            Still coming from a file. Upload here to take control of it.
          </span>
        </div>
      ) : (
        <div
          className={`flex items-center justify-center border border-dashed border-line-hi bg-surface-2 text-xs text-muted ${aspectClass}`}
        >
          No photo
        </div>
      )}

      {!readOnly && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => inputRef.current?.click()}
              className="focus-ring rounded border border-line-hi px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              {busy ?? (row ? "Replace" : "Upload photo or video")}
            </button>

            {row && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await clearSlotAction(slot);
                    router.refresh();
                  })
                }
                className="focus-ring rounded px-2 py-1.5 text-xs text-muted transition-colors hover:text-bad disabled:opacity-50"
              >
                Remove
              </button>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </div>

          {row && (
            <label className="mt-3 block">
              <span className="mb-1 block text-[0.7rem] font-semibold text-muted">
                Alt text <span className="font-normal">(describe it for screen readers)</span>
              </span>
              <div className="flex gap-2">
                <input
                  value={alt}
                  onChange={(e) => {
                    setAlt(e.target.value);
                    setAltSaved(false);
                  }}
                  placeholder="Leave blank for decorative backgrounds"
                  className="focus-ring min-w-0 flex-1 rounded border border-field bg-surface-2 px-2.5 py-1.5 text-xs placeholder:text-muted/50"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await setImageTextAction(row.id, alt, "");
                      setAltSaved(true);
                      router.refresh();
                    })
                  }
                  className="focus-ring rounded border border-line-hi px-3 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
                >
                  {altSaved ? "Saved" : "Save"}
                </button>
              </div>
            </label>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
