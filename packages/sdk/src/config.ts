/**
 * Global configuration: on-chain program IDs, cluster endpoints, and
 * default distribution parameters.
 *
 * All basis-point (bps) values: 1 bps = 0.01%, 10 000 bps = 100%.
 */

import type { DistributionParams } from "./types.js";

// ---------------------------------------------------------------------------
// On-chain program IDs
// ---------------------------------------------------------------------------

/**
 * Official Pump.fun AMM program ID on mainnet-beta.
 * Source: https://pump.fun / verified on-chain.
 */
export const PUMP_FUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

/**
 * Placeholder for the lofi-solana reward-distribution program.
 * Replace once the program is deployed.
 */
export const LOFI_REWARD_PROGRAM_ID = "LoFiRWDv1111111111111111111111111111111111111";

// ---------------------------------------------------------------------------
// Cluster / RPC configuration
// ---------------------------------------------------------------------------

export type Cluster = "mainnet-beta" | "devnet" | "localnet";

export interface ClusterConfig {
  cluster: Cluster;
  rpcUrl: string;
  wsUrl?: string;
}

export const CLUSTER_CONFIGS: Record<Cluster, ClusterConfig> = {
  "mainnet-beta": {
    cluster: "mainnet-beta",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    wsUrl: "wss://api.mainnet-beta.solana.com",
  },
  devnet: {
    cluster: "devnet",
    rpcUrl: "https://api.devnet.solana.com",
    wsUrl: "wss://api.devnet.solana.com",
  },
  localnet: {
    cluster: "localnet",
    rpcUrl: "http://127.0.0.1:8899",
    wsUrl: "ws://127.0.0.1:8900",
  },
};

// ---------------------------------------------------------------------------
// Default distribution parameters
// ---------------------------------------------------------------------------

/**
 * Default split — the "FULL listens→holders" model (selected for v1).
 *
 *   creator    15%  — modest royalty to the wallet that made the track
 *   holders    35%  — pro-rata by token balance
 *   listeners  50%  — pro-rata by *verified listens* (hold-gated)
 *
 * Total = 10 000 bps = 100% of the epoch fee pool flows to the community,
 * with LISTENS as the dominant driver — i.e. "the more a song is listened to,
 * the more the people who hold its token earn." This maximizes alignment with
 * the original product vision.
 *
 * ⚠️ HIGHEST-RISK CONFIG. Paying holders ongoing income weighted by engagement
 * looks like an investment contract under Howey / the 2026 SEC framework (this
 * is what sank Royal & Opulous). It is the model chosen for this scaffold, but
 * treat a **securities opinion + geoblocking** as a HARD GATE before any
 * mainnet payout. See docs/04-legal-and-risk.md and docs/02-tokenomics.md.
 *
 * Tune freely: carve out a platform/liquidity cut by lowering the three buckets
 * below 10 000 — the undistributed remainder simply stays in the SongVault PDA.
 */
export const DEFAULT_DISTRIBUTION_PARAMS: DistributionParams = {
  creatorBps: 1_500,
  holderBps: 3_500,
  listenerBps: 5_000,

  /**
   * A listener wallet may receive credit for at most 48 qualified listens
   * per epoch (roughly 2 full-track plays per hour in a 24 h window).
   * This prevents a single account from farming the entire listener pool.
   */
  listenerDailyCapPerWallet: 48,

  /**
   * A wallet must hold at least 1 000 raw token units (~0.001% of supply
   * for a typical 100 M token launch) to qualify for listener rewards.
   * This "skin-in-the-game" requirement ties listening incentives to
   * genuine holders, not bots without exposure.
   */
  minHoldForListenerReward: 1_000n,
};

// ---------------------------------------------------------------------------
// Listen qualification defaults
// ---------------------------------------------------------------------------

export const DEFAULT_LISTEN_QUALIFY = {
  /** Minimum contiguous seconds to count as a qualified listen. */
  minSeconds: 30,
  /** Minimum completion ratio (0–1) to count as a qualified listen. */
  minCompletion: 0.5,
} as const;

// ---------------------------------------------------------------------------
// PumpPortal API
// ---------------------------------------------------------------------------

export const PUMP_PORTAL_API_BASE = "https://pumpportal.fun/api";
export const PUMP_PORTAL_TRADE_LOCAL_URL = `${PUMP_PORTAL_API_BASE}/trade-local`;
