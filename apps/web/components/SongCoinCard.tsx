import Link from "next/link";

interface SongCoinCardProps {
  id: string;
  title: string;
  creator: string;
  listens: number;
  priceUsd: number;
  changePercent: number;
  coverHue: number;
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function SongCoinCard({
  id,
  title,
  creator,
  listens,
  priceUsd,
  changePercent,
  coverHue,
}: SongCoinCardProps) {
  const isUp = changePercent >= 0;

  return (
    <Link
      href={`/track/${id}`}
      className="group rounded-2xl overflow-hidden border transition-all hover:scale-[1.02] hover:shadow-lg"
      style={{
        backgroundColor: "var(--surface-1)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Cover art — generative gradient placeholder */}
      <div
        className="h-36 w-full flex items-center justify-center text-4xl select-none"
        style={{
          background: `linear-gradient(135deg, hsl(${coverHue},40%,12%) 0%, hsl(${coverHue + 30},50%,20%) 100%)`,
        }}
        aria-hidden
      >
        📼
      </div>

      <div className="p-4">
        <p
          className="font-bold text-sm truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </p>
        <p
          className="text-xs mb-3 truncate"
          style={{ color: "var(--text-muted)" }}
        >
          {creator}
        </p>

        <div className="flex items-center justify-between">
          <span
            className="text-xs font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            ${priceUsd.toFixed(4)}
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: isUp ? "var(--green)" : "var(--red)" }}
          >
            {isUp ? "+" : ""}
            {changePercent.toFixed(1)}%
          </span>
        </div>

        <div
          className="mt-2 flex items-center gap-1 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span>🎧</span>
          <span>{formatNum(listens)} listens</span>
        </div>
      </div>
    </Link>
  );
}
