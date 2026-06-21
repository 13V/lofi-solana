"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WaveformHorizon } from "./WaveformHorizon";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(16,11,20,0.6)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: `1px solid ${scrolled ? "var(--border-subtle)" : "transparent"}`,
      }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="group flex items-center gap-2" aria-label="lofi.sol home">
          <span className="text-gold transition-transform group-hover:scale-105">
            <WaveformHorizon width={40} height={20} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-cream">
            lofi<span className="text-accent">.sol</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <span className="flex items-center gap-2 font-mono-tape text-[11px] uppercase tracking-widest text-muted">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--vu-mint)", animation: "pulse-dot 1.6s ease-in-out infinite" }}
            />
            <span className="tabular">1,294</span> launched today
          </span>
          {[
            ["How it works", "#how"],
            ["Launches", "#launches"],
            ["Earn", "#earn"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-sm text-secondary transition-colors hover:text-cream"
            >
              {label}
            </a>
          ))}
        </div>

        <Link
          href="/studio"
          className="rounded-full bg-gh px-5 py-2 text-sm font-bold text-[#1a1208] transition-transform hover:scale-[1.05] active:scale-95"
          style={{ boxShadow: "0 4px 24px rgba(242,182,107,0.3)" }}
        >
          Enter Studio
        </Link>
      </nav>
    </header>
  );
}
