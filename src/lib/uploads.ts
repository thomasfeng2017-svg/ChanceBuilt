import "server-only";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Image uploads.
 *
 * Every upload is normalised through sharp — EXIF-rotated, resized down and
 * re-encoded as WebP — before it goes anywhere. That means a 12MB iPhone photo
 * becomes a ~200KB web asset regardless of which storage driver is used, and
 * the storefront never has to deal with a format browsers can't display.
 *
 * Two drivers:
 *   local       writes to public/uploads/. Fine in development.
 *   cloudinary  used automatically when CLOUDINARY_* env vars are set.
 *
 * The local driver CANNOT be used in production on Vercel/Netlify — their
 * filesystems are read-only and ephemeral. Set the Cloudinary variables before
 * deploying, or uploads will fail at runtime.
 */

const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15MB before processing
const MAX_EDGE = 1600;
const WEBP_QUALITY = 82;

export type UploadResult =
  | {
      ok: true;
      url: string;
      bytes: number;
      width: number;
      height: number;
      kind: "IMAGE" | "VIDEO";
      /** Cloudinary generates a still frame for videos; local uploads don't. */
      posterUrl?: string | null;
    }
  | { ok: false; error: string };

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

/** Formats a browser can play directly. */
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function isVideoUpload(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export function uploadDriver(): "cloudinary" | "local" {
  return process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
    ? "cloudinary"
    : "local";
}

/** True when we're about to write to a filesystem that won't persist. */
export function uploadsMisconfigured(): boolean {
  return process.env.NODE_ENV === "production" && uploadDriver() === "local";
}

export async function processAndStore(
  file: File,
  folder: "products" | "gallery" | "hero" | "brand" | "sections",
): Promise<UploadResult> {
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (isVideoUpload(file)) return storeVideo(file, folder);
  if (file.size > MAX_INPUT_BYTES) {
    return {
      ok: false,
      error: `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 15MB.`,
    };
  }

  const input = Buffer.from(await file.arrayBuffer());

  let output: Buffer;
  let width = 0;
  let height = 0;
  try {
    const pipeline = sharp(input)
      .rotate() // honour EXIF orientation
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    output = data;
    width = info.width;
    height = info.height;
  } catch {
    // The common cause is HEIC: iPhones shoot it, and the bundled libheif has
    // no HEVC decoder. Safari normally converts on upload, but not always.
    return {
      ok: false,
      error:
        "Couldn't read that image. If it came from an iPhone it may be a HEIC file — " +
        "either re-save it as JPEG, or set Settings → Camera → Formats → Most Compatible.",
    };
  }

  // Content-addressed name: same image uploaded twice doesn't duplicate.
  const digest = createHash("sha256").update(output).digest("hex").slice(0, 16);
  const base = slugifyName(file.name);
  const filename = `${base}-${digest}.webp`;

  const url =
    uploadDriver() === "cloudinary"
      ? await storeCloudinary(output, folder, filename)
      : await storeLocal(output, folder, filename);

  if (!url) return { ok: false, error: "Upload failed. Please try again." };

  return { ok: true, url, bytes: output.length, width, height, kind: "IMAGE" };
}

// ------------------------------------------------------------------ video --

/**
 * Video upload.
 *
 * Unlike images, video is not re-encoded here. Transcoding needs ffmpeg, which
 * is not available on a serverless host and would blow the request timeout even
 * if it were. Cloudinary does it properly: it transcodes on ingest, serves the
 * right codec per browser, and can generate a poster frame. Locally the file is
 * stored as-is, which is fine for development.
 *
 * The practical catch is `.mov` straight off an iPhone. The container is fine
 * but the codec is often HEVC, which Safari plays and Chrome and Firefox do
 * not. Cloudinary fixes that on the way in; without it we warn rather than let
 * the shop publish a video most visitors can't see.
 */
async function storeVideo(
  file: File,
  folder: string,
): Promise<UploadResult> {
  if (file.size > MAX_VIDEO_BYTES) {
    return {
      ok: false,
      error: `That video is ${(file.size / 1024 / 1024).toFixed(0)}MB. The limit is 100MB. Trim it, or export at 1080p.`,
    };
  }
  if (file.type && !VIDEO_TYPES.has(file.type) && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
    return { ok: false, error: "Use an MP4, WebM or MOV file." };
  }

  const data = Buffer.from(await file.arrayBuffer());
  const digest = createHash("sha256").update(data).digest("hex").slice(0, 16);
  const ext = path.extname(file.name).toLowerCase() || ".mp4";
  const base = slugifyName(file.name);

  if (uploadDriver() === "cloudinary") {
    const result = await storeCloudinaryVideo(data, folder, `${base}-${digest}`, file.type);
    if (!result) return { ok: false, error: "Upload failed. Please try again." };
    return {
      ok: true,
      url: result.url,
      posterUrl: result.posterUrl,
      bytes: data.length,
      width: result.width,
      height: result.height,
      kind: "VIDEO",
    };
  }

  const url = await storeLocal(data, folder, `${base}-${digest}${ext}`);
  if (!url) return { ok: false, error: "Upload failed. Please try again." };

  if (ext === ".mov") {
    return {
      ok: false,
      error:
        "Saved, but .mov from an iPhone often uses a codec Chrome and Firefox can't play. " +
        "Either export it as MP4, or set up Cloudinary, which converts it automatically.",
    };
  }

  return { ok: true, url, bytes: data.length, width: 0, height: 0, kind: "VIDEO" };
}

function slugifyName(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "image"
  );
}

