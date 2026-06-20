/**
 * store.ts
 * Zustand v5 store for global studio state.
 * The audio engine (LofiEngine) is the source of truth for playback;
 * this store is the source of truth for UI and serializable song state.
 */

import { create } from "zustand";
import type { StepGrid } from "./engine/engine";
import type { ChordVoicing, Mode } from "./engine/theory";
import type { ProgressionStyle } from "./engine/presets";
import { DEFAULT_PRESET_ID } from "./engine/presets";

// Re-export for convenience
export type { ProgressionStyle } from "./engine/presets";

export interface SongMeta {
  name: string;
  ticker: string;
  description: string;
  /** base64-encoded cover image */
  coverDataUrl: string | null;
}

export interface StudioState {
  // ── Playback ──────────────────────────────────────────────────────────────
  playing: boolean;
  currentStep: number;
  bpm: number;
  swing: number;

  // ── Music theory ──────────────────────────────────────────────────────────
  key: string;
  mode: Mode;
  progressionStyle: ProgressionStyle;
  progression: ChordVoicing[];

  // ── Step grid ─────────────────────────────────────────────────────────────
  grid: StepGrid;

  // ── Preset ────────────────────────────────────────────────────────────────
  presetId: string;

  // ── Song metadata (for launch) ────────────────────────────────────────────
  meta: SongMeta;

  // ── UI flags ─────────────────────────────────────────────────────────────
  launchDialogOpen: boolean;
  engineReady: boolean;

  // ── Actions ───────────────────────────────────────────────────────────────
  setPlaying: (playing: boolean) => void;
  setCurrentStep: (step: number) => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  setKey: (key: string) => void;
  setMode: (mode: Mode) => void;
  setProgressionStyle: (style: ProgressionStyle) => void;
  setProgression: (chords: ChordVoicing[]) => void;
  setGrid: (grid: Partial<StepGrid>) => void;
  toggleStep: (voice: keyof StepGrid, stepIndex: number) => void;
  setPresetId: (id: string) => void;
  setMeta: (meta: Partial<SongMeta>) => void;
  setLaunchDialogOpen: (open: boolean) => void;
  setEngineReady: (ready: boolean) => void;
}

const EMPTY_GRID: StepGrid = {
  kick:  Array(16).fill(false) as boolean[],
  snare: Array(16).fill(false) as boolean[],
  hat:   Array(16).fill(false) as boolean[],
};

export const useStudioStore = create<StudioState>((set) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  playing: false,
  currentStep: -1,
  bpm: 72,
  swing: 0.3,
  key: "C",
  mode: "major",
  progressionStyle: "lofi-4",
  progression: [],
  grid: EMPTY_GRID,
  presetId: DEFAULT_PRESET_ID,
  meta: {
    name: "",
    ticker: "",
    description: "",
    coverDataUrl: null,
  },
  launchDialogOpen: false,
  engineReady: false,

  // ── Actions ────────────────────────────────────────────────────────────────
  setPlaying: (playing) => set({ playing }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setBpm: (bpm) => set({ bpm }),
  setSwing: (swing) => set({ swing }),
  setKey: (key) => set({ key }),
  setMode: (mode) => set({ mode }),
  setProgressionStyle: (progressionStyle) => set({ progressionStyle }),
  setProgression: (progression) => set({ progression }),
  setGrid: (partial) =>
    set((s) => ({ grid: { ...s.grid, ...partial } })),
  toggleStep: (voice, stepIndex) =>
    set((s) => {
      const row = [...s.grid[voice]];
      row[stepIndex] = !row[stepIndex];
      return { grid: { ...s.grid, [voice]: row } };
    }),
  setPresetId: (presetId) => set({ presetId }),
  setMeta: (partial) =>
    set((s) => ({ meta: { ...s.meta, ...partial } })),
  setLaunchDialogOpen: (launchDialogOpen) => set({ launchDialogOpen }),
  setEngineReady: (engineReady) => set({ engineReady }),
}));
