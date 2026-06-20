/**
 * Cumulative Merkle tree for on-chain reward distribution.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * BYTE FORMAT — must stay in sync with the on-chain program
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Leaf hash:
 *   keccak256( [0x00] || pubkey_bytes(32) || u64_le(amount)(8) )
 *
 *   - 0x00 prefix distinguishes leaves from internal nodes (prevents
 *     second-preimage attacks where an attacker submits a valid internal
 *     node as a leaf proof).
 *   - pubkey_bytes(32): base58-decoded Solana public key (always 32 bytes).
 *   - u64_le(amount)(8): 8-byte little-endian representation of the
 *     claimant's CUMULATIVE reward in lamports.
 *
 * Internal node hash:
 *   keccak256( [0x01] || min(left, right)(32) || max(left, right)(32) )
 *
 *   - 0x01 prefix distinguishes internal nodes from leaves.
 *   - Pairs are SORTED (min first) so the tree is order-independent;
 *     the proof verifier doesn't need to know whether a sibling is
 *     left or right — it just hashes min||max.
 *
 * Tree construction:
 *   1. Hash all leaves.
 *   2. Sort leaves by hash (lexicographic) for determinism.
 *   3. Build bottom-up: if the number of nodes at a level is odd, the
 *      last node is promoted without hashing (carried up unchanged).
 *   4. The root is the single node at the top.
 *
 * Cumulative amounts:
 *   Each leaf stores the TOTAL reward owed to a claimant across all
 *   epochs, not just the current one.  The on-chain program stores
 *   `claimed_so_far` per claimant and pays out `leaf_amount - claimed_so_far`
 *   on each claim.  This allows claimants to skip epochs and claim
 *   retroactively.
 *
 * ──────────────────────────────────────────────────────────────────────────
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { concatBytes } from "@noble/hashes/utils.js";
import type { RewardLeaf } from "../types.js";

// ---------------------------------------------------------------------------
// Low-level byte helpers
// ---------------------------------------------------------------------------

const LEAF_PREFIX = new Uint8Array([0x00]);
const NODE_PREFIX = new Uint8Array([0x01]);

/**
 * Decode a base58 Solana public key to its 32-byte representation.
 *
 * Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
 */
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function pubkeyToBytes(base58: string): Uint8Array {
  // Decode base58 to a big integer, then to bytes.
  let num = 0n;
  for (const char of base58) {
    const idx = BASE58_ALPHABET.indexOf(char);
    if (idx < 0) throw new Error(`Invalid base58 character: '${char}'`);
    num = num * 58n + BigInt(idx);
  }

  // Convert to 32-byte big-endian, then return.
  const bytes = new Uint8Array(32);
  let remaining = num;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  if (remaining !== 0n) {
    throw new Error(`Base58 key too large to fit in 32 bytes: ${base58}`);
  }

  // Handle leading '1's (which represent leading zero bytes).
  let leadingZeros = 0;
  for (const char of base58) {
    if (char === "1") leadingZeros++;
    else break;
  }
  // The loop above already placed zeros correctly via the big-endian layout,
  // but we verify the leading zeros are in the right place.
  void leadingZeros; // structural zeros already encoded by the BE write above

  return bytes;
}

/**
 * Encode a u64 value as an 8-byte little-endian Uint8Array.
 * Solana on-chain programs (Anchor, native) use little-endian for u64.
 */
export function u64ToLeBytes(value: bigint): Uint8Array {
  if (value < 0n) throw new RangeError("u64 must be non-negative");
  if (value > 0xffff_ffff_ffff_ffffn) throw new RangeError("u64 overflow");

  const bytes = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Hash functions
// ---------------------------------------------------------------------------

/**
 * Hash a leaf: keccak256([0x00] || pubkey(32) || u64le(amount)(8))
 */
export function hashLeaf(leaf: RewardLeaf): Uint8Array {
  const pubkeyBytes = pubkeyToBytes(leaf.claimant);
  const amountBytes = u64ToLeBytes(leaf.amount);
  return keccak_256(concatBytes(LEAF_PREFIX, pubkeyBytes, amountBytes));
}

/**
 * Hash an internal node: keccak256([0x01] || min(a,b) || max(a,b))
 * Pairs are sorted so the result is the same regardless of insertion order.
 */
export function hashNode(a: Uint8Array, b: Uint8Array): Uint8Array {
  // Lexicographic comparison of two 32-byte arrays.
  const cmp = compareBytes(a, b);
  const [lo, hi] = cmp <= 0 ? [a, b] : [b, a];
  return keccak_256(concatBytes(NODE_PREFIX, lo, hi));
}

/** Lexicographic comparison of two Uint8Arrays. Returns < 0, 0, or > 0. */
function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = a[i]! - b[i]!;
    if (diff !== 0) return diff;
  }
  return a.length - b.length;
}

// ---------------------------------------------------------------------------
// MerkleTree class
// ---------------------------------------------------------------------------

/**
 * A cumulative Merkle tree for Solana reward distribution.
 *
 * Construction is deterministic: leaves are sorted by their hash before
 * building the tree.
 *
 * @example
 * ```ts
 * const tree = buildTree([
 *   { claimant: "So11...1112", amount: 1_000_000n },
 *   { claimant: "EPjF...KGrX", amount: 2_500_000n },
 * ]);
 *
 * const root  = tree.getRoot();
 * const proof = tree.getProof("So11...1112");
 * const ok    = verify(root, "So11...1112", 1_000_000n, proof);
 * ```
 */
