/**
 * Per-photo framing for product images.
 *
 * A product's photos are rarely shot the same way: one turbo on a bench and
 * one fitted to a car want different crops. The product-level fit and zoom are
 * the default, and anything stored here overrides them for that one photo.
 *
 * No "server-only" import: the admin form needs these types and helpers on the
 * client to drive the picker before anything is saved.
 */

export type PhotoFraming = {
  /** Focal point as percentages, 0-100. What stays visible when cropped. */
  x: number;
  y: number;
  /** 100 = no zoom. */
  zoom: number;
  fit: "COVER" | "CONTAIN";
};

export type PhotoSettings = Record<string, PhotoFraming>;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : lo)));

/**
 * Read the stored JSON defensively.
 *
 * This column is free-form JSON, so it can hold anything a bad write or an old
 * shape left behind. A malformed entry is dropped rather than allowed to reach
 * a style attribute, where a stray value would blow one photo up across the
 * whole card.
 */
export function parsePhotoSettings(raw: unknown): PhotoSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: PhotoSettings = {};
  for (const [url, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    out[url] = {
      x: clamp(Number(v.x ?? 50), 0, 100),
      y: clamp(Number(v.y ?? 50), 0, 100),
      zoom: clamp(Number(v.zoom ?? 100), 100, 300),
      fit: v.fit === "COVER" ? "COVER" : "CONTAIN",
    };
  }
  return out;
}

/** Framing for one photo, falling back to the product's own defaults. */
export function framingFor(
  url: string,
  settings: PhotoSettings,
  productDefault: { fit: "COVER" | "CONTAIN"; zoom: number },
): PhotoFraming {
  return (
    settings[url] ?? {
      x: 50,
      y: 50,
      zoom: clamp(productDefault.zoom, 100, 300),
      fit: productDefault.fit,
    }
  );
}

/**
 * Framing for one photo of a product, straight from a database row.
 *
 * The render sites all have the whole product to hand, so this saves each of
 * them parsing the JSON and assembling the fallback by itself. Six copies of
 * that is six chances to get the fallback subtly wrong.
 */
export function productFraming(
  product: {
    imageFit: "COVER" | "CONTAIN";
    imageZoom: number;
    imageSettings?: unknown;
  },
  url: string,
): PhotoFraming {
  return framingFor(url, parsePhotoSettings(product.imageSettings), {
    fit: product.imageFit,
    zoom: product.imageZoom,
  });
}

/** Ready to spread onto a style attribute. */
export function framingStyle(f: PhotoFraming): React.CSSProperties {
  const scale = f.zoom / 100;
  return {
    objectFit: f.fit === "COVER" ? "cover" : "contain",
    objectPosition: `${f.x}% ${f.y}%`,
    ...(scale !== 1
      ? { transform: `scale(${scale})`, transformOrigin: `${f.x}% ${f.y}%` }
      : {}),
  };
}
