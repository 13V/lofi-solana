/**
 * theory.ts
 * Music theory helpers using tonal v6.
 *
 * All generated notes are guaranteed in-key via Scale / Key lookups.
 */

import { Key, Chord, Scale, Note } from "tonal";

// ── Types ────────────────────────────────────────────────────────────────────

export type Mode = "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian";

export interface DrumPattern {
  kick: number[]; // active step indices 0–15
  snare: number[];
  hat: number[];
}

export interface ChordVoicing {
  symbol: string; // e.g. "Cmaj7"
  notes: string[]; // e.g. ["C3","E3","G3","B3"]
}

// ── Scale helpers ────────────────────────────────────────────────────────────

/**
 * Return the 7 note names of the given key/mode, no octave.
 * Example: scaleNotes("C", "major") → ["C","D","E","F","G","A","B"]
 */
export function scaleNotes(key: string, mode: Mode = "major"): string[] {
  const scaleName = mode === "minor" ? "natural minor" : mode;
  const s = Scale.get(`${key} ${scaleName}`);
  return s.notes.length > 0 ? s.notes : Scale.get(`${key} major`).notes;
}

/**
 * Octave-stamp a set of note names starting from a given octave.
 * Keeps notes ascending (wraps to next octave when pitch class descends).
 */
function octaveStamp(noteNames: string[], startOctave: number): string[] {
  const result: string[] = [];
  let oct = startOctave;
  let prevMidi = -1;
  for (const n of noteNames) {
    const candidate = `${n}${oct}`;
    const midi = Note.midi(candidate) ?? (prevMidi + 1);
    if (midi <= prevMidi) {
      oct++;
    }
    result.push(`${n}${oct}`);
    prevMidi = Note.midi(`${n}${oct}`) ?? midi;
  }
  return result;
}

// ── Chord voicings ───────────────────────────────────────────────────────────

/**
 * Build a maj7/min9 voicing for a chord symbol at a given octave.
 * All returned notes are pitch-stamped (e.g. ["D3","F3","A3","C4","E4"]).
 */
function voiceChord(symbol: string, octave = 3): ChordVoicing {
  const c = Chord.get(symbol);
  if (!c || c.empty) {
    // Fallback: just return the tonic
    return { symbol, notes: [`${symbol.replace(/[^A-Gb#]/g, "")}${octave}`] };
  }
  const voiced = octaveStamp(c.notes, octave);
  return { symbol, notes: voiced };
}

// ── Progressions ────────────────────────────────────────────────────────────

/**
 * Generate a chord progression for the given key and style.
 *
 * Styles:
 *  "ii-V-I"       → classic jazz ii7–V7–Imaj7 (3 or 4 bar)
 *  "lofi-4"       → 4-chord lofi loop (I–VI–IV–V in maj7/m9 flavour)
 *  "minor-dream"  → i–VI–III–VII in natural minor
 *  "one-four"     → oscillates between Imaj7 and IVmaj7
 */
