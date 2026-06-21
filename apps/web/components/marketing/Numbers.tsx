"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/marketing/Reveal";
import { VinylCoin } from "@/components/marketing/VinylCoin";
import { useCountUp, formatCompact } from "@/lib/marketing/useCountUp";
import { STATS } from "@/lib/marketing/data";

const TESTIMONIALS = [
  {
    quote:
      "I posted the track on a Tuesday. By Friday the vault had kicked out enough to cover a month of plugins.",
    handle: "@goldenear",
    hue: 40,
  },
  {
    quote:
      "Never thought making a lo-fi loop at 2am would do anything but keep me sane. Turns out it keeps doing both.",
    handle: "@mxtape",
    hue: 320,
  },
  {
    quote:
      "The barrier to entry is basically zero. If you've got ears and a browser you've got everything you need.",
    handle: "@noodlebar",
    hue: 48,
  },
];

function StatCard({
  value,
  prefix = "",
  suffix = "",
  label,
  delay,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <div
        className="rounded-2xl glass p-7 border transition-transform hover:-translate-y-1"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="font-display text-5xl font-semibold text-gh tabular">
          {prefix}
          {suffix
            ? formatCompact(value, 1)
            : formatCompact(value, value >= 1_000_000 ? 2 : 0)}
          {suffix}
        </div>
        <div className="mt-2 text-sm text-secondary">{label}</div>
      </div>
    </Reveal>
  );
}

function CounterCard({
  target,
  prefix = "",
  suffix = "",
  label,
  delay,
  digits,
  started,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  label: string;
  delay: number;
  digits: number;
  started: boolean;
}) {
  const value = useCountUp(target, { start: started, duration: 2000 });

  return (
    <Reveal delay={delay}>
      <div
        className="rounded-2xl glass p-7 border transition-transform hover:-translate-y-1"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="font-display text-5xl font-semibold text-gh tabular">
          {prefix}
          {formatCompact(value, digits)}
        </div>
        <div className="mt-2 text-sm text-secondary">{label}</div>
      </div>
    </Reveal>
  );
}

export function Numbers() {
  const sectionRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="numbers"
      ref={sectionRef}
      className="relative mx-auto max-w-6xl px-6 py-24"
    >
      <Reveal>
        <p className="font-mono-tape text-xs uppercase tracking-widest text-muted">
          // proof
        </p>
        <h2 className="mt-3 font-display text-[clamp(2rem,5vw,3.4rem)] font-semibold tracking-tightest text-cream">
          Real money. Real plays.
        </h2>
      </Reveal>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <CounterCard
          target={STATS.creatorsPaidUsd}
          prefix="$"
          label="paid to creators"
          delay={0}
          digits={2}
          started={started}
        />
        <CounterCard
          target={STATS.songsLaunched}
          label="songs launched"
          delay={80}
          digits={0}
          started={started}
        />
        <CounterCard
          target={STATS.totalListens}
          suffix=""
          label="verified listens"
          delay={160}
          digits={1}
          started={started}
        />
      </div>

      <div className="mt-16">
        <Reveal>
          <p className="font-mono-tape text-xs uppercase tracking-widest text-muted mb-8">
            // from the community
          </p>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.handle} delay={i * 80}>
              <div
                className="rounded-2xl glass p-6 border flex flex-col gap-4 transition-transform hover:-translate-y-1"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <p className="text-secondary text-sm leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-auto pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <VinylCoin size={32} hue={t.hue} spinning={false} />
                  <span className="font-mono-tape text-xs text-muted">
                    {t.handle}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
