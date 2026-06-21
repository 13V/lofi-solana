"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/marketing/Reveal";
import { useCountUp, formatCompact } from "@/lib/marketing/useCountUp";
import { STATS } from "@/lib/marketing/data";

/** The SVG path coins animate along */
const FLOW_PATH = "M 20 80 C 60 80, 80 40, 140 20";

/** Coin positions staggered along the path (0–100%) */
const COIN_OFFSETS = [0, 17, 33, 50, 67, 83];

function FlowingCoins() {
  return (
    <div className="relative w-full h-full">
      <svg
        viewBox="0 0 160 100"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
        overflow="visible"
      >
        {/* Path (visible as a subtle guide) */}
        <path
          d={FLOW_PATH}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Node: listens */}
        <circle cx="20" cy="80" r="6" fill="var(--surface-3)" stroke="var(--border)" strokeWidth="1" />
        <text
          x="20"
          y="96"
          textAnchor="middle"
          fontSize="6"
          fill="var(--text-muted)"
          fontFamily="var(--font-mono)"
        >
          listens
        </text>

        {/* Node: you */}
        <circle cx="140" cy="20" r="6" fill="var(--surface-3)" stroke="var(--accent)" strokeWidth="1.5" />
        <text
          x="140"
          y="12"
          textAnchor="middle"
          fontSize="6"
          fill="var(--accent)"
          fontFamily="var(--font-mono)"
        >
          you
        </text>
      </svg>

      {/* Animated coin dots using offset-path */}
      {COIN_OFFSETS.map((_startOffset, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: "10px",
            height: "10px",
            top: 0,
            left: 0,
            // offset-path and offset-distance are typed as custom CSS
            // We use a style cast to set them
            ...(({
              offsetPath: `path('${FLOW_PATH}')`,
              offsetDistance: "0%",
              offsetRotate: "0deg",
              animation: `flow-coin-${i} 2.4s ${i * 0.38}s cubic-bezier(0.4,0,0.6,1) infinite`,
            } as unknown) as React.CSSProperties),
          }}
          aria-hidden="true"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <circle
              cx="5"
              cy="5"
              r="4.5"
              fill="var(--gold)"
              opacity="0.88"
            />
            <circle cx="5" cy="5" r="2" fill="var(--accent)" opacity="0.5" />
          </svg>
        </div>
      ))}

      {/* Inline keyframes for each coin so offset-distance animates */}
      <style>{`
        ${COIN_OFFSETS.map(
          (_, i) => `
          @keyframes flow-coin-${i} {
            0%   { offset-distance: 0%;   opacity: 0; }
            8%   { offset-distance: 0%;   opacity: 1; }
            92%  { offset-distance: 100%; opacity: 1; }
            100% { offset-distance: 100%; opacity: 0; }
          }
        `
        ).join("")}
      `}</style>
    </div>
  );
}

function EarningsVisual({ started }: { started: boolean }) {
  const listensValue = useCountUp(STATS.listenersThisWeek, {
    start: started,
    duration: 2200,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Coin flow SVG */}
      <div
        className="rounded-2xl glass border relative overflow-hidden"
        style={{
          borderColor: "var(--border-subtle)",
          height: "200px",
        }}
      >
        <FlowingCoins />
      </div>

      {/* Live counter */}
      <div
        className="rounded-2xl glass border p-6"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-semibold text-gh tabular">
            {formatCompact(listensValue, 1)}
          </span>
          <span
            className="font-mono-tape text-xs"
            style={{ color: "var(--vu-mint)" }}
          >
            ▲
          </span>
        </div>
        <p className="mt-1 font-mono-tape text-xs text-muted uppercase tracking-widest">
          plays today
        </p>
      </div>
    </div>
  );
}

export function Earnings() {
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
      id="earn"
      ref={sectionRef}
      className="relative mx-auto max-w-6xl px-6 py-24"
    >
      <Reveal>
        <p className="font-mono-tape text-xs uppercase tracking-widest text-muted">
          // the loop
        </p>
        <h2 className="mt-3 font-display text-[clamp(2rem,5vw,3.4rem)] font-semibold tracking-tightest text-cream">
          The more it&rsquo;s played,{" "}
          <span className="text-gh">the more it pays.</span>
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-10 md:grid-cols-2 md:items-start">
        {/* LEFT: Explainer */}
        <Reveal delay={80}>
          <div className="flex flex-col gap-6">
            <p className="text-secondary leading-relaxed">
              Trading fees on your song-coin flow into an on-chain vault. Every
              epoch, that revenue is shared with the people behind the song —
              weighted by verified listens.
            </p>

            {/* Formula chip */}
            <div
              className="rounded-xl p-5 border"
              style={{
                backgroundColor: "var(--surface-2)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <p className="font-mono-tape text-xs text-muted mb-2 uppercase tracking-widest">
                how your share is calculated
              </p>
              <p className="font-mono-tape text-sm text-cream leading-relaxed">
                your share ={" "}
                <span className="text-accent">
                  (your listens &divide; total listens)
                </span>{" "}
                &times; epoch fees
              </p>
            </div>

            {/* Compliance line */}
            <p className="font-mono-tape text-xs text-muted leading-relaxed">
              Rewards, not an investment — never a promise of profit.
            </p>

            {/* CTA */}
            <div className="pt-2">
              <a
                href="/studio"
                className="inline-block rounded-full bg-gh px-7 py-3.5 font-bold text-[#1a1208] transition-transform hover:-translate-y-0.5"
                style={{ boxShadow: "0 8px 40px rgba(242,182,107,0.35)" }}
              >
                Start making music
              </a>
            </div>
          </div>
        </Reveal>

        {/* RIGHT: Visual */}
        <Reveal delay={160}>
          <EarningsVisual started={started} />
        </Reveal>
      </div>
    </section>
  );
}
