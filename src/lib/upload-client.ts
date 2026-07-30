/**
 * Browser-side upload helper.
 *
 * Shared by the three places the admin uploads from, so they cannot drift into
 * giving different answers for the same failure.
 *
 * Two problems this exists to solve:
 *
 * 1. A file too big for the platform used to be discovered only after the whole
 *    thing had been uploaded and rejected. Checking first is instant and says
 *    what is actually wrong.
 *
 * 2. The callers did `await res.json()` unconditionally. When a response was
 *    not JSON (a platform 413, a gateway timeout, an HTML error page) that
 *    throw landed in a catch that blamed the network, which sent the shop off
 *    checking their wifi over a file that was simply too large.
 */

/** Must stay at or below the server's MAX_UPLOAD_BYTES. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Longest edge to shrink to in the browser before uploading.
 *
 * The server resizes every image down to 1600px regardless, so sending a 12MB
 * original just to discard 95% of it is pure waste: slow on shop wifi, and the
 * exact reason a normal phone photo used to hit the platform's request limit.
 * Resizing here means a 12MB photo arrives as a few hundred KB and the limit
 * stops being something anyone has to think about.
 *
 * 2000 rather than 1600 so the server still has a little headroom to work with
 * and this never becomes the thing that softens an image.
 */
const CLIENT_MAX_EDGE = 2000;

/** Below this, resizing costs more than it saves. */
const RESIZE_THRESHOLD_BYTES = 1024 * 1024;

/**
 * Shrink an image in the browser, returning the original if that is not
 * possible.
 *
 * Deliberately forgiving: HEIC cannot be decoded by canvas in most browsers,
 * a very large image can exhaust memory, and a corrupt file will simply fail
 * to decode. In every one of those cases the original is returned and the
 * normal size check applies, so this can only ever help.
 */
async function downscale(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= RESIZE_THRESHOLD_BYTES) return file;
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas === "undefined") {
    return file;
  }

  try {
    // from-image applies the EXIF rotation, without which every photo taken in
    // portrait would upload sideways.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const scale = Math.min(1, CLIENT_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= MAX_UPLOAD_BYTES) {
      bitmap.close();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.86 });

    // If it somehow came out bigger, keep what we had.
    if (blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

export type UploadOk = {
  ok: true;
  url: string;
  kind: "IMAGE" | "VIDEO";
  posterUrl: string | null;
  width: number | null;
  height: number | null;
};

export type UploadFail = { ok: false; error: string };

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

export async function uploadFile(
  original: File,
  folder: string,
): Promise<UploadOk | UploadFail> {
  if (original.size === 0) {
    return { ok: false, error: `"${original.name}" is empty.` };
  }

  // Shrink first. Most photos never come near the limit after this, so the
  // check below is a backstop rather than the thing the shop runs into.
  const file = await downscale(original);

  if (file.size > MAX_UPLOAD_BYTES) {
    const isVideo = file.type.startsWith("video/");
    return {
      ok: false,
      error: isVideo
        ? `"${original.name}" is ${mb(file.size)}MB. Videos have to pass through the server, so the limit is 4MB. Trim it, or export at 720p.`
        : `"${original.name}" is still ${mb(file.size)}MB after resizing, which is too large. Try exporting it as a JPEG.`,
    };
  }

  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);

  let res: Response;
  try {
    res = await fetch("/api/admin/upload", { method: "POST", body });
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }

  // Read as text first: a rejection from the host is not JSON, and parsing it
  // blind is what produced the misleading connection error.
  const raw = await res.text();
  let json: { url?: string; kind?: string; posterUrl?: string | null; width?: number; height?: number; error?: string } | null = null;
  try {
    json = JSON.parse(raw);
  } catch {
    json = null;
  }

  if (!res.ok) {
    if (json?.error) return { ok: false, error: json.error };
    if (res.status === 413) {
      return { ok: false, error: `"${file.name}" is too large for the server to accept.` };
    }
    return { ok: false, error: `Upload failed (error ${res.status}). Try a smaller file.` };
  }

  if (!json?.url) {
    return { ok: false, error: "The server did not return a file. Try again." };
  }

  return {
    ok: true,
    url: json.url,
    kind: json.kind === "VIDEO" ? "VIDEO" : "IMAGE",
    posterUrl: json.posterUrl ?? null,
    width: json.width ?? null,
    height: json.height ?? null,
  };
}
