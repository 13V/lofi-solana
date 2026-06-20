/**
 * Listen qualification logic.
 *
 * A "qualified listen" is a session that passes the minimum engagement
 * thresholds required to earn listener rewards.  The rules here are the
 * single source of truth shared between:
 *   - the API server (real-time gate)
 *   - the epoch reward computation (batch gate)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * ECONOMIC HARDENING — why each rule exists
 * ──────────────────────────────────────────────────────────────────────────
 *
 * 1. Minimum seconds (default 30 s)
 *    Prevents credit for accidental plays, bot-level skip patterns, and
 *    automated playlist farms that move on after 5–10 s.
 *
 * 2. Minimum completion ratio (default 0.5)
 *    For a 60 s track, 30 s is 50%; for a 3-min track, 30 s is only 17%.
 *    Requiring BOTH minSeconds AND minCompletion means longer tracks demand
 *    proportionally more listening, making listen-farming uneconomic at scale.
 *
 * 3. Per-listener daily cap (see DistributionParams.listenerDailyCapPerWallet)
 *    Applied in rewards/distribution.ts, not here.  Even if a bot plays a
 *    track 1 000 times, only N listens count per epoch.  The cap is high
 *    enough for a genuine power listener but too low to profit from farming.
 *
 * 4. Require min token hold to earn (DistributionParams.minHoldForListenerReward)
 *    Also applied in rewards/distribution.ts.  Earning listener rewards
 *    requires owning some of the token, so listener rewards can't be cleanly
 *    farmed without economic exposure to the token price.
 *
 * 5. Pro-rata from a fixed pool
 *    Listener rewards come from a fixed lamport pool (the epoch fee take).
 *    More listens ≠ more total rewards; it redistributes the same pool more
 *    thinly.  This caps absolute farming gains even if all other rules fail.
 *
 * 6. Time/frequency decay (applied per wallet in distribution.ts)
 *    After the daily cap, additional listens earn at a decayed rate.  The
 *    current implementation hard-caps (decay factor = 0 beyond cap); a
 *    future version may use a smooth decay like: weight = 1 / (1 + k * n).
 *
 * 7. Session token binding (listen/session.ts)
 *    Each session is HMAC-signed with listenerId + trackId + expiry + IP.
 *    Heartbeats without a valid session token are rejected server-side before
 *    they reach this module.
 *
 * 8. Deduplication via listenKey
 *    A (trackId, listenerId, 10-min window) triple can produce at most one
 *    qualified listen.  Replaying heartbeats within the same window has no
 *    additional effect.
 * ──────────────────────────────────────────────────────────────────────────
 */

import type { ListenHeartbeat, QualifiedListen } from "../types.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface QualifyConfig {
  /**
   * Minimum number of seconds of actual playback to count as a listen.
   * Default: 30.
   */
  minSeconds: number;
  /**
   * Minimum completion ratio [0, 1].
   * A listen of 60 s on a 2-min track = 0.5 completion.
   * Default: 0.5.
   */
  minCompletion: number;
  /**
   * Duration of the track in seconds.
   * Required to compute completion ratio.
   */
  durationSec: number;
}

const DEFAULT_QUALIFY_CONFIG: Omit<QualifyConfig, "durationSec"> = {
  minSeconds: 30,
  minCompletion: 0.5,
};

// ---------------------------------------------------------------------------
// Deduplication key
// ---------------------------------------------------------------------------

/**
 * Produce a canonical string key that uniquely identifies a listen attempt
 * within a 10-minute window.
 *
 * Two heartbeat streams with the same key are treated as duplicates; only
 * the first qualifying stream earns credit.
 *
 * @param trackId    — base-58 mint address of the track
 * @param listenerId — base-58 wallet public key (or anonymous session ID)
 * @param windowStart — unix timestamp (seconds) rounded down to the start of
 *                      the current 10-minute window
 *                      e.g. Math.floor(ts / 600) * 600
 */
export function listenKey(
  trackId: string,
  listenerId: string,
  windowStart: number,
): string {
  return `${trackId}:${listenerId}:${windowStart}`;
}

/**
 * Compute the 10-minute window start for an arbitrary unix timestamp.
 */
export function windowStartFor(timestampSec: number): number {
  return Math.floor(timestampSec / 600) * 600;
}

