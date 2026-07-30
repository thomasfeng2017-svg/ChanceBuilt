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

export async function uploadFile(file: File, folder: string): Promise<UploadOk | UploadFail> {
  if (file.size === 0) {
    return { ok: false, error: `"${file.name}" is empty.` };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `"${file.name}" is ${mb(file.size)}MB. The limit is 4MB. On an iPhone, send it as "Large" rather than "Actual Size".`,
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
