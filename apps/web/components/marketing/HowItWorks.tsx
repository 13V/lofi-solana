"use client";

import { useEffect, useRef, useState } from "react";
import { STEPS } from "@/lib/marketing/data";
import { Reveal } from "./Reveal";
import { VinylCoin } from "./VinylCoin";

const MAKE_PATTERN = [
  true, false, true, false, true, false, true, false,
  false, false, false, false, true, false, false, false,
  true, false, false, false, true, false, false, false,
];

function PanelVisual({ i }: { i: number }) {
  if (i === 0) {
    return (
      <div className="grid grid-cols-8 gap-1.5">
        {MAKE_PATTERN.map((on, k) => (
          <span
            key={k}
            className="h-6 w-6 rounded-[5px]"
            style={{
              background: on ? "hsl(38 75% 58%)" : "rgba(244,236,226,0.06)",
              boxShadow: on ? "0 0 10px hsl(38 75% 58% / .5)" : "none",
              animation: on ? `pulse-dot ${1.4 + (k % 4) * 0.25}s ease-in-out infinite` : undefined,
            }}
          />
        ))}
      </div>
    );
  }
  if (i === 1) {
    return (
      <div className="flex flex-col items-center gap-4">
        <VinylCoin size={150} hue={28} label="TAPE" spinning speedSec={6} />
        <span
          className="rounded-full px-3 py-1 font-mono-tape text-xs tabular"
          style={{ background: "var(--surface-2)", color: "var(--green)" }}
        >
          ▲ minted · $TAPE
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex">
        {[0, 1, 2, 3, 4].map((k) => (
          <span key={k} className="-ml-3 first:ml-0">
            <VinylCoin size={48} hue={(k * 60) % 360} />
          </span>
        ))}
      </div>
      <span className="font-display text-4xl font-semibold text-gh tabular">$9,240</span>
      <span className="font-mono-tape text-[10px] uppercase tracking-widest text-muted">
        earned this week
      </span>
    </div>
  );
}

function Panel({ i }: { i: number }) {
  const s = STEPS[i]!;
  return (
    <div className="flex max-w-md flex-col items-start gap-5">
      <span className="font-mono-tape text-sm tabular text-accent">{s.n}</span>
      <div className="my-2">
        <PanelVisual i={i} />
      </div>
      <h3 className="font-display text-[clamp(1.8rem,4vw,2.8rem)] font-semibold tracking-tightest text-cream">
        {s.title}
      </h3>
      <p className="text-base leading-relaxed text-secondary">{s.body}</p>
    </div>
  );
}

export function HowItWorks() {
  const [horizontal, setHorizontal] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
    const apply = () => setHorizontal(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!horizontal) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrapRef.current;
        if (!el) return;
        const total = el.offsetHeight - window.innerHeight;
        const p = total > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total)) : 0;
        setProgress(p);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [horizontal]);

  const n = STEPS.length;

  if (!horizontal) {
    return (
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <p className="font-mono-tape text-xs uppercase tracking-widest text-muted">// how it works</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,5vw,3.4rem)] font-semibold tracking-tightest text-cream">
            Three taps from silence to a song-coin.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6">
          {STEPS.map((_, i) => (
            <Reveal key={i} delay={i * 80}>
              <div
                className="rounded-2xl glass border p-7"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <Panel i={i} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  const active = Math.round(progress * (n - 1));

  return (
    <section id="how" ref={wrapRef} className="relative" style={{ height: `${n * 100}vh` }}>
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        <div className="pointer-events-none absolute left-6 top-24 z-10 md:left-12">
          <p className="font-mono-tape text-xs uppercase tracking-widest text-muted">// how it works</p>
          <h2 className="mt-2 max-w-xs font-display text-[clamp(1.6rem,3vw,2.4rem)] font-semibold tracking-tightest text-cream">
            Silence → song-coin, in three.
          </h2>
        </div>

        <div
          className="flex h-full items-center"
          style={{ width: `${n * 100}vw`, transform: `translateX(${-progress * (n - 1) * 100}vw)`, transition: "transform 0.05s linear" }}
        >
          {STEPS.map((_, i) => (
            <div key={i} className="flex h-full w-screen shrink-0 items-center justify-center px-12">
              <Panel i={i} />
            </div>
          ))}
        </div>

        <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === active ? 28 : 8,
                background: i === active ? "var(--gold)" : "var(--border)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
