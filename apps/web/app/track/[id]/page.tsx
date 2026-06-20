import Link from "next/link";
import { Player } from "@/components/Player";

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

// TODO: Replace with on-chain / API fetch
async function getTrackData(id: string) {
  return {
    id,
    title: "2am Study",
    creator: "0xvibe",
    creatorAddress: "9xQt...4kBf",
    audioUrl: "/samples/demo.wav", // TODO: fetch from Arweave/IPFS
    coverHue: 210,
    priceUsd: 0.0034,
    marketCapUsd: 34000,
    priceChangePercent: 18.2,
    listenCount: 12400,
    holderCount: 341,
    totalSupply: 1_000_000_000,
    description: "Late night chords, warm tape hiss, rain outside.",
    mint: id,
    launchedAt: new Date(Date.now() - 86400 * 3 * 1000).toISOString(),
    // Creator earnings stub
    epochFees: 0.42, // SOL
    creatorShare: 0.18, // SOL allocated this epoch
    claimable: 0.18,
  };
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id } = await params;
  const track = await getTrackData(id);

  const isUp = track.priceChangePercent >= 0;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Nav */}
      <nav
        className="flex items-center gap-4 px-6 py-4 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <Link href="/" className="text-accent font-bold text-lg">
          lofi<span style={{ color: "var(--text-secondary)" }}>.sol</span>
        </Link>
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
          {track.title}
        </span>
      </nav>

      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Left: cover + player + info */}
          <div className="flex flex-col gap-6">
            {/* Cover */}
            <div
              className="w-full aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden flex items-center justify-center text-8xl"
              style={{
                background: `linear-gradient(135deg, hsl(${track.coverHue},40%,12%) 0%, hsl(${track.coverHue + 30},50%,22%) 100%)`,
              }}
              aria-hidden
            >
              📼
            </div>

            {/* Title & creator */}
            <div>
              <h1
                className="text-3xl font-black"
                style={{ color: "var(--text-primary)" }}
              >
                {track.title}
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                by{" "}
                <span className="font-mono" style={{ color: "var(--accent)" }}>
                  {track.creatorAddress}
                </span>
              </p>
              <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                {track.description}
              </p>
            </div>

            {/* Player */}
            <Player
              trackId={track.id}
              audioUrl={track.audioUrl}
              title={track.title}
              creator={track.creator}
            />

            {/* Stats bar */}
            <div
              className="grid grid-cols-3 gap-3 rounded-2xl border p-4"
              style={{
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border-subtle)",
              }}
            >
              {[
                {
                  label: "Listens",
                  value: track.listenCount.toLocaleString(),
                  icon: "🎧",
                },
                {
                  label: "Holders",
                  value: track.holderCount.toLocaleString(),
                  icon: "👥",
                },
                {
                  label: "Launched",
                  value: new Date(track.launchedAt).toLocaleDateString(),
                  icon: "📅",
                },
              ].map(({ label, value, icon }) => (
                <div key={label} className="text-center">
                  <div className="text-xl mb-1">{icon}</div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {value}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: market + buy/sell + earnings */}
          <div className="flex flex-col gap-5">
            {/* Price card */}
            <div
              className="rounded-2xl border p-5"
              style={{
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span
                  className="text-2xl font-black font-mono"
                  style={{ color: "var(--text-primary)" }}
                >
                  ${track.priceUsd.toFixed(4)}
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: isUp ? "var(--green)" : "var(--red)" }}
                >
                  {isUp ? "▲" : "▼"} {Math.abs(track.priceChangePercent).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Mkt cap ${(track.marketCapUsd / 1000).toFixed(1)}k
              </p>

              {/* Bonding curve progress placeholder */}
              <div className="mt-4">
                <div
                  className="flex justify-between text-xs mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span>Bonding curve progress</span>
                  <span>34%</span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--surface-2)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "34%",
                      backgroundColor: "var(--accent)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Buy / Sell stub */}
            <div
              className="rounded-2xl border p-5"
              style={{
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <h2
                className="text-sm font-bold mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                Trade
              </h2>

              <div className="flex gap-2 mb-4">
                {["Buy", "Sell"].map((action) => (
                  <button
                    key={action}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                    style={{
                      backgroundColor:
                        action === "Buy" ? "var(--accent)" : "var(--surface-2)",
                      color:
                        action === "Buy"
                          ? "var(--background)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="number"
                  placeholder="0.0"
                  step="0.1"
                  className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  readOnly
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  SOL
                </span>
              </div>

              <p
                className="text-center text-xs mt-3"
                style={{ color: "var(--text-muted)" }}
              >
                {/* TODO: connect wallet + call pump.fun SDK */}
                Connect wallet to trade
              </p>
            </div>

            {/* Creator earnings widget */}
            <div
              className="rounded-2xl border p-5"
              style={{
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <h2
                className="text-sm font-bold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                🎧 Creator Earnings
              </h2>
              <p
                className="text-xs leading-relaxed mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Trading fees (1%) flow into a vault. Each epoch, the creator&apos;s
                share is proportional to verified listens. A listen qualifies
                when a wallet plays ≥ 30 s and reaches ≥ 50% of the track.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  {
                    label: "Epoch fees (SOL)",
                    value: track.epochFees.toFixed(3),
                  },
                  {
                    label: "Your share",
                    value: `${track.creatorShare.toFixed(3)} SOL`,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl p-3 text-center"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <div
                      className="font-mono font-bold text-sm"
                      style={{ color: "var(--accent)" }}
                    >
                      {value}
                    </div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Claimable row */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{
                  backgroundColor: "rgba(232,160,69,0.08)",
                  border: "1px solid rgba(232,160,69,0.2)",
                }}
              >
                <div>
                  <div
                    className="text-sm font-bold font-mono"
                    style={{ color: "var(--accent)" }}
                  >
                    {track.claimable.toFixed(3)} SOL
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    claimable
                  </div>
                </div>
                <button
                  className="px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--background)",
                  }}
                  // TODO: call /api/rewards/claim with Merkle proof from SDK
                  disabled
                  title="Connect wallet to claim"
                >
                  Claim →
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
