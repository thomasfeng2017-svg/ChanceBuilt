/**
 * Line-art schematic of a straight-six.
 *
 * Every platform the shop works on (S55, S58, B58, N54, N55) is an inline-six,
 * so one drawing is honest for all of them; only the turbo count changes.
 * Used on the engine tiles until real engine-bay photography exists for each
 * platform, and it beats a black rectangle by a mile.
 */
export function EngineGlyph({
  turbos = 1,
  className = "",
}: {
  /** 1 for a single twin-scroll (B58, N55), 2 for a twin (S55, S58, N54). */
  turbos?: 1 | 2;
  className?: string;
}) {
  const bores = [0, 1, 2, 3, 4, 5];

  return (
    <svg
      viewBox="0 0 240 120"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* valve cover */}
      <rect x="30" y="24" width="132" height="16" rx="1.5" />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={54 + i * 32} y1="24" x2={54 + i * 32} y2="40" />
      ))}

      {/* block */}
      <rect x="30" y="40" width="132" height="46" rx="1.5" />

      {/* bores */}
      {bores.map((i) => (
        <circle key={i} cx={41 + i * 22} cy="63" r="7.5" />
      ))}

      {/* sump */}
      <path d="M42 86v12a4 4 0 0 0 4 4h100a4 4 0 0 0 4-4V86" />

      {/* exhaust manifold runners feeding the turbo(s) */}
      <path d="M162 50h14l10 -10" />
      {turbos === 2 && <path d="M162 74h14l10 10" />}

      {/* turbo: compressor housing with a centre hub */}
      <circle cx="200" cy="34" r="15" />
      <circle cx="200" cy="34" r="4.5" />
      <path d="M200 19v6M200 43v6M185 34h6M209 34h6" />

      {turbos === 2 && (
        <>
          <circle cx="200" cy="90" r="15" />
          <circle cx="200" cy="90" r="4.5" />
          <path d="M200 75v6M200 99v6M185 90h6M209 90h6" />
        </>
      )}
    </svg>
  );
}
