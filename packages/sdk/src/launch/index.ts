/**
 * Launch provider factory.
 *
 * Usage:
 * ```ts
 * import { getLaunchProvider } from "@lofi/sdk/launch";
 *
 * const provider = getLaunchProvider("pumpfun", {});
 * const { serializedTx, mint } = await provider.buildCreateSongTokenTx(params);
 * ```
 */

export { PumpPortalLaunchProvider } from "./pumpfun.js";
export {
  MeteoraDbcLaunchProvider,
  DEFAULT_LOFI_CURVE_CONFIG,
} from "./meteora.js";
export type { LofiBondingCurveConfig } from "./meteora.js";

import type { LaunchProvider } from "../types.js";
import { PumpPortalLaunchProvider } from "./pumpfun.js";
import {
  MeteoraDbcLaunchProvider,
  type LofiBondingCurveConfig,
} from "./meteora.js";

// ---------------------------------------------------------------------------
// Config type union
// ---------------------------------------------------------------------------

export interface PumpFunConfig {
  /** Optionally override the PumpPortal API base URL (useful for tests). */
  apiBaseUrl?: string;
}

export interface MeteoraConfig {
  curveConfig?: LofiBondingCurveConfig;
}

type ProviderConfig = {
  pumpfun: PumpFunConfig;
  meteora: MeteoraConfig;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Return a `LaunchProvider` by name.
 *
 * @param name — "pumpfun" | "meteora"
 * @param cfg  — provider-specific configuration (see each provider for details)
 *
 * @throws {Error} on unknown provider name.
 */
export function getLaunchProvider<K extends keyof ProviderConfig>(
  name: K,
  cfg: ProviderConfig[K],
): LaunchProvider {
  switch (name) {
    case "pumpfun":
      void (cfg as PumpFunConfig); // config reserved for future use
      return new PumpPortalLaunchProvider();

    case "meteora": {
      const { curveConfig } = cfg as MeteoraConfig;
      return new MeteoraDbcLaunchProvider(curveConfig);
    }

    default: {
      const _exhaustive: never = name;
      throw new Error(`Unknown launch provider: ${String(_exhaustive)}`);
    }
  }
}
