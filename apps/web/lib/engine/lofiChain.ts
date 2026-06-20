/**
 * lofiChain.ts
 * Builds the master lo-fi effects chain that everything routes through.
 *
 * Signal path:
 *   input → Chebyshev (tape saturation) → BitCrusher → LPF → Vibrato (wow/flutter)
 *        → Chorus (ensemble warmth) → Reverb → destination
 *
 * Optional: a vinyl-crackle Player loops at low volume under everything.
 */

import * as Tone from "tone";

export interface LofiChain {
  /** Connect a Tone node's output into this chain */
  input: Tone.ToneAudioNode;
  saturator: Tone.Chebyshev;
  crusher: Tone.BitCrusher;
  lpf: Tone.Filter;
  vibrato: Tone.Vibrato;
  chorus: Tone.Chorus;
  reverb: Tone.Reverb;
  /** Optional vinyl crackle player (needs /samples/vinyl.mp3) */
  vinylPlayer: Tone.Player | null;
  dispose(): void;
}

/**
 * Build and connect the lofi chain, resolving all async nodes.
 * Call `chain.input.connect(chain.saturator)` is already done internally —
 * you just do `yourInstrument.connect(chain.saturator)` (or `chain.input`).
 */
export async function buildLofiChain(
  enableVinyl = false
): Promise<LofiChain> {
  // ── Saturation: warm tape-like harmonic distortion ──────────────────────
  const saturator = new Tone.Chebyshev(20); // order 20 → rich harmonic spread

  // ── Bit-crusher: lo-fi digital grit (10 bits keeps it musical) ──────────
  const crusher = new Tone.BitCrusher(10);

  // ── Low-pass filter: cuts the harsh digital highs (≈ recording through
  //    a worn tape deck) ────────────────────────────────────────────────────
  const lpf = new Tone.Filter({
    frequency: 8000,
    type: "lowpass",
    rolloff: -24,
  });

  // ── Vibrato: tape wow / flutter (very subtle) ────────────────────────────
  const vibrato = new Tone.Vibrato({ frequency: 4, depth: 0.08 });

  // ── Chorus: slight detuning gives that warbly cassette ensemble feel ─────
  const chorus = new Tone.Chorus({ frequency: 0.6, delayTime: 4, depth: 0.3 });
  chorus.start(); // Chorus LFO must be started explicitly

  // ── Reverb: small room / spring feel, not too wet ───────────────────────
  const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.22 });
  await reverb.ready; // Reverb generates impulse response asynchronously

  // ── Wire the chain ───────────────────────────────────────────────────────
  // saturator → crusher → lpf → vibrato → chorus → reverb → destination
  saturator.connect(crusher);
  crusher.connect(lpf);
  lpf.connect(vibrato);
  vibrato.connect(chorus);
  chorus.connect(reverb);
  reverb.toDestination();

  // ── Vinyl crackle (optional) ─────────────────────────────────────────────
  let vinylPlayer: Tone.Player | null = null;
  if (enableVinyl) {
    try {
      vinylPlayer = new Tone.Player({
        url: "/samples/vinyl.mp3",
        loop: true,
        autostart: false,
      }).toDestination();
      vinylPlayer.volume.value = -28; // very quiet underneath
    } catch {
      // Sample file not found — skip silently
      vinylPlayer = null;
    }
  }

  function dispose() {
    saturator.dispose();
    crusher.dispose();
    lpf.dispose();
    vibrato.dispose();
    chorus.dispose();
    reverb.dispose();
    vinylPlayer?.dispose();
  }

  return {
    input: saturator, // callers connect their outputs to this
    saturator,
    crusher,
    lpf,
    vibrato,
    chorus,
    reverb,
    vinylPlayer,
    dispose,
  };
}
