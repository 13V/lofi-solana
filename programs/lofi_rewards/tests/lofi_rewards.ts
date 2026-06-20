// Anchor / mocha test SKELETON for the `lofi_rewards` program.
//
// Covers the happy path: init_config -> register_song -> fund_vault ->
// set_epoch_root (with a real Ed25519 oracle instruction) -> claim.
//
// This is a skeleton: several assertions/edge cases are marked TODO. The
// off-chain Merkle + oracle-message construction below MUST stay byte-for-byte
// in sync with `merkle.rs` and `ed25519.rs` in the program.

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Ed25519Program,
  LAMPORTS_PER_SOL,
  Transaction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import { keccak_256 } from "js-sha3"; // TODO(deps): add `js-sha3` (or swap to `keccak256`) to devDependencies.
import { assert } from "chai";

// If the IDL type has been generated (`anchor build`), prefer:
//   import { LofiRewards } from "../target/types/lofi_rewards";
// and type the program as Program<LofiRewards>. We keep it loose here so the
// skeleton type-checks before the first build.
type LofiRewards = anchor.Idl;

// ---------------------------------------------------------------------------
// Off-chain Merkle helpers — MUST match programs/.../src/merkle.rs exactly.
//   Leaf = keccak256( 0x00 || claimant(32) || amount_u64_le(8) )
//   Node = keccak256( 0x01 || min(a,b)(32) || max(a,b)(32) )
// ---------------------------------------------------------------------------
const LEAF_PREFIX = Buffer.from([0x00]);
const NODE_PREFIX = Buffer.from([0x01]);

function keccak(buf: Buffer): Buffer {
  return Buffer.from(keccak_256.arrayBuffer(buf));
}

function u64le(n: anchor.BN | number): Buffer {
  return new anchor.BN(n).toArrayLike(Buffer, "le", 8);
}

function hashLeaf(claimant: PublicKey, amount: anchor.BN | number): Buffer {
  return keccak(Buffer.concat([LEAF_PREFIX, claimant.toBuffer(), u64le(amount)]));
}

function hashNode(a: Buffer, b: Buffer): Buffer {
  const [lo, hi] = Buffer.compare(a, b) <= 0 ? [a, b] : [b, a];
  return keccak(Buffer.concat([NODE_PREFIX, lo, hi]));
}

// Minimal cumulative Merkle tree over a list of (recipient, cumulativeAmount).
// Sorted-pair, duplicate-last-on-odd. Good enough for tests; the production SDK
// should build the canonical tree shared with the indexer.
class MerkleTree {
  layers: Buffer[][];
  constructor(leaves: Buffer[]) {
    this.layers = [leaves];
    while (this.layers[this.layers.length - 1].length > 1) {
      const cur = this.layers[this.layers.length - 1];
      const next: Buffer[] = [];
      for (let i = 0; i < cur.length; i += 2) {
        const left = cur[i];
        const right = i + 1 < cur.length ? cur[i + 1] : cur[i]; // duplicate last
        next.push(hashNode(left, right));
      }
      this.layers.push(next);
    }
  }
  get root(): Buffer {
    return this.layers[this.layers.length - 1][0];
  }
  proof(index: number): Buffer[] {
    const proof: Buffer[] = [];
    let idx = index;
    for (let l = 0; l < this.layers.length - 1; l++) {
      const layer = this.layers[l];
      const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      const sibling = pairIdx < layer.length ? layer[pairIdx] : layer[idx];
      proof.push(sibling);
      idx = Math.floor(idx / 2);
    }
    return proof;
  }
}

// Oracle message — MUST match ed25519::oracle_message:
//   song_mint(32) || epoch_u64_le(8) || root(32) || total_amount_u64_le(8)
function oracleMessage(
  songMint: PublicKey,
  epoch: anchor.BN | number,
  root: Buffer,
  totalAmount: anchor.BN | number
): Buffer {
  return Buffer.concat([songMint.toBuffer(), u64le(epoch), root, u64le(totalAmount)]);
}

// ---------------------------------------------------------------------------

