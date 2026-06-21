"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroBeat, HeroVoice } from "@/lib/hero/heroBeat";
import { HeroCanvas } from "./HeroCanvas";
import { VinylCoin } from "./VinylCoin";

const VOICES: { id: HeroVoice; label: string; hue: number }[] = [
  { id: "hat", label: "hat", hue: 42 },
  { id: "key", label: "keys", hue: 320 },
  { id: "kick", label: "kick", hue: 28 },
];
const STEPS = 8;

const DEFAULT_GRID: Record<HeroVoice, boolean[]> = {
  hat: [true, false, true, false, true, false, true, false],
  key: [true, false, false, false, true, false, false, false],
  kick: [true, false, false, false, true, false, false, false],
};

const HEADLINE = ["Make", "the", "sound", "of", "now."];

export function Hero() {
  const beatRef = useRef<HeroBeat | null>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [grid, setGrid] = useState<Record<HeroVoice, boolean[]>>(() => ({
    hat: [...DEFAULT_GRID.hat],
    key: [...DEFAULT_GRID.key],
    kick: [...DEFAULT_GRID.kick],
  }));

  const getLevels = useCallback(() => beatRef.current?.getLevels(), []);

  const ensureStarted = useCallback(async () => {
    if (beatRef.current) return beatRef.current;
    const { getHeroBeat } = await import("@/lib/hero/heroBeat");
    const beat = getHeroBeat();
    await beat.init();
    beat.onStep(setStep);
    beatRef.current = beat;
    setStarted(true);
    return beat;
  }, []);

  const togglePlay = useCallback(async () => {
    const beat = await ensureStarted();
    beat.toggle();
    setPlaying(beat.playing);
  }, [ensureStarted]);

  const tapPad = useCallback(
    async (voice: HeroVoice, i: number) => {
      const beat = await ensureStarted();
      if (!beat.playing) {
        beat.play();
        setPlaying(true);
      }
      const on = beat.toggleStep(voice, i);
      setGrid((g) => {
        const row = [...g[voice]];
        row[i] = on;
        return { ...g, [voice]: row };
      });
    },
    [ensureStarted]
  );

  useEffect(() => {
    return () => beatRef.current?.stop();
  }, []);

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pb-16 pt-28 text-center">
      {/* golden-hour wash + reactive canvas */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "radial-gradient(120% 90% at 50% 8%, #2c1f30 0%, #100b14 55%)" }}
      />
      <HeroCanvas getLevels={getLevels} active={playing} />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, #100b14)" }}
      />

      {/* live chip */}
      <div className="mb-8 inline-flex items-center gap-2 rounded-full glass px-3 py-1 font-mono-tape text-[11px] uppercase tracking-widest text-secondary">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--vu-mint)", animation: "pulse-dot 1.6s ease-in-out infinite" }}
        />
        live on solana · devnet
      </div>

      {/* kinetic headline */}
      <h1 className="font-display tracking-tightest text-[clamp(2.7rem,8vw,6.2rem)] font-semibold leading-[0.95]">
        {HEADLINE.map((w, i) => (
          <span
            key={i}
            className="mr-[0.25em] inline-block"
            style={{
              animation: "rise-in .9s cubic-bezier(.2,.7,.2,1) both",
              animationDelay: `${0.15 + i * 0.09}s`,
              color: w === "now." ? undefined : "var(--cream)",
            }}
          >
            {w === "now." ? <span className="text-gh">now.</span> : w}
          </span>
        ))}
      </h1>

      <p
        className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-secondary md:text-lg"
        style={{ animation: "rise-in .9s ease both", animationDelay: ".7s" }}
      >
        Make a lofi beat in your browser, drop it as a coin on Solana, and earn
        every time the world hits play.
      </p>

      {/* vinyl + playable pads */}
      <div
        className="mt-10 flex flex-col items-center gap-7 md:flex-row md:items-center md:gap-9"
        style={{ animation: "rise-in 1s ease both", animationDelay: ".85s" }}
      >
        <button
          onClick={togglePlay}
          className="group relative shrink-0"
          aria-label={playing ? "pause beat" : "play beat"}
        >
          <VinylCoin size={132} hue={28} label="LOFI" spinning={playing} speedSec={5} />
          <span
            className="absolute inset-0 grid place-items-center text-2xl text-cream transition-opacity"
            style={{ opacity: playing ? 0 : 1, textShadow: "0 2px 12px rgba(0,0,0,.6)" }}
          >
            {playing ? "" : "▶"}
          </span>
        </button>

        <div className="rounded-2xl glass p-4">
          <div className="mb-2 flex items-center justify-between gap-6">
            <span className="font-mono-tape text-[10px] uppercase tracking-widest text-muted">
              {started ? "tap a pad to jam" : "tap to start the beat"}
            </span>
            <span className="font-mono-tape text-[10px] tabular text-muted">78 bpm</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {VOICES.map((v) => (
              <div key={v.id} className="flex items-center gap-1.5">
                <span className="w-9 text-right font-mono-tape text-[9px] uppercase tracking-wider text-muted">
                  {v.label}
                </span>
                {Array.from({ length: STEPS }, (_, i) => {
                  const on = grid[v.id][i];
                  const playingCol = step === i;
                  return (
                    <button
                      key={i}
                      onClick={() => tapPad(v.id, i)}
                      aria-label={`${v.label} step ${i + 1}`}
                      aria-pressed={on}
                      className="h-6 w-6 rounded-[5px] border transition-all duration-150 md:h-7 md:w-7"
                      style={{
                        background: on ? `hsl(${v.hue} 75% 58%)` : "rgba(244,236,226,0.05)",
                        borderColor: playingCol ? "var(--gold)" : "rgba(244,236,226,0.10)",
                        boxShadow: on ? `0 0 12px hsl(${v.hue} 75% 58% / .5)` : "none",
                        transform: playingCol ? "translateY(-1px) scale(1.06)" : "none",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div
        className="mt-11 flex flex-col items-center gap-4 sm:flex-row"
        style={{ animation: "rise-in 1s ease both", animationDelay: "1s" }}
      >
        <Link
          href="/studio"
          className="rounded-full bg-gh px-8 py-4 text-base font-bold text-[#1a1208] transition-transform hover:scale-[1.04] active:scale-95"
          style={{ boxShadow: "0 8px 40px rgba(242,182,107,0.35)" }}
        >
          Make your first beat
        </Link>
        <a
          href="#launches"
          className="rounded-full border px-7 py-4 text-base text-secondary transition-colors hover:text-cream"
          style={{ borderColor: "var(--border)" }}
        >
          Explore launches ↓
        </a>
      </div>
    </section>
  );
}
