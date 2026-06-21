"use client";

import { useEffect, useRef } from "react";

/**
 * Audio-reactive hero backdrop. Reads FFT levels from the HeroBeat each frame
 * and paints a warm golden-hour waveform ribbon + drifting embers + a bass
 * bloom. Idles gently when there's no audio; falls back to a static wash under
 * prefers-reduced-motion.
 */
type Ember = { x: number; y: number; vy: number; r: number; a: number; life: number };

export function HeroCanvas({
  getLevels,
  active,
}: {
  getLevels: () => Float32Array | undefined;
  active: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let W = 0;
    let H = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drawStatic = () => {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, H * 0.8);
      g.addColorStop(0, "rgba(242,182,107,0.20)");
      g.addColorStop(0.5, "rgba(224,143,176,0.10)");
      g.addColorStop(1, "rgba(16,11,20,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    };

    if (reduce) {
      drawStatic();
      return () => ro.disconnect();
    }

    const embers: Ember[] = [];
    const spawn = (energy: number) => {
      if (embers.length > 38) return;
      if (Math.random() > 0.25 + energy * 0.55) return;
      embers.push({
        x: Math.random() * W,
        y: H * (0.7 + Math.random() * 0.3),
        vy: 0.2 + Math.random() * 0.8 + energy * 1.2,
        r: 0.6 + Math.random() * 1.8,
        a: 0,
        life: 0,
      });
    };

    let raf = 0;
    let t = 0;

    const frame = () => {
      t += 1;
      const levels = getLevels();
      const bins = levels?.length ?? 0;

      // normalize fft dB (~-100..0) → 0..1
      const norm = (i: number) => {
        if (!levels || i >= bins) return 0;
        return Math.max(0, Math.min(1, (levels[i]! + 100) / 100));
      };
      let energy = 0;
      for (let i = 0; i < bins; i++) energy += norm(i);
      energy = bins ? energy / bins : 0;
      const bass = (norm(1) + norm(2) + norm(3)) / 3;
      const live = activeRef.current ? 1 : 0.18;

      // trail-fade for a soft, smeary lofi feel
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(16,11,20,0.22)";
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = "lighter";

      // bass bloom
      const bloomA = 0.10 + bass * 0.5 * live;
      const bg = ctx.createRadialGradient(W / 2, H * 0.6, 0, W / 2, H * 0.6, H * (0.55 + bass * 0.25));
      bg.addColorStop(0, `rgba(242,182,107,${bloomA})`);
      bg.addColorStop(0.55, `rgba(224,143,176,${bloomA * 0.5})`);
      bg.addColorStop(1, "rgba(107,74,179,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // waveform ribbons (two layers for depth)
      const cy = H * 0.6;
      const drawRibbon = (amp: number, width: number, alpha: number, phase: number) => {
        ctx.beginPath();
        const N = 60;
        for (let i = 0; i <= N; i++) {
          const p = i / N;
          const x = p * W;
          const lvl = norm(Math.floor(p * bins));
          const idle = Math.sin(p * 7 + t * 0.02 + phase) * 8;
          const y = cy + idle + Math.sin(p * 3.2 + t * 0.04 + phase) * (10 + (lvl * amp + energy * amp * 0.5) * live);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, `rgba(247,198,167,${alpha})`);
        grad.addColorStop(0.5, `rgba(224,143,176,${alpha})`);
        grad.addColorStop(1, `rgba(144,117,216,${alpha})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.shadowColor = "rgba(242,182,107,0.5)";
        ctx.shadowBlur = 16 * live;
        ctx.stroke();
        ctx.shadowBlur = 0;
      };
      drawRibbon(120, 3, 0.55 * (0.5 + live), 0);
      drawRibbon(70, 1.5, 0.3 * (0.5 + live), 2.2);

      // embers
      spawn(energy * live);
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]!;
        e.life += 1;
        e.y -= e.vy;
        e.x += Math.sin((e.life + i) * 0.05) * 0.3;
        e.a = Math.min(1, e.a + 0.04);
        if (e.y < H * 0.2 || e.life > 220) {
          e.a -= 0.03;
          if (e.a <= 0) {
            embers.splice(i, 1);
            continue;
          }
        }
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(242,182,107,${e.a * 0.7})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [getLevels]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ display: "block" }}
    />
  );
}
