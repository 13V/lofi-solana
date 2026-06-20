/**
 * POST /api/launch
 * Build a pump.fun token-launch transaction for a song-coin.
 *
 * TODO: Integrate @lofi/sdk LaunchProvider to construct the real transaction.
 *       Currently returns a stub serialized transaction + mint address.
 *
 * Request body:
 *   { name, ticker, description, coverDataUrl, audioBase64, creator }
 *
 * Response:
 *   { mint: string, txBase64: string }  — base64 serialized VersionedTransaction
 */

import { NextResponse } from "next/server";
// TODO: import { LaunchProvider } from "@lofi/sdk/launch";

interface LaunchRequestBody {
  name: string;
  ticker: string;
  description: string;
  coverDataUrl?: string;
  audioBase64?: string;
  creator: string;
}

export async function POST(request: Request) {
  let body: LaunchRequestBody;

  try {
    body = (await request.json()) as LaunchRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, ticker, description, creator } = body;

  // Validate required fields
  if (!name || !ticker || !creator) {
    return NextResponse.json(
      { error: "name, ticker, and creator are required" },
      { status: 400 }
    );
  }

  if (ticker.length < 2 || ticker.length > 6) {
    return NextResponse.json(
      { error: "ticker must be 2–6 characters" },
      { status: 400 }
    );
  }

  // ── TODO: Real implementation ────────────────────────────────────────────
  //
  // 1. Upload audio + cover to Arweave via Irys (bundlr):
  //    const audioUri = await uploadToArweave(body.audioBase64);
  //    const coverUri = await uploadToArweave(body.coverDataUrl);
  //
  // 2. Build pump.fun launch metadata JSON (SPL token metadata standard):
  //    const metadataUri = await uploadMetadataJson({ name, symbol: ticker,
  //      description, image: coverUri, animation_url: audioUri });
  //
  // 3. Call SDK LaunchProvider to build the transaction:
  //    const provider = new LaunchProvider({ rpc: process.env.SOLANA_RPC_URL });
  //    const { transaction, mint } = await provider.buildLaunchTx({
  //      name, symbol: ticker, uri: metadataUri, creator });
  //    const txBase64 = transaction.serialize().toString("base64");
  //
  // 4. Return { mint, txBase64 } — client signs + sends via wallet adapter
  // ─────────────────────────────────────────────────────────────────────────

  // Stub: return fake mint + empty tx for scaffold demo
  const stubMint = `${ticker}${Date.now()}stub1111111111111111111111111111`;

  return NextResponse.json({
    mint: stubMint,
    txBase64: Buffer.from(`stub:${name}:${ticker}:${creator}:${description}`).toString(
      "base64"
    ),
    // Metadata preview for UI confirmation
    meta: {
      name,
      symbol: ticker,
      description,
      network: "devnet",
    },
  });
}
