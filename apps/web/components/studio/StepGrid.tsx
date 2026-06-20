"use client";

import { useStudioStore } from "@/lib/store";
import type { StepGrid as StepGridType } from "@/lib/engine/engine";

const VOICES: { key: keyof StepGridType; label: string; color: string }[] = [
  { key: "kick",  label: "KICK",  color: "#e8a045" },
  { key: "snare", label: "SNARE", color: "#5b9bd5" },
  { key: "hat",   label: "HAT",   color: "#5fb87a" },
];

const STEPS = Array.from({ length: 16 }, (_, i) => i);

interface StepGridProps {
  currentStep?: number;
}

export function StepGrid({ currentStep = -1 }: StepGridProps) {
  const { grid, toggleStep } = useStudioStore();

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{
        backgroundColor: "var(--surface-1)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <h3
        className="text-xs font-mono uppercase tracking-widest mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        Step Sequencer — 16 steps
      </h3>

      <div className="flex flex-col gap-3">
        {VOICES.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-3">
            {/* Voice label */}
            <span
              className="text-xs font-mono w-12 flex-shrink-0"
              style={{ color: "var(--text-secondary)" }}
            >
              {label}
            </span>

            {/* Step buttons — grouped into 4s for visual rhythm */}
            <div className="flex gap-1 flex-1">
              {STEPS.map((step) => {
                const isActive  = grid[key][step] ?? false;
                const isPlaying = step === currentStep;
                const groupEnd  = step % 4 === 3 && step !== 15;

                return (
                  <button
                    key={step}
                    onClick={() => toggleStep(key, step)}
                    className={[
                      "h-8 flex-1 rounded transition-all duration-75",
                      groupEnd ? "mr-2" : "",
                    ].join(" ")}
                    style={{
                      backgroundColor: isActive
                        ? color
                        : isPlaying
                        ? "var(--surface-3)"
                        : "var(--surface-2)",
                      boxShadow: isActive
                        ? `0 0 8px ${color}55`
                        : isPlaying
                        ? `0 0 4px ${color}33`
                        : "none",
                      outline: isPlaying ? `2px solid ${color}` : "none",
                      outlineOffset: "-2px",
                      transform: isActive && isPlaying ? "scaleY(1.1)" : "scaleY(1)",
                    }}
                    aria-label={`${label} step ${step + 1} ${isActive ? "on" : "off"}`}
                    aria-pressed={isActive}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Beat markers */}
      <div className="flex items-center mt-2 pl-[60px] gap-1">
        {STEPS.map((step) => (
          <div
            key={step}
            className={[
              "flex-1 text-center text-xs font-mono",
              step % 4 === 3 && step !== 15 ? "mr-2" : "",
            ].join(" ")}
            style={{
              color: step % 4 === 0 ? "var(--text-secondary)" : "var(--text-muted)",
              opacity: step % 4 === 0 ? 1 : 0.4,
            }}
          >
            {step % 4 === 0 ? step / 4 + 1 : "·"}
          </div>
        ))}
      </div>
    </div>
  );
}
