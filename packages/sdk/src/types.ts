/**
 * Core domain types for lofi-solana.
 *
 * Naming conventions:
 *  - "lamports" for raw u64 SOL amounts
 *  - "bps"      for basis-points (1 bps = 0.01%)
 *  - "claimant" for the base-58 Solana public key that receives rewards
 */

// ---------------------------------------------------------------------------
// Song / token identity
// ---------------------------------------------------------------------------

export interface SongMeta {
  /** Display title of the track (≤ 32 chars recommended for on-chain name). */
  title: string;
  /** Ticker symbol, e.g. "LOFIV1" (≤ 10 chars, upper-case). */
  ticker: string;
  /** Beats per minute. */
  bpm: number;
  /** Musical key, e.g. "C minor" or "F# major". */
  key: string;
  /** Track duration in seconds. */
  durationSec: number;
  /** IPFS / Arweave URI for the cover image (≤ 200 chars). */
  coverUri: string;
  /** IPFS / Arweave URI for the audio file (mp3/flac). */
  audioUri: string;
  /** Base-58 public key of the creator wallet. */
  creator: string;
}

// ---------------------------------------------------------------------------
// Token launch
// ---------------------------------------------------------------------------

export interface LaunchParams {
  /** Song metadata to embed in the token. */
  meta: SongMeta;
  /**
   * Pre-uploaded metadata JSON URI (IPFS/Arweave).
   * Must be uploaded before calling the launch provider.
   */
  metadataUri: string;
  /**
   * Amount of SOL the creator uses to seed the initial buy
   * (denominated in SOL, e.g. 0.5).
   */
  initialBuySol: number;
  /** Slippage tolerance in percent (e.g. 10 = 10%). */
  slippagePct: number;
  /** Solana priority fee in SOL (e.g. 0.0005). */
  priorityFeeSol: number;
  /** Base-58 public key of the signing/creator wallet. */
  signerPublicKey: string;
  /**
   * Base-58 public key of the fresh mint keypair.
   * The corresponding secret key must be provided to the provider separately
   * (never stored here) so the transaction can be partially signed off-chain.
   */
  mintPublicKey: string;
}

export interface LaunchResult {
  /** Base-58 address of the new mint account. */
  mint: string;
  /** Base-58 transaction signature after confirmation. */
  signature: string;
  /** Canonical URL for the token on the launch platform. */
  url: string;
}

/**
 * Abstraction over different launch platforms (Pump.fun, Meteora, …).
 * Implementations return a serialized transaction so the user can sign
 * it in-browser — no private keys ever leave the client.
 */
export interface LaunchProvider {
  /**
   * Build and serialize a "create + initial buy" transaction.
   *
   * @returns `serializedTx` — base64-encoded transaction bytes ready for the
   *          wallet adapter to sign and send.
   *          `mint` — the mint address for downstream use.
   */
  buildCreateSongTokenTx(params: LaunchParams): Promise<{
    serializedTx: string;
    mint: string;
  }>;
}

// ---------------------------------------------------------------------------
// Listen tracking
// ---------------------------------------------------------------------------

/**
 * A single heartbeat sent by the browser every ~10 s while a track plays.
 */
export interface ListenHeartbeat {
  /** Base-58 wallet public key of the listener (may be null for anonymous). */
  listenerId: string;
  /** Base-58 mint address of the track being played. */
  trackId: string;
  /**
   * Playback position (seconds) at the time of the heartbeat.
   * Monotonically increasing within a session.
   */
  positionSec: number;
  /** Unix timestamp (seconds) when the heartbeat was generated. */
  timestampSec: number;
  /** Opaque session token issued by the server (HMAC-bound). */
  sessionToken: string;
}

/**
 * A listen that has passed all qualification rules and is eligible
 * for reward credit in the current epoch.
 */
export interface QualifiedListen {
  listenerId: string;
  trackId: string;
  /** UTC epoch-second of the 10-minute window (floor). */
  windowStart: number;
  /** Total contiguous seconds accumulated across heartbeats. */
  secondsPlayed: number;
  /** Completion ratio (0–1): secondsPlayed / durationSec. */
  completionRatio: number;
}

// ---------------------------------------------------------------------------
// Rewards / Merkle distribution
// ---------------------------------------------------------------------------

/**
 * A single leaf in the reward Merkle tree.
 * Amounts are CUMULATIVE across all epochs so that the on-chain program
 * can enforce a simple "already_claimed < leaf_amount" invariant.
 */
export interface RewardLeaf {
  /** Base-58 Solana public key of the recipient. */
  claimant: string;
  /** Cumulative reward in lamports (u64, fits in a JS BigInt). */
  amount: bigint;
}

/**
 * The output of a reward distribution computation for one epoch.
 */
export interface EpochPlan {
  /** Unique identifier for the epoch (e.g. ISO week "2025-W03"). */
  epochId: string;
  /** Base-58 mint of the song token whose trading fees are being distributed. */
  songMint: string;
  /** Total lamports in the fee pool for this epoch. */
  feePoolLamports: bigint;
  /** Leaves ready to insert into the Merkle tree (cumulative amounts). */
  leaves: RewardLeaf[];
  /** Breakdown of the split in basis points. */
  splitBps: {
    creator: number;
    holders: number;
    listeners: number;
  };
  /** ISO timestamp when the plan was computed. */
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Holder snapshot (input to distribution)
// ---------------------------------------------------------------------------

export interface HolderBalance {
  /** Base-58 public key. */
  wallet: string;
  /** Raw token balance (u64 as bigint). */
  balance: bigint;
}

// ---------------------------------------------------------------------------
// Distribution parameters
// ---------------------------------------------------------------------------

export interface DistributionParams {
  /** Basis points allocated to the original creator. Must sum to ≤ 10 000. */
  creatorBps: number;
  /** Basis points allocated pro-rata to token holders. */
  holderBps: number;
  /** Basis points allocated pro-rata to qualified listeners. */
  listenerBps: number;
  /**
   * Maximum number of qualified listens credited per wallet per epoch.
   * Hard cap to prevent farming.
   */
  listenerDailyCapPerWallet: number;
  /**
   * Minimum token balance (raw u64) a wallet must hold at snapshot time
   * to be eligible for listener rewards.
   */
  minHoldForListenerReward: bigint;
}
