"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useListenHeartbeat } from "@/lib/listen/useListenHeartbeat";

interface PlayerProps {
  trackId: string;
  /** URL to an audio file (WAV, MP3, etc.) */
  audioUrl: string;
  /** Track title for display */
  title: string;
  creator: string;
}

export function Player({ trackId, audioUrl, title, creator }: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  // Qualified listen tracking
  const getPos = useCallback(() => audioRef.current?.currentTime ?? 0, []);
  const { qualified } = useListenHeartbeat(trackId, getPos, duration, playing);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime    = () => setPosition(el.currentTime);
    const onLoad    = () => setDuration(el.duration || 0);
    const onEnded   = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoad);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoad);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      await el.play();
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const t = (Number(e.target.value) / 100) * duration;
    el.currentTime = t;
    setPosition(t);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progressPct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-4"
      style={{
        backgroundColor: "var(--surface-1)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Track info */}
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: "var(--surface-2)" }}
          aria-hidden
        >
          📼
        </div>
        <div className="min-w-0">
          <p
            className="font-bold text-sm truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {creator}
          </p>
        </div>
        {qualified && (
          <span
            className="ml-auto text-xs rounded-full px-2 py-0.5 flex-shrink-0"
            style={{
              backgroundColor: "rgba(95,184,122,0.15)",
              color: "var(--green)",
              border: "1px solid rgba(95,184,122,0.3)",
            }}
            title="Qualified listen — your play counts toward creator earnings"
          >
            ✓ Qualified
          </span>
        )}
      </div>

      {/* Waveform placeholder */}
      <div
        className="h-12 rounded-lg overflow-hidden relative"
        style={{ backgroundColor: "var(--surface-2)" }}
        aria-hidden
      >
        {/* Fake waveform bars */}
        <div className="absolute inset-0 flex items-center gap-px px-2">
          {Array.from({ length: 60 }, (_, i) => {
            const h = 20 + Math.sin(i * 0.8) * 15 + Math.random() * 20;
            const filled = (i / 60) * 100 <= progressPct;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all"
                style={{
                  height: `${h}%`,
                  backgroundColor: filled
                    ? "var(--accent)"
                    : "var(--surface-3)",
                  opacity: filled ? 0.9 : 0.5,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Scrubber */}
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-mono w-10 text-right flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {fmt(position)}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={progressPct}
          onChange={handleSeek}
          className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent) ${progressPct}%, var(--surface-3) 0%)`,
          }}
          aria-label="Seek"
        />
        <span
          className="text-xs font-mono w-10 flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {fmt(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all hover:scale-105 active:scale-95 flex-shrink-0"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--background)",
          }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>

        {/* Volume */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            🔉
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--text-secondary) ${volume * 100}%, var(--surface-3) 0%)`,
            }}
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
