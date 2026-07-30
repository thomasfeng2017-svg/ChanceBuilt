import Image from "next/image";
import { existsSync } from "node:fs";
import path from "node:path";
import { SITE } from "@/lib/site";

/**
 * Brand mark.
 *
 * Three tiers, best first:
 *
 *   1. brand/logo.svg      the full lockup as vector. Used alone, at any size.
 *   2. brand/monogram.png  the CB mark, paired with typeset wordmark text.
 *   3. a drawn placeholder, so the header is never empty on a fresh checkout.
 *
 * Tier 2 exists because the supplied artwork is a 225px JPEG whose usable area
 * is 145x86. Its baked-in "CHANCEBUILT" wordmark is illegible at a 42px header
 * height, whereas live text stays sharp at any size and on any display. The
 * monogram is simple enough to hold up small, so it carries the brand and the
 * type carries the name.
 *
 * Drop a real .svg into public/brand/ and tier 1 takes over automatically.
 */
function brandFile(name: string): string | null {
  return existsSync(path.join(process.cwd(), "public", "brand", name))
    ? `/brand/${name}`
    : null;
}

export function Logo({
  /** Rendered height in px of the mark. */
  height = 40,
  /** Show the "ChanceBuilt / Performance" text beside the mark. */
  withWordmark = true,
  className = "",
}: {
  height?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  const svg = brandFile("logo.svg");

  // Vector lockup: already contains the wordmark, so nothing is set beside it.
  if (svg) {
    return (
      <span className={`flex items-center ${className}`}>
        <Image
          src={svg}
          alt={SITE.name}
          height={height}
          width={height * 3}
          priority
          className="object-contain"
          style={{ height, width: "auto" }}
        />
      </span>
    );
  }

  const monogram = brandFile("monogram.png");

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      {monogram ? (
        <Image
          src={monogram}
          /* The text beside it already names the shop, so repeating it here
             would make a screen reader announce the company twice. */
          alt=""
          width={145}
          height={64}
          priority
          className="shrink-0 object-contain"
          style={{ height, width: "auto" }}
        />
      ) : (
        <span
          className="flex shrink-0 items-center justify-center rounded-sm border border-line-hi"
          style={{ height, width: height }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-1/2 w-1/2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 3h12l-1.5 5.5h-9L6 3Z" />
            <path d="M8 8.5h8v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4Z" />
            <path d="M12 14.5V21M9.5 21h5" />
          </svg>
        </span>
      )}

      {withWordmark && (
        <span className="leading-none">
          <span className="display block text-lg">
            Chance<span className="text-muted">Built</span>
          </span>
          <span className="eyebrow mt-0.5 block text-[0.55rem] text-muted">Performance</span>
        </span>
      )}
    </span>
  );
}
