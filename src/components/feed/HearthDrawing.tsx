/** 48px line drawing of a hearth. Lit: low ember-glow embers with a soft glow. Unlit: cold. */
export function HearthDrawing({ lit = true }: { lit?: boolean }) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden className="text-ink-400">
      <path d="M8 40V20c0-8.8 7.2-16 16-16s16 7.2 16 16v20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M4 40h40" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M15 34h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {lit ? (
        <g className="text-ember-glow">
          <ellipse cx="24" cy="32" rx="9" ry="4" fill="currentColor" opacity="0.15" />
          <path d="M18 32c1-2.5 2.5-3.5 3.5-3.5M24 32c0-3 1.5-5 3-5.5M28 32c.5-1.5 1.5-2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </g>
      ) : (
        <path d="M19 32c1.5-1 3-1 4.5 0s3 1 4.5 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.6" />
      )}
    </svg>
  );
}
