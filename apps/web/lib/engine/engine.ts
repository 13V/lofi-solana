/**
 * engine.ts
 * LofiEngine — the core audio synthesis engine.
 *
 * Instruments:
 *   • Drums   — Tone.Players fed /samples/{kick,snare,hat}.wav
 *               (add CC0 samples; see public/samples/README.md)
 *   • Chords  — Tone.PolySynth<Tone.FMSynth> (Rhodes-style FM warmth)
 *   • Bass    — Tone.MonoSynth (simple fingered bass)
 *
 * Everything routes through buildLofiChain().
 * Steps are driven via three Tone.Sequence instances (one per drum voice)
 * plus chord/bass sequences locked to progression bars.
 */

import * as Tone from "tone";
import audioBufferToWav from "audiobuffer-to-wav";
import { buildLofiChain, type LofiChain } from "./lofiChain";
import {
  randomDrumPattern,
  generateProgression,
  bassNoteForChord,
  type DrumPattern,
  type ChordVoicing,
} from "./theory";
import { getPreset, type StudioPreset } from "./presets";

// ── Drum sample paths ────────────────────────────────────────────────────────
// TODO: Replace placeholder URLs with actual CC0 .wav files in /public/samples/
// See public/samples/README.md for required filenames and licensing guidance.
const DRUM_URLS: Record<string, string> = {
  kick:  "/samples/kick.wav",
  snare: "/samples/snare.wav",
  hat:   "/samples/hat.wav",
};

// ── Grid type ────────────────────────────────────────────────────────────────
export interface StepGrid {
  kick:  boolean[];  // 16 steps
  snare: boolean[];
  hat:   boolean[];
}

// ── Engine state ─────────────────────────────────────────────────────────────
export interface EngineState {
  playing: boolean;
  currentStep: number;
  bpm: number;
  swing: number;
  key: string;
  grid: StepGrid;
  progression: ChordVoicing[];
}

type StepListener = (step: number) => void;

// ── LofiEngine ───────────────────────────────────────────────────────────────
export class LofiEngine {
  private initialized = false;
  private chain: LofiChain | null = null;

  // Instruments
  private drumPlayers: Tone.Players | null = null;
  private chordSynth: Tone.PolySynth | null = null;
  private bassSynth: Tone.MonoSynth | null = null;

  // Sequencers
  private drumSequences: Tone.Sequence<number>[] = [];
  private chordSequence: Tone.Sequence<number> | null = null;

  // State
  private grid: StepGrid = {
    kick:  Array(16).fill(false) as boolean[],
    snare: Array(16).fill(false) as boolean[],
    hat:   Array(16).fill(false) as boolean[],
  };
  private progression: ChordVoicing[] = [];
  private _bpm = 72;
  private _swing = 0.3;
  private _key = "C";
  private _currentStep = 0;
  private _playing = false;

