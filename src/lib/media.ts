import { readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Filesystem-backed image discovery.
 *
 * Photos dropped into `public/<folder>/` show up on the site with no code
 * change and no database entry — which is the difference between the shop
 * owner being able to update the gallery and having to call a developer.
 *
 * Ordering is filename-ascending, so prefix with numbers (01-, 02-) to control
 * the sequence.
 */
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

export async function listImages(folder: string): Promise<string[]> {
  const dir = path.join(process.cwd(), "public", folder);
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((name) => `/${folder}/${name}`);
  } catch {
    // Folder doesn't exist yet — that's fine, the UI falls back gracefully.
    return [];
  }
}

/**
 * Look up a named section photo, e.g. sectionImage("about-shop") ->
 * "/sections/about-shop.webp".
 *
 * Sections are keyed by filename stem rather than order, so the shop can swap
 * any single image by dropping a replacement with the same name — no code
 * change. Returns null when the slot is unfilled; every caller degrades to a
 * layout without the photo rather than a broken image.
 */
export async function sectionImage(
  slot: string,
  folder = "sections",
): Promise<string | null> {
  const files = await listImages(folder);
  return (
    files.find((f) => {
      const stem = (f.split("/").pop() ?? "").replace(/\.[^.]+$/, "");
      return stem === slot;
    }) ?? null
  );
}

/** Words that should stay fully capitalised in captions. */
const ACRONYMS = new Set(["bmw", "ecu", "dct", "cb", "s55", "s58", "s63", "b58", "n54", "n55"]);

/**
 * Turn a filename into a readable caption.
 * "03-f80-m3-turbo-upgrade.jpg" -> "F80 M3 Turbo Upgrade"
 *
 * Chassis codes (a letter followed by digits: f80, g80, a90) and known
 * acronyms are uppercased; everything else is title-cased. Short words are
 * NOT blanket-uppercased — that turned "the" into "THE".
 */
export function captionFromPath(imagePath: string): string {
  const base = imagePath.split("/").pop() ?? "";
  const stem = base.replace(/\.[^.]+$/, "").replace(/^\d+[-_]?/, "");
  return stem
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) =>
      /^[a-z]\d+$/i.test(word) || ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}
