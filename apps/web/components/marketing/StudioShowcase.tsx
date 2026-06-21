import Link from "next/link";
import { Reveal } from "./Reveal";
import { VinylCoin } from "./VinylCoin";

const SEQ = [
  [true, false, true, false, true, false, true, false],
  [false, false, false, false, true, false, false, false],
  [true, false, false, false, true, false, true, false],
];
const HUES = [42, 320, 28];

function Knob({ label, deg }: { label: string; deg: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative h-11 w-11 rounded-full border"
        style={{ background: "var(--surface-3)", borderColor: "var(--border)" }}
      >
        <span
          className="absolute left-1/2 top-1/2 h-4 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full rounded-full"
          style={{ background: "var(--gold)", transform: `translate(-50%,-100%) rotate(${deg}deg)`, transformOrigin: "bottom center" }}
        />
      </div>
      <span className="font-mono-tape text-[9px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-transform duration-300 hover:-translate-y-1 ${className}`}
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      {children}
    </div>
  );
}

export function StudioShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <p className="font-mono-tape text-xs uppercase tracking-widest text-muted">// the studio</p>
        <h2 className="mt-3 max-w-2xl font-display text-[clamp(2rem,5vw,3.4rem)] font-semibold tracking-tightest text-cream">
          A whole studio in a browser tab.
        </h2>
        <p className="mt-4 max-w-xl text-secondary">
          Step sequencer, jazzy chord generator, and a tape-warm FX rack — tuned so
          anything you make already sounds like 2am.
        </p>
      </Reveal>

      <Reveal delay={120}>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {/* Sequencer (big) */}
          <Panel className="md:col-span-2 md:row-span-2">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono-tape text-[10px] uppercase tracking-widest text-muted">sequencer</span>
              <div className="flex items-center gap-3 font-mono-tape text-[10px] tabular text-muted">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gh text-[#1a1208]">▶</span>
                <span>72 bpm</span>
                <span>swing 30%</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {SEQ.map((row, r) => (
                <div key={r} className="flex items-center gap-1.5">
                  <span className="w-8 font-mono-tape text-[9px] uppercase text-muted">
                    {["hat", "key", "kick"][r]}
                  </span>
                  {row.map((on, c) => (
                    <span
                      key={c}
                      className="h-7 flex-1 rounded-[5px]"
                      style={{
                        background: on ? `hsl(${HUES[r]} 75% 58%)` : "rgba(244,236,226,0.05)",
                        boxShadow: on ? `0 0 10px hsl(${HUES[r]} 75% 58% / .4)` : "none",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </Panel>

          {/* FX rack */}
          <Panel>
            <span className="font-mono-tape text-[10px] uppercase tracking-widest text-muted">fx rack</span>
            <div className="mt-4 flex justify-between">
              <Knob label="crackle" deg={-40} />
              <Knob label="wow" deg={10} />
              <Knob label="crush" deg={55} />
              <Knob label="verb" deg={120} />
            </div>
          </Panel>

          {/* Chords */}
          <Panel>
            <span className="font-mono-tape text-[10px] uppercase tracking-widest text-muted">chords · C minor</span>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Cm9", "Fm7", "B♭9", "E♭maj7"].map((c) => (
                <span
                  key={c}
                  className="rounded-lg px-3 py-1.5 font-mono-tape text-xs"
                  style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}
                >
                  {c}
                </span>
              ))}
            </div>
            <button
              className="mt-4 w-full rounded-lg border py-2 font-mono-tape text-[11px] uppercase tracking-widest text-secondary"
              style={{ borderColor: "var(--border)" }}
            >
              ↻ generate
            </button>
          </Panel>
        </div>
      </Reveal>

      <Reveal delay={200}>
        <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-2xl border p-6 md:flex-row"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-4">
            <VinylCoin size={56} hue={28} label="YOU" spinning speedSec={8} />
            <div>
              <div className="font-display text-lg text-cream">Ready in about 3 minutes.</div>
              <div className="text-sm text-secondary">Make it, name it, coin it.</div>
            </div>
          </div>
          <Link
            href="/studio"
            className="rounded-full bg-gh px-7 py-3.5 font-bold text-[#1a1208] transition-transform hover:scale-[1.04] active:scale-95"
            style={{ boxShadow: "0 8px 40px rgba(242,182,107,0.35)" }}
          >
            Try the studio →
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
