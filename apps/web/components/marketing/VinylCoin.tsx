/**
 * VinylCoin — the signature motif: a Solana song-coin rendered as a spinning
 * vinyl record (groove rings + warm label + center hole + amber sheen).
 * Server-safe SVG; spins via CSS animation when `spinning`.
 */
export function VinylCoin({
  size = 96,
  hue = 38,
  label,
  spinning = false,
  speedSec = 6,
  className = "",
}: {
  size?: number;
  hue?: number;
  label?: string;
  spinning?: boolean;
  speedSec?: number;
  className?: string;
}) {
  const gid = `vl-${Math.round(hue)}`;
  const grooves = [46, 42, 38, 34, 30, 26];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={label ? `${label} vinyl` : "vinyl record"}
      style={{
        animation: spinning ? `spin-vinyl ${speedSec}s linear infinite` : undefined,
        display: "block",
      }}
    >
      <defs>
        <radialGradient id={`${gid}-label`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor={`hsl(${hue} 70% 72%)`} />
          <stop offset="60%" stopColor={`hsl(${hue} 62% 52%)`} />
          <stop offset="100%" stopColor={`hsl(${hue} 55% 38%)`} />
        </radialGradient>
        <radialGradient id={`${gid}-disc`} cx="42%" cy="34%" r="80%">
          <stop offset="0%" stopColor="#2a2230" />
          <stop offset="55%" stopColor="#141015" />
          <stop offset="100%" stopColor="#0c0810" />
        </radialGradient>
        <linearGradient id={`${gid}-sheen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(247,198,167,0.55)" />
          <stop offset="35%" stopColor="rgba(247,198,167,0)" />
        </linearGradient>
      </defs>

      {/* disc */}
      <circle cx="50" cy="50" r="49" fill={`url(#${gid}-disc)`} stroke="#000" strokeWidth="0.5" />
      {/* grooves */}
      {grooves.map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(244,236,226,0.06)" strokeWidth="0.5" />
      ))}
      {/* amber sheen sweep */}
      <circle cx="50" cy="50" r="49" fill={`url(#${gid}-sheen)`} />
      {/* label */}
      <circle cx="50" cy="50" r="20" fill={`url(#${gid}-label)`} />
      <circle cx="50" cy="50" r="20" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
      {/* center hole */}
      <circle cx="50" cy="50" r="2.4" fill="#0c0810" />
      {label ? (
        <text
          x="50"
          y="34.5"
          textAnchor="middle"
          fontSize="5.4"
          fontFamily="var(--font-mono)"
          fontWeight="700"
          fill="rgba(20,12,8,0.78)"
          style={{ letterSpacing: "0.04em" }}
        >
          ${label}
        </text>
      ) : null}
    </svg>
  );
}
