"use client";

import { useStudioStore } from "@/lib/store";
import { getEngine } from "@/lib/engine/engine";
import { generateProgression, scaleNotes } from "@/lib/engine/theory";
import type { ProgressionStyle } from "@/lib/store";

const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const STYLES: { value: ProgressionStyle; label: string }[] = [
  { value: "lofi-4",      label: "Lofi 4-chord" },
  { value: "ii-V-I",      label: "ii–V–I (jazz)" },
  { value: "minor-dream", label: "Minor dream" },
  { value: "one-four",    label: "I–IV loop" },
];

export function ChordPanel() {
  const {
    key,
    mode,
    progressionStyle,
    progression,
    setKey,
    setProgressionStyle,
    setProgression,
    engineReady,
  } = useStudioStore();

  const handleGenerate = () => {
    const chords = generateProgression(key, progressionStyle);
    setProgression(chords);
    if (engineReady) {
      getEngine().setProgression(chords);
    }
  };

  const handleKeyChange = (newKey: string) => {
    setKey(newKey);
    getEngine().setKey(newKey);
  };

  const scaleDisplay = scaleNotes(key, mode);

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
        Harmony
      </h3>

      <div className="flex flex-col gap-4">
        {/* Key selector */}
        <div>
          <label
            className="block text-xs mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Key
          </label>
          <div className="flex flex-wrap gap-1.5">
            {KEYS.map((k) => (
              <button
                key={k}
                onClick={() => handleKeyChange(k)}
                className="px-3 py-1 rounded-lg text-sm font-mono transition-all"
                style={{
                  backgroundColor: k === key ? "var(--accent)" : "var(--surface-2)",
                  color: k === key ? "var(--background)" : "var(--text-secondary)",
                  fontWeight: k === key ? 700 : 400,
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Scale display */}
        <div
          className="flex flex-wrap gap-1 text-xs font-mono px-3 py-2 rounded-lg"
          style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
        >
          <span style={{ color: "var(--text-secondary)", marginRight: "4px" }}>
            Scale:
          </span>
          {scaleDisplay.map((n, i) => (
            <span key={i} style={{ color: "var(--accent)" }}>
              {n}
            </span>
          ))}
        </div>

        {/* Progression style */}
        <div>
          <label
            className="block text-xs mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Style
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {STYLES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setProgressionStyle(value)}
                className="px-3 py-2 rounded-lg text-xs transition-all text-left"
                style={{
                  backgroundColor:
                    value === progressionStyle
                      ? "var(--accent-glow)"
                      : "var(--surface-2)",
                  color:
                    value === progressionStyle
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                  border: `1px solid ${value === progressionStyle ? "var(--accent-dim)" : "transparent"}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--background)",
          }}
        >
          Generate Progression
        </button>

        {/* Chord display */}
        {progression.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {progression.map((chord, i) => (
              <div
                key={i}
                className="rounded-lg p-2 text-center"
                style={{ backgroundColor: "var(--surface-2)" }}
              >
                <div
                  className="text-xs font-bold font-mono"
                  style={{ color: "var(--accent)" }}
                >
                  {chord.symbol}
                </div>
                <div
                  className="text-xs mt-1 leading-tight"
                  style={{ color: "var(--text-muted)" }}
                >
                  {chord.notes.slice(0, 3).join(" ")}
                  {chord.notes.length > 3 ? "…" : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
