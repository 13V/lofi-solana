/**
 * Epoch reward distribution.
 *
 * `computeEpochPlan` is the core economic function of lofi-solana.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * DISTRIBUTION MODEL
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Each epoch (e.g. weekly), trading fees accumulated by the token's AMM
 * pool are distributed to three groups:
 *
 *   Creator  (creatorBps)   — the wallet that minted the track.
 *             Fixed share, independent of listening activity.
 *             Rationale: permanent content creator royalty.
 *
 *   Holders  (holderBps)    — wallets that hold ≥ 1 token unit at snapshot.
 *             Pro-rata by balance.  Rewards capital commitment.
 *             Rationale: aligns holders with token success, bootstraps
 *             liquidity depth.
 *
 *   Listeners (listenerBps) — wallets with ≥ 1 qualified listen in the epoch
 *             AND ≥ minHoldForListenerReward tokens at snapshot.
 *             Pro-rata by listen count (with per-wallet cap + decay).
 *             Rationale: rewards genuine engagement; the hold requirement
 *             couples listening and token ownership.
 *
 * ANTI-GAMING MEASURES:
 *   1. Per-wallet listen cap (listenerDailyCapPerWallet per epoch).
 *      Prevents a single bot from claiming the whole listener pool.
 *   2. Hold-to-earn gate.
 *      Requires token exposure, so farming costs money.
 *   3. Pro-rata from fixed pool.
 *      More farmers → thinner slices for each, no net gain.
 *   4. Decay.
 *      Currently implemented as a hard cap (weight = 0 beyond cap).
 *      A smooth decay can be introduced later without changing the interface.
 *
 * CUMULATIVE AMOUNTS:
 *   Leaf amounts are CUMULATIVE across all epochs.  The on-chain program
 *   stores `claimed_so_far` per claimant and pays the difference.
 *   This function must be called with the previous epoch's cumulative
 *   amounts in `previousCumulative` to produce correct totals.
 *
 * ──────────────────────────────────────────────────────────────────────────
 */

import type {
  RewardLeaf,
  EpochPlan,
  HolderBalance,
  QualifiedListen,
  DistributionParams,
} from "../types.js";

// ---------------------------------------------------------------------------
// Input shape
// ---------------------------------------------------------------------------

