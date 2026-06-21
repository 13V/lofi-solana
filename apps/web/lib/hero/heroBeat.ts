/**
 * HeroBeat — a tiny, self-contained lofi beat for the landing hero.
 *
 * Unlike the full studio engine, this synthesizes its drums (no sample files),
 * so "tap a pad → hear it" works the instant the page loads. It also exposes an
 * FFT analyser so the hero canvas can react to the actual audio.
 *
 * Must be created/started from a user gesture (browser autoplay policy).
 */
import * as Tone from "tone";

export const HERO_STEPS = 8;
export type HeroVoice = "hat" | "key" | "kick";
export const HERO_VOICES: HeroVoice[] = ["hat", "key", "kick"];

type StepCb = (step: number) => void;

// Two warm voicings the keys alternate between each bar (Fmaj9 → Dm9-ish).
const CHORD_A = ["F3", "A3", "C4", "E4", "G4"];
const CHORD_B = ["D3", "F3", "A3", "C4", "E4"];

export class HeroBeat {
  initialized = false;
  private _playing = false;
  private bar = 0;

  private out: Tone.Gain | null = null;
  private analyser: Tone.Analyser | null = null;
  private kick: Tone.MembraneSynth | null = null;
  private hat: Tone.NoiseSynth | null = null;
  private keys: Tone.PolySynth | null = null;
  private seq: Tone.Sequence<number> | null = null;

  private grid: Record<HeroVoice, boolean[]> = {
    hat: [true, false, true, false, true, false, true, false],
    key: [true, false, false, false, true, false, false, false],
    kick: [true, false, false, false, true, false, false, false],
  };

  private stepCbs = new Set<StepCb>();

  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();

    const t = Tone.getTransport();
    t.bpm.value = 78;
    t.swing = 0.2;
    t.swingSubdivision = "8n";

    // ── Master bus: bitcrush → lowpass → reverb → out (+ analyser tap) ──
    const crush = new Tone.BitCrusher(8);
    const lpf = new Tone.Filter({ frequency: 7200, type: "lowpass", rolloff: -24 });
    const reverb = new Tone.Reverb({ decay: 2.4, wet: 0.2 });
    await reverb.ready;
    this.out = new Tone.Gain(0.9);
    this.analyser = new Tone.Analyser("fft", 64);

    crush.connect(lpf);
    lpf.connect(reverb);
    reverb.connect(this.out);
    this.out.toDestination();
    this.out.connect(this.analyser); // tap for the visualizer

    // ── Voices ──
    this.kick = new Tone.MembraneSynth({
      octaves: 6,
      pitchDecay: 0.05,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
      volume: -3,
    }).connect(crush);

    const hatHpf = new Tone.Filter({ frequency: 7000, type: "highpass" }).connect(crush);
    this.hat = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
      volume: -20,
    }).connect(hatHpf);

    this.keys = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.01,
      modulationIndex: 12,
      oscillator: { type: "sine" },
      envelope: { attack: 0.04, decay: 0.3, sustain: 0.45, release: 1.6 },
      modulation: { type: "triangle" },
      volume: -13,
    }).connect(crush);

    this.seq = new Tone.Sequence<number>(
      (time, step) => {
        Tone.getDraw().schedule(() => this.notify(step), time);
        if (this.grid.hat[step]) this.hat?.triggerAttackRelease("16n", time, 0.5);
        if (this.grid.kick[step]) this.kick?.triggerAttackRelease("C1", "8n", time);
        if (this.grid.key[step]) {
          const chord = this.bar % 2 === 0 ? CHORD_A : CHORD_B;
          this.keys?.triggerAttackRelease(chord, "2n", time, 0.5);
        }
        if (step === HERO_STEPS - 1) this.bar++;
      },
      Array.from({ length: HERO_STEPS }, (_, i) => i),
      "8n"
    );
    this.seq.start(0);

    this.initialized = true;
  }

  play(): void {
    if (!this.initialized) return;
    Tone.getTransport().start();
    this._playing = true;
  }

  stop(): void {
    if (!this.initialized) return;
    Tone.getTransport().stop();
    this.keys?.releaseAll();
    this._playing = false;
    this.notify(-1);
  }

  toggle(): void {
    this._playing ? this.stop() : this.play();
  }

  get playing(): boolean {
    return this._playing;
  }

  toggleStep(voice: HeroVoice, i: number): boolean {
    const row = this.grid[voice];
    row[i] = !row[i];
    if (row[i]) this.hit(voice); // instant tactile feedback
    return row[i];
  }

  /** Trigger a voice immediately (tap feedback), independent of the transport. */
  hit(voice: HeroVoice): void {
    if (!this.initialized) return;
    const now = Tone.now();
    if (voice === "hat") this.hat?.triggerAttackRelease("16n", now, 0.5);
    else if (voice === "kick") this.kick?.triggerAttackRelease("C1", "8n", now);
    else this.keys?.triggerAttackRelease(this.bar % 2 === 0 ? CHORD_A : CHORD_B, "2n", now, 0.5);
  }

  getGrid(): Record<HeroVoice, boolean[]> {
    return this.grid;
  }

  /** FFT magnitudes (dB, ~-100..0). Returns undefined before init. */
  getLevels(): Float32Array | undefined {
    return this.analyser?.getValue() as Float32Array | undefined;
  }

  onStep(cb: StepCb): () => void {
    this.stepCbs.add(cb);
    return () => this.stepCbs.delete(cb);
  }

  private notify(step: number): void {
    this.stepCbs.forEach((cb) => cb(step));
  }

  dispose(): void {
    this.stop();
    this.seq?.dispose();
    this.kick?.dispose();
    this.hat?.dispose();
    this.keys?.dispose();
    this.analyser?.dispose();
    this.out?.dispose();
    this.initialized = false;
  }
}

let _hero: HeroBeat | null = null;
export function getHeroBeat(): HeroBeat {
  _hero ??= new HeroBeat();
  return _hero;
}
