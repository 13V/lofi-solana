"use client";

import { useStudioStore } from "@/lib/store";
import { getEngine } from "@/lib/engine/engine";
import { PRESETS } from "@/lib/engine/presets";

interface TransportProps {
  onInitEngine: () => Promise<void>;
}

export function Transport({ onInitEngine }: TransportProps) {
  const {
    playing,
    bpm,
    swing,
    presetId,
    engineReady,
    setBpm,
    setSwing,
    setPresetId,
    setPlaying,
  } = useStudioStore();

  const handlePlayStop = async () => {
    if (!engineReady) {
      // First click initializes the audio context (user gesture requirement)
      await onInitEngine();
    }

    const engine = getEngine();
    if (playing) {
      engine.stop();
      setPlaying(false);
    } else {
      engine.play();
      setPlaying(true);
    }
  };

  const handleBpmChange = (value: number) => {
    setBpm(value);
    getEngine().setBpm(value);
  };

  const handleSwingChange = (value: number) => {
    setSwing(value);
    getEngine().setSwing(value);
  };

  const handleRandomize = () => {
    const engine = getEngine();
    engine.randomize();
    // Sync updated pattern + progression back to store
    const store = useStudioStore.getState();
    store.setGrid(engine.getGrid());
    store.setProgression(engine.getProgression());
  };

  const handlePreset = async (id: string) => {
    setPresetId(id);
    const engine = getEngine();
    if (engineReady) {
      await engine.applyPreset(id);
      const store = useStudioStore.getState();
      store.setGrid(engine.getGrid());
      store.setProgression(engine.getProgression());
      store.setBpm(engine.bpm);
      store.setSwing(engine.swing);
    }
  };

  const handleExport = async () => {
    try {
      const engine = getEngine();
      const blob = await engine.renderToWavBlob(16);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lofi-track.wav";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  return (
    <div
      className="rounded-2xl p-5 border flex flex-col gap-4"
      style={{
        backgroundColor: "var(--surface-1)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <h3
        className="text-xs font-mono uppercase tracking-widest"
        style={{ color: "var(--text-muted)" }}
      >
        Transport
      </h3>

      {/* Play / Stop */}
      <button
        onClick={handlePlayStop}
        className="w-full py-3 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-95"
        style={{
          backgroundColor: playing ? "var(--red)" : "var(--accent)",
          color: "var(--background)",
          boxShadow: playing ? "none" : "0 0 20px var(--accent-glow)",
        }}
      >
        {!engineReady
          ? "▶ Start"
          : playing
          ? "■ Stop"
          : "▶ Play"}
      </button>

      {/* BPM */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span
            className="text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            BPM
          </span>
          <span
            className="text-sm font-mono font-bold"
            style={{ color: "var(--accent)" }}
          >
            {bpm}
          </span>
        </div>
        <input
          type="range"
          min={40}
          max={160}
          value={bpm}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent) ${((bpm - 40) / 120) * 100}%, var(--surface-3) 0%)`,
          }}
        />
        <div
          className="flex justify-between text-xs mt-1 font-mono"
          style={{ color: "var(--text-muted)" }}
        >
          <span>40</span>
          <span>160</span>
        </div>
      </div>

      {/* Swing */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span
            className="text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            Swing
          </span>
          <span
            className="text-sm font-mono font-bold"
            style={{ color: "var(--accent)" }}
          >
            {Math.round(swing * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(swing * 100)}
          onChange={(e) => handleSwingChange(Number(e.target.value) / 100)}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--blue) ${swing * 100}%, var(--surface-3) 0%)`,
          }}
        />
      </div>

      {/* Preset picker */}
      <div>
        <span
          className="block text-xs mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          Preset
        </span>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePreset(p.id)}
              title={p.description}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all text-left"
              style={{
                backgroundColor:
                  p.id === presetId ? "var(--accent-glow)" : "var(--surface-2)",
                color:
                  p.id === presetId ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${p.id === presetId ? "var(--accent-dim)" : "transparent"}`,
              }}
            >
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Utility buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleRandomize}
          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
          style={{
            backgroundColor: "var(--surface-2)",
            color: "var(--text-secondary)",
          }}
        >
          🎲 Randomize
        </button>
        <button
          onClick={handleExport}
          disabled={!engineReady}
          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
          style={{
            backgroundColor: "var(--surface-2)",
            color: "var(--text-secondary)",
          }}
        >
          ⬇ Export WAV
        </button>
      </div>
    </div>
  );
}
