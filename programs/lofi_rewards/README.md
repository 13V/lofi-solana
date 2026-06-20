# lofi_rewards

On-chain rewards rails for **lofi-solana** — a browser app where users make a
lofi song, launch it as a token via [pump.fun](https://pump.fun), and earn from
trading-fee revenue weighted by **verified listens**.

> ⚠️ **Status: skeleton / not audited.** This program is an idiomatic, close-to-
> compiling Anchor skeleton with `// TODO(audit)` markers where logic is
> intentionally stubbed or needs devnet verification. Do **not** deploy to
> mainnet without an audit and the devnet checks noted below.

---

## What this program is (and isn't)

It is **not** a token launcher. The song token is minted on **pump.fun
off-chain**. `lofi_rewards` only provides the *rewards* layer:

1. a per-song **SOL vault** that accumulates pump.fun creator-fee revenue, and
2. an **oracle-attested, cumulative Merkle distributor** that splits that SOL to
   listeners/creators according to off-chain, listen-weighted accounting.

## The flow: listens → fees → payout

```
                         pump.fun trading
   listeners  ──play──▶  (creator fees in SOL)
       │                        │
       │ (verified listen        ▼
       │  events, off-chain)   SongVault  ◀── fund_vault() (permissionless top-up)
       ▼                        │  PDA: ["vault", song_mint]
  Oracle service                │
   - tallies verified listens   │ set_epoch_root() moves `total_amount`
   - builds cumulative Merkle    │ (gated by Ed25519 oracle attestation)
     tree of (recipient → total ▼
     owed so far)             Distributor
   - Ed25519-signs              │  PDA: ["dist", song_mint]
     (song_mint, epoch,         │  holds committed SOL + current root
      root, total_amount)       │
                                ▼
   recipient ──claim(amount, proof)──▶  paid `amount - already_claimed`
                                        ClaimStatus PDA: ["claim", mint, who]
```

## Accounts (PDAs)

| Account       | Seeds                              | Owner       | Purpose |
|---------------|------------------------------------|-------------|---------|
| `Config`      | `["config"]`                       | program     | `admin`, `oracle_authority`, `bump`. Singleton. |
| `Song`        | `["song", song_mint]`              | program     | `song_mint`, `creator`, `created_at`, `total_distributed`, `bump`. |
| `SongVault`   | `["vault", song_mint]`             | **system**  | Holds SOL. No data. Anyone can deposit. |
| `Distributor` | `["dist", song_mint]`              | program     | Cumulative Merkle distributor: `root`, `epoch`, `total_committed`, `total_claimed`. |
| `ClaimStatus` | `["claim", song_mint, claimant]`   | program     | `claimed` = cumulative lamports already withdrawn by this claimant. |

`SongVault` is deliberately a **system-owned** PDA so it behaves like a plain
wallet: it can receive SOL from anyone and sign System transfers out via its
seeds.

## Instructions

| Instruction       | Who           | What |
|-------------------|---------------|------|
| `init_config(oracle_authority)` | admin (signer) | Create the singleton `Config`. |
| `register_song()` | creator (signer) | Create `Song`, `Distributor`, and the `SongVault` for `song_mint`. |
| `fund_vault(amount)` | anyone | System-transfer `amount` lamports into `SongVault`. |
| `set_epoch_root(root, total_amount, epoch)` | anyone, **but oracle-gated** | Verify the Ed25519 oracle attestation, move `total_amount` from vault → distributor, store the new `root`/`epoch`. |
| `claim(amount, proof)` | recipient (signer) | Verify the cumulative Merkle proof, pay `amount − claimed`, update bookkeeping. |

## Oracle attestation (the security crux of `set_epoch_root`)

Anyone may *submit* a new epoch root, but the root is only accepted if the
**off-chain oracle signed it**. We enforce this with Solana's **Ed25519
precompile** + **instruction introspection**:

1. The oracle Ed25519-signs the message
   `song_mint(32) ‖ epoch_u64_le(8) ‖ root(32) ‖ total_amount_u64_le(8)`
   (see `ed25519::oracle_message`).
2. The client builds a transaction with **two** instructions, in order:
   - an **Ed25519 precompile** instruction
     (`Ed25519Program.createInstructionWithPrivateKey`) carrying that
     `(pubkey, message, signature)`, then
   - the `set_epoch_root` instruction.
3. The validator runs the precompile and **cryptographically verifies** the
   signature for free. Inside `set_epoch_root`, `verify_ed25519_oracle` uses the
   **Instructions sysvar** (`load_current_index_checked` /
   `load_instruction_at_checked`) to load the *immediately preceding*
   instruction and asserts:
   - its program id is the Ed25519 precompile,
   - the embedded **pubkey == `config.oracle_authority`**, and
   - the embedded **message == the expected bytes** for this exact
     `(song_mint, epoch, root, total_amount)`.

Because the precompile already guaranteed the signature is valid over that
`(pubkey, message)`, matching both proves the oracle signed *this* root. See
`src/ed25519.rs` for the precise byte layout (14-byte offsets header, then
`signature(64) ‖ pubkey(32) ‖ message`).

## Cumulative Merkle claim

The distributor uses a **cumulative** Merkle tree: each leaf encodes a
recipient's **total** entitlement so far, not a per-epoch delta. A claim pays
`attested_amount − claim_status.claimed`, so:

- recipients can safely **skip epochs** — one claim settles everything owed;
- re-claiming after a new larger root pays only the **new delta**;
- re-claiming the same amount yields `NothingToClaim`.

**Merkle spec (must match the TS SDK byte-for-byte — see `src/merkle.rs`):**

- Hash = `keccak256`.
- Leaf = `keccak256( 0x00 ‖ claimant_pubkey(32) ‖ amount_u64_le(8) )`.
- Node = `keccak256( 0x01 ‖ min(a,b)(32) ‖ max(a,b)(32) )` — sorted pair,
  OpenZeppelin-style, so proofs are side-agnostic.

The leaf binds the **claimant's own signer pubkey**, so a claimant can only ever
claim their own leaf.

## Open question: how pump.fun creator fees reach `SongVault`

There are two routing strategies; the program supports both:

- **v1 (safe, default):** a platform-controlled fee-share wallet receives
  pump.fun creator fees and forwards SOL into the vault via permissionless
  `fund_vault`. No dependency on pump.fun internals.
- **v2 (UNVERIFIED — must test on devnet):** set the pump.fun `coin_creator`
  directly to the `SongVault` PDA so creator fees accrue to it automatically.
  Whether a PDA can be set as `coin_creator` *and later have fees claimed to it*
  must be validated against the live pump.fun program on devnet before relying
  on it. Until verified, ship v1.

## Build & test

```bash
# from programs/lofi_rewards/
anchor build          # compiles the program + generates IDL/types
anchor keys sync      # (recommended) sync declare_id! with the program keypair
anchor test           # spins up a local validator, deploys, runs tests/*.ts
```

Requirements: Rust + the Solana toolchain + Anchor CLI (`avm install 0.30.1 &&
avm use 0.30.1`) + Node/Yarn for the TS tests.

> **Version note:** Anchor's latest release line is 1.x, but this skeleton pins
> **0.30.1** for tooling stability (the `@coral-xyz/anchor@^0.30` TS client and
> the `avm`/`anchor` CLI ecosystem). Bump Rust + TS + CLI in lockstep when you
> upgrade.

## Layout

```
programs/lofi_rewards/
├── Anchor.toml
├── Cargo.toml                      # workspace
├── package.json / tsconfig.json
├── migrations/deploy.ts
├── programs/lofi_rewards/
│   ├── Cargo.toml                  # crate (anchor-lang ^0.30, init-if-needed)
│   └── src/
│       ├── lib.rs                  # program module + account contexts
│       ├── state.rs                # Config / Song / Distributor / ClaimStatus
│       ├── errors.rs               # #[error_code] LofiError
│       ├── merkle.rs               # keccak256 cumulative Merkle (matches SDK)
│       └── ed25519.rs              # oracle attestation via Instructions sysvar
└── tests/lofi_rewards.ts           # happy-path skeleton + oracle ix builder
```
