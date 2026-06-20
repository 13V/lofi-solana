/**
 * Oracle attestation message builder.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * MUST byte-match `oracle_message()` in the on-chain program
 * (programs/lofi_rewards/programs/lofi_rewards/src/ed25519.rs).
 * ──────────────────────────────────────────────────────────────────────────
 *
 *   song_mint(32) || epoch_u64_le(8) || root(32) || total_amount_u64_le(8)
 *   = 80 bytes
 *
 * Flow:
 *   1. Off-chain, after computing the epoch plan + Merkle root, the oracle
 *      signs THIS exact 80-byte message with its ed25519 private key.
 *   2. The server builds an Ed25519 precompile instruction carrying the same
 *      (pubkey, message, signature) — e.g. via
 *      `Ed25519Program.createInstructionWithPrivateKey({ privateKey, message })`
 *      from @solana/web3.js.
 *   3. That instruction is placed IMMEDIATELY BEFORE the program's
 *      `set_epoch_root` instruction in the same transaction. The program
 *      introspects the preceding instruction (Instructions sysvar) and accepts
 *      the root only if the embedded pubkey == the configured oracle authority
 *      and the embedded message == this builder's output.
 *
 * Keep this file and the Rust `oracle_message` in lockstep. If you add a
 * domain separator / version byte on one side, add it on the other.
 */

import { pubkeyToBytes, u64ToLeBytes } from "./merkle.js";

/** Fixed serialized length of the oracle-signed message, in bytes. */
export const ORACLE_MESSAGE_LEN = 80;

/**
 * Build the canonical 80-byte message the oracle signs to attest an epoch root.
 *
 * @param songMint    base-58 mint of the song token
 * @param epoch       monotonically increasing epoch counter (u64)
 * @param root        32-byte Merkle root (e.g. `tree.getRoot()`)
 * @param totalAmount lamports moved from the SongVault into the Distributor
 */
export function buildOracleMessage(
  songMint: string,
  epoch: bigint,
  root: Uint8Array,
  totalAmount: bigint,
): Uint8Array {
  if (root.length !== 32) {
    throw new Error(`root must be 32 bytes, got ${root.length}`);
  }

  const msg = new Uint8Array(ORACLE_MESSAGE_LEN);
  msg.set(pubkeyToBytes(songMint), 0); //  0..32  song mint
  msg.set(u64ToLeBytes(epoch), 32); // 32..40  epoch (LE)
  msg.set(root, 40); // 40..72  merkle root
  msg.set(u64ToLeBytes(totalAmount), 72); // 72..80  total amount (LE)
  return msg;
}
