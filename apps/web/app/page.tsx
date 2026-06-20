import Link from "next/link";
import { SongCoinCard } from "@/components/SongCoinCard";

// Mock trending data — replace with on-chain fetch
const TRENDING_SONGS = [
  {
    id: "1",
    title: "2am Study",
    creator: "0xvibe",
    listens: 12400,
    priceUsd: 0.0034,
    changePercent: 18.2,
    coverHue: 210,
  },
  {
    id: "2",
    title: "Rain on Glass",
    creator: "loopmaker",
    listens: 8900,
    priceUsd: 0.0018,
    changePercent: -4.1,
    coverHue: 270,
  },
  {
    id: "3",
    title: "Cassette Dream",
    creator: "beatsmith",
    listens: 31200,
    priceUsd: 0.0092,
    changePercent: 42.7,
    coverHue: 30,
  },
  {
    id: "4",
    title: "Midnight Kettle",
    creator: "softkeys",
    listens: 5100,
    priceUsd: 0.0011,
    changePercent: 6.3,
    coverHue: 160,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <span className="text-accent font-bold tracking-tight text-lg">
          lofi<span style={{ color: "var(--text-secondary)" }}>.sol</span>
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/studio"
            className="text-sm px-4 py-1.5 rounded-full border text-secondary hover:text-accent transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            Studio
          </Link>
          {/* Wallet button rendered client-side in Providers */}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-28 overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 60%, rgba(232,160,69,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Cassette icon */}
        <div className="mb-8 text-6xl select-none" aria-hidden>
          📼
        </div>

        <h1
          className="text-5xl md:text-7xl font-black tracking-tight mb-4 leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Make a beat.
          <br />
          <span className="text-accent">Coin it.</span>
          <br />
          Earn when people listen.
        </h1>

        <p
          className="text-lg md:text-xl max-w-xl mb-10 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Create lofi music in your browser, launch it as a tradeable Solana
          token on pump.fun, and earn trading fees proportional to verified
          listens.
        </p>

        <Link
          href="/studio"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--background)",
            boxShadow: "0 0 30px var(--accent-glow)",
          }}
        >
          Open Studio →
        </Link>
      </section>

      {/* Steps */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2
          className="text-center text-2xl font-bold mb-12"
          style={{ color: "var(--text-secondary)" }}
        >
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              icon: "🎛️",
              title: "Make",
              desc: "Use the in-browser studio to sequence drums, lay chords, tweak BPM and swing. Export a lofi loop in seconds.",
            },
            {
              step: "02",
              icon: "🪙",
              title: "Coin it",
              desc: "Name your track, set a ticker, and launch it as a bonding-curve token on pump.fun. Your music becomes a market.",
            },
            {
              step: "03",
              icon: "💸",
              title: "Earn",
              desc: "Every swap generates fees. Your share is weighted by how many verified listens your track has accumulated.",
            },
          ].map(({ step, icon, title, desc }) => (
            <div
              key={step}
              className="rounded-2xl p-6 border"
              style={{
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div
                className="text-xs font-mono mb-3"
                style={{ color: "var(--text-muted)" }}
              >
                {step}
              </div>
              <div className="text-3xl mb-3">{icon}</div>
              <h3
                className="text-lg font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How earnings work */}
      <section
        className="mx-6 md:mx-auto max-w-2xl rounded-2xl p-8 mb-16 border"
        style={{
          backgroundColor: "var(--surface-1)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <h2 className="text-lg font-bold mb-3 text-accent">
          How creator earnings work
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Every trade on your song-coin incurs a 1% protocol fee. Fees
          accumulate in an on-chain vault. At each epoch, they are split among
          all creators proportional to their{" "}
          <em style={{ color: "var(--text-primary)" }}>verified listen weight</em>
          &nbsp;— a count of sessions where a unique wallet listened for ≥ 30 s
          and ≥ 50% of the track. The weight is stored in a Merkle tree; claims
          are gas-efficient and permissionless.
        </p>
        <div
          className="mt-4 text-xs font-mono rounded-lg px-4 py-3"
          style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
        >
          creator_share = (your_listens / total_listens) × epoch_fees
        </div>
      </section>

      {/* Trending */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <h2
          className="text-xl font-bold mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Trending song-coins
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TRENDING_SONGS.map((song) => (
            <SongCoinCard key={song.id} {...song} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 py-8 text-center text-xs"
        style={{
          borderColor: "var(--border-subtle)",
          color: "var(--text-muted)",
        }}
      >
        lofi.sol · devnet · {new Date().getFullYear()}
      </footer>
    </main>
  );
}
