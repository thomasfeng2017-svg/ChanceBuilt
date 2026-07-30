import Image from "next/image";

/**
 * Product / department artwork.
 *
 * If a real photo is supplied it is used and lightly graded (see .photo-bw).
 * Otherwise a line-art glyph for the department is drawn, so a catalog that is
 * only half photographed still looks deliberate rather than broken.
 *
 * Drop real photos in `public/products/` and put the path in Product.images —
 * see public/README.md.
 */
const GLYPHS: Record<string, React.ReactNode> = {
  Tuning: (
    <>
      <rect x="7" y="14" width="50" height="34" rx="3" />
      <path d="M14 40l7-10 6 6 6-12 6 16" />
      <path d="M20 14V8M44 14V8" />
    </>
  ),
  Turbo: (
    <>
      <circle cx="26" cy="32" r="14" />
      <circle cx="26" cy="32" r="4" />
      <path d="M26 18a14 14 0 0 1 12 7M26 46a14 14 0 0 0 12-7" />
      <path d="M40 24h13v16H40" />
      <path d="M53 26v12" />
    </>
  ),
  "Charge Cooling": (
    <>
      <rect x="8" y="18" width="48" height="28" rx="2" />
      <path d="M16 18v28M24 18v28M32 18v28M40 18v28M48 18v28" />
    </>
  ),
  Intake: (
    <>
      <path d="M10 26h16l10-8v28l-10-8H10z" />
      <circle cx="46" cy="32" r="10" />
      <path d="M46 22v20M36 32h20" />
    </>
  ),
  Exhaust: (
    <>
      <path d="M6 34h16l6-8h18a6 6 0 0 1 0 12H28l-6-4H6Z" />
      <path d="M50 24v-6M57 28v-8" />
    </>
  ),
  Fueling: (
    <>
      <path d="M14 52V16a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v36" />
      <path d="M10 52h30M18 22h14" />
      <path d="M40 24h6a4 4 0 0 1 4 4v14a3 3 0 0 0 6 0V26" />
    </>
  ),
  Cooling: (
    <>
      <rect x="10" y="14" width="44" height="36" rx="2" />
      <path d="M18 14v36M26 14v36M34 14v36M42 14v36" />
      <path d="M10 24h44M10 40h44" />
    </>
  ),
  Drivetrain: (
    <>
      <circle cx="32" cy="32" r="13" />
      <circle cx="32" cy="32" r="5" />
      <path d="M32 11v6M32 47v6M11 32h6M47 32h6M17 17l4.5 4.5M42.5 42.5 47 47M47 17l-4.5 4.5M21.5 42.5 17 47" />
    </>
  ),
  Suspension: (
    <>
      <path d="M32 8v8M32 48v8" />
      <path d="M22 16h20M22 56h20" />
      <path d="M22 20c20 0 0 6 20 6s0 6-20 6 0 6 20 6" />
    </>
  ),
  Brakes: (
    <>
      <circle cx="30" cy="32" r="19" />
      <circle cx="30" cy="32" r="7" />
      <path d="M30 13v5M30 46v5M11 32h5M44 32h5" />
      <path d="M46 20h8a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3h-8" />
    </>
  ),
  Maintenance: (
    <>
      <path d="M26 14h12v6l8 8v22a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V28l8-8Z" />
      <path d="M18 38h28" />
    </>
  ),
  Apparel: (
    <>
      <path d="M24 12l8 5 8-5 12 7-5 9-5-2v24H22V26l-5 2-5-9 12-7Z" />
    </>
  ),
};

const FALLBACK = (
  <>
    <circle cx="32" cy="32" r="19" />
    <path d="M32 13v38M13 32h38" />
  </>
);

export function PartImage({
  department,
  src,
  alt,
  className = "",
  priority = false,
}: {
  /** Top-level category name; picks the placeholder glyph. */
  department: string;
  /** Real photo path, e.g. "/products/csf-intercooler-s55.jpg". */
  src?: string | null;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
        <Image
          src={src}
          alt={alt ?? ""}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          priority={priority}
          className="photo-bw object-cover"
        />
      </div>
    );
  }

  // No photograph yet. Rather than a flat grey rectangle, lay the department
  // glyph over a faint diagonal hatch so an un-photographed catalog still reads
  // as deliberate. The hatch is the same shop-floor motif used behind the hero.
  //
  // The glyph is drawn in M blue rather than grey. Most of the catalog is still
  // waiting on photography, so these are on screen constantly, and grey-on-grey
  // read as broken images. A neutral grey hatch works on both the dark canvas
  // and the inverted paper sections; white did not.
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-surface-2 ${className}`}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, rgba(128,128,132,0.07) 0 1px, transparent 1px 9px)",
        }}
      />
      <svg
        viewBox="0 0 64 64"
        className="relative h-1/2 w-1/2 max-h-24 max-w-24 text-accent-text/60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GLYPHS[department] ?? FALLBACK}
      </svg>
    </div>
  );
}
