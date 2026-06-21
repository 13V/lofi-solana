"use client";

import { useState } from "react";
import { Reveal } from "@/components/marketing/Reveal";
import { VinylCoin } from "@/components/marketing/VinylCoin";
import { formatCompact } from "@/lib/marketing/useCountUp";
import { TOP_EARNING, MOST_LISTENED, type SongCoin } from "@/lib/marketing/data";

/** Generate a deterministic pseudo-random sparkline from a seed integer. */
function generateSparkline(seed: number, points = 8): number[] {
  const series: number[] = [];
  let v = 0.5;
  for (let i = 0; i < points; i++) {
    // LCG-style cheap pseudo-random step
    const r = ((seed * 9301 + 49297 * (i + 1)) % 233280) / 233280;
    v = Math.max(0.05, Math.min(0.95, v + (r - 0.5) * 0.35));
    series.push(v);
  }
  return series;
}

/** Render a tiny 70x24 polyline sparkline from a 0–1 series. */
function Sparkline({ seed, positive }: { seed: number; positive: boolean }) {
  const pts = generateSparkline(seed);
  const W = 70;
  const H = 24;
  const stepX = W / (pts.length - 1);
  const coords = pts
    .map((v, i) => `${(i * stepX).toFixed(1)},${((1 - v) * H).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="hidden sm:block flex-shrink-0"
    >
      <polyline
        points={coords}
        fill="none"
        stroke={positive ? "var(--green)" : "var(--red)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

function LeaderboardRow({
  song,
  rank,
  tab,
}: {
  song: SongCoin;
  rank: number;
  tab: "earning" | "listened";
}) {
  const seed = song.id.length * 17 + rank * 31;

  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-surface-1 transition-colors">
      {/* Rank */}
      <span
        className="font-mono-tape tabular text-sm text-muted w-6 flex-shrink-0 text-right"
        aria-label={`rank ${rank}`}
      >
        #{rank}
      </span>

      {/* Vinyl avatar */}
      <VinylCoin size={34} hue={song.hue} spinning={false} />

      {/* Title + creator */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-cream font-medium text-sm truncate">
          {song.title}
        </span>
        <span className="text-muted text-xs font-mono-tape truncate">
          @{song.creator}
        </span>
      </div>

      {/* Sparkline */}
      <Sparkline seed={seed} positive={song.changePct >= 0} />

      {/* Metric */}
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {tab === "listened" ? (
          <span className="font-mono-tape tabular text-sm text-secondary">
            ♪ {formatCompact(song.listens, 1)}
          </span>
        ) : null}
        {tab === "earning" ? (
          <span className="font-mono-tape tabular text-sm text-gold">
            ${song.earnedUsd.toLocaleString()}
          </span>
        ) : null}
        <span
          className="font-mono-tape tabular text-xs"
          style={{ color: song.changePct >= 0 ? "var(--green)" : "var(--red)" }}
        >
          {song.changePct >= 0 ? "▲" : "▼"}{" "}
          {Math.abs(song.changePct).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export function Leaderboard() {
  const [tab, setTab] = useState<"earning" | "listened">("earning");
  const songs = tab === "earning" ? TOP_EARNING : MOST_LISTENED;

  return (
    <section
      id="leaderboard"
      className="relative mx-auto max-w-6xl px-6 py-24"
    >
      <Reveal>
        <div className="flex items-center gap-3">
          <p className="font-mono-tape text-xs uppercase tracking-widest text-muted">
            // this week
          </p>
          {/* Live pulse dot */}
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor: "var(--vu-mint)",
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
            aria-label="live"
          />
        </div>
        <h2 className="mt-3 font-display text-[clamp(2rem,5vw,3.4rem)] font-semibold tracking-tightest text-cream">
          Climbing the charts.
        </h2>
      </Reveal>

      {/* Tab switcher */}
      <Reveal delay={80}>
        <div
          className="mt-8 inline-flex items-center gap-1 rounded-full p-1"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <button
            onClick={() => setTab("earning")}
            className="rounded-full px-5 py-2 text-sm font-medium transition-all"
            style={
              tab === "earning"
                ? {
                    background: "var(--golden-hour)",
                    color: "#1a1208",
                    fontWeight: 700,
                  }
                : {}
            }
          >
            <span className={tab === "earning" ? "" : "text-muted"}>
              Top Earning
            </span>
          </button>
          <button
            onClick={() => setTab("listened")}
            className="rounded-full px-5 py-2 text-sm font-medium transition-all"
            style={
              tab === "listened"
                ? {
                    background: "var(--golden-hour)",
                    color: "#1a1208",
                    fontWeight: 700,
                  }
                : {}
            }
          >
            <span className={tab === "listened" ? "" : "text-muted"}>
              Most Listened
            </span>
          </button>
        </div>
      </Reveal>

      {/* Table */}
      <div
        className="mt-6 rounded-2xl border overflow-hidden"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex flex-col">
          {songs.map((song, i) => (
            <Reveal key={song.id} delay={i * 40}>
              <div
                className={i < songs.length - 1 ? "border-b" : ""}
                style={i < songs.length - 1 ? { borderColor: "var(--border-subtle)" } : {}}
              >
                <LeaderboardRow song={song} rank={i + 1} tab={tab} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
