/**
 * @lofi/sdk — public API surface.
 *
 * Import paths:
 *
 *   // Everything (tree-shake in your bundler)
 *   import { buildTree, getLaunchProvider, ... } from "@lofi/sdk";
 *
 *   // Scoped — preferred for bundle-size-conscious consumers
 *   import { getLaunchProvider }   from "@lofi/sdk/launch";
 *   import { buildSongMetadata }   from "@lofi/sdk/metadata";
 *   import { buildTree, verify }   from "@lofi/sdk/rewards";
 *   import { issueSession }        from "@lofi/sdk/listen";
 *   import { PUMP_FUN_PROGRAM_ID } from "@lofi/sdk/config";
 */

// Types — re-export all shared interfaces.
export type {
  SongMeta,
  LaunchParams,
  LaunchResult,
  LaunchProvider,
  ListenHeartbeat,
  QualifiedListen,
  RewardLeaf,
  EpochPlan,
  HolderBalance,
  DistributionParams,
} from "./types.js";

// Config
export {
  PUMP_FUN_PROGRAM_ID,
  LOFI_REWARD_PROGRAM_ID,
  CLUSTER_CONFIGS,
  DEFAULT_DISTRIBUTION_PARAMS,
  DEFAULT_LISTEN_QUALIFY,
  PUMP_PORTAL_API_BASE,
  PUMP_PORTAL_TRADE_LOCAL_URL,
} from "./config.js";
export type { Cluster, ClusterConfig } from "./config.js";

// Metadata
export { buildSongMetadata } from "./metadata.js";
export type {
  SongMetadata,
  MetaplexAttribute,
  MetaplexFile,
  MetaplexProperties,
} from "./metadata.js";

// Launch
export {
  getLaunchProvider,
  PumpPortalLaunchProvider,
  MeteoraDbcLaunchProvider,
  DEFAULT_LOFI_CURVE_CONFIG,
} from "./launch/index.js";
export type {
  LofiBondingCurveConfig,
  PumpFunConfig,
  MeteoraConfig,
} from "./launch/index.js";

// Listen — session
export { issueSession, verifySession } from "./listen/session.js";
export type { SessionPayload, VerifyResult } from "./listen/session.js";

// Listen — qualification
export {
  qualifyListen,
  qualifyBatch,
  listenKey,
  windowStartFor,
} from "./listen/qualify.js";
export type { QualifyConfig } from "./listen/qualify.js";

// Listen — client (browser)
export { ListenReporter } from "./listen/client.js";
export type { ListenReporterConfig } from "./listen/client.js";

// Rewards — Merkle tree
export {
  buildTree,
  verify,
  hashLeaf,
  hashNode,
  pubkeyToBytes,
  u64ToLeBytes,
  MerkleTree,
} from "./rewards/merkle.js";

// Rewards — distribution
export { computeEpochPlan, toCumulativeMap } from "./rewards/distribution.js";
export type { ComputeEpochPlanInput } from "./rewards/distribution.js";

// Rewards — oracle attestation (byte-matches the on-chain program)
export { buildOracleMessage, ORACLE_MESSAGE_LEN } from "./rewards/oracle.js";