// ------------------------------------------------------------ local driver --

async function storeLocal(
  data: Buffer,
  folder: string,
  filename: string,
): Promise<string | null> {
  try {
    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), data);
    return `/uploads/${folder}/${filename}`;
  } catch {
    return null;
  }
}

// ------------------------------------------------------- cloudinary driver --

/**
 * Signed upload straight to Cloudinary's REST API — no SDK dependency.
 * The signature is SHA-1 of the alphabetically sorted params plus the secret,
 * which is what Cloudinary expects.
 */
async function storeCloudinary(
  data: Buffer,
  folder: string,
  filename: string,
): Promise<string | null> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = filename.replace(/\.webp$/, "");
  const cloudFolder = `chancebuilt/${folder}`;

  const signedParams: Record<string, string> = {
    folder: cloudFolder,
    public_id: publicId,
    timestamp: String(timestamp),
  };
  const toSign = Object.keys(signedParams)
    .sort()
    .map((k) => `${k}=${signedParams[k]}`)
    .join("&");
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(data)], { type: "image/webp" }), filename);
  form.append("api_key", apiKey);
  for (const [k, v] of Object.entries(signedParams)) form.append(k, v);
  form.append("signature", signature);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      console.error("Cloudinary upload failed:", res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as { secure_url?: string };
    return json.secure_url ?? null;
  } catch (e) {
    console.error("Cloudinary upload error:", e);
    return null;
  }
}

/**
 * Cloudinary video upload. Uses the /video/upload resource type, which
 * transcodes on ingest. The poster is derived from the returned public id by
 * asking for a .jpg of the same asset, which is Cloudinary's documented way of
 * grabbing a frame.
 */
async function storeCloudinaryVideo(
  data: Buffer,
  folder: string,
  publicId: string,
  contentType: string,
): Promise<{ url: string; posterUrl: string; width: number; height: number } | null> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000);
  const cloudFolder = `chancebuilt/${folder}`;

  const signedParams: Record<string, string> = {
    folder: cloudFolder,
    public_id: publicId,
    timestamp: String(timestamp),
  };
  const toSign = Object.keys(signedParams)
    .sort()
    .map((k) => `${k}=${signedParams[k]}`)
    .join("&");
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(data)], { type: contentType || "video/mp4" }),
    publicId,
  );
  form.append("api_key", apiKey);
  for (const [k, v] of Object.entries(signedParams)) form.append(k, v);
  form.append("signature", signature);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/video/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      console.error("Cloudinary video upload failed:", res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as {
      secure_url?: string;
      public_id?: string;
      width?: number;
      height?: number;
    };
    if (!json.secure_url || !json.public_id) return null;

    return {
      url: json.secure_url,
      // Same asset, requested as a still.
      posterUrl: `https://res.cloudinary.com/${cloud}/video/upload/so_0/${json.public_id}.jpg`,
      width: json.width ?? 0,
      height: json.height ?? 0,
    };
  } catch (e) {
    console.error("Cloudinary video upload error:", e);
    return null;
  }
}
