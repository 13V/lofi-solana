"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { StepGrid } from "@/components/studio/StepGrid";
import { ChordPanel } from "@/components/studio/ChordPanel";
import { Transport } from "@/components/studio/Transport";
import { LaunchDialog } from "@/components/studio/LaunchDialog";

import { useStudioStore } from "@/lib/store";
import { getEngine } from "@/lib/engine/engine";
import { generateProgression } from "@/lib/engine/theory";
import { getPreset } from "@/lib/engine/presets";

export default function StudioPage() {
  const {
    playing,
    currentStep,
    presetId,
    key,
    progressionStyle,
    engineReady,
    setGrid,
    setProgression,
    setCurrentStep,
    setBpm,
    setSwing,
    setLaunchDialogOpen,
    setEngineReady,
  } = useStudioStore();

  const unsubRef = useRef<(() => void) | null>(null);

  // Initialize engine on first user gesture
  const initEngine = useCallback(async () => {
    if (engineReady) return;

    const engine = getEngine();
    const preset = getPreset(presetId);

    await engine.init(presetId);

    // Sync initial state into store
    setBpm(preset.bpm);
    setSwing(preset.swing);

    const prog = generateProgression(preset.key, preset.progressionStyle);
    setProgression(prog);
    setGrid(engine.getGrid());

    // Subscribe to step events for UI highlight
    unsubRef.current = engine.onStep((step) => {
      setCurrentStep(step);
    });

    setEngineReady(true);
  }, [engineReady, presetId, setBpm, setSwing, setProgression, setGrid, setCurrentStep, setEngineReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubRef.current?.();
      // Don't fully dispose — user might navigate back; engine is singleton
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-accent font-bold tracking-tight text-lg"
          >
            lofi<span style={{ color: "var(--text-secondary)" }}>.sol</span>
          </Link>
          <span
            className="hidden sm:block text-xs px-2 py-0.5 rounded font-mono"
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-muted)",
            }}
          >
            studio
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full transition-colors"
              style={{
                backgroundColor: playing
                  ? "var(--green)"
                  : engineReady
                  ? "var(--accent)"
                  : "var(--text-muted)",
              }}
            />
            <span
              className="text-xs font-mono hidden sm:block"
              style={{ color: "var(--text-muted)" }}
            >
              {playing ? "playing" : engineReady ? "ready" : "tap play to start"}
            </span>
          </div>

          <WalletMultiButton
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              height: "36px",
              borderRadius: "999px",
            }}
          />
        </div>
      </nav>

      {/* Main layout */}
      <main className="flex-1 flex flex-col lg:flex-row gap-5 p-5 max-w-[1400px] mx-auto w-full">
        {/* Left: sequencer + harmony */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {/* Header */}
          <div>
            <h1
              className="text-2xl font-black"
              style={{ color: "var(--text-primary)" }}
            >
              Beat Studio
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Build your lofi loop, then coin it.
            </p>
          </div>

          {/* Step sequencer */}
          <StepGrid currentStep={currentStep} />

          {/* Harmony */}
          <ChordPanel />

          {/* Waveform / level placeholder */}
          <div
            className="rounded-2xl border p-5"
            style={{
              backgroundColor: "var(--surface-1)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <h3
              className="text-xs font-mono uppercase tracking-widest mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Output Level
            </h3>
            <div
              className="h-10 rounded-lg overflow-hidden relative"
              style={{ backgroundColor: "var(--surface-2)" }}
              aria-hidden
            >
              {/* Animated level meter placeholder */}
              <div
                className="absolute inset-y-0 left-0 rounded-lg transition-all"
                style={{
                  width: playing ? "65%" : "0%",
                  backgroundColor: "var(--accent)",
                  opacity: 0.7,
                  transition: "width 0.1s ease",
                }}
              />
              <div
                className="absolute inset-0 flex items-center px-4"
                style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "monospace" }}
              >
                {playing ? "▶ audio processing…" : "—  stopped"}
              </div>
            </div>
          </div>

          {/* Launch CTA */}
          <button
            onClick={() => setLaunchDialogOpen(true)}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, #c87a22 100%)",
              color: "var(--background)",
              boxShadow: "0 0 30px var(--accent-glow)",
            }}
          >
            🪙 Launch as Coin
          </button>
        </div>

        {/* Right: transport + controls */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <Transport onInitEngine={initEngine} />
        </div>
      </main>

      {/* Launch dialog */}
      <LaunchDialog />
    </div>
  );
}