describe("lofi_rewards", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LofiRewards as Program<LofiRewards>;
  const connection = provider.connection;
  const admin = (provider.wallet as anchor.Wallet).payer;

  // The off-chain oracle keypair. In production this private key lives in the
  // attestation service, never on-chain.
  const oracle = Keypair.generate();

  // Stand-in for the pump.fun song mint (we only use its pubkey as a seed).
  const songMint = Keypair.generate();

  // A reward recipient.
  const listener = Keypair.generate();

  // PDA helpers.
  const seed = (s: string) => Buffer.from(s);
  const [configPda] = PublicKey.findProgramAddressSync([seed("config")], program.programId);
  const [songPda] = PublicKey.findProgramAddressSync(
    [seed("song"), songMint.publicKey.toBuffer()],
    program.programId
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [seed("vault"), songMint.publicKey.toBuffer()],
    program.programId
  );
  const [distPda] = PublicKey.findProgramAddressSync(
    [seed("dist"), songMint.publicKey.toBuffer()],
    program.programId
  );
  const [claimPda] = PublicKey.findProgramAddressSync(
    [seed("claim"), songMint.publicKey.toBuffer(), listener.publicKey.toBuffer()],
    program.programId
  );

  before(async () => {
    // Airdrop to the listener so it can pay rent for its ClaimStatus.
    const sig = await connection.requestAirdrop(listener.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
  });

  it("init_config", async () => {
    await program.methods
      .initConfig(oracle.publicKey)
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.config.fetch(configPda);
    assert.ok(config.admin.equals(admin.publicKey));
    assert.ok(config.oracleAuthority.equals(oracle.publicKey));
  });

  it("register_song", async () => {
    await program.methods
      .registerSong()
      .accounts({
        creator: admin.publicKey,
        songMint: songMint.publicKey,
        song: songPda,
        distributor: distPda,
        songVault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const song = await program.account.song.fetch(songPda);
    assert.ok(song.songMint.equals(songMint.publicKey));
    assert.ok(song.creator.equals(admin.publicKey));
    assert.equal(song.totalDistributed.toNumber(), 0);
  });

  it("fund_vault", async () => {
    const amount = new anchor.BN(1 * LAMPORTS_PER_SOL);
    await program.methods
      .fundVault(amount)
      .accounts({
        payer: admin.publicKey,
        song: songPda,
        songVault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const bal = await connection.getBalance(vaultPda);
    assert.isAtLeast(bal, amount.toNumber());
  });

  it("set_epoch_root (with ed25519 oracle attestation)", async () => {
    // Build a cumulative tree: listener is owed 0.5 SOL total so far.
    const listenerCumulative = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
    const leaves = [hashLeaf(listener.publicKey, listenerCumulative)];
    const tree = new MerkleTree(leaves);
    const root = tree.root;
    const epoch = new anchor.BN(1);
    const totalAmount = listenerCumulative; // committing exactly what's owed

    // Oracle signs (song_mint, epoch, root, total_amount).
    const message = oracleMessage(songMint.publicKey, epoch, root, totalAmount);

    // TODO(audit): build the Ed25519 precompile instruction with the oracle's
    // private key. This produces the single-signature instruction layout the
    // program's ed25519.rs introspection expects.
    const ed25519Ix = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: oracle.secretKey,
      message,
    });

    // The set_epoch_root instruction. The ed25519 ix MUST be the immediately
    // preceding instruction in the same transaction.
    const setRootIx = await program.methods
      .setEpochRoot([...root], totalAmount, epoch)
      .accounts({
        payer: admin.publicKey,
        config: configPda,
        song: songPda,
        songVault: vaultPda,
        distributor: distPda,
        songMint: songMint.publicKey,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction().add(ed25519Ix).add(setRootIx);
    await provider.sendAndConfirm(tx, []);

    const dist = await program.account.distributor.fetch(distPda);
    assert.equal(dist.epoch.toNumber(), 1);
    assert.deepEqual([...dist.root], [...root]);
    assert.equal(dist.totalCommitted.toNumber(), totalAmount.toNumber());

    // TODO(test): negative cases —
    //   * no ed25519 ix present  -> MissingEd25519Instruction
    //   * ed25519 ix signed by a non-oracle key -> InvalidOracleSignature
    //   * ed25519 ix over a different (root/epoch/amount) -> InvalidOracleSignature
    //   * non-monotonic epoch -> Unauthorized
  });

  it("claim", async () => {
    const listenerCumulative = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
    const leaves = [hashLeaf(listener.publicKey, listenerCumulative)];
    const tree = new MerkleTree(leaves);
    const proof = tree.proof(0).map((p) => [...p]);

    const before = await connection.getBalance(listener.publicKey);

    await program.methods
      .claim(listenerCumulative, proof)
      .accounts({
        claimant: listener.publicKey,
        song: songPda,
        distributor: distPda,
        songMint: songMint.publicKey,
        claimStatus: claimPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([listener])
      .rpc();

    const after = await connection.getBalance(listener.publicKey);
    // Net change = payout - rent paid for ClaimStatus. Just assert it moved up
    // meaningfully; exact accounting is a TODO.
    assert.isAbove(after, before);

    const claimStatus = await program.account.claimStatus.fetch(claimPda);
    assert.equal(claimStatus.claimed.toNumber(), listenerCumulative.toNumber());

    // TODO(test): second claim with same cumulative -> NothingToClaim.
    // TODO(test): claim with a forged proof -> InvalidProof.
    // TODO(test): claim with someone else's leaf -> InvalidProof (leaf is bound
    //             to the signer pubkey).
  });
});