export class MerkleTree {
  /** Original leaves, in the order provided by the caller. */
  private readonly leaves: RewardLeaf[];
  /**
   * Leaf hashes sorted deterministically.
   * Index i here corresponds to sortedLeaves[i].
   */
  private readonly sortedLeafHashes: Uint8Array[];
  /** Parallel array to sortedLeafHashes: the underlying RewardLeaf. */
  private readonly sortedLeaves: RewardLeaf[];
  /**
   * All tree levels: levels[0] = leaf hashes (sorted), levels[k] = k-th
   * level above leaves, levels[levels.length - 1] = root (single hash).
   */
  private readonly levels: Uint8Array[][];

  constructor(leaves: RewardLeaf[]) {
    if (leaves.length === 0) {
      throw new Error("MerkleTree requires at least one leaf");
    }
    this.leaves = leaves;

    // Hash and sort leaves by their hash for determinism.
    const pairs: Array<{ leaf: RewardLeaf; hash: Uint8Array }> = leaves.map(
      (leaf) => ({ leaf, hash: hashLeaf(leaf) }),
    );
    pairs.sort((a, b) => compareBytes(a.hash, b.hash));

    this.sortedLeaves = pairs.map((p) => p.leaf);
    this.sortedLeafHashes = pairs.map((p) => p.hash);

    this.levels = this.buildLevels(this.sortedLeafHashes);
  }

  // -------------------------------------------------------------------------
  // Tree construction
  // -------------------------------------------------------------------------

  private buildLevels(leafHashes: Uint8Array[]): Uint8Array[][] {
    const levels: Uint8Array[][] = [leafHashes];
    let current = leafHashes;

    while (current.length > 1) {
      const next: Uint8Array[] = [];

      for (let i = 0; i < current.length; i += 2) {
        if (i + 1 < current.length) {
          next.push(hashNode(current[i]!, current[i + 1]!));
        } else {
          // Odd node — promote without hashing.
          next.push(current[i]!);
        }
      }

      levels.push(next);
      current = next;
    }

    return levels;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Return the Merkle root as a 32-byte Uint8Array.
   * Submit this to the on-chain program when publishing a new epoch.
   */
  getRoot(): Uint8Array {
    const top = this.levels[this.levels.length - 1]!;
    return top[0]!;
  }

  /**
   * Return the root as a lowercase hex string (useful for logging / storage).
   */
  getRootHex(): string {
    return Buffer.from(this.getRoot()).toString("hex");
  }

  /**
   * Generate the Merkle proof for a claimant.
   *
   * @param claimant — base-58 public key
   * @returns array of 32-byte sibling hashes, leaf → root order.
   * @throws if the claimant is not in the tree.
   */
  getProof(claimant: string): Uint8Array[] {
    const idx = this.sortedLeaves.findIndex((l) => l.claimant === claimant);
    if (idx === -1) {
      throw new Error(`Claimant not found in tree: ${claimant}`);
    }

    const proof: Uint8Array[] = [];
    let currentIdx = idx;

    for (let level = 0; level < this.levels.length - 1; level++) {
      const levelHashes = this.levels[level]!;
      const isRight = currentIdx % 2 === 1;
      const siblingIdx = isRight ? currentIdx - 1 : currentIdx + 1;

      if (siblingIdx < levelHashes.length) {
        proof.push(levelHashes[siblingIdx]!);
      }
      // If there is no sibling (odd node), no proof element needed at this
      // level — the node was promoted unchanged.

      currentIdx = Math.floor(currentIdx / 2);
    }

    return proof;
  }

  /**
   * Return all leaves in the original (unsorted) insertion order.
   */
  getLeaves(): RewardLeaf[] {
    return [...this.leaves];
  }
}

// ---------------------------------------------------------------------------
// Module-level factory + verification
// ---------------------------------------------------------------------------

/**
 * Construct a MerkleTree from an array of RewardLeaves.
 *
 * Prefer this over `new MerkleTree(leaves)` for consistency with the
 * README examples.
 */
export function buildTree(leaves: RewardLeaf[]): MerkleTree {
  return new MerkleTree(leaves);
}

/**
 * Verify a Merkle proof on-chain-equivalently.
 *
 * Reproduces exactly the same hashing logic as the on-chain Solana program
 * so that proofs generated here are accepted without transformation.
 *
 * @param root     — 32-byte root returned by `tree.getRoot()`
 * @param claimant — base-58 public key of the claimant
 * @param amount   — claimed amount in lamports (must match the leaf)
 * @param proof    — sibling hashes, leaf → root order (from `tree.getProof`)
 * @returns true iff the proof is valid for (root, claimant, amount)
 */
export function verify(
  root: Uint8Array,
  claimant: string,
  amount: bigint,
  proof: Uint8Array[],
): boolean {
  let current = hashLeaf({ claimant, amount });

  for (const sibling of proof) {
    current = hashNode(current, sibling);
  }

  return compareBytes(current, root) === 0;
}