export function generateProgression(
  key: string,
  style: "ii-V-I" | "lofi-4" | "minor-dream" | "one-four" = "lofi-4"
): ChordVoicing[] {
  const mk = Key.majorKey(key);
  const mk_minor = Key.minorKey(key);

  // Helper: safe scale degree lookup with in-key fallback
  const s = mk.scale;
  const ms = mk_minor.natural.scale;

  switch (style) {
    case "ii-V-I": {
      // chords index: 0=Imaj7, 1=ii7, 4=V7
      const ii  = mk.chords[1]  ?? `${s[1]  ?? "D"}m7`;
      const V   = mk.chords[4]  ?? `${s[4]  ?? "G"}7`;
      const I   = mk.chords[0]  ?? `${key}maj7`;
      return [voiceChord(ii), voiceChord(V), voiceChord(I), voiceChord(I)];
    }
    case "lofi-4": {
      // Imaj7 – VIm9 – IVmaj7 – V7 (classic chill/study lofi)
      const I   = mk.chords[0]  ?? `${key}maj7`;
      const VI  = mk.chords[5]?.replace("7", "9") ?? `${s[5] ?? "A"}m9`;
      const IV  = mk.chords[3]  ?? `${s[3]  ?? "F"}maj7`;
      const V   = mk.chords[4]  ?? `${s[4]  ?? "G"}7`;
      return [voiceChord(I), voiceChord(VI), voiceChord(IV), voiceChord(V)];
    }
    case "minor-dream": {
      // im9 – VImaj7 – IIImaj7 – VIIm7
      const i   = mk_minor.natural.chords[0] ?? `${key}m9`;
      const VI  = mk_minor.natural.chords[5] ?? `${ms[5] ?? "F"}maj7`;
      const III = mk_minor.natural.chords[2] ?? `${ms[2] ?? "C"}maj7`;
      const VII = mk_minor.natural.chords[6] ?? `${ms[6] ?? "G"}m7`;
      return [voiceChord(i), voiceChord(VI), voiceChord(III), voiceChord(VII)];
    }
    case "one-four": {
      const I  = mk.chords[0] ?? `${key}maj7`;
      const IV = mk.chords[3] ?? `${s[3] ?? "F"}maj7`;
      return [voiceChord(I), voiceChord(I), voiceChord(IV), voiceChord(IV)];
    }
    default:
      return [voiceChord(`${key}maj7`)];
  }
}

// ── Bass note helper ─────────────────────────────────────────────────────────

/**
 * Given a chord voicing, return a bass note 1-2 octaves lower.
 * Stays in-key because the root is the chord tonic.
 */
export function bassNoteForChord(voicing: ChordVoicing): string {
  const c = Chord.get(voicing.symbol);
  const tonic = c.tonic ?? voicing.symbol.replace(/[^A-Gb#]/g, "");
  return `${tonic}2`;
}

// ── Drum patterns ────────────────────────────────────────────────────────────

/**
 * Generate a random 16-step drum pattern with lofi-realistic feel.
 * Kick heavy on 1 & 9; snare on 5 & 13; hat every 2 steps with variation.
 */
export function randomDrumPattern(): DrumPattern {
  const steps = 16;

  // Kick: always on 0 & 8, random 2–3 ghost beats
  const kick: number[] = [0, 8];
  const kickExtra = [2, 3, 6, 10, 14];
  kickExtra.forEach((s) => {
    if (Math.random() < 0.3) kick.push(s);
  });

  // Snare: 4 & 12 (backbeat), occasional ghost on adjacent steps
  const snare: number[] = [4, 12];
  [3, 5, 11, 13].forEach((s) => {
    if (Math.random() < 0.2) snare.push(s);
  });

  // Hat: every other 16th with dropout variation
  const hat: number[] = [];
  for (let i = 0; i < steps; i++) {
    const isOnBeat = i % 2 === 0;
    const prob = isOnBeat ? 0.85 : 0.45;
    if (Math.random() < prob) hat.push(i);
  }

  return {
    kick: [...new Set(kick)].sort((a, b) => a - b),
    snare: [...new Set(snare)].sort((a, b) => a - b),
    hat: [...new Set(hat)].sort((a, b) => a - b),
  };
}

/**
 * Convert a pattern row (array of active indices) into a 16-bool array
 * for the step grid UI.
 */
export function patternToGrid(indices: number[]): boolean[] {
  const grid = Array<boolean>(16).fill(false);
  indices.forEach((i) => {
    if (i >= 0 && i < 16) grid[i] = true;
  });
  return grid;
}

/**
 * Convert a 16-bool step-grid back to an array of active indices.
 */
export function gridToPattern(grid: boolean[]): number[] {
  return grid.reduce<number[]>((acc, on, i) => (on ? [...acc, i] : acc), []);
}