export interface ComputeEpochPlanInput {
  /** Identifier for this epoch, e.g. "2025-W03". */
  epochId: string;
  /** Base-58 mint of the song token. */
  songMint: string;
  /** Creator's base-58 public key. */
  creatorWallet: string;
  /** Total fee lamports available to distribute this epoch. */
  feePoolLamports: bigint;
  /** Token holder balances at the snapshot (after epoch close). */
  holders: HolderBalance[];
  /**
   * Map from wallet (base-58) → number of qualified listens in this epoch.
   * Only wallets that hold ≥ minHoldForListenerReward will earn listener share.
   */
  qualifiedListensByWallet: Map<string, number>;
  /** Distribution parameters (bps, caps, hold gate). */
  params: DistributionParams;
  /**
   * Cumulative amounts from all PREVIOUS epochs, keyed by wallet (base-58).
   * Pass an empty Map for the first epoch.
   * The new cumulative amount for each claimant =
   *   previousCumulative.get(wallet) + thisEpochReward.
   */
  previousCumulative?: Map<string, bigint>;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Compute a full `EpochPlan` — the list of cumulative `RewardLeaf`s to be
 * inserted into the Merkle tree for this epoch.
 *
 * This is a **pure function**: no network calls, no side effects.
 *
 * @throws if creatorBps + holderBps + listenerBps > 10 000
 */
export function computeEpochPlan(input: ComputeEpochPlanInput): EpochPlan {
  const {
    epochId,
    songMint,
    creatorWallet,
    feePoolLamports,
    holders,
    qualifiedListensByWallet,
    params,
    previousCumulative = new Map<string, bigint>(),
  } = input;

  const {
    creatorBps,
    holderBps,
    listenerBps,
    listenerDailyCapPerWallet,
    minHoldForListenerReward,
  } = params;

  // Validate bps sum.
  const totalBps = creatorBps + holderBps + listenerBps;
  if (totalBps > 10_000) {
    throw new Error(
      `bps sum ${totalBps} exceeds 10 000 (100%): ` +
        `creator=${creatorBps} holder=${holderBps} listener=${listenerBps}`,
    );
  }

  // Lamport buckets (integer division; dust stays in the pool on-chain).
  const creatorLamports = (feePoolLamports * BigInt(creatorBps)) / 10_000n;
  const holderLamports = (feePoolLamports * BigInt(holderBps)) / 10_000n;
  const listenerLamports = (feePoolLamports * BigInt(listenerBps)) / 10_000n;

  // Accumulator: wallet → this-epoch reward in lamports.
  const thisEpochRewards = new Map<string, bigint>();

  // ── 1. Creator share ──────────────────────────────────────────────────────
  if (creatorLamports > 0n) {
    add(thisEpochRewards, creatorWallet, creatorLamports);
  }

  // ── 2. Holder share (pro-rata by balance) ─────────────────────────────────
  if (holderLamports > 0n && holders.length > 0) {
    const totalSupply = holders.reduce((s, h) => s + h.balance, 0n);

    if (totalSupply > 0n) {
      for (const holder of holders) {
        if (holder.balance === 0n) continue;
        // reward = holderLamports * balance / totalSupply
        const share = (holderLamports * holder.balance) / totalSupply;
        if (share > 0n) add(thisEpochRewards, holder.wallet, share);
      }
    }
  }

  // ── 3. Listener share (pro-rata by capped qualified listens) ──────────────
  if (listenerLamports > 0n && qualifiedListensByWallet.size > 0) {
    // Build the holder-balance index for the hold gate check.
    const balanceByWallet = new Map<string, bigint>(
      holders.map((h) => [h.wallet, h.balance]),
    );

    // Apply per-wallet cap and hold gate; compute effective listen weights.
    const effectiveListens = new Map<string, number>();

    for (const [wallet, rawCount] of qualifiedListensByWallet) {
      // Hold-to-earn gate.
      const balance = balanceByWallet.get(wallet) ?? 0n;
      if (balance < minHoldForListenerReward) continue;

      // Per-wallet cap (hard cap = decay factor 0 beyond cap).
      const cappedCount = Math.min(rawCount, listenerDailyCapPerWallet);
      if (cappedCount > 0) {
        effectiveListens.set(wallet, cappedCount);
      }
    }

    const totalListens = [...effectiveListens.values()].reduce(
      (s, n) => s + n,
      0,
    );

    if (totalListens > 0) {
      for (const [wallet, count] of effectiveListens) {
        // reward = listenerLamports * count / totalListens
        const share =
          (listenerLamports * BigInt(count)) / BigInt(totalListens);
        if (share > 0n) add(thisEpochRewards, wallet, share);
      }
    }
  }

  // ── 4. Build cumulative amounts ───────────────────────────────────────────
  // Collect all claimants (previous + this epoch).
  const allClaimants = new Set<string>([
    ...previousCumulative.keys(),
    ...thisEpochRewards.keys(),
  ]);

  const leaves: RewardLeaf[] = [];

  for (const wallet of allClaimants) {
    const prev = previousCumulative.get(wallet) ?? 0n;
    const thisEpoch = thisEpochRewards.get(wallet) ?? 0n;
    const cumulative = prev + thisEpoch;
    if (cumulative > 0n) {
      leaves.push({ claimant: wallet, amount: cumulative });
    }
  }

  return {
    epochId,
    songMint,
    feePoolLamports,
    leaves,
    splitBps: { creator: creatorBps, holders: holderBps, listeners: listenerBps },
    computedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helper: add to a running total in a Map
// ---------------------------------------------------------------------------

function add(map: Map<string, bigint>, key: string, value: bigint): void {
  map.set(key, (map.get(key) ?? 0n) + value);
}

// ---------------------------------------------------------------------------
// Utility: extract new cumulative map from an EpochPlan
// ---------------------------------------------------------------------------

/**
 * Convert an `EpochPlan` to a cumulative-amount map suitable for passing
 * as `previousCumulative` to the next epoch's `computeEpochPlan` call.
 */
export function toCumulativeMap(plan: EpochPlan): Map<string, bigint> {
  return new Map(plan.leaves.map((l) => [l.claimant, l.amount]));
}
