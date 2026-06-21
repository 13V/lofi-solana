import { SONG_COINS, type SongCoin } from "@/lib/marketing/data";
import { VinylCoin } from "./VinylCoin";

function Chip({ s }: { s: SongCoin }) {
  const up = s.changePct >= 0;
  return (
    <div
      className="mx-1.5 flex items-center gap-2.5 rounded-full border px-3 py-1.5"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      <VinylCoin size={26} hue={s.hue} spinning={false} />
      <span className="font-mono-tape text-xs font-bold text-cream">${s.ticker}</span>
      <span className="font-mono-tape text-xs tabular text-secondary">${s.priceUsd.toFixed(4)}</span>
      <span
        className="font-mono-tape text-xs tabular"
        style={{ color: up ? "var(--green)" : "var(--red)" }}
      >
        {up ? "▲" : "▼"}
        {Math.abs(s.changePct).toFixed(1)}%
      </span>
    </div>
  );
}

function Row({ reverse, durationSec }: { reverse?: boolean; durationSec: number }) {
  // duplicate the list so the -50% translate loops seamlessly
  const items = [...SONG_COINS, ...SONG_COINS];
  return (
    <div className="marquee mask-x py-1.5">
      <div
        className="marquee-track"
        style={{ animation: `${reverse ? "marquee-x-rev" : "marquee-x"} ${durationSec}s linear infinite` }}
      >
        {items.map((s, i) => (
          <Chip key={`${s.id}-${i}`} s={s} />
        ))}
      </div>
    </div>
  );
}

export function LiveMarquee() {
  return (
    <section id="launches" className="relative border-y py-4" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="mb-1 flex items-center justify-center gap-2 font-mono-tape text-[10px] uppercase tracking-widest text-muted">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--vu-mint)", animation: "pulse-dot 1.6s ease-in-out infinite" }}
        />
        now trading
      </div>
      <div style={{ transform: "rotate(-1deg)" }}>
        <Row durationSec={48} />
        <Row durationSec={62} reverse />
      </div>
    </section>
  );
}
