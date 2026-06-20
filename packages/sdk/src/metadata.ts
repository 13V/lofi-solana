/**
 * Metaplex-compatible audio NFT metadata builder.
 *
 * The generated JSON follows the Metaplex Token Metadata Standard v1.1
 * augmented with audio-specific fields recognised by NFT explorers
 * and the lofi-solana dApp frontend.
 *
 * Upload the result to IPFS / Arweave and pass the resulting URI to
 * `LaunchParams.metadataUri`.
 */

import type { SongMeta } from "./types.js";

// ---------------------------------------------------------------------------
// Metaplex attribute / file types
// ---------------------------------------------------------------------------

export interface MetaplexAttribute {
  trait_type: string;
  value: string | number;
}

export interface MetaplexFile {
  uri: string;
  type: string;
  /** Human-readable label (lofi-solana extension). */
  label?: string;
}

export interface MetaplexProperties {
  files: MetaplexFile[];
  category: "audio";
  /** Optional list of creator public keys with royalty shares. */
  creators?: Array<{ address: string; share: number }>;
}

/**
 * Metaplex audio metadata JSON shape.
 *
 * Standard fields:
 *   name, symbol, description, image, animation_url, external_url,
 *   attributes, properties
 *
 * `animation_url` is the primary audio file; `image` is the cover art.
 * Compatible with Magic Eden, Tensor, and the Metaplex DAS API.
 */
export interface SongMetadata {
  name: string;
  symbol: string;
  description: string;
  /** Cover art URI (shown as the NFT thumbnail). */
  image: string;
  /**
   * Audio file URI.
   * `animation_url` is the Metaplex-standard field for audio / video content.
   */
  animation_url: string;
  external_url: string;
  attributes: MetaplexAttribute[];
  properties: MetaplexProperties;
  /**
   * Top-level category hint — recognised by some marketplaces
   * as an audio token without needing to parse `properties`.
   */
  category: "audio";
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Build a Metaplex-compatible audio metadata object from a `SongMeta`.
 *
 * @param meta        — song metadata (all fields required)
 * @param externalUrl — optional canonical URL on the lofi-solana dApp
 * @returns           plain object ready to be JSON-serialised and uploaded
 *
 * @example
 * ```ts
 * const json = buildSongMetadata(meta, `https://lofi.fm/track/${meta.ticker}`);
 * const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
 * // upload blob to IPFS → pass CID URI to LaunchParams.metadataUri
 * ```
 */
export function buildSongMetadata(
  meta: SongMeta,
  externalUrl = "https://lofi.fm",
): SongMetadata {
  const {
    title,
    ticker,
    bpm,
    key,
    durationSec,
    coverUri,
    audioUri,
    creator,
  } = meta;

  const description =
    `${title} · ${key} · ${bpm} BPM · ${formatDuration(durationSec)}. ` +
    `A lofi track launched as a tradeable token on lofi.fm. ` +
    `Creator: ${creator}`;

  return {
    name: title,
    symbol: ticker.toUpperCase(),
    description,
    image: coverUri,
    animation_url: audioUri,
    external_url: externalUrl,
    category: "audio",

    attributes: [
      { trait_type: "BPM", value: bpm },
      { trait_type: "Key", value: key },
      { trait_type: "Duration (sec)", value: durationSec },
      { trait_type: "Duration", value: formatDuration(durationSec) },
      { trait_type: "Creator", value: creator },
    ],

    properties: {
      category: "audio",
      files: [
        {
          uri: audioUri,
          type: audioMimeType(audioUri),
          label: "Audio",
        },
        {
          uri: coverUri,
          type: imageMimeType(coverUri),
          label: "Cover",
        },
      ],
      creators: [
        {
          address: creator,
          // 100% share; split via the on-chain reward program, not here.
          share: 100,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Format seconds as "m:ss" (e.g. 185 → "3:05"). */
function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Best-effort MIME type from a URI's extension. */
function audioMimeType(uri: string): string {
  const ext = uri.split("?")[0]!.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    flac: "audio/flac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    aac: "audio/aac",
  };
  return map[ext ?? ""] ?? "audio/mpeg";
}

/** Best-effort image MIME type from a URI's extension. */
function imageMimeType(uri: string): string {
  const ext = uri.split("?")[0]!.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  return map[ext ?? ""] ?? "image/png";
}