  // Listeners for UI step highlight
  private stepListeners: Set<StepListener> = new Set();

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Must be called inside a user-gesture handler (click/keypress).
   * Starts Tone.js context, builds chain, loads samples.
   */
  async init(presetId = "rainy-day"): Promise<void> {
    if (this.initialized) return;

    // Resume AudioContext — must be from a user gesture
    await Tone.start();

    const preset = getPreset(presetId);
    this._bpm = preset.bpm;
    this._swing = preset.swing;
    this._key = preset.key;

    // Apply transport settings
    const transport = Tone.getTransport();
    transport.bpm.value = this._bpm;
    transport.swing = this._swing;
    transport.swingSubdivision = "16n";

    // Build effects chain
    this.chain = await buildLofiChain(preset.vinyl);

    // ── Drums (sampler via Players) ────────────────────────────────────────
    this.drumPlayers = new Tone.Players({
      urls: DRUM_URLS,
      // Samples will 404 gracefully if files missing — audio will just be silent
    });
    this.drumPlayers.connect(this.chain.saturator);

    // ── Chords (PolySynth<FMSynth> — FM gives that Rhodes warmth) ──────────
    this.chordSynth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.01,
      modulationIndex: 14,
      oscillator: { type: "sine" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 1.6 },
      modulation: { type: "triangle" },
      modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.8 },
      volume: -12,
    });
    this.chordSynth.connect(this.chain.saturator);

    // ── Bass (MonoSynth — square → warm sub) ───────────────────────────────
    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: "square" },
      filter: { Q: 1, type: "lowpass", rolloff: -24 },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.6 },
      filterEnvelope: {
        attack: 0.02,
        decay: 0.3,
        sustain: 0.4,
        release: 0.6,
        baseFrequency: 200,
        octaves: 2,
      },
      volume: -10,
    });
    this.bassSynth.connect(this.chain.saturator);

    // Kick off with default progression + random pattern
    this.progression = generateProgression(this._key, preset.progressionStyle);
    const pat = randomDrumPattern();
    this.grid = {
      kick:  Array.from({ length: 16 }, (_, i) => pat.kick.includes(i)),
      snare: Array.from({ length: 16 }, (_, i) => pat.snare.includes(i)),
      hat:   Array.from({ length: 16 }, (_, i) => pat.hat.includes(i)),
    };

    this._buildSequences();
    this.initialized = true;
  }

  // ── Playback ───────────────────────────────────────────────────────────────

  play(): void {
    if (!this.initialized) return;
    this.chain?.vinylPlayer?.start();
    Tone.getTransport().start();
    this._playing = true;
  }

  stop(): void {
    if (!this.initialized) return;
    Tone.getTransport().stop();
    this.chordSynth?.releaseAll();
    this.chain?.vinylPlayer?.stop();
    this._playing = false;
    this._currentStep = 0;
    this._notifyStep(-1);
  }

  get playing(): boolean {
    return this._playing;
  }

  get bpm(): number {
    return this._bpm;
  }

  setBpm(value: number): void {
    this._bpm = Math.max(40, Math.min(160, value));
    if (this.initialized) Tone.getTransport().bpm.value = this._bpm;
  }

  get swing(): number {
    return this._swing;
  }

  setSwing(value: number): void {
    this._swing = Math.max(0, Math.min(1, value));
    if (this.initialized) Tone.getTransport().swing = this._swing;
  }

  // ── Pattern ────────────────────────────────────────────────────────────────

  setPattern(grid: Partial<StepGrid>): void {
    this.grid = {
      kick:  grid.kick  ?? this.grid.kick,
      snare: grid.snare ?? this.grid.snare,
      hat:   grid.hat   ?? this.grid.hat,
    };
    if (this.initialized) {
      this._disposeSequences();
      this._buildSequences();
    }
  }

  getGrid(): StepGrid {
    return this.grid;
  }

  // ── Progression ────────────────────────────────────────────────────────────

  setProgression(chords: ChordVoicing[]): void {
    this.progression = chords;
    if (this.initialized) {
      this._disposeSequences();
      this._buildSequences();
    }
  }

  getProgression(): ChordVoicing[] {
    return this.progression;
  }

  setKey(key: string): void {
    this._key = key;
  }

  // ── Randomize ──────────────────────────────────────────────────────────────

  randomize(): void {
    const pat = randomDrumPattern();
    const newGrid: StepGrid = {
      kick:  Array.from({ length: 16 }, (_, i) => pat.kick.includes(i)),
      snare: Array.from({ length: 16 }, (_, i) => pat.snare.includes(i)),
      hat:   Array.from({ length: 16 }, (_, i) => pat.hat.includes(i)),
    };
    // Random progression style
    const styles = ["ii-V-I", "lofi-4", "minor-dream", "one-four"] as const;
    const style = styles[Math.floor(Math.random() * styles.length)]!;
    const newProg = generateProgression(this._key, style);

    this.setPattern(newGrid);
    this.setProgression(newProg);
  }

  // ── Render to WAV ─────────────────────────────────────────────────────────

  /**
   * Render `seconds` of audio offline and return a WAV Blob.
   * The offline context clones the current pattern + progression.
   * NOTE: Tone.Offline returns ToneAudioBuffer; call .get() for native AudioBuffer.
   */
  async renderToWavBlob(seconds = 8): Promise<Blob> {
    const { grid, progression, _bpm, _swing } = this;

    const toneBuffer = await Tone.Offline(({ transport }) => {
      transport.bpm.value = _bpm;
      transport.swing = _swing;
      transport.swingSubdivision = "16n";
      transport.loop = false;

      // Minimal offline chain (no reverb ready issue in offline context —
      // skip vinyl/complex async effects; keep saturation + lpf)
      const sat = new Tone.Chebyshev(20).toDestination();
      const lpf = new Tone.Filter({ frequency: 8000, type: "lowpass", rolloff: -24 });
      lpf.connect(sat);

      const offlineDrums = new Tone.Players({ urls: DRUM_URLS });
      offlineDrums.connect(lpf);

      const offlineChords = new Tone.PolySynth(Tone.FMSynth, { volume: -14 });
      offlineChords.connect(lpf);

      const offlineBass = new Tone.MonoSynth({ volume: -10 });
      offlineBass.connect(lpf);

      const voices = ["kick", "snare", "hat"] as const;
      voices.forEach((voice) => {
        const steps = grid[voice];
        const seq = new Tone.Sequence<number>(
          (time, step) => {
            if (steps[step] && offlineDrums.has(voice)) {
              offlineDrums.player(voice).start(time);
            }
          },
          Array.from({ length: 16 }, (_, i) => i),
          "16n"
        );
        seq.start(0);
      });

      if (progression.length > 0) {
        const stepsPerChord = 16;
        const chordSeq = new Tone.Sequence<number>(
          (time, barStep) => {
            const chordIdx = Math.floor(barStep / stepsPerChord) % progression.length;
            const beat = barStep % 4;
            const chord = progression[chordIdx];
            if (chord && beat === 0) {
              offlineChords.triggerAttackRelease(chord.notes, "2n", time, 0.55);
              offlineBass.triggerAttackRelease(
                bassNoteForChord(chord),
                "4n",
                time,
                0.7
              );
            }
          },
          Array.from({ length: progression.length * stepsPerChord }, (_, i) => i),
          "16n"
        );
        chordSeq.start(0);
      }

      transport.start(0);
    }, seconds);

    // toneBuffer.get() → native AudioBuffer (v15 API)
    const nativeBuffer = toneBuffer.get();
    if (!nativeBuffer) throw new Error("Offline render returned no audio buffer");

    const wav = audioBufferToWav(nativeBuffer);
    return new Blob([wav], { type: "audio/wav" });
  }

  // ── Step highlight subscription ────────────────────────────────────────────

  onStep(fn: StepListener): () => void {
    this.stepListeners.add(fn);
    return () => this.stepListeners.delete(fn);
  }

  private _notifyStep(step: number) {
    this._currentStep = step;
    this.stepListeners.forEach((fn) => fn(step));
  }

  // ── Apply preset ───────────────────────────────────────────────────────────

  async applyPreset(presetId: string): Promise<void> {
    const preset: StudioPreset = getPreset(presetId);
    this._bpm = preset.bpm;
    this._swing = preset.swing;
    this._key = preset.key;

    if (this.initialized) {
      const transport = Tone.getTransport();
      transport.bpm.value = this._bpm;
      transport.swing = this._swing;
    }

    const newProg = generateProgression(preset.key, preset.progressionStyle);
    const pat = randomDrumPattern();
    const newGrid: StepGrid = {
      kick:  Array.from({ length: 16 }, (_, i) => pat.kick.includes(i)),
      snare: Array.from({ length: 16 }, (_, i) => pat.snare.includes(i)),
      hat:   Array.from({ length: 16 }, (_, i) => pat.hat.includes(i)),
    };

    this.setPattern(newGrid);
    this.setProgression(newProg);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _buildSequences(): void {
    const { grid, progression } = this;

    // Drum sequences — one per voice
    const voices = ["kick", "snare", "hat"] as const;
    voices.forEach((voice) => {
      const steps = grid[voice];
      const seq = new Tone.Sequence<number>(
        (time, step) => {
          this._notifyStep(step);
          if (steps[step]) {
            if (this.drumPlayers?.has(voice)) {
              this.drumPlayers.player(voice).start(time);
            }
          }
        },
        Array.from({ length: 16 }, (_, i) => i),
        "16n"
      );
      seq.start(0);
      this.drumSequences.push(seq);
    });

    // Chord + bass sequence — changes on bar boundaries
    if (progression.length > 0) {
      // 16 steps per chord bar × n chords total
      const totalSteps = progression.length * 16;
      let lastChordIdx = -1;

      this.chordSequence = new Tone.Sequence<number>(
        (time, barStep) => {
          const chordIdx = Math.floor(barStep / 16) % progression.length;
          const beat = barStep % 4; // trigger chord on beats 1 and 3

          if (chordIdx !== lastChordIdx || beat === 0) {
            lastChordIdx = chordIdx;
            const chord = progression[chordIdx];
            if (!chord) return;

            // Chord on beat 1 of each bar
            if (beat === 0) {
              this.chordSynth?.triggerAttackRelease(
                chord.notes,
                "2n",
                time,
                0.55
              );
              this.bassSynth?.triggerAttackRelease(
                bassNoteForChord(chord),
                "4n",
                time,
                0.7
              );
            }
          }
        },
        Array.from({ length: totalSteps }, (_, i) => i),
        "16n"
      );
      this.chordSequence.start(0);
    }

    // Loop the transport over the progression
    const transport = Tone.getTransport();
    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = `${progression.length}m`;
  }

  private _disposeSequences(): void {
    this.drumSequences.forEach((s) => s.dispose());
    this.drumSequences = [];
    this.chordSequence?.dispose();
    this.chordSequence = null;
  }

  dispose(): void {
    this.stop();
    this._disposeSequences();
    this.drumPlayers?.dispose();
    this.chordSynth?.dispose();
    this.bassSynth?.dispose();
    this.chain?.dispose();
    this.initialized = false;
  }
}

// Singleton — one engine per browser tab
let _engine: LofiEngine | null = null;

export function getEngine(): LofiEngine {
  _engine ??= new LofiEngine();
  return _engine;
}
