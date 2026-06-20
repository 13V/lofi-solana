/**
 * Browser-side listen reporter.
 *
 * `ListenReporter` manages a lightweight heartbeat loop that fires every
 * ~10 seconds while a track is playing.  Each heartbeat is POSTed to
 * `/api/listens` so the server can accumulate sessions for qualification.
 *
 * Usage:
 * ```ts
 * const reporter = new ListenReporter({
 *   listenerId: wallet.publicKey.toBase58(),
 *   trackId:    mintAddress,
 *   sessionToken: tokenFromServer,   // obtained at play-start
 *   durationSec: track.durationSec,
 *   audioEl: document.querySelector("audio")!,
 * });
 *
 * reporter.start();
 * // ... user presses stop / navigates away:
 * reporter.stop();
 * ```
 *
 * Design decisions:
 *  - Uses setInterval rather than requestAnimationFrame to fire even when
 *    the tab is backgrounded.
 *  - Sends positionSec from audioEl.currentTime for accurate server-side
 *    advancement tracking.
 *  - Retries failed POSTs once (transient network blip) then drops silently
 *    — heartbeats are best-effort; missing one does not void a session.
 *  - `sendBeacon` is used on pagehide / visibilitychange to flush a final
 *    heartbeat without blocking page unload.
 */

import type { ListenHeartbeat } from "../types.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ListenReporterConfig {
  /** Base-58 public key of the listening wallet. */
  listenerId: string;
  /** Base-58 mint address of the track being played. */
  trackId: string;
  /** Session token issued by the server at play-start. */
  sessionToken: string;
  /** Track duration in seconds (used for completion ratio on the server). */
  durationSec: number;
  /**
   * The <audio> element whose `currentTime` is used as the heartbeat position.
   * Must be provided in browser environments.
   */
  audioEl: HTMLAudioElement;
  /**
   * Heartbeat interval in milliseconds.  Default: 10 000 (10 s).
   * Reduce for testing; increase if server rate-limits are a concern.
   */
  intervalMs?: number;
  /**
   * Endpoint that accepts POST heartbeats.  Default: "/api/listens".
   */
  endpoint?: string;
  /**
   * Optional callback for heartbeat failures (for observability / logging).
   */
  onError?: (err: unknown) => void;
}

// ---------------------------------------------------------------------------
// Reporter class
// ---------------------------------------------------------------------------

export class ListenReporter {
  private readonly config: Required<
    Omit<ListenReporterConfig, "onError"> & {
      onError: (err: unknown) => void;
    }
  >;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly unloadHandler: () => void;

  constructor(cfg: ListenReporterConfig) {
    this.config = {
      intervalMs: 10_000,
      endpoint: "/api/listens",
      onError: (err) => console.warn("[ListenReporter] heartbeat failed", err),
      ...cfg,
    };

    // Flush a final heartbeat on page hide (back/forward cache safe).
    this.unloadHandler = () => this.sendBeaconHeartbeat();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /** Start the heartbeat loop. Idempotent — safe to call multiple times. */
  start(): void {
    if (this.intervalId !== null) return;

    this.intervalId = setInterval(
      () => void this.sendHeartbeat(),
      this.config.intervalMs,
    );

    document.addEventListener("visibilitychange", this.unloadHandler);
    window.addEventListener("pagehide", this.unloadHandler);
  }

  /** Stop the heartbeat loop and remove event listeners. */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    document.removeEventListener("visibilitychange", this.unloadHandler);
    window.removeEventListener("pagehide", this.unloadHandler);
  }

  // -------------------------------------------------------------------------
  // Heartbeat construction
  // -------------------------------------------------------------------------

  private buildHeartbeat(): ListenHeartbeat {
    return {
      listenerId: this.config.listenerId,
      trackId: this.config.trackId,
      positionSec: this.config.audioEl.currentTime,
      timestampSec: Math.floor(Date.now() / 1_000),
      sessionToken: this.config.sessionToken,
    };
  }

  // -------------------------------------------------------------------------
  // Send via fetch (with one retry)
  // -------------------------------------------------------------------------

  private async sendHeartbeat(): Promise<void> {
    const hb = this.buildHeartbeat();

    // Skip if the audio element is paused (user paused, buffering, etc.).
    if (this.config.audioEl.paused) return;

    try {
      await this.postHeartbeat(hb);
    } catch (firstErr) {
      // One retry after a brief delay.
      try {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, 500),
        );
        await this.postHeartbeat(hb);
      } catch (retryErr) {
        this.config.onError(retryErr);
      }
    }
  }

  private async postHeartbeat(hb: ListenHeartbeat): Promise<void> {
    const res = await fetch(this.config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hb),
      // keepalive: true lets fetch outlive the page for ~unload scenarios,
      // but size is limited to 64 KB — fine for a single heartbeat JSON.
      keepalive: true,
    });

    if (!res.ok) {
      throw new Error(`POST ${this.config.endpoint} returned ${res.status}`);
    }
  }

  // -------------------------------------------------------------------------
  // Send via sendBeacon (fire-and-forget on page unload)
  // -------------------------------------------------------------------------

  private sendBeaconHeartbeat(): void {
    if (document.visibilityState !== "hidden") return;

    const hb = this.buildHeartbeat();
    const blob = new Blob([JSON.stringify(hb)], {
      type: "application/json",
    });

    // navigator.sendBeacon is best-effort and may fail silently.
    const queued = navigator.sendBeacon(this.config.endpoint, blob);
    if (!queued) {
      this.config.onError(
        new Error("sendBeacon rejected (quota or browser limit)"),
      );
    }
  }
}
