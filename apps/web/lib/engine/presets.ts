/**
 * presets.ts
 * Studio presets — bpm, key, progression style, fx wetness.
 */

import type { Mode } from "./theory";

export type ProgressionStyle =
  | "ii-V-I"
  | "lofi-4"
  | "minor-dream"
  | "one-four";

export interface StudioPreset {
  id: string;
  label: string;
  emoji: string;
  bpm: number;
  swing: number; // 0–1
  key: string;
  mode: Mode;
  progressionStyle: ProgressionStyle;
  /** Reverb decay override */
  reverbDecay: number;
  /** Bit-crusher bits (lower = more crushed) */
  crusherBits: number;
  /** Filter cutoff Hz */
  filterHz: number;
  /** Vinyl crackle enabled */
  vinyl: boolean;
  description: string;
}

export const PRESETS: StudioPreset[] = [
  {
    id: "rainy-day",
    label: "Rainy Day",
    emoji: "🌧️",
    bpm: 70,
    swing: 0.35,
    key: "F",
    mode: "major",
    progressionStyle: "lofi-4",
    reverbDecay: 3.2,
    crusherBits: 10,
    filterHz: 7000,
    vinyl: true,
    description: "Soft chords, warm tape hiss, afternoon window vibes.",
  },
  {
    id: "tape-study",
    label: "Tape Study",
    emoji: "📼",
    bpm: 75,
    swing: 0.25,
    key: "C",
    mode: "dorian",
    progressionStyle: "ii-V-I",
    reverbDecay: 2.0,
    crusherBits: 9,
    filterHz: 9000,
    vinyl: false,
    description: "Jazzy ii–V–I loop, slightly crushed, study-session energy.",
  },
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🌙",
    bpm: 65,
    swing: 0.4,
    key: "A",
    mode: "minor",
    progressionStyle: "minor-dream",
    reverbDecay: 4.0,
    crusherBits: 8,
    filterHz: 5500,
    vinyl: true,
    description: "Slow, melancholic, deep reverb. For insomniacs.",
  },
  {
    id: "city-morning",
    label: "City Morning",
    emoji: "🏙️",
    bpm: 82,
    swing: 0.2,
    key: "G",
    mode: "major",
    progressionStyle: "one-four",
    reverbDecay: 1.8,
    crusherBits: 12,
    filterHz: 10000,
    vinyl: false,
    description: "Brighter, crisper, upbeat. Coffee and commute.",
  },
];

export const DEFAULT_PRESET_ID = "rainy-day";

export function getPreset(id: string): StudioPreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]!;
}
