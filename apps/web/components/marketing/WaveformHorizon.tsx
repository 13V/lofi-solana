/**
 * WaveformHorizon — the brand mark: a golden-hour sun sitting on a horizon
 * line that becomes an audio waveform. Used in the wordmark, section dividers,
 * and the final CTA. Server-safe SVG; inherits `currentColor` for the wave.
 */
export function WaveformHorizon({
  className = "",
  width = 132,
  height = 40,
  showSun = true,
}: {
  className?: string;
  width?: number;
  height?: number;
  showSun?: boolean;
}) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 132 40"
      fill="none"
      role="img"
      aria-label="lofi.sol mark"
    >
      <defs>
        <linearGradient id="wh-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7c6a7" />
          <stop offset="55%" stopColor="#f2b66b" />
          <stop offset="100%" stopColor="#e08fb0" />
        </linearGradient>
      </defs>
      {showSun && (
        <circle cx="66" cy="22" r="13" fill="url(#wh-sun)" opacity="0.92" />
      )}
      {/* waveform that doubles as the horizon */}
      <path
        d="M2 22 H40 L46 12 L52 30 L58 8 L64 32 L70 6 L76 33 L82 14 L88 26 L94 22 H130"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
