/**
 * useListenHeartbeat.ts
 * Hook that fires listen heartbeats to /api/listens every HEARTBEAT_INTERVAL ms.
 *
 * Qualified-listen rules (enforced client-side; server validates too):
 *   • Must have listened ≥ QUALIFY_SECONDS cumulative in this session
 *   • Current position must be ≥ 50% of total track duration
 *   • Deduplication: one qualified listen per (trackId, sessionToken) per epoch
 */

import { useEffect, useRef, useCallback } from "react";

const HEARTBEAT_INTERVAL_MS = 10_000; // 10 s
const QUALIFY_SECONDS = 30;

interface HeartbeatPayload {
  trackId: string;
  positionSeconds: number;
  durationSeconds: number;
  sessionToken: string;
}

interface HeartbeatResult {
  qualified: boolean;
}

/** Generate a random session token (client-side; HMAC stub on server) */
function makeSessionToken(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Call in any player component that wants to credit the user's listen.
 * @param trackId   - on-chain song-coin mint address or slug
 * @param getPosition - callback returning current playback position (seconds)
 * @param duration  - total track duration (seconds); 0 to disable
 * @param isPlaying - whether audio is currently playing
 */
export function useListenHeartbeat(
  trackId: string,
  getPosition: () => number,
  duration: number,
  isPlaying: boolean
): { qualified: boolean } {
  const sessionTokenRef = useRef<string>(makeSessionToken());
  const cumulativeRef   = useRef<number>(0);
  const lastTickRef     = useRef<number>(Date.now());
  const qualifiedRef    = useRef<boolean>(false);
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendHeartbeat = useCallback(async () => {
    if (!isPlaying || duration <= 0) return;

    const position = getPosition();
    const now = Date.now();
    const elapsed = (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;

    // Accumulate only when actually playing
    cumulativeRef.current += elapsed;

    const meetsTime     = cumulativeRef.current >= QUALIFY_SECONDS;
    const meetsPosition = duration > 0 && position / duration >= 0.5;

    const payload: HeartbeatPayload = {
      trackId,
      positionSeconds: Math.floor(position),
      durationSeconds: Math.floor(duration),
      sessionToken: sessionTokenRef.current,
    };

    try {
      const res = await fetch("/api/listens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as HeartbeatResult;
        // A listen is "qualified" only when both client + server agree
        if (data.qualified && meetsTime && meetsPosition) {
          qualifiedRef.current = true;
        }
      }
    } catch {
      // Network error — non-fatal, just skip this beat
    }
  }, [trackId, getPosition, duration, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    lastTickRef.current = Date.now();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, sendHeartbeat]);

  // Reset on track change
  useEffect(() => {
    cumulativeRef.current = 0;
    qualifiedRef.current  = false;
    sessionTokenRef.current = makeSessionToken();
  }, [trackId]);

  return { qualified: qualifiedRef.current };
}