// ---------------------------------------------------------------------------
// Core qualification function
// ---------------------------------------------------------------------------

/**
 * Determine whether a sequence of heartbeats constitutes a qualified listen.
 *
 * Heartbeats are assumed to originate from a single session (same
 * listenerId + trackId + sessionToken).  The caller is responsible for
 * grouping them correctly before calling this function.
 *
 * Algorithm:
 *  1. Sort heartbeats by positionSec to handle out-of-order delivery.
 *  2. Walk consecutive pairs; accumulate time only when the position
 *     advances monotonically (skipping backward jumps = seeks).
 *  3. Apply minSeconds + minCompletion thresholds.
 *
 * @param heartbeats  — raw heartbeats from one session, any order
 * @param config      — qualification thresholds + track duration
 * @returns { qualified, qualifiedListen? } where qualifiedListen is populated
 *          iff qualified === true.
 */
export function qualifyListen(
  heartbeats: ListenHeartbeat[],
  config: QualifyConfig,
): { qualified: boolean; qualifiedListen?: QualifiedListen } {
  const { minSeconds, minCompletion, durationSec } = {
    ...DEFAULT_QUALIFY_CONFIG,
    ...config,
  };

  if (heartbeats.length < 2) {
    return { qualified: false };
  }

  // Use the first heartbeat's metadata as canonical identity for the session.
  const first = heartbeats[0]!;
  const { listenerId, trackId } = first;

  // Sort by playback position (ascending).
  const sorted = [...heartbeats].sort(
    (a, b) => a.positionSec - b.positionSec,
  );

  // Accumulate contiguous playback seconds.
  // We credit time between consecutive heartbeats only when the position
  // advances forward.  Backward jumps (seeks) are ignored — this means
  // replaying the same segment multiple times only counts once.
  let secondsPlayed = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    const delta = curr.positionSec - prev.positionSec;

    if (delta > 0 && delta <= 20) {
      // Heartbeats come every ~10 s; allow up to 20 s gap before treating
      // as a discontinuity (e.g. buffering, brief pause).
      secondsPlayed += delta;
    }
    // delta <= 0: backward seek — ignore.
    // delta > 20: large gap (pause / network drop) — ignore, don't credit.
  }

  const completionRatio =
    durationSec > 0 ? secondsPlayed / durationSec : 0;

  const qualified =
    secondsPlayed >= minSeconds && completionRatio >= minCompletion;

  if (!qualified) {
    return { qualified: false };
  }

  // Use the earliest heartbeat's timestamp as the window anchor.
  const earliestTs = Math.min(...heartbeats.map((h) => h.timestampSec));
  const windowStart = windowStartFor(earliestTs);

  return {
    qualified: true,
    qualifiedListen: {
      listenerId,
      trackId,
      windowStart,
      secondsPlayed,
      completionRatio,
    },
  };
}

// ---------------------------------------------------------------------------
// Batch helper
// ---------------------------------------------------------------------------

/**
 * Group a flat list of heartbeats by session key and qualify each group.
 *
 * A "session key" is (listenerId, trackId, sessionToken) — the sessionToken
 * is included so that the same user replaying a track produces separate
 * session groups (each individually qualified or not).
 *
 * Returns all QualifiedListens, already deduplicated by `listenKey`.
 */
export function qualifyBatch(
  heartbeats: ListenHeartbeat[],
  config: QualifyConfig,
): QualifiedListen[] {
  // Group by (listenerId, trackId, sessionToken).
  const groups = new Map<string, ListenHeartbeat[]>();

  for (const hb of heartbeats) {
    const key = `${hb.listenerId}:${hb.trackId}:${hb.sessionToken}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(hb);
  }

  // Qualify each group; deduplicate by listenKey.
  const seen = new Set<string>();
  const results: QualifiedListen[] = [];

  for (const group of groups.values()) {
    const { qualified, qualifiedListen } = qualifyListen(group, config);
    if (!qualified || !qualifiedListen) continue;

    const key = listenKey(
      qualifiedListen.trackId,
      qualifiedListen.listenerId,
      qualifiedListen.windowStart,
    );

    if (!seen.has(key)) {
      seen.add(key);
      results.push(qualifiedListen);
    }
  }

  return results;
}
