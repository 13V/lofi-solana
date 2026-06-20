/**
 * PumpPortal non-custodial (LOCAL) launch provider.
 *
 * Flow:
 *  1. Creator pre-uploads metadata JSON to IPFS and receives a URI.
 *  2. SDK calls POST /api/trade-local with action:"create".
 *  3. PumpPortal returns a serialised, partially-signed transaction.
 *  4. Creator's browser wallet signs and submits — private keys never leave
 *     the client (hence "local / non-custodial").
 *
 * Docs: https://pumpportal.fun/local-trading-api/trading-api/
 *
 * ---
 * TODO (cost reduction):
 *   Replace the PumpPortal HTTP call with the official
 *   `@pump-fun/pump-sdk` package (createAndBuyInstructions) to
 *   construct the transaction locally, avoiding PumpPortal's ~0.5% fee.
 *   PumpPortal is used here for rapid integration; the LaunchProvider
 *   interface is identical either way so the swap is a drop-in.
 * ---
 */

import type { LaunchParams, LaunchProvider, LaunchResult } from "../types.js";
import { PUMP_FUN_PROGRAM_ID, PUMP_PORTAL_TRADE_LOCAL_URL } from "../config.js";

// ---------------------------------------------------------------------------
// Wire format expected by PumpPortal /api/trade-local  (action: "create")
// ---------------------------------------------------------------------------

/**
 * Token metadata sub-object sent to PumpPortal.
 * The URI must already be uploaded to IPFS/Arweave before this call.
 */
interface PumpPortalTokenMetadata {
  name: string;
  symbol: string;
  uri: string;
}

/**
 * Full request body for a non-custodial token creation via PumpPortal.
 *
 * Field notes:
 *  - `publicKey`        — creator/signer wallet (base58). PumpPortal uses this
 *                         to set the fee payer and initial buyer.
 *  - `mint`             — public key of the fresh mint keypair (base58). The
 *                         LOCAL API takes only the public key; you must sign
 *                         the returned tx with the mint secret key too.
 *  - `denominatedInSol` — "true" means `amount` is in SOL, not tokens.
 *  - `pool`             — "pump" (Pump.fun AMM) or "bonk" (BonkSwap).
 */
interface PumpPortalCreateRequest {
  publicKey: string;
  action: "create";
  tokenMetadata: PumpPortalTokenMetadata;
  mint: string;
  denominatedInSol: "true" | "false";
  amount: number;
  slippage: number;
  priorityFee: number;
  pool: "pump" | "bonk";
}

/**
 * The raw response from PumpPortal /api/trade-local is an ArrayBuffer
 * containing the serialised (partially-signed) Solana transaction.
 * We base64-encode it before handing it to the wallet adapter.
 */

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class PumpPortalLaunchProvider implements LaunchProvider {
  /**
   * On-chain program ID for Pump.fun's AMM (mainnet-beta).
   * Stored here for reference; the program is invoked inside the
   * transaction returned by PumpPortal.
   *
   * @see https://solscan.io/account/6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
   */
  static readonly PUMP_FUN_PROGRAM_ID = PUMP_FUN_PROGRAM_ID;

  /**
   * Build and return a serialised "create + initial buy" transaction.
   *
   * The returned `serializedTx` is a base64 string. Typical usage:
   * ```ts
   * const { serializedTx, mint } = await provider.buildCreateSongTokenTx(params);
   * const txBytes = Buffer.from(serializedTx, "base64");
   * // Pass txBytes to wallet.signTransaction() → send via Connection.sendRawTransaction()
   * // NOTE: the mint keypair must also sign before submission.
   * ```
   *
   * @throws {Error} if PumpPortal returns a non-2xx response.
   */
  async buildCreateSongTokenTx(params: LaunchParams): Promise<{
    serializedTx: string;
    mint: string;
  }> {
    const body: PumpPortalCreateRequest = {
      publicKey: params.signerPublicKey,
      action: "create",
      tokenMetadata: {
        name: params.meta.title,
        symbol: params.meta.ticker.toUpperCase(),
        uri: params.metadataUri,
      },
      mint: params.mintPublicKey,
      denominatedInSol: "true",
      amount: params.initialBuySol,
      slippage: params.slippagePct,
      priorityFee: params.priorityFeeSol,
      pool: "pump",
    };

    // TODO: replace with @pump-fun/pump-sdk's createAndBuyInstructions()
    //       to skip the PumpPortal 0.5% fee and build the tx locally.
    const response = await fetch(PUMP_PORTAL_TRADE_LOCAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "(no body)");
      throw new Error(
        `PumpPortal /api/trade-local failed [${response.status}]: ${text}`,
      );
    }

    // Response is a raw ArrayBuffer containing the serialised transaction.
    const arrayBuffer = await response.arrayBuffer();
    const serializedTx = Buffer.from(arrayBuffer).toString("base64");

    return { serializedTx, mint: params.mintPublicKey };
  }

  /**
   * Convenience: submit a signed, serialised transaction and return the
   * LaunchResult.
   *
   * @param signedTxBase64 — base64-encoded fully-signed transaction
   * @param mint           — base-58 mint address (from buildCreateSongTokenTx)
   *
   * TODO: wire up a real Connection.sendRawTransaction call here.
   */
  async submitSignedTx(
    signedTxBase64: string,
    mint: string,
  ): Promise<LaunchResult> {
    // TODO: submit via @solana/web3.js Connection.sendRawTransaction and
    //       confirm with Connection.confirmTransaction.
    void signedTxBase64;
    return {
      mint,
      signature: "STUB_SIGNATURE",
      url: `https://pump.fun/coin/${mint}`,
    };
  }
}
