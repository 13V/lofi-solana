"use client";

import Link from "next/link";
import { useState } from "react";
import { WaveformHorizon } from "./WaveformHorizon";

export function FinalCTA() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="relative overflow-hidden px-6 py-32 text-center">
      {/* golden-hour wash */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "radial-gradient(120% 90% at 50% 120%, rgba(242,182,107,0.18) 0%, rgba(224,143,176,0.08) 38%, transparent 70%)" }}
      />
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <span className="text-gold">
          <WaveformHorizon width={150} height={46} />
        </span>

        <h2 className="mt-8 font-display text-[clamp(2.4rem,7vw,5rem)] font-semibold leading-[0.98] tracking-tightest text-cream">
          Make a beat. Coin it.
          <br />
          <span className="text-gh">Get paid when people listen.</span>
        </h2>

        <p className="mt-6 max-w-lg text-balance text-secondary">
          The studio's open and the bonding curve's warm. Your first song-coin is a
          few taps away.
        </p>

        <div className="mt-10 flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/studio"
            className="w-full rounded-full bg-gh px-8 py-4 text-base font-bold text-[#1a1208] transition-transform hover:scale-[1.04] active:scale-95 sm:w-auto"
            style={{ boxShadow: "0 8px 44px rgba(242,182,107,0.4)" }}
          >
            Make your first beat
          </Link>

          {/* waitlist (stub) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setDone(true);
            }}
            className="flex w-full items-center gap-2 rounded-full border p-1.5 sm:w-auto"
            style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
          >
            {done ? (
              <span className="px-4 py-1.5 font-mono-tape text-sm text-mint">◉ you're on the list</span>
            ) : (
              <>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email for early access"
                  className="w-44 bg-transparent px-3 py-1.5 text-sm text-cream outline-none placeholder:text-muted"
                />
                <button
                  type="submit"
                  className="rounded-full px-4 py-1.5 text-sm font-medium text-secondary transition-colors hover:text-cream"
                  style={{ background: "var(--surface-3)" }}
                >
                  notify me
                </button>
              </>
            )}
          </form>
        </div>

        <p className="mt-8 font-mono-tape text-[11px] uppercase tracking-widest text-muted">
          a creative tool · not an investment · rewards never guaranteed
        </p>
      </div>
    </section>
  );
}
